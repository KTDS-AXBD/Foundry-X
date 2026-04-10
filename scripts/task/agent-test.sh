#!/usr/bin/env bash
# scripts/task/agent-test.sh — 작업 테스트 Agent
#
# 완료/진행 중인 task의 변경 파일을 분석하고 관련 테스트를 실행.
# Master pane에서 실행 — WT 코드를 읽기 전용으로 분석.
#
# Usage:
#   agent-test.sh <task_id>            # 특정 task 테스트
#   agent-test.sh --all                # 모든 활성 task 테스트
#   agent-test.sh --merged [count]     # 최근 merged N개 검증

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

CMD="${1:?task_id or --all or --merged required}"
REPO_ROOT=$(_repo_root)

# ─── Analyze changed files for a branch ─────────────────────────────────────
analyze_changes() {
  local wt_path="$1" branch="$2" tid="$3"
  local base_ref="master"

  echo "  📂 변경 파일 분석..."

  local changed_files
  if [ -d "$wt_path" ]; then
    changed_files=$(cd "$wt_path" && git diff --name-only "$base_ref"..HEAD 2>/dev/null || true)
  else
    # Merged branch — check from master log
    changed_files=$(git diff --name-only "$(git merge-base master "$branch" 2>/dev/null || echo master)..${branch}" 2>/dev/null || true)
  fi

  if [ -z "$changed_files" ]; then
    echo "    (변경 파일 없음)"
    return
  fi

  # Categorize
  local api_files web_files cli_files shared_files test_files other_files
  api_files=$(echo "$changed_files" | grep '^packages/api/' || true)
  web_files=$(echo "$changed_files" | grep '^packages/web/' | grep -v '/e2e/' || true)
  cli_files=$(echo "$changed_files" | grep '^packages/cli/' || true)
  shared_files=$(echo "$changed_files" | grep '^packages/shared/' || true)
  test_files=$(echo "$changed_files" | grep -E '\.test\.(ts|tsx)$|/e2e/' || true)
  other_files=$(echo "$changed_files" | grep -vE '^packages/(api|web|cli|shared)/' || true)

  local file_count
  file_count=$(echo "$changed_files" | wc -l)
  echo "    총 ${file_count}개 파일 변경"

  [ -n "$api_files" ] && echo "    API:    $(echo "$api_files" | wc -l)개"
  [ -n "$web_files" ] && echo "    Web:    $(echo "$web_files" | wc -l)개"
  [ -n "$cli_files" ] && echo "    CLI:    $(echo "$cli_files" | wc -l)개"
  [ -n "$shared_files" ] && echo "    Shared: $(echo "$shared_files" | wc -l)개"
  [ -n "$test_files" ] && echo "    Tests:  $(echo "$test_files" | wc -l)개"
  [ -n "$other_files" ] && echo "    Other:  $(echo "$other_files" | wc -l)개"

  echo ""
}

# ─── Run relevant tests ────────────────────────────────────────────────────
run_tests() {
  local wt_path="$1" branch="$2" tid="$3"
  local test_dir="$REPO_ROOT"  # Always run tests from main repo (shared DB, deps)

  local changed_files
  if [ -d "$wt_path" ]; then
    changed_files=$(cd "$wt_path" && git diff --name-only master..HEAD 2>/dev/null || true)
  else
    changed_files=""
  fi

  echo "  🧪 테스트 실행..."

  # Determine which packages to test
  local test_api=false test_web=false test_cli=false test_shared=false

  if [ -z "$changed_files" ]; then
    echo "    변경 파일 없음 — 전체 테스트 스킵"
    return 0
  fi

  echo "$changed_files" | grep -q '^packages/api/' && test_api=true
  echo "$changed_files" | grep -q '^packages/web/' && test_web=true
  echo "$changed_files" | grep -q '^packages/cli/' && test_cli=true
  echo "$changed_files" | grep -q '^packages/shared/' && { test_api=true; test_web=true; test_cli=true; test_shared=true; }

  local pass=0 fail=0

  if [ "$test_api" = true ]; then
    echo "    ▸ API 테스트..."
    if (cd "$test_dir" && pnpm --filter api test --run 2>&1 | tail -3); then
      pass=$((pass + 1))
      echo "      ✅ API 통과"
    else
      fail=$((fail + 1))
      echo "      ❌ API 실패"
    fi
  fi

  if [ "$test_web" = true ]; then
    echo "    ▸ Web 테스트..."
    if (cd "$test_dir" && pnpm --filter web test --run 2>&1 | tail -3); then
      pass=$((pass + 1))
      echo "      ✅ Web 통과"
    else
      fail=$((fail + 1))
      echo "      ❌ Web 실패"
    fi
  fi

  if [ "$test_cli" = true ]; then
    echo "    ▸ CLI 테스트..."
    if (cd "$test_dir" && pnpm --filter cli test --run 2>&1 | tail -3); then
      pass=$((pass + 1))
      echo "      ✅ CLI 통과"
    else
      fail=$((fail + 1))
      echo "      ❌ CLI 실패"
    fi
  fi

  # Typecheck
  echo "    ▸ TypeCheck..."
  if (cd "$test_dir" && turbo typecheck 2>&1 | tail -3); then
    pass=$((pass + 1))
    echo "      ✅ TypeCheck 통과"
  else
    fail=$((fail + 1))
    echo "      ❌ TypeCheck 실패"
  fi

  echo ""
  echo "    결과: ✅ ${pass} 통과, ❌ ${fail} 실패"

  log_event "$tid" "test_run" "$(jq -nc --argjson pass "$pass" --argjson fail "$fail" '{pass:$pass, fail:$fail}')"

  return "$fail"
}

# ─── Test a single task ────────────────────────────────────────────────────
test_task() {
  local tid="$1"
  local status wt branch
  status=$(jq -r --arg id "$tid" '.tasks[$id].status // "unknown"' "$FX_CACHE" 2>/dev/null)
  wt=$(jq -r --arg id "$tid" '.tasks[$id].wt // ""' "$FX_CACHE" 2>/dev/null)
  branch=$(jq -r --arg id "$tid" '.tasks[$id].branch // ""' "$FX_CACHE" 2>/dev/null)

  echo ""
  echo "┌─────────────────────────────────────────────"
  echo "│  🧪 ${tid} 테스트 (status: ${status})"
  echo "├─────────────────────────────────────────────"

  if [ "$status" = "unknown" ]; then
    echo "│  ❌ cache에 없는 task"
    echo "└─────────────────────────────────────────────"
    return 1
  fi

  analyze_changes "$wt" "$branch" "$tid"
  run_tests "$wt" "$branch" "$tid"
  local result=$?

  echo "└─────────────────────────────────────────────"
  return $result
}

# ─── Main dispatch ─────────────────────────────────────────────────────────
case "$CMD" in
  --all)
    echo "[agent-test] 활성 task 전체 테스트"
    tasks=$(jq -r '.tasks | to_entries[] | select(.value.status=="in_progress") | .key' "$FX_CACHE" 2>/dev/null || true)
    if [ -z "$tasks" ]; then
      echo "활성 task 없음"
      exit 0
    fi
    total_fail=0
    for tid in $tasks; do
      test_task "$tid" || total_fail=$((total_fail + 1))
    done
    echo ""
    echo "[agent-test] 전체 결과: $( [ $total_fail -eq 0 ] && echo '✅ 모두 통과' || echo "❌ ${total_fail}건 실패")"
    ;;

  --merged)
    COUNT="${2:-3}"
    echo "[agent-test] 최근 merged ${COUNT}건 검증"
    tasks=$(jq -r "[.tasks | to_entries[] | select(.value.status==\"merged\")] | sort_by(.value.updated_at) | reverse | .[0:${COUNT}] | .[].key" "$FX_CACHE" 2>/dev/null || true)
    if [ -z "$tasks" ]; then
      echo "merged task 없음"
      exit 0
    fi
    # For merged tasks, just run full test suite on master
    echo "  master 기준 전체 테스트 실행..."
    (cd "$REPO_ROOT" && turbo test --run 2>&1 | tail -10)
    echo ""
    (cd "$REPO_ROOT" && turbo typecheck 2>&1 | tail -5)
    ;;

  *)
    test_task "$CMD"
    ;;
esac
