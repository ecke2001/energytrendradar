export type Region = 'Austria' | 'International' | 'EU';
export type Sector = 'Wasserkraft' | 'Solar/PV' | 'Windkraft' | 'Wasserstoff' | 'Markt & Preise' | 'Politik & Recht';
export type ImpactLevel = 'Hoch' | 'Mittel' | 'Strategisch';

export interface TrendItem {
  id: string;
  title: string;
  summary: string;
  region: Region;
  sector: Sector;
  impact: ImpactLevel;
  date: string;
  source: string;
  sourceUrl?: string;
  hydroType?: 'Laufkraft' | 'Pumpspeicher' | 'Allgemein';
  metrics?: {
    label: string;
    value: string;
    change?: string;
    isPositive?: boolean;
  };
  keyTakeaway: string;
}

export interface GenerationSnapshot {
  timestamp: number;
  date: string;
  laufkraftMW: number;
  speicherMW: number;
  pumpspeicherPumpenMW: number;
  totalHydroMW: number;
  loadMW: number;
  hydroSharePercent: number;
  renewableSharePercent: number;
  pvMW?: number;
  windMW?: number;
  biomasseMW?: number;
  totalGenerationMW?: number;
}

export interface GenerationDataPoint {
  timestamp: number;
  label: string;
  laufkraft: number;
  speicher: number;
  pumpspeicherPumpen: number;
  pv: number;
  wind: number;
  biomasse: number;
  gas: number;
  load: number;
}

export interface GenerationData {
  resolutionMinutes?: number;
  latestSnapshot: GenerationSnapshot;
  /** Hourly averages of the last 48 hours (Europe/Vienna labels). */
  series: GenerationDataPoint[];
}

export interface SpotPricePoint {
  timestamp: number;
  time: string;
  price: number;
  /** Day-ahead price for a slot that lies in the future at fetch time. */
  isFuture?: boolean;
}

export interface SpotPriceData {
  unit: string;
  currentPrice: number;
  currentSlotStart?: number;
  resolutionMinutes?: number;
  avg24h: number;
  min24h: number;
  max24h: number;
  negativePriceHours24h: number;
  nextDayAvg?: number | null;
  dataUntil?: number;
  series: SpotPricePoint[];
}

export interface CrossBorderNeighbor {
  country: string;
  flowMW: number;
  isExport: boolean;
}

export interface CrossBorderData {
  timestamp: number;
  date: string;
  netExportMW: number;
  isNetExporter: boolean;
  neighbors: CrossBorderNeighbor[];
  sourceUnit?: 'MW' | 'GW';
}

export interface RenewableShareData {
  currentPercent: number;
  trend: Array<number | null>;
  daily?: Array<{ date: string; percent: number }>;
}

export interface DailyEnergyStats {
  /** Calendar day in Europe/Vienna (YYYY-MM-DD). */
  date: string;
  laufkraftGWh: number;
  speicherGWh: number;
  pumpenGWh: number;
  pvGWh: number;
  windGWh: number;
  biomasseGWh: number;
  gasGWh: number;
  loadGWh: number;
  renewableGWh: number;
  totalGenerationGWh: number;
  renewableSharePercent: number;
  priceAvg: number | null;
  priceMin: number | null;
  priceMax: number | null;
  negativePriceHours: number | null;
  netExportGWh: number | null;
}

export interface WeeklyStats {
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  days: DailyEnergyStats[];
  totals: Omit<DailyEnergyStats, 'date'>;
}

export type NewsCategory = 'Wasserkraft' | 'Österreich' | 'Markt' | 'EU';

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  summary: string;
  category?: NewsCategory;
}

export interface SourceStatus {
  ok: boolean;
  lastAttempt: string;
  lastSuccess: string | null;
  /** Timestamp of the newest data point delivered by this source. */
  dataUntil: string | null;
  error?: string;
}

export interface AppMetadata {
  /** Time of the last pipeline run. */
  lastUpdated: string;
  lastUpdatedFormatted: string;
  /** Timestamp of the newest real generation data point. */
  dataAsOf?: string | null;
  version: string;
  sources: Array<{ name: string; url: string; license?: string }>;
  sourceStatus?: Record<string, SourceStatus>;
  warnings?: string[];
}

export interface WeeklyReport {
  id: string;
  weekNumber: number;
  year: number;
  title: string;
  dateGenerated: string;
  executiveSummary: string;
  austriaHighlights: string[];
  internationalHighlights: string[];
  hydroDeepDive: {
    laufkraftTrend: string;
    pumpspeicherStatus: string;
    pegelstandAnalyse: string;
    projektUpdates: string[];
  };
  strategicTips: {
    topic: string;
    recommendation: string;
    targetGroup: ReportTargetGroup;
  }[];
  featuredTrends?: TrendItem[];
  /** First and last calendar day (Europe/Vienna) covered by the report data. */
  periodStart?: string;
  periodEnd?: string;
  /** Timestamp of the newest data point used for the report. */
  dataAsOf?: string | null;
  generatedAt?: string;
  generatedBy?: 'gemini' | 'data';
  model?: string;
  keyFigures?: Array<{ label: string; value: string }>;
  /** Weekly totals the report is based on (used for week-over-week comparison). */
  totals?: WeeklyStats['totals'];
  newsSources?: Array<{ title: string; link: string; source: string; pubDate: string }>;
}

export type ReportTargetGroup = 'Erzeuger' | 'Investoren' | 'Netzbetreiber' | 'Politik';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  sources?: string[];
}
