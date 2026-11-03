import type { Level } from './storage'
import { formatAmount, formatPrice } from './format'

/** Price axis with the current price and every cluster. Marker size follows the cluster amount. */
export function LevelBar({ price, levels }: { price: number | undefined; levels: Level[] }) {
  if (price === undefined) {
    return <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" aria-hidden="true" />
  }

  const prices = [price, ...levels.map((l) => l.price)]
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const pad = (max - min) * 0.08 || price * 0.02
  const lo = min - pad
  const hi = max + pad
  const pos = (p: number) => ((p - lo) / (hi - lo)) * 100
  const nowPos = pos(price)
  const maxAmount = Math.max(...levels.map((l) => l.amount), 1)

  return (
    <div>
      <div className="relative h-24 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        {/* Longs are liquidated as price falls, shorts as it rises. */}
        <div aria-hidden="true" className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/0 to-emerald-500/15" style={{ width: `${nowPos}%` }} />
        <div aria-hidden="true" className="absolute inset-y-0 right-0 bg-gradient-to-l from-rose-500/0 to-rose-500/15" style={{ width: `${100 - nowPos}%` }} />
        <div aria-hidden="true" className="absolute inset-x-3 top-1/2 h-px bg-white/15" />

        {levels.map((l) => {
          const size = 12 + Math.round(Math.sqrt(l.amount / maxAmount) * 16)
          const long = l.side === 'long'
          return (
            <span
              key={l.id}
              title={`${long ? 'Long' : 'Short'} ${formatPrice(l.price)} (${formatAmount(l.amount)})`}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg ${
                long ? 'border-emerald-200/70 bg-emerald-500/80 shadow-emerald-900/50' : 'border-rose-200/70 bg-rose-500/80 shadow-rose-900/50'
              }`}
              style={{ left: `${pos(l.price)}%`, width: size, height: size }}
            />
          )
        })}

        <div className="absolute inset-y-0 w-px bg-[var(--accent)]" style={{ left: `${nowPos}%` }}>
          <span className="mono absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-[#0d1b2f]">
            Now
          </span>
        </div>
      </div>
      <div className="mono mt-1.5 flex justify-between text-[10px] text-[var(--subtle)]">
        <span>{formatPrice(lo)}</span>
        <span>{formatPrice(hi)}</span>
      </div>
    </div>
  )
}
