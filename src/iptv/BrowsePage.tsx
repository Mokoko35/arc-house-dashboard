import { useDeferredValue, useMemo, useState } from 'react'
import { ChevronRight, LayoutGrid, List, ListPlus, Search, SlidersHorizontal, X } from 'lucide-react'
import { CategoryChips, CategorySidebar } from './CategoryRail'
import { CountrySelect } from './CountrySelect'
import { countryOfGroup, flagOf } from './countries'
import type { Channel } from './types'
import { ChannelCard, ChannelRow, PosterCard } from './Cards'
import { FAVORITES, KIND_LABEL, type Kind, categoriesOf, categoryCrumbs, groupOf, sortByOrder } from './kinds'
import type { CardSize } from './prefs'
import { ProgressiveGrid } from './ProgressiveGrid'
import { SkeletonGrid } from './Skeletons'
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

/** "Canlı TV > TR > Disney+": where you are. Lives in the page, so it stays visible whether or not the menu is collapsed. */
function Breadcrumb({ kind, selected }: { kind: Kind; selected: string }) {
  const trail = [KIND_LABEL[kind], ...(selected === '' ? ['Tümü'] : selected === FAVORITES ? ['Favoriler'] : categoryCrumbs(selected))]
  return (
    <nav aria-label="Bulunduğun yer" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xl font-semibold sm:text-2xl">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1
          return (
            <li key={`${i}-${crumb}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight size={18} className="shrink-0 text-[var(--subtle)]" aria-hidden="true" />}
              <span className={`display truncate ${last ? 'text-accent' : 'text-[var(--ink-2)]'}`} aria-current={last ? 'page' : undefined}>
                {crumb}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function BrowsePage({ kind }: { kind: Kind }) {
  const { lists, parts, visible, prefs, current, openItem, isFavorite, toggleFavorite, openManage, catalog, xtream, epg, activeCountries, setCountries, orderFor, updatePrefs } = useMedia()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const deferred = useDeferredValue(query)

  const base = visible[kind]
  const order = orderFor(kind)
  const categories = useMemo(() => sortByOrder(categoriesOf(base), order), [base, order])
  const favoriteCount = useMemo(() => base.filter((c) => isFavorite(c)).length, [base, isFavorite])
  const selected = category === '' || category === FAVORITES || categories.some((c) => c.name === category) ? category : ''

  const items = useMemo(() => {
    const q = deferred.trim().toLocaleLowerCase('tr')
    return base.filter((c) => {
      if (selected === FAVORITES ? !isFavorite(c) : selected !== '' && groupOf(c) !== selected) return false
      return !q || c.name.toLocaleLowerCase('tr').includes(q)
    })
  }, [base, selected, deferred, isFavorite])

  const poster = kind !== 'live'
  const listView = kind === 'live' && prefs.liveView === 'list'
  const gridClass = poster ? POSTER_GRID[prefs.cardSize] : listView ? 'flex flex-col gap-2' : LIVE_GRID[prefs.cardSize]
  const hasAny = parts[kind].length > 0
  const showRail = !lists.starting && lists.playlists.length > 0 && hasAny && base.length > 0
  // While a country is picked, categories without a country go under "Diğer" instead of disappearing.
  const otherNames = useMemo(
    () => (activeCountries.length > 0 ? new Set(categories.filter((c) => countryOfGroup(c.name) === null).map((c) => c.name)) : undefined),
    [activeCountries, categories],
  )
  const rail = { categories, total: base.length, favoriteCount, selected, onSelect: setCategory, onManage: () => openManage(kind), otherNames }

  return (
    <div className="lg:-mx-8 lg:-mb-16 lg:-mt-8 lg:flex lg:min-h-dvh">
      {showRail && <CategorySidebar {...rail} />}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 -mx-4 bg-canvas/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:px-8 lg:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <Breadcrumb kind={kind} selected={selected} />
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums text-[var(--subtle)]">
                {items.length.toLocaleString('tr-TR')} öğe
                {activeCountries.length > 0 && (
                  <button type="button" onClick={() => setCountries([])} aria-label="Ülke filtresini temizle" className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 text-xs text-accent">
                    <span className="flag" aria-hidden="true">
                      {activeCountries.slice(0, 4).map(flagOf).join(' ')}
                    </span>
                    {activeCountries.length > 4 ? `${activeCountries.length} ülke` : activeCountries.join(' ')}
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
              </p>
            </div>
            {hasAny && kind === 'live' && (
              <div role="group" aria-label="Görünüm" className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
                {([['grid', 'Izgara', LayoutGrid], ['list', 'Liste', List]] as const).map(([mode, label, Icon]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={prefs.liveView === mode}
                    aria-label={`${label} görünümü`}
                    title={`${label} görünümü`}
                    onClick={() => updatePrefs({ liveView: mode })}
                    className={`grid h-9 w-10 place-items-center rounded-lg transition ${prefs.liveView === mode ? 'bg-accent text-[var(--accent-ink)]' : 'text-[var(--subtle)] hover:text-[var(--ink)]'}`}
                  >
                    <Icon size={17} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
            {hasAny && (
              <div className="relative w-full sm:w-72">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" aria-hidden="true" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`${KIND_LABEL[kind]} içinde ara`} aria-label="Ara" className="field !pl-9 !pr-9" />
                {query && (
                  <button type="button" onClick={() => setQuery('')} aria-label="Aramayı temizle" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-[var(--subtle)] hover:text-[var(--ink)]">
                    <X size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="pt-2 lg:px-8 lg:pb-16">
          {showRail && (
            <div className="mb-3 lg:hidden">
              <CountrySelect />
            </div>
          )}
          {showRail && <CategoryChips {...rail} />}

          {kind === 'series' && catalog.error && xtream && (
            <p className="mb-4 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-[var(--ink-2)]">
              Dizi listesi portaldan alınamadı. {catalog.error} Listedeki bölümler tek tek gösteriliyor.
            </p>
          )}

          {lists.starting ? (
            <SkeletonGrid poster={poster} className={gridClass} />
          ) : kind === 'series' && catalog.loading && !hasAny ? (
            <div>
              <p className="mb-4 text-sm text-[var(--subtle)]">Diziler portaldan yükleniyor...</p>
              <SkeletonGrid poster className={POSTER_GRID[prefs.cardSize]} />
            </div>
          ) : lists.playlists.length === 0 ? (
            <Empty icon="add">M3U adresi, portal girişi veya dosyayla ilk listeni ekle.</Empty>
          ) : !hasAny && activeCountries.length > 0 ? (
            <Empty icon="none">
              Seçili ülkelerde bu türde içerik yok.
              <div className="mt-4">
                <button type="button" onClick={() => setCountries([])} className="btn-primary">
                  Ülke filtresini temizle
                </button>
              </div>
            </Empty>
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
          ) : items.length === 0 ? (
            <Empty icon="none">
              {selected === FAVORITES && deferred.trim() === '' ? 'Bu bölümde henüz favorin yok. Kartlardaki kalbe dokunarak favori ekleyebilirsin.' : 'Eşleşen sonuç yok.'}
            </Empty>
          ) : (
            <ProgressiveGrid
              key={`${selected}|${deferred}|${prefs.cardSize}|${listView}`}
              items={items}
              className={gridClass}
              getKey={(c) => c.id}
              render={(c) => {
                const props = { channel: c, active: current?.id === c.id, favorite: isFavorite(c), showLogo: prefs.showLogos, onPlay: (ch: Channel) => openItem(ch, kind === 'live' ? items : undefined), onFavorite: toggleFavorite }
                if (poster) return <PosterCard {...props} />
                return listView ? <ChannelRow {...props} epg={epg.nowNext(c)} /> : <ChannelCard {...props} epg={epg.nowNext(c)} />
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
