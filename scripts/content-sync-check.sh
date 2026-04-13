#!/usr/bin/env bash
# content-sync-check.sh — SPEC.md 실측값 vs 랜딩 콘텐츠 4파일 drift 감지
# 용도: session-end Phase 0c-3, daily-check Step 6c, 독립 실행
# 출력: JSON (--json) 또는 사람 읽기용 텍스트 (기본)
# 종료코드: 0=일치, 1=drift 있음

set -eo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# --- 대상 파일 ---
SPEC="SPEC.md"
README="README.md"
HERO="packages/web/content/landing/hero.md"
LANDING="packages/web/src/routes/landing.tsx"
FOOTER="packages/web/src/components/landing/footer.tsx"

# --- SPEC.md에서 SSOT 추출 ---
SPEC_LINE=$(grep '마지막 실측' "$SPEC" 2>/dev/null | head -1 || true)
if [ -z "$SPEC_LINE" ]; then
  echo "ERROR: SPEC.md에 '마지막 실측' 행이 없어요" >&2
  exit 2
fi

# Sprint 번호: "Sprint NNN," 패턴
SPRINT=$(echo "$SPEC_LINE" | grep -oP 'Sprint \K\d+' | head -1)

# Phase: CLAUDE.md "Current Phase" 섹션에서 첫 번째 Phase N 패턴 추출 (SSOT)
# CLAUDE.md에는 "Phase 37: Work Lifecycle Platform" 형태로 현재 Phase가 기재됨
CLAUDE_MD="CLAUDE.md"
if [ -f "$CLAUDE_MD" ]; then
  # "Phase NN:" 패턴 중 ✅ 없는 첫 번째 = 진행 중 Phase (없으면 가장 높은 번호 = 최신 완료)
  PHASE_LINE=$(grep -P '^\- \*\*Phase \d+' "$CLAUDE_MD" | grep -v '✅' | head -1 || true)
  if [ -z "$PHASE_LINE" ]; then
    # 모두 완료된 경우: 가장 높은 Phase 번호 선택
    PHASE_LINE=$(grep -P '^\- \*\*Phase \d+' "$CLAUDE_MD" | tail -1 || true)
  fi
  PHASE_NUM=$(echo "$PHASE_LINE" | grep -oP 'Phase \K\d+' || true)
  PHASE_TITLE=$(echo "$PHASE_LINE" | sed -E 's/.*Phase [0-9]+[: ]+//' | sed -E 's/\*\*.*$//' | xargs || true)
fi
# fallback: CLAUDE.md에서 못 찾으면 SPEC §3에서 가장 높은 ✅ Phase 사용
if [ -z "$PHASE_NUM" ]; then
  PHASE_NUM=$(grep -P 'Phase \d+.*✅' "$SPEC" | grep -oP 'Phase \K\d+' | sort -n | tail -1)
  if [ -z "$PHASE_NUM" ]; then
    PHASE_NUM=$(grep -P 'Phase \d+.*[📋🔧]' "$SPEC" | grep -oP 'Phase \K\d+' | sort -n | tail -1)
  fi
  PHASE_TITLE=""
fi

DRIFT_COUNT=0
DRIFTS=()

check_drift() {
  local file="$1" field="$2" expected="$3" actual="$4"
  if [ "$expected" != "$actual" ]; then
    DRIFTS+=("$file:$field: expected='$expected' actual='$actual'")
    DRIFT_COUNT=$((DRIFT_COUNT + 1))
  fi
}

# --- hero.md 점검 ---
if [ -f "$HERO" ]; then
  HERO_SPRINT=$(grep -oP 'value:\s*"\K\d+(?="$)' "$HERO" | tail -1 || true)
  HERO_PHASE=$(grep -oP 'phase:\s*"\KPhase \d+' "$HERO" || true)
  check_drift "$HERO" "sprint" "$SPRINT" "$HERO_SPRINT"
  check_drift "$HERO" "phase" "Phase $PHASE_NUM" "$HERO_PHASE"
fi

# --- landing.tsx 점검 ---
if [ -f "$LANDING" ]; then
  LT_SPRINT=$(grep -oP 'sprint:\s*"Sprint \K\d+' "$LANDING" | head -1 || true)
  LT_PHASE=$(grep -oP 'phase:\s*"Phase \K\d+' "$LANDING" | head -1 || true)
  LT_STATS_SPRINT=$(grep -A1 'label.*Sprints' "$LANDING" | grep -oP 'value:\s*"\K\d+' || true)
  # STATS_FALLBACK의 Sprints value는 label 위에 있으므로 다르게 추출
  if [ -z "$LT_STATS_SPRINT" ]; then
    LT_STATS_SPRINT=$(grep -B1 'Sprints' "$LANDING" | grep -oP '"\K\d+' | head -1 || true)
  fi
  check_drift "$LANDING" "SITE_META sprint" "$SPRINT" "$LT_SPRINT"
  check_drift "$LANDING" "SITE_META phase" "$PHASE_NUM" "$LT_PHASE"
  check_drift "$LANDING" "STATS sprint" "$SPRINT" "$LT_STATS_SPRINT"
fi

# --- footer.tsx 점검 ---
if [ -f "$FOOTER" ]; then
  FT_SPRINT=$(grep -oP 'Sprint \K\d+' "$FOOTER" | head -1 || true)
  FT_PHASE=$(grep -oP 'Phase \K\d+' "$FOOTER" | head -1 || true)
  check_drift "$FOOTER" "sprint" "$SPRINT" "$FT_SPRINT"
  check_drift "$FOOTER" "phase" "$PHASE_NUM" "$FT_PHASE"
fi

# --- README.md sync 블록 점검 ---
if [ -f "$README" ] && grep -q 'README_SYNC_START' "$README"; then
  RM_BLOCK=$(sed -n '/README_SYNC_START/,/README_SYNC_END/p' "$README")
  RM_SPRINT=$(echo "$RM_BLOCK" | grep -oP 'Sprint \K\d+' | head -1 || true)
  RM_PHASE=$(echo "$RM_BLOCK" | grep -oP 'Phase \| \K\d+' || true)
  # fallback: "Phase | 37" 패턴이 아니면 "Phase N" 패턴
  if [ -z "$RM_PHASE" ]; then
    RM_PHASE=$(echo "$RM_BLOCK" | grep -i 'phase' | grep -oP '^\| Phase \| \K\d+' || true)
  fi
  if [ -z "$RM_PHASE" ]; then
    RM_PHASE=$(echo "$RM_BLOCK" | grep -oP 'Phase \K\d+' | head -1 || true)
  fi
  check_drift "$README" "sprint" "$SPRINT" "$RM_SPRINT"
  check_drift "$README" "phase" "$PHASE_NUM" "$RM_PHASE"
fi

# --- 출력 ---
if [ "${1:-}" = "--json" ]; then
  echo "{\"drift_count\":$DRIFT_COUNT,\"sprint\":$SPRINT,\"phase\":$PHASE_NUM}"
else
  if [ "$DRIFT_COUNT" -eq 0 ]; then
    echo "content sync: OK (Sprint $SPRINT, Phase $PHASE_NUM)"
  else
    echo "content sync: DRIFT $DRIFT_COUNT건"
    for d in "${DRIFTS[@]}"; do
      echo "  - $d"
    done
  fi
fi

exit $((DRIFT_COUNT > 0 ? 1 : 0))
