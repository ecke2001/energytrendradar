import { TrendItem, HydroMetric, WeeklyReport } from './types';

export const MOCK_TRENDS: TrendItem[] = [
  {
    id: 'trend-1',
    title: 'Pumpspeicher-Ausbau in Tirol & Salzburg erreicht neuen Rekordwert',
    summary: 'Der Verbund und die TIWAG treiben Erweiterungen von Pumpspeicherkraftwerken (u.a. Limberg III und Kühtai 2) zügig voran. Die Speicherkapazität soll bis 2027 um über 35% gesteigert werden, um Spitzenlasten aus PV-Überschüssen effizient aufzunehmen.',
    region: 'Austria',
    sector: 'Wasserkraft',
    hydroType: 'Pumpspeicher',
    impact: 'Hoch',
    date: '2026-08-10',
    source: 'E-Control & Verbund AG',
    sourceUrl: 'https://www.e-control.at',
    metrics: {
      label: 'Zusätzliche Speicherkapazität',
      value: '+1.450 MW',
      change: '+35%',
      isPositive: true
    },
    keyTakeaway: 'Pumpspeicher fungieren als das primäre "grüne Netz-Rückgrat" Österreichs zur Stabilisierung der europäischen Strombörse bei PV-Spitzen.'
  },
  {
    id: 'trend-2',
    title: 'EAG-Fördercall 2026: Rekordinteresse an Wasserkraft-Modernisierung',
    summary: 'Im aktuellen Förderaufruf nach dem Erneuerbaren-Ausbau-Gesetz (EAG) wurden besonders viele Anträge für die Effizienzsteigerung bestehender Laufwasserkraftwerke an Donau, Mur und Enns eingereicht.',
    region: 'Austria',
    sector: 'Wasserkraft',
    hydroType: 'Laufkraft',
    impact: 'Strategisch',
    date: '2026-08-08',
    source: 'BMK (Klimaschutzministerium)',
    sourceUrl: 'https://www.bmk.gv.at',
    metrics: {
      label: 'Beantragtes Fördervolumen',
      value: '185 Mio. €',
      change: '+18% y/y',
      isPositive: true
    },
    keyTakeaway: 'Repowering alter Turbinen bringt bis zu 12% Mehrertrag ohne zusätzlichen Flächen- oder Gewässereingriff.'
  },
  {
    id: 'trend-3',
    title: 'EU RED III Richtlinie: Beschleunigte Genehmigungen für Hydro & Speicher',
    summary: 'Die Europäische Kommission deklariert Wasserkraft und Pumpspeicher offiziell als "überragendes öffentliches Interesse". Das verkürzt Umweltverträglichkeitsprüfungen (UVP) in allen EU-Mitgliedsstaaten auf maximal 12–18 Monate.',
    region: 'EU',
    sector: 'Politik & Recht',
    hydroType: 'Allgemein',
    impact: 'Hoch',
    date: '2026-08-06',
    source: 'EU Energy Commission',
    metrics: {
      label: 'UVP Verfahrensdauer',
      value: '14 Monate im Schnitt',
      change: '-50%',
      isPositive: true
    },
    keyTakeaway: 'Projektentwickler in Österreich können Genehmigungsrisiken deutlich rascher evaluieren und Kapital sichern.'
  },
  {
    id: 'trend-4',
    title: 'APG Netzbericht: Negativpreise im Sommer verlangen flexible Hydro-Steuerung',
    summary: 'Durch massive Solareinspeisung an Wochenenden im Juli/August stieg die Zahl der Stunden mit negativen Spotmarktpreisen. Laufwasserkraftwerke nutzen dynamisches Re-Dispatching, während Speicher gezielt günstig hochpumpen.',
    region: 'Austria',
    sector: 'Markt & Preise',
    hydroType: 'Pumpspeicher',
    impact: 'Hoch',
    date: '2026-08-04',
    source: 'Austrian Power Grid (APG)',
    sourceUrl: 'https://www.apg.at',
    metrics: {
      label: 'Stunden mit Negativpreis',
      value: '142 Std. (Q2/Q3)',
      change: '+40 Std.',
      isPositive: false
    },
    keyTakeaway: 'Arbitrage-Chancen für Pumpspeicher steigen stark an: Billigstrom pumpen, zu Abendspitzen mit Wasserkraft verkaufen.'
  },
  {
    id: 'trend-5',
    title: 'Internationale Wasserkraft-Innovation: Digital Twin & KI-Turbinenwartung',
    summary: 'Internationale Betreiber (Schweiz, Norwegen, Kanada) setzen vermehrt auf KI-gestützte Prädiktiv-Wartung für Großturbinen. Ausfallzeiten reduzieren sich um bis zu 30%, Betriebslebensdauer steigt signifikant.',
    region: 'International',
    sector: 'Wasserkraft',
    hydroType: 'Allgemein',
    impact: 'Mittel',
    date: '2026-08-01',
    source: 'International Hydropower Association (IHA)',
    metrics: {
      label: 'Reduktion ungeplanter Ausfälle',
      value: '-30%',
      isPositive: true
    },
    keyTakeaway: 'Sensorgestütztes KI-Monitoring wird zum Industriestandard für alpine Speicherkraftwerke.'
  },
  {
    id: 'trend-6',
    title: 'Wasserstoff-Elektrolyse an österreichischen Laufkraftwerken im Test',
    summary: 'Piloteinrichtungen an der Donau testen die direkte Kopplung von Laufwasserkraft mit PEM-Elektrolyseuren zur Erzeugung von grünem Wasserstoff für die heimische Stahl- und Chemieindustrie.',
    region: 'Austria',
    sector: 'Wasserstoff',
    hydroType: 'Laufkraft',
    impact: 'Strategisch',
    date: '2026-07-28',
    source: 'Energie AG & Voestalpine',
    metrics: {
      label: 'Grüner H2 Ausstoß Testphase',
      value: '4.500 Tonnen/Jahr',
      isPositive: true
    },
    keyTakeaway: 'Grundlastfähiger Wasserstoff aus Flusskraftwerken bietet stabile Industriepreise unabhängig von Wind/Sonne.'
  }
];

export const MOCK_HYDRO_METRICS: HydroMetric[] = [
  { date: 'KW 28', laufkraftGWh: 820, pumpspeicherGWh: 340, pegelstandIndex: 88, oesterreichExportNettoGWh: 180 },
  { date: 'KW 29', laufkraftGWh: 850, pumpspeicherGWh: 310, pegelstandIndex: 92, oesterreichExportNettoGWh: 220 },
  { date: 'KW 30', laufkraftGWh: 890, pumpspeicherGWh: 390, pegelstandIndex: 95, oesterreichExportNettoGWh: 310 },
  { date: 'KW 31', laufkraftGWh: 860, pumpspeicherGWh: 420, pegelstandIndex: 90, oesterreichExportNettoGWh: 280 },
  { date: 'KW 32', laufkraftGWh: 910, pumpspeicherGWh: 460, pegelstandIndex: 94, oesterreichExportNettoGWh: 350 },
  { date: 'KW 33 (Aktuell)', laufkraftGWh: 930, pumpspeicherGWh: 490, pegelstandIndex: 96, oesterreichExportNettoGWh: 390 },
];

export const MOCK_WEEKLY_REPORTS: WeeklyReport[] = [
  {
    id: 'report-kw-33-2026',
    weekNumber: 33,
    year: 2026,
    title: 'Wochenbericht KW 33/2026: Hydro-Hochkonjunktur & Strategische Speicherarbitrage',
    dateGenerated: '2026-08-12',
    executiveSummary: 'Die Kalenderwoche 33 zeigt ein starkes hydrologisches Jahr in Österreich. Dank stabiler Pegelstände an Donau, Inn und Enns lag die Laufwasserkraft-Erzeugung 12% über dem 5-Jahres-Mittel. Gleichzeitig profitierten Pumpspeicherkraftwerke von hohen Preisspreizungen zwischen sonnenreichen Mittagsstunden (Negativpreise) und Abendspitzen.',
    austriaHighlights: [
      'Erneuerbaren-Anteil an der Gesamterzeugung in AT stieg temporär auf 91,4%.',
      'APG meldet stabilen Exportüberschuss von 390 GWh in Nachbarländer.',
      'Klimaschutzministerium stellt zusätzliche Mittel für Fluss-Renaturierung & Fischaufstiegshilfen bei Wasserkraftwerken bereit.'
    ],
    internationalHighlights: [
      'EU-Kommission genehmigt österreichische Beihilfen für Wasserkraft-Modernisierung im Rahmen des EAG.',
      'Schweizer Strombörse verzeichnet steigende Nachfrage nach alpiner flexibler Speicherenergie.',
      'Globaler Wasserkraft-Report verzeichnet 32 GW Zubau weltweit, mit Führenden Regionen Nordamerika und Skandinavien.'
    ],
    hydroDeepDive: {
      laufkraftTrend: 'Laufwasserkraftwerke arbeiten aktuell im Volllastbereich. Die Donaukraftwerke lieferten in KW 33 im Schnitt 510 MW Dauerleistung.',
      pumpspeicherStatus: 'Füllstand der alpinen Jahresspeicher (Kaprun, Schopsdorf, Tauern) liegt bei 96% der Höchstkapazität.',
      pegelstandAnalyse: 'Schmelzwasser und sommerliche Niederschläge garantieren auch für KW 34 hervorragende Erzeugungsvoraussetzungen.',
      projektUpdates: [
        'Limberg III: Rohbauarbeiten am unterirdischen Maschinenkavernen-Komplex zu 85% abgeschlossen.',
        'Kraftwerk Toggenburg: Neue Kaplan-Turbinen erfolgreich synchronisiert.'
      ]
    },
    strategicTips: [
      {
        topic: 'Speicher-Flexibilität nutzen',
        recommendation: 'Betreiber von Pumpspeichern sollten automatisierte Algorithmen für die Tag-Nacht-Arbitrage verschärfen, um Negativpreis-Fenster zur günstigen Befüllung voll auszuschöpfen.',
        targetGroup: 'Erzeuger'
      },
      {
        topic: 'EAG-Förderfenster sichern',
        recommendation: 'Investoren sollten Anträge für Repowering-Projekte vor der nächsten Tranche im Herbst finalisieren, da vereinfachte UVP-Kriterien greifen.',
        targetGroup: 'Investoren'
      },
      {
        topic: 'Engpassmanagement & Redispatch',
        recommendation: 'Netzbetreiber im Westen Österreichs sollten verstärkt regionale Hydro-Flexibilitäten zur Entlastung der 380-kV-Leitung einplanen.',
        targetGroup: 'Netzbetreiber'
      }
    ],
    featuredTrends: MOCK_TRENDS.slice(0, 4)
  }
];
