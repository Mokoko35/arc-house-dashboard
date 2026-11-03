import { Trophy } from 'lucide-react'
import type { LeaderboardEntry } from '@/lib/arcHouse'
import { useI18n } from '@/i18n/useI18n'

export function LeaderboardCard({ entries, myHandle }: { entries: LeaderboardEntry[]; myHandle?: string }) {
  const { t, locale } = useI18n()
  if (entries.length === 0) return null
  return (
    <section className="card p-5 sm:p-6 lg:p-8" aria-labelledby="board-title">
      <p className="label flex items-center gap-1.5">
        <Trophy size={12} /> {t('board.from')}
      </p>
      <h2 id="board-title" className="display mt-1 text-2xl font-semibold">
        {t('board.title')}
      </h2>
      <ol className="mt-5 divide-y divide-white/10">
        {entries.map((e) => {
          const mine = myHandle !== undefined && e.name.toLowerCase() === myHandle.toLowerCase()
          return (
            <li key={`${e.rank}-${e.name}`} className="flex items-center gap-4 py-3">
              <span className="display w-8 text-lg font-semibold tabular-nums text-[var(--subtle)]">{e.rank}</span>
              <span className={`min-w-0 flex-1 truncate text-sm ${mine ? 'font-semibold text-[var(--accent)]' : 'text-[var(--ink-2)]'}`}>
                {e.name}
                {mine && ` ${t('board.you')}`}
              </span>
              <span className="text-sm tabular-nums text-[var(--ink)]">{e.points.toLocaleString(locale)}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
