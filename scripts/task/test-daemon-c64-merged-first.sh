#!/usr/bin/env bash
# scripts/task/test-daemon-c64-merged-first.sh — C64 TDD
#
# C64 버그: phase_sprint_signals()가 sprint_wait_ci 실패 시 STATUS=FAILED를 기록하면서
# PR이 이미 MERGED인 경우(auto-merge 후 post-merge deploy.yml 초회 실패)도 구분하지 못함.
#
# Fix: CI wait 전에 PR state 선체크 → state=MERGED면 CI/merge skip.
#      CI wait 실패 후에도 PR state 재확인 → MERGED면 merged 처리로 복구.
#
# Scenario 1: PR 이미 MERGED + STATUS=DONE signal → STATUS가 FAILED 되지 않음
# Scenario 2: CI wait fail + PR state=MERGED (race) → STATUS가 FAILED 되지 않음

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAEMON="$SCRIPT_DIR/task-daemon.sh"

TMP=$(mktemp -d)
PROJECT="Foundry-X-c64-$$"
REPO="$TMP/$PROJECT"
# 기존 /tmp/sprint-signals/*.signal 과 격리
export SPRINT_SIGNAL_DIR="$TMP/sprint-signals"
SIG_FILE="${SPRINT_SIGNAL_DIR}/${PROJECT}-999.signal"
DAEMON_LOG="/tmp/task-signals/daemon-${PROJECT}.log"

cleanup() {
  rm -rf "$TMP"
  rm -f "$SIG_FILE" "$DAEMON_LOG"
}
trap cleanup EXIT

export FX_HOME="$TMP/fx-home"
mkdir -p "$FX_HOME" "$SPRINT_SIGNAL_DIR" /tmp/task-signals /tmp/task-retry

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

# ─── Fake gh CLI: PR은 MERGED, checks는 실패 ─────────────────────────────────
FAKE_BIN="$TMP/fake-bin"
mkdir -p "$FAKE_BIN"
cat > "$FAKE_BIN/gh" << 'GHEOF'
#!/usr/bin/env bash
# pr view --json state → MERGED (Scenario 1: auto-merge 이미 완료)
if [[ "$*" == *"pr view"* ]] && [[ "$*" == *"--json state"* ]]; then
  if [[ "$*" == *"--jq"* ]]; then
    echo "MERGED"
  else
    printf '{"state":"MERGED","mergedAt":"2026-04-14T07:00:33Z"}'
  fi
  exit 0
fi

# pr list → PR #582 반환
if [[ "$*" == *"pr list"* ]]; then
  echo '[{"number":582}]'
  exit 0
fi

# pr checks --watch --fail-fast → FAIL (S292 시나리오: deploy.yml 초회 실패)
if [[ "$*" == *"pr checks"* ]]; then
  echo "deploy.yml completed failure"
  exit 1
fi

# pr merge → 이미 MERGED PR은 gh에서 exit 1 (무해)
if [[ "$*" == *"pr merge"* ]]; then
  echo "Pull request #582 was already merged" >&2
  exit 1
fi

# pr review --approve → ignore
if [[ "$*" == *"pr review"* ]]; then
  exit 0
fi

echo "[]"
GHEOF
chmod +x "$FAKE_BIN/gh"

# timeout CLI도 stub (daemon의 sprint_wait_ci가 timeout --foreground 사용)
cat > "$FAKE_BIN/timeout" << 'TEOF'
#!/usr/bin/env bash
# --foreground, --kill-after=... "${SPRINT_CI_TIMEOUT}s" CMD ARGS...
# 단순히 나머지 인자들을 그대로 실행
while [[ "$1" == --* ]] || [[ "$1" =~ ^[0-9]+s?$ ]]; do shift; done
exec "$@"
TEOF
chmod +x "$FAKE_BIN/timeout"

export PATH="$FAKE_BIN:$PATH"

# ─── Scenario: STATUS=DONE signal + fake gh PR MERGED + CI fails ─────────────
echo "[test] C64 — PR already MERGED, CI check fails → STATUS must NOT be FAILED"

: > "$DAEMON_LOG"
cat > "$SIG_FILE" << SIGEOF
STATUS=DONE
SPRINT_NUM=999
PROJECT=${PROJECT}
F_ITEMS=F999
BRANCH=sprint/999
PR_NUM=582
GITHUB_REPO=${PROJECT}/${PROJECT}
PROJECT_ROOT=${REPO}
CHECKPOINT=session-end
MATCH_RATE=93
MONITOR_TASK_ID=
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SIGEOF

bash "$DAEMON" __debug-phase-sprint-signals >/tmp/fx-c64-s1.log 2>&1 \
  || { echo "--- stdout/stderr ---"; cat /tmp/fx-c64-s1.log; echo "--- daemon log ---"; cat "$DAEMON_LOG" 2>/dev/null; fail "__debug-phase-sprint-signals 비정상 종료"; }
pass "__debug-phase-sprint-signals 정상 종료"

# Verify: signal STATUS는 FAILED가 아니어야 함
FINAL_STATUS=$(grep "^STATUS=" "$SIG_FILE" 2>/dev/null | head -1 | cut -d= -f2)
if [ "$FINAL_STATUS" = "FAILED" ]; then
  echo "--- daemon log ---"
  cat "$DAEMON_LOG" 2>/dev/null
  echo "--- signal ---"
  cat "$SIG_FILE"
  fail "STATUS=FAILED (C64 버그) — PR MERGED인데 FAILED 오판"
fi
pass "STATUS≠FAILED — PR MERGED 우선 판정 적용 (C64 fix 적용)"

# Verify: daemon log에 PR state 선체크 마커 존재
if ! grep -qE "already MERGED|auto-merge 감지|PR state" "$DAEMON_LOG"; then
  echo "--- daemon log ---"
  cat "$DAEMON_LOG"
  fail "daemon log에 'PR already MERGED' 로그 마커 누락"
fi
pass "daemon log에 PR MERGED 감지 기록"

echo "[test] ✅ C64 hotfix TESTS PASSED"
