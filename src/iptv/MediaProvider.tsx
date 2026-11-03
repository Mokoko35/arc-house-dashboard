import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { MediaContext, type Media, type PlayerMode } from './context'
import { type Kind, type Partition, categoriesOf, groupOf, kindOf, partition } from './kinds'
import { DEFAULT_PREFS, type HiddenMap, type Prefs, hiddenKey, loadHidden, loadPrefs, saveHidden, savePrefs } from './prefs'
import { useRoute } from './router'
import { type Favorites, favKey, loadFavorites, saveFavorites } from './storage'
import type { Channel } from './types'
import { usePlaylists } from './usePlaylists'
import { useCatalog } from './useCatalog'
import { useEpg } from './useEpg'
import { isAdult } from './adult'
import { type CountryCount, NO_COUNTRY, countryOf } from './countries'
import { applyTheme } from './themes'
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
  const [countryPanel, setCountryPanel] = useState(false)
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

  const unfiltered = useMemo<Partition>(() => {
    const art = catalog.art
    const movie = base.movie.map((c) => {
      const id = vodIdOf(c.url)
      const extra = id ? art[id] : undefined
      return extra && (!c.logo || c.rating === undefined) ? { ...c, logo: c.logo ?? extra.icon, rating: c.rating ?? extra.rating } : c
    })
    // The portal's own series list replaces the flat list of episodes from the M3U file.
    const all: Partition = { live: base.live, movie, series: catalog.series ?? base.series }
    if (!prefs.adultFilter) return all
    // Filtered here, at the source, so counts, categories, search and favorites all agree.
    const clean = (list: Channel[]) => list.filter((c) => !isAdult(c))
    return { live: clean(all.live), movie: clean(all.movie), series: clean(all.series) }
  }, [base, catalog, prefs.adultFilter])

  // Every channel's country, and how many channels each country has. Counted before the country filter is applied,
  // so the list of countries does not shrink when you tick one.
  const { countryOptions, countryOf: codeOf } = useMemo(() => {
    const codes = new WeakMap<Channel, string>()
    const counts = new Map<string, number>()
    for (const list of [unfiltered.live, unfiltered.movie, unfiltered.series]) {
      for (const c of list) {
        const code = countryOf(c) ?? NO_COUNTRY
        codes.set(c, code)
        counts.set(code, (counts.get(code) ?? 0) + 1)
      }
    }
    let options: CountryCount[] = [...counts.entries()].map(([code, count]) => ({ code, count }))
    // Nothing to filter by unless at least one channel has a country.
    if (!options.some((o) => o.code !== NO_COUNTRY)) options = []
    options.sort((a, b) => (a.code === NO_COUNTRY ? 1 : b.code === NO_COUNTRY ? -1 : b.count - a.count || a.code.localeCompare(b.code)))
    return { countryOptions: options, countryOf: (c: Channel) => codes.get(c) ?? NO_COUNTRY }
  }, [unfiltered])

  const activeCountries = useMemo(() => prefs.countries.filter((code) => countryOptions.some((o) => o.code === code)), [prefs.countries, countryOptions])

  // The country filter works on the whole app, so counts, categories and search all follow it.
  const parts = useMemo<Partition>(() => {
    if (activeCountries.length === 0) return unfiltered
    const keep = (list: Channel[]) => list.filter((c) => activeCountries.includes(codeOf(c)))
    return { live: keep(unfiltered.live), movie: keep(unfiltered.movie), series: keep(unfiltered.series) }
  }, [unfiltered, activeCountries, codeOf])

  useEffect(() => {
    applyTheme(prefs.theme)
  }, [prefs.theme])

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
    current: playing && playing.playlistId === (active?.id ?? null) && !(prefs.adultFilter && isAdult(playing.channel)) ? playing.channel : null,
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
    countryOptions,
    activeCountries,
    setCountries: (countries) => updatePrefs({ countries }),
    countryPanel,
    setCountryPanel,
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
