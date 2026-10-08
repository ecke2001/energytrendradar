// Usage: tsx scripts/validate-data.ts [--schema] [--freshness]   (default: both)

import fs from 'fs';
import path from 'path';
import { viennaDateKey } from '../lib/time';
import { checkFreshness, checkSchema, type DataFiles } from './lib/validate';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILES = [
  'generation.json', 'prices.json', 'cross-border.json', 'renewable-share.json',
  'news.json', 'meta.json', 'weekly-stats.json', 'reports.json',
];

const args = process.argv.slice(2);
const runSchema = args.length === 0 || args.includes('--schema');
const runFreshness = args.length === 0 || args.includes('--freshness');

const files: DataFiles = {};
const errors: string[] = [];
for (const file of FILES) {
  try {
    files[file] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch {
    files[file] = null;
    if (file !== 'weekly-stats.json') errors.push(`${file}: fehlt oder ist kein gültiges JSON`);
  }
}

if (runSchema) errors.push(...checkSchema(files));

const warnings: string[] = [];
if (runFreshness) {
  const now = new Date();
  const result = checkFreshness(files, now, viennaDateKey(Math.floor(now.getTime() / 1000)), {
    maxDataAgeHours: Number(process.env.MAX_DATA_AGE_HOURS || 36),
    maxReportAgeDays: Number(process.env.MAX_REPORT_AGE_DAYS || 8),
  });
  errors.push(...result.errors);
  warnings.push(...result.warnings);
}

warnings.forEach(w => console.warn(`::warning::${w}`));
if (errors.length > 0) {
  errors.forEach(e => console.error(`::error::${e}`));
  process.exit(1);
}
console.log(`✅ Datenprüfung bestanden (${[runSchema && 'Schema', runFreshness && 'Aktualität'].filter(Boolean).join(' + ')})`);
