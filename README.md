# WC 2026 · Third-Place Tracker

A live table that ranks the current **third-placed teams** from each of the 12 FIFA World Cup 2026 groups and shows **which Round of 32 match** each would fill — updating as group-stage matches finish.

**Live:** https://wc26-3rd-place.main-c07.workers.dev

## What it does

- Ranks the 12 groups' third-placed teams and highlights the **eight best** that advance.
- Maps those eight to their **Round of 32 slots** using the official pre-set allocation table (FIFA WC2026 Regulations, Annex C).
- Recomputes on every refresh and auto-refreshes every 5 minutes.

## Ranking logic (FIFA Regulations, Article 13)

- **Within a group**, level teams are separated by head-to-head first (points → goal difference → goals among the tied teams), then overall goal difference and goals. Standings are computed from match results so head-to-head is applied correctly.
- **Across groups**, the third-placed teams are ranked by points → goal difference → goals scored. (No drawing of lots in 2026.)

## How it's built

- **Frontend:** Vite + React 19 + Tailwind CSS v4.
- **Backend:** a single **Cloudflare Worker** that serves the built static site _and_ a same-origin `/api/standings` proxy to [football-data.org](https://www.football-data.org/). Same origin means no CORS, and the API key stays a server-side Worker secret.
- A 45-second edge cache keeps upstream calls within football-data.org's rate limit no matter how many visitors are connected.

## Local development

```bash
npm install
echo "FD_KEY=your_football_data_org_token" > .dev.vars   # not committed
npm run dev        # Vite dev server (UI only)
npm run cf-dev     # Wrangler dev (Worker + live proxy)
```

## Deploy

Pushes to `main` are automatically built and deployed by **Cloudflare Workers Builds** (`npm run build` → `npx wrangler deploy`). To deploy manually:

```bash
npm run deploy     # vite build && wrangler deploy
```

The `FD_KEY` secret is configured on the Worker (`wrangler secret put FD_KEY`) and persists across deploys.

---

Data courtesy of [football-data.org](https://www.football-data.org/). Personal project; not affiliated with FIFA.
