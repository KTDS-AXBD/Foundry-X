#!/usr/bin/env bash
# scripts/task/lib.sh — shared helpers for /ax:task subcommands (S-α MVP)
#
# Sourced by: task-start.sh, task-list.sh
# Provides:   FX_HOME, log_event, fx_jq_get, fx_jq_set, allocate_id

set -euo pipefail

FX_HOME="${FX_HOME:-$HOME/.foundry-x}"
FX_LOCK_DIR="$FX_HOME/locks"
FX_LOG="$FX_HOME/task-log.ndjson"
FX_CACHE="$FX_HOME/tasks-cache.json"
FX_WIP_LOG="$FX_HOME/wip-overrides.log"

WIP_CAP="${FX_WIP_CAP:-3}"

mkdir -p "$FX_LOCK_DIR" "$FX_HOME/scripts"
[ -f "$FX_CACHE" ] || echo '{"version":1,"tasks":{}}' > "$FX_CACHE"
[ -f "$FX_LOG" ] || : > "$FX_LOG"

# ─── logging ─────────────────────────────────────────────────────────────────
log_event() {
  local task_id="$1" event="$2" extra="${3:-{}}"
  local ts; ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  jq -nc \
    --arg ts "$ts" --arg id "$task_id" --arg ev "$event" --argjson extra "$extra" \
    '{ts: $ts, id: $id, event: $ev, extra: $extra}' >> "$FX_LOG"
}

# ─── ID allocation (flock guarded) ───────────────────────────────────────────
# Scans SPEC.md + task-log.ndjson + cache for max ID per track, returns next.
allocate_id() {
  local track="$1"  # F | B | C | X
  local spec="${2:-$(_repo_root)/SPEC.md}"
  local max_spec=0 max_log=0
  if [ -f "$spec" ]; then
    max_spec=$(grep -oE "\| ${track}[0-9]+ \|" "$spec" 2>/dev/null \
      | grep -oE "[0-9]+" | sort -n | tail -1 || echo 0)
  fi
  max_log=$(jq -r --arg t "$track" '
    [.tasks | to_entries[] | select(.key | startswith($t)) | .key | ltrimstr($t) | tonumber] | max // 0
  ' "$FX_CACHE" 2>/dev/null || echo 0)
  local next=$(( ${max_spec:-0} > ${max_log:-0} ? ${max_spec:-0} + 1 : ${max_log:-0} + 1 ))
  # F-track legacy collision: SPEC has F1..F496, ensure we step beyond
  echo "${track}${next}"
}

# ─── repo/git helpers ────────────────────────────────────────────────────────
_repo_root() { git rev-parse --show-toplevel 2>/dev/null; }

assert_master_clean() {
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "[fx-task] master에 미커밋 변경 — 먼저 정리 필요" >&2
    exit 1
  fi
}

assert_no_sprint_context() {
  if [ -f .sprint-context ]; then
    echo "[fx-task] sprint WT 내부에서는 /ax:task 사용 차단" >&2
    exit 1
  fi
}

# ─── WIP cap check ───────────────────────────────────────────────────────────
wip_count() {
  jq -r '[.tasks[] | select(.status=="in_progress" and (.parked // false | not))] | length' "$FX_CACHE"
}

assert_wip_capacity() {
  local cur; cur=$(wip_count)
  if [ "$cur" -ge "$WIP_CAP" ] && [ -z "${FX_WIP_OVERRIDE:-}" ]; then
    echo "[fx-task] WIP cap ($WIP_CAP) 초과. 활성: $cur" >&2
    echo "  override 옵션:" >&2
    echo "    1. 기존 task 종료 후 재시도" >&2
    echo "    2. FX_WIP_OVERRIDE=1 환경변수로 강제 진행" >&2
    exit 1
  fi
  if [ -n "${FX_WIP_OVERRIDE:-}" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) override active=$cur cap=$WIP_CAP" >> "$FX_WIP_LOG"
  fi
}

# ─── cache mutation ──────────────────────────────────────────────────────────
cache_upsert_task() {
  local task_id="$1" status="$2" track="$3" pane="${4:-}" wt="${5:-}" branch="${6:-}" issue="${7:-}"
  local tmp; tmp=$(mktemp)
  jq --arg id "$task_id" --arg st "$status" --arg tr "$track" \
     --arg pane "$pane" --arg wt "$wt" --arg br "$branch" --arg iss "$issue" \
     --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
     '.tasks[$id] = (.tasks[$id] // {}) + {
        status: $st, track: $tr, pane: $pane, wt: $wt, branch: $br, issue_url: $iss,
        updated_at: $ts
      } | .tasks[$id].started_at = (.tasks[$id].started_at // $ts)' \
    "$FX_CACHE" > "$tmp" && mv "$tmp" "$FX_CACHE"
}

# ─── slug ────────────────────────────────────────────────────────────────────
# ASCII-safe: lowercase, replace whitespace with -, drop everything outside
# [a-z0-9-], collapse runs, trim to 40 chars. Korean/CJK is dropped intentionally
# to keep branch names portable across filesystems and CI runners.
slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | LC_ALL=C tr -c 'a-z0-9 \n' '-' \
    | tr ' ' '-' \
    | tr -s '-' \
    | sed 's/^-//;s/-$//' \
    | cut -c1-40
}
