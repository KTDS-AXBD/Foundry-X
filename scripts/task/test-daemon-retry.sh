#!/usr/bin/env bash
# scripts/task/test-daemon-retry.sh — FX-REQ-517 / C23
#
# task-daemon.sh phase_recover empty-diff guard 단위 테스트.
#
#   scenario 1: 빈 worker WT     → recover 중단 + retry 파일 생성 + log '❗ retry'
#   scenario 2: 변경 있는 WT     → 기존 task-complete 경로 진입 (retry 미등록)
#   scenario 3: 빈 worker 재호출 → attempts 누적 (1→2)
#
# 격리: tmp git repo + 격리 PROJECT 이름으로 실제 retry/signal 디렉토리 오염 최소화.

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAEMON="$SCRIPT_DIR/task-daemon.sh"
[ -x "$DAEMON" ] || chmod +x "$DAEMON" 2>/dev/null || true

TMP=$(mktemp -d)
PROJECT="Foundry-X-retrytest-$$"
REPO="$TMP/$PROJECT"
RETRY_FILE_T999="/tmp/task-retry/${PROJECT}-T999.json"
RETRY_FILE_T998="/tmp/task-retry/${PROJECT}-T998.json"
DAEMON_LOG="/tmp/task-signals/daemon-${PROJECT}.log"
SIG_T998="/tmp/task-signals/${PROJECT}-T998.signal"

cleanup() {
  rm -rf "$TMP"
  rm -f "$RETRY_FILE_T999" "$RETRY_FILE_T998" "$DAEMON_LOG" "$SIG_T998"
}
trap cleanup EXIT

export FX_HOME="$TMP/fx-home"
mkdir -p "$FX_HOME" /tmp/task-retry /tmp/task-signals

mkdir -p "$REPO"
cd "$REPO"
git init -q -b master
git config user.email "test@foundry-x.local"
git config user.name  "fx-test"
echo "init" > README.md
git add README.md
git commit -qm "init"

pass() { echo "  ✅ $*"; }
fail() { echo "  ❌ $*" >&2; exit 1; }

# ─── Scenario 1: 빈 worker WT → retry 큐 등록 ──────────────────────────────
echo "[test] scenario 1 — empty worker WT should enqueue retry"
WT1="$TMP/wt-empty"
git worktree add -q -b "task/T999-empty" "$WT1" master
BASE_SHA=$(git rev-parse HEAD)
cat > "$WT1/.task-context" <<EOF
TASK_ID=T999
TASK_TYPE=C
TITLE=empty worker inactivity test
REQ_ID=FX-REQ-TEST
BRANCH=task/T999-empty
BASE_SHA=$BASE_SHA
EOF
echo "원본 prompt 텍스트" > "$WT1/.task-prompt"
# task-start.sh 실제 흐름과 동일: meta init 커밋 + 그 후 hook이 .task-context 갱신
(cd "$WT1" && git add .task-context .task-prompt && git commit -qm "chore(meta): T999 task context init")
# heartbeat hook이 갱신한 것처럼 .task-context 수정 (uncommitted) — empty 판정에 영향 없어야 함
echo "LAST_HEARTBEAT=2026-04-11T13:00:00Z" >> "$WT1/.task-context"

rm -f "$RETRY_FILE_T999" "$DAEMON_LOG"
: > "$DAEMON_LOG"

bash "$DAEMON" __debug-recover T999 "$WT1" >/tmp/fx-retry-test-s1.log 2>&1 \
  || { cat /tmp/fx-retry-test-s1.log; fail "phase_recover 비정상 종료"; }
pass "phase_recover 정상 종료"

[ -f "$RETRY_FILE_T999" ] || fail "retry 파일 미생성: $RETRY_FILE_T999"
pass "retry 파일 생성"

attempts=$(jq -r '.attempts' "$RETRY_FILE_T999")
[ "$attempts" = "1" ] || fail "attempts=1 이어야 함, got $attempts"
pass "attempts=1"

last_error=$(jq -r '.last_error' "$RETRY_FILE_T999")
[ "$last_error" = "worker_inactive_empty_diff" ] || fail "last_error 불일치: $last_error"
pass "last_error=worker_inactive_empty_diff"

prompt_saved=$(jq -r '.prompt' "$RETRY_FILE_T999")
[ "$prompt_saved" = "원본 prompt 텍스트" ] || fail "prompt 원본 보존 실패"
pass "prompt 원본 보존"

req_saved=$(jq -r '.req_code' "$RETRY_FILE_T999")
[ "$req_saved" = "FX-REQ-TEST" ] || fail "req_code 보존 실패: $req_saved"
pass "req_code 보존"

track_saved=$(jq -r '.track' "$RETRY_FILE_T999")
[ "$track_saved" = "C" ] || fail "track 보존 실패: $track_saved"
pass "track 보존"

branch_saved=$(jq -r '.branch' "$RETRY_FILE_T999")
[ "$branch_saved" = "task/T999-empty" ] || fail "branch 보존 실패: $branch_saved"
pass "branch 보존"

wt_saved=$(jq -r '.wt_path' "$RETRY_FILE_T999")
[ "$wt_saved" = "$WT1" ] || fail "wt_path 보존 실패: $wt_saved"
pass "wt_path 보존"

grep -q "❗ retry:T999" "$DAEMON_LOG" \
  || { cat "$DAEMON_LOG"; fail "daemon log에 ❗ retry:T999 마커 누락"; }
pass "daemon log ❗ retry:T999 기록"

# 빈 signal 파일이 생성되면 안 됨 (기존 동작과의 차이)
[ ! -f "/tmp/task-signals/${PROJECT}-T999.signal" ] \
  || fail "empty signal 파일이 생성되면 안 됨 (silent DONE 방지)"
pass "empty signal 파일 미생성"

# ─── Scenario 3: 빈 worker 재호출 → attempts 누적 ───────────────────────────
echo "[test] scenario 3 — re-invocation should bump attempts (1→2)"
bash "$DAEMON" __debug-recover T999 "$WT1" >>/tmp/fx-retry-test-s1.log 2>&1
attempts2=$(jq -r '.attempts' "$RETRY_FILE_T999")
[ "$attempts2" = "2" ] || fail "재호출 후 attempts=2 이어야 함, got $attempts2"
pass "재호출 시 attempts 누적 (=2)"

# 재호출 후에도 prompt/req_code 보존
prompt_saved2=$(jq -r '.prompt' "$RETRY_FILE_T999")
[ "$prompt_saved2" = "원본 prompt 텍스트" ] || fail "재호출 후 prompt 손실"
pass "재호출 후 prompt 보존"

# ─── Scenario 2: 변경 있는 WT → retry 큐 미등록 ─────────────────────────────
echo "[test] scenario 2 — WT with real worker commit should NOT enqueue retry"
WT2="$TMP/wt-working"
git worktree add -q -b "task/T998-working" "$WT2" master
BASE_SHA2=$(git rev-parse HEAD)
cat > "$WT2/.task-context" <<EOF
TASK_ID=T998
TASK_TYPE=C
TITLE=working worker test
REQ_ID=FX-REQ-TEST2
BRANCH=task/T998-working
BASE_SHA=$BASE_SHA2
EOF
echo "p" > "$WT2/.task-prompt"
(cd "$WT2" && git add .task-context .task-prompt && git commit -qm "chore(meta): T998 task context init")
echo "real change" > "$WT2/payload.txt"
(cd "$WT2" && git add payload.txt && git commit -qm "feat: real work")

rm -f "$RETRY_FILE_T998"

# task-complete.sh가 push에서 실패하는 건 무시 (retry 미등록만 검증)
bash "$DAEMON" __debug-recover T998 "$WT2" >/tmp/fx-retry-test-s2.log 2>&1 || true

[ ! -f "$RETRY_FILE_T998" ] || fail "변경 있는 WT는 retry 큐에 등록되면 안 됨"
pass "변경 있는 WT는 retry 큐 미등록"

echo "[test] ✅ ALL TESTS PASSED"
