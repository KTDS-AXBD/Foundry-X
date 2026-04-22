#!/usr/bin/env bash
# scripts/task/__tests__/test-agent-loop-no-monitor-spawn.sh — C95 / FX-REQ-632
#
# ensure_daemons() 호출 후 task-monitor.sh 프로세스가 생성되지 않는지 검증.
# task-daemon.sh 가 Phase 1(signal 처리)을 흡수했으므로 agent-loop.sh 에서
# task-monitor.sh 스폰 블록이 제거됐어야 한다.
#
#   scenario: ensure_daemons() 호출 → task-monitor.sh PID 없음 → PASS
#             ensure_daemons() 호출 → task-monitor.sh 스폰됨   → FAIL (Red)
#
# Red  Phase: agent-loop.sh ensure_daemons() 에 monitor 스폰 블록 존재 → FAIL
# Green Phase: 블록 제거 후                                             → PASS
#
# 격리: tmp git repo + 스폰 감지용 가짜 task-monitor.sh + .monitor.pid 임시 이동

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASK_DIR="$(dirname "$SCRIPT_DIR")"

TMP=$(mktemp -d)
SPAWN_FLAG="$TMP/monitor-spawned"
SIGNAL_DIR="/tmp/task-signals"
MONITOR_PID_FILE="$SIGNAL_DIR/.monitor.pid"
WATCH_PID_FILE="$SIGNAL_DIR/.watch.pid"
MONITOR_PID_BAK="$TMP/.monitor.pid.bak"
WATCH_PID_BAK="$TMP/.watch.pid.bak"

mkdir -p "$SIGNAL_DIR"

pass() { echo "  ✅ $*"; }
fail() { echo "  ❌ $*" >&2; exit 1; }

cleanup() {
  # 가짜 task-monitor.sh 프로세스 정리
  pkill -f "$TMP/Foundry-X/scripts/task/task-monitor.sh" 2>/dev/null || true
  pkill -f "$TMP/Foundry-X/scripts/task/task-watch.sh"   2>/dev/null || true
  # 원본 PID 파일 복원
  mv "$MONITOR_PID_BAK" "$MONITOR_PID_FILE" 2>/dev/null || true
  mv "$WATCH_PID_BAK"   "$WATCH_PID_FILE"   2>/dev/null || true
  rm -rf "$TMP"
}
trap cleanup EXIT

# ─── 격리 git repo ────────────────────────────────────────────────────────
REPO="$TMP/Foundry-X"
mkdir -p "$REPO/scripts/task"
cd "$REPO"
git init -q -b master
git config user.email "test@foundry-x.local"
git config user.name  "fx-test"
echo "init" > README.md
git add README.md
git commit -qm "init"

export FX_HOME="$TMP/fx-home"
mkdir -p "$FX_HOME"

# 스폰 감지용 task-monitor.sh (스폰되면 SPAWN_FLAG 파일 생성)
cat > "$REPO/scripts/task/task-monitor.sh" << EOF
#!/usr/bin/env bash
touch "$SPAWN_FLAG"
sleep 30
EOF
chmod +x "$REPO/scripts/task/task-monitor.sh"

# task-watch.sh 스텁 (이 테스트 관심 밖)
cat > "$REPO/scripts/task/task-watch.sh" << 'EOF'
#!/usr/bin/env bash
sleep 30
EOF
chmod +x "$REPO/scripts/task/task-watch.sh"

# 실제 lib.sh, agent-loop.sh 복사 (현재 코드 기준 검증)
cp "$TASK_DIR/lib.sh"        "$REPO/scripts/task/lib.sh"
cp "$TASK_DIR/agent-loop.sh" "$REPO/scripts/task/agent-loop.sh"

# .monitor.pid / .watch.pid 임시 이동 → ensure_daemons 가 스폰 시도하도록
mv "$MONITOR_PID_FILE" "$MONITOR_PID_BAK" 2>/dev/null || true
mv "$WATCH_PID_FILE"   "$WATCH_PID_BAK"   2>/dev/null || true

# ─── ensure_daemons() 격리 실행 ──────────────────────────────────────────
(
  cd "$REPO"
  source "$REPO/scripts/task/agent-loop.sh"
  ensure_daemons
) 2>/dev/null || true

sleep 1  # 스폰된 프로세스가 SPAWN_FLAG 생성할 시간

# ─── 검증 ────────────────────────────────────────────────────────────────
echo "=== C95: ensure_daemons() task-monitor.sh 미생성 검증 ==="
if [ -f "$SPAWN_FLAG" ]; then
  fail "task-monitor.sh 가 스폰됨 — agent-loop.sh ensure_daemons() 에서 monitor 스폰 블록을 제거하세요 (C95/FX-REQ-632)"
else
  pass "ensure_daemons() 가 task-monitor.sh 를 스폰하지 않음"
fi

echo ""
echo "✅ All checks passed (C95 / FX-REQ-632)"
