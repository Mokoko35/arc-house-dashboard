# IPTV Player

A media-center style IPTV player for Windows and the browser. Add your own playlists from an M3U address, an Xtream-style portal login, a file or pasted text, then browse live TV, movies and series in a clean dark interface. The app provides no channels or content; it only plays lists you add.

Built with [Arc Studio](https://studio.arc.io)

## Features

- **Add lists several ways:** M3U address, portal login (server, username, password), `.m3u` / `.m3u8` file, or pasted text. Keep several lists and switch between them.
- **Live TV, Movies and Series** in separate sections: full-width card grids with a category list beside them, search and favorites.
- **Player window and mini player:** clicking a channel, movie or episode opens a large player window. Close it and the stream keeps playing in a small floating player in the corner while you keep browsing.
- **Real movie and series details** from Xtream portals: poster, synopsis, cast, director, rating, trailer link, and seasons with episodes.
- **Category manager:** show or hide categories per section.
- **Settings:** list management, card size, logos, autoplay, and EPG address (saved for a future release).
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

- Movie and series details need a list added as a portal login or as a `get.php` address. Plain M3U lists play straight from the grid.
- Portal responses are cached on your device for up to 12 hours (details for up to 7 days).
- Lists and posters are stored in the browser's IndexedDB and local storage.
