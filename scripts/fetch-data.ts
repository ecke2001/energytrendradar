// Data aggregator: fetches Energy-Charts (Fraunhofer ISE) and Google News RSS,
// validates and transforms the data and writes data/*.json.
//
// Every source is handled independently. If a source fails, its previous file
// is kept untouched (last known good) and the failure is recorded in
// data/meta.json so the UI and the freshness check can flag it.

import fs from 'fs';
import path from 'path';
import type { AppMetadata, GenerationData, SourceStatus } from '../lib/types';
import { addDays, viennaDateKey, viennaDateTime } from '../lib/time';
import { describeError, fetchJson, fetchText, sleep } from './lib/http';
import {
  aggregateGenerationDaily,
  aggregateNetExportDaily,
  aggregatePriceDaily,
  assertCrossBorder,
  assertPrice,
  assertPublicPower,
  buildWeeklyStats,
  crossBorderBalanceWarning,
  transformCrossBorder,
  transformGeneration,
  transformPrices,
} from './lib/energy';
import { NEWS_QUERIES, mergeNews, newsFeedUrl, parseRssItems } from './lib/news';

const DATA_DIR = path.join(process.cwd(), 'data');
const EC_BASE = 'https://api.energy-charts.info';
// Energy-Charts is rate limited; keep a gap between requests.
const EC_REQUEST_GAP_MS = 3000;

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) as T;
  } catch {
    return null;
  }
}

/** Write via temp file + rename so a crash never leaves a half-written file. */
function writeJson(file: string, data: unknown): void {
  const target = path.join(DATA_DIR, file);
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, target);
  console.log(`  ✅ data/${file}`);
}

/**
 * Requests an Energy-Charts endpoint for an explicit date range. If the ranged
 * request fails, retries once with the API default range (today), which is
 * enough for the current snapshot but not for weekly statistics.
 */
async function fetchEnergyCharts<T>(
  endpoint: string,
  params: Record<string, string>,
  range: { start: string; end: string },
  validate: (raw: unknown) => T,
): Promise<{ data: T; ranged: boolean }> {
  const ranged = new URLSearchParams({ ...params, ...range });
  try {
    return { data: validate(await fetchJson(`${EC_BASE}/${endpoint}?${ranged}`)), ranged: true };
  } catch (err) {
    console.warn(`  ⚠️  ${endpoint} (Zeitraum) fehlgeschlagen: ${describeError(err)} – versuche Standardzeitraum`);
    await sleep(EC_REQUEST_GAP_MS);
    const fallback = new URLSearchParams(params);
    return { data: validate(await fetchJson(`${EC_BASE}/${endpoint}?${fallback}`)), ranged: false };
  }
}

async function main() {
  const now = new Date();
  const nowIso = now.toISOString();
  const nowSec = Math.floor(now.getTime() / 1000);
  const today = viennaDateKey(nowSec);

  const previousMeta = readJson<AppMetadata>('meta.json');
  const sourceStatus: Record<string, SourceStatus> = {};
  const warnings: string[] = [];

  async function runSource(key: string, task: () => Promise<string | null>): Promise<void> {
    const previous = previousMeta?.sourceStatus?.[key];
    try {
      const dataUntil = await task();
      sourceStatus[key] = { ok: true, lastAttempt: nowIso, lastSuccess: nowIso, dataUntil };
    } catch (err) {
      const reason = describeError(err);
      console.error(`  ❌ ${key}: ${reason}`);
      warnings.push(`${key}: ${reason} – letzte gültige Daten bleiben erhalten`);
      sourceStatus[key] = {
        ok: false,
        lastAttempt: nowIso,
        lastSuccess: previous?.lastSuccess ?? null,
        dataUntil: previous?.dataUntil ?? null,
        error: reason,
      };
    }
  }

  console.log(`🔄 Energy Trend Radar Datenaktualisierung – ${viennaDateTime(now)} (Europe/Vienna)`);

  // --- Raw downloads -------------------------------------------------------
  console.log('📥 Lade Energy-Charts Daten (Erzeugung, Preise, Grenzflüsse)...');
  const download = async <T>(fn: () => Promise<T>): Promise<T | Error> => {
    try {
      return await fn();
    } catch (err) {
      return err instanceof Error ? err : new Error(String(err));
    }
  };

  const power = await download(() =>
    fetchEnergyCharts('public_power', { country: 'at' }, { start: addDays(today, -8), end: addDays(today, 1) }, assertPublicPower));
  await sleep(EC_REQUEST_GAP_MS);
  const price = await download(() =>
    fetchEnergyCharts('price', { bzn: 'AT' }, { start: addDays(today, -8), end: addDays(today, 2) }, assertPrice));
  await sleep(EC_REQUEST_GAP_MS);
  const cbpf = await download(() =>
    fetchEnergyCharts('cbpf', { country: 'at' }, { start: addDays(today, -8), end: addDays(today, 1) }, assertCrossBorder));

  if (!(power instanceof Error)) {
    console.log(`  ℹ️  Produktionsarten: ${power.data.production_types.map(t => t.name).join(', ')}`);
  }

  // --- Transformations (each writes its file only on success) ---------------
  console.log('🧮 Verarbeite Daten...');
  let generation: GenerationData | null = null;

  await runSource('generation', async () => {
    if (power instanceof Error) throw power;
    const result = transformGeneration(power.data, nowSec);
    warnings.push(...result.warnings);
    generation = result.data;
    writeJson('generation.json', result.data);
    return result.data.latestSnapshot.date;
  });

  await runSource('prices', async () => {
    if (price instanceof Error) throw price;
    const data = transformPrices(price.data, nowSec);
    writeJson('prices.json', data);
    return new Date((data.currentSlotStart ?? 0) * 1000).toISOString();
  });

  await runSource('crossBorder', async () => {
    if (cbpf instanceof Error) throw cbpf;
    const data = transformCrossBorder(cbpf.data, nowSec);
    const g = generation as GenerationData | null;
    if (g) {
      const warning = crossBorderBalanceWarning(g.latestSnapshot, data);
      if (warning) warnings.push(warning);
    }
    writeJson('cross-border.json', data);
    return data.date;
  });

  await runSource('weeklyStats', async () => {
    if (power instanceof Error) throw power;
    if (!power.ranged) throw new Error('public_power ohne Zeitraum – keine Wochenstatistik möglich');
    const priceDaily = !(price instanceof Error) && price.ranged ? aggregatePriceDaily(price.data) : null;
    const exportDaily = !(cbpf instanceof Error) && cbpf.ranged ? aggregateNetExportDaily(cbpf.data, nowSec) : null;
    const stats = buildWeeklyStats(aggregateGenerationDaily(power.data, nowSec), priceDaily, exportDaily, today, nowIso);
    writeJson('weekly-stats.json', stats);
    writeJson('renewable-share.json', {
      currentPercent: (generation as GenerationData | null)?.latestSnapshot.renewableSharePercent
        ?? stats.days[stats.days.length - 1].renewableSharePercent,
      trend: stats.days.map(d => d.renewableSharePercent),
      daily: stats.days.map(d => ({ date: d.date, percent: d.renewableSharePercent })),
    });
    return stats.periodEnd;
  });

  console.log('📰 Lade aktuelle Meldungen (Google News RSS)...');
  await runSource('news', async () => {
    const lists = [];
    for (const { category, query } of NEWS_QUERIES) {
      try {
        const xml = await fetchText(newsFeedUrl(query), { retries: 2, maxBytes: 5 * 1024 * 1024 });
        lists.push(parseRssItems(xml, category));
      } catch (err) {
        console.warn(`  ⚠️  News-Abfrage "${category}" fehlgeschlagen: ${describeError(err)}`);
      }
      await sleep(1000);
    }
    const items = mergeNews(lists, now);
    if (items.length === 0) throw new Error('keine aktuellen Meldungen erhalten');
    writeJson('news.json', items);
    return items[0].pubDate;
  });

  // --- Metadata --------------------------------------------------------------
  const dataAsOf = sourceStatus.generation?.ok
    ? sourceStatus.generation.dataUntil
    : previousMeta?.dataAsOf ?? previousMeta?.sourceStatus?.generation?.dataUntil ?? null;

  const meta: AppMetadata = {
    lastUpdated: nowIso,
    lastUpdatedFormatted: viennaDateTime(now),
    dataAsOf,
    version: '3.0.0',
    sources: [
      { name: 'Energy-Charts (Fraunhofer ISE)', url: 'https://energy-charts.info', license: 'CC BY 4.0' },
      { name: 'ENTSO-E Transparency (via Energy-Charts)', url: 'https://transparency.entsoe.eu' },
      { name: 'Google News (Schlagzeilen & Links)', url: 'https://news.google.com' },
    ],
    sourceStatus,
    warnings,
  };
  writeJson('meta.json', meta);

  const failed = Object.entries(sourceStatus).filter(([, s]) => !s.ok).map(([k]) => k);
  if (warnings.length) warnings.forEach(w => console.warn(`::warning::${w}`));
  console.log(failed.length === 0
    ? '🎉 Alle Quellen erfolgreich aktualisiert.'
    : `⚠️  Fehlgeschlagene Quellen: ${failed.join(', ')} (letzte gültige Daten beibehalten)`);
}

main().catch(err => {
  console.error('Fatal data aggregation error:', describeError(err));
  process.exit(1);
});
