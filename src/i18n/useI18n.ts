import { useContext } from 'react'
import { I18nContext, type I18n } from './context'

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

/** "just now", "5m ago", "2h ago", "3d ago" in the active language. */
export function relativeTime(ts: number, locale: string, nowLabel: string): string {
  const mins = Math.round((Date.now() - ts) / 60_000)
  if (mins < 1) return nowLabel
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
  if (mins < 60) return rtf.format(-mins, 'minute')
  const hours = Math.round(mins / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  return rtf.format(-Math.round(hours / 24), 'day')
}
