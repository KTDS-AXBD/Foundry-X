#!/usr/bin/env bash
# Board 스크립트 공통 상수/헬퍼 — F503/F504
# 소싱 전용: source "$(dirname "$0")/_common.sh"
set -euo pipefail

: "${OWNER:=KTDS-AXBD}"
: "${REPO:=KTDS-AXBD/Foundry-X}"
: "${PROJECT_TITLE:=Foundry-X Kanban}"

board::require() {
  # 기본 의존성 검사 (gh + jq만)
  # pr-body-enrich.sh, board-on-merge.sh 등 Projects API를 쓰지 않는 스크립트용
  command -v gh >/dev/null 2>&1 || { echo "[board] gh CLI 필요" >&2; exit 1; }
  command -v jq >/dev/null 2>&1 || { echo "[board] jq 필요" >&2; exit 1; }
}

board::require_projects() {
  # Projects v2 API 의존성 추가 검사 (board-list/move/sync-spec에서만 호출)
  # S255 dogfood 교훈: scope 부족 → gh project list 빈 출력 → drift 오판
  board::require
  if ! gh auth status 2>&1 | grep -q "Token scopes.*read:project"; then
    echo "[board] Projects API scope 부족: 'read:project' 필요" >&2
    echo "[board] 수정: gh auth refresh -s read:project,project" >&2
    exit 3
  fi
}

board::project_num() {
  gh project list --owner "$OWNER" --format json 2>/dev/null \
    | jq -r --arg t "$PROJECT_TITLE" \
        '.projects[] | select(.title==$t) | .number' | head -1
}

board::project_id() {
  local num="$1"
  gh project view "$num" --owner "$OWNER" --format json 2>/dev/null \
    | jq -r '.id'
}

board::status_field_id() {
  local num="$1"
  gh project field-list "$num" --owner "$OWNER" --format json 2>/dev/null \
    | jq -r '.fields[] | select(.name=="Status") | .id'
}

board::status_option_id() {
  local num="$1" col="$2"
  gh project field-list "$num" --owner "$OWNER" --format json 2>/dev/null \
    | jq -r --arg c "$col" \
        '.fields[] | select(.name=="Status") | .options[] | select(.name==$c) | .id'
}
