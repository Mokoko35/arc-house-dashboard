import { useMemo, useState } from 'react'
import { Check, Globe, Search, X } from 'lucide-react'
import { NO_COUNTRY, countryName, flagOf } from './countries'
import { useMedia } from './useMedia'

/** The country filter, as a page of its own in the main menu. What you tick here applies to Live TV, Movies and Series. */
export function CountriesPage() {
  const { countryOptions, activeCountries, setCountries, lists } = useMedia()
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    return countryOptions.filter((o) => !q || countryName(o.code).toLocaleLowerCase('tr').includes(q) || o.code.toLowerCase().includes(q))
  }, [countryOptions, query])

  const toggle = (code: string) => setCountries(activeCountries.includes(code) ? activeCountries.filter((c) => c !== code) : [...activeCountries, code])
  const selectShown = () => setCountries([...new Set([...activeCountries, ...rows.map((r) => r.code)])])
  const total = countryOptions.reduce((sum, o) => sum + o.count, 0)

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-2xl font-semibold sm:text-3xl">Ülke Filtresi</h1>
          <p className="mt-1 max-w-xl text-pretty text-sm text-[var(--subtle)]">
            Seçtiğin ülkelerin kanalları, filmleri ve dizileri gösterilir. Hiçbiri seçili değilse hepsi görünür. Ayar Canlı TV, Filmler ve Diziler'de geçerlidir.
          </p>
        </div>
      </header>

      {countryOptions.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
          <div className="max-w-sm text-sm text-[var(--subtle)]">
            <Globe size={28} className="mx-auto mb-3 text-accent" aria-hidden="true" />
            {lists.playlists.length === 0 ? 'Önce bir liste ekle. Ülkeler kategori ve kanal adlarından okunur.' : 'Bu listede ülke bilgisi bulunamadı. Ülkeler "TR ▸ Ulusal" gibi kategori adlarından veya "TR: TRT 1" gibi kanal adlarından okunur.'}
          </div>
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-20 -mx-4 mt-5 flex flex-wrap items-center gap-3 bg-canvas/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <div className="relative w-full sm:w-72">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ülke ara" aria-label="Ülke ara" className="field !pl-9" />
            </div>
            <button type="button" onClick={selectShown} className="btn-ghost">
              <Check size={16} aria-hidden="true" /> {query ? 'Bulunanları seç' : 'Tümünü seç'}
            </button>
            <button type="button" onClick={() => setCountries([])} disabled={activeCountries.length === 0} className="btn-ghost">
              <X size={16} aria-hidden="true" /> Temizle
            </button>
            <p className="ml-auto text-sm tabular-nums text-[var(--subtle)]" aria-live="polite">
              {activeCountries.length > 0 ? `${activeCountries.length} ülke seçili` : `Tüm ülkeler · ${total.toLocaleString('tr-TR')} öğe`}
            </p>
          </div>

          <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3 pb-8">
            {rows.map((o) => {
              const on = activeCountries.includes(o.code)
              const id = `country-${o.code}`
              return (
                <li key={o.code}>
                  <label
                    htmlFor={id}
                    className={`relative flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition hover:bg-white/5 ${on ? 'border-accent bg-accent/10' : 'border-white/10 bg-white/[0.03]'}`}
                  >
                    <input id={id} type="checkbox" checked={on} onChange={() => toggle(o.code)} className="peer sr-only" />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
                    <span className="flag text-3xl leading-none" aria-hidden="true">
                      {flagOf(o.code)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--ink-2)]">{countryName(o.code)}</span>
                      <span className="block text-xs tabular-nums text-[var(--subtle)]">
                        {o.code === NO_COUNTRY ? 'Ülkesi belirsiz' : o.code} · {o.count.toLocaleString('tr-TR')} öğe
                      </span>
                    </span>
                    <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${on ? 'border-accent bg-accent text-[var(--accent-ink)]' : 'border-white/25'}`}>
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                  </label>
                </li>
              )
            })}
            {rows.length === 0 && <li className="col-span-full py-10 text-center text-sm text-[var(--subtle)]">Ülke bulunamadı.</li>}
          </ul>
        </>
      )}
    </div>
  )
}
