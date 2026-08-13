'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import HydroPowerWidget from '@/components/HydroPowerWidget';
import EnergyMixChart from '@/components/EnergyMixChart';
import TrendCard from '@/components/TrendCard';
import { MOCK_TRENDS, MOCK_WEEKLY_REPORTS } from '@/lib/mockData';
import { Region, Sector } from '@/lib/types';
import { Activity, FileText, Bot, ArrowRight, Sparkles, Filter, CheckCircle2, Zap, BarChart2 } from 'lucide-react';

export default function DashboardPage() {
  const [selectedRegion, setSelectedRegion] = useState<Region | 'All'>('All');
  const [selectedSector, setSelectedSector] = useState<Sector | 'All'>('All');

  const latestReport = MOCK_WEEKLY_REPORTS[0];

  const filteredTrends = MOCK_TRENDS.filter(item => {
    const matchRegion = selectedRegion === 'All' || item.region === selectedRegion;
    const matchSector = selectedSector === 'All' || item.sector === selectedSector;
    return matchRegion && matchSector;
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Banner Header */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-cyan-950/70 border border-cyan-500/30 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-cyan-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-austria">Österreich & International</span>
            <span className="badge badge-hydro">Wasserkraft Fokus</span>
            <span className="badge badge-emerald flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> KI-Agent Live
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight font-heading leading-tight">
            Energy Trend Radar <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00f2fe] via-cyan-300 to-[#3b82f6]">Österreich & Int.</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Automatisiertes Monitoring von Energiemärkten, E-Control & APG Netzberichten, Erneuerbaren-Trends und Speicherkapazitäten.
            Erhalten Sie wöchentlich strukturierte Berichte und strategische Tipps.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/reports" className="btn-primary">
              <FileText className="w-4 h-4" />
              <span>Wochenbericht KW {latestReport.weekNumber} lesen</span>
            </Link>
            <Link href="/advisor" className="btn-secondary">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>AI Advisor befragen</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Section 1: Wasserkraft Radar */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#00f2fe]" />
          <h2 className="text-xl font-bold text-white font-heading">Wasserkraft & Speicher-Erzeugung Österreich</h2>
        </div>
        <HydroPowerWidget />
      </div>

      {/* Section 2: Energy Mix & Latest Executive Report */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recharts Chart */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-[#00f2fe]" />
            <h2 className="text-xl font-bold text-white font-heading">Stromerzeugung Österreich (GWh)</h2>
          </div>
          <EnergyMixChart />
        </div>

        {/* Right: Executive Report Summary Card */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[#00f2fe]" />
            <h2 className="text-xl font-bold text-white font-heading">Wochenbericht Highlights</h2>
          </div>
          
          <div className="glass-card p-6 flex-1 flex flex-col justify-between border-cyan-500/20">
            <div>
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  KW {latestReport.weekNumber} / {latestReport.year}
                </span>
                <span className="text-[11px] text-slate-400">{latestReport.dateGenerated}</span>
              </div>

              <h3 className="text-base font-bold text-white mb-2 leading-snug">
                {latestReport.title}
              </h3>

              <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed mb-4">
                {latestReport.executiveSummary}
              </p>

              <div className="space-y-2 mb-4">
                {latestReport.austriaHighlights.slice(0, 2).map((highlight, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/reports" className="w-full btn-secondary text-center justify-center text-xs mt-2">
              <span>Vollständigen Bericht & PDF Export</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Section 3: Trend Radar Feed Grid */}
      <div className="space-y-4 pt-4">
        {/* Filters Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00f2fe]" />
            <h2 className="text-xl font-bold text-white font-heading">Neueste Trend-Signale & Markt-Analysen</h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 px-2 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Region:
              </span>
              {(['All', 'Austria', 'EU', 'International'] as const).map(reg => (
                <button
                  key={reg}
                  onClick={() => setSelectedRegion(reg)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    selectedRegion === reg
                      ? 'bg-cyan-500/20 text-[#00f2fe] border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {reg === 'All' ? 'Alle' : reg}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 px-2">Sparte:</span>
              {(['All', 'Wasserkraft', 'Politik & Recht', 'Markt & Preise'] as const).map(sec => (
                <button
                  key={sec}
                  onClick={() => setSelectedSector(sec)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    selectedSector === sec
                      ? 'bg-cyan-500/20 text-[#00f2fe] border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec === 'All' ? 'Alle' : sec}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrends.map(trend => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
        </div>
      </div>

    </div>
  );
}
