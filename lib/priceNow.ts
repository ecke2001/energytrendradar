// Spot price values that depend on the viewer's current time. prices.json
// contains the last 24 h plus all published day-ahead prices, so the browser
// can determine the current slot and tomorrow's average itself instead of
// showing the values frozen at pipeline run time.

import type { SpotPriceData, SpotPricePoint } from './types';
import { addDays, viennaDateKey } from './time';

/** Price slot containing `nowSec`, or null if the series does not cover that time. */
export function priceSlotAt(series: SpotPricePoint[], nowSec: number, resolutionMinutes = 15): SpotPricePoint | null {
  let found: SpotPricePoint | null = null;
  for (const p of series) {
    if (p.timestamp <= nowSec && (!found || p.timestamp > found.timestamp)) found = p;
  }
  return found && nowSec - found.timestamp < resolutionMinutes * 60 ? found : null;
}

/** Average price of a Vienna calendar day, only if the series covers (almost) the whole day. */
export function dayAverage(series: SpotPricePoint[], dayKey: string, resolutionMinutes = 15): number | null {
  const values = series.filter(p => viennaDateKey(p.timestamp) === dayKey).map(p => p.price);
  // 23 h is the shortest (DST) day.
  if (values.length < (23 * 60) / resolutionMinutes) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export interface PriceNow {
  price: number | null;
  slotStart: number | null;
  nextDayAvg: number | null;
  /** True once computed for the viewer's clock (false = values from the build). */
  live: boolean;
}

/** Values as stored by the pipeline – used for the static prerender. */
export function storedPriceNow(data: SpotPriceData | null | undefined): PriceNow {
  return {
    price: data?.currentPrice ?? null,
    slotStart: data?.currentSlotStart ?? null,
    nextDayAvg: data?.nextDayAvg ?? null,
    live: false,
  };
}

/** Values for the viewer's time; falls back to the stored values if the series does not cover now. */
export function computePriceNow(data: SpotPriceData | null | undefined, nowSec: number): PriceNow {
  const series = data?.series || [];
  const resolution = data?.resolutionMinutes || 15;
  const slot = priceSlotAt(series, nowSec, resolution);
  if (!slot) return storedPriceNow(data);
  return {
    price: slot.price,
    slotStart: slot.timestamp,
    nextDayAvg: dayAverage(series, addDays(viennaDateKey(nowSec), 1), resolution),
    live: true,
  };
}

/** "24h", or the shorter span the statistics actually cover (after a fallback to today-only data). */
export function priceWindowLabel(data: SpotPriceData | null | undefined): string {
  const hours = data?.windowHours;
  return hours && hours < 23 ? `${hours}h` : '24h';
}
