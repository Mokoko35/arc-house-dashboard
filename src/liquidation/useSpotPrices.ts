import { useCallback, useEffect, useRef, useState } from 'react'
import { ASSETS } from './storage'

const URL = `https://api.coingecko.com/api/v3/simple/price?ids=${ASSETS.map((a) => a.coingeckoId).join(',')}&vs_currencies=usd&include_24hr_change=true`
const AUTO_REFRESH_MS = 60_000

export interface Spot {
  usd: number
  change24h: number | null
}

export type PriceError = 'network' | 'rateLimit' | 'http' | 'badData'

export interface SpotState {
  prices: Record<string, Spot> | null
  error: PriceError | null
  loading: boolean
  updatedAt: number | null
  refresh: () => void
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

async function fetchPrices(signal: AbortSignal): Promise<Record<string, Spot>> {
  let res: Response
  try {
    res = await fetch(URL, { signal, headers: { Accept: 'application/json' } })
  } catch (e) {
    if (signal.aborted) throw e
    throw new Error('network')
  }
  if (res.status === 429) throw new Error('rateLimit')
  if (!res.ok) throw new Error('http')
  const body: unknown = await res.json().catch(() => null)
  if (!isRecord(body)) throw new Error('badData')

  const out: Record<string, Spot> = {}
  for (const asset of ASSETS) {
    const entry = body[asset.coingeckoId]
    const usd = isRecord(entry) ? num(entry.usd) : null
    if (usd === null || usd <= 0) throw new Error('badData')
    out[asset.symbol] = { usd, change24h: isRecord(entry) ? num(entry.usd_24h_change) : null }
  }
  return out
}

const toCode = (e: unknown): PriceError => {
  const m = e instanceof Error ? e.message : ''
  return m === 'rateLimit' || m === 'http' || m === 'badData' ? m : 'network'
}

/** Current BTC and ETH prices from CoinGecko. Reloads every minute and on refresh(). */
export function useSpotPrices(): SpotState {
  const [prices, setPrices] = useState<Record<string, Spot> | null>(null)
  const [error, setError] = useState<PriceError | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const controller = useRef<AbortController | null>(null)

  const run = useCallback(() => {
    controller.current?.abort()
    const ctl = new AbortController()
    controller.current = ctl
    fetchPrices(ctl.signal)
      .then((data) => {
        if (ctl.signal.aborted) return
        setPrices(data)
        setError(null)
        setUpdatedAt(Date.now())
      })
      .catch((e: unknown) => {
        if (!ctl.signal.aborted) setError(toCode(e))
      })
      .finally(() => {
        if (!ctl.signal.aborted) setLoading(false)
      })
  }, [])

  useEffect(() => {
    run() // `loading` starts as true, so nothing is set synchronously here.
    const timer = setInterval(run, AUTO_REFRESH_MS)
    return () => {
      clearInterval(timer)
      controller.current?.abort()
    }
  }, [run])

  const refresh = useCallback(() => {
    setLoading(true)
    run()
  }, [run])

  return { prices, error, loading, updatedAt, refresh }
}
