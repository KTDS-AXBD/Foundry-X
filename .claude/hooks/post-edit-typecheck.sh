#!/bin/bash
# PostToolUse hook: typecheck after .ts/.tsx edit
# Runs tsc --noEmit in the package that owns the file
# Only reports errors from the edited file (not pre-existing noise)

FILE=$(echo "$CLAUDE_TOOL_INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+')
if [ -z "$FILE" ]; then exit 0; fi
if ! echo "$FILE" | grep -qE '\.(ts|tsx)$'; then exit 0; fi

# Resolve absolute package dir from file path
PKG_DIR=$(echo "$FILE" | grep -oP '.*/packages/[^/]+' | head -1)
if [ -z "$PKG_DIR" ]; then exit 0; fi
if [ ! -f "$PKG_DIR/tsconfig.json" ]; then exit 0; fi

# Extract relative file path within package for filtering
REL_FILE=$(echo "$FILE" | sed "s|${PKG_DIR}/||")

# Run tsc and filter to only show errors from the edited file
# This avoids pre-existing errors from other files creating noise
OUTPUT=$(cd "$PKG_DIR" && npx tsc --noEmit --pretty false 2>&1 | grep -F "$REL_FILE" | head -10)

if [ -n "$OUTPUT" ]; then
  echo "$OUTPUT"
  exit 1
fi

exit 0
