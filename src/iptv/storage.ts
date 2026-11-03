const FAV_KEY = 'iptv-player:favorites:v1'
const LAST_KEY = 'iptv-player:last:v1'

export type Favorites = Record<string, true>

export function loadFavorites(): Favorites {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(FAV_KEY) ?? '{}')
    return typeof data === 'object' && data !== null && !Array.isArray(data) ? (data as Favorites) : {}
  } catch {
    return {}
  }
}

export function saveFavorites(fav: Favorites): void {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(fav))
  } catch {
    // Storage unavailable; favorites just won't persist.
  }
}

export const favKey = (playlistId: string, channelId: string): string => `${playlistId}:${channelId}`

export interface LastWatched {
  playlistId: string
  channelId: string
}

export function loadLast(): LastWatched | null {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null')
    if (typeof data === 'object' && data !== null) {
      const d = data as Record<string, unknown>
      if (typeof d.playlistId === 'string' && typeof d.channelId === 'string') return { playlistId: d.playlistId, channelId: d.channelId }
    }
  } catch {
    // ignore
  }
  return null
}

export function saveLast(last: LastWatched): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(last))
  } catch {
    // ignore
  }
}
