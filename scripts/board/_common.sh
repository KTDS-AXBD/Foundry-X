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

# S255 dogfood 교훈: scope 부족 → gh project list 빈 출력 → drift 오판.
# C25 확장: 빈 GH_TOKEN / env 토큰 / login 토큰을 구분해 actionable remediation 출력.
#
# Return codes:
#   0 OK (read:project 있음)
#   2 GH_TOKEN/GITHUB_TOKEN 이 빈 값
#   3 scope 부족 (env 토큰 사용 중)
#   4 scope 부족 (gh auth login 사용 중)
#   5 미인증
board::classify_projects_auth() {
  local status="$1" token_val="$2" source="$3"

  if [ "$source" = "env" ] && [ -z "$token_val" ]; then
    echo "[board] GH_TOKEN/GITHUB_TOKEN 이 빈 값으로 설정되어 Projects API 호출 불가" >&2
    echo "[board] 수정: 'unset GH_TOKEN GITHUB_TOKEN' 후 'gh auth login -s read:project,project' 실행" >&2
    return 2
  fi

  if printf '%s\n' "$status" | grep -qiE "not logged in|no github hosts"; then
    echo "[board] gh 인증 없음 — Projects API 호출 불가" >&2
    echo "[board] 수정: gh auth login -s read:project,project" >&2
    return 5
  fi

  if printf '%s\n' "$status" | grep -q "Token scopes.*read:project"; then
    return 0
  fi

  if [ "$source" = "env" ]; then
    echo "[board] Projects API scope 부족 (환경변수 토큰): 'read:project' 누락" >&2
    echo "[board] 수정: (a) read:project,project 스코프 포함 PAT 재발급 후 GH_TOKEN 교체, 또는" >&2
    echo "[board]       (b) 'unset GH_TOKEN GITHUB_TOKEN && gh auth refresh -s read:project,project'" >&2
    return 3
  fi

  echo "[board] Projects API scope 부족: 'read:project' 필요" >&2
  echo "[board] 수정: gh auth refresh -s read:project,project" >&2
  return 4
}

board::require_projects() {
  # Projects v2 API 의존성 preflight (board-list/move/sync-spec에서만 호출)
  board::require
  local status token_val source
  status="$(gh auth status 2>&1 || true)"
  if [ "${GH_TOKEN+x}" = "x" ] || [ "${GITHUB_TOKEN+x}" = "x" ]; then
    source="env"
    token_val="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
  else
    source="login"
    token_val=""
  fi
  board::classify_projects_auth "$status" "$token_val" "$source" || exit $?
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
