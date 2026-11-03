import { Suspense, lazy, useState } from 'react'
import { isAddress } from 'viem'
import { Coins, ListPlus, Loader2, RefreshCw, Settings2, Star, Trash2, Tv } from 'lucide-react'
import { AddPlaylistDialog } from './AddPlaylistDialog'
import { ChannelList } from './ChannelList'
import { Player } from './Player'
import { type Favorites, favKey, loadFavorites, loadLast, saveFavorites, saveLast } from './storage'
import type { Channel } from './types'
import { usePlaylists } from './usePlaylists'

const TipModule = lazy(() => import('./TipModule'))

export default function IptvApp() {
  const lists = usePlaylists()
  const { active, channels } = lists
  const [adding, setAdding] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [tipping, setTipping] = useState(false)
  const [favorites, setFavorites] = useState<Favorites>(loadFavorites)
  const [selectedId, setSelectedId] = useState<string | null>(() => loadLast()?.channelId ?? null)
  const [providerDraft, setProviderDraft] = useState<string | null>(null)

  const current = (active && channels.find((c) => c.id === selectedId)) || null
  const providerValue = providerDraft ?? active?.providerAddress ?? ''
  const providerValid = isAddress(providerValue)
  const savedProvider = active?.providerAddress && isAddress(active.providerAddress) ? active.providerAddress : null

  const select = (c: Channel) => {
    setSelectedId(c.id)
    if (active) saveLast({ playlistId: active.id, channelId: c.id })
  }

  const toggleFavorite = (c: Channel) => {
    if (!active) return
    const key = favKey(active.id, c.id)
    setFavorites((prev) => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = true
      saveFavorites(next)
      return next
    })
  }

  const remove = () => {
    if (active && window.confirm(`"${active.name}" listesi silinsin mi?`)) void lists.remove(active.id)
  }

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(172,198,233,0.14),transparent)]" />

      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[#0d1b2f]">
            <Tv size={20} aria-hidden="true" />
          </div>
          <h1 className="display truncate text-xl font-semibold sm:text-2xl">IPTV Oynatıcı</h1>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="btn-primary shrink-0">
          <ListPlus size={16} aria-hidden="true" /> Liste ekle
        </button>
      </header>

      <main className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {lists.error && !adding && (
          <p role="alert" className="mb-4 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--ink-2)]">
            {lists.error}
          </p>
        )}

        {lists.starting ? (
          <div className="grid place-items-center py-24 text-[var(--subtle)]">
            <Loader2 className="animate-spin" aria-label="Yükleniyor" />
          </div>
        ) : lists.playlists.length === 0 ? (
          <section className="card mx-auto mt-6 max-w-xl p-6 text-center sm:p-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
              <Tv size={26} className="text-[var(--accent)]" aria-hidden="true" />
            </div>
            <h2 className="display mt-4 text-2xl font-semibold">İlk listeni ekle</h2>
            <p className="mx-auto mt-2 max-w-sm text-pretty text-sm text-[var(--subtle)]">
              M3U adresi, portal (Xtream) girişi, dosya veya yapıştırılmış içerikle liste ekleyebilirsin. Uygulama içerik sağlamaz; yalnızca senin eklediğin listeleri oynatır.
            </p>
            <button type="button" onClick={() => setAdding(true)} className="btn-primary mt-6">
              <ListPlus size={16} aria-hidden="true" /> Liste ekle
            </button>
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
            <div className="max-lg:sticky max-lg:top-0 max-lg:z-20 max-lg:-mx-4 max-lg:bg-[#0d1b2f] max-lg:px-4 max-lg:pb-2 lg:self-start">
              <Player channel={current} />
              {current && active && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="display truncate text-lg font-semibold">{current.name}</p>
                    {current.group && <p className="truncate text-xs text-[var(--subtle)]">{current.group}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(current)}
                    aria-pressed={Boolean(favorites[favKey(active.id, current.id)])}
                    className="btn-ghost shrink-0"
                  >
                    <Star size={16} fill={favorites[favKey(active.id, current.id)] ? 'currentColor' : 'none'} aria-hidden="true" />
                    Favori
                  </button>
                </div>
              )}
            </div>

            <aside className="card flex flex-col p-4 sm:p-5 lg:h-[calc(100dvh-120px)] lg:min-h-[520px]">
              <div className="flex items-center gap-2">
                <select
                  value={active?.id ?? ''}
                  onChange={(e) => {
                    lists.select(e.target.value)
                    setShowSettings(false)
                    setProviderDraft(null)
                  }}
                  aria-label="Liste seç"
                  className="field min-w-0 flex-1"
                >
                  {lists.playlists.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.channelCount.toLocaleString('tr-TR')})
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => active && void lists.refresh(active.id)} disabled={lists.busy || !active?.sourceUrl} aria-label="Listeyi güncelle" title={active?.sourceUrl ? 'Listeyi güncelle' : 'Dosyadan eklenen listeler güncellenemez'} className="btn-ghost shrink-0 !px-3">
                  <RefreshCw size={16} className={lists.busy ? 'animate-spin' : ''} />
                </button>
                <button type="button" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings} aria-label="Liste ayarları" className="btn-ghost shrink-0 !px-3">
                  <Settings2 size={16} />
                </button>
                <button type="button" onClick={remove} aria-label="Listeyi sil" className="btn-ghost shrink-0 !px-3 hover:!text-[var(--danger)]">
                  <Trash2 size={16} />
                </button>
              </div>

              {showSettings && active && (
                <div className="inner mt-3 space-y-3 p-3">
                  <div>
                    <label htmlFor="provider-addr" className="label mb-1.5 block">Liste sağlayıcısının USDC adresi (isteğe bağlı)</label>
                    <input
                      id="provider-addr"
                      value={providerValue}
                      onChange={(e) => setProviderDraft(e.target.value.trim())}
                      placeholder="0x..."
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={providerValue !== '' && !providerValid}
                      className="field mono !text-xs"
                    />
                    {providerValue !== '' && !providerValid && <p className="mt-1 text-xs text-[var(--danger)]">Geçerli bir 0x adresi gir.</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={providerDraft === null || (providerValue !== '' && !providerValid)}
                      onClick={() => {
                        void lists.setProviderAddress(active.id, providerValue).then(() => setProviderDraft(null))
                      }}
                      className="btn-ghost !min-h-10"
                    >
                      Kaydet
                    </button>
                    <button type="button" disabled={!savedProvider || providerDraft !== null} onClick={() => setTipping(true)} className="btn-ghost !min-h-10">
                      <Coins size={15} aria-hidden="true" /> USDC bahşiş gönder
                    </button>
                  </div>
                </div>
              )}

              {active && (
                <div className="mt-3 flex min-h-0 flex-1 flex-col">
                  <ChannelList
                    key={active.id}
                    playlistId={active.id}
                    channels={channels}
                    selectedId={current?.id ?? null}
                    favorites={favorites}
                    onSelect={select}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
              )}
            </aside>
          </div>
        )}
      </main>

      {adding && <AddPlaylistDialog busy={lists.busy} error={lists.error} onClose={() => { setAdding(false); lists.clearError() }} onAdd={lists.add} />}
      {tipping && savedProvider && active && (
        <Suspense fallback={null}>
          <TipModule provider={savedProvider} listName={active.name} onClose={() => setTipping(false)} />
        </Suspense>
      )}
    </div>
  )
}
