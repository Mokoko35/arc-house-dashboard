import { createContext } from 'react'
import type { Category, Kind, Partition } from './kinds'
import type { Prefs } from './prefs'
import type { useRoute } from './router'
import type { Favorites } from './storage'
import type { Channel } from './types'
import type { PlaylistsState } from './usePlaylists'
import type { Catalog } from './useCatalog'
import type { XtreamLogin } from './types'

export interface Media {
  lists: PlaylistsState
  /** Portal login for the active list, when it is an Xtream-style portal. Used for film and series details. */
  xtream: XtreamLogin | null
  catalog: Catalog
  /** Film or series whose detail window is open. */
  detail: Channel | null
  /** Opens the detail window for films and portal series, and plays everything else straight away. */
  openItem: (channel: Channel) => void
  closeDetail: () => void
  /** All channels of the active list, split into live, movies and series. */
  parts: Partition
  /** The same, without channels in categories the user hid. */
  visible: Partition
  categories: (kind: Kind) => Category[]
  hiddenFor: (kind: Kind) => Set<string>
  setHiddenFor: (kind: Kind, names: string[]) => void
  favorites: Favorites
  isFavorite: (channel: Channel) => boolean
  toggleFavorite: (channel: Channel) => void
  current: Channel | null
  play: (channel: Channel) => void
  prefs: Prefs
  updatePrefs: (patch: Partial<Prefs>) => void
  route: ReturnType<typeof useRoute>
  adding: boolean
  openAdd: () => void
  closeAdd: () => void
  managing: Kind | null
  openManage: (kind: Kind) => void
  closeManage: () => void
}

export const MediaContext = createContext<Media | null>(null)
