#!/usr/bin/env bash
# scripts/task/test-reuse-id.sh — lookup_backlog_row() unit test
#
# Covers the SPEC row parser that backs task-start.sh --reuse-id.
# Uses a fixture SPEC in a temp dir so it does not touch the real repo.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

FAIL=0
pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1" >&2; FAIL=$((FAIL + 1)); }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

FIXTURE="$TMP/SPEC.md"
cat > "$FIXTURE" <<'EOF'
# Fixture

<!-- fx-task-orchestrator-backlog -->
### Task Orchestrator Backlog (B/C/X)

| ID | Type | 제목 | REQ | Sprint | 상태 | 비고 |
|----|------|------|-----|--------|------|------|
| C20 | C | task-complete.sh meta-only empty commit (FX-REQ-514) | — | DONE | forwarded to C22 |
| C21 | C | phase_recover worker inactivity (FX-REQ-515) | — | DONE | forwarded to C23 |
| C14 | C | E2E smoke A (FX-REQ-508) | — | CLOSED_EMPTY | tmux 3.4 victim |
| C30 | C | planned task waiting for execution (FX-REQ-599) | — | — | PLANNED | task orchestrator |
| B1 | B | bug fix example (FX-REQ-600) | — | — | IN_PROGRESS | worker running |
<!-- /fx-task-orchestrator-backlog -->

## §7 기술 스택
EOF

echo "== lookup_backlog_row() =="

# 1. PLANNED row
OUT=$(lookup_backlog_row "C30" "$FIXTURE")
[ "$OUT" = "FX-REQ-599|PLANNED" ] \
  && pass "PLANNED row: $OUT" \
  || fail "PLANNED row expected 'FX-REQ-599|PLANNED', got '$OUT'"

# 2. DONE row with inline REQ in title
OUT=$(lookup_backlog_row "C20" "$FIXTURE")
[ "$OUT" = "FX-REQ-514|DONE" ] \
  && pass "DONE row: $OUT" \
  || fail "DONE row expected 'FX-REQ-514|DONE', got '$OUT'"

# 3. CLOSED_EMPTY row (S257 victim)
OUT=$(lookup_backlog_row "C14" "$FIXTURE")
[ "$OUT" = "FX-REQ-508|CLOSED_EMPTY" ] \
  && pass "CLOSED_EMPTY row: $OUT" \
  || fail "CLOSED_EMPTY row expected 'FX-REQ-508|CLOSED_EMPTY', got '$OUT'"

# 4. IN_PROGRESS row (B-track)
OUT=$(lookup_backlog_row "B1" "$FIXTURE")
[ "$OUT" = "FX-REQ-600|IN_PROGRESS" ] \
  && pass "IN_PROGRESS row: $OUT" \
  || fail "IN_PROGRESS row expected 'FX-REQ-600|IN_PROGRESS', got '$OUT'"

# 5. Missing row → non-zero exit
if lookup_backlog_row "C999" "$FIXTURE" >/dev/null 2>&1; then
  fail "missing row: should have returned non-zero"
else
  pass "missing row: non-zero exit"
fi

# 6. Exact-ID match (must NOT fuzzy-match C2 when asked for C20)
OUT=$(lookup_backlog_row "C2" "$FIXTURE" 2>/dev/null || echo "NOTFOUND")
[ "$OUT" = "NOTFOUND" ] \
  && pass "exact match: C2 not confused with C20/C21" \
  || fail "exact match: C2 should not match, got '$OUT'"

echo
if [ "$FAIL" -eq 0 ]; then
  echo "== ALL TESTS PASSED =="
  exit 0
else
  echo "== $FAIL TEST(S) FAILED ==" >&2
  exit 1
fi
