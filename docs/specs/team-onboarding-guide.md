---
code: FX-GUID-001
title: AX BD팀 프로젝트 관리 온보딩 가이드
version: 1.0
status: Active
category: GUID
system-version: 0.3.0
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# AX BD팀 프로젝트 관리 온보딩 가이드

> 이 문서는 AX BD팀(KTDS-AXBD org)에 합류하는 팀원이 프로젝트 관리 체계를 빠르게 파악하고 참여할 수 있도록 안내해요.

---

## 1. 핵심 원칙

- **Git이 진실** — 모든 문서와 코드는 Git 리포에 존재해요. 외부 도구가 아닌 Git이 SSOT(Single Source of Truth)예요.
- **GitHub Projects는 뷰** — WBS/일정은 GitHub Projects 보드에서 확인해요. 보드는 Git 데이터를 보여주는 렌즈 역할이에요.
- **PR 기반 리뷰** — 모든 변경(코드, 문서)은 Pull Request를 통해 리뷰받고 머지해요.

---

## 2. 시작하기 (5분 퀵스타트)

### Step 1: 프로젝트 현황 파악

| 어디를 봐야 하나요? | 무엇을 알 수 있나요? |
|-------------------|-------------------|
| `CLAUDE.md` (리포 루트) | 프로젝트 개요, 아키텍처, 기술 스택 |
| `SPEC.md` (리포 루트) | 현재 상태, 마일스톤, 요구사항(F-items), Tech Debt |
| `docs/INDEX.md` | 전체 문서 목록과 링크 |
| `CHANGELOG.md` | 최근 변경 이력 |
| [GitHub Projects 보드](https://github.com/orgs/KTDS-AXBD/projects/1) | WBS, 일정, 진행 상태 보드 |

### Step 2: 리포 클론 및 환경 설정

```bash
# 리포 클론
git clone https://github.com/KTDS-AXBD/Foundry-X.git
cd Foundry-X

# 의존성 설치 (Node.js 프로젝트인 경우)
pnpm install

# 빌드 확인
pnpm build
```

### Step 3: 첫 번째 작업 시작

1. **Projects 보드**에서 자신에게 배정된 Issue 확인
2. Feature 브랜치 생성: `git checkout -b feature/내-작업-설명`
3. 작업 수행
4. PR 생성 (아래 §4 참고)

---

## 3. 문서 구조 이해하기

각 프로젝트 리포는 다음 구조를 따라요:

```
리포 루트/
├── CLAUDE.md          ← 프로젝트 개요 (먼저 읽기)
├── SPEC.md            ← 요구사항 + 현재 상태 (핵심 문서)
├── CHANGELOG.md       ← 변경 이력
├── docs/
│   ├── INDEX.md       ← 문서 목차
│   ├── specs/         ← PRD, 기능 명세
│   ├── 01-plan/       ← 계획 문서
│   ├── 02-design/     ← 설계 문서
│   ├── 03-analysis/   ← 분석 결과
│   └── 04-report/     ← 완료 보고서
└── .github/
    ├── PULL_REQUEST_TEMPLATE.md  ← PR 작성 시 자동 로딩
    └── ISSUE_TEMPLATE/           ← Issue 생성 시 양식
```

### SPEC.md 읽는 법

SPEC.md의 가장 중요한 섹션:

| 섹션 | 내용 |
|------|------|
| **§2 현재 상태** | 지금 프로젝트가 어디까지 왔는지 |
| **§5 기능 항목 (F-items)** | 전체 작업 목록 + 상태 (📋 예정 / 🔧 진행 / ✅ 완료) |
| **§6 Execution Plan** | 스프린트별 실행 계획 + 체크리스트 |
| **§8 Tech Debt** | 알려진 기술 부채 |

---

## 4. PR(Pull Request) 워크플로우

### 4.1 브랜치 전략

```
master (보호됨)
  └── feature/내-작업     ← 여기서 작업
  └── fix/버그-설명       ← 버그 수정
  └── docs/문서-설명      ← 문서 작업
```

- `master`는 **직접 push 불가** (Branch Protection 적용)
- 모든 변경은 feature 브랜치 → PR → 리뷰 → Squash merge

### 4.2 PR 생성 방법

```bash
# 1. 변경사항 커밋
git add <파일들>
git commit -m "feat: 기능 설명"

# 2. 리모트에 push
git push -u origin feature/내-작업

# 3. PR 생성 (gh CLI 또는 GitHub 웹)
gh pr create --title "제목" --body "설명"
```

PR을 생성하면 **템플릿이 자동으로 로딩**돼요. 아래 항목을 채워 주세요:

- **변경 요약**: 무엇을, 왜 변경했는지
- **관련 항목**: F-Item 번호, REQ 코드, Issue 번호
- **변경 유형**: Feature / Bug fix / Documentation 등
- **체크리스트**: SPEC.md 갱신, 테스트 통과 등 확인

### 4.3 리뷰어 지정

| 산출물 유형 | 리뷰 필수? | 응답 기한 |
|------------|:--------:|:--------:|
| 코드 변경 | 필수 | 1 영업일 |
| 핵심 문서 (SPEC, PRD) | 필수 | 2 영업일 |
| 설정 파일, 기타 문서 | 선택 | — |

### 4.4 머지

- 리뷰어가 **Approve** 하면 **Squash and merge** 로 머지해요
- 머지 후 feature 브랜치는 자동 삭제돼요

---

## 5. GitHub Projects 보드 사용법

**보드 URL**: https://github.com/orgs/KTDS-AXBD/projects/1

### 5.1 보드 컬럼

| 컬럼 | 의미 | 대응 |
|------|------|------|
| **Todo** | 백로그 / 예정 | SPEC.md 📋 |
| **In Progress** | 현재 작업 중 | SPEC.md 🔧 |
| **Done** | 완료 | SPEC.md ✅ |

### 5.2 커스텀 필드

| 필드 | 설명 |
|------|------|
| **Priority** | 🔴 P0(즉시) / 🟠 P1(이번 마일스톤) / 🟡 P2(다음) / ⚪ P3(백로그) |
| **Work Type** | Feature / Bug / Improvement / Chore / Doc |
| **REQ Code** | 요구사항 코드 (예: FX-REQ-021) |
| **Deliverable** | 산출물 경로 (예: docs/01-plan/features/...) |

### 5.3 작업 흐름

```
1. Issue 확인 → 자신에게 Assign
2. Issue를 "In Progress"로 이동
3. 작업 수행 → PR 생성
4. 리뷰 완료 → 머지
5. Issue close → 자동으로 "Done"
```

---

## 6. 요구사항 관리

### 6.1 요구사항 코드 체계

- **형식**: `{프로젝트}-REQ-{번호}` (예: `FX-REQ-021`)
- **관리 위치**: SPEC.md §5 F-items 테이블
- **상태**: 📋 PLANNED → 🔧 IN_PROGRESS → ✅ DONE

### 6.2 새 요구사항 등록

1. SPEC.md의 F-items 테이블에 새 행 추가
2. GitHub Issue 생성 (Issue 템플릿 사용)
3. Projects 보드에 Issue 추가 + 필드 값 설정

---

## 7. 자주 묻는 질문

### Q: SPEC.md와 GitHub Issues가 다르면?

SPEC.md가 SSOT(진실의 원천)이에요. 불일치 발견 시 SPEC.md 기준으로 Issues를 수정해 주세요.

### Q: 긴급 hotfix는 어떻게 하나요?

Branch Protection을 임시 해제하고 직접 push할 수 있지만, **사후에 반드시 PR을 생성**하여 기록을 남겨야 해요. 관리자에게 요청하세요.

### Q: AI(Claude)와 협업하려면?

`CLAUDE.md`에 프로젝트 컨텍스트가 정리되어 있어서, Claude Code를 실행하면 자동으로 프로젝트를 이해해요. 특별한 설정 없이 바로 협업 가능해요.

### Q: 문서를 추가하거나 이동했어요.

`docs/INDEX.md`를 반드시 갱신해 주세요. 문서 인덱스는 팀원이 문서를 찾는 첫 번째 경로예요.

---

## 8. 유용한 링크

| 링크 | 설명 |
|------|------|
| [KTDS-AXBD/Foundry-X](https://github.com/KTDS-AXBD/Foundry-X) | Foundry-X 리포 |
| [Projects 보드](https://github.com/orgs/KTDS-AXBD/projects/1) | WBS / 일정 / 진행 상태 |
| [Issues](https://github.com/KTDS-AXBD/Foundry-X/issues) | 작업 목록 |
