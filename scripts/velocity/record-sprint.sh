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

# Phase 추출 — 우선순위:
#   1) .sprint-context PHASE=NN (명시적)
#   2) SPEC.md §5 에서 현재 Sprint 번호가 속한 Phase 행 검색
#   3) 첫 F-item이 SPEC.md Phase NN 표에 등장하는 위치
#   4) fallback: SPEC.md/CLAUDE.md/MEMORY.md의 최대 Phase 숫자
PHASE=""
PHASE=$(read_ctx PHASE)

# MEMORY.md — C10 symlink 이후 두 경로 모두 fallback
MEM_FILE=""
for candidate in \
  "$HOME/.claude-work/.claude/projects/-home-sinclair-work-axbd-Foundry-X/memory/MEMORY.md" \
  "$HOME/.claude/projects/-home-sinclair-work-axbd-Foundry-X/memory/MEMORY.md"; do
  if [ -f "$candidate" ]; then MEM_FILE="$candidate"; break; fi
done

# 2) SPEC.md에서 F-item 코드로 Phase 역매핑
if [ -z "$PHASE" ] && [ -n "$F_ITEMS" ] && [ -f SPEC.md ]; then
  FIRST_F=$(echo "$F_ITEMS" | tr ',' '\n' | head -1 | tr -d ' ')
  if [ -n "$FIRST_F" ]; then
    # SPEC.md 라인 번호 추출
    F_LINE=$(grep -nF "| ${FIRST_F} |" SPEC.md | head -1 | cut -d: -f1)
    if [ -n "$F_LINE" ]; then
      # F-item 이전 라인에서 가장 가까운 "Phase NN:" 헤더 검색
      PHASE=$(sed -n "1,${F_LINE}p" SPEC.md \
        | grep -oP '\*\*Phase \K\d+' | tail -1)
    fi
  fi
fi

# 3) fallback: 전체 문서 최대 Phase 번호
if [ -z "$PHASE" ]; then
  for src in SPEC.md CLAUDE.md "$MEM_FILE"; do
    [ -z "$PHASE" ] || break
    [ -n "$src" ] && [ -f "$src" ] || continue
    PHASE=$( (grep -oP 'Phase \K\d+' "$src" 2>/dev/null || true) | sort -n | tail -1)
  done
fi

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

# Clobber guard (S255 dogfood 교훈): 기존 파일에 F-items가 있고, 이번 실행이
# 빈 F-items (context 부재)라면 overwrite 거부 — 수동/backfill 데이터 보호
if [ -f "$OUT" ] && [ -z "$F_ITEMS" ]; then
  EXISTING_F=$(grep -oP '"f_items"\s*:\s*"\K[^"]+' "$OUT" 2>/dev/null || true)
  if [ -n "$EXISTING_F" ]; then
    echo "⏭️  $OUT 이미 존재 (f_items=$EXISTING_F) — F-items 없는 실행으로 overwrite 거부" >&2
    echo "   강제 갱신 필요 시 .sprint-context에 F_ITEMS= 를 설정하거나 --force 플래그 사용" >&2
    exit 0
  fi
fi

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
