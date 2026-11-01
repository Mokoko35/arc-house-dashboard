import { Award, Crown, Sparkles, Trophy } from 'lucide-react'
import type { ArcHouseProfile } from '@/lib/arcHouse'

function timeAgo(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function ProfileSection({ profile, onImport }: { profile: ArcHouseProfile | null; onImport: () => void }) {
  return (
    <section className="card p-6 sm:p-8" aria-labelledby="profile-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label">Section 2</p>
          <h2 id="profile-title" className="display mt-1 text-2xl font-semibold">
            Arc House Profile
          </h2>
        </div>
        {profile && profile.updatedAt > 0 && (
          <span className="text-xs text-[var(--subtle)]">Updated {timeAgo(profile.updatedAt)}</span>
        )}
      </div>

      {!profile ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
            <Sparkles size={22} className="text-[var(--accent)]" />
          </div>
          <div>
            <p className="display text-lg font-semibold">No Arc House data yet</p>
            <p className="mt-1 max-w-xs text-pretty text-sm text-[var(--subtle)]">
              Arc House has no public API, so import your exported JSON or enter your points by hand.
            </p>
          </div>
          <button type="button" onClick={onImport} className="btn-ghost">
            Go to import
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="inner p-5">
              <p className="label flex items-center gap-1.5">
                <Trophy size={12} /> Points
              </p>
              <p className="display mt-2 text-5xl font-semibold tabular-nums">
                {profile.points.toLocaleString('en-US')}
              </p>
              {profile.handle && <p className="mt-2 truncate text-sm text-[var(--subtle)]">@{profile.handle.replace(/^@/, '')}</p>}
            </div>
            <div className="inner p-5">
              <p className="label flex items-center gap-1.5">
                <Crown size={12} /> Current tier
              </p>
              <p className="display mt-2 text-3xl font-semibold text-[var(--accent)]">{profile.tier}</p>
            </div>
          </div>

          <div className="inner p-5">
            <div className="flex items-center justify-between">
              <p className="label flex items-center gap-1.5">
                <Award size={12} /> Badges
              </p>
              <span className="text-xs tabular-nums text-[var(--subtle)]">{profile.badges.length}</span>
            </div>
            {profile.badges.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--subtle)]">No badges recorded yet.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {profile.badges.map((b) => (
                  <li
                    key={b.name}
                    title={b.description}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-2 text-sm text-[var(--ink-2)]"
                  >
                    <Award size={14} className="text-[var(--accent)]" />
                    {b.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
