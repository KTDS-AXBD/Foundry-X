#!/usr/bin/env bash
# scripts/task/agent-plan.sh — 작업 계획 Agent
#
# 사용자 요청을 분석해서 Task/Sprint 분류 + 실행 계획을 제시.
# Master pane에서 실행. task-start.sh / sprint 호출 전 의사결정 지원.
#
# Usage: agent-plan.sh "<description>"
#
# 출력:
#   - 트랙 분류 (F/B/C/X)
#   - 규모 판정 (WT single task / Sprint multi-task / Quick fix)
#   - 의존성 분석 (변경 영역 충돌 여부)
#   - 실행 명령 제안

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

DESC="${1:?description required}"
REPO_ROOT=$(_repo_root)
PROJECT=$(basename "$REPO_ROOT")

# ─── 1. 키워드 기반 트랙 분류 ──────────────────────────────────────────────
classify_track() {
  local desc="$1"
  local desc_lower
  desc_lower=$(echo "$desc" | tr '[:upper:]' '[:lower:]')

  # Bug indicators
  if echo "$desc_lower" | grep -qE 'bug|fix|에러|오류|crash|broken|깨진|수정|hotfix|regression'; then
    echo "B"
    return
  fi

  # Chore/maintenance indicators
  if echo "$desc_lower" | grep -qE 'chore|점검|정리|cleanup|refactor|lint|migration|sync|동기화|갱신|업데이트|문서|docs'; then
    echo "C"
    return
  fi

  # Experiment/spike indicators
  if echo "$desc_lower" | grep -qE 'experiment|spike|poc|prototype|탐색|실험|검증|테스트|audit|조사|분석'; then
    echo "X"
    return
  fi

  # Feature indicators → Sprint route (F-track is Sprint-only)
  if echo "$desc_lower" | grep -qE 'feature|기능|신규|추가|구현|implement|새로운|new'; then
    echo "SPRINT"
    return
  fi

  # Default: Chore (F-track is reserved for Sprint/Phase)
  echo "C"
}

# ─── 2. 규모 판정 ──────────────────────────────────────────────────────────
estimate_scope() {
  local desc="$1"
  local desc_lower
  desc_lower=$(echo "$desc" | tr '[:upper:]' '[:lower:]')

  # Sprint indicators (multi-file, phased, large)
  local sprint_score=0
  echo "$desc_lower" | grep -qE 'sprint|페이즈|phase|여러|다수|전체|pipeline|파이프라인|리디자인|redesign|아키텍처|architecture' && sprint_score=$((sprint_score + 2))
  echo "$desc_lower" | grep -qE 'plan|설계|design|prd|기획' && sprint_score=$((sprint_score + 1))
  echo "$desc_lower" | grep -qE '통합|integration|연동|마이그레이션|migration' && sprint_score=$((sprint_score + 1))

  # Quick fix indicators
  local quick_score=0
  echo "$desc_lower" | grep -qE 'quick|빠른|간단|simple|한줄|one-line|typo|오타' && quick_score=$((quick_score + 2))
  echo "$desc_lower" | grep -qE 'config|설정|환경변수|env' && quick_score=$((quick_score + 1))

  if [ "$quick_score" -ge 2 ]; then
    echo "QUICK"
  elif [ "$sprint_score" -ge 3 ]; then
    echo "SPRINT"
  else
    echo "WT"
  fi
}

# ─── 3. 변경 영역 추정 ─────────────────────────────────────────────────────
estimate_scope_dirs() {
  local desc="$1"
  local dirs=""

  echo "$desc" | grep -qiE 'api|route|endpoint|서버|백엔드|backend|hono|worker' && dirs="${dirs} packages/api"
  echo "$desc" | grep -qiE 'web|ui|frontend|프론트|페이지|컴포넌트|component|react|대시보드|dashboard' && dirs="${dirs} packages/web"
  echo "$desc" | grep -qiE 'cli|command|tui|ink|터미널' && dirs="${dirs} packages/cli"
  echo "$desc" | grep -qiE 'shared|공유|타입|type|schema' && dirs="${dirs} packages/shared"
  echo "$desc" | grep -qiE 'e2e|playwright|테스트' && dirs="${dirs} packages/web/e2e"
  echo "$desc" | grep -qiE 'ci|cd|workflow|deploy|배포|github action' && dirs="${dirs} .github/workflows"
  echo "$desc" | grep -qiE 'migration|d1|database|db|테이블' && dirs="${dirs} packages/api/src/db"
  echo "$desc" | grep -qiE 'script|task|orchestr|오케스트' && dirs="${dirs} scripts/task"
  echo "$desc" | grep -qiE 'spec|요구사항|req' && dirs="${dirs} SPEC.md"
  echo "$desc" | grep -qiE 'skill|plugin|ax:|스킬' && dirs="${dirs} skills/"

  echo "${dirs:-  (판별 불가 — 작업 시작 후 확인 필요)}"
}

# ─── 4. WIP 충돌 분석 ──────────────────────────────────────────────────────
check_wip_conflicts() {
  local target_dirs="$1"
  local conflicts=""

  local active_tasks
  active_tasks=$(jq -r '.tasks | to_entries[] | select(.value.status=="in_progress") | "\(.key)|\(.value.branch)|\(.value.wt)"' "$FX_CACHE" 2>/dev/null || true)

  if [ -z "$active_tasks" ]; then
    echo "  활성 task 없음 — 충돌 위험 없음"
    return
  fi

  while IFS='|' read -r tid branch wt; do
    [ -z "$tid" ] && continue
    if [ -d "$wt" ]; then
      local changed_dirs
      changed_dirs=$(cd "$wt" && git diff --stat master..HEAD 2>/dev/null | head -20 | grep -oE '^[^|]+' | xargs -I{} dirname {} 2>/dev/null | sort -u | head -5 | tr '\n' ', ')
      if [ -n "$changed_dirs" ]; then
        # Check overlap
        for td in $target_dirs; do
          if echo "$changed_dirs" | grep -qi "$(basename "$td")"; then
            conflicts="${conflicts}\n  ⚠️  ${tid} (${branch}) — ${changed_dirs} 영역 겹침"
          fi
        done
      fi
      echo "  ${tid}: ${changed_dirs:-(변경 없음)}"
    else
      echo "  ${tid}: (WT 경로 없음)"
    fi
  done <<< "$active_tasks"

  if [ -n "$conflicts" ]; then
    echo ""
    echo -e "  충돌 가능:$conflicts"
  fi
}

# ─── 5. 실행 ──────────────────────────────────────────────────────────────
TRACK=$(classify_track "$DESC")
SCOPE=$(estimate_scope "$DESC")
SCOPE_DIRS=$(estimate_scope_dirs "$DESC")
WIP_CUR=$(wip_count)

case "$TRACK" in
  B) TRACK_LABEL="Bug Fix (B)" ;;
  C) TRACK_LABEL="Chore (C)" ;;
  X) TRACK_LABEL="Experiment (X)" ;;
  SPRINT) TRACK_LABEL="Feature → Sprint 경로 (F-track은 Sprint 전용)" ; SCOPE="SPRINT" ;;
esac

case "$SCOPE" in
  QUICK) SCOPE_LABEL="Quick Fix — master 직접 수정 가능" ;;
  WT) SCOPE_LABEL="WT Single Task — worktree 독립 실행" ;;
  SPRINT) SCOPE_LABEL="Sprint — 다단계 계획 필요" ;;
esac

# ─── 6. 제목 추출 (영문 slug용) ──────────────────────────────────────────
# 한국어에서 핵심 키워드만 영문으로 추출하는 간단 휴리스틱
SUGGESTED_TITLE=$(echo "$DESC" | tr -d '\n' | cut -c1-60)

cat <<EOF

┌─────────────────────────────────────────────────────────────
│  📋 작업 계획 Agent — 분석 결과
├─────────────────────────────────────────────────────────────
│
│  요청: ${DESC}
│
│  ▸ 트랙:    ${TRACK_LABEL}
│  ▸ 규모:    ${SCOPE_LABEL}
│  ▸ WIP:     ${WIP_CUR}/${WIP_CAP}
│
│  ▸ 영향 영역:
│  ${SCOPE_DIRS}
│
│  ▸ 활성 작업 영역:
$(check_wip_conflicts "$SCOPE_DIRS" | sed 's/^/│  /')
│
├─────────────────────────────────────────────────────────────
│  💡 제안 명령:
│
EOF

if [ "$SCOPE" = "QUICK" ]; then
  cat <<EOF
│  이 작업은 master에서 직접 수정 가능한 규모예요.
│  WT 생성 없이 진행하고 commit+push 하세요.
│
EOF
elif [ "$SCOPE" = "SPRINT" ]; then
  cat <<EOF
│  이 작업은 Sprint 규모예요. Plan/Design 선행이 필요해요.
│
│  1. SPEC.md에 F-item 등록
│  2. Plan 문서 작성: /pdca plan
│  3. Sprint 생성:    bash -i -c "sprint N"
│  4. Autopilot:      /ax:sprint-autopilot
│
EOF
elif [ "$WIP_CUR" -ge "$WIP_CAP" ]; then
  cat <<EOF
│  ⚠️  WIP cap (${WIP_CAP}) 도달. 기존 task 완료 후 실행하세요.
│
│  대기:  bash scripts/task/task-list.sh
│  강제:  FX_WIP_OVERRIDE=1 bash scripts/task/task-start.sh ${TRACK} "${SUGGESTED_TITLE}"
│
EOF
elif [ "$TRACK" = "SPRINT" ]; then
  : # already handled by SCOPE=SPRINT above
else
  cat <<EOF
│  bash scripts/task/task-start.sh ${TRACK} "<영문 제목>"
│
│  예시:
│  bash scripts/task/task-start.sh ${TRACK} "$(slugify "$SUGGESTED_TITLE")"
│
EOF
fi

echo "└─────────────────────────────────────────────────────────────"
