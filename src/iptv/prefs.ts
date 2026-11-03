import type { Kind } from './kinds'

export type CardSize = 'sm' | 'md' | 'lg'
export type EpgRefresh = 'off' | '6' | '12' | '24'

export interface Prefs {
  /** Left menu shows only icons. */
  sidebarCollapsed: boolean
  showLogos: boolean
  cardSize: CardSize
  autoplay: boolean
  bufferSeconds: 10 | 30 | 60
  hardwareDecoding: boolean
  epgUrl: string
  epgRefresh: EpgRefresh
}

export const DEFAULT_PREFS: Prefs = {
  sidebarCollapsed: false,
  showLogos: true,
  cardSize: 'md',
  autoplay: true,
  bufferSeconds: 30,
  hardwareDecoding: true,
  epgUrl: '',
  epgRefresh: '24',
}

const PREFS_KEY = 'iptv-player:prefs:v1'
const HIDDEN_KEY = 'iptv-player:hidden-categories:v1'

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function loadPrefs(): Prefs {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null')
    if (!isRecord(raw)) return DEFAULT_PREFS
    const d = DEFAULT_PREFS
    return {
      sidebarCollapsed: typeof raw.sidebarCollapsed === 'boolean' ? raw.sidebarCollapsed : d.sidebarCollapsed,
      showLogos: typeof raw.showLogos === 'boolean' ? raw.showLogos : d.showLogos,
      cardSize: raw.cardSize === 'sm' || raw.cardSize === 'md' || raw.cardSize === 'lg' ? raw.cardSize : d.cardSize,
      autoplay: typeof raw.autoplay === 'boolean' ? raw.autoplay : d.autoplay,
      bufferSeconds: raw.bufferSeconds === 10 || raw.bufferSeconds === 30 || raw.bufferSeconds === 60 ? raw.bufferSeconds : d.bufferSeconds,
      hardwareDecoding: typeof raw.hardwareDecoding === 'boolean' ? raw.hardwareDecoding : d.hardwareDecoding,
      epgUrl: typeof raw.epgUrl === 'string' ? raw.epgUrl.slice(0, 500) : d.epgUrl,
      epgRefresh: raw.epgRefresh === 'off' || raw.epgRefresh === '6' || raw.epgRefresh === '12' || raw.epgRefresh === '24' ? raw.epgRefresh : d.epgRefresh,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Storage unavailable; settings just won't persist.
  }
}

/** Hidden category names, per playlist and content type. */
export type HiddenMap = Record<string, string[]>

export const hiddenKey = (playlistId: string, kind: Kind): string => `${playlistId}:${kind}`

export function loadHidden(): HiddenMap {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? 'null')
    if (!isRecord(raw)) return {}
    const out: HiddenMap = {}
    for (const [k, v] of Object.entries(raw)) {
      if (Array.isArray(v)) out[k] = (v as unknown[]).filter((x): x is string => typeof x === 'string')
    }
    return out
  } catch {
    return {}
  }
}

export function saveHidden(map: HiddenMap): void {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}
