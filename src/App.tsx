import { useEffect } from 'react'
import { ConnectKitButton } from 'connectkit'
import { Wallet } from 'lucide-react'
import { OnchainSection } from '@/components/OnchainSection'
import { ProfileSection } from '@/components/ProfileSection'
import { ImportSection } from '@/components/ImportSection'
import { GithubSection } from '@/components/GithubSection'
import { ChatWidget } from '@/components/ChatWidget'
import { useProfile } from '@/hooks/useProfile'
import { useSnapshot } from '@/hooks/useSnapshot'
import { LanguageToggle } from '@/components/LanguageToggle'
import { useI18n } from '@/i18n/useI18n'
import { useArcHouseSync } from '@/hooks/useArcHouseSync'
import { ArcHouseSyncCard } from '@/components/ArcHouseSyncCard'
import { LeaderboardCard } from '@/components/LeaderboardCard'

export default function App() {
  const { t } = useI18n()
  const { profile, setProfile } = useProfile()
  const snapshot = useSnapshot(profile)

  useEffect(() => {
    document.title = t('app.title')
  }, [t])
  const { outcome, leaderboard } = useArcHouseSync(setProfile)

  const goToImport = () => document.getElementById('sync')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pb-2 pt-5 sm:px-6 sm:pt-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[#0d1b2f]">
            <svg width="16" height="18" viewBox="0 0 20 22" fill="none" aria-hidden="true">
              <path
                d="M0 21.5C0.17 16.24 1.02 11.32 2.45 7.5C4.27 2.67 6.89 0 9.84 0C12.79 0 15.41 2.67 17.22 7.5C18.17 10.02 18.86 13.01 19.27 16.27C19.31 16.56 19.34 16.85 19.37 17.15C19.38 17.16 19.39 17.17 19.39 17.19C19.39 17.19 19.63 18.77 19.68 21.5H19.65C19.29 21.19 15.07 17.73 8.07 18.74C8.17 17.5 8.32 16.3 8.51 15.15C8.52 15.09 8.53 15.03 8.54 14.97C11.28 14.88 13.69 15.22 15.53 15.65C15.52 15.61 15.52 15.56 15.51 15.51C15.13 13.05 14.57 10.8 13.85 8.88C12.67 5.73 11.14 3.77 9.84 3.77C8.54 3.77 7 5.73 5.83 8.88C5.54 9.64 5.28 10.45 5.05 11.31C4.72 12.51 4.45 13.79 4.23 15.15C3.9 17.14 3.7 19.28 3.62 21.5H0Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="display truncate text-lg font-semibold leading-tight sm:text-xl">{t('app.title')}</h1>
            <p className="hidden text-xs text-[var(--subtle)] sm:block">{t('app.subtitle')}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle />
          <ConnectKitButton.Custom>
            {({ isConnected, show, truncatedAddress }) => (
              <button type="button" onClick={show} className={isConnected ? 'btn-ghost' : 'btn-primary'}>
                <Wallet size={16} />
                <span className="mono text-[13px]">{isConnected ? truncatedAddress : t('app.connect')}</span>
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-4 pb-40 pt-4 sm:gap-5 sm:px-6 sm:pb-32 md:grid-cols-2 md:gap-6 lg:px-8">
        <OnchainSection />
        <ProfileSection profile={profile} onImport={goToImport} />
        <div className="md:col-span-2">
          <GithubSection />
        </div>
        <div className="md:col-span-2">
          <ArcHouseSyncCard outcome={outcome} />
        </div>
        {leaderboard.length > 0 && (
          <div className="md:col-span-2">
            <LeaderboardCard entries={leaderboard} myHandle={profile?.handle} />
          </div>
        )}
        <div className="md:col-span-2">
          <ImportSection profile={profile} onChange={setProfile} />
        </div>
      </main>
      <ChatWidget snapshot={snapshot} />
    </div>
  )
}
