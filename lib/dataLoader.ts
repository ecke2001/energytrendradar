import {
  GenerationData,
  SpotPriceData,
  CrossBorderData,
  RenewableShareData,
  NewsItem,
  AppMetadata
} from './types';

// Import JSON files with safe unknown casting
import rawGeneration from '../data/generation.json';
import rawPrices from '../data/prices.json';
import rawCrossBorder from '../data/cross-border.json';
import rawRenShare from '../data/renewable-share.json';
import rawNews from '../data/news.json';
import rawMeta from '../data/meta.json';

export const generationData: GenerationData = rawGeneration as unknown as GenerationData;
export const spotPriceData: SpotPriceData = rawPrices as unknown as SpotPriceData;
export const crossBorderData: CrossBorderData = rawCrossBorder as unknown as CrossBorderData;
export const renewableShareData: RenewableShareData = rawRenShare as unknown as RenewableShareData;
export const realNewsItems: NewsItem[] = rawNews as unknown as NewsItem[];
export const appMetadata: AppMetadata = rawMeta as unknown as AppMetadata;

// Helper to get formatted date string
export function getLastUpdatedText(): string {
  return appMetadata?.lastUpdatedFormatted || new Date().toLocaleDateString('de-AT');
}
