'use client';

import React from 'react';
import { TrendItem } from '@/lib/types';
import { ExternalLink, ArrowUpRight, ArrowDownRight, Layers, Sparkles } from 'lucide-react';

interface TrendCardProps {
  trend: TrendItem;
}

export default function TrendCard({ trend }: TrendCardProps) {
  const isAustria = trend.region === 'Austria';
  
  return (
    <div className="glass-card glass-card-interactive p-5 flex flex-col justify-between group">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={isAustria ? 'badge badge-austria' : 'badge badge-emerald'}>
              {trend.region}
            </span>
            <span className="badge badge-hydro flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {trend.sector}
              {trend.hydroType ? ` (${trend.hydroType})` : ''}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">{trend.date}</span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-100 group-hover:text-[#00f2fe] transition-colors mb-2 leading-snug">
          {trend.title}
        </h3>

        {/* Summary */}
        <p className="text-sm text-slate-300 line-clamp-3 mb-4 leading-relaxed">
          {trend.summary}
        </p>

        {/* Optional Metric Highlight */}
        {trend.metrics && (
          <div className="mb-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{trend.metrics.label}:</span>
            <div className="flex items-center gap-1.5 font-bold text-sm text-[#00f2fe]">
              <span>{trend.metrics.value}</span>
              {trend.metrics.change && (
                <span className={`text-xs flex items-center ${trend.metrics.isPositive !== false ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {trend.metrics.isPositive !== false ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {trend.metrics.change}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Takeaway & Source */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
        <div className="flex items-start gap-2 text-xs text-cyan-200/90 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
          <Sparkles className="w-4 h-4 text-[#00f2fe] shrink-0 mt-0.5" />
          <span className="italic">"{trend.keyTakeaway}"</span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>Quelle: <strong className="text-slate-300">{trend.source}</strong></span>
          {trend.sourceUrl && (
            <a
              href={trend.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-cyan-400 hover:underline"
            >
              <span>Details</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
