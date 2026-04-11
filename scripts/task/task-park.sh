#!/usr/bin/env bash
# scripts/task/task-park.sh — /ax:task park|resume (S-β)
#
# Usage:
#   task park <ID> [--reason "<text>"]
#   task resume <ID>
#
# Pauses/unpauses a task: stops the heartbeat daemon, records park metadata
# in .task-context, updates cache status, and flips GitHub issue labels
# (fx:status:in_progress ↔ fx:status:parked) when gh is available.

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

ACTION="${1:?action required (park|resume)}"
TASK_ID="${2:?task id required}"
shift 2 || true

REASON=""
while [ $# -gt 0 ]; do
  case "$1" in
    --reason) REASON="$2"; shift 2 ;;
    *) echo "[park] unknown arg: $1" >&2; exit 2 ;;
  esac
done

# ─── lookup task in cache ──────────────────────────────────────────────────
WT=$(jq -r --arg id "$TASK_ID" '.tasks[$id].wt // ""' "$FX_CACHE")
ISSUE=$(jq -r --arg id "$TASK_ID" '.tasks[$id].issue_url // ""' "$FX_CACHE")
STATUS=$(jq -r --arg id "$TASK_ID" '.tasks[$id].status // ""' "$FX_CACHE")

if [ -z "$WT" ]; then
  echo "[park] task '$TASK_ID' 를 캐시에서 찾지 못했어요." >&2
  exit 3
fi

CTX="$WT/.task-context"

# Update an issue label via gh. Non-fatal.
flip_label() {
  local issue_url="$1" from="$2" to="$3"
  [ -z "$issue_url" ] && return 0
  command -v gh >/dev/null 2>&1 || return 0
  local num; num=$(echo "$issue_url" | grep -oE '[0-9]+$')
  [ -z "$num" ] && return 0
  gh issue edit "$num" --remove-label "$from" --add-label "$to" >/dev/null 2>&1 || true
}

case "$ACTION" in
  park)
    if [ "$STATUS" = "parked" ]; then
      echo "[park] $TASK_ID 는 이미 parked 상태예요."
      exit 0
    fi

    # Stop daemon (best-effort)
    if [ -f "$CTX" ]; then
      PID=$(grep '^PID=' "$CTX" | cut -d= -f2- || true)
      if [ -n "$PID" ]; then
        kill -TERM "$PID" 2>/dev/null || true
      fi
      # append park meta
      {
        echo "PARKED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        [ -n "$REASON" ] && echo "PARK_REASON=$REASON"
      } >> "$CTX"
      # heartbeat sentinel
      echo "PARKED:$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$WT/.heartbeat" 2>/dev/null || true
    fi

    # cache status → parked
    tmp=$(mktemp)
    jq --arg id "$TASK_ID" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.tasks[$id].status = "parked" | .tasks[$id].parked = true | .tasks[$id].parked_at = $ts' \
       "$FX_CACHE" > "$tmp" && mv "$tmp" "$FX_CACHE"

    flip_label "$ISSUE" "fx:status:in_progress" "fx:status:parked"
    log_event "$TASK_ID" "parked" "{\"reason\":\"${REASON}\"}"
    echo "[park] 💤 $TASK_ID parked${REASON:+ — $REASON}"
    ;;

  resume)
    if [ "$STATUS" != "parked" ]; then
      echo "[park] $TASK_ID 는 parked 상태가 아니에요 (현재: $STATUS)." >&2
      exit 4
    fi

    if [ -f "$CTX" ]; then
      sed -i '/^PARKED_AT=/d;/^PARK_REASON=/d' "$CTX"
      update_heartbeat "$CTX" || true
    fi
    rm -f "$WT/.heartbeat" 2>/dev/null || true

    tmp=$(mktemp)
    jq --arg id "$TASK_ID" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.tasks[$id].status = "in_progress" | .tasks[$id].parked = false | .tasks[$id].resumed_at = $ts' \
       "$FX_CACHE" > "$tmp" && mv "$tmp" "$FX_CACHE"

    flip_label "$ISSUE" "fx:status:parked" "fx:status:in_progress"
    log_event "$TASK_ID" "resumed" "{}"
    echo "[park] 🔧 $TASK_ID resumed"
    ;;

  *)
    echo "[park] unknown action: $ACTION (park|resume)" >&2
    exit 2
    ;;
esac
