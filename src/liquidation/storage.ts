export type Side = 'long' | 'short'

export interface Level {
  id: string
  side: Side
  /** Price of the cluster in USD. */
  price: number
  /** Size of the cluster in USD. */
  amount: number
}

export interface AssetInfo {
  symbol: 'BTC' | 'ETH'
  name: string
  coingeckoId: string
}

export const ASSETS: AssetInfo[] = [
  { symbol: 'BTC', name: 'Bitcoin', coingeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', coingeckoId: 'ethereum' },
]

export type LevelStore = Record<AssetInfo['symbol'], Level[]>

const STORAGE_KEY = 'liquidation-levels:v1'
const MAX_PER_ASSET = 50

export const emptyStore = (): LevelStore => ({ BTC: [], ETH: [] })

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function toLevel(v: unknown): Level | null {
  if (!isRecord(v)) return null
  const { id, side, price, amount } = v
  if (typeof id !== 'string' || (side !== 'long' && side !== 'short')) return null
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return null
  return { id, side, price, amount }
}

function toLevels(v: unknown): Level[] {
  if (!Array.isArray(v)) return []
  return (v as unknown[]).map(toLevel).filter((l): l is Level => l !== null).slice(0, MAX_PER_ASSET)
}

export function loadStore(): LevelStore {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (!text) return emptyStore()
    const data: unknown = JSON.parse(text)
    if (!isRecord(data)) return emptyStore()
    return { BTC: toLevels(data.BTC), ETH: toLevels(data.ETH) }
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: LevelStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Storage can be unavailable (private mode); levels just won't persist.
  }
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const MAX_LEVELS = MAX_PER_ASSET
