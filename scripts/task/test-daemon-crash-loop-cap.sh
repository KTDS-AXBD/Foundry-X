#!/usr/bin/env bash
# scripts/task/test-daemon-crash-loop-cap.sh — C88 (a)(b)(c)(d) / FX-REQ-625
#
# task-daemon crash loop 방어 단위 테스트.
#
#   Scenario A: 정상 시작 (counter 빈 상태) → exit 0
#   Scenario B: 1h 윈도우 내 2회 재시작 → exit 0 (cap 미만)
#   Scenario C: 1h 윈도우 내 3회 초과(4회) → exit 1 + stderr에 "수동 intervention"
#   Scenario D: heartbeat 60초 전 + 시작 시도 → stderr에 WARN
#   Scenario E: phase_recover에서 attempts=5 task → ndjson에 retry_attempts_total emit + 진입 차단
#
# Red Phase: lib.sh daemon_restart_guard() 미구현 + phase_recover pre-check 미구현 → 전부 FAIL.
# Green Phase: 5 scenarios 전부 PASS.

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAEMON="$SCRIPT_DIR/task-daemon.sh"
LIB="$SCRIPT_DIR/lib.sh"
[ -x "$DAEMON" ] || chmod +x "$DAEMON" 2>/dev/null || true

TMP=$(mktemp -d)
PROJECT="Foundry-X-clcap-$$"
export FX_HOME="$TMP/fx-home"
mkdir -p "$FX_HOME" /tmp/task-retry /tmp/task-signals

COUNTER_FILE="$FX_HOME/daemon-restart-counter"
HEARTBEAT_FILE="$FX_HOME/daemon-heartbeat"
WARN_LOG="$FX_HOME/daemon-warn.log"
EVENT_LOG="$FX_HOME/task-log.ndjson"
CACHE="$FX_HOME/tasks-cache.json"
DAEMON_LOG="/tmp/task-signals/daemon-${PROJECT}.log"

cleanup() {
  rm -rf "$TMP"
  rm -f "$DAEMON_LOG"
  rm -f "/tmp/task-retry/${PROJECT}-"*.json 2>/dev/null || true
  rm -f "/tmp/task-signals/${PROJECT}-"*.signal 2>/dev/null || true
}
trap cleanup EXIT

REPO="$TMP/$PROJECT"
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

echo "🧪 test-daemon-crash-loop-cap.sh"

# ─── Scenario A: 정상 시작 (counter 빈 상태) → exit 0 ───────────────────────
echo ""
echo "── Scenario A: 정상 시작 (빈 counter) ──"

rm -f "$COUNTER_FILE"

# daemon_restart_guard() 는 lib.sh에서 sourced 후 직접 호출
# __debug-restart-guard entry point로 테스트
guard_exit=0
bash "$DAEMON" __debug-restart-guard 2>/dev/null || guard_exit=$?

[ "$guard_exit" -eq 0 ] || fail "A: 빈 counter여야 exit 0, 실제=${guard_exit}"
[ -f "$COUNTER_FILE" ] || fail "A: counter 파일이 생성되어야 함"
count_a=$(jq 'length' "$COUNTER_FILE" 2>/dev/null || echo 0)
[ "$count_a" -ge 1 ] || fail "A: counter 파일에 epoch 1개 이상 기록되어야 함"
pass "Scenario A PASS (exit 0, counter=${count_a})"

# ─── Scenario B: 1h 윈도우 내 2회 재시작 → exit 0 ──────────────────────────
echo ""
echo "── Scenario B: 1h 윈도우 내 2회 기존 → exit 0 ──"

now=$(date +%s)
# 1h 내 2개 기존 epoch 주입
jq -n --argjson t1 $((now - 1800)) --argjson t2 $((now - 900)) '[$t1, $t2]' > "$COUNTER_FILE"

guard_exit=0
bash "$DAEMON" __debug-restart-guard 2>/dev/null || guard_exit=$?

[ "$guard_exit" -eq 0 ] || fail "B: 2회(+1=3)여야 exit 0, 실제=${guard_exit}"
count_b=$(jq 'length' "$COUNTER_FILE" 2>/dev/null || echo 0)
[ "$count_b" -eq 3 ] || fail "B: counter는 3이어야 함(기존2+신규1), 실제=${count_b}"
pass "Scenario B PASS (exit 0, counter=${count_b})"

# ─── Scenario C: 1h 윈도우 내 3회 초과(4회) → exit 1 ───────────────────────
echo ""
echo "── Scenario C: 1h 윈도우 내 4회 → exit 1 + warn ──"

now=$(date +%s)
# 1h 내 4개 기존 epoch (이미 cap 초과)
jq -n \
  --argjson t1 $((now - 3000)) \
  --argjson t2 $((now - 2000)) \
  --argjson t3 $((now - 1000)) \
  --argjson t4 $((now - 500)) \
  '[$t1, $t2, $t3, $t4]' > "$COUNTER_FILE"

guard_exit=0
stderr_c=$(bash "$DAEMON" __debug-restart-guard 2>&1 1>/dev/null) || guard_exit=$?

[ "$guard_exit" -ne 0 ] || fail "C: 4회 재시작이면 exit 1 이어야 함"
echo "$stderr_c" | grep -qi "수동\|intervention\|crash" || \
  fail "C: stderr에 수동 intervention 안내 없음 (got: ${stderr_c})"
pass "Scenario C PASS (exit 1, warn 출력)"

# ─── Scenario D: heartbeat 60초 전 + 시작 → WARN on stderr ─────────────────
echo ""
echo "── Scenario D: heartbeat 60초 전 → WARN 출력 ──"

rm -f "$COUNTER_FILE"

# heartbeat 파일을 60초 전 mtime으로 생성
hb_ts=$(date -d "60 seconds ago" -Iseconds 2>/dev/null || date -v -60S -Iseconds 2>/dev/null || date -Iseconds)
echo "$hb_ts" > "$HEARTBEAT_FILE"
touch -d "60 seconds ago" "$HEARTBEAT_FILE" 2>/dev/null || true

# __debug-heartbeat-stale 로 heartbeat stale 경고만 테스트
stderr_d=$(bash "$DAEMON" __debug-heartbeat-stale 2>&1) || true

echo "$stderr_d" | grep -qiE "crash|stale|WARN|warn|경고" || \
  fail "D: stderr에 heartbeat stale 경고 없음 (got: ${stderr_d:-<empty>})"
pass "Scenario D PASS (WARN 포함 출력)"

# ─── Scenario E: phase_recover + attempts=5 → ndjson emit + block ───────────
echo ""
echo "── Scenario E: phase_recover attempts=5 → retry_attempts_total + block ──"

rm -f "$EVENT_LOG"
: > "$EVENT_LOG"

# tasks-cache.json 에 task C99 in_progress 상태로 등록
echo '{"version":1,"tasks":{"C99":{"status":"in_progress","pane":"%99","branch":"task/C99-test","wt":"'"$TMP"'/wt99"}}}' > "$CACHE"

# retry 파일에 attempts=5 기록 (TASK_MAX_RETRY=5 도달)
mkdir -p /tmp/task-retry
retry_file="/tmp/task-retry/${PROJECT}-C99.json"
jq -n \
  --arg id "C99" --argjson at 5 \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{task_id:$id, attempts:$at, timestamp:$ts, last_error:"worker_inactive_empty_diff"}' \
  > "$retry_file"

# worktree 없으므로 __debug-recover 는 WT 없음으로 실패할 수 있음 — ndjson emit만 확인
wt_e="$TMP/wt99"
mkdir -p "$wt_e"
# wt에 작업 흔적 0 (빈 worktree) — phase_recover가 enqueue_retry로 향해야 함
# 단, attempts pre-check가 먼저 진입 차단해야 함
(cd "$wt_e" && git init -q -b master && git config user.email "t@t" && git config user.name t && git commit -q --allow-empty -m "task context init")

TASK_MAX_RETRY=5 bash "$DAEMON" __debug-recover C99 "$wt_e" 2>/dev/null || true

# ndjson에 retry_attempts_total 이벤트 기록 확인
event_found=0
if grep -q '"retry_attempts_total"' "$EVENT_LOG" 2>/dev/null; then
  event_found=1
fi
[ "$event_found" -eq 1 ] || fail "E: task-log.ndjson에 retry_attempts_total 이벤트 없음"

# 진입 차단 확인 — DAEMON_LOG에 "복구:" (work_commits 분석) 없어야 함
if grep -q "^.*복구:.*work_commits" "$DAEMON_LOG" 2>/dev/null; then
  fail "E: phase_recover가 work_commits 분석까지 진입함 (pre-check 차단 실패)"
fi
pass "Scenario E PASS (retry_attempts_total emit + 진입 차단)"

# ─── cleanup retry file ───────────────────────────────────────────────────────
rm -f "$retry_file" 2>/dev/null || true

echo ""
echo "✅ All scenarios PASS"
