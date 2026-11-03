import { useMemo } from 'react'
import type { ArcHouseProfile } from '@/lib/arcHouse'
import type { Snapshot } from '@/lib/assistant'
import { useArcOnchain } from '@/hooks/useArcOnchain'
import { useGithub } from '@/hooks/useGithub'
import { githubErrorKey } from '@/lib/github'
import { useI18n } from '@/i18n/useI18n'

/** Combines live wallet, Arc House and GitHub data into one object for the assistant. */
export function useSnapshot(profile: ArcHouseProfile | null): Snapshot {
  const onchain = useArcOnchain()
  const github = useGithub()
  const { t } = useI18n()

  const usdc = onchain.usdcBalance?.toFixed(2)
  const githubError = github.isError ? t(githubErrorKey(github.error).key, githubErrorKey(github.error).params) : undefined

  return useMemo(
    () => ({
      walletConnected: onchain.isConnected,
      address: onchain.address,
      usdc,
      txCount: onchain.txCount,
      walletLoading: onchain.isLoading,
      profile,
      github: github.data,
      githubLoading: github.isLoading,
      githubError,
    }),
    [onchain.isConnected, onchain.address, usdc, onchain.txCount, onchain.isLoading, profile, github.data, github.isLoading, githubError],
  )
}
