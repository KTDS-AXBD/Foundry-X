#!/usr/bin/env bash
# scripts/task/agent-doctor.sh — 자가점검 Agent (Self-Healing Watch Diagnostics)
#
# watch/monitor 로그를 분석하여 미감지 완료 패턴을 발견하고,
# task-watch.sh의 DONE_PATTERNS 보강을 제안하는 진단 도구.
#
# Usage:
#   agent-doctor.sh                  # 기본 진단 (--check)
#   agent-doctor.sh --check          # watch 로그 분석 + 실패 기록
#   agent-doctor.sh --learn          # 실패 로그에서 새 패턴 추출 → 제안
#   agent-doctor.sh --report         # 실패 통계 보고서
#   agent-doctor.sh --test-patterns  # 현재 DONE_PATTERNS 유효성 테스트

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

CMD="${1:---check}"
REPO_ROOT=$(_repo_root)
PROJECT=$(_project_name 2>/dev/null || basename "$REPO_ROOT")

WATCH_LOG="/tmp/task-signals/watch-${PROJECT}.log"
FAILURES_LOG="$FX_HOME/watch-failures.ndjson"
WATCH_SCRIPT="$SCRIPT_DIR/task-watch.sh"

# Ensure failures log exists
[ -f "$FAILURES_LOG" ] || : > "$FAILURES_LOG"

# ─── Colors ──────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; NC=''
fi

# ─── Extract current DONE_PATTERNS from task-watch.sh ────────────────────────
get_current_patterns() {
  sed -n '/^DONE_PATTERNS=(/,/^)/p' "$WATCH_SCRIPT" \
    | grep -v '^DONE_PATTERNS=(' | grep -v '^)' \
    | grep -v '^\s*#' \
    | sed 's/^\s*"//; s/"$//' \
    | grep -v '^$'
}

# ─── Check: Analyze watch logs for missed completions ────────────────────────
do_check() {
  echo -e "${CYAN}[agent-doctor] 진단 시작 — ${PROJECT}${NC}"
  echo ""
  local issues=0

  # 1. Watch log health
  if [ ! -f "$WATCH_LOG" ]; then
    echo -e "  ${RED}❌ watch 로그 없음${NC} — task-watch.sh가 실행된 적 없거나 로그 경로 불일치"
    issues=$((issues + 1))
  else
    local log_lines; log_lines=$(wc -l < "$WATCH_LOG")
    local last_ts; last_ts=$(tail -1 "$WATCH_LOG" | grep -oE '\[[0-9:]+\]' | tr -d '[]' || echo "—")
    echo -e "  📋 watch 로그: ${log_lines} lines, 마지막 기록: ${last_ts}"

    # Check for completion detections
    local detect_count; detect_count=$(grep -c '작업 완료 감지' "$WATCH_LOG" 2>/dev/null) || detect_count=0
    echo -e "  ✅ 완료 감지 성공: ${GREEN}${detect_count}건${NC}"

    # Check for error detections
    local error_count; error_count=$(grep -c '에러 감지' "$WATCH_LOG" 2>/dev/null) || error_count=0
    if [ "$error_count" -gt 0 ]; then
      echo -e "  ⚠️  에러 감지: ${YELLOW}${error_count}건${NC}"
    fi

    # Check for idle warnings
    local idle_count; idle_count=$(grep -c 'idle' "$WATCH_LOG" 2>/dev/null) || idle_count=0
    if [ "$idle_count" -gt 0 ]; then
      echo -e "  💤 idle 경고: ${YELLOW}${idle_count}건${NC}"
    fi
  fi

  echo ""

  # 2. Scan active panes for potential missed completions
  echo -e "  ${BLUE}── 활성 pane 스캔 ──${NC}"
  local active_tasks
  active_tasks=$(jq -r '.tasks | to_entries[] | select(.value.status=="in_progress") | "\(.key)|\(.value.pane)"' "$FX_CACHE" 2>/dev/null || true)

  if [ -z "$active_tasks" ]; then
    echo "  활성 task 없음 — 스캔 건너뜀"
  else
    while IFS='|' read -r tid pane; do
      [ -z "$tid" ] || [ -z "$pane" ] && continue
      if ! tmux list-panes -a -F '#{pane_id}' 2>/dev/null | grep -q "^${pane}$"; then
        continue
      fi

      local content
      content=$(tmux capture-pane -t "$pane" -p -S -40 2>/dev/null) || continue

      # Strip ANSI for analysis
      local clean
      clean=$(echo "$content" | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/\x1b\][^\x07]*\x07//g')

      # Check for prompt idle WITHOUT completion pattern match
      local has_prompt=false
      if echo "$clean" | tail -5 | grep -qE '^\s*(⏵|❯|\$)\s*$'; then
        has_prompt=true
      fi

      local has_done=false
      local patterns; patterns=$(get_current_patterns)
      while IFS= read -r pat; do
        [ -z "$pat" ] && continue
        if echo "$clean" | grep -qF "$pat"; then
          has_done=true
          break
        fi
      done <<< "$patterns"

      if [ "$has_prompt" = true ] && [ "$has_done" = false ]; then
        echo -e "  ${YELLOW}⚠️  ${tid} (${pane}): 프롬프트 idle인데 완료 패턴 미매칭${NC}"
        echo -e "     마지막 5줄:"
        echo "$clean" | tail -5 | sed 's/^/       /'

        # Record failure
        record_failure "$tid" "$pane" "$clean"
        issues=$((issues + 1))
      elif [ "$has_prompt" = true ] && [ "$has_done" = true ]; then
        # Signal file 존재 여부 확인
        if [ ! -f "/tmp/task-signals/${PROJECT}-${tid}.signal" ]; then
          echo -e "  ${YELLOW}⚠️  ${tid}: 완료 패턴+프롬프트 idle인데 signal 미생성${NC}"
          issues=$((issues + 1))
        else
          echo -e "  ${GREEN}✅ ${tid}: 정상 (완료 감지됨)${NC}"
        fi
      else
        echo -e "  🔄 ${tid}: 작업 진행 중"
      fi
    done <<< "$active_tasks"
  fi

  echo ""

  # 3. Check prompt_idle pattern coverage
  echo -e "  ${BLUE}── prompt_idle 패턴 검증 ──${NC}"
  local prompt_pattern_ok=true

  # Test if ⏵ is in task-watch.sh's prompt check
  if ! grep -q '⏵' "$WATCH_SCRIPT" 2>/dev/null; then
    echo -e "  ${RED}❌ task-watch.sh에 ⏵ (Claude Code 프롬프트) 패턴 없음${NC}"
    prompt_pattern_ok=false
    issues=$((issues + 1))
  else
    echo -e "  ${GREEN}✅ ⏵ 프롬프트 패턴 존재${NC}"
  fi

  if ! grep -q '❯' "$WATCH_SCRIPT" 2>/dev/null; then
    echo -e "  ${YELLOW}⚠️  ❯ fallback 패턴 없음${NC}"
  else
    echo -e "  ${GREEN}✅ ❯ fallback 패턴 존재${NC}"
  fi

  echo ""

  # 4. Failure history summary
  local fail_count=0
  if [ -f "$FAILURES_LOG" ] && [ -s "$FAILURES_LOG" ]; then
    fail_count=$(wc -l < "$FAILURES_LOG")
  fi
  echo -e "  📊 누적 실패 기록: ${fail_count}건 (${FAILURES_LOG})"

  echo ""
  if [ "$issues" -eq 0 ]; then
    echo -e "  ${GREEN}🎉 모든 진단 통과${NC}"
  else
    echo -e "  ${YELLOW}⚠️  ${issues}건 이슈 — \`agent-doctor.sh --learn\`으로 개선 제안 확인${NC}"
  fi
}

# ─── Record a missed-completion failure ──────────────────────────────────────
record_failure() {
  local tid="$1" pane="$2" content="$3"

  # Extract last 10 meaningful lines (skip blanks)
  local tail_lines
  tail_lines=$(echo "$content" | grep -v '^\s*$' | tail -10 | tr '\n' '|' | sed 's/|$//')

  jq -nc \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg tid "$tid" \
    --arg pane "$pane" \
    --arg project "$PROJECT" \
    --arg tail "$tail_lines" \
    '{ts:$ts, task_id:$tid, pane:$pane, project:$project, tail_lines:$tail, type:"missed_completion"}' \
    >> "$FAILURES_LOG"
}

# ─── Learn: Extract pattern candidates from failure logs ─────────────────────
do_learn() {
  echo -e "${CYAN}[agent-doctor] 학습 모드 — 실패 로그에서 패턴 추출${NC}"
  echo ""

  if [ ! -f "$FAILURES_LOG" ] || [ ! -s "$FAILURES_LOG" ]; then
    echo "  실패 기록 없음 — 먼저 --check를 실행하세요"
    return 0
  fi

  local current_patterns; current_patterns=$(get_current_patterns)
  local candidates=""
  local candidate_count=0

  echo -e "  ${BLUE}── 현재 DONE_PATTERNS ($(echo "$current_patterns" | wc -l)개) ──${NC}"
  echo "$current_patterns" | head -10 | sed 's/^/    /'
  [ "$(echo "$current_patterns" | wc -l)" -gt 10 ] && echo "    ... ($(echo "$current_patterns" | wc -l)개)"
  echo ""

  echo -e "  ${BLUE}── 실패 로그 분석 ──${NC}"

  # Collect unique tail phrases from failures
  local unique_phrases
  unique_phrases=$(jq -r '.tail_lines' "$FAILURES_LOG" 2>/dev/null | tr '|' '\n' | sort -u)

  # Common completion-indicating words/phrases to search for
  local indicator_words=("완료" "끝" "마무리" "done" "finish" "complete" "success" "진행" "실행" "해주세요" "할게요" "했어요" "됐어요")

  while IFS= read -r phrase; do
    [ -z "$phrase" ] && continue

    for word in "${indicator_words[@]}"; do
      if echo "$phrase" | grep -qi "$word"; then
        # Check if already covered by existing patterns
        local already_covered=false
        while IFS= read -r pat; do
          [ -z "$pat" ] && continue
          if echo "$phrase" | grep -qF "$pat"; then
            already_covered=true
            break
          fi
        done <<< "$current_patterns"

        if [ "$already_covered" = false ]; then
          # Extract the key part of the phrase (strip leading/trailing whitespace)
          local clean_phrase
          clean_phrase=$(echo "$phrase" | sed 's/^\s*//; s/\s*$//' | cut -c1-60)
          if [ -n "$clean_phrase" ]; then
            echo -e "    ${YELLOW}💡 후보: \"${clean_phrase}\"${NC}"
            echo -e "       (매칭 키워드: ${word})"
            candidates="${candidates}${clean_phrase}\n"
            candidate_count=$((candidate_count + 1))
          fi
        fi
      fi
    done
  done <<< "$unique_phrases"

  echo ""
  if [ "$candidate_count" -eq 0 ]; then
    echo -e "  ${GREEN}✅ 새로운 패턴 후보 없음 — 현재 DONE_PATTERNS가 충분해요${NC}"
  else
    echo -e "  ${YELLOW}📝 ${candidate_count}개 패턴 후보 발견${NC}"
    echo ""
    echo "  task-watch.sh DONE_PATTERNS에 추가를 제안해요:"
    echo -e "$candidates" | sort -u | while IFS= read -r c; do
      [ -z "$c" ] && continue
      echo "    \"$c\""
    done
    echo ""
    echo "  수동으로 task-watch.sh를 편집하거나, 다음 세션에서 자동 반영할 수 있어요."
  fi
}

# ─── Report: Failure statistics ──────────────────────────────────────────────
do_report() {
  echo -e "${CYAN}[agent-doctor] 실패 통계 보고서${NC}"
  echo ""

  if [ ! -f "$FAILURES_LOG" ] || [ ! -s "$FAILURES_LOG" ]; then
    echo "  기록 없음"
    return 0
  fi

  local total; total=$(wc -l < "$FAILURES_LOG")
  echo -e "  총 실패 기록: ${total}건"
  echo ""

  # By task
  echo -e "  ${BLUE}── task별 실패 ──${NC}"
  jq -r '.task_id' "$FAILURES_LOG" 2>/dev/null | sort | uniq -c | sort -rn | head -10 | \
    while read -r count tid; do
      echo "    ${tid}: ${count}건"
    done

  echo ""

  # By date
  echo -e "  ${BLUE}── 날짜별 실패 ──${NC}"
  jq -r '.ts[:10]' "$FAILURES_LOG" 2>/dev/null | sort | uniq -c | sort -rn | head -10 | \
    while read -r count dt; do
      echo "    ${dt}: ${count}건"
    done

  echo ""

  # Recent failures
  echo -e "  ${BLUE}── 최근 5건 ──${NC}"
  tail -5 "$FAILURES_LOG" | while IFS= read -r line; do
    local ts tid tail_excerpt
    ts=$(echo "$line" | jq -r '.ts[:19]' 2>/dev/null)
    tid=$(echo "$line" | jq -r '.task_id' 2>/dev/null)
    tail_excerpt=$(echo "$line" | jq -r '.tail_lines[:80]' 2>/dev/null)
    echo -e "    [${ts}] ${tid}: ${tail_excerpt}..."
  done
}

# ─── Test patterns: Validate DONE_PATTERNS against known samples ─────────────
do_test_patterns() {
  echo -e "${CYAN}[agent-doctor] DONE_PATTERNS 유효성 테스트${NC}"
  echo ""

  local patterns; patterns=$(get_current_patterns)
  local pat_count; pat_count=$(echo "$patterns" | wc -l)
  echo -e "  현재 패턴 수: ${pat_count}"
  echo ""

  # Known completion samples (should match)
  local -a positive_samples=(
    "Cooked for 3m 42s"
    "Baked for 56s"
    "Brewed for 1m 12s"
    "작업 완료했어요. task-complete.sh로 git 작업 진행하면 돼요"
    "완료됐어요! 다음 단계로 넘어가세요"
    "All done with the implementation"
    "task-complete.sh를 실행해주세요"
    "수고하셨어요. 모든 변경사항이 커밋됐어요"
    "I'm done with all the changes"
  )

  # Known non-completion samples (should NOT match)
  local -a negative_samples=(
    "Running typecheck..."
    "Reading file /src/app.ts"
    "Let me analyze the error"
    "I'll fix this next"
  )

  local pass=0 fail=0

  echo -e "  ${BLUE}── Positive samples (매칭 기대) ──${NC}"
  for sample in "${positive_samples[@]}"; do
    local matched=false
    while IFS= read -r pat; do
      [ -z "$pat" ] && continue
      if echo "$sample" | grep -qF "$pat"; then
        matched=true
        break
      fi
    done <<< "$patterns"

    if [ "$matched" = true ]; then
      echo -e "    ${GREEN}✅${NC} \"${sample:0:60}\""
      pass=$((pass + 1))
    else
      echo -e "    ${RED}❌${NC} \"${sample:0:60}\""
      fail=$((fail + 1))
    fi
  done

  echo ""
  echo -e "  ${BLUE}── Negative samples (미매칭 기대) ──${NC}"
  for sample in "${negative_samples[@]}"; do
    local matched=false
    while IFS= read -r pat; do
      [ -z "$pat" ] && continue
      if echo "$sample" | grep -qF "$pat"; then
        matched=true
        break
      fi
    done <<< "$patterns"

    if [ "$matched" = false ]; then
      echo -e "    ${GREEN}✅${NC} \"${sample:0:60}\" (정상 미매칭)"
      pass=$((pass + 1))
    else
      echo -e "    ${RED}❌${NC} \"${sample:0:60}\" (오탐 — 매칭됨: ${pat})"
      fail=$((fail + 1))
    fi
  done

  echo ""
  echo -e "  결과: ${GREEN}${pass} pass${NC} / ${RED}${fail} fail${NC}"
}

# ─── Main dispatch ──────────────────────────────────────────────────────────
case "$CMD" in
  --check|"")    do_check ;;
  --learn)       do_learn ;;
  --report)      do_report ;;
  --test-patterns) do_test_patterns ;;
  *)
    echo "Usage: agent-doctor.sh [--check|--learn|--report|--test-patterns]" >&2
    exit 1
    ;;
esac
