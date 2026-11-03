import { RefreshCw, SlidersHorizontal } from 'lucide-react'
import { dateTime, megabytes } from './epgFormat'
import { PlaylistManager } from './PlaylistManager'
import { KIND_LABEL, KINDS, categoriesOf } from './kinds'
import type { CardSize, EpgRefresh } from './prefs'
import { hrefFor, type SettingsTab } from './router'
import { Row, Section, Segmented, Toggle } from './SettingsControls'
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
  const { prefs, updatePrefs, epg } = useMedia()
  const shownUrl = epg.url.replace(/(password=)[^&]*/i, '$1***')
  const status =
    epg.status === 'loading'
      ? `Rehber indiriliyor${epg.bytes > 0 ? ` · ${megabytes(epg.bytes)}` : '...'}`
      : epg.status === 'ready'
        ? `${epg.channelCount.toLocaleString('tr-TR')} kanal için program var${epg.fetchedAt ? ` · son güncelleme ${dateTime(epg.fetchedAt)}` : ''}`
        : epg.status === 'error'
          ? (epg.error ?? 'Rehber alınamadı.')
          : epg.url
            ? 'Henüz indirilmedi.'
            : 'Bu liste bir portal değil. Rehber için bir XMLTV adresi gir.'

  return (
    <div className="space-y-5">
      <Section title="Program rehberi (EPG)" description="Canlı TV kartlarında ve oynatıcı penceresinde Şimdi ve Sonra programlarını gösterir.">
        <Row label="Durum" hint={epg.status === 'ready' && epg.error ? epg.error : undefined}>
          <p aria-live="polite" className={`max-w-xs text-right text-sm tabular-nums ${epg.status === 'error' ? 'text-[var(--danger)]' : 'text-[var(--ink-2)]'}`}>
            {status}
          </p>
        </Row>
        <Row label="XMLTV adresi" hint="Boş bırakırsan portalın kendi adresi (xmltv.php) kullanılır. Genellikle .xml veya .xml.gz ile biten adres." htmlFor="epg-url">
          <input
            id="epg-url"
            value={prefs.epgUrl}
            onChange={(e) => updatePrefs({ epgUrl: e.target.value })}
            placeholder={shownUrl || 'http://sunucu.com/epg.xml'}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className="field w-full sm:w-80"
          />
        </Row>
        <Row label="Otomatik güncelleme" hint="Rehber ne sıklıkla yenilensin. Kapalıysa yalnızca elle güncellenir.">
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
        <Row label="Şimdi güncelle" hint="Büyük rehberler birkaç dakika sürebilir. İlerleme üstte görünür.">
          <button type="button" onClick={epg.refresh} disabled={!epg.url || epg.status === 'loading'} className="btn-primary">
            <RefreshCw size={16} className={epg.status === 'loading' ? 'animate-spin' : ''} aria-hidden="true" /> Rehberi indir
          </button>
        </Row>
      </Section>
      <p className="text-xs text-[var(--subtle)]">Kanalların rehberle eşleşmesi için listedeki tvg-id kullanılır; yoksa kanal adı eşleştirilir. Eski eklenen listelerde tvg-id yoksa listeyi güncelle.</p>
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
