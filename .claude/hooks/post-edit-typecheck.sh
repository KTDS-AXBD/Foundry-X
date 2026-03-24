#!/bin/bash
# PostToolUse hook: typecheck after .ts/.tsx edit
# Runs tsc --noEmit in the package that owns the file

FILE=$(echo "$CLAUDE_TOOL_INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+')
if [ -z "$FILE" ]; then exit 0; fi
if ! echo "$FILE" | grep -qE '\.(ts|tsx)$'; then exit 0; fi

PKG_DIR=$(echo "$FILE" | grep -oP 'packages/[^/]+' | head -1)
if [ -z "$PKG_DIR" ]; then exit 0; fi

cd "$PKG_DIR" && npx tsc --noEmit --pretty 2>&1 | head -20
