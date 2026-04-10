#!/bin/bash
# PostToolUse hook: update .task-context LAST_HEARTBEAT timestamp.
# Runs after every tool use in a task WT — keeps heartbeat fresh so
# Master's `task list` liveness probe can detect alive/stale/dead.
#
# Fast path: ~5ms (single sed in-place). No network, no jq.

TASK_CTX=".task-context"

# Only run inside a task WT (has .task-context)
[ -f "$TASK_CTX" ] || exit 0

# Update LAST_HEARTBEAT with current UTC timestamp
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
sed -i "s/^LAST_HEARTBEAT=.*/LAST_HEARTBEAT=$TS/" "$TASK_CTX"

exit 0
