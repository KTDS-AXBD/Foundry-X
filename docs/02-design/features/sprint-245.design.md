---
code: FX-DSGN-S245
title: "Sprint 245 Design — F501/F502 GitHub Projects Board + CHANGELOG 도입"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-245)
sprint: 245
f_items: [F501, F502]
---

# Sprint 245 Design — GitHub Projects Board + CHANGELOG 도입

## 1. 아키텍처 개요

### F501 — GitHub Projects Board

```
gh project create ──→ 6 컬럼 생성
                        ↓
gh issue list ──→ 라벨 기반 컬럼 배정 (bulk)
                        ↓
/ax:task start ──→ gh project item-add (자동)
                        ↓
Actions workflow ──→ 라벨 변경 시 컬럼 이동 (자동)
```

### F502 — CHANGELOG 자동화

```
/ax:session-end
  ↓
git log --oneline ──→ feat:/fix:/docs: 필터링
  ↓
CHANGELOG.md 갱신 ──→ [Unreleased] 섹션에 추가
  ↓
git tag (마일스톤) ──→ [Unreleased] → [vX.Y.Z] 전환
```

## 2. F501 상세 설계

### 2.1 프로젝트 생성 스크립트

**파일**: `scripts/github-project-setup.sh` (신규, ~120줄)

```bash
#!/usr/bin/env bash
# GitHub Projects Board 초기 설정
# Usage: bash scripts/github-project-setup.sh

REPO="KTDS-AXBD/Foundry-X"
PROJECT_TITLE="Foundry-X Kanban"

# 1. 프로젝트 생성
PROJECT_NUM=$(gh project create --owner KTDS-AXBD --title "$PROJECT_TITLE" --format json | jq '.number')

# 2. 6 컬럼 생성 (Status 필드에 옵션 추가)
COLUMNS=("Inbox" "Backlog" "Triaged" "Sprint Ready" "In Progress" "Done")
STATUS_FIELD_ID=$(gh project field-list "$PROJECT_NUM" --owner KTDS-AXBD --format json | \
  jq -r '.fields[] | select(.name=="Status") | .id')

for col in "${COLUMNS[@]}"; do
  gh api graphql -f query='
    mutation {
      updateProjectV2Field(input: {
        projectId: "'"$PROJECT_ID"'"
        fieldId: "'"$STATUS_FIELD_ID"'"
        singleSelectOptionId: null
      }) { projectV2Field { ... on ProjectV2SingleSelectField { options { id name } } } }
    }'
done

# 3. 기존 Issues 배치
gh issue list --repo "$REPO" --state open --limit 100 --json number,labels | \
  jq -c '.[]' | while read -r issue; do
    NUM=$(echo "$issue" | jq -r '.number')
    LABELS=$(echo "$issue" | jq -r '.labels[].name' | tr '\n' ',')

    # 프로젝트에 추가
    gh project item-add "$PROJECT_NUM" --owner KTDS-AXBD --url "https://github.com/$REPO/issues/$NUM"

    # 라벨→컬럼 매핑
    if echo "$LABELS" | grep -q "fx:status:in_progress"; then
      COLUMN="In Progress"
    elif echo "$LABELS" | grep -q "fx:status:planned"; then
      COLUMN="Sprint Ready"
    elif echo "$LABELS" | grep -q "fx:status:triaged"; then
      COLUMN="Triaged"
    else
      COLUMN="Inbox"
    fi
    # 컬럼 이동 (gh project item-edit)
    sleep 1  # rate limit 방지
done
```

### 2.2 /ax:task start 연동

**변경**: `scripts/task/task-start.sh` (기존 345줄)

Step 7 (GitHub Issue 생성) 직후에 프로젝트 추가:
```bash
# Step 7b: GitHub Projects 추가
PROJECT_NUM=$(gh project list --owner KTDS-AXBD --format json 2>/dev/null | \
  jq -r '.projects[] | select(.title=="Foundry-X Kanban") | .number')
if [ -n "$PROJECT_NUM" ]; then
  gh project item-add "$PROJECT_NUM" --owner KTDS-AXBD \
    --url "https://github.com/${GITHUB_REPO}/issues/${ISSUE_NUM}" 2>/dev/null
fi
```

### 2.3 Actions Workflow (선택적)

**파일**: `.github/workflows/project-automation.yml` (신규)

> 초기 버전에서는 CLI 스크립트로만 구현하고, Actions는 후속 Sprint에서 추가.
> 이유: Actions 테스트가 push 필요하여 Sprint 내 검증 어려움.

## 3. F502 상세 설계

### 3.1 CHANGELOG.md 초기 생성

**파일**: `CHANGELOG.md` (신규)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- F499: Task Orchestrator S-β — doctor/adopt/park + Master IPC
- F500: Sprint auto Monitor+Merge 파이프라인

## [Phase 31] - 2026-04-10

### Added
- F497: Task Orchestrator MVP (S-α) — start/list + daemon + 4-track

## [Phase 30] - 2026-04-09

### Added
- F493: 발굴 단계 평가결과서 v2 — 9탭 리치 리포트

### Fixed
- F494: 파이프라인 단계 전진 구조 버그
- F492: FileUploadZone API 경로 drift

### Changed
- F495: 파이프라인 재구조화 — 발굴/형상화 2-stage
- F496: 발굴 9기준 체크리스트 정보형 재설계

## [Phase 29] - 2026-04-08

### Added
- F488: req-manage --create-issue 기본화
- F489: gov-retro 회고 통합 소급 등록

### Fixed
- F490: E2E workflow shard 병렬화
- F491: 테스트 공유 Org 모드
```

### 3.2 session-end CHANGELOG 갱신 로직

**변경**: session-end 스킬 (ax-marketplace)

session-end Step에 CHANGELOG 갱신 추가:
```bash
# CHANGELOG.md 갱신 (session-end에서 호출)
if [ -f CHANGELOG.md ]; then
  # 마지막 session-end 이후 커밋 수집
  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  if [ -n "$LAST_TAG" ]; then
    COMMITS=$(git log --oneline "$LAST_TAG"..HEAD --grep="^feat:\|^fix:\|^docs:" 2>/dev/null)
  else
    COMMITS=$(git log --oneline -10 --grep="^feat:\|^fix:\|^docs:" 2>/dev/null)
  fi

  # Unreleased 섹션에 추가 (중복 방지)
  while IFS= read -r line; do
    MSG=$(echo "$line" | sed 's/^[a-f0-9]* //')
    if ! grep -qF "$MSG" CHANGELOG.md; then
      # feat: → Added, fix: → Fixed, docs: → Changed
      TYPE=$(echo "$MSG" | grep -oP '^(feat|fix|docs)')
      case "$TYPE" in
        feat) SECTION="Added" ;;
        fix)  SECTION="Fixed" ;;
        docs) SECTION="Changed" ;;
        *)    SECTION="Changed" ;;
      esac
      # [Unreleased] 아래 해당 섹션에 삽입
      sed -i "/## \[Unreleased\]/,/## \[/{/### ${SECTION}/a\\- ${MSG}}" CHANGELOG.md
    fi
  done <<< "$COMMITS"
fi
```

### 3.3 gov-retro Release Notes 연동

**변경**: gov-retro 스킬

마일스톤 태그 시 `[Unreleased]` → `[vX.Y.Z]` 전환:
```bash
# git tag 후
NEW_VERSION=$(git describe --tags --abbrev=0)
DATE=$(date +%Y-%m-%d)
sed -i "s/## \[Unreleased\]/## [Unreleased]\n\n## [$NEW_VERSION] - $DATE/" CHANGELOG.md
```

## 4. 파일 목록

### F501 신규 파일

| 파일 | 용도 | 예상 줄 수 |
|------|------|-----------|
| `scripts/github-project-setup.sh` | Projects Board 초기 설정 | ~120 |

### F501 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `scripts/task/task-start.sh` | Step 7b 프로젝트 추가 (~10줄) |

### F502 신규 파일

| 파일 | 용도 | 예상 줄 수 |
|------|------|-----------|
| `CHANGELOG.md` | Keep a Changelog 형식 | ~60 (초기) |

### F502 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| session-end 스킬 | CHANGELOG 갱신 로직 (~30줄) |
| gov-retro 스킬 | Release Notes 전환 (~10줄) |

## 5. 구현 순서

### F501 (Sprint 245-A)

```
1. scripts/github-project-setup.sh 작성
2. gh project create + 컬럼 생성 실행
3. 기존 open Issues 배치 (bulk)
4. task-start.sh Step 7b 추가
5. 검증: gh project view + task start 테스트
```

### F502 (Sprint 245-B)

```
1. CHANGELOG.md 초기 생성 (Phase 29~31 소급)
2. session-end 스킬 CHANGELOG 갱신 로직 추가
3. gov-retro 스킬 Release Notes 연동
4. 검증: session-end 실행 후 CHANGELOG 갱신 확인
```

## 6. 의도적 제외 (Gap Analysis 참고용)

| 항목 | 사유 |
|------|------|
| GitHub Actions project-automation.yml | Sprint 내 테스트 어려움 — CLI 스크립트로 대체, 후속 Sprint |
| CHANGELOG 전체 소급 (Phase 1~28) | 방대함 — git log으로 대체 가능 |
| Org-level Project | 단일 리포 범위로 충분 |
