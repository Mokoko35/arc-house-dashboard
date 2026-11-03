import type { ArcHouseProfile } from '@/lib/arcHouse'
import type { GithubStats } from '@/lib/github'
import type { TFn } from '@/i18n/context'

/** Everything the assistant is allowed to talk about. All values come from the live dashboard. */
export interface Snapshot {
  walletConnected: boolean
  address?: string
  usdc?: string
  txCount?: number
  walletLoading: boolean
  profile: ArcHouseProfile | null
  github?: GithubStats
  githubLoading: boolean
  /** Already translated for display. */
  githubError?: string
}

function greeting(t: TFn): string {
  const h = new Date().getHours()
  if (h < 12) return t('ai.greeting.morning')
  if (h < 18) return t('ai.greeting.afternoon')
  return t('ai.greeting.evening')
}

function walletLine(s: Snapshot, t: TFn): string {
  if (!s.walletConnected) return t('ai.wallet.notConnected')
  if (s.usdc === undefined) return t('ai.wallet.loading')
  if (s.txCount === undefined) return t('ai.wallet.line', { usdc: s.usdc })
  return t('ai.wallet.lineTx', { usdc: s.usdc, tx: t('unit.tx', { n: s.txCount }) })
}

function houseLine(s: Snapshot, t: TFn): string {
  const p = s.profile
  if (!p) return t('ai.house.none')
  const badges = p.badges.length
    ? t('ai.house.badgesSome', { badges: t('unit.badge', { n: p.badges.length }) })
    : t('ai.house.badgesNone')
  return t('ai.house.line', { points: p.points, tier: p.tier, badges })
}

function githubLine(s: Snapshot, t: TFn): string {
  if (s.githubError) return t('ai.gh.unavailable', { error: s.githubError })
  const g = s.github
  if (!g) return t('ai.gh.loading')
  const activity =
    g.eventsLast7d > 0
      ? t('ai.gh.activity', { events: t('unit.event', { n: g.eventsLast7d }), pushes: t('unit.push', { n: g.pushesLast7d }) })
      : t('ai.gh.noActivity')
  const latest = g.recentRepos[0] ? t('ai.gh.latest', { name: g.recentRepos[0].name }) : ''
  return t('ai.gh.line', {
    repos: t('unit.repo', { n: g.repos }),
    stars: t('unit.star', { n: g.stars }),
    followers: t('unit.follower', { n: g.followers }),
    activity,
    latest,
  })
}

export function buildBriefing(s: Snapshot, t: TFn, locale: string): string {
  const date = new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })
  return [t('ai.intro', { greeting: greeting(t), date }), walletLine(s, t), houseLine(s, t), githubLine(s, t)].join('\n\n')
}

export const SUGGESTION_KEYS = ['chat.s.briefing', 'chat.s.balance', 'chat.s.points', 'chat.s.github'] as const

/** Lowercase and strip Turkish diacritics so "Özet", "ozet" and "ÖZET" all match the same keyword. */
function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/\u0307/g, '')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
}

const has = (q: string, words: string[]) => words.some((w) => q.includes(w))
const hasWord = (q: string, words: string[]) => new RegExp(`\\b(${words.join('|')})\\b`).test(q)

/**
 * Answers questions from dashboard data only, in the active language. Questions are understood in
 * English and Turkish regardless of the UI language. This is a rule-based helper, not a language model.
 */
export function answer(question: string, s: Snapshot, t: TFn, locale: string): string {
  const q = fold(question)

  // "ozet" must start a word, otherwise it matches inside "rozet" (badge).
  if (has(q, ['brief', 'summar', 'overview', 'today', 'everything', 'gunluk', 'bugun', 'hersey', 'her sey']) || /\bozet/.test(q)) {
    return buildBriefing(s, t, locale)
  }

  if (has(q, ['address', 'adres'])) {
    return s.address ? t('ai.addr.yes', { address: s.address }) : t('ai.addr.no')
  }

  if (has(q, ['nonce', 'transaction', 'txn', 'tx ', 'islem'])) {
    if (!s.walletConnected) return t('ai.tx.connect')
    return s.txCount === undefined ? t('ai.tx.loading') : t('ai.tx.value', { tx: t('unit.tx', { n: s.txCount }) })
  }

  if (has(q, ['balance', 'usdc', 'wallet', 'money', 'funds', 'bakiye', 'cuzdan', 'para'])) {
    if (!s.walletConnected) return t('ai.bal.connect')
    if (s.usdc === undefined) return t('ai.bal.loading')
    return t('ai.bal.value', { usdc: s.usdc }) + (s.usdc === '0.00' ? t('ai.bal.fund') : '')
  }

  if (has(q, ['badge', 'rozet'])) {
    if (!s.profile) return t('ai.noHouse')
    return s.profile.badges.length
      ? t('ai.badge.list', { names: s.profile.badges.map((b) => b.name).join(', ') })
      : t('ai.badge.none')
  }

  if (has(q, ['tier', 'level', 'rank', 'seviye', 'kademe', 'sira'])) {
    return s.profile ? t('ai.tier.value', { tier: s.profile.tier }) : t('ai.noHouse')
  }

  if (has(q, ['point', 'arc house', 'house', 'xp', 'puan'])) {
    return s.profile ? houseLine(s, t) : t('ai.points.noData')
  }

  if (has(q, ['star', 'repo', 'follower', 'github', 'commit', 'push', 'activity', 'code', 'yildiz', 'depo', 'takipci', 'aktivite', 'kod'])) {
    if (s.githubError) return githubLine(s, t)
    const g = s.github
    if (!g) return t('ai.gh.statsLoading')
    if (has(q, ['star', 'yildiz'])) return t('ai.gh.stars', { stars: t('unit.star', { n: g.stars }) })
    if (has(q, ['follower', 'takipci'])) return t('ai.gh.followers', { followers: t('unit.follower', { n: g.followers }) })
    return githubLine(s, t)
  }

  if (hasWord(q, ['hello', 'hi', 'hey', 'help', 'merhaba', 'selam', 'yardim'])) return t('ai.help')

  return t('ai.fallback')
}
