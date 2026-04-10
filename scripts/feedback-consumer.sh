#!/bin/bash
# Marker.io 피드백 큐 소비자 (F320, F477 안정화)
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

while [ $# -gt 0 ]; do
  case "$1" in
    --once) ONCE=true; shift ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    *) shift ;;
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

retry_failed() {
  # F477: failed 상태이고 retry_count < 3인 항목을 pending으로 리셋
  local FAILED_ITEMS
  FAILED_ITEMS=$(curl -sf "$API_BASE/api/feedback-queue?status=failed&limit=10" \
    -H "$AUTH_HEADER" 2>/dev/null || echo '{"items":[]}')

  echo "$FAILED_ITEMS" | jq -c '.items[] | select(.retry_count < 3)' 2>/dev/null | while read -r ITEM; do
    local ID RC
    ID=$(echo "$ITEM" | jq -r '.id')
    RC=$(echo "$ITEM" | jq -r '.retry_count')
    log "Retrying failed item $ID (retry_count=$RC)"
    curl -sf -X PATCH "$API_BASE/api/feedback-queue/$ID" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d '{"status":"pending"}' >/dev/null 2>&1 || true
  done
}

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

  # 2. 브랜치 생성 — F477: stash + rebase 안전 워크플로우
  cd "$REPO_DIR"
  git checkout master
  git stash --include-untracked 2>/dev/null || true
  git pull origin master
  local BRANCH="fix/feedback-$ISSUE_NUM"
  git checkout -b "$BRANCH" 2>/dev/null || {
    git checkout "$BRANCH"
    git rebase master || {
      git rebase --abort
      git reset --hard master
    }
  }

  # 3. Claude Code Agent 실행 — F477: 개선된 프롬프트
  local PROMPT
  PROMPT="GitHub Issue #${ISSUE_NUM}: ${TITLE}

${BODY}

이 피드백을 분석하고 수정해주세요.

## 작업 범위
- packages/web/src/ 디렉토리만 수정할 수 있어요
- 다른 패키지(api, cli, shared)나 설정 파일은 수정하지 마세요

## 작업 순서
1. Issue 내용과 스크린샷 설명을 분석하세요
2. packages/web/src/ 에서 관련 파일을 찾으세요
3. 코드를 수정하세요
4. typecheck 확인: cd packages/web && npx tsc --noEmit
5. 변경된 파일만 개별 git add (git add . 금지):
   git add packages/web/src/path/to/file.tsx
6. 커밋:
   git commit -m \"fix: [visual-feedback] #${ISSUE_NUM} — ${TITLE}\"
7. push:
   git push origin ${BRANCH}
8. PR 생성:
   gh pr create --title \"fix: [visual-feedback] #${ISSUE_NUM} — ${TITLE}\" --body \"Closes #${ISSUE_NUM}\"

## 중요
- 반드시 PR URL을 마지막에 출력하세요
- git add . 대신 개별 파일을 지정하세요
- CLAUDE.md, SPEC.md, package.json 등 메타 파일은 수정하지 마세요"

  local RESULT
  RESULT=$(echo "$PROMPT" | claude -p --dangerously-skip-permissions --max-turns 20 2>&1) || true

  # 4. PR URL 추출 — F477: 3단계 fallback
  local PR_URL=""
  # 1차: 표준 GitHub PR URL
  PR_URL=$(echo "$RESULT" | grep -oP 'https://github\.com/[^\s"]+/pull/[0-9]+' | head -1 || true)
  # 2차: tail에서 재탐색
  if [ -z "$PR_URL" ]; then
    PR_URL=$(echo "$RESULT" | tail -20 | grep -oP 'https://github\.com/[^\s"]+/pull/[0-9]+' | head -1 || true)
  fi
  # 3차: gh pr list 브랜치 기반 조회
  if [ -z "$PR_URL" ]; then
    PR_URL=$(gh pr list --head "$BRANCH" --json url --jq '.[0].url' 2>/dev/null || true)
  fi

  # 5. 상태 업데이트 — F477: Agent 로그 보존
  local AGENT_LOG
  AGENT_LOG=$(echo "$RESULT" | tail -c 2000)

  if [ -n "$PR_URL" ]; then
    log "SUCCESS: PR created — $PR_URL"
    local PATCH_BODY
    PATCH_BODY=$(jq -n --arg url "$PR_URL" --arg log "$AGENT_LOG" \
      '{status:"done", agentPrUrl:$url, agentLog:$log}')
    curl -sf -X PATCH "$API_BASE/api/feedback-queue/$ITEM_ID" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d "$PATCH_BODY" >/dev/null
  else
    log "FAILED: No PR created for Issue #$ISSUE_NUM"
    local ERR_MSG PATCH_BODY
    ERR_MSG=$(echo "$RESULT" | tail -5 | head -c 200)
    PATCH_BODY=$(jq -n --arg err "No PR created: $ERR_MSG" --arg log "$AGENT_LOG" \
      '{status:"failed", errorMessage:$err, agentLog:$log}')
    curl -sf -X PATCH "$API_BASE/api/feedback-queue/$ITEM_ID" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d "$PATCH_BODY" >/dev/null
  fi

  git checkout master
  return 0
}

# Main loop
log "Feedback consumer started (interval=${INTERVAL}s, once=$ONCE)"

while true; do
  retry_failed
  consume_one || sleep "$INTERVAL"

  if [ "$ONCE" = true ]; then
    log "Single run complete — exiting"
    break
  fi

  sleep "$INTERVAL"
done
