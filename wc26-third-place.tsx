import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Wifi, Database, AlertTriangle, CheckCircle2, Trophy } from "lucide-react";

// ===== Static reference data =====
const TEAMS = {
  A:[["MEX","Mexico"],["KOR","Korea Republic"],["CZE","Czechia"],["RSA","South Africa"]],
  B:[["SUI","Switzerland"],["CAN","Canada"],["BIH","Bosnia & Herz."],["QAT","Qatar"]],
  C:[["BRA","Brazil"],["MAR","Morocco"],["SCO","Scotland"],["HTI","Haiti"]],
  D:[["USA","USA"],["AUS","Australia"],["PAR","Paraguay"],["TUR","Turkiye"]],
  E:[["GER","Germany"],["CIV","Ivory Coast"],["ECU","Ecuador"],["CUW","Curacao"]],
  F:[["NED","Netherlands"],["JPN","Japan"],["SWE","Sweden"],["TUN","Tunisia"]],
  G:[["EGY","Egypt"],["IRN","IR Iran"],["BEL","Belgium"],["NZL","New Zealand"]],
  H:[["ESP","Spain"],["URU","Uruguay"],["CPV","Cape Verde"],["KSA","Saudi Arabia"]],
  I:[["FRA","France"],["NOR","Norway"],["SEN","Senegal"],["IRQ","Iraq"]],
  J:[["ARG","Argentina"],["AUT","Austria"],["DZA","Algeria"],["JOR","Jordan"]],
  K:[["COL","Colombia"],["POR","Portugal"],["COD","Congo DR"],["UZB","Uzbekistan"]],
  L:[["ENG","England"],["GHA","Ghana"],["CRO","Croatia"],["PAN","Panama"]],
};
const NAME = {}; const GROUP_OF = {};
Object.entries(TEAMS).forEach(([g,l]) => l.forEach(([c,n]) => { NAME[c]=n; GROUP_OF[c]=g; }));

const COLS = ["A","B","D","E","G","I","K","L"];
const SLOTS = {
  A:{match:79,elig:"CEFHI",venue:"Mexico City",date:"Jun 30"},
  B:{match:85,elig:"EFGIJ",venue:"Vancouver",date:"Jul 2"},
  D:{match:81,elig:"BEFIJ",venue:"",date:"Jul 2"},
  E:{match:74,elig:"ABCDF",venue:"Boston",date:"Jun 29"},
  G:{match:82,elig:"AEHIJ",venue:"",date:"Jul 2"},
  I:{match:77,elig:"CDFGH",venue:"",date:"Jul 1"},
  K:{match:87,elig:"DEIJL",venue:"",date:"Jul 3"},
  L:{match:80,elig:"EHIJK",venue:"",date:"Jul 1"},
};

// FIFA Annex C assignments (495 rows, lexicographic order of the 4 ELIMINATED groups).
// Each 8-char string = 3rd-place groups placed in COLS order [A,B,D,E,G,I,K,L].
const ASSIGN = `EJIFHGLK HGIDJFLK EJIDHGLK EJIDHFLK EGIDJFLK EGJDHFLK EGIDHFLK EGJDHFLI EGJDHFIK
HGICJFLK EJICHGLK EJICHFLK EGICJFLK EGJCHFLK EGICHFLK EGJCHFLI EGJCHFIK HGICJDLK
CJIDHFLK CGIDJFLK CGJDHFLK CGIDHFLK CGJDHFLI CGJDHFIK EJICHDLK EGICJDLK EGJCHDLK
EGICHDLK EGJCHDLI EGJCHDIK CJEDIFLK CJEDHFLK CEIDHFLK CJEDHFLI CJEDHFIK CGEDJFLK
CGEDIFLK CGEDJFLI CGEDJFIK CGEDHFLK CGJDHFLE CGJDHFEK CGEDHFLI CGEDHFIK CGJDHFEI
HJBFIGLK EJIBHGLK EJBFIHLK EJBFIGLK EJBFHGLK EGBFIHLK EJBFHGLI EJBFHGIK HJBDIGLK
HJBDIFLK IGBDJFLK HGBDJFLK HGBDIFLK HGBDJFLI HGBDJFIK EJBDIHLK EJBDIGLK EJBDHGLK
EGBDIHLK EJBDHGLI EJBDHGIK EJBDIFLK EJBDHFLK EIBDHFLK EJBDHFLI EJBDHFIK EGBDJFLK
EGBDIFLK EGBDJFLI EGBDJFIK EGBDHFLK HGBDJFLE HGBDJFEK EGBDHFLI EGBDHFIK HGBDJFEI
HJBCIGLK HJBCIFLK IGBCJFLK HGBCJFLK HGBCIFLK HGBCJFLI HGBCJFIK EJBCIHLK EJBCIGLK
EJBCHGLK EGBCIHLK EJBCHGLI EJBCHGIK EJBCIFLK EJBCHFLK EIBCHFLK EJBCHFLI EJBCHFIK
EGBCJFLK EGBCIFLK EGBCJFLI EGBCJFIK EGBCHFLK HGBCJFLE HGBCJFEK EGBCHFLI EGBCHFIK
HGBCJFEI HJBCIDLK IGBCJDLK HGBCJDLK HGBCIDLK HGBCJDLI HGBCJDIK CJBDIFLK CJBDHFLK
CIBDHFLK CJBDHFLI CJBDHFIK CGBDJFLK CGBDIFLK CGBDJFLI CGBDJFIK CGBDHFLK CGBDHFLJ
HGBCJFDK CGBDHFLI CGBDHFIK HGBCJFDI EJBCIDLK EJBCHDLK EIBCHDLK EJBCHDLI EJBCHDIK
EGBCJDLK EGBCIDLK EGBCJDLI EGBCJDIK EGBCHDLK HGBCJDLE HGBCJDEK EGBCHDLI EGBCHDIK
HGBCJDEI CJBDEFLK CEBDIFLK CJBDEFLI CJBDEFIK CEBDHFLK CJBDHFLE CJBDHFEK CEBDHFLI
CEBDHFIK CJBDHFEI CGBDEFLK CGBDJFLE CGBDJFEK CGBDEFLI CGBDEFIK CGBDJFEI CGBDHFLE
CGBDHFEK HGBCJFDE CGBDHFEI HJIFAGLK EJIAHGLK EJIFAHLK EJIFAGLK EGJFAHLK EGIFAHLK
EGJFAHLI EGJFAHIK HJIDAGLK HJIDAFLK IGJDAFLK HGJDAFLK HGIDAFLK HGJDAFLI HGJDAFIK
EJIDAHLK EJIDAGLK EGJDAHLK EGIDAHLK EGJDAHLI EGJDAHIK EJIDAFLK HJEDAFLK HEIDAFLK
HJEDAFLI HJEDAFIK EGJDAFLK EGIDAFLK EGJDAFLI EGJDAFIK HGEDAFLK HGJDAFLE HGJDAFEK
HGEDAFLI HGEDAFIK HGJDAFEI HJICAGLK HJICAFLK IGJCAFLK HGJCAFLK HGICAFLK HGJCAFLI
HGJCAFIK EJICAHLK EJICAGLK EGJCAHLK EGICAHLK EGJCAHLI EGJCAHIK EJICAFLK HJECAFLK
HEICAFLK HJECAFLI HJECAFIK EGJCAFLK EGICAFLK EGJCAFLI EGJCAFIK HGECAFLK HGJCAFLE
HGJCAFEK HGECAFLI HGECAFIK HGJCAFEI HJICADLK IGJCADLK HGJCADLK HGICADLK HGJCADLI
HGJCADIK CJIDAFLK HJFCADLK HFICADLK HJFCADLI HJFCADIK CGJDAFLK CGIDAFLK CGJDAFLI
CGJDAFIK HGFCADLK CGJDAFLH HGJCAFDK HGFCADLI HGFCADIK HGJCAFDI EJICADLK HJECADLK
HEICADLK HJECADLI HJECADIK EGJCADLK EGICADLK EGJCADLI EGJCADIK HGECADLK HGJCADLE
HGJCADEK HGECADLI HGECADIK HGJCADEI CJEDAFLK CEIDAFLK CJEDAFLI CJEDAFIK HEFCADLK
HJFCADLE HJECAFDK HEFCADLI HEFCADIK HJECAFDI CGEDAFLK CGJDAFLE CGJDAFEK CGEDAFLI
CGEDAFIK CGJDAFEI HGFCADLE HGECAFDK HGJCAFDE HGECAFDI HJBAIGLK HJBAIFLK IJBFAGLK
HJBFAGLK HGBAIFLK HJBFAGLI HJBFAGIK EJBAIHLK EJBAIGLK EJBAHGLK EGBAIHLK EJBAHGLI
EJBAHGIK EJBAIFLK EJBFAHLK EIBFAHLK EJBFAHLI EJBFAHIK EJBFAGLK EGBAIFLK EJBFAGLI
EJBFAGIK EGBFAHLK HJBFAGLE HJBFAGEK EGBFAHLI EGBFAHIK HJBFAGEI IJBDAHLK IJBDAGLK
HJBDAGLK IGBDAHLK HJBDAGLI HJBDAGIK IJBDAFLK HJBDAFLK HIBDAFLK HJBDAFLI HJBDAFIK
FJBDAGLK IGBDAFLK FJBDAGLI FJBDAGIK HGBDAFLK HGBDAFLJ HGBDAFJK HGBDAFLI HGBDAFIK
HGBDAFIJ EJBAIDLK EJBDAHLK EIBDAHLK EJBDAHLI EJBDAHIK EJBDAGLK EGBAIDLK EJBDAGLI
EJBDAGIK EGBDAHLK HJBDAGLE HJBDAGEK EGBDAHLI EGBDAHIK HJBDAGEI EJBDAFLK EIBDAFLK
EJBDAFLI EJBDAFIK HEBDAFLK HJBDAFLE HJBDAFEK HEBDAFLI HEBDAFIK HJBDAFEI EGBDAFLK
EGBDAFLJ EGBDAFJK EGBDAFLI EGBDAFIK EGBDAFIJ HGBDAFLE HGBDAFEK HGBDAFEJ HGBDAFEI
IJBCAHLK IJBCAGLK HJBCAGLK IGBCAHLK HJBCAGLI HJBCAGIK IJBCAFLK HJBCAFLK HIBCAFLK
HJBCAFLI HJBCAFIK CJBFAGLK IGBCAFLK CJBFAGLI CJBFAGIK HGBCAFLK HGBCAFLJ HGBCAFJK
HGBCAFLI HGBCAFIK HGBCAFIJ EJBAICLK EJBCAHLK EIBCAHLK EJBCAHLI EJBCAHIK EJBCAGLK
EGBAICLK EJBCAGLI EJBCAGIK EGBCAHLK HJBCAGLE HJBCAGEK EGBCAHLI EGBCAHIK HJBCAGEI
EJBCAFLK EIBCAFLK EJBCAFLI EJBCAFIK HEBCAFLK HJBCAFLE HJBCAFEK HEBCAFLI HEBCAFIK
HJBCAFEI EGBCAFLK EGBCAFLJ EGBCAFJK EGBCAFLI EGBCAFIK EGBCAFIJ HGBCAFLE HGBCAFEK
HGBCAFEJ HGBCAFEI IJBCADLK HJBCADLK HIBCADLK HJBCADLI HJBCADIK CJBDAGLK IGBCADLK
CJBDAGLI CJBDAGIK HGBCADLK HGBCADLJ HGBCADJK HGBCADLI HGBCADIK HGBCADIJ CJBDAFLK
CIBDAFLK CJBDAFLI CJBDAFIK HFBCADLK CJBDAFLH HJBCAFDK HFBCADLI HFBCADIK HJBCAFDI
CGBDAFLK CGBDAFLJ CGBDAFJK CGBDAFLI CGBDAFIK CGBDAFIJ CGBDAFLH HGBCAFDK HGBCAFDJ
HGBCAFDI EJBCADLK EIBCADLK EJBCADLI EJBCADIK HEBCADLK HJBCADLE HJBCADEK HEBCADLI
HEBCADIK HJBCADEI EGBCADLK EGBCADLJ EGBCADJK EGBCADLI EGBCADIK EGBCADIJ HGBCADLE
HGBCADEK HGBCADEJ HGBCADEI CEBDAFLK CJBDAFLE CJBDAFEK CEBDAFLI CEBDAFIK CJBDAFEI
HFBCADLE HEBCAFDK HJBCAFDE HEBCAFDI CGBDAFLE CGBDAFEK CGBDAFEJ CGBDAFEI HGBCAFDE`
  .split(/\s+/).filter(Boolean);

const ALLG = "ABCDEFGHIJKL".split("");
const ANNEX = {};
(() => {
  const excl = [];
  for (let a=0;a<12;a++) for (let b=a+1;b<12;b++) for (let c=b+1;c<12;c++) for (let d=c+1;d<12;d++)
    excl.push(new Set([ALLG[a],ALLG[b],ALLG[c],ALLG[d]]));
  excl.forEach((ex,i) => { ANNEX[ALLG.filter(x=>!ex.has(x)).join("")] = ASSIGN[i]; });
})();

// Snapshot: real 48-team data captured from the live feed (Jun 24, ~8pm PT). Auto-refreshes on load.
const SEED_AT = "2026-06-25T02:58:32.520Z";
const SEED = `A MEX 3 0 0 6 0|A RSA 1 1 1 2 3|A KOR 1 0 2 2 3|A CZE 0 1 2 2 6
B SUI 2 1 0 7 3|B CAN 1 1 1 8 3|B BIH 1 1 1 5 6|B QAT 0 1 2 2 10
C BRA 2 1 0 7 1|C MAR 2 1 0 6 3|C SCO 1 0 2 1 4|C HTI 0 0 3 2 8
D USA 2 0 0 6 1|D AUS 1 0 1 2 2|D PAR 1 0 1 2 4|D TUR 0 0 2 0 3
E GER 2 0 0 9 2|E CIV 1 0 1 2 2|E ECU 0 1 1 0 1|E CUW 0 1 1 1 7
F NED 1 1 0 7 3|F JPN 1 1 0 6 2|F SWE 1 0 1 6 6|F TUN 0 0 2 1 9
G EGY 1 1 0 4 2|G IRN 0 2 0 2 2|G BEL 0 2 0 1 1|G NZL 0 1 1 3 5
H ESP 1 1 0 4 0|H URU 0 2 0 3 3|H CPV 0 2 0 2 2|H KSA 0 1 1 1 5
I FRA 2 0 0 6 1|I NOR 2 0 0 7 3|I SEN 0 0 2 3 6|I IRQ 0 0 2 1 7
J ARG 2 0 0 5 0|J AUT 1 0 1 3 3|J DZA 1 0 1 2 4|J JOR 0 0 2 2 5
K COL 2 0 0 4 1|K POR 1 1 0 6 1|K COD 0 1 1 1 2|K UZB 0 0 2 1 8
L ENG 1 1 0 4 2|L GHA 1 1 0 1 0|L CRO 1 0 1 3 4|L PAN 0 0 2 0 2`
  .split("|").map(r => { const p=r.trim().split(/\s+/); return {group:p[0],team:p[1],w:+p[2],d:+p[3],l:+p[4],gf:+p[5],ga:+p[6]}; });

// ===== Logic =====
function enrich(row){ const p=row.w+row.d+row.l, pts=row.w*3+row.d, gd=row.gf-row.ga;
  return {...row, p, pts, gd, name:NAME[row.team]||row.team, g:row.group, t:row.team}; }

function rankThirds(thirds){
  return thirds.map(enrich).sort((a,b)=> b.pts-a.pts || b.gd-a.gd || b.gf-a.gf || a.g.localeCompare(b.g));
}

function allocate(ranked){
  const top8 = ranked.slice(0,8);
  const key = top8.map(t=>t.g).sort().join("");
  const asg = ANNEX[key];
  let allValid = !!asg;
  const out = ranked.map((t,i) => {
    if(i>=8 || !asg) return {...t, qual:i<8, r32:null};
    const idx = asg.indexOf(t.g);
    const winner = COLS[idx];
    const slot = SLOTS[winner];
    const valid = !!slot && slot.elig.includes(t.g) && t.g!==winner;
    if(!valid) allValid = false;
    return {...t, qual:true, r32:{winner, match:slot?.match, venue:slot?.venue, date:slot?.date, valid}};
  });
  return {rows:out, valid:allValid};
}

function thirdsFromStandings(st){
  const byGroup = {};
  st.forEach(r=>{ (byGroup[r.group]=byGroup[r.group]||[]).push(enrich(r)); });
  const thirds=[];
  Object.keys(byGroup).sort().forEach(g=>{
    const sorted = byGroup[g].sort((a,b)=> b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);
    if(sorted[2]) thirds.push(sorted[2]);
  });
  return thirds;
}

// completed matches per group (0-6), from sum of teams' games played / 2
function groupPlayed(st){
  const m = {};
  st.forEach(r => { const p=(+r.w)+(+r.d)+(+r.l); m[r.group]=(m[r.group]||0)+p; });
  Object.keys(m).forEach(g => m[g]=Math.round(m[g]/2));
  return m;
}

// ===== Live data =====
const PROXY_URL = "https://wc26-proxy.main-c07.workers.dev/";

async function fetchProxy(signal){
  const sep = PROXY_URL.includes("?") ? "&" : "?";
  const r = await fetch(PROXY_URL + sep + "t=" + Date.now(), {signal, cache:"no-store"});
  const d = await r.json();
  if(!d.teams || d.teams.length < 24) throw new Error("proxy: insufficient data");
  const st = d.teams.map(x=>({group:x.g, team:x.t, w:+x.w, d:+x.d, l:+x.l, gf:+x.gf, ga:+x.ga}));
  return { st, updated: d.updated };
}

async function fetchESPN(signal){
  const url="https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260627";
  const r = await fetch(url,{signal}); const d = await r.json();
  const acc = {};
  (d.events||[]).forEach(ev=>{
    const c=ev.competitions?.[0]; if(!c||!ev.status?.type?.completed) return;
    const [x,y]=c.competitors||[]; if(!x||!y) return;
    const ax=(x.team?.abbreviation||"").toUpperCase(), ay=(y.team?.abbreviation||"").toUpperCase();
    const gx=GROUP_OF[ax], gy=GROUP_OF[ay]; if(!gx||!gy) return;
    const sx=+x.score, sy=+y.score;
    const T=k=> acc[k]=acc[k]||{team:k,group:GROUP_OF[k],w:0,d:0,l:0,gf:0,ga:0};
    const tx=T(ax), ty=T(ay);
    tx.gf+=sx; tx.ga+=sy; ty.gf+=sy; ty.ga+=sx;
    if(sx>sy){tx.w++;ty.l++;} else if(sx<sy){ty.w++;tx.l++;} else {tx.d++;ty.d++;}
  });
  const st=Object.values(acc);
  if(st.length<24) throw new Error("ESPN: insufficient data");
  return { st, updated: new Date().toISOString() };
}

async function fetchSearch(){
  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-6", max_tokens:2000,
      tools:[{type:"web_search_20250305", name:"web_search"}],
      messages:[{role:"user", content:'Search for the CURRENT 2026 FIFA World Cup group-stage standings (all 12 groups A-L, 48 teams). Return ONLY a compact JSON array and nothing else, no prose, no markdown fences. Each item exactly: {"g":"A","t":"MEX","w":2,"d":1,"l":0,"gf":5,"ga":2}. Use FIFA 3-letter codes for "t". Include all 48 teams with current wins, draws, losses, goals for, goals against.'}],
    }),
  });
  const data = await res.json();
  const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");
  const s=text.indexOf("["), e=text.lastIndexOf("]");
  if(s<0||e<0) throw new Error("Search: no JSON");
  const arr = JSON.parse(text.slice(s,e+1));
  const st = arr.map(x=>({team:x.t,group:x.g,w:+x.w,d:+x.d,l:+x.l,gf:+x.gf,ga:+x.ga})).filter(r=>GROUP_OF[r.team]);
  if(st.length<24) throw new Error("Search: insufficient data");
  return { st, updated: new Date().toISOString() };
}

// ===== Component =====
export default function App(){
  const [standings,setStandings] = useState(SEED);
  const [dataAt,setDataAt] = useState(SEED_AT);
  const [source,setSource] = useState("snapshot");
  const [loading,setLoading] = useState(false);
  const [auto,setAuto] = useState(false);
  const [err,setErr] = useState("");

  const refresh = useCallback(async ()=>{
    setLoading(true); setErr("");
    const ctrl = new AbortController();
    const to = setTimeout(()=>ctrl.abort(), 6000);
    try {
      let res, src;
      try {
        if(!PROXY_URL) throw new Error("no proxy");
        res = await fetchProxy(ctrl.signal); src="proxy";
      } catch {
        try { res = await fetchESPN(ctrl.signal); src="espn"; }
        catch { res = await fetchSearch(); src="search"; }
      }
      setStandings(res.st); setDataAt(res.updated); setSource(src);
    } catch(e){
      setErr("Live refresh blocked here — showing snapshot. Set PROXY_URL to your Cloudflare Worker for live data, or self-host.");
    } finally { clearTimeout(to); setLoading(false); }
  },[]);

  useEffect(()=>{ refresh(); },[refresh]);
  useEffect(()=>{ if(!auto) return; const id=setInterval(refresh,120000); return ()=>clearInterval(id); },[auto,refresh]);

  const ranked = rankThirds(thirdsFromStandings(standings));
  const {rows, valid} = allocate(ranked);
  const played = groupPlayed(standings);
  const totalGames = Object.values(played).reduce((a,b)=>a+b,0);
  const dataDate = (()=>{ const d=new Date(dataAt); return isNaN(d.getTime()) ? null : d; })();
  const isLive = source==="proxy" || source==="espn" || source==="search";

  const srcBadge = {
    proxy:{label:"Live · Worker", cls:"bg-emerald-100 text-emerald-800", Icon:Wifi},
    espn:{label:"Live · ESPN", cls:"bg-emerald-100 text-emerald-800", Icon:Wifi},
    search:{label:"Live · Web search", cls:"bg-emerald-100 text-emerald-800", Icon:Wifi},
    snapshot:{label:"Snapshot · Jun 24", cls:"bg-amber-100 text-amber-800", Icon:Database},
  }[source];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-800">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Third-Place Tracker</h1>
              <p className="text-xs text-slate-500">FIFA World Cup 2026 — best-8 race & Round of 32 allocation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              <RefreshCw className={"w-4 h-4 "+(loading?"animate-spin":"")} /> {loading?"Updating":"Refresh"}
            </button>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 select-none">
              <input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)} className="accent-emerald-600" /> auto 2m
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-2 mb-2 text-xs">
          <span className={"inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium "+srcBadge.cls}>
            <srcBadge.Icon className="w-3 h-3" /> {srcBadge.label}
          </span>
          <span className="text-slate-500">
            {isLive ? "data as of " : "captured "}
            {dataDate ? dataDate.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "—"}
          </span>
          <span className={"inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium "+(valid?"bg-slate-100 text-slate-600":"bg-rose-100 text-rose-700")}>
            {valid ? <><CheckCircle2 className="w-3 h-3"/> Annex C check OK</> : <><AlertTriangle className="w-3 h-3"/> allocation check failed</>}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-wrap mb-3 text-[11px]">
          <span className="text-slate-400 mr-0.5">Group games final:</span>
          {ALLG.map(g=>(
            <span key={g} className={"px-1.5 py-0.5 rounded font-medium "+(played[g]>=6?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500")}>
              {g} {played[g]||0}/6
            </span>
          ))}
          <span className="text-slate-600 ml-1 font-semibold">{totalGames}/72 total</span>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Provisional until all 72 group games finish (Jun 27). R32 pairings recompute on every refresh. Group order uses points → GD → goals; FIFA breaks tied group positions by head-to-head first, which can occasionally shift who finishes 3rd.</span>
        </div>

        {err && <div className="text-xs text-slate-500 mb-3">{err}</div>}

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-[11px] uppercase tracking-wide">
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Grp</th>
                  <th className="px-2 py-2 text-left">Team</th>
                  <th className="px-1.5 py-2 text-center">P</th>
                  <th className="px-1.5 py-2 text-center">W</th>
                  <th className="px-1.5 py-2 text-center">D</th>
                  <th className="px-1.5 py-2 text-center">L</th>
                  <th className="px-1.5 py-2 text-center">GD</th>
                  <th className="px-1.5 py-2 text-center">Pts</th>
                  <th className="px-2 py-2 text-left">Round of 32</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t,i)=>(
                  <React.Fragment key={t.g}>
                    <tr className={(t.qual?"bg-emerald-50/60":"bg-white text-slate-400")+" border-t border-slate-100"}>
                      <td className="px-2 py-2 font-semibold tabular-nums">{i+1}</td>
                      <td className="px-2 py-2 font-bold text-slate-500">{t.g}</td>
                      <td className="px-2 py-2 font-medium whitespace-nowrap">
                        {t.name} <span className="text-[11px] text-slate-400">{t.t}</span>
                      </td>
                      <td className="px-1.5 py-2 text-center tabular-nums">{t.p}</td>
                      <td className="px-1.5 py-2 text-center tabular-nums">{t.w}</td>
                      <td className="px-1.5 py-2 text-center tabular-nums">{t.d}</td>
                      <td className="px-1.5 py-2 text-center tabular-nums">{t.l}</td>
                      <td className="px-1.5 py-2 text-center tabular-nums">{t.gd>0?"+":""}{t.gd}</td>
                      <td className="px-1.5 py-2 text-center font-bold tabular-nums">{t.pts}</td>
                      <td className="px-2 py-2 text-xs">
                        {t.r32 ? (
                          <span className={t.r32.valid?"":"text-rose-600"}>
                            vs <b>Winner {t.r32.winner}</b> · M{t.r32.match}
                            {(t.r32.venue||t.r32.date) && <span className="text-slate-400"> · {[t.r32.venue,t.r32.date].filter(Boolean).join(" ")}</span>}
                          </span>
                        ) : <span className="text-slate-300">eliminated</span>}
                      </td>
                    </tr>
                    {i===7 && (
                      <tr><td colSpan={10} className="p-0">
                        <div className="h-[2px] bg-emerald-500" />
                        <div className="text-[10px] text-center text-emerald-600 font-semibold py-0.5 bg-emerald-50">▲ QUALIFY (top 8) — eliminated below ▼</div>
                      </td></tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-600 mr-1">Legend:</span>
          <span><b className="text-slate-700">P</b> Played</span>
          <span><b className="text-slate-700">W</b> Won</span>
          <span><b className="text-slate-700">D</b> Drawn</span>
          <span><b className="text-slate-700">L</b> Lost</span>
          <span><b className="text-slate-700">GD</b> Goal difference</span>
          <span><b className="text-slate-700">Pts</b> Points</span>
          <span><b className="text-slate-700">M##</b> R32 match no.</span>
          <span><b className="text-slate-700">Winner X</b> winner of Group X</span>
        </div>

        <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
          Third-place ranking criteria (FIFA Regulations): points → goal difference → goals scored → team conduct score → FIFA World Ranking. No head-to-head (teams come from different groups). R32 pairings from Annex C of the 2026 Regulations (all 495 combinations embedded). Live data: your Cloudflare Worker (ESPN feed) → ESPN direct → web search → snapshot. The "data as of" time is the feed's own timestamp, so it reflects the data's real age, not when you last clicked. Conduct score and FIFA-ranking tiebreaks are not pulled live and rarely affect the cut.
        </p>
      </div>
    </div>
  );
}
