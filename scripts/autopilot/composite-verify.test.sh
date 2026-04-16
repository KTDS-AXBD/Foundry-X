#!/usr/bin/env bash
# TDD Red — F551: composite-verify.sh 판정 매트릭스 5케이스 검증
# Sprint 300 | FX-REQ-588
set -euo pipefail

PASS=0
FAIL=0
REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRIPT="$REPO_ROOT/scripts/autopilot/composite-verify.sh"
TMP_DIR=$(mktemp -d)

ok() { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

# cleanup
trap 'rm -rf "$TMP_DIR"' EXIT

echo "=== F551 composite-verify 테스트 ==="

# T1: 스크립트 존재
if [ -f "$SCRIPT" ]; then
  ok "T1: composite-verify.sh 존재"
else
  fail "T1: composite-verify.sh 없음"
fi

# T2: 실행 가능
if [ -x "$SCRIPT" ]; then
  ok "T2: 실행 가능"
else
  fail "T2: 실행 불가"
fi

run_matrix() {
  local desc="$1" claude="$2" codex_verdict="$3" expected="$4"
  local json_file="$TMP_DIR/codex.json"

  # mock codex JSON 생성
  cat > "$json_file" << ENDJSON
{
  "verdict": "$codex_verdict",
  "degraded": $([ "$codex_verdict" = "unavailable" ] && echo "true" || echo "false"),
  "code_issues": []
}
ENDJSON

  if [ -x "$SCRIPT" ]; then
    result=$(CLAUDE_VERIFY_STATUS="$claude" CODEX_JSON_PATH="$json_file" "$SCRIPT" 2>/dev/null || true)
    if echo "$result" | grep -q "^$expected$\|VERDICT=$expected\|$expected"; then
      ok "$desc → $expected ✓"
    else
      fail "$desc → 기대=$expected 실제='$result'"
    fi
  else
    fail "$desc → 스크립트 없음"
  fi
}

# T3~T7: 판정 매트릭스 5케이스
run_matrix "T3: Claude=PASS + Codex=PASS" "PASS" "PASS" "PASS"
run_matrix "T4: Claude=PASS + Codex=WARN" "PASS" "WARN" "WARN"
run_matrix "T5: Claude=PASS + Codex=BLOCK" "PASS" "BLOCK" "BLOCK"
run_matrix "T6: Claude=FAIL + Codex=PASS" "FAIL" "PASS" "BLOCK"
run_matrix "T7: Claude=PASS + Codex=unavailable" "PASS" "unavailable" "PASS-degraded"

echo ""
echo "결과: PASS=$PASS FAIL=$FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "🔴 RED — 구현 필요 ($FAIL개 항목)"
  exit 1
else
  echo "🟢 GREEN — 모든 테스트 통과"
  exit 0
fi
