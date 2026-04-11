#!/usr/bin/env bash
# F505 — Phase 단위 velocity 집계
# Usage: bash scripts/velocity/phase-trend.sh <phase_num>
set -euo pipefail

PHASE="${1:-}"
if [ -z "$PHASE" ]; then
  echo "Usage: $0 <phase_num>" >&2
  exit 1
fi

DIR="docs/metrics/velocity"
if [ ! -d "$DIR" ]; then
  echo "No velocity data directory: $DIR"
  exit 0
fi

command -v jq >/dev/null || { echo "ERROR: jq 필요" >&2; exit 1; }

# Phase에 속한 JSON 파일 모으기
MATCHES=()
while IFS= read -r f; do
  p=$(jq -r '.phase // empty' "$f" 2>/dev/null || true)
  if [ "$p" = "$PHASE" ]; then
    MATCHES+=("$f")
  fi
done < <(find "$DIR" -maxdepth 1 -name 'sprint-*.json' | sort)

TOTAL=${#MATCHES[@]}
if [ "$TOTAL" -eq 0 ]; then
  echo "Phase ${PHASE}: no velocity data"
  exit 0
fi

SPRINTS=""
F_SUM=0
MR_SUM=0
MR_N=0
DUR_SUM=0
PASS=0
for f in "${MATCHES[@]}"; do
  s=$(jq -r '.sprint' "$f")
  fc=$(jq -r '.f_count' "$f")
  mr=$(jq -r '.match_rate // empty' "$f")
  du=$(jq -r '.duration_minutes' "$f")
  tr=$(jq -r '.test_result' "$f")
  SPRINTS="${SPRINTS:+$SPRINTS, }$s"
  F_SUM=$(( F_SUM + fc ))
  if [ -n "$mr" ]; then
    MR_SUM=$(awk -v a="$MR_SUM" -v b="$mr" 'BEGIN {print a+b}')
    MR_N=$(( MR_N + 1 ))
  fi
  DUR_SUM=$(( DUR_SUM + du ))
  [ "$tr" = "pass" ] && PASS=$(( PASS + 1 ))
done

if [ "$MR_N" -gt 0 ]; then
  MR_AVG=$(awk -v s="$MR_SUM" -v n="$MR_N" 'BEGIN {printf "%.1f", s/n}')
else
  MR_AVG="N/A"
fi
DUR_AVG=$(awk -v s="$DUR_SUM" -v n="$TOTAL" 'BEGIN {printf "%.0f", s/n}')

cat <<EOF
Phase ${PHASE} Velocity
- Sprints: ${TOTAL} (${SPRINTS})
- F-items: ${F_SUM}
- Match Rate 평균: ${MR_AVG}%
- 평균 소요: ${DUR_AVG}분
- Test pass rate: ${PASS}/${TOTAL}
EOF
