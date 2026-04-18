#!/usr/bin/env bash
# scripts/task/task-monitor.sh — Master에서 background 실행, signal 감지 → merge → cleanup
#
# Usage: task-monitor.sh [--once] [--interval <seconds>]
#
# --once: 1회 점검 후 종료 (default: 루프)
# --interval: 점검 간격 (default: 30초)
#
# Signal 감지 시:
#   1. PR merge (squash + delete branch)
#   2. worktree 제거
#   3. tmux pane 종료
#   4. cache 상태 → merged
#   5. signal 파일 삭제

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

FX_SIGNAL_DIR="${FX_SIGNAL_DIR:-/tmp/task-signals}"

ONCE=false
INTERVAL=30

while [ $# -gt 0 ]; do
  case "$1" in
    --once) ONCE=true; shift ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    *) shift ;;
  esac
done

REPO_ROOT=$(_repo_root)
PROJECT=$(basename "$REPO_ROOT" 2>/dev/null || echo "unknown")

process_signal() {
  local sig_file="$1"

  # 안전하게 변수 초기화 (빈 필드 방지)
  local TASK_ID="" STATUS="" BRANCH="" PR_URL="" COMMIT_COUNT="" WT_PATH="" PANE_ID="" TIMESTAMP=""
  source "$sig_file"

  [ "$STATUS" = "DONE" ] || return 0
  [ -n "$TASK_ID" ] || return 0

  echo "[task-monitor] 📡 Signal 감지: ${TASK_ID} (${STATUS})"

  # ─── 1. PR merge ───────────────────────────────────────────────────────
  local MERGED=false
  if [ -n "$PR_URL" ] && [ "$PR_URL" != "none" ] && command -v gh >/dev/null 2>&1; then
    local PR_NUM
    PR_NUM=$(echo "$PR_URL" | grep -oE '[0-9]+$' || true)
    if [ -n "$PR_NUM" ]; then
      local PR_STATE
      PR_STATE=$(gh pr view "$PR_NUM" --repo "KTDS-AXBD/Foundry-X" --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")
      if [ "$PR_STATE" = "OPEN" ]; then
        echo "[task-monitor] PR #${PR_NUM} squash merge 시도..."
        if gh pr merge "$PR_NUM" --repo "KTDS-AXBD/Foundry-X" --squash --delete-branch 2>/dev/null; then
          MERGED=true
          echo "[task-monitor] ✅ PR #${PR_NUM} merged"
        else
          echo "[task-monitor] ⚠️  PR #${PR_NUM} merge 실패 — 수동 확인 필요" >&2
        fi
      elif [ "$PR_STATE" = "MERGED" ]; then
        MERGED=true
        echo "[task-monitor] PR #${PR_NUM} 이미 merged"
      fi
    fi
  elif [ "$PR_URL" = "none" ] && [ "${COMMIT_COUNT:-0}" = "0" ]; then
    MERGED=true  # 코드 변경 없는 task (점검 등)
    echo "[task-monitor] 코드 변경 없음 — merge 불필요"
  fi

  # ─── 2. master pull (merge 후) ─────────────────────────────────────────
  if [ "$MERGED" = true ]; then
    (cd "$REPO_ROOT" && git pull origin master --ff-only 2>/dev/null) || true
  fi

  # ─── 3. worktree 제거 ──────────────────────────────────────────────────
  if [ -n "$WT_PATH" ] && [ -d "$WT_PATH" ]; then
    echo "[task-monitor] worktree 제거: ${WT_PATH}"
    (cd "$REPO_ROOT" && git worktree remove "$WT_PATH" --force 2>/dev/null) || true
  fi

  # 로컬 브랜치 제거 (remote는 PR merge --delete-branch가 처리)
  if [ -n "$BRANCH" ]; then
    (cd "$REPO_ROOT" && git branch -D "$BRANCH" 2>/dev/null) || true
  fi

  # ─── 4. tmux pane 종료 ─────────────────────────────────────────────────
  if [ -n "$PANE_ID" ] && [ "$PANE_ID" != "unknown" ]; then
    echo "[task-monitor] pane ${PANE_ID} 종료"
    tmux kill-pane -t "$PANE_ID" 2>/dev/null || true
  fi

  # ─── 5. SPEC.md backlog → DONE (C76: daemon보다 먼저 signal 처리 시 누락 방지)
  if [ "$MERGED" = true ]; then
    mark_spec_done_row "$TASK_ID"
  fi

  # ─── 6. cache 갱신 ─────────────────────────────────────────────────────
  local FINAL_STATUS="merged"
  [ "$MERGED" = false ] && FINAL_STATUS="done_pending_merge"

  cache_upsert_task "$TASK_ID" "$FINAL_STATUS" "" "" "" "$BRANCH" "${PR_URL:-}"
  log_event "$TASK_ID" "monitor_processed" "$(jq -nc \
    --arg status "$FINAL_STATUS" --arg merged "$MERGED" \
    '{final_status:$status, auto_merged:$merged}')"

  # ─── 7. signal 파일 삭제 (처리 완료) ───────────────────────────────────
  rm -f "$sig_file"
  echo "[task-monitor] ✅ ${TASK_ID} 처리 완료 (${FINAL_STATUS})"
  echo "---"
}

echo "[task-monitor] 시작 — project=${PROJECT}, interval=${INTERVAL}s, once=${ONCE}"

while true; do
  SIGNALS=$(ls "${FX_SIGNAL_DIR:-/tmp/task-signals}/${PROJECT}-"*.signal 2>/dev/null || true)
  if [ -n "$SIGNALS" ]; then
    for sig in $SIGNALS; do
      process_signal "$sig"
    done
  fi

  [ "$ONCE" = true ] && break
  sleep "$INTERVAL"
done
