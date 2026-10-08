// Pure transformations of Energy-Charts API responses into the JSON files the
// app reads. No I/O here so everything can be unit-tested with fixtures.

import type {
  CrossBorderData,
  DailyEnergyStats,
  GenerationData,
  GenerationDataPoint,
  GenerationSnapshot,
  SpotPriceData,
  SpotPricePoint,
  WeeklyStats,
} from '../../lib/types';
import { addDays, viennaDateKey, viennaLabel } from '../../lib/time';

export interface EcSeries {
  name: string;
  data: Array<number | null>;
}

export interface EcPublicPower {
  unix_seconds: number[];
  production_types: EcSeries[];
}

export interface EcPrice {
  unix_seconds: number[];
  price: Array<number | null>;
  unit?: string;
}

export interface EcCrossBorder {
  unix_seconds: number[];
  countries: EcSeries[];
}

// Energy-Charts production type names, matched case-insensitively.
export const PRODUCTION_ALIASES = {
  laufkraft: ['Hydro Run-of-River', 'Hydro run-of-river and poundage'],
  reservoir: ['Hydro water reservoir'],
  pumpedGen: ['Hydro pumped storage'],
  pumpedCons: ['Hydro pumped storage consumption'],
  pv: ['Solar'],
  windOn: ['Wind onshore'],
  windOff: ['Wind offshore'],
  biomasse: ['Biomass'],
  geothermal: ['Geothermal'],
  gas: ['Fossil gas'],
  load: ['Load', 'Load (incl. self-consumption)'],
  renShareGen: ['Renewable share of generation'],
} as const;

type SeriesKey = keyof typeof PRODUCTION_ALIASES;
type Picked = Partial<Record<SeriesKey, Array<number | null>>>;

// Series that are not generation (load, shares, trade, pumping) – excluded from total generation.
const NON_GENERATION = /load|share|cross.?border|consumption|import|export|residual/i;

const PLAUSIBLE = {
  loadMW: [1500, 20000],
  priceEurMWh: [-1000, 5000],
  flowMW: 10000,
} as const;

export const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const val = (s: Array<number | null> | undefined, i: number): number => (s && isFiniteNumber(s[i]) ? s[i] as number : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function assertTimeSeries(ts: unknown, label: string): asserts ts is number[] {
  if (!Array.isArray(ts) || ts.length === 0 || !ts.every(isFiniteNumber)) {
    throw new Error(`${label}: unix_seconds missing or invalid`);
  }
}

function assertSeriesList(list: unknown, length: number, label: string): asserts list is EcSeries[] {
  if (!Array.isArray(list) || list.length === 0) throw new Error(`${label}: series list missing`);
  for (const s of list) {
    if (!s || typeof s.name !== 'string' || !Array.isArray(s.data) || s.data.length !== length) {
      throw new Error(`${label}: malformed series`);
    }
  }
}

export function assertPublicPower(raw: unknown): EcPublicPower {
  const r = raw as EcPublicPower;
  assertTimeSeries(r?.unix_seconds, 'public_power');
  assertSeriesList(r.production_types, r.unix_seconds.length, 'public_power');
  return r;
}

export function assertPrice(raw: unknown): EcPrice {
  const r = raw as EcPrice;
  assertTimeSeries(r?.unix_seconds, 'price');
  if (!Array.isArray(r.price) || r.price.length !== r.unix_seconds.length) throw new Error('price: price array invalid');
  return r;
}

export function assertCrossBorder(raw: unknown): EcCrossBorder {
  const r = raw as EcCrossBorder;
  assertTimeSeries(r?.unix_seconds, 'cbpf');
  assertSeriesList(r.countries, r.unix_seconds.length, 'cbpf');
  return r;
}

export function pickSeries(types: EcSeries[]): Picked {
  const picked: Picked = {};
  (Object.keys(PRODUCTION_ALIASES) as SeriesKey[]).forEach(key => {
    const aliases = PRODUCTION_ALIASES[key].map(a => a.toLowerCase());
    const match = types.find(t => aliases.includes(t.name.trim().toLowerCase()));
    if (match) picked[key] = match.data;
  });
  return picked;
}

/** Median spacing of the timestamps in minutes (15 for quarter-hourly data). */
export function detectResolutionMinutes(ts: number[]): number {
  if (ts.length < 2) return 60;
  const diffs = ts.slice(1).map((t, i) => t - ts[i]).filter(d => d > 0).sort((a, b) => a - b);
  if (diffs.length === 0) return 60;
  return Math.round(diffs[Math.floor(diffs.length / 2)] / 60);
}

/**
 * Last index that is not in the future and where every given series has a value.
 * Energy-Charts pads the current day with nulls, so the last array element is
 * usually not the newest real measurement.
 */
export function lastValidIndex(ts: number[], series: Array<Array<number | null>>, nowSec: number): number {
  for (let i = ts.length - 1; i >= 0; i--) {
    if (ts[i] > nowSec) continue;
    if (series.every(s => isFiniteNumber(s[i]))) return i;
  }
  return -1;
}

interface PointValues {
  laufkraft: number;
  speicher: number;
  pumpspeicherPumpen: number;
  pv: number;
  wind: number;
  biomasse: number;
  gas: number;
  load: number;
  renewable: number;
  totalGeneration: number;
}

function totalGenerationAt(types: EcSeries[], i: number): number {
  return types
    .filter(t => !NON_GENERATION.test(t.name))
    .reduce((sum, t) => sum + Math.max(0, val(t.data, i)), 0);
}

function pointAt(types: EcSeries[], s: Picked, i: number): PointValues {
  const laufkraft = val(s.laufkraft, i);
  const reservoir = val(s.reservoir, i);
  const pv = val(s.pv, i);
  const wind = val(s.windOn, i) + val(s.windOff, i);
  const biomasse = val(s.biomasse, i);
  return {
    laufkraft,
    speicher: reservoir + val(s.pumpedGen, i),
    pumpspeicherPumpen: Math.abs(val(s.pumpedCons, i)),
    pv,
    wind,
    biomasse,
    gas: val(s.gas, i),
    load: val(s.load, i),
    renewable: laufkraft + reservoir + pv + wind + biomasse + val(s.geothermal, i),
    totalGeneration: totalGenerationAt(types, i),
  };
}

function renewableShareAt(s: Picked, p: PointValues, i: number): number {
  if (s.renShareGen && isFiniteNumber(s.renShareGen[i])) return Math.round(s.renShareGen[i] as number);
  return p.totalGeneration > 0 ? Math.round((p.renewable / p.totalGeneration) * 100) : 0;
}

export interface GenerationResult {
  data: GenerationData;
  warnings: string[];
}

export function transformGeneration(raw: EcPublicPower, nowSec: number): GenerationResult {
  const warnings: string[] = [];
  const ts = raw.unix_seconds;
  const types = raw.production_types;
  const s = pickSeries(types);

  const keySeries = [s.laufkraft, s.load].filter((x): x is Array<number | null> => Array.isArray(x));
  if (keySeries.length === 0) {
    throw new Error(`public_power: neither run-of-river nor load found (types: ${types.map(t => t.name).join(', ')})`);
  }
  if (!s.pumpedCons) warnings.push('public_power: keine Pumpspeicher-Verbrauchsreihe gefunden – Pumpleistung wird als 0 angezeigt');

  const idx = lastValidIndex(ts, keySeries, nowSec);
  if (idx < 0) throw new Error('public_power: no valid data point');

  const resolution = detectResolutionMinutes(ts);
  const p = pointAt(types, s, idx);
  if (s.load && (p.load < PLAUSIBLE.loadMW[0] || p.load > PLAUSIBLE.loadMW[1])) {
    warnings.push(`public_power: unplausible Last ${Math.round(p.load)} MW`);
  }

  const totalHydro = p.laufkraft + p.speicher;
  const latestSnapshot: GenerationSnapshot = {
    timestamp: ts[idx],
    date: new Date(ts[idx] * 1000).toISOString(),
    laufkraftMW: Math.round(p.laufkraft),
    speicherMW: Math.round(p.speicher),
    pumpspeicherPumpenMW: Math.round(p.pumpspeicherPumpen),
    totalHydroMW: Math.round(totalHydro),
    loadMW: Math.round(p.load),
    hydroSharePercent: p.load > 0 ? Math.round((totalHydro / p.load) * 100) : 0,
    renewableSharePercent: renewableShareAt(s, p, idx),
    pvMW: Math.round(p.pv),
    windMW: Math.round(p.wind),
    biomasseMW: Math.round(p.biomasse),
    totalGenerationMW: Math.round(p.totalGeneration),
  };

  // Hourly averages for the 48 hours up to the newest valid point.
  const windowStart = ts[idx] - 48 * 3600;
  const buckets = new Map<number, { sum: PointValues; n: number }>();
  for (let i = 0; i <= idx; i++) {
    if (ts[i] <= windowStart) continue;
    if (!keySeries.every(k => isFiniteNumber(k[i]))) continue;
    const hour = Math.floor(ts[i] / 3600) * 3600;
    const point = pointAt(types, s, i);
    const bucket = buckets.get(hour);
    if (!bucket) {
      buckets.set(hour, { sum: { ...point }, n: 1 });
    } else {
      (Object.keys(point) as Array<keyof PointValues>).forEach(k => { bucket.sum[k] += point[k]; });
      bucket.n += 1;
    }
  }

  const series: GenerationDataPoint[] = Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, { sum, n }]) => ({
      timestamp: hour,
      label: viennaLabel(hour),
      laufkraft: Math.round(sum.laufkraft / n),
      speicher: Math.round(sum.speicher / n),
      pumpspeicherPumpen: Math.round(sum.pumpspeicherPumpen / n),
      pv: Math.round(sum.pv / n),
      wind: Math.round(sum.wind / n),
      biomasse: Math.round(sum.biomasse / n),
      gas: Math.round(sum.gas / n),
      load: Math.round(sum.load / n),
    }));

  return { data: { resolutionMinutes: resolution, latestSnapshot, series }, warnings };
}

export function transformPrices(raw: EcPrice, nowSec: number): SpotPriceData {
  const ts = raw.unix_seconds;
  const prices = raw.price;
  const resolution = detectResolutionMinutes(ts);

  const cur = lastValidIndex(ts, [prices], nowSec);
  if (cur < 0) throw new Error('price: no price for the current time slot');
  const current = prices[cur] as number;
  if (current < PLAUSIBLE.priceEurMWh[0] || current > PLAUSIBLE.priceEurMWh[1]) {
    throw new Error(`price: implausible current price ${current}`);
  }

  // Last 24 hours by timestamp (not by element count – data is quarter-hourly).
  const windowStart = ts[cur] - 24 * 3600;
  const window: number[] = [];
  let firstInWindow = ts[cur];
  for (let i = 0; i <= cur; i++) {
    if (ts[i] > windowStart && isFiniteNumber(prices[i])) {
      window.push(prices[i] as number);
      firstInWindow = Math.min(firstInWindow, ts[i]);
    }
  }
  const avg = window.reduce((a, b) => a + b, 0) / window.length;
  const negativeSlots = window.filter(v => v < 0).length;

  // Chart: last 24 h plus all published day-ahead prices (max. 36 h ahead).
  const series: SpotPricePoint[] = [];
  let dataUntil = ts[cur];
  for (let i = 0; i < ts.length; i++) {
    if (!isFiniteNumber(prices[i])) continue;
    if (ts[i] <= windowStart || ts[i] > nowSec + 36 * 3600) continue;
    dataUntil = Math.max(dataUntil, ts[i]);
    series.push({ timestamp: ts[i], time: viennaLabel(ts[i]), price: round2(prices[i] as number), isFuture: ts[i] > nowSec });
  }

  const tomorrow = addDays(viennaDateKey(nowSec), 1);
  const tomorrowPrices = ts
    .map((t, i) => ({ t, p: prices[i] }))
    .filter(x => isFiniteNumber(x.p) && viennaDateKey(x.t) === tomorrow)
    .map(x => x.p as number);

  return {
    unit: raw.unit || 'EUR/MWh',
    currentPrice: round2(current),
    currentSlotStart: ts[cur],
    resolutionMinutes: resolution,
    // Hours actually covered by the "24 h" statistics (less if only today's data was available).
    windowHours: Math.round((ts[cur] + resolution * 60 - firstInWindow) / 3600),
    avg24h: round2(avg),
    min24h: round2(Math.min(...window)),
    max24h: round2(Math.max(...window)),
    negativePriceHours24h: round2((negativeSlots * resolution) / 60),
    nextDayAvg: tomorrowPrices.length > 0 ? round2(tomorrowPrices.reduce((a, b) => a + b, 0) / tomorrowPrices.length) : null,
    dataUntil,
    series,
  };
}

/**
 * Energy-Charts reports cross-border physical flows in GW with positive values
 * meaning import. The app shows MW with positive values meaning export.
 * The unit is also detected from the magnitude as a safeguard: Austrian border
 * flows in MW are far above 30, in GW they never are.
 */
export function crossBorderFactor(raw: EcCrossBorder): { factor: number; unit: 'MW' | 'GW' } {
  let maxAbs = 0;
  raw.countries.forEach(c => c.data.forEach(v => { if (isFiniteNumber(v)) maxAbs = Math.max(maxAbs, Math.abs(v)); }));
  return maxAbs > 0 && maxAbs <= 30 ? { factor: 1000, unit: 'GW' } : { factor: 1, unit: 'MW' };
}

const isSum = (name: string) => /^sum$/i.test(name.trim());

function exportOf(netExport: Map<string, { gwh: number; coverage: number }> | null, key: string): number | null {
  const day = netExport?.get(key);
  return day && day.coverage >= 0.98 ? day.gwh : null;
}

/**
 * Energy-Charts pads hours that are not yet published with 0 instead of null.
 * Real AC border flows are practically never exactly 0, so a slot only counts
 * if at least half of the borders report a non-zero value.
 */
function isPublishedSlot(neighbors: EcSeries[], i: number): boolean {
  const reported = neighbors.filter(c => isFiniteNumber(c.data[i]) && c.data[i] !== 0).length;
  return reported >= Math.ceil(neighbors.length / 2);
}

export function transformCrossBorder(raw: EcCrossBorder, nowSec: number): CrossBorderData {
  const ts = raw.unix_seconds;
  const neighbors = raw.countries.filter(c => !isSum(c.name));
  const sum = raw.countries.find(c => isSum(c.name));
  if (neighbors.length === 0) throw new Error('cbpf: no neighbour countries');
  const { factor, unit } = crossBorderFactor(raw);

  let idx = -1;
  for (let i = ts.length - 1; i >= 0; i--) {
    if (ts[i] <= nowSec && isPublishedSlot(neighbors, i)) { idx = i; break; }
  }
  if (idx < 0) throw new Error('cbpf: no valid data point');

  const flows = neighbors.map(c => {
    const raw = c.data[idx];
    const flowMW = isFiniteNumber(raw) ? Math.round(-raw * factor) : 0;
    if (Math.abs(flowMW) > PLAUSIBLE.flowMW) throw new Error(`cbpf: implausible flow ${flowMW} MW (${c.name})`);
    return { country: c.name, flowMW: flowMW === 0 ? 0 : flowMW, isExport: flowMW > 0 };
  });

  const sumRaw = sum?.data[idx];
  const netExportMW = isFiniteNumber(sumRaw)
    ? Math.round(-sumRaw * factor)
    : flows.reduce((a, f) => a + f.flowMW, 0);

  return {
    timestamp: ts[idx],
    date: new Date(ts[idx] * 1000).toISOString(),
    netExportMW: netExportMW === 0 ? 0 : netExportMW,
    isNetExporter: netExportMW >= 0,
    neighbors: flows,
    sourceUnit: unit,
  };
}

// ---------------------------------------------------------------------------
// Daily / weekly aggregation (calendar days in Europe/Vienna)
// ---------------------------------------------------------------------------

type GenDaily = Omit<DailyEnergyStats, 'date' | 'priceAvg' | 'priceMin' | 'priceMax' | 'negativePriceHours' | 'netExportGWh'> & {
  coverage: number;
  /** Publication has reached the end of this day (a newer valid slot exists). */
  published: boolean;
};

/**
 * Number of slots per Vienna calendar day as delivered by the API. The API
 * returns whole days (future slots padded), so this is the real day length,
 * including 23- and 25-hour DST days.
 */
function slotsPerDay(ts: number[]): Map<string, number> {
  const counts = new Map<string, number>();
  ts.forEach(t => {
    const key = viennaDateKey(t);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

export function aggregateGenerationDaily(raw: EcPublicPower, nowSec: number): Map<string, GenDaily> {
  const ts = raw.unix_seconds;
  const types = raw.production_types;
  const s = pickSeries(types);
  const keySeries = [s.laufkraft, s.load].filter((x): x is Array<number | null> => Array.isArray(x));
  const hours = detectResolutionMinutes(ts) / 60;
  const expected = slotsPerDay(ts);
  const lastSlotOfDay = new Map<string, number>();
  ts.forEach(t => {
    const key = viennaDateKey(t);
    lastSlotOfDay.set(key, Math.max(lastSlotOfDay.get(key) ?? t, t));
  });

  let newestValid = -Infinity;
  const acc = new Map<string, { e: PointValues; n: number }>();
  for (let i = 0; i < ts.length; i++) {
    if (ts[i] > nowSec || keySeries.length === 0 || !keySeries.every(k => isFiniteNumber(k[i]))) continue;
    newestValid = Math.max(newestValid, ts[i]);
    const key = viennaDateKey(ts[i]);
    const p = pointAt(types, s, i);
    const day = acc.get(key);
    if (!day) {
      acc.set(key, { e: { ...p }, n: 1 });
    } else {
      (Object.keys(p) as Array<keyof PointValues>).forEach(k => { day.e[k] += p[k]; });
      day.n += 1;
    }
  }

  const out = new Map<string, GenDaily>();
  acc.forEach(({ e, n }, key) => {
    const gwh = (mw: number) => round1((mw * hours) / 1000);
    out.set(key, {
      laufkraftGWh: gwh(e.laufkraft),
      speicherGWh: gwh(e.speicher),
      pumpenGWh: gwh(e.pumpspeicherPumpen),
      pvGWh: gwh(e.pv),
      windGWh: gwh(e.wind),
      biomasseGWh: gwh(e.biomasse),
      gasGWh: gwh(e.gas),
      loadGWh: gwh(e.load),
      renewableGWh: gwh(e.renewable),
      totalGenerationGWh: gwh(e.totalGeneration),
      renewableSharePercent: e.totalGeneration > 0 ? Math.round((e.renewable / e.totalGeneration) * 100) : 0,
      coverage: n / (expected.get(key) || n),
      published: newestValid >= (lastSlotOfDay.get(key) ?? Infinity),
    });
  });
  return out;
}

type PriceDaily = { priceAvg: number; priceMin: number; priceMax: number; negativePriceHours: number; values: number[] };

export function aggregatePriceDaily(raw: EcPrice): Map<string, PriceDaily> {
  const hours = detectResolutionMinutes(raw.unix_seconds) / 60;
  const values = new Map<string, number[]>();
  raw.unix_seconds.forEach((t, i) => {
    const p = raw.price[i];
    if (!isFiniteNumber(p)) return;
    const key = viennaDateKey(t);
    const list = values.get(key) || [];
    list.push(p);
    values.set(key, list);
  });
  const out = new Map<string, PriceDaily>();
  values.forEach((list, key) => {
    out.set(key, {
      priceAvg: round2(list.reduce((a, b) => a + b, 0) / list.length),
      priceMin: round2(Math.min(...list)),
      priceMax: round2(Math.max(...list)),
      negativePriceHours: round2(list.filter(v => v < 0).length * hours),
      values: list,
    });
  });
  return out;
}

export function aggregateNetExportDaily(raw: EcCrossBorder, nowSec: number): Map<string, { gwh: number; coverage: number }> {
  const ts = raw.unix_seconds;
  const { factor } = crossBorderFactor(raw);
  const hours = detectResolutionMinutes(ts) / 60;
  const expected = slotsPerDay(ts);
  const neighbors = raw.countries.filter(c => !isSum(c.name));
  const sum = raw.countries.find(c => isSum(c.name));
  const acc = new Map<string, { mwh: number; n: number }>();
  for (let i = 0; i < ts.length; i++) {
    if (ts[i] > nowSec || !isPublishedSlot(neighbors, i)) continue;
    let net: number | null = null;
    if (sum && isFiniteNumber(sum.data[i])) net = -(sum.data[i] as number) * factor;
    else if (neighbors.every(c => isFiniteNumber(c.data[i]))) net = neighbors.reduce((a, c) => a - (c.data[i] as number) * factor, 0);
    if (net === null) continue;
    const key = viennaDateKey(ts[i]);
    const day = acc.get(key) || { mwh: 0, n: 0 };
    day.mwh += net * hours;
    day.n += 1;
    acc.set(key, day);
  }
  const out = new Map<string, { gwh: number; coverage: number }>();
  acc.forEach(({ mwh, n }, key) => out.set(key, { gwh: round1(mwh / 1000), coverage: n / (expected.get(key) || n) }));
  return out;
}

/**
 * Statistics for a 7-day window of calendar days (Europe/Vienna).
 *
 * The window ends yesterday only once publication has reached the end of
 * yesterday (Energy-Charts lags 2-3 h, so the first run after midnight usually
 * sees an unfinished day); otherwise it ends the day before. This keeps the
 * report frame from moving forward on partial data, while a single slot that
 * is never published does not block the week (>= 90 % coverage suffices).
 * The number of included days is in `days.length`.
 * Daily net export is only used for days whose cross-border data is complete.
 */
export function buildWeeklyStats(
  gen: Map<string, GenDaily>,
  price: Map<string, PriceDaily> | null,
  netExport: Map<string, { gwh: number; coverage: number }> | null,
  todayKey: string,
  generatedAt: string,
): WeeklyStats {
  const yesterday = gen.get(addDays(todayKey, -1));
  const endKey = yesterday && yesterday.published && yesterday.coverage >= 0.9 ? addDays(todayKey, -1) : addDays(todayKey, -2);
  const days: DailyEnergyStats[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const key = addDays(endKey, -offset);
    const g = gen.get(key);
    if (!g || g.coverage < 0.9) continue;
    const pr = price?.get(key);
    const { coverage: _coverage, published: _published, ...energy } = g;
    days.push({
      date: key,
      ...energy,
      priceAvg: pr ? pr.priceAvg : null,
      priceMin: pr ? pr.priceMin : null,
      priceMax: pr ? pr.priceMax : null,
      negativePriceHours: pr ? pr.negativePriceHours : null,
      netExportGWh: exportOf(netExport, key),
    });
  }
  if (days.length < 3) throw new Error(`weekly stats: only ${days.length} complete days available`);

  const sumOf = (k: keyof DailyEnergyStats) => round1(days.reduce((a, d) => a + ((d[k] as number | null) ?? 0), 0));
  const priceValues = days.flatMap(d => (price?.get(d.date)?.values) || []);
  const hasPrices = priceValues.length > 0;
  const renewableGWh = sumOf('renewableGWh');
  const totalGenerationGWh = sumOf('totalGenerationGWh');

  return {
    periodStart: days[0].date,
    periodEnd: days[days.length - 1].date,
    generatedAt,
    days,
    totals: {
      laufkraftGWh: sumOf('laufkraftGWh'),
      speicherGWh: sumOf('speicherGWh'),
      pumpenGWh: sumOf('pumpenGWh'),
      pvGWh: sumOf('pvGWh'),
      windGWh: sumOf('windGWh'),
      biomasseGWh: sumOf('biomasseGWh'),
      gasGWh: sumOf('gasGWh'),
      loadGWh: sumOf('loadGWh'),
      renewableGWh,
      totalGenerationGWh,
      renewableSharePercent: totalGenerationGWh > 0 ? Math.round((renewableGWh / totalGenerationGWh) * 100) : 0,
      priceAvg: hasPrices ? round2(priceValues.reduce((a, b) => a + b, 0) / priceValues.length) : null,
      priceMin: hasPrices ? round2(Math.min(...priceValues)) : null,
      priceMax: hasPrices ? round2(Math.max(...priceValues)) : null,
      negativePriceHours: hasPrices ? round2(days.reduce((a, d) => a + (d.negativePriceHours ?? 0), 0)) : null,
      netExportGWh: days.every(d => d.netExportGWh !== null) ? sumOf('netExportGWh') : null,
    },
  };
}

/**
 * Physical sanity check for the cross-border sign convention: a large
 * generation surplus must coincide with net export. Returns a warning if the
 * two disagree clearly.
 */
export function crossBorderBalanceWarning(snapshot: GenerationSnapshot, cb: CrossBorderData): string | null {
  if (snapshot.totalGenerationMW === undefined) return null;
  if (Math.abs(snapshot.timestamp - cb.timestamp) > 2 * 3600) return null;
  const balance = snapshot.totalGenerationMW - snapshot.loadMW - snapshot.pumpspeicherPumpenMW;
  if (Math.abs(balance) < 1000 || Math.abs(cb.netExportMW) < 1000) return null;
  if (Math.sign(balance) === Math.sign(cb.netExportMW)) return null;
  return `cross-border: Vorzeichen widerspricht der Erzeugungsbilanz (Bilanz ${Math.round(balance)} MW, Saldo ${cb.netExportMW} MW) – Konvention prüfen`;
}
