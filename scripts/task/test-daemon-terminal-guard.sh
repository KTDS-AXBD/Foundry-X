#!/usr/bin/env bash
# scripts/task/test-daemon-terminal-guard.sh — C88 (e) / FX-REQ-625
#
# task-daemon.sh terminal state guard 단위 테스트.
# tasks-cache.json `.tasks[tid].status` 가 terminal(merged/failed/cancelled)인
# task가 복구 진입점에 도달했을 때 early return 되는지 검증한다.
#
#   scenario A: phase_recover + cache status=merged    → early return + guard 이벤트
#   scenario B: phase_recover + cache status=failed    → early return
#   scenario C: phase_recover + cache status=cancelled → early return
#   scenario D: phase_signals + cache status=failed    → signal 파일 보존 + skip 로그
#
# Red Phase 기준(현재 구현): guard 없어서 daemon 로그에
#   "복구: <tid> — work_commits=..."  이 찍힘 + guard 이벤트 미기록 → FAIL.
# Green Phase 기준: daemon 로그에 복구 진입 흔적 없음 + guard 이벤트 기록 → PASS.
#
# 격리: tmp git repo + 격리 PROJECT 이름으로 실제 retry/signal 디렉토리 오염 최소화.

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAEMON="$SCRIPT_DIR/task-daemon.sh"
[ -x "$DAEMON" ] || chmod +x "$DAEMON" 2>/dev/null || true

TMP=$(mktemp -d)
PROJECT="Foundry-X-termguard-$$"
export FX_HOME="$TMP/fx-home"
mkdir -p "$FX_HOME" /tmp/task-retry /tmp/task-signals

REPO="$TMP/$PROJECT"
CACHE="$FX_HOME/tasks-cache.json"
EVENT_LOG="$FX_HOME/task-log.ndjson"          # lib.sh: FX_LOG = task-log.ndjson
DAEMON_LOG="/tmp/task-signals/daemon-${PROJECT}.log"

cleanup() {
  rm -rf "$TMP"
  rm -f "$DAEMON_LOG"
  rm -f /tmp/task-retry/${PROJECT}-*.json 2>/dev/null || true
  rm -f /tmp/task-signals/${PROJECT}-*.signal 2>/dev/null || true
}
trap cleanup EXIT

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

# terminal cache fixture — 실제 작업 흔적도 있는 WT 제공.
# guard 가 없으면 phase_recover 가 work_commits 분석 → task-complete 실행까지 진입.
make_worker_wt() {
  local tid="$1" wt="$2"
  git worktree add -q -b "task/${tid}-tg" "$wt" master
  local base_sha; base_sha=$(git rev-parse HEAD)
  cat > "$wt/.task-context" <<EOF
TASK_ID=${tid}
TASK_TYPE=C
TITLE=terminal guard test
REQ_ID=FX-REQ-625
BRANCH=task/${tid}-tg
BASE_SHA=${base_sha}
EOF
  echo "prompt" > "$wt/.task-prompt"
  (cd "$wt" && git add .task-context .task-prompt && git commit -qm "chore(meta): ${tid} task context init")
  echo "real payload" > "$wt/out.txt"
  (cd "$wt" && git add out.txt && git commit -qm "feat: dummy worker output")
}

# cache 주입 — .tasks[tid].status 를 terminal 값으로 seed
seed_cache_terminal() {
  local tid="$1" status="$2" pane="${3:-%9999}" wt="${4:-/nonexistent}"
  if [ ! -f "$CACHE" ]; then
    echo '{"version":1,"tasks":{}}' > "$CACHE"
  fi
  local tmp; tmp=$(mktemp)
  jq --arg tid "$tid" --arg st "$status" --arg pn "$pane" --arg wt "$wt" \
    '.tasks[$tid] = {status:$st, track:"C", pane:$pn, wt:$wt}' \
    "$CACHE" > "$tmp" && mv "$tmp" "$CACHE"
}

# guard 이벤트 매칭 — FX_LOG 구조: {ts, id, event, extra}
grep_event() {
  local tid="$1" reason="$2"
  [ -f "$EVENT_LOG" ] || { echo 0; return; }
  jq -r --arg tid "$tid" --arg r "$reason" \
    'select(.id==$tid and .event==$r) | .event' "$EVENT_LOG" 2>/dev/null | wc -l
}

run_recover_scenario() {
  local label="$1" tid="$2" status="$3"
  local WT="$TMP/wt-${tid}"

  echo "[test] ${label} — phase_recover + cache status=${status} should early-return"
  make_worker_wt "$tid" "$WT"
  seed_cache_terminal "$tid" "$status" "%8888" "$WT"

  : > "$DAEMON_LOG"
  rm -f "$EVENT_LOG"

  # phase_recover 단독 호출 — exit code 는 무시 (Red 단계에서 task-complete 부재로 fail 할 수 있음).
  # 실제 guard 동작은 로그/이벤트로 판정한다.
  bash "$DAEMON" __debug-recover "$tid" "$WT" > "/tmp/fx-tg-${tid}.log" 2>&1 || true
  pass "${label}: phase_recover 호출 반환"

  # 핵심 1: daemon log에 "복구: <tid> — work_commits=..." 흔적 없어야 함 (guard로 진입 차단)
  if grep -q "복구: ${tid} — work_commits=" "$DAEMON_LOG" 2>/dev/null; then
    echo "---DAEMON_LOG---"; cat "$DAEMON_LOG"
    fail "${label}: phase_recover 가 복구 블록 진입 (guard 미동작)"
  fi
  pass "${label}: 복구 블록 미진입"

  # 핵심 2: guard 이벤트 기록
  local n; n=$(grep_event "$tid" "phase_recover_terminal_guard")
  [ "$n" -ge 1 ] || {
    [ -f "$EVENT_LOG" ] && { echo "---EVENT_LOG---"; cat "$EVENT_LOG"; }
    fail "${label}: phase_recover_terminal_guard 이벤트 누락 (expected ≥1, got ${n})"
  }
  pass "${label}: phase_recover_terminal_guard 이벤트 기록 (n=${n})"

  # 핵심 3: retry 파일 미생성 (guard 전 진입 시 empty-diff 분기로 retry 생길 가능성 차단)
  [ ! -f "/tmp/task-retry/${PROJECT}-${tid}.json" ] \
    || fail "${label}: retry 파일이 생성됨 (guard 이전 진입 의심)"
  pass "${label}: retry 파일 미생성"
}

# ─── Scenario A/B/C: phase_recover terminal states ──────────────────────────
run_recover_scenario "scenario A" "T997" "merged"
run_recover_scenario "scenario B" "T996" "failed"
run_recover_scenario "scenario C" "T995" "cancelled"

# ─── Scenario D: phase_signals + terminal cache → signal 파일 보존 ──────────
echo "[test] scenario D — phase_signals should skip when cache status=failed"
TID_D="T994"
SIGFILE="/tmp/task-signals/${PROJECT}-${TID_D}.signal"
cat > "$SIGFILE" <<EOF
TASK_ID=${TID_D}
STATUS=DONE
BRANCH=task/${TID_D}-tg
PR_URL=none
COMMIT_COUNT=0
WT_PATH=/nonexistent
PANE_ID=%9999
TIMESTAMP=$(date -Iseconds)
EOF

seed_cache_terminal "$TID_D" "failed" "%9999" "/nonexistent"

: > "$DAEMON_LOG"
rm -f "$EVENT_LOG"

# phase_signals 단독 호출 — 기존 __debug-phase-signals 진입점 (line 1121)
bash "$DAEMON" __debug-phase-signals > "/tmp/fx-tg-${TID_D}.log" 2>&1 || true
pass "scenario D: phase_signals 호출 반환"

# 핵심 1: guard 이벤트 기록
n=$(grep_event "$TID_D" "phase_signals_terminal_skip")
[ "$n" -ge 1 ] || {
  [ -f "$EVENT_LOG" ] && { echo "---EVENT_LOG---"; cat "$EVENT_LOG"; }
  fail "scenario D: phase_signals_terminal_skip 이벤트 누락 (got ${n})"
}
pass "scenario D: phase_signals_terminal_skip 이벤트 기록 (n=${n})"

# 핵심 2: signal 파일 보존 (guard 없으면 처리 시도 중 삭제)
[ -f "$SIGFILE" ] || fail "scenario D: signal 파일이 삭제됨 (guard 보존 실패)"
pass "scenario D: signal 파일 보존"

# 핵심 3: daemon log에 "📡 signal: <tid>" 진입 흔적 없어야 함 (guard로 진입 차단)
if grep -q "📡 signal: ${TID_D}" "$DAEMON_LOG" 2>/dev/null; then
  echo "---DAEMON_LOG---"; cat "$DAEMON_LOG"
  fail "scenario D: phase_signals 가 처리 블록 진입 (guard 미동작)"
fi
pass "scenario D: phase_signals 처리 블록 미진입"

echo "[test] ✅ ALL TESTS PASSED"
