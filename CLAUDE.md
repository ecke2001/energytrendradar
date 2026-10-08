# CLAUDE.md – Energy Trend Radar

Dashboard + weekly reports on Austria's power system (focus: hydro power). Next.js 14 **static export** hosted on a
**Hugging Face static Space**; all data is fetched and the site rebuilt/deployed by **GitHub Actions 4× a day**.
UI text, reports and most docs are **German**; code identifiers and comments are English.

Deeper docs: `docs/ARCHITECTURE.md` (how it works, data formats, API quirks), `docs/OPERATIONS.md` (runbook,
secrets, troubleshooting), `docs/DEVELOPMENT.md` (workflow, testing, how to extend), `plan.md` (history, roadmap).

## Commands

```bash
npm ci                    # install (lockfile only – never `npm install` in CI)
npm test                  # unit tests: node:test via tsx, scripts/tests/*.test.ts
npm run e2e:offline       # whole pipeline against mocked APIs in a temp dir (no network, data/ untouched)
npm run build             # type check + static export to out/
npm run dev               # local dev server (API route /api/agent/chat only works here, not on HF)
npm run validate-data     # schema + freshness check of data/*.json (--schema | --freshness)
npm run fetch-data        # LIVE: Energy-Charts + Google News → data/*.json (overwrites data/)
npm run generate-report   # LIVE data → data/reports.json (Gemini if GEMINI_API_KEY is set)
```

Before pushing: `npm test && npm run validate-data -- --schema && npm run build`.

## Architecture in one screen

```
.github/workflows/daily-update.yml  (cron 17 */6 * * *, + workflow_dispatch)
  npm test → scripts/fetch-data.ts → scripts/generate-report.ts → validate --schema → next build
  → scripts/deploy_hf.py (main only) → commit data/ → validate --freshness → issue on failure
data/*.json  ← written ONLY by the pipeline, imported at build time by lib/dataLoader.ts
app/, components/  ← static pages; freshness badge/banner computed in the browser
```

- `scripts/lib/energy.ts` – pure transforms of Energy-Charts responses (all unit-tested). `scripts/lib/news.ts` – RSS
  parsing + sanitising. `scripts/lib/report.ts` – report synthesis, Gemini prompt, AI-output validation.
  `scripts/lib/validate.ts` – schema/freshness checks. `scripts/lib/http.ts` – fetch with timeout/retry.
- `lib/time.ts` – **all** date logic pinned to `Europe/Vienna` (runner is UTC). Use these helpers, never bare
  `toLocaleString()` without `timeZone`.
- `lib/types.ts` – shared types for data files and reports; `lib/dataLoader.ts` – typed imports of `data/*.json`.

## Rules / invariants (don't break these)

- **Never hand-edit `data/*.json`** (except as placeholders: `reports.json` = `[]`, `weekly-stats.json` = `null`).
  Never commit output of `e2e:offline` or mocks into `data/`.
- **Numbers never come from the LLM.** Key figures are computed in `computeKeyFigures()`; Gemini only writes prose,
  and its JSON is validated by `validateAiReport()`. Without a key the report is data-only. Don't add invented facts
  to fallback text (international items / project updates come only from real headlines).
- **External content is untrusted.** RSS text goes through `toPlainText()`, links through `safeHttpUrl()` (pipeline)
  and `safeExternalUrl()` (UI). No `dangerouslySetInnerHTML`. Markdown export escapes via `md()`.
- **Secrets stay server-side/CI-only.** No `NEXT_PUBLIC_` secrets; `GEMINI_API_KEY` only in the report step,
  `HF_TOKEN` only in the deploy step (not during `pip install`). The static build must not contain
  `GEMINI_API_KEY`, `x-goog-api-key`, `generativelanguage` or `HF_TOKEN` (grep `out/` after build).
- **Static export ⇒ no server.** `app/api/*` routes don't exist on HF. Client features must work without them
  (see advisor fallback `lib/advisorFallback.ts`).
- **Hydration:** anything time-dependent in the UI (e.g. "data is X hours old") must be computed in `useEffect`
  (see `lib/useDataFreshness.ts`), never during render.
- Failures must be **loud**: no `exit 0` on missing secrets, no silent skips. A failed source keeps its last good file
  and is recorded in `meta.json.sourceStatus`.

## Energy-Charts API facts (verified against the live API, Oct 2026)

- `public_power?country=at&start=YYYY-MM-DD&end=YYYY-MM-DD` – MW, 15-min; current day padded with `null`; `Load`
  lags generation by ~1–3 h. Names: `Hydro Run-of-River`, `Hydro water reservoir`, `Hydro pumped storage`,
  `Hydro pumped storage consumption` (negative), `Solar`, `Wind onshore`, `Biomass`, `Fossil gas`, `Load`,
  `Renewable share of generation`, … (aliases in `PRODUCTION_ALIASES`).
- `price?bzn=AT&start&end` – EUR/MWh, 15-min; next day's day-ahead appears ~13:00 CET.
- `cbpf?country=at&start&end` – **GW, positive = import**; unpublished hours are padded with **0, not null**
  (handled by `isPublishedSlot`). Sign confirmed: weekly net import ≈ generation − load − pumping.
- Rate-limited: keep the 3 s gap between requests (`EC_REQUEST_GAP_MS`).

## Working in Claude Code cloud sessions

- `api.energy-charts.info` (and usually huggingface.co) are **blocked** by the session network policy. Use
  `npm run e2e:offline` locally; to test against the live APIs, push the branch and dispatch
  `daily-update.yml` on that branch – the HF deploy is skipped off `main`, data gets committed to the branch.
- GitHub access is via the GitHub MCP tools (Actions runs/logs, PRs), not `gh`.
- Branch work → PR → squash merge → the next run (or a manual dispatch on `main`) deploys.
