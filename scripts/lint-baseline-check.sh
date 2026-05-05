#!/usr/bin/env bash
# F608 MSA Forward-only baseline check
# Usage: bash scripts/lint-baseline-check.sh [packages/api-root]
# Exits 1 if any MSA violation fingerprint is found that is NOT in .eslint-baseline.json

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
API_DIR="${1:-$ROOT/packages/api}"

cd "$API_DIR"

if [ ! -f ".eslint-baseline.json" ]; then
  echo "❌ .eslint-baseline.json not found in $API_DIR"
  exit 1
fi

TMPJSON=$(mktemp)
trap 'rm -f "$TMPJSON"' EXIT

# Full src/ scan — capture JSON output
node_modules/.bin/eslint 'src/**/*.ts' -f json > "$TMPJSON" 2>/dev/null || true

if [ ! -s "$TMPJSON" ]; then
  echo "⚠️  ESLint returned no output — check build state"
  exit 1
fi

# Compute new violations (current - baseline) via Node
RESULT=$(node -e "
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('$TMPJSON', 'utf8'));
const current = new Set();
d.forEach(f => f.messages.forEach(m => {
  if (m.ruleId && m.ruleId.startsWith('foundry-x-api/')) {
    const rel = f.filePath.replace(/.*\\/packages\\/api\\//, '');
    current.add(rel + ':' + m.line + ':' + m.ruleId);
  }
}));

const baseline = new Set(JSON.parse(fs.readFileSync('.eslint-baseline.json', 'utf8')).fingerprints);
const newV = [...current].filter(fp => !baseline.has(fp)).sort();
const result = { current: current.size, baseline: baseline.size, newViolations: newV };
console.log(JSON.stringify(result));
" 2>/dev/null)

CURRENT_COUNT=$(echo "$RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.current)" 2>/dev/null || echo "?")
BASELINE_COUNT=$(echo "$RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.baseline)" 2>/dev/null || echo "?")
NEW_JSON=$(echo "$RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); d.newViolations.forEach(v=>console.log(v))" 2>/dev/null || echo "")

if [ -n "$NEW_JSON" ]; then
  echo "❌ MSA regression detected — new violations not in baseline:"
  echo "$NEW_JSON" | sed 's/^/  /'
  echo ""
  echo "  Fix the violations above before merging."
  echo "  (To update baseline after intentional fix: run scripts/lint-baseline-update.sh)"
  exit 1
fi

echo "✅ MSA baseline maintained: ${CURRENT_COUNT} violations, all ${BASELINE_COUNT} in baseline"
