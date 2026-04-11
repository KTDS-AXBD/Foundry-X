#!/usr/bin/env bash
# F505 — Sprint 완료 시 velocity 메트릭 JSON 기록
# Usage:
#   bash scripts/velocity/record-sprint.sh [SPRINT_NUM]
# 인자 없으면 .sprint-context에서 SPRINT_NUM 읽음.
set -euo pipefail

SPRINT_NUM="${1:-}"
CTX=".sprint-context"

if [ -z "$SPRINT_NUM" ] && [ -f "$CTX" ]; then
  SPRINT_NUM=$(grep "^SPRINT_NUM=" "$CTX" | cut -d= -f2)
fi
if [ -z "$SPRINT_NUM" ]; then
  echo "ERROR: SPRINT_NUM 필요 (인자 또는 .sprint-context)" >&2
  exit 1
fi

read_ctx() {
  local key="$1"
  [ -f "$CTX" ] || { echo ""; return; }
  (grep "^${key}=" "$CTX" 2>/dev/null || true) | cut -d= -f2- | head -1
}

F_ITEMS=$(read_ctx F_ITEMS)
MATCH_RATE=$(read_ctx MATCH_RATE)
TEST_RESULT=$(read_ctx TEST_RESULT)
[ -z "$TEST_RESULT" ] && TEST_RESULT="unknown"
CREATED=$(read_ctx CREATED)
[ -z "$CREATED" ] && CREATED=$(date -Iseconds)

# duration_minutes: Sprint 브랜치 첫 커밋 ~ 마지막 커밋 간 경과
BRANCH="sprint/${SPRINT_NUM}"
DURATION_MIN=0
if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  FIRST_TS=$(git log "master..${BRANCH}" --reverse --format=%ct 2>/dev/null | head -1 || echo "")
  LAST_TS=$(git log "master..${BRANCH}" --format=%ct 2>/dev/null | head -1 || echo "")
  if [ -n "$FIRST_TS" ] && [ -n "$LAST_TS" ] && [ "$LAST_TS" -ge "$FIRST_TS" ]; then
    DURATION_MIN=$(( (LAST_TS - FIRST_TS) / 60 ))
  fi
fi

# Phase 추출 — MEMORY.md "Phase NN ... DONE/진행" 패턴 우선, 없으면 최대 Phase 번호
PHASE=""
MEM_FILE="$HOME/.claude/projects/-home-sinclair-work-axbd-Foundry-X/memory/MEMORY.md"
for src in "$MEM_FILE" CLAUDE.md SPEC.md; do
  [ -z "$PHASE" ] || break
  [ -f "$src" ] || continue
  # "Phase NN" 최대값 추출 (가장 최근 Phase로 가정)
  PHASE=$( (grep -oP 'Phase \K\d+' "$src" 2>/dev/null || true) | sort -n | tail -1)
done

# F-item 개수
F_COUNT=0
if [ -n "$F_ITEMS" ]; then
  F_COUNT=$(echo "$F_ITEMS" | tr ',' '\n' | grep -c '^F' || true)
fi

# JSON 직렬화 — 빈 값은 null로 기록
json_num() { local v="$1"; [ -z "$v" ] && echo "null" || echo "$v"; }
json_str() { local v="$1"; printf '"%s"' "${v//\"/\\\"}"; }

OUT_DIR="docs/metrics/velocity"
mkdir -p "$OUT_DIR"
OUT="${OUT_DIR}/sprint-${SPRINT_NUM}.json"

cat > "$OUT" <<JSON
{
  "sprint": ${SPRINT_NUM},
  "phase": $(json_num "$PHASE"),
  "f_items": $(json_str "$F_ITEMS"),
  "f_count": ${F_COUNT},
  "match_rate": $(json_num "$MATCH_RATE"),
  "duration_minutes": ${DURATION_MIN},
  "test_result": $(json_str "$TEST_RESULT"),
  "created": $(json_str "$CREATED"),
  "recorded_at": $(json_str "$(date -Iseconds)")
}
JSON

echo "✅ Velocity 기록: $OUT"
cat "$OUT"
