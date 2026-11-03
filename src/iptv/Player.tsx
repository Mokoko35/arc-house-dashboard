import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Tv } from 'lucide-react'
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

function PlayerCore({ channel, autoplay, className }: { channel: Channel; autoplay: boolean; className: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const blocked = mixedContent(channel.url)

  useEffect(() => {
    const video = videoRef.current
    if (!video || blocked) return
    let disposed = false
    let teardown: (() => void) | undefined

    const fail = (message: string) => {
      if (!disposed) {
        setError(message)
        setLoading(false)
      }
    }
    const onPlaying = () => {
      setLoading(false)
      setError(null)
    }
    const onWaiting = () => setLoading(true)
    const onNativeError = () => fail('Bu yayın oynatılamadı. Adres geçersiz olabilir veya kodek tarayıcıda desteklenmiyor.')
    video.addEventListener('playing', onPlaying)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('error', onNativeError)

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
      teardown?.()
      video.removeAttribute('src')
      video.load()
    }
  }, [channel.url, blocked, autoplay])

  const message = blocked
    ? 'Bu yayın http:// ile başlıyor. https sayfalarda tarayıcı bunu engeller. Windows masaüstü uygulamasında veya http:// ile açılan sayfada oynar.'
    : error

  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-black ${className}`}>
      <video ref={videoRef} controls playsInline className="h-full w-full" />
      {loading && !message && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="animate-spin text-white/70" size={36} aria-label="Yükleniyor" />
        </div>
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

export function Player({ channel, autoplay = true, className = 'rounded-2xl border border-white/10' }: { channel: Channel | null; autoplay?: boolean; className?: string }) {
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
  // The key remounts the player for each channel, which resets loading and error state.
  return <PlayerCore key={channel.id} channel={channel} autoplay={autoplay} className={className} />
}
