# Weiterentwicklung – Energy Trend Radar

Wie man lokal arbeitet, testet und das Projekt erweitert. Architektur: [ARCHITECTURE.md](ARCHITECTURE.md),
Betrieb: [OPERATIONS.md](OPERATIONS.md), Kurzfassung für Claude Code: [`CLAUDE.md`](../CLAUDE.md).

## 1. Setup

Voraussetzungen: Node.js 22 (CI nutzt 22), npm, optional Python ≥ 3.10 für das manuelle Deployment.

```bash
npm ci                   # nicht `npm install` (würde package-lock.json ändern)
npm test                 # Unit-Tests
npm run typecheck        # tsc --noEmit inkl. Testdateien
npm run e2e:offline      # komplette Pipeline gegen Mock-APIs (kein Netzwerk nötig)
npm run dev              # http://localhost:3000 (oder: npx next dev -p 7860 → http://localhost:7860)
npm run build            # Static Export nach out/
```

**Umgebungsvariablen:** `.env` (Vorlage `.env.example`) wird **nur** von `next dev`/`next build` gelesen (dort
aktiviert `GEMINI_API_KEY` lokal die Advisor-API). Die Pipeline-Skripte und `deploy_hf.py` lesen keine `.env`:
Variablen exportieren (`read -rs GEMINI_API_KEY && export GEMINI_API_KEY && npm run generate-report`) oder
`npx tsx --env-file=.env scripts/generate-report.ts`.

Echte Daten lokal holen (überschreibt `data/` – danach **nicht** versehentlich committen, wenn nur getestet wird):
```bash
npm run fetch-data && npm run generate-report && npm run validate-data
git checkout -- data/    # zurücksetzen, falls nur zum Testen
```

## 2. Tests

| Ebene | Befehl | Was |
| :--- | :--- | :--- |
| Unit | `npm test` | `scripts/tests/energy.test.ts` (Transformationen, Zeitzonen, Wochenfenster inkl. unvollständigem Vortag und DST, Cross-Border inkl. 0-Padding, `windowHours`), `news.test.ts` (Sanitizing, Links, Dedupe, Vergleichszeichen), `report.test.ts` (Frame/KW, Synthese, Tageszahl-Labels, AI-Validierung, Archiv, Refresh-Regeln, Validatoren), `ui-logic.test.ts` (Live-Preis, „Morgen Ø“, Markdown-Subset) |
| Offline-E2E | `npm run e2e:offline` | `scripts/dev/offline-e2e.sh`: fetch → report → validate in einem Temp-Ordner mit `scripts/dev/mock-fetch.mjs` (Gemini antwortet 404 → Fallback). `data/` bleibt unberührt; `KEEP=0` löscht das Ergebnis |
| Typen | `npm run typecheck` | `tsc --noEmit` über alles inkl. `scripts/tests` (`next build` ignoriert `*.test.ts`, `tsx` prüft keine Typen) |
| Build | `npm run build` | Typprüfung von App und `scripts/**/*.ts` (ohne Tests) + Static Export |
| Live | Workflow auf Feature-Branch dispatchen | Echte APIs; Deploy wird nur auf `main` ausgeführt. Vor dem Merge `data/` auf `main`-Stand zurücksetzen ([OPERATIONS.md §4](OPERATIONS.md)) |
| UI | `out/` serven (`cd out && python3 -m http.server 7861`) und `/index.html`, `/reports.html`, `/feed.html`, `/advisor.html` öffnen | Für Screenshots: globales Playwright mit `/opt/pw-browsers` (Claude-Cloud-Container) |

Tests sind reine node:test-Dateien (keine zusätzliche Test-Library). Neue Logik bitte als reine Funktion in
`scripts/lib/` schreiben und dort testen; I/O bleibt in den Skripten.

Mock-Daten (`mock-fetch.mjs`) bilden die echten API-Eigenheiten nach (null-Padding, 0-Padding bei cbpf, GW,
Quellen-Suffix in News-Titeln, `javascript:`-Link, alte Meldung). Wenn sich die echte API ändert, Mock **und**
Tests anpassen.

## 3. Konventionen

- **Sprache:** UI, Berichte, Log-Ausgaben der Pipeline und Doku auf Deutsch; Code, Bezeichner, Kommentare Englisch.
- **Zeit:** nur über `lib/time.ts` (`viennaDateKey`, `viennaLabel`, `viennaDateTime`, `isoWeek`, `addDays`).
  Datums-Schlüssel sind `YYYY-MM-DD` in Wiener Zeit.
- **TypeScript:** `strict`, Ziel `es2017`. Skripte laufen mit `tsx`.
- **Next.js:** Static Export – keine Server-Features (API-Routen, `headers()`, ISR) für Produktionsfunktionen.
  Zeitabhängiges nur in `useEffect` berechnen (Hydration).
- **Fehler:** laut statt still. Quellenfehler → `sourceStatus`; Pipeline-Fehler → Exit-Code ≠ 0. Fehlertexte über
  `describeError()` (ohne URLs/Steuerzeichen).
- **Commits/PRs:** Feature-Branch → PR (CI muss grün sein) → Squash-Merge. Automatische Daten-Commits heißen
  `chore(data): … [skip ci]`.

## 4. Rezepte

### Neue Kennzahl aus Energy-Charts
1. Rohdaten: Produktionsart in `PRODUCTION_ALIASES` (`scripts/lib/energy.ts`) aufnehmen.
2. Transformation erweitern (`pointAt`, `transformGeneration` oder `aggregateGenerationDaily`) + Typ in
   `lib/types.ts` (optional `?`, damit alte Dateien gültig bleiben).
3. Test in `scripts/tests/energy.test.ts`, Mock in `scripts/dev/mock-fetch.mjs` ergänzen.
4. Anzeige in `components/…` über `lib/dataLoader.ts`; Schema-Prüfung in `scripts/lib/validate.ts` nur, wenn Pflichtfeld.

### Neue Datenquelle (eigene Datei)
1. Abruf in `scripts/fetch-data.ts` über `fetchJson`/`fetchText` (Timeouts/Retries inklusive), Transformation als
   reine Funktion in `scripts/lib/`.
2. Mit `runSource('<name>', async () => { …; writeJson('<datei>.json', data); return dataUntil; })` einhängen –
   damit gelten last-known-good und `sourceStatus` automatisch.
3. Platzhalterdatei in `data/` committen (Format, das die UI verträgt, z. B. `null` oder `[]`), Import + Typ in
   `lib/dataLoader.ts`, Dateiname in `FILES` in `scripts/validate-data.ts` (sonst sieht `checkSchema` die Datei
   nicht) und Schema-Regel in `checkSchema` (`scripts/lib/validate.ts`).
4. Antwort der neuen URL in `scripts/dev/mock-fetch.mjs` nachbilden (unbekannte URLs werfen dort einen Fehler; die
   Quelle würde im Offline-E2E still als fehlgeschlagen markiert) und `npm run e2e:offline` laufen lassen.
5. Externe Texte/Links immer mit `toPlainText`/`safeHttpUrl` bereinigen.

### Berichtsinhalt ändern
- Datenbasierter Text: `buildDataReport()`; Kennzahlen: `computeKeyFigures()`; Gemini-Prompt: `buildGeminiPrompt()`;
  erlaubte KI-Felder/Längen: `validateAiReport()`. Tests in `scripts/tests/report.test.ts`.
- Neues Feld im Bericht → `WeeklyReport` (optional), Rendering in `app/reports/page.tsx` und `toMarkdown()`.

### Neue Seite / Widget
- Seite unter `app/<name>/page.tsx` (`'use client'`, wenn interaktiv), Link in `components/Navbar.tsx`.
- Externe Links nur über `safeExternalUrl()`; Zeitangaben über `formatDataTime`/`formatShortTime`.

### KI-Advisor mit echtem Backend
Auf dem statischen Space nicht möglich (kein Server, Key dürfte nicht in den Browser). Optionen: Docker-Space oder
separater Serverless-Endpunkt mit Rate-Limit. Vorher Next.js-Upgrade (Roadmap).

## 5. Bekannte Einschränkungen & offene Punkte

Siehe auch Roadmap in [`plan.md`](../plan.md).

- **Next.js 14.2.35:** `npm audit` meldet Server-Advisories (kein 14.x-Fix). Im Static Export nicht ausnutzbar;
  vor jedem Server-/Docker-Betrieb auf Next 15/16 upgraden.
- **Dockerfile defekt:** ungültiges `apk`-Flag, erwartet `output: 'standalone'` und `public/`. Docker-Pfad ist
  derzeit nicht nutzbar.
- **Advisor ohne KI auf HF:** beantwortet Fragen regelbasiert aus den Daten.
- **Keine Pegel-/Speicherfüllstandsdaten:** Der Bericht leitet die hydrologische Lage nur aus der
  Laufkraft-Erzeugung ab. Kandidaten: ENTSO-E Transparency (Token nötig), eHYD/BMLUK.
- **Kuratierte Trend-Analysen** (`lib/mockData.ts`) sind statisch (Sommer 2026) und als solche gekennzeichnet.
- **Actions-Versionen:** `actions/checkout@v4`, `setup-node@v4`, `setup-python@v5` laufen mit Deprecation-Warnung
  (Node 20) – Dependabot-PRs #2–#4 beheben das; idealerweise danach auf Commit-SHAs pinnen.
- **Dependabot-Majors** (Next 16, React 19, TypeScript 7) scheitern im CI → nur gemeinsam im Next.js-Upgrade.
- **Einzelne umbenannte Produktionsart** fällt still auf 0 MW (nur Laufkraft+Last gemeinsam führen zum Fehler).
- **Space-Dateien:** `deploy_hf.py` löscht nur `_next/**`, `*.html`, `*.txt`, `status.json` – neue Dateitypen im
  Build (z. B. `public/`-Bilder) bei Bedarf in `delete_patterns` aufnehmen.
- **`@google/generative-ai`** (nur Server-Advisor) ist vom Hersteller abgelöst durch `@google/genai`.
- **Claude-Code-Cloud-Sessions:** kein Zugriff auf `api.energy-charts.info`/huggingface.co → offline-E2E bzw.
  Workflow-Dispatch auf Branch nutzen.
