import { clock } from './epgFormat'
import type { Epg } from './useEpg'
import type { Channel } from './types'

/** "Now" and "Next" for a live channel, shown in the player window. */
export function EpgPanel({ channel, epg }: { channel: Channel; epg: Epg }) {
  const guide = epg.nowNext(channel)

  if (!guide) {
    const text =
      epg.status === 'loading'
        ? 'Program rehberi yükleniyor...'
        : epg.status === 'error'
          ? epg.error
          : epg.url
            ? 'Bu kanal için program bilgisi bulunamadı.'
            : 'Program rehberi için Ayarlar > EPG bölümüne bir adres ekleyebilirsin.'
    return <p className="mt-3 text-sm text-[var(--subtle)]">{text}</p>
  }

  const upcoming = [guide.next, ...guide.later].filter((p) => p !== undefined)

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {guide.now ? (
        <section aria-label="Şimdi oynuyor" className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4">
          <p className="label text-[var(--accent)]">Şimdi</p>
          <p className="mt-1 text-base font-semibold text-[var(--ink)]">{guide.now.title}</p>
          <p className="text-xs tabular-nums text-[var(--subtle)]">
            {clock(guide.now.start)} - {clock(guide.now.stop)}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(guide.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Programın ilerlemesi">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.round(guide.progress * 100)}%` }} />
          </div>
          {guide.now.desc && <p className="mt-2 line-clamp-3 text-pretty text-xs text-[var(--ink-2)]">{guide.now.desc}</p>}
        </section>
      ) : (
        <section className="rounded-2xl border border-white/10 p-4 text-sm text-[var(--subtle)]">Şu an için program bilgisi yok.</section>
      )}

      {upcoming.length > 0 && (
        <section aria-label="Sıradaki programlar" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="label">Sonra</p>
          <ul className="mt-2 space-y-2">
            {upcoming.map((p) => (
              <li key={p.start} className="flex gap-3 text-sm">
                <span className="shrink-0 tabular-nums text-xs text-[var(--subtle)]">{clock(p.start)}</span>
                <span className="min-w-0 truncate text-[var(--ink-2)]">{p.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
