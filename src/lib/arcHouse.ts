/**
 * Arc House profile data. There is no public Arc House API, so this data is
 * entered by the user (pasted JSON export or manual edit) and kept in the browser.
 */

export interface Badge {
  name: string
  description?: string
}

export interface ArcHouseProfile {
  handle?: string
  points: number
  tier: string
  badges: Badge[]
  updatedAt: number
}

const STORAGE_KEY = 'arc-house-dashboard:profile:v1'

export const EMPTY_PROFILE: ArcHouseProfile = {
  points: 0,
  tier: 'Tier 0',
  badges: [],
  updatedAt: 0,
}

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

function pick(obj: Json, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  }
  return undefined
}

function toPoints(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.floor(v))
  if (typeof v === 'string') {
    const n = Number(v.replace(/,/g, '').trim())
    if (v.trim() !== '' && Number.isFinite(n)) return Math.max(0, Math.floor(n))
  }
  return undefined
}

function toTier(v: unknown): string | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return `Tier ${v}`
  if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 40)
  if (isObject(v)) {
    const inner = pick(v, ['name', 'title', 'label', 'level', 'tier'])
    return inner === v ? undefined : toTier(inner)
  }
  return undefined
}

function toBadge(v: unknown): Badge | undefined {
  if (typeof v === 'string' && v.trim()) return { name: v.trim().slice(0, 60) }
  if (isObject(v)) {
    const name = pick(v, ['name', 'title', 'label', 'id', 'slug'])
    if (typeof name === 'string' && name.trim()) {
      const description = pick(v, ['description', 'desc'])
      return {
        name: name.trim().slice(0, 60),
        description: typeof description === 'string' ? description.slice(0, 160) : undefined,
      }
    }
  }
  return undefined
}

export function dedupeBadges(badges: Badge[]): Badge[] {
  const seen = new Set<string>()
  return badges.filter((b) => {
    const key = b.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export type ParseResult = { ok: true; profile: ArcHouseProfile; found: string[] } | { ok: false; error: string }

/** Parse a pasted Arc House export. Accepts a few common key spellings and nested wrappers. */
export function parseArcHouseJson(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'Paste your exported JSON first.' }

  let raw: unknown
  try {
    raw = JSON.parse(trimmed)
  } catch {
    return { ok: false, error: 'That is not valid JSON. Check for missing quotes or trailing commas.' }
  }

  let root: unknown = Array.isArray(raw) ? raw[0] : raw
  for (const wrapper of ['profile', 'user', 'member', 'data']) {
    if (isObject(root) && isObject(root[wrapper]) && pick(root, ['points', 'totalPoints', 'tier', 'badges']) === undefined) {
      root = root[wrapper]
    }
  }
  if (!isObject(root)) return { ok: false, error: 'Expected a JSON object with points, tier, or badges.' }

  const points = toPoints(pick(root, ['points', 'totalPoints', 'total_points', 'xp', 'score']))
  const tier = toTier(pick(root, ['tier', 'tierName', 'tier_name', 'level', 'rank']))
  const rawBadges = pick(root, ['badges', 'achievements', 'badgeList'])
  const badges = Array.isArray(rawBadges)
    ? dedupeBadges(rawBadges.map(toBadge).filter((b): b is Badge => b !== undefined))
    : undefined
  const handleRaw = pick(root, ['handle', 'username', 'name', 'displayName'])
  const handle = typeof handleRaw === 'string' && handleRaw.trim() ? handleRaw.trim().slice(0, 40) : undefined

  const found: string[] = []
  if (points !== undefined) found.push('points')
  if (tier !== undefined) found.push('tier')
  if (badges !== undefined) found.push(`${badges.length} badge${badges.length === 1 ? '' : 's'}`)
  if (found.length === 0) {
    return { ok: false, error: 'No points, tier, or badges found. Expected keys like "points", "tier", and "badges".' }
  }

  return {
    ok: true,
    found,
    profile: {
      handle,
      points: points ?? 0,
      tier: tier ?? EMPTY_PROFILE.tier,
      badges: badges ?? [],
      updatedAt: Date.now(),
    },
  }
}

export function loadProfile(): ArcHouseProfile | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (!text) return null
    const data: unknown = JSON.parse(text)
    if (!isObject(data)) return null
    const points = toPoints(data.points) ?? 0
    const tier = toTier(data.tier) ?? EMPTY_PROFILE.tier
    const badges = Array.isArray(data.badges)
      ? dedupeBadges(data.badges.map(toBadge).filter((b): b is Badge => b !== undefined))
      : []
    const handle = typeof data.handle === 'string' ? data.handle : undefined
    const updatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : 0
    return { handle, points, tier, badges, updatedAt }
  } catch {
    return null
  }
}

export function saveProfile(profile: ArcHouseProfile | null): void {
  try {
    if (profile) localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode); the profile just won't persist.
  }
}

export const SAMPLE_JSON = `{
  "handle": "your-name",
  "points": 1250,
  "tier": "Architect",
  "badges": ["Early Builder", "Testnet Pioneer"]
}`
