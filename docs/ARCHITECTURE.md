# Architektur – Energy Trend Radar

Stand: Oktober 2026 (v3). Für Betrieb/Fehlersuche siehe [OPERATIONS.md](OPERATIONS.md), für Weiterentwicklung
[DEVELOPMENT.md](DEVELOPMENT.md).

## 1. Überblick

```
┌──────────────────────── GitHub Actions: .github/workflows/daily-update.yml ────────────────────────┐
│ Trigger: cron "17 */6 * * *" (00:17, 06:17, 12:17, 18:17 UTC) + workflow_dispatch                  │
│                                                                                                    │
│  npm ci → npm test                                                                                 │
│  → scripts/fetch-data.ts ──► Energy-Charts API (public_power, price, cbpf) + Google News RSS       │
│        └─► data/generation.json, prices.json, cross-border.json, renewable-share.json,            │
│            weekly-stats.json, news.json, meta.json                                                 │
│  → scripts/generate-report.ts ──► (optional Gemini REST) ──► data/reports.json                     │
│  → scripts/validate-data.ts --schema      (bricht ab, wenn Dateien ungültig sind)                  │
│  → next build (Static Export, liest data/*.json zur Build-Zeit) ──► out/                           │
│  → scripts/deploy_hf.py  (nur main) ──► Hugging Face Static Space + Verifikation via status.json  │
│  → git commit data/ + push  (über den neuesten Branch-Stand gelegt, "chore(data): … [skip ci]")    │
│  → scripts/validate-data.ts --freshness   (rot, wenn Daten/Bericht veraltet)                       │
│  → bei Fehlschlag (nur Schedule): GitHub-Issue öffnen/kommentieren; bei Erfolg: Issue schließen    │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
             │
             ▼
  Hugging Face Space ecke1985/energy-trend-radar-agent (sdk: static, privat)
  Browser: statische Seiten + gebündelte Daten; Datenalter wird im Browser berechnet
```

Grundidee: **Kein Server zur Laufzeit.** Alle Daten werden in CI geholt, geprüft und als JSON in den Static Export
eingebaut. Aktualität entsteht durch häufige Pipeline-Läufe; Ausfälle werden durch Prüfungen, Issues und den
Browser-seitigen Aktualitätshinweis sichtbar.

## 2. Verzeichnisstruktur

| Pfad | Inhalt |
| :--- | :--- |
| `app/` | Next.js App Router Seiten: `page.tsx` (Dashboard), `reports/`, `feed/`, `advisor/`, `layout.tsx` |
| `app/api/agent/chat/route.ts` | Advisor-API – **nur** bei Betrieb mit Node-Server (dev/Docker), im Static Export nicht vorhanden |
| `components/` | Widgets (Charts, KPIs, News, Trend-Karten), `DataStatusBadge`, `DataFreshnessBanner`, `Navbar` |
| `lib/types.ts` | Alle Typen der Datendateien und Berichte |
| `lib/dataLoader.ts` | Importiert `data/*.json` typisiert; Helfer `getLastUpdatedText`, `formatDataTime`, `formatShortTime` |
| `lib/priceNow.ts`, `lib/usePriceNow.ts` | Aktueller Spotpreis, „jetzt“-Marker und „Morgen Ø“ für die Uhrzeit des Besuchers (aus der gebündelten Preisreihe); `priceWindowLabel` |
| `lib/simpleMarkdown.ts`, `components/SimpleMarkdown.tsx` | Kleines Markdown-Subset (Überschriften, Listen, fett/kursiv) für Advisor-Antworten – als React-Elemente, kein HTML |
| `lib/time.ts` | Zeit-Helfer fest auf `Europe/Vienna`, ISO-Kalenderwoche, Freshness-Stufen |
| `lib/useDataFreshness.ts` | React-Hook: Datenalter im Browser (nach Hydration) |
| `lib/safeUrl.ts` | `safeExternalUrl()` – nur absolute http(s)-URLs ohne Credentials |
| `lib/advisorFallback.ts` | Regelbasierte Advisor-Antworten aus den Daten (client-tauglich, ohne Key) |
| `lib/geminiAgent.ts` | Server-seitiger Advisor via `@google/generative-ai` (nur Server-Betrieb) |
| `lib/mockData.ts` | `MOCK_TRENDS` – statische, redaktionelle Hintergrund-Analysen (als solche gekennzeichnet) |
| `scripts/fetch-data.ts` | Orchestriert Abruf, Transformation, Schreiben, `meta.json` |
| `scripts/generate-report.ts` | Erzeugt/aktualisiert den Wochenbericht, Gemini-Aufruf |
| `scripts/validate-data.ts` | CLI für Schema- und Aktualitätsprüfung |
| `scripts/deploy_hf.py` | Upload `out/` **und `README.md`** (dessen Front-Matter ist die Space-Konfiguration) → HF Space; löscht dort nur `_next/**`, `*.html`, `*.txt`, `status.json` (andere Dateitypen bleiben liegen → `delete_patterns` erweitern, wenn z. B. `public/` dazukommt); prüft `status.json` im neuen Commit und den Space-Status |
| `scripts/lib/*.ts` | Reine Logik: `energy.ts`, `news.ts`, `report.ts`, `validate.ts`, `http.ts` |
| `scripts/tests/*.test.ts` | Unit-Tests (node:test) |
| `scripts/dev/` | `mock-fetch.mjs` + `offline-e2e.sh` – Pipeline ohne Netzwerk testen |
| `data/` | Von der Pipeline erzeugte Daten (siehe §4) – **nicht manuell bearbeiten** |
| `.github/workflows/` | `daily-update.yml` (Pipeline + Deploy), `ci.yml` (Tests + Build für PRs/main) |
| `.github/dependabot.yml` | Wöchentliche Updates für npm und GitHub Actions |

## 3. Datenquellen und ihre Eigenheiten

Alle Energy-Charts-Fakten wurden im Oktober 2026 gegen die Live-API verifiziert.

### 3.1 Energy-Charts (Fraunhofer ISE, CC BY 4.0 – Quellenangabe im Footer ist Pflicht)

| Endpoint | Parameter | Einheit / Auflösung | Eigenheiten |
| :--- | :--- | :--- | :--- |
| `/public_power` | `country=at&start=<heute−8>&end=<heute+1>` | MW, 15 min | Laufender Tag mit `null` aufgefüllt; `Load` hinkt der Erzeugung 1–3 h hinterher; Pumpverbrauch negativ |
| `/price` | `bzn=AT&start=<heute−8>&end=<heute+2>` | EUR/MWh, 15 min | Day-Ahead für morgen erscheint ca. 13:00 MEZ |
| `/cbpf` | `country=at&start=<heute−8>&end=<heute+1>` | **GW**, stündlich/15 min | **Positiv = Import**; noch nicht veröffentlichte Stunden sind mit **0** (nicht `null`) gefüllt; Eintrag `sum` = Saldo |

Gelieferte Produktionsarten (AT): `Hydro pumped storage consumption, Cross border electricity trading,
Hydro Run-of-River, Biomass, Fossil gas, Geothermal, Hydro water reservoir, Hydro pumped storage, Others, Waste,
Wind onshore, Solar, Load, Residual load, Renewable share of load, Renewable share of generation`.
Zuordnung über `PRODUCTION_ALIASES` in `scripts/lib/energy.ts`; die Liste wird bei jedem Lauf ins Log geschrieben.

Robustheit:
- Datumsbereich-Anfrage schlägt fehl → einmaliger Fallback ohne `start/end` (nur heute → Momentaufnahme ok,
  Wochenstatistik nicht möglich).
- 3 s Abstand zwischen Energy-Charts-Anfragen; `fetchText` mit Timeout 30 s, 3 Retries, Backoff, `Retry-After`.
- Plausibilitätsgrenzen: Last 1 500–20 000 MW (Warnung), Preis −1 000…5 000 €/MWh (Fehler), Einzelfluss
  ≤ 10 000 MW (Fehler).

### 3.2 Google News RSS

Vier Abfragen (`NEWS_QUERIES` in `scripts/lib/news.ts`), jeweils mit `when:14d`, Sprache/Region AT:

| Kategorie | Abfrage |
| :--- | :--- |
| Wasserkraft | `Wasserkraft Österreich` |
| Österreich | `E-Control OR APG OR Verbund Strom Österreich` |
| Markt | `Strompreis Österreich` |
| EU | `EU Strommarkt erneuerbare Energie` |

Verarbeitung: Titel/Quelle → reiner Text (Entities dekodiert, Tags/Steuerzeichen entfernt, Längenlimit), Suffix
„ - Quelle" entfernt, Einträge ohne gültiges Datum/Link oder mit Titel = Quellenname verworfen, nur
`http(s)`-Links, Duplikate (normalisierter Titel) entfernt, max. 30 Tage alt, neueste zuerst, max. 40.

### 3.3 Google Gemini (optional)

REST `POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`, Key im Header
`x-goog-api-key`. Modellkette: `GEMINI_MODEL` → `gemini-2.5-flash` → `gemini-flash-latest`; erstes Modell mit
Antwort gewinnt. `responseMimeType: application/json`, Timeout 90 s.

## 4. Datendateien (`data/`)

Alle Dateien werden ausschließlich von der Pipeline geschrieben (temp-Datei + rename). Typen: `lib/types.ts`.

| Datei | Typ | Inhalt |
| :--- | :--- | :--- |
| `generation.json` | `GenerationData` | `latestSnapshot` (neuester Zeitpunkt, an dem Laufkraft **und** Last vorliegen: MW je Technologie, Last, Hydro-Anteil an der Last, Erneuerbaren-Anteil an der Erzeugung, Gesamterzeugung) + `series` (Stundenmittel der letzten 48 h, Labels in Wiener Zeit) |
| `prices.json` | `SpotPriceData` | `currentPrice` = Preis der Viertelstunde zur Laufzeit (`currentSlotStart`), 24-h-Statistik nach Zeitstempeln (`windowHours` = tatsächlich abgedeckte Stunden, < 24 nach Fallback ohne Zeitraum), `negativePriceHours24h` in Stunden, `nextDayAvg`, `series` (letzte 24 h + Day-Ahead bis +36 h, `isFuture`). Der Browser bestimmt aktuellen Preis/„jetzt“/„Morgen Ø“ selbst aus `series` (`lib/priceNow.ts`); die gespeicherten Werte sind nur Fallback |
| `cross-border.json` | `CrossBorderData` | Neuester veröffentlichter Zeitpunkt; `flowMW` je Nachbar (**positiv = Export**, intern aus GW umgerechnet und Vorzeichen gedreht), `netExportMW`, `sourceUnit` |
| `renewable-share.json` | `RenewableShareData` | `currentPercent`, `trend`/`daily` (Tageswerte der Wochenstatistik) |
| `weekly-stats.json` | `WeeklyStats \| null` | 7-Tage-Fenster (Wiener Kalendertage): endet **gestern, sobald gestern vollständig veröffentlicht ist** (alle Viertelstunden von Laufkraft und Last, Tageslänge inkl. 23/25-h-DST-Tage), sonst vorgestern. Im Fenster zählen Tage mit ≥ 90 % Abdeckung (mind. 3 Tage, sonst Fehler). Netto-Export je Tag nur bei ≥ 98 % Abdeckung der Grenzflüsse. Inhalt: GWh je Technologie, Last, Erneuerbaren-Anteil, Preis Ø/Min/Max, Negativpreis-Stunden, Netto-Export (GWh) + `totals` |
| `news.json` | `NewsItem[]` | Bereinigte Meldungen inkl. `category` |
| `reports.json` | `WeeklyReport[]` | Berichtsarchiv, neueste zuerst, max. 52 |
| `meta.json` | `AppMetadata` | `lastUpdated` (Pipeline-Lauf), `dataAsOf` (neueste Messung), `sourceStatus` je Quelle (`ok`, `lastAttempt`, `lastSuccess`, `dataUntil`, `error`), `warnings` |

**Last-known-good:** Jede Quelle wird unabhängig verarbeitet. Schlägt sie fehl, bleibt ihre Datei unverändert,
`sourceStatus.<quelle>.ok = false` mit Fehlertext und letztem Erfolg.

| `sourceStatus`-Schlüssel | schreibt |
| :--- | :--- |
| `generation` | `generation.json` (bestimmt `meta.dataAsOf` → Badge, Banner, Freshness, Bericht-Sperre) |
| `prices` | `prices.json` (Alter separat über `currentSlotStart` geprüft) |
| `crossBorder` | `cross-border.json` |
| `weeklyStats` | `weekly-stats.json` **und** `renewable-share.json` |
| `news` | `news.json` |

`dataAsOf` folgt also nur `generation`: Fällt z. B. nur `weeklyStats` aus, bleiben Wochenwerte und
Erneuerbaren-Trend alt, ohne dass das Badge gelb wird – sichtbar in `meta.json` und als Warnung im Workflow-Log.

## 5. Wochenberichte

Code: `scripts/lib/report.ts`, `scripts/generate-report.ts`.

- **Zeitraum & Label:** Basis ist das 7-Tage-Fenster aus `weekly-stats.json` (siehe §4). Die Kalenderwoche
  (ISO 8601) ergibt sich aus dem **letzten** Tag des Zeitraums. Folge: Sobald der Sonntag vollständig vorliegt
  (in der Regel ab dem 06:17-UTC-Lauf am Montag), entsteht die finale Version der Vorwoche (exakt Mo–So); an den
  übrigen Tagen ist der Bericht der laufenden Woche ein rollierender 7-Tage-Bericht. ID: `report-<jahr>-kw<ww>`.
  Fehlen Tage, nennt der Bericht die tatsächliche Zahl („6 Tage mit vollständigen Daten“, „Wasserkraft gesamt
  (6 Tage)“) und vergleicht mit dem Vorbericht über **Tagesmittel** (`totalsDays`).
- **Ohne aktuelle Wochenwerte** (älter als 2 Tage oder fehlend): Bericht als „Momentaufnahme" von heute.
- **Aktualisierung (`needsRefresh`):**
  - Ein Wochenbericht wird nie durch einen mit früherem `periodEnd` ersetzt (schützt den fertigen Mo–So-Bericht).
  - Ohne Gemini-Key: der datenbasierte Bericht wird bei **jedem Lauf** neu erstellt (immer aktuelle Zahlen).
  - Mit Gemini-Key: neu, wenn `periodEnd` oder die Wochensummen (`totals`) sich geändert haben, der gespeicherte
    Bericht noch nicht von Gemini stammt oder älter als `REPORT_REFRESH_HOURS` (20 h) ist.
  - Sind die Erzeugungsdaten älter als `MAX_DATA_AGE_HOURS` (36 h), wird **kein** Bericht erzeugt.
- **Inhalt:** `keyFigures` und `totals` immer aus Messdaten; Vergleich mit dem Vorbericht über dessen `totals`.
  Internationale Punkte und Projekt-Updates nur aus echten Schlagzeilen des Zeitraums (Projekte: Stichwortfilter
  `PROJECT_PATTERN`); sonst ausdrücklicher Hinweis „keine Meldungen". Handlungsempfehlungen regelbasiert aus den
  Zahlen (Negativpreise, Preisspanne, Netto-Saldo).
- **Gemini:** Prompt enthält die Messdaten als JSON und die Schlagzeilen in einem als „ungeprüft" markierten
  Block. Antwort wird mit `validateAiReport()` geprüft (Pflichtfelder, Listenlängen, Textlängen, Zielgruppen-Enum,
  Bereinigung zu reinem Text). Ungültig/nicht erreichbar → datenbasierter Bericht. `generatedBy`/`model` werden
  gespeichert und im UI angezeigt.

## 6. Aktualität & Monitoring

| Ebene | Regel | Wo |
| :--- | :--- | :--- |
| Browser | grün ≤ 30 h, gelb ≤ 72 h, rot > 72 h seit `dataAsOf`; Banner ab gelb | `lib/time.ts` `freshnessLevel`, `useDataFreshness` |
| Pipeline | Erzeugungsdaten und Spotpreis ≤ `MAX_DATA_AGE_HOURS` (36 h); neuester Bericht ≤ `MAX_REPORT_AGE_DAYS` (8) Tage | `scripts/lib/validate.ts` `checkFreshness` |
| Deploy | `status.json` im neuen Space-Commit muss dem eben hochgeladenen entsprechen; Space-Status `BUILD_ERROR`/`RUNTIME_ERROR`/`CONFIG_ERROR`/`NO_APP_FILE` → Fehler, `PAUSED`/`STOPPED` → Warnung | `scripts/deploy_hf.py` |
| Alarm | Fehlgeschlagener geplanter Lauf → Issue „Energy Radar: automatisches Update fehlgeschlagen" | Workflow |

`status.json` im Space: `deployedAt`, `lastUpdated`, `dataAsOf`, `latestReport`, `commit`, `workflowRun`.

## 7. Sicherheitsmodell

| Grenze | Maßnahme |
| :--- | :--- |
| GitHub Token | global `contents: read`; Update-Job `contents: write` + `issues: write`; `ci.yml` nur `contents: read`, Trigger `pull_request` (keine Secrets für Forks) |
| `HF_TOKEN` | Fine-grained, Schreibrecht nur auf den Space; nur im Deploy-Schritt; `pip install` in eigenem Schritt ohne Token |
| `GEMINI_API_KEY` | Nur im Report-Schritt; Header statt URL; nie im Client-Bundle |
| Fremdinhalte (RSS, LLM) | Reiner Text + Längenlimits; Links nur http(s) (Pipeline **und** UI); React-Escaping, kein `dangerouslySetInnerHTML`; Markdown-Export escaped `[ ] < > \``; Logs/Fehlertexte ohne URLs, Steuerzeichen und `::` |
| Supply Chain | `npm ci`, gepinntes `huggingface_hub==1.33.0`, Dependabot |
| Server-Betrieb (nicht aktiv) | Chat-API mit Typ-/Längenprüfung und generischen Fehlern; **kein Rate-Limit**; Next 14.2.35 hat Server-Advisories → vor Server-Betrieb Upgrade nötig |

## 8. Entscheidungen (und warum)

| Entscheidung | Begründung |
| :--- | :--- |
| Static Export statt Server/Docker | Kostenlos auf HF, keine Laufzeit-Angriffsfläche, keine Secrets im Betrieb |
| Daten im Repo committen | Historie/Nachvollziehbarkeit, last-known-good für Builds, hält Scheduled Workflows aktiv (GitHub deaktiviert sie nach 60 Tagen Inaktivität) |
| 4 Läufe/Tag zu Minute :17 | Läufe zur vollen Stunde wurden von GitHub um 5–7 h verzögert; mehrere Läufe puffern Ausfälle |
| Deploy und Daten-Commit unabhängig nach dem Build | Ein Fehler in einem Schritt blockiert nicht still den anderen (Ursache des alten Ausfalls) |
| Kennzahlen nie vom LLM | Keine halluzinierten Zahlen; Bericht funktioniert ohne Key identisch |
| Wochen-Label = ISO-Woche des Periodenendes | Montags entsteht automatisch der exakte Mo–So-Abschluss der Vorwoche |
| Squash-Merge von PRs | Ein Commit pro Änderung → einfacher Revert/Rollback |
| Daten-Commit legt `data/` über den neuesten Branch-Stand (statt Rebase) | `data/` wird pro Lauf komplett neu erzeugt; ein in der Warteschlange gestarteter Lauf von einem älteren Commit würde sonst immer an Konflikten in `meta.json` scheitern |
| Zeitabhängige Preisanzeige im Browser | Der Static Export ist bis zu 6 h alt; „jetzt“ und „Morgen Ø“ werden aus der mitgelieferten Preisreihe für die Uhrzeit des Besuchers bestimmt |
| Wochenfenster wartet auf vollständig veröffentlichten Vortag | Energy-Charts hinkt 2–3 h hinterher; sonst würde der 00:17-Lauf die Woche mit einem unvollständigen Sonntag abschließen |

## 9. Historie

| Version | Inhalt |
| :--- | :--- |
| v1 (Aug 2026) | Dashboard mit Mock-Daten, Mock-Wochenberichten, Gemini-Chat |
| v2 (24.09.2026) | Echte Daten via Energy-Charts, täglicher Cron – **lief nie erfolgreich** (Push 403, `HF_TOKEN` fehlte, Fehler wurden verschluckt) |
| v3 (08.10.2026, PR #1) | Robuste Pipeline, automatische Berichte, Verifikation, Monitoring, Security-Härtung; erstes erfolgreiches Deployment 08.10.2026 |
| v3.1 (08.10.2026) | Review-Fixes: vollständiger Vortag/DST, Berichts-Refresh, Live-Preis im Browser, Markdown im Advisor, Daten-Commit ohne Rebase; Doku (`CLAUDE.md`, `docs/`), Offline-E2E |
