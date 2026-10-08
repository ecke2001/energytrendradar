# Betrieb & Runbook – Energy Trend Radar

Alles, was man für den laufenden Betrieb braucht: Einstellungen, manuelles Deployment, Überwachung, Fehlersuche.
Architektur: [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Systeme & Zugänge

| System | Wo | Zweck |
| :--- | :--- | :--- |
| GitHub Repo | https://github.com/ecke2001/energytrendradar (Branch `main`) | Code, Daten, Pipeline |
| GitHub Actions | Repo → *Actions* → „Energy Radar Update (Daten, Berichte & HF Deploy)“ | 4× täglich Daten + Deploy |
| Hugging Face Space | https://huggingface.co/spaces/ecke1985/energy-trend-radar-agent (privat, `sdk: static`) | Website |
| Energy-Charts API | https://api.energy-charts.info (kein Key) | Messdaten |
| Google AI Studio | https://aistudio.google.com/app/apikey | optionaler Gemini-Key |

## 2. Einstellungen (Repo → Settings → Secrets and variables → Actions)

| Name | Art | Pflicht | Wert / Hinweis |
| :--- | :--- | :--- | :--- |
| `HF_TOKEN` | Secret | **ja** | Hugging Face *Fine-grained* Token mit Schreibrecht **nur** auf `ecke1985/energy-trend-radar-agent`. Ist gesetzt und funktioniert (08.10.2026). |
| `GEMINI_API_KEY` | Secret | nein | Ohne Key: datenbasierte Berichte. Mit Key: Berichtstext von Gemini (Zahlen bleiben aus Messdaten). |
| `HF_SPACE_ID` | Variable | nein | Default `ecke1985/energy-trend-radar-agent` |
| `GEMINI_MODEL` | Variable | nein | Default-Kette `gemini-2.5-flash` → `gemini-flash-latest`; nur setzen, wenn ein Modell abgekündigt wird |

Optionale Umgebungsvariablen der Skripte (lokal oder im Workflow unter `env:`):
`MAX_DATA_AGE_HOURS` (36), `MAX_REPORT_AGE_DAYS` (8), `REPORT_REFRESH_HOURS` (20).

Workflow-Rechte: In *Settings → Actions → General → Workflow permissions* genügt „Read repository contents“ –
der Workflow fordert die nötigen Rechte (`contents: write`, `issues: write`) selbst an.

## 3. Ablauf eines Pipeline-Laufs

Zeitplan: **00:17, 06:17, 12:17, 18:17 UTC** (MESZ +2 h, MEZ +1 h). GitHub kann geplante Läufe verzögern.

| Schritt | Bricht ab bei | Folge |
| :--- | :--- | :--- |
| `npm ci`, `npm test` | Install-/Testfehler | Nichts wird geändert |
| `fetch-data` | nur bei Totalabsturz | Einzelne Quellen dürfen scheitern → alte Datei bleibt, Status in `meta.json` |
| `generate-report` | fehlender `generation.json` | Bei veralteten Daten (> 36 h) wird bewusst **kein** neuer Bericht erstellt |
| `validate-data --schema` | ungültige Dateien | Kein Build, kein Deploy, kein Commit |
| `build` | Typ-/Buildfehler | Kein Deploy, kein Commit |
| Deploy (nur `main`) | fehlendes/ungültiges `HF_TOKEN`, Uploadfehler, Verifikation | Lauf rot, Issue |
| Commit & Push `data/` | Push nach 3 Versuchen gescheitert | Lauf rot, Issue |
| `validate-data --freshness` | Daten > 36 h, Bericht > 8 Tage | Lauf rot, Issue (Website zeigt Hinweis) |

## 4. Häufige Aufgaben

### Sofort aktualisieren / deployen
*Actions → Energy Radar Update → Run workflow → Branch `main`.* Dauer ca. 1 Minute. Erfolgskontrolle: Log des
Schritts „Deploy to Hugging Face Space“ endet mit `✅ Deployment verifiziert: … (Daten bis …)`.

### Änderungen live gegen die echten APIs testen, ohne zu deployen
Branch pushen, dann *Run workflow* auf diesem Branch. Deploy wird übersprungen (nur `main`), die Daten werden auf
den Branch committet. Danach lokal `git pull`.

### Manuelles Deployment vom eigenen Rechner (Notfall)
```bash
npm ci && npm run build
python3 -m pip install "huggingface_hub==1.33.0"
read -rs HF_TOKEN && export HF_TOKEN          # Token nicht in die Shell-History schreiben
HF_SPACE_ID=ecke1985/energy-trend-radar-agent python3 scripts/deploy_hf.py
```

### Rollback
Ein PR = ein Squash-Commit auf `main`. Zurücknehmen: `git revert <commit>` (oder „Revert“-Button im PR), pushen,
dann *Run workflow* auf `main`. Datenstände: jeder Lauf ist ein eigener `chore(data)`-Commit.

### Token erneuern (HF)
1. huggingface.co → Settings → Access Tokens → neuen *Fine-grained* Token mit „Write“ nur auf den Space.
2. GitHub → Secret `HF_TOKEN` überschreiben. 3. Alten Token löschen. 4. *Run workflow* auf `main` zur Kontrolle.

### Dependabot-PRs
Kommen wöchentlich. `ci.yml` prüft Tests + Build. Minor/Patch-Gruppen nach grünem CI mergen; Major-Updates
(z. B. Next.js) einzeln testen – siehe Roadmap in `plan.md`.

## 5. Überwachung

- **Website:** Badge oben rechts (grün „Daten aktuell“ ≤ 30 h, gelb ≤ 72 h, rot darüber) + Warnbanner ab gelb.
- **`status.json`** im Space: `deployedAt`, `dataAsOf`, `latestReport`, `commit`, `workflowRun`.
- **GitHub-Issue** „Energy Radar: automatisches Update fehlgeschlagen“: wird bei fehlgeschlagenen *geplanten*
  Läufen geöffnet/kommentiert und nach dem nächsten erfolgreichen geplanten Lauf automatisch geschlossen.
- **`data/meta.json`** im Repo: `sourceStatus` je Quelle mit letztem Erfolg und Fehlertext, `warnings`.
- GitHub schickt zusätzlich E-Mails bei fehlgeschlagenen geplanten Workflows (Standard-Benachrichtigung).

## 6. Fehlersuche

| Symptom | Wahrscheinliche Ursache | Lösung |
| :--- | :--- | :--- |
| Deploy-Schritt: `HF_TOKEN ist nicht gesetzt` | Secret fehlt / falscher Name | Secret exakt `HF_TOKEN` anlegen |
| Deploy-Schritt: 401/403 von Hugging Face | Token abgelaufen, falsches Konto, kein Schreibrecht auf den Space | Token erneuern (§4) |
| Deploy-Schritt: `HF_SPACE_ID … ungültig` | Variable falsch gesetzt | Format `owner/space-name` |
| Commit-Schritt: `Push … fehlgeschlagen` / 403 | Org-/Repo-Policy verbietet Schreibrechte für Workflows | Settings → Actions → General prüfen; Branch-Protection auf `main` darf `github-actions[bot]` nicht blockieren |
| `meta.json`: `generation`/`prices` `ok: false`, `HTTP 503`/`timeout` | Energy-Charts gestört | Abwarten – nächster Lauf holt nach; alte Daten bleiben sichtbar mit Alters-Hinweis |
| Fehler `public_power: neither run-of-river nor load found (types: …)` | Energy-Charts hat Produktionsarten umbenannt | Namen aus dem Log in `PRODUCTION_ALIASES` (`scripts/lib/energy.ts`) ergänzen, Test anpassen |
| Warnung `keine Pumpspeicher-Verbrauchsreihe gefunden` | dito für `Hydro pumped storage consumption` | wie oben |
| Warnung `cross-border: Vorzeichen widerspricht der Erzeugungsbilanz` | Energy-Charts hat die Vorzeichen-Konvention geändert | `transformCrossBorder`/`aggregateNetExportDaily` prüfen (aktuell: positiv = Import) |
| Grenzflüsse fast alle 0 MW | Energy-Charts füllt unveröffentlichte Stunden mit 0 | Bereits behandelt (`isPublishedSlot`); falls erneut: Schwelle prüfen |
| `weeklyStats`: `only N complete days available` / `ohne Zeitraum` | Datumsbereich-Anfrage gescheitert | Log prüfen; Bericht fällt auf Momentaufnahme zurück |
| `news`: `keine aktuellen Meldungen erhalten` | Google News blockiert/leer | Unkritisch; alte Meldungen bleiben |
| Gemini: `HTTP 404` für alle Modelle | Modelle abgekündigt | Variable `GEMINI_MODEL` auf aktuelles Modell setzen |
| Gemini: `HTTP 400/403` | Key ungültig/gesperrt | Neuen Key in AI Studio, Secret ersetzen |
| Bericht wird nicht neu erzeugt | Daten > 36 h alt oder Bericht < 20 h alt mit gleichem Zeitraum | Gewollt; Zwangsupdate lokal: `REPORT_REFRESH_HOURS=0 npm run generate-report` |
| Freshness-Schritt rot, sonst grün | Energy-Charts liefert seit > 36 h keine neuen Daten | Quelle prüfen (`meta.json`); Website zeigt Warnung |
| Geplante Läufe kommen gar nicht | GitHub deaktiviert Schedules nach 60 Tagen ohne Repo-Aktivität (öffentliche Repos) | In *Actions* Workflow wieder aktivieren; Daten-Commits verhindern das normalerweise |
| Seite zeigt alte Version trotz erfolgreichem Lauf | Browser-/CDN-Cache | Hart neu laden; `status.json` prüfen |
