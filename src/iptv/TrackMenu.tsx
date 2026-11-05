import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { TrackOption } from './tracks'

interface Props {
  icon: ReactNode
  /** Button name for screen readers, such as "Ses dili". */
  label: string
  options: TrackOption[]
  selected: number
  /** When given, the menu starts with this choice, which has the value -1 (for example "Kapalı"). */
  offLabel?: string
  onSelect: (index: number) => void
  /** Lets the player keep its controls on screen while the menu is open. */
  onOpenChange: (open: boolean) => void
}

/** A small menu above a control button, used for the audio language and the subtitles. */
export function TrackMenu({ icon, label, options, selected, offLabel, onSelect, onOpenChange }: Props) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  const change = (next: boolean) => {
    setOpen(next)
    onOpenChange(next)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: Event) => {
      if (box.current && e.target instanceof Node && !box.current.contains(e.target)) {
        setOpen(false)
        onOpenChange(false)
      }
    }
    // Escape closes only the menu, not the player window behind it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      onOpenChange(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onOpenChange])

  const rows = offLabel ? [{ label: offLabel, value: -1 }, ...options.map((o, i) => ({ label: o.label, value: i }))] : options.map((o, i) => ({ label: o.label, value: i }))

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          change(!open)
        }}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition hover:bg-white/15 hover:text-white ${open || (offLabel !== undefined && selected >= 0) ? 'text-accent' : 'text-white/90'}`}
      >
        {icon}
      </button>
      {open && (
        <div role="menu" aria-label={label} className="absolute bottom-full right-0 z-10 mb-2 max-h-[min(16rem,45vh)] min-w-48 overflow-y-auto rounded-xl border border-white/15 bg-elev p-1 shadow-2xl">
          {rows.map((r) => {
            const on = r.value === selected
            return (
              <button
                key={r.value}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(r.value)
                  change(false)
                }}
                className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition hover:bg-white/10 ${on ? 'font-semibold text-accent' : 'text-[var(--ink-2)]'}`}
              >
                <span className="grid h-4 w-4 shrink-0 place-items-center" aria-hidden="true">
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
