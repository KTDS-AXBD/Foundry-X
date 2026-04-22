#!/usr/bin/env bash
#
# Lint Pre-check Gate (C97/C78)
#
# feedback_autopilot_lint_gap.md 재발 방지:
# Sprint autopilot이 pnpm test/typecheck만 실행하고 lint를 건너뛰면
# CI의 `pnpm turbo lint test` 에서 ESLint errors → test job FAIL → deploy skip 연쇄.
#
# 이 스크립트를 sprint-autopilot Phase 3(Implement) 완료 후, PR 생성 전에 실행하면
# lint errors를 local에서 선제 차단할 수 있다.
#
# Usage:
#   bash scripts/preflight/check-lint.sh
#
# Env:
#   LINT_SKIP=1      — skip 모드: 검증 없이 exit 0 (CI dry-run용)
#   LINT_MOCK_FAIL=1 — 테스트용: 항상 exit 1 반환
#
# Exit code:
#   0 — lint PASS (또는 skip)
#   1 — lint FAIL (ESLint errors 존재)

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

LINT_SKIP="${LINT_SKIP:-}"
LINT_MOCK_FAIL="${LINT_MOCK_FAIL:-}"

# ─── 테스트 mock ──────────────────────────────────────────────────────
if [ -n "$LINT_MOCK_FAIL" ]; then
  echo "[FAIL]  Lint mock FAIL (LINT_MOCK_FAIL=1)" >&2
  exit 1
fi

# ─── Skip 모드 ────────────────────────────────────────────────────────
if [ -n "$LINT_SKIP" ]; then
  echo "[SKIP]  Lint check skipped (LINT_SKIP=1)"
  exit 0
fi

# ─── 실제 lint 실행 ──────────────────────────────────────────────────
echo "[INFO]  Running pnpm turbo lint..."
echo "[INFO]  Ref: feedback_autopilot_lint_gap.md (S297 F540 8 errors → CI fail 재현)"
echo ""

if pnpm turbo lint; then
  echo ""
  echo "[PASS]  Lint PASS — PR 생성 안전"
  exit 0
else
  echo ""
  echo "[FAIL]  Lint FAIL — ESLint errors 해소 후 PR 생성"
  echo "[INFO]  Hint: pnpm turbo lint -- --fix 로 auto-fixable 항목 먼저 처리"
  exit 1
fi
