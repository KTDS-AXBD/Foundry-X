---
code: FX-DSGN-S247
title: "Sprint 247 Design — F505 Velocity 추적 + F506 Epic(Phase) 메타데이터"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-247)
sprint: 247
f_items: [F505, F506]
---

# Sprint 247 Design — Velocity 추적 + Epic(Phase) 메타데이터

## 1. 아키텍처 개요

### F505 — Velocity 추적

```
Sprint autopilot Step 7
  └─ record-sprint.sh {N}
       ├─ .sprint-context 읽기 (SPRINT_NUM/F_ITEMS/MATCH_RATE/TEST_RESULT)
       ├─ git log 시작~종료 시간 계산 (duration_minutes)
       ├─ SPEC.md에서 Phase 추출 (sprint→phase 매핑)
       └─ docs/metrics/velocity/sprint-{N}.json 기록

gov-retro (후속 스킬 수정)
  └─ phase-trend.sh {phase}
       └─ jq 집계 → 회고 섹션 주입
```

### F506 — Epic(Phase) 메타데이터

```
.github/phase-config.yml (SSOT)
        │
        ├─ setup-milestones.sh ──→ gh api /repos/.../milestones
        │                            (생성 또는 업데이트)
        │
        └─ phase-progress.sh ──→ gh api /milestones/{n} 
                                  → open/closed 비율 계산
```

## 2. F505 상세 설계

### 2.1 record-sprint.sh

**파일**: `scripts/velocity/record-sprint.sh` (신규, ~90줄)

**Usage**:
```bash
bash scripts/velocity/record-sprint.sh [SPRINT_NUM]
# 인자 없으면 .sprint-context에서 읽음
```

**동작**:
```bash
#!/usr/bin/env bash
set -euo pipefail

SPRINT_NUM="${1:-}"
if [ -z "$SPRINT_NUM" ] && [ -f .sprint-context ]; then
  SPRINT_NUM=$(grep "^SPRINT_NUM=" .sprint-context | cut -d= -f2)
fi
[ -z "$SPRINT_NUM" ] && { echo "ERROR: SPRINT_NUM 필요"; exit 1; }

F_ITEMS=$(grep "^F_ITEMS=" .sprint-context 2>/dev/null | cut -d= -f2 || echo "")
MATCH_RATE=$(grep "^MATCH_RATE=" .sprint-context 2>/dev/null | cut -d= -f2 || echo "")
TEST_RESULT=$(grep "^TEST_RESULT=" .sprint-context 2>/dev/null | cut -d= -f2 || echo "unknown")
CREATED=$(grep "^CREATED=" .sprint-context 2>/dev/null | cut -d= -f2 || date -Iseconds)

# duration: Sprint 브랜치 첫 커밋 ~ 마지막 커밋
BRANCH="sprint/${SPRINT_NUM}"
FIRST_TS=$(git log "master..${BRANCH}" --reverse --format=%ct 2>/dev/null | head -1 || echo "")
LAST_TS=$(git log "master..${BRANCH}" --format=%ct 2>/dev/null | head -1 || echo "")
if [ -n "$FIRST_TS" ] && [ -n "$LAST_TS" ]; then
  DURATION_MIN=$(( (LAST_TS - FIRST_TS) / 60 ))
else
  DURATION_MIN=0
fi

# Phase 추출 (SPEC.md에서 F-item 첫 번째의 Phase 찾기)
FIRST_F=$(echo "$F_ITEMS" | cut -d, -f1)
PHASE=$(grep -oP "Phase \d+" SPEC.md 2>/dev/null | head -1 | grep -oP '\d+' || echo "")

# F-item 수
F_COUNT=$(echo "$F_ITEMS" | tr ',' '\n' | grep -c '^F' || echo 0)

OUT_DIR="docs/metrics/velocity"
mkdir -p "$OUT_DIR"
OUT="${OUT_DIR}/sprint-${SPRINT_NUM}.json"

cat > "$OUT" <<JSON
{
  "sprint": ${SPRINT_NUM},
  "phase": ${PHASE:-null},
  "f_items": "${F_ITEMS}",
  "f_count": ${F_COUNT},
  "match_rate": ${MATCH_RATE:-null},
  "duration_minutes": ${DURATION_MIN},
  "test_result": "${TEST_RESULT}",
  "created": "${CREATED}",
  "recorded_at": "$(date -Iseconds)"
}
JSON

echo "✅ Velocity 기록: $OUT"
```

### 2.2 phase-trend.sh

**파일**: `scripts/velocity/phase-trend.sh` (신규, ~60줄)

**Usage**: `bash scripts/velocity/phase-trend.sh 31`

**출력 포맷**:
```
Phase 31 Velocity
- Sprints: 4 (241, 244, 245, 247)
- F-items: 8
- Match Rate 평균: 94.5%
- 평균 소요: 32분
- Test pass rate: 4/4 (100%)
```

**구현**:
```bash
#!/usr/bin/env bash
set -euo pipefail
PHASE="${1:?Usage: phase-trend.sh <phase_num>}"
DIR="docs/metrics/velocity"

[ -d "$DIR" ] || { echo "No velocity data yet"; exit 0; }

FILES=$(find "$DIR" -name 'sprint-*.json' -exec jq -r --argjson p "$PHASE" \
  'select(.phase == $p) | input_filename' {} \; 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "Phase ${PHASE}: no velocity data"
  exit 0
fi

TOTAL=$(echo "$FILES" | wc -l)
SPRINTS=$(echo "$FILES" | xargs -I{} jq -r '.sprint' {} | paste -sd, -)
F_TOTAL=$(echo "$FILES" | xargs -I{} jq '.f_count' {} | awk '{s+=$1} END {print s}')
MATCH_AVG=$(echo "$FILES" | xargs -I{} jq '.match_rate // 0' {} | awk '{s+=$1; n++} END {if(n>0) printf "%.1f", s/n; else print "N/A"}')
DUR_AVG=$(echo "$FILES" | xargs -I{} jq '.duration_minutes' {} | awk '{s+=$1; n++} END {if(n>0) printf "%.0f", s/n; else print 0}')
PASS=$(echo "$FILES" | xargs -I{} jq -r '.test_result' {} | grep -c '^pass$' || echo 0)

cat <<EOF
Phase ${PHASE} Velocity
- Sprints: ${TOTAL} (${SPRINTS})
- F-items: ${F_TOTAL}
- Match Rate 평균: ${MATCH_AVG}%
- 평균 소요: ${DUR_AVG}분
- Test pass rate: ${PASS}/${TOTAL}
EOF
```

### 2.3 소급 JSON (Phase 29~31)

`docs/metrics/velocity/` 하위 대표 Sprint 3개 수동 생성:
- `sprint-242.json` (Phase 30): F493
- `sprint-244.json` (Phase 31): F499/F500
- `sprint-245.json` (Phase 31): F501/F502

### 2.4 gov-retro 연동 가이드

**파일**: `docs/metrics/velocity/README.md` (신규)

내용:
- 파일 포맷 스키마 설명
- record-sprint.sh 수동 호출 방법
- gov-retro에 수동 주입하는 스니펫 (스킬 수정 전까지 임시)
- 예정: gov-retro 스킬이 자동 호출하도록 업데이트 (별도 세션)

## 3. F506 상세 설계

### 3.1 phase-config.yml

**파일**: `.github/phase-config.yml` (신규)

```yaml
# Foundry-X Phase (Epic) SSOT
# GitHub Milestones 생성용 — SPEC.md §5와 동기화 필수
version: 1
phases:
  - number: 29
    title: "Phase 29 — Discovery Item Detail"
    description: "F478~F489 발굴 상세/거버넌스"
    due_on: "2026-04-08T00:00:00Z"
    state: closed
  - number: 30
    title: "Phase 30 — 발굴/형상화 2-stage 재구조화"
    description: "F493~F496"
    due_on: "2026-04-09T00:00:00Z"
    state: closed
  - number: 31
    title: "Phase 31 — Task Orchestrator + Governance"
    description: "F497~F506"
    due_on: "2026-04-15T00:00:00Z"
    state: open
```

### 3.2 setup-milestones.sh

**파일**: `scripts/epic/setup-milestones.sh` (신규, ~100줄)

**Usage**:
```bash
bash scripts/epic/setup-milestones.sh [--dry-run]
```

**동작**:
```bash
#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

CONFIG=".github/phase-config.yml"
REPO="${GITHUB_REPO:-KTDS-AXBD/Foundry-X}"

[ -f "$CONFIG" ] || { echo "ERROR: $CONFIG not found"; exit 1; }

# yq 없이 awk로 yaml 파싱 (단순 구조)
# phases: 배열에서 number/title/description/due_on/state 추출
parse_phases() {
  python3 -c "
import sys, yaml, json
with open('$CONFIG') as f:
    d = yaml.safe_load(f)
for p in d['phases']:
    print(json.dumps(p))
" 2>/dev/null || {
    # python/yaml 없으면 grep 기반 fallback
    awk '
      /^  - number:/ {if(n) print n"|"t"|"d"|"due"|"s; n=$3; t=""; d=""; due=""; s=""}
      /^    title:/ {t=$0; sub(/^    title: *"?/, "", t); sub(/"?$/, "", t)}
      /^    description:/ {d=$0; sub(/^    description: *"?/, "", d); sub(/"?$/, "", d)}
      /^    due_on:/ {due=$0; sub(/^    due_on: *"?/, "", due); sub(/"?$/, "", due)}
      /^    state:/ {s=$2}
      END {if(n) print n"|"t"|"d"|"due"|"s}
    ' "$CONFIG"
  }
}

# Dry run: gh 없이도 동작
if [ "$DRY_RUN" -eq 1 ]; then
  echo "=== DRY RUN — Milestones to create/update ==="
  parse_phases | while IFS='|' read -r num title desc due state; do
    printf "  • #%s %s [state=%s, due=%s]\n" "$num" "$title" "$state" "$due"
  done
  exit 0
fi

# 실제 실행 — gh token 필수
command -v gh >/dev/null || { echo "ERROR: gh CLI 필요"; exit 1; }

parse_phases | while IFS='|' read -r num title desc due state; do
  # 기존 milestone 검색
  existing=$(gh api "repos/${REPO}/milestones?state=all" --jq \
    ".[] | select(.title==\"$title\") | .number" 2>/dev/null | head -1)
  if [ -n "$existing" ]; then
    echo "UPDATE milestone #$existing: $title"
    gh api -X PATCH "repos/${REPO}/milestones/${existing}" \
      -f title="$title" -f description="$desc" -f due_on="$due" -f state="$state" >/dev/null
  else
    echo "CREATE milestone: $title"
    gh api -X POST "repos/${REPO}/milestones" \
      -f title="$title" -f description="$desc" -f due_on="$due" -f state="$state" >/dev/null
  fi
  sleep 1
done
```

### 3.3 phase-progress.sh

**파일**: `scripts/epic/phase-progress.sh` (신규, ~60줄)

**Usage**: `bash scripts/epic/phase-progress.sh 31 [--dry-run]`

**출력**:
```
Phase 31 — Task Orchestrator + Governance
- Open: 2
- Closed: 8
- Progress: 80.0%
```

**구현**:
```bash
#!/usr/bin/env bash
set -euo pipefail
PHASE="${1:?Usage: phase-progress.sh <phase> [--dry-run]}"
DRY="${2:-}"

CONFIG=".github/phase-config.yml"
REPO="${GITHUB_REPO:-KTDS-AXBD/Foundry-X}"

# config에서 title 추출
TITLE=$(awk -v p="$PHASE" '
  /^  - number:/ {cur=$3}
  /^    title:/ && cur==p {sub(/^    title: *"?/, ""); sub(/"?$/, ""); print; exit}
' "$CONFIG")

[ -z "$TITLE" ] && { echo "Phase $PHASE not in $CONFIG"; exit 1; }

if [ "$DRY" = "--dry-run" ]; then
  echo "$TITLE"
  echo "- Open: (dry-run)"
  echo "- Closed: (dry-run)"
  echo "- Progress: (dry-run)%"
  exit 0
fi

command -v gh >/dev/null || { echo "ERROR: gh CLI 필요"; exit 1; }

DATA=$(gh api "repos/${REPO}/milestones?state=all" --jq \
  ".[] | select(.title==\"$TITLE\") | {open:.open_issues, closed:.closed_issues}" 2>/dev/null | head -1)

if [ -z "$DATA" ]; then
  echo "Milestone not found: $TITLE"
  exit 1
fi

OPEN=$(echo "$DATA" | jq -r '.open')
CLOSED=$(echo "$DATA" | jq -r '.closed')
TOTAL=$((OPEN + CLOSED))
if [ "$TOTAL" -eq 0 ]; then
  PCT="N/A"
else
  PCT=$(awk -v c="$CLOSED" -v t="$TOTAL" 'BEGIN {printf "%.1f", c/t*100}')
fi

cat <<EOF
$TITLE
- Open: $OPEN
- Closed: $CLOSED
- Progress: ${PCT}%
EOF
```

## 4. 파일 목록

### F505 신규 파일

| 파일 | 용도 | 예상 줄 수 |
|------|------|-----------|
| `scripts/velocity/record-sprint.sh` | Sprint 메트릭 JSON 기록 | ~90 |
| `scripts/velocity/phase-trend.sh` | Phase 단위 집계 | ~60 |
| `docs/metrics/velocity/README.md` | 포맷/연동 가이드 | ~50 |
| `docs/metrics/velocity/sprint-242.json` | Phase 30 소급 | ~12 |
| `docs/metrics/velocity/sprint-244.json` | Phase 31 소급 | ~12 |
| `docs/metrics/velocity/sprint-245.json` | Phase 31 소급 | ~12 |

### F506 신규 파일

| 파일 | 용도 | 예상 줄 수 |
|------|------|-----------|
| `.github/phase-config.yml` | Phase SSOT | ~30 |
| `scripts/epic/setup-milestones.sh` | Milestone 생성/동기화 | ~100 |
| `scripts/epic/phase-progress.sh` | 진행률 계산 | ~60 |

### 수정 파일

없음 (Sprint 247은 신규 추가만, 기존 코드 미변경 — drift 위험 최소화)

## 5. Worker 파일 매핑

단일 구현 — 파일 수가 적고 상호 의존(phase-config.yml 먼저 → 스크립트 검증) 있으므로 병렬 Agent 생략.

## 6. 구현 순서

### F505

```
1. scripts/velocity/record-sprint.sh 작성
2. scripts/velocity/phase-trend.sh 작성
3. docs/metrics/velocity/README.md 작성
4. 소급 JSON 3개 생성 (sprint-242/244/245)
5. 검증: bash scripts/velocity/record-sprint.sh 247 → sprint-247.json 생성
6. 검증: bash scripts/velocity/phase-trend.sh 31 → 집계 출력
```

### F506

```
1. .github/phase-config.yml 작성 (Phase 29~31)
2. scripts/epic/setup-milestones.sh 작성
3. scripts/epic/phase-progress.sh 작성
4. 검증: bash scripts/epic/setup-milestones.sh --dry-run → 3개 Phase 출력
5. 검증: bash scripts/epic/phase-progress.sh 31 --dry-run → 포맷 확인
```

### 검증 명령

```bash
# 스크립트 실행 권한
chmod +x scripts/velocity/*.sh scripts/epic/*.sh

# 기능 검증 (dry-run 우선)
bash scripts/velocity/record-sprint.sh 247
bash scripts/velocity/phase-trend.sh 31
bash scripts/epic/setup-milestones.sh --dry-run
bash scripts/epic/phase-progress.sh 31 --dry-run

# typecheck/test 불필요 (쉘 스크립트 + YAML + JSON만)
```

## 7. 의도적 제외 (Gap Analysis 참고용)

| 항목 | 사유 |
|------|------|
| gov-retro 스킬 본문 수정 | ~/.claude/plugins 외부 경로 — 별도 세션에서 처리 |
| session-end 스킬에 record-sprint 훅 주입 | 동일 사유 |
| Phase 1~28 소급 Milestone/JSON | 방대 — 최근 3 Phase만 |
| Actions workflow 자동 라벨→Milestone | 후속 Sprint — CLI 수동 검증 우선 |
| 실제 Milestone 생성 (live gh api) | 인증/승인 필요 — dry-run으로 코드 검증만 |

## 8. 리스크/완화

| 리스크 | 완화 |
|--------|------|
| `.sprint-context` MATCH_RATE 미기록 | record-sprint.sh가 null 허용 |
| YAML 파서 의존(python3/yaml) | awk fallback 내장 |
| gh CLI 미설치 환경 | `--dry-run`으로 우회 가능 |
| Phase 번호 drift | README에 "SPEC.md §5 갱신 시 phase-config.yml도 함께" 명시 |
