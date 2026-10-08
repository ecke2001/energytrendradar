import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import DataFreshnessBanner from '@/components/DataFreshnessBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Energy Trend Radar Austria & Int | Hydro & Renewables AI Agent',
  description: 'AI-gestütztes Monitoring und wöchentliche Berichte für den Energiesektor in Österreich & International. Spezialfokus auf Wasserkraft und strategische Handlungsempfehlungen.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen flex flex-col antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DataFreshnessBanner />
          {children}
        </main>
        <footer className="border-t border-[var(--border-glass)] bg-[#060b18]/90 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Energy Trend Radar Agent</span>
              <span>© 2026 Österreich & International</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-slate-400">
              <span>
                Daten:{' '}
                <a href="https://energy-charts.info" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-cyan-300">
                  Energy-Charts / Fraunhofer ISE
                </a>{' '}
                (CC BY 4.0), ENTSO-E
              </span>
              <span>•</span>
              <span>Meldungen: Google News</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
