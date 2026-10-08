// Rule-based advisor answers built from the bundled data. Used when no AI
// backend is reachable (e.g. on the static Hugging Face Space). Safe for the
// client bundle: no API keys, no SDK.

import { generationData, spotPriceData, crossBorderData, getLastUpdatedText } from './dataLoader';
import { computePriceNow, priceWindowLabel } from './priceNow';

/** Spot price values for the time of the question (fall back to the stored values). */
const priceNow = () => computePriceNow(spotPriceData, Math.floor(Date.now() / 1000));
const livePrice = () => priceNow().price ?? undefined;

const mw = (v: number | undefined) => (typeof v === 'number' ? `${v.toLocaleString('de-AT')} MW` : '–');
const eur = (v: number | undefined) => (typeof v === 'number' ? `${v.toFixed(2)} €/MWh` : '–');

export function buildMarketContext(): string {
  const s = generationData?.latestSnapshot;
  const p = spotPriceData;
  const cb = crossBorderData;
  return [
    `AKTUELLE MESSDATEN ÖSTERREICH (Stand ${getLastUpdatedText()}):`,
    `- Wasserkraft gesamt: ${mw(s?.totalHydroMW)} (${s?.hydroSharePercent ?? '–'} % der Last)`,
    `- Laufwasserkraft: ${mw(s?.laufkraftMW)} | Speicher & Pumpspeicher: ${mw(s?.speicherMW)} | Pumpbetrieb: ${mw(s?.pumpspeicherPumpenMW)}`,
    `- Day-Ahead Spotpreis: ${eur(livePrice())} (${priceWindowLabel(p)} Ø ${eur(p?.avg24h)}, Min ${eur(p?.min24h)}, Max ${eur(p?.max24h)})`,
    `- Netto-Stromfluss: ${mw(cb?.netExportMW)} (${cb?.isNetExporter ? 'Netto-Export' : 'Netto-Import'})`,
  ].join('\n');
}

export function buildAdvisorAnswer(question: string): string {
  const s = generationData?.latestSnapshot;
  const p = spotPriceData;
  const cb = crossBorderData;
  const q = question.toLowerCase();

  if (/wasserkraft|pumpspeicher|laufkraft|speicher/.test(q)) {
    return `### Wasserkraft in Österreich (Messdaten, Stand ${getLastUpdatedText()})

**1. Einspeisung**
- **Laufwasserkraft:** ${mw(s?.laufkraftMW)}
- **Speicher & Pumpspeicher (Turbine):** ${mw(s?.speicherMW)}, Pumpbetrieb: ${mw(s?.pumpspeicherPumpenMW)}
- **Deckungsgrad:** ${s?.hydroSharePercent ?? '–'} % der aktuellen Netzlast

**2. Preissignal für Speicher**
- Day-Ahead aktuell ${eur(livePrice())}, Spanne der letzten ${priceWindowLabel(p)}: ${eur(p?.min24h)} bis ${eur(p?.max24h)}.
- Günstige Stunden (Mittag, Nacht) für den Pumpbetrieb, Abendspitzen für den Turbinenbetrieb nutzen.`;
  }

  if (/preis|spot|markt|negativ/.test(q)) {
    return `### Spotmarkt Österreich (Stand ${getLastUpdatedText()})

- **Aktueller Day-Ahead-Preis:** ${eur(livePrice())}
- **Durchschnitt (${priceWindowLabel(p)}):** ${eur(p?.avg24h)}
- **Minimum / Maximum (${priceWindowLabel(p)}):** ${eur(p?.min24h)} / ${eur(p?.max24h)}
- **Stunden mit Negativpreisen (${priceWindowLabel(p)}):** ${p?.negativePriceHours24h ?? '–'}
${typeof priceNow().nextDayAvg === 'number' ? `- **Morgen (Ø Day-Ahead):** ${eur(priceNow().nextDayAvg as number)}\n` : ''}
Flexible Erzeuger und Speicher profitieren von der Spreizung zwischen PV-Mittag und Abendspitze.`;
  }

  return `### Einschätzung (Stand ${getLastUpdatedText()})

Ihre Frage: **"${question.slice(0, 300)}"**

**Aktuelle Kennzahlen:**
- **Wasserkraft:** ${mw(s?.totalHydroMW)} (${s?.hydroSharePercent ?? '–'} % Deckungsgrad)
- **Day-Ahead Spotpreis:** ${eur(livePrice())} (${priceWindowLabel(p)} Ø ${eur(p?.avg24h)})
- **Netto-Stromfluss:** ${mw(cb?.netExportMW)} (${cb?.isNetExporter ? 'Exportüberschuss' : 'Importbedarf'})

Ausführliche Auswertungen finden Sie im **Wochenbericht-Archiv**.`;
}
