# IPTV Player

A media-center style IPTV player for Windows and the browser. Add your own playlists from an M3U address, an Xtream-style portal login, a file or pasted text, then browse live TV, movies and series in a clean dark interface. The app provides no channels or content; it only plays lists you add.

Built with [Arc Studio](https://studio.arc.io)

## Features

- **Add lists several ways:** M3U address, portal login (server, username, password), `.m3u` / `.m3u8` file, or pasted text. Keep several lists and switch between them.
- **Live TV, Movies and Series** in separate sections: full-width card grids with their own full-height category panel beside them (All, Favorites, then each category), a title that shows where you are (for example `Movies > Action`), search and favorites. The category panel works the same whether the main menu is open or collapsed.
- **Player window and mini player:** clicking a channel, movie or episode opens a large player window. Close it and the stream keeps playing in a small floating player in the corner while you keep browsing.
- **Real movie and series details** from Xtream portals: poster, synopsis, cast, director, rating, trailer link, and seasons with episodes.
- **Category manager:** show or hide categories per section.
- **Adult content filter:** categories and channels tagged XXX, Adult, +18 and similar are hidden by default. Turning the filter off or on, and changing the PIN, asks for a 4-digit PIN that you set (stored on the device as a salted hash).
- **Country filter:** on Live TV, tick one or more countries (with flags) to show only their channels. The country is read from names such as `TR: TRT 1`, `[DE] ZDF` or `US | CNN`.
- **Themes:** four color presets (Default Dark, Neon, Navy, Forest) that change the accent color, background shades and scrollbar color. Your choice is saved.
- **Program guide (EPG):** the Live TV cards and the player window show what is on now and next, with a progress bar. It reads the portal's `xmltv.php` guide, or any XMLTV address you set in Settings (`.xml` and `.xml.gz`).
- **Clear loading feedback:** adding a list shows a live progress screen with the number of channels, movies and series found as it downloads; background loading shows a status pill, and grids show placeholders while they fill.
- **Collapsible menu:** a hamburger button shrinks the left menu to icons so the grids get more room.
- **Launch screen:** a short animated splash with the logo when the app opens.
- **Dark, thin scrollbars** that match the theme.
- **Settings:** list management, card size, logos, autoplay and program guide options.
- **Playback** of HLS (`.m3u8`) and MPEG-TS (`.ts`) streams, plus common video files.
- **Private by design:** lists, favorites and settings stay on your device.

## Windows desktop app

A browser cannot read most IPTV servers (they do not allow it) and blocks `http://` streams on `https://` pages. The desktop app has neither limit, so use it for the best results.

Prerequisites: Windows and [Node.js](https://nodejs.org) 20 or newer.

```
npm install
npm run desktop:build
```

The installer is written to the `release/` folder (an `IPTV Player Setup ... .exe`). To try the desktop app without building an installer, run `npm run dev` in one terminal and `npm run desktop:dev` in another.

The desktop build has not been tested on Windows by Arc Studio.

## Development

Prerequisites: [Node.js](https://nodejs.org) 20 or newer, or [Bun](https://bun.sh).

```
npm install
npm run dev
```

Open the address Vite prints. Other scripts:

- `npm run build`: production build into `dist/`
- `npm run check`: lint and type check
- `npm run desktop:dev`: desktop app against the dev server
- `npm run desktop:build`: Windows installer

With Bun, use `bun install` and `bun run ...` instead.

### Environment variables

None.

## Notes

- Flag emoji do not draw on Windows by themselves, so the app bundles a small flags-only font (Twemoji Country Flags, a subset of Twemoji by Twitter, CC-BY 4.0, packaged by country-flag-emoji-polyfill, MIT).

- The program guide is matched to channels by the list's `tvg-id`, or by channel name when there is none. Lists added before this feature have no `tvg-id` saved, so update them once. Large guides can take a few minutes to download; only the programmes around the current time are kept on the device.
- Movie and series details need a list added as a portal login or as a `get.php` address. Plain M3U lists play straight from the grid.
- Portal responses are cached on your device for up to 12 hours (details for up to 7 days).
- Lists and posters are stored in the browser's IndexedDB and local storage.
