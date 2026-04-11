#!/usr/bin/env bash
# scripts/task/task-retry.sh — Worker retry queue 관리 (FX-REQ-517 / C23)
#
# Daemon phase_recover가 worker 무활동(empty diff)을 감지하면
# /tmp/task-retry/{project}-{task_id}.json 에 retry 후보를 등록한다.
# 이 CLI는 그 큐를 조회하고 사용자 명시 승인 후 재시도한다.
#
# Usage:
#   task-retry.sh                       # 큐 목록
#   task-retry.sh list                  # 동일
#   task-retry.sh show <task_id>        # 단일 항목 상세
#   task-retry.sh run <task_id>         # 재시도 (attempts ≥ 3 이면 --force 필요)
#   task-retry.sh run <task_id> --force
#   task-retry.sh clear <task_id>       # 큐에서 제거
#
# 재시도는 task-start.sh를 원본 prompt로 다시 호출한다 (새 TASK_ID 발급).
# 성공 시 retry 파일 자동 삭제. 실패 시 큐 유지.

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

PROJECT=$(_project_name 2>/dev/null || echo unknown)
RETRY_DIR="/tmp/task-retry"

cmd_list() {
  mkdir -p "$RETRY_DIR"
  local files
  files=$(ls "$RETRY_DIR/${PROJECT}-"*.json 2>/dev/null || true)
  if [ -z "$files" ]; then
    echo "[task-retry] 큐가 비어 있어요."
    return 0
  fi
  printf '%-8s %-14s %-4s %-6s %s\n' "TASK" "REQ" "ATT" "TRACK" "TITLE"
  for f in $files; do
    jq -r '[.task_id, (.req_code // "-"), .attempts, (.track // "-"), .title] | @tsv' "$f" \
      | awk -F'\t' '{ printf "%-8s %-14s %-4s %-6s %s\n", $1, $2, $3, $4, $5 }'
  done
}

cmd_show() {
  local tid="${1:?task_id required}"
  local f="$RETRY_DIR/${PROJECT}-${tid}.json"
  [ -f "$f" ] || { echo "[task-retry] $tid: retry 파일 없음" >&2; exit 1; }
  jq . "$f"
}

cmd_run() {
  local tid="${1:?task_id required}"
  local force="${2:-}"
  local f="$RETRY_DIR/${PROJECT}-${tid}.json"
  [ -f "$f" ] || { echo "[task-retry] $tid: retry 파일 없음" >&2; exit 1; }

  local attempts track title prompt
  attempts=$(jq -r '.attempts' "$f")
  track=$(jq -r '.track' "$f")
  title=$(jq -r '.title' "$f")
  prompt=$(jq -r '.prompt' "$f")

  if [ -z "$track" ] || [ "$track" = "null" ]; then
    echo "[task-retry] $tid: track 정보 없음 — 큐 항목 손상" >&2
    exit 1
  fi

  if [ "$attempts" -ge 3 ] && [ "$force" != "--force" ]; then
    echo "[task-retry] ❗ $tid: attempts=$attempts (≥3) — 명시적 --force 필요" >&2
    echo "  task-retry.sh run $tid --force" >&2
    exit 2
  fi

  echo "[task-retry] 재시도: [$track] $title (attempts=$attempts)"
  local repo; repo=$(_repo_root)
  if (cd "$repo" && bash scripts/task/task-start.sh "$track" "$title" "$prompt"); then
    rm -f "$f"
    echo "[task-retry] ✅ $tid 재시도 시작 — 큐 항목 제거"
  else
    echo "[task-retry] ❌ task-start 실패 — 큐 유지" >&2
    exit 1
  fi
}

cmd_clear() {
  local tid="${1:?task_id required}"
  local f="$RETRY_DIR/${PROJECT}-${tid}.json"
  if [ -f "$f" ]; then
    rm -f "$f"
    echo "[task-retry] $tid 제거"
  else
    echo "[task-retry] $tid 없음"
  fi
}

case "${1:-list}" in
  list|"") cmd_list ;;
  show)    shift; cmd_show "$@" ;;
  run)     shift; cmd_run "$@" ;;
  clear)   shift; cmd_clear "$@" ;;
  -h|--help)
    sed -n '2,20p' "$0"
    ;;
  *)
    echo "Usage: task-retry.sh [list|show <id>|run <id> [--force]|clear <id>]" >&2
    exit 1
    ;;
esac
