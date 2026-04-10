#!/usr/bin/env bash
# scripts/task/task-watch.sh — Master에서 background 실행, 활성 WT pane 실시간 감시
#
# Usage: task-watch.sh [--interval <seconds>] [--once]
#
# 기능:
#   1. 권한 프롬프트 자동 승인 (option 2: allow for session)
#   2. idle/stuck 감지 (5분 무변화 → log warning)
#   3. 완료 패턴 감지 (Cooked/Baked + idle → task-complete 미실행 알림)
#   4. 에러 감지 (Error, 실패, exit code)
#   5. 실시간 로그 → /tmp/task-signals/watch-{project}.log

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

INTERVAL="${2:-20}"
ONCE=false
[ "${1:-}" = "--once" ] && ONCE=true && INTERVAL="${2:-20}"
[ "${1:-}" = "--interval" ] && INTERVAL="${2:-20}"

REPO_ROOT=$(_repo_root)
PROJECT=$(basename "$REPO_ROOT" 2>/dev/null || echo "unknown")
WATCH_LOG="/tmp/task-signals/watch-${PROJECT}.log"
SNAPSHOT_DIR="/tmp/task-signals/snapshots"
mkdir -p "$SNAPSHOT_DIR" /tmp/task-signals

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$WATCH_LOG"; }

# ─── Permission prompt patterns ────────────────────────────────────────────
PERM_PATTERNS=(
  "Do you want to make this edit"
  "Do you want to run this command"
  "Do you want to create this file"
  "Allow Claude to"
)

# ─── Completion patterns (WT Claude finished work) ─────────────────────────
# NOTE: These patterns are checked against the last 40 lines of pane content.
# Add new patterns when agent-doctor --learn discovers unmatched completions.
DONE_PATTERNS=(
  # Claude Code timing banner (most reliable signal)
  "Cooked for"
  "Baked for"
  "Brewed for"
  "Befuddling"
  # Korean completion phrases
  "작업 완료"
  "작업이 완료"
  "수고하셨어요"
  "다른 작업 없"
  "완료됐어요"
  "완료했어요"
  "끝났어요"
  "마무리됐"
  # Delegation to task-complete (F498 failure case — Claude says "run task-complete")
  "task-complete"
  "task complete"
  # Common English completion phrases
  "All done"
  "work is complete"
  "finished"
  "I'm done"
)

# ─── Error patterns ────────────────────────────────────────────────────────
ERROR_PATTERNS=(
  "Error:"
  "FAILED"
  "exit code [1-9]"
  "Permission denied"
  "Module not found"
)

check_pane() {
  local task_id="$1" pane_id="$2"
  local snapshot_file="${SNAPSHOT_DIR}/${task_id}.snapshot"
  local prev_hash=""

  # Capture pane content
  local content
  content=$(tmux capture-pane -t "$pane_id" -p -S -40 2>/dev/null) || return 0
  local content_hash
  content_hash=$(echo "$content" | md5sum | cut -d' ' -f1)

  # Load previous snapshot
  if [ -f "$snapshot_file" ]; then
    prev_hash=$(head -1 "$snapshot_file")
  fi

  # ─── 1. Permission prompt auto-approve ─────────────────────────────
  for pattern in "${PERM_PATTERNS[@]}"; do
    if echo "$content" | grep -q "$pattern"; then
      log "🔓 ${task_id} — 권한 프롬프트 감지, 자동 승인 (option 2)"
      tmux send-keys -t "$pane_id" "2" 2>/dev/null
      sleep 0.3
      tmux send-keys -t "$pane_id" Enter 2>/dev/null
      sleep 1
      return 0
    fi
  done

  # ─── 2. Error detection ────────────────────────────────────────────
  for pattern in "${ERROR_PATTERNS[@]}"; do
    if echo "$content" | tail -5 | grep -qE "$pattern"; then
      log "⚠️  ${task_id} — 에러 감지: $(echo "$content" | tail -5 | grep -E "$pattern" | head -1 | tr -d '\n')"
      break
    fi
  done

  # ─── 3. Completion detection ───────────────────────────────────────
  local looks_done=false
  for pattern in "${DONE_PATTERNS[@]}"; do
    if echo "$content" | grep -q "$pattern"; then
      looks_done=true
      break
    fi
  done

  # Check if prompt is waiting (Claude Code uses ⏵⏵, also check ❯ and $)
  # Strip ANSI escape codes before matching to handle colored prompts.
  local prompt_idle=false
  local tail_clean
  tail_clean=$(echo "$content" | tail -5 | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/\x1b\][^\x07]*\x07//g')
  if echo "$tail_clean" | grep -qE '^\s*(⏵|❯|\$)\s*$'; then
    prompt_idle=true
  fi

  if [ "$looks_done" = true ] && [ "$prompt_idle" = true ]; then
    # Check if task-complete was already run (signal exists)
    if [ ! -f "/tmp/task-signals/${PROJECT}-${task_id}.signal" ]; then
      log "✅ ${task_id} — 작업 완료 감지, task-complete 실행 지시"
      tmux send-keys -t "$pane_id" "bash scripts/task/task-complete.sh" Enter 2>/dev/null
    fi
  fi

  # ─── 4. Idle/stuck detection ───────────────────────────────────────
  if [ "$content_hash" = "$prev_hash" ]; then
    local last_change
    last_change=$(stat -c %Y "$snapshot_file" 2>/dev/null || echo "0")
    local now
    now=$(date +%s)
    local idle_secs=$(( now - last_change ))

    if [ "$idle_secs" -gt 300 ] && [ "$prompt_idle" = true ]; then
      log "💤 ${task_id} — ${idle_secs}초 idle (프롬프트 대기 중)"
    fi
  else
    # Content changed — update snapshot
    echo "$content_hash" > "$snapshot_file"
    echo "$content" >> "$snapshot_file"
  fi
}

watch_cycle() {
  # Get active tasks from cache
  local active_tasks
  active_tasks=$(jq -r '.tasks | to_entries[] | select(.value.status=="in_progress") | "\(.key)|\(.value.pane)"' "$FX_CACHE" 2>/dev/null || true)

  if [ -z "$active_tasks" ]; then
    return 0
  fi

  while IFS='|' read -r task_id pane_id; do
    [ -z "$task_id" ] || [ -z "$pane_id" ] && continue

    # Verify pane still exists
    if ! tmux has-session -t "$pane_id" 2>/dev/null && ! tmux list-panes -a -F '#{pane_id}' 2>/dev/null | grep -q "^${pane_id}$"; then
      log "💀 ${task_id} — pane ${pane_id} 소멸 (crash?)"
      continue
    fi

    check_pane "$task_id" "$pane_id"
  done <<< "$active_tasks"
}

log "task-watch 시작 — project=${PROJECT}, interval=${INTERVAL}s"

while true; do
  watch_cycle
  [ "$ONCE" = true ] && break
  sleep "$INTERVAL"
done
