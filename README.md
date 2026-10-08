---
title: Energy Trend Radar Agent (Austria & International)
emoji: 🌊⚡
colorFrom: blue
colorTo: green
sdk: static
pinned: false
license: mit
---

# Energy Trend Radar Austria & International Agent 🌊⚡

Ein KI-gestütztes Dashboard und Monitoring-Agent für den Energiesektor mit besonderem Schwerpunkt auf **Österreich** (E-Control, APG, Verbund, BMK, EAG) sowie **Erneuerbare Energien** mit Fokus auf **Wasserkraft** (Laufwasserkraft & Pumpspeicher).

---

## 🌟 Projekt-Übersicht & Features

### 1. Modern Hydro-Energy Dashboard (`/`)
- **Wasserkraft Radar Österreich Widget**: KPIs (MW) zu Laufwasserkraft, Speicher-/Pumpspeicherturbinen, Pumpbetrieb, Netto-Grenzfluss und Hydro-Anteil an der Last. Pegel-/Füllstandsdaten sind (noch) nicht angebunden.
- **Erzeugungsmix Chart**: Stundenmittel der österreichischen Erzeugung der letzten 48 h; Spotpreis-Chart mit „jetzt“-Marker und Day-Ahead-Preisen.
- **Trend-Radar Grid**: Dynamische, filterbare Trend-Karten nach Region (*Österreich*, *EU*, *International*) und Sparte (*Wasserkraft*, *Politik & Recht*, *Markt & Preise*).

### 2. Automatische Wochenberichte & Archiv (`/reports`)
- **Täglich aktualisiert**: Der Bericht der laufenden Kalenderwoche wird bei jedem Pipeline-Lauf aus den aktuellen Messdaten neu erstellt; montags wird die Vorwoche (Mo–So) abgeschlossen. Archiv: 52 Wochen.
- **Kennzahlen immer aus Messdaten** (GWh je Technologie, Preise, Negativpreis-Stunden, Netto-Export); Text optional durch Gemini, sonst datenbasierte Synthese.
- **Strukturierte Kapitel**: Executive Summary, Österreich & EU, Wasserkraft Deep-Dive, Strategische Empfehlungen, Quellen.
- **Export-Funktion**: Download als Markdown (`.md`) und browserbasierter PDF-Druck.

### 3. AI Strategy Advisor Chatbot (`/advisor`)
- **Interaktiver KI-Chatbot**: Experten-Assistent für Fragen zu Investitionen, Wasserkraft-Repowering, Negativpreisen und EU RED III Richtlinien.
- **Offline-Modus**: Auf dem statischen HF Space (ohne Server) antwortet der Advisor datenbasiert aus den aktuellen Messwerten; mit Node-Server (Docker) zusätzlich über Gemini.

### 4. Energy Signal Stream (`/feed`)
- Aktuelle Meldungen (Google News, letzte 30 Tage) mit Freitext-Suche und Themenfiltern, plus kuratierte Hintergrund-Analysen.

### 5. Aktualität sichtbar
- Status-Badge in der Navigation (grün/gelb/rot) und Warnbanner, sobald die Messdaten älter als 30 h sind – berechnet im Browser des Besuchers.

---

## 📚 Dokumentation (für Weiterentwicklung & Betrieb)

| Dokument | Inhalt |
| :--- | :--- |
| [CLAUDE.md](https://github.com/ecke2001/energytrendradar/blob/main/CLAUDE.md) | Kurzfassung für Claude Code: Befehle, Architektur, Regeln, API-Eigenheiten |
| [docs/ARCHITECTURE.md](https://github.com/ecke2001/energytrendradar/blob/main/docs/ARCHITECTURE.md) | Datenfluss, Datendateien, Datenquellen, Berichtslogik, Sicherheitsmodell, Entscheidungen |
| [docs/OPERATIONS.md](https://github.com/ecke2001/energytrendradar/blob/main/docs/OPERATIONS.md) | Runbook: Secrets, Deploy, Rollback, Monitoring, Fehlersuche |
| [docs/DEVELOPMENT.md](https://github.com/ecke2001/energytrendradar/blob/main/docs/DEVELOPMENT.md) | Setup, Tests (inkl. Offline-E2E), Konventionen, Erweiterungs-Rezepte, bekannte Einschränkungen |
| [plan.md](https://github.com/ecke2001/energytrendradar/blob/main/plan.md) | Diagnose & Plan v3, Sicherheitsprüfung, Roadmap |

---

## 🛠️ Tech-Stack & Architektur

| Komponente | Technologie | Beschreibung |
| :--- | :--- | :--- |
| **Framework** | Next.js 14+ (App Router, TypeScript) | Reaktive Web-Anwendung mit Static Export Support |
| **Design / Styling** | Custom CSS + Tailwind CSS | *Hydro Energy Dark Mode* mit Glassmorphism & Micro-Animations |
| **Visualisierung** | Recharts & Lucide Icons | Interaktive Hydro-Diagramme & System-Icons |
| **Daten-Pipeline** | GitHub Actions (4× täglich) | `scripts/fetch-data.ts`, `generate-report.ts`, `validate-data.ts`, `deploy_hf.py` |
| **KI / LLM Engine** | Google Gemini (optional) | Modell per `GEMINI_MODEL`, Ausgabe wird validiert; ohne Key datenbasiert |
| **Deployment** | Hugging Face Static Space | Hostet das kompilierte SPA-Bundle (0 € Kosten) |
| **Versionierung** | GitHub Repository | Multi-Branch Quellcode-Verwaltung |

---

## 📂 Projekt-Struktur & Wichtige Dateien

```
├── app/                          # Next.js App Router Seiten (Dashboard, Berichte, Advisor, Feed)
│   └── api/agent/chat/route.ts   # Advisor-API (nur mit Node-Server/Docker aktiv)
├── components/                   # UI-Komponenten inkl. DataStatusBadge & DataFreshnessBanner
├── data/                         # Von der Pipeline erzeugte JSON-Daten (nicht manuell bearbeiten)
│   ├── generation.json, prices.json, cross-border.json, renewable-share.json
│   ├── weekly-stats.json         # 7-Tage-Statistik (GWh, Preise, Export)
│   ├── news.json                 # Bereinigte Meldungen
│   ├── reports.json              # Archiv der Wochenberichte
│   └── meta.json                 # Zeitstempel & Status je Datenquelle
├── lib/                          # Typen, Data-Loader, Zeit-/Freshness-Helfer, Advisor-Fallback
├── scripts/
│   ├── fetch-data.ts             # Energy-Charts + Google News → data/*.json
│   ├── generate-report.ts        # Wochenbericht → data/reports.json
│   ├── validate-data.ts          # Schema- & Aktualitätsprüfung (CI-Gate)
│   ├── deploy_hf.py              # Upload out/ → HF Space inkl. Verifikation
│   ├── lib/                      # Reine, getestete Transformationen
│   ├── tests/                    # Unit-Tests (node:test)
│   └── dev/                      # Mock-APIs + Offline-E2E (npm run e2e:offline)
├── .github/workflows/            # daily-update.yml (Pipeline), ci.yml (Tests & Build)
├── docs/                         # ARCHITECTURE.md, OPERATIONS.md, DEVELOPMENT.md
├── CLAUDE.md                     # Kontext für Claude Code
└── plan.md                       # Plan, Diagnose, Sicherheitsprüfung & Roadmap
```

---

## 🚀 Lokale Entwicklung & Starten

```bash
npm ci                    # Abhängigkeiten exakt nach package-lock.json
npm run dev               # http://localhost:3000  (oder: npx next dev -p 7860 → http://localhost:7860)
npm test                  # Unit-Tests
npm run typecheck         # vollständige Typprüfung
npm run e2e:offline       # Pipeline gegen Mock-APIs (ohne Netzwerk, data/ bleibt unberührt)
npm run build             # Static Export nach out/
```

Live-Daten lokal (`npm run fetch-data`, `npm run generate-report`) **überschreiben `data/`** – nur zum Testen,
danach `git checkout -- data/`; in Claude-Code-Cloud-Sessions ist die Energy-Charts-API gesperrt.
Details: [docs/DEVELOPMENT.md](https://github.com/ecke2001/energytrendradar/blob/main/docs/DEVELOPMENT.md).

---

## 🔒 Deployment & Accounts Overview

| Plattform | Account | URL / Target | Status |
| :--- | :--- | :--- | :--- |
| **Hugging Face Space** | `ecke1985` | [https://huggingface.co/spaces/ecke1985/energy-trend-radar-agent](https://huggingface.co/spaces/ecke1985/energy-trend-radar-agent) | **Privater Space – automatisch 4× täglich aktualisiert** |
| **GitHub Repo** | `ecke2001` | [https://github.com/ecke2001/energytrendradar](https://github.com/ecke2001/energytrendradar) | Branch `main` (`energy_trend_monitor_agent` = veralteter v2-Stand, nicht verwenden) |
| **LLM Engine** | Gemini API (optional) | `gemini-2.5-flash` (Free Tier / 0 €) | Fallback: datenbasierte Berichte |

### Automatische Aktualisierung (GitHub Actions)
Der Workflow `.github/workflows/daily-update.yml` läuft **4× täglich** (und manuell über *Actions → Run workflow*):
Daten abrufen → Bericht erzeugen → prüfen → bauen → **auf den HF Space deployen (mit Verifikation)** → Daten committen → Aktualität prüfen.
Schlägt ein geplanter Lauf fehl, wird automatisch ein GitHub-Issue geöffnet (und nach dem nächsten erfolgreichen Lauf geschlossen).

| Einstellung (Repo → Settings → Secrets and variables → Actions) | Typ | Pflicht |
| :--- | :--- | :--- |
| `HF_TOKEN` – Fine-grained HF-Token, **Schreibrecht nur auf den Space** | Secret | ja |
| `GEMINI_API_KEY` – Google AI Studio Key für KI-Berichtstexte | Secret | nein |
| `HF_SPACE_ID` – Default `ecke1985/energy-trend-radar-agent` | Variable | nein |
| `GEMINI_MODEL` – Default `gemini-2.5-flash` | Variable | nein |

### Manuelles Deployment
Normalerweise: *Actions → Energy Radar Update → Run workflow* auf `main`. Notfall-Deployment vom eigenen Rechner
(aktueller `main`-Checkout, `huggingface_hub==1.33.0` in einer venv, Token nur als Umgebungsvariable):
siehe [docs/OPERATIONS.md §4](https://github.com/ecke2001/energytrendradar/blob/main/docs/OPERATIONS.md).

---

## 🔮 Roadmap für spätere Weiterentwicklungen

- [x] **Echte Daten & automatische Berichte**: Energy-Charts-Anbindung, 4× tägliche Pipeline, automatisch erzeugte Wochenberichte.
- [ ] **Next.js Upgrade (15/16)**: Vor einem Server-/Docker-Betrieb erforderlich (Sicherheits-Advisories in 14.x).
- [ ] **E-Mail Push-Verteiler**: Wöchentlicher automatischer Versand des generierten PDF/Markdown-Berichts per E-Mail.
- [ ] **Erweiterter Hydro-Index**: Integration von Pegelstand-Prognosen des BMK und Wetter-Radar-Daten.
- [ ] **RAG Knowledge-Base**: PDF-Upload-Möglichkeit für eigene Unternehmensberichte und Verbund-Publikationen.
