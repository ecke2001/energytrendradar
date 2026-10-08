'use client';

import React, { useState } from 'react';
import { WeeklyReport } from '@/lib/types';
import { weeklyReports, formatDataTime } from '@/lib/dataLoader';
import { formatDateKey } from '@/lib/time';
import { safeExternalUrl } from '@/lib/safeUrl';
import { FileText, Download, CheckCircle2, ChevronRight, Droplets, Layers, Printer, Bot, Database, ExternalLink, CalendarClock } from 'lucide-react';

type Tab = 'overview' | 'austria' | 'hydro' | 'strategy' | 'sources';

// Report text partly derives from external headlines; keep it from forming links or HTML in Markdown viewers.
const md = (text: string) => text.replace(/[\\`[\]<>]/g, ch => `\\${ch}`);

function toMarkdown(r: WeeklyReport): string {
  const lines = [
    `# ${md(r.title)}`,
    '',
    `Kalenderwoche ${r.weekNumber}/${r.year}` +
      (r.periodStart && r.periodEnd ? ` · Zeitraum ${formatDateKey(r.periodStart)} – ${formatDateKey(r.periodEnd)}` : '') +
      ` · erstellt ${formatDataTime(r.generatedAt ?? r.dateGenerated)}` +
      ` · ${r.generatedBy === 'gemini' ? `KI-Text (${r.model ?? 'Gemini'}), Kennzahlen aus Messdaten` : 'Datenbasierte Synthese'}`,
    '',
    '## Executive Summary',
    md(r.executiveSummary),
  ];
  if (r.keyFigures?.length) {
    lines.push('', '## Kennzahlen', '', '| Kennzahl | Wert |', '| --- | --- |', ...r.keyFigures.map(k => `| ${md(k.label)} | ${md(k.value)} |`));
  }
  lines.push(
    '', '## Österreich', ...r.austriaHighlights.map(h => `- ${md(h)}`),
    '', '## International & EU', ...r.internationalHighlights.map(h => `- ${md(h)}`),
    '', '## Wasserkraft Deep-Dive',
    `- **Laufwasserkraft:** ${md(r.hydroDeepDive.laufkraftTrend)}`,
    `- **Pumpspeicher:** ${md(r.hydroDeepDive.pumpspeicherStatus)}`,
    `- **Pegelstände:** ${md(r.hydroDeepDive.pegelstandAnalyse)}`,
    '', '### Projekt-Updates', ...r.hydroDeepDive.projektUpdates.map(p => `- ${md(p)}`),
    '', '## Strategische Handlungsempfehlungen',
    ...r.strategicTips.flatMap(t => ['', `### [${t.targetGroup}] ${md(t.topic)}`, md(t.recommendation)]),
  );
  const sources = (r.newsSources || []).filter(s => safeExternalUrl(s.link));
  if (sources.length) {
    lines.push('', '## Quellen (Meldungen)', ...sources.map(s => `- [${md(s.title)}](<${safeExternalUrl(s.link)}>) – ${md(s.source)}, ${formatDateKey(s.pubDate)}`));
  }
  lines.push('', '---', 'Messdaten: Energy-Charts / Fraunhofer ISE (CC BY 4.0), ENTSO-E', '');
  return lines.join('\n');
}

export default function ReportsPage() {
  const reports = weeklyReports;
  const [selectedId, setSelectedId] = useState<string | undefined>(reports[0]?.id);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const selectedReport = reports.find(r => r.id === selectedId) ?? reports[0];

  const handleDownloadMarkdown = () => {
    if (!selectedReport) return;
    const blob = new Blob([toMarkdown(selectedReport)], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `energy_report_${selectedReport.year}_kw${selectedReport.weekNumber}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-austria">Automatisch erstellt</span>
            <span className="badge badge-hydro">PDF & Markdown Export</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white font-heading">
            Wöchentliche Energy-Reports & Archiv
          </h1>
          <p className="text-sm text-slate-400">
            Berichte werden täglich aus den aktuellen Messdaten erzeugt; montags wird die Vorwoche (Mo–So) abgeschlossen.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <CalendarClock className="w-4 h-4 text-cyan-400" />
          <span>{reports.length} {reports.length === 1 ? 'Bericht' : 'Berichte'} im Archiv</span>
        </div>
      </div>

      {!selectedReport ? (
        <div className="glass-card p-8 border-slate-800 text-center text-slate-300 space-y-2">
          <FileText className="w-8 h-8 text-cyan-400 mx-auto" />
          <p className="font-semibold">Noch kein automatisch erzeugter Bericht vorhanden.</p>
          <p className="text-sm text-slate-400">Der erste Bericht entsteht beim nächsten erfolgreichen Daten-Update (GitHub Actions).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Archive */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Verfügbare Berichte</h3>
            <div className="space-y-2">
              {reports.map(rep => {
                const isSelected = selectedReport.id === rep.id;
                return (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedId(rep.id)}
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
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {rep.periodStart && rep.periodEnd
                          ? `${formatDateKey(rep.periodStart)} – ${formatDateKey(rep.periodEnd)}`
                          : rep.dateGenerated}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-[#00f2fe]' : 'text-slate-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Viewer */}
          <div className="lg:col-span-3 space-y-6">
            <div className="glass-card p-6 sm:p-8 border-cyan-500/20" id="printable-report">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                    Kalenderwoche {selectedReport.weekNumber} / {selectedReport.year}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug">{selectedReport.title}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
                    {selectedReport.periodStart && selectedReport.periodEnd && (
                      <span>Zeitraum {formatDateKey(selectedReport.periodStart)} – {formatDateKey(selectedReport.periodEnd)}</span>
                    )}
                    <span>Erstellt {formatDataTime(selectedReport.generatedAt ?? selectedReport.dateGenerated)}</span>
                    {selectedReport.dataAsOf && <span>Messdaten bis {formatDataTime(selectedReport.dataAsOf)}</span>}
                    <span className="flex items-center gap-1">
                      {selectedReport.generatedBy === 'gemini' ? (
                        <><Bot className="w-3 h-3 text-cyan-400" /> KI-Text ({selectedReport.model ?? 'Gemini'}), Kennzahlen aus Messdaten</>
                      ) : (
                        <><Database className="w-3 h-3 text-emerald-400" /> Datenbasierte Synthese</>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={handleDownloadMarkdown} className="btn-secondary text-xs">
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Markdown</span>
                  </button>
                  <button onClick={() => window.print()} className="btn-secondary text-xs">
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Drucken / PDF</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
                {([
                  { id: 'overview', label: 'Executive Summary' },
                  { id: 'austria', label: 'Österreich & EU' },
                  { id: 'hydro', label: 'Wasserkraft Deep-Dive' },
                  { id: 'strategy', label: 'Strategische Empfehlungen' },
                  { id: 'sources', label: 'Quellen' },
                ] as Array<{ id: Tab; label: string }>).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      activeTab === tab.id ? 'bg-cyan-500/20 text-[#00f2fe] border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Management Zusammenfassung</h3>
                    <p className="text-slate-200 text-sm leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                      {selectedReport.executiveSummary}
                    </p>
                  </div>

                  {selectedReport.keyFigures && selectedReport.keyFigures.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedReport.keyFigures.map((k, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wide">{k.label}</div>
                          <div className="text-sm font-bold text-white font-mono mt-0.5">{k.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                      <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Österreich Highlights
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

              {activeTab === 'austria' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Marktbericht Österreich</h3>
                  {selectedReport.austriaHighlights.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      {item}
                    </div>
                  ))}
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider pt-4 mb-2">International & EU</h3>
                  {selectedReport.internationalHighlights.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'hydro' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-5 h-5 text-[#00f2fe]" />
                    <h3 className="text-lg font-bold text-white">Wasserkraft Spezial-Analyse</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-xs text-cyan-400 font-semibold mb-1">Laufwasserkraft</div>
                      <p className="text-xs text-slate-300 leading-relaxed">{selectedReport.hydroDeepDive.laufkraftTrend}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-xs text-blue-400 font-semibold mb-1">Pumpspeicher & alpine Seen</div>
                      <p className="text-xs text-slate-300 leading-relaxed">{selectedReport.hydroDeepDive.pumpspeicherStatus}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-xs text-emerald-400 font-semibold mb-1">Pegelstände & Prognose</div>
                      <p className="text-xs text-slate-300 leading-relaxed">{selectedReport.hydroDeepDive.pegelstandAnalyse}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Projekte & Meldungen</h4>
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

              {activeTab === 'strategy' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Handlungsempfehlungen für Entscheidungsträger</h3>
                  {selectedReport.strategicTips.map((tip, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900/70 border border-cyan-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-sm">{tip.topic}</span>
                        <span className="badge badge-emerald">{tip.targetGroup}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{tip.recommendation}</p>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-500">Automatisch abgeleitete Hinweise – keine Anlage- oder Rechtsberatung.</p>
                </div>
              )}

              {activeTab === 'sources' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Datengrundlage</h3>
                  <p className="text-xs text-slate-300">
                    Erzeugung, Last, Day-Ahead-Preise und Grenzflüsse: Energy-Charts / Fraunhofer ISE (CC BY 4.0) auf Basis von ENTSO-E-Daten.
                  </p>
                  {(selectedReport.newsSources || []).length > 0 && (
                    <ul className="space-y-2 pt-2">
                      {(selectedReport.newsSources || []).map((s, i) => {
                        const href = safeExternalUrl(s.link);
                        return (
                          <li key={i} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs flex items-start justify-between gap-3">
                            <div>
                              <div className="text-slate-200">{s.title}</div>
                              <div className="text-slate-500 mt-0.5">{s.source} · {formatDateKey(s.pubDate)}</div>
                            </div>
                            {href && (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 shrink-0 flex items-center gap-1">
                                Öffnen <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
