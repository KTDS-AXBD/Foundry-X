#!/usr/bin/env bash
# GitHub Projects Board 초기 설정 — F501
# Foundry-X Kanban: Inbox → Backlog → Triaged → Sprint Ready → In Progress → Done
#
# Usage:
#   bash scripts/github-project-setup.sh            # 생성 + 기존 Issues 배치
#   bash scripts/github-project-setup.sh --dry-run  # 실행 계획만 출력
#
# 사전 조건:
#   - gh CLI 인증 완료 (gh auth status)
#   - project scope 포함: gh auth refresh -s project
set -euo pipefail

REPO="KTDS-AXBD/Foundry-X"
OWNER="KTDS-AXBD"
PROJECT_TITLE="Foundry-X Kanban"
COLUMNS=("Inbox" "Backlog" "Triaged" "Sprint Ready" "In Progress" "Done")

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      sed -n '2,15p' "$0"
      exit 0
      ;;
  esac
done

log() { printf '[project-setup] %s\n' "$*"; }
run() {
  if $DRY_RUN; then
    printf '[dry-run] %s\n' "$*"
  else
    eval "$@"
  fi
}

if ! command -v gh >/dev/null 2>&1; then
  echo "[project-setup] gh CLI가 필요합니다." >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "[project-setup] jq가 필요합니다." >&2
  exit 1
fi

# ─── Step 1: 프로젝트 존재 확인 또는 생성 ─────────────────────────────────────
log "Step 1: 프로젝트 확인 — $PROJECT_TITLE"
PROJECT_NUM=$(gh project list --owner "$OWNER" --format json 2>/dev/null \
  | jq -r --arg t "$PROJECT_TITLE" '.projects[] | select(.title==$t) | .number' \
  | head -1 || true)

if [ -z "$PROJECT_NUM" ]; then
  log "프로젝트 없음 — 신규 생성"
  if $DRY_RUN; then
    log "[dry-run] gh project create --owner $OWNER --title '$PROJECT_TITLE'"
    PROJECT_NUM="999"
  else
    PROJECT_JSON=$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json)
    PROJECT_NUM=$(echo "$PROJECT_JSON" | jq -r '.number')
    log "생성됨: project #$PROJECT_NUM"
  fi
else
  log "기존 프로젝트 재사용: #$PROJECT_NUM"
fi

# ─── Step 2: Status 필드 옵션(컬럼) 확인 ──────────────────────────────────────
log "Step 2: Status 필드 옵션 조회"
if ! $DRY_RUN; then
  STATUS_OPTIONS=$(gh project field-list "$PROJECT_NUM" --owner "$OWNER" --format json 2>/dev/null \
    | jq -r '.fields[] | select(.name=="Status") | .options[]?.name' || true)
  for col in "${COLUMNS[@]}"; do
    if echo "$STATUS_OPTIONS" | grep -qxF "$col"; then
      log "  ✓ $col"
    else
      log "  ⚠️  누락: $col — GraphQL updateProjectV2Field로 수동 추가 필요"
    fi
  done
else
  log "[dry-run] Status 옵션 확인: ${COLUMNS[*]}"
fi

# ─── Step 3: 기존 open Issues 배치 ───────────────────────────────────────────
log "Step 3: 기존 open Issues 프로젝트 추가"
ISSUE_COUNT=0
FAIL_COUNT=0

while read -r NUM; do
  [ -z "$NUM" ] && continue
  URL="https://github.com/$REPO/issues/$NUM"
  if $DRY_RUN; then
    log "[dry-run] + #$NUM → project"
  else
    if gh project item-add "$PROJECT_NUM" --owner "$OWNER" --url "$URL" >/dev/null 2>&1; then
      ISSUE_COUNT=$((ISSUE_COUNT + 1))
    else
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    sleep 0.3  # rate limit 방지
  fi
done < <(gh issue list --repo "$REPO" --state open --limit 200 --json number \
           2>/dev/null | jq -r '.[].number' || true)

log "Step 3 완료 — 추가: $ISSUE_COUNT / 실패: $FAIL_COUNT"

# ─── 요약 ────────────────────────────────────────────────────────────────────
cat <<EOF
[project-setup] ✅ 완료
  project:  #$PROJECT_NUM ($PROJECT_TITLE)
  columns:  ${COLUMNS[*]}
  added:    $ISSUE_COUNT issue(s)
  board:    https://github.com/orgs/$OWNER/projects/$PROJECT_NUM
EOF
