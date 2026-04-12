---
code: FX-DSGN-S89
title: "Sprint 89 — BD 프로세스 가이드 UI + 스킬 카탈로그 UI"
version: 1.0
status: Draft
category: DSGN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S89]], [[FX-SPEC-001]]"
---

# Sprint 89 Design: BD 프로세스 가이드 UI + 스킬 카탈로그 UI

## §1 개요

기존 `/ax-bd/discovery` 페이지에 있는 ProcessFlowV82 + TypeRoutingMatrix를 확장하여,
단계별 상세 가이드(프레임워크, 체크포인트, 스킬 추천)와 스킬 카탈로그를 독립 페이지로 제공한다.

### 핵심 원칙
- **정적 데이터 우선**: API/D1 없이 TypeScript 상수로 관리 (Git = SSOT)
- **기존 컴포넌트 재활용**: ProcessFlowV82, TypeRoutingMatrix는 import하여 재사용
- **Progressive Enhancement**: Sprint 90(F260)에서 스킬 실행 엔진 추가 시 카탈로그에 "실행" 버튼만 추가하면 됨

## §2 데이터 구조

### 2.1 프로세스 데이터 (`packages/web/src/data/bd-process.ts`)

```typescript
export interface BdStage {
  id: string;            // "2-0" ~ "2-10"
  name: string;          // 단계 이름
  description: string;   // 1~2줄 요약
  methodologies: string[];  // 방법론 목록
  frameworks: string[];     // 프레임워크 목록
  checkpoint?: {
    question: string;    // 사업성 판단 질문
    options: string[];   // Go / Pivot / Drop 등
  };
  skills: string[];      // 추천 스킬 ID 목록
}

export interface IntensityMatrix {
  [stageId: string]: Record<DiscoveryType, "core" | "normal" | "light">;
}
```

데이터 원본: `.claude/skills/ax-bd-discovery/SKILL.md` + `references/stages-detail.md`

### 2.2 스킬 카탈로그 데이터 (`packages/web/src/data/bd-skills.ts`)

```typescript
export interface BdSkill {
  id: string;            // "ai-biz:ecosystem-map" 등
  name: string;          // 표시명
  category: SkillCategory;
  description: string;   // 1줄 설명
  input?: string;        // 입력 설명
  output?: string;       // 산출물 설명
  stages: string[];      // 추천 단계 ("2-1", "2-3" 등)
  type: "skill" | "command";
}

export type SkillCategory =
  | "pm-skills"       // 34개
  | "ai-biz"          // 11개
  | "anthropic"       // 7개
  | "ai-framework"    // 7개
  | "management"      // 9개
  | "command";         // 36개

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  "pm-skills": "PM Skills",
  "ai-biz": "AI Biz",
  "anthropic": "Anthropic",
  "ai-framework": "AI Framework",
  "management": "경영전략",
  "command": "커맨드",
};
```

## §3 라우팅

```
/ax-bd/process-guide   → ProcessGuidePage (F258)
/ax-bd/skill-catalog   → SkillCatalogPage (F259)
```

`packages/web/src/router.tsx` 에 2줄 추가:

```typescript
{ path: "ax-bd/process-guide", lazy: () => import("@/routes/ax-bd/process-guide") },
{ path: "ax-bd/skill-catalog", lazy: () => import("@/routes/ax-bd/skill-catalog") },
```

## §4 컴포넌트 설계

### 4.1 F258 — 프로세스 가이드

#### ProcessGuidePage (`routes/ax-bd/process-guide.tsx`)
- 라우트 컴포넌트, `<ProcessGuide />` 렌더
- 기존 패턴: `export function Component()` (lazy import용)

#### ProcessGuide (`components/feature/ax-bd/ProcessGuide.tsx`)
- 기존 `ProcessFlowV82`를 상단에 배치 (축소 요약 모드)
- 11단계를 아코디언으로 나열
- 각 단계 펼치면: 설명, 방법론, 프레임워크, 추천 스킬, 사업성 체크포인트
- 상태: `expandedStage: string | null`

#### TypeIntensityMatrix (`components/feature/ax-bd/TypeIntensityMatrix.tsx`)
- 기존 `TypeRoutingMatrix`를 확장하여 클릭 시 해당 단계로 스크롤
- 또는 기존 컴포넌트를 그대로 재사용 (변경 최소화)

#### CheckpointTimeline (`components/feature/ax-bd/CheckpointTimeline.tsx`)
- 7개 사업성 체크포인트를 타임라인 형태로 시각화
- 2-5 Commit Gate는 강조 표시 (amber 테두리)

### 4.2 F259 — 스킬 카탈로그

#### SkillCatalogPage (`routes/ax-bd/skill-catalog.tsx`)
- 라우트 컴포넌트, `<SkillCatalog />` 렌더

#### SkillCatalog (`components/feature/ax-bd/SkillCatalog.tsx`)
- 상단: 검색 바 (`searchQuery` state) + 카테고리 필터 (Badge 토글)
- 중단: 단계 필터 (2-0~2-10 중 선택 → 해당 단계 추천 스킬만 표시)
- 하단: 스킬 그리드 (3열)
- 상태: `searchQuery`, `selectedCategory`, `selectedStage`

#### SkillCard (`components/feature/ax-bd/SkillCard.tsx`)
- 카드 UI: 이름, 카테고리 배지, 1줄 설명, 추천 단계 배지들
- 클릭 → 상세 모달 열기

#### SkillDetailModal (`components/feature/ax-bd/SkillDetailModal.tsx`)
- Dialog 컴포넌트 (shadcn/ui Dialog 기반)
- 내용: 이름, 카테고리, 상세 설명, 입력/산출물, 추천 단계
- Sprint 90에서 "실행" 버튼 추가 예정 (현재는 읽기 전용)

## §5 Worker 파일 매핑

### Worker 1: F258 프로세스 가이드

수정/생성 허용 파일:
- `packages/web/src/data/bd-process.ts` (신규)
- `packages/web/src/routes/ax-bd/process-guide.tsx` (신규)
- `packages/web/src/components/feature/ax-bd/ProcessGuide.tsx` (신규)
- `packages/web/src/components/feature/ax-bd/CheckpointTimeline.tsx` (신규)

### Worker 2: F259 스킬 카탈로그

수정/생성 허용 파일:
- `packages/web/src/data/bd-skills.ts` (신규)
- `packages/web/src/routes/ax-bd/skill-catalog.tsx` (신규)
- `packages/web/src/components/feature/ax-bd/SkillCatalog.tsx` (신규)
- `packages/web/src/components/feature/ax-bd/SkillCard.tsx` (신규)
- `packages/web/src/components/feature/ax-bd/SkillDetailModal.tsx` (신규)

### 공통 (리더 담당)
- `packages/web/src/router.tsx` (수정 — 2줄 추가)
- 사이드바 네비게이션 업데이트
- 테스트 파일 작성

## §6 네비게이션

AX BD 서브메뉴에 2개 항목 추가:

```
AX BD
├── 아이디어        /ax-bd/ideas       (기존)
├── Discovery       /ax-bd/discovery   (기존)
├── BMC            /ax-bd/bmc          (기존)
├── 프로세스 가이드  /ax-bd/process-guide (신규 F258)
└── 스킬 카탈로그    /ax-bd/skill-catalog (신규 F259)
```

## §7 테스트 전략

- 컴포넌트 단위 테스트 (vitest + @testing-library/react)
  - ProcessGuide: 아코디언 열림/닫힘, 단계 데이터 렌더링
  - SkillCatalog: 검색 필터링, 카테고리 필터링
  - SkillDetailModal: 열기/닫기
- 기존 ProcessFlowV82, TypeRoutingMatrix는 테스트 미추가 (기존 코드 변경 없음)
- typecheck + lint 통과 필수
