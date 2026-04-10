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
[ "${1:-}" = "--no-pr" ] && NO_PR=true

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

[ -n "$TASK_ID" ] || { echo "[fx-task-complete] TASK_ID 비어있음" >&2; exit 1; }
[ -n "$BRANCH" ] || { echo "[fx-task-complete] BRANCH 비어있음" >&2; exit 1; }

echo "[fx-task-complete] ${TASK_ID} — ${TITLE}"

# ─── Step 2: 미커밋 변경 커밋 ────────────────────────────────────────────────
DIRTY=$(git status --porcelain 2>/dev/null | grep -v '^\?' | head -1 || true)
UNTRACKED=$(git status --porcelain 2>/dev/null | grep '^?' | head -1 || true)

if [ -n "$DIRTY" ] || [ -n "$UNTRACKED" ]; then
  echo "[fx-task-complete] 미커밋 변경 감지 — 자동 커밋"
  # stage tracked changes
  git add -u 2>/dev/null || true
  # stage new files (exclude task-context/prompt)
  git status --porcelain | grep '^?' | awk '{print $2}' \
    | grep -v '\.task-context\|\.task-prompt' \
    | xargs -r git add 2>/dev/null || true

  git commit -m "chore(${TASK_ID}): auto-commit on task complete" 2>/dev/null || true
fi

# ─── Step 3: push + PR 생성 ─────────────────────────────────────────────────
PR_URL=""
COMMIT_COUNT=$(git rev-list master..HEAD --count 2>/dev/null || echo "0")

if [ "$COMMIT_COUNT" -gt 0 ]; then
  echo "[fx-task-complete] ${COMMIT_COUNT} commits — push to ${BRANCH}"
  git push origin "$BRANCH" -u 2>/dev/null || {
    echo "[fx-task-complete] push 실패" >&2
  }

  if [ "$NO_PR" = false ] && command -v gh >/dev/null 2>&1; then
    # PR이 이미 있는지 확인
    EXISTING_PR=$(gh pr list --repo "KTDS-AXBD/Foundry-X" --head "$BRANCH" --json url --jq '.[0].url' 2>/dev/null || true)
    if [ -n "$EXISTING_PR" ]; then
      PR_URL="$EXISTING_PR"
      echo "[fx-task-complete] 기존 PR: ${PR_URL}"
    else
      DIFF_STAT=$(git diff --stat master..HEAD 2>/dev/null | tail -1 || echo "")
      PR_URL=$(gh pr create \
        --repo "KTDS-AXBD/Foundry-X" \
        --base master \
        --head "$BRANCH" \
        --title "[${TASK_ID}] ${TITLE}" \
        --body "$(printf 'Task Orchestrator — auto-created by task-complete.\n\n- ID: %s\n- Track: %s\n- Commits: %s\n- Changes: %s\n' "$TASK_ID" "$TASK_TYPE" "$COMMIT_COUNT" "$DIFF_STAT")" \
        2>/dev/null) || {
        echo "[fx-task-complete] PR 생성 실패 (degraded)" >&2
        PR_URL=""
      }
      [ -n "$PR_URL" ] && echo "[fx-task-complete] PR 생성: ${PR_URL}"
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

cat <<EOF
[fx-task-complete] ✅ ${TASK_ID} 완료
  branch:  ${BRANCH}
  commits: ${COMMIT_COUNT}
  PR:      ${PR_URL:-(없음)}
  signal:  /tmp/task-signals/$(_project_name)-${TASK_ID}.signal
EOF
