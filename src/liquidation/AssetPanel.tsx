import { TokenBTC, TokenETH } from '@web3icons/react'
import { ArrowDownRight, ArrowUpRight, Trash2 } from 'lucide-react'
import { formatAmount, formatPct, formatPrice } from './format'
import { LevelBar } from './LevelBar'
import { LevelForm } from './LevelForm'
import type { AssetInfo, Level, Side } from './storage'
import type { Spot } from './useSpotPrices'

interface Props {
  asset: AssetInfo
  spot: Spot | undefined
  levels: Level[]
  dimmed: boolean
  onAdd: (side: Side, price: number, amount: number) => void
  onRemove: (id: string) => void
  onClear: () => void
}

const distance = (level: Level, price: number) => ((level.price - price) / price) * 100

export function AssetPanel({ asset, spot, levels, dimmed, onAdd, onRemove, onClear }: Props) {
  const price = spot?.usd
  const Icon = asset.symbol === 'BTC' ? TokenBTC : TokenETH
  const sorted = [...levels].sort((a, b) => b.price - a.price)
  const maxDistance = price ? Math.max(...levels.map((l) => Math.abs(distance(l, price))), 0.01) : 1

  const longs = levels.filter((l) => l.side === 'long')
  const shorts = levels.filter((l) => l.side === 'short')
  const longTotal = longs.reduce((s, l) => s + l.amount, 0)
  const shortTotal = shorts.reduce((s, l) => s + l.amount, 0)
  const total = longTotal + shortTotal

  const nearest = (list: Level[]): Level | undefined =>
    price ? [...list].sort((a, b) => Math.abs(distance(a, price)) - Math.abs(distance(b, price)))[0] : undefined
  const nearLong = nearest(longs)
  const nearShort = nearest(shorts)
  const change = spot?.change24h ?? null

  return (
    <section className="card p-5 sm:p-6" aria-labelledby={`${asset.symbol}-title`}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon variant="branded" size={36} />
          <div>
            <h2 id={`${asset.symbol}-title`} className="display text-2xl font-semibold leading-tight">
              {asset.symbol}
            </h2>
            <p className="text-xs text-[var(--subtle)]">{asset.name}</p>
          </div>
        </div>
        <div className={`text-right transition-opacity ${dimmed ? 'opacity-60' : ''}`}>
          {price === undefined ? (
            <div className="ml-auto h-8 w-32 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <p className="display text-2xl font-semibold tabular-nums sm:text-3xl">{formatPrice(price)}</p>
          )}
          {change !== null && (
            <p className={`mt-0.5 text-xs font-semibold tabular-nums ${change >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {formatPct(change)} 24h
            </p>
          )}
        </div>
      </header>

      <div className="mt-5">
        <LevelBar price={price} levels={levels} />
      </div>

      {total > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs tabular-nums">
            <span className="text-emerald-300">Longs {formatAmount(longTotal)}</span>
            <span className="text-rose-300">Shorts {formatAmount(shortTotal)}</span>
          </div>
          <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`Long versus short clusters: ${formatAmount(longTotal)} versus ${formatAmount(shortTotal)}`}>
            <div className="bg-emerald-500" style={{ width: `${(longTotal / total) * 100}%` }} />
            <div className="bg-rose-500" style={{ width: `${(shortTotal / total) * 100}%` }} />
          </div>
        </div>
      )}

      {price !== undefined && (nearLong || nearShort) && (
        <dl className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: 'Nearest long', level: nearLong, tone: 'text-emerald-300' },
            { label: 'Nearest short', level: nearShort, tone: 'text-rose-300' },
          ].map(({ label, level, tone }) => (
            <div key={label} className="inner p-3">
              <dt className="label">{label}</dt>
              <dd className={`display mt-1 text-lg font-semibold tabular-nums ${tone}`}>
                {level ? formatPct(distance(level, price)) : '--'}
              </dd>
              <dd className="mono text-[11px] text-[var(--subtle)]">{level ? formatPrice(level.price) : 'none added'}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <h3 className="label">Your clusters ({levels.length})</h3>
          {levels.length > 0 && (
            <button type="button" onClick={onClear} className="min-h-10 px-2 text-xs text-[var(--subtle)] underline-offset-2 hover:text-[var(--danger)] hover:underline">
              Clear all
            </button>
          )}
        </div>

        {sorted.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-[var(--subtle)]">
            No clusters yet. Add the biggest long and short liquidation levels you read from CoinGlass.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {sorted.map((l) => {
              const d = price !== undefined ? distance(l, price) : null
              const long = l.side === 'long'
              const Arrow = d !== null && d < 0 ? ArrowDownRight : ArrowUpRight
              return (
                <li key={l.id} className="inner relative overflow-hidden p-3">
                  {d !== null && (
                    <div
                      aria-hidden="true"
                      className={`absolute inset-y-0 left-0 ${long ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`}
                      style={{ width: `${(Math.abs(d) / maxDistance) * 100}%` }}
                    />
                  )}
                  <div className="relative flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${long ? 'bg-emerald-500/25 text-emerald-200' : 'bg-rose-500/25 text-rose-200'}`}>
                      {l.side}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="display text-base font-semibold tabular-nums">{formatPrice(l.price)}</p>
                      <p className="text-xs tabular-nums text-[var(--subtle)]">{formatAmount(l.amount)}</p>
                    </div>
                    <p className="flex items-center gap-1 text-sm font-semibold tabular-nums">
                      {d !== null && <Arrow size={14} aria-hidden="true" />}
                      {d === null ? '--' : formatPct(d)}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemove(l.id)}
                      aria-label={`Remove ${l.side} cluster at ${formatPrice(l.price)}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--subtle)] transition hover:bg-white/10 hover:text-[var(--danger)]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="mt-5">
        <LevelForm symbol={asset.symbol} onAdd={onAdd} />
      </div>
    </section>
  )
}
