import { AddPlaylistDialog } from './iptv/AddPlaylistDialog'
import { ActivityPill } from './iptv/ActivityPill'
import { BrowsePage } from './iptv/BrowsePage'
import { DetailDialog } from './iptv/DetailDialog'
import { HomePage } from './iptv/HomePage'
import { ManageCategoriesModal } from './iptv/ManageCategoriesModal'
import { PlayerOverlay } from './iptv/PlayerOverlay'
import { Splash } from './iptv/Splash'
import { MediaProvider } from './iptv/MediaProvider'
import { SettingsPage } from './iptv/SettingsPage'
import { Brand, Sidebar } from './iptv/Sidebar'
import { useMedia } from './iptv/useMedia'

function Shell() {
  const { route, lists, adding, closeAdd, prefs } = useMedia()

  return (
    <div className="theme-media">
      <Sidebar />

      <div className={prefs.sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-60'}>
        <header className="flex items-center justify-between px-4 pt-4 lg:hidden">
          <Brand />
        </header>

        <main className="mx-auto w-full max-w-[1920px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
          {lists.error && !adding && (
            <p role="alert" className="mb-4 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--ink-2)]">
              {lists.error}
            </p>
          )}
          {route.page === 'home' && <HomePage />}
          {route.page === 'live' && <BrowsePage kind="live" />}
          {route.page === 'movies' && <BrowsePage kind="movie" />}
          {route.page === 'series' && <BrowsePage kind="series" />}
          {route.page === 'settings' && <SettingsPage />}
        </main>
      </div>

      {adding && <AddPlaylistDialog busy={lists.busy} progress={lists.progress} error={lists.error} onClose={closeAdd} onAdd={lists.add} />}
      <ManageCategoriesModal />
      <DetailDialog />
      <PlayerOverlay />
      <ActivityPill />
      <Splash />
    </div>
  )
}

export default function App() {
  return (
    <MediaProvider>
      <Shell />
    </MediaProvider>
  )
}
