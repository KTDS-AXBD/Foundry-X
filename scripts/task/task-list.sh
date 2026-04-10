#!/usr/bin/env bash
# scripts/task/task-list.sh — /ax:task list (S-β: liveness probe)
#
# Usage: task-list.sh [--json]
#
# Reads ~/.foundry-x/tasks-cache.json and renders a table with HB column.
# Liveness probe: checks PID + LAST_HEARTBEAT from .task-context in each WT.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

if [ "${1:-}" = "--json" ]; then
  cat "$FX_CACHE"
  exit 0
fi

count=$(jq -r '.tasks | length' "$FX_CACHE")
if [ "$count" -eq 0 ]; then
  echo "[fx-task] no active tasks. /ax:task start <F|B|C|X> \"title\" 으로 시작."
  exit 0
fi

emoji_for() {
  case "$1" in
    in_progress) echo "🔧" ;;
    conflict)    echo "⚠️" ;;
    ready_merge) echo "✅" ;;
    done)        echo "✔️" ;;
    parked)      echo "💤" ;;
    aborted|cancelled|failed_setup|rejected) echo "❌" ;;
    *)           echo "•" ;;
  esac
}

hb_display() {
  case "$1" in
    ok)    echo "ok" ;;
    stale) echo "⚠ stale" ;;
    dead)  echo "✗ dead" ;;
    *)     echo "—" ;;
  esac
}

printf "%-6s %-4s %-4s %-32s %-8s %-10s %s\n" "ID" "TRK" "ST" "BRANCH" "AGE" "HB" "PANE"
printf "%-6s %-4s %-4s %-32s %-8s %-10s %s\n" "------" "----" "----" "--------------------------------" "--------" "----------" "--------"

now_epoch=$(date +%s)

jq -r '.tasks | to_entries[] | [.key, .value.track, .value.status, .value.branch, .value.started_at, .value.pane, .value.wt] | @tsv' "$FX_CACHE" \
| while IFS=$'\t' read -r id track status branch started pane wt; do
  start_epoch=$(date -d "$started" +%s 2>/dev/null || echo "$now_epoch")
  age_sec=$(( now_epoch - start_epoch ))
  age=$(printf "%02d:%02d" $((age_sec/3600)) $(((age_sec%3600)/60)))
  emoji=$(emoji_for "$status")
  br_short="${branch:0:32}"

  # Liveness probe — check .task-context in WT path
  hb="—"
  if [ -n "$wt" ] && [ -d "$wt" ]; then
    local_ctx="${wt}/.task-context"
    hb_raw=$(check_liveness "$local_ctx")
    hb=$(hb_display "$hb_raw")
  fi

  printf "%-6s %-4s %-4s %-32s %-8s %-10s %s\n" "$id" "$track" "$emoji" "$br_short" "$age" "$hb" "${pane:-—}"
done

# Check for pending signals
sig_count=$(read_signals | wc -l)
if [ "$sig_count" -gt 0 ]; then
  echo ""
  echo "[fx-task] 📡 $sig_count signal(s) pending:"
  for sig in $(read_signals); do
    sig_id=$(grep "^TASK_ID=" "$sig" 2>/dev/null | cut -d= -f2-)
    sig_status=$(grep "^STATUS=" "$sig" 2>/dev/null | cut -d= -f2-)
    sig_ts=$(grep "^TIMESTAMP=" "$sig" 2>/dev/null | cut -d= -f2-)
    echo "  - ${sig_id}: ${sig_status} (${sig_ts})"
  done
fi
