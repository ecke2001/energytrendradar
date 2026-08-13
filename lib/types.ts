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
