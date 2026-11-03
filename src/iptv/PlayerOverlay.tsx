import { useEffect } from 'react'
import { Heart, Maximize2, Minimize2, Power, X } from 'lucide-react'
import { KIND_BADGE, groupOf, kindOf } from './kinds'
import { Player } from './Player'
import { useMedia } from './useMedia'

const DESCRIPTION = {
  live: 'Program rehberi (EPG) bağlandığında şimdi ve sonra yayınlanacak programlar burada görünecek.',
  movie: 'Film ayrıntıları için kartına tıklayıp özet, oyuncu ve puan bilgisine bakabilirsin.',
  series: 'Dizi ayrıntıları için kartına tıklayıp sezon ve bölümleri görebilirsin.',
} as const

/**
 * The player. It is one element that either fills a large window or docks to the corner, so
 * minimizing keeps the stream playing instead of restarting it.
 */
export function PlayerOverlay() {
  const { current, playerMode, minimizePlayer, expandPlayer, stopPlayer, isFavorite, toggleFavorite, lists, prefs } = useMedia()
  const modal = playerMode === 'modal'

  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') minimizePlayer()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [modal, minimizePlayer])

  if (!current || playerMode === 'closed') return null

  const kind = kindOf(current)
  const fav = isFavorite(current)

  return (
    <>
      {modal && <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm" onClick={minimizePlayer} aria-hidden="true" />}

      <div
        role={modal ? 'dialog' : 'complementary'}
        aria-modal={modal || undefined}
        aria-label={`Oynatıcı: ${current.name}`}
        className={
          modal
            ? 'fixed left-1/2 top-1/2 z-50 max-h-[96dvh] w-[min(1100px,96vw,calc((100dvh_-_250px)*1.7778))] min-w-[min(96vw,360px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/15 bg-[#14151a] shadow-2xl'
            : 'fixed bottom-[4.5rem] right-3 z-40 w-64 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl sm:w-80 lg:bottom-5 lg:right-5'
        }
      >
        <Player channel={current} autoplay={prefs.autoplay} className={modal ? 'rounded-none' : 'rounded-none'} />

        {modal ? (
          <>
            <button
              type="button"
              onClick={minimizePlayer}
              aria-label="Pencereyi kapat ve köşeye küçült"
              title="Kapat (yayın köşede devam eder)"
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white/85 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--accent-ink)]">{KIND_BADGE[kind]}</span>
                <span className="truncate text-xs text-[var(--subtle)]">
                  {groupOf(current)}
                  {lists.active ? ` · ${lists.active.name}` : ''}
                </span>
              </div>
              <h2 className="display mt-2 text-balance text-2xl font-semibold sm:text-3xl">{current.name}</h2>
              {current.subtitle && <p className="mt-1 text-sm font-medium text-[var(--accent)]">{current.subtitle}</p>}
              <p className="mt-1.5 line-clamp-3 max-w-3xl text-pretty text-sm text-[var(--subtle)]">{current.description ?? DESCRIPTION[kind]}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => toggleFavorite(current)} aria-pressed={fav} className={`btn-ghost ${fav ? '!border-[var(--accent)] !text-[var(--accent)]' : ''}`}>
                  <Heart size={16} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
                  {fav ? 'Favorilerde' : 'Favorilere ekle'}
                </button>
                <button type="button" onClick={minimizePlayer} className="btn-ghost">
                  <Minimize2 size={16} aria-hidden="true" /> Küçült
                </button>
                <button type="button" onClick={stopPlayer} className="btn-ghost hover:!text-[var(--danger)]">
                  <Power size={16} aria-hidden="true" /> Yayını kapat
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent p-2">
            <p className="min-w-0 flex-1 truncate pl-1 pt-1.5 text-xs font-medium text-white/90">{current.name}</p>
            <div className="pointer-events-auto flex shrink-0 gap-1">
              <button type="button" onClick={expandPlayer} aria-label="Büyüt" title="Büyüt" className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white/85 hover:text-white">
                <Maximize2 size={15} />
              </button>
              <button type="button" onClick={stopPlayer} aria-label="Yayını kapat" title="Yayını kapat" className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white/85 hover:text-[var(--danger)]">
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
