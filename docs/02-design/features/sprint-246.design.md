---
code: FX-DSGN-S246
title: "Sprint 246 Design — F503/F504 Projects Board 연동"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-246)
sprint: 246
f_items: [F503, F504]
---

# Sprint 246 Design — Projects Board 연동 스크립트

## 1. 아키텍처 개요

```
/ax:todo (ax 스킬, 별도 관리)
  └─→ scripts/board/board-list.sh --column "Backlog"        → JSON
  └─→ scripts/board/board-sync-spec.sh                      → 매핑 리포트
  └─→ scripts/board/board-move.sh <issue> "Sprint Ready"    → 컬럼 이동

/ax:session-end + sprint-merge-monitor.sh
  └─→ scripts/board/board-on-merge.sh <pr>                  → Issue Done 이동
  └─→ scripts/board/pr-body-enrich.sh <pr> <sprint> <f> <m> → PR 본문 주입
```

모든 스크립트는 `scripts/board/` 하위에 배치, 공통 상수(OWNER/PROJECT_TITLE)는
`scripts/board/_common.sh`에서 소싱.

## 2. 공통 모듈 — `scripts/board/_common.sh`

```bash
#!/usr/bin/env bash
# Board 스크립트 공통 상수/헬퍼
set -euo pipefail

: "${OWNER:=KTDS-AXBD}"
: "${REPO:=KTDS-AXBD/Foundry-X}"
: "${PROJECT_TITLE:=Foundry-X Kanban}"

board::require() {
  command -v gh >/dev/null || { echo "gh CLI 필요" >&2; exit 1; }
  command -v jq >/dev/null || { echo "jq 필요" >&2; exit 1; }
}

board::project_num() {
  gh project list --owner "$OWNER" --format json 2>/dev/null \
    | jq -r --arg t "$PROJECT_TITLE" \
        '.projects[] | select(.title==$t) | .number' | head -1
}

board::status_field_id() {
  local num="$1"
  gh project field-list "$num" --owner "$OWNER" --format json 2>/dev/null \
    | jq -r '.fields[] | select(.name=="Status") | .id'
}

board::status_option_id() {
  local num="$1" col="$2"
  gh project field-list "$num" --owner "$OWNER" --format json 2>/dev/null \
    | jq -r --arg c "$col" \
        '.fields[] | select(.name=="Status") | .options[] | select(.name==$c) | .id'
}
```

## 3. F503 상세 설계

### 3.1 `board-list.sh` — Backlog 수집

**파일**: `scripts/board/board-list.sh` (신규, ~50줄)

```bash
#!/usr/bin/env bash
# Board 특정 컬럼의 아이템 목록 출력 (JSON)
# Usage: board-list.sh --column "Backlog"
source "$(dirname "$0")/_common.sh"
board::require

COLUMN="Backlog"
while [ $# -gt 0 ]; do
  case "$1" in
    --column) COLUMN="$2"; shift 2 ;;
    *) echo "unknown: $1" >&2; exit 2 ;;
  esac
done

PROJECT_NUM=$(board::project_num)
[ -z "$PROJECT_NUM" ] && { echo "프로젝트 없음" >&2; exit 1; }

gh project item-list "$PROJECT_NUM" --owner "$OWNER" --format json --limit 200 \
  | jq --arg col "$COLUMN" '
      .items
      | map(select(.status == $col and .content.type == "Issue"))
      | map({
          number: .content.number,
          title: .content.title,
          url: .content.url,
          labels: [.content.labels[]?.name // empty]
        })'
```

### 3.2 `board-move.sh` — 컬럼 이동

**파일**: `scripts/board/board-move.sh` (신규, ~60줄)

```bash
#!/usr/bin/env bash
# Board 아이템 컬럼 이동
# Usage: board-move.sh <issue-number> "Sprint Ready"
source "$(dirname "$0")/_common.sh"
board::require

ISSUE="$1"; COLUMN="$2"
[ -z "$ISSUE" ] && { echo "issue 번호 필요" >&2; exit 2; }
[ -z "$COLUMN" ] && { echo "컬럼 이름 필요" >&2; exit 2; }

PROJECT_NUM=$(board::project_num)
PROJECT_ID=$(gh project view "$PROJECT_NUM" --owner "$OWNER" --format json | jq -r '.id')
FIELD_ID=$(board::status_field_id "$PROJECT_NUM")
OPTION_ID=$(board::status_option_id "$PROJECT_NUM" "$COLUMN")

ITEM_ID=$(gh project item-list "$PROJECT_NUM" --owner "$OWNER" --format json --limit 200 \
  | jq -r --argjson n "$ISSUE" \
      '.items[] | select(.content.number == $n) | .id')

if [ -z "$ITEM_ID" ]; then
  URL="https://github.com/${REPO}/issues/${ISSUE}"
  ITEM_ID=$(gh project item-add "$PROJECT_NUM" --owner "$OWNER" --url "$URL" \
    --format json | jq -r '.id')
fi

gh project item-edit --id "$ITEM_ID" --project-id "$PROJECT_ID" \
  --field-id "$FIELD_ID" --single-select-option-id "$OPTION_ID"

echo "[board-move] #$ISSUE → $COLUMN"
```

### 3.3 `board-sync-spec.sh` — Board↔SPEC 매핑 리포트

**파일**: `scripts/board/board-sync-spec.sh` (신규, ~80줄)

```bash
#!/usr/bin/env bash
# Board 아이템의 F-item 코드를 SPEC.md 상태와 비교
# Usage: board-sync-spec.sh [--fix]
source "$(dirname "$0")/_common.sh"
board::require

FIX=false
[ "${1:-}" = "--fix" ] && FIX=true

PROJECT_NUM=$(board::project_num)
ITEMS=$(gh project item-list "$PROJECT_NUM" --owner "$OWNER" --format json --limit 200)

# Board 아이템별 (number, title, column, f-items)
echo "$ITEMS" | jq -r '
  .items[]
  | select(.content.type == "Issue")
  | [.content.number, .status // "none",
     (.content.title // "" | scan("F[0-9]{3,4}") // "-")]
  | @tsv' | while IFS=$'\t' read -r NUM COL FITEM; do

  [ "$FITEM" = "-" ] && continue

  SPEC_STATUS=$(grep -E "^\| $FITEM \|" SPEC.md 2>/dev/null \
    | awk -F'|' '{print $5}' | tr -d ' ' | head -1)

  printf '%-8s  #%-4s  Board=%-12s  SPEC=%s\n' "$FITEM" "$NUM" "$COL" "${SPEC_STATUS:-?}"
done
```

## 4. F504 상세 설계

### 4.1 `board-on-merge.sh` — Merge 후 Done 이동

**파일**: `scripts/board/board-on-merge.sh` (신규, ~50줄)

```bash
#!/usr/bin/env bash
# PR merge 완료 후 연관 Issue를 Done으로 이동
# Usage: board-on-merge.sh <pr-number>
source "$(dirname "$0")/_common.sh"
board::require

PR_NUM="$1"
[ -z "$PR_NUM" ] && { echo "PR 번호 필요" >&2; exit 2; }

# PR 본문 + 제목에서 closes #N / fixes #N 추출
ISSUE_REFS=$(gh pr view "$PR_NUM" --repo "$REPO" --json body,title \
  | jq -r '.title + " " + .body' \
  | grep -oiE '(close[sd]?|fix(e[sd])?|resolve[sd]?) #[0-9]+' \
  | grep -oE '#[0-9]+' | tr -d '#' | sort -u)

if [ -z "$ISSUE_REFS" ]; then
  echo "[board-on-merge] PR #$PR_NUM — 연관 Issue 없음"
  exit 0
fi

for ISSUE in $ISSUE_REFS; do
  bash "$(dirname "$0")/board-move.sh" "$ISSUE" "Done" || true
done
```

### 4.2 `pr-body-enrich.sh` — PR 본문 표준 섹션 주입

**파일**: `scripts/board/pr-body-enrich.sh` (신규, ~60줄)

```bash
#!/usr/bin/env bash
# PR 본문에 Sprint/F-items/Match Rate 표준 섹션 주입 (idempotent)
# Usage: pr-body-enrich.sh <pr-number> <sprint-num> <f-items> <match-rate>
source "$(dirname "$0")/_common.sh"
board::require

PR="$1"; SPRINT="$2"; FITEMS="$3"; MATCH="$4"
[ -z "$PR" ] && { echo "PR 번호 필요" >&2; exit 2; }

MARKER_START="<!-- fx-pr-enrich -->"
MARKER_END="<!-- /fx-pr-enrich -->"

CURRENT=$(gh pr view "$PR" --repo "$REPO" --json body --jq '.body' || echo "")

# 기존 marker 블록 제거
CLEANED=$(printf '%s\n' "$CURRENT" | awk -v s="$MARKER_START" -v e="$MARKER_END" '
  $0 ~ s {skip=1; next}
  $0 ~ e {skip=0; next}
  !skip {print}')

NEW_BLOCK=$(cat <<EOF
$MARKER_START
### Sprint Metadata
- Sprint: $SPRINT
- F-items: $FITEMS
- Match Rate: ${MATCH}%
$MARKER_END
EOF
)

NEW_BODY=$(printf '%s\n\n%s\n' "$CLEANED" "$NEW_BLOCK")
gh pr edit "$PR" --repo "$REPO" --body "$NEW_BODY"
echo "[pr-body-enrich] PR #$PR updated (Sprint=$SPRINT, F=$FITEMS, Match=${MATCH}%)"
```

### 4.3 merge-monitor 호출부

**변경**: `scripts/sprint-merge-monitor.sh`

merge 성공 후 2줄 추가:
```bash
# Board 동기화 (F504)
bash "${REPO_ROOT}/scripts/board/board-on-merge.sh" "$PR_NUM" || true
```

## 5. 파일 목록 / Worker 매핑

### 신규 파일 (단일 구현 — Worker 매핑 없음)

| 파일 | F-item | 줄 수 |
|------|--------|-------|
| `scripts/board/_common.sh` | F503+F504 | ~30 |
| `scripts/board/board-list.sh` | F503 | ~50 |
| `scripts/board/board-move.sh` | F503 | ~60 |
| `scripts/board/board-sync-spec.sh` | F503 | ~80 |
| `scripts/board/board-on-merge.sh` | F504 | ~50 |
| `scripts/board/pr-body-enrich.sh` | F504 | ~60 |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `scripts/sprint-merge-monitor.sh` | board-on-merge 호출 2줄 (있으면) |

## 6. 구현 순서

1. `_common.sh` 작성 — 공통 헬퍼
2. `board-list.sh`, `board-move.sh` — F503 핵심 2종
3. `board-sync-spec.sh` — F503 리포트
4. `board-on-merge.sh` — F504 merge 훅
5. `pr-body-enrich.sh` — F504 PR 본문 주입
6. `sprint-merge-monitor.sh`에 board-on-merge 호출 추가 (파일 존재 시)
7. 검증: `bash -n` syntax check + `shellcheck` (있으면)

## 7. 의도적 제외 (Gap Analysis 참고용)

| 항목 | 사유 |
|------|------|
| ax 스킬 파일(`/ax:todo`, `/ax:session-end`) 실제 수정 | marketplace+cache 별도 관리 (Sprint 245 전례) |
| Board 컬럼 실시간 webhook 동기화 | on-demand 호출로 충분 |
| GitHub Actions workflow | merge-monitor 로컬 처리 우선 |
| F503 `--fix` 모드(SPEC 자동 갱신) | 리포트만 우선, 자동 쓰기는 후속 Sprint |
