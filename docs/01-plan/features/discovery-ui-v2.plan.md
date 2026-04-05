# Discovery UI/UX 고도화 v2 Planning Document

> **Summary**: 발굴 Wizard(Phase 9) 위에 멀티 페르소나 평가 + 9탭 리포트 + 팀 검토 레이어를 추가하여 발굴→형상화 End-to-End 완결
>
> **Project**: Foundry-X
> **Version**: Phase 15 (Sprint 154~157)
> **Author**: Sinclair Seo
> **Date**: 2026-04-05
> **Status**: Draft
> **PRD**: `docs/specs/fx-discovery-ui-v2/prd-final.md`

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 발굴 Wizard 뼈대는 완성됐지만 결과물 시각화(멀티 페르소나 평가, 9탭 리포트)가 없어 수작업 PPT로 대체 중 — 건당 2~3시간, 월 12건 |
| **Solution** | 기존 ax_discovery_* 테이블 + AXIS DS 위에 4개 핵심 화면(강도 라우팅, 멀티 페르소나, 9탭 리포트, 팀 검토) 추가. 확장(extend) 전략으로 기존 코드 변경 최소화 |
| **Function/UX Effect** | AI가 8 페르소나로 자동 평가 → 9탭 리포트 자동 생성 → 팀원 Go/Hold/Drop 투표 → 형상화 자동 연결. 수작업 PPT 완전 대체 |
| **Core Value** | 발굴→형상화 프로세스 연속성 확보. 의사결정 투명성 + 데이터 기반 판단. BD팀 월 24~36시간 절감 |

---

## 1. Overview

### 1.1 Purpose

AX BD팀의 2단계 발굴 프로세스(v8.2)에서 미구현된 핵심 화면 5종을 Foundry-X 웹 앱에 구현하여:
- 각 발굴 단계의 결과물을 구조화된 형태로 시각화
- AI 멀티 페르소나 평가(2-9)를 자동화하여 Go/Conditional/NoGo 판정 지원
- 9탭 발굴 완료 리포트를 자동 생성하여 팀 공유 및 의사결정 지원
- 발굴→형상화 핸드오프를 자동화

### 1.2 Background

- Phase 9(F258~F270): Discovery Wizard 뼈대 완성 (2-0~2-10 멀티스텝, HITL, Help Agent, 스킬 실행)
- Phase 10(F270): 발굴→형상화 정비 (사이드바 수정, 대시보드 탭 통합, 404 에러 처리, Agent 스킬 실행 UI)
- **핵심 Gap**: 결과물 시각화(02_HTML: 멀티 페르소나)와 최종 리포트(03_HTML: 9탭)가 전혀 없음
- 원본 기획: `docs/specs/ax-descovery-plan/discovery-ui-plan.html` (v2.0 Final, Dry-Run 검증 완료)

### 1.3 Related Documents

- PRD: `docs/specs/fx-discovery-ui-v2/prd-final.md` (3종 AI 검토 85점, 착수 준비 완료)
- 원본 계획서: `docs/specs/ax-descovery-plan/discovery-ui-plan.html`
- Dry-Run 검증: `docs/specs/ax-descovery-plan/discovery-ui-plan-dryrun.md`
- 참고 HTML: `01_AX사업개발_프로세스설명.html`, `02_AI사업개발_AI멀티페르소나평가.html`, `03_AX사업개발_발굴단계완료(안).html`
- 기존 설계: `docs/specs/ax-descovery-plan/F270-discovery-shaping-overhaul.design.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] **F342**: DB 스키마 확장 — D1 마이그레이션 4건(0096~0099) + API 3 서비스 + Zod 스키마
- [ ] **F343**: 유형별 강도 라우팅 UI — Wizard 확장 + output_json 렌더링 POC
- [ ] **F344**: 멀티 페르소나 평가 UI — 6개 컴포넌트 (PersonaCardGrid, WeightSliderPanel, ContextEditor, BriefingInput, EvalProgress, EvalResults)
- [ ] **F345**: 멀티 페르소나 평가 엔진 — Claude SSE API + 데모 모드
- [ ] **F346**: 리포트 공통 컴포넌트 + 9탭 프레임 + API
- [ ] **F347**: 리포트 탭 4종 선 구현 (2-1 레퍼런스 ~ 2-4 아이템 도출)
- [ ] **F348**: 리포트 탭 5종 완성 (2-5 선정 ~ 2-9 멀티 페르소나)
- [ ] **F349**: 팀 검토 & Handoff (Go/Hold/Drop 투표 + 형상화 연결)
- [ ] **F350**: 리포트 공유 링크 + PDF Export

### 2.2 Out of Scope

- PPT Export (경영진 보고용 슬라이드 자동 생성) → 후속 Phase
- Agent 오케스트레이션 파이프라인 (2-0→자동 2-1 추천) → Phase 14 완료 후 연계
- E2E 자동화 테스트 → 구현 후 별도 Sprint
- 리포트 템플릿 커스터마이징
- 페르소나/평가축 동적 설정 UI → v2에서는 8 페르소나 × 7축 하드코딩

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | F-item | Status |
|----|-------------|----------|--------|--------|
| FR-01 | ax_persona_configs, ax_persona_evals, ax_discovery_reports, ax_team_reviews 4테이블 D1 마이그레이션 | P0 | F342 | Pending |
| FR-02 | PersonaConfigService, PersonaEvalService, DiscoveryReportService CRUD + Zod 스키마 | P0 | F342 | Pending |
| FR-03 | WizardStepDetail에 intensity indicator(★핵심/○보통/△간소) 표시 | P0 | F343 | Pending |
| FR-04 | 5유형(I/M/P/T/S) × 7단계 강도 매트릭스 시각화 + 간소 단계 스킵 옵션 | P0 | F343 | Pending |
| FR-05 | output_json 렌더링 POC — 기존 데이터로 최소 2탭 자동 렌더링 검증 | P0 | F343 | Pending |
| FR-06 | 8개 페르소나 카드 그리드 (2×4) + 역할/관점/가중치 표시 | P0 | F344 | Pending |
| FR-07 | 7축 가중치 슬라이더 (합계 100% 자동보정) + 페르소나별 탭 전환 | P0 | F344 | Pending |
| FR-08 | Context Editor (좌측 리스트 + 우측 폼: 상황/우선순위/스타일/Red Line) | P0 | F344 | Pending |
| FR-09 | 2-1~2-8 결과 자동 요약 브리핑 + 수동 편집 | P0 | F344 | Pending |
| FR-10 | Claude API SSE 순차 평가 (8 페르소나) + 프로그레스 UI | P0 | F345 | Pending |
| FR-11 | 평가 결과: 종합 점수 → Go/Conditional/NoGo 판정 → Radar 차트 → 페르소나별 요약 | P0 | F345 | Pending |
| FR-12 | 데모 모드 (API 키 없이 하드코딩 결과 fallback) | P1 | F345 | Pending |
| FR-13 | 리포트 공통 컴포넌트: StepHeader, InsightBox, MetricCard, NextStepBox, HITL Badge | P0 | F346 | Pending |
| FR-14 | 9탭 리포트 프레임 + discovery-* 시맨틱 토큰 (mint/blue/amber/red/purple) | P0 | F346 | Pending |
| FR-15 | GET /ax-bd/discovery-report/:itemId — 2-1~2-9 데이터 자동 집계 | P0 | F346 | Pending |
| FR-16 | ReferenceAnalysisTab(2-1) + MarketValidationTab(2-2) + CompetitiveLandscapeTab(2-3) + OpportunityIdeationTab(2-4) | P0 | F347 | Pending |
| FR-17 | OpportunityScoringTab(2-5) + CustomerPersonaTab(2-6) + BusinessModelTab(2-7) + PackagingTab(2-8) + PersonaEvalResultTab(2-9) | P1 | F348 | Pending |
| FR-18 | Executive Summary 자동 생성 + Open Questions + 팀원 Go/Hold/Drop 투표 + 코멘트 | P0 | F349 | Pending |
| FR-19 | 최종 결정 기록 + 형상화 진입 체크리스트 + Handoff | P0 | F349 | Pending |
| FR-20 | 읽기전용 토큰 기반 공유 링크 + html2canvas PDF Export | P1 | F350 | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 9탭 리포트 초기 로딩 < 3초 (Lazy Loading 필수) | Lighthouse |
| Performance | 멀티 페르소나 평가 전체 < 5분 (8 순차 호출) | 타이머 측정 |
| Cost | Claude API 평가 1회 ≤ $0.5 | API 비용 로깅 |
| Compatibility | AXIS DS 토큰 체계 100% 준수 | 시각 검수 |
| Accessibility | 모바일 리포트 열람 가능 (반응형) | 기기 테스트 |
| Security | 공유 링크 토큰 만료 정책 (7일) | 단위 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] D1 마이그레이션 4건 remote 적용 완료
- [ ] API 3 서비스 + 라우트 동작 (단위 테스트 통과)
- [ ] 멀티 페르소나 평가 8명 실행 + 결과 시각화 동작
- [ ] 9탭 리포트 전체 렌더링 (최소 4탭 MVP)
- [ ] 팀원 Go/Hold/Drop 투표 + 기록 동작
- [ ] PDF Export 동작 (차트 포함)
- [ ] Gap Analysis Match Rate ≥ 90%

### 4.2 Quality Criteria

- [ ] 각 Sprint에서 typecheck + lint 0 error
- [ ] 신규 API 라우트 Zod 스키마 100%
- [ ] 기존 F263~F270 코드 회귀 없음 (기존 E2E 통과)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| output_json 비정형 → 리포트 렌더링 실패 | High | Medium | Sprint 154에서 POC 선행. 기존 데이터 2탭 렌더링 검증 |
| Claude API 비용 초과 ($0.5/회 추정) | Medium | Medium | 사용 모델 명시(Haiku/Sonnet), Dry-run 실비용 측정. 데모 모드 fallback |
| 1인 개발 4 Sprint 볼륨 과다 | Medium | High | AI 에이전트(Claude Code autopilot) 활용. MVP 4탭으로 축소 가능 |
| Recharts SSR/PDF Export 품질 | Medium | Medium | html2canvas 클라이언트 사이드. jsPDF + svg2pdf 대안 준비 |
| 기존 Wizard 코드 충돌 (F263~F270) | Low | Low | 확장(extend) 전략: props 추가만, 기존 로직 변경 없음 |
| 동시 투표 데이터 경합 | Low | Low | Optimistic locking (version 컬럼) |
| Workers 30초 타임아웃 (SSE 평가) | Medium | Medium | 페르소나 1명씩 개별 API 호출 + 클라이언트 측 순차 실행 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Selected |
|-------|-----------------|:--------:|
| **Starter** | Simple structure | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Vite + React 18 + React Router 7 | 기존 유지 | Phase 9~14 전체 동일 스택 |
| State Management | Zustand (전역) + useState (로컬) | 기존 유지 | 멀티 페르소나 가중치는 Zustand store |
| API Client | fetch + SSE | 기존 유지 | 기존 OpenRouter SSE 인프라 활용 |
| Chart Library | **Recharts** (신규) | Recharts | React 생태계 검증 라이브러리, Radar+Bar 지원 |
| Styling | CSS Modules + AXIS DS 토큰 | 기존 유지 + discovery-* 시맨틱 토큰 확장 |
| Testing | Vitest 3.x | 기존 유지 | Hono app.request() + in-memory SQLite |
| DB | Cloudflare D1 | 기존 유지 | 4테이블 추가 (0096~0099) |

### 6.3 Implementation Strategy

```
확장(Extend) 전략 — 기존 코드 변경 최소화

기존 컴포넌트:                          신규 추가:
┌─────────────────────┐                ┌─────────────────────┐
│ DiscoveryWizard     │ ── props ──→   │ IntensityIndicator  │
│ WizardStepDetail    │ ── props ──→   │ SkipOption          │
│ discovery-detail    │ ── route ──→   │ PersonaEvalPage     │
│ DiscoverDashboard   │ ── tab ────→   │ ReportTab           │
└─────────────────────┘                │ TeamReviewPanel     │
                                       └─────────────────────┘

데이터 흐름:
ax_discovery_outputs → 집계 API → report_json → 9탭 렌더링
ax_persona_configs → Claude SSE → ax_persona_evals → Radar 차트
ax_team_reviews → 투표 집계 → Decision Record
```

---

## 7. Sprint 구성 (Implementation Order)

### Sprint 154: Foundation — DB + 강도 라우팅 + POC

| 순서 | 작업 | 파일 | 테스트 |
|------|------|------|--------|
| 1 | D1 migration 0096~0099 | `packages/api/src/db/migrations/` | 스키마 검증 |
| 2 | PersonaConfigService + Zod | `packages/api/src/services/`, `schemas/` | CRUD 테스트 |
| 3 | PersonaEvalService + Zod | 동일 | CRUD 테스트 |
| 4 | DiscoveryReportService + Zod | 동일 | 집계 로직 테스트 |
| 5 | WizardStepDetail intensity indicator | `packages/web/src/components/feature/discovery/` | 컴포넌트 테스트 |
| 6 | output_json POC — 기존 데이터 2탭 | POC 스크립트 | 렌더링 성공 여부 |

**예상**: ~120 tests, 4 migrations, 3 services, ~3 routes
**선행 조건**: 없음 (독립 착수)

### Sprint 155: Core — 멀티 페르소나 평가 (핵심)

| 순서 | 작업 | 파일 | 테스트 |
|------|------|------|--------|
| 1 | `pnpm add recharts` | `packages/web/package.json` | - |
| 2 | PersonaCardGrid (8개 2×4) | `packages/web/src/components/feature/discovery/persona/` | 렌더 테스트 |
| 3 | WeightSliderPanel (7축 합계 보정) | 동일 | 합계 100% 검증 |
| 4 | ContextEditor (Split Pane) | 동일 | 입력/저장 테스트 |
| 5 | BriefingInput (자동 요약) | 동일 | 데이터 집계 테스트 |
| 6 | POST /ax-bd/persona-eval (Claude SSE) | `packages/api/src/routes/` | API 테스트 |
| 7 | EvalProgress (8단계 순차) | web 컴포넌트 | SSE 스트리밍 테스트 |
| 8 | EvalResults (점수+판정+Radar) | web 컴포넌트 | 차트 렌더 테스트 |
| 9 | 데모 모드 fallback | 컴포넌트 내 분기 | 데모 데이터 검증 |

**예상**: ~200 tests, 6 컴포넌트, 2 API routes
**선행**: F342 (DB 스키마) + recharts 설치

### Sprint 156: Report — 리포트 프레임 + 4탭

| 순서 | 작업 | 파일 | 테스트 |
|------|------|------|--------|
| 1 | StepHeader, InsightBox, MetricCard, NextStepBox, HITL Badge | `packages/web/src/components/feature/discovery/report/` | 각 컴포넌트 테스트 |
| 2 | discovery-* CSS 시맨틱 토큰 | `packages/web/src/styles/` | 스타일 확인 |
| 3 | 9탭 리포트 프레임 (DiscoveryReport.tsx) | `packages/web/src/routes/ax-bd/` | 프레임 렌더 |
| 4 | GET /ax-bd/discovery-report/:itemId | `packages/api/src/routes/` | 집계 API 테스트 |
| 5 | ReferenceAnalysisTab (2-1) | report 컴포넌트 | 데이터→렌더 |
| 6 | MarketValidationTab (2-2) — TAM 도넛 | 동일 | 차트 렌더 |
| 7 | CompetitiveLandscapeTab (2-3) — Porter Radar | 동일 | 차트 렌더 |
| 8 | OpportunityIdeationTab (2-4) — BMC 그리드 | 동일 | 레이아웃 검증 |

**예상**: ~150 tests, 8 컴포넌트, 1 route
**선행**: F342 (DB 스키마)

### Sprint 157: Completion — 나머지 5탭 + 팀 검토 + Export

| 순서 | 작업 | 파일 | 테스트 |
|------|------|------|--------|
| 1 | 5탭 완성 (2-5~2-9) | report 컴포넌트 | 각 탭 렌더 |
| 2 | TeamReviewPanel (투표+코멘트) | `packages/web/src/components/feature/discovery/review/` | 투표 저장 |
| 3 | Executive Summary 자동 생성 | API 서비스 | 집계 정확도 |
| 4 | Decision Record + Handoff | 컴포넌트 + API | 상태 전이 |
| 5 | 공유 링크 (토큰 기반 URL) | API + 미들웨어 | 토큰 검증 |
| 6 | PDF Export (html2canvas) | web 유틸리티 | PDF 생성 |

**예상**: ~100 tests, 7 컴포넌트, E2E 스펙 준비
**선행**: F344 (멀티 페르소나), F346 (리포트 프레임)

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] `.claude/rules/coding-style.md` — 코딩 스타일 룰
- [x] ESLint flat config (3 커스텀 룰: no-direct-db-in-route, require-zod-schema, no-orphan-plumb-import)
- [x] TypeScript strict mode + `tsconfig.json`
- [x] AXIS DS 컴포넌트 (`@axis-ds/*` 3 패키지)

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Discovery 시맨틱 토큰** | Missing | `--discovery-mint/blue/amber/red/purple` CSS 변수 | High |
| **output_json Zod 스키마** | Missing | 각 단계별 output 스키마 정의 | High |
| **Recharts 래퍼** | Missing | 프로젝트 공통 차트 래퍼 컴포넌트 | Medium |
| **리포트 컴포넌트 네이밍** | N/A | `{Step}Tab` 패턴 (예: MarketValidationTab) | Medium |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `ANTHROPIC_API_KEY` | Claude API 멀티 페르소나 평가 | Workers Secret | ☑ 기존 |
| `OPENROUTER_API_KEY` | OpenRouter 경유 평가 (대안) | Workers Secret | ☑ 기존 |

### 8.4 New Dependencies

| Package | Purpose | Sprint |
|---------|---------|--------|
| `recharts` | Radar + Bar 차트 | Sprint 155 |
| `html2canvas` | PDF Export | Sprint 157 (이미 설치 여부 확인 필요) |

---

## 9. Next Steps

1. [ ] Write design document (`discovery-ui-v2.design.md`) — `/pdca design discovery-ui-v2`
2. [ ] Sprint 154 착수 — `sprint 154`
3. [ ] Sprint 155~157 순차 진행

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-05 | Initial draft — PRD(prd-final.md) 기반 Plan 작성 | Sinclair Seo |
