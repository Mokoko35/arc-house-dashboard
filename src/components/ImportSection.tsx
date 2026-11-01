import { useState } from 'react'
import { FileJson, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  type ArcHouseProfile,
  type Badge,
  EMPTY_PROFILE,
  SAMPLE_JSON,
  dedupeBadges,
  parseArcHouseJson,
} from '@/lib/arcHouse'

type Tab = 'json' | 'manual'

interface Props {
  profile: ArcHouseProfile | null
  onChange: (next: ArcHouseProfile | null) => void
}

function JsonImport({ onChange }: { onChange: Props['onChange'] }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const run = () => {
    const result = parseArcHouseJson(text)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    onChange(result.profile)
    setText('')
    toast.success(`Imported ${result.found.join(', ')}.`)
  }

  return (
    <div className="space-y-3">
      <label htmlFor="ah-json" className="label block">
        Exported Arc House JSON
      </label>
      <textarea
        id="ah-json"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (error) setError(null)
        }}
        rows={8}
        spellCheck={false}
        placeholder={SAMPLE_JSON}
        className="field mono !text-[13px] resize-y"
        aria-invalid={error !== null}
      />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={!text.trim()} className="btn-primary">
          <FileJson size={16} /> Import data
        </button>
        <button type="button" onClick={() => setText(SAMPLE_JSON)} className="btn-ghost">
          Use example
        </button>
      </div>
      <p className="text-xs text-[var(--subtle)]">
        Recognized keys: points, tier, badges, handle. Data stays in this browser.
      </p>
    </div>
  )
}

function ManualEdit({ profile, onChange }: Props) {
  const base = profile ?? EMPTY_PROFILE
  const [points, setPoints] = useState(String(base.points))
  const [tier, setTier] = useState(base.tier)
  const [badges, setBadges] = useState<Badge[]>(base.badges)
  const [badgeDraft, setBadgeDraft] = useState('')

  const pointsValid = /^\d+$/.test(points.trim())

  const addBadge = () => {
    const name = badgeDraft.trim()
    if (!name) return
    setBadges((prev) => dedupeBadges([...prev, { name: name.slice(0, 60) }]))
    setBadgeDraft('')
  }

  const save = () => {
    if (!pointsValid) return
    onChange({
      handle: base.handle,
      points: Number(points.trim()),
      tier: tier.trim() || EMPTY_PROFILE.tier,
      badges,
      updatedAt: Date.now(),
    })
    toast.success('Profile updated.')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ah-points" className="label mb-2 block">
            Points
          </label>
          <input
            id="ah-points"
            inputMode="numeric"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="field tabular-nums"
            aria-invalid={!pointsValid}
          />
          {!pointsValid && <p className="mt-1.5 text-xs text-[var(--danger)]">Enter a whole number.</p>}
        </div>
        <div>
          <label htmlFor="ah-tier" className="label mb-2 block">
            Tier
          </label>
          <input
            id="ah-tier"
            value={tier}
            maxLength={40}
            onChange={(e) => setTier(e.target.value)}
            placeholder="Tier 0, Architect..."
            className="field"
          />
        </div>
      </div>

      <div>
        <label htmlFor="ah-badge" className="label mb-2 block">
          Badges
        </label>
        <div className="flex gap-2">
          <input
            id="ah-badge"
            value={badgeDraft}
            maxLength={60}
            onChange={(e) => setBadgeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addBadge()
              }
            }}
            placeholder="Add a badge name"
            className="field"
          />
          <button type="button" onClick={addBadge} disabled={!badgeDraft.trim()} className="btn-ghost shrink-0" aria-label="Add badge">
            <Plus size={16} />
          </button>
        </div>
        {badges.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {badges.map((b) => (
              <li
                key={b.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] py-1.5 pl-3 pr-1.5 text-sm text-[var(--ink-2)]"
              >
                {b.name}
                <button
                  type="button"
                  onClick={() => setBadges((prev) => prev.filter((x) => x.name !== b.name))}
                  aria-label={`Remove ${b.name}`}
                  className="grid h-6 w-6 place-items-center rounded-full text-[var(--subtle)] hover:bg-white/10 hover:text-[var(--ink)]"
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" onClick={save} disabled={!pointsValid} className="btn-primary">
        Save changes
      </button>
    </div>
  )
}

export function ImportSection({ profile, onChange }: Props) {
  const [tab, setTab] = useState<Tab>('json')

  const tabs: { id: Tab; label: string; icon: typeof FileJson }[] = [
    { id: 'json', label: 'Paste JSON', icon: FileJson },
    { id: 'manual', label: 'Edit manually', icon: SlidersHorizontal },
  ]

  return (
    <section id="import" className="card p-6 sm:p-8" aria-labelledby="import-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">Update your profile</p>
          <h2 id="import-title" className="display mt-1 text-2xl font-semibold">
            Import data
          </h2>
        </div>
        {profile && (
          <button
            type="button"
            onClick={() => {
              onChange(null)
              toast('Arc House data cleared.')
            }}
            className="btn-ghost !text-[var(--danger)]"
          >
            <Trash2 size={15} /> Clear data
          </button>
        )}
      </div>
      <p className="mt-2 max-w-xl text-pretty text-sm text-[var(--subtle)]">
        Arc House has no public API. Paste your exported data or edit the numbers yourself. Nothing leaves your browser.
      </p>

      <div role="tablist" aria-label="Import method" className="mt-5 inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition ${
              tab === id ? 'bg-[var(--accent)] text-[#0d1b2f]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-5" role="tabpanel">
        {tab === 'json' ? (
          <JsonImport onChange={onChange} />
        ) : (
          <ManualEdit key={profile?.updatedAt ?? 0} profile={profile} onChange={onChange} />
        )}
      </div>
    </section>
  )
}
