import { GoogleGenerativeAI } from '@google/generative-ai';
import { WeeklyReport, ChatMessage } from './types';
import { MOCK_WEEKLY_REPORTS } from './mockData';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateWeeklyReportWithAI(targetWeekNumber?: number): Promise<WeeklyReport> {
  const currentWeek = targetWeekNumber || 34;
  const year = 2026;

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Du bist der führende KI-Analyst für den Energiesektor in Österreich und international mit besonderem Schwerpunkt auf Erneuerbare Energien (Wasserkraft: Laufwasserkraft & Pumpspeicher).
Generiere einen detaillierten wöchentlichen Markt- & Trendbericht für Kalenderwoche ${currentWeek}/${year}.

Antworte ausschließlich im JSON-Format mit folgender Struktur:
{
  "title": "Wochenbericht KW ${currentWeek}/${year}: [Prägnanter Haupttitel]",
  "executiveSummary": "[3-4 Sätze Management Summary mit Fokus auf Österreich, Wasserkraft, Pegelstände und Markt]",
  "austriaHighlights": ["[Punkt 1 zu AT]", "[Punkt 2 zu AT]", "[Punkt 3 zu AT]"],
  "internationalHighlights": ["[Punkt 1 Int/EU]", "[Punkt 2 Int/EU]", "[Punkt 3 Int/EU]"],
  "hydroDeepDive": {
    "laufkraftTrend": "[Trend Laufwasserkraft Donau/Inn/Enns]",
    "pumpspeicherStatus": "[Status alpine Speicher & Netzdienstleistung]",
    "pegelstandAnalyse": "[Niederschlag & Pegelstand-Prognose]",
    "projektUpdates": ["[Projekt 1]", "[Projekt 2]"]
  },
  "strategicTips": [
    {
      "topic": "[Thema 1]",
      "recommendation": "[Konkreter strategischer Tipp]",
      "targetGroup": "Erzeuger"
    },
    {
      "topic": "[Thema 2]",
      "recommendation": "[Konkreter strategischer Tipp]",
      "targetGroup": "Investoren"
    },
    {
      "topic": "[Thema 3]",
      "recommendation": "[Konkreter strategischer Tipp]",
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
        title: parsed.title || `Wochenbericht KW ${currentWeek}/${year}`,
        dateGenerated: new Date().toISOString().split('T')[0],
        executiveSummary: parsed.executiveSummary,
        austriaHighlights: parsed.austriaHighlights || [],
        internationalHighlights: parsed.internationalHighlights || [],
        hydroDeepDive: parsed.hydroDeepDive || MOCK_WEEKLY_REPORTS[0].hydroDeepDive,
        strategicTips: parsed.strategicTips || MOCK_WEEKLY_REPORTS[0].strategicTips,
        featuredTrends: MOCK_WEEKLY_REPORTS[0].featuredTrends
      };
    } catch (e) {
      console.warn('Gemini API call failed or no API key, using fallback synthesis:', e);
    }
  }

  // Fallback high-quality synthesis
  const baseReport = MOCK_WEEKLY_REPORTS[0];
  return {
    ...baseReport,
    id: `report-kw-${currentWeek}-${year}`,
    weekNumber: currentWeek,
    year: year,
    title: `Wochenbericht KW ${currentWeek}/${year}: Strategischer Hydro-Ausbau & Netzintegration in Österreich`,
    dateGenerated: new Date().toISOString().split('T')[0],
    executiveSummary: `In der Kalenderwoche ${currentWeek}/${year} verzeichnet Österreich dank hoher hydrologischer Zuflüsse an Donau und Inn eine hervorragende Erzeugung aus Laufwasserkraft. Die alpinen Speicherkraftwerke erreichen optimale Füllstände für den bevorstehenden Herbst. International rücken EU-Regulierungen für beschleunigte UVP-Verfahren bei Pumpspeichern in den Fokus.`,
  };
}

export async function askAIStrategyAdvisor(userQuestion: string, history: ChatMessage[] = []): Promise<string> {
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Du bist der "Energy Trend Radar AI Strategy Advisor", ein erfahrener Unternehmensberater und Energieexperte für Österreich (E-Control, APG, Verbund, BMK, EAG) und internationale Märkte (EU RED III). Spezialgebiet: Erneuerbare Energien & Wasserkraft.
Antworte präzise, professionell, gut strukturiert (mit Stichpunkten und FETT-Markierungen) und gib konkrete strategische Empfehlungen.

Benutzerfrage: "${userQuestion}"`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      console.warn('Gemini API error in chat advisor:', e);
    }
  }

  // Fallback intelligent answers based on keywords
  const qLower = userQuestion.toLowerCase();

  if (qLower.includes('wasserkraft') || qLower.includes('pumpspeicher') || qLower.includes('laufkraft')) {
    return `### Strategische Analyse: Wasserkraft in Österreich

**1. Laufwasserkraft (Basiserzeugung):**
- **Potenzial:** Repowering bestehender Anlagen an Donau, Mur & Drau bietet bis zu **+12% Effizienz** ohne langwierige neue Neubau-UVPs.
- **Tipp:** Nutzen Sie aktuelle Fördercalls nach dem Erneuerbaren-Ausbau-Gesetz (EAG).

**2. Pumpspeicher (Netzflexibilität & Arbitrage):**
- **Markttrend:** Durch PV-Überschüsse zur Mittagszeit entstehen vermehrt **Negativpreise am Spotmarkt**.
- **Strategischer Ratschlag:** Pumpspeicher sollten gezielt zur Mittagszeit billig Strom aufnehmen und bei der Abendspitze (18:00 - 21:00 Uhr) mit hohem Deckungsbeitrag einspeisen.

**3. Rechtlicher Rahmen (EU RED III):**
- Beschleunigte Genehmigungsverfahren ("überragendes öffentliches Interesse") verkürzen Prüfzeiten von bisher 3-5 Jahren auf unter 18 Monate.`;
  }

  if (qLower.includes('förderung') || qLower.includes('eag') || qLower.includes('investition')) {
    return `### Förderungs- & Investitions-Leitfaden Österreich (2026)

- **EAG Investitionszuschüsse:** Förderaufrufe für Wasserkraft-Modernisierungen und PV-Kopplung sind derzeit stark nachgefragt.
- **Strategische Empfehlung:**
  1. Frühzeitige Abstimmung mit der **E-Control** und dem **BMK**.
  2. Nachweis von ökologischen Begleitmaßnahmen (Fischaufstiegshilfen, Fluss-Renaturierung) erhöht die Förderwahrscheinlichkeit um ca. 25%.
  3. Eigenkapitalrendite bei gut geförderten Wasserkraft-Repowerings liegt stabil bei **7,5% - 9,2%**.`;
  }

  return `### Energy Strategy Advisor Einschätzung

Vielen Dank für Ihre Anfrage zu: **"${userQuestion}"**.

**Zusammenfassung der aktuellen Marktlage in Österreich & EU:**
- **Wasserkraft-Fokus:** Österreich deckt über 60% seines Strombedarfs aus Wasserkraft. Die Kombination aus Donau-Laufkraft und alpinen Pumpspeichern ist der entscheidende Wettbewerbsvorteil im europäischen Verbundnetz (ENTSO-E).
- **Netzintegration:** Die **APG (Austrian Power Grid)** fordert verstärkten Ausbau von 380-kV-Leitungen und dezentralen Speichern, um Re-Dispatch-Kosten zu senken.

**Empfohlenes weiteres Vorgehen:**
1. Prüfen Sie die spezifischen Netzzugangsbedingungen bei Ihrem lokalen Verteilernetzbetreiber.
2. Beobachten Sie die wöchentlichen Marktberichte in unserem **Report-Archiv**.`;
}
