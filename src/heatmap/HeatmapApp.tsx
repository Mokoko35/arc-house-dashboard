import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { MarketsError } from './coingecko'
import { CoinTile, SkeletonTile } from './CoinTile'
import { BIG, SMALL, SWATCH_STYLES, type Bucket } from './colors'
import { useMarkets } from './useMarkets'

const COUNT = 20

function errorText(error: MarketsError): string {
  switch (error.code) {
    case 'rateLimit':
      return 'CoinGecko\'s free API is rate limited right now. Wait a minute, then refresh.'
    case 'http':
      return `CoinGecko returned an error (${error.status ?? 'unknown'}). Try again shortly.`
    case 'badData':
      return 'CoinGecko sent data in an unexpected format.'
    default:
      return 'Could not reach CoinGecko. Check your connection and try again.'
  }
}

const LEGEND: { bucket: Bucket; label: string }[] = [
  { bucket: 'deepLoss', label: `${-BIG}% or lower` },
  { bucket: 'loss', label: `${-BIG}% to ${-SMALL}%` },
  { bucket: 'neutral', label: `±${SMALL}%` },
  { bucket: 'gain', label: `${SMALL}% to ${BIG}%` },
  { bucket: 'deepGain', label: `${BIG}% or higher` },
]

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
      <p className="label">{label}</p>
      <p
        className={`display mt-1 text-xl font-semibold tabular-nums sm:text-2xl ${
          tone === 'up' ? 'text-[var(--success)]' : tone === 'down' ? 'text-[var(--danger)]' : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}

export default function HeatmapApp() {
  const { coins, error, loading, updatedAt, refresh } = useMarkets()

  const known = coins?.filter((c) => c.change24h !== null) ?? []
  const up = known.filter((c) => (c.change24h ?? 0) > 0).length
  const down = known.filter((c) => (c.change24h ?? 0) < 0).length
  const avg = known.length ? known.reduce((sum, c) => sum + (c.change24h ?? 0), 0) / known.length : null

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(172,198,233,0.14),transparent)]"
      />

      <main className="relative mx-auto w-full max-w-7xl px-3 pb-16 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="label">Live market</p>
            <h1 className="display mt-1 text-balance text-4xl font-semibold sm:text-5xl">Coin Heatmap</h1>
            <p className="mt-2 text-sm text-[var(--subtle)]">Top {COUNT} by market cap, 24h price change, in USD.</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-[var(--subtle)] sm:block" aria-live="polite">
              {loading ? 'Fetching live prices...' : updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : ''}
            </p>
            <button type="button" onClick={refresh} disabled={loading} className="btn-primary">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3">
            <p className="flex items-start gap-2 text-sm text-[var(--ink-2)]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" aria-hidden="true" />
              <span>
                {errorText(error)}
                {coins && ' Showing the last data received.'}
              </span>
            </p>
            <button type="button" onClick={refresh} disabled={loading} className="btn-ghost">
              Try again
            </button>
          </div>
        )}

        <section aria-label="Market summary" className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <Stat label="Gainers" value={coins ? String(up) : '--'} tone="up" />
          <Stat label="Losers" value={coins ? String(down) : '--'} tone="down" />
          <Stat
            label="Avg. 24h"
            value={avg === null ? '--' : `${avg > 0 ? '+' : ''}${avg.toFixed(2)}%`}
            tone={avg === null ? undefined : avg >= 0 ? 'up' : 'down'}
          />
        </section>

        <section
          aria-label="Heatmap of the top 20 cryptocurrencies"
          aria-busy={loading}
          className="mt-4 grid auto-rows-[104px] grid-flow-dense grid-cols-2 gap-2 sm:auto-rows-[124px] sm:gap-3 md:grid-cols-4 lg:grid-cols-6"
        >
          {coins
            ? coins.map((coin, i) => <CoinTile key={coin.id} coin={coin} index={i} dimmed={loading} />)
            : Array.from({ length: COUNT }, (_, i) => <SkeletonTile key={i} index={i} />)}
        </section>

        <footer className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Color legend">
            {LEGEND.map(({ bucket, label }) => (
              <li key={bucket} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className={`h-3 w-5 rounded-sm border border-white/20 ${SWATCH_STYLES[bucket]}`} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--subtle)]">
            Data from{' '}
            <a href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--ink)]">
              CoinGecko
            </a>
            . Not financial advice.
          </p>
        </footer>
      </main>
    </div>
  )
}
