---
code: FX-PLAN-012
title: Sprint 12 (v0.12.0) — ouroboros 패턴 차용 + Generative UI 도입
version: 0.1
status: Draft
category: PLAN
system-version: 0.12.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 12 (v0.12.0) Planning Document

> **Summary**: ouroboros 프로젝트의 Ambiguity Score + Socratic 질문법 + 3-stage Evaluation 패턴을 ax-14-req-interview 및 bkit PDCA에 차용하고, CopilotKit/OpenGenerativeUI의 Generative UI 패턴을 대시보드 에이전트 결과 렌더링에 도입하여 "요구사항 정의→실행→시각화" 전 구간의 품질을 높인다.
>
> **Project**: Foundry-X
> **Version**: 0.12.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 요구사항 인터뷰에서 "언제 코딩을 시작해도 되는가"에 대한 정량적 기준이 없고, PDCA Check에서 Mechanical 검증만 수행하여 Semantic/Consensus 레벨 검증이 부재. 에이전트 실행 결과가 텍스트/JSON 정적 Card로만 표시되어 탐색·인터랙션 불가능 |
| **Solution** | F59: ouroboros Ambiguity Score(≤0.2 게이트)를 ax-14-req-interview Phase 4에 삽입 + Socratic 질문법으로 plan-plus 강화 + 3-stage Evaluation으로 PDCA Check 고도화 / F60: CopilotKit useComponent 패턴 기반 Widget Renderer + Decision Matrix 기반 시각화 자동 결정 + sandboxed iframe 안전 렌더링 |
| **Function/UX Effect** | 인터뷰 완료 시 Ambiguity Score 수치로 착수 준비도 확인. PDCA 검증이 Mechanical→Semantic→Consensus 3단계로 심화. 에이전트 결과를 차트·다이어그램·코드 미리보기 등 인터랙티브 위젯으로 탐색 |
| **Core Value** | "모호함을 수치화하고, AI 결과를 시각화한다" — 요구사항 품질 게이트 강화 + PDCA 검증 깊이 3배 + 에이전트 UX 패러다임 전환 (텍스트→인터랙티브) |

---

## 1. Overview

### 1.1 Purpose

Sprint 12는 외부 오픈소스 프로젝트의 검증된 패턴을 Foundry-X 생태계에 **차용**하는 스프린트예요:

- **F59 ouroboros 패턴 차용 (P1)**: Ambiguity Score 정량화 + Socratic 질문법 + 3-stage Evaluation을 기존 ax 스킬과 bkit PDCA에 통합
- **F60 Generative UI 도입 (P1)**: CopilotKit의 useComponent 패턴과 Widget Renderer를 대시보드 에이전트 결과 렌더링에 적용

### 1.2 Background

**F59 배경 — ouroboros (Q00/ouroboros, ★1,453)**:
- "Stop prompting. Start specifying." — Specification-first AI 개발 시스템
- 핵심: Ambiguity Score = 1 − Σ(clarityᵢ × weightᵢ), threshold ≤ 0.2
- Interview → Seed → Execute → Evaluate → Evolve 진화적 반복 루프
- 3-stage Evaluation: Mechanical($0) → Semantic → Multi-Model Consensus
- Ontology Convergence: similarity ≥ 0.95로 자동 종료

**F60 배경 — OpenGenerativeUI (CopilotKit/OpenGenerativeUI, ★640)**:
- AI가 텍스트 대신 라이브 인터랙티브 컴포넌트를 생성
- CopilotKit v2 패턴: `useComponent`, `useFrontendTool`, `useHumanInTheLoop`
- Widget Renderer: sandboxed iframe + CSS 변수 주입 + ResizeObserver
- Decision Matrix: 응답 유형별 시각화 방법 자동 결정

**현재 한계**:

| 영역 | 현재 상태 | 한계 |
|------|----------|------|
| ax-14-req-interview | 4항목 스코어카드(100점), 80점 이분 판정 | "언제 코딩 가능"의 정량적 기준 부재, 불확실 차원 미분리 |
| bkit PDCA Check | gap-detector Match Rate (Mechanical 레벨) | Semantic/Consensus 레벨 검증 없음 |
| plan-plus | 브레인스토밍 기반 대안 탐색 | 온톨로지 분석("이것이 진짜 무엇인가?") 부재 |
| 에이전트 결과 UI | AgentTaskResult 정적 Card (99라인) | 분석/코드/코멘트 3탭 고정, 인터랙션 불가 |
| AgentExecutionResult | analysis(string), generatedCode, reviewComments | UI 렌더링 힌트 없음, taskType별 차별화 불가 |

### 1.3 Prerequisites (Sprint 11 완료 항목)

| 항목 | 상태 | 근거 |
|------|:----:|------|
| SSE agent.task.started/completed | ✅ | pushEvent() 직접 발행, dedup 60초 TTL |
| agents/page.tsx 실시간 UI | ✅ | onStatus/onError 핸들러 + taskStates Map |
| AgentCard 상태 배지 | ✅ | running 스피너 + completed/failed 배지 |
| E2E 18 specs | ✅ | agent-execute + conflict-resolution + sse-lifecycle |
| MCP 설계 문서 | ✅ | mcp-protocol.design.md (FX-DSGN-012) |
| CI/CD 환경 분리 | ✅ | staging/production deploy.yml |
| ax-14-req-interview Phase 1-5 | ✅ | 인터뷰→PRD→AI검토→반복→착수 판정 |
| bkit gap-detector / pdca-iterator | ✅ | Match Rate 기반 자동 반복 |
| 290 tests + 18 E2E | ✅ | CLI 106 + API 150 + Web 34 |

### 1.4 Sprint Scope

| F# | 제목 | Priority | 적용 대상 | 출처 |
|----|------|:--------:|----------|------|
| F59 | ouroboros 패턴 차용 — Ambiguity Score + Socratic 질문법 + 3-stage Evaluation | P1 | ax-14-req-interview, plan-plus, bkit PDCA Check | Q00/ouroboros |
| F60 | Generative UI 도입 — 에이전트 결과 인터랙티브 렌더링 | P1 | agents/page.tsx, AgentTaskResult, shared 타입 | CopilotKit/OpenGenerativeUI |

---

## 2. Feature Specifications

### 2.1 F59: ouroboros 패턴 차용 (P1)

**목표**: 요구사항 정의 단계의 모호함을 정량화하고, PDCA 검증을 3단계로 심화하여, "언제 코딩을 시작해도 되는가"와 "구현이 정말 올바른가"에 대한 수치적 판단 기준을 확립한다.

#### 2.1.1 Ambiguity Score — ax-14-req-interview Phase 4 강화

현재 Phase 4(충분도 평가)의 4항목 스코어카드를 Ambiguity Score로 보강:

**기존 스코어카드 (100점)**:
| 항목 | 배점 | 기존 판정 |
|------|:----:|----------|
| 신규 이슈 없음 | 20 | 이진 (예/아니오) |
| Ready 판정 비율 | 30 | 비율 계산 |
| 핵심 요소 커버리지 | 30 | 체크리스트 |
| 다관점 반영 여부 | 20 | 이진 |

**추가: Ambiguity Score (ouroboros 차용)**:

```
Ambiguity = 1 − Σ(clarityᵢ × weightᵢ)

| Dimension         | Weight (신규) | Weight (기존 프로젝트) |
|-------------------|:------------:|:-------------------:|
| Goal Clarity      |     40%      |        35%          |
| Constraint Clarity|     30%      |        25%          |
| Success Criteria  |     30%      |        25%          |
| Context Clarity   |      —       |        15%          |

Threshold: Ambiguity ≤ 0.2 (= Clarity ≥ 80%)
```

**통합 판정 로직**:
```
if (scorecard >= 80 AND ambiguity <= 0.2):
    → "✅ 착수 가능 — 스코어 {score}/100, Ambiguity {amb}"
elif (scorecard >= 80 AND ambiguity > 0.2):
    → "⚠️ 스코어 통과, 모호함 잔존 — Socratic 심화 질문 필요"
elif (scorecard < 80):
    → "❌ 미달 — 추가 인터뷰 라운드 필요"
```

**구현 위치**: `~/.claude/skills/ax-14-req-interview/SKILL.md` Phase 4 섹션에 Ambiguity Score 계산 로직 추가. 별도 코드 파일 없이 스킬 프롬프트 내에서 LLM이 각 차원의 clarity를 0.0~1.0으로 채점.

#### 2.1.2 Socratic 질문법 — plan-plus 강화

plan-plus 스킬의 브레인스토밍 단계에 ouroboros의 **Double Diamond** 구조 삽입:

```
현재 plan-plus 흐름:
  Intent Discovery → Alternatives → YAGNI Review → Plan Document

F59 확장:
  Intent Discovery → **Ontological Question** → Alternatives → YAGNI Review → Plan Document

Ontological Question (추가 단계):
  "이 기능이 진짜 무엇인가?"를 묻는 심화 질문 — 숨은 가정 노출

  예시:
  - "로그인 기능" → "인증이란 무엇인가? 세션 vs 토큰?"
  - "대시보드" → "대시보드의 사용자는 누구인가? 무엇을 결정하기 위해 보는가?"
```

**구현 위치**: bkit plan-plus 스킬의 SKILL.md에 Ontological Question 단계 삽입. Socratic 질문 패턴을 참조 자료로 포함.

#### 2.1.3 3-stage Evaluation — bkit PDCA Check 고도화

현재 gap-detector가 수행하는 Match Rate 검증(Mechanical)을 3단계로 확장:

| Stage | 이름 | 검증 내용 | 비용 |
|:-----:|------|----------|:----:|
| 1 | **Mechanical** | Design ↔ Code 구조 매칭 (기존 gap-detector) | $0 |
| 2 | **Semantic** | "구현이 설계 의도를 정확히 반영하는가?" LLM 기반 의미 검증 | Low |
| 3 | **Consensus** | 다중 모델 합의 — 2개 이상 LLM이 동일 판정 | Medium |

**구현 전략**:
- Stage 1: 기존 gap-detector 그대로 유지 (Match Rate)
- Stage 2: gap-detector 결과 중 "부분 일치" 항목에 대해 LLM으로 의미 검증
- Stage 3: Stage 2 결과를 다른 모델(Claude + GPT)로 교차 검증 (Optional, Out of Scope)

**구현 위치**: bkit gap-detector 에이전트 확장 또는 별도 에이전트(semantic-evaluator) 신규.

#### 2.1.4 파일 변경 예상

| 파일 | 변경 | 유형 |
|------|------|:----:|
| `~/.claude/skills/ax-14-req-interview/SKILL.md` | Phase 4에 Ambiguity Score 계산 로직 추가 | 수정 |
| `~/.claude/skills/ax-14-req-interview/references/ambiguity-score.md` | Ambiguity Score 계산 기준서 (ouroboros 차용) | 신규 |
| bkit plan-plus SKILL.md | Ontological Question 단계 삽입 | 수정 |
| bkit gap-detector 에이전트 | Stage 2 Semantic 검증 로직 추가 | 수정 |
| `packages/shared/src/types.ts` | AmbiguityScore 타입 (선택) | 수정 |

**테스트 예상**: 스킬/에이전트 프롬프트 변경 위주이므로 코드 테스트 ~3건 (AmbiguityScore 타입 검증 + 가중치 계산 유틸)

---

### 2.2 F60: Generative UI 도입 (P1)

**목표**: 에이전트 실행 결과를 텍스트/JSON 대신 인터랙티브 위젯(차트, 다이어그램, 코드 미리보기)으로 렌더링하여, 사용자가 결과를 탐색하고 인터랙션할 수 있게 한다.

#### 2.2.1 AgentExecutionResult 확장 — UIHint 필드

현재 `output` 구조에 렌더링 힌트를 추가:

```typescript
// packages/shared/src/agent.ts — F60 확장
export interface UIHint {
  /** 전체 레이아웃 유형 */
  layout: 'card' | 'tabs' | 'accordion' | 'flow' | 'iframe';

  /** 렌더링 섹션 목록 */
  sections: Array<{
    type: 'text' | 'code' | 'diff' | 'chart' | 'diagram' | 'table' | 'timeline';
    title: string;
    data: unknown;  // 섹션별 다형 데이터
    interactive?: boolean;  // 인터랙션 가능 여부
  }>;

  /** 자체 포함 HTML (iframe 렌더링용) */
  html?: string;

  /** 인터랙티브 액션 */
  actions?: Array<{
    type: 'approve' | 'reject' | 'edit' | 'expand';
    label: string;
    targetSection?: number;
  }>;
}

export interface AgentExecutionResult {
  status: 'success' | 'partial' | 'failed';
  output: {
    analysis?: string;
    generatedCode?: Array<{ path: string; content: string; action: string }>;
    reviewComments?: Array<{ file: string; line: number; comment: string; severity: string }>;
    uiHint?: UIHint;  // F60 신규
  };
  tokensUsed: number;
  model: string;
  duration: number;
}
```

#### 2.2.2 Decision Matrix — 시각화 유형 자동 결정

ClaudeApiRunner가 결과 생성 시, taskType과 결과 내용에 따라 UIHint를 자동 결정:

| taskType | 결과 패턴 | UIHint.layout | sections[].type |
|----------|----------|:-------------:|:---------------:|
| code_review | 코멘트 목록 | tabs | diff + text |
| code_generation | 파일 목록 | accordion | code + diff |
| spec_analysis | 분석 텍스트 + 메트릭 | card | text + chart |
| general | 자유 형식 | card | text |
| (차트 데이터 포함) | 수치 데이터 | iframe | chart (Chart.js) |
| (다이어그램 포함) | 구조 데이터 | iframe | diagram (SVG) |

**구현**: ClaudeApiRunner의 시스템 프롬프트에 UIHint 생성 지시를 추가. Runner가 LLM 응답을 파싱할 때 uiHint 필드도 함께 추출.

#### 2.2.3 Widget Renderer — Sandboxed Iframe

OpenGenerativeUI의 Widget Renderer 패턴 차용:

```typescript
// packages/web/src/components/feature/WidgetRenderer.tsx — 신규

// 핵심 구조:
// 1. LLM이 생성한 HTML을 sandboxed iframe에 렌더링
// 2. CSS 변수 주입으로 부모 앱 테마와 일관성 유지
// 3. ResizeObserver로 iframe 높이 자동 조정
// 4. postMessage 양방향 통신 (액션 전달)

interface WidgetRendererProps {
  title: string;
  description: string;
  html: string;  // Self-contained HTML (inline style + script)
  onAction?: (action: string, data: unknown) => void;
}
```

**보안**: `sandbox="allow-scripts"` 속성으로 iframe 격리. `allow-same-origin` 제외하여 부모 DOM 접근 차단.

#### 2.2.4 AgentTaskResult 재설계 — 동적 렌더링 엔진

현재 정적 Card 3탭 → UIHint 기반 동적 렌더링:

```
현재 (정적):
  AgentTaskResult
    ├─ 분석 탭 (analysis 텍스트)
    ├─ 코드 탭 (generatedCode 목록)
    └─ 코멘트 탭 (reviewComments 목록)

F60 (동적):
  AgentTaskResult
    ├─ uiHint 있음? → DynamicRenderer
    │   ├─ layout=card → CardLayout
    │   ├─ layout=tabs → TabsLayout
    │   ├─ layout=accordion → AccordionLayout
    │   ├─ layout=iframe → WidgetRenderer (sandboxed)
    │   └─ sections[] → SectionRenderer (type별 매핑)
    └─ uiHint 없음? → LegacyRenderer (기존 3탭, 하위 호환)
```

#### 2.2.5 파일 변경 예상

| 파일 | 변경 | 유형 |
|------|------|:----:|
| `packages/shared/src/agent.ts` | UIHint 타입 + AgentExecutionResult 확장 | 수정 |
| `packages/api/src/services/claude-api-runner.ts` | 프롬프트에 UIHint 생성 지시 + 응답 파싱 확장 | 수정 |
| `packages/api/src/services/execution-types.ts` | UIHint 관련 API 내부 타입 | 수정 |
| `packages/web/src/components/feature/WidgetRenderer.tsx` | 신규 — sandboxed iframe 렌더러 | 신규 |
| `packages/web/src/components/feature/DynamicRenderer.tsx` | 신규 — UIHint 기반 동적 레이아웃 | 신규 |
| `packages/web/src/components/feature/SectionRenderer.tsx` | 신규 — section.type별 렌더러 매핑 | 신규 |
| `packages/web/src/components/feature/AgentTaskResult.tsx` | 기존 정적 → uiHint 분기 + LegacyRenderer | 수정 |
| `packages/web/src/app/(app)/agents/page.tsx` | DynamicRenderer 통합 | 수정 |
| `packages/api/src/schemas/agent.ts` | UIHint Zod 스키마 | 수정 |

**테스트 예상**: ~18건
- UIHint 타입 검증: 3건
- ClaudeApiRunner UIHint 파싱: 4건
- WidgetRenderer 렌더링: 3건
- DynamicRenderer 레이아웃 분기: 4건
- AgentTaskResult 하위 호환: 2건
- SectionRenderer 타입별: 2건

---

## 3. Technical Architecture

### 3.1 Sprint 12 변경 아키텍처

```
┌────────────────────────────────────────────────────────┐
│                    Sprint 12 변경                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │       Dev Workflow (ax/bkit 스킬 확장)            │  │
│  │                                                   │  │
│  │  ax-14-req-interview (F59)                       │  │
│  │    └─ Phase 4: Ambiguity Score 추가               │  │
│  │       Goal(40%) + Constraint(30%) + Success(30%) │  │
│  │       → Clarity ≥ 80% 게이트                      │  │
│  │                                                   │  │
│  │  bkit plan-plus (F59)                             │  │
│  │    └─ Ontological Question 단계 삽입              │  │
│  │       "이것이 진짜 무엇인가?"                      │  │
│  │                                                   │  │
│  │  bkit gap-detector (F59)                          │  │
│  │    └─ Stage 2: Semantic 검증 추가                  │  │
│  │       (기존 Mechanical + LLM 의미 검증)            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Web Dashboard (F60)                     │  │
│  │                                                   │  │
│  │  agents/page.tsx                                  │  │
│  │    └─ AgentTaskResult 교체                         │  │
│  │       ├─ uiHint → DynamicRenderer                 │  │
│  │       │   ├─ CardLayout / TabsLayout              │  │
│  │       │   ├─ SectionRenderer (type별)             │  │
│  │       │   └─ WidgetRenderer (iframe)              │  │
│  │       └─ 없음 → LegacyRenderer (하위 호환)         │  │
│  └──────────────────────────────────────────────────┘  │
│                        │ REST                          │
│                        ▼                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │           API Server (F60)                        │  │
│  │                                                   │  │
│  │  ClaudeApiRunner (확장)                            │  │
│  │    └─ 프롬프트: UIHint 생성 지시 추가              │  │
│  │    └─ 파싱: uiHint 필드 추출                       │  │
│  │                                                   │  │
│  │  Decision Matrix                                  │  │
│  │    └─ taskType × 결과 패턴 → UIHint 매핑           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Shared Types (F60)                      │  │
│  │  UIHint, SectionType, ActionType 타입 정의         │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 3.2 의존성 추가

| 패키지 | 목적 | 위치 | 비고 |
|--------|------|------|------|
| (없음) | Sprint 12는 기존 의존성으로 충분 | — | Chart.js 등은 iframe 내 CDN 로드 |

### 3.3 D1 스키마 변경

Sprint 12에서 D1 스키마 변경은 없음. `agent_tasks` 테이블의 `result` JSON 필드에 UIHint가 자연스럽게 포함됨.

---

## 4. Implementation Plan

### 4.1 구현 순서

```
Phase A: ouroboros 패턴 차용 — 스킬/에이전트 확장 (F59)
  A1. Ambiguity Score 계산 기준서 작성 (references/ambiguity-score.md)
  A2. ax-14-req-interview SKILL.md Phase 4에 Ambiguity Score 로직 삽입
  A3. plan-plus SKILL.md에 Ontological Question 단계 추가
  A4. gap-detector 에이전트에 Stage 2 Semantic 검증 프롬프트 추가
  A5. shared/types.ts에 AmbiguityScore 타입 추가 (선택)
  A6. 테스트: Ambiguity 계산 유틸 + 타입 검증

Phase B: Generative UI — 타입 + API 확장 (F60-Server)
  B1. shared/agent.ts에 UIHint 타입 정의
  B2. schemas/agent.ts에 UIHint Zod 스키마 추가
  B3. ClaudeApiRunner 프롬프트에 UIHint 생성 지시 추가
  B4. ClaudeApiRunner 응답 파싱에 uiHint 필드 추출 로직 추가
  B5. Decision Matrix 매핑 상수 정의
  B6. 테스트: UIHint 파싱 + Decision Matrix

Phase C: Generative UI — Web UI 렌더링 (F60-Client)
  C1. WidgetRenderer.tsx 신규 — sandboxed iframe + CSS 변수 + ResizeObserver
  C2. SectionRenderer.tsx 신규 — type별 렌더러 (text/code/diff/chart/table)
  C3. DynamicRenderer.tsx 신규 — UIHint 기반 레이아웃 분기
  C4. AgentTaskResult.tsx 리팩토링 — uiHint 분기 + LegacyRenderer
  C5. agents/page.tsx DynamicRenderer 통합
  C6. 테스트: 렌더링 + 하위 호환

Phase A는 독립. Phase B→C 순차 (타입 먼저, UI 나중).
Phase A와 Phase B는 병렬 가능.
```

### 4.2 예상 산출물

| 카테고리 | 신규 파일 | 수정 파일 | 테스트 수 |
|---------|:--------:|:--------:|:--------:|
| F59 스킬 확장 | ~2 | ~3 | ~3 |
| F60 Server | 0 | ~4 | ~7 |
| F60 Client | ~3 | ~2 | ~11 |
| **합계** | ~5 | ~9 | ~21 |

**Sprint 12 완료 후 예상 테스트**: 290 (기존) + ~21 = ~311 tests
**E2E**: 18 (기존, 변경 없음)

### 4.3 Agent Teams 위임 전략

| Worker | 범위 | 금지 파일 |
|--------|------|----------|
| W1 (F59 스킬) | ax-14-req-interview SKILL.md, ambiguity-score.md, plan-plus 확장, gap-detector 확장 | `packages/web/`, `packages/api/`, `packages/cli/` |
| W2 (F60 Server) | shared/agent.ts UIHint, ClaudeApiRunner 확장, schemas/agent.ts, execution-types.ts, 관련 테스트 | `packages/web/`, `packages/cli/`, ax 스킬 파일 |
| Leader | F60 Client (WidgetRenderer, DynamicRenderer, SectionRenderer, AgentTaskResult, agents/page.tsx), SPEC 관리, 통합 검증 | — |

---

## 5. Risks & Mitigations

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|:----:|:----:|------|
| R1 | LLM의 Ambiguity Score 채점 일관성 부족 | Medium | Medium | temperature 0.1 고정 + 채점 기준 참조 문서 제공. 편차 > 0.15 시 재채점 |
| R2 | UIHint 생성 프롬프트가 토큰 과다 소비 | Medium | Low | UIHint 생성을 선택적으로 적용 (chart/diagram 요청 시만). 기본은 LegacyRenderer |
| R3 | iframe 내 CDN 스크립트 차단 (CSP) | Medium | Medium | 허용 CDN 화이트리스트 (cdnjs, esm.sh, jsdelivr). sandbox 속성으로 보안 유지 |
| R4 | DynamicRenderer 복잡도 증가 | Low | Medium | 섹션 타입 6개로 제한. 단순 팩토리 패턴 유지. 복잡한 시각화는 iframe으로 격리 |
| R5 | ax 스킬 변경이 다른 프로젝트에 영향 | Low | High | 변경은 추가 로직만 (기존 Phase 4 유지). Ambiguity Score는 Optional 출력 |

---

## 6. Success Criteria

| 항목 | 기준 |
|------|------|
| **F59 Ambiguity** | ax-14-req-interview에서 Ambiguity Score가 출력되고, ≤0.2 게이트가 작동하여 스코어카드와 이중 판정 |
| **F59 Socratic** | plan-plus에서 Ontological Question 단계가 실행되어 1개 이상 심화 질문 생성 |
| **F59 3-stage** | gap-detector가 Stage 1(Mechanical) + Stage 2(Semantic) 결과를 함께 보고 |
| **F60 UIHint** | ClaudeApiRunner가 spec_analysis taskType에서 UIHint를 포함한 결과 반환 |
| **F60 WidgetRenderer** | html 속성이 있는 UIHint를 sandboxed iframe으로 안전하게 렌더링 |
| **F60 하위 호환** | uiHint가 없는 기존 결과가 LegacyRenderer로 기존과 동일하게 표시 |
| **전체** | typecheck ✅, build ✅, ~311 tests ✅, E2E 18 specs ✅, PDCA Match Rate ≥ 90% |

---

## 7. Out of Scope

| 항목 | 사유 | 이관 |
|------|------|------|
| MCP 실 구현 (McpAgentRunner) | Sprint 11 설계 완료, 구현은 별도 스프린트 | Sprint 13+ |
| Consensus 검증 (Stage 3) | 다중 모델 합의는 비용/복잡도 높음 | Sprint 13+ (Optional) |
| 에이전트 자동 PR 생성 | 보안 검토 필요 | Phase 3 |
| v1.0.0 릴리스 | Sprint 12 완료 후 안정화 확인 | Sprint 13 |
| 실시간 스트리밍 렌더링 | SSE 스트림으로 결과 점진 표시는 추가 인프라 필요 | Sprint 13+ |
| 멀티테넌시 | Phase 3 범위 | Phase 3 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — F59(ouroboros 패턴) + F60(Generative UI) 계획 | Sinclair Seo |
