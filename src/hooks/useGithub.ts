import { useQuery } from '@tanstack/react-query'
import { GITHUB_USERNAME, fetchGithubStats } from '@/lib/github'

export function useGithub() {
  return useQuery({
    queryKey: ['github-stats', GITHUB_USERNAME],
    queryFn: fetchGithubStats,
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
