#!/usr/bin/env bash
# scripts/task/task-list.sh — /ax:task list (S-α MVP, no liveness probe)
#
# Usage: task-list.sh [--json]
#
# Reads ~/.foundry-x/tasks-cache.json and renders a table.
# S-α scope: cache-only output. Liveness probe + GH label sync = S-β.

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

printf "%-6s %-4s %-4s %-32s %-12s %s\n" "ID" "TRK" "ST" "BRANCH" "AGE" "PANE"
printf "%-6s %-4s %-4s %-32s %-12s %s\n" "------" "----" "----" "--------------------------------" "------------" "--------"

now_epoch=$(date +%s)

jq -r '.tasks | to_entries[] | [.key, .value.track, .value.status, .value.branch, .value.started_at, .value.pane] | @tsv' "$FX_CACHE" \
| while IFS=$'\t' read -r id track status branch started pane; do
  start_epoch=$(date -d "$started" +%s 2>/dev/null || echo "$now_epoch")
  age_sec=$(( now_epoch - start_epoch ))
  age=$(printf "%02d:%02d" $((age_sec/3600)) $(((age_sec%3600)/60)))
  emoji=$(emoji_for "$status")
  br_short="${branch:0:32}"
  printf "%-6s %-4s %-4s %-32s %-12s %s\n" "$id" "$track" "$emoji" "$br_short" "$age" "${pane:-—}"
done
