import { useCallback, useState } from 'react'
import { type AssetInfo, type Level, type LevelStore, MAX_LEVELS, loadStore, newId, saveStore } from './storage'

type Ticker = AssetInfo['symbol']

/** Manual liquidation levels, kept in localStorage. */
export function useLevels() {
  const [store, setStore] = useState<LevelStore>(loadStore)

  const update = useCallback((fn: (prev: LevelStore) => LevelStore) => {
    setStore((prev) => {
      const next = fn(prev)
      saveStore(next)
      return next
    })
  }, [])

  const add = useCallback(
    (symbol: Ticker, level: Omit<Level, 'id'>) =>
      update((prev) =>
        prev[symbol].length >= MAX_LEVELS ? prev : { ...prev, [symbol]: [...prev[symbol], { ...level, id: newId() }] },
      ),
    [update],
  )

  const remove = useCallback(
    (symbol: Ticker, id: string) => update((prev) => ({ ...prev, [symbol]: prev[symbol].filter((l) => l.id !== id) })),
    [update],
  )

  const clear = useCallback((symbol: Ticker) => update((prev) => ({ ...prev, [symbol]: [] })), [update])

  return { store, add, remove, clear }
}
