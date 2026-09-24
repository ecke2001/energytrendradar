# Überarbeitungsplan v2 – Energy Trend Radar Agent

> **Ziel**: Die bestehende App von statischen Mock-Daten auf **echte, täglich aktualisierte Datenquellen** umstellen und auf Hugging Face Spaces (Static, kostenlos) mit einem **GitHub Actions Cron-Pipeline** für tägliche Auto-Refreshes deployen.

---

## 1. Getroffene Architektur-Entscheidungen

| Entscheidung | Ergebnis |
| :--- | :--- |
| **Architektur** | Next.js SSR-fähig (Docker) → bleibt Static Export + externer GitHub Actions Aggregator |
| **Datenquellen** | Alle 4 echten, kostenlosen APIs: Energy-Charts, ENTSO-E, APG Transparency, News-Feeds |
| **Aktualisierung** | GitHub Actions Cron (täglich 06:00 UTC) → API-Abruf → Build → Auto-Deploy auf HF Spaces |
| **Deployment** | Hugging Face Static Space (kostenlos, `ecke1985/energy-trend-radar-agent`) |
| **LLM** | Google Gemini 1.5 Flash (Free Tier) via GitHub Secret `GEMINI_API_KEY` |
| **Dashboard-Daten** | Erzeugung (Hydro, PV, Wind), Spotpreise, Erneuerbare-Quote, Cross-Border, Speicherfüllstände, News |
| **Sprache** | Deutsch (durchgängig) |

---

## 2. Echte Datenquellen im Detail

### 2.1 Energy-Charts API (Fraunhofer ISE)
- **URL**: `https://api.energy-charts.info`
- **Kosten**: Kostenlos (CC BY 4.0), kein API-Key nötig
- **Rate Limit**: ~2 Requests/Minute
- **Endpunkte**:
  - `/public_power?country=at` → Stromerzeugung nach Typ (Hydro Run-of-River, Hydro Pumped Storage, PV, Wind, Biomass)
  - `/price?country=at&bzn=AT` → Day-Ahead Spotmarktpreise AT
  - `/ren_share?country=at` → Erneuerbaren-Anteil (%)
- **Datenformat**: JSON
- **Nutzen**: Hauptquelle für Dashboard KPIs, Charts und Erzeugungsmix

### 2.2 ENTSO-E Transparency Platform API
- **URL**: `https://web-api.tp.entsoe.eu/api`
- **Kosten**: Kostenlos (Token nach E-Mail-Registrierung)
- **Bidding Zone AT**: `10YAT-APG------L`
- **Endpunkte**:
  - Actual Generation per Type (A75)
  - Cross-Border Physical Flows (A11)
  - Hydro Reservoir Filling Rate (A72)
- **Datenformat**: XML (wird serverseitig zu JSON transformiert)
- **Nutzen**: Cross-Border-Flüsse, Speicherfüllstände, offizielle EU-Daten

### 2.3 APG Transparency (Austrian Power Grid)
- **URL**: `https://transparency.apg.at/api/v1/`
- **Kosten**: Kostenlos, kein Token nötig
- **Endpunkte**:
  - Generation per type
  - Grid load & demand
  - Hydro reservoir levels
- **Datenformat**: JSON
- **Nutzen**: Ergänzende/redundante Echtzeit-AT-Daten direkt vom Netzbetreiber

### 2.4 News & Regulierungs-Feeds
- **BMK (Klimaschutzministerium)**: RSS/Atom Feed von `bmk.gv.at`
- **E-Control Austria**: News-Seite `e-control.at/news` (HTML Scraping oder RSS)
- **IEA (International Energy Agency)**: RSS Feed für Renewable Energy News
- **Nutzen**: Aktuelle Meldungen zu EAG-Förderungen, Netzausbau, EU-Regulierung

---

## 3. Schritt-für-Schritt Umsetzungsplan

### Phase 1: Daten-Aggregator Skript erstellen
- [ ] **`scripts/fetch-data.ts`** erstellen: Node.js Skript das alle 4 APIs abruft
  - [ ] Energy-Charts: Erzeugung nach Typ (Hydro Lauf, Hydro Speicher, PV, Wind) der letzten 30 Tage
  - [ ] Energy-Charts: Day-Ahead Spotpreise AT der letzten 30 Tage
  - [ ] Energy-Charts: Erneuerbare-Quote AT
  - [ ] ENTSO-E: Cross-Border-Flüsse AT ↔ Nachbarländer (DE, IT, CH, CZ, HU, SI)
  - [ ] ENTSO-E/APG: Speicherfüllstände alpine Pumpspeicher
  - [ ] News-Feeds: BMK, E-Control, IEA aggregieren
- [ ] Alle Ergebnisse als JSON-Dateien in `data/` Verzeichnis schreiben
  - `data/generation.json` – Erzeugung nach Typ
  - `data/prices.json` – Spotmarktpreise
  - `data/renewable-share.json` – Erneuerbare-Quote
  - `data/cross-border.json` – Import/Export-Flüsse
  - `data/hydro-storage.json` – Speicherfüllstände
  - `data/news.json` – Aggregierte News-Meldungen
  - `data/meta.json` – Zeitstempel des letzten Updates
- [ ] Error-Handling & Fallback: Bei API-Ausfall werden vorhandene JSON-Dateien beibehalten

### Phase 2: GitHub Actions CI/CD Pipeline
- [ ] **`.github/workflows/daily-update.yml`** erstellen
  - [ ] Cron: `0 6 * * *` (täglich 06:00 UTC / 08:00 MESZ)
  - [ ] Job 1: `npm ci` → `npx tsx scripts/fetch-data.ts` (Daten abrufen)
  - [ ] Job 2: `npm run build` (Static Export mit frischen Daten)
  - [ ] Job 3: Upload `out/` Verzeichnis auf HF Space via `huggingface_hub`
  - [ ] Secrets: `HF_TOKEN`, `GEMINI_API_KEY`, optional `ENTSOE_TOKEN`
- [ ] Manueller Trigger (`workflow_dispatch`) für Ad-hoc Updates

### Phase 3: Datenmodelle & Typen aktualisieren
- [ ] `lib/types.ts` erweitern um neue Interfaces:
  - `RealGenerationData` – Echtzeit-Erzeugungswerte pro Typ & Stunde
  - `SpotPriceData` – Day-Ahead Preise mit Timestamps
  - `CrossBorderFlow` – Import/Export pro Nachbarland
  - `HydroStorageLevel` – Pumpspeicher-Füllstände in %
  - `NewsItem` – Aggregierte News-Meldungen mit Quelle & Datum
- [ ] `lib/mockData.ts` durch `lib/dataLoader.ts` ersetzen → liest aus `data/*.json`

### Phase 4: Dashboard UI überarbeiten
- [ ] **KPI Header Row**: 4 große Kennzahlen-Karten
  - Aktuelle Wasserkraft-Erzeugung (GWh heute) – Echte Daten
  - Erneuerbare-Quote (%) – Echte Daten
  - Day-Ahead Spotpreis (€/MWh aktuell) – Echte Daten
  - Netto-Stromexport AT (GWh) – Echte Daten
- [ ] **Erzeugungsmix Chart** (Recharts): Echte Stunden-/Tagesdaten der letzten 7–30 Tage
- [ ] **Preis-Chart**: Day-Ahead Spotmarktpreise AT der letzten 30 Tage
- [ ] **Cross-Border Widget**: Import/Export-Flüsse als Balkendarstellung (DE, IT, CH, CZ, HU, SI)
- [ ] **Speicherfüllstands-Gauge**: Alpine Pumpspeicher Füllstand in % mit historischem Verlauf
- [ ] **Live News Feed**: Echte Meldungen von BMK, E-Control, IEA mit Datum & Quellen-Link
- [ ] **Letztes Update Badge**: Anzeige wann die Daten zuletzt aktualisiert wurden (aus `data/meta.json`)

### Phase 5: Reports & AI Advisor mit echten Daten verbinden
- [ ] **Report-Generator**: Gemini-Prompt erhält echte Daten aus `data/*.json` als Kontext
  - Echte Erzeugungswerte, Preise, Speicherfüllstände werden dem Prompt mitgegeben
  - Ergebnis: Wochenberichte basieren auf **realen Marktdaten**
- [ ] **AI Strategy Advisor**: Chatbot-Prompt wird mit aktuellen Echtdaten angereichert
  - Aktuelle Preise, Erzeugung und News werden als Kontext in jede Anfrage eingebettet
  - Ergebnis: Strategische Antworten sind datenbasiert und aktuell

### Phase 6: Architektur-Anpassungen (Static → Docker-Ready)
- [ ] `next.config.js`: `output: 'export'` beibehalten für HF Static, aber
  Docker-Alternative vorbereiten (`output: 'standalone'`) falls PRO-Upgrade gewünscht
- [ ] `Dockerfile` aktualisiert halten für zukünftiges Docker-Deployment
- [ ] `.env.example` erstellen mit allen benötigten Umgebungsvariablen

### Phase 7: Funktionstests & Deployment
- [ ] Daten-Aggregator lokal testen (`npx tsx scripts/fetch-data.ts`)
- [ ] Build mit echten Daten testen (`npm run build`)
- [ ] GitHub Actions Workflow testen (manueller Trigger)
- [ ] Lokale Abnahme durch den User (`npx next dev -p 7860`)
- [ ] Hugging Face Space mit echten Daten aktualisieren
- [ ] Dokumentation (README.md, plan.md) finalisieren

---

## 4. Kostenübersicht

| Komponente | Kosten |
| :--- | :--- |
| Energy-Charts API | **0 €** (kostenlos, CC BY 4.0) |
| ENTSO-E API | **0 €** (kostenlos, Token per E-Mail) |
| APG Transparency | **0 €** (öffentlich) |
| Gemini 1.5 Flash | **0 €** (Free Tier: 15 RPM, 1M TPM) |
| GitHub Actions Cron | **0 €** (2.000 Min/Monat im Free Tier) |
| Hugging Face Static Space | **0 €** (kostenlos) |
| **Gesamt** | **0 € / Monat** |

---

## 5. Ablaufdiagramm der täglichen Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions Cron (täglich 06:00 UTC)                        │
│                                                                 │
│  1. npm ci                                                      │
│  2. npx tsx scripts/fetch-data.ts                               │
│     ├── Energy-Charts API → data/generation.json                │
│     ├── Energy-Charts API → data/prices.json                    │
│     ├── Energy-Charts API → data/renewable-share.json           │
│     ├── ENTSO-E API       → data/cross-border.json              │
│     ├── ENTSO-E/APG API   → data/hydro-storage.json             │
│     ├── News Feeds        → data/news.json                      │
│     └── Timestamp         → data/meta.json                      │
│  3. npm run build         → out/                                │
│  4. huggingface_hub upload out/ → HF Static Space               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Vorgehens-Checkliste

- [ ] Phase 1: Daten-Aggregator Skript (`scripts/fetch-data.ts`)
- [ ] Phase 2: GitHub Actions Pipeline (`.github/workflows/daily-update.yml`)
- [ ] Phase 3: Datenmodelle & DataLoader (`lib/types.ts`, `lib/dataLoader.ts`)
- [ ] Phase 4: Dashboard UI Überarbeitung (echte Charts, KPIs, News, Cross-Border)
- [ ] Phase 5: Reports & AI Advisor mit echten Daten verbinden
- [ ] Phase 6: Architektur-Konfiguration & Docker-Ready
- [ ] Phase 7: Funktionstests, lokale Abnahme & Deployment
