import { Award, Crown, Sparkles, Trophy } from 'lucide-react'
import type { ArcHouseProfile } from '@/lib/arcHouse'
import { relativeTime, useI18n } from '@/i18n/useI18n'

export function ProfileSection({ profile, onImport }: { profile: ArcHouseProfile | null; onImport: () => void }) {
  const { t, locale } = useI18n()
  return (
    <section className="card p-5 sm:p-6 lg:p-8" aria-labelledby="profile-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label">{t('profile.section')}</p>
          <h2 id="profile-title" className="display mt-1 text-2xl font-semibold">
            {t('profile.title')}
          </h2>
        </div>
        {profile && profile.updatedAt > 0 && (
          <span className="text-xs text-[var(--subtle)]">{t('profile.updated', { when: relativeTime(profile.updatedAt, locale, t('time.now')) })}</span>
        )}
      </div>

      {!profile ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
            <Sparkles size={22} className="text-[var(--accent)]" />
          </div>
          <div>
            <p className="display text-lg font-semibold">{t('profile.emptyTitle')}</p>
            <p className="mt-1 max-w-xs text-pretty text-sm text-[var(--subtle)]">
              {t('profile.emptyDesc')}
            </p>
          </div>
          <button type="button" onClick={onImport} className="btn-ghost">
            {t('profile.goSync')}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="inner p-5">
              <p className="label flex items-center gap-1.5">
                <Trophy size={12} /> {t('profile.points')}
              </p>
              <p className="display mt-2 text-4xl font-semibold tabular-nums sm:text-5xl">
                {profile.points.toLocaleString(locale)}
              </p>
              {profile.handle && <p className="mt-2 truncate text-sm text-[var(--subtle)]">@{profile.handle.replace(/^@/, '')}</p>}
            </div>
            <div className="inner p-5">
              <p className="label flex items-center gap-1.5">
                <Crown size={12} /> {t('profile.tier')}
              </p>
              <p className="display mt-2 text-3xl font-semibold text-[var(--accent)]">{profile.tier}</p>
            </div>
          </div>

          <div className="inner p-5">
            <div className="flex items-center justify-between">
              <p className="label flex items-center gap-1.5">
                <Award size={12} /> {t('profile.badges')}
              </p>
              <span className="text-xs tabular-nums text-[var(--subtle)]">{profile.badges.length}</span>
            </div>
            {profile.badges.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--subtle)]">{t('profile.noBadges')}</p>
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
