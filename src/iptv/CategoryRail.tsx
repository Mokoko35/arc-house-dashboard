import { SlidersHorizontal } from 'lucide-react'
import type { Category } from './kinds'

interface Props {
  categories: Category[]
  total: number
  selected: string
  onSelect: (name: string) => void
  onManage: () => void
}

const base = 'flex min-h-10 items-center justify-between gap-3 rounded-xl px-3 text-sm transition'
const on = 'bg-[var(--accent)]/15 font-semibold text-[var(--accent)]'
const off = 'text-[var(--subtle)] hover:bg-white/5 hover:text-[var(--ink)]'

/** Category filter: chips on small screens, a side list on large ones. */
export function CategoryRail({ categories, total, selected, onSelect, onManage }: Props) {
  const all = [{ name: '', label: 'Tümü', count: total }, ...categories.map((c) => ({ name: c.name, label: c.name, count: c.count }))]

  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden" role="tablist" aria-label="Kategoriler">
        {all.map((c) => (
          <button
            key={c.name || 'all'}
            type="button"
            role="tab"
            aria-selected={selected === c.name}
            onClick={() => onSelect(c.name)}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-sm transition ${
              selected === c.name ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]' : 'border-white/10 text-[var(--subtle)] hover:text-[var(--ink)]'
            }`}
          >
            {c.label}
          </button>
        ))}
        <button type="button" onClick={onManage} aria-label="Kategorileri yönet" className="grid min-h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-[var(--subtle)]">
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <aside className="hidden w-60 shrink-0 lg:block" aria-label="Kategoriler">
        <div className="sticky top-4 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <h3 className="label">Kategoriler</h3>
            <button type="button" onClick={onManage} aria-label="Kategorileri yönet" title="Kategorileri yönet" className="grid h-9 w-9 place-items-center rounded-full text-[var(--subtle)] hover:bg-white/10 hover:text-[var(--accent)]">
              <SlidersHorizontal size={16} />
            </button>
          </div>
          <ul className="max-h-[60dvh] space-y-0.5 overflow-y-auto" role="tablist" aria-orientation="vertical">
            {all.map((c) => (
              <li key={c.name || 'all'}>
                <button type="button" role="tab" aria-selected={selected === c.name} onClick={() => onSelect(c.name)} className={`${base} w-full text-left ${selected === c.name ? on : off}`}>
                  <span className="truncate">{c.label}</span>
                  <span className="shrink-0 text-xs tabular-nums opacity-60">{c.count.toLocaleString('tr-TR')}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  )
}
