import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, Newspaper, Send, Sparkles, X } from 'lucide-react'
import { SUGGESTION_KEYS, answer, buildBriefing } from '@/lib/assistant'
import { useI18n } from '@/i18n/useI18n'
import type { Snapshot } from '@/lib/assistant'

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
}

export function ChatWidget({ snapshot }: { snapshot: Snapshot }) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const nextId = useRef(1)
  const endRef = useRef<HTMLDivElement>(null)

  // The briefing is derived from live data, so it fills in as the wallet and GitHub load.
  const briefing = useMemo(() => buildBriefing(snapshot, t, locale), [snapshot, t, locale])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, open])

  const toggle = () => {
    setOpen((o) => !o)
    setSeen(true)
  }

  const send = (text: string) => {
    const question = text.trim()
    if (!question) return
    const reply = answer(question, snapshot, t, locale)
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: 'user', text: question },
      { id: nextId.current++, role: 'assistant', text: reply },
    ])
    setDraft('')
  }

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t('chat.title')}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            style={{ position: 'fixed', right: 16, bottom: 140, zIndex: 10000 }}
            className="flex h-[min(540px,calc(100dvh-160px))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0f2036]/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-[#0d1b2f]">
                  <Sparkles size={17} />
                </div>
                <div>
                  <p className="display text-base font-semibold leading-tight">{t('chat.title')}</p>
                  <p className="text-[11px] text-[var(--subtle)]">{t('chat.subtitle')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggle}
                aria-label={t('chat.close')}
                className="grid h-10 w-10 place-items-center rounded-full text-[var(--subtle)] transition hover:bg-white/10 hover:text-[var(--ink)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4">
                <p className="label mb-2 flex items-center gap-1.5 !text-[var(--accent)]">
                  <Newspaper size={12} /> {t('chat.briefing')}
                </p>
                <p className="whitespace-pre-line text-pretty text-sm leading-relaxed text-[var(--ink-2)]">{briefing}</p>
              </div>

              {messages.map((m) => (
                <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <p
                    className={`max-w-[85%] whitespace-pre-line text-pretty rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[var(--accent)] text-[#0d1b2f]'
                        : 'border border-white/10 bg-white/[0.06] text-[var(--ink-2)]'
                    }`}
                  >
                    {m.text}
                  </p>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="border-t border-white/10 px-4 pb-4 pt-3">
              <div className="mb-3 flex flex-wrap gap-2">
                {SUGGESTION_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => send(t(key))}
                    className="min-h-9 rounded-full border border-white/12 px-3 text-xs text-[var(--muted)] transition hover:border-white/30 hover:text-[var(--ink)]"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  send(draft)
                }}
                className="flex gap-2"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('chat.placeholder')}
                  aria-label={t('chat.message')}
                  className="field"
                />
                <button type="submit" disabled={!draft.trim()} aria-label={t('chat.send')} className="btn-primary !px-4">
                  <Send size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={toggle}
        aria-label={open ? t('chat.close') : t('chat.open')}
        aria-expanded={open}
        style={{ position: 'fixed', right: 16, bottom: 72, zIndex: 10000, width: 56, height: 56 }}
        className="grid place-items-center rounded-full bg-[var(--accent)] text-[#0d1b2f] shadow-xl transition hover:bg-[var(--accent-hover)] active:scale-95"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && !seen && (
          <span
            style={{ position: 'absolute', right: -2, top: -2, width: 14, height: 14, background: '#8dd89f' }}
            className="rounded-full border-2 border-[#0d1b2f]"
          />
        )}
      </button>
    </>,
    document.body,
  )
}
