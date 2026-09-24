'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import HydroPowerWidget from '@/components/HydroPowerWidget';
import EnergyMixChart from '@/components/EnergyMixChart';
import SpotPriceChart from '@/components/SpotPriceChart';
import CrossBorderWidget from '@/components/CrossBorderWidget';
import LiveNewsWidget from '@/components/LiveNewsWidget';
import TrendCard from '@/components/TrendCard';
import { MOCK_TRENDS, MOCK_WEEKLY_REPORTS } from '@/lib/mockData';
import { generationData, spotPriceData, crossBorderData, renewableShareData, getLastUpdatedText } from '@/lib/dataLoader';
import { Region, Sector } from '@/lib/types';
import {
  Activity,
  FileText,
  Bot,
  ArrowRight,
  Sparkles,
  Filter,
  CheckCircle2,
  Zap,
  Globe,
  Euro,
  Waves,
  Clock
} from 'lucide-react';

export default function DashboardPage() {
  const [selectedRegion, setSelectedRegion] = useState<Region | 'All'>('All');
  const [selectedSector, setSelectedSector] = useState<Sector | 'All'>('All');

  const latestReport = MOCK_WEEKLY_REPORTS[0];
  const snapshot = generationData.latestSnapshot;
  const spotPrice = spotPriceData;
  const cb = crossBorderData;
  const renShare = renewableShareData;
  const lastUpdated = getLastUpdatedText();

  const filteredTrends = MOCK_TRENDS.filter(item => {
    const matchRegion = selectedRegion === 'All' || item.region === selectedRegion;
    const matchSector = selectedSector === 'All' || item.sector === selectedSector;
    return matchRegion && matchSector;
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Banner Header */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-slate-900/95 via-slate-900/85 to-cyan-950/70 border border-cyan-500/30 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-cyan-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-austria">Österreich & International</span>
            <span className="badge badge-hydro">Wasserkraft Fokus</span>
            <span className="badge badge-emerald flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Echte Datenquellen (Energy-Charts, APG, ENTSO-E)
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight font-heading leading-tight">
            Energy Trend Radar <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00f2fe] via-cyan-300 to-[#3b82f6]">Österreich & Int.</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Tagesaktuelle Markt- und Erzeugungsdaten von Energy-Charts (Fraunhofer ISE), Austrian Power Grid (APG) und E-Control. 
            Wöchentliche KI-Berichte und strategische Handlungsempfehlungen mit Fokus auf Wasserkraft.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/reports" className="btn-primary">
              <FileText className="w-4 h-4" />
              <span>Wochenbericht KW {latestReport.weekNumber} lesen</span>
            </Link>
            <Link href="/advisor" className="btn-secondary">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>AI Strategy Advisor befragen</span>
            </Link>
            <span className="text-xs text-slate-400 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Stand: {lastUpdated}
            </span>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Wasserkraft Total */}
        <div className="glass-card p-5 border-cyan-500/20">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Waves className="w-4 h-4 text-cyan-400" />
              Wasserkraft Erzeugung
            </span>
            <span className="badge badge-hydro text-[10px]">Echtzeit</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {snapshot?.totalHydroMW?.toLocaleString('de-AT') || '---'} <span className="text-sm font-normal text-cyan-300">MW</span>
          </div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <span>{snapshot?.hydroSharePercent || 0}% Deckung der Netzlast</span>
          </div>
        </div>

        {/* KPI 2: Day-Ahead Spotpreis */}
        <div className="glass-card p-5 border-amber-500/20">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Euro className="w-4 h-4 text-amber-400" />
              Day-Ahead Spotpreis
            </span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-mono">Strombörse</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-heading">
            {spotPrice?.currentPrice?.toFixed(2) || '---'} <span className="text-sm font-normal text-amber-200">€/MWh</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            24h Ø Schnitt: {spotPrice?.avg24h?.toFixed(2) || '---'} €/MWh
          </div>
        </div>

        {/* KPI 3: Erneuerbare Quote */}
        <div className="glass-card p-5 border-emerald-500/20">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Erneuerbaren-Quote AT
            </span>
            <span className="badge badge-emerald text-[10px]">Aktuell</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-heading">
            {snapshot?.renewableSharePercent || renShare?.currentPercent || 85}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Hydro + Solar + Wind + Biomasse
          </div>
        </div>

        {/* KPI 4: Netto-Export Saldo */}
        <div className="glass-card p-5 border-blue-500/20">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Globe className="w-4 h-4 text-blue-400" />
              Netto-Stromfluss Saldo
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${cb?.isNetExporter ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
              {cb?.isNetExporter ? 'Export' : 'Import'}
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold font-heading ${cb?.isNetExporter ? 'text-emerald-400' : 'text-amber-400'}`}>
            {cb?.isNetExporter ? '+' : ''}{cb?.netExportMW?.toLocaleString('de-AT') || '0'} <span className="text-sm font-normal text-slate-300">MW</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Austrian Power Grid Verbundnetz
          </div>
        </div>
      </div>

      {/* Hydro Power Radar Österreich Widget */}
      <HydroPowerWidget />

      {/* Charts Grid: Generation Mix + Spot Market Prices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnergyMixChart />
        <SpotPriceChart />
      </div>

      {/* Grid: Cross-Border Flows + Latest Weekly Report */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CrossBorderWidget />
        </div>

        {/* Latest Executive Weekly Report Snapshot Card */}
        <div className="glass-card p-6 flex flex-col justify-between border-cyan-500/20">
          <div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Wochenbericht
              </span>
              <span className="text-[11px] text-slate-400">KW {latestReport.weekNumber}/{latestReport.year}</span>
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

      {/* Real Energy News Feed */}
      <LiveNewsWidget />

      {/* Trend Radar Signals Grid */}
      <div className="space-y-4 pt-4">
        {/* Filters Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00f2fe]" />
            <h2 className="text-xl font-bold text-white font-heading">Strategische Trend-Signale & Markt-Analysen</h2>
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
