'use client';

import React from 'react';
import { spotPriceData } from '@/lib/dataLoader';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { Euro, TrendingUp, AlertTriangle } from 'lucide-react';

export default function SpotPriceChart() {
  const data = spotPriceData?.series || [];
  const currentPrice = spotPriceData?.currentPrice || 0;
  const avg24h = spotPriceData?.avg24h || 0;
  const min24h = spotPriceData?.min24h || 0;
  const max24h = spotPriceData?.max24h || 0;
  const negHours = spotPriceData?.negativePriceHours24h || 0;

  return (
    <div className="glass-card p-6 border-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Euro className="w-5 h-5 text-amber-400" />
            Day-Ahead Spotmarktpreis Österreich (EUR/MWh)
          </h3>
          <p className="text-xs text-slate-400">Strombörse EPEX Spot / Energy-Charts Zeitreihe</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-right">
            <div className="text-xs text-slate-400">Aktueller Spotpreis</div>
            <div className={`text-xl font-bold font-mono ${currentPrice < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
              {currentPrice.toFixed(2)} €/MWh
            </div>
          </div>
          {negHours > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{negHours} Std. Negativpreis (24h)</span>
            </div>
          )}
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80 text-center">
          <div className="text-[10px] text-slate-400 uppercase">24h Ø Schnitt</div>
          <div className="text-sm font-bold text-slate-200 font-mono">{avg24h.toFixed(2)} €</div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80 text-center">
          <div className="text-[10px] text-slate-400 uppercase">24h Minimum</div>
          <div className="text-sm font-bold text-emerald-400 font-mono">{min24h.toFixed(2)} €</div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80 text-center">
          <div className="text-[10px] text-slate-400 uppercase">24h Maximum</div>
          <div className="text-sm font-bold text-amber-400 font-mono">{max24h.toFixed(2)} €</div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} interval={Math.floor(data.length / 5)} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}€`} />
            <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0d1830',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px'
              }}
              formatter={(value: any) => [`${Number(value).toFixed(2)} €/MWh`, 'Day-Ahead Preis']}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#f59e0b' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
