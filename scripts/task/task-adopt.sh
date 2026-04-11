#!/usr/bin/env bash
# scripts/task/task-adopt.sh — /ax:task adopt (S-β)
#
# Usage:
#   task adopt                 # scan every orphan WT
#   task adopt --wt <path>     # adopt a single WT by path
#   task adopt --dry-run       # report only, no mutation
#
# Re-registers orphan worktrees (present in `git worktree list` but missing
# from tasks-cache.json) by reading .task-context or the fx-task-meta commit
# trailer, and restores tmux split + heartbeat daemon.

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

DRY_RUN=0
TARGET_WT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --wt)      TARGET_WT="$2"; shift 2 ;;
    --help|-h) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "[adopt] unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Parse fx-task-meta JSON from a commit body trailer (authoritative source
# when .task-context was lost). Returns JSON on stdout, empty on miss.
read_task_meta_from_commit() {
  local wt="$1"
  git -C "$wt" log --all --format=%B 2>/dev/null \
    | awk '/```fx-task-meta/{flag=1; next} /```/{flag=0} flag' \
    | head -100
}

adopt_one() {
  local wt="$1"
  [ -d "$wt" ] || { echo "[adopt] not a directory: $wt" >&2; return 1; }

  local task_id track title branch req

  if [ -f "$wt/.task-context" ]; then
    task_id=$(grep '^TASK_ID=' "$wt/.task-context" | cut -d= -f2-)
    track=$(grep '^TASK_TYPE=' "$wt/.task-context" | cut -d= -f2-)
    title=$(grep '^TITLE=' "$wt/.task-context" | cut -d= -f2-)
    branch=$(grep '^BRANCH=' "$wt/.task-context" | cut -d= -f2-)
    req=$(grep '^REQ_ID=' "$wt/.task-context" | cut -d= -f2-)
  else
    local meta; meta=$(read_task_meta_from_commit "$wt")
    if [ -z "$meta" ]; then
      echo "[adopt] ⚠ $wt — .task-context 없음 + fx-task-meta 커밋 없음, 건너뜀" >&2
      return 1
    fi
    task_id=$(echo "$meta" | jq -r '.task_id // ""')
    track=$(echo "$meta" | jq -r '.task_type // ""')
    title=$(echo "$meta" | jq -r '.title // ""')
    branch=$(echo "$meta" | jq -r '.branch // ""')
    req=$(echo "$meta" | jq -r '.req_id // ""')
  fi

  if [ -z "$task_id" ]; then
    echo "[adopt] ⚠ $wt — task_id 추출 실패, 건너뜀" >&2
    return 1
  fi

  echo "[adopt] 📥 $task_id ($track) — $title"
  echo "        wt: $wt"
  echo "        branch: $branch"

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "        (dry-run) cache upsert skipped"
    return 0
  fi

  cache_upsert_task "$task_id" "in_progress" "$track" "" "$wt" "$branch" ""
  log_event "$task_id" "adopted" "{\"wt\":\"$wt\",\"req\":\"$req\"}"

  # Rewrite .task-context if missing (commit-meta recovery path)
  if [ ! -f "$wt/.task-context" ]; then
    cat > "$wt/.task-context" <<EOF
TASK_ID=$task_id
TASK_TYPE=$track
TITLE=$title
REQ_ID=$req
STARTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
BRANCH=$branch
WT_PATH=$wt
LAST_HEARTBEAT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
  else
    update_heartbeat "$wt/.task-context" || true
  fi

  # tmux split (best effort)
  if [ -n "${TMUX:-}" ]; then
    local pane_id
    pane_id=$(tmux split-window -h -P -F '#{pane_id}' -c "$wt" 2>/dev/null || echo "")
    if [ -n "$pane_id" ]; then
      tmux select-pane -t "$pane_id" -T "${task_id} ${title}" 2>/dev/null || true
      tmux set -p -t "$pane_id" @fx-task-id "$task_id" 2>/dev/null || true
      echo "        tmux pane: $pane_id"
    fi
  fi

  echo "        ✅ adopted"
  return 0
}

# ─── main ──────────────────────────────────────────────────────────────────
if [ -n "$TARGET_WT" ]; then
  adopt_one "$TARGET_WT"
  exit $?
fi

orphans=$(list_orphan_wts)
if [ -z "$orphans" ]; then
  echo "[adopt] 고아 WT 없음 — 아무 것도 할 일이 없어요."
  exit 0
fi

count=0
while IFS= read -r wt; do
  [ -z "$wt" ] && continue
  adopt_one "$wt" && count=$((count+1))
done <<< "$orphans"

echo ""
echo "[adopt] 완료 — ${count}개 adopt 처리"
