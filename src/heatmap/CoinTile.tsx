import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Coin } from './coingecko'
import { TILE_STYLES, bucketFor, spanFor } from './colors'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const usdSmall = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 6 })
const compact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 })

export const formatPrice = (price: number): string => (price < 1 ? usdSmall.format(price) : usd.format(price))

export function formatChange(change: number | null): string {
  if (change === null) return '--'
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}

export function CoinTile({ coin, index, dimmed }: { coin: Coin; index: number; dimmed: boolean }) {
  const bucket = bucketFor(coin.change24h)
  const featured = index === 0
  const large = index <= 1
  const Arrow = bucket === 'neutral' ? Minus : (coin.change24h ?? 0) > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <a
      href={`https://www.coingecko.com/en/coins/${encodeURIComponent(coin.id)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${coin.name} ${formatPrice(coin.price)}, ${formatChange(coin.change24h)} in 24 hours`}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-3 shadow-lg transition duration-200 hover:z-10 hover:scale-[1.02] hover:brightness-110 sm:p-4 ${TILE_STYLES[bucket]} ${spanFor(index)} ${dimmed ? 'opacity-60' : ''}`}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/20" />

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {coin.image && (
            <img src={coin.image} alt="" loading="lazy" width={featured ? 36 : 24} height={featured ? 36 : 24} className={`shrink-0 rounded-full ${featured ? 'h-9 w-9' : 'h-6 w-6'}`} />
          )}
          <div className="min-w-0">
            <p className={`display truncate font-semibold leading-none ${featured ? 'text-3xl sm:text-4xl' : large ? 'text-xl md:text-3xl' : 'text-base sm:text-lg'}`}>
              {coin.symbol}
            </p>
            {(large || featured) && <p className="mt-1 truncate text-xs opacity-75">{coin.name}</p>}
          </div>
        </div>
        <span className="mono shrink-0 text-[10px] opacity-60">#{coin.rank}</span>
      </div>

      <div className="relative">
        <p className={`mono font-medium tabular-nums ${featured ? 'text-xl sm:text-2xl' : large ? 'text-base md:text-xl' : 'text-[13px] sm:text-sm'}`}>
          {formatPrice(coin.price)}
        </p>
        <p className={`mt-1 inline-flex items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 font-semibold tabular-nums ${featured ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}`}>
          <Arrow size={featured ? 18 : 14} aria-hidden="true" />
          {formatChange(coin.change24h)}
        </p>
        {featured && coin.marketCap > 0 && <p className="mt-2 text-xs opacity-70">Market cap {compact.format(coin.marketCap)}</p>}
      </div>
    </a>
  )
}

export function SkeletonTile({ index }: { index: number }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] ${spanFor(index)}`} />
}
