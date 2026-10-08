// Time helpers pinned to Europe/Vienna, independent of the machine's time zone
// (the GitHub Actions runner uses UTC, visitors use their own zone).

export const TIME_ZONE = 'Europe/Vienna';

const dateKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const labelFormat = new Intl.DateTimeFormat('de-AT', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const dateTimeFormat = new Intl.DateTimeFormat('de-AT', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Calendar day (YYYY-MM-DD) in Vienna for a unix timestamp in seconds. */
export function viennaDateKey(unixSeconds: number): string {
  return dateKeyFormat.format(new Date(unixSeconds * 1000));
}

/** Short chart label like "08.10. 14:00" in Vienna time. */
export function viennaLabel(unixSeconds: number): string {
  const parts: Record<string, string> = {};
  for (const p of labelFormat.formatToParts(new Date(unixSeconds * 1000))) parts[p.type] = p.value;
  return `${parts.day}.${parts.month}. ${parts.hour}:${parts.minute}`;
}

/** Human readable timestamp like "08.10.2026, 14:05" in Vienna time. */
export function viennaDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '–';
  return dateTimeFormat.format(d);
}

/** "2026-10-08" → "08.10.2026" */
export function formatDateKey(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}.${m}.${y}`;
}

/** Adds calendar days to a YYYY-MM-DD key. */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** ISO-8601 week number and week-based year of a YYYY-MM-DD calendar day. */
export function isoWeek(key: string): { week: number; year: number } {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86400000 + 1) / 7);
  return { week, year: date.getUTCFullYear() };
}

/** Age in hours of an ISO timestamp relative to `now`; null if missing/invalid. */
export function ageInHours(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (now.getTime() - t) / 3600000;
}

export type FreshnessLevel = 'fresh' | 'aging' | 'stale' | 'unknown';

/** Data older than 30 h means at least one pipeline run was missed; older than 72 h is clearly broken. */
export function freshnessLevel(ageHours: number | null): FreshnessLevel {
  if (ageHours === null) return 'unknown';
  if (ageHours <= 30) return 'fresh';
  if (ageHours <= 72) return 'aging';
  return 'stale';
}

export function formatAge(ageHours: number): string {
  if (ageHours < 1) return 'vor weniger als 1 Stunde';
  if (ageHours < 48) return `vor ${Math.round(ageHours)} Stunden`;
  return `vor ${Math.round(ageHours / 24)} Tagen`;
}
