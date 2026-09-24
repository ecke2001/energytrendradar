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

export interface HydroMetric {
  date: string;
  laufkraftGWh: number;
  pumpspeicherGWh: number;
  pegelstandIndex: number; // 0 - 100%
  oesterreichExportNettoGWh: number;
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
  latestSnapshot: GenerationSnapshot;
  series: GenerationDataPoint[];
}

export interface SpotPricePoint {
  timestamp: number;
  time: string;
  price: number;
}

export interface SpotPriceData {
  unit: string;
  currentPrice: number;
  avg24h: number;
  min24h: number;
  max24h: number;
  negativePriceHours24h: number;
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
}

export interface RenewableShareData {
  currentPercent: number;
  trend: Array<number | null>;
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  summary: string;
}

export interface AppMetadata {
  lastUpdated: string;
  lastUpdatedFormatted: string;
  version: string;
  sources: Array<{ name: string; url: string; license?: string }>;
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
    targetGroup: 'Erzeuger' | 'Investoren' | 'Netzbetreiber' | 'Politik';
  }[];
  featuredTrends: TrendItem[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  sources?: string[];
}
