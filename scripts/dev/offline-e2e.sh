#!/usr/bin/env bash
# Offline end-to-end run of the data pipeline (fetch-data -> generate-report ->
# validate-data) against mocked APIs. Runs in a temporary directory, so the
# repository's data/ is never modified. Prints the directory with the results.
#
# Usage: npm run e2e:offline        (optionally KEEP=0 to delete the results)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TSX="$ROOT/node_modules/.bin/tsx"
MOCK="$ROOT/scripts/dev/mock-fetch.mjs"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/energy-radar-e2e.XXXXXX")"
[ "${KEEP:-1}" = "0" ] && trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/data"
cd "$WORK"

echo "▶ fetch-data (mock)"
"$TSX" --import "$MOCK" "$ROOT/scripts/fetch-data.ts"
echo "▶ generate-report (mock, Gemini answers 404 → data fallback)"
GEMINI_API_KEY="mock-key" "$TSX" --import "$MOCK" "$ROOT/scripts/generate-report.ts"
echo "▶ validate-data"
"$TSX" "$ROOT/scripts/validate-data.ts"

echo "✅ Offline E2E OK – Ergebnisse: $WORK/data"
