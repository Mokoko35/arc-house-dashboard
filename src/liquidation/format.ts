const usdFull = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const usdSmall = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 })
const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 })

export const formatPrice = (n: number): string => (n < 1 ? usdSmall : usdFull).format(n)
export const formatAmount = (n: number): string => usdCompact.format(n)

export function formatPct(p: number): string {
  const sign = p > 0 ? '+' : ''
  return `${sign}${p.toFixed(2)}%`
}

/** "72,500", "$72500.5" -> number. Returns null unless it is a positive finite number. */
export function parsePrice(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (!/^\d*\.?\d+$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n > 0 ? n : null
}

const MULTIPLIERS: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 }

/** Accepts CoinGlass-style amounts: "1.2B", "$350M", "820k", "1,500,000". */
export function parseAmount(input: string): number | null {
  const match = /^\$?\s*([\d,]*\.?\d+)\s*([kmb])?$/i.exec(input.trim())
  if (!match) return null
  const base = Number((match[1] ?? '').replace(/,/g, ''))
  const mult = MULTIPLIERS[(match[2] ?? '').toLowerCase()] ?? 1
  const n = base * mult
  return Number.isFinite(n) && n > 0 ? n : null
}
