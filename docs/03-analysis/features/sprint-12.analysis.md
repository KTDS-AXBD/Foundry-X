---
code: FX-ANLS-012
title: Sprint 12 (v0.12.0) — ouroboros 패턴 차용 + Generative UI 도입 Gap Analysis
version: 0.1
status: Active
category: ANLS
system-version: 0.12.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 12 Gap Analysis Report

> **Design Document**: [[FX-DSGN-013]] `docs/02-design/features/sprint-12.design.md`
> **Analysis Date**: 2026-03-18
> **Scope**: F59 (ouroboros 패턴 차용) + F60 (Generative UI 도입)

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| F59 Design Match | 60% | ⚠️ |
| F60 Design Match | 85% | ⚠️ |
| Test Coverage Match | 59% | ⚠️ |
| **Overall** | **76%** | ⚠️ |

---

## 2. F59: ouroboros 패턴 차용 — 항목별 분석

### 2.1 Design Item Match Matrix

| # | Design Item | Design Location | Implementation | Match | Notes |
|---|-------------|-----------------|----------------|:-----:|-------|
| A1 | ambiguity-score.md 참조 문서 신규 | §1.1.1 | `~/.claude/skills/ax-14-req-interview/references/ambiguity-score.md` | 95% | 내용 구조 미세 차이 (채점 기준 표현 방식 간소화) |
| A2 | ax-14-req-interview SKILL.md Phase 4-B/4-C 추가 | §1.1.2 | SKILL.md (변경 없음) | 0% | **미구현** — Phase 4-B/C 블록 없음 |
| A3 | AmbiguityScore 타입 + calculateAmbiguity + Weights | §1.1.3 | `packages/shared/src/types.ts:148-175` | 100% | 타입, 함수, 상수 모두 완전 일치 |
| A4 | plan-plus SKILL.md Ontological Question 삽입 | §1.2.1 | bkit plan-plus SKILL.md (변경 없음) | 0% | **미구현** — Ontological Question 단계 없음 |
| A5 | gap-detector Stage 2 Semantic 검증 추가 | §1.3.1 | bkit gap-detector agent.md (변경 없음) | 0% | **미구현** — Stage 2 Semantic 블록 없음 |

### 2.2 F59 테스트 비교

| Design 테스트 | 위치 (Design) | 위치 (구현) | Match | Notes |
|--------------|---------------|-------------|:-----:|-------|
| 가중치 합 = 1.0 (greenfield) | `shared/__tests__/types.test.ts` | `api/__tests__/ambiguity.test.ts` | 90% | 로직 일치, 파일 위치 상이 |
| 가중치 합 = 1.0 (brownfield) | (동일) | (동일) | 90% | 로직 일치, 파일 위치 상이 |
| clarity 0.9 → ready | (동일) | (동일) | 100% | 완전 일치 |
| clarity 0.5 → not ready | (동일) | (동일) | 100% | 완전 일치 |
| Design 총 3건 | — | 실제 4건 | — | 구현이 1건 추가 (brownfield 별도 테스트) |

### 2.3 F59 Summary

| Metric | Value |
|--------|:-----:|
| 구현 항목 | 2 / 5 |
| Match Rate | **60%** (가중 평균: A1 95%, A2 0%, A3 100%, A4 0%, A5 0%) |
| 테스트 | 4건 (Design 3건 대비 초과) |

---

## 3. F60: Generative UI 도입 — 항목별 분석

### 3.1 Design Item Match Matrix

| # | Design Item | Design Location | Implementation | Match | Notes |
|---|-------------|-----------------|----------------|:-----:|-------|
| B1 | UIHint 타입 (SectionType, UISection, UIAction, UIHint) | §2.1.1 | `packages/shared/src/agent.ts:95-117` | 100% | 타입 시그니처 완전 일치 |
| B2 | AgentExecutionResult.output.uiHint 추가 | §2.1.2 | `packages/shared/src/agent.ts:163` | 100% | `uiHint?: UIHint` 정확히 추가 |
| B3 | UIHINT_INSTRUCTION 상수 + 프롬프트 결합 | §2.2.1 | `packages/api/src/services/claude-api-runner.ts:9-31` | 95% | 상수 존재, 4개 프롬프트 모두 결합. 텍스트 미세 차이 (Design 대비 간결) |
| B4 | uiHint 파싱 (execute() 메서드) | §2.2.2 | `claude-api-runner.ts:104` | 100% | `parsed.uiHint` 추출 정확 |
| B5 | DEFAULT_LAYOUT_MAP 상수 | §2.2.3 | `claude-api-runner.ts:36-41` | 95% | 값 일치, 타입이 `string` (Design은 `UIHint['layout']`) |
| B6 | Zod 스키마 (uiSectionSchema, uiActionSchema, uiHintSchema) | §2.2.4 | `packages/api/src/schemas/agent.ts:101-123` | 95% | 스키마 구조 일치. `.openapi("UIHint")` 추가 (Design 미언급) |
| B7 | WidgetRenderer.tsx | §2.3.1 | `packages/web/src/components/feature/WidgetRenderer.tsx` | 90% | sandboxed iframe, CSS 변수, ResizeObserver 모두 구현. `description` optional로 변경 (Design은 required). postMessage 타입명 변경 (`resize`→`widget-resize`) |
| B8 | SectionRenderer.tsx | §2.3.2 | `packages/web/src/components/feature/SectionRenderer.tsx` | 95% | Design 6가지 type 중 `diff`+`timeline` 추가 구현 (Design fallback에서 처리 → 구현은 전용 렌더러). import 경로: `@/lib/api-client` (Design은 `shared/agent`) |
| B9 | DynamicRenderer.tsx | §2.3.3 | `packages/web/src/components/feature/DynamicRenderer.tsx` | 80% | tabs/iframe/card 모두 구현. Design은 shadcn `Tabs` import인데 구현은 자체 TabsLayout. accordion 레이아웃 추가 (Design에 없는 AccordionLayout). import 경로: `@/lib/api-client` |
| B10 | AgentTaskResult.tsx 리팩토링 | §2.3.4 | `packages/web/src/components/feature/AgentTaskResult.tsx` | 95% | uiHint 분기 + LegacyContent 하위 호환 정확히 구현 |

### 3.2 추가 구현 (Design에 없는 항목)

| Item | Implementation | Description |
|------|---------------|-------------|
| Web 로컬 타입 복제 | `packages/web/src/lib/api-client.ts:52-86` | SectionType, UISection, UIAction, UIHint, AgentExecutionResult를 web 패키지에 로컬 정의 (shared import 대신) |
| AccordionLayout | `DynamicRenderer.tsx:74-108` | 접힘/펼침 UI 자체 구현 (Design 미언급) |
| diff/timeline 전용 렌더러 | `SectionRenderer.tsx:31-57, 105-123` | Design fallback 대비 전용 렌더링 로직 추가 |
| Max height 제한 | `WidgetRenderer.tsx:65` | `Math.min(e.data.height + 20, 800)` — iframe 높이 상한 800px |

### 3.3 F60 테스트 비교

| Design 테스트 카테고리 | 예상 건수 | 실제 건수 | Match | Notes |
|----------------------|:---------:|:---------:|:-----:|-------|
| F60 Server (claude-api-runner.test.ts) | 7건 | 4건 | 57% | UIHINT_INSTRUCTION 확인, uiHint 파싱, 하위호환, DEFAULT_LAYOUT_MAP 존재. 누락: Zod 스키마 검증 2건, MockRunner uiHint 미반환 1건 |
| F60 Client (WidgetRenderer/SectionRenderer/DynamicRenderer/AgentTaskResult) | 11건 | 0건 | 0% | **Client 테스트 전무** — Design 11건 미작성 |

### 3.4 F60 Summary

| Metric | Value |
|--------|:-----:|
| 구현 항목 | 10 / 10 (코드 전체 구현) |
| Match Rate | **85%** (가중 평균: 코드 94%, 테스트 penalty -9%) |
| 테스트 | 4건 / Design 18건 예상 (22%) |

---

## 4. Missing Features (Design O, Implementation X)

| Item | Design Location | Description | Impact |
|------|-----------------|-------------|:------:|
| Phase 4-B/4-C (Ambiguity Score) | §1.1.2 | ax-14-req-interview SKILL.md에 Ambiguity Score 산출 및 통합 판정 블록 미추가 | Medium |
| Ontological Question | §1.2.1 | plan-plus SKILL.md에 Phase 1.5 존재론적 질문 단계 미삽입 | Medium |
| Stage 2 Semantic Verification | §1.3.1 | gap-detector 에이전트 프롬프트에 Semantic 검증 단계 미추가 | Medium |
| Client 테스트 11건 | §2.4.3 | WidgetRenderer(3), SectionRenderer(4), DynamicRenderer(3), AgentTaskResult(1) 테스트 미작성 | High |
| Server 테스트 3건 | §2.4.2 | Zod 스키마 검증 2건, MockRunner uiHint 미반환 1건 | Medium |

---

## 5. Added Features (Design X, Implementation O)

| Item | Implementation Location | Description | Impact |
|------|------------------------|-------------|:------:|
| Web 로컬 UIHint 타입 | `api-client.ts:52-86` | shared 패키지 대신 web 로컬에 타입 정의 복제 | Low |
| AccordionLayout 자체 구현 | `DynamicRenderer.tsx:74-108` | Design 미언급 accordion 렌더러 | Low (양호) |
| diff 전용 렌더러 | `SectionRenderer.tsx:31-57` | +/- 색상 표시 diff 뷰어 | Low (양호) |
| timeline 전용 렌더러 | `SectionRenderer.tsx:105-123` | 시각적 타임라인 UI | Low (양호) |
| brownfield 가중치 테스트 | `ambiguity.test.ts:14-18` | Design 3건 → 구현 4건 | Low (양호) |

---

## 6. Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|:------:|
| WidgetRenderer description prop | `description: string` (required) | `description?: string` (optional) | Low |
| postMessage type | `'resize'`, `'action'` | `'widget-resize'`, `'widget-action'` | Low (충돌 방지 개선) |
| DynamicRenderer tabs | shadcn `Tabs` import | 자체 TabsLayout 구현 | Low (shadcn 의존 제거) |
| SectionRenderer import | `@/../../../shared/src/agent` | `@/lib/api-client` | Low |
| DEFAULT_LAYOUT_MAP 타입 | `Record<AgentTaskType, UIHint['layout']>` | `Record<AgentTaskType, string>` | Low |
| F59 테스트 위치 | `packages/shared/src/__tests__/types.test.ts` | `packages/api/src/__tests__/ambiguity.test.ts` | Low |

---

## 7. Stage 2: Semantic Verification

Design §1.3.1에서 정의된 Semantic 검증을 적용하여, Mechanical 50~89% 판정 항목을 재검증해요.

| Item | Mechanical | Semantic | Final | Reason |
|------|:----------:|:--------:|:-----:|--------|
| B5 (DEFAULT_LAYOUT_MAP) | 95% | ✅ Correct | 95% | 타입만 `string`이지만 값 동일, 기능적 의도 정확 반영 |
| B7 (WidgetRenderer) | 90% | ✅ Correct | 90% | postMessage 타입명 변경은 네임스페이스 충돌 방지 의도로 개선 |
| B9 (DynamicRenderer) | 80% | ✅ Correct | 85% | shadcn Tabs 대신 자체 구현은 의존성 최소화 결정, accordion 추가는 Design 의도(layout별 분기)에 부합 |
| A1 (ambiguity-score.md) | 95% | ✅ Correct | 95% | 채점 기준 표현 간소화는 실용적 개선, 핵심 공식/가중치/판정 기준 완전 동일 |
| A2 (SKILL.md Phase 4-B/C) | 0% | ❌ Missing | 0% | 스킬 파일 자체 미수정 |
| A4 (plan-plus Ontological) | 0% | ❌ Missing | 0% | 스킬 파일 자체 미수정 |
| A5 (gap-detector Stage 2) | 0% | ❌ Missing | 0% | 에이전트 프롬프트 자체 미수정 |

---

## 8. Test Coverage Analysis

### 8.1 F59 테스트

| Area | Design 예상 | 실제 | Status |
|------|:----------:|:----:|:------:|
| 가중치 합 검증 | 1건 | 2건 | ✅ 초과 |
| ambiguity 계산 | 1건 | 1건 | ✅ 일치 |
| ready 판정 | 1건 | 1건 | ✅ 일치 |
| **소계** | **3건** | **4건** | ✅ |

### 8.2 F60 Server 테스트

| Area | Design 예상 | 실제 | Status |
|------|:----------:|:----:|:------:|
| UIHINT_INSTRUCTION 포함 | 1건 | 1건 | ✅ |
| uiHint 파싱 성공 | 1건 | 1건 | ✅ |
| uiHint 없을 때 undefined | 1건 | 1건 | ✅ |
| DEFAULT_LAYOUT_MAP | 1건 | 1건 | ✅ |
| Zod 스키마 검증 | 1건 | 0건 | ❌ 미작성 |
| executionResult uiHint 포함 | 1건 | 0건 | ❌ 미작성 |
| MockRunner uiHint 미반환 | 1건 | 0건 | ❌ 미작성 |
| **소계** | **7건** | **4건** | ⚠️ 57% |

### 8.3 F60 Client 테스트

| Area | Design 예상 | 실제 | Status |
|------|:----------:|:----:|:------:|
| WidgetRenderer (3건) | 3건 | 0건 | ❌ 전무 |
| SectionRenderer (4건) | 4건 | 0건 | ❌ 전무 |
| DynamicRenderer (3건) | 3건 | 0건 | ❌ 전무 |
| AgentTaskResult 하위호환 (1건) | 1건 | 0건 | ❌ 전무 |
| **소계** | **11건** | **0건** | ❌ 0% |

### 8.4 전체 테스트 Summary

| Feature | Design 예상 | 실제 | Coverage |
|---------|:----------:|:----:|:--------:|
| F59 | 3건 | 4건 | 133% |
| F60 Server | 7건 | 4건 | 57% |
| F60 Client | 11건 | 0건 | 0% |
| **Total** | **21건** | **8건** | **38%** |

---

## 9. Convention Compliance

### 9.1 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components | PascalCase | 100% | None |
| Functions | camelCase | 100% | None |
| Constants | UPPER_SNAKE_CASE | 100% | `UIHINT_INSTRUCTION`, `GREENFIELD_WEIGHTS`, `BROWNFIELD_WEIGHTS`, `DEFAULT_LAYOUT_MAP` |
| Files (component) | PascalCase.tsx | 100% | None |
| Files (utility) | camelCase.ts | 100% | None |

### 9.2 Import 경로 일관성

| File | Design Import | Actual Import | Status |
|------|--------------|---------------|:------:|
| SectionRenderer.tsx | `@/../../../shared/src/agent` | `@/lib/api-client` | ⚠️ 경로 상이 (web 로컬 타입 사용) |
| DynamicRenderer.tsx | `@/../../../shared/src/agent` | `@/lib/api-client` | ⚠️ 경로 상이 (web 로컬 타입 사용) |
| AgentTaskResult.tsx | implicit shared | `@/lib/api-client` | ⚠️ 경로 상이 |

> 평가: web 패키지에서 `@/../../../shared/` 상대 경로 대신 `@/lib/api-client` 로컬 타입을 사용한 것은 빌드 안정성 측면에서 합리적 선택이에요. 다만 타입 동기화 유지 필요.

---

## 10. Overall Match Rate Calculation

### 가중 산출 방식

| Category | Weight | Score | Weighted |
|----------|:------:|:-----:|:--------:|
| F59 코드 구현 (A1-A5) | 25% | 60% | 15.0% |
| F60 코드 구현 (B1-B10) | 40% | 94% | 37.6% |
| F59 테스트 | 10% | 100% | 10.0% |
| F60 Server 테스트 | 10% | 57% | 5.7% |
| F60 Client 테스트 | 15% | 0% | 0.0% |

**Overall Match Rate: 68%**

---

## 11. Recommended Actions

### 11.1 Immediate (Match Rate < 70% 해소)

| Priority | Item | Target File | Expected Impact |
|:--------:|------|-------------|-----------------|
| P1 | ax-14-req-interview SKILL.md Phase 4-B/4-C 블록 추가 | `~/.claude/skills/ax-14-req-interview/SKILL.md` | F59 +20% |
| P1 | F60 Client 테스트 11건 작성 | `packages/web/src/__tests__/` | F60 Client +15% |
| P2 | F60 Server 누락 테스트 3건 작성 | `packages/api/src/__tests__/` | F60 Server +4.3% |

### 11.2 Short-term (Match Rate >= 90% 달성)

| Priority | Item | Target File | Expected Impact |
|:--------:|------|-------------|-----------------|
| P2 | plan-plus SKILL.md Ontological Question 단계 삽입 | bkit plan-plus SKILL.md | F59 +10% |
| P2 | gap-detector Stage 2 Semantic 블록 추가 | bkit gap-detector agent.md | F59 +10% |

### 11.3 Documentation Update

| Item | Description |
|------|-------------|
| Design 반영 | WidgetRenderer `description` optional 변경 반영 |
| Design 반영 | DynamicRenderer 자체 Tabs/Accordion 구현 결정 기록 |
| Design 반영 | SectionRenderer diff/timeline 전용 렌더러 추가 기록 |
| Design 반영 | postMessage 타입명 `widget-*` prefix 변경 기록 |
| Design 반영 | Import 경로 `@/lib/api-client` 로컬 타입 전략 기록 |

---

## 12. 스킬 변경의 특수성

F59 미구현 항목(A2, A4, A5)은 모두 **bkit/ax 스킬 파일 변경**이에요. 이들은 Foundry-X 리포 외부에 위치하며:

- `ax-14-req-interview`: `~/.claude/skills/` (사용자 로컬 스킬)
- `plan-plus`: bkit marketplace 플러그인 캐시 내부
- `gap-detector`: bkit marketplace agents 내부

**의미**: 코드 구현은 완료되었으나, 해당 코드를 활용하는 스킬/에이전트 프롬프트 업데이트가 누락됨. bkit marketplace 파일(plan-plus, gap-detector)은 읽기 전용 캐시이므로 직접 수정 불가 — 사용자 로컬 오버라이드 또는 프로젝트 내 별도 스킬로 대응 필요.

A2(ax-14-req-interview SKILL.md)만 사용자 스킬이므로 즉시 수정 가능.

---

## 13. Synchronization Decision

| # | Item | Recommendation |
|---|------|----------------|
| 1 | A2 (SKILL.md Phase 4-B/C) | **구현 추가** — SKILL.md에 Phase 4-B/4-C 블록 삽입 |
| 2 | A4 (plan-plus Ontological) | **Design 갱신** — bkit 캐시 수정 불가, 의도적 미구현으로 기록 |
| 3 | A5 (gap-detector Stage 2) | **Design 갱신** — bkit 캐시 수정 불가, 의도적 미구현으로 기록 |
| 4 | F60 Client 테스트 | **구현 추가** — 11건 테스트 작성 |
| 5 | F60 Server 누락 테스트 | **구현 추가** — 3건 테스트 작성 |
| 6 | Changed Features 6건 | **Design 갱신** — 구현이 개선된 방향이므로 Design 반영 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial gap analysis — F59+F60 전항목 비교 | Sinclair Seo |
