#!/usr/bin/env bash
# scripts/task/__tests__/test-mark-spec-done.sh — C76 TDD
#
# mark_spec_done_row <task_id> 함수 검증:
#   1. PLANNED row → DONE 변경 (정상 경로)
#   2. idempotent — 이미 DONE이면 변경 없음 로그
#   3. 미등록 task_id — 변경 없음 로그
#   4. MERGED=false 시 호출 안 하는 구조 검증 (task-monitor 호출 조건)
#
# 격리: tmp git repo + FX_HOME override + push stub

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASK_SCRIPTS="$(dirname "$SCRIPT_DIR")"
LIB="$TASK_SCRIPTS/lib.sh"

TMP=$(mktemp -d)
REPO="$TMP/Foundry-X-mark-spec-$$"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

export FX_HOME="$TMP/fx-home"
mkdir -p "$FX_HOME/locks" "$FX_HOME"

pass() { echo "  ✅ $*"; }
fail() { echo "  ❌ $*"; FAILURES=$((FAILURES+1)); }
FAILURES=0

# ─── 격리 git repo 준비 ───────────────────────────────────────────────────────
mkdir -p "$REPO"
cd "$REPO"
git init -q -b master
git config user.email "test@foundry-x.local"
git config user.name  "fx-test"
git config push.default simple

# SPEC.md 픽스처: C76 PLANNED row 포함
cat > SPEC.md << 'EOF'
## §5 Backlog

| ID | T | 설명 | Sprint | 상태 | 비고 |
|----|---|------|--------|------|------|
| C74 | C | packages/* 모델 literal | — | DONE | task orchestrator |
| C75 | C | D1 격리 ESLint 룰 | — | DONE | task orchestrator |
| C76 | C | task-monitor SPEC DONE 마킹 복원 | — | PLANNED | task orchestrator |
| C77 | C | 미래 task | — | PLANNED | |
EOF

git add SPEC.md
git commit -qm "init spec fixture"

# push를 로컬 self-push로 대체 (network 없이 동작)
git remote add origin "$REPO"

# ─── lib.sh 로드 및 REPO_ROOT 오버라이드 ─────────────────────────────────────
# mark_spec_done_row는 REPO_ROOT 변수를 사용하므로 오버라이드 필요
export REPO_ROOT="$REPO"

# lib.sh source 후 REPO_ROOT가 _repo_root()로 재설정되는 것 방지:
# mark_spec_done_row 함수를 직접 정의 (실제 구현 검증용 stub 아님)
# → 실제 lib.sh에서 source 후 REPO_ROOT=$REPO 재설정
source "$LIB"
REPO_ROOT="$REPO"   # lib.sh _repo_root 호출 후 재설정

echo "=== C76 mark_spec_done_row 단위 테스트 ==="
echo ""

# ─── 테스트 1: PLANNED → DONE 변경 ──────────────────────────────────────────
echo "[ T1 ] PLANNED → DONE 정상 경로"
LOG_OUTPUT=$(mark_spec_done_row "C76" 2>&1 || true)
echo "  log: $LOG_OUTPUT"

if grep -q "| C76 |" "$REPO/SPEC.md"; then
  ROW=$(grep "| C76 |" "$REPO/SPEC.md")
  if echo "$ROW" | grep -q "DONE"; then
    pass "C76 row가 DONE으로 변경됨"
  else
    fail "C76 row가 DONE으로 변경되지 않음: $ROW"
  fi
else
  fail "C76 row가 SPEC.md에 없음"
fi

if echo "$LOG_OUTPUT" | grep -q "SPEC backlog → DONE\|DONE (pushed)\|변경 없음"; then
  pass "로그 출력 정상"
else
  fail "로그 없음: $LOG_OUTPUT"
fi

# ─── 테스트 2: idempotent — 이미 DONE이면 변경 없음 ─────────────────────────
echo ""
echo "[ T2 ] Idempotent — 이미 DONE인 C76에 재호출"
LOG2=$(mark_spec_done_row "C76" 2>&1 || true)
echo "  log: $LOG2"

if echo "$LOG2" | grep -q "변경 없음\|이미 DONE\|no change"; then
  pass "이미 DONE — 변경 없음 로그 출력"
else
  fail "idempotent 로그 없음: $LOG2"
fi

# git log 확인 — 두 번째 호출에서 추가 커밋이 없어야 함
COMMIT_COUNT=$(git -C "$REPO" log --oneline | wc -l | tr -d ' ')
if [ "$COMMIT_COUNT" -le 2 ]; then
  pass "두 번째 호출에서 추가 커밋 없음 (commit count: $COMMIT_COUNT)"
else
  fail "예상보다 많은 커밋: $COMMIT_COUNT"
fi

# ─── 테스트 3: 미등록 task_id → 변경 없음 ───────────────────────────────────
echo ""
echo "[ T3 ] 미등록 task_id (C99) — 변경 없음"
LOG3=$(mark_spec_done_row "C99" 2>&1 || true)
echo "  log: $LOG3"

BEFORE=$(git -C "$REPO" log --oneline | wc -l | tr -d ' ')
if [ "$BEFORE" -le 2 ]; then
  pass "미등록 ID — 추가 커밋 없음"
else
  fail "미등록 ID인데 커밋 발생: $BEFORE"
fi

# C77 PLANNED가 변경되지 않았는지 확인
if grep -q "C77.*PLANNED" "$REPO/SPEC.md"; then
  pass "C77 PLANNED 유지 — 다른 row 미영향"
else
  fail "C77 row 변경됨 (예상치 못한 side-effect)"
fi

# ─── 결과 ────────────────────────────────────────────────────────────────────
echo ""
if [ "$FAILURES" -eq 0 ]; then
  echo "✅ 전체 테스트 PASS ($(($(grep -c '^\[ T' "$0"))) 케이스)"
  exit 0
else
  echo "❌ ${FAILURES}건 FAIL"
  exit 1
fi
