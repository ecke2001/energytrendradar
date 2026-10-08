# Überarbeitungsplan v3 – Zuverlässige Aktualität & Sicherheit

> **Ziel**: Der Hugging Face Space zeigt **immer aktuelle Daten** und **aktuelle, automatisch erzeugte Wochenberichte**.
> Fehler in der Pipeline werden **sichtbar** statt stillschweigend ignoriert.
> (v2-Plan: siehe Git-Historie, Commit `cfec16b`.)
>
> **Status 08.10.2026:** v3 umgesetzt (PR #1, Squash-Commit `6d01b6d`), erstes erfolgreiches HF-Deployment am
> 08.10.2026 verifiziert. Danach v3.1: Review-Fixes (vollständiger Vortag/DST, Berichts-Refresh, Live-Preis,
> Daten-Commit ohne Rebase) und Dokumentation `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/OPERATIONS.md`,
> `docs/DEVELOPMENT.md`. Nächste Schritte: Abschnitt 7 (Roadmap).

---

## 1. Diagnose (Stand 08.10.2026)

| # | Befund | Auswirkung |
| :- | :--- | :--- |
| 1 | **Alle 13 geplanten Workflow-Läufe seit 25.09. fehlgeschlagen**: `git push` → `403 Permission denied to github-actions[bot]`. Der Workflow hatte keine `permissions: contents: write`. | Neue Daten wurden nie ins Repo übernommen, `data/` steht auf 24.09. |
| 2 | **`HF_TOKEN`-Secret nicht gesetzt** → Deploy-Schritt gibt nur eine Warnung aus und beendet sich mit Exit 0. | Der Space wurde **nie** automatisch aktualisiert, ohne dass es auffiel. |
| 3 | **Wochenberichte sind statische Mock-Daten** (`MOCK_WEEKLY_REPORTS`, KW 33, August 2026). Der Button „Neuen KI-Report generieren“ ruft `/api/agent/generate-report` auf – API-Routen existieren im Static Export auf HF **nicht**. | Berichte sind nie aktuell, Button schlägt still fehl. |
| 4 | **`gemini-1.5-flash` ist abgekündigt**, `GEMINI_API_KEY` ist ebenfalls nicht gesetzt. | KI-Funktionen laufen ausschließlich im Fallback. |
| 5 | **Datenfehler im Aggregator**: <br>• Cross-Border: letzter Zeitstempel enthält `null`, bzw. Werte kommen in GW und werden zu `0` gerundet → alle Flüsse `0 MW`.<br>• Erneuerbaren-Quote: Trend nur `null`.<br>• „Aktueller“ Spotpreis = letzter Wert des Tages (23:45), nicht der aktuelle Viertelstundenpreis.<br>• „24h“-Statistiken über 24 Viertelstunden (= 6 h).<br>• „48 Stunden“-Chart zeigt 48 Viertelstunden (= 12 h).<br>• Zeitlabels in UTC (CI-Runner) statt Europe/Vienna.<br>• News nach Relevanz statt Aktualität (Meldungen bis Mai 2026). | Falsche bzw. irreführende Kennzahlen. |
| 6 | Cron um `06:00 UTC` (Stoßzeit) → Läufe starteten erst 5–7 h verspätet; nur 1 Lauf/Tag. | Geringe Aktualität, kein Puffer bei Ausfällen. |
| 7 | UI zeigt „Live Echtdaten“ dauerhaft grün – auch wenn Daten Wochen alt sind. | Veraltete Daten nicht erkennbar. |

---

## 2. Ziel-Architektur

> Plan-Stand. Die umgesetzte Reihenfolge (Tests zuerst, Deploy vor Daten-Commit, beide unabhängig nach dem Build)
> steht in `docs/ARCHITECTURE.md` §1.

```
GitHub Actions (4×/Tag, :17 UTC, + manuell)
 1. npm ci                       (Lockfile-Integrität)
 2. fetch-data                   Energy-Charts (Erzeugung 8 Tage, Preise inkl. Day-Ahead, Cross-Border) + Google-News-RSS
                                 → robuste Transformation, Plausibilitätsprüfung, last-known-good je Quelle
                                 → data/*.json + data/weekly-stats.json + data/meta.json (Quellenstatus)
 3. generate-report              Wochenbericht KW n (rollierende 7 Tage) → data/reports.json (Archiv, 52 Wochen)
                                 Gemini (falls Key) mit Schema-Validierung, sonst datenbasierte Synthese
 4. validate-data --schema       Bricht ab, wenn Dateien ungültig sind (nichts Kaputtes deployen)
 5. npm test + npm run build     Unit-Tests der Transformationen, Static Export
 6. Commit & Push data/          mit contents:write, Rebase-Retry
 7. Deploy HF (nur main)         scripts/deploy_hf.py: Upload out/ + README, alte Chunks löschen,
                                 status.json herunterladen & verifizieren; fehlt HF_TOKEN → Fehler
 8. validate-data --freshness    Workflow wird rot, wenn Daten > 36 h alt oder Bericht veraltet
 9. Bei Fehler (Schedule)        GitHub-Issue anlegen/kommentieren; bei Erfolg automatisch schließen
```

Frontend (Static Export):
- Freshness-Banner + Status-Badge berechnen das Datenalter **im Browser** (gelb > 30 h, rot > 72 h).
- Berichte-Seite liest `data/reports.json` (keine Mock-Berichte, kein toter API-Button).
- Signal-Feed zeigt echte, aktuelle Meldungen; kuratierte Analysen klar als statisch gekennzeichnet.
- AI Advisor: ohne Backend (HF Static) datenbasierter Offline-Modus statt stiller Fehler.

---

## 3. Umsetzungsschritte

### Phase A – Pipeline reparieren & absichern
- [x] `permissions` minimal: global `contents: read`, Job `contents: write` + `issues: write`
- [x] `concurrency`-Gruppe, `timeout-minutes`, Cron `17 */6 * * *` (4×/Tag, außerhalb der Stoßzeit)
- [x] `npm ci` ohne `|| npm install`-Fallback; `huggingface_hub==1.33.0` gepinnt
- [x] Secrets nur in den Schritten, die sie brauchen (`GEMINI_API_KEY` nur im Report-Schritt)
- [x] Deploy nur von `main`; Space-ID per Repo-Variable `HF_SPACE_ID` (Default `ecke1985/energy-trend-radar-agent`)
- [x] Deploy-Verifikation über `status.json`; fehlendes `HF_TOKEN` = Fehler statt Warnung
- [x] Fehler → GitHub-Issue; Dependabot für Actions & npm

### Phase B – Datenqualität
- [x] `scripts/lib/energy.ts`: reine, getestete Transformationen (letzter gültiger Index, Zeitfenster per Zeitstempel, Europe/Vienna, GW→MW-Erkennung, Plausibilitätsgrenzen)
- [x] Wochenstatistik (GWh je Technologie, Preise, Negativpreis-Stunden, Netto-Export) für 7 Tage
- [x] News: mehrere Abfragen mit `when:14d`, nach Datum sortiert, HTML/Entities bereinigt, nur `http(s)`-Links, Längenlimits
- [x] `meta.json`: Status je Quelle (`ok`, `lastSuccess`, `dataUntil`, Fehler), `dataAsOf`, Warnungen
- [x] last-known-good: fällt eine Quelle aus, bleibt die letzte gültige Datei erhalten und wird als veraltet markiert

### Phase C – Aktuelle Berichte
- [x] `scripts/generate-report.ts`: KW nach ISO-8601 (Europe/Vienna), Berichtszeitraum explizit, Kennzahlen immer aus echten Daten berechnet
- [x] Gemini via REST (Modell per `GEMINI_MODEL`, Fallback-Kette), JSON-Ausgabe wird validiert & gekürzt
- [x] Fallback ohne Key: datenbasierte Synthese **ohne erfundene Fakten** (internationale Punkte & Projekte nur aus echten Schlagzeilen)
- [x] Archiv `data/reports.json` (max. 52 Berichte), tägliche Aktualisierung des laufenden Wochenberichts

### Phase D – Frontend
- [x] Freshness-Banner, Status-Badge in der Navbar, „Stand“-Angaben je Widget
- [x] Berichte-Seite: echte Berichte, Kennzahlen, Quellenliste, Markdown-Export mit korrektem Jahr
- [x] Dashboard/Feed: echte News; Mock-Trends als „kuratierte Hintergrund-Analysen (statisch)“ gekennzeichnet
- [x] Advisor: Offline-Fallback; `/api/agent/generate-report` entfernt; Chat-API mit Eingabevalidierung

### Phase E – Manuelle Schritte (Repo-Owner)
- [x] **`HF_TOKEN`** als GitHub-Secret angelegt (funktioniert, 08.10.2026). Empfehlung: *Fine-grained* mit Schreibrecht **nur** für `ecke1985/energy-trend-radar-agent`
- [ ] Optional **`GEMINI_API_KEY`** als Secret (Google AI Studio), optional Repo-Variable **`GEMINI_MODEL`**
- [ ] Optional Repo-Variable **`HF_SPACE_ID`**, falls der Space anders heißt
- [x] Workflow manuell auf `main` gestartet, Deployment verifiziert (Run 37745832670)
- [ ] Dependabot-PRs regelmäßig mergen
- [ ] Optional: *Settings → Actions → Workflow permissions* auf „Read“ zurücksetzen (Workflow fordert Rechte selbst an)

---

## 4. Sicherheitsprüfung

| Bereich | Risiko | Maßnahme |
| :--- | :--- | :--- |
| `GITHUB_TOKEN` | Zu breite Rechte | Global `contents: read`; nur der Update-Job bekommt `contents: write` + `issues: write` |
| `HF_TOKEN` | Missbrauch bei Leak | Fine-grained, nur Schreibrecht auf den einen Space; nur im Deploy-Schritt als Env; nie geloggt; README-Beispiel ohne Token im Befehl |
| `GEMINI_API_KEY` | Exposition im Client/Build | Nur im Report-Schritt; kein `NEXT_PUBLIC_`-Präfix; nie im Bundle (Build läuft ohne Key) |
| Supply Chain | Manipulierte Pakete | `npm ci` mit Lockfile, gepinntes `huggingface_hub`, Dependabot; Empfehlung: Actions auf Commit-SHA pinnen |
| RSS-Inhalte (untrusted) | XSS über Links/Titel | Bereinigung beim Import (Tags, Entities, Steuerzeichen, Länge), nur `http(s)`-URLs, React escaped Text, kein `dangerouslySetInnerHTML` |
| LLM / Prompt Injection | Schlagzeilen manipulieren den Bericht | Schlagzeilen als markierte, nicht vertrauenswürdige Daten; JSON-Schema-Validierung, Längenlimits, Enum-Prüfung; Kennzahlen kommen nie vom LLM; Ausgabe nur als Text gerendert |
| API-Routen (nur Docker-Betrieb) | Quota-Missbrauch, Fehlerdetails | Report-Route entfernt; Chat: Typ-/Längenprüfung, generische Fehlermeldungen. Für Docker-Betrieb zusätzlich Rate-Limiting nötig |
| Docker | `.env` im Image | `.env*` in `.dockerignore` |
| Next.js 14.2.35 | `npm audit`: mehrere Advisories (u. a. SSRF, Cache-Poisoning, Server Actions) | Betreffen den **Server**; im Static Export auf HF nicht ausnutzbar. Vor einem Docker/Server-Betrieb Upgrade auf Next 15/16 zwingend |
| Workflow-Injection | Untrusted Event-Daten in `run:` | Keine `${{ github.event.* }}`-Ausdrücke in Skripten; Werte über Env-Variablen |

---

## 5. Verifikation (08.10.2026)

- 28 Unit-Tests (Transformationen, News-Bereinigung, Berichte, Validierung), Build & Typprüfung grün.
- Pipeline zweimal per `workflow_dispatch` auf dem Feature-Branch gegen die **Live-APIs** gelaufen: alle Quellen OK, Daten-Push (vorher 403) erfolgreich, Aktualitätsprüfung bestanden. Deploy ist bewusst nur auf `main` aktiv.
- Live-Daten bestätigen die Cross-Border-Konvention (GW, positiv = Import): Wochen-Nettoimport 243,7 GWh ≈ Erzeugung − Last − Pumpen.
- Live-Lauf deckte auf, dass Energy-Charts unveröffentlichte Stunden mit `0` statt `null` füllt → behoben und mit Regressionstest abgesichert.

---

## 6. Betrieb & Monitoring

- **Wo sehe ich, ob alles läuft?** Navbar-Badge (grün/gelb/rot), `status.json` im Space, GitHub-Issue „Energy Radar: automatisches Update fehlgeschlagen“.
- **Lokal testen** (ohne Netzwerk): `npm test && npm run typecheck && npm run e2e:offline && npm run build`.
  Live-Abruf (`npm run fetch-data` …) überschreibt `data/` und ist in Claude-Cloud-Sessions gesperrt – siehe `docs/DEVELOPMENT.md`.
- **Schwellenwerte**: `MAX_DATA_AGE_HOURS` (Default 36), `MAX_REPORT_AGE_DAYS` (Default 8), `REPORT_REFRESH_HOURS` (Default 20).

---

## 7. Roadmap / offene Punkte

| Priorität | Thema | Details |
| :--- | :--- | :--- |
| Hoch (vor Server-Betrieb) | Next.js 14 → 15/16 (+ React 19, TypeScript 7) | `npm audit`: Server-Advisories ohne 14.x-Fix; im Static Export nicht ausnutzbar. Dependabot-PRs #6, #8, #9 sind rot und gehören hierher |
| Hoch | Offene Dependabot-PRs abarbeiten | #2–#4 (Actions, beheben Node-20-Warnungen) und #5 (minor/patch) nach grünem CI mergen; #7 (`@types/node` 26 ≠ Laufzeit Node 22) schließen |
| Mittel | Gemini-Key hinterlegen | Bessere Berichtstexte; Zahlen bleiben datenbasiert |
| Mittel | Pegel/Speicherfüllstände | ENTSO-E Transparency (Token) oder eHYD als neue Quelle (Rezept in `docs/DEVELOPMENT.md`) |
| Mittel | Actions auf Commit-SHAs pinnen | Supply-Chain-Härtung; Dependabot übernimmt Updates |
| Niedrig | Dockerfile reparieren oder entfernen | Ungültiges `apk`-Flag, `standalone`-Output fehlt |
| Niedrig | Kuratierte Trend-Analysen aktualisieren/automatisieren | `lib/mockData.ts` ist statisch |
| Niedrig | `@google/generative-ai` → `@google/genai` | nur Server-Advisor betroffen |

