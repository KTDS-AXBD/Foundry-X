#!/usr/bin/env bash
set -euo pipefail

# AGENTS.md는 Phase 2 산출물 — 아직 없으면 skip
if [ ! -f AGENTS.md ]; then
  echo '{"synced":true,"note":"AGENTS.md not yet created (Phase 2)"}'
  exit 0
fi

CLAUDE_H=$(grep '^## ' CLAUDE.md 2>/dev/null | sort || true)
AGENTS_H=$(grep '^## ' AGENTS.md 2>/dev/null | sort || true)
if [ "$CLAUDE_H" = "$AGENTS_H" ]; then
  echo '{"synced":true}'
else
  echo '{"synced":false}'
fi
