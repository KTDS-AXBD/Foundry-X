#!/usr/bin/env bash
# scripts/sprint-merge-monitor.sh — F500 Auto Merge Monitor
#
# Polls /tmp/sprint-signals/<project>-<N>.signal files every 5s and, when a
# signal reports STATUS=DONE, drives the merge pipeline:
#   1) ensure PR exists
#   2) optional auto-approve (branch-protection compliance)
#   3) wait for CI checks (gh pr checks --watch, timeout 5m)
#   4) squash merge + delete branch
#   5) worktree cleanup
#   6) rewrite signal as STATUS=MERGED (or FAILED)
#
# Usage: bash scripts/sprint-merge-monitor.sh [poll_seconds] [ci_timeout_seconds]
#        POLL=5 CI_TIMEOUT=300 default.
#
# Designed to run detached: nohup bash ... & disown

set -o pipefail

POLL="${1:-5}"
CI_TIMEOUT="${2:-300}"
MAX_RETRY=3

SIGNAL_DIR="${SPRINT_SIGNAL_DIR:-/tmp/sprint-signals}"
LOG_FILE="${SIGNAL_DIR}/sprint-merge-monitor.log"
mkdir -p "$SIGNAL_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  local ts; ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  echo "[$ts] $*" | tee -a "$LOG_FILE"
}

# Read key=value from signal file.
sig_get() {
  local file="$1" key="$2"
  grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2-
}

# Rewrite a single key=value pair in the signal file (create if missing).
sig_set() {
  local file="$1" key="$2" val="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$file"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

# Try to auto-approve the PR when branch protection requires an approval.
auto_approve() {
  local pr_num="$1" repo="$2"
  local required
  required=$(gh api "repos/${repo}/branches/master/protection" \
    --jq '.required_pull_request_reviews.required_approving_review_count' 2>/dev/null) || required="0"
  # Ensure numeric — API 404 (unprotected branch) returns JSON error string
  case "$required" in
    ''|*[!0-9]*) required=0 ;;
  esac
  if [ "$required" -gt 0 ]; then
    if [ -x "${SCRIPT_DIR}/sprint-auto-approve.sh" ]; then
      bash "${SCRIPT_DIR}/sprint-auto-approve.sh" "$pr_num" "$repo" >>"$LOG_FILE" 2>&1 || true
    else
      gh pr review "$pr_num" --repo "$repo" --approve \
        --body "Auto-approved by sprint-merge-monitor" >>"$LOG_FILE" 2>&1 || true
    fi
  fi
}

# Wait for CI checks on a PR. Returns 0 on success, 1 on failure/timeout.
# Uses --foreground so timeout can signal the process group, and --kill-after
# to force-kill if SIGTERM is ignored by gh's --watch polling loop.
wait_ci() {
  local pr_num="$1" repo="$2"
  timeout --foreground --kill-after=10s "${CI_TIMEOUT}s" \
    gh pr checks "$pr_num" --repo "$repo" --watch --fail-fast >>"$LOG_FILE" 2>&1
}

# Main merge routine for a single DONE signal.
handle_merge() {
  local sig="$1"
  local sprint_num project branch pr_num repo wt_path
  sprint_num=$(sig_get "$sig" "SPRINT_NUM")
  project=$(sig_get "$sig" "PROJECT")
  branch=$(sig_get "$sig" "BRANCH")
  pr_num=$(sig_get "$sig" "PR_NUM")
  repo=$(sig_get "$sig" "GITHUB_REPO")
  wt_path=$(sig_get "$sig" "PROJECT_ROOT")

  [ -z "$sprint_num" ] && { log "skip $sig — no SPRINT_NUM"; return; }
  [ -z "$repo" ] && { log "skip $sprint_num — no GITHUB_REPO"; return; }

  sig_set "$sig" "STATUS" "MERGING"
  log "sprint-${sprint_num} — merging start (repo=$repo branch=$branch)"

  # 1) resolve PR number if missing
  if [ -z "$pr_num" ]; then
    pr_num=$(gh pr list --repo "$repo" --head "$branch" --json number --jq '.[0].number' 2>/dev/null || true)
  fi
  if [ -z "$pr_num" ]; then
    sig_set "$sig" "STATUS" "FAILED"
    sig_set "$sig" "ERROR_STEP" "pr-lookup"
    sig_set "$sig" "ERROR_MSG" "no PR found for $branch"
    log "sprint-${sprint_num} — FAIL: no PR"
    return
  fi
  sig_set "$sig" "PR_NUM" "$pr_num"

  # 2) auto-approve if required
  auto_approve "$pr_num" "$repo"

  # 3) wait for CI
  if ! wait_ci "$pr_num" "$repo"; then
    sig_set "$sig" "STATUS" "FAILED"
    sig_set "$sig" "ERROR_STEP" "ci-checks"
    sig_set "$sig" "ERROR_MSG" "CI failed or timed out"
    log "sprint-${sprint_num} — FAIL: CI"
    return
  fi

  # 3b) PR 본문 enrich (F504) — Sprint/F-item/Match Rate 메타 블록 삽입
  local f_items match_rate enrich_script
  f_items=$(sig_get "$sig" "F_ITEMS")
  match_rate=$(sig_get "$sig" "MATCH_RATE")
  enrich_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/board/pr-body-enrich.sh"
  if [ -f "$enrich_script" ] && [ -n "$f_items" ]; then
    bash "$enrich_script" "$pr_num" "$sprint_num" "$f_items" "${match_rate:-N/A}" \
      >>"$LOG_FILE" 2>&1 || log "sprint-${sprint_num} — warn: pr-body-enrich failed (non-fatal)"
  fi

  # 4) squash merge with retry/backoff
  local merged=0
  for attempt in $(seq 1 "$MAX_RETRY"); do
    if gh pr merge "$pr_num" --repo "$repo" --squash --delete-branch >>"$LOG_FILE" 2>&1; then
      merged=1; break
    fi
    log "sprint-${sprint_num} — merge attempt $attempt failed, backoff $((attempt*10))s"
    sleep $((attempt * 10))
  done
  if [ "$merged" -ne 1 ]; then
    sig_set "$sig" "STATUS" "FAILED"
    sig_set "$sig" "ERROR_STEP" "merge"
    sig_set "$sig" "ERROR_MSG" "squash merge failed after $MAX_RETRY attempts"
    log "sprint-${sprint_num} — FAIL: merge"
    return
  fi

  # 5) worktree cleanup
  if [ -n "$wt_path" ] && [ -d "$wt_path" ]; then
    git worktree remove "$wt_path" --force >>"$LOG_FILE" 2>&1 || true
  fi

  # 5b) local branch cleanup — `gh pr merge --delete-branch` only removes
  # the REMOTE ref, so whatever branch was tracked by this sprint signal
  # lingers locally until the next orphan-scan sweep. Delete it here too,
  # covering any name pattern (sprint/*, task/*, fix/*, feat/*, …). Must
  # run after `worktree remove` since git refuses to delete a branch that
  # is currently checked out in a worktree.
  #
  # Daemon CWD is assumed to be inside the main repo (nohup background
  # started from master pane). Best-effort (`|| true`): a stale ref or
  # already-deleted branch must not break the daemon loop.
  if [ -n "$branch" ]; then
    git branch -D "$branch" >>"$LOG_FILE" 2>&1 || true
  fi

  # 6) Board 동기화 (F504) — 연관 Issue를 Done 컬럼으로 이동
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -f "${script_dir}/board/board-on-merge.sh" ]; then
    bash "${script_dir}/board/board-on-merge.sh" "$pr_num" >>"$LOG_FILE" 2>&1 || true
  fi

  # 6b) Velocity 메트릭 기록 (F505) — docs/metrics/velocity/sprint-N.json
  if [ -f "${script_dir}/velocity/record-sprint.sh" ]; then
    (cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" \
      && bash "${script_dir}/velocity/record-sprint.sh" "$sprint_num") \
      >>"$LOG_FILE" 2>&1 || log "sprint-${sprint_num} — warn: velocity record failed (non-fatal)"
  fi

  # 6c) Phase 진행률 갱신 (F506) — Milestone 기반 phase-progress
  if [ -f "${script_dir}/epic/phase-progress.sh" ] && [ -n "$f_items" ]; then
    (cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" \
      && bash "${script_dir}/epic/phase-progress.sh") \
      >>"$LOG_FILE" 2>&1 || log "sprint-${sprint_num} — warn: phase-progress failed (non-fatal)"
  fi

  # 7) mark merged
  sig_set "$sig" "STATUS" "MERGED"
  sig_set "$sig" "MERGED_AT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  log "sprint-${sprint_num} — ✅ MERGED PR #${pr_num}"
}

log "sprint-merge-monitor started (poll=${POLL}s, ci_timeout=${CI_TIMEOUT}s, dir=${SIGNAL_DIR})"

while true; do
  shopt -s nullglob
  for sig in "$SIGNAL_DIR"/*-*.signal; do
    # only .signal files for sprints (exclude task signals which live in /tmp/task-signals)
    [ -f "$sig" ] || continue
    status=$(sig_get "$sig" "STATUS")
    case "$status" in
      DONE)    handle_merge "$sig" ;;
      MERGING|MERGED|FAILED|IN_PROGRESS) : ;;
      *) : ;;
    esac
  done
  sleep "$POLL"
done
