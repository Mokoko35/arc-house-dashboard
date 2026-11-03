import type { Channel } from './types'

/** Small stable hash so a channel keeps the same id across refreshes. */
export function hashId(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function parseAttributes(line: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of line.matchAll(/([A-Za-z0-9_-]+)="([^"]*)"/g)) {
    const key = m[1]
    if (key) attrs[key.toLowerCase()] = m[2] ?? ''
  }
  return attrs
}

export function looksLikeM3U(text: string): boolean {
  return /^\s*#EXTM3U/i.test(text.replace(/^\uFEFF/, ''))
}

/** Parses an extended M3U / M3U8 playlist into channels. Unknown tags are ignored. */
export function parseM3U(raw: string): Channel[] {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/)
  const channels: Channel[] = []
  const seen = new Map<string, number>()
  let pending: { name: string; logo?: string; group?: string; tvgId?: string } | null = null
  let extGroup: string | undefined

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('#EXTINF')) {
      const comma = line.indexOf(',')
      const title = comma >= 0 ? line.slice(comma + 1).trim() : ''
      const attrs = parseAttributes(comma >= 0 ? line.slice(0, comma) : line)
      pending = {
        name: title || attrs['tvg-name'] || 'Adsız kanal',
        logo: attrs['tvg-logo'] || undefined,
        group: attrs['group-title'] || extGroup || undefined,
        tvgId: attrs['tvg-id'] || undefined,
      }
    } else if (line.startsWith('#EXTGRP:')) {
      extGroup = line.slice(8).trim() || undefined
    } else if (line.startsWith('#')) {
      continue
    } else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(line)) {
      const info = pending ?? { name: line.split('/').pop() ?? line }
      const base = hashId(line)
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      channels.push({
        id: count === 0 ? base : `${base}-${count}`,
        name: info.name,
        url: line,
        logo: 'logo' in info ? info.logo : undefined,
        group: 'group' in info ? info.group : undefined,
        tvgId: 'tvgId' in info ? info.tvgId : undefined,
      })
      pending = null
    }
  }
  return channels
}
