import { useEffect, useMemo, useState } from 'react'
import { Globe, Search, X } from 'lucide-react'
import { NO_COUNTRY, countryName, flagOf } from './countries'
import { useMedia } from './useMedia'

/** The country filter: a panel that opens next to the main menu (or from the bottom on a phone). */
export function CountryPanel() {
  const { countryPanel, setCountryPanel, countryOptions, activeCountries, setCountries, prefs } = useMedia()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!countryPanel) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCountryPanel(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [countryPanel, setCountryPanel])

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    return countryOptions.filter((o) => !q || countryName(o.code).toLocaleLowerCase('tr').includes(q) || o.code.toLowerCase().includes(q))
  }, [countryOptions, query])

  if (!countryPanel) return null

  const toggle = (code: string) => setCountries(activeCountries.includes(code) ? activeCountries.filter((c) => c !== code) : [...activeCountries, code])
  const left = prefs.sidebarCollapsed ? 'lg:left-[84px]' : 'lg:left-[252px]'

  return (
    <>
      <button type="button" aria-label="Ülke filtresini kapat" tabIndex={-1} onClick={() => setCountryPanel(false)} className="fixed inset-0 z-40 cursor-default bg-black/50 lg:bg-transparent" />
      <div
        role="dialog"
        aria-label="Ülke filtresi"
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col rounded-t-3xl border border-white/15 bg-elev shadow-2xl lg:inset-x-auto lg:bottom-4 lg:max-h-[min(36rem,calc(100dvh-2rem))] lg:w-[22rem] lg:rounded-2xl ${left}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-accent" aria-hidden="true" />
            <h2 className="display text-base font-semibold">Ülke filtresi</h2>
          </div>
          <button type="button" onClick={() => setCountryPanel(false)} aria-label="Kapat" className="grid h-10 w-10 place-items-center rounded-full text-[var(--subtle)] hover:bg-white/10 hover:text-[var(--ink)]">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pt-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ülke ara" aria-label="Ülke ara" className="field !pl-9" />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--subtle)]">
            <span aria-live="polite">{activeCountries.length > 0 ? `${activeCountries.length} ülke seçili` : 'Tüm ülkeler gösteriliyor'}</span>
            {activeCountries.length > 0 && (
              <button type="button" onClick={() => setCountries([])} className="min-h-9 rounded-full px-3 text-[var(--ink-2)] hover:bg-white/10">
                Temizle
              </button>
            )}
          </div>
        </div>

        <ul className="mt-1 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {rows.map((o) => {
            const on = activeCountries.includes(o.code)
            const id = `country-${o.code}`
            return (
              <li key={o.code}>
                <label htmlFor={id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 transition hover:bg-white/5 ${on ? 'bg-accent/10' : ''}`}>
                  <input id={id} type="checkbox" checked={on} onChange={() => toggle(o.code)} className="peer sr-only" />
                  <span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] font-bold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${on ? 'border-accent bg-accent text-[var(--accent-ink)]' : 'border-white/25'}`}>
                    {on ? '✓' : ''}
                  </span>
                  <span className="flag text-xl" aria-hidden="true">
                    {flagOf(o.code)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink-2)]">{countryName(o.code)}</span>
                  <span className="text-xs text-[var(--subtle)]">{o.code === NO_COUNTRY ? '' : o.code}</span>
                  <span className="w-12 text-right text-xs tabular-nums text-[var(--subtle)]">{o.count.toLocaleString('tr-TR')}</span>
                </label>
              </li>
            )
          })}
          {rows.length === 0 && <li className="px-3 py-6 text-center text-sm text-[var(--subtle)]">Ülke bulunamadı.</li>}
        </ul>
      </div>
    </>
  )
}
