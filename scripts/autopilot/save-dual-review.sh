#!/usr/bin/env bash
# F552: Save codex-review.json to D1 via API
# Called by autopilot Phase 5c after codex-review.sh + composite-verify.sh
set -euo pipefail

SPRINT_NUM="${SPRINT_NUM:-}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
API_URL="${VITE_API_URL:-https://fx-gateway.ktds-axbd.workers.dev/api}"

for arg in "$@"; do
  case "$arg" in
    --sprint) shift; SPRINT_NUM="${1:-}" ;;
    --sprint=*) SPRINT_NUM="${arg#--sprint=}" ;;
  esac
done

if [ -z "$SPRINT_NUM" ]; then
  if [ -f "$REPO_ROOT/.sprint-context" ]; then
    SPRINT_NUM=$(grep "^SPRINT_NUM=" "$REPO_ROOT/.sprint-context" | cut -d= -f2)
  fi
fi

if [ -z "$SPRINT_NUM" ]; then
  echo "[save-dual-review] ❌ SPRINT_NUM 필요" >&2
  exit 1
fi

CODEX_JSON="$REPO_ROOT/.claude/reviews/sprint-${SPRINT_NUM}/codex-review.json"
COMPOSITE_JSON="$REPO_ROOT/.claude/reviews/sprint-${SPRINT_NUM}/composite-verify.json"

if [ ! -f "$CODEX_JSON" ]; then
  echo "[save-dual-review] ⚠️  codex-review.json 없음 — 건너뜀"
  exit 0
fi

# Extract fields from codex-review.json
codex_verdict=$(python3 -c "import json; print(json.load(open('$CODEX_JSON')).get('verdict','PASS-degraded'))" 2>/dev/null || echo "PASS-degraded")
divergence_score=$(python3 -c "import json; print(json.load(open('$CODEX_JSON')).get('divergence_score', 0.0))" 2>/dev/null || echo "0.0")
model=$(python3 -c "import json; print(json.load(open('$CODEX_JSON')).get('model','none'))" 2>/dev/null || echo "none")
degraded=$(python3 -c "import json; print('true' if json.load(open('$CODEX_JSON')).get('degraded', False) else 'false')" 2>/dev/null || echo "false")
degraded_reason=$(python3 -c "import json; print(json.load(open('$CODEX_JSON')).get('degraded_reason') or '')" 2>/dev/null || echo "")

# Extract composite decision (from composite-verify.json if available)
decision="$codex_verdict"
if [ -f "$COMPOSITE_JSON" ]; then
  decision=$(python3 -c "import json; print(json.load(open('$COMPOSITE_JSON')).get('decision', '$codex_verdict'))" 2>/dev/null || echo "$codex_verdict")
fi

# Read full codex JSON
codex_json_content=$(cat "$CODEX_JSON")

# Build POST body
body=$(python3 -c "
import json, sys
print(json.dumps({
    'sprint_id': int('$SPRINT_NUM'),
    'claude_verdict': None,
    'codex_verdict': '$codex_verdict',
    'codex_json': json.dumps(json.load(open('$CODEX_JSON'))),
    'divergence_score': float('$divergence_score'),
    'decision': '$decision',
    'degraded': $degraded,
    'degraded_reason': '$degraded_reason' if '$degraded_reason' else None,
    'model': '$model',
}))
" 2>/dev/null)

if [ -z "$body" ]; then
  echo "[save-dual-review] ⚠️  JSON 구성 실패 — 건너뜀"
  exit 0
fi

# POST to API
response=$(curl -s -w "\n%{http_code}" -X POST \
  "${API_URL}/verification/dual-review" \
  -H "Content-Type: application/json" \
  -d "$body" 2>/dev/null || echo "")

http_code=$(echo "$response" | tail -1)
body_response=$(echo "$response" | head -1)

if [ "$http_code" = "201" ]; then
  echo "[save-dual-review] ✅ Sprint $SPRINT_NUM 리뷰 저장 완료 (verdict=$codex_verdict)"
else
  echo "[save-dual-review] ⚠️  API 응답: $http_code — $body_response"
fi
