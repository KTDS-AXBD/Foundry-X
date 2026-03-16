#!/usr/bin/env bash
set -euo pipefail
CLAUDE_H=$(grep '^## ' CLAUDE.md 2>/dev/null | sort)
AGENTS_H=$(grep '^## ' AGENTS.md 2>/dev/null | sort)
if [ "$CLAUDE_H" = "$AGENTS_H" ]; then
  echo '{"synced":true}'
else
  echo '{"synced":false}'
fi
