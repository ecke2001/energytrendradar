'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, FileText, Bot, Newspaper, Zap, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard & Radar', icon: Activity },
    { href: '/reports', label: 'Wochenberichte', icon: FileText },
    { href: '/advisor', label: 'AI Strategy Advisor', icon: Bot },
    { href: '/feed', label: 'Signal Feed', icon: Newspaper },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border-glass)] bg-[#060b18]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00f2fe] to-[#3b82f6] p-[1px] shadow-[0_0_15px_rgba(0,242,254,0.4)] group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#060b18] rounded-[11px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#00f2fe]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-[#00f2fe]">
                Energy Trend Radar
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-[#00f2fe] border border-cyan-500/30">
                AUSTRIA & INT
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block -mt-1">Hydro & Renewables AI Agent</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-[#00f2fe] border border-cyan-500/30 shadow-[0_0_12px_rgba(0,242,254,0.15)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#00f2fe]' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Agent Active (Gemini AI)</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>HF Space Ready</span>
          </div>
        </div>

      </div>
    </header>
  );
}
