import type { Channel } from './types'

export type Kind = 'live' | 'movie' | 'series'

export const KINDS: Kind[] = ['live', 'movie', 'series']

export const KIND_LABEL: Record<Kind, string> = { live: 'Canlı TV', movie: 'Filmler', series: 'Diziler' }
export const KIND_BADGE: Record<Kind, string> = { live: 'CANLI', movie: 'FİLM', series: 'DİZİ' }

export const UNCATEGORIZED = 'Kategorisiz'

/** Xtream portals put films under /movie/ and series under /series/. Plain M3U lists fall back to the file type. */
export function kindOf(channel: Channel): Kind {
  if (channel.seriesId) return 'series'
  const url = channel.url.toLowerCase()
  if (url.includes('/movie/')) return 'movie'
  if (url.includes('/series/')) return 'series'
  if (/\.(mp4|mkv|avi)(\?|$)/.test(url)) return 'movie'
  return 'live'
}

export const groupOf = (channel: Channel): string => channel.group || UNCATEGORIZED

export type Partition = Record<Kind, Channel[]>

export function partition(channels: Channel[]): Partition {
  const out: Partition = { live: [], movie: [], series: [] }
  for (const c of channels) out[kindOf(c)].push(c)
  return out
}

export interface Category {
  name: string
  count: number
}

export function categoriesOf(channels: Channel[]): Category[] {
  const counts = new Map<string, number>()
  for (const c of channels) counts.set(groupOf(c), (counts.get(groupOf(c)) ?? 0) + 1)
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}
