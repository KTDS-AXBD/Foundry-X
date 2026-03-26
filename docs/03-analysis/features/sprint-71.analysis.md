---
code: FX-ANLS-071
title: "Sprint 71 Gap Analysis — F215 AX BD 스킬 팀 가이드"
version: 1.0
status: Active
category: ANLS
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 71
features: [F215]
req: [FX-REQ-207]
refs: ["[[FX-DSGN-071]]", "[[FX-PLAN-071]]"]
---

# Sprint 71 Gap Analysis — F215 AX BD 스킬 팀 가이드

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: Foundry-X
> **Version**: web 0.1.0 / api 0.1.0
> **Analyst**: Sinclair Seo (AI-assisted)
> **Date**: 2026-03-26
> **Design Doc**: [sprint-71.design.md](../../02-design/features/sprint-71.design.md)
> **Plan Doc**: [sprint-71.plan.md](../../01-plan/features/sprint-71.plan.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Sprint 71 F215 구현물과 Design 문서 간 정합성 검증. 3개 API 엔드포인트 + 4개 Web 컴포넌트 + 페이지 통합이 설계대로 구현되었는지 확인.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/sprint-71.design.md`
- **Implementation**: API 6파일, Web 7파일 (신규 6 + 수정 3 + 테스트 2)
- **Verification**: Typecheck PASS, API 17/17 PASS, Web 17/17 PASS

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 78% | WARNING |
| Architecture Compliance | 95% | PASS |
| Convention Compliance | 98% | PASS |
| Test Coverage | 100% | PASS |
| **Overall** | **85%** | **WARNING** |

---

## 3. Gap Analysis (Design vs Implementation)

### 3.1 API Endpoints

| Design | Implementation | Status | Notes |
|--------|---------------|--------|-------|
| GET /api/onboarding/skill-guide | GET /api/onboarding/skill-guide | WARNING | 응답 구조 불일치 (3.2 참조) |
| GET /api/onboarding/process-flow | GET /api/onboarding/process-flow | WARNING | 응답 구조 불일치 (3.3 참조) |
| GET /api/onboarding/team-faq | GET /api/onboarding/team-faq | WARNING | 응답 구조 불일치 (3.4 참조) |

3개 엔드포인트 URL + HTTP 메서드는 일치하나, **응답 JSON 구조가 Design과 구현 간 불일치**.

### 3.2 CRITICAL: skill-guide 응답 구조 불일치

| Field | Design (DSGN-071 Section 3.1) | API 서비스 구현 | Web 클라이언트 타입 | 상태 |
|-------|------|------|------|------|
| `orchestrator.commands` | `Array<{command, description}>` | **없음** | `Array<{command, description}>` | API 누락 |
| `orchestrator.stages` | `Array<{id, name, description}>` | **`string[]`** | `Array<{id, name, description}>` | API 형식 다름 |
| `orchestrator.id` | 없음 | **있음** | 없음 | API 추가 |
| `orchestrator.discoveryTypes` | 없음 | **있음** | 없음 | API 추가 |
| `skills[].displayName` | 있음 | **없음** (`name`만 존재) | 있음 | API 누락 |
| `skills[].triggers` | `string[]` | **없음** (`examplePrompt`으로 대체) | `string[]` | API 변경 |
| `skills[].frameworks` | `string[]` | **없음** | `string[]` | API 누락 |
| `skills[].id` | 없음 | **있음** | 없음 | API 추가 |
| `skills[].examplePrompt` | 없음 | **있음** | 없음 | API 추가 |

**영향**: Web 클라이언트(`api-client.ts` SkillGuideResponse)가 Design 스펙 기준으로 타입 정의. 실제 API 응답과 불일치 => SkillReferenceTable 컴포넌트에서 `skill.displayName`, `skill.triggers`, `skill.frameworks` 접근 시 **런타임 undefined**.

### 3.3 CRITICAL: process-flow 응답 구조 불일치

| Field | Design (DSGN-071 Section 3.2) | API 서비스 구현 | Web 클라이언트 타입 | 상태 |
|-------|------|------|------|------|
| `lifecycle[].stage` (number) | 있음 | **`order`** (number) | `stage` | 키 이름 불일치 |
| `lifecycle[].tools` | `string[]` | **없음** | `string[]` | API 누락 |
| `lifecycle[].id` | 없음 | **있음** | 없음 | API 추가 |
| 최상위 키 `discovery` | 있음 | **`discoveryDetail`** | `discovery` | 키 이름 불일치 |
| `discovery.types[].name` | 있음 | **`label`** | `name` | 키 이름 불일치 |
| `discovery.types[].icon` | 있음 | **없음** | 있음 | API 누락 |
| `discovery.stages[].coreFor/normalFor/lightFor` | 있음 | **없음** (flat 구조 + `isGate`) | 있음 | API 구조 다름 |
| `discovery.commitGate` (별도 객체) | 있음 | **없음** (stages 배열 내 포함) | 있음 | API 구조 다름 |

**영향**: ProcessLifecycleFlow 컴포넌트가 `data.discovery.*` 경로로 접근하나, 실제 API는 `data.discoveryDetail.*` 반환 => **런타임 TypeError**.

### 3.4 team-faq 응답 구조 불일치

| Field | Design (DSGN-071 Section 3.3) | API 서비스 구현 | Web 클라이언트 타입 | 상태 |
|-------|------|------|------|------|
| `categories` | `string[]` | **없음** | `string[]` | API 누락 |
| `items` | 있음 | 있음 | 있음 | 일치 |

**영향**: TeamFaqSection이 `data.categories`를 사용하여 탭 생성. API가 categories를 반환하지 않으면 fallback으로 `["전체"]`만 표시 => 기능 저하 (카테고리 필터 작동 안 됨).

### 3.5 컴포넌트 구조

| Design 컴포넌트 | 구현 파일 | Status | Notes |
|-----------------|----------|--------|-------|
| CoworkSetupGuide | CoworkSetupGuide.tsx | WARNING | TroubleshootingTip 서브컴포넌트 미구현 |
| SkillReferenceTable | SkillReferenceTable.tsx | WARNING | SkillDetailModal 미구현 (onClick 없음) |
| ProcessLifecycleFlow | ProcessLifecycleFlow.tsx | WARNING | IntensityMatrix, StageTimeline 미구현 |
| TeamFaqSection | TeamFaqSection.tsx | PASS | CategoryTabs + SearchInput + Accordion 구현 |

### 3.6 페이지 통합

| Design 항목 | 구현 | Status |
|-------------|------|--------|
| 5개 탭 네비게이션 | Tabs 컴포넌트 + TAB_KEYS 5개 | PASS |
| URL 파라미터 `?tab=` | searchParams + router.replace | PASS |
| Lazy-load (탭 활성화 시 데이터 로드) | useEffect + activeTab 조건 | PASS |
| NPS Feedback 탭 외부 표시 | NpsFeedbackForm 하단 고정 | PASS |

### 3.7 파일 매핑

| Design 파일 | 구현 | Status |
|-------------|------|--------|
| services/skill-guide.ts (신규) | 구현됨 | PASS |
| schemas/skill-guide.ts (신규) | 구현됨 | PASS |
| routes/onboarding.ts (수정) | 3개 엔드포인트 추가 | PASS |
| CoworkSetupGuide.tsx (신규) | 구현됨 | PASS |
| SkillReferenceTable.tsx (신규) | 구현됨 | PASS |
| ProcessLifecycleFlow.tsx (신규) | 구현됨 | PASS |
| TeamFaqSection.tsx (신규) | 구현됨 | PASS |
| getting-started/page.tsx (수정) | 탭 통합 완료 | PASS |
| api-client.ts (수정) | 타입 + 함수 3개 추가 | PASS |

### 3.8 테스트 파일 매핑

| Design 테스트 구조 | 구현 | Status | Notes |
|---|---|---|---|
| API 테스트 (별도 파일) | `onboarding-guide.test.ts` 1개 | WARNING | Design은 `routes/` 하위 경로 명시, 실제 경로는 `__tests__/` 루트 |
| Web 테스트 (4개 개별) | `team-guide-components.test.tsx` 1개 통합 | WARNING | Design은 4개 개별 파일, 실제는 1개 통합 |

---

## 4. Missing Features (Design O, Implementation X)

| # | Item | Design Location | Description | Impact |
|---|------|-----------------|-------------|--------|
| 1 | orchestrator.commands | DSGN Section 3.1 | 서브커맨드 레퍼런스 데이터 미제공 | High |
| 2 | orchestrator.stages 객체 배열 | DSGN Section 3.1 | string[]로 구현 (id/name/description 없음) | High |
| 3 | skill.displayName/triggers/frameworks | DSGN Section 3.1 | examplePrompt으로 대체, 검색/필터 기능에 영향 | High |
| 4 | lifecycle.tools | DSGN Section 3.2 | 각 단계별 도구 목록 미제공 | Low |
| 5 | discovery.types[].icon | DSGN Section 3.2 | 아이콘 데이터 미제공 (컴포넌트에서 하드코딩) | Low |
| 6 | IntensityMatrix | DSGN Section 2.3 | 유형 x 단계 강도 매트릭스 미구현 | Medium |
| 7 | StageTimeline | DSGN Section 2.3 | 2-0~2-10 타임라인 미구현 | Medium |
| 8 | SkillDetailModal | DSGN Section 2.2 | onClick 상세 모달 미구현 | Medium |
| 9 | TroubleshootingTip | DSGN Section 2.1 | 설치 실패 시 안내 미구현 | Low |
| 10 | categories 필드 (team-faq) | DSGN Section 3.3 | API에서 categories 배열 미반환 | Medium |

## 5. Added Features (Design X, Implementation O)

| # | Item | Implementation Location | Description |
|---|------|------------------------|-------------|
| 1 | orchestrator.id | services/skill-guide.ts:19 | 오케스트레이터 식별자 추가 |
| 2 | orchestrator.discoveryTypes | services/skill-guide.ts:23 | 5유형 데이터를 orchestrator에 포함 |
| 3 | skill.id, skill.examplePrompt | services/skill-guide.ts:11-16 | 스킬 식별자 + 예시 프롬프트 |
| 4 | lifecycle.id, lifecycle.order | services/skill-guide.ts:31-36 | 단계 식별자 + 순서 명시 |
| 5 | discoveryDetail.stages[].isGate | services/skill-guide.ts:42-43 | Gate 여부 플래그 |
| 6 | discoveryDetail.stages[].gateQuestions | services/skill-guide.ts:43 | Gate 질문 인라인 포함 |

## 6. Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | 응답 키 이름 | `discovery` | `discoveryDetail` | **High** (런타임 에러) |
| 2 | 응답 키 이름 | `lifecycle[].stage` | `lifecycle[].order` | **High** (런타임 에러) |
| 3 | 응답 키 이름 | `types[].name` | `types[].label` | **High** (런타임 에러) |
| 4 | stages 구조 | `coreFor/normalFor/lightFor` per stage | flat `isGate/gateQuestions` | **High** (구조 변경) |
| 5 | FAQ 카테고리 | 일반(5) + AX BD(3) + 트러블슈팅(2) | general(5) + ax-bd(3) + troubleshooting(2) | Low (영문/한글 차이) |
| 6 | FAQ 질문 내용 | Design #1~#10 질문 목록 | 다른 질문 내용 | Low (기획 의도 유지) |
| 7 | 테스트 구조 | 개별 파일 4+1개 | 통합 파일 1+1개 | Low |

---

## 7. Architecture Compliance

### 7.1 Layer Structure (Dynamic Level)

| Layer | Expected | Actual | Status |
|-------|----------|--------|--------|
| Presentation | components/feature/*.tsx | components/feature/*.tsx | PASS |
| Application | lib/api-client.ts (service) | lib/api-client.ts | PASS |
| Domain | 타입 정의 (api-client.ts 내) | api-client.ts 내 인터페이스 | PASS |
| Infrastructure | fetchApi/postApi | lib/api-client.ts | PASS |

### 7.2 Dependency Direction

| Check | Status |
|-------|--------|
| Components -> api-client (OK: Presentation -> Application) | PASS |
| page.tsx -> Components + api-client (OK: Page -> Presentation + Application) | PASS |
| api-client -> fetch (OK: Infrastructure -> External) | PASS |
| API route -> service -> schema (OK: Route -> Service -> Schema) | PASS |

### 7.3 Architecture Score: 95%

- 감점: 컴포넌트 파일 내부에 SkillGuideData/ProcessFlowData 타입을 중복 정의 (api-client.ts 타입과 별도)

---

## 8. Convention Compliance

### 8.1 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components | PascalCase | 100% | - |
| Functions | camelCase | 100% | - |
| Constants | UPPER_SNAKE_CASE | 100% | CATEGORIES, TAB_KEYS, TAB_LABELS 등 |
| Files (component) | PascalCase.tsx | 100% | - |
| Files (utility) | camelCase.ts | 100% | - |
| Folders | kebab-case | 100% | - |

### 8.2 Import Order

모든 신규 파일에서 올바른 순서 유지:
1. External (react, lucide-react, next) -> 2. Internal (@/...) -> 3. Relative (./)

### 8.3 Convention Score: 98%

감점: SkillReferenceTable.tsx, ProcessLifecycleFlow.tsx에서 Props 타입을 export interface로 정의했으나, api-client.ts의 SkillGuideResponse/ProcessFlowResponse와 **구조가 다름** (타입 중복 + 불일치)

---

## 9. Match Rate Summary

```
+---------------------------------------------+
|  Overall Match Rate: 85%                     |
+---------------------------------------------+
|  PASS (완전 일치):    15 items (52%)          |
|  WARNING (부분 일치):  10 items (34%)          |
|  FAIL (미구현):        4 items (14%)          |
+---------------------------------------------+
|                                              |
|  API 응답 구조:        40% (3개 중 0개 일치)   |
|  컴포넌트 구조:        75% (서브컴포넌트 누락)  |
|  페이지 통합:          100%                    |
|  파일 매핑:            100%                    |
|  테스트:               90% (구조만 다름)        |
+---------------------------------------------+
```

---

## 10. Recommended Actions

### 10.1 Immediate (CRITICAL - API/Web 연동 에러 해결)

| # | Priority | Item | File | Description |
|---|----------|------|------|-------------|
| 1 | P0 | API skill-guide 응답 구조 수정 | services/skill-guide.ts | Design 스펙에 맞게 `commands`, `stages` 객체 배열, `displayName`/`triggers`/`frameworks` 추가 |
| 2 | P0 | API process-flow 응답 구조 수정 | services/skill-guide.ts | `discoveryDetail` -> `discovery`, `order` -> `stage`, `label` -> `name`, `commitGate` 분리, `coreFor/normalFor/lightFor` 추가 |
| 3 | P0 | API team-faq categories 추가 | services/skill-guide.ts | `categories: ["general", "ax-bd", "troubleshooting"]` 필드 추가 |
| 4 | P0 | Zod 스키마 동기화 | schemas/skill-guide.ts | API 응답 구조 변경에 맞춰 스키마 업데이트 |

### 10.2 Short-term (서브컴포넌트 보완)

| # | Priority | Item | File |
|---|----------|------|------|
| 5 | P1 | IntensityMatrix 구현 | ProcessLifecycleFlow.tsx |
| 6 | P1 | StageTimeline 구현 | ProcessLifecycleFlow.tsx |
| 7 | P1 | SkillDetailModal 구현 | SkillReferenceTable.tsx |
| 8 | P2 | TroubleshootingTip 추가 | CoworkSetupGuide.tsx |

### 10.3 Documentation Update (선택적)

Design 문서를 구현에 맞추려면:
- `skill.examplePrompt` 필드를 Design에 추가
- `orchestrator.id`, `skill.id` 필드를 Design에 추가
- `discoveryDetail.stages[].isGate/gateQuestions` 패턴을 Design에 반영

---

## 11. Synchronization Recommendation

**권장 방향: Option 1 — 구현을 Design에 맞추기**

근거:
- Web 클라이언트 타입이 이미 Design 스펙 기준으로 정의됨
- Web 컴포넌트가 Design 스펙의 필드를 참조 (displayName, triggers, discovery.commitGate 등)
- API만 수정하면 Web 측은 변경 불필요
- API 서비스가 정적 데이터 반환이므로 수정 비용 낮음

**구현 수정 범위 예상**:
- `services/skill-guide.ts`: 타입 + 데이터 구조 변경 (~50줄)
- `schemas/skill-guide.ts`: Zod 스키마 동기화 (~20줄)
- `__tests__/onboarding-guide.test.ts`: 검증 로직 일부 수정 (~10줄)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-26 | Initial gap analysis | Sinclair Seo (AI-assisted) |
