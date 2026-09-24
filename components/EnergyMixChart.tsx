'use client';

import React from 'react';
import { generationData } from '@/lib/dataLoader';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

export default function EnergyMixChart() {
  const data = generationData?.series || [];

  return (
    <div className="glass-card p-6 border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Reale Stromerzeugung Österreich (MW)</h3>
          <p className="text-xs text-slate-400">Stundenauflösung der letzten 48 Stunden (Quelle: Energy-Charts / Fraunhofer ISE)</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
            {data.length} Messpunkte
          </span>
        </div>
      </div>

      <div className="w-full h-[290px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLaufkraft" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorSpeicher" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorPV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorBiomasse" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} interval={Math.floor(data.length / 6)} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v} MW`} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0d1830',
                borderColor: 'rgba(56, 189, 248, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px'
              }}
              formatter={(value: any, name: any) => [`${Number(value).toLocaleString('de-AT')} MW`, name]}
            />
            <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />

            <Area type="monotone" name="Laufwasserkraft" dataKey="laufkraft" stackId="1" stroke="#00f2fe" fillOpacity={1} fill="url(#colorLaufkraft)" />
            <Area type="monotone" name="Speicher & Pumpspeicher" dataKey="speicher" stackId="1" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSpeicher)" />
            <Area type="monotone" name="Solar (PV)" dataKey="pv" stackId="1" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPV)" />
            <Area type="monotone" name="Windkraft" dataKey="wind" stackId="1" stroke="#10b981" fillOpacity={1} fill="url(#colorWind)" />
            <Area type="monotone" name="Biomasse" dataKey="biomasse" stackId="1" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorBiomasse)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
