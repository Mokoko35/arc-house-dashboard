// Live conversion of a film to HLS for the player, using ffmpeg.
//
// Chromium cannot read the audio languages or the subtitles inside an .mkv, and cannot play many audio codecs
// (AC-3, DTS). So a film is read by ffmpeg and rewritten on the fly as HLS:
//   - the picture is copied when it is plain 8-bit H.264, otherwise re-encoded to H.264,
//   - EVERY audio track becomes its own AAC rendition (an HLS "audio group", which hls.js lists as audioTracks),
//   - EVERY text subtitle track is written as a WebVTT file next to it (a second ffmpeg, at full speed, because
//     subtitles are spread through the whole file and the player needs them complete).
// A tiny HTTP server on 127.0.0.1 hands the files to the player. Everything is deleted when the player closes.
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.join(os.tmpdir(), 'iptv-player-hls')
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IPTVPlayer'
const BITMAP_SUBS = /^(hdmv_pgs_subtitle|dvd_subtitle|dvb_subtitle|xsub|pgssub|dvdsub)$/i
const TEXT_SUBS = /^(subrip|srt|ass|ssa|webvtt|mov_text|text|microdvd|subviewer|subviewer1|mpl2|jacosub|realtext|sami|stl|vplayer)$/i

let languageNames
function languageName(code) {
  if (!code) return null
  try {
    languageNames ??= new Intl.DisplayNames(['tr'], { type: 'language' })
    const name = languageNames.of(code)
    return name && name.toLowerCase() !== code.toLowerCase() ? name : null
  } catch {
    return null
  }
}

/** "Dublaj" with language "tur" -> "Dublaj (Türkçe)"; no title -> "Türkçe"; nothing -> "Ses 2". */
function labelFor(title, lang, fallback) {
  const language = languageName(lang)
  if (title && language && !title.toLowerCase().includes(language.toLowerCase())) return `${title} (${language})`
  return title || language || fallback
}

/** Reads the streams of a file the way `ffmpeg -i` prints them. */
export function parseProbe(stderr) {
  const durationMatch = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr)
  const durationSeconds = durationMatch ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3]) : 0
  const streams = []
  const lines = stderr.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*Stream #0:(\d+)(?:\[0x[0-9a-f]+\])?(?:\(([^)]*)\))?[^:]*:\s*(Video|Audio|Subtitle):\s*([^\s,(]+)(.*)$/.exec(lines[i] ?? '')
    if (!m) continue
    const stream = { index: Number(m[1]), lang: m[2] && m[2] !== 'und' ? m[2] : undefined, type: m[3].toLowerCase(), codec: m[4], detail: m[5] ?? '', title: undefined, attachedPic: /attached pic/i.test(lines[i] ?? '') }
    // The metadata block under the stream line may hold a title.
    for (let j = i + 1; j < lines.length && !/^\s*Stream #/.test(lines[j] ?? ''); j++) {
      const t = /^\s*title\s*:\s*(.+)$/i.exec(lines[j] ?? '')
      if (t) stream.title = t[1].trim()
    }
    streams.push(stream)
  }
  return { durationSeconds, streams }
}

/** Plain 8-bit H.264 plays in Chromium as it is; anything else is re-encoded. */
export function videoCanBeCopied(stream) {
  return /^h264$/i.test(stream.codec) && !/10le|10be|12le|High 10|High 4:|Hi10|Hi422/i.test(stream.detail)
}

/** The ffmpeg arguments for the main HLS output. Exported so it can be tested without running ffmpeg. */
export function buildHlsArgs({ url, dir, video, audios, copyVideo }) {
  const args = ['-hide_banner', '-nostdin', '-loglevel', 'warning', '-y', '-user_agent', USER_AGENT, '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5']
  // Read the film a few times faster than it plays: enough to seek a little ahead, not enough to fill the disk at once.
  args.push('-readrate', '4', '-i', url)
  // The picture first, then every audio track, in order.
  args.push('-map', `0:${video.index}`)
  for (const a of audios) args.push('-map', `0:${a.index}`)
  if (copyVideo) args.push('-c:v', 'copy')
  else args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1', '-force_key_frames', 'expr:gte(t,n_forced*4)')
  if (audios.length > 0) args.push('-c:a', 'aac', '-b:a', '192k', '-ac', '2')
  args.push('-f', 'hls', '-hls_time', '4', '-hls_list_size', '0', '-hls_playlist_type', 'event', '-hls_flags', 'independent_segments+temp_file', '-master_pl_name', 'master.m3u8')
  if (audios.length > 0) {
    const entries = ['v:0,agroup:aud']
    audios.forEach((a, i) => entries.push(`a:${i},agroup:aud,name:a${i}${a.lang ? `,language:${a.lang}` : ''}${i === 0 ? ',default:yes' : ''}`))
    args.push('-var_stream_map', entries.join(' '))
  }
  args.push('-hls_segment_filename', path.join(dir, 'seg_%v_%05d.ts'), path.join(dir, 'pl_%v.m3u8'))
  return args
}

/** The ffmpeg arguments that write every text subtitle track as a complete WebVTT file. */
export function buildSubtitleArgs({ url, dir, subs }) {
  const args = ['-hide_banner', '-nostdin', '-loglevel', 'warning', '-y', '-user_agent', USER_AGENT, '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5', '-i', url]
  subs.forEach((s, i) => args.push('-map', `0:${s.index}`, '-c:s', 'webvtt', '-vn', '-an', path.join(dir, `sub_${i}.vtt`)))
  return args
}

function run(ffmpeg, args, { timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(ffmpeg, args, { windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (d) => (stderr += String(d)))
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stderr })
    })
    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({ code: -1, stderr: String(e) })
    })
  })
}

const MIME = { '.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t', '.vtt': 'text/vtt; charset=utf-8' }

export class TranscodeManager {
  constructor({ ffmpegPath }) {
    this.ffmpegPath = ffmpegPath
    this.jobs = new Map()
    this.server = null
    this.port = 0
  }

  get available() {
    return Boolean(this.ffmpegPath) && fs.existsSync(this.ffmpegPath)
  }

  async ensureServer() {
    if (this.server) return
    fs.mkdirSync(ROOT, { recursive: true })
    this.#removeOldFolders()
    this.server = http.createServer((req, res) => this.#serve(req, res))
    await new Promise((resolve, reject) => {
      this.server.once('error', reject)
      this.server.listen(0, '127.0.0.1', () => resolve())
    })
    this.port = this.server.address().port
  }

  #removeOldFolders() {
    try {
      for (const name of fs.readdirSync(ROOT)) {
        const full = path.join(ROOT, name)
        if (Date.now() - fs.statSync(full).mtimeMs > 6 * 3600_000) fs.rmSync(full, { recursive: true, force: true })
      }
    } catch {
      // Cleaning is a courtesy; never block playback on it.
    }
  }

  #serve(req, res) {
    const send = (code, body = '', headers = {}) => {
      res.writeHead(code, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', ...headers })
      res.end(body)
    }
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const [, id, name] = url.pathname.split('/')
      const job = id ? this.jobs.get(id) : undefined
      // Only plain file names inside the job's folder: no "..", no sub-folders.
      if (!job || !name || name !== path.basename(name)) return send(404)
      const file = path.join(job.dir, name)
      if (!fs.existsSync(file)) return send(404)
      let body = fs.readFileSync(file)
      if (name === 'master.m3u8') body = Buffer.from(this.#renameAudio(String(body), job))
      send(200, body, { 'Content-Type': MIME[path.extname(name)] ?? 'application/octet-stream' })
    } catch {
      send(500)
    }
  }

  /** ffmpeg names the audio renditions "audio_1", "audio_2"; give them the file's own names and languages. */
  #renameAudio(master, job) {
    let n = 0
    return master.replace(/(#EXT-X-MEDIA:TYPE=AUDIO[^\n]*NAME=")[^"]*(")/g, (_m, a, b) => `${a}${job.audioLabels[n++] ?? `Ses ${n}`}${b}`)
  }

  /** Starts converting `url`. Resolves when playback can begin. */
  async start(url) {
    if (!this.available) throw new Error('ffmpeg bulunamadı.')
    if (!/^https?:\/\//i.test(url)) throw new Error('Yalnızca http(s) adresleri dönüştürülür.')
    this.stopAll() // one player, one conversion
    await this.ensureServer()

    const probe = await run(this.ffmpegPath, ['-hide_banner', '-user_agent', USER_AGENT, '-i', url], { timeoutMs: 40_000 })
    const info = parseProbe(probe.stderr)
    const video = info.streams.find((s) => s.type === 'video' && !s.attachedPic)
    if (!video) throw new Error(`Dosyada görüntü akışı bulunamadı. ${probe.stderr.trim().split('\n').slice(-2).join(' ')}`)
    const audios = info.streams.filter((s) => s.type === 'audio')
    const allSubs = info.streams.filter((s) => s.type === 'subtitle')
    const subs = allSubs.filter((s) => TEXT_SUBS.test(s.codec) && !BITMAP_SUBS.test(s.codec))

    const id = crypto.randomBytes(8).toString('hex')
    const dir = path.join(ROOT, id)
    fs.mkdirSync(dir, { recursive: true })
    const job = {
      id,
      dir,
      children: [],
      audioLabels: audios.map((a, i) => labelFor(a.title, a.lang, `Ses ${i + 1}`)),
      stderr: '',
      subsState: subs.length === 0 ? 'none' : 'pending',
    }
    this.jobs.set(id, job)

    const main = spawn(this.ffmpegPath, buildHlsArgs({ url, dir, video, audios, copyVideo: videoCanBeCopied(video) }), { windowsHide: true })
    job.children.push(main)
    main.stderr.on('data', (d) => (job.stderr = (job.stderr + String(d)).slice(-4000)))
    let mainExit = null
    main.on('close', (code) => (mainExit = code))
    main.on('error', (e) => (mainExit = -1, job.stderr += String(e)))

    if (subs.length > 0) {
      const extractor = spawn(this.ffmpegPath, buildSubtitleArgs({ url, dir, subs }), { windowsHide: true })
      job.children.push(extractor)
      extractor.stderr.on('data', (d) => (job.stderr = (job.stderr + String(d)).slice(-4000)))
      extractor.on('close', (code) => (job.subsState = code === 0 ? 'ready' : 'failed'))
      extractor.on('error', () => (job.subsState = 'failed'))
    }

    // Playback can begin when the first picture segment and the first segment of every audio track exist.
    const deadline = Date.now() + 60_000
    const ready = () => {
      const need = ['pl_0.m3u8', ...audios.map((_, i) => `pl_a${i}.m3u8`)]
      // With a single variant (no audio) ffmpeg names the playlist pl_0.m3u8; with groups the picture is pl_0 too.
      return fs.existsSync(path.join(dir, 'master.m3u8')) && need.every((f) => fs.existsSync(path.join(dir, f)) && /\.ts/.test(fs.readFileSync(path.join(dir, f), 'utf8')))
    }
    while (!ready()) {
      if (mainExit !== null && mainExit !== 0) {
        this.stop(id)
        throw new Error(`ffmpeg durdu (${mainExit}). ${job.stderr.trim().split('\n').slice(-3).join(' ')}`)
      }
      if (Date.now() > deadline) {
        this.stop(id)
        throw new Error('Film zamanında hazırlanamadı. Sunucu yavaş olabilir.')
      }
      await new Promise((r) => setTimeout(r, 250))
    }

    const base = `http://127.0.0.1:${this.port}/${id}`
    return {
      id,
      playlist: `${base}/master.m3u8`,
      durationSeconds: info.durationSeconds,
      copiedVideo: videoCanBeCopied(video),
      audioCount: audios.length,
      skippedSubtitles: allSubs.length - subs.length,
      subtitles: subs.map((s, i) => ({ url: `${base}/sub_${i}.vtt`, lang: s.lang, label: labelFor(s.title, s.lang, `Altyazı ${i + 1}`) })),
    }
  }

  /** 'none' | 'pending' | 'ready' | 'failed' for the subtitle files of a job. */
  status(id) {
    const job = this.jobs.get(id)
    return { subtitles: job ? job.subsState : 'none' }
  }

  stop(id) {
    const job = this.jobs.get(id)
    if (!job) return
    this.jobs.delete(id)
    for (const child of job.children) {
      try {
        child.kill('SIGKILL')
      } catch {
        // already gone
      }
    }
    // Windows keeps files open for a moment after the process dies; retry the delete.
    const remove = (tries) => {
      try {
        fs.rmSync(job.dir, { recursive: true, force: true })
      } catch {
        if (tries > 0) setTimeout(() => remove(tries - 1), 500)
      }
    }
    setTimeout(() => remove(6), 300)
  }

  stopAll() {
    for (const id of [...this.jobs.keys()]) this.stop(id)
  }

  dispose() {
    this.stopAll()
    this.server?.close()
    this.server = null
  }
}
