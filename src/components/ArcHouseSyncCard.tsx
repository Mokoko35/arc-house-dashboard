import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, Copy, Link2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getShareBase } from '@/lib/share'
import { SYNC_OPERATIONS, buildBookmarklet } from '@/lib/arcHouseSync'
import type { SyncOutcome } from '@/hooks/useArcHouseSync'
import { useI18n } from '@/i18n/useI18n'

export function ArcHouseSyncCard({ outcome }: { outcome: SyncOutcome }) {
  const { t, locale } = useI18n()
  const [dashUrl, setDashUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const linkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    void getShareBase().then((base) => setDashUrl(`${base}/`))
  }, [])

  const bookmarklet = dashUrl ? buildBookmarklet(dashUrl) : null

  // React blocks javascript: hrefs, so set it on the element directly so it can be dragged to the bookmarks bar.
  useEffect(() => {
    if (bookmarklet && linkRef.current) linkRef.current.setAttribute('href', bookmarklet)
  }, [bookmarklet])

  const copy = async () => {
    if (!bookmarklet) return
    try {
      await navigator.clipboard.writeText(bookmarklet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t('sync.copyFail'))
    }
  }

  const failed =
    outcome.kind === 'empty' ? outcome.report.statuses.filter((s) => s.status === 403 || s.status === 401) : []

  return (
    <section id="sync" className="card p-5 sm:p-6 lg:p-8" aria-labelledby="sync-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">{t('sync.eyebrow')}</p>
          <h2 id="sync-title" className="display mt-1 text-2xl font-semibold">
            {t('sync.title')}
          </h2>
        </div>
        {outcome.kind === 'ok' && (
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--success)]/40 bg-[var(--success)]/10 px-3 py-1.5 text-xs font-medium text-[var(--success)]">
            <Check size={13} /> {t('sync.synced', { time: new Date(outcome.report.fetchedAt).toLocaleTimeString(locale) })}
          </span>
        )}
      </div>

      <p className="mt-2 max-w-2xl text-pretty text-sm text-[var(--subtle)]">
        {t('sync.desc')}
      </p>

      <ol className="mt-5 grid gap-3 text-sm text-[var(--ink-2)] md:grid-cols-3">
        <li className="inner p-4">
          <span className="label block">{t('sync.step1')}</span>
          <span className="mt-1 block">{t('sync.step1Body')}</span>
        </li>
        <li className="inner p-4">
          <span className="label block">{t('sync.step2')}</span>
          <span className="mt-1 block">{t('sync.step2Body')}</span>
        </li>
        <li className="inner p-4">
          <span className="label block">{t('sync.step3')}</span>
          <span className="mt-1 block">{t('sync.step3Body')}</span>
        </li>
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          ref={linkRef}
          draggable
          onClick={(e) => e.preventDefault()}
          aria-disabled={!bookmarklet}
          className={`btn-primary cursor-grab ${bookmarklet ? '' : 'pointer-events-none opacity-45'}`}
        >
          <RefreshCw size={16} /> {t('sync.button')}
        </a>
        <button type="button" onClick={() => void copy()} disabled={!bookmarklet} className="btn-ghost">
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? t('common.copied') : t('sync.copy')}
        </button>
        <a
          href="https://community.arc.io"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost"
        >
          <Link2 size={15} /> {t('sync.open')}
        </a>
      </div>

      {outcome.kind === 'empty' && (
        <div className="mt-5 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <AlertTriangle size={15} /> {t('sync.emptyTitle')}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            {failed.length > 0
              ? t('sync.empty403')
              : t('sync.emptyShape')}
          </p>
        </div>
      )}

      {outcome.kind !== 'idle' && (
        <details className="mt-4 text-sm text-[var(--subtle)]">
          <summary className="min-h-10 cursor-pointer py-2">{t('sync.details')}</summary>
          <ul className="mt-2 space-y-1">
            {outcome.report.statuses.map((s) => (
              <li key={s.key} className="mono flex justify-between gap-3 text-xs">
                <span>{s.name}</span>
                <span className={s.status >= 200 && s.status < 300 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                  {s.status === 0 ? t('sync.failed') : s.status}
                </span>
              </li>
            ))}
          </ul>
          <pre className="mono mt-3 max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-relaxed text-[var(--muted)]">
            {outcome.report.preview}
          </pre>
        </details>
      )}

      <p className="mt-4 text-xs text-[var(--subtle)]">
        {t('sync.queries', { names: SYNC_OPERATIONS.map((o) => o.name).join(', ') })} {t('sync.warning')}
      </p>
    </section>
  )
}
