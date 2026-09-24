'use client';

import React from 'react';
import { crossBorderData } from '@/lib/dataLoader';
import { ArrowUpRight, ArrowDownLeft, Globe, Zap } from 'lucide-react';

export default function CrossBorderWidget() {
  const neighbors = crossBorderData?.neighbors || [];
  const netExportMW = crossBorderData?.netExportMW || 0;
  const isNetExporter = crossBorderData?.isNetExporter ?? true;

  // German country names mapping
  const countryNamesDE: Record<string, string> = {
    'Germany': 'Deutschland (DE)',
    'Italy': 'Italien (IT)',
    'Switzerland': 'Schweiz (CH)',
    'Czech Republic': 'Tschechien (CZ)',
    'Hungary': 'Ungarn (HU)',
    'Slovenia': 'Slowenien (SI)'
  };

  return (
    <div className="glass-card p-6 border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Cross-Border Stromflüsse Österreich (MW)
          </h3>
          <p className="text-xs text-slate-400">Physikalische Grenzflüsse zu allen 6 Nachbarländern</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isNetExporter ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
          Saldo: {isNetExporter ? '+' : ''}{netExportMW.toLocaleString('de-AT')} MW {isNetExporter ? '(Export)' : '(Import)'}
        </div>
      </div>

      <div className="space-y-3">
        {neighbors.map((n, idx) => {
          const isExport = n.flowMW > 0;
          const absFlow = Math.abs(n.flowMW);
          const maxScale = 2500; // max representative flow MW
          const barWidthPercent = Math.min(100, Math.max(8, (absFlow / maxScale) * 100));

          return (
            <div key={idx} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="font-semibold text-slate-200">
                  {countryNamesDE[n.country] || n.country}
                </span>
                <div className="flex items-center gap-1.5 font-mono">
                  {isExport ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      +{absFlow.toLocaleString('de-AT')} MW (Export)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      -{absFlow.toLocaleString('de-AT')} MW (Import)
                    </span>
                  )}
                </div>
              </div>

              {/* Visual flow bar */}
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isExport ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-rose-400'}`}
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
