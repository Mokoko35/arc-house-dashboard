import { Tv } from 'lucide-react'
import { NowPlayingInfo } from './NowPlayingInfo'
import { useMedia } from './useMedia'

/**
 * The fourth column: a fixed box for the player, and the title and program guide under it.
 * The player itself is drawn over the box by PlayerOverlay, so it keeps playing when you move to another page.
 */
export function InlinePlayerColumn() {
  const { current, setInlineSlot } = useMedia()
  return (
    <section aria-label="Oynatıcı" className="hidden min-w-0 flex-1 flex-col lg:flex lg:h-dvh">
      <div className="shrink-0 p-5 pb-0">
        <div ref={setInlineSlot} className="grid aspect-video w-full place-items-center rounded-2xl border border-dashed border-white/15 bg-black/40 p-6 text-center">
          <div>
            <Tv className="mx-auto text-[var(--subtle)]" size={34} aria-hidden="true" />
            <p className="mt-3 text-sm text-[var(--subtle)]">İzlemek için soldaki listeden bir kanal seç.</p>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">{current && <NowPlayingInfo channel={current} windowed={false} />}</div>
    </section>
  )
}
