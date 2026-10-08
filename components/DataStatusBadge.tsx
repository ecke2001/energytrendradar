'use client';

import React from 'react';
import { useDataFreshness } from '@/lib/useDataFreshness';
import { formatAge } from '@/lib/time';

const STYLES = {
  fresh: { box: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
  aging: { box: 'bg-amber-500/10 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' },
  stale: { box: 'bg-rose-500/10 border-rose-500/30 text-rose-300', dot: 'bg-rose-400' },
  unknown: { box: 'bg-slate-800/60 border-slate-700 text-slate-400', dot: 'bg-slate-500' },
} as const;

export default function DataStatusBadge() {
  const { level, ageHours } = useDataFreshness();
  const style = STYLES[level];
  const label = level === 'fresh' ? 'Daten aktuell'
    : level === 'unknown' ? 'Datenstand…'
    : `Daten ${ageHours !== null ? formatAge(ageHours) : 'veraltet'}`;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${style.box}`}
      title={ageHours !== null ? `Letzte Messung ${formatAge(ageHours)}` : undefined}
    >
      <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
