import { AlertTriangle, Info, RefreshCw } from 'lucide-react'
import { AssetPanel } from './AssetPanel'
import { ASSETS } from './storage'
import { useLevels } from './useLevels'
import { type PriceError, useSpotPrices } from './useSpotPrices'

const ERRORS: Record<PriceError, string> = {
  network: 'Could not reach CoinGecko. Check your connection and try again.',
  rateLimit: "CoinGecko's free API is rate limited right now. Wait a minute, then refresh.",
  http: 'CoinGecko returned an error. Try again shortly.',
  badData: 'CoinGecko sent prices in an unexpected format.',
}

export default function LiquidationApp() {
  const { prices, error, loading, updatedAt, refresh } = useSpotPrices()
  const { store, add, remove, clear } = useLevels()

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(172,198,233,0.14),transparent)]"
      />
      <main className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="label">BTC and ETH</p>
            <h1 className="display mt-1 text-balance text-4xl font-semibold sm:text-5xl">Liquidation Levels</h1>
            <p className="mt-2 max-w-xl text-pretty text-sm text-[var(--subtle)]">
              Track the biggest long and short liquidation clusters you enter against the live price.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-[var(--subtle)] sm:block" aria-live="polite">
              {loading ? 'Fetching prices...' : updatedAt ? `Prices updated ${new Date(updatedAt).toLocaleTimeString()}` : ''}
            </p>
            <button type="button" onClick={refresh} disabled={loading} className="btn-primary">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              {loading ? 'Refreshing...' : 'Refresh price'}
            </button>
          </div>
        </header>

        <p className="mt-5 flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-[var(--ink-2)]">
          <Info size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
          <span>
            Levels are entered by you, for example from CoinGlass, and saved in this browser only. Nothing is fetched from
            CoinGlass. Only the current price comes from CoinGecko.
          </span>
        </p>

        {error && (
          <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3">
            <p className="flex items-start gap-2 text-sm text-[var(--ink-2)]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" aria-hidden="true" />
              <span>
                {ERRORS[error]}
                {prices && ' Showing the last prices received.'}
              </span>
            </p>
            <button type="button" onClick={refresh} disabled={loading} className="btn-ghost">
              Try again
            </button>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start md:gap-6">
          {ASSETS.map((asset) => (
            <AssetPanel
              key={asset.symbol}
              asset={asset}
              spot={prices?.[asset.symbol]}
              levels={store[asset.symbol]}
              dimmed={loading && prices !== null}
              onAdd={(side, price, amount) => add(asset.symbol, { side, price, amount })}
              onRemove={(id) => remove(asset.symbol, id)}
              onClear={() => clear(asset.symbol)}
            />
          ))}
        </div>

        <p className="mt-6 text-xs text-[var(--subtle)]">
          Price data from{' '}
          <a href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--ink)]">
            CoinGecko
          </a>
          . Not financial advice.
        </p>
      </main>
    </div>
  )
}
