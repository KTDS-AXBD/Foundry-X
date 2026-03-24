#!/bin/bash
# PostToolUse hook: auto-format .ts/.tsx files with eslint --fix
# Boris workflow tip: "hook catches the remaining 10% of formatting issues"

FILE=$(echo "$CLAUDE_TOOL_INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+')
if [ -z "$FILE" ]; then exit 0; fi
if ! echo "$FILE" | grep -qE '\.(ts|tsx)$'; then exit 0; fi

# Find package dir and check for eslint config
PKG_DIR=$(echo "$FILE" | grep -oP 'packages/[^/]+' | head -1)
if [ -z "$PKG_DIR" ]; then exit 0; fi
if [ ! -f "$PKG_DIR/eslint.config.js" ] && [ ! -f "$PKG_DIR/.eslintrc.js" ]; then exit 0; fi

npx eslint --fix "$FILE" 2>&1 | tail -5
