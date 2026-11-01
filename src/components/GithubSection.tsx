import { ExternalLink, GitFork, Github, RefreshCw, Star, Users } from 'lucide-react'
import { GITHUB_USERNAME } from '@/lib/github'
import { useGithub } from '@/hooks/useGithub'

function pushedAgo(iso: string | null): string {
  if (!iso) return ''
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function Tile({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: number | undefined }) {
  return (
    <div className="inner p-4">
      <p className="label flex items-center gap-1.5">
        <Icon size={12} /> {label}
      </p>
      {value === undefined ? (
        <div className="mt-3 h-8 w-16 animate-pulse rounded-lg bg-white/10" />
      ) : (
        <p className="display mt-2 text-3xl font-semibold tabular-nums">{value.toLocaleString('en-US')}</p>
      )}
    </div>
  )
}

export function GithubSection() {
  const { data, isLoading, isFetching, isError, error, refetch } = useGithub()

  return (
    <section className="card p-6 sm:p-8" aria-labelledby="github-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label">Section 3</p>
          <h2 id="github-title" className="display mt-1 text-2xl font-semibold">
            GitHub
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={data?.url ?? `https://github.com/${GITHUB_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:border-white/25"
          >
            <Github size={13} /> @{GITHUB_USERNAME}
            <ExternalLink size={11} />
          </a>
          <button
            type="button"
            onClick={() => void refetch()}
            aria-label="Refresh GitHub stats"
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--subtle)] transition hover:bg-white/10 hover:text-[var(--ink)]"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {isError ? (
        <div className="mt-6 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-4">
          <p className="text-sm text-[var(--ink-2)]">{error instanceof Error ? error.message : 'Could not load GitHub stats.'}</p>
          <button type="button" onClick={() => void refetch()} className="btn-ghost mt-3">
            Try again
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {data && (
            <div className="flex items-center gap-4">
              <img src={data.avatarUrl} alt="" width={48} height={48} className="h-12 w-12 rounded-full border border-white/15" />
              <div className="min-w-0">
                <p className="display truncate text-lg font-semibold">{data.name ?? data.login}</p>
                {data.bio && <p className="truncate text-sm text-[var(--subtle)]">{data.bio}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Tile icon={GitFork} label="Repos" value={data?.repos} />
            <Tile icon={Star} label="Stars" value={data?.stars} />
            <Tile icon={Users} label="Followers" value={data?.followers} />
          </div>

          {data && (
            <div className="inner p-5">
              <div className="flex items-center justify-between">
                <p className="label">Recently pushed</p>
                <span className="text-xs tabular-nums text-[var(--subtle)]">
                  {data.eventsLast7d} public event{data.eventsLast7d === 1 ? '' : 's'} in 7 days
                </span>
              </div>
              {data.recentRepos.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--subtle)]">No public repositories yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-white/10">
                  {data.recentRepos.map((r) => (
                    <li key={r.name} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-sm font-medium text-[var(--ink-2)] hover:text-[var(--accent)]"
                        >
                          {r.name}
                        </a>
                        <p className="truncate text-xs text-[var(--subtle)]">
                          {[r.language, pushedAgo(r.pushedAt)].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-[var(--subtle)]">
                        <Star size={12} /> {r.stars}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {isLoading && <p className="text-sm text-[var(--subtle)]">Loading from the GitHub API...</p>}
        </div>
      )}
    </section>
  )
}
