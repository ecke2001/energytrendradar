'use client';

import React from 'react';
import { MOCK_HYDRO_METRICS } from '@/lib/mockData';
import { Droplets, Activity, Gauge, TrendingUp, Waves } from 'lucide-react';

export default function HydroPowerWidget() {
  const currentMetric = MOCK_HYDRO_METRICS[MOCK_HYDRO_METRICS.length - 1];

  return (
    <div className="glass-card p-6 border-cyan-500/20 relative overflow-hidden">
      {/* Background Water Wave Glow Effect */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-[#00f2fe]">
            <Droplets className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Wasserkraft Radar Österreich
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-normal">
                {currentMetric.date}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Echtzeit-Stand der Laufwasser- & Speicherkraftwerke in AT</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
          <TrendingUp className="w-4 h-4" />
          <span>+12.4% vs 5-Jahres-Mittel</span>
        </div>
      </div>

      {/* Key Grid Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Laufwasserkraft */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-cyan-400" />
              Laufwasserkraft (Donau/Enns)
            </span>
          </div>
          <div className="text-2xl font-extrabold text-white font-heading">
            {currentMetric.laufkraftGWh} <span className="text-sm font-normal text-cyan-300">GWh/Woche</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">Volllastbetrieb an allen 9 Donaukraftwerken</div>
        </div>

        {/* Pumpspeicher */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-400" />
              Pumpspeicher & Speicher
            </span>
          </div>
          <div className="text-2xl font-extrabold text-white font-heading">
            {currentMetric.pumpspeicherGWh} <span className="text-sm font-normal text-cyan-300">GWh/Woche</span>
          </div>
          <div className="text-[11px] text-cyan-400 mt-1">Starke Tag/Nacht Arbitrage-Aktivität</div>
        </div>

        {/* Export Überschuss */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-400" />
              Netto-Stromexport AT
            </span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-heading">
            +{currentMetric.oesterreichExportNettoGWh} <span className="text-sm font-normal text-emerald-300">GWh</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Hauptabnehmer: DE, IT, CH</div>
        </div>
      </div>

      {/* Pegelstand Index Hydro Gauge */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-cyan-400" />
            Österreich Hydrologischer Pegelstand Index
          </span>
          <span className="font-bold text-[#00f2fe]">{currentMetric.pegelstandIndex}% (Sehr hoch)</span>
        </div>
        <div className="hydro-gauge mb-2">
          <div className="hydro-fill" style={{ width: `${currentMetric.pegelstandIndex}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>0% (Niederwasser)</span>
          <span>50% (Normal)</span>
          <span>100% (Höchststau)</span>
        </div>
      </div>
    </div>
  );
}
