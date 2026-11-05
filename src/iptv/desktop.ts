import { kindOfUrl } from './kinds'

/** What the Windows desktop shell offers the page (see electron/preload.cjs). Absent in a normal browser. */
export interface TranscodeResult {
  id: string
  /** HLS address of the converted film: the picture and every audio language. */
  playlist: string
  durationSeconds: number
  copiedVideo: boolean
  audioCount: number
  /** Subtitle tracks that are pictures (PGS) and cannot be shown. */
  skippedSubtitles: number
  /** Subtitle files, written in the background; they are complete when the status says "ready". */
  subtitles: { url: string; lang?: string; label: string }[]
}

export type SubtitleJob = 'none' | 'pending' | 'ready' | 'failed'

export interface Desktop {
  transcodeStart: (url: string) => Promise<TranscodeResult>
  transcodeStatus: (id: string) => Promise<{ subtitles: SubtitleJob }>
  transcodeStop: (id: string) => Promise<void>
}

export const desktop = (): Desktop | undefined => (window as unknown as { iptvDesktop?: Desktop }).iptvDesktop

/** auto: only containers the browser engine handles badly (.mkv ...). always: every film and episode. off: never. */
export type TranscodeMode = 'auto' | 'always' | 'off'

export function shouldTranscode(url: string, mode: TranscodeMode): boolean {
  if (mode === 'off' || kindOfUrl(url) === 'live') return false
  const path = url.split('?')[0]?.toLowerCase() ?? ''
  if (path.includes('.m3u8')) return false
  return (mode === 'always' ? /\.(mkv|mp4|m4v|mov|avi|wmv|flv|mpe?g|webm|ts)$/ : /\.(mkv|avi|wmv|flv|mpe?g)$/).test(path)
}
