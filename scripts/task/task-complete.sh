#!/usr/bin/env bash
# scripts/task/task-complete.sh — WT에서 작업 완료 시 호출
#
# Usage: task-complete.sh [--no-pr]
#
# 1. .task-context에서 TASK_ID/BRANCH 읽기
# 2. 미커밋 변경이 있으면 커밋
# 3. branch push + PR 생성 (--no-pr 시 생략)
# 4. signal 파일 작성 (STATUS=DONE + PR_URL)
# 5. cache 상태 갱신

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

# lib.sh는 main repo에 있으므로, worktree에서는 git-common-dir 기반으로 찾기
COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null)
MAIN_REPO="${COMMON_DIR%%/.git*}"
if [ -f "$MAIN_REPO/scripts/task/lib.sh" ]; then
  source "$MAIN_REPO/scripts/task/lib.sh"
elif [ -f "$SCRIPT_DIR/lib.sh" ]; then
  source "$SCRIPT_DIR/lib.sh"
else
  echo "[fx-task-complete] lib.sh 없음" >&2
  exit 1
fi

NO_PR=false
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --no-pr)   NO_PR=true ;;
    --dry-run) DRY_RUN=true ;;
  esac
done

# ─── Step 1: .task-context 읽기 ─────────────────────────────────────────────
TASK_CTX=".task-context"
if [ ! -f "$TASK_CTX" ]; then
  echo "[fx-task-complete] .task-context 없음 — task WT가 아닌 것 같아요" >&2
  exit 1
fi

TASK_ID=$(grep '^TASK_ID=' "$TASK_CTX" | cut -d= -f2)
BRANCH=$(grep '^BRANCH=' "$TASK_CTX" | cut -d= -f2)
TASK_TYPE=$(grep '^TASK_TYPE=' "$TASK_CTX" | cut -d= -f2)
TITLE=$(grep '^TITLE=' "$TASK_CTX" | cut -d= -f2)
ISSUE_URL=$(grep '^ISSUE_URL=' "$TASK_CTX" | cut -d= -f2- || true)

# Extract numeric issue ID from ISSUE_URL (e.g. ".../issues/488" → "488")
# so the PR body can declare `Closes #488`. GitHub resolves this to an
# auto-close link only when the PR is merged into the default branch.
ISSUE_NUM=""
if [ -n "${ISSUE_URL:-}" ]; then
  ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '/issues/[0-9]+' | grep -oE '[0-9]+$' || true)
fi

[ -n "$TASK_ID" ] || { echo "[fx-task-complete] TASK_ID 비어있음" >&2; exit 1; }
[ -n "$BRANCH" ] || { echo "[fx-task-complete] BRANCH 비어있음" >&2; exit 1; }

echo "[fx-task-complete] ${TASK_ID} — ${TITLE}"

# ─── Step 2: 미커밋 변경 커밋 ────────────────────────────────────────────────
DIRTY=$(git status --porcelain 2>/dev/null | grep -v '^\?' | head -1 || true)
UNTRACKED=$(git status --porcelain 2>/dev/null | grep '^?' | head -1 || true)

if [ -n "$DIRTY" ] || [ -n "$UNTRACKED" ]; then
  # stage tracked changes
  git add -u 2>/dev/null || true
  # stage new files (exclude task-context/prompt)
  git status --porcelain | grep '^?' | awk '{print $2}' \
    | grep -v '\.task-context\|\.task-prompt' \
    | xargs -r git add 2>/dev/null || true

  # C79 (FX-REQ-601): filter 적용 후 stage가 비어있으면 auto-commit 생략. worker가
  # 이미 fix commit을 만든 뒤 task-context/prompt만 남아있는 경우 두 번째 chore
  # 커밋이 같은 브랜치에 push되어 중복 PR(e.g. #594, #645 빈 squash)이 생성되는
  # 패턴을 차단해요. C67(S294) 최초 관찰 → C83(S303) 재발 → S305 근본 fix.
  if git diff --cached --quiet 2>/dev/null; then
    echo "[fx-task-complete] auto-commit skip — stage 결과 비어있음 (filter 제외 후 변경 없음)"
  else
    echo "[fx-task-complete] 미커밋 변경 감지 — 자동 커밋"
    git commit -m "chore(${TASK_ID}): auto-commit on task complete" 2>/dev/null || true
  fi
fi

# ─── Step 2b: web 변경 시 스크린샷 검증 ──────────────────────────────────────
SCREENSHOT_SCRIPT="$MAIN_REPO/scripts/screenshot-verify.sh"
if [ -f "$SCREENSHOT_SCRIPT" ]; then
  bash "$SCREENSHOT_SCRIPT" 2>&1 | sed 's/^/  /' || true
fi

# ─── Step 2c: empty commit 감지 (FX-REQ-514 / C22) ───────────────────────────
# Worker가 아무 파일 변경 없이 (또는 --allow-empty로) 커밋만 만든 경우, PR 생성·
# signal 작성·cache 'done' 갱신을 모두 거부하고 exit 22로 종료해요.
# 측정 범위는 master..HEAD 전체 합계 — 여러 커밋 중 마지막만 빈 false-positive 회피.
# `- -` (binary) 행은 숫자 2개 행 조건에 걸리지 않으므로 무시되지만, 바이너리-only
# 변경도 유효한 변경이므로 별도로 1을 더해줘요.
PR_URL=""
COMMIT_COUNT=$(git rev-list master..HEAD --count 2>/dev/null || echo "0")

if [ "$COMMIT_COUNT" -gt 0 ]; then
  TOTAL_CHANGES=$(git diff --numstat master..HEAD 2>/dev/null | awk '
    BEGIN { sum = 0 }
    $1 ~ /^[0-9]+$/ && $2 ~ /^[0-9]+$/ { sum += $1 + $2; next }
    $1 == "-" && $2 == "-" { sum += 1 }
    END { print sum+0 }
  ')
  if [ "${TOTAL_CHANGES:-0}" -eq 0 ]; then
    echo "[fx-task-complete] ❌ EMPTY_COMMIT_REJECTED — worker produced no file changes, empty commit rejected" >&2
    if [ "$DRY_RUN" = false ]; then
      cache_upsert_task "$TASK_ID" "empty_rejected" "$TASK_TYPE" "${TMUX_PANE:-}" "$(pwd)" "$BRANCH" ""
      log_event "$TASK_ID" "empty_commit_rejected" \
        "$(jq -nc --arg commits "$COMMIT_COUNT" '{commit_count: ($commits|tonumber)}')"
    fi
    exit 22
  fi
fi

if [ "$DRY_RUN" = true ]; then
  echo "[fx-task-complete] dry-run OK — empty check passed (changes=${TOTAL_CHANGES:-0}, commits=${COMMIT_COUNT})"
  exit 0
fi

# ─── Step 3: push + PR 생성 ─────────────────────────────────────────────────
if [ "$COMMIT_COUNT" -gt 0 ]; then
  echo "[fx-task-complete] ${COMMIT_COUNT} commits — push to ${BRANCH}"
  # Fail-fast: if push fails with commits present, do NOT write a DONE signal.
  # Otherwise the daemon sees PR_URL=none + COMMIT_COUNT>0, leaves MERGED=false,
  # then still removes the worktree and deletes the branch (task-daemon.sh
  # phase_signals lines 89–92) — permanently dropping the local commits.
  # S257 investigation (#4): this was the silent-drop root cause.
  if ! git push origin "$BRANCH" -u; then
    echo "[fx-task-complete] ❌ push 실패 — signal 작성을 중단합니다." >&2
    echo "[fx-task-complete] 복구: 원인 확인 후 수동 'git push origin ${BRANCH}' → 다시 task-complete 실행." >&2
    exit 20
  fi
  # Belt-and-suspenders: verify remote contains local HEAD before proceeding.
  LOCAL_HEAD=$(git rev-parse HEAD)
  REMOTE_HEAD=$(git rev-parse "origin/${BRANCH}" 2>/dev/null || echo "")
  if [ -z "$REMOTE_HEAD" ] || [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
    echo "[fx-task-complete] ❌ 원격 검증 실패 — local=${LOCAL_HEAD:0:8} remote=${REMOTE_HEAD:0:8}. signal 작성을 중단합니다." >&2
    exit 21
  fi

  if [ "$NO_PR" = false ] && command -v gh >/dev/null 2>&1; then
    # PR이 이미 있는지 확인
    EXISTING_PR=$(gh pr list --repo "KTDS-AXBD/Foundry-X" --head "$BRANCH" --json url --jq '.[0].url' 2>/dev/null || true)
    if [ -n "$EXISTING_PR" ]; then
      PR_URL="$EXISTING_PR"
      echo "[fx-task-complete] 기존 PR: ${PR_URL}"
    else
      DIFF_STAT=$(git diff --stat master..HEAD 2>/dev/null | tail -1 || echo "")
      # Build PR body: include `Closes #<n>` so GitHub auto-closes the task
      # issue on merge. Omit the line entirely when ISSUE_NUM is empty
      # (degraded start where gh issue create failed) to avoid a literal
      # "Closes #" text in the PR body.
      CLOSES_LINE=""
      [ -n "$ISSUE_NUM" ] && CLOSES_LINE="$(printf '\n\nCloses #%s' "$ISSUE_NUM")"
      PR_BODY=$(printf 'Task Orchestrator — auto-created by task-complete.\n\n- ID: %s\n- Track: %s\n- Commits: %s\n- Changes: %s%s\n' \
        "$TASK_ID" "$TASK_TYPE" "$COMMIT_COUNT" "$DIFF_STAT" "$CLOSES_LINE")
      PR_URL=$(gh pr create \
        --repo "KTDS-AXBD/Foundry-X" \
        --base master \
        --head "$BRANCH" \
        --title "[${TASK_ID}] ${TITLE}" \
        --body "$PR_BODY" \
        2>/dev/null) || {
        echo "[fx-task-complete] PR 생성 실패 (degraded)" >&2
        PR_URL=""
      }
      [ -n "$PR_URL" ] && echo "[fx-task-complete] PR 생성: ${PR_URL}${ISSUE_NUM:+ (Closes #${ISSUE_NUM})}"
    fi
  fi
else
  echo "[fx-task-complete] 코드 변경 없음 — push/PR 생략"
fi

# ─── Step 4: signal 파일 작성 ────────────────────────────────────────────────
WT_PATH=$(pwd)
PANE_ID="${TMUX_PANE:-}"

write_signal "$TASK_ID" "DONE" \
  "BRANCH=$BRANCH" \
  "PR_URL=${PR_URL:-none}" \
  "COMMIT_COUNT=$COMMIT_COUNT" \
  "WT_PATH=$WT_PATH" \
  "PANE_ID=${PANE_ID:-unknown}"

echo "[fx-task-complete] signal 작성 완료"

# ─── Step 5: cache 갱신 ─────────────────────────────────────────────────────
cache_upsert_task "$TASK_ID" "done" "$TASK_TYPE" "${PANE_ID:-}" "$WT_PATH" "$BRANCH" "${PR_URL:-}"
log_event "$TASK_ID" "completed" "$(jq -nc \
  --arg pr "${PR_URL:-}" --arg commits "$COMMIT_COUNT" \
  '{pr_url:$pr, commit_count:($commits|tonumber)}')"

# ─── Step 6: daemon auto-restart hook (C30) ─────────────────────────────────
# squash merge 후 HEAD~1→HEAD diff에 daemon/lib.sh 변경이 있으면 daemon 재기동.
# 재기동 실패는 경고만 — task-complete 자체는 성공으로 유지.
DAEMON_MODIFIED=$(git -C "$REPO_ROOT" diff --name-only HEAD~1 HEAD 2>/dev/null \
  | grep -E '^scripts/task/(task-daemon|lib)\.sh$' || true)
if [ -n "$DAEMON_MODIFIED" ]; then
  echo "[fx-task-complete] daemon code modified — restarting daemon" >&2
  if bash "$REPO_ROOT/scripts/task/task-daemon.sh" --bg 2>/dev/null; then
    echo "[fx-task-complete] daemon restarted ✅" >&2
  else
    echo "[fx-task-complete] ⚠️  daemon restart failed — manual restart may be needed" >&2
  fi
fi

cat <<EOF
[fx-task-complete] ✅ ${TASK_ID} 완료
  branch:  ${BRANCH}
  commits: ${COMMIT_COUNT}
  PR:      ${PR_URL:-(없음)}
  signal:  /tmp/task-signals/$(_project_name)-${TASK_ID}.signal
EOF
