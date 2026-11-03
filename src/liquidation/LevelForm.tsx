import { type FormEvent, useState } from 'react'
import { Plus } from 'lucide-react'
import { parseAmount, parsePrice } from './format'
import type { Side } from './storage'

export function LevelForm({ symbol, onAdd }: { symbol: string; onAdd: (side: Side, price: number, amount: number) => void }) {
  const [side, setSide] = useState<Side>('long')
  const [priceText, setPriceText] = useState('')
  const [amountText, setAmountText] = useState('')
  const [touched, setTouched] = useState(false)

  const price = parsePrice(priceText)
  const amount = parseAmount(amountText)
  const valid = price !== null && amount !== null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (price === null || amount === null) return
    onAdd(side, price, amount)
    setPriceText('')
    setAmountText('')
    setTouched(false)
  }

  const priceBad = touched && price === null
  const amountBad = touched && amount === null

  return (
    <form onSubmit={submit} className="inner space-y-3 p-4" noValidate aria-label={`Add ${symbol} liquidation cluster`}>
      <div role="radiogroup" aria-label="Cluster type" className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
        {(['long', 'short'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={side === s}
            onClick={() => setSide(s)}
            className={`min-h-10 rounded-xl text-sm font-semibold capitalize transition ${
              side === s
                ? s === 'long'
                  ? 'bg-emerald-500/80 text-white'
                  : 'bg-rose-500/80 text-white'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            {s} liquidations
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${symbol}-price`} className="label mb-1.5 block">
            Price (USD)
          </label>
          <input
            id={`${symbol}-price`}
            inputMode="decimal"
            autoComplete="off"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            placeholder="e.g. 72,500"
            aria-invalid={priceBad}
            className="field tabular-nums"
          />
          {priceBad && <p className="mt-1 text-xs text-[var(--danger)]">Enter a price above 0.</p>}
        </div>
        <div>
          <label htmlFor={`${symbol}-amount`} className="label mb-1.5 block">
            Amount (USD)
          </label>
          <input
            id={`${symbol}-amount`}
            inputMode="text"
            autoComplete="off"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            placeholder="e.g. 1.2B, 350M, 820K"
            aria-invalid={amountBad}
            className="field tabular-nums"
          />
          {amountBad && <p className="mt-1 text-xs text-[var(--danger)]">Use a number, optionally ending in K, M or B.</p>}
        </div>
      </div>

      <button type="submit" disabled={touched && !valid} className="btn-primary w-full">
        <Plus size={16} aria-hidden="true" /> Add cluster
      </button>
    </form>
  )
}
