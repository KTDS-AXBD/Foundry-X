#!/usr/bin/env bash
# scripts/task/test-task-complete-empty.sh — FX-REQ-514 / C22
#
# task-complete.sh의 empty-commit 감지 경로 단위 테스트.
# 실제 push/PR 없이 --dry-run 모드로 두 시나리오 검증.
#
#   scenario 1: empty commit  → exit 22 + signal 파일 부재
#   scenario 2: non-empty     → exit 0  (dry-run)
#
# 독립 tmp git repo를 만들고 FX_HOME을 격리해 실제 cache/log 오염 없음.

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASK_COMPLETE="$SCRIPT_DIR/task-complete.sh"

[ -x "$TASK_COMPLETE" ] || chmod +x "$TASK_COMPLETE" 2>/dev/null || true

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

export FX_HOME="$TMP/fx-home"
mkdir -p "$FX_HOME"

# Unique project directory so signal path can't collide with real projects.
REPO="$TMP/fx-empty-test-$$"
mkdir -p "$REPO"
cd "$REPO"

git init -q -b master
git config user.email "test@foundry-x.local"
git config user.name  "fx-test"
echo "init" > README.md
git add README.md
git commit -qm "init on master"

BRANCH="test/empty-$$"
git checkout -q -b "$BRANCH"

cat > .task-context <<EOF
TASK_ID=B999
BRANCH=$BRANCH
TASK_TYPE=B
TITLE=empty-commit-unit-test
EOF

PROJECT=$(basename "$REPO")
SIG_FILE="/tmp/task-signals/${PROJECT}-B999.signal"
rm -f "$SIG_FILE"

pass() { echo "  ✅ $*"; }
fail() { echo "  ❌ $*" >&2; exit 1; }

# ─── Scenario 1: empty commit ───────────────────────────────────────────────
echo "[test] scenario 1 — empty commit should be rejected with exit 22"
git commit --allow-empty -qm "empty worker commit"

set +e
bash "$TASK_COMPLETE" --dry-run >/tmp/fx-test-s1.log 2>&1
RC=$?
set -e

[ "$RC" -eq 22 ] || { cat /tmp/fx-test-s1.log; fail "expected exit 22, got $RC"; }
pass "exit code = 22"

[ ! -f "$SIG_FILE" ] || fail "signal file must NOT exist for empty commit: $SIG_FILE"
pass "signal file absent"

grep -q "EMPTY_COMMIT_REJECTED" /tmp/fx-test-s1.log \
  || { cat /tmp/fx-test-s1.log; fail "EMPTY_COMMIT_REJECTED marker missing"; }
pass "error message printed"

# ─── Scenario 2: non-empty commit ───────────────────────────────────────────
echo "[test] scenario 2 — real file change should pass empty check"
git reset --hard master -q
echo "real change" > payload.txt
git add payload.txt
git commit -qm "add payload"

rm -f "$SIG_FILE"
set +e
bash "$TASK_COMPLETE" --dry-run >/tmp/fx-test-s2.log 2>&1
RC=$?
set -e

[ "$RC" -eq 0 ] || { cat /tmp/fx-test-s2.log; fail "expected exit 0, got $RC"; }
pass "exit code = 0"

grep -q "dry-run OK" /tmp/fx-test-s2.log \
  || { cat /tmp/fx-test-s2.log; fail "dry-run OK marker missing"; }
pass "dry-run OK marker printed"

# dry-run must not write signal either
[ ! -f "$SIG_FILE" ] || fail "dry-run must not write signal file"
pass "signal file absent (dry-run)"

# ─── Scenario 3: empty commit stacked on real commit (aggregate check) ──────
echo "[test] scenario 3 — real + empty commit stack should still pass (aggregate > 0)"
git commit --allow-empty -qm "follow-up empty"
set +e
bash "$TASK_COMPLETE" --dry-run >/tmp/fx-test-s3.log 2>&1
RC=$?
set -e
[ "$RC" -eq 0 ] || { cat /tmp/fx-test-s3.log; fail "aggregate non-empty — expected exit 0, got $RC"; }
pass "aggregate non-empty passes"

# ─── Scenario 4: C79 — auto-commit skip when stage is empty after filter ────
# Worker가 이미 fix commit을 만든 상태에서, 남은 untracked가 task-context/prompt만
# 있어 filter 후 staging이 비어있는 경우, 두 번째 chore commit을 생성하지 않아야
# 해요. 현재 구현은 "미커밋 변경 감지" 로그 후 `git commit ... || true`로 silently
# fail하지만, 실행 의도(skip)가 로그에 드러나지 않음. 이 scenario는 after-fix의
# explicit skip 로그를 회귀 보호해요.
echo "[test] scenario 4 — C79 auto-commit skip when stage empty after filter"
git reset --hard master -q
echo "real worker fix" > payload.txt
git add payload.txt
git commit -qm "feat: worker fix commit"

# .task-context from Scenario 1 setup remains as the only untracked file — it must
# be stripped by the filter, leaving the stage empty after `git add`. Do NOT
# overwrite it here; preserve the BRANCH/TASK_ID fields task-complete.sh sources.
[ -f .task-context ] || fail "scenario 4 precondition: .task-context must exist from scenario 1 setup"

PRE_COMMIT_COUNT=$(git rev-list master..HEAD --count)
rm -f "$SIG_FILE"
set +e
bash "$TASK_COMPLETE" --dry-run >/tmp/fx-test-s4.log 2>&1
RC=$?
set -e
POST_COMMIT_COUNT=$(git rev-list master..HEAD --count)

[ "$RC" -eq 0 ] || { cat /tmp/fx-test-s4.log; fail "scenario 4 expected exit 0, got $RC"; }
pass "exit code = 0"

[ "$PRE_COMMIT_COUNT" -eq "$POST_COMMIT_COUNT" ] \
  || { cat /tmp/fx-test-s4.log; fail "scenario 4 expected no new commits (pre=$PRE_COMMIT_COUNT post=$POST_COMMIT_COUNT)"; }
pass "no auto-commit created (commit count preserved)"

grep -q "auto-commit skip" /tmp/fx-test-s4.log \
  || { cat /tmp/fx-test-s4.log; fail "scenario 4 expected 'auto-commit skip' marker in log"; }
pass "auto-commit skip marker logged"

echo "[test] ✅ ALL TESTS PASSED"
