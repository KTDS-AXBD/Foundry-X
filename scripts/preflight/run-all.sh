#!/usr/bin/env bash
#
# Preflight Run-All (C97/C78/C81)
#
# scripts/preflight/ 의 모든 check-*.sh 를 순차 실행하는 통합 엔트리포인트.
# MSA deploy 전 또는 sprint-autopilot Phase 3→4 전환 시 사용.
#
# Usage:
#   bash scripts/preflight/run-all.sh                  # 모든 check-*.sh 실행
#   DRY_RUN=1 bash scripts/preflight/run-all.sh        # 스크립트 목록만 출력
#   SKIP_LINT=1 bash scripts/preflight/run-all.sh      # check-lint.sh 제외
#   SPRINT_NUM=315 bash scripts/preflight/run-all.sh   # scope-drift-check도 실행
#
# Env:
#   DRY_RUN=1    — 실행 없이 목록만 출력
#   SKIP_LINT=1  — check-lint.sh 건너뜀 (CI에서는 turbo lint가 이미 포함)
#   SPRINT_NUM   — check-scope-drift.sh에 전달 (미설정 시 scope-drift-check SKIP)
#
# Exit code:
#   0 — 모든 체크 PASS (또는 DRY_RUN)
#   1 — 하나 이상 FAIL

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

SCRIPT_DIR="$REPO_ROOT/scripts/preflight"
DRY_RUN="${DRY_RUN:-}"
SKIP_LINT="${SKIP_LINT:-}"
SPRINT_NUM="${SPRINT_NUM:-}"

FAIL_COUNT=0
PASS_COUNT=0

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Preflight Run-All (C97)"
echo "════════════════════════════════════════════════════════════"

for script in "$SCRIPT_DIR"/check-*.sh; do
  [ -f "$script" ] || continue
  script_name=$(basename "$script")

  # SKIP_LINT=1: check-lint.sh 제외
  if [ -n "$SKIP_LINT" ] && [ "$script_name" = "check-lint.sh" ]; then
    printf '\033[33m[SKIP]\033[0m  %s (SKIP_LINT=1)\n' "$script_name"
    continue
  fi

  # check-scope-drift.sh: SPRINT_NUM 미설정 시 건너뜀 (스크립트 자체도 SKIP exit 0)
  if [ "$script_name" = "check-scope-drift.sh" ] && [ -z "$SPRINT_NUM" ]; then
    printf '\033[33m[SKIP]\033[0m  %s (SPRINT_NUM 미설정)\n' "$script_name"
    continue
  fi

  if [ -n "$DRY_RUN" ]; then
    printf '\033[36m[DRY]\033[0m   %s\n' "$script_name"
    continue
  fi

  echo ""
  echo "─── $script_name ───"
  local_exit=0
  bash "$script" || local_exit=$?
  if [ "$local_exit" -eq 0 ]; then
    ((PASS_COUNT++))
  else
    ((FAIL_COUNT++))
    printf '\033[31m[FAIL]\033[0m  %s exited %s\n' "$script_name" "$local_exit"
  fi
done

echo ""
echo "════════════════════════════════════════════════════════════"
if [ -n "$DRY_RUN" ]; then
  echo "  [DRY RUN] 위 스크립트를 실행할 예정"
else
  printf "  결과: PASS=%s / FAIL=%s\n" "$PASS_COUNT" "$FAIL_COUNT"
fi
echo "════════════════════════════════════════════════════════════"

if [ -n "$DRY_RUN" ]; then
  exit 0
fi

[ "$FAIL_COUNT" -eq 0 ] || exit 1
