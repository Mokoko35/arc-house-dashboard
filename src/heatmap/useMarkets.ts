import { useCallback, useEffect, useRef, useState } from 'react'
import { type Coin, MarketsError, fetchMarkets } from './coingecko'

export interface MarketsState {
  coins: Coin[] | null
  error: MarketsError | null
  /** True for the first load and every refresh. */
  loading: boolean
  updatedAt: number | null
  refresh: () => void
}

/** Loads the top 20 coins on mount and again whenever refresh() is called. Previous data stays visible while reloading. */
export function useMarkets(): MarketsState {
  const [coins, setCoins] = useState<Coin[] | null>(null)
  const [error, setError] = useState<MarketsError | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const controller = useRef<AbortController | null>(null)

  // Starts a request and ignores its result if it was superseded or the component unmounted.
  const run = useCallback(() => {
    controller.current?.abort()
    const ctl = new AbortController()
    controller.current = ctl
    fetchMarkets(ctl.signal)
      .then((data) => {
        if (ctl.signal.aborted) return
        setCoins(data)
        setError(null)
        setUpdatedAt(Date.now())
      })
      .catch((e: unknown) => {
        if (ctl.signal.aborted) return
        setError(e instanceof MarketsError ? e : new MarketsError('network'))
      })
      .finally(() => {
        if (!ctl.signal.aborted) setLoading(false)
      })
  }, [])

  useEffect(() => {
    run() // `loading` already starts as true, so no state is set synchronously here.
    return () => controller.current?.abort()
  }, [run])

  const refresh = useCallback(() => {
    setLoading(true)
    run()
  }, [run])

  return { coins, error, loading, updatedAt, refresh }
}
