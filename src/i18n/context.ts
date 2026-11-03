import { createContext } from 'react'
import { en } from './en'
import { tr } from './tr'

export type Lang = 'tr' | 'en'
export type Params = Record<string, string | number>
export type TFn = (key: string, params?: Params) => string

export const DEFAULT_LANG: Lang = 'tr'
export const LANGS: Lang[] = ['tr', 'en']
export const LOCALES: Record<Lang, string> = { tr: 'tr-TR', en: 'en-US' }
export const CONNECTKIT_LANGS = { tr: 'tr-TR', en: 'en-US' } as const

const DICTS: Record<Lang, Record<string, string>> = { en, tr }

/**
 * Looks up a message. When `params.n` is a number, picks `${key}.one` (English, n === 1) or `${key}.other`
 * if present. Numeric params are formatted for the locale.
 */
export function translate(lang: Lang, key: string, params?: Params): string {
  const dict = DICTS[lang]
  let template: string | undefined
  if (typeof params?.n === 'number') {
    template = dict[`${key}.${lang === 'en' && params.n === 1 ? 'one' : 'other'}`]
  }
  template ??= dict[key] ?? DICTS.en[key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    if (value === undefined) return match
    return typeof value === 'number' ? value.toLocaleString(LOCALES[lang]) : value
  })
}

export interface I18n {
  lang: Lang
  locale: string
  setLang: (lang: Lang) => void
  t: TFn
}

export const I18nContext = createContext<I18n | null>(null)
