import { SlidersHorizontal } from 'lucide-react'
import { PlaylistManager } from './PlaylistManager'
import { KIND_LABEL, KINDS, categoriesOf } from './kinds'
import type { CardSize, EpgRefresh } from './prefs'
import { hrefFor, type SettingsTab } from './router'
import { Row, Section, Segmented, SoonBadge, Toggle } from './SettingsControls'
import { useMedia } from './useMedia'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: 'Genel' },
  { id: 'playback', label: 'Oynatma' },
  { id: 'epg', label: 'EPG' },
  { id: 'categories', label: 'Kategori Yönetimi' },
]

function General() {
  const { prefs, updatePrefs } = useMedia()
  return (
    <div className="space-y-5">
      <PlaylistManager />
      <Section title="Görünüm">
        <Row label="Kart boyutu" hint="Kanal ve poster ızgaralarının yoğunluğu.">
          <Segmented<CardSize>
            label="Kart boyutu"
            value={prefs.cardSize}
            onChange={(cardSize) => updatePrefs({ cardSize })}
            options={[
              { value: 'sm', label: 'Küçük' },
              { value: 'md', label: 'Orta' },
              { value: 'lg', label: 'Büyük' },
            ]}
          />
        </Row>
        <Row label="Logoları ve posterleri göster" hint="Kapatırsan kartlarda yalnızca baş harfler görünür.">
          <Toggle label="Logoları ve posterleri göster" checked={prefs.showLogos} onChange={(showLogos) => updatePrefs({ showLogos })} />
        </Row>
        <Row label="Açılışta son izlenen kanalı seç" hint="Uygulamayı açtığında son izlediğin içerik oynatıcıda hazır olur.">
          <Toggle label="Açılışta son izlenen kanalı seç" checked={prefs.startWithLast} onChange={(startWithLast) => updatePrefs({ startWithLast })} />
        </Row>
      </Section>
    </div>
  )
}

function Playback() {
  const { prefs, updatePrefs } = useMedia()
  return (
    <Section title="Oynatma">
      <Row label="Otomatik oynat" hint="Bir kanala veya içeriğe tıklayınca yayın hemen başlasın.">
        <Toggle label="Otomatik oynat" checked={prefs.autoplay} onChange={(autoplay) => updatePrefs({ autoplay })} />
      </Row>
      <Row label="Tampon süresi" hint="Yavaş bağlantılarda daha uzun tampon kesintileri azaltır." soon>
        <Segmented<10 | 30 | 60>
          label="Tampon süresi"
          disabled
          value={prefs.bufferSeconds}
          onChange={(bufferSeconds) => updatePrefs({ bufferSeconds })}
          options={[
            { value: 10, label: '10 sn' },
            { value: 30, label: '30 sn' },
            { value: 60, label: '60 sn' },
          ]}
        />
      </Row>
      <Row label="Donanım hızlandırma" hint="Windows masaüstü uygulamasında video çözmeyi ekran kartına bırakır." soon>
        <Toggle label="Donanım hızlandırma" disabled checked={prefs.hardwareDecoding} onChange={(hardwareDecoding) => updatePrefs({ hardwareDecoding })} />
      </Row>
    </Section>
  )
}

function Epg() {
  const { prefs, updatePrefs } = useMedia()
  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 text-sm text-[var(--ink-2)]">
        <SoonBadge /> Program rehberi (EPG) gösterimi sonraki adımda eklenecek. Adresi şimdiden kaydedebilirsin.
      </p>
      <Section title="Program rehberi (EPG)">
        <Row label="XMLTV adresi" hint="Genellikle .xml veya .xml.gz ile biten adres. Portal listelerinde sağlayıcı verir." htmlFor="epg-url">
          <input
            id="epg-url"
            value={prefs.epgUrl}
            onChange={(e) => updatePrefs({ epgUrl: e.target.value })}
            placeholder="http://sunucu.com/epg.xml"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className="field w-full sm:w-80"
          />
        </Row>
        <Row label="Otomatik güncelleme" hint="Rehber ne sıklıkla yenilensin.">
          <Segmented<EpgRefresh>
            label="Otomatik güncelleme"
            value={prefs.epgRefresh}
            onChange={(epgRefresh) => updatePrefs({ epgRefresh })}
            options={[
              { value: 'off', label: 'Kapalı' },
              { value: '6', label: '6 sa' },
              { value: '12', label: '12 sa' },
              { value: '24', label: '24 sa' },
            ]}
          />
        </Row>
        <Row label="Şimdi güncelle" soon>
          <button type="button" disabled className="btn-ghost">
            Rehberi indir
          </button>
        </Row>
      </Section>
    </div>
  )
}

function Categories() {
  const { parts, hiddenFor, setHiddenFor, openManage, lists } = useMedia()
  if (!lists.active) return <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-[var(--subtle)]">Kategorileri yönetmek için önce bir liste ekle.</p>
  return (
    <Section title="Kategori Yönetimi" description="Gizlediğin kategoriler listelerden ve ızgaralardan kalkar. Kanalların silinmez.">
      {KINDS.map((kind) => {
        const total = categoriesOf(parts[kind]).length
        const hiddenCount = categoriesOf(parts[kind]).filter((c) => hiddenFor(kind).has(c.name)).length
        return (
          <div key={kind} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-[var(--ink-2)]">{KIND_LABEL[kind]}</p>
              <p className="text-xs tabular-nums text-[var(--subtle)]">
                {total === 0 ? 'Kategori yok' : `${total} kategori · ${hiddenCount} gizli`}
              </p>
            </div>
            <div className="flex gap-2">
              {hiddenCount > 0 && (
                <button type="button" onClick={() => setHiddenFor(kind, [])} className="btn-ghost !min-h-10">
                  Hepsini göster
                </button>
              )}
              <button type="button" disabled={total === 0} onClick={() => openManage(kind)} className="btn-primary !min-h-10">
                <SlidersHorizontal size={15} aria-hidden="true" /> Kategorileri yönet
              </button>
            </div>
          </div>
        )
      })}
    </Section>
  )
}

export function SettingsPage() {
  const { route } = useMedia()
  return (
    <div>
      <h1 className="display text-3xl font-semibold">Ayarlar</h1>
      <div role="tablist" aria-label="Ayar bölümleri" className="no-scrollbar -mx-4 mt-5 flex gap-1 overflow-x-auto border-b border-white/10 px-4 lg:mx-0 lg:px-0">
        {TABS.map((t) => {
          const on = route.tab === t.id
          return (
            <a
              key={t.id}
              href={hrefFor('settings', t.id)}
              role="tab"
              aria-selected={on}
              className={`-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-4 text-sm font-medium transition ${
                on ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--subtle)] hover:text-[var(--ink)]'
              }`}
            >
              {t.label}
            </a>
          )
        })}
      </div>
      <div className="mt-6 max-w-3xl" role="tabpanel">
        {route.tab === 'general' && <General />}
        {route.tab === 'playback' && <Playback />}
        {route.tab === 'epg' && <Epg />}
        {route.tab === 'categories' && <Categories />}
      </div>
    </div>
  )
}
