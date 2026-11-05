import type { SubtitleSource } from './types'

/** One audio or subtitle choice in the player menus. */
export interface TrackOption {
  label: string
}

export interface TrackInfo {
  audio: TrackOption[]
  /** Index of the audio track in use, or -1 when unknown. */
  audioIndex: number
  subs: TrackOption[]
  /** Index of the subtitle track showing, or -1 when subtitles are off. */
  subIndex: number
}

export const EMPTY_TRACKS: TrackInfo = { audio: [], audioIndex: -1, subs: [], subIndex: -1 }

let names: Intl.DisplayNames | null | undefined

/** "tr" or "eng" to "Türkçe" or "İngilizce". Null when the code is not a language. */
export function languageName(code: string | undefined): string | null {
  if (!code) return null
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(['tr'], { type: 'language' })
    } catch {
      names = null
    }
  }
  try {
    const name = names?.of(code.trim())
    return name && name.toLowerCase() !== code.trim().toLowerCase() ? name : null
  } catch {
    return null
  }
}

/** The best label for a track: the maker's own name, else the language, else "Ses 2" or "Altyazı 1". */
export function labelFor(name: string | undefined, lang: string | undefined, fallback: string): string {
  const language = languageName(lang)
  const own = name?.trim()
  if (own && language && own.toLowerCase() === (lang ?? '').trim().toLowerCase()) return language
  if (own && language && !own.toLowerCase().includes(language.toLowerCase()) && own.length <= 3) return `${language} (${own})`
  return own || language || fallback
}

/** SRT is WebVTT with a different header and commas in the times, so the browser can show it after this. */
export function srtToVtt(srt: string): string {
  const body = srt
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
  return `WEBVTT\n\n${body}\n`
}

/** Downloads a subtitle file and returns a blob address the video can use, as WebVTT. Throws when it cannot be read. */
export async function loadSubtitle(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Altyazı ${res.status}`)
  const buf = await res.arrayBuffer()
  let text = new TextDecoder('utf-8').decode(buf)
  // Turkish subtitle files are often Windows-1254, which UTF-8 turns into replacement characters.
  if (text.includes('\uFFFD')) text = new TextDecoder('windows-1254').decode(buf)
  const vtt = /^\uFEFF?\s*WEBVTT/.test(text) ? text : srtToVtt(text)
  return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }))
}

type Rec = Record<string, unknown>
const asRec = (v: unknown): Rec | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Rec) : null)
const asText = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** Subtitle files from a portal's info block. They arrive as a list of addresses or of {url, language} objects. */
export function readSubtitleSources(value: unknown): SubtitleSource[] {
  const items = Array.isArray(value) ? (value as unknown[]) : typeof value === 'string' ? [value] : []
  const out: SubtitleSource[] = []
  for (const item of items) {
    const obj = asRec(item)
    const url = obj ? (asText(obj.url) ?? asText(obj.file) ?? asText(obj.path) ?? asText(obj.src) ?? asText(obj.link)) : asText(item)
    if (!url || !/^https?:\/\//i.test(url)) continue
    out.push({
      url,
      lang: obj ? (asText(obj.lang) ?? asText(obj.language) ?? asText(obj.code)) : undefined,
      label: obj ? (asText(obj.label) ?? asText(obj.title) ?? asText(obj.name)) : undefined,
    })
  }
  return out
}
