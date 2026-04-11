#!/usr/bin/env bash
# F507 — Priority 변경 이력 자동 기록
# Usage:
#   bash scripts/priority/record-change.sh F_NUM OLD_P NEW_P "REASON" [--no-issue]
# 예:
#   bash scripts/priority/record-change.sh F507 P2 P1 "M4 critical path"
set -euo pipefail

usage() {
  cat >&2 <<EOF
Usage: $0 F_NUM OLD_P NEW_P "REASON" [--no-issue]
  F_NUM   — F-item 번호 (F1~F9999)
  OLD_P   — 이전 Priority (P0~P3)
  NEW_P   — 새 Priority (P0~P3)
  REASON  — 변경 사유 (필수)
  --no-issue — GitHub Issue 동기화 건너뜀
EOF
  exit 1
}

[ $# -lt 4 ] && usage

F_NUM="$1"
OLD_P="$2"
NEW_P="$3"
REASON="$4"
NO_ISSUE=false
if [ "${5:-}" = "--no-issue" ]; then
  NO_ISSUE=true
fi

# 인자 검증
if ! echo "$F_NUM" | grep -qE '^F[0-9]+$'; then
  echo "ERROR: F_NUM은 F숫자 형식이어야 합니다 (예: F507)" >&2
  exit 1
fi
if ! echo "$OLD_P" | grep -qE '^P[0-3]$'; then
  echo "ERROR: OLD_P는 P0~P3이어야 합니다" >&2
  exit 1
fi
if ! echo "$NEW_P" | grep -qE '^P[0-3]$'; then
  echo "ERROR: NEW_P는 P0~P3이어야 합니다" >&2
  exit 1
fi
if [ "$OLD_P" = "$NEW_P" ]; then
  echo "ERROR: OLD_P와 NEW_P가 같습니다 ($OLD_P)" >&2
  exit 1
fi
if [ -z "$REASON" ]; then
  echo "ERROR: REASON이 비어있습니다" >&2
  exit 1
fi

# 프로젝트 루트
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
HIST_DIR="${REPO_ROOT}/docs/priority-history"
HIST_FILE="${HIST_DIR}/${F_NUM}.md"
LOCK_FILE="${HIST_DIR}/.${F_NUM}.lock"
mkdir -p "$HIST_DIR"

TS=$(date -Iseconds)
ACTOR=$(git config user.email 2>/dev/null || echo "unknown")

# Race guard: flock 확보 (workflow + manual 동시 실행 방지, 10초 timeout)
# 파일 생성/append 전 구간을 원자화하여 손상 방지
exec 9>"$LOCK_FILE"
if ! flock -w 10 9; then
  echo "ERROR: lock 획득 실패 (${LOCK_FILE}) — 다른 프로세스가 기록 중" >&2
  exit 2
fi

# 이력 파일 초기화 (없으면)
if [ ! -f "$HIST_FILE" ]; then
  # SPEC.md에서 REQ 추출 시도
  REQ=$(grep -F "| ${F_NUM} |" "${REPO_ROOT}/SPEC.md" 2>/dev/null \
    | grep -oE 'FX-REQ-[0-9]+' | head -1 || echo "unknown")
  CREATED_DATE=$(date -I)
  cat > "$HIST_FILE" <<HEADER
---
f_item: ${F_NUM}
req: ${REQ}
created: ${CREATED_DATE}
---

# ${F_NUM} Priority 변경 이력

| 시각 | 변경 | 사유 | 변경자 |
|------|------|------|--------|
HEADER
fi

# 중복 append 방지: 마지막 행이 동일한 (OLD,NEW,REASON)이면 skip
LAST_ROW=$(tail -1 "$HIST_FILE" 2>/dev/null || true)
NEW_KEY="${OLD_P} → ${NEW_P} | ${REASON}"
if echo "$LAST_ROW" | grep -qF "| ${NEW_KEY} |"; then
  echo "ℹ️  중복 감지 — 마지막 행과 동일 (${NEW_KEY}), skip"
  flock -u 9
  exit 0
fi

# Append 이력 행
REASON_ESC=$(echo "$REASON" | sed 's/|/\\|/g')
echo "| ${TS} | ${OLD_P} → ${NEW_P} | ${REASON_ESC} | ${ACTOR} |" >> "$HIST_FILE"
echo "✅ history: ${HIST_FILE}"

# Lock 해제 (파일 close 시 자동이지만 명시)
flock -u 9

# GitHub 동기화
if [ "$NO_ISSUE" = "true" ]; then
  echo "ℹ️  --no-issue: GitHub Issue 동기화 건너뜀"
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "⚠️  gh CLI 미설치 — Issue 동기화 건너뜀" >&2
  exit 0
fi

GITHUB_REPO=$(git remote get-url origin 2>/dev/null | grep -oP '(?<=github.com[:/])[^.]+' || true)
if [ -z "$GITHUB_REPO" ]; then
  echo "⚠️  GitHub remote 없음 — Issue 동기화 건너뜀" >&2
  exit 0
fi

if [ -f "${REPO_ROOT}/.git/.credentials" ] && [ -z "${GH_TOKEN:-}" ]; then
  GH_TOKEN=$(sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/' "${REPO_ROOT}/.git/.credentials" 2>/dev/null || true)
  export GH_TOKEN
fi

ISSUE_NUM=$(gh issue list --repo "$GITHUB_REPO" --state all --search "[${F_NUM}] in:title" \
  --json number --jq '.[0].number' 2>/dev/null || true)

if [ -z "$ISSUE_NUM" ]; then
  echo "⚠️  [${F_NUM}] Issue 미발견 — comment/label 건너뜀" >&2
  exit 0
fi

# Comment
COMMENT_BODY="🔧 Priority 변경: **${OLD_P} → ${NEW_P}**

사유: ${REASON}
변경자: ${ACTOR}
이력: \`docs/priority-history/${F_NUM}.md\`"
if gh issue comment "$ISSUE_NUM" --repo "$GITHUB_REPO" --body "$COMMENT_BODY" >/dev/null 2>&1; then
  echo "✅ comment: #${ISSUE_NUM}"
else
  echo "⚠️  comment 실패 #${ISSUE_NUM}" >&2
fi

# Label 교체 (P*-* 형식 가정)
label_for() {
  case "$1" in
    P0) echo "P0-critical" ;;
    P1) echo "P1-high" ;;
    P2) echo "P2-medium" ;;
    P3) echo "P3-low" ;;
  esac
}
OLD_LABEL=$(label_for "$OLD_P")
NEW_LABEL=$(label_for "$NEW_P")

if gh issue edit "$ISSUE_NUM" --repo "$GITHUB_REPO" \
    --remove-label "$OLD_LABEL" --add-label "$NEW_LABEL" >/dev/null 2>&1; then
  echo "✅ label: ${OLD_LABEL} → ${NEW_LABEL}"
else
  echo "⚠️  label 교체 실패 (라벨 미존재 가능)" >&2
fi

echo "완료: ${F_NUM} ${OLD_P} → ${NEW_P}"
