import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANG, I18nContext, LANGS, LOCALES, type I18n, type Lang, type Params, translate } from './context'

const STORAGE_KEY = 'arc-house-dashboard:lang'

function loadLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return LANGS.find((l) => l === saved) ?? DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable; the choice just won't persist.
    }
  }, [])

  const value = useMemo<I18n>(
    () => ({
      lang,
      locale: LOCALES[lang],
      setLang,
      t: (key: string, params?: Params) => translate(lang, key, params),
    }),
    [lang, setLang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
