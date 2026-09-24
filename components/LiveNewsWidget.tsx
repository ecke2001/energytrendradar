'use client';

import React from 'react';
import { realNewsItems } from '@/lib/dataLoader';
import { Newspaper, ExternalLink, Calendar, Sparkles } from 'lucide-react';

export default function LiveNewsWidget() {
  const news = realNewsItems || [];

  return (
    <div className="glass-card p-6 border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-cyan-400" />
            Echtzeit News & Regulierung (Österreich)
          </h3>
          <p className="text-xs text-slate-400">Tagesaktuelle Meldungen zu Wasserkraft, EAG, E-Control & APG</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono">
          {news.length} Meldungen
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {news.slice(0, 6).map((item, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-medium">
                  {item.source}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {item.pubDate}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-100 group-hover:text-[#00f2fe] transition-colors leading-snug mb-3">
                {item.title}
              </h4>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <span>Artikel lesen</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
