import { useCallback, useEffect, useState } from 'react'
import { deletePlaylist, getChannels, listPlaylists, savePlaylist, updateMeta } from './db'
import { channelsFromText, channelsFromUrl, loadErrorText } from './load'
import { hashId } from './m3u'
import { loadLast } from './storage'
import type { Channel, PlaylistMeta, XtreamLogin } from './types'
import { xtreamPlaylistUrl } from './xtream'

export type AddInput =
  | { kind: 'url'; name: string; url: string }
  | { kind: 'xtream'; name: string; login: XtreamLogin }
  | { kind: 'file' | 'text'; name: string; text: string }

export interface PlaylistsState {
  playlists: PlaylistMeta[]
  active: PlaylistMeta | null
  channels: Channel[]
  /** True while a list is being downloaded or read. */
  busy: boolean
  /** True until the saved lists have been read from the browser. */
  starting: boolean
  error: string | null
  select: (id: string) => void
  add: (input: AddInput) => Promise<boolean>
  refresh: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  setProviderAddress: (id: string, address: string) => Promise<void>
  clearError: () => void
}

export function usePlaylists(): PlaylistsState {
  const [playlists, setPlaylists] = useState<PlaylistMeta[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [busy, setBusy] = useState(false)
  const [starting, setStarting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activate = useCallback(async (id: string) => {
    setActiveId(id)
    setChannels(await getChannels(id))
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await listPlaylists()
        if (cancelled) return
        setPlaylists(list)
        const last = loadLast()
        const first = list.find((p) => p.id === last?.playlistId) ?? list[0]
        if (first) {
          const ch = await getChannels(first.id)
          if (cancelled) return
          setActiveId(first.id)
          setChannels(ch)
        }
      } catch {
        if (!cancelled) setError('Kayıtlı listeler okunamadı. Tarayıcı depolaması kapalı olabilir.')
      } finally {
        if (!cancelled) setStarting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const add = useCallback(
    async (input: AddInput): Promise<boolean> => {
      setBusy(true)
      setError(null)
      try {
        let list: Channel[]
        let sourceUrl: string | undefined
        let xtream: XtreamLogin | undefined
        if (input.kind === 'url') {
          sourceUrl = input.url.trim()
          list = await channelsFromUrl(sourceUrl)
        } else if (input.kind === 'xtream') {
          xtream = input.login
          sourceUrl = xtreamPlaylistUrl(input.login)
          list = await channelsFromUrl(sourceUrl)
        } else {
          list = channelsFromText(input.text)
        }
        const meta: PlaylistMeta = {
          id: `${hashId(`${input.name}${Date.now()}`)}${Math.random().toString(36).slice(2, 6)}`,
          name: input.name.trim() || 'Yeni liste',
          kind: input.kind,
          sourceUrl,
          xtream,
          channelCount: list.length,
          updatedAt: Date.now(),
        }
        await savePlaylist(meta, list)
        setPlaylists(await listPlaylists())
        await activate(meta.id)
        return true
      } catch (e) {
        setError(loadErrorText(e))
        return false
      } finally {
        setBusy(false)
      }
    },
    [activate],
  )

  const refresh = useCallback(
    async (id: string) => {
      const meta = playlists.find((p) => p.id === id)
      if (!meta?.sourceUrl) {
        setError('Bu liste bir dosyadan eklendi. Güncellemek için dosyayı yeniden ekle.')
        return
      }
      setBusy(true)
      setError(null)
      try {
        const list = await channelsFromUrl(meta.sourceUrl)
        await savePlaylist({ ...meta, channelCount: list.length, updatedAt: Date.now() }, list)
        setPlaylists(await listPlaylists())
        if (id === activeId) setChannels(list)
      } catch (e) {
        setError(loadErrorText(e))
      } finally {
        setBusy(false)
      }
    },
    [playlists, activeId],
  )

  const remove = useCallback(
    async (id: string) => {
      await deletePlaylist(id)
      const list = await listPlaylists()
      setPlaylists(list)
      if (id === activeId) {
        const next = list[0]
        if (next) await activate(next.id)
        else {
          setActiveId(null)
          setChannels([])
        }
      }
    },
    [activeId, activate],
  )

  const setProviderAddress = useCallback(
    async (id: string, address: string) => {
      const meta = playlists.find((p) => p.id === id)
      if (!meta) return
      const next: PlaylistMeta = { ...meta, providerAddress: address || undefined }
      await updateMeta(next)
      setPlaylists((prev) => prev.map((p) => (p.id === id ? next : p)))
    },
    [playlists],
  )

  return {
    playlists,
    active: playlists.find((p) => p.id === activeId) ?? null,
    channels,
    busy,
    starting,
    error,
    select: (id) => void activate(id),
    add,
    refresh,
    remove,
    setProviderAddress,
    clearError: () => setError(null),
  }
}
