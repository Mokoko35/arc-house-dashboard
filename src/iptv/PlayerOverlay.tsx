import { useEffect, useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import { kindOf } from './kinds'
import { NowPlayingInfo } from './NowPlayingInfo'
import { Player } from './Player'
import { useMedia } from './useMedia'

interface Box {
  top: number
  left: number
  width: number
  height: number
}

/**
 * The one player. It is a single element that is drawn in one of three places, so changing place never restarts the stream:
 * - inline: over an empty box in the Live TV / Favorites page (no window),
 * - modal: a large window over the page,
 * - mini: docked in the corner while you browse.
 */
export function PlayerOverlay() {
  const { current, playerMode, inlineHost, inlineSlot, minimizePlayer, expandPlayer, stopPlayer, prefs, channelNav, fullscreenPending, fullscreenHandled } = useMedia()
  const mode = !current || playerMode === 'closed' ? 'closed' : inlineHost ? 'inline' : playerMode
  const modal = mode === 'modal'
  const inline = mode === 'inline'

  // Is the player filling the screen? Decides what the X button and a right-click do.
  const [isFull, setIsFull] = useState(false)
  useEffect(() => {
    const onChange = () => setIsFull(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const vod = current !== null && kindOf(current) !== 'live'
  // "Back": leave full screen first, then close. A film or episode is stopped; a live channel shrinks to the corner.
  const goBack = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    if (vod) stopPlayer()
    else minimizePlayer()
  }

  // Inline: follow the empty box in the page.
  const [box, setBox] = useState<Box | null>(null)
  useEffect(() => {
    if (!inline || !inlineSlot) return
    const measure = () => {
      const r = inlineSlot.getBoundingClientRect()
      setBox((prev) => (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height ? prev : { top: r.top, left: r.left, width: r.width, height: r.height }))
    }
    const observer = new ResizeObserver(measure) // also runs once right away
    observer.observe(inlineSlot)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [inline, inlineSlot, prefs.sidebarCollapsed])

  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') minimizePlayer()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [modal, minimizePlayer])

  if (!current || mode === 'closed') return null

  const player = (
    <Player
      channel={current}
      autoplay={prefs.autoplay}
      className="rounded-none"
      compact={mode === 'mini'}
      wantFullscreen={fullscreenPending}
      onFullscreenHandled={fullscreenHandled}
      onPrev={!(mode === 'mini') && channelNav ? () => channelNav.step(-1) : undefined}
      onNext={!(mode === 'mini') && channelNav ? () => channelNav.step(1) : undefined}
      onBack={(modal || inline) && vod ? goBack : undefined}
      navLabel={channelNav ? `${channelNav.position} / ${channelNav.total}` : undefined}
      topRight={
        modal || (inline && vod && isFull) ? (
          <button
            type="button"
            onClick={isFull ? goBack : minimizePlayer}
            aria-label={isFull && vod ? 'Geri: tam ekrandan çık ve oynatıcıyı kapat' : 'Pencereyi kapat ve köşeye küçült'}
            title={isFull && vod ? 'Geri (sağ tık da aynı işi yapar)' : 'Kapat (yayın köşede devam eder)'}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white/90 hover:bg-black/75 hover:text-white"
          >
            <X size={20} />
          </button>
        ) : undefined
      }
    />
  )

  return (
    <>
      {modal && <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm" onClick={minimizePlayer} aria-hidden="true" />}

      {/* The same element in every mode: only its class and position change. */}
      <div
        role={modal ? 'dialog' : 'complementary'}
        aria-modal={modal || undefined}
        aria-label={`Oynatıcı: ${current.name}`}
        style={inline ? (box ? { position: 'fixed', top: box.top, left: box.left, width: box.width, height: box.height } : { visibility: 'hidden' }) : undefined}
        className={
          inline
            ? 'fixed z-20 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl'
            : modal
              ? 'fixed left-1/2 top-1/2 z-50 max-h-[96dvh] w-[min(1100px,96vw,calc((100dvh_-_400px)*1.7778))] min-w-[min(96vw,360px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/15 bg-elev shadow-2xl'
              : 'fixed bottom-[4.5rem] right-3 z-40 w-64 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl sm:w-80 lg:bottom-5 lg:right-5'
        }
      >
        {player}

        {modal && (
          <div className="p-5 sm:p-6">
            <NowPlayingInfo channel={current} windowed />
          </div>
        )}

        {mode === 'mini' && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent p-2">
            <p className="min-w-0 flex-1 truncate pl-1 pt-1.5 text-xs font-medium text-white/90">{current.name}</p>
            <div className="pointer-events-auto flex shrink-0 gap-1">
              <button type="button" onClick={expandPlayer} aria-label="Büyüt" title="Büyüt" className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white/85 hover:text-white">
                <Maximize2 size={15} />
              </button>
              <button type="button" onClick={stopPlayer} aria-label="Yayını kapat" title="Yayını kapat" className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white/85 hover:text-danger">
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
