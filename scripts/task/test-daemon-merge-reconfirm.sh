#!/usr/bin/env bash
# scripts/task/test-daemon-merge-reconfirm.sh — C61 TDD
#
# A-fix: write_signal TIMESTAMP 필드가 $() 리터럴이 아닌 실제 날짜로 기록됨 검증
# B-fix: PR_URL=none + COMMIT_COUNT>0 + branch merged → MERGED=true (FINAL_STATUS=merged)
#
# 격리: tmp git repo + 격리 PROJECT 이름 (Foundry-X-reconfirm-PID)
#
# 주의:
#  - lib.sh FX_SIGNAL_DIR = /tmp/task-signals (hardcoded, not env-overridable)
#  - lib.sh _project_name() main-repo에서 "." 반환 → 파일 = .-{ID}.signal (dotfile)
#    bash glob *-{ID}.signal 로 매칭 안 됨 — find 사용 필요
#  - task-daemon.sh: PROJECT=$(basename REPO_ROOT) → 올바른 프로젝트명

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAEMON="$SCRIPT_DIR/task-daemon.sh"
LIB="$SCRIPT_DIR/lib.sh"
[ -x "$DAEMON" ] || chmod +x "$DAEMON" 2>/dev/null || true

TMP=$(mktemp -d)
PROJECT="Foundry-X-reconfirm-$$"
REPO="$TMP/$PROJECT"
SIG_DIR="/tmp/task-signals"
SIG_T777="${SIG_DIR}/${PROJECT}-T777.signal"   # Scenario 2: daemon PROJECT = basename REPO
DAEMON_LOG="${SIG_DIR}/daemon-${PROJECT}.log"

cleanup() {
  rm -rf "$TMP"
  # Remove any T888 signal written by lib.sh _project_name quirk
  find "$SIG_DIR" -maxdepth 1 -name "*-T888.signal" -delete 2>/dev/null || true
  rm -f "$SIG_T777" "$DAEMON_LOG"
}
trap cleanup EXIT

export FX_HOME="$TMP/fx-home"
mkdir -p "$FX_HOME" "$SIG_DIR" /tmp/task-retry

# Isolated git repo so daemon PROJECT = Foundry-X-reconfirm-$$
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

# ─── Fake gh CLI ─────────────────────────────────────────────────────────────
# `gh pr view <anything> --json state ...` → MERGED
FAKE_BIN="$TMP/fake-bin"
mkdir -p "$FAKE_BIN"
cat > "$FAKE_BIN/gh" << 'GHEOF'
#!/usr/bin/env bash
if [[ "$*" == *"pr view"* ]] && [[ "$*" == *"--json state"* ]]; then
  printf '{"state":"MERGED","mergedAt":"2026-04-14T01:21:41Z"}'
  exit 0
fi
echo "[]"
GHEOF
chmod +x "$FAKE_BIN/gh"
export PATH="$FAKE_BIN:$PATH"

# ─── Scenario 1: write_signal TIMESTAMP expansion ────────────────────────────
echo "[test] scenario 1 — write_signal TIMESTAMP must be expanded date, not literal \$(...)"

# Remove any leftover T888 signal
find "$SIG_DIR" -maxdepth 1 -name "*-T888.signal" -delete 2>/dev/null || true

(
  source "$LIB"
  write_signal "T888" "DONE" "BRANCH=test/branch" "PR_URL=none" "COMMIT_COUNT=0"
)

# lib.sh _project_name() returns "." in main repo → file is .-T888.signal (dotfile)
# Use find instead of glob (bash * skips dotfiles)
SIG_T888_ACTUAL=$(find "$SIG_DIR" -maxdepth 1 -name "*-T888.signal" 2>/dev/null | head -1 || true)
[ -n "$SIG_T888_ACTUAL" ] || fail "signal 파일 미생성 (in $SIG_DIR)"
pass "signal 파일 생성: $(basename "$SIG_T888_ACTUAL")"

TIMESTAMP_LINE=$(grep "^TIMESTAMP=" "$SIG_T888_ACTUAL")
[ -n "$TIMESTAMP_LINE" ] || fail "TIMESTAMP 필드 없음"
pass "TIMESTAMP 필드 존재"

# Must NOT contain '$(' literal (A-fix 핵심 검증)
if echo "$TIMESTAMP_LINE" | grep -qF "\$("; then
  fail "TIMESTAMP에 \$() 리터럴 발견 (A-fix 미적용): $TIMESTAMP_LINE"
fi
pass "TIMESTAMP 리터럴 \$() 없음"

# Must look like an ISO-8601 date
if ! echo "$TIMESTAMP_LINE" | grep -qE "^TIMESTAMP=[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}"; then
  fail "TIMESTAMP가 날짜 형식 아님: $TIMESTAMP_LINE"
fi
pass "TIMESTAMP 날짜 형식 확인 (A-fix)"

# ─── Scenario 2: PR_URL=none + COMMIT_COUNT>0 + branch merged ────────────────
echo "[test] scenario 2 — PR_URL=none COMMIT_COUNT=9, fake gh MERGED → FINAL_STATUS=merged"

rm -f "$SIG_T777"
: > "$DAEMON_LOG"

# Initialise FX cache with T777 in_progress
cat > "$FX_HOME/tasks-cache.json" << 'CACHEEOF'
{
  "version": 1,
  "tasks": {
    "T777": {
      "status": "in_progress",
      "track": "C",
      "pane": "",
      "wt": "",
      "branch": "task/T777-squash-test",
      "issue_url": "",
      "updated_at": "2026-04-14T01:00:00Z",
      "started_at": "2026-04-14T00:00:00Z"
    }
  }
}
CACHEEOF
touch "$FX_HOME/task-log.ndjson"
mkdir -p "$FX_HOME/locks" "$FX_HOME/scripts"

# Write signal: PR_URL=none + COMMIT_COUNT=9 (C55 재현)
TS_NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
cat > "$SIG_T777" << SIGEOF
TASK_ID=T777
STATUS=DONE
TIMESTAMP=${TS_NOW}
PROJECT=${PROJECT}
BRANCH=task/T777-squash-test
PR_URL=none
COMMIT_COUNT=9
WT_PATH=
PANE_ID=unknown
SIGEOF

# __debug-phase-signals: debug entry added to task-daemon.sh by B-fix
bash "$DAEMON" __debug-phase-signals >/tmp/fx-reconfirm-s2.log 2>&1 \
  || { echo "--- daemon log ---"; cat /tmp/fx-reconfirm-s2.log; fail "__debug-phase-signals 비정상 종료"; }
pass "__debug-phase-signals 정상 종료"

# Signal must be consumed (deleted)
[ ! -f "$SIG_T777" ] \
  || fail "signal 파일 미소비 — MERGED 처리 미완 (B-fix 미적용?)"
pass "signal 파일 소비"

# Cache: status must be merged
FINAL=$(jq -r '.tasks.T777.status // "missing"' "$FX_HOME/tasks-cache.json" 2>/dev/null)
[ "$FINAL" = "merged" ] \
  || fail "FINAL_STATUS='${FINAL}' — 'merged' 이어야 함 (B-fix 미적용)"
pass "FINAL_STATUS=merged (B-fix 확인)"

# Daemon log must record branch API recheck
grep -q "API 재조회" "$DAEMON_LOG" \
  || { cat "$DAEMON_LOG" 2>/dev/null; fail "daemon log에 'API 재조회' 마커 누락"; }
pass "daemon log branch API 재조회 기록"

echo "[test] ✅ ALL TESTS PASSED"
