import { Loader2 } from 'lucide-react'
import { AddPlaylistDialog } from './AddPlaylistDialog'
import { BrowsePage } from './BrowsePage'
import { DetailDialog } from './DetailDialog'
import { HomePage } from './HomePage'
import { ManageCategoriesModal } from './ManageCategoriesModal'
import { MediaProvider } from './MediaProvider'
import { SettingsPage } from './SettingsPage'
import { Brand, Sidebar } from './Sidebar'
import { useMedia } from './useMedia'

function Shell() {
  const { route, lists, adding, closeAdd } = useMedia()

  return (
    <div className="theme-media">
      <Sidebar />

      <div className="lg:pl-60">
        <header className="flex items-center justify-between px-4 pt-4 lg:hidden">
          <Brand />
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
          {lists.error && !adding && (
            <p role="alert" className="mb-4 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--ink-2)]">
              {lists.error}
            </p>
          )}
          {lists.starting ? (
            <div className="grid place-items-center py-24 text-[var(--subtle)]">
              <Loader2 className="animate-spin" aria-label="Yükleniyor" />
            </div>
          ) : (
            <>
              {route.page === 'home' && <HomePage />}
              {route.page === 'live' && <BrowsePage kind="live" />}
              {route.page === 'movies' && <BrowsePage kind="movie" />}
              {route.page === 'series' && <BrowsePage kind="series" />}
              {route.page === 'settings' && <SettingsPage />}
            </>
          )}
        </main>
      </div>

      {adding && <AddPlaylistDialog busy={lists.busy} error={lists.error} onClose={closeAdd} onAdd={lists.add} />}
      <ManageCategoriesModal />
      <DetailDialog />
    </div>
  )
}

export default function IptvApp() {
  return (
    <MediaProvider>
      <Shell />
    </MediaProvider>
  )
}
