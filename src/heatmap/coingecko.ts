/** Free CoinGecko public API: top 20 coins by market cap, priced in USD. */
export const MARKETS_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false'

export interface Coin {
  id: string
  symbol: string
  name: string
  image: string
  price: number
  /** 24h change in percent, or null when CoinGecko has no value. */
  change24h: number | null
  marketCap: number
  rank: number
}

export type MarketsErrorCode = 'network' | 'rateLimit' | 'http' | 'badData'

export class MarketsError extends Error {
  readonly code: MarketsErrorCode
  readonly status?: number
  constructor(code: MarketsErrorCode, status?: number) {
    super(`Markets error: ${code}${status ? ` (${status})` : ''}`)
    this.code = code
    this.status = status
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function toCoin(raw: unknown, index: number): Coin | null {
  if (!isRecord(raw)) return null
  const price = num(raw.current_price)
  if (typeof raw.id !== 'string' || typeof raw.symbol !== 'string' || price === null) return null
  return {
    id: raw.id,
    symbol: raw.symbol.toUpperCase(),
    name: typeof raw.name === 'string' ? raw.name : raw.symbol.toUpperCase(),
    image: typeof raw.image === 'string' ? raw.image : '',
    price,
    change24h: num(raw.price_change_percentage_24h),
    marketCap: num(raw.market_cap) ?? 0,
    rank: num(raw.market_cap_rank) ?? index + 1,
  }
}

export async function fetchMarkets(signal?: AbortSignal): Promise<Coin[]> {
  let res: Response
  try {
    res = await fetch(MARKETS_URL, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new MarketsError('network')
  }
  if (res.status === 429) throw new MarketsError('rateLimit', 429)
  if (!res.ok) throw new MarketsError('http', res.status)

  const body: unknown = await res.json().catch(() => null)
  if (!Array.isArray(body)) throw new MarketsError('badData')
  const coins = (body as unknown[]).map(toCoin).filter((c): c is Coin => c !== null)
  if (coins.length === 0) throw new MarketsError('badData')
  return coins
}
