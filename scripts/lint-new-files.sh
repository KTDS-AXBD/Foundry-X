#!/usr/bin/env bash
# lint-new-files.sh — MSA ESLint 룰을 PR의 신규/수정 파일에만 적용
#
# 사용: bash scripts/lint-new-files.sh [base-ref]
#   base-ref: 비교 기준 브랜치 (기본값: origin/master)
#
# CI 환경에서는 fetch-depth: 0 필수 (origin/master 이력이 없으면 diff 불가)

set -euo pipefail

BASE_REF="${1:-origin/master}"
REPO_ROOT="$(git rev-parse --show-toplevel)"

echo "MSA lint — base: ${BASE_REF}"

# PR에서 추가/수정된 .ts 파일 추출 (Added + Modified)
CHANGED_FILES=$(
  git diff --name-only --diff-filter=AM "${BASE_REF}...HEAD" 2>/dev/null \
  | grep -E '^packages/api/src/core/.*\.ts$' \
  | grep -v '\.test\.ts$' \
  || true
)

if [ -z "$CHANGED_FILES" ]; then
  echo "✅ core/ 내 변경 .ts 파일 없음 — MSA lint skip"
  exit 0
fi

echo "검사 대상:"
echo "$CHANGED_FILES" | sed 's/^/  /'

# packages/api 기준으로 상대경로 변환
FILES_REL=$(echo "$CHANGED_FILES" | sed "s|packages/api/||g")

cd "${REPO_ROOT}/packages/api"

# eslint를 변경 파일들에만 실행 (프로젝트 로컬 버전 사용)
# shellcheck disable=SC2086
pnpm exec eslint --max-warnings 0 $FILES_REL

echo "✅ MSA lint 통과"
