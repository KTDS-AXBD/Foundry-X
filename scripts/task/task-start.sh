#!/usr/bin/env bash
# scripts/task/task-start.sh — /ax:task start (S-α MVP)
#
# Usage:  task-start.sh [--reuse-id <ID>] <track> "<title>" ["<prompt>"]
#   track: F | B | C | X
#   prompt: optional — injected into WT pane Claude session (default: auto-generated)
#
# --reuse-id <ID>
#   Bypass the auto-allocator and consume an existing Task Orchestrator
#   Backlog row by exact ID (e.g. C20). Prevents the "ID forward" trap
#   where allocate_id() returns max+1 regardless of the row's status,
#   so a user-pre-registered C20 silently becomes C22 on execution.
#   The existing row is left untouched (it stays as the "intent" record);
#   REQ code + track are read back from the row. See S258 MEMORY.
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

# ─────────────────────────────────────────────────────────────────────────────
# --reuse-id risk policy
# ─────────────────────────────────────────────────────────────────────────────
# Invoked by the reuse path after lookup_backlog_row() returns the existing
# row's status. Decide per-status whether to pass (return 0), warn + pass, or
# block (return non-zero). This is intentionally a plain function — the user
# defines the team's policy here, not a config file, so it shows up in git
# blame and code review.
#
# User answered (S259): all statuses are reusable, but the risk profile
# varies enormously:
#   PLANNED        — normal case, intent row awaiting work
#   CLOSED_EMPTY   — S257-style abandoned row (tmux 3.4 segfault victims)
#   IN_PROGRESS    — another pane/daemon may be actively working, double-run
#                    means merge-queue collision + signal file stomp
#   DONE / CANCELLED / CLOSED_LEARNED / REJECTED / UNKNOWN
#                  — overwriting finished history, destructive
#
# Expected behavior (write ~5-10 lines below):
#   • Echo a short rationale to stderr describing the risk
#   • Optionally require `FX_REUSE_FORCE=1` env var to bypass the dangerous
#     cases (IN_PROGRESS and DONE family), so the default is safe but a
#     deliberate override path exists
#   • Return 0 to proceed, non-zero to abort
#
# Parameters:
#   $1 — TASK_ID being reused (e.g. "C20")
#   $2 — existing status from SPEC row
warn_reuse_risk() {
  local id="$1" status="$2"
  case "$status" in
    PLANNED)
      return 0 ;;
    CLOSED_EMPTY)
      echo "[fx-task] reusing $id (CLOSED_EMPTY — S257-style retry, ok)" >&2
      return 0 ;;
    IN_PROGRESS|DONE|CANCELLED|CLOSED_LEARNED|REJECTED|UNKNOWN)
      if [ -n "${FX_REUSE_FORCE:-}" ]; then
        echo "[fx-task] WARN: reusing $id with status=$status (FX_REUSE_FORCE=1 set)" >&2
        return 0
      fi
      echo "[fx-task] ABORT: $id has status=$status — set FX_REUSE_FORCE=1 to override" >&2
      return 10 ;;
    *)
      echo "[fx-task] WARN: unknown status '$status' for $id — proceeding" >&2
      return 0 ;;
  esac
}

# ─── Flag parsing (leading --long options only) ─────────────────────────────
REUSE_ID=""
while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --reuse-id)
      REUSE_ID="${2:?--reuse-id requires an ID (e.g. C20)}"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    *)
      echo "[fx-task] unknown option: $1" >&2
      exit 2
      ;;
  esac
done

TRACK="${1:?track required (F|B|C|X)}"
TITLE="${2:?title required}"
PROMPT="${3:-}"

# ─── --reuse-id sanity: ID prefix must match track ──────────────────────────
if [ -n "$REUSE_ID" ]; then
  if [[ ! "$REUSE_ID" =~ ^([BCX])[0-9]+$ ]]; then
    echo "[fx-task] --reuse-id format invalid: '$REUSE_ID' (expected B|C|X + digits, e.g. C20)" >&2
    exit 2
  fi
  REUSE_TRACK="${BASH_REMATCH[1]}"
  if [ "$REUSE_TRACK" != "$TRACK" ]; then
    echo "[fx-task] --reuse-id track mismatch: $REUSE_ID prefix='$REUSE_TRACK' != track='$TRACK'" >&2
    exit 2
  fi
fi

case "$TRACK" in B|C|X) ;; F) echo "[fx-task] F-track은 Sprint/Phase 전용이에요. Task에는 B/C/X를 사용해주세요." >&2; echo "[fx-task]   Feature급 작업 → Sprint 경로: bash -i -c 'sprint N'" >&2; exit 2;; *) echo "[fx-task] invalid track: $TRACK (B|C|X)" >&2; exit 2;; esac

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

# HOME 독립적 절대 경로 — C28 HOME 오염 대응 (S271)
WT_BASE="${CLAUDE_WT_BASE:-/home/sinclair/work/worktrees}"
PROJECT=$(basename "$REPO_ROOT")

# ─── Step 1: ID allocator + SPEC register (under flock) ──────────────────────
ID_LOCK="$FX_LOCK_DIR/id-allocator.lock"
PUSH_LOCK="$FX_LOCK_DIR/master-push.lock"

TASK_ID=""
PUSHED_SHA=""

(
  flock -x -w 10 9 || { echo "[fx-task] id-allocator lock timeout" >&2; exit 3; }

  if [ -n "$REUSE_ID" ]; then
    # ── Reuse path: consume an existing backlog row by exact ID ────────────
    ROW_INFO=$(lookup_backlog_row "$REUSE_ID" SPEC.md) || {
      echo "[fx-task] --reuse-id '$REUSE_ID' not found in SPEC Task Orchestrator Backlog" >&2
      exit 4
    }
    TASK_ID="$REUSE_ID"
    REQ_ID="${ROW_INFO%|*}"
    EXISTING_STATUS="${ROW_INFO#*|}"
    echo "[fx-task] 재사용: $TASK_ID (status=$EXISTING_STATUS, REQ=$REQ_ID) — $TITLE" >&2

    # User-configured risk policy: decide whether to warn, block, or pass
    # based on the existing row's status. Implemented in task-start helper
    # below (warn_reuse_risk). Exits non-zero to abort when policy blocks.
    warn_reuse_risk "$TASK_ID" "$EXISTING_STATUS" || exit $?

    # SPEC row is intentionally left untouched — per S258 pattern, the
    # existing row acts as "intent record" and the execution evidence lives
    # in git history + task-complete commit. No commit needed on master
    # in this branch; skip straight to push-lock step so WT base_sha is
    # pinned to the current HEAD.
    PUSHED_SHA=$(git rev-parse HEAD)
    echo "$TASK_ID|$PUSHED_SHA|$REQ_ID" > "$FX_LOCK_DIR/.last-allocation"
  else
    # ── Normal path: allocate next ID + append new SPEC row ────────────────
    TASK_ID=$(allocate_id "$TRACK")
    echo "[fx-task] 발급: $TASK_ID — $TITLE" >&2

    # REQ code auto-allocation (GAP-2 fix)
    REQ_ID=$(allocate_req_id SPEC.md)
    echo "[fx-task] REQ: $REQ_ID" >&2

    # Minimal SPEC.md registration: append a one-line entry to a dedicated section.
    # S-α scope: append to a fenced "Task Orchestrator Backlog" block at end of §5.
    # If the marker isn't present, create it before §7.
    # Status uses text (PLANNED/DONE/CANCELLED/REJECTED/CLOSED_LEARNED) per PRD §3.3.
    # Type column added per GAP-4 decision.
    ENTRY="| ${TASK_ID} | ${TRACK} | ${TITLE} (${REQ_ID}) | — | PLANNED | task orchestrator |"

    if ! grep -q "<!-- fx-task-orchestrator-backlog -->" SPEC.md; then
      # Insert marker block right before "## §7 기술 스택"
      awk -v block='\n<!-- fx-task-orchestrator-backlog -->\n### Task Orchestrator Backlog (B/C/X)\n\n| ID | Type | 제목 | Sprint | 상태 | 비고 |\n|----|------|------|--------|------|------|\n<!-- /fx-task-orchestrator-backlog -->\n' \
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
  fi

  # ─── Step 2: push under master-push lock (normal path only) ───────────────
  # Reuse path already wrote .last-allocation above with current HEAD and
  # has no new commit to push — skip push lock entirely to avoid the
  # destructive `git reset --hard HEAD^` error handler.
  if [ -z "$REUSE_ID" ]; then
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
      echo "$TASK_ID|$PUSHED_SHA|$REQ_ID" > "$FX_LOCK_DIR/.last-allocation"
    ) 8>"$PUSH_LOCK"
  fi

) 9>"$ID_LOCK"

# Read back from subshell-set file
[ -f "$FX_LOCK_DIR/.last-allocation" ] || { echo "[fx-task] allocator output 누락" >&2; exit 7; }
TASK_ID=$(cut -d'|' -f1 "$FX_LOCK_DIR/.last-allocation")
PUSHED_SHA=$(cut -d'|' -f2 "$FX_LOCK_DIR/.last-allocation")
REQ_ID=$(cut -d'|' -f3 "$FX_LOCK_DIR/.last-allocation")
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
  --arg branch "$BRANCH" --arg sha "$PUSHED_SHA" --arg req "$REQ_ID" \
  '{task_id:$id, task_type:$t, title:$title, started_at:$ts, branch:$branch, base_sha:$sha, req_id:$req, scope_files:[], scope_dirs:[]}')

(
  cd "$WT_PATH"
  cat > .task-context <<EOF
TASK_ID=$TASK_ID
TASK_TYPE=$TRACK
TITLE=$TITLE
REQ_ID=$REQ_ID
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
  # S260 C28 HOME propagation — tmux default shell이 login shell로 뜨면서
  # HOME을 pwent 값(/home/sinclair)으로 리셋하는 것을 -e HOME=로 명시 override.
  # Master의 multi-account HOME(.claude-work)을 worker가 상속하여
  # statusline/oauth/subscription 계정 정합성 유지.
  PANE_ID=$(tmux split-window -h -e HOME="$HOME" -P -F '#{pane_id}' -c "$WT_PATH" 2>/dev/null || echo "")
  if [ -n "$PANE_ID" ]; then
    tmux select-pane -t "$PANE_ID" -T "${TASK_ID} ${TITLE}" 2>/dev/null || true
    # bidirectional verification via user-data
    tmux set -p -t "$PANE_ID" @fx-task-id "$TASK_ID" 2>/dev/null || true
    # enable pane border labels so task ID is visible in tmux UI
    tmux set-option pane-border-status top 2>/dev/null || true
    # fx-task pane들만 균등 너비 재배치 (고정 pane 제외)
    # @fx-task-id가 설정된 pane + Master pane만 대상
    WINDOW_WIDTH=$(tmux display -p '#{window_width}' 2>/dev/null || echo 0)
    # 고정 pane 너비 합산 (fx-task-id 미설정 + Master 아닌 pane)
    FIXED_WIDTH=0
    FIXED_COUNT=0
    TASK_PANES=""
    TASK_COUNT=0
    while IFS='|' read -r pid pw ptitle ptask; do
      ptask=$(echo "$ptask" | tr -d '[:space:]')
      # Master pane은 task pane으로 취급
      if echo "$ptitle" | grep -qi "master"; then
        TASK_PANES="${TASK_PANES} ${pid}"
        TASK_COUNT=$((TASK_COUNT + 1))
      elif [ -n "$ptask" ]; then
        TASK_PANES="${TASK_PANES} ${pid}"
        TASK_COUNT=$((TASK_COUNT + 1))
      else
        FIXED_WIDTH=$((FIXED_WIDTH + pw))
        FIXED_COUNT=$((FIXED_COUNT + 1))
      fi
    done < <(tmux list-panes -F '#{pane_id}|#{pane_width}|#{pane_title}|#{@fx-task-id}' 2>/dev/null)

    if [ "$TASK_COUNT" -gt 0 ] && [ "$WINDOW_WIDTH" -gt 0 ]; then
      # 구분선(pane border) 보정: 전체 pane 수 - 1
      TOTAL_PANES=$((TASK_COUNT + FIXED_COUNT))
      BORDERS=$((TOTAL_PANES - 1))
      AVAIL=$((WINDOW_WIDTH - FIXED_WIDTH - BORDERS))
      EACH=$((AVAIL / TASK_COUNT))
      [ "$EACH" -lt 40 ] && EACH=40  # 최소 40컬럼 보장
      for pid in $TASK_PANES; do
        tmux resize-pane -t "$pid" -x "$EACH" 2>/dev/null || true
      done
    fi
  fi
fi

# ─── Step 5b: auto-inject Claude session + prompt (background) ──────────────
if [ -n "$PANE_ID" ]; then
  # Autonomous completion principle — appended to every task prompt to
  # prevent the "worker-blocked-on-user" interview loop. Workers must drive
  # tasks to completion without asking Master for confirmation on routine
  # decisions; only block on genuine ambiguity (conflicting requirements,
  # missing access). See MEMORY feedback: S256 interview-loop incident.
  AUTONOMY_RULE="자율 완료 원칙: 결정이 필요한 지점에서 사용자 확인을 기다리지 말고 합리적 기본값으로 진행하세요. 막히면 commit+stash 후 task-complete로 넘기세요. 진짜 막힌 경우(권한 부재/요구 충돌)만 예외. 작업 완료 후 반드시 bash scripts/task/task-complete.sh 를 실행해서 커밋/PR/signal 처리해줘."

  # Generate default prompt if not provided
  if [ -z "$PROMPT" ]; then
    case "$TRACK" in
      F) TRACK_DESC="Feature 구현" ;;
      B) TRACK_DESC="Bug 수정" ;;
      C) TRACK_DESC="점검/Chore 작업" ;;
      X) TRACK_DESC="실험/Spike 탐색" ;;
    esac
    PROMPT="이 worktree는 task ${TASK_ID} — ${TITLE}. .task-context 파일을 읽고 ${TRACK_DESC}을 진행해줘. ${AUTONOMY_RULE}"
  fi

  # Append autonomy + completion instruction to custom prompts
  if ! echo "$PROMPT" | grep -q "task-complete.sh"; then
    PROMPT="${PROMPT} ${AUTONOMY_RULE}"
  fi

  # Write prompt to WT for Claude to pick up
  echo "$PROMPT" > "${WT_PATH}/.task-prompt"

  # Background: start Claude session → wait for boot → rename + inject prompt
  # inject 스크립트를 별도 파일로 생성 → nohup으로 실행 (subshell 조기 종료 방지)
  RENAME_LABEL="${TASK_ID} ${TITLE}"
  INJECT_SCRIPT="/tmp/task-signals/inject-${TASK_ID}.sh"
  CCS_BIN=$(command -v ccs 2>/dev/null || echo "/home/sinclair/.local/bin/ccs")
  # S260 C28: WT worker는 토큰 비용 절감 위해 Sonnet 강제.
  # feedback_sprint_model.md "Master=Opus, WT=Sonnet" 원칙의 구현.
  # 사용자는 worker 세션에서 /model 명령으로 수동 변경 가능.
  # S300 (2026-04-18): minor 버전 하드코딩 → `sonnet` alias로 교체.
  # Claude Code CLI가 Sonnet 현행 최신 버전을 자동 선택하므로
  # Anthropic release 시 별도 수정 없이 자동 추종. 특정 minor 버전
  # 고정이 필요한 경우에만 --model claude-sonnet-4-N 복원.
  CCS_WT_CMD="${CCS_BIN} --model sonnet"

  cat > "$INJECT_SCRIPT" << INJECT_EOF
#!/usr/bin/env bash
# Auto-inject script for ${TASK_ID}
PANE="${PANE_ID}"
MAX_WAIT=30
BOOT_CHECK_INTERVAL=2

# Step 1: ccs 실행
tmux send-keys -t "\$PANE" "${CCS_WT_CMD}" Enter
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
  echo "[inject] ⚠️  ${TASK_ID}: Claude 부팅 \${MAX_WAIT}초 초과 — 수동 주입 필요" >> /tmp/task-signals/inject.log
  exit 1
fi

# Step 3: /rename
tmux send-keys -t "\$PANE" "/rename ${RENAME_LABEL}"
sleep 0.3
tmux send-keys -t "\$PANE" Enter
sleep 1

# Step 4: /ax:session-start (PROMPT는 .task-prompt에서 읽기 — 길이 제한 회피)
# S257b fix: 이전 500자 컷이 실제 워커 프롬프트를 중간 문장에서 끊어서 C14/C15가
# 빈 PR로 머지되는 사고 발생. 8000자로 상향 — 대부분 현실적 태스크 프롬프트 커버.
# S260 C31 fix: text/Enter 분리로 bracket paste workaround. .task-prompt read 방식은 C32+ 후보.
PROMPT_TEXT=\$(cat "${WT_PATH}/.task-prompt" 2>/dev/null | tr '\n' ' ' | cut -c1-8000)
tmux send-keys -t "\$PANE" "/ax:session-start \${PROMPT_TEXT}"
sleep 0.5
tmux send-keys -t "\$PANE" Enter

echo "[inject] ✅ ${TASK_ID}: 주입 완료 (boot=\${WAITED}s)" >> /tmp/task-signals/inject.log
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

# Persist ISSUE_URL into the WT's .task-context so task-complete.sh can
# emit `Closes #N` in the generated PR body (which is how GitHub closes
# the task issue automatically at merge time). Previously only the cache
# held this link, so manual completion in a WT lost the reference and
# issues were left OPEN after merge (S258 residual: #470/471/475/476/
# 481/483/485/488 all required manual close). Append (not rewrite) so
# we don't disturb existing keys.
if [ -n "$ISSUE_URL" ] && [ -f "$WT_PATH/.task-context" ]; then
  echo "ISSUE_URL=$ISSUE_URL" >> "$WT_PATH/.task-context"
fi

# ─── Step 6b: GitHub Projects Board 추가 (F501) ──────────────────────────────
# Issue 생성 성공 시 Foundry-X Kanban 보드에 자동 추가.
# 실패해도 task 시작은 계속 — board 연동은 부가 기능.
if [ -n "$ISSUE_URL" ] && command -v gh >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
  PROJECT_NUM=$(GH_TOKEN="${GH_TOKEN:-$GH_TOKEN_TMP}" gh project list --owner KTDS-AXBD --format json 2>/dev/null \
    | jq -r '.projects[]? | select(.title=="Foundry-X Kanban") | .number' | head -1 || true)
  if [ -n "$PROJECT_NUM" ]; then
    GH_TOKEN="${GH_TOKEN:-$GH_TOKEN_TMP}" gh project item-add "$PROJECT_NUM" \
      --owner KTDS-AXBD --url "$ISSUE_URL" >/dev/null 2>&1 || true
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
  # (b) crash loop guard 확인 — lib.sh daemon_restart_guard 재사용
  if daemon_restart_guard 2>/dev/null; then
    bash "$REPO_ROOT/scripts/task/task-daemon.sh" --bg 2>/dev/null
    DAEMON_STATUS="✅ daemon 시작 (PID $(cat "$DAEMON_PID_FILE" 2>/dev/null))"
  else
    DAEMON_STATUS="⚠️  daemon crash loop 감지 — 자동 재기동 건너뜀 (수동 확인 필요)"
  fi
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
