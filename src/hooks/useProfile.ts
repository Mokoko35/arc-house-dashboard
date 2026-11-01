import { useCallback, useState } from 'react'
import { type ArcHouseProfile, loadProfile, saveProfile } from '@/lib/arcHouse'

/** Arc House profile held in React state and mirrored to localStorage. null = nothing imported yet. */
export function useProfile() {
  const [profile, setProfileState] = useState<ArcHouseProfile | null>(() => loadProfile())

  const setProfile = useCallback((next: ArcHouseProfile | null) => {
    setProfileState(next)
    saveProfile(next)
  }, [])

  return { profile, setProfile }
}
