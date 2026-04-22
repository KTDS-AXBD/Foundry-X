#!/usr/bin/env bash
# TDD Red — C81 check-scope-drift.sh 동작 검증
# test(preflight): C98/C81 red — scope drift detection behavior

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

SCRIPT="scripts/preflight/check-scope-drift.sh"
LIB="scripts/preflight/lib.sh"

# shellcheck source=../lib.sh
source "$LIB"

PASS_COUNT=0
FAIL_COUNT=0
TOTAL=0

# ─── Setup: fixture files ───────────────────────────────────────────
TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

# Fixture SPEC.md: Sprint 312 F-item with path patterns in backticks
FIXTURE_SPEC="$TMPDIR_TEST/SPEC.md"
cat > "$FIXTURE_SPEC" << 'SPEC_EOF'
## §5 F-items

| F-num | Title | Sprint | Status | Notes |
|-------|-------|--------|--------|-------|
| F560 | **Phase 45 · Discovery 완전 이관** — 범위: (a) `packages/api/src/core/discovery/routes/*` 7개 파일 `packages/fx-discovery/` 이동, (b) fx-gateway proxy 제거 (FX-REQ-603, P0) | Sprint 312 | ✅ | PR #654 |
SPEC_EOF

# Scenario 1 diff: files mostly match SPEC patterns (drift < 50%)
MATCH_DIFF="$TMPDIR_TEST/match.diff"
cat > "$MATCH_DIFF" << 'EOF'
packages/api/src/core/discovery/routes/extract.ts
packages/api/src/core/discovery/routes/list.ts
packages/fx-discovery/src/index.ts
docs/specs/notes.md
EOF

# Scenario 2 diff: files DON'T match SPEC patterns — Sprint 311 scope drift reproduction
DRIFT_DIFF="$TMPDIR_TEST/drift.diff"
cat > "$DRIFT_DIFF" << 'EOF'
packages/fx-shaping/src/routes/ax-bd.ts
packages/api/src/core/ax-bd-artifacts/routes.ts
packages/web/src/pages/shaping.tsx
EOF

# Scenario 3 diff: empty (no changes)
EMPTY_DIFF="$TMPDIR_TEST/empty.diff"
touch "$EMPTY_DIFF"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  test-scope-drift.sh — C98/C81 TDD Test (3 scenarios)"
echo "════════════════════════════════════════════════════════════"
echo ""

# ─── Scenario 1: Match — drift < 50% → exit 0 ────────────────────
echo "─── Scenario 1: Match case (3/4 files match → drift=25% < 50%) ───"
assert_exit \
  "Scenario 1: match → exit 0" \
  0 \
  env SPEC_FILE="$FIXTURE_SPEC" MOCK_GIT_DIFF="$MATCH_DIFF" \
  bash "$SCRIPT" "312"

assert_output_contains \
  "Scenario 1: output contains PASS" \
  "PASS" \
  env SPEC_FILE="$FIXTURE_SPEC" MOCK_GIT_DIFF="$MATCH_DIFF" \
  bash "$SCRIPT" "312"
echo ""

# ─── Scenario 2: Drift — drift >= 50% → exit 1 ──────────────────
echo "─── Scenario 2: Drift case (0/3 files match → drift=100% ≥ 50%) ───"
assert_exit \
  "Scenario 2: drift → exit 1" \
  1 \
  env SPEC_FILE="$FIXTURE_SPEC" MOCK_GIT_DIFF="$DRIFT_DIFF" \
  bash "$SCRIPT" "312"

assert_output_contains \
  "Scenario 2: output contains SCOPE DRIFT" \
  "SCOPE DRIFT" \
  env SPEC_FILE="$FIXTURE_SPEC" MOCK_GIT_DIFF="$DRIFT_DIFF" \
  bash "$SCRIPT" "312"
echo ""

# ─── Scenario 3: Empty diff → SKIP → exit 0 ─────────────────────
echo "─── Scenario 3: Empty diff → SKIP → exit 0 ───"
assert_exit \
  "Scenario 3: empty diff → exit 0" \
  0 \
  env SPEC_FILE="$FIXTURE_SPEC" MOCK_GIT_DIFF="$EMPTY_DIFF" \
  bash "$SCRIPT" "312"

assert_output_contains \
  "Scenario 3: output contains SKIP" \
  "SKIP" \
  env SPEC_FILE="$FIXTURE_SPEC" MOCK_GIT_DIFF="$EMPTY_DIFF" \
  bash "$SCRIPT" "312"
echo ""

print_summary

[ "$FAIL_COUNT" -eq 0 ] || exit 1
