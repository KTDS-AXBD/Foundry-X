#!/usr/bin/env bash
# scripts/task/task-start.sh — /ax:task start (S-α MVP)
#
# Usage:  task-start.sh <track> "<title>" ["<prompt>"]
#   track: F | B | C | X
#   prompt: optional — injected into WT pane Claude session (default: auto-generated)
#
# Implements PRD §4.1.1 — flock allocator + push SHA pinning + commit body
# fx-task-meta + tmux split + GitHub Issue creation.
#
# Exit 0 on success, non-zero with message on abort. State machine:
#   FAILED_SETUP — SPEC commit / push / WT create / tmux split failure
#   IN_PROGRESS (degraded) — Issue creation failure (cache pending_issue=true)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

TRACK="${1:?track required (F|B|C|X)}"
TITLE="${2:?title required}"
PROMPT="${3:-}"

case "$TRACK" in F|B|C|X) ;; *) echo "[fx-task] invalid track: $TRACK" >&2; exit 2;; esac

REPO_ROOT=$(_repo_root)
[ -n "$REPO_ROOT" ] || { echo "[fx-task] not a git repo" >&2; exit 2; }
cd "$REPO_ROOT"

assert_no_sprint_context
assert_master_clean
assert_wip_capacity

CUR_BRANCH=$(git branch --show-current)
if [ "$CUR_BRANCH" != "master" ]; then
  echo "[fx-task] master에서만 실행 가능 (현재: $CUR_BRANCH)" >&2
  exit 2
fi

# ─── Step 0: pre-compute slug + paths (fail early before any side effects) ───
SLUG=$(slugify "$TITLE")
if [ -z "$SLUG" ]; then
  echo "[fx-task] title에서 ASCII slug 추출 실패 — 영문/숫자 토큰을 1개 이상 포함시켜 주세요" >&2
  exit 2
fi

WT_BASE="${CLAUDE_WT_BASE:-$HOME/work/worktrees}"
PROJECT=$(basename "$REPO_ROOT")

# ─── Step 1: ID allocator + SPEC register (under flock) ──────────────────────
ID_LOCK="$FX_LOCK_DIR/id-allocator.lock"
PUSH_LOCK="$FX_LOCK_DIR/master-push.lock"

TASK_ID=""
PUSHED_SHA=""

(
  flock -x -w 10 9 || { echo "[fx-task] id-allocator lock timeout" >&2; exit 3; }

  TASK_ID=$(allocate_id "$TRACK")
  echo "[fx-task] 발급: $TASK_ID — $TITLE" >&2

  # Minimal SPEC.md registration: append a one-line entry to a dedicated section.
  # S-α scope: append to a fenced "Task Orchestrator Backlog" block at end of §5.
  # If the marker isn't present, create it before §6.
  STATUS_EMOJI="🔧"
  REQ_PLACEHOLDER="(FX-REQ-pending)"
  ENTRY="| ${TASK_ID} | ${TITLE} ${REQ_PLACEHOLDER} | — | ${STATUS_EMOJI} | task orchestrator |"

  if ! grep -q "<!-- fx-task-orchestrator-backlog -->" SPEC.md; then
    # Insert marker block right before "## §7 기술 스택"
    awk -v block='\n<!-- fx-task-orchestrator-backlog -->\n### Task Orchestrator Backlog (F/B/C/X)\n\n| ID | 제목 | Sprint | 상태 | 비고 |\n|----|------|--------|:----:|------|\n<!-- /fx-task-orchestrator-backlog -->\n' \
      '/^## §7 기술 스택/ && !done {print block; done=1} {print}' \
      SPEC.md > SPEC.md.tmp && mv SPEC.md.tmp SPEC.md
  fi

  # Insert entry before closing marker
  awk -v entry="$ENTRY" \
    '/<!-- \/fx-task-orchestrator-backlog -->/ && !done {print entry; done=1} {print}' \
    SPEC.md > SPEC.md.tmp && mv SPEC.md.tmp SPEC.md

  git add SPEC.md
  if ! git commit -m "chore(${TASK_ID}): register task — ${TITLE}" >/dev/null; then
    git checkout -- SPEC.md
    echo "[fx-task] SPEC commit 실패" >&2
    log_event "$TASK_ID" "failed_setup" '{"step":"spec_commit"}'
    exit 4
  fi

  # ─── Step 2: push under master-push lock ───────────────────────────────────
  (
    flock -x -w 30 8 || {
      git reset --hard HEAD^ >/dev/null
      echo "[fx-task] master-push lock timeout" >&2
      exit 5
    }
    if ! git push origin master >/dev/null 2>&1; then
      git reset --hard HEAD^ >/dev/null
      echo "[fx-task] push failed (non-fast-forward 가능성). pull --rebase 후 재시도" >&2
      log_event "$TASK_ID" "failed_setup" '{"step":"push"}'
      exit 6
    fi
    PUSHED_SHA=$(git rev-parse HEAD)
    echo "$TASK_ID|$PUSHED_SHA" > "$FX_LOCK_DIR/.last-allocation"
  ) 8>"$PUSH_LOCK"

) 9>"$ID_LOCK"

# Read back from subshell-set file
[ -f "$FX_LOCK_DIR/.last-allocation" ] || { echo "[fx-task] allocator output 누락" >&2; exit 7; }
TASK_ID=$(cut -d'|' -f1 "$FX_LOCK_DIR/.last-allocation")
PUSHED_SHA=$(cut -d'|' -f2 "$FX_LOCK_DIR/.last-allocation")
rm -f "$FX_LOCK_DIR/.last-allocation"

BRANCH="task/${TASK_ID}-${SLUG}"
WT_PATH="${WT_BASE}/${PROJECT}/${TASK_ID}-${SLUG}"

# ─── Step 3: create worktree pinned to pushed_sha ────────────────────────────
mkdir -p "$(dirname "$WT_PATH")"
if ! git worktree add -b "$BRANCH" "$WT_PATH" "$PUSHED_SHA" 2>&1; then
  # rollback master commit (force-push parent over master)
  PARENT_SHA=$(git rev-parse "${PUSHED_SHA}^")
  git push origin "+${PARENT_SHA}:master" >/dev/null 2>&1 || true
  git reset --hard "$PARENT_SHA" >/dev/null 2>&1 || true
  echo "[fx-task] worktree 생성 실패 — master 등록 revert 시도" >&2
  log_event "$TASK_ID" "failed_setup" '{"step":"worktree"}'
  exit 8
fi

# ─── Step 4: write fx-task-meta commit (authority source) ────────────────────
ISSUE_URL_PLACEHOLDER=""
META_JSON=$(jq -nc \
  --arg id "$TASK_ID" --arg t "$TRACK" --arg title "$TITLE" \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg branch "$BRANCH" --arg sha "$PUSHED_SHA" \
  '{task_id:$id, task_type:$t, title:$title, started_at:$ts, branch:$branch, base_sha:$sha, scope_files:[], scope_dirs:[]}')

(
  cd "$WT_PATH"
  cat > .task-context <<EOF
TASK_ID=$TASK_ID
TASK_TYPE=$TRACK
TITLE=$TITLE
STARTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
BRANCH=$BRANCH
WT_PATH=$WT_PATH
BASE_SHA=$PUSHED_SHA
PID=$$
LAST_HEARTBEAT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

  # ensure local gitignore (worktree branch only) hides task files
  for f in .task-context .task-prompt; do
    if [ ! -f .gitignore ] || ! grep -q "^\\${f}" .gitignore; then
      echo "$f" >> .gitignore
    fi
  done
  git add .gitignore

  git commit --allow-empty -m "$(printf 'chore(meta): %s task context init\n\n```fx-task-meta\n%s\n```' "$TASK_ID" "$META_JSON")" >/dev/null
)

# ─── Step 5: tmux split (best effort — non-fatal in S-α) ─────────────────────
PANE_ID=""
if [ -n "${TMUX:-}" ]; then
  PANE_ID=$(tmux split-window -h -P -F '#{pane_id}' -c "$WT_PATH" 2>/dev/null || echo "")
  if [ -n "$PANE_ID" ]; then
    tmux select-pane -t "$PANE_ID" -T "${TASK_ID} ${TITLE}" 2>/dev/null || true
    # bidirectional verification via user-data
    tmux set -p -t "$PANE_ID" @fx-task-id "$TASK_ID" 2>/dev/null || true
    # enable pane border labels so task ID is visible in tmux UI
    tmux set-option pane-border-status top 2>/dev/null || true
  fi
fi

# ─── Step 5b: auto-inject Claude session + prompt (background) ──────────────
if [ -n "$PANE_ID" ]; then
  # Generate default prompt if not provided
  if [ -z "$PROMPT" ]; then
    case "$TRACK" in
      F) TRACK_DESC="Feature 구현" ;;
      B) TRACK_DESC="Bug 수정" ;;
      C) TRACK_DESC="점검/Chore 작업" ;;
      X) TRACK_DESC="실험/Spike 탐색" ;;
    esac
    PROMPT="이 worktree는 task ${TASK_ID} — ${TITLE}. .task-context 파일을 읽고 ${TRACK_DESC}을 진행해줘. 작업 완료 후 반드시 bash scripts/task/task-complete.sh 를 실행해서 커밋/PR/signal 처리해줘."
  fi

  # Append completion instruction to custom prompts
  if ! echo "$PROMPT" | grep -q "task-complete.sh"; then
    PROMPT="${PROMPT} 작업 완료 후 반드시 bash scripts/task/task-complete.sh 를 실행해서 커밋/PR/signal 처리해줘."
  fi

  # Write prompt to WT for Claude to pick up
  echo "$PROMPT" > "${WT_PATH}/.task-prompt"

  # Background: start Claude session → wait for boot → rename + inject prompt
  # inject 스크립트를 별도 파일로 생성 → nohup으로 실행 (subshell 조기 종료 방지)
  RENAME_LABEL="${TASK_ID} ${TITLE}"
  INJECT_SCRIPT="/tmp/task-signals/inject-${TASK_ID}.sh"
  CCS_BIN=$(command -v ccs 2>/dev/null || echo "/home/sinclair/.local/bin/ccs")

  cat > "$INJECT_SCRIPT" << INJECT_EOF
#!/usr/bin/env bash
# Auto-inject script for ${TASK_ID}
PANE="${PANE_ID}"
MAX_WAIT=30
BOOT_CHECK_INTERVAL=2

# Step 1: ccs 실행
tmux send-keys -t "\$PANE" "${CCS_BIN}" Enter
sleep 3

# Step 2: Claude 부팅 대기 (프롬프트 '❯' 출현까지, 최대 MAX_WAIT초)
WAITED=0
while [ \$WAITED -lt \$MAX_WAIT ]; do
  SNAP=\$(tmux capture-pane -t "\$PANE" -p -S -5 2>/dev/null || true)
  if echo "\$SNAP" | grep -q '❯'; then
    break
  fi
  sleep \$BOOT_CHECK_INTERVAL
  WAITED=\$((WAITED + BOOT_CHECK_INTERVAL))
done

if [ \$WAITED -ge \$MAX_WAIT ]; then
  echo "[inject] ⚠️  ${TASK_ID}: Claude 부팅 ${MAX_WAIT}초 초과 — 수동 주입 필요" >> /tmp/task-signals/inject.log
  exit 1
fi

# Step 3: /rename
tmux send-keys -t "\$PANE" "/rename ${RENAME_LABEL}" Enter
sleep 1

# Step 4: /ax:session-start (PROMPT는 .task-prompt에서 읽기 — 길이 제한 회피)
PROMPT_TEXT=\$(cat "${WT_PATH}/.task-prompt" 2>/dev/null | tr '\n' ' ' | cut -c1-500)
tmux send-keys -t "\$PANE" "/ax:session-start \${PROMPT_TEXT}" Enter

echo "[inject] ✅ ${TASK_ID}: 주입 완료 (boot=${WAITED}s)" >> /tmp/task-signals/inject.log
rm -f "${INJECT_SCRIPT}"
INJECT_EOF

  chmod +x "$INJECT_SCRIPT"
  nohup bash "$INJECT_SCRIPT" > /dev/null 2>&1 &
  disown
fi

# ─── Step 6: GitHub Issue creation (degraded on failure) ─────────────────────
ISSUE_URL=""
if command -v gh >/dev/null 2>&1; then
  GH_TOKEN_TMP=""
  if [ -f .git/.credentials ]; then
    GH_TOKEN_TMP=$(sed 's|.*://[^:]*:\([^@]*\)@.*|\1|' .git/.credentials 2>/dev/null || true)
  fi
  if ISSUE_URL=$(GH_TOKEN="${GH_TOKEN:-$GH_TOKEN_TMP}" gh issue create \
       --repo "KTDS-AXBD/Foundry-X" \
       --title "[$TASK_ID] $TITLE" \
       --label "fx:track:$TRACK,fx:status:in_progress,fx:wip:active,fx:risk:medium" \
       --body "$(printf 'Task Orchestrator entry — auto-created by /ax:task start.\n\n- ID: %s\n- Track: %s\n- Branch: `%s`\n- Base SHA: `%s`\n- WT: `%s`\n' "$TASK_ID" "$TRACK" "$BRANCH" "$PUSHED_SHA" "$WT_PATH")" \
       2>/dev/null); then
    : # ok
  else
    echo "[fx-task] GitHub Issue 생성 실패 (degraded). doctor가 후속 처리" >&2
    ISSUE_URL=""
  fi
fi

# ─── Step 7: cache + log ─────────────────────────────────────────────────────
cache_upsert_task "$TASK_ID" "in_progress" "$TRACK" "$PANE_ID" "$WT_PATH" "$BRANCH" "$ISSUE_URL"
log_event "$TASK_ID" "started" "$(jq -nc \
  --arg track "$TRACK" --arg branch "$BRANCH" --arg wt "$WT_PATH" \
  --arg pane "$PANE_ID" --arg issue "$ISSUE_URL" --arg sha "$PUSHED_SHA" \
  '{track:$track, branch:$branch, wt:$wt, pane:$pane, issue_url:$issue, base_sha:$sha}')"

INJECT_STATUS=""
if [ -n "$PANE_ID" ]; then
  INJECT_STATUS="✅ ccs + prompt 주입 중 (8초 후 자동 시작)"
else
  INJECT_STATUS="⏭️  tmux 없음 — 수동 시작 필요"
fi

# ─── Step 8: auto-start task-daemon (통합 데몬 — 감시+처리+큐+복구) ──────────
DAEMON_PID_FILE="/tmp/task-signals/.daemon.pid"
DAEMON_RUNNING=false
if [ -f "$DAEMON_PID_FILE" ] && kill -0 "$(cat "$DAEMON_PID_FILE")" 2>/dev/null; then
  DAEMON_RUNNING=true
fi

if [ "$DAEMON_RUNNING" = false ] && [ -f "$REPO_ROOT/scripts/task/task-daemon.sh" ]; then
  bash "$REPO_ROOT/scripts/task/task-daemon.sh" --bg 2>/dev/null
  DAEMON_STATUS="✅ daemon 시작 (PID $(cat "$DAEMON_PID_FILE" 2>/dev/null))"
else
  DAEMON_STATUS="✅ daemon 실행 중 (PID $(cat "$DAEMON_PID_FILE" 2>/dev/null))"
fi

cat <<EOF
[fx-task] ✅ ${TASK_ID} 시작
  branch:  ${BRANCH}
  wt:      ${WT_PATH}
  pane:    ${PANE_ID:-(no tmux)}
  issue:   ${ISSUE_URL:-(degraded)}
  base:    ${PUSHED_SHA:0:8}
  inject:  ${INJECT_STATUS}
  daemon:  ${DAEMON_STATUS}
EOF
