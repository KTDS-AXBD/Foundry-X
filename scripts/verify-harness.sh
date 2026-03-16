#!/usr/bin/env bash
set -euo pipefail
SCORE=100
CHECKS=()
for f in CLAUDE.md AGENTS.md ARCHITECTURE.md CONSTITUTION.md .plumb/config.json; do
  if [ ! -f "$f" ]; then
    SCORE=$((SCORE - 15))
    CHECKS+=("{\"name\":\"file:$f\",\"passed\":false,\"level\":\"FAIL\",\"message\":\"$f not found\"}")
  else
    CHECKS+=("{\"name\":\"file:$f\",\"passed\":true,\"level\":\"PASS\",\"message\":\"$f exists\"}")
  fi
done
if [ -f CONSTITUTION.md ]; then
  for tier in "## Always" "## Ask" "## Never"; do
    if ! grep -q "$tier" CONSTITUTION.md; then
      SCORE=$((SCORE - 10))
      CHECKS+=("{\"name\":\"constitution:$tier\",\"passed\":false,\"level\":\"FAIL\",\"message\":\"$tier section missing\"}")
    fi
  done
fi
[ ! -f progress.md ] && SCORE=$((SCORE - 5))
CHECKS_JSON=$(printf '%s,' "${CHECKS[@]}" | sed 's/,$//')
echo "{\"score\":$SCORE,\"passed\":$([ $SCORE -ge 60 ] && echo true || echo false),\"checks\":[$CHECKS_JSON]}"
