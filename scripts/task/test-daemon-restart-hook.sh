#!/usr/bin/env bash
# scripts/task/test-daemon-restart-hook.sh — C30 daemon auto-restart hook 단위 테스트
#
# Case A: task-daemon.sh 수정 → hook이 재기동 명령 실행
# Case B: packages/api 파일 수정 → hook이 재기동 안 함 (false positive 방지)

set -eo pipefail

PASS=0
FAIL=0

run_case() {
  local name="$1"
  local diff_output="$2"    # git diff --name-only HEAD~1 HEAD 의 모의 출력
  local expect_restart="$3" # "yes" or "no"

  # hook 로직 인라인 (task-complete.sh Step 6 와 동일)
  DAEMON_MODIFIED=$(echo "$diff_output" \
    | grep -E '^scripts/task/(task-daemon|lib)\.sh$' || true)

  local restarted="no"
  if [ -n "$DAEMON_MODIFIED" ]; then
    restarted="yes"
  fi

  if [ "$restarted" = "$expect_restart" ]; then
    echo "  PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name — expected restart=$expect_restart, got restart=$restarted"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== daemon restart hook 단위 테스트 ==="

# Case A: task-daemon.sh 수정
run_case \
  "Case A: task-daemon.sh 수정 → restart=yes" \
  "scripts/task/task-daemon.sh" \
  "yes"

# Case A-2: lib.sh 수정
run_case \
  "Case A-2: lib.sh 수정 → restart=yes" \
  "scripts/task/lib.sh" \
  "yes"

# Case B: packages/api 수정 → restart=no
run_case \
  "Case B: packages/api 파일 수정 → restart=no" \
  "packages/api/src/routes/tasks.ts" \
  "no"

# Case B-2: 혼합 (daemon + other) → restart=yes
run_case \
  "Case B-2: daemon+other 혼합 수정 → restart=yes" \
  "packages/api/src/routes/tasks.ts
scripts/task/lib.sh" \
  "yes"

echo ""
echo "결과: ${PASS} PASS / ${FAIL} FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
