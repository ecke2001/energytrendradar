'use client';

import React, { useState } from 'react';
import { MOCK_TRENDS } from '@/lib/mockData';
import { realNewsItems, appMetadata, formatDataTime } from '@/lib/dataLoader';
import { safeExternalUrl } from '@/lib/safeUrl';
import { formatDateKey } from '@/lib/time';
import TrendCard from '@/components/TrendCard';
import { Search, Filter, ExternalLink, Calendar, BookOpen } from 'lucide-react';

const CATEGORIES = ['Alle', 'Wasserkraft', 'Österreich', 'Markt', 'EU'] as const;

export default function SignalFeedPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Alle');

  const term = searchTerm.toLowerCase();
  const news = realNewsItems.filter(n =>
    (category === 'Alle' || n.category === category) &&
    (n.title.toLowerCase().includes(term) || n.source.toLowerCase().includes(term)),
  );
  const analyses = MOCK_TRENDS.filter(t =>
    t.title.toLowerCase().includes(term) || t.summary.toLowerCase().includes(term) || t.source.toLowerCase().includes(term),
  );
  const newsStatus = appMetadata?.sourceStatus?.news;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-austria">Automatisch aggregiert</span>
            <span className="badge badge-hydro">Google News · letzte 30 Tage</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white font-heading">Energy Signal Stream</h1>
          <p className="text-sm text-slate-400">
            Aktuelle Meldungen zu Wasserkraft, Strommarkt und Regulierung in Österreich und der EU
            {newsStatus?.lastSuccess ? ` · abgerufen ${formatDataTime(newsStatus.lastSuccess)}` : ''}.
          </p>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Suchen nach Wasserkraft, Strompreis, APG..."
            maxLength={100}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f2fe]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Thema:
          </span>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                category === c ? 'bg-cyan-500/20 text-[#00f2fe] border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {news.map((item, idx) => {
          const href = safeExternalUrl(item.link);
          return (
            <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-medium truncate">{item.source}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" />
                    {/^\d{4}-\d{2}-\d{2}$/.test(item.pubDate) ? formatDateKey(item.pubDate) : item.pubDate}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 leading-snug mb-3">{item.title}</h3>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">{item.category ?? 'Allgemein'}</span>
                {href && (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                    Artikel lesen <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {news.length === 0 && (
        <div className="text-center py-10 glass-card p-8 border-slate-800 text-slate-400 text-sm">
          Keine Meldungen für die gewählten Filter gefunden.
        </div>
      )}

      <div className="pt-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <BookOpen className="w-5 h-5 text-[#00f2fe]" />
          <div>
            <h2 className="text-xl font-bold text-white font-heading">Kuratierte Hintergrund-Analysen</h2>
            <p className="text-xs text-slate-500">Redaktionelle Einordnungen (statisch, Stand Sommer 2026) – nicht automatisch aktualisiert.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyses.map(trend => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
        </div>
      </div>
    </div>
  );
}
