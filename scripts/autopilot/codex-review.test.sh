#!/usr/bin/env bash
# TDD Red — F551: codex-review.sh JSON 저장·파싱 검증 (mock Codex 응답)
# Sprint 300 | FX-REQ-588
set -euo pipefail

PASS=0
FAIL=0
REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRIPT="$REPO_ROOT/scripts/autopilot/codex-review.sh"
REVIEW_DIR="$REPO_ROOT/.claude/reviews/sprint-300"

ok() { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo "=== F551 codex-review 테스트 ==="

# T1: codex-review.sh 존재
if [ -f "$SCRIPT" ]; then
  ok "T1: codex-review.sh 존재"
else
  fail "T1: codex-review.sh 없음"
fi

# T2: 실행 가능
if [ -x "$SCRIPT" ]; then
  ok "T2: 실행 가능"
else
  fail "T2: 실행 불가"
fi

# --- mock 실행 테스트 (MOCK_CODEX=1 환경변수) ---
if [ -x "$SCRIPT" ]; then
  # T3: mock 모드로 실행 → JSON 파일 생성
  MOCK_CODEX=1 SPRINT_NUM=300 "$SCRIPT" --sprint 300 --dry-run 2>/dev/null || true
  if [ -d "$REVIEW_DIR" ]; then
    ok "T3: .claude/reviews/sprint-300/ 디렉터리 생성"
  else
    fail "T3: 리뷰 디렉터리 미생성"
  fi

  # T4: JSON 파일 생성 확인
  if [ -f "$REVIEW_DIR/codex-review.json" ]; then
    ok "T4: codex-review.json 파일 생성"
  else
    fail "T4: codex-review.json 미생성"
  fi

  # T5: verdict 필드 존재
  if [ -f "$REVIEW_DIR/codex-review.json" ] && \
     python3 -c "import json,sys; d=json.load(open('$REVIEW_DIR/codex-review.json')); assert 'verdict' in d" 2>/dev/null; then
    ok "T5: verdict 필드 존재"
  else
    fail "T5: verdict 필드 없음"
  fi

  # T6: degraded 필드 존재
  if [ -f "$REVIEW_DIR/codex-review.json" ] && \
     python3 -c "import json,sys; d=json.load(open('$REVIEW_DIR/codex-review.json')); assert 'degraded' in d" 2>/dev/null; then
    ok "T6: degraded 필드 존재"
  else
    fail "T6: degraded 필드 없음"
  fi
else
  fail "T3: 스크립트 없어 mock 실행 불가"
  fail "T4: 스크립트 없어 JSON 생성 불가"
  fail "T5: 스크립트 없어 verdict 확인 불가"
  fail "T6: 스크립트 없어 degraded 확인 불가"
fi

echo ""
echo "결과: PASS=$PASS FAIL=$FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "🔴 RED — 구현 필요 ($FAIL개 항목)"
  exit 1
else
  echo "🟢 GREEN — 모든 테스트 통과"
  exit 0
fi
