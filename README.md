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
- **Wasserkraft Radar Österreich Widget**: Live-KPIs zu Laufwasserkraft (GWh), Pumpspeichern (GWh), Netto-Stromexporten und dem hydrologischen Pegelstand-Index.
- **Erzeugungsmix Chart**: Interaktives Recharts-Diagramm zur österreichischen Erzeugung der letzten Wochen (Erneuerbaren-Anteil > 88%).
- **Trend-Radar Grid**: Dynamische, filterbare Trend-Karten nach Region (*Österreich*, *EU*, *International*) und Sparte (*Wasserkraft*, *Politik & Recht*, *Markt & Preise*).

### 2. Wöchentlicher Report Generator & Archiv (`/reports`)
- **Ein-Klick KI-Bericht Generator**: Generiert automatisierte Wochenberichte.
- **Strukturierte Kapitel**: Executive Summary, Österreich-Highlights (EAG), Wasserkraft Deep-Dive (Laufkraft vs. Pumpspeicher, Projekte Limberg III / Kühtai 2) und Strategische Empfehlungen.
- **Export-Funktion**: Download als Markdown (`.md`) und browserbasierter PDF-Druck.

### 3. AI Strategy Advisor Chatbot (`/advisor`)
- **Interaktiver KI-Chatbot**: Experten-Assistent für Fragen zu Investitionen, Wasserkraft-Repowering, Negativpreisen und EU RED III Richtlinien.
- **Zweistufige Architektur**: Kostenfreie Gemini 1.5 Flash API (Free Tier) mit intelligenter Fallback-Engine (0 € Kosten).

### 4. Live Energy Signal Stream (`/feed`)
- Aggregierter Signal-Feed mit Freitext-Suche und Regional- & Sparten-Filtern.

---

## 🛠️ Tech-Stack & Architektur

| Komponente | Technologie | Beschreibung |
| :--- | :--- | :--- |
| **Framework** | Next.js 14+ (App Router, TypeScript) | Reaktive Web-Anwendung mit Static Export Support |
| **Design / Styling** | Custom CSS + Tailwind CSS | *Hydro Energy Dark Mode* mit Glassmorphism & Micro-Animations |
| **Visualisierung** | Recharts & Lucide Icons | Interaktive Hydro-Diagramme & System-Icons |
| **KI / LLM Engine** | Google Gemini 1.5 Flash API | `@google/generative-ai` mit integriertem Fallback-Modul |
| **Deployment** | Hugging Face Static Space | Hostet das kompilierte SPA-Bundle (0 € Kosten) |
| **Versionierung** | GitHub Repository | Multi-Branch Quellcode-Verwaltung |

---

## 📂 Projekt-Struktur & Wichtige Dateien

```
energy_trend_monitor_agent/
├── app/
│   ├── layout.tsx                # Root Layout mit Navbar, Background & Footer
│   ├── page.tsx                  # Dashboard Hauptseite (Hydro Radar, Chart, Trend Grid)
│   ├── globals.css               # Hydro Energy Dark Theme & Glassmorphism Tokens
│   ├── reports/page.tsx          # Wöchentliches Report-Archiv & KI-Generator
│   ├── advisor/page.tsx          # AI Strategy Advisor Chatbot Seite
│   ├── feed/page.tsx             # Live Energy Signal Stream Seite
│   └── api/
│       ├── agent/generate-report/route.ts # API-Endpunkt für Report-Generierung
│       └── agent/chat/route.ts            # API-Endpunkt für KI Advisor Chat
├── components/
│   ├── Navbar.tsx                # Responsive Header-Navigation mit Live-Status Badges
│   ├── HydroPowerWidget.tsx      # Wasserkraft KPIs & Pegelstand Gauge Widget
│   ├── EnergyMixChart.tsx        # Recharts Erzeugungsmix-Diagramm
│   └── TrendCard.tsx             # Glassmorphism Trend-Karte mit Quellen & Takeaways
├── lib/
│   ├── types.ts                  # TypeScript Schnittstellen (TrendItem, WeeklyReport, etc.)
│   ├── mockData.ts               # Realistische Österreich- & Wasserkraft-Datensätze
│   └── geminiAgent.ts            # Gemini API & Fallback KI-Synthese-Logik
├── out/                          # Kompiliertes Static Export Bundle (HF Space Root)
├── Dockerfile                    # Multi-stage Container Config für HF Docker Spaces
├── next.config.js                # Next.js Konfiguration (output: 'export')
├── tailwind.config.js            # Tailwind Theme Definition
├── postcss.config.js             # PostCSS Konfiguration
├── README.md                     # Diese Projektdokumentation (mit HF Space Header)
└── plan.md                       # Roadmap & Vorgehens-Checkliste
```

---

## 🚀 Lokale Entwicklung & Starten

1. **Abhängigkeiten installieren**:
   ```bash
   npm install
   ```

2. **Lokalen Entwicklungs-Server starten**:
   ```bash
   npm run dev
   # Oder auf Port 7860:
   npx next dev -p 7860
   ```
   Öffne danach **`http://localhost:7860`** im Browser.

3. **Projekt Bauen & Statischen Export generieren**:
   ```bash
   npm run build
   ```
   Erzeugt das kompilierte Web-Bundle im `out/` Verzeichnis.

---

## 🔒 Deployment & Accounts Overview

| Plattform | Account | URL / Target | Status |
| :--- | :--- | :--- | :--- |
| **Hugging Face Space** | `ecke1985` | [https://huggingface.co/spaces/ecke1985/energy-trend-radar-agent](https://huggingface.co/spaces/ecke1985/energy-trend-radar-agent) | **Privater Space (Aktiv)** |
| **GitHub Repo** | `ecke2001` | [https://github.com/ecke2001/energytrendradar](https://github.com/ecke2001/energytrendradar) | Branches `main` & `energy_trend_monitor_agent` |
| **LLM Engine** | Free / Gemini API | Gemini 1.5 Flash (Free Tier / 0 €) | Kostenfreier Modus |

### Deployment auf Hugging Face Space aktualisieren:
Um Änderungen auf Hugging Face neu zu veröffentlichen:
```bash
npm run build
python3 -c "
from huggingface_hub import HfApi
api = HfApi(token='DEIN_HF_TOKEN')
api.upload_folder(
    folder_path='./out',
    repo_id='ecke1985/energy-trend-radar-agent',
    repo_type='space'
)
"
```

---

## 🔮 Roadmap für spätere Weiterentwicklungen

- [ ] **Echtzeit-API Anbindung**: Direkte Anbindung von APG Open Data APIs für Live-Erzeugungsdaten in Österreich.
- [ ] **E-Mail Push-Verteiler**: Wöchentlicher automatischer Versand des generierten PDF/Markdown-Berichts per E-Mail.
- [ ] **Erweiterter Hydro-Index**: Integration von Pegelstand-Prognosen des BMK und Wetter-Radar-Daten.
- [ ] **RAG Knowledge-Base**: PDF-Upload-Möglichkeit für eigene Unternehmensberichte und Verbund-Publikationen.
