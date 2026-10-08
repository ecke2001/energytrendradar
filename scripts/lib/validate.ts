// Checks for the generated data files. Schema problems block a deployment,
// freshness problems turn the workflow red so a stale Space never goes unnoticed.

import type { AppMetadata, GenerationData, NewsItem, SpotPriceData, WeeklyReport } from '../../lib/types';
import { addDays, ageInHours } from '../../lib/time';
import { safeHttpUrl } from './news';

export type DataFiles = Record<string, unknown>;

const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown) => typeof v === 'string' && v.length > 0;

export function checkSchema(files: DataFiles): string[] {
  const errors: string[] = [];
  const need = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };

  const gen = files['generation.json'] as GenerationData | null;
  const snap = gen?.latestSnapshot;
  need(Boolean(snap), 'generation.json: latestSnapshot fehlt');
  if (snap) {
    (['timestamp', 'laufkraftMW', 'speicherMW', 'pumpspeicherPumpenMW', 'totalHydroMW', 'loadMW', 'hydroSharePercent', 'renewableSharePercent'] as const)
      .forEach(k => need(finite(snap[k]), `generation.json: latestSnapshot.${k} ist keine Zahl`));
    need(!Number.isNaN(new Date(snap.date).getTime()), 'generation.json: latestSnapshot.date ungültig');
  }
  need(Array.isArray(gen?.series) && gen!.series.length > 0, 'generation.json: series leer');

  const prices = files['prices.json'] as SpotPriceData | null;
  need(finite(prices?.currentPrice), 'prices.json: currentPrice fehlt');
  need(Array.isArray(prices?.series) && prices!.series.every(p => finite(p.price) && finite(p.timestamp)), 'prices.json: series ungültig');

  const cb = files['cross-border.json'] as { neighbors?: Array<{ country: unknown; flowMW: unknown }>; netExportMW?: unknown } | null;
  need(finite(cb?.netExportMW), 'cross-border.json: netExportMW fehlt');
  need(Array.isArray(cb?.neighbors) && cb!.neighbors.every(n => str(n.country) && finite(n.flowMW)), 'cross-border.json: neighbors ungültig');

  const ren = files['renewable-share.json'] as { currentPercent?: unknown } | null;
  need(finite(ren?.currentPercent), 'renewable-share.json: currentPercent fehlt');

  const news = files['news.json'] as NewsItem[] | null;
  need(Array.isArray(news), 'news.json: kein Array');
  (news || []).forEach((n, i) => {
    need(str(n.title) && str(n.source) && str(n.pubDate), `news.json[${i}]: Pflichtfelder fehlen`);
    need(safeHttpUrl(n.link || '') === n.link, `news.json[${i}]: unsicherer Link`);
  });

  const meta = files['meta.json'] as AppMetadata | null;
  need(str(meta?.lastUpdated) && !Number.isNaN(new Date(meta!.lastUpdated).getTime()), 'meta.json: lastUpdated ungültig');

  const weekly = files['weekly-stats.json'] as { days?: unknown } | null;
  need(weekly === null || Array.isArray(weekly?.days), 'weekly-stats.json: days fehlt');

  const reports = files['reports.json'] as WeeklyReport[] | null;
  need(Array.isArray(reports), 'reports.json: kein Array');
  (reports || []).forEach((r, i) => {
    need(str(r.id) && str(r.title) && str(r.executiveSummary) && finite(r.weekNumber) && finite(r.year), `reports.json[${i}]: Pflichtfelder fehlen`);
    need(Array.isArray(r.austriaHighlights) && Array.isArray(r.internationalHighlights) && Array.isArray(r.strategicTips)
      && Boolean(r.hydroDeepDive) && Array.isArray(r.hydroDeepDive.projektUpdates), `reports.json[${i}]: Abschnitte fehlen`);
    (r.newsSources || []).forEach((s, j) => need(safeHttpUrl(s.link || '') === s.link, `reports.json[${i}].newsSources[${j}]: unsicherer Link`));
  });

  return errors;
}

export interface FreshnessLimits {
  maxDataAgeHours: number;
  maxReportAgeDays: number;
}

export function checkFreshness(files: DataFiles, now: Date, today: string, limits: FreshnessLimits): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const meta = files['meta.json'] as AppMetadata | null;
  const gen = files['generation.json'] as GenerationData | null;
  const dataAge = ageInHours(meta?.dataAsOf ?? gen?.latestSnapshot?.date, now);
  if (dataAge === null || dataAge > limits.maxDataAgeHours) {
    errors.push(`Erzeugungsdaten veraltet: ${dataAge === null ? 'kein Zeitstempel' : `${Math.round(dataAge)} h alt`} (Limit ${limits.maxDataAgeHours} h)`);
  }

  const prices = files['prices.json'] as SpotPriceData | null;
  const priceAge = prices?.currentSlotStart ? (now.getTime() / 1000 - prices.currentSlotStart) / 3600 : null;
  if (priceAge === null || priceAge > limits.maxDataAgeHours) {
    errors.push(`Spotpreise veraltet: ${priceAge === null ? 'kein Zeitstempel' : `${Math.round(priceAge)} h alt`} (Limit ${limits.maxDataAgeHours} h)`);
  }

  const reports = (files['reports.json'] as WeeklyReport[] | null) || [];
  const latest = reports[0];
  const reportAge = ageInHours(latest?.generatedAt, now);
  if (!latest || reportAge === null || reportAge > limits.maxReportAgeDays * 24 || (latest.periodEnd ?? '') < addDays(today, -limits.maxReportAgeDays)) {
    errors.push(`Wochenbericht veraltet oder fehlt${latest ? ` (${latest.id}, erstellt ${latest.generatedAt ?? 'unbekannt'})` : ''}`);
  }

  Object.entries(meta?.sourceStatus || {}).forEach(([key, s]) => {
    if (!s.ok) warnings.push(`Quelle ${key} beim letzten Lauf fehlgeschlagen: ${s.error ?? 'unbekannt'} (letzter Erfolg: ${s.lastSuccess ?? 'nie'})`);
  });
  (meta?.warnings || []).forEach(w => warnings.push(w));

  return { errors, warnings };
}
