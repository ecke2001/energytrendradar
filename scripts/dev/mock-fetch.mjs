// Replaces global fetch with synthetic responses shaped like the real APIs, so
// the pipeline can run end to end without network access (e.g. in Claude Code
// cloud sessions, where api.energy-charts.info is blocked).
//
// Shapes mirror what the live APIs returned in Oct 2026:
// - public_power: quarter-hourly MW, current day padded with null
// - price: quarter-hourly EUR/MWh including the next day
// - cbpf: GW, positive = import, unpublished hours padded with 0 (not null!)
// - Google News RSS: "<title> - <source>" titles, one javascript: link, one old item
// Gemini is answered with HTTP 404 to exercise the fallback path.
//
// Usage: tsx --import ./scripts/dev/mock-fetch.mjs scripts/fetch-data.ts
// (prefer scripts/dev/offline-e2e.sh, which works in a temporary directory).

const now = Math.floor(Date.now() / 1000);
const dayStart = offsetDays => {
  const d = new Date();
  d.setUTCHours(22, 0, 0, 0); // approx. local midnight in Vienna (CEST)
  return Math.floor(d.getTime() / 1000) + (offsetDays - 1) * 86400;
};
const range = (start, end, step) => { const a = []; for (let t = start; t < end; t += step) a.push(t); return a; };
const pad = (ts, fn, until = now, filler = null) => ts.map(t => (t <= until ? Math.round(fn(t) * 1000) / 1000 : filler));
const hour = t => ((t / 3600) + 2) % 24;

function publicPower() {
  const ts = range(dayStart(-8), dayStart(2), 900);
  const sun = t => Math.max(0, 1800 * Math.sin(((hour(t) - 7) / 12) * Math.PI));
  return {
    unix_seconds: ts,
    production_types: [
      { name: 'Hydro pumped storage consumption', data: pad(ts, t => (hour(t) > 11 && hour(t) < 15 ? -1100 : 0)) },
      { name: 'Cross border electricity trading', data: pad(ts, () => 900) },
      { name: 'Hydro Run-of-River', data: pad(ts, t => 1900 + 200 * Math.sin(t / 50000)) },
      { name: 'Biomass', data: pad(ts, () => 230) },
      { name: 'Fossil gas', data: pad(ts, t => (hour(t) > 17 ? 1200 : 500)) },
      { name: 'Geothermal', data: pad(ts, () => 1) },
      { name: 'Hydro water reservoir', data: pad(ts, t => (hour(t) > 17 ? 1400 : 300)) },
      { name: 'Hydro pumped storage', data: pad(ts, t => (hour(t) > 18 ? 900 : 50)) },
      { name: 'Others', data: pad(ts, () => 40) },
      { name: 'Waste', data: pad(ts, () => 60) },
      { name: 'Wind onshore', data: pad(ts, t => 700 + 500 * Math.sin(t / 30000)) },
      { name: 'Solar', data: pad(ts, sun) },
      // Load typically lags the generation series.
      { name: 'Load', data: pad(ts, t => 6200 + 1200 * Math.sin(((hour(t) - 6) / 24) * Math.PI), now - 1800) },
      { name: 'Residual load', data: pad(ts, () => 4000) },
      { name: 'Renewable share of load', data: pad(ts, () => 70.2) },
      { name: 'Renewable share of generation', data: pad(ts, () => 81.4) },
    ],
  };
}

function price() {
  const ts = range(dayStart(-8), dayStart(2), 900);
  return {
    unix_seconds: ts,
    price: ts.map(t => (hour(t) > 11 && hour(t) < 14 ? -3.5 : 70 + 60 * Math.sin(((hour(t) - 4) / 24) * 2 * Math.PI))),
    unit: 'EUR / MWh',
  };
}

function cbpf() {
  const ts = range(dayStart(-8), dayStart(1), 3600);
  const published = now - 3 * 3600;
  const flow = (fn) => pad(ts, fn, published, 0);
  return {
    unix_seconds: ts,
    countries: [
      { name: 'Czech Republic', data: flow(() => 1.62) },
      { name: 'Germany', data: flow(t => 0.4 + Math.sin(t / 40000)) },
      { name: 'Hungary', data: flow(() => -0.41) },
      { name: 'Italy', data: flow(() => -0.35) },
      { name: 'Slovenia', data: flow(() => -0.28) },
      { name: 'Switzerland', data: flow(() => -0.15) },
      { name: 'sum', data: flow(t => 1.62 + 0.4 + Math.sin(t / 40000) - 0.41 - 0.35 - 0.28 - 0.15) },
    ],
  };
}

function rss(url) {
  const topic = (new URL(url).searchParams.get('q') || 'Energie').split(' ')[0];
  const date = days => new Date(Date.now() - days * 86400000).toUTCString();
  const item = (title, days, source, link) =>
    `<item><title>${title} - ${source}</title><link>${link || `https://news.google.com/rss/articles/mock-${encodeURIComponent(title).slice(0, 24)}?oc=5`}</link>` +
    `<pubDate>${date(days)}</pubDate><source url="https://example.at">${source}</source></item>`;
  return `<rss><channel>
    ${item(`${topic}: Neues Pumpspeicherkraftwerk &amp; Netzausbau`, 1, 'ORF')}
    ${item(`Strommarkt-Analyse zu ${topic}`, 3, 'Der Standard')}
    ${item('Sehr alte Meldung', 60, 'Kurier')}
    ${item('Bösartiger Link', 2, 'Evil', 'javascript:alert(1)')}
  </channel></rss>`;
}

globalThis.fetch = async url => {
  const u = String(url);
  const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  if (u.includes('/public_power')) return json(publicPower());
  if (u.includes('/price')) return json(price());
  if (u.includes('/cbpf')) return json(cbpf());
  if (u.includes('news.google.com')) return new Response(rss(u), { status: 200 });
  if (u.includes('generativelanguage.googleapis.com')) return new Response('{"error":"mock"}', { status: 404 });
  throw new Error(`mock-fetch: unexpected URL ${u}`);
};
