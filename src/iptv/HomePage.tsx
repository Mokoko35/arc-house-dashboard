import { type ReactNode, useMemo } from 'react'
import { ChevronRight, ListPlus, Play, Tv } from 'lucide-react'
import { ChannelCard, PosterCard } from './Cards'
import { groupOf, kindOf } from './kinds'
import { PlayerPanel } from './PlayerPanel'
import { hrefFor, type Page } from './router'
import type { Channel } from './types'
import { useMedia } from './useMedia'

function Row({ title, items, href }: { title: string; items: Channel[]; href?: Page }) {
  const { current, openItem, isFavorite, toggleFavorite, prefs } = useMedia()
  if (items.length === 0) return null
  return (
    <section aria-label={title}>
      <div className="flex items-center justify-between">
        <h2 className="display text-xl font-semibold">{title}</h2>
        {href && (
          <a href={hrefFor(href)} className="inline-flex min-h-10 items-center gap-1 text-sm text-[var(--subtle)] hover:text-[var(--accent)]">
            Tümünü gör <ChevronRight size={15} aria-hidden="true" />
          </a>
        )}
      </div>
      <ul className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
        {items.map((c) => {
          const poster = kindOf(c) !== 'live'
          const props = { channel: c, active: current?.id === c.id, favorite: isFavorite(c), showLogo: prefs.showLogos, onPlay: openItem, onFavorite: toggleFavorite }
          return (
            <li key={c.id} className={`shrink-0 snap-start ${poster ? 'w-36 sm:w-40' : 'w-56 sm:w-64'}`}>
              {poster ? <PosterCard {...props} /> : <ChannelCard {...props} />}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Hero({ channel }: { channel: Channel }) {
  const { openItem, route } = useMedia()
  const live = kindOf(channel) === 'live'
  return (
    <section aria-label="Öne çıkan" className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2a1608] via-[#14100c] to-[#0b0c10] p-6 sm:p-10">
      {channel.logo && <img src={channel.logo} alt="" aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-80 w-80 object-contain opacity-15 blur-sm" />}
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 bottom-[-120px] h-64 w-96 rounded-full bg-[var(--accent)]/20 blur-3xl" />
      <div className="relative max-w-xl">
        <span className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--accent-ink)]">ÖNE ÇIKAN</span>
        <h1 className="display mt-4 text-balance text-3xl font-semibold sm:text-5xl">{channel.name}</h1>
        <p className="mt-2 text-sm text-[var(--subtle)]">{groupOf(channel)}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => openItem(channel)} className="btn-primary">
            <Play size={16} fill="currentColor" aria-hidden="true" /> {live ? 'Oynat' : 'Ayrıntılar'}
          </button>
          <button type="button" onClick={() => route.go('live')} className="btn-ghost">
            <Tv size={16} aria-hidden="true" /> Canlı TV
          </button>
        </div>
      </div>
    </section>
  )
}

export function HomePage(): ReactNode {
  const { lists, parts, visible, favorites, isFavorite, current, openAdd } = useMedia()

  // `favorites` is read so the row refreshes when a favorite changes.
  const favs = useMemo(
    () => [...visible.live, ...visible.movie, ...visible.series].filter((c) => favorites && isFavorite(c)).slice(0, 30),
    [visible, favorites, isFavorite],
  )
  const featured = favs[0] ?? visible.live[0] ?? visible.movie[0] ?? visible.series[0]

  if (lists.starting) return null

  if (lists.playlists.length === 0) {
    return (
      <section className="card mx-auto mt-10 max-w-xl p-6 text-center sm:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent)]/15">
          <Tv size={26} className="text-[var(--accent)]" aria-hidden="true" />
        </div>
        <h1 className="display mt-4 text-3xl font-semibold">İlk listeni ekle</h1>
        <p className="mx-auto mt-2 max-w-sm text-pretty text-sm text-[var(--subtle)]">
          M3U adresi, portal (Xtream) girişi, dosya veya yapıştırılmış içerikle liste ekleyebilirsin. Uygulama içerik sağlamaz; yalnızca senin eklediğin listeleri oynatır.
        </p>
        <button type="button" onClick={openAdd} className="btn-primary mt-6">
          <ListPlus size={16} aria-hidden="true" /> Liste ekle
        </button>
      </section>
    )
  }

  return (
    <div className="space-y-8">
      {current ? <PlayerPanel /> : featured && <Hero channel={featured} />}
      <Row title="Favorilerin" items={favs} />
      <Row title="Canlı TV" items={visible.live.slice(0, 24)} href="live" />
      <Row title="Filmler" items={visible.movie.slice(0, 24)} href="movies" />
      <Row title="Diziler" items={visible.series.slice(0, 24)} href="series" />
      {parts.live.length + parts.movie.length + parts.series.length > 0 && visible.live.length + visible.movie.length + visible.series.length === 0 && (
        <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-[var(--subtle)]">Tüm kategoriler gizli. Ayarlar sayfasındaki Kategori Yönetimi bölümünden göster.</p>
      )}
    </div>
  )
}
