#!/usr/bin/env bash
# session-collector.sh — cs/tmux 세션 상태를 Foundry-X D1에 동기화
# Usage: ./scripts/session-collector.sh
# Cron:  */1 * * * * /home/sinclair/work/axbd/Foundry-X/scripts/session-collector.sh
#
# Required env:
#   FOUNDRY_API_TOKEN — JWT (from `claude auth` or manual login)
# Optional env:
#   FOUNDRY_API_URL   — defaults to production Workers URL

set -euo pipefail

API_URL="${FOUNDRY_API_URL:-https://foundry-x-api.ktds-axbd.workers.dev}"
API_TOKEN="${FOUNDRY_API_TOKEN:-}"

if [ -z "$API_TOKEN" ]; then
  echo "❌ FOUNDRY_API_TOKEN is not set" >&2
  exit 1
fi

COLLECTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# ── 1. tmux 세션 목록 수집 ─────────────────────────────────────────────────

sessions_raw=$(tmux list-sessions -F '#{session_name}|#{session_activity}|#{session_windows}' 2>/dev/null || true)

# ── 2. git worktree 목록 수집 ─────────────────────────────────────────────

REPO_DIR="${FOUNDRY_REPO_DIR:-$HOME/work/axbd/Foundry-X}"
worktrees_raw=$(git -C "$REPO_DIR" worktree list --porcelain 2>/dev/null \
  | awk '/^worktree /{wt=$2} /^branch /{br=$2; print wt"|"br}' || true)

# ── 3. JSON 페이로드 조립 ──────────────────────────────────────────────────

now_epoch=$(date +%s)

sessions_json="["
first_s=true

while IFS='|' read -r name activity windows; do
  [ -z "$name" ] && continue

  # busy/idle 판정: 60초 이내 활동
  diff=$(( now_epoch - activity ))
  status="idle"
  [ "$diff" -lt 60 ] && status="busy"

  # 프로파일 추론 (session name 패턴)
  profile="unknown"
  case "$name" in
    *sonnet*|*coder*)    profile="coder" ;;
    *opus*|*reviewer*)   profile="reviewer" ;;
    *haiku*|*tester*)    profile="tester" ;;
    sprint-*)            profile="coder" ;;
  esac

  # JSON 특수문자 이스케이프 (name)
  name_escaped=$(printf '%s' "$name" | sed 's/\\/\\\\/g; s/"/\\"/g')

  $first_s || sessions_json+=","
  first_s=false
  sessions_json+="{\"name\":\"$name_escaped\",\"status\":\"$status\",\"profile\":\"$profile\",\"windows\":$windows,\"last_activity\":$activity}"
done <<< "$sessions_raw"

sessions_json+="]"

worktrees_json="["
first_w=true

while IFS='|' read -r wt_path wt_branch; do
  [ -z "$wt_path" ] && continue

  path_escaped=$(printf '%s' "$wt_path" | sed 's/\\/\\\\/g; s/"/\\"/g')
  branch_escaped=$(printf '%s' "$wt_branch" | sed 's/\\/\\\\/g; s/"/\\"/g')

  $first_w || worktrees_json+=","
  first_w=false
  worktrees_json+="{\"path\":\"$path_escaped\",\"branch\":\"$branch_escaped\"}"
done <<< "$worktrees_raw"

worktrees_json+="]"

payload="{\"sessions\":$sessions_json,\"worktrees\":$worktrees_json,\"collected_at\":\"$COLLECTED_AT\"}"

# ── 4. API로 전송 ──────────────────────────────────────────────────────────

response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/work/sessions/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d "$payload")

http_code=$(printf '%s' "$response" | tail -n1)
body=$(printf '%s' "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
  echo "✅ sync OK — $body"
else
  echo "❌ sync failed (HTTP $http_code): $body" >&2
  exit 1
fi
