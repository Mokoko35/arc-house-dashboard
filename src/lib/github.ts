/** Public GitHub REST API (no auth). Unauthenticated requests are rate limited per IP. */

export const GITHUB_USERNAME = 'Mokoko35'

const API = 'https://api.github.com'
const HEADERS = { Accept: 'application/vnd.github+json' }

interface GhUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
  bio: string | null
  public_repos: number
  followers: number
  following: number
}

interface GhRepo {
  name: string
  html_url: string
  description: string | null
  stargazers_count: number
  language: string | null
  fork: boolean
  pushed_at: string | null
}

interface GhEvent {
  type: string
  created_at: string
}

export interface RepoSummary {
  name: string
  url: string
  description: string | null
  stars: number
  language: string | null
  pushedAt: string | null
}

export interface GithubStats {
  login: string
  name: string | null
  avatarUrl: string
  url: string
  bio: string | null
  repos: number
  stars: number
  followers: number
  following: number
  recentRepos: RepoSummary[]
  eventsLast7d: number
  pushesLast7d: number
}

export type GithubErrorCode = 'network' | 'notFound' | 'rateLimit' | 'http'

/** Carries a code instead of display text so the UI can translate it. */
export class GithubError extends Error {
  readonly code: GithubErrorCode
  readonly status?: number
  constructor(code: GithubErrorCode, status?: number) {
    super(`GitHub error: ${code}${status ? ` (${status})` : ''}`)
    this.code = code
    this.status = status
  }
}

export function githubErrorKey(error: unknown): { key: string; params?: Record<string, string | number> } {
  if (error instanceof GithubError) {
    if (error.code === 'notFound') return { key: 'github.err.notFound', params: { user: GITHUB_USERNAME } }
    if (error.code === 'http') return { key: 'github.err.http', params: { status: error.status ?? 0 } }
    return { key: error.code === 'rateLimit' ? 'github.err.rateLimit' : 'github.err.network' }
  }
  return { key: 'github.loadError' }
}

async function getJson<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API}${path}`, { headers: HEADERS })
  } catch {
    throw new GithubError('network')
  }
  if (res.status === 404) throw new GithubError('notFound')
  if (res.status === 403 || res.status === 429) {
    throw new GithubError('rateLimit')
  }
  if (!res.ok) throw new GithubError('http', res.status)
  return (await res.json()) as T
}

async function getAllRepos(publicRepos: number): Promise<GhRepo[]> {
  const pages = Math.min(Math.max(Math.ceil(publicRepos / 100), 1), 5)
  const all: GhRepo[] = []
  for (let page = 1; page <= pages; page++) {
    const chunk = await getJson<GhRepo[]>(`/users/${GITHUB_USERNAME}/repos?per_page=100&page=${page}&sort=pushed`)
    all.push(...chunk)
    if (chunk.length < 100) break
  }
  return all
}

export async function fetchGithubStats(): Promise<GithubStats> {
  const user = await getJson<GhUser>(`/users/${GITHUB_USERNAME}`)
  const [repos, events] = await Promise.all([
    getAllRepos(user.public_repos),
    getJson<GhEvent[]>(`/users/${GITHUB_USERNAME}/events/public?per_page=100`).catch(() => [] as GhEvent[]),
  ])

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recent = events.filter((e) => new Date(e.created_at).getTime() >= weekAgo)

  const recentRepos = [...repos]
    .sort((a, b) => (Date.parse(b.pushed_at ?? '') || 0) - (Date.parse(a.pushed_at ?? '') || 0))
    .slice(0, 4)
    .map((r) => ({
      name: r.name,
      url: r.html_url,
      description: r.description,
      stars: r.stargazers_count,
      language: r.language,
      pushedAt: r.pushed_at,
    }))

  return {
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
    url: user.html_url,
    bio: user.bio,
    repos: user.public_repos,
    stars: repos.reduce((sum, r) => sum + r.stargazers_count, 0),
    followers: user.followers,
    following: user.following,
    recentRepos,
    eventsLast7d: recent.length,
    pushesLast7d: recent.filter((e) => e.type === 'PushEvent').length,
  }
}
