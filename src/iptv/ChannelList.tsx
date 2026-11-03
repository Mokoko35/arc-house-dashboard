import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { Search, Star, X } from 'lucide-react'
import { type Favorites, favKey } from './storage'
import type { Channel } from './types'

const ROW = 60
const RENDERED = 28

interface Props {
  playlistId: string
  channels: Channel[]
  selectedId: string | null
  favorites: Favorites
  onSelect: (channel: Channel) => void
  onToggleFavorite: (channel: Channel) => void
}

export function ChannelList({ playlistId, channels, selectedId, favorites, onSelect, onToggleFavorite }: Props) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const deferredQuery = useDeferredValue(query)

  const groups = useMemo(() => {
    const set = new Set<string>()
    for (const c of channels) if (c.group) set.add(c.group)
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [channels])

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLocaleLowerCase('tr')
    return channels.filter(
      (c) =>
        (!group || c.group === group) &&
        (!favOnly || favorites[favKey(playlistId, c.id)]) &&
        (!q || c.name.toLocaleLowerCase('tr').includes(q)),
    )
  }, [channels, deferredQuery, group, favOnly, favorites, playlistId])

  const resetScroll = () => {
    scroller.current?.scrollTo({ top: 0 })
    setScrollTop(0)
  }

  const start = Math.max(0, Math.floor(scrollTop / ROW) - 4)
  const slice = visible.slice(start, start + RENDERED)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              resetScroll()
            }}
            placeholder="Kanal ara"
            aria-label="Kanal ara"
            className="field !pl-9 !pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                resetScroll()
              }}
              aria-label="Aramayı temizle"
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-[var(--subtle)] hover:text-[var(--ink)]"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={group}
            onChange={(e) => {
              setGroup(e.target.value)
              resetScroll()
            }}
            aria-label="Kategori"
            className="field min-w-0 flex-1"
          >
            <option value="">Tüm kategoriler ({groups.length})</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-pressed={favOnly}
            onClick={() => {
              setFavOnly((v) => !v)
              resetScroll()
            }}
            className={`btn-ghost shrink-0 !px-3 ${favOnly ? '!border-[var(--accent)] !text-[var(--accent)]' : ''}`}
            aria-label="Yalnızca favoriler"
            title="Yalnızca favoriler"
          >
            <Star size={16} fill={favOnly ? 'currentColor' : 'none'} />
          </button>
        </div>
        <p className="text-xs tabular-nums text-[var(--subtle)]">{visible.length.toLocaleString('tr-TR')} kanal</p>
      </div>

      <div
        ref={scroller}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="mt-2 min-h-[320px] flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/20"
        role="listbox"
        aria-label="Kanallar"
      >
        {visible.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--subtle)]">Eşleşen kanal yok.</p>
        ) : (
          <div style={{ height: visible.length * ROW, position: 'relative' }}>
            {slice.map((c, i) => {
              const fav = Boolean(favorites[favKey(playlistId, c.id)])
              const selected = c.id === selectedId
              return (
                <div
                  key={c.id}
                  role="option"
                  aria-selected={selected}
                  className={`absolute inset-x-0 flex items-center gap-1 border-b border-white/5 pr-1 ${selected ? 'bg-[var(--accent)]/15' : 'hover:bg-white/5'}`}
                  style={{ top: (start + i) * ROW, height: ROW }}
                >
                  <button type="button" onClick={() => onSelect(c)} className="flex h-full min-w-0 flex-1 items-center gap-3 px-3 text-left">
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10">
                      {c.logo ? (
                        <img
                          src={c.logo}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <span className="text-xs font-semibold text-[var(--subtle)]">{c.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate text-sm ${selected ? 'font-semibold text-[var(--accent)]' : 'text-[var(--ink-2)]'}`}>{c.name}</span>
                      {c.group && <span className="block truncate text-[11px] text-[var(--subtle)]">{c.group}</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(c)}
                    aria-pressed={fav}
                    aria-label={fav ? `${c.name} favorilerden çıkar` : `${c.name} favorilere ekle`}
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${fav ? 'text-amber-300' : 'text-[var(--subtle)] hover:text-[var(--ink)]'}`}
                  >
                    <Star size={16} fill={fav ? 'currentColor' : 'none'} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
