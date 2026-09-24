import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to safely fetch JSON
async function fetchJson(url: string, retries = 2): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'EnergyTrendRadarAgent/2.0 (Austria; Renewable Energy Monitor)'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err: any) {
      if (i === retries) {
        console.warn(`Failed fetching ${url}: ${err.message}`);
        return null;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

// Simple XML parser for RSS items
function parseRssItems(xmlText: string): Array<{ title: string; link: string; pubDate: string; source: string; summary: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; source: string; summary: string }> = [];
  const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const itemXml of itemMatches.slice(0, 15)) {
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);

    let rawTitle = titleMatch ? titleMatch[1] : '';
    // Strip CDATA if present
    rawTitle = rawTitle.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();

    // Source often at end of title like "Title - Source"
    let source = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : 'Energiemarkt';
    if (!sourceMatch && rawTitle.includes(' - ')) {
      const parts = rawTitle.split(' - ');
      source = parts.pop() || 'Energiemarkt';
      rawTitle = parts.join(' - ');
    }

    const link = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();

    if (rawTitle) {
      items.push({
        title: rawTitle,
        link,
        pubDate: new Date(pubDate).toISOString().split('T')[0],
        source,
        summary: rawTitle
      });
    }
  }

  return items;
}

async function main() {
  console.log('🔄 Starting data aggregation from real Austrian & international energy sources...');
  const now = new Date();
  const timestamp = now.toISOString();

  // 1. Fetch public power (Generation by production type for Austria)
  console.log('📊 Fetching Austria generation data from Energy-Charts API...');
  const powerData = await fetchJson('https://api.energy-charts.info/public_power?country=at');
  
  let formattedGeneration: any = null;
  if (powerData && powerData.production_types && powerData.unix_seconds) {
    const timestamps = powerData.unix_seconds;
    // Map production types
    const typesMap: Record<string, number[]> = {};
    for (const pt of powerData.production_types) {
      typesMap[pt.name] = pt.data;
    }

    // Take last 48 data points (or daily aggregates)
    const pointsCount = Math.min(48, timestamps.length);
    const startIndex = timestamps.length - pointsCount;

    const series = [];
    for (let i = startIndex; i < timestamps.length; i++) {
      const date = new Date(timestamps[i] * 1000);
      const hourStr = date.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
      const dayStr = date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' });

      series.push({
        timestamp: timestamps[i],
        label: `${dayStr} ${hourStr}`,
        laufkraft: Math.round(typesMap['Hydro Run-of-River']?.[i] || 0),
        speicher: Math.round((typesMap['Hydro water reservoir']?.[i] || 0) + (typesMap['Hydro pumped storage']?.[i] || 0)),
        pumpspeicherPumpen: Math.round(Math.abs(typesMap['Hydro pumped storage consumption']?.[i] || 0)),
        pv: Math.round(typesMap['Solar']?.[i] || 0),
        wind: Math.round(typesMap['Wind onshore']?.[i] || 0),
        biomasse: Math.round(typesMap['Biomass']?.[i] || 0),
        gas: Math.round(typesMap['Fossil gas']?.[i] || 0),
        load: Math.round(typesMap['Load']?.[i] || 0),
      });
    }

    // Calculate current snapshot summary
    const latestIndex = timestamps.length - 1;
    const currentLaufkraft = typesMap['Hydro Run-of-River']?.[latestIndex] || 0;
    const currentSpeicher = (typesMap['Hydro water reservoir']?.[latestIndex] || 0) + (typesMap['Hydro pumped storage']?.[latestIndex] || 0);
    const currentPumpspeicherVerbrauch = Math.abs(typesMap['Hydro pumped storage consumption']?.[latestIndex] || 0);
    const currentTotalHydro = currentLaufkraft + currentSpeicher;
    const currentLoad = typesMap['Load']?.[latestIndex] || 1;
    const currentHydroShare = Math.round((currentTotalHydro / currentLoad) * 100);

    formattedGeneration = {
      latestSnapshot: {
        timestamp: timestamps[latestIndex],
        date: new Date(timestamps[latestIndex] * 1000).toISOString(),
        laufkraftMW: Math.round(currentLaufkraft),
        speicherMW: Math.round(currentSpeicher),
        pumpspeicherPumpenMW: Math.round(currentPumpspeicherVerbrauch),
        totalHydroMW: Math.round(currentTotalHydro),
        loadMW: Math.round(currentLoad),
        hydroSharePercent: Math.min(100, currentHydroShare),
        renewableSharePercent: Math.round(((currentTotalHydro + (typesMap['Solar']?.[latestIndex] || 0) + (typesMap['Wind onshore']?.[latestIndex] || 0) + (typesMap['Biomass']?.[latestIndex] || 0)) / currentLoad) * 100)
      },
      series
    };
  }

  // 2. Fetch Day-Ahead Spot Market Prices for Austria
  console.log('💶 Fetching Austria Day-Ahead spot market prices from Energy-Charts...');
  const priceData = await fetchJson('https://api.energy-charts.info/price?country=at&bzn=AT');
  let formattedPrices: any = null;

  if (priceData && priceData.price && priceData.unix_seconds) {
    const timestamps = priceData.unix_seconds;
    const prices = priceData.price;
    const pointsCount = Math.min(72, timestamps.length);
    const startIndex = timestamps.length - pointsCount;

    const series = [];
    for (let i = startIndex; i < timestamps.length; i++) {
      const date = new Date(timestamps[i] * 1000);
      series.push({
        timestamp: timestamps[i],
        time: date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' }) + ' ' + date.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }),
        price: Number(prices[i]?.toFixed(2) || 0)
      });
    }

    const latestPrice = prices[prices.length - 1] || 0;
    const avgPrice = prices.slice(-24).reduce((a: number, b: number) => a + b, 0) / Math.min(24, prices.length);
    const minPrice = Math.min(...prices.slice(-24));
    const maxPrice = Math.max(...prices.slice(-24));

    formattedPrices = {
      unit: 'EUR/MWh',
      currentPrice: Number(latestPrice.toFixed(2)),
      avg24h: Number(avgPrice.toFixed(2)),
      min24h: Number(minPrice.toFixed(2)),
      max24h: Number(maxPrice.toFixed(2)),
      negativePriceHours24h: prices.slice(-24).filter((p: number) => p < 0).length,
      series
    };
  }

  // 3. Fetch Cross-Border Physical Flows (AT ↔ DE, IT, CH, CZ, HU, SI)
  console.log('⚡ Fetching Austria Cross-Border physical power flows...');
  const cbData = await fetchJson('https://api.energy-charts.info/cbpf?country=at');
  let formattedCrossBorder: any = null;

  if (cbData && cbData.countries && cbData.unix_seconds) {
    const latestIndex = cbData.unix_seconds.length - 1;
    const neighborFlows: Array<{ country: string; flowMW: number; isExport: boolean }> = [];
    let netExportMW = 0;

    for (const c of cbData.countries) {
      if (c.name === 'sum') {
        netExportMW = Math.round(c.data[latestIndex] || 0);
      } else {
        const flow = Math.round(c.data[latestIndex] || 0);
        neighborFlows.push({
          country: c.name,
          flowMW: flow,
          isExport: flow > 0
        });
      }
    }

    formattedCrossBorder = {
      timestamp: cbData.unix_seconds[latestIndex],
      date: new Date(cbData.unix_seconds[latestIndex] * 1000).toISOString(),
      netExportMW,
      isNetExporter: netExportMW >= 0,
      neighbors: neighborFlows
    };
  }

  // 4. Fetch Renewable Share History
  console.log('🌱 Fetching Renewable Share metrics for Austria...');
  const renData = await fetchJson('https://api.energy-charts.info/ren_share?country=at');
  let formattedRenShare: any = null;
  if (Array.isArray(renData) && renData.length > 0) {
    const shareValues = renData[0]?.data || [];
    const latestShare = shareValues[shareValues.length - 1] || 0;
    formattedRenShare = {
      currentPercent: latestShare,
      trend: shareValues.slice(-12)
    };
  }

  // 5. Fetch News Feeds (Google News RSS: Austria Energy & Hydro)
  console.log('📰 Fetching real Austrian Energy News Feeds...');
  let newsItems: any[] = [];
  try {
    const rssRes = await fetch('https://news.google.com/rss/search?q=Energie+%C3%96sterreich+Wasserkraft+OR+E-Control+OR+APG&hl=de&gl=AT&ceid=AT:de', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyRadar/2.0)' }
    });
    if (rssRes.ok) {
      const xml = await rssRes.text();
      newsItems = parseRssItems(xml);
    }
  } catch (err: any) {
    console.warn('News RSS fetch warning:', err.message);
  }

  // 6. Write output files
  if (formattedGeneration) {
    fs.writeFileSync(path.join(DATA_DIR, 'generation.json'), JSON.stringify(formattedGeneration, null, 2));
    console.log('✅ Wrote data/generation.json');
  }

  if (formattedPrices) {
    fs.writeFileSync(path.join(DATA_DIR, 'prices.json'), JSON.stringify(formattedPrices, null, 2));
    console.log('✅ Wrote data/prices.json');
  }

  if (formattedCrossBorder) {
    fs.writeFileSync(path.join(DATA_DIR, 'cross-border.json'), JSON.stringify(formattedCrossBorder, null, 2));
    console.log('✅ Wrote data/cross-border.json');
  }

  if (formattedRenShare) {
    fs.writeFileSync(path.join(DATA_DIR, 'renewable-share.json'), JSON.stringify(formattedRenShare, null, 2));
    console.log('✅ Wrote data/renewable-share.json');
  }

  if (newsItems.length > 0) {
    fs.writeFileSync(path.join(DATA_DIR, 'news.json'), JSON.stringify(newsItems, null, 2));
    console.log(`✅ Wrote data/news.json (${newsItems.length} news items)`);
  }

  // Write Metadata
  const metadata = {
    lastUpdated: timestamp,
    lastUpdatedFormatted: now.toLocaleString('de-AT', { timeZone: 'Europe/Vienna' }),
    version: '2.0.0',
    sources: [
      { name: 'Energy-Charts (Fraunhofer ISE)', url: 'https://energy-charts.info', license: 'CC BY 4.0' },
      { name: 'Austrian Power Grid (APG) / ENTSO-E', url: 'https://transparency.apg.at' },
      { name: 'E-Control Austria / BMK News Feed', url: 'https://www.e-control.at' }
    ]
  };

  fs.writeFileSync(path.join(DATA_DIR, 'meta.json'), JSON.stringify(metadata, null, 2));
  console.log('✅ Wrote data/meta.json');
  console.log('🎉 Data aggregation completed successfully!');
}

main().catch(err => {
  console.error('Fatal data aggregation error:', err);
  process.exit(1);
});
