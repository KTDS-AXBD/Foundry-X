---
code: FX-PLAN-055
title: Sprint 55 — 다중 AI 검토 파이프라인 + 멀티 페르소나 PRD 평가 (F186, F187)
version: 0.1
status: Draft
category: PLAN
created: 2026-03-24
updated: 2026-03-24
author: Sinclair Seo
---

# Sprint 55 Planning Document

> **Summary**: PRD 자동 생성(F185) 이후 품질 검증 레이어를 추가한다. F186은 생성된 PRD를 ChatGPT/Gemini/DeepSeek 3개 외부 AI API로 자동 검토하여 스코어카드를 산출하고, F187은 기존 BizPersonaEvaluator를 PRD 대상으로 확장하여 8개 KT DS 역할 페르소나의 사전 평가 + 레이더 차트 + G/K/R 판정을 제공한다.
>
> **Project**: Foundry-X
> **Version**: Sprint 55 (api 0.1.0)
> **Author**: Sinclair Seo
> **Date**: 2026-03-24
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | PRD가 자동 생성(F185)되지만, 품질 검증 없이 바로 팀 검토에 들어가면 부실한 PRD가 의사결정 테이블에 올라간다. 1명이 작성한 PRD를 1명이 검토하는 구조로는 맹점(blind spot)을 잡기 어렵다. |
| **Solution** | F186: 3개 외부 AI(ChatGPT/Gemini/DeepSeek)가 PRD를 독립 검토하여 항목별 점수 + 개선 의견을 산출하는 다중 AI 검토 파이프라인. F187: 8개 KT DS 역할 페르소나가 PRD를 사업성/전략/재무 등 8축으로 평가하여 G/K/R 판정 + 레이더 차트를 산출하는 멀티 페르소나 PRD 평가. |
| **Function/UX Effect** | PRD 생성 완료 → "AI 검토 시작" 버튼 → 3개 AI가 병렬 검토 → 스코어카드(점수+의견) 표시. "페르소나 평가" 버튼 → 8개 역할 에이전트 병렬 평가 → 레이더 차트 + G/K/R 배지 + 역할별 쟁점 요약 표시. 담당자는 검토 결과를 보고 PRD를 보완하거나 팀 검토에 상정. |
| **Core Value** | "AI가 만든 PRD를 AI가 검증한다" — 단일 AI 맹점을 다중 관점으로 보완하여 팀 검토 전 품질을 사전 확보. 검토 시간 2일 → 5분, 다양한 관점 자동 확보. |

---

## 1. Overview

### 1.1 Purpose

BDP-002 PRD §4.2 #1(다중 AI 검토) + #2(멀티 페르소나 사전 평가)를 Foundry-X API + 대시보드에 구현하여, PRD 자동 생성 직후 품질 검증 파이프라인을 제공한다.

### 1.2 Background

- **Sprint 53 (F185)**: `PrdGenerator` + `PrdTemplate` — Discovery 9기준 충족 시 PRD 자동 생성 완료
- **Sprint 51 (F178)**: `BizPersonaEvaluator` + `BizPersonaPrompts` — 8개 KT DS 역할 페르소나가 BizItem을 8축으로 평가 + G/K/R 판정 → 현재 BizItem 분류 결과만 평가, PRD 평가 미지원
- **ax-req-interview**: CLI 스킬로 다중 AI 검토 3라운드 수행 중 (Node.js 스크립트). ChatGPT/Gemini/DeepSeek API 호출 → feedback.md + scorecard.json 산출. 이 패턴을 API 서비스로 승격
- **기존 인프라**:
  - ✅ `prd_documents` 테이블 (0037 마이그레이션) — PRD 저장
  - ✅ `PrdGenerator` 서비스 — LLM 기반 PRD 생성
  - ✅ `BizPersonaEvaluator` — 8개 페르소나 병렬 평가 (Promise.allSettled)
  - ✅ `AgentRunner` — LLM 호출 래퍼
  - ✅ `POST /biz-items/:id/evaluate` — BizItem 페르소나 평가 엔드포인트
  - ✅ `biz_persona_evaluations` 테이블 (0034 마이그레이션)
- **빠진 부분**:
  - ❌ 외부 AI API 호출 서비스 (ChatGPT/Gemini/DeepSeek)
  - ❌ PRD 검토 파이프라인 오케스트레이션 (3개 AI 병렬 호출 + 스코어카드 집계)
  - ❌ PRD 대상 페르소나 평가 (현재 BizItem만 지원)
  - ❌ 검토 결과 저장 테이블 (prd_reviews, prd_persona_evaluations)
  - ❌ 대시보드 UI (스코어카드 뷰, 레이더 차트, G/K/R 배지)

### 1.3 Related Documents

- SPEC.md §5: F186 (FX-REQ-186, P1), F187 (FX-REQ-187, P1)
- [[FX-SPEC-BDP-002-PRD]]: `docs/specs/bizdevprocess-2/prd-final.md` §4.2 #1+#2
- [[FX-SPEC-BDP-001]]: `docs/specs/bizdevprocess/AX-Discovery-Process-v0.8-summary.md` §2-9
- Sprint 53 Plan: `docs/01-plan/features/sprint-53.plan.md` (F183~F185)
- Sprint 51 Design: `docs/archive/2026-03/sprint-51/sprint-51.design.md` (F178 BizPersonaEvaluator)

---

## 2. Scope

### 2.1 In Scope

#### F186: 다중 AI 검토 파이프라인

| # | 항목 | 설명 |
|---|------|------|
| 1 | **ExternalAiReviewer 서비스** | ChatGPT/Gemini/DeepSeek API를 호출하여 PRD를 검토하고 구조화된 피드백을 반환. Provider 인터페이스로 추상화 |
| 2 | **PrdReviewPipeline 서비스** | 3개 외부 AI를 Promise.allSettled로 병렬 호출, 개별 피드백 수집, 스코어카드 집계 |
| 3 | **스코어카드 집계 로직** | ax-req-interview scorecard.json 패턴 기반. 항목별(핵심문제/솔루션/시장/사용자/기술 등) 평가 + 전체 verdict(Go/Conditional/Reject) |
| 4 | **D1 스키마** | `prd_reviews` 테이블 — AI별 검토 결과 + 전체 스코어카드 저장 |
| 5 | **API 엔드포인트** | `POST /biz-items/:id/prd/:prdId/review` (검토 시작), `GET /biz-items/:id/prd/:prdId/reviews` (결과 조회) |
| 6 | **대시보드 UI** | 스코어카드 뷰 — AI별 verdict 배지 + 항목별 점수 바 + 개선 의견 목록 |

#### F187: 멀티 페르소나 PRD 평가

| # | 항목 | 설명 |
|---|------|------|
| 1 | **BizPersonaEvaluator PRD 모드 확장** | 기존 evaluate(item, classification) → evaluate(item, classification, prdContent?) 오버로드. PRD가 있으면 PRD 내용 기반 평가 |
| 2 | **PRD 평가 프롬프트 확장** | `biz-persona-prompts.ts`에 `buildPrdEvaluationPrompt()` 추가 — PRD 전문 + 8축 평가 가이드 |
| 3 | **D1 스키마** | `prd_persona_evaluations` 테이블 — PRD별 페르소나 평가 결과 저장 |
| 4 | **API 엔드포인트** | `POST /biz-items/:id/prd/:prdId/persona-evaluate` (평가 시작), `GET /biz-items/:id/prd/:prdId/persona-evaluations` (결과 조회) |
| 5 | **대시보드 UI** | 레이더 차트 (8축) + G/K/R 판정 배지 + 역할별 쟁점 카드 |

### 2.2 Out of Scope

| # | 항목 | 사유 |
|---|------|------|
| 1 | Six Hats 토론 (F188) | P2, Sprint 55 범위 외 |
| 2 | 진행률 대시보드 (F189) | P2, Sprint 55 범위 외 |
| 3 | 외부 AI API 비용 최적화 | MVP 이후 사용량 기반 최적화 |
| 4 | 검토 라운드 반복 (round 2, 3) | 1차 검토만 구현, 반복 검토는 수동 트리거 |

---

## 3. Technical Design Summary

### 3.1 아키텍처 개요

```
PRD 생성 완료
    │
    ├─── F186: 다중 AI 검토 ──────────────────────┐
    │    PrdReviewPipeline                        │
    │    ├── ExternalAiReviewer (ChatGPT)         │
    │    ├── ExternalAiReviewer (Gemini)          │
    │    └── ExternalAiReviewer (DeepSeek)        │
    │         ↓ Promise.allSettled                │
    │    ScorecardAggregator → prd_reviews (D1)   │
    │                                             │
    ├─── F187: 멀티 페르소나 평가 ────────────────┐
    │    BizPersonaEvaluator (PRD 모드)           │
    │    ├── 전략기획팀장                          │
    │    ├── 영업총괄부장                          │
    │    ├── ...6개 더                             │
    │         ↓ Promise.allSettled                │
    │    G/K/R Verdict → prd_persona_evals (D1)   │
    │                                             │
    └─── 대시보드 UI ──────────────────────────────┘
         ├── ScorecardView (F186)
         ├── RadarChartView (F187)
         └── PrdReviewSummary (통합)
```

### 3.2 신규 서비스

| 서비스 | 파일 | 역할 |
|--------|------|------|
| `ExternalAiReviewer` | `services/external-ai-reviewer.ts` | 외부 AI API 호출 래퍼. Provider 패턴 (openai/google-ai/deepseek) |
| `PrdReviewPipeline` | `services/prd-review-pipeline.ts` | 3개 AI 병렬 호출 + 스코어카드 집계 오케스트레이터 |
| `ScorecardAggregator` | `services/scorecard-aggregator.ts` | 개별 AI 평가를 종합하여 전체 verdict 산출 |

### 3.3 기존 서비스 확장

| 서비스 | 변경 내용 |
|--------|----------|
| `BizPersonaEvaluator` | PRD 모드 추가 — prdContent 파라미터 옵셔널 추가, PRD 있으면 buildPrdEvaluationPrompt 사용 |
| `biz-persona-prompts.ts` | `buildPrdEvaluationPrompt()` 함수 추가 |
| `biz-items.ts` (라우트) | 4개 엔드포인트 추가 (review 2 + persona-evaluate 2) |

### 3.4 D1 마이그레이션

#### 0038_prd_reviews.sql

```sql
CREATE TABLE IF NOT EXISTS prd_reviews (
  id TEXT PRIMARY KEY,
  prd_id TEXT NOT NULL REFERENCES prd_documents(id),
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  provider TEXT NOT NULL,          -- 'chatgpt' | 'gemini' | 'deepseek'
  verdict TEXT NOT NULL,           -- 'go' | 'conditional' | 'reject'
  score INTEGER NOT NULL,          -- 0-100 전체 점수
  feedback TEXT NOT NULL,          -- JSON: 항목별 피드백
  raw_response TEXT,               -- 원본 AI 응답
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  org_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prd_review_scorecards (
  id TEXT PRIMARY KEY,
  prd_id TEXT NOT NULL REFERENCES prd_documents(id),
  total_score INTEGER NOT NULL,    -- 0-100
  verdict TEXT NOT NULL,           -- 'go' | 'conditional' | 'reject'
  provider_count INTEGER NOT NULL, -- 성공한 AI 수
  details TEXT NOT NULL,           -- JSON: 집계 상세
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### 0039_prd_persona_evaluations.sql

```sql
CREATE TABLE IF NOT EXISTS prd_persona_evaluations (
  id TEXT PRIMARY KEY,
  prd_id TEXT NOT NULL REFERENCES prd_documents(id),
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  persona_id TEXT NOT NULL,
  persona_name TEXT NOT NULL,
  business_viability INTEGER NOT NULL,
  strategic_fit INTEGER NOT NULL,
  customer_value INTEGER NOT NULL,
  tech_market INTEGER NOT NULL,
  execution INTEGER NOT NULL,
  financial_feasibility INTEGER NOT NULL,
  competitive_diff INTEGER NOT NULL,
  scalability INTEGER NOT NULL,
  summary TEXT NOT NULL,
  concerns TEXT NOT NULL,          -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  org_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prd_persona_verdicts (
  id TEXT PRIMARY KEY,
  prd_id TEXT NOT NULL REFERENCES prd_documents(id),
  verdict TEXT NOT NULL,           -- 'green' | 'keep' | 'red'
  avg_score REAL NOT NULL,
  total_concerns INTEGER NOT NULL,
  warnings TEXT NOT NULL,          -- JSON array
  evaluation_count INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.5 외부 AI API 설계

```typescript
interface AiReviewProvider {
  name: string;                    // 'chatgpt' | 'gemini' | 'deepseek'
  review(prdContent: string, reviewPrompt: string): Promise<AiReviewResponse>;
}

interface AiReviewResponse {
  sections: SectionScore[];        // 항목별 점수 + 의견
  overallScore: number;            // 0-100
  verdict: 'go' | 'conditional' | 'reject';
  summary: string;                 // 종합 의견
  improvements: string[];          // 개선 권고
}

interface SectionScore {
  name: string;                    // '핵심 문제 정의', '솔루션 설계' 등
  score: number;                   // 1-10
  grade: '충실' | '적정' | '최소' | '미흡';
  feedback: string;
}
```

### 3.6 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/biz-items/:id/prd/:prdId/review` | 다중 AI 검토 시작 (비동기, 3개 AI 병렬) |
| GET | `/biz-items/:id/prd/:prdId/reviews` | 검토 결과 조회 (개별 AI + 스코어카드) |
| POST | `/biz-items/:id/prd/:prdId/persona-evaluate` | 멀티 페르소나 PRD 평가 시작 |
| GET | `/biz-items/:id/prd/:prdId/persona-evaluations` | 페르소나 평가 결과 + G/K/R verdict 조회 |

### 3.7 Secrets 필요

| Secret | 용도 | 등록 방법 |
|--------|------|----------|
| `OPENAI_API_KEY` | ChatGPT API 호출 | `wrangler secret put OPENAI_API_KEY` |
| `GOOGLE_AI_API_KEY` | Gemini API 호출 | `wrangler secret put GOOGLE_AI_API_KEY` |
| `DEEPSEEK_API_KEY` | DeepSeek API 호출 | `wrangler secret put DEEPSEEK_API_KEY` |

> ANTHROPIC_API_KEY는 이미 등록됨 (내부 AgentRunner용)

---

## 4. Implementation Order

### Phase A: F186 다중 AI 검토 파이프라인

| Step | 작업 | 산출물 | 의존성 |
|------|------|--------|--------|
| A-1 | D1 마이그레이션 0038 생성 | `0038_prd_reviews.sql` | — |
| A-2 | ExternalAiReviewer 서비스 | `services/external-ai-reviewer.ts` | A-1 |
| A-3 | ScorecardAggregator 서비스 | `services/scorecard-aggregator.ts` | — |
| A-4 | PrdReviewPipeline 서비스 | `services/prd-review-pipeline.ts` | A-2, A-3 |
| A-5 | Zod 스키마 | `schemas/prd-review.ts` | — |
| A-6 | API 라우트 (POST review, GET reviews) | `routes/biz-items.ts` 확장 | A-4, A-5 |
| A-7 | 테스트 | `__tests__/prd-review-*.test.ts` | A-2~A-6 |

### Phase B: F187 멀티 페르소나 PRD 평가

| Step | 작업 | 산출물 | 의존성 |
|------|------|--------|--------|
| B-1 | D1 마이그레이션 0039 생성 | `0039_prd_persona_evaluations.sql` | — |
| B-2 | biz-persona-prompts.ts 확장 | `buildPrdEvaluationPrompt()` 추가 | — |
| B-3 | BizPersonaEvaluator PRD 모드 | `evaluatePrd()` 메서드 추가 | B-1, B-2 |
| B-4 | Zod 스키마 | `schemas/prd-persona.ts` | — |
| B-5 | API 라우트 (POST persona-evaluate, GET persona-evaluations) | `routes/biz-items.ts` 확장 | B-3, B-4 |
| B-6 | 테스트 | `__tests__/prd-persona-*.test.ts` | B-2~B-5 |

### Phase C: 대시보드 UI

| Step | 작업 | 산출물 | 의존성 |
|------|------|--------|--------|
| C-1 | ScorecardView 컴포넌트 | `components/feature/ScorecardView.tsx` | A-6 |
| C-2 | RadarChartPanel 컴포넌트 | `components/feature/RadarChartPanel.tsx` | B-5 |
| C-3 | PrdReviewSummary 통합 뷰 | `components/feature/PrdReviewSummary.tsx` | C-1, C-2 |
| C-4 | Web 테스트 | `__tests__/scorecard-view.test.tsx` 등 | C-1~C-3 |

---

## 5. Risk & Mitigation

| # | 리스크 | 영향 | 완화 방안 |
|---|--------|------|----------|
| 1 | 외부 AI API 키 미보유 | F186 전체 블로커 | Mock 모드 구현 → API 키 없으면 더미 응답으로 파이프라인 검증 가능 |
| 2 | 외부 AI API 호출 비용 | 운영 비용 증가 | PRD당 1회만 검토 (수동 트리거), 불필요한 재검토 방지 |
| 3 | 외부 AI 응답 형식 불일치 | JSON 파싱 실패 | 구조화 프롬프트 + fallback 파싱 (markdown → JSON 변환) |
| 4 | Workers 외부 API 호출 제한 | Subrequest 제한 (1000/request) | 3개 AI × 1회 = 3 subrequest로 충분 |
| 5 | 페르소나 평가 시 PRD 길이 초과 | 토큰 제한 | PRD 요약본(3000자) 생성 후 평가 입력으로 사용 |

---

## 6. Success Criteria

| 지표 | 목표 |
|------|------|
| 다중 AI 검토 완료율 | 3개 AI 중 2개 이상 성공 (2/3) |
| 페르소나 평가 완료율 | 8개 중 5개 이상 성공 (기존 MIN_SUCCESS_COUNT 유지) |
| 검토 소요 시간 | PRD 1건당 5분 이내 (3개 AI 병렬) |
| API 테스트 커버리지 | 신규 엔드포인트 100% |
| Match Rate 목표 | ≥ 90% |

---

## 7. Estimation

| 항목 | 예상 산출물 |
|------|------------|
| 신규 서비스 | 3개 (ExternalAiReviewer, PrdReviewPipeline, ScorecardAggregator) |
| 기존 서비스 확장 | 2개 (BizPersonaEvaluator, biz-persona-prompts) |
| 신규 스키마 | 2개 (prd-review, prd-persona) |
| D1 마이그레이션 | 2개 (0038, 0039) — 4개 테이블 |
| API 엔드포인트 | 4개 신규 |
| Web 컴포넌트 | 3개 (ScorecardView, RadarChartPanel, PrdReviewSummary) |
| 테스트 | ~60개 예상 (서비스 40 + 라우트 10 + Web 10) |
| env.ts 확장 | OPENAI_API_KEY, GOOGLE_AI_API_KEY, DEEPSEEK_API_KEY 추가 |
