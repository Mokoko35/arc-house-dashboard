import { Heart } from 'lucide-react'
import { KIND_BADGE, groupOf, kindOf } from './kinds'
import { Player } from './Player'
import { useMedia } from './useMedia'

const DESCRIPTION = {
  live: 'Program rehberi (EPG) bağlandığında şimdi ve sonra yayınlanacak programlar burada görünecek.',
  movie: 'Film ayrıntıları için kartına tıklayıp özet, oyuncu ve puan bilgisine bakabilirsin.',
  series: 'Dizi ayrıntıları için kartına tıklayıp sezon ve bölümleri görebilirsin.',
} as const

/** The player with its title, description and favorite button. Stays mounted while you browse between pages. */
export function PlayerPanel() {
  const { current, isFavorite, toggleFavorite, lists, prefs } = useMedia()
  const kind = current ? kindOf(current) : 'live'
  const fav = current ? isFavorite(current) : false

  return (
    <section aria-label="Oynatıcı" className="max-lg:sticky max-lg:top-0 max-lg:z-20 max-lg:-mx-4 max-lg:bg-[#0b0c10] max-lg:px-4 max-lg:pb-3 max-lg:pt-2">
      <Player channel={current} autoplay={prefs.autoplay} />
      {current && (
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--accent-ink)]">{KIND_BADGE[kind]}</span>
              <span className="truncate text-xs text-[var(--subtle)]">
                {groupOf(current)}
                {lists.active ? ` · ${lists.active.name}` : ''}
              </span>
            </div>
            <h2 className="display mt-2 text-balance text-2xl font-semibold sm:text-3xl">{current.name}</h2>
            {current.subtitle && <p className="mt-1 text-sm font-medium text-[var(--accent)]">{current.subtitle}</p>}
            <p className="mt-1.5 line-clamp-3 max-w-2xl text-pretty text-sm text-[var(--subtle)]">{current.description ?? DESCRIPTION[kind]}</p>
          </div>
          <button
            type="button"
            onClick={() => toggleFavorite(current)}
            aria-pressed={fav}
            className={`btn-ghost shrink-0 ${fav ? '!border-[var(--accent)] !text-[var(--accent)]' : ''}`}
          >
            <Heart size={16} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
            {fav ? 'Favorilerde' : 'Favorilere ekle'}
          </button>
        </div>
      )}
    </section>
  )
}
