export interface Channel {
  /** Stable id derived from the stream URL. */
  id: string
  name: string
  url: string
  logo?: string
  group?: string
}

export type SourceKind = 'url' | 'xtream' | 'file' | 'text'

export interface XtreamLogin {
  server: string
  username: string
  password: string
}

export interface PlaylistMeta {
  id: string
  name: string
  kind: SourceKind
  /** M3U address, for kind "url" and "xtream" (so the list can be refreshed). */
  sourceUrl?: string
  xtream?: XtreamLogin
  channelCount: number
  updatedAt: number
  /** Optional USDC address of whoever provides the list, used by the tip button. */
  providerAddress?: string
}
