#!/usr/bin/env bash
# scripts/task/test-task-list-display.sh — C62 TDD Red
#
# Verifies task-list.sh display correctness:
#   1. Completed tasks (status=merged/done/etc.) are NOT shown in main table
#   2. Active tasks (status=in_progress) ARE shown with correct fields
#   3. Track="" entries don't corrupt column alignment via IFS whitespace collapse
#
# Usage: bash test-task-list-display.sh
#
# Exit code: 0 = all PASS, non-zero = failures

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASK_LIST="$SCRIPT_DIR/task-list.sh"

PASS=0
FAIL=0

pass() { echo "  ✅ $1"; (( PASS++ )) || true; }
fail() { echo "  ❌ $1"; (( FAIL++ )) || true; }

# ─── test harness ─────────────────────────────────────────────────────────────
# Run task-list with a fake cache and return its output.
# lib.sh overwrites FX_CACHE unconditionally, so we inject via FX_HOME instead.
run_with_cache() {
  local cache_json="$1"
  local tmp_home; tmp_home=$(mktemp -d)
  mkdir -p "$tmp_home/locks" "$tmp_home/scripts"
  touch "$tmp_home/task-log.ndjson"
  echo "$cache_json" > "$tmp_home/tasks-cache.json"
  local out
  out=$(FX_HOME="$tmp_home" bash "$TASK_LIST" 2>/dev/null || true)
  rm -rf "$tmp_home"
  printf '%s' "$out"
}

echo "=== test-task-list-display.sh (C62 Red) ==="

# ─── Case 1: completed task (status=merged, track="") must NOT appear in main table ─
echo ""
echo "Case 1: merged task with track='' must not appear in main table"
cache_merged='{
  "version": 1,
  "tasks": {
    "C52": {
      "status": "merged",
      "track": "",
      "pane": "",
      "wt": "",
      "branch": "task/C52-example",
      "issue_url": "https://github.com/example/repo/pull/100",
      "updated_at": "2026-04-13T14:39:45Z",
      "started_at": "2026-04-13T14:35:56Z"
    }
  }
}'
out=$(run_with_cache "$cache_merged")
if echo "$out" | grep -q "^C52 "; then
  fail "C52 (merged) appeared in main table — should be hidden or archived"
else
  pass "C52 (merged) not in main table"
fi
if echo "$out" | grep -qE "(no active tasks|archived|C52)"; then
  pass "Output acknowledges C52 somehow (no-tasks or archived)"
else
  fail "Output gives no indication of C52 status"
fi

# ─── Case 2: active task (status=in_progress, track=C) must appear in main table ────
echo ""
echo "Case 2: in_progress task must appear with correct fields"
cache_active='{
  "version": 1,
  "tasks": {
    "C62": {
      "status": "in_progress",
      "track": "C",
      "pane": "%27",
      "wt": "/tmp/fake-wt-c62",
      "branch": "task/C62-task-list-stale-display",
      "issue_url": "https://github.com/example/repo/issues/200",
      "updated_at": "2026-04-14T02:00:00Z",
      "started_at": "2026-04-14T02:00:00Z"
    }
  }
}'
out=$(run_with_cache "$cache_active")
if echo "$out" | grep -qE "^C62 "; then
  pass "C62 (in_progress) appeared in main table"
else
  fail "C62 (in_progress) missing from main table"
fi
# Verify TRK column has "C" not some other value (no field shift)
if echo "$out" | grep -qE "^C62 +C "; then
  pass "C62 TRK column correctly shows 'C'"
else
  fail "C62 TRK column is wrong — likely field shift bug: $(echo "$out" | grep '^C62' | head -1)"
fi

# ─── Case 3: IFS whitespace collapsing — empty track must not shift other fields ───
echo ""
echo "Case 3: track='' must not shift subsequent fields (IFS tab collapse bug)"
cache_empty_track='{
  "version": 1,
  "tasks": {
    "C99": {
      "status": "in_progress",
      "track": "",
      "pane": "%10",
      "wt": "/tmp/fake-wt-c99",
      "branch": "task/C99-test-branch",
      "issue_url": "",
      "updated_at": "2026-04-14T02:00:00Z",
      "started_at": "2026-04-14T02:00:00Z"
    }
  }
}'
out=$(run_with_cache "$cache_empty_track")
# C99 has in_progress status — it SHOULD appear (it's active, just missing track)
# If field shift occurs: TRK shows "in_progress", ST shows emoji_for("task/C99-test-branch") = "•"
# If fixed: TRK shows "" or "?", ST shows emoji_for("in_progress") = "🔧"
# The key: "in_progress" must NOT appear in the TRK column
if echo "$out" | grep -qE "^C99 +in_progress"; then
  fail "C99 TRK column shows 'in_progress' — IFS whitespace collapse field shift not fixed"
else
  pass "C99 TRK column does not show 'in_progress' (no field shift)"
fi

# ─── Case 4: multiple tasks — only active ones in table ─────────────────────
echo ""
echo "Case 4: mixed cache — only active tasks in main table, completed ones omitted"
cache_mixed='{
  "version": 1,
  "tasks": {
    "C50": {
      "status": "merged",
      "track": "C",
      "pane": "",
      "wt": "",
      "branch": "task/C50-old",
      "issue_url": "",
      "updated_at": "2026-04-10T10:00:00Z",
      "started_at": "2026-04-10T09:00:00Z"
    },
    "C62": {
      "status": "in_progress",
      "track": "C",
      "pane": "%27",
      "wt": "/tmp/fake-wt-c62",
      "branch": "task/C62-task-list-stale-display",
      "issue_url": "",
      "updated_at": "2026-04-14T02:00:00Z",
      "started_at": "2026-04-14T02:00:00Z"
    }
  }
}'
out=$(run_with_cache "$cache_mixed")
if echo "$out" | grep -qE "^C50 "; then
  fail "C50 (merged) appeared in main table — should be filtered"
else
  pass "C50 (merged) not in main table"
fi
if echo "$out" | grep -qE "^C62 "; then
  pass "C62 (in_progress) in main table"
else
  fail "C62 (in_progress) missing from main table"
fi

# ─── Case 5: done task (status=done) must not appear in main table ──────────
echo ""
echo "Case 5: done task must not appear in main table"
cache_done='{
  "version": 1,
  "tasks": {
    "C61": {
      "status": "done",
      "track": "C",
      "pane": "",
      "wt": "",
      "branch": "task/C61-old-done",
      "issue_url": "",
      "updated_at": "2026-04-14T02:00:00Z",
      "started_at": "2026-04-14T01:00:00Z"
    }
  }
}'
out=$(run_with_cache "$cache_done")
if echo "$out" | grep -qE "^C61 "; then
  fail "C61 (done) appeared in main table"
else
  pass "C61 (done) not in main table"
fi

echo ""
echo "=== Result: ${PASS} passed, ${FAIL} failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
