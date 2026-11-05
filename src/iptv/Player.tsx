import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Maximize, Minimize, Pause, Play, SkipBack, SkipForward, Tv, Volume2, VolumeX } from 'lucide-react'
import type { Channel } from './types'

type Engine = 'hls' | 'ts' | 'native'

function engineFor(url: string): Engine {
  const path = url.split('?')[0]?.toLowerCase() ?? ''
  if (path.endsWith('.m3u8') || path.includes('.m3u8')) return 'hls'
  if (/\.(mp4|mkv|webm|m4v|mov|ogv|ogg|mp3|aac)$/.test(path)) return 'native'
  return 'ts' // ".ts" and extension-less live URLs (typical for Xtream portals)
}

/** An https page cannot load http streams. Desktop (file://) and plain http pages can. */
const mixedContent = (url: string) => window.location.protocol === 'https:' && url.startsWith('http://')

const HIDE_AFTER_MS = 3000
const VOLUME_KEY = 'iptv-player:volume:v1'

function loadVolume(): { volume: number; muted: boolean } {
  try {
    const raw = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? 'null') as { volume?: unknown; muted?: unknown } | null
    const volume = typeof raw?.volume === 'number' && raw.volume >= 0 && raw.volume <= 1 ? raw.volume : 1
    return { volume, muted: raw?.muted === true }
  } catch {
    return { volume: 1, muted: false }
  }
}

const clockTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

interface CoreProps {
  channel: Channel
  autoplay: boolean
  className: string
  /** Corner mini player: no control bar, a click pauses and plays. */
  compact: boolean
  onPrev?: () => void
  onNext?: () => void
  /** "12 / 340": where the channel is in its list. */
  navLabel?: string
  /** Buttons shown at the top right with the other controls. */
  topRight?: ReactNode
  /** Enter full screen as soon as this player shows, for a film or episode the user just chose to play. */
  wantFullscreen?: boolean
  onFullscreenHandled?: () => void
}

function ControlButton({ label, onClick, children, className = '' }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={label}
      title={label}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white ${className}`}
    >
      {children}
    </button>
  )
}

function PlayerCore({ channel, autoplay, className, compact, onPrev, onNext, navLabel, topRight, wantFullscreen = false, onFullscreenHandled }: CoreProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  // Status belongs to one stream address. A new channel starts as "loading" without remounting the player,
  // which is what keeps full screen alive when you change channels.
  const [status, setStatus] = useState<{ url: string; loading: boolean; error: string | null } | null>(null)
  const own = status?.url === channel.url ? status : null
  const loading = own ? own.loading : true
  const error = own ? own.error : null
  const [paused, setPaused] = useState(true)
  const [{ volume, muted }, setSound] = useState(loadVolume)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [awake, setAwake] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const blocked = mixedContent(channel.url)
  const isVod = Number.isFinite(duration) && duration > 0

  // Controls appear on any activity and go away after three seconds of none.
  const arm = useCallback(() => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setAwake(false), HIDE_AFTER_MS)
  }, [])
  const wake = useCallback(() => {
    setAwake(true)
    arm()
  }, [arm])
  useEffect(() => {
    arm() // first three seconds on a new channel show the name and controls, then they hide
    return () => window.clearTimeout(hideTimer.current)
  }, [arm])

  useEffect(() => {
    const video = videoRef.current
    if (!video || blocked) return
    let disposed = false
    let teardown: (() => void) | undefined
    video.volume = volume
    video.muted = muted

    const url = channel.url
    const patch = (p: { loading?: boolean; error?: string | null }) =>
      setStatus((prev) => ({ ...(prev?.url === url ? prev : { url, loading: true, error: null }), ...p }))
    const fail = (message: string) => {
      if (!disposed) patch({ error: message, loading: false })
    }
    const onPlaying = () => patch({ loading: false, error: null })
    const onWaiting = () => patch({ loading: true })
    // Emptying the element when a channel is swapped can raise an error with no cause; only a real one counts.
    const onNativeError = () => {
      if (video.error) fail('Bu yayın oynatılamadı. Adres geçersiz olabilir veya kodek tarayıcıda desteklenmiyor.')
    }
    const onEmptied = () => {
      setTime(0)
      setDuration(0)
      setPaused(video.paused)
    }
    const onPlay = () => setPaused(false)
    const onPause = () => setPaused(true)
    const onTime = () => setTime(video.currentTime)
    const onDuration = () => setDuration(video.duration)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('error', onNativeError)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('durationchange', onDuration)
    video.addEventListener('emptied', onEmptied)

    const start = async () => {
      const engine = engineFor(channel.url)
      try {
        if (engine === 'hls') {
          const { default: Hls } = await import('hls.js')
          if (disposed) return
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true })
            let retried = false
            hls.on(Hls.Events.ERROR, (_e, data) => {
              if (!data.fatal) return
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !retried) {
                retried = true
                hls.startLoad()
              } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError()
              } else {
                fail('Yayına bağlanılamadı. Sunucu kapalı olabilir veya tarayıcıya erişimi engelliyor (CORS).')
              }
            })
            hls.loadSource(channel.url)
            hls.attachMedia(video)
            teardown = () => hls.destroy()
          } else {
            video.src = channel.url
          }
        } else if (engine === 'ts') {
          const { default: mpegts } = await import('mpegts.js')
          if (disposed) return
          if (mpegts.isSupported()) {
            const player = mpegts.createPlayer({ type: 'mpegts', isLive: true, url: channel.url })
            player.on(mpegts.Events.ERROR, () => fail('Yayına bağlanılamadı. Sunucu kapalı olabilir veya tarayıcıya erişimi engelliyor (CORS).'))
            player.attachMediaElement(video)
            player.load()
            teardown = () => player.destroy()
          } else {
            video.src = channel.url
          }
        } else {
          video.src = channel.url
        }
        if (autoplay) await video.play().catch(() => undefined) // Autoplay can be refused; the user can press play.
      } catch {
        fail('Oynatıcı başlatılamadı.')
      }
    }
    void start()

    return () => {
      disposed = true
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('error', onNativeError)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('durationchange', onDuration)
      video.removeEventListener('emptied', onEmptied)
      teardown?.()
      video.removeAttribute('src')
      video.load()
    }
    // volume and muted are applied once here; later changes go straight to the element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.url, blocked, autoplay])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
  }, [])

  const setVolume = (next: number, nextMuted = next === 0) => {
    const video = videoRef.current
    if (video) {
      video.volume = next
      video.muted = nextMuted
    }
    setSound({ volume: next, muted: nextMuted })
    try {
      localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume: next, muted: nextMuted }))
    } catch {
      // ignore
    }
  }
  const toggleMute = useCallback(() => setVolume(volume === 0 ? 1 : volume, !muted), [volume, muted]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen().catch(() => undefined)
  }, [])
  // Full screen on request. The click on "Oynat" is the user action the browser needs; it stays valid for a few seconds,
  // which is longer than it takes this player to appear.
  useEffect(() => {
    if (!wantFullscreen) return
    if (!compact && !document.fullscreenElement) void wrapRef.current?.requestFullscreen().catch(() => undefined)
    onFullscreenHandled?.()
  }, [wantFullscreen, compact, onFullscreenHandled])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const seek = (seconds: number) => {
    const video = videoRef.current
    if (video && Number.isFinite(video.duration)) video.currentTime = Math.max(0, Math.min(video.duration, seconds))
  }

  // Keyboard: left/right change the channel (or skip 10 seconds in a film), space pauses, M mutes, F is full screen.
  useEffect(() => {
    if (compact) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const video = videoRef.current
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const back = e.key === 'ArrowLeft'
        if (back && onPrev) onPrev()
        else if (!back && onNext) onNext()
        else if (video && Number.isFinite(video.duration)) seek(video.currentTime + (back ? -10 : 10))
        else return
      } else if (e.key === ' ' && t?.tagName !== 'BUTTON') togglePlay()
      else if (e.key === 'm' || e.key === 'M') toggleMute()
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      else return
      e.preventDefault()
      wake()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [compact, onPrev, onNext, togglePlay, toggleMute, toggleFullscreen, wake])

  const message = blocked
    ? 'Bu yayın http:// ile başlıyor. https sayfalarda tarayıcı bunu engeller. Windows masaüstü uygulamasında veya http:// ile açılan sayfada oynar.'
    : error
  const show = !compact && (awake || paused || message !== null)
  const hideCursor = !compact && !show && !paused

  return (
    <div
      ref={wrapRef}
      onPointerMove={compact ? undefined : wake}
      onPointerDown={compact ? undefined : wake}
      onFocusCapture={compact ? undefined : wake}
      className={`player-surface relative aspect-video w-full overflow-hidden bg-black ${hideCursor ? 'cursor-none' : ''} ${className}`}
    >
      <video
        ref={videoRef}
        playsInline
        onClick={togglePlay}
        onDoubleClick={compact ? undefined : toggleFullscreen}
        className="h-full w-full"
      />

      {loading && !message && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="animate-spin text-white/70" size={36} aria-label="Yükleniyor" />
        </div>
      )}

      {!compact && (
        <>
          {/* Top: the channel's logo and name, plus the window buttons. */}
          <div className={`absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 pb-10 transition-opacity duration-300 sm:p-4 sm:pb-12 ${show ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white drop-shadow sm:text-lg">{channel.name}</p>
                {channel.subtitle && <p className="truncate text-sm text-white/75">{channel.subtitle}</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">{topRight}</div>
          </div>

          {/* Bottom: the controls. */}
          <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-2 pt-12 transition-opacity duration-300 sm:px-4 sm:pb-3 ${show ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            {isVod && (
              <input
                type="range"
                min={0}
                max={Math.floor(duration)}
                value={Math.floor(time)}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Konum"
                className="mb-1 h-1.5 w-full cursor-pointer accent-accent"
              />
            )}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {onPrev && (
                <ControlButton label="Önceki kanal (←)" onClick={onPrev}>
                  <SkipBack size={20} fill="currentColor" aria-hidden="true" />
                </ControlButton>
              )}
              <ControlButton label={paused ? 'Oynat (boşluk)' : 'Duraklat (boşluk)'} onClick={togglePlay}>
                {paused ? <Play size={22} fill="currentColor" aria-hidden="true" /> : <Pause size={22} fill="currentColor" aria-hidden="true" />}
              </ControlButton>
              {onNext && (
                <ControlButton label="Sonraki kanal (→)" onClick={onNext}>
                  <SkipForward size={20} fill="currentColor" aria-hidden="true" />
                </ControlButton>
              )}
              <ControlButton label={muted || volume === 0 ? 'Sesi aç (M)' : 'Sesi kapat (M)'} onClick={toggleMute}>
                {muted || volume === 0 ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
              </ControlButton>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Ses düzeyi"
                className="hidden h-1.5 w-24 cursor-pointer accent-accent sm:block"
              />
              <div className="min-w-0 flex-1 px-2 text-right text-sm tabular-nums text-white/80">
                {isVod ? (
                  `${clockTime(time)} / ${clockTime(duration)}`
                ) : (
                  <span className="inline-flex items-center gap-2">
                    {navLabel && <span className="hidden text-white/65 sm:inline">{navLabel}</span>}
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-danger/90 px-2 py-0.5 text-xs font-bold tracking-wider text-white">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white" /> CANLI
                    </span>
                  </span>
                )}
              </div>
              <ControlButton label={fullscreen ? 'Tam ekrandan çık (F)' : 'Tam ekran (F)'} onClick={toggleFullscreen}>
                {fullscreen ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
              </ControlButton>
            </div>
          </div>
        </>
      )}

      {message && (
        <div role="alert" className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
          <div className="max-w-md">
            <AlertTriangle className="mx-auto text-danger" size={28} aria-hidden="true" />
            <p className="mt-3 text-pretty text-sm text-[var(--ink-2)]">{message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface PlayerProps {
  channel: Channel | null
  autoplay?: boolean
  className?: string
  compact?: boolean
  onPrev?: () => void
  onNext?: () => void
  navLabel?: string
  topRight?: ReactNode
  wantFullscreen?: boolean
  onFullscreenHandled?: () => void
}

export function Player({ channel, autoplay = true, className = 'rounded-2xl border border-white/10', compact = false, onPrev, onNext, navLabel, topRight, wantFullscreen, onFullscreenHandled }: PlayerProps) {
  if (!channel) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-2xl border border-dashed border-white/15 bg-black/40 p-6 text-center">
        <div>
          <Tv className="mx-auto text-[var(--subtle)]" size={34} aria-hidden="true" />
          <p className="mt-3 text-sm text-[var(--subtle)]">İzlemek için listeden bir kanal seç.</p>
        </div>
      </div>
    )
  }
  // No key on purpose: the same <video> and wrapper stay mounted for every channel, so full screen survives a channel change.
  return <PlayerCore channel={channel} autoplay={autoplay} className={className} compact={compact} onPrev={onPrev} onNext={onNext} navLabel={navLabel} topRight={topRight} wantFullscreen={wantFullscreen} onFullscreenHandled={onFullscreenHandled} />
}
