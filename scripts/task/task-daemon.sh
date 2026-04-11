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

    # Safety guard (S257 #4): only destroy WT+branch when either
    #   (a) merge succeeded, OR (b) truly zero commits + no PR (empty task).
    # If commits exist but nothing was merged, the WT/branch are the only
    # place those commits live — removing them = silent data loss.
    local PRESERVED=false
    if [ "$MERGED" = true ] || { [ "${PR_URL:-none}" = "none" ] && [ "${COMMIT_COUNT:-0}" = "0" ]; }; then
      # WT 제거
      if [ -n "$WT_PATH" ] && [ -d "$WT_PATH" ]; then
        # Pre-evict: cache에 기록된 $PANE_ID 외에도 wtsplit/manual join/WT 탭으로
        # 같은 WT에 cwd를 둔 pane들이 있으면, --force remove가 디렉토리를 밀고
        # 해당 pane들은 cwd-deleted 좀비가 되어 tmux 3.4가 불안정해진다 (S257/S258 후속).
        # 루프에서 $WT_PATH 자체 또는 $WT_PATH/* 하위 cwd를 가진 모든 pane을 찾아
        # kill-pane으로 선행 evict한다.
        if command -v tmux >/dev/null 2>&1 && tmux list-panes -a >/dev/null 2>&1; then
          local evicted_panes=""
          while IFS=$'\t' read -r _pid _pcwd; do
            [ -z "$_pid" ] && continue
            case "$_pcwd" in
              "$WT_PATH"|"$WT_PATH"/*)
                tmux kill-pane -t "$_pid" 2>/dev/null || true
                evicted_panes="${evicted_panes}${_pid} "
                log "🧹 ${TASK_ID}: pre-evict pane ${_pid} (cwd=${_pcwd})"
                ;;
            esac
          done < <(tmux list-panes -a -F '#{pane_id}'$'\t''#{pane_current_path}' 2>/dev/null || true)
          if [ -n "$evicted_panes" ]; then
            log_event "$TASK_ID" "daemon_pre_evict" \
              "$(jq -nc --arg wt "$WT_PATH" --arg panes "${evicted_panes% }" '{wt_path:$wt, panes:$panes}')"
          fi
        fi
        (cd "$REPO_ROOT" && git worktree remove "$WT_PATH" --force 2>/dev/null) || true
      fi
      [ -n "$BRANCH" ] && (cd "$REPO_ROOT" && git branch -D "$BRANCH" 2>/dev/null) || true
    else
      log "🛡️  ${TASK_ID}: MERGED=false + commits=${COMMIT_COUNT:-0} — WT/branch 보존 (silent drop 방지)"
      PRESERVED=true
    fi

    # pane 종료 (preserved task는 pane도 살려둬서 수동 복구 가능)
    if [ "$PRESERVED" = false ] && [ -n "$PANE_ID" ] && [ "$PANE_ID" != "unknown" ]; then
      tmux kill-pane -t "$PANE_ID" 2>/dev/null || true
    fi

    # SPEC.md backlog status → DONE (PRD §3.3: merge 시 1회 갱신)
    # S257b fix: 이전에는 로컬 커밋만 하고 push 안 해서 master 분기 발생 (C14/C15 사고).
    # 이제 master-push.lock 아래에서 pull --rebase → commit → push 원자화.
    # 실패 시 HEAD^로 롤백해서 로컬 분기 상태를 만들지 않음.
    if [ "$MERGED" = true ] && [ -f "$REPO_ROOT/SPEC.md" ]; then
      if grep -q "| ${TASK_ID} |" "$REPO_ROOT/SPEC.md"; then
        (
          cd "$REPO_ROOT"
          flock -x -w 30 8 || { log "⚠️  ${TASK_ID}: SPEC DONE lock timeout"; exit 0; }
          # Sync with remote first so any concurrent merge is applied before we edit.
          if ! git pull origin master --rebase 2>/dev/null; then
            git rebase --abort 2>/dev/null || true
            log "⚠️  ${TASK_ID}: SPEC DONE rebase 실패 — 수동 정리 필요"
            exit 0
          fi
          sed -i "s/| ${TASK_ID} \\(|.*|\\) PLANNED \\(|.*\\)/| ${TASK_ID} \\1 DONE \\2/" SPEC.md 2>/dev/null || true
          if git diff --quiet SPEC.md; then
            log "📝 ${TASK_ID} SPEC backlog: 변경 없음 (이미 DONE 혹은 미등록)"
            exit 0
          fi
          git add SPEC.md
          git commit -m "chore(${TASK_ID}): mark DONE in SPEC backlog" >/dev/null 2>&1
          if git push origin master 2>/dev/null; then
            log "📝 ${TASK_ID} SPEC backlog → DONE (pushed)"
          else
            log "⚠️  ${TASK_ID} SPEC DONE push 실패 — 로컬 커밋 롤백 (silent drop 방지)"
            git reset --hard HEAD^ 2>/dev/null || true
          fi
        ) 8>"$FX_LOCK_DIR/master-push.lock"
      fi
    fi

    # cache + cleanup
    local FINAL_STATUS="merged"
    if [ "$PRESERVED" = true ]; then
      FINAL_STATUS="needs_manual_review"
    elif [ "$MERGED" = false ]; then
      FINAL_STATUS="done_pending_merge"
    fi
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

  # working tree 활동 측정 (FX-REQ-517 / C23):
  # task-start.sh가 만든 meta init 커밋과 hook이 갱신하는 .task-context/.task-prompt는
  # "worker 작업 흔적"이 아니므로 모두 제외한다.
  #
  #   work_commits = BASE_SHA..HEAD 중 'task context init' 메시지가 아닌 커밋 수
  #   additions    = .task-context/.task-prompt 제외한 uncommitted line additions 합
  #   work_files   = .task-context/.task-prompt 제외한 porcelain 엔트리 수 (untracked 포함)
  local base_sha=""
  [ -f "$wt/.task-context" ] && \
    base_sha=$(grep '^BASE_SHA=' "$wt/.task-context" 2>/dev/null | head -1 | cut -d= -f2- || true)

  local work_commits=0
  if [ -n "$base_sha" ]; then
    work_commits=$(cd "$wt" && git log --format='%s' "${base_sha}..HEAD" 2>/dev/null \
      | grep -cv 'task context init' || true)
  else
    # BASE_SHA 미상 — master..HEAD에서 meta init 1개를 보수적으로 차감
    local total
    total=$(cd "$wt" && git rev-list master..HEAD --count 2>/dev/null || echo 0)
    work_commits=$(( total > 0 ? total - 1 : 0 ))
  fi

  local additions
  additions=$(cd "$wt" && git diff --numstat HEAD 2>/dev/null \
    | awk '$1 != "-" && $3 != ".task-context" && $3 != ".task-prompt" {sum+=$1} END {print sum+0}')

  local work_files
  work_files=$(cd "$wt" && git status --porcelain 2>/dev/null \
    | grep -Ev '(^| )\.task-(context|prompt)$' \
    | grep -c . || true)

  : "${additions:=0}" "${work_files:=0}" "${work_commits:=0}"

  # Empty-diff guard: worker가 실제 작업 산출물을 0건 만든 경우 → retry 큐로 라우팅.
  # 기존 동작은 빈 signal을 써서 silently DONE 처리했지만, 이는 부팅 실패 / Claude
  # crash 와 구분 불가 → 사용자 인지 기회 상실 (S256 교훈). 이제 명시 승인 필요.
  if [ "$work_files" -eq 0 ] && [ "$work_commits" -eq 0 ] && [ "$additions" -eq 0 ]; then
    enqueue_retry "$tid" "$wt"
    return 0
  fi

  log "복구: ${tid} — work_commits=${work_commits} work_files=${work_files} → task-complete 실행"
  (cd "$wt" && bash "$REPO_ROOT/scripts/task/task-complete.sh") >> "$DAEMON_LOG" 2>&1 || {
    log "복구: ${tid} task-complete 실패"
    return 1
  }
}

# Worker가 파일 변경 없이 idle/dead 상태로 빠진 task를 retry queue에 등록.
# /tmp/task-retry/{project}-{task_id}.json — task-retry.sh가 사용자 승인 후 재실행.
# attempts는 호출마다 누적 (기존 파일 보존하면서 카운터만 증가).
enqueue_retry() {
  local tid="$1" wt="$2"
  local retry_dir="/tmp/task-retry"
  mkdir -p "$retry_dir"
  local retry_file="${retry_dir}/${PROJECT}-${tid}.json"

  local req_code="" track="" title="" branch="" prompt=""
  if [ -f "$wt/.task-context" ]; then
    req_code=$(grep '^REQ_ID=' "$wt/.task-context" 2>/dev/null | head -1 | cut -d= -f2- || true)
    track=$(grep '^TASK_TYPE=' "$wt/.task-context" 2>/dev/null | head -1 | cut -d= -f2- || true)
    title=$(grep '^TITLE=' "$wt/.task-context" 2>/dev/null | head -1 | cut -d= -f2- || true)
    branch=$(grep '^BRANCH=' "$wt/.task-context" 2>/dev/null | head -1 | cut -d= -f2- || true)
  fi
  [ -f "$wt/.task-prompt" ] && prompt=$(cat "$wt/.task-prompt")

  local prev_attempts=0
  if [ -f "$retry_file" ]; then
    prev_attempts=$(jq -r '.attempts // 0' "$retry_file" 2>/dev/null || echo 0)
  fi
  local attempts=$(( prev_attempts + 1 ))

  local tmp; tmp=$(mktemp)
  jq -n \
    --arg id "$tid" \
    --arg req "$req_code" \
    --arg tr "$track" \
    --arg ti "$title" \
    --arg pr "$prompt" \
    --argjson at "$attempts" \
    --arg er "worker_inactive_empty_diff" \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg w "$wt" \
    --arg br "$branch" \
    '{task_id:$id, req_code:$req, track:$tr, title:$ti, prompt:$pr,
      attempts:$at, last_error:$er, timestamp:$ts, wt_path:$w, branch:$br}' \
    > "$tmp" && mv "$tmp" "$retry_file"

  log "❗ retry:${tid} — worker inactive, no file changes detected (attempts=${attempts})"
  log_event "$tid" "phase_recover_retry_queued" \
    "$(jq -nc --argjson a "$attempts" '{attempts:$a, reason:"worker_inactive_empty_diff"}')"
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
  __debug-recover)
    # 단위 테스트 진입점 — phase_recover 직접 호출 (FX-REQ-517 / C23)
    phase_recover "${2:?task_id required}" "${3:?wt_path required}"
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
