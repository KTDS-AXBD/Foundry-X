# Sprint 155 — AI 멀티 페르소나 평가 UI + Claude SSE 엔진

> **Summary**: F344(멀티 페르소나 평가 UI 6컴포넌트) + F345(Claude SSE 평가 엔진 + 데모 모드) 구현
>
> **Project**: Foundry-X
> **Version**: web 0.1.0 / api 0.1.0
> **Author**: Sinclair
> **Date**: 2026-04-05
> **Status**: Draft
> **Phase**: Phase 15 — Discovery UI/UX 고도화 v2
> **PRD**: `docs/specs/fx-discovery-ui-v2/prd-final.md`

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 발굴 2-9 단계(멀티 페르소나 AI 평가)에 전용 UI가 없어, 8개 KT DS 역할 페르소나 평가를 실행하거나 결과를 시각화할 수 없음. 수작업 PPT 전환 필요 |
| **Solution** | 6개 UI 컴포넌트(PersonaCardGrid, WeightSliderPanel, ContextEditor, BriefingInput, EvalProgress, EvalResults) + Claude SSE API 엔진 + 데모 모드 fallback |
| **Function/UX Effect** | 8 페르소나 × 7축 가중치 설정 → AI 순차 평가(실시간 프로그레스) → Go/Conditional/NoGo 판정 + Radar 차트 시각화. 데모 모드로 API 키 없이 체험 가능 |
| **Core Value** | 발굴 프로세스의 핵심 의사결정 단계를 Foundry-X 안에서 완결 — 수작업 PPT 전환 제거, 데이터 기반 Go/No-Go 판정 자동화 |

---

## 1. Overview

### 1.1 Purpose

AX BD팀의 2단계 발굴 프로세스(v8.2) 중 2-9 단계(멀티 페르소나 AI 평가)를 Foundry-X 웹 앱에 구현하여, 8개 KT DS 역할 페르소나가 사업 아이템을 7축으로 평가하고 Go/Conditional/NoGo 판정을 시각화하는 기능을 제공한다.

### 1.2 Background

- Phase 9(F258~F270)에서 Discovery Wizard 뼈대 구축 완료
- API에 `biz-persona-evaluator.ts` + `biz-persona-prompts.ts`로 8개 페르소나 평가 로직이 이미 존재 (Sprint 51 F178)
- 하지만 **UI가 전혀 없음** — API 백엔드만 존재하고 프론트엔드 화면 미구현
- Sprint 154(F342+F343)에서 DB 스키마 확장 + 강도 라우팅 UI를 선행 구현 예정
- Sprint 155는 그 위에 멀티 페르소나 평가 전용 화면을 얹는 Sprint

### 1.3 Related Documents

- PRD: `docs/specs/fx-discovery-ui-v2/prd-final.md` §8.2
- SPEC: F344(FX-REQ-336), F345(FX-REQ-337)
- 기존 서비스: `packages/api/src/services/biz-persona-evaluator.ts`
- 기존 프롬프트: `packages/api/src/services/biz-persona-prompts.ts`

---

## 2. Scope

### 2.1 In Scope

- [ ] **F344**: 멀티 페르소나 평가 UI 6컴포넌트
  - [ ] PersonaCardGrid — 8개 카드 그리드 (2×4), 이름/역할/관점/가중치 표시
  - [ ] WeightSliderPanel — 7축 레인지 슬라이더 + 합계 100% 자동보정
  - [ ] ContextEditor — 좌측 페르소나 리스트 + 우측 폼 (상황, 우선순위, 스타일, Red Line)
  - [ ] BriefingInput — 2-1~2-8 결과 자동 요약 + 수동 편집 가능
  - [ ] recharts 설치 (Radar + Bar 차트)
- [ ] **F345**: Claude SSE 평가 엔진 + 결과 시각화
  - [ ] POST /api/ax-bd/persona-eval API 라우트 (Claude SSE 스트리밍)
  - [ ] EvalProgress — 8단계 순차 프로그레스 (SSE 실시간)
  - [ ] EvalResults — 종합 점수 카드 + Go/Conditional/NoGo 배너 + Radar 차트 + 페르소나별 요약
  - [ ] 데모 모드 — 하드코딩 fallback (API 키 없이 전체 플로우 체험)
- [ ] D1 마이그레이션: ax_persona_configs + ax_persona_evals 테이블 (Sprint 154 미완 시 보완)
- [ ] API 서비스: PersonaConfigService + PersonaEvalService
- [ ] Zod 스키마: persona-config, persona-eval

### 2.2 Out of Scope

- 9탭 리포트 (Sprint 156~157)
- 팀 검토 & Handoff (Sprint 157)
- PDF Export (Sprint 157)
- 공유 링크 (Sprint 157)
- Agent Orchestration 연계 (Phase 14)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | PersonaCardGrid: 8개 페르소나 카드를 2×4 그리드로 표시 | High | Pending |
| FR-02 | WeightSliderPanel: 7축 가중치 슬라이더, 합계 100% 자동보정 | High | Pending |
| FR-03 | ContextEditor: 페르소나별 상황/우선순위/스타일/Red Line 편집 | High | Pending |
| FR-04 | BriefingInput: 발굴 2-1~2-8 결과 자동 요약 텍스트 생성 | Medium | Pending |
| FR-05 | POST /api/ax-bd/persona-eval: Claude SSE 스트리밍 엔드포인트 | High | Pending |
| FR-06 | EvalProgress: 8 페르소나 순차 평가 실시간 프로그레스 바 | High | Pending |
| FR-07 | EvalResults: Radar 차트(recharts) + 점수 카드 + 판정 배너 | High | Pending |
| FR-08 | 데모 모드: 하드코딩 결과로 전체 UI 플로우 체험 | Medium | Pending |
| FR-09 | DB: ax_persona_configs, ax_persona_evals 테이블 | High | Pending |
| FR-10 | 기존 biz-persona-evaluator.ts 로직 재활용 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | SSE 스트리밍 8 페르소나 < 3분 (실제 API) | 데모 모드에서 시뮬레이션 타이머 |
| Performance | 결과 렌더링 < 1초 (Radar 차트 포함) | 브라우저 DevTools |
| UX | 데모 모드 100% 오프라인 동작 | API 키 미설정 상태 테스트 |
| 접근성 | AXIS DS 토큰 기반 색상 대비 준수 | 시각적 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 6개 UI 컴포넌트 구현 + 화면 렌더링 확인
- [ ] POST /api/ax-bd/persona-eval API 동작 (SSE 스트리밍)
- [ ] 데모 모드에서 전체 플로우 동작 (API 키 불필요)
- [ ] Radar 차트(recharts) 정상 렌더링
- [ ] typecheck + lint 통과
- [ ] D1 마이그레이션 적용 가능

### 4.2 Quality Criteria

- [ ] Zero typecheck 에러
- [ ] Zero lint 에러
- [ ] Gap Analysis Match Rate >= 90%

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Sprint 154 DB 스키마 미완료 | High | Medium | Sprint 155에서 직접 마이그레이션 생성 (번호 충돌 시 renumber) |
| recharts 번들 사이즈 | Medium | Low | Tree-shaking으로 Radar/Bar만 import |
| Claude API 비용 ($0.5/회) | Medium | Low | 데모 모드 기본, API 키 입력 시에만 실제 호출 |
| SSE 스트리밍 Workers 제약 | Medium | Low | 기존 OpenRouter SSE 인프라 패턴 재활용 |

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 차트 라이브러리 | recharts (Radar + Bar) | PRD 지정. React 네이티브, 가벼움 |
| SSE 스트리밍 | Workers ReadableStream | 기존 OpenRouter SSE 인프라 패턴 |
| 상태 관리 | Zustand (persona-eval store) | 기존 프로젝트 컨벤션 |
| 데모 모드 | 하드코딩 JSON fallback | API 키 없이 체험. PRD §4.2 #7 |
| 기존 서비스 재활용 | biz-persona-evaluator.ts 확장 | 8 페르소나 + 스코어링 로직 기존 존재 |

### 6.3 컴포넌트 구조

```
packages/web/src/
├── components/feature/
│   ├── PersonaCardGrid.tsx       # F344: 8개 카드 2×4
│   ├── WeightSliderPanel.tsx     # F344: 7축 슬라이더
│   ├── ContextEditor.tsx         # F344: 페르소나별 맥락 편집
│   ├── BriefingInput.tsx         # F344: 자동 요약 입력
│   ├── EvalProgress.tsx          # F345: 8단계 프로그레스
│   └── EvalResults.tsx           # F345: 결과 + Radar 차트
├── routes/
│   └── ax-bd/persona-eval.tsx    # 페르소나 평가 페이지 (라우트)
└── lib/
    └── stores/persona-eval-store.ts  # Zustand store

packages/api/src/
├── routes/ax-bd-persona-eval.ts  # POST /ax-bd/persona-eval
├── services/
│   ├── persona-config-service.ts # ax_persona_configs CRUD
│   └── persona-eval-service.ts   # ax_persona_evals CRUD + 평가 실행
├── schemas/persona-config.ts     # Zod
├── schemas/persona-eval.ts       # Zod
└── db/migrations/
    ├── 0098_persona_configs.sql  # ax_persona_configs
    └── 0099_persona_evals.sql    # ax_persona_evals
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions
- [x] `.claude/rules/coding-style.md` exists
- [x] ESLint configuration (flat config)
- [x] TypeScript strict mode
- [x] `--discovery-*` 시맨틱 토큰 (PRD §8.5)

### 7.2 신규 의존성

| Package | Purpose | Version |
|---------|---------|---------|
| `recharts` | Radar + Bar 차트 | latest |

### 7.3 Environment Variables

| Variable | Purpose | Scope | Status |
|----------|---------|-------|--------|
| `ANTHROPIC_API_KEY` | Claude API 호출 | Workers Secret | ✅ 등록됨 |
| `OPENROUTER_API_KEY` | 대체 AI 호출 | Workers Secret | ✅ 등록됨 |

---

## 8. Implementation Order

1. **D1 마이그레이션** — ax_persona_configs + ax_persona_evals 테이블
2. **API 서비스** — PersonaConfigService + PersonaEvalService + Zod 스키마
3. **API 라우트** — POST /ax-bd/persona-eval (SSE 스트리밍)
4. **recharts 설치** — `pnpm add recharts -w --filter web`
5. **UI 컴포넌트 4종** — PersonaCardGrid, WeightSliderPanel, ContextEditor, BriefingInput
6. **UI 컴포넌트 2종** — EvalProgress, EvalResults (Radar 차트)
7. **라우트 페이지** — persona-eval.tsx + Zustand store
8. **데모 모드** — 하드코딩 fallback 데이터
9. **typecheck + lint** — 전체 검증

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`sprint-155.design.md`)
2. [ ] 구현
3. [ ] Gap Analysis
4. [ ] 완료 보고서

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-05 | Initial draft | Sinclair |
