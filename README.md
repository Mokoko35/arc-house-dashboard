# Arc House Dashboard

A personal dashboard for Arc House community members. It shows your Arc Testnet wallet (USDC balance, transaction count, address) next to your Arc House profile (points, tier, badges), which you import or edit by hand. It also shows GitHub stats (repos, stars, followers, recent activity) for the user Mokoko35 from the public GitHub API, and a chat assistant in the bottom right with a Daily Briefing that summarizes wallet, Arc House and GitHub data.

Built with [Arc Studio](https://studio.arc.io)

## Tech stack

React, TypeScript, Vite, Tailwind CSS, wagmi, viem, ConnectKit.

## Development

Prerequisites: [Bun](https://bun.sh).

```
bun install
bun run dev
```

Other scripts: `bun run build`, `bun run check` (lint and typecheck).

### Environment variables

None.

### Arc House data

Arc House has no public API. Paste your exported JSON (keys like `points`, `tier`, `badges`) or edit values manually. The data is stored only in your browser.
