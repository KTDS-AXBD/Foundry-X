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
FX_SIGNAL_DIR="/tmp/task-signals"

WIP_CAP="${FX_WIP_CAP:-3}"

# Ensure all FX runtime dirs exist — task-start.sh references FX_SIGNAL_DIR
# before the first write_signal call (Step 5b inject script), so creating it
# here guarantees all callers can write without a prior mkdir.
mkdir -p "$FX_LOCK_DIR" "$FX_HOME/scripts" "$FX_SIGNAL_DIR"
[ -f "$FX_CACHE" ] || echo '{"version":1,"tasks":{}}' > "$FX_CACHE"
[ -f "$FX_LOG" ] || : > "$FX_LOG"

# ─── logging ─────────────────────────────────────────────────────────────────
# Note: do NOT use ${3:-{}} as default — bash parses it as ${3:-{} followed by
# a literal }, which appends a stray } even when $3 is provided. Use explicit
# if-form instead.
log_event() {
  local task_id="$1" event="$2"
  local extra
  if [ "$#" -ge 3 ] && [ -n "$3" ]; then extra="$3"; else extra='{}'; fi
  local ts; ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  jq -nc \
    --arg ts "$ts" --arg id "$task_id" --arg ev "$event" --argjson extra "$extra" \
    '{ts: $ts, id: $id, event: $ev, extra: $extra}' >> "$FX_LOG"
}

# ─── ID allocation (flock guarded) ───────────────────────────────────────────
# Scans SPEC.md + task-log.ndjson + cache for max ID per track, returns next.
# F-track is reserved for Sprint/Phase features — Task Orchestrator uses B/C/X only.
allocate_id() {
  local track="$1"  # B | C | X (F is Sprint-only)
  local spec="${2:-$(_repo_root)/SPEC.md}"

  if [ "$track" = "F" ]; then
    echo "[fx-task] F-track은 Sprint/Phase 전용이에요. Task에는 B/C/X를 사용해주세요." >&2
    echo "[fx-task]   Feature급 작업 → Sprint 경로: bash -i -c 'sprint N'" >&2
    return 1
  fi

  local max_spec=0 max_log=0
  # Scan only the Task Orchestrator Backlog section (between markers) to avoid
  # collision with Sprint F-items (F1~F499) in §5.
  if [ -f "$spec" ]; then
    max_spec=$(sed -n '/<!-- fx-task-orchestrator-backlog -->/,/<!-- \/fx-task-orchestrator-backlog -->/p' "$spec" \
      | grep -oE "\| ${track}[0-9]+ \|" 2>/dev/null \
      | grep -oE "[0-9]+" | sort -n | tail -1 || echo 0)
  fi
  max_log=$(jq -r --arg t "$track" '
    [.tasks | to_entries[] | select(.key | startswith($t)) | .key | ltrimstr($t) | tonumber] | max // 0
  ' "$FX_CACHE" 2>/dev/null || echo 0)
  local next=$(( ${max_spec:-0} > ${max_log:-0} ? ${max_spec:-0} + 1 : ${max_log:-0} + 1 ))
  echo "${track}${next}"
}

# ─── Backlog row lookup (--reuse-id support) ────────────────────────────────
# Find an existing Task Orchestrator Backlog row by ID and extract its
# REQ code + status. Returns "REQ_ID|STATUS" on stdout (REQ = "—" if the
# row carries no REQ, STATUS = "UNKNOWN" if it lacks a recognized token).
# Returns non-zero if no matching row exists (lets --reuse-id fail cleanly).
#
# Column parsing is intentionally avoided: historic rows (C1~C9) have 5~7
# pipe columns while newer rows (C10+) have 7, so we extract semantically:
#   REQ    — first FX-REQ-\d+ occurrence anywhere in the row
#   STATUS — first match of the known status enum anywhere in the row
lookup_backlog_row() {
  local id="$1"
  local spec="${2:-$(_repo_root)/SPEC.md}"
  [ -f "$spec" ] || return 1

  local row
  row=$(sed -n '/<!-- fx-task-orchestrator-backlog -->/,/<!-- \/fx-task-orchestrator-backlog -->/p' "$spec" \
    | grep -E "^\| ${id} \|" | head -1)
  [ -n "$row" ] || return 1

  local req status
  req=$(echo "$row" | grep -oE 'FX-REQ-[0-9]+' | head -1)
  status=$(echo "$row" | grep -oE 'PLANNED|IN_PROGRESS|DONE|CANCELLED|CLOSED_EMPTY|CLOSED_LEARNED|REJECTED' | head -1)

  echo "${req:-—}|${status:-UNKNOWN}"
}

# ─── REQ code allocation ────────────────────────────────────────────────────
# Scans SPEC.md for max FX-REQ-NNN and returns next number.
allocate_req_id() {
  local spec="${1:-$(_repo_root)/SPEC.md}"
  local max_req=0
  if [ -f "$spec" ]; then
    max_req=$(grep -oE 'FX-REQ-[0-9]+' "$spec" 2>/dev/null \
      | grep -oE '[0-9]+' | sort -n | tail -1 || echo 0)
  fi
  local next=$(( ${max_req:-0} + 1 ))
  echo "FX-REQ-$(printf '%03d' "$next")"
}

# ─── repo/git helpers ────────────────────────────────────────────────────────
_repo_root() { git rev-parse --show-toplevel 2>/dev/null; }

# Original project name (works in both main repo and worktrees).
# In a worktree, --show-toplevel returns the WT path, not the main repo.
# --git-common-dir returns <main-repo>/.git, so we strip /.git suffix.
_project_name() {
  local common_dir; common_dir=$(git rev-parse --git-common-dir 2>/dev/null)
  if [ -n "$common_dir" ]; then
    # common_dir = /path/to/main-repo/.git or /path/to/main-repo/.git/worktrees/...
    local main_git="${common_dir%%/worktrees/*}"
    basename "$(dirname "$main_git")"
  else
    basename "$(_repo_root)"
  fi
}

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

# ─── heartbeat ───────────────────────────────────────────────────────────────
# Update LAST_HEARTBEAT in a .task-context file (atomic sed in-place).
update_heartbeat() {
  local ctx="${1:-.task-context}"
  [ -f "$ctx" ] || return 1
  local ts; ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  sed -i "s/^LAST_HEARTBEAT=.*/LAST_HEARTBEAT=$ts/" "$ctx"
}

# Read a key from .task-context (key=value format).
read_task_ctx() {
  local ctx="$1" key="$2"
  grep "^${key}=" "$ctx" 2>/dev/null | head -1 | cut -d= -f2-
}

# Liveness probe for a single task.
# Returns: "ok" | "stale" | "dead"
#   ok    — PID alive + heartbeat within 5 min
#   stale — heartbeat older than 10 min (Claude Code crash 의심)
#   dead  — PID not running
check_liveness() {
  local ctx="$1"
  [ -f "$ctx" ] || { echo "dead"; return; }

  local pid; pid=$(read_task_ctx "$ctx" "PID")
  local hb; hb=$(read_task_ctx "$ctx" "LAST_HEARTBEAT")

  # Heartbeat freshness is the primary liveness indicator.
  # PID check is secondary — hook subprocesses have transient PIDs,
  # so a stale heartbeat is more reliable than PID existence.
  if [ -n "$hb" ]; then
    local hb_epoch now_epoch age_sec
    hb_epoch=$(date -d "$hb" +%s 2>/dev/null || echo 0)
    now_epoch=$(date +%s)
    age_sec=$(( now_epoch - hb_epoch ))
    if [ "$age_sec" -gt 600 ]; then
      # 10+ min stale — likely crashed
      echo "dead"
      return
    elif [ "$age_sec" -gt 300 ]; then
      # 5~10 min — suspicious
      echo "stale"
      return
    fi
    echo "ok"
    return
  fi

  # No heartbeat timestamp at all — check PID as fallback
  if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
    echo "dead"
    return
  fi

  echo "ok"
}

# ─── signal files (Master IPC) ──────────────────────────────────────────────
# FX_SIGNAL_DIR is declared and created at top of this file (SSOT).

# Write a completion signal file for Master to detect.
# Usage: write_signal <task_id> <status> [extra_key=value ...]
write_signal() {
  local task_id="$1" status="$2"
  shift 2
  local project; project=$(_project_name 2>/dev/null || echo "unknown")
  mkdir -p "$FX_SIGNAL_DIR"
  local sig_file="${FX_SIGNAL_DIR}/${project}-${task_id}.signal"
  cat > "$sig_file" <<EOF
TASK_ID=$task_id
STATUS=$status
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
PROJECT=$project
EOF
  # Append any extra key=value pairs
  for kv in "$@"; do
    echo "$kv" >> "$sig_file"
  done
}

# Read all pending signals for this project. Returns signal file paths.
read_signals() {
  local project; project=$(_project_name 2>/dev/null || echo "unknown")
  ls "${FX_SIGNAL_DIR}/${project}-"*.signal 2>/dev/null || true
}

# ─── orphan WT detection ────────────────────────────────────────────────────
# Returns list of worktree paths present in `git worktree list` but missing
# from tasks-cache.json. Sprint WTs (.sprint-context) and master are excluded.
list_orphan_wts() {
  local wt_list cache_wts
  wt_list=$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2}')
  cache_wts=$(jq -r '.tasks[] | select(.wt != null and .wt != "") | .wt' "$FX_CACHE" 2>/dev/null || true)
  while IFS= read -r wt; do
    [ -z "$wt" ] && continue
    [ -f "$wt/.sprint-context" ] && continue
    [ ! -f "$wt/.task-context" ] && continue
    if ! printf '%s\n' "$cache_wts" | grep -qxF "$wt"; then
      printf '%s\n' "$wt"
    fi
  done <<< "$wt_list"
}

# Rebuild tasks-cache.json from task-log.ndjson (event replay).
# Latest event per task_id wins; cache is atomically replaced.
rebuild_cache() {
  local tmp; tmp=$(mktemp)
  jq -s '
    {
      version: 1,
      tasks: (
        reduce .[] as $e ({};
          .[$e.id] = ((.[$e.id] // {}) + {
            status: $e.event,
            updated_at: $e.ts
          } + ($e.extra // {}))
        )
      )
    }
  ' "$FX_LOG" > "$tmp" 2>/dev/null && mv "$tmp" "$FX_CACHE" || rm -f "$tmp"
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
