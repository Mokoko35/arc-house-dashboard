import { useEffect, useState } from 'react'
import { type ArcHouseProfile, type LeaderboardEntry, extractLeaderboard, extractProfile } from '@/lib/arcHouse'
import {
  ARC_HOUSE_ORIGIN,
  type SyncReport,
  buildReport,
  isSyncMessage,
  successfulData,
} from '@/lib/arcHouseSync'

export type SyncOutcome = { kind: 'idle' } | { kind: 'ok'; report: SyncReport } | { kind: 'empty'; report: SyncReport }

/**
 * Receives data from the bookmarklet running on community.arc.io. When this page was opened by it
 * (window.opener), it announces itself and then accepts one message from that exact origin and window.
 */
export function useArcHouseSync(onProfile: (p: ArcHouseProfile) => void) {
  const [outcome, setOutcome] = useState<SyncOutcome>({ kind: 'idle' })
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    const opener = window.opener as Window | null
    if (!opener || opener === window) return

    let received = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let pings = 0

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== ARC_HOUSE_ORIGIN || e.source !== opener || !isSyncMessage(e.data)) return
      received = true
      const msg = e.data
      const report = buildReport(msg)
      const profile = extractProfile(successfulData(msg))
      const board = extractLeaderboard(successfulData(msg, ['leaderboard']))
      setLeaderboard(board)
      if (profile) {
        onProfile(profile)
        setOutcome({ kind: 'ok', report })
      } else {
        setOutcome({ kind: 'empty', report })
      }
    }

    const ping = () => {
      if (received) return
      opener.postMessage({ type: 'arc-house-ready' }, ARC_HOUSE_ORIGIN)
      pings++
      if (pings < 60) timer = setTimeout(ping, 500)
    }

    window.addEventListener('message', onMessage)
    ping()
    return () => {
      window.removeEventListener('message', onMessage)
      if (timer) clearTimeout(timer)
    }
  }, [onProfile])

  return { outcome, leaderboard }
}
