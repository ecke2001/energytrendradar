import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateGenerationDaily,
  aggregateNetExportDaily,
  aggregatePriceDaily,
  assertPublicPower,
  buildWeeklyStats,
  crossBorderBalanceWarning,
  lastValidIndex,
  transformCrossBorder,
  transformGeneration,
  transformPrices,
  type EcCrossBorder,
  type EcPrice,
  type EcPublicPower,
} from '../lib/energy';
import { isoWeek, viennaDateKey, viennaLabel } from '../../lib/time';

// 2026-10-08 12:07 UTC (14:07 in Vienna)
const NOW = Date.UTC(2026, 9, 8, 12, 7) / 1000;
// Energy-Charts returns whole days in local time; start 8 days back, end tomorrow.
const START = Date.UTC(2026, 8, 29, 22, 0) / 1000; // 2026-09-30 00:00 Vienna
const END = Date.UTC(2026, 9, 9, 22, 0) / 1000; // 2026-10-10 00:00 Vienna

function quarterHours(start: number, end: number): number[] {
  const ts: number[] = [];
  for (let t = start; t < end; t += 900) ts.push(t);
  return ts;
}

/** Values up to `now`, null afterwards – like the API does for the current day. */
function series(ts: number[], fn: (t: number) => number, now = NOW): Array<number | null> {
  return ts.map(t => (t <= now ? fn(t) : null));
}

function powerFixture(): EcPublicPower {
  const ts = quarterHours(START, END);
  const hourOfDay = (t: number) => (t / 3600) % 24;
  const solar = (t: number) => Math.max(0, 2000 * Math.sin(((hourOfDay(t) - 5) / 14) * Math.PI));
  return {
    unix_seconds: ts,
    production_types: [
      { name: 'Hydro Run-of-River', data: series(ts, () => 2000) },
      { name: 'Hydro water reservoir', data: series(ts, () => 600) },
      { name: 'Hydro pumped storage', data: series(ts, () => 400) },
      { name: 'Hydro pumped storage consumption', data: series(ts, () => -300) },
      { name: 'Solar', data: series(ts, solar) },
      { name: 'Wind onshore', data: series(ts, () => 1000) },
      { name: 'Biomass', data: series(ts, () => 200) },
      { name: 'Fossil gas', data: series(ts, () => 800) },
      // Load lags one hour behind generation, as it often does in practice.
      { name: 'Load', data: series(ts, () => 6500, NOW - 3600) },
    ],
  };
}

function priceFixture(): EcPrice {
  // Day-ahead prices are published until the end of tomorrow.
  const ts = quarterHours(START, END);
  return {
    unix_seconds: ts,
    price: ts.map(t => ((t / 3600) % 24 >= 10 && (t / 3600) % 24 < 12 ? -5 : 100)),
    unit: 'EUR / MWh',
  };
}

function crossBorderFixture(): EcCrossBorder {
  const ts: number[] = [];
  for (let t = START; t < END; t += 3600) ts.push(t);
  // GW, positive = import (Energy-Charts convention); newest hour still null.
  const lagged = (v: number) => series(ts, () => v, NOW - 2 * 3600);
  return {
    unix_seconds: ts,
    countries: [
      { name: 'Germany', data: lagged(-1.2) },
      { name: 'Italy', data: lagged(-0.8) },
      { name: 'Czech Republic', data: lagged(0.5) },
      { name: 'sum', data: lagged(-1.5) },
    ],
  };
}

test('time helpers use Europe/Vienna and ISO weeks', () => {
  assert.equal(viennaDateKey(Date.UTC(2026, 9, 7, 22, 30) / 1000), '2026-10-08');
  assert.equal(viennaLabel(Date.UTC(2026, 9, 8, 12, 0) / 1000), '08.10. 14:00');
  assert.deepEqual(isoWeek('2026-10-08'), { week: 41, year: 2026 });
  assert.deepEqual(isoWeek('2027-01-01'), { week: 53, year: 2026 });
  assert.deepEqual(isoWeek('2026-01-01'), { week: 1, year: 2026 });
});

test('lastValidIndex skips future slots and trailing nulls', () => {
  const ts = [100, 200, 300, 400];
  assert.equal(lastValidIndex(ts, [[1, 2, null, null]], 1000), 1);
  assert.equal(lastValidIndex(ts, [[1, 2, 3, 4]], 250), 1);
  assert.equal(lastValidIndex(ts, [[null, null, null, null]], 1000), -1);
});

test('generation snapshot uses newest point where all key series exist', () => {
  const { data, warnings } = transformGeneration(assertPublicPower(powerFixture()), NOW);
  const snap = data.latestSnapshot;
  assert.ok(snap.timestamp <= NOW - 3600, 'snapshot must not be newer than the load series');
  assert.equal(snap.laufkraftMW, 2000);
  assert.equal(snap.speicherMW, 1000);
  assert.equal(snap.pumpspeicherPumpenMW, 300);
  assert.equal(snap.totalHydroMW, 3000);
  assert.equal(snap.loadMW, 6500);
  assert.equal(snap.hydroSharePercent, 46);
  assert.ok(snap.renewableSharePercent > 0 && snap.renewableSharePercent <= 100);
  assert.equal(data.resolutionMinutes, 15);
  assert.deepEqual(warnings, []);
});

test('generation series holds hourly averages for 48 hours with Vienna labels', () => {
  const { data } = transformGeneration(powerFixture(), NOW);
  assert.ok(data.series.length >= 47 && data.series.length <= 49, `got ${data.series.length}`);
  const last = data.series[data.series.length - 1];
  assert.equal(last.laufkraft, 2000);
  assert.match(last.label, /^\d\d\.\d\d\. \d\d:00$/);
  for (let i = 1; i < data.series.length; i++) {
    assert.equal(data.series[i].timestamp - data.series[i - 1].timestamp, 3600);
  }
});

test('generation fails loudly when production types are unknown', () => {
  const raw = powerFixture();
  raw.production_types = [{ name: 'Something else', data: raw.production_types[0].data }];
  assert.throws(() => transformGeneration(raw, NOW), /neither run-of-river nor load/);
});

test('prices: current slot by time, 24h window by timestamp, day-ahead included', () => {
  const p = transformPrices(priceFixture(), NOW);
  assert.equal(p.currentSlotStart, NOW - (NOW % 900));
  assert.equal(p.currentPrice, 100);
  // 2 hours per day are negative (10–12 UTC); the last 24 h contain exactly 2 h of them.
  assert.equal(p.negativePriceHours24h, 2);
  assert.equal(p.min24h, -5);
  assert.equal(p.max24h, 100);
  assert.ok(p.series.some(x => x.isFuture), 'day-ahead prices must be part of the chart');
  assert.ok(p.series.every(x => x.timestamp > NOW - 24 * 3600 && x.timestamp <= NOW + 36 * 3600));
  assert.equal(typeof p.nextDayAvg, 'number');
});

test('cross-border: GW are converted, sign flipped to export-positive, null tail skipped', () => {
  const cb = transformCrossBorder(crossBorderFixture(), NOW);
  assert.equal(cb.sourceUnit, 'GW');
  assert.ok(cb.timestamp <= NOW - 2 * 3600);
  const de = cb.neighbors.find(n => n.country === 'Germany');
  assert.equal(de?.flowMW, 1200);
  assert.equal(de?.isExport, true);
  const cz = cb.neighbors.find(n => n.country === 'Czech Republic');
  assert.equal(cz?.flowMW, -500);
  assert.equal(cz?.isExport, false);
  assert.equal(cb.netExportMW, 1500);
  assert.equal(cb.isNetExporter, true);
  assert.equal(cb.neighbors.some(n => n.country === 'sum'), false);
});

test('cross-border: hours padded with 0 instead of null are not treated as data', () => {
  // Real Energy-Charts behaviour: unpublished hours come as 0, sometimes with one border already filled.
  const raw = crossBorderFixture();
  const lastReal = raw.unix_seconds.filter(t => t <= NOW - 2 * 3600).length - 1;
  raw.countries = raw.countries.map(c => ({
    ...c,
    data: c.data.map((v, i) => (i > lastReal && raw.unix_seconds[i] <= NOW ? (c.name === 'Germany' ? -0.063 : 0) : v)),
  }));
  const cb = transformCrossBorder(raw, NOW);
  assert.equal(cb.timestamp, raw.unix_seconds[lastReal]);
  assert.equal(cb.netExportMW, 1500);
  const daily = aggregateNetExportDaily(raw, NOW);
  assert.equal(daily.get('2026-10-07'), 36);
});

test('cross-border: MW input is left as is', () => {
  const raw = crossBorderFixture();
  raw.countries = raw.countries.map(c => ({ ...c, data: c.data.map(v => (v === null ? null : v * 1000)) }));
  const cb = transformCrossBorder(raw, NOW);
  assert.equal(cb.sourceUnit, 'MW');
  assert.equal(cb.netExportMW, 1500);
});

test('balance check flags contradicting cross-border sign', () => {
  const { data } = transformGeneration(powerFixture(), NOW);
  const snapshot = { ...data.latestSnapshot, totalGenerationMW: 9000, loadMW: 6000, pumpspeicherPumpenMW: 0 };
  const cb = transformCrossBorder(crossBorderFixture(), NOW);
  assert.equal(crossBorderBalanceWarning(snapshot, { ...cb, timestamp: snapshot.timestamp, netExportMW: 2500 }), null);
  assert.match(
    crossBorderBalanceWarning(snapshot, { ...cb, timestamp: snapshot.timestamp, netExportMW: -2500 }) || '',
    /Vorzeichen/,
  );
});

test('weekly stats cover the 7 complete days before today', () => {
  const stats = buildWeeklyStats(
    aggregateGenerationDaily(powerFixture(), NOW),
    aggregatePriceDaily(priceFixture()),
    aggregateNetExportDaily(crossBorderFixture(), NOW),
    '2026-10-08',
    new Date(NOW * 1000).toISOString(),
  );
  assert.equal(stats.periodStart, '2026-10-01');
  assert.equal(stats.periodEnd, '2026-10-07');
  assert.equal(stats.days.length, 7);
  // 2000 MW run-of-river for 24 h = 48 GWh per day.
  assert.equal(stats.days[0].laufkraftGWh, 48);
  assert.equal(stats.totals.laufkraftGWh, 336);
  assert.equal(stats.days[0].negativePriceHours, 2);
  assert.equal(stats.totals.negativePriceHours, 14);
  assert.equal(stats.days[0].netExportGWh, 36);
  assert.ok(stats.totals.renewableSharePercent > 50);
});

test('weekly stats refuse to report on too little data', () => {
  const gen = aggregateGenerationDaily(powerFixture(), NOW);
  assert.throws(() => buildWeeklyStats(gen, null, null, '2026-10-01', 'x'), /complete days/);
});
