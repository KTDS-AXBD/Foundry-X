#!/usr/bin/env bash
# Sprint Watch Liveness — Monitor 프로세스 생존 감시 + 자동 재시작 (max 3회)
#
# ⚠️  DEPRECATED (C42, 2026-04-12): sprint-merge-monitor.sh 자체가 deprecated 됨에 따라
#     이 liveness guard도 더 이상 필요 없습니다. Sprint signal 처리는 task-daemon.sh가
#     담당하며, task-daemon의 --bg 옵션이 heartbeat 기반 자동 재시작을 포함합니다.
#     파일은 참조용으로 보존합니다.
#
# 호출 주체: sprint-watch once (5분 주기). 독립 실행도 가능.
#
# 출력: markdown 테이블 행 (sprint-watch SKILL.md Gist 포맷에 그대로 삽입 가능)
#   | 프로세스 | PID | 가동시간 | 상태 |
#
# 종료 코드: 0 (항상)

set -o pipefail

SIGNAL_DIR="${SPRINT_SIGNAL_DIR:-/tmp/sprint-signals}"
RESTART_COUNT_FILE="${SIGNAL_DIR}/monitor-restart-counts"
MAX_RESTART=3

mkdir -p "$SIGNAL_DIR"
touch "$RESTART_COUNT_FILE"

# Locate repo scripts directory (this script lives under <repo>/scripts).
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPRINT_SCRIPTS_DIR="${SPRINT_SCRIPTS_DIR:-$SELF_DIR}"

# 감시 대상: 이름:재시작 커맨드
# F500: sprint-merge-monitor 상시 감시 대상으로 추가.
# sprint-auto-approve 는 단발성이라 감시 대상 아님 (merge-monitor 내부 호출).
# sprint-pipeline-finalize 는 one-shot 이므로 제외.
MONITORS=(
  "sprint-merge-monitor:bash ${SPRINT_SCRIPTS_DIR}/sprint-merge-monitor.sh"
)

get_count() {
  local name=$1
  local v
  v=$(grep "^${name}=" "$RESTART_COUNT_FILE" 2>/dev/null | cut -d= -f2)
  echo "${v:-0}"
}

set_count() {
  local name=$1 val=$2
  sed -i "/^${name}=/d" "$RESTART_COUNT_FILE" 2>/dev/null || true
  echo "${name}=${val}" >> "$RESTART_COUNT_FILE"
}

for ENTRY in "${MONITORS[@]}"; do
  NAME="${ENTRY%%:*}"
  CMD="${ENTRY#*:}"

  PID=$(pgrep -f "$NAME" 2>/dev/null | head -1)

  if [ -n "$PID" ]; then
    UPTIME=$(ps -o etime= -p "$PID" 2>/dev/null | tr -d ' ')
    printf "| %s | %s | %s | ✅ |\n" "$NAME" "$PID" "${UPTIME:-?}"
    continue
  fi

  PREV=$(get_count "$NAME")
  if [ "$PREV" -lt "$MAX_RESTART" ]; then
    LOG="${SIGNAL_DIR}/${NAME}-restart.log"
    nohup $CMD > "$LOG" 2>&1 & disown
    NEW_PID=$!
    NEW_COUNT=$((PREV + 1))
    set_count "$NAME" "$NEW_COUNT"
    printf "| %s | %s | 0s | 🔄 재시작 (%s/%s) |\n" "$NAME" "$NEW_PID" "$NEW_COUNT" "$MAX_RESTART"
  else
    printf "| %s | — | — | ❌ 재시작 한도 초과 |\n" "$NAME"
  fi
done

exit 0
