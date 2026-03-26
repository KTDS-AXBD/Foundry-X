#!/bin/bash
# PostToolUse hook: auto-format .ts/.tsx files with eslint --fix
# Boris workflow tip: "hook catches the remaining 10% of formatting issues"

FILE=$(echo "$CLAUDE_TOOL_INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+')
if [ -z "$FILE" ]; then exit 0; fi
if ! echo "$FILE" | grep -qE '\.(ts|tsx)$'; then exit 0; fi

# Find package dir — resolve absolute path from file
PKG_DIR=$(echo "$FILE" | grep -oP '.*/packages/[^/]+' | head -1)
if [ -z "$PKG_DIR" ]; then exit 0; fi

# Check for eslint config in the package or project root
if [ -f "$PKG_DIR/eslint.config.js" ] || [ -f "$PKG_DIR/.eslintrc.js" ]; then
  npx eslint --fix "$FILE" 2>&1 | tail -5
  exit 0
fi

# Fallback: check project root eslint config
PROJECT_ROOT=$(echo "$FILE" | grep -oP '.*/(?=packages/)' | head -1)
if [ -n "$PROJECT_ROOT" ] && { [ -f "${PROJECT_ROOT}eslint.config.js" ] || [ -f "${PROJECT_ROOT}.eslintrc.js" ]; }; then
  npx eslint --fix "$FILE" 2>&1 | tail -5
  exit 0
fi

# No eslint config found — skip silently
exit 0
