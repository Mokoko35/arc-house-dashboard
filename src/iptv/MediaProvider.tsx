import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { MediaContext, type Media, type PlayerMode } from './context'
import { type Kind, type Partition, categoriesOf, groupOf, kindOf, partition } from './kinds'
import { DEFAULT_PREFS, type HiddenMap, type Prefs, hiddenKey, loadHidden, loadPrefs, saveHidden, savePrefs } from './prefs'
import { useRoute } from './router'
import { type Favorites, favKey, loadFavorites, saveFavorites } from './storage'
import type { Channel } from './types'
import { usePlaylists } from './usePlaylists'
import { useCatalog } from './useCatalog'
import { useEpg } from './useEpg'
import { loginFromPlaylistUrl, loginFromStreamUrl, vodIdOf } from './xtreamApi'
import type { XtreamLogin } from './types'

const NONE = new Set<string>()

export function MediaProvider({ children }: { children: ReactNode }) {
  const route = useRoute()
  const lists = usePlaylists()
  const { active, channels } = lists

  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [hidden, setHidden] = useState<HiddenMap>(loadHidden)
  const [favorites, setFavorites] = useState<Favorites>(loadFavorites)
  const [playerMode, setPlayerMode] = useState<PlayerMode>('closed')
  const [playing, setPlaying] = useState<{ playlistId: string | null; channel: Channel } | null>(null)
  const [detail, setDetail] = useState<Channel | null>(null)
  const [adding, setAdding] = useState(false)
  const [managing, setManaging] = useState<Kind | null>(null)

  const base = useMemo(() => partition(channels), [channels])

  // Films and series have richer data on Xtream portals. The login comes from how the list was added,
  // or from the first film or series address in it.
  const xtream = useMemo<XtreamLogin | null>(() => {
    if (!active) return null
    return (
      active.xtream ??
      loginFromPlaylistUrl(active.sourceUrl) ??
      loginFromStreamUrl(base.movie[0]?.url) ??
      loginFromStreamUrl(base.series[0]?.url)
    )
  }, [active, base])
  const catalog = useCatalog(xtream, active?.id ?? null)
  const epg = useEpg(xtream, active?.id ?? null, prefs)

  const parts = useMemo<Partition>(() => {
    const art = catalog.art
    const movie = base.movie.map((c) => {
      const id = vodIdOf(c.url)
      const extra = id ? art[id] : undefined
      return extra && (!c.logo || c.rating === undefined) ? { ...c, logo: c.logo ?? extra.icon, rating: c.rating ?? extra.rating } : c
    })
    // The portal's own series list replaces the flat list of episodes from the M3U file.
    return { live: base.live, movie, series: catalog.series ?? base.series }
  }, [base, catalog])

  const hiddenFor = useCallback(
    (kind: Kind): Set<string> => {
      const names = active ? hidden[hiddenKey(active.id, kind)] : undefined
      return names && names.length > 0 ? new Set(names) : NONE
    },
    [active, hidden],
  )

  const visible = useMemo(() => {
    const filter = (kind: Kind) => {
      const set = hiddenFor(kind)
      return set.size === 0 ? parts[kind] : parts[kind].filter((c) => !set.has(groupOf(c)))
    }
    return { live: filter('live'), movie: filter('movie'), series: filter('series') }
  }, [parts, hiddenFor])

  const setHiddenFor = useCallback(
    (kind: Kind, names: string[]) => {
      if (!active) return
      setHidden((prev) => {
        const next = { ...prev, [hiddenKey(active.id, kind)]: names }
        saveHidden(next)
        return next
      })
    },
    [active],
  )

  const toggleFavorite = useCallback(
    (c: Channel) => {
      if (!active) return
      const key = favKey(active.id, c.id)
      setFavorites((prev) => {
        const next = { ...prev }
        if (next[key]) delete next[key]
        else next[key] = true
        saveFavorites(next)
        return next
      })
    },
    [active],
  )

  const play = useCallback(
    (c: Channel) => {
      setPlaying({ playlistId: active?.id ?? null, channel: c })
      setPlayerMode('modal')
    },
    [active],
  )

  const openItem = useCallback(
    (c: Channel) => {
      const kind = kindOf(c)
      if (kind !== 'live' && xtream && (c.seriesId || kind === 'movie')) setDetail(c)
      else play(c)
    },
    [xtream, play],
  )

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...DEFAULT_PREFS, ...prev, ...patch }
      savePrefs(next)
      return next
    })
  }, [])

  const value: Media = {
    lists,
    parts,
    visible,
    categories: (kind) => categoriesOf(parts[kind]),
    hiddenFor,
    setHiddenFor,
    favorites,
    isFavorite: (c) => Boolean(active && favorites[favKey(active.id, c.id)]),
    toggleFavorite,
    xtream,
    catalog,
    epg,
    detail,
    openItem,
    closeDetail: () => setDetail(null),
    current: playing && playing.playlistId === (active?.id ?? null) ? playing.channel : null,
    playerMode,
    minimizePlayer: () => setPlayerMode((m) => (m === 'modal' ? 'mini' : m)),
    expandPlayer: () => setPlayerMode((m) => (m === 'mini' ? 'modal' : m)),
    stopPlayer: () => {
      setPlaying(null)
      setPlayerMode('closed')
    },
    play,
    prefs,
    updatePrefs,
    route,
    adding,
    openAdd: () => setAdding(true),
    closeAdd: () => {
      setAdding(false)
      lists.clearError()
    },
    managing,
    openManage: setManaging,
    closeManage: () => setManaging(null),
  }

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>
}
