import { useDeferredValue, useMemo, useState } from 'react'
import { Heart, ListPlus, Search, SlidersHorizontal, X } from 'lucide-react'
import { CategoryRail } from './CategoryRail'
import { ChannelCard, PosterCard } from './Cards'
import { KIND_LABEL, type Kind, categoriesOf, groupOf } from './kinds'
import type { CardSize } from './prefs'
import { ProgressiveGrid } from './ProgressiveGrid'
import { useMedia } from './useMedia'

// Columns fill whatever width is left next to the category list, so the grid always uses the full space.
const LIVE_GRID: Record<CardSize, string> = {
  sm: 'grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3',
  md: 'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4',
  lg: 'grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4',
}
const POSTER_GRID: Record<CardSize, string> = {
  sm: 'grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3',
  md: 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4',
  lg: 'grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-5',
}

const EMPTY_HINT: Record<Kind, string> = {
  live: 'Bu listede canlı kanal bulunamadı.',
  movie: 'Bu listede film bulunamadı. Filmler çoğunlukla Xtream portal listelerinde bulunur.',
  series: 'Bu listede dizi bulunamadı. Diziler çoğunlukla Xtream portal listelerinde bulunur.',
}

function Empty({ icon, children }: { icon: 'add' | 'manage' | 'none'; children: React.ReactNode }) {
  const { openAdd } = useMedia()
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
      <div className="max-w-sm text-sm text-[var(--subtle)]">
        {children}
        {icon === 'add' && (
          <div className="mt-4">
            <button type="button" onClick={openAdd} className="btn-primary">
              <ListPlus size={16} aria-hidden="true" /> Liste ekle
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function BrowsePage({ kind }: { kind: Kind }) {
  const { lists, parts, visible, prefs, current, openItem, isFavorite, toggleFavorite, openManage, catalog, xtream } = useMedia()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const deferred = useDeferredValue(query)

  const base = visible[kind]
  const categories = useMemo(() => categoriesOf(base), [base])
  const activeCategory = categories.some((c) => c.name === category) ? category : ''

  const items = useMemo(() => {
    const q = deferred.trim().toLocaleLowerCase('tr')
    return base.filter(
      (c) => (!activeCategory || groupOf(c) === activeCategory) && (!q || c.name.toLocaleLowerCase('tr').includes(q)) && (!favOnly || isFavorite(c)),
    )
  }, [base, activeCategory, deferred, favOnly, isFavorite])

  const poster = kind !== 'live'
  const hasAny = parts[kind].length > 0

  return (
    <div className="space-y-8">
      <section aria-labelledby={`${kind}-title`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id={`${kind}-title`} className="display text-3xl font-semibold">
              {KIND_LABEL[kind]}
            </h1>
            <p className="mt-1 text-sm tabular-nums text-[var(--subtle)]">{items.length.toLocaleString('tr-TR')} öğe</p>
          </div>
          {hasAny && (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" aria-hidden="true" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`${KIND_LABEL[kind]} içinde ara`} aria-label="Ara" className="field !pl-9 !pr-9" />
                {query && (
                  <button type="button" onClick={() => setQuery('')} aria-label="Aramayı temizle" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-[var(--subtle)] hover:text-[var(--ink)]">
                    <X size={15} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFavOnly((v) => !v)}
                aria-pressed={favOnly}
                aria-label="Yalnızca favoriler"
                title="Yalnızca favoriler"
                className={`btn-ghost shrink-0 !px-3 ${favOnly ? '!border-[var(--accent)] !text-[var(--accent)]' : ''}`}
              >
                <Heart size={16} fill={favOnly ? 'currentColor' : 'none'} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-5">
          {kind === 'series' && catalog.error && xtream && (
            <p className="mb-4 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 text-sm text-[var(--ink-2)]">
              Dizi listesi portaldan alınamadı. {catalog.error} Listedeki bölümler tek tek gösteriliyor.
            </p>
          )}
          {lists.starting ? null : kind === 'series' && catalog.loading && !hasAny ? (
            <p className="py-16 text-center text-sm text-[var(--subtle)]">Diziler portaldan yükleniyor...</p>
          ) : lists.playlists.length === 0 ? (
            <Empty icon="add">M3U adresi, portal girişi veya dosyayla ilk listeni ekle.</Empty>
          ) : !hasAny ? (
            <Empty icon="none">{EMPTY_HINT[kind]}</Empty>
          ) : base.length === 0 ? (
            <Empty icon="manage">
              Bu türdeki tüm kategoriler gizli.
              <div className="mt-4">
                <button type="button" onClick={() => openManage(kind)} className="btn-primary">
                  <SlidersHorizontal size={16} aria-hidden="true" /> Kategorileri yönet
                </button>
              </div>
            </Empty>
          ) : (
            <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
              <CategoryRail categories={categories} total={base.length} selected={activeCategory} onSelect={setCategory} onManage={() => openManage(kind)} />
              <div className="min-w-0 flex-1">
                {items.length === 0 ? (
                  <Empty icon="none">Eşleşen sonuç yok.</Empty>
                ) : (
                  <ProgressiveGrid
                    key={`${activeCategory}|${deferred}|${favOnly}|${prefs.cardSize}`}
                    items={items}
                    className={poster ? POSTER_GRID[prefs.cardSize] : LIVE_GRID[prefs.cardSize]}
                    getKey={(c) => c.id}
                    render={(c) => {
                      const props = { channel: c, active: current?.id === c.id, favorite: isFavorite(c), showLogo: prefs.showLogos, onPlay: openItem, onFavorite: toggleFavorite }
                      return poster ? <PosterCard {...props} /> : <ChannelCard {...props} />
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
