#!/usr/bin/env bash
# F551: Claude + Codex 결과 합산 → Composite verdict
# Sprint 300 | FX-REQ-588
# 입력: CLAUDE_VERIFY_STATUS (PASS/FAIL), CODEX_JSON_PATH
# 출력: stdout에 VERDICT=<value>, exit 0 항상
set -euo pipefail

CLAUDE_VERIFY_STATUS="${CLAUDE_VERIFY_STATUS:-PASS}"
CODEX_JSON_PATH="${CODEX_JSON_PATH:-}"
SPRINT_NUM="${SPRINT_NUM:-}"

log() { echo "[composite-verify] $*" >&2; }

main() {
  local codex_verdict="unavailable"
  local degraded=false

  # Codex JSON 읽기
  if [ -n "$CODEX_JSON_PATH" ] && [ -f "$CODEX_JSON_PATH" ]; then
    codex_verdict=$(python3 -c "
import json, sys
d = json.load(open('$CODEX_JSON_PATH'))
v = d.get('verdict', 'unavailable')
# PASS-degraded → unavailable 처리
if v == 'PASS-degraded' or d.get('degraded', False):
    print('unavailable')
else:
    print(v)
" 2>/dev/null || echo "unavailable")
  else
    log "Codex JSON 없음 — degraded 모드"
    codex_verdict="unavailable"
  fi

  log "Claude=$CLAUDE_VERIFY_STATUS Codex=$codex_verdict"

  # 판정 매트릭스
  local composite
  if [ "$CLAUDE_VERIFY_STATUS" = "FAIL" ]; then
    composite="BLOCK"
  elif [ "$codex_verdict" = "unavailable" ]; then
    composite="PASS-degraded"
  elif [ "$codex_verdict" = "BLOCK" ]; then
    composite="BLOCK"
  elif [ "$codex_verdict" = "WARN" ]; then
    composite="WARN"
  else
    # Claude=PASS + Codex=PASS
    composite="PASS"
  fi

  echo "VERDICT=$composite"
  log "Composite → $composite"

  # SPRINT_NUM이 있으면 .sprint-context에도 기록
  if [ -n "$SPRINT_NUM" ]; then
    local context_file
    context_file="$(git rev-parse --show-toplevel 2>/dev/null)/.sprint-context"
    if [ -f "$context_file" ]; then
      if grep -q "^COMPOSITE_VERDICT=" "$context_file" 2>/dev/null; then
        sed -i "s/^COMPOSITE_VERDICT=.*/COMPOSITE_VERDICT=$composite/" "$context_file"
      else
        echo "COMPOSITE_VERDICT=$composite" >> "$context_file"
      fi
    fi
  fi
}

main "$@"
