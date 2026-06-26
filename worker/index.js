/**
 * Cloudflare Worker — serves the built React app (static assets) AND a
 * football-data.org-backed standings API from a single origin.
 *
 *   GET /api/standings  -> { updated, source, finished, teams:[ {g,t,n,w,d,l,gf,ga,pos} ] }
 *   everything else      -> static assets (the Vite build in ./dist)
 *
 * Same origin => no CORS, and the API key (FD_KEY secret) never reaches the browser.
 *
 * WHY we compute from /matches instead of /standings:
 *   For 2026 FIFA switched the WITHIN-group tie-break to head-to-head FIRST
 *   (Regulations Art. 13, Step 1: points/GD/goals among the level teams), only
 *   then overall GD/goals (Step 2). football-data.org's standings `position`
 *   sorts by points->GD->goals and does NOT apply head-to-head, so it can name
 *   the wrong 3rd-placed team on a points tie. We therefore derive each group's
 *   order ourselves from finished match results and expose a FIFA-correct `pos`.
 *
 * Secret:
 *   prod   ->  wrangler secret put FD_KEY
 *   local  ->  put `FD_KEY=...` in .dev.vars (gitignored), then `npm run cf-dev`
 */

const FD_MATCHES = "https://api.football-data.org/v4/competitions/WC/matches?stage=GROUP_STAGE";

// football-data.org's tla -> the FIFA code the UI's team table uses (only two differ).
const ALIAS = { ALG: "DZA", HAI: "HTI" };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/standings") return handleStandings(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
};

async function handleStandings(request, env, ctx) {
  if (request.method !== "GET") return json({ error: "method not allowed" }, 405);

  const key = env.FD_KEY || "";
  if (!key) return json({ error: "FD_KEY secret is not configured on this worker" }, 500);

  // 45s edge cache keeps us well under football-data.org's 10 req/min free tier.
  const cache = caches.default;
  const cacheKey = new Request("https://wc26-fd-proxy.internal/standings");
  const hit = await cache.match(cacheKey);
  if (hit) return new Response(await hit.text(), { headers: jsonHeaders("HIT") });

  let res;
  try {
    res = await fetch(FD_MATCHES, { headers: { "X-Auth-Token": key } });
  } catch (e) {
    return json({ error: "upstream fetch failed", detail: String(e) }, 502);
  }
  if (!res.ok) {
    return json({ error: `football-data ${res.status}`, detail: (await res.text()).slice(0, 300) }, 502);
  }

  const data = await res.json();
  const matches = data.matches || [];
  const teams = computeStandings(matches);
  if (teams.length < 24) return json({ error: "insufficient data from upstream", teams: teams.length }, 502);

  const payload = JSON.stringify({
    updated: new Date().toISOString(),                       // moment of this real upstream pull
    source: "football-data.org",
    finished: matches.filter((m) => m.status === "FINISHED").length,
    live: liveMatches(matches),
    teams,
  });

  ctx.waitUntil(cache.put(cacheKey, new Response(payload, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=45" },
  })));

  return new Response(payload, { headers: jsonHeaders("MISS") });
}

// Currently-running group-stage games (status IN_PLAY or PAUSED), with the live
// running score. The /matches feed is already group-stage-only (see FD_MATCHES).
function liveMatches(matches) {
  const out = [];
  for (const m of matches) {
    if (m.status !== "IN_PLAY" && m.status !== "PAUSED") continue;
    if (!m.group) continue;
    const g = String(m.group).replace(/^GROUP_/, "").trim();
    if (!/^[A-L]$/.test(g)) continue;
    const ft = (m.score && m.score.fullTime) || {};
    out.push({
      g,
      h: code(m.homeTeam), a: code(m.awayTeam),
      hn: teamName(m.homeTeam), an: teamName(m.awayTeam),
      hs: ft.home == null ? 0 : ft.home,
      as: ft.away == null ? 0 : ft.away,
      st: m.status,                                          // IN_PLAY | PAUSED (half-time)
    });
  }
  return out;
}

// ===== FIFA Art. 13 group standings, derived from finished match results =====

function computeStandings(matches) {
  const groups = {}; // "A" -> { teams: {tla:{...}}, played: [{H,A,hs,as}] }

  for (const m of matches) {
    if (m.status !== "FINISHED" || !m.group) continue;
    const ft = m.score && m.score.fullTime;
    if (!ft || ft.home == null || ft.away == null) continue;
    const g = String(m.group).replace(/^GROUP_/, "").trim();
    if (!/^[A-L]$/.test(g)) continue;

    const H = code(m.homeTeam), A = code(m.awayTeam);
    const hs = ft.home, as = ft.away;
    const G = (groups[g] = groups[g] || { teams: {}, played: [] });
    const team = (tla, nm) => (G.teams[tla] = G.teams[tla] || { g, t: tla, n: nm, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    const th = team(H, teamName(m.homeTeam)), ta = team(A, teamName(m.awayTeam));

    th.gf += hs; th.ga += as; ta.gf += as; ta.ga += hs;
    if (hs > as) { th.w++; ta.l++; }
    else if (hs < as) { ta.w++; th.l++; }
    else { th.d++; ta.d++; }
    G.played.push({ H, A, hs, as });
  }

  const out = [];
  for (const g of Object.keys(groups)) {
    const G = groups[g];
    const arr = Object.values(G.teams).map((t) => ({ ...t, pts: t.w * 3 + t.d, gd: t.gf - t.ga }));
    fifaOrder(arr, G.played).forEach((t, i) => {
      out.push({ g: t.g, t: t.t, n: t.n, w: t.w, d: t.d, l: t.l, gf: t.gf, ga: t.ga, pos: i + 1 });
    });
  }
  return out;
}

// Order a group: by points, then FIFA Art. 13 tie-breaks within each level-points cluster.
function fifaOrder(arr, played) {
  const byPts = {};
  for (const t of arr) (byPts[t.pts] = byPts[t.pts] || []).push(t);
  const order = [];
  for (const p of Object.keys(byPts).map(Number).sort((a, b) => b - a)) {
    order.push(...breakTie(byPts[p], played));
  }
  return order;
}

// Step 1: head-to-head (points/GD/goals among the tied teams).
// Step 2: overall GD, overall goals. (Conduct score / FIFA ranking are not
// available from match data; a stable code order is the final deterministic
// fallback. Exotic 3-team partial-H2H sub-cases use this single-pass ordering.)
function breakTie(cluster, played) {
  if (cluster.length === 1) return cluster;
  const h = h2h(cluster.map((t) => t.t), played);
  return [...cluster].sort((a, b) =>
    h[b.t].pts - h[a.t].pts || h[b.t].gd - h[a.t].gd || h[b.t].gf - h[a.t].gf ||
    b.gd - a.gd || b.gf - a.gf ||
    a.t.localeCompare(b.t)
  );
}

// Mini-table among `subset`, counting only matches played between those teams.
function h2h(subset, played) {
  const r = Object.fromEntries(subset.map((t) => [t, { pts: 0, gd: 0, gf: 0 }]));
  for (const m of played) {
    if (!r[m.H] || !r[m.A]) continue;
    r[m.H].gf += m.hs; r[m.H].gd += m.hs - m.as;
    r[m.A].gf += m.as; r[m.A].gd += m.as - m.hs;
    if (m.hs > m.as) r[m.H].pts += 3;
    else if (m.hs < m.as) r[m.A].pts += 3;
    else { r[m.H].pts++; r[m.A].pts++; }
  }
  return r;
}

function code(team) { const t = String(team && team.tla || "").toUpperCase(); return ALIAS[t] || t; }
function teamName(team) { return (team && (team.shortName || team.name)) || ""; }
function jsonHeaders(cacheState) { return { "Content-Type": "application/json; charset=utf-8", "X-Cache": cacheState }; }
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}
