---
code: FX-DSGN-071
title: "Sprint 71 Design — F215 AX BD 스킬 팀 가이드"
version: 1.0
status: Active
category: DSGN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 71
features: [F215]
req: [FX-REQ-207]
refs: ["[[FX-PLAN-071]]"]
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F215 AX BD 스킬 팀 가이드 — Getting Started 페이지 확장 |
| **Sprint** | 71 |
| **Match Target** | 90%+ |
| **예상 파일** | 신규 6 + 수정 3 = 총 9 파일 |

| 관점 | 내용 |
|------|------|
| **Problem** | AX BD팀원이 ai-biz 11스킬 + ax-bd-discovery 오케스트레이터 사용법을 모름 |
| **Solution** | Getting Started 페이지를 탭으로 확장하여 4개 가이드 섹션 제공 |
| **Function UX Effect** | 5분 내 스킬 설치 → 첫 Discovery 프로세스 실행 |
| **Core Value** | 사업개발 프로세스 진입 장벽 제거 |

---

## §1 페이지 구조 설계

### 1.1 탭 네비게이션

기존 Getting Started 페이지(`page.tsx`, 556줄)를 **5개 탭**으로 분리:

| 탭 | ID | 내용 | 기존/신규 |
|----|----|------|-----------|
| 시작하기 | `start` | WelcomeBanner + WorkflowQuickstart + FeatureCards + Checklist | 기존 |
| 설치 가이드 | `setup` | CoworkSetupGuide (Cowork + CC 스킬 설치) | **신규** |
| 스킬 레퍼런스 | `skills` | SkillReferenceTable (11종 + 오케스트레이터) | **신규** |
| 프로세스 가이드 | `process` | ProcessLifecycleFlow (v8.2 시각화) | **신규** |
| FAQ | `faq` | TeamFaqSection (기존 5개 + 신규 팀 FAQ 통합) | **확장** |

### 1.2 URL 구조

탭 상태를 URL 파라미터로 관리: `/getting-started?tab=setup`

---

## §2 컴포넌트 상세 설계

### 2.1 CoworkSetupGuide.tsx

**목적**: pm-skills + ai-biz 플러그인 설치를 단계별로 안내

**구조**:
```
CoworkSetupGuide
├── EnvironmentSelector  (Cowork / Claude Code 토글)
├── StepCards[]          (번호 + 제목 + 명령어 + 설명)
│   ├── Step 1: 환경 확인 (Node.js, Claude Code 버전)
│   ├── Step 2: 플러그인 설치 (Cowork 또는 CC skills)
│   ├── Step 3: 설정 확인 (설치 검증 명령)
│   └── Step 4: 첫 실행 (ax-bd-discovery start)
└── TroubleshootingTip  (설치 실패 시 안내)
```

**Props**: 없음 (정적 가이드)

**데이터**: 하드코딩 (설치 절차는 변경 빈도 낮음)

### 2.2 SkillReferenceTable.tsx

**목적**: ai-biz 11종 스킬 + ax-bd-discovery 오케스트레이터 레퍼런스

**구조**:
```
SkillReferenceTable
├── SearchInput         (스킬 이름/키워드 검색)
├── CategoryFilter      (All / 분석 / 전략 / 실행 / 규제)
├── SkillGrid[]         (카드 그리드)
│   └── SkillCard       (이름 + 설명 + 트리거 + 카테고리 뱃지)
│       └── onClick → SkillDetailModal
└── OrchestratorSection (ax-bd-discovery 워크플로우 다이어그램)
    ├── StageFlow       (2-0 → 2-1 → ... → 2-10)
    └── CommandTable    (서브커맨드 레퍼런스)
```

**데이터**: API `GET /api/onboarding/skill-guide`에서 로드

**스킬 카테고리 매핑**:
| 카테고리 | 스킬 |
|----------|------|
| 분석 | ecosystem-map, moat-analysis, feasibility-study |
| 전략 | data-strategy, build-vs-buy, cost-model |
| 실행 | pilot-design, scale-playbook, partner-scorecard |
| 규제 | regulation-check |
| 보고 | ir-deck |

### 2.3 ProcessLifecycleFlow.tsx

**목적**: AX BD 6단계 라이프사이클 + 2단계 발굴 상세 흐름 시각화

**구조**:
```
ProcessLifecycleFlow
├── LifecycleStages     (6단계 수평 흐름)
│   ├── Stage 1: 수집
│   ├── Stage 2: 발굴 ← 클릭 시 상세 펼침
│   ├── Stage 3: 형상화
│   ├── Stage 4: 검증
│   ├── Stage 5: 제품화
│   └── Stage 6: GTM
├── DiscoveryDetail     (2단계 상세 — 조건부 표시)
│   ├── TypeClassifier  (I/M/P/T/S 5유형 설명)
│   ├── StageTimeline   (2-0 ~ 2-10 타임라인)
│   ├── IntensityMatrix (유형 × 단계 강도 매트릭스)
│   └── CommitGateInfo  (2-5 Commit Gate 설명)
└── LegendBar          (색상 범례: 핵심/보통/간소)
```

**데이터**: API `GET /api/onboarding/process-flow`에서 로드

### 2.4 TeamFaqSection.tsx

**목적**: 기존 FAQ + AX BD 팀 전용 FAQ 통합

**구조**:
```
TeamFaqSection
├── SearchInput        (키워드 검색)
├── CategoryTabs       (전체 / 일반 / AX BD / 트러블슈팅)
└── Accordion[]        (기존 Accordion 컴포넌트 재사용)
```

**FAQ 항목** (기존 5개 + 신규 5개):

| # | 카테고리 | 질문 |
|---|----------|------|
| 1 | 일반 | Foundry-X는 무엇인가요? (기존) |
| 2 | 일반 | 프로젝트를 어떻게 연결하나요? (기존) |
| 3 | 일반 | 에이전트는 어떤 일을 하나요? (기존) |
| 4 | 일반 | SDD Triangle이 무엇인가요? (기존) |
| 5 | 일반 | NPS 피드백은 어떻게 제출하나요? (기존) |
| 6 | AX BD | Cowork vs Claude Code — 어떤 걸 써야 하나요? |
| 7 | AX BD | ax-bd-discovery 오케스트레이터는 무엇인가요? |
| 8 | AX BD | 5유형(I/M/P/T/S) 분류는 어떻게 결정되나요? |
| 9 | 트러블슈팅 | 스킬이 작동하지 않을 때 확인할 사항 |
| 10 | 트러블슈팅 | 2-5 Commit Gate에서 Drop 판정을 받으면? |

---

## §3 API 설계

### 3.1 GET /api/onboarding/skill-guide

**응답 구조**:
```typescript
{
  orchestrator: {
    name: string;
    description: string;
    commands: Array<{ command: string; description: string }>;
    stages: Array<{ id: string; name: string; description: string }>;
  };
  skills: Array<{
    name: string;
    displayName: string;
    description: string;
    category: "analysis" | "strategy" | "execution" | "regulation" | "report";
    triggers: string[];
    frameworks: string[];
  }>;
}
```

### 3.2 GET /api/onboarding/process-flow

**응답 구조**:
```typescript
{
  lifecycle: Array<{
    stage: number;
    name: string;
    description: string;
    tools: string[];
  }>;
  discovery: {
    types: Array<{ code: string; name: string; description: string; icon: string }>;
    stages: Array<{ id: string; name: string; coreFor: string[]; normalFor: string[]; lightFor: string[] }>;
    commitGate: { stage: string; questions: string[] };
  };
}
```

### 3.3 GET /api/onboarding/team-faq

**응답 구조**:
```typescript
{
  categories: string[];
  items: Array<{
    id: string;
    category: string;
    question: string;
    answer: string;
  }>;
}
```

### 3.4 구현 방식

3개 엔드포인트 모두 **정적 데이터** 반환 (서비스 레이어에서 하드코딩 JSON):
- D1 불필요 (마이그레이션 없음)
- 향후 CMS 연동 시 서비스만 교체

---

## §4 파일 매핑

### 신규 파일 (6개)

| # | 파일 | 내용 |
|---|------|------|
| 1 | `packages/web/src/components/feature/CoworkSetupGuide.tsx` | 설치 가이드 컴포넌트 |
| 2 | `packages/web/src/components/feature/SkillReferenceTable.tsx` | 스킬 레퍼런스 컴포넌트 |
| 3 | `packages/web/src/components/feature/ProcessLifecycleFlow.tsx` | 프로세스 시각화 컴포넌트 |
| 4 | `packages/web/src/components/feature/TeamFaqSection.tsx` | 팀 FAQ 컴포넌트 |
| 5 | `packages/api/src/services/skill-guide.ts` | 스킬 가이드 서비스 (정적 데이터) |
| 6 | `packages/api/src/schemas/skill-guide.ts` | Zod 스키마 |

### 수정 파일 (3개)

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 7 | `packages/web/src/app/(app)/getting-started/page.tsx` | 탭 네비게이션 추가 + 4개 컴포넌트 import |
| 8 | `packages/api/src/routes/onboarding.ts` | 3개 엔드포인트 추가 |
| 9 | `packages/web/src/lib/api-client.ts` | 타입 + 함수 3개 추가 |

### 테스트 파일 (2개)

| # | 파일 | 대상 |
|---|------|------|
| 10 | `packages/web/src/__tests__/team-guide-components.test.tsx` | 4개 컴포넌트 통합 테스트 |
| 11 | `packages/api/src/__tests__/routes/onboarding-guide.test.ts` | 3개 API 엔드포인트 테스트 |

---

## §5 Worker 파일 매핑

### Worker 1: API 레이어 (서비스 + 스키마 + 라우트 + 테스트)

**수정 허용 파일**:
- `packages/api/src/services/skill-guide.ts` (신규)
- `packages/api/src/schemas/skill-guide.ts` (신규)
- `packages/api/src/routes/onboarding.ts` (확장)
- `packages/api/src/__tests__/routes/onboarding-guide.test.ts` (신규)

### Worker 2: Web 컴포넌트 + 페이지 (4개 컴포넌트 + 페이지 + 클라이언트 + 테스트)

**수정 허용 파일**:
- `packages/web/src/components/feature/CoworkSetupGuide.tsx` (신규)
- `packages/web/src/components/feature/SkillReferenceTable.tsx` (신규)
- `packages/web/src/components/feature/ProcessLifecycleFlow.tsx` (신규)
- `packages/web/src/components/feature/TeamFaqSection.tsx` (신규)
- `packages/web/src/app/(app)/getting-started/page.tsx` (수정)
- `packages/web/src/lib/api-client.ts` (확장)
- `packages/web/src/__tests__/team-guide-components.test.tsx` (신규)
