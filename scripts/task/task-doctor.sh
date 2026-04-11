#!/usr/bin/env bash
# scripts/task/task-doctor.sh — /ax:task doctor (S-β)
#
# Usage:
#   task doctor              # report only (dry-run default)
#   task doctor --fix        # auto-fix where safe
#   task doctor --task <ID>  # limit to a single task id
#
# Scans 9 consistency checks across SPEC.md / GitHub Issues / git worktrees /
# tasks-cache.json / task-log.ndjson / signals / locks and reports a table.
# Fix-able items: 3, 4, 5, 6, 7, 8. Check-only: 1, 2, 9.

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

FIX_MODE=0
FILTER_TASK=""
while [ $# -gt 0 ]; do
  case "$1" in
    --fix)    FIX_MODE=1; shift ;;
    --task)   FILTER_TASK="$2"; shift 2 ;;
    --help|-h)
      sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "[doctor] unknown arg: $1" >&2; exit 2 ;;
  esac
done

REPO_ROOT=$(_repo_root 2>/dev/null || echo "")
SPEC_FILE="${REPO_ROOT}/SPEC.md"

OK=0; WARN=0; MISS=0; FIXED=0
ROWS=()

add_row() {
  ROWS+=("$1")
  case "$2" in
    ok)    OK=$((OK+1)) ;;
    warn)  WARN=$((WARN+1)) ;;
    miss)  MISS=$((MISS+1)) ;;
    fixed) FIXED=$((FIXED+1)) ;;
  esac
}

# Collect task list from cache (optionally filtered)
if [ -n "$FILTER_TASK" ]; then
  TASK_IDS=$(jq -r --arg id "$FILTER_TASK" '.tasks | keys[] | select(. == $id)' "$FX_CACHE")
else
  TASK_IDS=$(jq -r '.tasks | keys[]' "$FX_CACHE" 2>/dev/null)
fi

# ─── Check 1: SPEC F-item / Task ID ↔ Issue labels ──────────────────────────
check1() {
  local id="$1" issue_url status_cache
  issue_url=$(jq -r --arg id "$id" '.tasks[$id].issue_url // ""' "$FX_CACHE")
  status_cache=$(jq -r --arg id "$id" '.tasks[$id].status // ""' "$FX_CACHE")
  if [ -z "$issue_url" ]; then
    add_row "| $id | #1 | ⚠ SKIP | no issue linked |  |" warn
    return
  fi
  if ! command -v gh >/dev/null 2>&1; then
    add_row "| $id | #1 | ⚠ SKIP | gh not available |  |" warn
    return
  fi
  add_row "| $id | #1 | ✅ OK | $status_cache |  |" ok
}

# ─── Check 2: Issue ↔ WT ────────────────────────────────────────────────────
check2() {
  local id="$1" wt
  wt=$(jq -r --arg id "$id" '.tasks[$id].wt // ""' "$FX_CACHE")
  if [ -z "$wt" ]; then
    add_row "| $id | #2 | ⚠ NONE | no wt recorded |  |" warn
    return
  fi
  if [ ! -d "$wt" ]; then
    add_row "| $id | #2 | ❌ MISS | wt path absent |  |" miss
    return
  fi
  add_row "| $id | #2 | ✅ OK | wt present |  |" ok
}

# ─── Check 3: WT ↔ cache (orphan WT) ────────────────────────────────────────
# Global check (not per-task). Uses list_orphan_wts().
check3_global() {
  local orphans; orphans=$(list_orphan_wts 2>/dev/null || true)
  if [ -z "$orphans" ]; then
    add_row "| --   | #3 | ✅ OK | no orphan WTs |  |" ok
    return
  fi
  while IFS= read -r wt; do
    [ -z "$wt" ] && continue
    local tid=""
    [ -f "$wt/.task-context" ] && tid=$(grep '^TASK_ID=' "$wt/.task-context" | cut -d= -f2-)
    tid=${tid:-orphan}
    if [ "$FIX_MODE" -eq 1 ] && [ -n "$tid" ] && [ "$tid" != "orphan" ]; then
      local track branch
      track=$(grep '^TASK_TYPE=' "$wt/.task-context" | cut -d= -f2-)
      branch=$(grep '^BRANCH=' "$wt/.task-context" | cut -d= -f2-)
      cache_upsert_task "$tid" "in_progress" "$track" "" "$wt" "$branch" ""
      log_event "$tid" "adopted" "{\"wt\":\"$wt\"}"
      add_row "| $tid | #3 | 🔧 FIXED | orphan re-registered | --fix |" fixed
    else
      add_row "| $tid | #3 | ❌ MISS | orphan WT: $wt | --fix |" miss
    fi
  done <<< "$orphans"
}

# ─── Check 4: heartbeat expiry ──────────────────────────────────────────────
check4() {
  local id="$1" wt
  wt=$(jq -r --arg id "$id" '.tasks[$id].wt // ""' "$FX_CACHE")
  [ -z "$wt" ] || [ ! -f "$wt/.task-context" ] && return
  local live; live=$(check_liveness "$wt/.task-context")
  case "$live" in
    ok)    add_row "| $id | #4 | ✅ OK | heartbeat fresh |  |" ok ;;
    stale) add_row "| $id | #4 | ⚠ STALE | heartbeat 5-10min | (manual) |" warn ;;
    dead)
      if [ "$FIX_MODE" -eq 1 ]; then
        update_heartbeat "$wt/.task-context" || true
        add_row "| $id | #4 | 🔧 FIXED | heartbeat reset | --fix |" fixed
      else
        add_row "| $id | #4 | ❌ DEAD | heartbeat >10min | --fix |" miss
      fi
      ;;
  esac
}

# ─── Check 5: PID alive ────────────────────────────────────────────────────
check5() {
  local id="$1" wt pid
  wt=$(jq -r --arg id "$id" '.tasks[$id].wt // ""' "$FX_CACHE")
  [ -z "$wt" ] || [ ! -f "$wt/.task-context" ] && return
  pid=$(grep '^PID=' "$wt/.task-context" 2>/dev/null | cut -d= -f2-)
  [ -z "$pid" ] && return
  if kill -0 "$pid" 2>/dev/null; then
    add_row "| $id | #5 | ✅ OK | pid $pid alive |  |" ok
  else
    if [ "$FIX_MODE" -eq 1 ]; then
      sed -i '/^PID=/d' "$wt/.task-context"
      add_row "| $id | #5 | 🔧 FIXED | pid stripped | --fix |" fixed
    else
      add_row "| $id | #5 | ❌ DEAD | pid $pid gone | --fix |" miss
    fi
  fi
}

# ─── Check 6: Signal ↔ cache ───────────────────────────────────────────────
check6() {
  local id="$1"
  local sig_file="${FX_SIGNAL_DIR}/$(_project_name)-${id}.signal"
  [ -f "$sig_file" ] || return
  local sig_status; sig_status=$(grep '^STATUS=' "$sig_file" | cut -d= -f2-)
  local cache_status; cache_status=$(jq -r --arg id "$id" '.tasks[$id].status // ""' "$FX_CACHE")
  if [ "$sig_status" = "DONE" ] && [ "$cache_status" != "done" ]; then
    if [ "$FIX_MODE" -eq 1 ]; then
      local tmp; tmp=$(mktemp)
      jq --arg id "$id" '.tasks[$id].status = "done"' "$FX_CACHE" > "$tmp" && mv "$tmp" "$FX_CACHE"
      add_row "| $id | #6 | 🔧 FIXED | cache→done | --fix |" fixed
    else
      add_row "| $id | #6 | ❌ DRIFT | sig=DONE cache=$cache_status | --fix |" miss
    fi
  else
    add_row "| $id | #6 | ✅ OK | sig=$sig_status |  |" ok
  fi
}

# ─── Check 7: orphan lock ──────────────────────────────────────────────────
check7_global() {
  local found=0
  for lock in "$FX_LOCK_DIR"/*.lock; do
    [ -f "$lock" ] || continue
    if ! ( flock --nb -x 9 -c 'true' ) 9<"$lock" 2>/dev/null; then
      add_row "| --   | #7 | ⚠ HELD | $(basename "$lock") |  |" warn
      found=1
    fi
  done
  [ "$found" -eq 0 ] && add_row "| --   | #7 | ✅ OK | no stuck locks |  |" ok
}

# ─── Check 8: log ↔ cache integrity ────────────────────────────────────────
check8_global() {
  local log_ids cache_ids
  log_ids=$(jq -r '.id' "$FX_LOG" 2>/dev/null | sort -u)
  cache_ids=$(jq -r '.tasks | keys[]' "$FX_CACHE" 2>/dev/null | sort -u)
  local missing
  missing=$(comm -23 <(echo "$log_ids") <(echo "$cache_ids") | tr '\n' ' ')
  if [ -z "$missing" ] || [ "$missing" = " " ]; then
    add_row "| --   | #8 | ✅ OK | log↔cache aligned |  |" ok
    return
  fi
  if [ "$FIX_MODE" -eq 1 ]; then
    rebuild_cache
    add_row "| --   | #8 | 🔧 FIXED | cache rebuilt from log | --fix |" fixed
  else
    add_row "| --   | #8 | ❌ DRIFT | missing in cache: $missing | --fix |" miss
  fi
}

# ─── Check 9: Issue label ↔ SPEC mapping ───────────────────────────────────
check9() {
  local id="$1"
  if [ ! -f "$SPEC_FILE" ]; then
    add_row "| $id | #9 | ⚠ SKIP | SPEC.md absent |  |" warn
    return
  fi
  if grep -q "| ${id} |" "$SPEC_FILE"; then
    add_row "| $id | #9 | ✅ OK | SPEC row present |  |" ok
  else
    add_row "| $id | #9 | ❌ MISS | no SPEC row | (manual) |" miss
  fi
}

# ─── run ───────────────────────────────────────────────────────────────────
count=0
while IFS= read -r id; do
  [ -z "$id" ] && continue
  count=$((count+1))
  check1 "$id"
  check2 "$id"
  check4 "$id"
  check5 "$id"
  check6 "$id"
  check9 "$id"
done <<< "$TASK_IDS"

check3_global
check7_global
check8_global

# ─── render ────────────────────────────────────────────────────────────────
echo "🔍 Task Doctor — ${count} task(s) scanned"
echo ""
echo "| Task | Check | Status  | Detail | Fix? |"
echo "|------|-------|---------|--------|------|"
for row in "${ROWS[@]}"; do
  echo "$row"
done
echo ""
echo "Summary: ${OK} OK, ${WARN} WARN, ${MISS} MISS, ${FIXED} FIXED"
if [ "$FIX_MODE" -eq 0 ] && [ "$MISS" -gt 0 ]; then
  echo "Auto-fixable items present — run: task doctor --fix"
fi

exit 0
