import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeNews, newsFeedUrl, parseRssItems, safeHttpUrl, toPlainText } from '../lib/news';

const item = (title: string, link: string, date = 'Wed, 07 Oct 2026 08:00:00 GMT', source = 'ORF') => `
  <item>
    <title>${title}</title>
    <link>${link}</link>
    <pubDate>${date}</pubDate>
    <source url="https://orf.at">${source}</source>
  </item>`;

test('only absolute http(s) URLs without credentials are accepted', () => {
  assert.equal(safeHttpUrl('https://news.google.com/rss/articles/abc?oc=5'), 'https://news.google.com/rss/articles/abc?oc=5');
  assert.equal(safeHttpUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpUrl(' JaVaScRiPt:alert(1)'), null);
  assert.equal(safeHttpUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(safeHttpUrl('//evil.example/x'), null);
  assert.equal(safeHttpUrl('https://user:pw@evil.example/'), null);
  assert.equal(safeHttpUrl('<![CDATA[https://orf.at/a]]>'), 'https://orf.at/a');
});

test('markup, encoded markup and control characters are stripped', () => {
  assert.equal(toPlainText('<b>Strom</b> &amp; Gas', 100), 'Strom & Gas');
  assert.equal(toPlainText('&lt;script&gt;alert(1)&lt;/script&gt;Titel', 100), 'alert(1) Titel');
  assert.equal(toPlainText('A\u0000B\u202eC\nD', 100), 'A B C D');
  assert.equal(toPlainText('Wasserkraft &#228;&#x00FC;', 100), 'Wasserkraft äü');
  assert.equal(toPlainText('x'.repeat(50), 10).length, 10);
});

test('comparison signs in prose survive, comments and tags do not', () => {
  assert.equal(
    toPlainText('Day-Ahead an 6 Stunden < 0 €/MWh, Abendspitzen > 300 €/MWh', 200),
    'Day-Ahead an 6 Stunden < 0 €/MWh, Abendspitzen > 300 €/MWh',
  );
  assert.equal(toPlainText('Strompreis &lt;0 Euro: Netzbetreiber warnt &gt; Engpass', 200), 'Strompreis <0 Euro: Netzbetreiber warnt > Engpass');
  assert.equal(toPlainText('<!-- versteckt -->Titel <img src=x onerror=alert(1)>Text', 200), 'Titel Text');
});

test('RSS items are parsed, cleaned and the source suffix removed', () => {
  const xml = `<rss><channel>
    ${item('<![CDATA[Neues Pumpspeicherkraftwerk - ORF]]>', 'https://news.google.com/a')}
    ${item('Böser Link', 'javascript:alert(document.cookie)')}
    ${item('Ohne Datum', 'https://news.google.com/b', 'kein Datum')}
    ${item('ee-news.ch', 'https://news.google.com/c', undefined, 'ee-news.ch')}
  </channel></rss>`;
  const items = parseRssItems(xml, 'Wasserkraft');
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    title: 'Neues Pumpspeicherkraftwerk',
    link: 'https://news.google.com/a',
    pubDate: '2026-10-07',
    source: 'ORF',
    summary: 'Neues Pumpspeicherkraftwerk',
    category: 'Wasserkraft',
  });
});

test('news are deduplicated, filtered by age and sorted newest first', () => {
  const now = new Date('2026-10-08T12:00:00Z');
  const base = { link: 'https://x.at', source: 'S', summary: '', category: 'Markt' as const };
  const merged = mergeNews([
    [{ ...base, title: 'Alt', pubDate: '2026-08-01' }, { ...base, title: 'Strompreis sinkt', pubDate: '2026-10-05' }],
    [{ ...base, title: 'Strompreis sinkt!', pubDate: '2026-10-05' }, { ...base, title: 'Neu', pubDate: '2026-10-07' }],
    [{ ...base, title: 'Zukunft', pubDate: '2026-12-01' }],
  ], now);
  assert.deepEqual(merged.map(m => m.title), ['Neu', 'Strompreis sinkt']);
});

test('feed URL restricts results to recent days', () => {
  const url = new URL(newsFeedUrl('Wasserkraft Österreich'));
  assert.equal(url.hostname, 'news.google.com');
  assert.equal(url.searchParams.get('q'), 'Wasserkraft Österreich when:14d');
});
