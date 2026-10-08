import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePriceNow, dayAverage, priceSlotAt, priceWindowLabel } from '../../lib/priceNow';
import { parseSimpleMarkdown } from '../../lib/simpleMarkdown';
import type { SpotPriceData } from '../../lib/types';

// Quarter-hourly prices from 2026-10-08 00:00 to 2026-10-10 00:00 Vienna (CEST).
const START = Date.UTC(2026, 9, 7, 22, 0) / 1000;
const series = Array.from({ length: 192 }, (_, i) => ({ timestamp: START + i * 900, time: '', price: i < 96 ? 100 : 50 }));
const data: SpotPriceData = {
  unit: 'EUR/MWh', currentPrice: 77, currentSlotStart: START + 10 * 900, avg24h: 0, min24h: 0, max24h: 0,
  negativePriceHours24h: 0, nextDayAvg: 99, resolutionMinutes: 15, series,
};

test('current slot is found for the viewer time, not the pipeline time', () => {
  const now = START + 50 * 900 + 120; // 12:32 Vienna on 08.10.
  assert.equal(priceSlotAt(series, now)?.timestamp, START + 50 * 900);
  const live = computePriceNow(data, now);
  assert.deepEqual(live, { price: 100, slotStart: START + 50 * 900, nextDayAvg: 50, live: true });
});

test('outside the published series the stored values are used, never a stale slot', () => {
  const later = START + 192 * 900 + 3600; // beyond the last published slot
  assert.equal(priceSlotAt(series, later), null);
  assert.deepEqual(computePriceNow(data, later), { price: 77, slotStart: START + 10 * 900, nextDayAvg: 99, live: false });
});

test("tomorrow's average needs (almost) a full day of prices", () => {
  assert.equal(dayAverage(series, '2026-10-09'), 50);
  assert.equal(dayAverage(series.slice(0, 150), '2026-10-09'), null);
});

test('price window label', () => {
  assert.equal(priceWindowLabel({ ...data, windowHours: 24 }), '24h');
  assert.equal(priceWindowLabel({ ...data, windowHours: 9 }), '9h');
  assert.equal(priceWindowLabel(data), '24h');
});

test('simple markdown subset', () => {
  const blocks = parseSimpleMarkdown('### Titel\n\n**1. Punkt**\n- **Lauf:** 1 500 MW\n2. zweiter\n_(Hinweis)_');
  assert.deepEqual(blocks.map(b => b.type), ['heading', 'paragraph', 'bullet', 'numbered', 'paragraph']);
  assert.deepEqual(blocks[2].inlines, [{ text: 'Lauf:', bold: true }, { text: ' 1 500 MW' }]);
  assert.equal(blocks[3].marker, '2.');
  assert.deepEqual(blocks[4].inlines, [{ text: '(Hinweis)', italic: true }]);
  // Markup-looking text stays plain text.
  assert.deepEqual(parseSimpleMarkdown('<img src=x onerror=alert(1)>')[0].inlines, [{ text: '<img src=x onerror=alert(1)>' }]);
});
