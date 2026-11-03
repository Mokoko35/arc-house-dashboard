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

export interface FoundFields {
  points: boolean
  tier: boolean
  badges: number | null
}

/** `errorKey` is a message key (see src/i18n) so the UI can show it in the active language. */
export type ParseResult = { ok: true; profile: ArcHouseProfile; found: FoundFields } | { ok: false; errorKey: string }

/** Parse a pasted Arc House export. Accepts a few common key spellings and nested wrappers. */
export function parseArcHouseJson(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, errorKey: 'parse.empty' }

  let raw: unknown
  try {
    raw = JSON.parse(trimmed)
  } catch {
    return { ok: false, errorKey: 'parse.invalid' }
  }

  let root: unknown = Array.isArray(raw) ? raw[0] : raw
  for (const wrapper of ['profile', 'user', 'member', 'data']) {
    if (isObject(root) && isObject(root[wrapper]) && pick(root, ['points', 'totalPoints', 'tier', 'badges']) === undefined) {
      root = root[wrapper]
    }
  }
  if (!isObject(root)) return { ok: false, errorKey: 'parse.notObject' }

  const points = toPoints(pick(root, ['points', 'totalPoints', 'total_points', 'xp', 'score']))
  const tier = toTier(pick(root, ['tier', 'tierName', 'tier_name', 'level', 'rank']))
  const rawBadges = pick(root, ['badges', 'achievements', 'badgeList'])
  const badges = Array.isArray(rawBadges)
    ? dedupeBadges(rawBadges.map(toBadge).filter((b): b is Badge => b !== undefined))
    : undefined
  const handleRaw = pick(root, ['handle', 'username', 'name', 'displayName'])
  const handle = typeof handleRaw === 'string' && handleRaw.trim() ? handleRaw.trim().slice(0, 40) : undefined

  const found: FoundFields = { points: points !== undefined, tier: tier !== undefined, badges: badges?.length ?? null }
  if (!found.points && !found.tier && found.badges === null) {
    return { ok: false, errorKey: 'parse.nothing' }
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

/* ------------------------------------------------------------------ */
/* Loose extraction from Arc House GraphQL responses (shape unverified) */
/* ------------------------------------------------------------------ */

const asArray = (v: unknown): unknown[] | null => (Array.isArray(v) ? (v as unknown[]) : null)

function findDeep(root: unknown, keys: string[], accept: (v: unknown) => boolean): unknown {
  for (const key of keys.map((k) => k.toLowerCase())) {
    const queue: unknown[] = [root]
    let visited = 0
    while (queue.length > 0 && visited < 5000) {
      const cur = queue.shift()
      visited++
      const arr = asArray(cur)
      if (arr) {
        queue.push(...arr.slice(0, 200))
      } else if (isObject(cur)) {
        for (const [k, v] of Object.entries(cur)) {
          if (k.toLowerCase() === key && accept(v)) return v
        }
        queue.push(...Object.values(cur))
      }
    }
  }
  return undefined
}

/** Build a profile from any number of raw GraphQL `data` objects. Returns null if nothing recognizable. */
export function extractProfile(sources: unknown[]): ArcHouseProfile | null {
  let points: number | undefined
  let tier: string | undefined
  let badges: Badge[] | undefined
  let handle: string | undefined

  for (const src of sources) {
    points ??= toPoints(
      findDeep(src, ['totalPoints', 'currentPoints', 'pointBalance', 'points', 'point'], (v) => toPoints(v) !== undefined),
    )
    tier ??= toTier(findDeep(src, ['tierName', 'tier', 'levelName', 'level'], (v) => toTier(v) !== undefined))
    if (!badges) {
      const arr = asArray(
        findDeep(src, ['badges', 'earnedBadges', 'myBadges'], (v) => asArray(v)?.some((b) => toBadge(b)) === true),
      )
      if (arr) badges = dedupeBadges(arr.map(toBadge).filter((b): b is Badge => b !== undefined))
    }
    const h = findDeep(src, ['username', 'displayName', 'fullName'], (v) => typeof v === 'string' && v.trim() !== '')
    if (!handle && typeof h === 'string') handle = h.trim().slice(0, 40)
  }

  if (points === undefined && tier === undefined && badges === undefined) return null
  return {
    handle,
    points: points ?? 0,
    tier: tier ?? EMPTY_PROFILE.tier,
    badges: badges ?? [],
    updatedAt: Date.now(),
  }
}

export interface LeaderboardEntry {
  rank: number
  name: string
  points: number
}

function firstString(o: Json, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 60)
  }
  return undefined
}

function firstNumber(o: Json, keys: string[]): number | undefined {
  for (const k of keys) {
    const n = toPoints(o[k])
    if (n !== undefined) return n
  }
  return undefined
}

/** Find the first list of objects that looks like "name + points" rows. */
export function extractLeaderboard(root: unknown): LeaderboardEntry[] {
  const queue: unknown[] = [root]
  let visited = 0
  while (queue.length > 0 && visited < 5000) {
    const cur = queue.shift()
    visited++
    const list = asArray(cur)
    if (list) {
      const rows = list
        .map((item) => {
          if (!isObject(item)) return undefined
          // Rows are sometimes wrapped, e.g. { user: { name }, totalPoints }
          const user = isObject(item.user) ? item.user : isObject(item.member) ? item.member : item
          const name = firstString(user, ['displayName', 'fullName', 'name', 'username', 'handle'])
          const points = firstNumber(item, ['totalPoints', 'points', 'score', 'contributionPoints'])
          return name !== undefined && points !== undefined ? { name, points } : undefined
        })
        .filter((r): r is { name: string; points: number } => r !== undefined)
      if (rows.length >= 2) {
        return rows
          .sort((a, b) => b.points - a.points)
          .slice(0, 25)
          .map((r, i) => ({ rank: i + 1, ...r }))
      }
      queue.push(...list.slice(0, 200))
    } else if (isObject(cur)) {
      queue.push(...Object.values(cur))
    }
  }
  return []
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
