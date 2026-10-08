// Generates/refreshes the weekly report from data/*.json and stores it in the
// archive data/reports.json. Runs in GitHub Actions after fetch-data.
//
// With GEMINI_API_KEY the prose is written by Gemini (validated), otherwise a
// purely data-driven report is produced. Key figures always come from data.

import fs from 'fs';
import path from 'path';
import type { AppMetadata, CrossBorderData, GenerationData, NewsItem, SpotPriceData, WeeklyReport, WeeklyStats } from '../lib/types';
import { addDays, ageInHours, viennaDateKey } from '../lib/time';
import { describeError, fetchText } from './lib/http';
import {
  applyAiReport,
  buildDataReport,
  buildGeminiPrompt,
  needsRefresh,
  parseModelJson,
  reportFrame,
  upsertReport,
  validateAiReport,
  type ReportInput,
} from './lib/report';

const DATA_DIR = path.join(process.cwd(), 'data');
const MAX_DATA_AGE_HOURS = Number(process.env.MAX_DATA_AGE_HOURS || 36);
const REPORT_REFRESH_HOURS = Number(process.env.REPORT_REFRESH_HOURS || 20);
// Tried in order; the first model that answers wins. Override with GEMINI_MODEL.
const GEMINI_MODELS = Array.from(new Set(
  [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-flash-latest'].filter((m): m is string => Boolean(m && m.trim())),
));

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) as T;
  } catch {
    return null;
  }
}

async function askGemini(prompt: string, apiKey: string): Promise<{ answer: string; model: string } | null> {
  for (const model of GEMINI_MODELS) {
    if (!/^[\w.-]+$/.test(model)) {
      console.warn(`  ⚠️  Ungültiger Modellname ignoriert: ${model.slice(0, 40)}`);
      continue;
    }
    try {
      const body = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 8192 },
      });
      const raw = await fetchText(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        body,
        // Key in a header, never in the URL, so it cannot end up in logs.
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        retries: 2,
        timeoutMs: 90000,
        maxBytes: 2 * 1024 * 1024,
      });
      const json = JSON.parse(raw);
      const parts: Array<{ text?: string }> = json?.candidates?.[0]?.content?.parts ?? [];
      const answer = parts.map(p => p.text ?? '').join('');
      if (answer) return { answer, model };
      console.warn(`  ⚠️  ${model}: leere Antwort (${json?.candidates?.[0]?.finishReason ?? 'unbekannt'})`);
    } catch (err) {
      console.warn(`  ⚠️  ${model}: ${describeError(err)}`);
    }
  }
  return null;
}

async function main() {
  const now = new Date();
  const today = viennaDateKey(Math.floor(now.getTime() / 1000));

  const generation = readJson<GenerationData>('generation.json');
  const meta = readJson<AppMetadata>('meta.json');
  if (!generation?.latestSnapshot) {
    console.error('::error::data/generation.json fehlt oder ist ungültig – kein Bericht möglich');
    process.exit(1);
  }

  const age = ageInHours(meta?.dataAsOf ?? generation.latestSnapshot.date, now);
  if (age === null || age > MAX_DATA_AGE_HOURS) {
    // Never present old data as a current report; the freshness check reports the problem.
    console.warn(`::warning::Erzeugungsdaten sind ${age === null ? 'ohne Zeitstempel' : `${Math.round(age)} h alt`} – Bericht wird nicht aktualisiert.`);
    return;
  }

  const weeklyRaw = readJson<WeeklyStats>('weekly-stats.json');
  const weekly = weeklyRaw && weeklyRaw.periodEnd >= addDays(today, -2) ? weeklyRaw : null;
  if (!weekly) console.warn('::warning::Keine aktuellen Wochenwerte – Bericht basiert auf der Momentaufnahme.');

  const archive = (readJson<WeeklyReport[]>('reports.json') ?? []).filter(r => r && typeof r.id === 'string');
  const frame = reportFrame({ today, weekly });
  const existing = archive.find(r => r.id === frame.id);
  const apiKey = process.env.GEMINI_API_KEY?.trim() || '';

  const input: ReportInput = {
    today,
    nowIso: now.toISOString(),
    generation,
    prices: readJson<SpotPriceData>('prices.json'),
    crossBorder: readJson<CrossBorderData>('cross-border.json'),
    weekly,
    news: readJson<NewsItem[]>('news.json') ?? [],
    previous: archive.find(r => r.id !== frame.id) ?? null,
  };

  let report = buildDataReport(input);

  if (!needsRefresh(existing, report, now, REPORT_REFRESH_HOURS, apiKey !== '')) {
    console.log(`ℹ️  Bericht ${frame.id} bleibt unverändert (erstellt ${existing?.generatedAt}, Zeitraum bis ${existing?.periodEnd}).`);
    return;
  }

  if (apiKey) {
    console.log(`🤖 Erzeuge Berichtstext mit Gemini (${GEMINI_MODELS.join(' → ')})...`);
    const result = await askGemini(buildGeminiPrompt(input, report), apiKey);
    const ai = result ? validateAiReport(parseModelJson(result.answer)) : null;
    if (result && ai) {
      report = applyAiReport(report, ai, result.model);
    } else {
      console.warn(`::warning::Gemini-Antwort ${result ? 'ungültig' : 'nicht verfügbar'} – datenbasierter Bericht wird verwendet.`);
    }
  } else {
    console.log('ℹ️  Kein GEMINI_API_KEY – datenbasierter Bericht.');
  }

  const updated = upsertReport(archive, report);
  const target = path.join(DATA_DIR, 'reports.json');
  fs.writeFileSync(`${target}.tmp`, `${JSON.stringify(updated, null, 2)}\n`);
  fs.renameSync(`${target}.tmp`, target);
  console.log(`✅ ${report.title} (${report.generatedBy}${report.model ? `, ${report.model}` : ''}) – Archiv: ${updated.length} Berichte`);
}

main().catch(err => {
  console.error('Fatal report generation error:', describeError(err));
  process.exit(1);
});
