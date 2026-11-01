import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, Newspaper, Send, Sparkles, X } from 'lucide-react'
import { SUGGESTIONS, answer, buildBriefing } from '@/lib/assistant'
import type { Snapshot } from '@/lib/assistant'

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
}

export function ChatWidget({ snapshot }: { snapshot: Snapshot }) {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const nextId = useRef(1)
  const endRef = useRef<HTMLDivElement>(null)

  // The briefing is derived from live data, so it fills in as the wallet and GitHub load.
  const briefing = useMemo(() => buildBriefing(snapshot), [snapshot])

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
    const reply = answer(question, snapshot)
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: 'user', text: question },
      { id: nextId.current++, role: 'assistant', text: reply },
    ])
    setDraft('')
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Arc Assistant"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed bottom-[132px] right-4 z-50 flex h-[min(540px,calc(100dvh-160px))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0f2036]/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-[#0d1b2f]">
                  <Sparkles size={17} />
                </div>
                <div>
                  <p className="display text-base font-semibold leading-tight">Arc Assistant</p>
                  <p className="text-[11px] text-[var(--subtle)]">Answers from your dashboard data</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggle}
                aria-label="Close assistant"
                className="grid h-10 w-10 place-items-center rounded-full text-[var(--subtle)] transition hover:bg-white/10 hover:text-[var(--ink)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4">
                <p className="label mb-2 flex items-center gap-1.5 !text-[var(--accent)]">
                  <Newspaper size={12} /> Daily Briefing
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
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="min-h-9 rounded-full border border-white/12 px-3 text-xs text-[var(--muted)] transition hover:border-white/30 hover:text-[var(--ink)]"
                  >
                    {s}
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
                  placeholder="Ask about your wallet, points, GitHub..."
                  aria-label="Message"
                  className="field"
                />
                <button type="submit" disabled={!draft.trim()} aria-label="Send message" className="btn-primary !px-4">
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
        aria-label={open ? 'Close assistant' : 'Open assistant and daily briefing'}
        aria-expanded={open}
        className="fixed bottom-16 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-[var(--accent)] text-[#0d1b2f] shadow-xl transition hover:bg-[var(--accent-hover)] active:scale-95"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && !seen && (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0d1b2f] bg-[var(--success)]" />
        )}
      </button>
    </>
  )
}
