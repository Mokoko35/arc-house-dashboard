import type { ArcHouseProfile } from '@/lib/arcHouse'
import type { GithubStats } from '@/lib/github'

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
  githubError?: string
}

const n = (v: number) => v.toLocaleString('en-US')
const plural = (count: number, word: string) => `${n(count)} ${word}${count === 1 ? '' : 's'}`

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function walletLine(s: Snapshot): string {
  if (!s.walletConnected) return 'Wallet: not connected. Connect one to include your USDC balance.'
  if (s.usdc === undefined) return 'Wallet: still loading your balance from Arc Testnet.'
  const tx = s.txCount === undefined ? '' : ` across ${plural(s.txCount, 'transaction')}`
  return `Wallet: ${s.usdc} USDC on Arc Testnet${tx}.`
}

function houseLine(s: Snapshot): string {
  const p = s.profile
  if (!p) return 'Arc House: no data yet. Import your export or enter your points to include them.'
  const badges = p.badges.length ? `, ${plural(p.badges.length, 'badge')}` : ', no badges yet'
  return `Arc House: ${n(p.points)} points, ${p.tier}${badges}.`
}

function githubLine(s: Snapshot): string {
  if (s.githubError) return `GitHub: unavailable right now (${s.githubError})`
  const g = s.github
  if (!g) return 'GitHub: still loading.'
  const activity =
    g.eventsLast7d > 0
      ? `${plural(g.eventsLast7d, 'public event')} in the last 7 days (${plural(g.pushesLast7d, 'push')})`
      : 'no public activity in the last 7 days'
  const latest = g.recentRepos[0] ? ` Latest push: ${g.recentRepos[0].name}.` : ''
  return `GitHub: ${plural(g.repos, 'repo')}, ${plural(g.stars, 'star')}, ${plural(g.followers, 'follower')}; ${activity}.${latest}`
}

export function buildBriefing(s: Snapshot): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return [`${greeting()}. Here is your Daily Briefing for ${today}.`, walletLine(s), houseLine(s), githubLine(s)].join('\n\n')
}

export const SUGGESTIONS = ['Daily briefing', 'My balance', 'Arc House points', 'GitHub activity']

const has = (q: string, words: string[]) => words.some((w) => q.includes(w))

/** Answers questions from dashboard data only. This is a rule-based helper, not a language model. */
export function answer(question: string, s: Snapshot): string {
  const q = question.toLowerCase()

  if (has(q, ['brief', 'summary', 'summar', 'overview', 'today', 'everything'])) return buildBriefing(s)

  if (has(q, ['address'])) {
    return s.address ? `Your connected wallet is ${s.address}.` : 'No wallet is connected yet.'
  }

  if (has(q, ['nonce', 'transaction', 'txn', 'tx '])) {
    if (!s.walletConnected) return 'Connect your wallet and I can tell you your transaction count.'
    return s.txCount === undefined
      ? 'Your transaction count is still loading.'
      : `Your wallet has sent ${plural(s.txCount, 'transaction')} on Arc Testnet (that is your nonce).`
  }

  if (has(q, ['balance', 'usdc', 'wallet', 'money', 'funds'])) {
    if (!s.walletConnected) return 'No wallet is connected. Connect one and I will read your USDC balance.'
    return s.usdc === undefined
      ? 'Your balance is still loading.'
      : `You hold ${s.usdc} USDC on Arc Testnet.${s.usdc === '0.00' ? ' Use "Get test USDC" in the Arc Studio sidebar to top up.' : ''}`
  }

  if (has(q, ['badge'])) {
    if (!s.profile) return 'No Arc House data yet. Import it first.'
    return s.profile.badges.length
      ? `Your badges: ${s.profile.badges.map((b) => b.name).join(', ')}.`
      : 'You have no badges recorded yet.'
  }

  if (has(q, ['tier', 'level', 'rank'])) {
    return s.profile ? `Your current tier is ${s.profile.tier}.` : 'No Arc House data yet. Import it first.'
  }

  if (has(q, ['point', 'arc house', 'house', 'xp'])) {
    return s.profile ? houseLine(s) : 'No Arc House data yet. Paste your export or enter your points in the Import data section.'
  }

  if (has(q, ['star', 'repo', 'follower', 'github', 'commit', 'push', 'activity', 'code'])) {
    if (s.githubError) return githubLine(s)
    const g = s.github
    if (!g) return 'GitHub stats are still loading.'
    if (has(q, ['star'])) return `Your public repos have ${plural(g.stars, 'star')} in total.`
    if (has(q, ['follower'])) return `You have ${plural(g.followers, 'follower')} on GitHub.`
    return githubLine(s)
  }

  if (has(q, ['hello', 'hi', 'hey', 'help', 'what can'])) {
    return 'I can answer from your dashboard: wallet balance and transactions, Arc House points, tier and badges, and GitHub repos, stars, followers and activity. Ask for a briefing any time.'
  }

  return 'I can only answer from your dashboard data. Try asking about your balance, transactions, Arc House points, tier, badges, or GitHub activity.'
}
