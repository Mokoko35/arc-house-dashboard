import { Clapperboard, Home, Library, ListPlus, Settings, Tv } from 'lucide-react'
import { hrefFor, type Page } from './router'
import { useMedia } from './useMedia'

const ITEMS: { page: Page; label: string; icon: typeof Home }[] = [
  { page: 'home', label: 'Ana Sayfa', icon: Home },
  { page: 'live', label: 'Canlı TV', icon: Tv },
  { page: 'movies', label: 'Filmler', icon: Clapperboard },
  { page: 'series', label: 'Diziler', icon: Library },
  { page: 'settings', label: 'Ayarlar', icon: Settings },
]

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)]">
        <Tv size={19} aria-hidden="true" />
      </div>
      <span className="display text-xl font-semibold tracking-tight">IPTV</span>
    </div>
  )
}

export function Sidebar() {
  const { route, parts, lists, openAdd } = useMedia()
  const counts: Partial<Record<Page, number>> = { live: parts.live.length, movies: parts.movie.length, series: parts.series.length }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/10 bg-[#08090c] px-3 py-5 lg:flex" aria-label="Ana menü">
        <div className="px-3">
          <Brand />
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          {ITEMS.map(({ page, label, icon: Icon }) => {
            const on = route.page === page
            const count = counts[page]
            return (
              <a
                key={page}
                href={hrefFor(page)}
                aria-current={on ? 'page' : undefined}
                className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                  on ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--subtle)] hover:bg-white/5 hover:text-[var(--ink)]'
                }`}
              >
                {on && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[var(--accent)]" />}
                <Icon size={19} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {count !== undefined && count > 0 && <span className="text-xs tabular-nums opacity-60">{count.toLocaleString('tr-TR')}</span>}
              </a>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3 px-1">
          {lists.active && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="label">Aktif liste</p>
              <p className="mt-1 truncate text-sm font-medium text-[var(--ink-2)]">{lists.active.name}</p>
              <p className="text-xs tabular-nums text-[var(--subtle)]">{lists.active.channelCount.toLocaleString('tr-TR')} öğe</p>
            </div>
          )}
          <button type="button" onClick={openAdd} className="btn-primary w-full">
            <ListPlus size={16} aria-hidden="true" /> Liste ekle
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-[#08090c]/95 backdrop-blur lg:hidden" aria-label="Ana menü">
        {ITEMS.map(({ page, label, icon: Icon }) => {
          const on = route.page === page
          return (
            <a
              key={page}
              href={hrefFor(page)}
              aria-current={on ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${on ? 'text-[var(--accent)]' : 'text-[var(--subtle)]'}`}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </a>
          )
        })}
      </nav>
    </>
  )
}
