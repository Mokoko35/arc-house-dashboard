import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Maximize, Minimize, Pause, Play, SkipBack, SkipForward, Tv, Volume2, VolumeX } from 'lucide-react'
import { type SubtitleJob, type TranscodeMode, desktop, shouldTranscode } from './desktop'
import { LanguageMenu } from './LanguageMenu'
import { EMPTY_TRACKS, type TrackInfo, labelFor, loadSubtitle, subtitleFromFile } from './tracks'
import type { Channel, SubtitleSource } from './types'

type Engine = 'hls' | 'ts' | 'native'
type HlsInstance = import('hls.js').default

/* Audio languages and subtitles: from the HLS playlist when there is one, otherwise from the video element itself. */
interface NativeAudioTrack {
  enabled: boolean
  label: string
  language: string
}
interface NativeAudioList {
  length: number
  [index: number]: NativeAudioTrack | undefined
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}
const nativeAudio = (video: HTMLVideoElement): NativeAudioList | undefined => (video as unknown as { audioTracks?: NativeAudioList }).audioTracks
const textTracksOf = (video: HTMLVideoElement): TextTrack[] => Array.from(video.textTracks).filter((t) => t.kind === 'subtitles' || t.kind === 'captions')

/** `extras` are the subtitle files added by hand or listed by the portal (<track> elements we created). */
function readTracks(video: HTMLVideoElement, hls: HlsInstance | null, extras: HTMLTrackElement[]): TrackInfo {
  if (hls) {
    const own = hls.subtitleTracks
    const extraShowing = extras.findIndex((el) => el.track.mode === 'showing')
    return {
      audio: hls.audioTracks.map((t, i) => ({ label: labelFor(t.name, t.lang, `Ses ${i + 1}`) })),
      audioIndex: hls.audioTrack,
      audioSupported: true,
      subs: [...own.map((t, i) => ({ label: labelFor(t.name, t.lang, `Altyazı ${i + 1}`) })), ...extras.map((el, i) => ({ label: el.label || `Altyazı ${own.length + i + 1}` }))],
      subIndex: hls.subtitleTrack >= 0 ? hls.subtitleTrack : extraShowing >= 0 ? own.length + extraShowing : -1,
    }
  }
  const audio: TrackInfo['audio'] = []
  let audioIndex = -1
  const list = nativeAudio(video)
  for (let i = 0; list && i < list.length; i++) {
    const t = list[i]
    if (!t) continue
    audio.push({ label: labelFor(t.label, t.language, `Ses ${i + 1}`) })
    if (t.enabled) audioIndex = i
  }
  const texts = textTracksOf(video)
  return {
    audio,
    audioIndex,
    audioSupported: list !== undefined,
    subs: texts.map((t, i) => ({ label: labelFor(t.label, t.language, `Altyazı ${i + 1}`) })),
    subIndex: texts.findIndex((t) => t.mode === 'showing'),
  }
}

function engineFor(url: string): Engine {
  const path = url.split('?')[0]?.toLowerCase() ?? ''
  if (path.endsWith('.m3u8') || path.includes('.m3u8')) return 'hls'
  if (/\.(mp4|mkv|webm|m4v|mov|ogv|ogg|mp3|aac)$/.test(path)) return 'native'
  return 'ts' // ".ts" and extension-less live URLs (typical for Xtream portals)
}

/** An https page cannot load http streams. Desktop (file://) and plain http pages can. */
const mixedContent = (url: string) => window.location.protocol === 'https:' && url.startsWith('http://')

const HIDE_AFTER_MS = 3000
const VOLUME_KEY = 'iptv-player:volume:v1'

function loadVolume(): { volume: number; muted: boolean } {
  try {
    const raw = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? 'null') as { volume?: unknown; muted?: unknown } | null
    const volume = typeof raw?.volume === 'number' && raw.volume >= 0 && raw.volume <= 1 ? raw.volume : 1
    return { volume, muted: raw?.muted === true }
  } catch {
    return { volume: 1, muted: false }
  }
}

const clockTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

interface CoreProps {
  channel: Channel
  autoplay: boolean
  className: string
  /** Corner mini player: no control bar, a click pauses and plays. */
  compact: boolean
  onPrev?: () => void
  onNext?: () => void
  /** "12 / 340": where the channel is in its list. */
  navLabel?: string
  /** Buttons shown at the top right with the other controls. */
  topRight?: ReactNode
  /** Enter full screen as soon as this player shows, for a film or episode the user just chose to play. */
  wantFullscreen?: boolean
  onFullscreenHandled?: () => void
  /** Right-click in full screen. Meant as "back": leave full screen and close the player. */
  onBack?: () => void
  /** Show the audio language and subtitle menus (films and episodes). */
  trackMenus?: boolean
  /** Windows app: convert films with ffmpeg first (see desktop.ts). */
  transcode?: TranscodeMode
}

function ControlButton({ label, onClick, children, className = '' }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={label}
      title={label}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white ${className}`}
    >
      {children}
    </button>
  )
}

function PlayerCore({ channel, autoplay, className, compact, onPrev, onNext, navLabel, topRight, wantFullscreen = false, onFullscreenHandled, onBack, trackMenus = false, transcode = 'auto' }: CoreProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  // Status belongs to one stream address. A new channel starts as "loading" without remounting the player,
  // which is what keeps full screen alive when you change channels.
  const [status, setStatus] = useState<{ url: string; loading: boolean; error: string | null; note?: string } | null>(null)
  const own = status?.url === channel.url ? status : null
  const loading = own ? own.loading : true
  const error = own ? own.error : null
  const note = own?.note
  // A film converted by ffmpeg: its real length (the growing playlist does not know it yet) and its subtitle files.
  const [converted, setConverted] = useState<{ url: string; duration: number; subs: SubtitleSource[]; job: SubtitleJob; skipped: number } | null>(null)
  const conv = converted?.url === channel.url ? converted : null
  const [paused, setPaused] = useState(true)
  const [{ volume, muted }, setSound] = useState(loadVolume)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [awake, setAwake] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const hlsRef = useRef<HlsInstance | null>(null)
  const extrasRef = useRef<{ el: HTMLTrackElement; url: string }[]>([])
  const [tracks, setTracks] = useState<TrackInfo>(EMPTY_TRACKS)
  const [menuOpen, setMenuOpen] = useState(false)
  const blocked = mixedContent(channel.url)
  const total = conv && conv.duration > 0 ? conv.duration : duration
  const isVod = Number.isFinite(total) && total > 0

  // Controls appear on any activity and go away after three seconds of none.
  const arm = useCallback(() => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setAwake(false), HIDE_AFTER_MS)
  }, [])
  const wake = useCallback(() => {
    setAwake(true)
    arm()
  }, [arm])
  useEffect(() => {
    arm() // first three seconds on a new channel show the name and controls, then they hide
    return () => window.clearTimeout(hideTimer.current)
  }, [arm])

  useEffect(() => {
    const video = videoRef.current
    if (!video || blocked) return
    let disposed = false
    let teardown: (() => void) | undefined
    video.volume = volume
    video.muted = muted

    const url = channel.url
    const patch = (p: { loading?: boolean; error?: string | null; note?: string }) =>
      setStatus((prev) => ({ ...(prev?.url === url ? prev : { url, loading: true, error: null }), ...p }))
    const fail = (message: string) => {
      if (!disposed) patch({ error: message, loading: false })
    }
    const onPlaying = () => patch({ loading: false, error: null, note: undefined })
    const onWaiting = () => patch({ loading: true })
    // Emptying the element when a channel is swapped can raise an error with no cause; only a real one counts.
    const onNativeError = () => {
      if (video.error) fail('Bu yayın oynatılamadı. Adres geçersiz olabilir veya kodek tarayıcıda desteklenmiyor.')
    }
    const refreshTracks = () => setTracks(readTracks(video, hlsRef.current, extrasRef.current.map((x) => x.el)))
    const onEmptied = () => {
      setTracks(EMPTY_TRACKS)
      setTime(0)
      setDuration(0)
      setPaused(video.paused)
    }
    const onPlay = () => setPaused(false)
    const onPause = () => setPaused(true)
    const onTime = () => setTime(video.currentTime)
    const onDuration = () => setDuration(video.duration)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('error', onNativeError)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('durationchange', onDuration)
    video.addEventListener('emptied', onEmptied)
    video.addEventListener('loadedmetadata', refreshTracks)
    const audioList = nativeAudio(video)
    for (const type of ['addtrack', 'removetrack', 'change']) {
      audioList?.addEventListener(type, refreshTracks)
      video.textTracks.addEventListener(type, refreshTracks)
    }

    let stopConversion: (() => void) | undefined
    let subsTimer: number | undefined

    const start = async () => {
      let source = channel.url
      let engine = engineFor(channel.url)
      let converting = false
      // Windows app: ffmpeg rewrites the film as HLS with every audio language, so hls.js can list and switch them.
      const desk = desktop()
      if (desk && shouldTranscode(channel.url, transcode)) {
        patch({ loading: true, note: 'Film hazırlanıyor: ses ve altyazı izleri okunuyor...' })
        try {
          const job = await desk.transcodeStart(channel.url)
          if (disposed) {
            void desk.transcodeStop(job.id)
            return
          }
          stopConversion = () => void desk.transcodeStop(job.id).catch(() => undefined)
          source = job.playlist
          engine = 'hls'
          converting = true
          setConverted({ url, duration: job.durationSeconds, subs: job.subtitles, job: job.subtitles.length > 0 ? 'pending' : 'none', skipped: job.skippedSubtitles })
          if (job.subtitles.length > 0) {
            // The subtitle files are written by a second, faster ffmpeg. Wait for them to be complete.
            subsTimer = window.setInterval(() => {
              void desk
                .transcodeStatus(job.id)
                .then((s) => {
                  if (s.subtitles === 'pending') return
                  window.clearInterval(subsTimer)
                  setConverted((prev) => (prev?.url === url ? { ...prev, job: s.subtitles } : prev))
                })
                .catch(() => undefined)
            }, 2000)
          }
        } catch {
          // No ffmpeg, a slow server, or a file ffmpeg cannot read: play the file as it is.
          patch({ loading: true, note: 'Dönüştürme başlatılamadı, dosya olduğu gibi oynatılıyor.' })
        }
      }
      try {
        if (engine === 'hls') {
          const { default: Hls } = await import('hls.js')
          if (disposed) return
          if (Hls.isSupported()) {
            // A converted film grows while it plays; start at the beginning, not at the "live edge".
            const hls = new Hls({ enableWorker: true, ...(converting ? { startPosition: 0 } : {}) })
            let retried = false
            hls.on(Hls.Events.ERROR, (_e, data) => {
              if (!data.fatal) return
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !retried) {
                retried = true
                hls.startLoad()
              } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError()
              } else {
                fail('Yayına bağlanılamadı. Sunucu kapalı olabilir veya tarayıcıya erişimi engelliyor (CORS).')
              }
            })
            hlsRef.current = hls
            for (const event of [Hls.Events.MANIFEST_PARSED, Hls.Events.AUDIO_TRACKS_UPDATED, Hls.Events.AUDIO_TRACK_SWITCHED, Hls.Events.SUBTITLE_TRACKS_UPDATED, Hls.Events.SUBTITLE_TRACK_SWITCH] as const) {
              hls.on(event, refreshTracks)
            }
            hls.loadSource(source)
            hls.attachMedia(video)
            teardown = () => {
              hlsRef.current = null
              hls.destroy()
            }
          } else {
            video.src = channel.url
          }
        } else if (engine === 'ts') {
          const { default: mpegts } = await import('mpegts.js')
          if (disposed) return
          if (mpegts.isSupported()) {
            const player = mpegts.createPlayer({ type: 'mpegts', isLive: true, url: channel.url })
            player.on(mpegts.Events.ERROR, () => fail('Yayına bağlanılamadı. Sunucu kapalı olabilir veya tarayıcıya erişimi engelliyor (CORS).'))
            player.attachMediaElement(video)
            player.load()
            teardown = () => player.destroy()
          } else {
            video.src = source
          }
        } else {
          video.src = channel.url
        }
        if (autoplay) await video.play().catch(() => undefined) // Autoplay can be refused; the user can press play.
      } catch {
        fail('Oynatıcı başlatılamadı.')
      }
    }
    void start()

    return () => {
      disposed = true
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('error', onNativeError)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('durationchange', onDuration)
      video.removeEventListener('emptied', onEmptied)
      video.removeEventListener('loadedmetadata', refreshTracks)
      for (const type of ['addtrack', 'removetrack', 'change']) {
        audioList?.removeEventListener(type, refreshTracks)
        video.textTracks.removeEventListener(type, refreshTracks)
      }
      window.clearInterval(subsTimer)
      stopConversion?.() // closing the player ends ffmpeg and deletes its files
      teardown?.()
      video.removeAttribute('src')
      video.load()
    }
    // volume and muted are applied once here; later changes go straight to the element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.url, blocked, autoplay, transcode])

  // Subtitle files added by hand or listed by the portal live as <track> elements. They go away with the channel.
  useEffect(
    () => () => {
      for (const { el, url } of extrasRef.current) {
        el.remove()
        URL.revokeObjectURL(url)
      }
      extrasRef.current = []
      loadedSubs.current = new Set()
    },
    [channel.url],
  )

  const attachTrack = (video: HTMLVideoElement, url: string, label: string, lang?: string): HTMLTrackElement => {
    const el = document.createElement('track')
    el.kind = 'subtitles'
    el.label = label
    if (lang) el.srclang = lang
    el.src = url
    video.appendChild(el)
    el.track.mode = 'disabled'
    extrasRef.current.push({ el, url })
    return el
  }

  // Subtitle files from the portal and, in the Windows app, the ones ffmpeg wrote for a converted film (once they are complete).
  const subtitleSources = useMemo(() => [...(channel.subtitleTracks ?? []), ...(conv?.job === 'ready' ? conv.subs : [])], [channel.subtitleTracks, conv])
  const loadedSubs = useRef(new Set<string>())

  // The portal lists subtitle files: download them, turn SRT into WebVTT, and offer them (all off to start with).
  useEffect(() => {
    const video = videoRef.current
    const sources = subtitleSources.filter((s) => !loadedSubs.current.has(s.url))
    if (!video || blocked || sources.length === 0) return
    let disposed = false
    void (async () => {
      for (const [i, source] of sources.slice(0, 12).entries()) {
        const url = await loadSubtitle(source.url).catch(() => null)
        if (!url) continue
        if (disposed) {
          URL.revokeObjectURL(url)
          continue
        }
        loadedSubs.current.add(source.url)
        attachTrack(video, url, source.label ?? labelFor(undefined, source.lang, `Altyazı ${i + 1}`), source.lang)
      }
      if (!disposed) setTracks(readTracks(video, hlsRef.current, extrasRef.current.map((x) => x.el)))
    })()
    return () => {
      disposed = true
    }
    // attachTrack only touches refs and the video element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.url, subtitleSources, blocked])

  const selectAudio = (index: number) => {
    const video = videoRef.current
    if (!video) return
    const hls = hlsRef.current
    if (hls) hls.audioTrack = index
    else {
      const list = nativeAudio(video)
      for (let i = 0; list && i < list.length; i++) {
        const t = list[i]
        if (t) t.enabled = i === index
      }
    }
    setTracks(readTracks(video, hls, extrasRef.current.map((x) => x.el)))
  }

  // -1 is "off". With HLS the playlist's own subtitles come first, then the added files.
  const selectSubtitle = (index: number) => {
    const video = videoRef.current
    if (!video) return
    const hls = hlsRef.current
    const extras = extrasRef.current.map((x) => x.el)
    if (hls) {
      const own = hls.subtitleTracks.length
      const fromPlaylist = index >= 0 && index < own
      hls.subtitleDisplay = fromPlaylist
      hls.subtitleTrack = fromPlaylist ? index : -1
      extras.forEach((el, i) => {
        el.track.mode = index >= own && i === index - own ? 'showing' : 'disabled'
      })
    } else {
      textTracksOf(video).forEach((t, i) => {
        t.mode = i === index ? 'showing' : 'disabled'
      })
    }
    setTracks(readTracks(video, hls, extras))
  }

  // A subtitle file from the user's computer: added and switched on right away.
  const addSubtitleFile = (file: File) => {
    const video = videoRef.current
    if (!video) return
    void subtitleFromFile(file)
      .then((url) => {
        const el = attachTrack(video, url, file.name.replace(/\.[^.]+$/, ''))
        const hls = hlsRef.current
        selectSubtitle(hls ? hls.subtitleTracks.length + extrasRef.current.length - 1 : textTracksOf(video).indexOf(el.track))
      })
      .catch(() => undefined)
  }

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
  }, [])

  const setVolume = (next: number, nextMuted = next === 0) => {
    const video = videoRef.current
    if (video) {
      video.volume = next
      video.muted = nextMuted
    }
    setSound({ volume: next, muted: nextMuted })
    try {
      localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume: next, muted: nextMuted }))
    } catch {
      // ignore
    }
  }
  const toggleMute = useCallback(() => setVolume(volume === 0 ? 1 : volume, !muted), [volume, muted]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen().catch(() => undefined)
  }, [])
  // Full screen on request. The click on "Oynat" is the user action the browser needs; it stays valid for a few seconds,
  // which is longer than it takes this player to appear.
  useEffect(() => {
    if (!wantFullscreen) return
    if (!compact && !document.fullscreenElement) void wrapRef.current?.requestFullscreen().catch(() => undefined)
    onFullscreenHandled?.()
  }, [wantFullscreen, compact, onFullscreenHandled])

  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === wrapRef.current)
      wake() // entering or leaving full screen always brings the controls back
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [wake])

  // Shrinking to the corner removes the controls, so full screen must not be left running with nothing to click.
  useEffect(() => {
    if (compact && document.fullscreenElement === wrapRef.current) void document.exitFullscreen().catch(() => undefined)
  }, [compact])

  // Going from the corner back to a window starts with the controls showing, not with whatever state they were left in.
  useEffect(() => {
    const id = window.setTimeout(wake, 0)
    return () => window.clearTimeout(id)
  }, [compact, wake])

  // Mouse or touch anywhere in full screen counts as activity, even over the overlay or the close button.
  useEffect(() => {
    if (!fullscreen) return
    const events = ['pointermove', 'mousemove', 'pointerdown', 'touchstart'] as const
    for (const name of events) document.addEventListener(name, wake, { passive: true })
    return () => {
      for (const name of events) document.removeEventListener(name, wake)
    }
  }, [fullscreen, wake])

  const seek = useCallback(
    (seconds: number) => {
      const video = videoRef.current
      if (video && isVod) video.currentTime = Math.max(0, Math.min(total, seconds))
    },
    [isVod, total],
  )

  // Keyboard: left/right change the channel (or skip 10 seconds in a film), space pauses, M mutes, F is full screen.
  useEffect(() => {
    if (compact) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const video = videoRef.current
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const back = e.key === 'ArrowLeft'
        if (back && onPrev) onPrev()
        else if (!back && onNext) onNext()
        else if (video && isVod) seek(video.currentTime + (back ? -10 : 10))
        else return
      } else if (e.key === ' ' && t?.tagName !== 'BUTTON') togglePlay()
      else if (e.key === 'm' || e.key === 'M') toggleMute()
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      else return
      e.preventDefault()
      wake()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [compact, onPrev, onNext, togglePlay, toggleMute, toggleFullscreen, wake, seek, isVod])

  const message = blocked
    ? 'Bu yayın http:// ile başlıyor. https sayfalarda tarayıcı bunu engeller. Windows masaüstü uygulamasında veya http:// ile açılan sayfada oynar.'
    : error
  const subtitleNote = conv
    ? [conv.job === 'pending' ? 'Altyazılar hazırlanıyor, birazdan burada görünecek...' : conv.job === 'failed' ? 'Altyazılar okunamadı.' : '', conv.skipped > 0 ? `${conv.skipped} altyazı görüntü tabanlı olduğu için gösterilemiyor.` : ''].filter(Boolean).join(' ') || undefined
    : undefined
  const show = !compact && (awake || paused || message !== null || menuOpen)
  const hideCursor = !compact && !show && !paused

  return (
    <div
      ref={wrapRef}
      onContextMenu={(e) => {
        // Right-click on the full screen picture is "back".
        if (!onBack || compact || document.fullscreenElement !== wrapRef.current) return
        e.preventDefault()
        onBack()
      }}
      onPointerMove={compact ? undefined : wake}
      onPointerDown={compact ? undefined : wake}
      onFocusCapture={compact ? undefined : wake}
      className={`player-surface relative aspect-video w-full overflow-hidden bg-black ${hideCursor ? 'cursor-none' : ''} ${className}`}
    >
      <video
        ref={videoRef}
        playsInline
        onClick={togglePlay}
        onDoubleClick={compact ? undefined : toggleFullscreen}
        className="h-full w-full"
      />

      {loading && !message && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <Loader2 className="animate-spin text-white/70" size={36} aria-label="Yükleniyor" />
            {note && <p className="max-w-xs text-pretty text-sm text-white/80 drop-shadow">{note}</p>}
          </div>
        </div>
      )}

      {!compact && (
        <>
          {/* Top: the channel's logo and name, plus the window buttons. */}
          <div className={`absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 pb-10 transition-opacity duration-300 sm:p-4 sm:pb-12 ${show ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white drop-shadow sm:text-lg">{channel.name}</p>
                {channel.subtitle && <p className="truncate text-sm text-white/75">{channel.subtitle}</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">{topRight}</div>
          </div>

          {/* Bottom: the controls. */}
          <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-2 pt-12 transition-opacity duration-300 sm:px-4 sm:pb-3 ${show ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            {isVod && (
              <input
                type="range"
                min={0}
                max={Math.floor(total)}
                value={Math.floor(time)}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Konum"
                className="mb-1 h-1.5 w-full cursor-pointer accent-accent"
              />
            )}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {onPrev && (
                <ControlButton label="Önceki kanal (←)" onClick={onPrev}>
                  <SkipBack size={20} fill="currentColor" aria-hidden="true" />
                </ControlButton>
              )}
              <ControlButton label={paused ? 'Oynat (boşluk)' : 'Duraklat (boşluk)'} onClick={togglePlay}>
                {paused ? <Play size={22} fill="currentColor" aria-hidden="true" /> : <Pause size={22} fill="currentColor" aria-hidden="true" />}
              </ControlButton>
              {onNext && (
                <ControlButton label="Sonraki kanal (→)" onClick={onNext}>
                  <SkipForward size={20} fill="currentColor" aria-hidden="true" />
                </ControlButton>
              )}
              <ControlButton label={muted || volume === 0 ? 'Sesi aç (M)' : 'Sesi kapat (M)'} onClick={toggleMute}>
                {muted || volume === 0 ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
              </ControlButton>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Ses düzeyi"
                className="hidden h-1.5 w-24 cursor-pointer accent-accent sm:block"
              />
              <div className="min-w-0 flex-1 px-2 text-right text-sm tabular-nums text-white/80">
                {isVod ? (
                  `${clockTime(time)} / ${clockTime(total)}`
                ) : (
                  <span className="inline-flex items-center gap-2">
                    {navLabel && <span className="hidden text-white/65 sm:inline">{navLabel}</span>}
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-danger/90 px-2 py-0.5 text-xs font-bold tracking-wider text-white">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white" /> CANLI
                    </span>
                  </span>
                )}
              </div>
              {trackMenus && <LanguageMenu tracks={tracks} onAudio={selectAudio} onSubtitle={selectSubtitle} onSubtitleFile={addSubtitleFile} onOpenChange={setMenuOpen} subtitleNote={subtitleNote} />}
              <ControlButton label={fullscreen ? 'Tam ekrandan çık (F)' : 'Tam ekran (F)'} onClick={toggleFullscreen}>
                {fullscreen ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
              </ControlButton>
            </div>
          </div>
        </>
      )}

      {message && (
        <div role="alert" className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
          <div className="max-w-md">
            <AlertTriangle className="mx-auto text-danger" size={28} aria-hidden="true" />
            <p className="mt-3 text-pretty text-sm text-[var(--ink-2)]">{message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface PlayerProps {
  channel: Channel | null
  autoplay?: boolean
  className?: string
  compact?: boolean
  onPrev?: () => void
  onNext?: () => void
  navLabel?: string
  topRight?: ReactNode
  wantFullscreen?: boolean
  onFullscreenHandled?: () => void
  onBack?: () => void
  trackMenus?: boolean
  transcode?: TranscodeMode
}

export function Player({ channel, autoplay = true, className = 'rounded-2xl border border-white/10', compact = false, onPrev, onNext, navLabel, topRight, wantFullscreen, onFullscreenHandled, onBack, trackMenus, transcode }: PlayerProps) {
  if (!channel) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-2xl border border-dashed border-white/15 bg-black/40 p-6 text-center">
        <div>
          <Tv className="mx-auto text-[var(--subtle)]" size={34} aria-hidden="true" />
          <p className="mt-3 text-sm text-[var(--subtle)]">İzlemek için listeden bir kanal seç.</p>
        </div>
      </div>
    )
  }
  // No key on purpose: the same <video> and wrapper stay mounted for every channel, so full screen survives a channel change.
  return <PlayerCore channel={channel} autoplay={autoplay} className={className} compact={compact} onPrev={onPrev} onNext={onNext} navLabel={navLabel} topRight={topRight} wantFullscreen={wantFullscreen} onFullscreenHandled={onFullscreenHandled} onBack={onBack} trackMenus={trackMenus} transcode={transcode} />
}
