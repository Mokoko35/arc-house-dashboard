import { useEffect, useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { KIND_LABEL, type Kind, categoriesOf } from './kinds'
import { useMedia } from './useMedia'

/** Checked = shown. Unchecked categories disappear from the category lists and grids. */
function ModalBody({ kind }: { kind: Kind }) {
  // Always the full list, never narrowed by the country filter, so saving cannot un-hide categories you cannot see here.
  const { allParts, hiddenFor, setHiddenFor, closeManage } = useMedia()
  const all = useMemo(() => categoriesOf(allParts[kind]), [allParts, kind])
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(hiddenFor(kind)))
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeManage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeManage])

  const q = query.trim().toLocaleLowerCase('tr')
  const shown = q ? all.filter((c) => c.name.toLocaleLowerCase('tr').includes(q)) : all
  const visibleCount = all.filter((c) => !hidden.has(c.name)).length

  const toggle = (name: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  const setMany = (names: string[], hide: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev)
      for (const n of names) {
        if (hide) next.add(n)
        else next.delete(n)
      }
      return next
    })

  const save = () => {
    setHiddenFor(
      kind,
      all.filter((c) => hidden.has(c.name)).map((c) => c.name),
    )
    closeManage()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 backdrop-blur-sm sm:place-items-center sm:p-4" onClick={closeManage} role="presentation">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-title"
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl border border-white/15 bg-elev shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div>
            <h2 id="manage-title" className="display text-xl font-semibold">
              Kategorileri Yönet
            </h2>
            <p className="mt-0.5 text-xs text-[var(--subtle)]">{KIND_LABEL[kind]} · işaretli kategoriler gösterilir</p>
          </div>
          <button type="button" onClick={closeManage} aria-label="Kapat" className="grid h-10 w-10 place-items-center rounded-full text-[var(--subtle)] hover:bg-white/10 hover:text-[var(--ink)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-5 pb-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" aria-hidden="true" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kategori ara" aria-label="Kategori ara" className="field !pl-9" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMany(shown.map((c) => c.name), false)} className="btn-ghost !min-h-9 flex-1 text-xs">
              Tümünü seç
            </button>
            <button type="button" onClick={() => setMany(shown.map((c) => c.name), true)} className="btn-ghost !min-h-9 flex-1 text-xs">
              Hiçbirini seçme
            </button>
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto border-y border-white/10 px-2 py-1" aria-label="Kategoriler">
          {all.length === 0 ? (
            <li className="p-6 text-center text-sm text-[var(--subtle)]">Bu türde kategori yok.</li>
          ) : shown.length === 0 ? (
            <li className="p-6 text-center text-sm text-[var(--subtle)]">Eşleşen kategori yok.</li>
          ) : (
            shown.map((c) => {
              const on = !hidden.has(c.name)
              return (
                <li key={c.name}>
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 hover:bg-white/5">
                    <input type="checkbox" checked={on} onChange={() => toggle(c.name)} className="peer sr-only" />
                    <span
                      aria-hidden="true"
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
                        on ? 'border-accent bg-accent text-[var(--accent-ink)]' : 'border-white/30'
                      }`}
                    >
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-sm ${on ? 'text-[var(--ink-2)]' : 'text-[var(--subtle)]'}`}>{c.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--subtle)]">{c.count.toLocaleString('tr-TR')}</span>
                  </label>
                </li>
              )
            })
          )}
        </ul>

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <p className="text-xs tabular-nums text-[var(--subtle)]">
            {visibleCount} / {all.length} gösteriliyor
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={closeManage} className="btn-ghost">
              İptal
            </button>
            <button type="button" onClick={save} className="btn-primary">
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ManageCategoriesModal() {
  const { managing } = useMedia()
  // The key restarts the draft whenever the modal opens for another type.
  return managing ? <ModalBody key={managing} kind={managing} /> : null
}
