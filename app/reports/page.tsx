'use client';

import React, { useState } from 'react';
import { WeeklyReport } from '@/lib/types';
import { MOCK_WEEKLY_REPORTS } from '@/lib/mockData';
import { FileText, Download, Sparkles, RefreshCw, CheckCircle2, ChevronRight, Droplets, Layers, ShieldCheck, Printer } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>(MOCK_WEEKLY_REPORTS);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport>(MOCK_WEEKLY_REPORTS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'hydro' | 'strategy' | 'austria'>('overview');

  const handleGenerateNewReport = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/agent/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekNumber: selectedReport.weekNumber + 1 })
      });
      const data = await res.json();
      if (data.success && data.report) {
        setReports([data.report, ...reports]);
        setSelectedReport(data.report);
      }
    } catch (e) {
      console.error('Report Generation Error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadMarkdown = () => {
    const mdContent = `# ${selectedReport.title}
Datum: ${selectedReport.dateGenerated} | Kalenderwoche: ${selectedReport.weekNumber}

## Executive Summary
${selectedReport.executiveSummary}

## Österreich Highlights
${selectedReport.austriaHighlights.map(h => `- ${h}`).join('\n')}

## Wasserkraft Deep-Dive
- **Laufwasserkraft:** ${selectedReport.hydroDeepDive.laufkraftTrend}
- **Pumpspeicher:** ${selectedReport.hydroDeepDive.pumpspeicherStatus}
- **Pegelstände:** ${selectedReport.hydroDeepDive.pegelstandAnalyse}

### Projekt-Updates:
${selectedReport.hydroDeepDive.projektUpdates.map(p => `- ${p}`).join('\n')}

## Strategische Handlungsempfehlungen
${selectedReport.strategicTips.map(t => `### [${t.targetGroup}] ${t.topic}\n${t.recommendation}`).join('\n\n')}
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `energy_report_kw${selectedReport.weekNumber}_2026.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-austria">Wöchentliches Archiv</span>
            <span className="badge badge-hydro">PDF & Markdown Export</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white font-heading">
            Wöchentliche Energy-Reports & Strategie-Archiv
          </h1>
          <p className="text-sm text-slate-400">
            KI-generierte Marktberichte mit Fokus auf Österreich, Wasserkraft und Regulierung.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateNewReport}
            disabled={isGenerating}
            className="btn-primary"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                <span>Generiere KW {selectedReport.weekNumber + 1}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-900" />
                <span>Neuen KI-Report generieren</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar: Historical Reports Archive */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Verfügbare Berichte
          </h3>
          <div className="space-y-2">
            {reports.map((rep) => {
              const isSelected = selectedReport.id === rep.id;
              return (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-white shadow-[0_0_15px_rgba(0,242,254,0.1)]'
                      : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">KW {rep.weekNumber}/{rep.year}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-[#00f2fe]" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{rep.dateGenerated}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-[#00f2fe]' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Main Content: Report Viewer */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-6 sm:p-8 border-cyan-500/20" id="printable-report">
            
            {/* Report Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
              <div>
                <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                  Kalenderwoche {selectedReport.weekNumber} / {selectedReport.year} • Offizieller Report
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug">
                  {selectedReport.title}
                </h2>
              </div>

              {/* Download Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleDownloadMarkdown} className="btn-secondary text-xs">
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Markdown</span>
                </button>
                <button onClick={handlePrintPdf} className="btn-secondary text-xs">
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Drucken / PDF</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs inside Report */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
              {[
                { id: 'overview', label: 'Executive Summary' },
                { id: 'austria', label: 'Österreich & EU' },
                { id: 'hydro', label: 'Wasserkraft Deep-Dive' },
                { id: 'strategy', label: 'Strategische Empfehlungen' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-[#00f2fe] border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Management Zusammenfassung
                  </h3>
                  <p className="text-slate-200 text-sm leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    {selectedReport.executiveSummary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                    <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      Österreich Highlights (EAG & Netze)
                    </h4>
                    <ul className="space-y-2">
                      {selectedReport.austriaHighlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                    <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      International & EU Entwicklungen
                    </h4>
                    <ul className="space-y-2">
                      {selectedReport.internationalHighlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Austria */}
            {activeTab === 'austria' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Detaillierter Marktbericht Österreich
                </h3>
                <div className="space-y-3">
                  {selectedReport.austriaHighlights.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="font-semibold text-white text-sm mb-1">Punkt {idx + 1}: Erneuerbaren-Entwicklung</div>
                      <div className="text-xs text-slate-300 leading-relaxed">{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Hydro Deep Dive */}
            {activeTab === 'hydro' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-5 h-5 text-[#00f2fe]" />
                  <h3 className="text-lg font-bold text-white">Wasserkraft Spezial-Analyse</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-xs text-cyan-400 font-semibold mb-1">Laufwasserkraft</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedReport.hydroDeepDive.laufkraftTrend}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-xs text-blue-400 font-semibold mb-1">Pumpspeicher & alpine Seen</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedReport.hydroDeepDive.pumpspeicherStatus}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-xs text-emerald-400 font-semibold mb-1">Pegelstände & Prognose</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedReport.hydroDeepDive.pegelstandAnalyse}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Projekte & Erweiterungen in Österreich
                  </h4>
                  <ul className="space-y-2">
                    {selectedReport.hydroDeepDive.projektUpdates.map((proj, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{proj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 4: Strategy Tips */}
            {activeTab === 'strategy' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Handlungsempfehlungen für Entscheidungsträger
                </h3>
                <div className="space-y-4">
                  {selectedReport.strategicTips.map((tip, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900/70 border border-cyan-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-sm">{tip.topic}</span>
                        <span className="badge badge-emerald">{tip.targetGroup}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {tip.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
