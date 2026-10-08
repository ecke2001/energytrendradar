// Google News RSS ingestion. Feed content is untrusted: everything is reduced to
// plain text with length limits, and only absolute http(s) links survive.

import type { NewsCategory, NewsItem } from '../../lib/types';

export const NEWS_QUERIES: Array<{ category: NewsCategory; query: string }> = [
  { category: 'Wasserkraft', query: 'Wasserkraft Österreich' },
  { category: 'Österreich', query: 'E-Control OR APG OR Verbund Strom Österreich' },
  { category: 'Markt', query: 'Strompreis Österreich' },
  { category: 'EU', query: 'EU Strommarkt erneuerbare Energie' },
];

export function newsFeedUrl(query: string, days = 14): string {
  const params = new URLSearchParams({ q: `${query} when:${days}d`, hl: 'de', gl: 'AT', ceid: 'AT:de' });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

const MAX_TITLE = 300;
const MAX_SOURCE = 80;
const MAX_URL = 2048;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
  ndash: '–', mdash: '—', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', hellip: '…', euro: '€',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    }
    return NAMED_ENTITIES[code] ?? m;
  });
}

/** Reduce untrusted markup to a single line of plain text. */
export function toPlainText(input: string, maxLength: number): string {
  let s = input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // Decode first so that encoded tags (&lt;script&gt;) are stripped as well.
  s = decodeEntities(s);
  s = s.replace(/<[^>]*>/g, ' ');
  s = s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > maxLength ? `${s.slice(0, maxLength - 1).trimEnd()}…` : s;
}

/** Returns the URL if it is an absolute http(s) URL without credentials, else null. */
export function safeHttpUrl(input: string): string | null {
  const candidate = toPlainText(input, MAX_URL);
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1] : null;
}

export function parseRssItems(xml: string, category: NewsCategory): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const block of blocks.slice(0, 50)) {
    const rawTitle = tag(block, 'title');
    const rawLink = tag(block, 'link');
    const rawDate = tag(block, 'pubDate');
    if (!rawTitle || !rawLink || !rawDate) continue;

    const link = safeHttpUrl(rawLink);
    const published = new Date(toPlainText(rawDate, 100));
    if (!link || Number.isNaN(published.getTime())) continue;

    let title = toPlainText(rawTitle, MAX_TITLE);
    const source = toPlainText(tag(block, 'source') || '', MAX_SOURCE) || 'Google News';
    // Google News appends " - <Quelle>" to every title.
    const suffix = ` - ${source}`;
    if (title.endsWith(suffix)) title = title.slice(0, -suffix.length).trim();
    // Some feed entries carry only the publisher name as title.
    if (!title || title.toLowerCase() === source.toLowerCase()) continue;

    items.push({
      title,
      link,
      pubDate: published.toISOString().slice(0, 10),
      source,
      summary: title,
      category,
    });
  }
  return items;
}

/** Deduplicate by title, drop old items, newest first. */
export function mergeNews(lists: NewsItem[][], now: Date, maxAgeDays = 30, limit = 40): NewsItem[] {
  const cutoff = new Date(now.getTime() - maxAgeDays * 86400000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const seen = new Set<string>();
  const merged: NewsItem[] = [];
  for (const item of lists.flat()) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();
    if (seen.has(key) || item.pubDate < cutoff || item.pubDate > today) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.sort((a, b) => b.pubDate.localeCompare(a.pubDate)).slice(0, limit);
}
