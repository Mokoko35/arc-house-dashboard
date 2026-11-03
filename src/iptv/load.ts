import { looksLikeM3U, parseM3U } from './m3u'
import type { Channel } from './types'

export type LoadErrorCode = 'blocked' | 'http' | 'timeout' | 'notM3u' | 'empty'

export class LoadError extends Error {
  readonly code: LoadErrorCode
  readonly status?: number
  constructor(code: LoadErrorCode, status?: number) {
    super(`Load error: ${code}`)
    this.code = code
    this.status = status
  }
}

export function loadErrorText(error: unknown): string {
  if (error instanceof LoadError) {
    switch (error.code) {
      case 'blocked':
        return 'Tarayıcı bu adrese erişemedi. Sunucu çoğu zaman tarayıcılara izin vermez (CORS) veya adres http:// ile başlıyor. Windows masaüstü uygulamasında bu sorun olmaz; tarayıcıda ise listeyi indirip "Dosya" sekmesinden yükleyebilirsin.'
      case 'http':
        return `Sunucu hata döndürdü (${error.status ?? '?'}). Adresi, kullanıcı adını ve şifreyi kontrol et.`
      case 'timeout':
        return 'Sunucu zamanında yanıt vermedi. Biraz sonra tekrar dene.'
      case 'notM3u':
        return 'Yanıt bir M3U listesi gibi görünmüyor. Adres veya giriş bilgileri yanlış olabilir.'
      case 'empty':
        return 'Listede oynatılabilir kanal bulunamadı.'
    }
  }
  return 'Liste yüklenemedi.'
}

export function channelsFromText(text: string): Channel[] {
  if (!looksLikeM3U(text)) throw new LoadError('notM3u')
  const channels = parseM3U(text)
  if (channels.length === 0) throw new LoadError('empty')
  return channels
}

export async function channelsFromUrl(url: string, timeoutMs = 45_000): Promise<Channel[]> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    let res: Response
    try {
      res = await fetch(url, { signal: ctl.signal })
    } catch {
      throw new LoadError(ctl.signal.aborted ? 'timeout' : 'blocked')
    }
    if (!res.ok) throw new LoadError('http', res.status)
    return channelsFromText(await res.text())
  } finally {
    clearTimeout(timer)
  }
}
