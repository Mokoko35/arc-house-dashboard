# IPTV Player

An IPTV player for Windows (desktop app) and the browser. Add playlists from an M3U address, an Xtream-style portal login, a file or pasted text, then search, group, favorite and watch channels. The app provides no channels or content; it only plays lists you add. An optional USDC tip button lets you send a thank-you to whoever provides a list.

Built with [Arc Studio](https://studio.arc.io)

## Pages

- **IPTV Player** (`/`): the player.
- **Liquidation Levels** (`/liquidation.html`): manually entered BTC and ETH liquidation clusters tracked against the live CoinGecko price.
- **Coin Heatmap** (`/heatmap.html`): top 20 coins by market cap, colored by 24h change.
- **Arc House Dashboard** (`/dashboard.html`): wallet, Arc House profile and GitHub dashboard (described below).

## Windows desktop app

A browser cannot read most IPTV servers (they send no CORS headers) and blocks `http://` streams on `https://` pages. The desktop app has neither limit.

Prerequisites: Windows, [Node.js](https://nodejs.org) 20 or newer (or Bun).

```
npm install
npm run desktop:build
```

The installer is written to `release/` (an `IPTV Player Setup ... .exe`). To try it without building an installer, run `npm run dev` in one terminal and `npm run desktop:dev` in another. With Bun, use `bun install` and `bun run ...` instead.

The desktop build has not been tested on Windows by Arc Studio.

## Playlists

- Lists and channels are stored in the browser's IndexedDB on your device. Favorites and the last channel are stored in local storage.
- HLS (`.m3u8`) and MPEG-TS (`.ts`) streams play through hls.js and mpegts.js. Codec support depends on the browser or the desktop app.

## Arc House Dashboard

A personal dashboard for Arc House community members. It shows your Arc Testnet wallet (USDC balance, transaction count, address) next to your Arc House profile (points, tier, badges), which you import or edit by hand. The interface is available in Turkish (default) and English, switchable from the header. It also shows GitHub stats (repos, stars, followers, recent activity) for the user Mokoko35 from the public GitHub API, and a chat assistant in the bottom right with a Daily Briefing that summarizes wallet, Arc House and GitHub data.

Built with [Arc Studio](https://studio.arc.io)

## Tech stack

React, TypeScript, Vite, Tailwind CSS, wagmi, viem, ConnectKit. Translations live in `src/i18n/` (`en.ts`, `tr.ts`); add a key to both files to add new text.

## Development

Prerequisites: [Bun](https://bun.sh).

```
bun install
bun run dev
```

Other scripts: `bun run build`, `bun run check` (lint and typecheck).

### Environment variables

- `VITE_WALLETCONNECT_PROJECT_ID`: your WalletConnect (Reown) project ID, from https://cloud.reown.com. Enables connecting mobile wallets such as MetaMask and Trust Wallet. Without it, only browser extensions and Coinbase Wallet are offered. Add your site's domain to the project's allowed domains.

### Arc House data

Arc House has no public API, and its data endpoint only answers signed-in members on community.arc.io. The dashboard offers a one-click bookmark ("Sync Arc House") that runs on community.arc.io with your own login and sends your points, tier and badges back to the dashboard. Manual JSON import and manual editing remain as a fallback. Data is stored only in your browser.
