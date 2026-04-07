#!/bin/bash
# Marker.io 피드백 큐 소비자 (F320)
# Usage: ./scripts/feedback-consumer.sh [--once] [--interval 60]
#
# Environment variables:
#   API_BASE       — Workers API URL (default: https://foundry-x-api.ktds-axbd.workers.dev)
#   WEBHOOK_SECRET — X-Webhook-Secret 헤더 인증 (JWT 불필요)
#   REPO_DIR       — Foundry-X 리포 경로 (default: pwd)
#
# Prerequisites:
#   - jq, curl, gh (GitHub CLI), claude (Claude Code CLI)

set -euo pipefail

INTERVAL="${INTERVAL:-60}"
API_BASE="${API_BASE:-https://foundry-x-api.ktds-axbd.workers.dev}"
REPO_DIR="${REPO_DIR:-$(pwd)}"
ONCE=false

for arg in "$@"; do
  case "$arg" in
    --once) ONCE=true ;;
    --interval) shift; INTERVAL="$2" ;;
  esac
done

# 인증: X-Webhook-Secret 우선, fallback으로 JWT (레거시 호환)
if [ -n "${WEBHOOK_SECRET:-}" ]; then
  AUTH_HEADER="X-Webhook-Secret: $WEBHOOK_SECRET"
elif [ -n "${API_TOKEN:-}" ]; then
  AUTH_HEADER="Authorization: Bearer $API_TOKEN"
else
  echo "ERROR: WEBHOOK_SECRET or API_TOKEN environment variable required"
  exit 1
fi

log() { echo "[$(date -Iseconds)] $*"; }

consume_one() {
  # 1. 큐에서 다음 아이템 consume
  local ITEM
  ITEM=$(curl -sf -X POST "$API_BASE/api/feedback-queue/consume" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" 2>/dev/null || echo "{}")

  local ITEM_ID
  ITEM_ID=$(echo "$ITEM" | jq -r '.id // empty')

  if [ -z "$ITEM_ID" ]; then
    log "No pending items — sleeping ${INTERVAL}s"
    return 1
  fi

  local ISSUE_NUM TITLE BODY
  ISSUE_NUM=$(echo "$ITEM" | jq -r '.github_issue_number')
  TITLE=$(echo "$ITEM" | jq -r '.title')
  BODY=$(echo "$ITEM" | jq -r '.body // "No description"')

  log "Processing: Issue #$ISSUE_NUM — $TITLE"

  # 2. 브랜치 생성
  cd "$REPO_DIR"
  git checkout master && git pull origin master
  local BRANCH="fix/feedback-$ISSUE_NUM"
  git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"

  # 3. Claude Code Agent 실행
  local PROMPT_FILE="${REPO_DIR}/scripts/feedback-agent-prompt.md"
  local SYSTEM_PROMPT=""
  if [ -f "$PROMPT_FILE" ]; then
    SYSTEM_PROMPT="--system-prompt $(cat "$PROMPT_FILE")"
  fi

  local PROMPT
  PROMPT="GitHub Issue #$ISSUE_NUM: $TITLE

$BODY

이 visual feedback을 분석하고 수정해주세요:
1. 문제 파악 (스크린샷 설명 참고)
2. 관련 파일 찾기 (packages/web/ 우선)
3. 코드 수정
4. typecheck + lint 통과 확인
5. 커밋 후 PR 생성 (gh pr create --title 'fix: [visual-feedback] #$ISSUE_NUM — $TITLE')"

  local RESULT
  RESULT=$(echo "$PROMPT" | claude -p --max-turns 20 2>&1) || true

  # 4. PR URL 추출 + 상태 업데이트
  local PR_URL
  PR_URL=$(echo "$RESULT" | grep -oP 'https://github.com/[^ ]+/pull/\d+' | head -1 || true)

  if [ -n "$PR_URL" ]; then
    log "SUCCESS: PR created — $PR_URL"
    curl -sf -X PATCH "$API_BASE/api/feedback-queue/$ITEM_ID" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d "{\"status\":\"done\",\"agentPrUrl\":\"$PR_URL\"}" >/dev/null
  else
    log "FAILED: No PR created for Issue #$ISSUE_NUM"
    local ERR_MSG
    ERR_MSG=$(echo "$RESULT" | tail -5 | jq -Rs '.' | sed 's/^"//;s/"$//')
    curl -sf -X PATCH "$API_BASE/api/feedback-queue/$ITEM_ID" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d "{\"status\":\"failed\",\"errorMessage\":\"No PR created: $ERR_MSG\"}" >/dev/null
  fi

  git checkout master
  return 0
}

# Main loop
log "Feedback consumer started (interval=${INTERVAL}s, once=$ONCE)"

while true; do
  consume_one || sleep "$INTERVAL"

  if [ "$ONCE" = true ]; then
    log "Single run complete — exiting"
    break
  fi

  sleep "$INTERVAL"
done
