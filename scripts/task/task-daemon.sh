#!/usr/bin/env bash
# scripts/task/task-daemon.sh — 통합 Task Daemon
#
# 모든 감시/처리/자동복구/큐실행을 하나의 루프에서 처리.
# task-start.sh가 첫 task 생성 시 자동 시작. 사람 개입 불필요.
#
# 통합 대상 (기존 개별 스크립트 → 이 하나로 대체):
#   task-monitor.sh → Phase 1: signal 처리
#   task-watch.sh   → Phase 2: pane 감시
#   agent-loop.sh   → Phase 3: 큐 → 자동 시작
#   agent-manage.sh → Phase 4: 건강 점검 + 자동 복구
#
# Usage:
#   task-daemon.sh              # foreground 실행
#   task-daemon.sh --bg         # background 데몬
#   task-daemon.sh --stop       # 데몬 중단
#   task-daemon.sh --status     # 데몬 상태 + 요약
#
# 모든 로그: /tmp/task-signals/daemon-{project}.log

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

REPO_ROOT=$(_repo_root)
PROJECT=$(basename "$REPO_ROOT" 2>/dev/null || _project_name 2>/dev/null || echo "unknown")

DAEMON_PID_FILE="/tmp/task-signals/.daemon.pid"
DAEMON_LOG="/tmp/task-signals/daemon-${PROJECT}.log"
SNAPSHOT_DIR="/tmp/task-signals/snapshots"
FAILURE_LOG="$FX_HOME/watch-failures.ndjson"
QUEUE_FILE="$FX_HOME/task-queue.ndjson"

TICK=15  # 매 15초마다 전체 사이클

mkdir -p "$SNAPSHOT_DIR" /tmp/task-signals
[ -f "$QUEUE_FILE" ] || : > "$QUEUE_FILE"
[ -f "$FAILURE_LOG" ] || : > "$FAILURE_LOG"

log() { echo "[$(date +%H:%M:%S)] $*" >> "$DAEMON_LOG"; }

# ═══════════════════════════════════════════════════════════════════════════
# Phase 1: Signal 처리 (기존 task-monitor.sh 역할)
# ═══════════════════════════════════════════════════════════════════════════
phase_signals() {
  local signals
  signals=$(ls "${FX_SIGNAL_DIR}/${PROJECT}-"*.signal 2>/dev/null || true)
  [ -z "$signals" ] && return 0

  for sig_file in $signals; do
    local TASK_ID="" STATUS="" BRANCH="" PR_URL="" COMMIT_COUNT="" WT_PATH="" PANE_ID="" TIMESTAMP=""
    source "$sig_file"

    [ "$STATUS" = "DONE" ] || continue
    [ -n "$TASK_ID" ] || continue

    log "📡 signal: ${TASK_ID}"

    # PR merge
    local MERGED=false
    if [ -n "$PR_URL" ] && [ "$PR_URL" != "none" ] && command -v gh >/dev/null 2>&1; then
      local PR_NUM
      PR_NUM=$(echo "$PR_URL" | grep -oE '[0-9]+$' || true)
      if [ -n "$PR_NUM" ]; then
        local PR_STATE
        PR_STATE=$(gh pr view "$PR_NUM" --repo "KTDS-AXBD/Foundry-X" --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")
        if [ "$PR_STATE" = "OPEN" ]; then
          if gh pr merge "$PR_NUM" --repo "KTDS-AXBD/Foundry-X" --squash --delete-branch 2>/dev/null; then
            MERGED=true
            log "✅ PR #${PR_NUM} merged"
          else
            log "⚠️  PR #${PR_NUM} merge 실패"
          fi
        elif [ "$PR_STATE" = "MERGED" ]; then
          MERGED=true
        fi
      fi
    elif [ "$PR_URL" = "none" ] && [ "${COMMIT_COUNT:-0}" = "0" ]; then
      MERGED=true
    fi

    # master pull
    if [ "$MERGED" = true ]; then
      (cd "$REPO_ROOT" && git pull origin master --ff-only 2>/dev/null) || true
    fi

    # WT 제거
    if [ -n "$WT_PATH" ] && [ -d "$WT_PATH" ]; then
      (cd "$REPO_ROOT" && git worktree remove "$WT_PATH" --force 2>/dev/null) || true
    fi
    [ -n "$BRANCH" ] && (cd "$REPO_ROOT" && git branch -D "$BRANCH" 2>/dev/null) || true

    # pane 종료
    if [ -n "$PANE_ID" ] && [ "$PANE_ID" != "unknown" ]; then
      tmux kill-pane -t "$PANE_ID" 2>/dev/null || true
    fi

    # SPEC.md backlog status → DONE (PRD §3.3: merge 시 1회 갱신)
    if [ "$MERGED" = true ] && [ -f "$REPO_ROOT/SPEC.md" ]; then
      if grep -q "| ${TASK_ID} |" "$REPO_ROOT/SPEC.md"; then
        sed -i "s/| ${TASK_ID} \\(|.*|\\) PLANNED \\(|.*\\)/| ${TASK_ID} \\1 DONE \\2/" "$REPO_ROOT/SPEC.md" 2>/dev/null || true
        (cd "$REPO_ROOT" && git add SPEC.md && git commit -m "chore(${TASK_ID}): mark DONE in SPEC backlog" >/dev/null 2>&1) || true
        log "📝 ${TASK_ID} SPEC backlog → DONE"
      fi
    fi

    # cache + cleanup
    local FINAL_STATUS="merged"
    [ "$MERGED" = false ] && FINAL_STATUS="done_pending_merge"
    cache_upsert_task "$TASK_ID" "$FINAL_STATUS" "" "" "" "$BRANCH" "${PR_URL:-}"
    log_event "$TASK_ID" "daemon_processed" "$(jq -nc --arg s "$FINAL_STATUS" '{status:$s}')"
    rm -f "$sig_file"
    log "✅ ${TASK_ID} → ${FINAL_STATUS}"
  done
}

# ═══════════════════════════════════════════════════════════════════════════
# Phase 2: Pane 감시 (기존 task-watch.sh 역할)
# ═══════════════════════════════════════════════════════════════════════════

# 완료 패턴 — Claude Code 출력에서 "작업 끝남" 신호
DONE_PATTERNS=(
  "Cooked for"
  "Baked for"
  "Brewed for"
  "Befuddling"
  "task-complete"
  "작업 완료"
  "수고하셨어요"
  "다른 작업 없"
  "작업 진행하면 돼"
  "완료했어요"
  "마무리했어요"
  "끝났어요"
  "모두 처리"
)

# 권한 프롬프트
PERM_PATTERNS=(
  "Do you want to make this edit"
  "Do you want to run this command"
  "Do you want to create this file"
  "Allow Claude to"
)

# 에러 패턴
ERROR_PATTERNS=(
  "Error:"
  "FAILED"
  "exit code [1-9]"
  "Permission denied"
  "Module not found"
)

phase_watch() {
  local active_tasks
  active_tasks=$(jq -r '.tasks | to_entries[] | select(.value.status=="in_progress") | "\(.key)|\(.value.pane)|\(.value.wt)"' "$FX_CACHE" 2>/dev/null || true)
  [ -z "$active_tasks" ] && return 0

  while IFS='|' read -r task_id pane_id wt_path; do
    [ -z "$task_id" ] || [ -z "$pane_id" ] && continue

    # pane 존재 확인
    if ! tmux list-panes -a -F '#{pane_id}' 2>/dev/null | grep -q "^${pane_id}$"; then
      # pane 죽었지만 signal 없음 → 실패 기록 + 자동 복구 시도
      if [ ! -f "${FX_SIGNAL_DIR}/${PROJECT}-${task_id}.signal" ]; then
        log "💀 ${task_id}: pane ${pane_id} 소멸 — 복구 시도"
        phase_recover "$task_id" "$wt_path"
      fi
      continue
    fi

    # pane 내용 캡처
    local content
    content=$(tmux capture-pane -t "$pane_id" -p -S -40 2>/dev/null) || continue

    # ANSI escape 제거 (프롬프트 매칭 정확도 향상)
    local clean_content
    clean_content=$(echo "$content" | sed 's/\x1b\[[0-9;]*m//g' 2>/dev/null || echo "$content")

    local snapshot_file="${SNAPSHOT_DIR}/${task_id}.snapshot"
    local content_hash
    content_hash=$(echo "$clean_content" | md5sum | cut -d' ' -f1)
    local prev_hash=""
    [ -f "$snapshot_file" ] && prev_hash=$(head -1 "$snapshot_file")

    # ── 2a. 권한 프롬프트 자동 승인 ──
    for pattern in "${PERM_PATTERNS[@]}"; do
      if echo "$clean_content" | grep -q "$pattern"; then
        log "🔓 ${task_id}: 권한 자동승인"
        tmux send-keys -t "$pane_id" "2" 2>/dev/null
        sleep 0.3
        tmux send-keys -t "$pane_id" Enter 2>/dev/null
        sleep 1
        break
      fi
    done

    # ── 2b. 에러 감지 ──
    for pattern in "${ERROR_PATTERNS[@]}"; do
      if echo "$clean_content" | tail -5 | grep -qE "$pattern"; then
        log "⚠️  ${task_id}: 에러 — $(echo "$clean_content" | tail -5 | grep -E "$pattern" | head -1 | tr -d '\n' | cut -c1-80)"
        break
      fi
    done

    # ── 2c. 완료 감지 ──
    local looks_done=false
    local matched_pattern=""
    for pattern in "${DONE_PATTERNS[@]}"; do
      if echo "$clean_content" | grep -q "$pattern"; then
        looks_done=true
        matched_pattern="$pattern"
        break
      fi
    done

    # 프롬프트 idle 판정 (ANSI 제거 후 ❯ 또는 $ 또는 빈 프롬프트)
    local prompt_idle=false
    if echo "$clean_content" | tail -5 | grep -qE '^[❯\$>] *$|^❯$'; then
      prompt_idle=true
    fi

    if [ "$looks_done" = true ] && [ "$prompt_idle" = true ]; then
      if [ ! -f "${FX_SIGNAL_DIR}/${PROJECT}-${task_id}.signal" ]; then
        log "✅ ${task_id}: 완료 감지 (${matched_pattern}) → task-complete 실행"
        tmux send-keys -t "$pane_id" "bash scripts/task/task-complete.sh" Enter 2>/dev/null
      fi
    fi

    # ── 2d. Idle/stuck 감지 ──
    if [ "$content_hash" = "$prev_hash" ]; then
      local last_change
      last_change=$(stat -c %Y "$snapshot_file" 2>/dev/null || echo "0")
      local now; now=$(date +%s)
      local idle_secs=$(( now - last_change ))

      if [ "$idle_secs" -gt 600 ] && [ "$prompt_idle" = true ]; then
        # 10분 이상 idle + 프롬프트 대기 → 완료 패턴 미매칭된 완료 가능성
        log "💤 ${task_id}: ${idle_secs}초 idle — 미감지 완료 가능성, task-complete 시도"
        if [ ! -f "${FX_SIGNAL_DIR}/${PROJECT}-${task_id}.signal" ]; then
          tmux send-keys -t "$pane_id" "bash scripts/task/task-complete.sh" Enter 2>/dev/null
          # 실패 학습 기록
          jq -nc --arg id "$task_id" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --arg reason "idle_10min_undetected" \
            --arg last_output "$(echo "$clean_content" | tail -3 | tr '\n' ' ' | cut -c1-200)" \
            '{task_id:$id, ts:$ts, reason:$reason, last_output:$last_output}' >> "$FAILURE_LOG"
        fi
      elif [ "$idle_secs" -gt 300 ] && [ "$prompt_idle" = true ]; then
        log "💤 ${task_id}: ${idle_secs}초 idle (프롬프트 대기)"
      fi
    else
      # 변화 있음 → 스냅샷 갱신
      echo "$content_hash" > "$snapshot_file"
    fi
  done <<< "$active_tasks"
}

# ═══════════════════════════════════════════════════════════════════════════
# Phase 3: 큐 → 자동 시작 (기존 agent-loop.sh 역할)
# ═══════════════════════════════════════════════════════════════════════════
phase_queue() {
  local wip; wip=$(wip_count)
  [ "$wip" -ge "$WIP_CAP" ] && return 0

  local pending
  pending=$(grep '"status":"pending"' "$QUEUE_FILE" 2>/dev/null || true)
  [ -z "$pending" ] && return 0

  # 가장 높은 우선순위 항목 선택
  local next
  next=$(echo "$pending" | jq -s 'sort_by(.priority, .added_at) | .[0]' 2>/dev/null)
  [ -z "$next" ] || [ "$next" = "null" ] && return 0

  local track title prompt
  track=$(echo "$next" | jq -r '.track')
  title=$(echo "$next" | jq -r '.title')
  prompt=$(echo "$next" | jq -r '.prompt // ""')

  # master + clean 확인
  local cur_branch
  cur_branch=$(cd "$REPO_ROOT" && git branch --show-current 2>/dev/null)
  [ "$cur_branch" != "master" ] && { log "큐: master 아님 — 스킵"; return 0; }

  if [ -n "$(cd "$REPO_ROOT" && git status --porcelain 2>/dev/null)" ]; then
    log "큐: dirty tree — 스킵"
    return 0
  fi

  # pull + start
  (cd "$REPO_ROOT" && git pull origin master --ff-only 2>/dev/null) || true

  log "큐→시작: [${track}] ${title}"

  # 큐 아이템 상태 갱신
  local tmp; tmp=$(mktemp)
  local found=false
  while IFS= read -r line; do
    if [ "$found" = false ] && echo "$line" | jq -e --arg t "$title" 'select(.title==$t and .status=="pending")' >/dev/null 2>&1; then
      echo "$line" | jq -c '.status="started"' >> "$tmp"
      found=true
    else
      echo "$line" >> "$tmp"
    fi
  done < "$QUEUE_FILE"
  mv "$tmp" "$QUEUE_FILE"

  if (cd "$REPO_ROOT" && bash scripts/task/task-start.sh "$track" "$title" "$prompt") >> "$DAEMON_LOG" 2>&1; then
    log "✅ 큐 task 시작 성공"
  else
    log "❌ 큐 task 시작 실패"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Phase 4: 자동 복구
# ═══════════════════════════════════════════════════════════════════════════
phase_recover() {
  local tid="$1" wt="$2"

  [ -d "$wt" ] || { log "복구: ${tid} WT 없음 — 포기"; return 1; }

  # 미커밋 변경이 있으면 WT에서 task-complete 실행
  local dirty
  dirty=$(cd "$wt" && git status --porcelain 2>/dev/null | head -1 || true)
  local commits
  commits=$(cd "$wt" && git rev-list master..HEAD --count 2>/dev/null || echo 0)

  if [ -n "$dirty" ] || [ "$commits" -gt 0 ]; then
    log "복구: ${tid} — 변경 ${commits} commits + dirty=${dirty:+yes} → task-complete 실행"
    (cd "$wt" && bash "$REPO_ROOT/scripts/task/task-complete.sh") >> "$DAEMON_LOG" 2>&1 || {
      log "복구: ${tid} task-complete 실패"
      return 1
    }
  else
    # 변경 없으면 빈 signal 생성
    log "복구: ${tid} — 변경 없음 → 빈 signal 생성"
    write_signal "$tid" "DONE" \
      "BRANCH=$(jq -r --arg id "$tid" '.tasks[$id].branch // ""' "$FX_CACHE")" \
      "PR_URL=none" "COMMIT_COUNT=0" "WT_PATH=$wt" "PANE_ID=unknown"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Phase 5: 자가 학습 (실패 로그 → 패턴 보완 제안)
# ═══════════════════════════════════════════════════════════════════════════
phase_learn() {
  # 매 100 tick (= ~25분)마다 실행
  [ -f "$FAILURE_LOG" ] || return 0
  local count
  count=$(wc -l < "$FAILURE_LOG" 2>/dev/null || echo 0)
  [ "$count" -gt 0 ] || return 0

  # 최근 실패에서 반복되는 output 패턴 추출
  local new_patterns
  new_patterns=$(jq -r '.last_output' "$FAILURE_LOG" 2>/dev/null \
    | grep -oE '[가-힣a-zA-Z]{2,}(해요|했어요|했습니다|돼요|됐어요|이에요|할게요|완료|finished|done|complete)' \
    | sort | uniq -c | sort -rn | head -3 \
    | awk '{print $2}')

  if [ -n "$new_patterns" ]; then
    log "학습: 새 완료 패턴 후보 발견 — $new_patterns"
    # daemon 로그에만 기록 (자동 수정은 위험 → 로그 기반 수동 반영)
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Main loop
# ═══════════════════════════════════════════════════════════════════════════
run_daemon() {
  log "═══ task-daemon 시작 — project=${PROJECT}, tick=${TICK}s ═══"
  local tick_count=0

  while true; do
    phase_signals    # signal 감지 → merge → cleanup
    phase_watch      # pane 감시 → 권한승인 / 완료감지 / idle 감지
    phase_queue      # 큐 여유 → 자동 task 시작

    tick_count=$((tick_count + 1))

    # 매 100 tick (~25분)마다 학습 + 로그 정리
    if [ $((tick_count % 100)) -eq 0 ]; then
      phase_learn
      # 로그 크기 제한 (100KB 이상이면 tail 유지)
      if [ -f "$DAEMON_LOG" ] && [ "$(stat -c%s "$DAEMON_LOG" 2>/dev/null || echo 0)" -gt 102400 ]; then
        tail -500 "$DAEMON_LOG" > "${DAEMON_LOG}.tmp" && mv "${DAEMON_LOG}.tmp" "$DAEMON_LOG"
      fi
    fi

    sleep "$TICK"
  done
}

# ═══════════════════════════════════════════════════════════════════════════
# Status
# ═══════════════════════════════════════════════════════════════════════════
show_status() {
  echo ""
  if [ -f "$DAEMON_PID_FILE" ] && kill -0 "$(cat "$DAEMON_PID_FILE")" 2>/dev/null; then
    echo "  task-daemon: ✅ running (PID $(cat "$DAEMON_PID_FILE"))"
  else
    echo "  task-daemon: ❌ stopped"
  fi

  local wip; wip=$(wip_count)
  local total; total=$(jq -r '.tasks | length' "$FX_CACHE" 2>/dev/null || echo 0)
  local merged; merged=$(jq -r '[.tasks[] | select(.status=="merged")] | length' "$FX_CACHE" 2>/dev/null || echo 0)
  local queue_count
  queue_count=$(grep -c '"status":"pending"' "$QUEUE_FILE" 2>/dev/null || echo "0")
  local fail_count
  fail_count=$(wc -l < "$FAILURE_LOG" 2>/dev/null | tr -d ' ' || echo "0")

  echo "  WIP: ${wip}/${WIP_CAP}  |  Total: ${total}  |  Merged: ${merged}  |  Queue: ${queue_count}  |  Failures: ${fail_count}"

  # Active tasks
  local tasks
  tasks=$(jq -r '.tasks | to_entries[] | select(.value.status=="in_progress") | "\(.key)|\(.value.pane)|\(.value.branch)"' "$FX_CACHE" 2>/dev/null || true)
  if [ -n "$tasks" ]; then
    echo ""
    echo "  활성 task:"
    while IFS='|' read -r tid pane branch; do
      local pane_alive="dead"
      tmux list-panes -a -F '#{pane_id}' 2>/dev/null | grep -q "^${pane}$" && pane_alive="alive"
      echo "    ${tid}  pane=${pane}(${pane_alive})  branch=$(echo "$branch" | sed 's|task/||' | cut -c1-30)"
    done <<< "$tasks"
  fi

  # Recent log
  if [ -f "$DAEMON_LOG" ]; then
    echo ""
    echo "  최근 로그:"
    tail -5 "$DAEMON_LOG" | sed 's/^/    /'
  fi
  echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# CLI dispatch
# ═══════════════════════════════════════════════════════════════════════════
case "${1:-}" in
  --bg)
    # 기존 데몬 종료
    if [ -f "$DAEMON_PID_FILE" ] && kill -0 "$(cat "$DAEMON_PID_FILE")" 2>/dev/null; then
      kill "$(cat "$DAEMON_PID_FILE")" 2>/dev/null || true
      sleep 1
    fi
    mkdir -p /tmp/task-signals
    nohup bash "$0" > /dev/null 2>&1 &
    echo $! > "$DAEMON_PID_FILE"
    disown
    echo "[task-daemon] ✅ 시작 (PID $!, log: $DAEMON_LOG)"
    ;;
  --stop)
    if [ -f "$DAEMON_PID_FILE" ] && kill -0 "$(cat "$DAEMON_PID_FILE")" 2>/dev/null; then
      kill "$(cat "$DAEMON_PID_FILE")"
      rm -f "$DAEMON_PID_FILE"
      echo "[task-daemon] 중단 완료"
    else
      echo "[task-daemon] 실행 중 아님"
    fi
    ;;
  --status)
    show_status
    ;;
  --enqueue)
    # 편의 기능: 큐 추가
    EQ_TRACK="${2:?track required}"
    EQ_TITLE="${3:?title required}"
    EQ_PROMPT="${4:-}"
    EQ_PRI="${5:-5}"
    jq -nc --arg track "$EQ_TRACK" --arg title "$EQ_TITLE" --arg prompt "$EQ_PROMPT" \
      --argjson pri "$EQ_PRI" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{track:$track, title:$title, prompt:$prompt, priority:$pri, added_at:$ts, status:"pending"}' \
      >> "$QUEUE_FILE"
    echo "[task-daemon] 큐 추가: [${EQ_TRACK}] ${EQ_TITLE}"
    ;;
  "")
    # foreground 실행
    run_daemon
    ;;
  *)
    echo "Usage: task-daemon.sh [--bg|--stop|--status|--enqueue <T> <title> [prompt] [pri]]" >&2
    exit 1
    ;;
esac
