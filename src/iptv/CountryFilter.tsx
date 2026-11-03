import { useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { NO_COUNTRY, countryName, flagOf } from './countries'

export interface CountryCount {
  code: string
  count: number
}

interface Props {
  countries: CountryCount[]
  selected: string[]
  onChange: (codes: string[]) => void
}

const COLLAPSED = 14

/** Tick one or more countries to show only their channels. Nothing ticked shows everything. */
export function CountryFilter({ countries, selected, onChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? countries : countries.slice(0, COLLAPSED)
  // A ticked country must stay visible even when the list is collapsed.
  const pinned = countries.filter((c) => selected.includes(c.code) && !shown.includes(c))
  const chips = [...shown, ...pinned]

  const toggle = (code: string) => onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code])

  return (
    <section aria-label="Ülke filtresi" className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h3 className="label">Ülke{selected.length > 0 ? ` · ${selected.length} seçili` : ''}</h3>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs text-[var(--subtle)] hover:bg-white/10 hover:text-[var(--ink)]">
            <X size={13} aria-hidden="true" /> Temizle
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Ülkeler">
        {chips.map((c) => {
          const on = selected.includes(c.code)
          const name = countryName(c.code)
          return (
            <button
              key={c.code}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={`${name}, ${c.count} kanal`}
              title={name}
              onClick={() => toggle(c.code)}
              className={`flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm transition ${
                on ? 'border-accent bg-accent/15 text-accent' : 'border-white/10 text-[var(--muted)] hover:border-white/25 hover:text-[var(--ink)]'
              }`}
            >
              {on ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : <span className="flag text-lg" aria-hidden="true">{flagOf(c.code)}</span>}
              <span className="font-medium">{c.code === NO_COUNTRY ? 'Diğer' : c.code}</span>
              <span className="text-xs tabular-nums opacity-60">{c.count.toLocaleString('tr-TR')}</span>
            </button>
          )
        })}
        {countries.length > COLLAPSED && (
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="flex min-h-10 items-center gap-1 rounded-full px-3 text-sm text-[var(--subtle)] hover:text-[var(--ink)]">
            {expanded ? 'Daha az' : `+${countries.length - COLLAPSED} ülke daha`}
            <ChevronDown size={14} className={expanded ? 'rotate-180' : ''} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  )
}
