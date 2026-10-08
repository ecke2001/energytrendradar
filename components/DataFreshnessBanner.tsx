'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDataFreshness } from '@/lib/useDataFreshness';
import { getLastUpdatedText } from '@/lib/dataLoader';
import { formatAge } from '@/lib/time';

/** Warns visitors when the bundled data is older than one missed pipeline day. */
export default function DataFreshnessBanner() {
  const { level, ageHours } = useDataFreshness();
  if ((level !== 'aging' && level !== 'stale') || ageHours === null) return null;

  const isStale = level === 'stale';
  return (
    <div
      role="status"
      className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        isStale ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
      }`}
    >
      <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isStale ? 'text-rose-400' : 'text-amber-400'}`} />
      <div>
        <strong className="font-semibold">Daten nicht tagesaktuell:</strong>{' '}
        Die letzte Messung stammt vom {getLastUpdatedText()} ({formatAge(ageHours)}).
        Die automatische Aktualisierung ist vermutlich ausgefallen – Werte und Berichte können veraltet sein.
      </div>
    </div>
  );
}
