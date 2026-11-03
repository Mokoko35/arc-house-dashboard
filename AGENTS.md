# IPTV Player

> Built with Arc Studio

Project memory for future agents and humans.

## What this app does

An IPTV player (browser and Windows desktop app). Users add M3U / Xtream lists and browse Live TV, Movies and Series with a sidebar, card grids, a category manager, settings and, for Xtream portals, real movie and series details. It provides no content.

## Tech stack

- React 18, Vite, TypeScript, Tailwind CSS 3
- hls.js and mpegts.js for playback; lucide-react for icons
- IndexedDB (lists, channels, API cache) and localStorage (favorites, settings, hidden categories)
- Electron + electron-builder for the Windows app (`electron/main.mjs`)
- No wallet, blockchain or backend code

## Key files

- `src/main.tsx` - entry; keep the `installShareSync()` call
- `src/App.tsx` - shell: sidebar, pages, dialogs
- `src/iptv/` - the app: routing (`router.ts`, hash based), state (`MediaProvider.tsx`, `context.ts`, `useMedia.ts`), pages, cards, dialogs
- `src/iptv/PlayerOverlay.tsx` - the one player element; it is a large modal or a docked mini player (`playerMode`), so minimizing never restarts the stream. Pages must not render their own player.
- `src/iptv/m3u.ts`, `xtream.ts`, `xtreamApi.ts` - playlist parsing and Xtream `player_api.php` calls (cached)
- `src/iptv/CategoryRail.tsx` - category panel (`CategorySidebar`, full height, independent of the main menu) and `CategoryChips` for small screens; `BrowsePage.tsx` shows the sticky breadcrumb title
- `src/iptv/themes.ts` + `html[data-theme]` blocks in `src/index.css` - themes are sets of color channels (`--bg-rgb`, `--accent-rgb` ...); Tailwind colors `accent`, `danger`, `canvas`, `nav`, `rail`, `elev` read them. Use these, never hard-coded hex colors, and never `bg-[var(--x)]/NN` (Tailwind drops the opacity)
- `src/iptv/adult.ts`, `pin.ts`, `PinDialog.tsx` - adult filter (applied in `MediaProvider` so every view agrees) and the hashed 4-digit PIN
- `src/iptv/countries.ts`, `CountriesPage.tsx` - country detection (category first, then name) and the flag filter page (a main menu item above Settings); the filter itself is applied in `MediaProvider` so every page agrees
- `src/iptv/xmltv.ts`, `useEpg.ts`, `EpgPanel.tsx` - program guide: streaming XMLTV reader (keeps only programmes around now), cached per list in IndexedDB, Now/Next lookup
- `src/iptv/load.ts`, `LoadProgressView.tsx`, `ActivityPill.tsx`, `Skeletons.tsx` - streamed list download with live counts, and loading UI
- `src/iptv/Splash.tsx` - launch splash
- `src/iptv/db.ts`, `storage.ts`, `prefs.ts` - persistence
- `src/index.css` - tokens and the `.theme-media` orange-on-dark theme
- `src/tracing.ts`, `src/console-capture.ts`, `src/lib/share.ts` - Arc Studio platform helpers; leave as they are

## Notes

- Routing uses `#/...` so it also works from `file://` in the desktop app.
- Browsers block most IPTV servers (CORS) and `http://` streams on `https://` pages; the desktop app removes those limits.
- Movie and series details use the Xtream API, so they need a portal login (or a `get.php` address).

## To run

```bash
bun install
bun run dev      # http://localhost:5173
bun run check    # lint and typecheck
bun run build
```
