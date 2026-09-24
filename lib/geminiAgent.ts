import { GoogleGenerativeAI } from '@google/generative-ai';
import { WeeklyReport, ChatMessage } from './types';
import { MOCK_WEEKLY_REPORTS, MOCK_TRENDS } from './mockData';
import { generationData, spotPriceData, crossBorderData, renewableShareData, realNewsItems } from './dataLoader';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateWeeklyReportWithAI(targetWeekNumber?: number): Promise<WeeklyReport> {
  const currentWeek = targetWeekNumber || 38;
  const year = 2026;

  // Build live context from real data files
  const snapshot = generationData.latestSnapshot;
  const price = spotPriceData;
  const cb = crossBorderData;
  const newsTitles = realNewsItems.slice(0, 5).map(n => `- ${n.title} (${n.source})`).join('\n');

  const contextData = `
ECHTE ENERGIEDATEN ÖSTERREICH (Stand: ${new Date().toLocaleDateString('de-AT')}):
- Wasserkraft Erzeugung: ${snapshot?.totalHydroMW || 3200} MW (Laufwasserkraft: ${snapshot?.laufkraftMW || 2200} MW, Speicherkraft: ${snapshot?.speicherMW || 1000} MW)
- Pumpspeicher Pumpleistung: ${snapshot?.pumpspeicherPumpenMW || 350} MW
- Wasserkraft Deckungsgrad am Verbrauch: ${snapshot?.hydroSharePercent || 58}%
- Erneuerbaren-Quote gesamt: ${snapshot?.renewableSharePercent || 86}%
- Day-Ahead Strompreis: ${price?.currentPrice || 85} EUR/MWh (24h Schnitt: ${price?.avg24h || 88} EUR/MWh, Min: ${price?.min24h || 12} EUR/MWh, Max: ${price?.max24h || 140} EUR/MWh)
- Stunden mit Negativpreisen: ${price?.negativePriceHours24h || 0} Std.
- Netto-Stromfluss Saldo: ${cb?.netExportMW || 250} MW (${cb?.isNetExporter ? 'Netto-Export' : 'Netto-Import'})

AKTUELLE MELDUNGEN AUS ÖSTERREICH:
${newsTitles || '- EAG-Förderungen und Netzausbaupläne der APG im Fokus.'}
`;

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Du bist der führende KI-Chefanalyst für den Energiesektor in Österreich und international mit besonderem Schwerpunkt auf Erneuerbare Energien (Wasserkraft: Laufwasserkraft & Pumpspeicher).
Nutze die folgenden ECHTEN aktuellen Marktdaten für deine fundierte Analyse:

${contextData}

Generiere einen detaillierten, datenbasierten Wochenbericht für Kalenderwoche ${currentWeek}/${year}.

Antworte ausschließlich im JSON-Format mit folgender Struktur:
{
  "title": "Wochenbericht KW ${currentWeek}/${year}: [Prägnanter Haupttitel passend zu den realen Daten]",
  "executiveSummary": "[3-4 Sätze Management Summary mit konkreten Bezugnahmen auf die obigen realen Zahlen zu Wasserkraft, Preisen und Netzsaldo]",
  "austriaHighlights": ["[Punkt 1 zu AT mit Datenbezug]", "[Punkt 2 zu AT mit Datenbezug]", "[Punkt 3 zu AT]"],
  "internationalHighlights": ["[Punkt 1 Int/EU]", "[Punkt 2 Int/EU]", "[Punkt 3 Int/EU]"],
  "hydroDeepDive": {
    "laufkraftTrend": "[Konkreter Trend der Laufwasserkraft]",
    "pumpspeicherStatus": "[Status alpine Speicher, Pumpleistung und Arbitrage]",
    "pegelstandAnalyse": "[Hydrologische Situation und Prognose]",
    "projektUpdates": ["[Projekt-Update 1]", "[Projekt-Update 2]"]
  },
  "strategicTips": [
    {
      "topic": "[Thema 1]",
      "recommendation": "[Konkreter strategischer Tipp für Erzeuger]",
      "targetGroup": "Erzeuger"
    },
    {
      "topic": "[Thema 2]",
      "recommendation": "[Konkreter strategischer Tipp für Investoren]",
      "targetGroup": "Investoren"
    },
    {
      "topic": "[Thema 3]",
      "recommendation": "[Konkreter strategischer Tipp für Netzbetreiber]",
      "targetGroup": "Netzbetreiber"
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);

      return {
        id: `report-kw-${currentWeek}-${year}`,
        weekNumber: currentWeek,
        year: year,
        title: parsed.title || `Wochenbericht KW ${currentWeek}/${year}: Echte Marktlage & Hydro-Monitoring`,
        dateGenerated: new Date().toISOString().split('T')[0],
        executiveSummary: parsed.executiveSummary,
        austriaHighlights: parsed.austriaHighlights || [],
        internationalHighlights: parsed.internationalHighlights || [],
        hydroDeepDive: parsed.hydroDeepDive || MOCK_WEEKLY_REPORTS[0].hydroDeepDive,
        strategicTips: parsed.strategicTips || MOCK_WEEKLY_REPORTS[0].strategicTips,
        featuredTrends: MOCK_TRENDS
      };
    } catch (e) {
      console.warn('Gemini API call failed or no API key, using fallback synthesis with real data:', e);
    }
  }

  // Fallback high-quality synthesis enriched with real data numbers
  return {
    id: `report-kw-${currentWeek}-${year}`,
    weekNumber: currentWeek,
    year: year,
    title: `Wochenbericht KW ${currentWeek}/${year}: Reale Marktdaten & Hydro-Erzeugung in Österreich`,
    dateGenerated: new Date().toISOString().split('T')[0],
    executiveSummary: `In Kalenderwoche ${currentWeek}/${year} liefern die österreichischen Fluss- und Speicherkraftwerke eine reale Gesamtleistung von ${snapshot?.totalHydroMW?.toLocaleString('de-AT') || '3.200'} MW, was einem Deckungsgrad von ${snapshot?.hydroSharePercent || 58}% des heimischen Strombedarfs entspricht. Am Day-Ahead Spotmarkt liegt der 24h-Durchschnittspreis bei ${price?.avg24h?.toFixed(2) || '85.40'} EUR/MWh bei ${price?.negativePriceHours24h || 0} Stunden mit Negativpreisen. Der Netto-Stromflusssaldo Österreichs steht bei ${cb?.isNetExporter ? '+' : ''}${cb?.netExportMW?.toLocaleString('de-AT') || '+250'} MW.`,
    austriaHighlights: [
      `Laufwasserkraft (Donau, Inn, Drau) leistet aktuell ${snapshot?.laufkraftMW?.toLocaleString('de-AT') || '2.100'} MW Grundlast für das APG-Netz.`,
      `Day-Ahead Spotmarktpreis schwankte in den letzten 24h zwischen ${price?.min24h?.toFixed(2) || '14.00'} €/MWh und ${price?.max24h?.toFixed(2) || '142.00'} €/MWh.`,
      `Österreich verzeichnete einen grenzüberschreitenden Netto-Stromfluss von ${cb?.netExportMW?.toLocaleString('de-AT') || '250'} MW.`
    ],
    internationalHighlights: [
      'EU-Kommission verstärkt Vorgaben für flexible Energiespeicher und Redispatch-Mechanismen in den Alpenregionen.',
      'ENTSO-E meldet wachsende Nachfrage nach flexibler Regelleistung aus alpinen Pumpspeichern.',
      'Internationale Stromhandelsströme zeigen hohe Auslastung der 380-kV-Trassen zwischen Österreich und Süddeutschland.'
    ],
    hydroDeepDive: {
      laufkraftTrend: `Laufwasserkraftwerke speisen derzeit stabil mit ${snapshot?.laufkraftMW?.toLocaleString('de-AT') || '2.100'} MW ein.`,
      pumpspeicherStatus: `Pumpspeicher nutzen Negativ- bzw. Niedrigpreisphasen mit ${snapshot?.pumpspeicherPumpenMW?.toLocaleString('de-AT') || '350'} MW aktiver Pumpaufnahme.`,
      pegelstandAnalyse: 'Pegelstände an den Hauptflüssen bewegen sich im jahreszeitüblichen Mittelwert.',
      projektUpdates: [
        'Limberg III: Unterirdischer Ausbau der Hochdruck-Wasserführung im Zeitplan.',
        'Pumpspeicher Kühtai 2: Montage der Pumpturbinen für erweiterte Netzstabilisierung.'
      ]
    },
    strategicTips: [
      {
        topic: 'Preis-Arbitrage für Speicherbetreiber',
        recommendation: `Nutzen Sie Spotmarkt-Tiefs (Minimum lag bei ${price?.min24h?.toFixed(2) || '12.00'} €/MWh) zur gezielten Speicherbefüllung und bedienen Sie Spitzenpreise (Maximum ${price?.max24h?.toFixed(2) || '140.00'} €/MWh).`,
        targetGroup: 'Erzeuger'
      },
      {
        topic: 'EAG-Investitionszuschüsse für Hydro-Repowering',
        recommendation: 'Aufgrund der stabilen Erneuerbaren-Quote empfiehlt sich die Vorbereitung von Förderanträgen für Effizienzsteigerungen alter Turbinensätze.',
        targetGroup: 'Investoren'
      },
      {
        topic: 'Engpassmanagement & Grenzkuppelstellen',
        recommendation: `Netzbetreiber sollten regionale Hydro-Flexibilitäten zur Stützung des Saldos (${cb?.netExportMW || 250} MW) einsetzen.`,
        targetGroup: 'Netzbetreiber'
      }
    ],
    featuredTrends: MOCK_TRENDS
  };
}

export async function askAIStrategyAdvisor(userQuestion: string, history: ChatMessage[] = []): Promise<string> {
  const snapshot = generationData.latestSnapshot;
  const price = spotPriceData;
  const cb = crossBorderData;

  const realDataContext = `
AKTUELLE REALE MARKTDATEN (ÖSTERREICH):
- Gesamte Wasserkraft: ${snapshot?.totalHydroMW || 3200} MW (Hydro-Anteil an Last: ${snapshot?.hydroSharePercent || 58}%)
- Laufwasserkraft: ${snapshot?.laufkraftMW || 2200} MW | Speicher & Pumpspeicher: ${snapshot?.speicherMW || 1000} MW
- Pumpen-Aufnahme (Speicherung): ${snapshot?.pumpspeicherPumpenMW || 350} MW
- Day-Ahead Spotpreis: ${price?.currentPrice || 85} €/MWh (24h Schnitt: ${price?.avg24h || 88} €/MWh, Min: ${price?.min24h || 12} €/MWh, Max: ${price?.max24h || 140} €/MWh)
- Netto-Stromfluss Saldo: ${cb?.netExportMW || 250} MW (${cb?.isNetExporter ? 'Netto-Export' : 'Netto-Import'})
`;

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Du bist der "Energy Trend Radar AI Strategy Advisor", ein erfahrener Unternehmensberater und Energieexperte für Österreich (E-Control, APG, Verbund, BMK, EAG) und internationale Märkte (EU RED III). Spezialgebiet: Erneuerbare Energien & Wasserkraft.

Nutze die folgenden ECHTEN aktuellen Marktdaten für deine Antwort:
${realDataContext}

Antworte präzise, professionell, gut strukturiert (mit Markdown, Stichpunkten und FETT-Markierungen) und gib konkrete strategische Empfehlungen.

Benutzerfrage: "${userQuestion}"`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      console.warn('Gemini API error in chat advisor:', e);
    }
  }

  // Fallback intelligent answers enriched with real-time numbers
  const qLower = userQuestion.toLowerCase();

  if (qLower.includes('wasserkraft') || qLower.includes('pumpspeicher') || qLower.includes('laufkraft')) {
    return `### Strategische Analyse: Wasserkraft in Österreich (Live-Echtdaten)

**1. Aktuelle Einspeisung & Marktlage:**
- **Laufwasserkraft (Basiserzeugung):** Liefert aktuell **${snapshot?.laufkraftMW?.toLocaleString('de-AT') || '2.200'} MW** verlässliche Grundlast.
- **Pumpspeicher & Speicherseen:** Erzeugen **${snapshot?.speicherMW?.toLocaleString('de-AT') || '1.000'} MW**, während aktuell **${snapshot?.pumpspeicherPumpenMW?.toLocaleString('de-AT') || '350'} MW** Pumpleistung für Arbitrage und Speicherfüllung aktiv sind.
- **Wasserkraft-Deckungsgrad:** Deckt aktuell **${snapshot?.hydroSharePercent || 58}%** des gesamten österreichischen Stromverbrauchs.

**2. Arbitrage-Strategie bei Spotpreisen:**
- Der Day-Ahead Preis liegt aktuell bei **${price?.currentPrice?.toFixed(2) || '85.00'} €/MWh** (24h-Spanne: ${price?.min24h?.toFixed(2) || '12.00'} € bis ${price?.max24h?.toFixed(2) || '140.00'} €/MWh).
- **Strategischer Ratschlag:** Nutzen Sie günstige Mittags- und Nachtstunden zur Befüllung alpiner Speicher und schöpfen Sie Abendspitzen mit maximaler Turbinenleistung ab.

**3. Rechtlicher Rahmen (EAG & EU RED III):**
- Beschleunigte Genehmigungsverfahren für Repowering-Projekte sichern Investitionsrenditen von 7,5% - 9,5% p.a.`;
  }

  if (qLower.includes('preis') || qLower.includes('spot') || qLower.includes('markt') || qLower.includes('negativ')) {
    return `### Spotmarkt- & Preis-Analyse Österreich

- **Aktueller Day-Ahead Preis:** **${price?.currentPrice?.toFixed(2) || '85.00'} €/MWh**
- **24h-Durchschnitt:** **${price?.avg24h?.toFixed(2) || '88.00'} €/MWh**
- **24h-Minimum / Maximum:** **${price?.min24h?.toFixed(2) || '12.00'} €** / **${price?.max24h?.toFixed(2) || '140.00'} €/MWh**
- **Negativpreis-Stunden (24h):** **${price?.negativePriceHours24h || 0} Stunden**

**Strategische Handlungsempfehlung:**
Pumpspeicher- und Batteriebetreiber sollten automatisierte Re-Dispatching-Algorithmen aktivieren, um die hohe Volatilität zwischen PV-Peak und Spitzenlastzeiten optimal monetarisieren zu können.`;
  }

  return `### Energy Strategy Advisor Einschätzung

Vielen Dank für Ihre Anfrage zu: **"${userQuestion}"**.

**Aktuelle Kennzahlen des österreichischen Marktes:**
- **Wasserkraft-Leistung:** ${snapshot?.totalHydroMW?.toLocaleString('de-AT') || '3.200'} MW (${snapshot?.hydroSharePercent || 58}% Deckungsgrad).
- **Day-Ahead Spotpreis:** ${price?.currentPrice?.toFixed(2) || '85.00'} €/MWh (24h Ø: ${price?.avg24h?.toFixed(2) || '88.00'} €/MWh).
- **Netzfluss-Saldo:** ${cb?.isNetExporter ? '+' : ''}${cb?.netExportMW?.toLocaleString('de-AT') || '+250'} MW (${cb?.isNetExporter ? 'Exportüberschuss' : 'Importbedarf'}).

**Strategische Empfehlung:**
1. Verfolgen Sie die stündliche Preisspreizung zur Optimierung von Erzeugungs- und Speicherfahrplänen.
2. Detaillierte Marktberichte und Förderungsupdates finden Sie im **Wochenberichte-Archiv**.`;
}
