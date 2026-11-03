import { Languages } from 'lucide-react'
import { LANGS, type Lang } from '@/i18n/context'
import { useI18n } from '@/i18n/useI18n'

const LABELS: Record<Lang, string> = { tr: 'TR', en: 'EN' }
const NAMES: Record<Lang, string> = { tr: 'Türkçe', en: 'English' }

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n()
  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1"
    >
      <Languages size={14} className="ml-2 hidden text-[var(--subtle)] sm:block" aria-hidden="true" />
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          title={NAMES[l]}
          aria-label={NAMES[l]}
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`min-h-10 min-w-10 rounded-xl px-3 text-xs font-semibold tracking-wide transition ${
            lang === l ? 'bg-[var(--accent)] text-[#0d1b2f]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  )
}
