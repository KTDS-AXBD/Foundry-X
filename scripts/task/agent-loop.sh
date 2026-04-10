#!/usr/bin/env bash
# scripts/task/agent-loop.sh — Master 오케스트레이터 (작업 연속 실행 루프)
#
# task 완료 → WIP 여유 감지 → 큐에서 다음 작업 자동 시작.
# task-monitor가 merge/cleanup을 처리하면, 이 루프가 빈 슬롯을 채움.
#
# Usage:
#   agent-loop.sh                       # 큐 상태 확인만
#   agent-loop.sh --start               # 루프 시작 (foreground)
#   agent-loop.sh --bg                  # 루프 시작 (background daemon)
#   agent-loop.sh --enqueue <track> "<title>" ["<prompt>"]  # 큐에 추가
#   agent-loop.sh --queue               # 큐 내용 출력
#   agent-loop.sh --drain               # 큐 비우기
#
# 큐 파일: ~/.foundry-x/task-queue.ndjson
#   {"track":"F","title":"...","prompt":"...","priority":1,"added_at":"..."}

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

QUEUE_FILE="$FX_HOME/task-queue.ndjson"
LOOP_PID_FILE="/tmp/task-signals/.loop.pid"
LOOP_LOG="/tmp/task-signals/loop-$(_project_name).log"
LOOP_INTERVAL="${FX_LOOP_INTERVAL:-60}"

[ -f "$QUEUE_FILE" ] || : > "$QUEUE_FILE"

REPO_ROOT=$(_repo_root)

log_loop() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOOP_LOG"; }

# ─── Enqueue ───────────────────────────────────────────────────────────────
enqueue() {
  local track="$1" title="$2" prompt="${3:-}"
  local priority="${4:-5}"

  case "$track" in B|C|X) ;; F)
    echo "[agent-loop] F-track은 Sprint 전용이에요. B/C/X를 사용해주세요." >&2; exit 1;;
  *)
    echo "[agent-loop] invalid track: $track (B|C|X)" >&2; exit 1;;
  esac

  jq -nc \
    --arg track "$track" --arg title "$title" --arg prompt "$prompt" \
    --argjson pri "$priority" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{track:$track, title:$title, prompt:$prompt, priority:$pri, added_at:$ts, status:"pending"}' \
    >> "$QUEUE_FILE"

  echo "[agent-loop] 큐 추가: [${track}] ${title} (priority=${priority})"
}

# ─── Show queue ────────────────────────────────────────────────────────────
show_queue() {
  local pending
  pending=$(grep '"status":"pending"' "$QUEUE_FILE" 2>/dev/null || true)

  if [ -z "$pending" ]; then
    echo "[agent-loop] 큐 비어있음"
    return
  fi

  echo ""
  echo "┌──────────────────────────────────────────────────"
  echo "│  📋 Task Queue"
  echo "├──────────────────────────────────────────────────"
  printf "│  %-4s %-3s %-35s %-5s\n" "#" "Trk" "Title" "Pri"
  echo "│  ──── ─── ─────────────────────────────── ─────"

  local idx=1
  echo "$pending" | while read -r line; do
    local track title pri
    track=$(echo "$line" | jq -r '.track')
    title=$(echo "$line" | jq -r '.title' | cut -c1-35)
    pri=$(echo "$line" | jq -r '.priority')
    printf "│  %-4s %-3s %-35s %-5s\n" "$idx" "$track" "$title" "$pri"
    idx=$((idx + 1))
  done

  echo "└──────────────────────────────────────────────────"
  echo ""
}

# ─── Drain queue ───────────────────────────────────────────────────────────
drain_queue() {
  : > "$QUEUE_FILE"
  echo "[agent-loop] 큐 초기화 완료"
}

# ─── Pick next from queue (highest priority first, then FIFO) ──────────────
pick_next() {
  local pending
  pending=$(grep '"status":"pending"' "$QUEUE_FILE" 2>/dev/null || true)
  [ -z "$pending" ] && return 1

  # Sort by priority (ascending = higher priority), then by added_at
  local next
  next=$(echo "$pending" | jq -s 'sort_by(.priority, .added_at) | .[0]' 2>/dev/null)
  [ -z "$next" ] || [ "$next" = "null" ] && return 1

  echo "$next"
}

# ─── Mark queue item as started ────────────────────────────────────────────
mark_started() {
  local title="$1"
  local tmp; tmp=$(mktemp)
  # Mark first matching pending item
  local found=false
  while IFS= read -r line; do
    if [ "$found" = false ] && echo "$line" | jq -e --arg t "$title" 'select(.title==$t and .status=="pending")' >/dev/null 2>&1; then
      echo "$line" | jq -c '.status="started"' >> "$tmp"
      found=true
    else
      echo "$line" >> "$tmp"
    fi
  done < "$QUEUE_FILE"
  mv "$tmp" "$QUEUE_FILE"
}

# ─── Ensure daemons running ───────────────────────────────────────────────
ensure_daemons() {
  # Monitor
  if ! [ -f /tmp/task-signals/.monitor.pid ] || ! kill -0 "$(cat /tmp/task-signals/.monitor.pid 2>/dev/null)" 2>/dev/null; then
    nohup bash "$REPO_ROOT/scripts/task/task-monitor.sh" --interval 30 \
      > "/tmp/task-signals/monitor-$(_project_name).log" 2>&1 &
    echo $! > /tmp/task-signals/.monitor.pid
    disown
    log_loop "monitor 재시작 (PID $!)"
  fi

  # Watch
  if ! [ -f /tmp/task-signals/.watch.pid ] || ! kill -0 "$(cat /tmp/task-signals/.watch.pid 2>/dev/null)" 2>/dev/null; then
    nohup bash "$REPO_ROOT/scripts/task/task-watch.sh" --interval 20 \
      > "/tmp/task-signals/watch-$(_project_name).log" 2>&1 &
    echo $! > /tmp/task-signals/.watch.pid
    disown
    log_loop "watch 재시작 (PID $!)"
  fi
}

# ─── Main loop ─────────────────────────────────────────────────────────────
run_loop() {
  log_loop "agent-loop 시작 — interval=${LOOP_INTERVAL}s"
  ensure_daemons

  while true; do
    # 1. Check WIP capacity
    local wip; wip=$(wip_count)
    if [ "$wip" -ge "$WIP_CAP" ]; then
      sleep "$LOOP_INTERVAL"
      continue
    fi

    # 2. Pick next from queue
    local next; next=$(pick_next) || {
      sleep "$LOOP_INTERVAL"
      continue
    }

    local track title prompt
    track=$(echo "$next" | jq -r '.track')
    title=$(echo "$next" | jq -r '.title')
    prompt=$(echo "$next" | jq -r '.prompt // ""')

    # 3. Ensure on master + clean
    local cur_branch; cur_branch=$(git branch --show-current 2>/dev/null)
    if [ "$cur_branch" != "master" ]; then
      log_loop "master 아님 (${cur_branch}) — 스킵"
      sleep "$LOOP_INTERVAL"
      continue
    fi

    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
      log_loop "dirty working tree — 스킵"
      sleep "$LOOP_INTERVAL"
      continue
    fi

    # 4. Pull latest
    git pull origin master --ff-only 2>/dev/null || true

    # 5. Start task
    log_loop "큐에서 시작: [${track}] ${title}"
    mark_started "$title"

    if bash "$REPO_ROOT/scripts/task/task-start.sh" "$track" "$title" "$prompt" 2>&1 | tee -a "$LOOP_LOG"; then
      log_loop "✅ task 시작 성공"
    else
      log_loop "❌ task 시작 실패 — 큐 아이템 스킵"
    fi

    # 6. Ensure daemons still running
    ensure_daemons

    sleep "$LOOP_INTERVAL"
  done
}

# ─── Dispatch ──────────────────────────────────────────────────────────────
case "${1:-}" in
  --enqueue)
    enqueue "${2:?track required}" "${3:?title required}" "${4:-}" "${5:-5}"
    ;;
  --queue|"")
    show_queue
    ;;
  --drain)
    drain_queue
    ;;
  --start)
    run_loop
    ;;
  --bg)
    mkdir -p /tmp/task-signals
    nohup bash "$0" --start > "$LOOP_LOG" 2>&1 &
    echo $! > "$LOOP_PID_FILE"
    disown
    echo "[agent-loop] Background 시작 (PID $!, log: $LOOP_LOG)"
    ;;
  --stop)
    if [ -f "$LOOP_PID_FILE" ] && kill -0 "$(cat "$LOOP_PID_FILE")" 2>/dev/null; then
      kill "$(cat "$LOOP_PID_FILE")"
      rm -f "$LOOP_PID_FILE"
      echo "[agent-loop] 중단 완료"
    else
      echo "[agent-loop] 실행 중 아님"
    fi
    ;;
  --status)
    if [ -f "$LOOP_PID_FILE" ] && kill -0 "$(cat "$LOOP_PID_FILE")" 2>/dev/null; then
      echo "[agent-loop] ✅ 실행 중 (PID $(cat "$LOOP_PID_FILE"))"
      show_queue
    else
      echo "[agent-loop] ⏹ 중단 상태"
      show_queue
    fi
    ;;
  *)
    echo "Usage: agent-loop.sh [--enqueue <T> <title> [prompt] [pri]|--queue|--start|--bg|--stop|--status|--drain]" >&2
    exit 1
    ;;
esac
