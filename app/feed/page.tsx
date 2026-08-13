'use client';

import React, { useState } from 'react';
import { MOCK_TRENDS } from '@/lib/mockData';
import TrendCard from '@/components/TrendCard';
import { Newspaper, Search, Filter, RefreshCw, Zap } from 'lucide-react';

export default function SignalFeedPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedSector, setSelectedSector] = useState<string>('All');

  const filteredTrends = MOCK_TRENDS.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = selectedRegion === 'All' || t.region === selectedRegion;
    const matchesSector = selectedSector === 'All' || t.sector === selectedSector;
    return matchesSearch && matchesRegion && matchesSector;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-austria">Echtzeit Aggregator</span>
            <span className="badge badge-hydro">E-Control, APG, Verbund, BMK</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white font-heading">
            Live Energy Signal Stream
          </h1>
          <p className="text-sm text-slate-400">
            Aktuelle Nachrichten, behördliche Meldungen und Markt-Signale aus Österreich und Europa.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-slate-800">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Suchen nach Wasserkraft, EAG, Speicher..."
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f2fe]"
          />
        </div>

        {/* Region Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Region:
          </span>
          {['All', 'Austria', 'EU', 'International'].map(reg => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedRegion === reg
                  ? 'bg-cyan-500/20 text-[#00f2fe] border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {reg === 'All' ? 'Alle Regionen' : reg}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrends.map(trend => (
          <TrendCard key={trend.id} trend={trend} />
        ))}
      </div>

      {filteredTrends.length === 0 && (
        <div className="text-center py-12 glass-card p-8 border-slate-800 text-slate-400 text-sm">
          Keine Trend-Signale für die ausgewählten Filter gefunden.
        </div>
      )}
    </div>
  );
}
