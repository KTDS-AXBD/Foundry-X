#!/usr/bin/env bash
# F608 MSA baseline regeneration script (manual run only)
# Usage: bash scripts/lint-baseline-update.sh
# Run this AFTER fixing violations to shrink the baseline.
# Do NOT run during autopilot — baseline changes must be intentional.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
API_DIR="$ROOT/packages/api"
cd "$API_DIR"

TMPJSON=$(mktemp)
trap 'rm -f "$TMPJSON"' EXIT

echo "📊 Scanning src/ for current MSA violations..."
node_modules/.bin/eslint 'src/**/*.ts' -f json > "$TMPJSON" 2>/dev/null || true

node -e "
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('$TMPJSON', 'utf8'));
const fp = new Set();
let msaErrors = 0, msaWarnings = 0;
d.forEach(f => f.messages.forEach(m => {
  if (m.ruleId && m.ruleId.startsWith('foundry-x-api/')) {
    const rel = f.filePath.replace(/.*\\/packages\\/api\\//, '');
    fp.add(rel + ':' + m.line + ':' + m.ruleId);
    if (m.severity === 2) msaErrors++; else msaWarnings++;
  }
}));
const sorted = [...fp].sort();
const prev = JSON.parse(fs.readFileSync('.eslint-baseline.json', 'utf8'));
const out = {
  version: '1.0',
  generated_at: new Date().toISOString(),
  description: prev.description,
  msa_total: sorted.length,
  msa_errors: msaErrors,
  msa_warnings: msaWarnings,
  fingerprints: sorted
};
fs.writeFileSync('.eslint-baseline.json', JSON.stringify(out, null, 2) + '\n');
console.log('✅ baseline updated: ' + sorted.length + ' violations (was ' + prev.msa_total + ')');
console.log('   errors: ' + msaErrors + ', warnings: ' + msaWarnings);
" 2>/dev/null
