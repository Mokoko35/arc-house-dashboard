export type Bucket = 'deepGain' | 'gain' | 'neutral' | 'loss' | 'deepLoss'

/** Thresholds in percent. At or above BIG is a big move; within ±SMALL counts as neutral. */
export const BIG = 2.5
export const SMALL = 0.5

export function bucketFor(change: number | null): Bucket {
  if (change === null || Math.abs(change) < SMALL) return 'neutral'
  if (change >= BIG) return 'deepGain'
  if (change > 0) return 'gain'
  if (change <= -BIG) return 'deepLoss'
  return 'loss'
}

// Full class names so Tailwind can see them.
export const TILE_STYLES: Record<Bucket, string> = {
  deepGain: 'bg-emerald-600 border-emerald-300/40 text-white shadow-emerald-900/40',
  gain: 'bg-emerald-400/25 border-emerald-300/30 text-emerald-50 shadow-emerald-900/20',
  neutral: 'bg-slate-500/25 border-slate-300/20 text-slate-100 shadow-black/20',
  loss: 'bg-rose-400/25 border-rose-300/30 text-rose-50 shadow-rose-900/20',
  deepLoss: 'bg-red-700 border-red-300/40 text-white shadow-red-950/50',
}

export const SWATCH_STYLES: Record<Bucket, string> = {
  deepGain: 'bg-emerald-600',
  gain: 'bg-emerald-400/40',
  neutral: 'bg-slate-500/40',
  loss: 'bg-rose-400/40',
  deepLoss: 'bg-red-700',
}

// Grid placement by market-cap rank. Together these tile a 2, 4 and 6 column grid with no gaps.
export const SPANS: string[] = [
  'col-span-2 row-span-2',
  'col-span-2 md:row-span-2',
  'md:col-span-2 lg:col-span-1 lg:row-span-2',
  'md:col-span-2 lg:col-span-1 lg:row-span-2',
  'lg:row-span-2',
  'lg:row-span-2',
]

export const spanFor = (index: number): string => SPANS[index] ?? ''
