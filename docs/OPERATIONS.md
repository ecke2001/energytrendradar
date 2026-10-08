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
| `generate-report` | fehlender `generation.json` | Datenbasierter Bericht wird bei jedem Lauf neu erstellt; bei veralteten Daten (> 36 h) bewusst **kein** neuer Bericht |
| `validate-data --schema` | ungültige Dateien | Kein Build, kein Deploy, kein Commit |
| `build` | Typ-/Buildfehler | Kein Deploy, kein Commit |
| Deploy (nur `main`) | fehlendes/ungültiges `HF_TOKEN`, Uploadfehler, Verifikation, Space-Status `*_ERROR` | Lauf rot, Issue |
| Commit & Push `data/` | Push nach 3 Versuchen gescheitert | Lauf rot, Issue. Der Schritt holt den neuesten Branch-Stand und legt die frisch erzeugten `data/` darüber (kein Rebase, keine Konflikte) |
| `validate-data --freshness` | Daten > 36 h, Bericht > 8 Tage | Lauf rot, Issue (Website zeigt Hinweis) |

## 4. Häufige Aufgaben

### Sofort aktualisieren / deployen
*Actions → Energy Radar Update → Run workflow → Branch `main`.* Dauer ca. 1 Minute. Erfolgskontrolle: Log des
Schritts „Deploy to Hugging Face Space“ endet mit `✅ Deployment verifiziert: … (Daten bis …)`.

### Änderungen live gegen die echten APIs testen, ohne zu deployen
Branch pushen, dann *Run workflow* auf diesem Branch. Deploy wird übersprungen (nur `main`), die Daten werden auf
den Branch committet. Danach lokal `git pull`.

**Vor dem Merge Daten auf `main`-Stand bringen:** `main` bekommt parallel bis zu 4 Daten-Commits pro Tag, daher hat
der PR sonst Konflikte in `data/`. Die Branch-Daten sind Wegwerfdaten:
```bash
git fetch origin && git merge origin/main      # bei Konflikten in data/:
git checkout origin/main -- data/ && git add data/ && git commit --no-edit
git push
```
Der letzte Commit im PR darf kein `chore(data) … [skip ci]`-Commit sein, sonst läuft `ci.yml` für den PR nicht
(der Merge-Commit oben löst CI wieder aus). Die Concurrency-Gruppe gilt branchübergreifend: Ein Branch-Lauf wartet
hinter einem laufenden `main`-Lauf; ist bereits ein Lauf wartend, ersetzt der neue ihn.

### Manuelles Deployment vom eigenen Rechner (Notfall)
Normalerweise reicht *Run workflow* auf `main`. Nur falls GitHub Actions nicht verfügbar ist (aus dem Repo-Root):
```bash
git switch main && git pull                    # aktuelle Daten-Commits holen – sonst werden ältere Daten deployt
npm ci && npm run build
python3 -m venv /tmp/hf-deploy && . /tmp/hf-deploy/bin/activate   # venv: System-Python verweigert pip (PEP 668)
pip install "huggingface_hub==1.33.0"
read -rs HF_TOKEN && export HF_TOKEN          # Token nicht in die Shell-History schreiben
HF_SPACE_ID=ecke1985/energy-trend-radar-agent python3 scripts/deploy_hf.py
```

### Rollback
Ein PR = ein Squash-Commit auf `main`. Zurücknehmen: `git revert <commit>` (oder „Revert“-Button im PR), pushen,
dann *Run workflow* auf `main`. Datenstände: jeder Lauf ist ein eigener `chore(data)`-Commit.

### Token erneuern (HF)
1. huggingface.co → Settings → Access Tokens → neuen *Fine-grained* Token mit „Write“ nur auf den Space.
2. GitHub → Secret `HF_TOKEN` überschreiben. 3. Alten Token löschen. 4. *Run workflow* auf `main` zur Kontrolle.

### Bericht sofort neu erzeugen
Ohne Gemini-Key passiert das bei jedem Lauf automatisch → *Run workflow* auf `main`. Mit Key wird ein unveränderter
KI-Bericht bis zu 20 h behalten; erzwingen: im Workflow beim Schritt „Generate weekly report“ vorübergehend
`REPORT_REFRESH_HOURS: '0'` unter `env:` setzen und dispatchen. Lokal (nur Test): `git pull` (Daten < 36 h), dann
`REPORT_REFRESH_HOURS=0 npm run generate-report` – wirkt erst nach Commit/Push auf `main` und einem Workflow-Lauf.

### Dependabot-PRs
Kommen wöchentlich. `ci.yml` prüft Tests, Typen + Build. Minor/Patch-Gruppen nach grünem CI mergen; Major-Updates
(Next.js, React, TypeScript) gehören zum Roadmap-Punkt „Next.js-Upgrade“ und werden gemeinsam migriert.
Stand 08.10.2026 offen: Actions-Updates #2–#4 (beheben die Node-20-Deprecation-Warnungen) und Gruppe #5 →
nach grünem CI mergen; #7 (`@types/node` 26) passt nicht zur Laufzeit Node 22 → besser schließen und Major ignorieren;
#6 (Next 16), #8 (React 19), #9 (TypeScript 7) → nicht einzeln mergen (Teil des Upgrades).

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
| Fehler `public_power: neither run-of-river nor load found (types: …)` | Energy-Charts hat Laufkraft **und** Last umbenannt | Namen aus dem Log in `PRODUCTION_ALIASES` (`scripts/lib/energy.ts`) ergänzen, Test + Mock anpassen |
| Laufkraft/Speicher/PV/Wind/Gas zeigt dauerhaft 0 MW, **kein** Fehler | Einzelne Produktionsart umbenannt (fehlende Reihen zählen still als 0) | Zeile „Produktionsarten:“ im Log von „Fetch energy data & news“ mit `PRODUCTION_ALIASES` vergleichen und ergänzen |
| Warnung `keine Pumpspeicher-Verbrauchsreihe gefunden` | dito für `Hydro pumped storage consumption` | wie oben |
| Warnung `cross-border: Vorzeichen widerspricht der Erzeugungsbilanz` | Energy-Charts hat die Vorzeichen-Konvention geändert | `transformCrossBorder`/`aggregateNetExportDaily` prüfen (aktuell: positiv = Import) |
| Grenzflüsse fast alle 0 MW | Energy-Charts füllt unveröffentlichte Stunden mit 0 | Bereits behandelt (`isPublishedSlot`); falls erneut: Schwelle prüfen |
| `weeklyStats`: `public_power ohne Zeitraum – keine Wochenstatistik möglich` | Datumsbereich-Anfrage gescheitert, nur Fallback „heute“ geladen | Log prüfen (HTTP-Fehler der Range-Anfrage). Folge: `weekly-stats.json` und `renewable-share.json` bleiben alt; der Bericht nutzt sie, solange ihr Ende ≥ vorgestern ist, danach Momentaufnahme |
| `weeklyStats`: `weekly stats: only N complete days available` | < 3 Tage im Fenster mit ≥ 90 % Abdeckung von Laufkraft **und** Last (Lücken/Verzug, umbenannte Reihe, zu kurze Historie) | Rohdaten/Log prüfen; Folgen wie oben |
| Statistik-Labels zeigen „9h“ statt „24h“ | Preis-Fallback ohne Zeitraum: Statistik deckt nur die heutigen Stunden ab (`windowHours`) | Gewollt (ehrliche Beschriftung); prüfen, warum die Range-Anfrage scheiterte |
| `news`: `keine aktuellen Meldungen erhalten` | Google News blockiert/leer | Unkritisch; alte Meldungen bleiben |
| Gemini: `HTTP 404` für alle Modelle | Modelle abgekündigt | Variable `GEMINI_MODEL` auf aktuelles Modell setzen |
| Gemini: `HTTP 400/403` | Key ungültig/gesperrt | Neuen Key in AI Studio, Secret ersetzen |
| Bericht wird nicht neu erzeugt | Daten > 36 h alt; mit Gemini-Key: unveränderte Wochensummen und Bericht < 20 h; oder neues Fenster endet früher als der gespeicherte Wochenbericht | Gewollt; erzwingen siehe §4 „Bericht sofort neu erzeugen“ |
| Montags früh steht noch die Vorwoche ohne Sonntag im Bericht | Sonntag ist um 00:17 UTC noch nicht vollständig veröffentlicht | Gewollt; ab dem 06:17-UTC-Lauf entsteht der Mo–So-Abschluss |
| Deploy-Schritt: `Space meldet CONFIG_ERROR` (o. ä.) | README-Front-Matter kaputt oder Space-Fehler | `README.md`-Kopf (`sdk: static` …) prüfen, Logs im Space ansehen |
| Freshness-Schritt rot, sonst grün | Energy-Charts liefert seit > 36 h keine neuen Daten | Quelle prüfen (`meta.json`); Website zeigt Warnung |
| Geplante Läufe kommen gar nicht | GitHub deaktiviert Schedules nach 60 Tagen ohne Repo-Aktivität (öffentliche Repos) | In *Actions* Workflow wieder aktivieren; Daten-Commits verhindern das normalerweise |
| Seite zeigt alte Version trotz erfolgreichem Lauf | Browser-/CDN-Cache | Hart neu laden; `status.json` prüfen |
