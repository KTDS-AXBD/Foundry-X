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

DAEMON_PID_FILE="$FX_HOME/daemon.pid"        # /tmp 대신 ~/.foundry-x — 재부팅 후에도 경로 유지
DAEMON_HEARTBEAT="$FX_HOME/daemon-heartbeat" # 세션 시작 시 stale 감지용
DAEMON_LOG="/tmp/task-signals/daemon-${PROJECT}.log"
SNAPSHOT_DIR="/tmp/task-signals/snapshots"
FAILURE_LOG="$FX_HOME/watch-failures.ndjson"
QUEUE_FILE="$FX_HOME/task-queue.ndjson"

# Sprint signal 통합 — sprint-merge-monitor.sh가 담당하던 경로를 daemon에 통합 (C42)
SPRINT_SIGNAL_DIR="${SPRINT_SIGNAL_DIR:-/tmp/sprint-signals}"
SPRINT_CI_TIMEOUT="${SPRINT_CI_TIMEOUT:-300}"
SPRINT_MAX_RETRY=3
mkdir -p "$SPRINT_SIGNAL_DIR"

TICK=15  # 매 15초마다 전체 사이클

mkdir -p "$FX_HOME" "$SNAPSHOT_DIR" /tmp/task-signals
[ -f "$QUEUE_FILE" ] || : > "$QUEUE_FILE"
[ -f "$FAILURE_LOG" ] || : > "$FAILURE_LOG"

log() { echo "[$(date +%H:%M:%S)] $*" >> "$DAEMON_LOG"; }

# ═══════════════════════════════════════════════════════════════════════════
# Phase 1: Signal 처리 (기존 task-monitor.sh 역할)
# ═══════════════════════════════════════════════════════════════════════════
phase_signals() {
  local sig_file
  for sig_file in "${FX_SIGNAL_DIR}/${PROJECT}-"*.signal; do
    [ -f "$sig_file" ] || continue
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

    # B-fix (C61): PR_URL=none + commits 있음 → branch 기반 PR API 재조회
    # squash merge는 `git branch --merged` 에 안 잡히므로 PR API가 권위 소스.
    # 재현 사례: C55 — gh pr create 실패로 signal에 PR_URL=none이 기록됐으나
    # 실제 PR은 세션 재기동 9시간 전에 squash merged 완료 상태였음.
    if [ "$MERGED" = false ] && [ "${COMMIT_COUNT:-0}" -gt 0 ] && \
       [ "${PR_URL:-none}" = "none" ] && [ -n "$BRANCH" ] && \
       command -v gh >/dev/null 2>&1; then
      local BRANCH_PR_STATE
      BRANCH_PR_STATE=$(gh pr view "$BRANCH" --repo "KTDS-AXBD/Foundry-X" \
        --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")
      if [ "$BRANCH_PR_STATE" = "MERGED" ]; then
        log "🔍 ${TASK_ID}: PR_URL=none + COMMIT_COUNT=${COMMIT_COUNT} — branch ${BRANCH} API 재조회 → MERGED (C61)"
        MERGED=true
      fi
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
        # Pre-evict: wtsplit/manual join/WT 탭으로 같은 WT에 cwd를 둔 "extras"
        # pane들을 --force remove 전에 선행 kill한다. 그대로 두면 cwd-deleted
        # 좀비가 되어 tmux 3.4가 불안정해진다 (S257/S258 후속).
        #
        # C29/S261: primary $PANE_ID는 이 스윕에서 제외한다. primary는 line 127
        # 일반 cleanup에서 처리되며, 여기서는 "예기치 않은 extra pane"만 evict
        # 한다. 이 구분이 있어야 `daemon_pre_evict` 이벤트 0건이 healthy
        # baseline이 된다 — 이전에는 primary가 항상 스윕에 걸려 매 cleanup마다
        # ≥1건이라 "0건 유지" 회귀 감시 메트릭이 무력했음 (S260 MEMORY 참조).
        if command -v tmux >/dev/null 2>&1 && tmux list-panes -a >/dev/null 2>&1; then
          local evicted_panes=""
          local extras_count=0
          while IFS=$'\t' read -r _pid _pcwd; do
            [ -z "$_pid" ] && continue
            # primary pane은 건너뛴다 — line 127-128 일반 cleanup에서 처리
            if [ -n "${PANE_ID:-}" ] && [ "$_pid" = "$PANE_ID" ]; then
              continue
            fi
            case "$_pcwd" in
              "$WT_PATH"|"$WT_PATH"/*)
                tmux kill-pane -t "$_pid" 2>/dev/null || true
                evicted_panes="${evicted_panes}${_pid} "
                extras_count=$((extras_count + 1))
                log "🧹 ${TASK_ID}: pre-evict extra pane ${_pid} (cwd=${_pcwd})"
                ;;
            esac
          done < <(tmux list-panes -a -F '#{pane_id}'$'\t''#{pane_current_path}' 2>/dev/null || true)
          if [ "$extras_count" -gt 0 ]; then
            log_event "$TASK_ID" "daemon_pre_evict" \
              "$(jq -nc --arg wt "$WT_PATH" --arg panes "${evicted_panes% }" \
                        --arg primary "${PANE_ID:-}" --argjson extras "$extras_count" \
                        '{wt_path:$wt, primary_pane:$primary, extras_count:$extras, panes:$panes}')"
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
    # Preserve track from existing cache entry — daemon updates don't know the track
    # and passing "" caused IFS tab-collapse field shift in task-list.sh (C62).
    local existing_track
    existing_track=$(jq -r --arg id "$TASK_ID" '.tasks[$id].track // ""' "$FX_CACHE" 2>/dev/null || echo "")
    cache_upsert_task "$TASK_ID" "$FINAL_STATUS" "$existing_track" "" "" "$BRANCH" "${PR_URL:-}"
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
# Phase 5a: Merged PR 스캔 (signal 2차 경로)
# gh pr list --state merged로 미처리 task PR을 감지 → 합성 signal 생성
# 호출 주기: 4 tick (~60초)
# ═══════════════════════════════════════════════════════════════════════════
phase_merged_prs() {
  command -v gh >/dev/null 2>&1 || return 0

  local merged_prs
  merged_prs=$(gh pr list \
    --repo "KTDS-AXBD/Foundry-X" \
    --state merged \
    --limit 30 \
    --json number,headRefName 2>/dev/null) || return 0

  echo "$merged_prs" \
    | jq -r '.[] | select(.headRefName | startswith("task/")) | "\(.number)|\(.headRefName)"' 2>/dev/null \
    | while IFS='|' read -r pr_num branch; do
        # branch task/C39-slug → C39
        local task_id
        task_id=$(echo "$branch" | sed 's|task/||' | grep -oE '^[A-Z][0-9]+' || true)
        [ -n "$task_id" ] || continue

        local status
        status=$(jq -r --arg id "$task_id" '.tasks[$id].status // "unknown"' "$FX_CACHE" 2>/dev/null)
        [ "$status" = "in_progress" ] || continue

        local sig_file="${FX_SIGNAL_DIR}/${PROJECT}-${task_id}.signal"
        [ -f "$sig_file" ] && continue

        log "🔍 merged PR #${pr_num} (branch=${branch}) — ${task_id} 미처리 감지"
        local wt_path pane_id task_branch
        wt_path=$(jq -r --arg id "$task_id" '.tasks[$id].wt // ""' "$FX_CACHE" 2>/dev/null)
        pane_id=$(jq -r --arg id "$task_id" '.tasks[$id].pane // ""' "$FX_CACHE" 2>/dev/null)
        task_branch=$(jq -r --arg id "$task_id" '.tasks[$id].branch // ""' "$FX_CACHE" 2>/dev/null)

        # write_signal은 _project_name()으로 프로젝트명을 결정하는데,
        # daemon은 nohup 백그라운드라 cwd가 달라 "."을 반환할 수 있음.
        # daemon의 $PROJECT 변수를 직접 사용하여 signal 파일 작성.
        # A-fix (C61): timestamp를 heredoc 밖에서 pre-compute — pipe subshell 내부의
        # $() heredoc 치환이 리터럴로 저장되는 엣지 케이스 방어.
        local _sig="${FX_SIGNAL_DIR}/${PROJECT}-${task_id}.signal"
        local _ts; _ts="$(date -Iseconds)"
        cat > "$_sig" <<SIGEOF
TASK_ID=$task_id
STATUS=DONE
TIMESTAMP=$_ts
PROJECT=$PROJECT
BRANCH=${task_branch:-$branch}
PR_URL=https://github.com/KTDS-AXBD/Foundry-X/pull/${pr_num}
COMMIT_COUNT=1
WT_PATH=${wt_path}
PANE_ID=${pane_id}
SIGEOF
        log "📡 ${task_id}: merged PR signal 합성 (PR #${pr_num})"
      done
}

# ═══════════════════════════════════════════════════════════════════════════
# Phase 5b: WT orphan 스캔 (signal 3차 경로)
# remote에서 task/ 브랜치가 사라진 로컬 WT 감지 → PR merge 확인 → 합성 signal
# 호출 주기: 4 tick (~60초), phase_merged_prs와 2 tick 오프셋
# ═══════════════════════════════════════════════════════════════════════════
phase_orphan_wts() {
  command -v gh >/dev/null 2>&1 || return 0

  local remote_refs
  remote_refs=$(cd "$REPO_ROOT" && git ls-remote --heads origin 'refs/heads/task/*' 2>/dev/null \
    | awk '{print $2}' | sed 's|refs/heads/||') || return 0

  git -C "$REPO_ROOT" worktree list --porcelain 2>/dev/null \
    | awk '/^worktree /{wt=$2} /^branch /{print wt "|" $2}' \
    | grep '|refs/heads/task/' \
    | while IFS='|' read -r wt_path ref; do
        local branch="${ref#refs/heads/}"
        printf '%s\n' "$remote_refs" | grep -qxF "$branch" && continue

        local task_id
        task_id=$(echo "$branch" | sed 's|task/||' | grep -oE '^[A-Z][0-9]+' || true)
        [ -n "$task_id" ] || continue

        local status
        status=$(jq -r --arg id "$task_id" '.tasks[$id].status // "unknown"' "$FX_CACHE" 2>/dev/null)
        [ "$status" = "in_progress" ] || continue

        local sig_file="${FX_SIGNAL_DIR}/${PROJECT}-${task_id}.signal"
        [ -f "$sig_file" ] && continue

        # remote branch 소멸 → merged PR 확인
        local pr_num
        pr_num=$(gh pr list \
          --repo "KTDS-AXBD/Foundry-X" \
          --head "$branch" \
          --state merged \
          --json number \
          --jq '.[0].number // ""' 2>/dev/null) || continue
        [ -n "$pr_num" ] || continue

        log "🔍 WT orphan: ${task_id} (remote branch 소멸 → PR #${pr_num} merged)"
        local pane_id
        pane_id=$(jq -r --arg id "$task_id" '.tasks[$id].pane // ""' "$FX_CACHE" 2>/dev/null)
        local _sig="${FX_SIGNAL_DIR}/${PROJECT}-${task_id}.signal"
        # A-fix (C61): pre-compute timestamp (pipe subshell $() heredoc 방어)
        local _ts; _ts="$(date -Iseconds)"
        cat > "$_sig" <<SIGEOF
TASK_ID=$task_id
STATUS=DONE
TIMESTAMP=$_ts
PROJECT=$PROJECT
BRANCH=${branch}
PR_URL=https://github.com/KTDS-AXBD/Foundry-X/pull/${pr_num}
COMMIT_COUNT=1
WT_PATH=${wt_path}
PANE_ID=${pane_id}
SIGEOF
        log "📡 ${task_id}: WT orphan signal 합성 (PR #${pr_num})"
      done || true  # grep no-match returns 1 — pipefail 방어 (S267)
}

# ═══════════════════════════════════════════════════════════════════════════
# Phase 5c: Sprint Signal 처리 (sprint-merge-monitor.sh 통합 — C42)
#
# /tmp/sprint-signals/ 의 *-*.signal 파일을 스캔하여 STATUS=DONE 인 Sprint를
# 자동 머지한다. sprint-merge-monitor.sh의 handle_merge 로직을 daemon 루프에 흡수.
#
# Signal 형식(sig_get/sig_set — grep 기반, source 아님):
#   STATUS=DONE | MERGING | MERGED | FAILED
#   SPRINT_NUM=N
#   PROJECT=Foundry-X
#   BRANCH=sprint/N
#   PR_NUM=123       (없으면 gh pr list로 조회)
#   GITHUB_REPO=KTDS-AXBD/Foundry-X
#   PROJECT_ROOT=/path/to/wt
#   F_ITEMS=F509,F510
#   MATCH_RATE=97
#   PANE_ID=%42      (없으면 WT cwd 기반 스윕)
#
# Pane 정리:
#   케이스 B (Master tmux pane): PANE_ID 있고 alive → kill-pane
#   케이스 A (별도 탭/cs 세션): PANE_ID 없거나 dead  → WT cwd 스윕 kill + cs reset 시도
# ═══════════════════════════════════════════════════════════════════════════

# Sprint signal에서 key=value 읽기 (source 방식 쓰지 않음)
# key 미존재 시 빈 문자열 반환 (set -e + pipefail 환경에서 assignment abort 방지)
sprint_sig_get() {
  local file="$1" key="$2"
  { grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2-; } || true
}

# Sprint signal에서 key=value 덮어쓰기
sprint_sig_set() {
  local file="$1" key="$2" val="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$file"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

# Sprint PR 자동승인 (branch protection이 approval 요구 시)
sprint_auto_approve() {
  local pr_num="$1" repo="$2"
  local required
  required=$(gh api "repos/${repo}/branches/master/protection" \
    --jq '.required_pull_request_reviews.required_approving_review_count' 2>/dev/null) || required="0"
  case "$required" in ''|*[!0-9]*) required=0 ;; esac
  if [ "$required" -gt 0 ]; then
    local approve_script="${SCRIPT_DIR}/../sprint-auto-approve.sh"
    if [ -x "$approve_script" ]; then
      bash "$approve_script" "$pr_num" "$repo" >> "$DAEMON_LOG" 2>&1 || true
    else
      gh pr review "$pr_num" --repo "$repo" --approve \
        --body "Auto-approved by task-daemon (C42 unified)" >> "$DAEMON_LOG" 2>&1 || true
    fi
  fi
}

# Sprint CI 대기 (타임아웃 포함)
sprint_wait_ci() {
  local pr_num="$1" repo="$2"
  timeout --foreground --kill-after=10s "${SPRINT_CI_TIMEOUT}s" \
    gh pr checks "$pr_num" --repo "$repo" --watch --fail-fast >> "$DAEMON_LOG" 2>&1
}

# C64 hotfix: PR 현재 state 조회 (MERGED/OPEN/CLOSED)
# gh 실패 시 UNKNOWN 반환 → 호출자가 OPEN과 동일하게 취급
sprint_pr_state() {
  local pr_num="$1" repo="$2"
  local state
  state=$(gh pr view "$pr_num" --repo "$repo" --json state --jq '.state' 2>/dev/null) || state=""
  [ -z "$state" ] && state="UNKNOWN"
  echo "$state"
}

# Sprint 완료 후 pane/탭 정리 (케이스 A + B 양쪽 처리)
#   케이스 B: PANE_ID 있고 alive → kill-pane 직접
#   케이스 A: PANE_ID 없거나 dead → WT cwd 스윕 + cs reset 시도
sprint_cleanup_pane() {
  local sprint_num="$1" wt_path="$2" pane_id="$3"
  command -v tmux >/dev/null 2>&1 || return 0

  # (deleted) 상태 pane 일괄 정리 (cwd가 존재하지 않는 pane)
  while IFS=$'\t' read -r _pid _pcwd; do
    [ -z "$_pid" ] && continue
    if [ ! -e "$_pcwd" ]; then
      tmux kill-pane -t "$_pid" 2>/dev/null || true
      log "🧹 sprint-${sprint_num}: deleted-cwd pane 정리 ${_pid} (cwd=${_pcwd})"
    fi
  done < <(tmux list-panes -a -F '#{pane_id}'$'\t''#{pane_current_path}' 2>/dev/null || true)

  # 케이스 B: PANE_ID 있고 alive
  if [ -n "$pane_id" ] && tmux list-panes -a -F '#{pane_id}' 2>/dev/null | grep -q "^${pane_id}$"; then
    tmux kill-pane -t "$pane_id" 2>/dev/null || true
    log "🧹 sprint-${sprint_num}: pane ${pane_id} kill (케이스 B)"
    return
  fi

  # 케이스 A: WT cwd 기반 스윕 (PANE_ID 없거나 dead, 별도 탭/cs 세션)
  if [ -n "$wt_path" ]; then
    local swept=0
    while IFS=$'\t' read -r _pid _pcwd; do
      [ -z "$_pid" ] && continue
      case "$_pcwd" in
        "$wt_path"|"$wt_path"/*)
          tmux kill-pane -t "$_pid" 2>/dev/null || true
          log "🧹 sprint-${sprint_num}: WT cwd 스윕 pane ${_pid} kill (케이스 A)"
          swept=$((swept + 1))
          ;;
      esac
    done < <(tmux list-panes -a -F '#{pane_id}'$'\t''#{pane_current_path}' 2>/dev/null || true)

    # cs(Claude Squad) 세션 정리 — cs reset은 HOME 정합성 필요
    if command -v cs >/dev/null 2>&1; then
      HOME=/home/sinclair cs reset 2>/dev/null || true
      log "🧹 sprint-${sprint_num}: cs reset 실행 (케이스 A 정리)"
    fi

    if [ "$swept" -eq 0 ]; then
      log "ℹ️  sprint-${sprint_num}: 정리할 pane 없음 (이미 닫힘 또는 별도 Terminal 탭)"
    fi
  fi
}

phase_sprint_signals() {
  local _prev_nullglob=false
  shopt -q nullglob && _prev_nullglob=true
  shopt -s nullglob
  local sig
  for sig in "$SPRINT_SIGNAL_DIR"/*-*.signal; do
    [ -f "$sig" ] || continue
    local status
    status=$(sprint_sig_get "$sig" "STATUS")
    [ "$status" = "DONE" ] || continue

    local sprint_num project branch pr_num repo wt_path f_items match_rate pane_id
    sprint_num=$(sprint_sig_get "$sig" "SPRINT_NUM")
    project=$(sprint_sig_get "$sig" "PROJECT")
    branch=$(sprint_sig_get "$sig" "BRANCH")
    pr_num=$(sprint_sig_get "$sig" "PR_NUM")
    repo=$(sprint_sig_get "$sig" "GITHUB_REPO")
    wt_path=$(sprint_sig_get "$sig" "PROJECT_ROOT")
    f_items=$(sprint_sig_get "$sig" "F_ITEMS")
    match_rate=$(sprint_sig_get "$sig" "MATCH_RATE")
    pane_id=$(sprint_sig_get "$sig" "PANE_ID")

    [ -z "$sprint_num" ] && { log "⚠️  sprint signal skip — SPRINT_NUM 없음: $sig"; continue; }
    [ -z "$repo" ] && { log "⚠️  sprint-${sprint_num} skip — GITHUB_REPO 없음"; continue; }

    sprint_sig_set "$sig" "STATUS" "MERGING"
    log "🚀 sprint-${sprint_num} — merge 시작 (repo=${repo} branch=${branch})"

    # 1) PR 번호 조회 (없으면 gh pr list)
    if [ -z "$pr_num" ] && [ -n "$branch" ]; then
      pr_num=$(gh pr list --repo "$repo" --head "$branch" --json number --jq '.[0].number' 2>/dev/null || true)
    fi
    if [ -z "$pr_num" ]; then
      sprint_sig_set "$sig" "STATUS" "FAILED"
      sprint_sig_set "$sig" "ERROR_STEP" "pr-lookup"
      sprint_sig_set "$sig" "ERROR_MSG" "no PR found for ${branch}"
      log "❌ sprint-${sprint_num} — FAIL: PR 없음"
      continue
    fi
    sprint_sig_set "$sig" "PR_NUM" "$pr_num"

    # 2) PR state 선체크 (C64 hotfix) — autopilot이 --auto --squash로 이미 merge한 케이스 감지
    local pr_state
    pr_state=$(sprint_pr_state "$pr_num" "$repo")
    local merged=0
    if [ "$pr_state" = "MERGED" ]; then
      log "ℹ️  sprint-${sprint_num} — PR #${pr_num} already MERGED (auto-merge 감지), skip CI wait + merge"
      merged=1
    else
      # 3) 자동승인 (branch protection 있을 때)
      sprint_auto_approve "$pr_num" "$repo"

      # 4) CI 대기
      if ! sprint_wait_ci "$pr_num" "$repo"; then
        # C64 hotfix: CI non-zero 후 PR state 재확인 (post-merge deploy.yml 초회 실패 또는 non-required check FAILURE)
        local pr_state_after
        pr_state_after=$(sprint_pr_state "$pr_num" "$repo")
        if [ "$pr_state_after" = "MERGED" ]; then
          log "ℹ️  sprint-${sprint_num} — CI non-zero but PR state=MERGED (post-merge deploy 실패 또는 non-required check), treat as merged"
          merged=1
        else
          sprint_sig_set "$sig" "STATUS" "FAILED"
          sprint_sig_set "$sig" "ERROR_STEP" "ci-checks"
          sprint_sig_set "$sig" "ERROR_MSG" "CI failed or timed out (PR state=${pr_state_after})"
          log "❌ sprint-${sprint_num} — FAIL: CI (PR state=${pr_state_after})"
          continue
        fi
      fi
    fi

    # 5) PR 본문 enrich (F_ITEMS + MATCH_RATE 있을 때) — MERGED/unmerged 모두 실행
    local enrich_script="${SCRIPT_DIR}/../board/pr-body-enrich.sh"
    if [ -f "$enrich_script" ] && [ -n "$f_items" ]; then
      bash "$enrich_script" "$pr_num" "$sprint_num" "$f_items" "${match_rate:-N/A}" \
        >> "$DAEMON_LOG" 2>&1 || log "⚠️  sprint-${sprint_num}: pr-body-enrich 실패 (non-fatal)"
    fi

    # 6) Squash merge (재시도 포함) — 이미 MERGED면 skip
    if [ "$merged" -ne 1 ]; then
      for attempt in $(seq 1 "$SPRINT_MAX_RETRY"); do
        if gh pr merge "$pr_num" --repo "$repo" --squash --delete-branch >> "$DAEMON_LOG" 2>&1; then
          merged=1; break
        fi
        log "⚠️  sprint-${sprint_num} — merge 시도 ${attempt}회 실패, backoff $((attempt*10))s"
        sleep $((attempt * 10))
      done
      if [ "$merged" -ne 1 ]; then
        sprint_sig_set "$sig" "STATUS" "FAILED"
        sprint_sig_set "$sig" "ERROR_STEP" "merge"
        sprint_sig_set "$sig" "ERROR_MSG" "squash merge failed after ${SPRINT_MAX_RETRY} attempts"
        log "❌ sprint-${sprint_num} — FAIL: merge"
        continue
      fi
    fi

    # master pull
    (cd "$REPO_ROOT" && git pull origin master --ff-only 2>/dev/null) || true

    # 5) WT 제거 + pane/탭 정리
    if [ -n "$wt_path" ] && [ -d "$wt_path" ]; then
      # pre-evict: WT cwd 기반 스윕 (remove 전에 처리)
      sprint_cleanup_pane "$sprint_num" "$wt_path" "$pane_id"
      (cd "$REPO_ROOT" && git worktree remove "$wt_path" --force 2>/dev/null) || true
    fi

    # 5b) 로컬 브랜치 삭제 (--delete-branch는 remote만 삭제)
    if [ -n "$branch" ]; then
      (cd "$REPO_ROOT" && git branch -D "$branch" 2>/dev/null) || true
    fi

    # 6) Board 동기화
    local board_script="${SCRIPT_DIR}/../board/board-on-merge.sh"
    if [ -f "$board_script" ]; then
      bash "$board_script" "$pr_num" >> "$DAEMON_LOG" 2>&1 || true
    fi

    # 6b) Velocity 기록
    local velocity_script="${SCRIPT_DIR}/../velocity/record-sprint.sh"
    if [ -f "$velocity_script" ]; then
      (cd "$(git -C "$REPO_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "$REPO_ROOT")" \
        && bash "$velocity_script" "$sprint_num") \
        >> "$DAEMON_LOG" 2>&1 || log "⚠️  sprint-${sprint_num}: velocity record 실패 (non-fatal)"
    fi

    # 6c) Phase 진행률 갱신
    local phase_script="${SCRIPT_DIR}/../epic/phase-progress.sh"
    if [ -f "$phase_script" ] && [ -n "$f_items" ]; then
      (cd "$(git -C "$REPO_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "$REPO_ROOT")" \
        && bash "$phase_script") \
        >> "$DAEMON_LOG" 2>&1 || log "⚠️  sprint-${sprint_num}: phase-progress 실패 (non-fatal)"
    fi

    # 7) Post-merge 검증 (구 sprint-merge-monitor.sh 기능 통합, C43)
    # deploy 자체는 CI/CD(deploy.yml on master push)가 자동 처리 — 여기서는 health check만
    local api_base="https://foundry-x-api.ktds-axbd.workers.dev"
    local web_base="https://fx.minu.best"
    local api_status web_status
    api_status=$(curl -s -o /dev/null -w "%{http_code}" "${api_base}/api/health" 2>/dev/null || echo "000")
    web_status=$(curl -s -o /dev/null -w "%{http_code}" "${web_base}" 2>/dev/null || echo "000")
    log "🏥 post-merge health — API:${api_status} Web:${web_status}"

    # 8) MERGED 완료 표시
    sprint_sig_set "$sig" "STATUS" "MERGED"
    sprint_sig_set "$sig" "MERGED_AT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    log "✅ sprint-${sprint_num} — MERGED PR #${pr_num}"
  done
  # nullglob 복원 — 누출 시 phase_signals의 ls glob이 빈 확장되어 cwd listing → source crash (S267)
  "$_prev_nullglob" || shopt -u nullglob
}

# ═══════════════════════════════════════════════════════════════════════════
# Phase 6: 자가 학습 (실패 로그 → 패턴 보완 제안)
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
    # heartbeat 갱신 — SessionStart가 stale 여부를 판단하는 기준
    date -u +%Y-%m-%dT%H:%M:%SZ > "$DAEMON_HEARTBEAT"

    # 각 phase는 개별 실패해도 daemon loop 전체를 죽이지 않��록 방어 (S267)
    phase_signals          || log "⚠️  phase_signals 에러"
    phase_sprint_signals   || log "⚠️  phase_sprint_signals 에러"
    phase_watch            || log "⚠️  phase_watch 에러"
    phase_queue            || log "⚠️  phase_queue 에러"

    tick_count=$((tick_count + 1))

    # 매 4 tick (~60초): 완료 감지 2차/3차 경로
    # 오프셋을 두어 같은 tick에 두 gh API 호출이 겹치지 않게 함
    if [ $((tick_count % 4)) -eq 0 ]; then
      phase_merged_prs     || log "⚠️  phase_merged_prs 에러"
    fi
    if [ $((tick_count % 4)) -eq 2 ]; then
      phase_orphan_wts     || log "⚠️  phase_orphan_wts 에러"
    fi

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
    local hb_info=""
    if [ -f "$DAEMON_HEARTBEAT" ]; then
      hb_epoch=$(date -d "$(cat "$DAEMON_HEARTBEAT")" +%s 2>/dev/null || echo 0)
      hb_age=$(( $(date +%s) - hb_epoch ))
      hb_info=" | heartbeat ${hb_age}초 전"
    fi
    echo "  task-daemon: ✅ running (PID $(cat "$DAEMON_PID_FILE")${hb_info})"
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
    # PID 살아있으면 heartbeat 확인 후 재시작 여부 결정
    if [ -f "$DAEMON_PID_FILE" ] && kill -0 "$(cat "$DAEMON_PID_FILE")" 2>/dev/null; then
      if [ -f "$DAEMON_HEARTBEAT" ]; then
        hb_epoch=$(date -d "$(cat "$DAEMON_HEARTBEAT")" +%s 2>/dev/null || echo 0)
        age_sec=$(( $(date +%s) - hb_epoch ))
        if [ "$age_sec" -lt 300 ]; then
          echo "[task-daemon] ✅ 이미 실행 중 (PID $(cat "$DAEMON_PID_FILE"), heartbeat ${age_sec}초 전)"
          exit 0
        fi
        echo "[task-daemon] ⚠️  heartbeat stale (${age_sec}초) — 재시작"
      fi
      kill "$(cat "$DAEMON_PID_FILE")" 2>/dev/null || true
      sleep 1
    fi
    mkdir -p "$FX_HOME" /tmp/task-signals
    nohup bash "$0" > /dev/null 2>&1 &
    echo $! > "$DAEMON_PID_FILE"
    disown
    echo "[task-daemon] ✅ 시작 (PID $!, log: $DAEMON_LOG)"
    ;;
  --stop)
    if [ -f "$DAEMON_PID_FILE" ] && kill -0 "$(cat "$DAEMON_PID_FILE")" 2>/dev/null; then
      kill "$(cat "$DAEMON_PID_FILE")"
      rm -f "$DAEMON_PID_FILE" "$DAEMON_HEARTBEAT"
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
  __debug-phase-signals)
    # 단위 테스트 진입점 — phase_signals 직접 호출 (C61 B-fix 검증)
    phase_signals
    ;;
  __debug-phase-sprint-signals)
    # 단위 테스트 진입점 — phase_sprint_signals 직접 호출 (C64 hotfix 검증)
    phase_sprint_signals
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
