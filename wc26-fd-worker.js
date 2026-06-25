/**
 * wc26-fd-worker.js — Cloudflare Worker
 * ---------------------------------------------------------------------------
 * Proxies football-data.org's FIFA World Cup 2026 standings into the compact
 * shape the Third-Place Tracker UI expects, while solving the three reasons the
 * browser can't call football-data.org directly:
 *   1. CORS  — football-data.org only sends Access-Control-Allow-Origin for
 *              http://localhost, so a claude.ai artifact is blocked. This worker
 *              returns Access-Control-Allow-Origin: *.
 *   2. Key   — the API key stays here (server-side), never shipped to the browser.
 *   3. Rate  — free tier = 10 req/min. The 45s cache collapses all viewers /
 *              auto-refreshes into at most ~1 upstream call per 45s.
 *
 * Output contract (consumed by fetchProxy in the UI):
 *   { updated: ISO8601, source: "football-data.org", matchday: number|null,
 *     teams: [ { g:"A", t:"MEX", w:3, d:0, l:0, gf:6, ga:0 }, ... ] }   // 48 rows
 *
 * Deploy
 * ------
 *   A) Dashboard: Workers & Pages → Create → Worker → paste this as the code.
 *      Then Settings → Variables and Secrets → add an *encrypted* variable
 *      named  FD_KEY  with your football-data.org token as the value. Deploy.
 *   B) Wrangler:  wrangler init wc26-proxy  (Hello-World, JS), replace
 *      src/index.js with this file, then:
 *          wrangler secret put FD_KEY      # paste the key when prompted
 *          wrangler deploy
 *
 * Copy the resulting https://<name>.workers.dev/ URL into PROXY_URL in the UI.
 * (If you reuse your existing wc26-proxy worker, just replace its code with this
 *  and add the FD_KEY secret — the UI's PROXY_URL can stay the same.)
 *
 * Quick check after deploy:  curl https://<name>.workers.dev/   → JSON with 48 teams.
 */

const FD_STANDINGS = "https://api.football-data.org/v4/competitions/WC/standings";

// football-data.org's 3-letter code (tla) -> the FIFA code the UI's team table uses.
// Only two differ for WC26; everything else already matches.
const ALIAS = { ALG: "DZA", HAI: "HTI" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, ...extra },
  });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET") return json({ error: "method not allowed" }, 405);

    const key = (env && env.FD_KEY) || "";
    if (!key) {
      return json({ error: "FD_KEY secret is not configured on this worker" }, 500);
    }

    // ---- cache layer: stable key ignores the UI's ?t= cache-buster ----
    const cache = caches.default;
    const cacheKey = new Request("https://wc26-fd-proxy.internal/standings");
    const hit = await cache.match(cacheKey);
    if (hit) {
      const body = await hit.text();
      return new Response(body, {
        headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, "X-Cache": "HIT" },
      });
    }

    // ---- upstream fetch ----
    let res;
    try {
      res = await fetch(FD_STANDINGS, { headers: { "X-Auth-Token": key } });
    } catch (e) {
      return json({ error: "upstream fetch failed", detail: String(e) }, 502);
    }
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      return json({ error: `football-data ${res.status}`, detail }, 502);
    }

    const data = await res.json();

    // ---- transform: 12 group tables -> flat 48-row team list ----
    const teams = [];
    for (const s of data.standings || []) {
      if (s.type !== "TOTAL") continue;                       // skip HOME/AWAY splits
      const g = String(s.group || "").replace(/^Group\s+/i, "").trim();  // "Group A" -> "A"
      if (!/^[A-L]$/.test(g)) continue;
      for (const row of s.table || []) {
        const tla = String(row.team?.tla || "").toUpperCase();
        teams.push({
          g,
          t: ALIAS[tla] || tla,
          w: row.won, d: row.draw, l: row.lost,
          gf: row.goalsFor, ga: row.goalsAgainst,
        });
      }
    }

    if (teams.length < 24) {
      return json({ error: "insufficient data from upstream", teams: teams.length }, 502);
    }

    const payload = JSON.stringify({
      updated: new Date().toISOString(),          // moment of this real upstream pull
      source: "football-data.org",
      matchday: data.season?.currentMatchday ?? null,
      teams,
    });

    // Cache for 45s. The body (including `updated`) is frozen for the window, so
    // every viewer in those 45s sees the same honest "data as of" time.
    ctx.waitUntil(cache.put(cacheKey, new Response(payload, {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=45" },
    })));

    return new Response(payload, {
      headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, "X-Cache": "MISS" },
    });
  },
};
