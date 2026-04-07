#!/usr/bin/env bash
# sync-claude-md.sh — SPEC.md 기반으로 CLAUDE.md 헤더 자동 동기화
# 용도: Sprint merge 시 자동 호출 (Sprint skill step 7b)
#       또는 독립 실행: bash scripts/sync-claude-md.sh
#
# 동기화 대상:
#   1. CLAUDE.md "현재 상태:" 줄 — 최신 Phase + Sprint 정보
#   2. CLAUDE.md "Phase N:" 줄 — 최신 Phase 상태 (📋→🔧→✅)

set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
SPEC="$ROOT/SPEC.md"
CLAUDE="$ROOT/CLAUDE.md"

if [ ! -f "$SPEC" ] || [ ! -f "$CLAUDE" ]; then
  echo "SPEC.md or CLAUDE.md not found" >&2
  exit 1
fi

# --- 1. SPEC.md에서 최신 Phase 정보 추출 ---

# Phase line from SPEC.md §1 (e.g., "**Phase**: **Phase 20** 📋 계획 ...")
PHASE_LINE=$(grep -m1 '^\- \*\*Phase\*\*:' "$SPEC" || true)

if [ -z "$PHASE_LINE" ]; then
  echo "No Phase line found in SPEC.md" >&2
  exit 0
fi

# Extract current active phase number (highest mentioned)
LATEST_PHASE=$(echo "$PHASE_LINE" | grep -oP 'Phase \d+' | tail -1 | grep -oP '\d+')

# Extract latest completed Sprint number from SPEC F-items (✅ status, highest Sprint number)
LATEST_SPRINT=$(grep -P '^\| F\d+ .* \| Sprint \d+' "$SPEC" | grep '✅' | grep -oP 'Sprint \d+' | grep -oP '\d+' | sort -n | tail -1)

if [ -z "$LATEST_SPRINT" ]; then
  LATEST_SPRINT="N/A"
fi

# Extract Phase title from SPEC (Phase N line)
PHASE_TITLE=$(echo "$PHASE_LINE" | grep -oP "Phase ${LATEST_PHASE}\*\*.*?—\s*\K[^(|]*" | sed 's/ *$//' || true)
if [ -z "$PHASE_TITLE" ]; then
  # Fallback: extract from the Phase N description
  PHASE_TITLE=$(echo "$PHASE_LINE" | grep -oP "Phase ${LATEST_PHASE}[^—]*— ([^|()]*)" | sed 's/.*— //' | sed 's/ *$//' || true)
fi

# Determine Phase status from SPEC
if echo "$PHASE_LINE" | grep -qP "Phase ${LATEST_PHASE}\*\* ✅"; then
  PHASE_STATUS="✅ 완료"
elif grep -qP "^\| F\d+.*Sprint \d+.*🔧" "$SPEC" | head -1; then
  PHASE_STATUS="🔧 진행 중"
else
  PHASE_STATUS="📋 계획"
fi

# Check if any F-items in latest phase are 🔧
if grep -P "^\| F\d+" "$SPEC" | grep -q "🔧"; then
  PHASE_STATUS="🔧 진행 중"
fi

# Get F-item range for latest phase — extract F-range closest to "Phase N" keyword
# The Phase line may contain multiple phases (e.g., "Phase 18 F363~F383 | Phase 20 F392~F401")
# Use perl to find F-range immediately after "Phase N"
F_RANGE=$(echo "$PHASE_LINE" | grep -oP "Phase ${LATEST_PHASE}[^F]*\KF\d+~F\d+" | head -1 || true)
if [ -z "$F_RANGE" ]; then
  # Fallback: last F-range on the line
  F_RANGE=$(echo "$PHASE_LINE" | grep -oP 'F\d+~F\d+' | tail -1 || true)
fi

echo "--- sync-claude-md ---"
echo "Phase: $LATEST_PHASE ($PHASE_STATUS)"
echo "Sprint: $LATEST_SPRINT"
echo "F-range: $F_RANGE"

# --- 2. CLAUDE.md 현재 상태 줄 갱신 ---

# Current line 10: **현재 상태:** Phase 17 ✅ 완료 (Sprint 164 ✅) — ...
CURRENT_STATUS=$(grep -n '^\*\*현재 상태:\*\*' "$CLAUDE" || true)
if [ -n "$CURRENT_STATUS" ]; then
  LINE_NUM=$(echo "$CURRENT_STATUS" | cut -d: -f1)

  # Build new status line
  NEW_STATUS="**현재 상태:** Phase ${LATEST_PHASE} ${PHASE_STATUS} (Sprint ${LATEST_SPRINT}) — ${F_RANGE:+$F_RANGE}"

  # Use sed to replace (in-place)
  sed -i "${LINE_NUM}s|.*|${NEW_STATUS}|" "$CLAUDE"
  echo "Updated: line $LINE_NUM → $NEW_STATUS"
fi

# --- 3. CLAUDE.md Phase N 줄 상태 갱신 ---

# Find the Phase N line in Current Phase section and update status emoji
PHASE_PATTERN="^\- \*\*Phase ${LATEST_PHASE}:\*\*"
if grep -qP "$PHASE_PATTERN" "$CLAUDE"; then
  # Replace 📋 with 🔧 if Sprint is in progress
  if [ "$PHASE_STATUS" = "🔧 진행 중" ]; then
    sed -i "/${PHASE_PATTERN}/s/📋 계획/🔧 진행 중/" "$CLAUDE"
    echo "Updated: Phase $LATEST_PHASE status → 🔧 진행 중"
  elif [ "$PHASE_STATUS" = "✅ 완료" ]; then
    sed -i "/${PHASE_PATTERN}/s/📋 계획\|🔧 진행 중/✅ 완료/" "$CLAUDE"
    echo "Updated: Phase $LATEST_PHASE status → ✅ 완료"
  fi
fi

echo "--- done ---"
