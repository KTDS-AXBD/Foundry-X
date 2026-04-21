#!/usr/bin/env bash
# content-sync-check.sh — SPEC.md 실측값 vs 랜딩 콘텐츠 4파일 drift 감지
# 용도: session-end Phase 0c-3, daily-check Step 6c, 독립 실행
# 출력: JSON (--json) 또는 사람 읽기용 텍스트 (기본)
# 종료코드: 0=일치, 1=drift 있음

set -eo pipefail

# 테스트 시 FOUNDRY_X_REPO_ROOT 환경변수로 repo root 오버라이드 가능
if [ -n "${FOUNDRY_X_REPO_ROOT:-}" ]; then
  REPO_ROOT="$FOUNDRY_X_REPO_ROOT"
else
  REPO_ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
fi
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

# Sprint 번호: SPEC §5 테이블의 ✅(완료) row만 필터링한 최고 Sprint 번호 (SSOT)
# PLANNED(📋) row 포함 시 미래 Sprint 번호가 expected로 잡혀 false positive 발생
SPRINT=$(grep -E '^\| F[0-9]' "$SPEC" | grep '✅' | grep -oP 'Sprint \K\d+' | sort -n | tail -1)

# Phase: "마지막 실측" 행에서 추출 (SSOT — F-item 설명에는 Phase 번호가 없는 row가 많음)
# fallback: ✅ F-item row 설명에서 Phase 번호 추출
PHASE_NUM=$(echo "$SPEC_LINE" | grep -oP 'Phase \K\d+' | head -1 || true)
if [ -z "$PHASE_NUM" ]; then
  PHASE_NUM=$(grep -E '^\| F[0-9]' "$SPEC" | grep '✅' | grep -oP 'Phase \K\d+' | sort -n | tail -1)
fi
PHASE_TITLE=""
# Phase title은 CLAUDE.md에서 추출 (있으면)
CLAUDE_MD="CLAUDE.md"
if [ -f "$CLAUDE_MD" ] && [ -n "$PHASE_NUM" ]; then
  PHASE_TITLE=$(grep -P "Phase $PHASE_NUM" "$CLAUDE_MD" | head -1 | sed -E 's/.*Phase [0-9]+[: ]+//' | sed -E 's/\*\*.*$//' | xargs 2>/dev/null || true)
fi

# ✅ row가 없으면 비교할 기준이 없으므로 skip
if [ -z "$SPRINT" ] && [ -z "$PHASE_NUM" ]; then
  echo "content sync: SKIP (no completed F-items in SPEC §5)"
  exit 0
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
