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

# === F554 추가 테스트 (Sprint 302 hotfix — Phase 5c 배선 검증) ===
echo ""
echo "=== F554 autopilot Phase 5c 배선 테스트 ==="

SKILL_FILE=""
# cache symlink 경로 (실제 실행 경로)
for f in ~/.claude/plugins/cache/ax-marketplace/ax/*/skills/sprint-autopilot/SKILL.md; do
  [ -f "$f" ] && SKILL_FILE="$f" && break
done
# fallback: marketplace source
[ -z "$SKILL_FILE" ] && SKILL_FILE="$HOME/.claude/plugins/marketplaces/ax-marketplace/skills/sprint-autopilot/SKILL.md"

# T7: sprint-autopilot SKILL.md에 codex-review.sh 참조 존재
if [ -f "$SKILL_FILE" ] && grep -q 'codex-review.sh' "$SKILL_FILE" 2>/dev/null; then
  ok "T7: sprint-autopilot SKILL.md에 codex-review.sh 참조 존재"
else
  fail "T7: sprint-autopilot SKILL.md에 codex-review.sh 참조 없음 (Dead Code)"
fi

# T8: BLOCK verdict 처리 로직 존재
if [ -f "$SKILL_FILE" ] && grep -q 'BLOCK' "$SKILL_FILE" 2>/dev/null; then
  ok "T8: BLOCK verdict 처리 로직 존재"
else
  fail "T8: BLOCK verdict 처리 없음"
fi

# T9: Step 5c 또는 Codex Cross-Review 섹션 존재
if [ -f "$SKILL_FILE" ] && grep -qE 'Step 5c|Codex Cross-Review|5c.*Codex' "$SKILL_FILE" 2>/dev/null; then
  ok "T9: Codex Cross-Review(5c) 섹션 존재"
else
  fail "T9: Codex Cross-Review 섹션 없음 (Sprint 302 배선 미완)"
fi

# T10: sprint-302 dogfood JSON — mock 실행으로 생성 가능성 검증
if [ -x "$SCRIPT" ]; then
  REVIEW_302="$REPO_ROOT/.claude/reviews/sprint-302"
  MOCK_CODEX=1 SPRINT_NUM=302 "$SCRIPT" --sprint 302 2>/dev/null || true
  if [ -f "$REVIEW_302/codex-review.json" ]; then
    ok "T10: .claude/reviews/sprint-302/codex-review.json 생성 가능"
  else
    fail "T10: sprint-302 리뷰 JSON 생성 실패"
  fi
else
  fail "T10: 스크립트 없어 sprint-302 JSON 생성 불가"
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
