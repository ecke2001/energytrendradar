import {
  GenerationData,
  SpotPriceData,
  CrossBorderData,
  RenewableShareData,
  NewsItem,
  AppMetadata,
  WeeklyReport,
  WeeklyStats,
} from './types';
import { viennaDateTime, viennaLabel } from './time';

// Written by scripts/fetch-data.ts and scripts/generate-report.ts (GitHub Actions)
// and bundled into the static export at build time.
import rawGeneration from '../data/generation.json';
import rawPrices from '../data/prices.json';
import rawCrossBorder from '../data/cross-border.json';
import rawRenShare from '../data/renewable-share.json';
import rawNews from '../data/news.json';
import rawMeta from '../data/meta.json';
import rawWeeklyStats from '../data/weekly-stats.json';
import rawReports from '../data/reports.json';

export const generationData: GenerationData = rawGeneration as unknown as GenerationData;
export const spotPriceData: SpotPriceData = rawPrices as unknown as SpotPriceData;
export const crossBorderData: CrossBorderData = rawCrossBorder as unknown as CrossBorderData;
export const renewableShareData: RenewableShareData = rawRenShare as unknown as RenewableShareData;
export const realNewsItems: NewsItem[] = rawNews as unknown as NewsItem[];
export const appMetadata: AppMetadata = rawMeta as unknown as AppMetadata;
export const weeklyStats: WeeklyStats | null = rawWeeklyStats as unknown as WeeklyStats | null;
/** Automatically generated weekly reports, newest first. */
export const weeklyReports: WeeklyReport[] = (rawReports as unknown as WeeklyReport[]) || [];
export const latestReport: WeeklyReport | undefined = weeklyReports[0];

/** Timestamp of the newest real measurement (falls back for data written by older pipeline versions). */
export const dataAsOf: string | null = appMetadata?.dataAsOf ?? generationData?.latestSnapshot?.date ?? null;

export function getLastUpdatedText(): string {
  return dataAsOf ? viennaDateTime(dataAsOf) : '–';
}

/** "08.10. 14:00" style time of a unix timestamp or ISO string, in Vienna time. */
export function formatDataTime(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '–';
  return viennaDateTime(typeof value === 'number' ? new Date(value * 1000) : value);
}

/** Compact "08.10. 14:00" form of a unix timestamp for badges. */
export function formatShortTime(unixSeconds: number | undefined | null): string {
  return typeof unixSeconds === 'number' ? viennaLabel(unixSeconds) : '–';
}
