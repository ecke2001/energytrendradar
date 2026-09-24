'use client';

import React from 'react';
import { generationData, crossBorderData } from '@/lib/dataLoader';
import { Droplets, Activity, Gauge, TrendingUp, Waves, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function HydroPowerWidget() {
  const snapshot = generationData.latestSnapshot;
  const cb = crossBorderData;

  const laufkraftMW = snapshot?.laufkraftMW || 0;
  const speicherMW = snapshot?.speicherMW || 0;
  const pumpenMW = snapshot?.pumpspeicherPumpenMW || 0;
  const totalHydroMW = snapshot?.totalHydroMW || (laufkraftMW + speicherMW);
  const hydroShare = snapshot?.hydroSharePercent || 0;
  const netExportMW = cb?.netExportMW || 0;
  const isNetExport = cb?.isNetExporter ?? true;

  return (
    <div className="glass-card p-6 border-cyan-500/20 relative overflow-hidden">
      {/* Background Water Wave Glow Effect */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-[#00f2fe]">
            <Droplets className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Wasserkraft Radar Österreich
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                Echtdaten Energy-Charts / APG
              </span>
            </h2>
            <p className="text-xs text-slate-400">Echtzeit-Leistung der Laufwasser- & Speicherkraftwerke in Österreich</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hydro-Anteil an Last: <strong className="text-white font-bold">{hydroShare}%</strong></span>
          </div>
        </div>
      </div>

      {/* Key Grid Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Laufwasserkraft */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-cyan-400" />
              Laufwasserkraft
            </span>
            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono">Donau/Enns/Mur</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-heading">
            {laufkraftMW.toLocaleString('de-AT')} <span className="text-xs font-normal text-cyan-300">MW</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Grundlast-Flusskraftwerke</div>
        </div>

        {/* Speicherkraftwerke */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-400" />
              Speicher & Pumpspeicher
            </span>
            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">Alpine Stauseen</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-heading">
            {speicherMW.toLocaleString('de-AT')} <span className="text-xs font-normal text-cyan-300">MW</span>
          </div>
          <div className="text-[11px] text-cyan-400 mt-1">Turbinen-Erzeugung</div>
        </div>

        {/* Pumpspeicher Pumpleistung (Verbrauch) */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Pumpen-Aufnahme
            </span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">Arbitrage</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-300 font-heading">
            {pumpenMW.toLocaleString('de-AT')} <span className="text-xs font-normal text-amber-200">MW</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Stromspeicherung aktiv</div>
        </div>

        {/* Netto Export/Import */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-400" />
              Netto-Stromfluss AT
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isNetExport ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
              {isNetExport ? 'Netto-Export' : 'Netto-Import'}
            </span>
          </div>
          <div className={`text-2xl font-extrabold font-heading ${isNetExport ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isNetExport ? '+' : ''}{netExportMW.toLocaleString('de-AT')} <span className="text-xs font-normal text-slate-300">MW</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Austrian Power Grid Saldo</div>
        </div>
      </div>

      {/* Hydro Anteil Gauge Bar */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-cyan-400" />
            Wasserkraft-Deckungsgrad am aktuellen Gesamtverbrauch Österreichs
          </span>
          <span className="font-bold text-[#00f2fe]">{hydroShare}% Deckung ({totalHydroMW.toLocaleString('de-AT')} MW von {snapshot?.loadMW.toLocaleString('de-AT')} MW Last)</span>
        </div>
        <div className="hydro-gauge mb-2">
          <div className="hydro-fill" style={{ width: `${Math.min(100, Math.max(5, hydroShare))}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>0%</span>
          <span>50% (Normalwert)</span>
          <span>100% (Vollständige Hydro-Autarkie)</span>
        </div>
      </div>
    </div>
  );
}
