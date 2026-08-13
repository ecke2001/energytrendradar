'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

const chartData = [
  { kw: 'KW 28', Laufkraft: 820, Pumpspeicher: 340, PV: 410, Wind: 190 },
  { kw: 'KW 29', Laufkraft: 850, Pumpspeicher: 310, PV: 430, Wind: 180 },
  { kw: 'KW 30', Laufkraft: 890, Pumpspeicher: 390, PV: 450, Wind: 210 },
  { kw: 'KW 31', Laufkraft: 860, Pumpspeicher: 420, PV: 420, Wind: 230 },
  { kw: 'KW 32', Laufkraft: 910, Pumpspeicher: 460, PV: 440, Wind: 200 },
  { kw: 'KW 33', Laufkraft: 930, Pumpspeicher: 490, PV: 460, Wind: 240 },
];

export default function EnergyMixChart() {
  return (
    <div className="glass-card p-6 border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Stromerzeugung Österreich nach Quellentyp (GWh)</h3>
          <p className="text-xs text-slate-400">Verlauf der letzten 6 Kalenderwochen (Erneuerbaren-Anteil &gt; 88%)</p>
        </div>
      </div>

      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLaufkraft" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorPumpspeicher" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorPV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <XAxis dataKey="kw" stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0d1830',
                borderColor: 'rgba(56, 189, 248, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

            <Area type="monotone" dataKey="Laufkraft" stackId="1" stroke="#00f2fe" fillOpacity={1} fill="url(#colorLaufkraft)" />
            <Area type="monotone" dataKey="Pumpspeicher" stackId="1" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPumpspeicher)" />
            <Area type="monotone" dataKey="PV" stackId="1" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPV)" />
            <Area type="monotone" dataKey="Wind" stackId="1" stroke="#10b981" fillOpacity={1} fill="url(#colorWind)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
