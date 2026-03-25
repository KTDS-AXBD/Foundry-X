---
code: FX-PLAN-056
title: Sprint 56 — Six Hats 토론 시뮬레이션 + Discovery 진행률 대시보드 (F188, F189)
version: 0.1
status: Draft
category: PLAN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo
---

# Sprint 56 Planning Document

> **Summary**: PRD 품질 검증 파이프라인의 세 번째 축(Six Hats 토론)과 Discovery 파이프라인 가시성(진행률 대시보드)을 추가한다. F188은 Edward de Bono의 6색 모자 사고법을 AI로 자동 수행하여 PRD에 대한 다관점 토론 기록을 생성하고, F189는 전체 BizItem의 Discovery 9기준 달성 현황을 포트폴리오 레벨로 집계·시각화한다.
>
> **Project**: Foundry-X
> **Version**: Sprint 56 (api 0.1.0)
> **Author**: Sinclair Seo
> **Date**: 2026-03-25
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Sprint 55에서 다중 AI 검토(F186)와 페르소나 평가(F187)를 구현했지만, PRD의 논리적 맹점을 다각도로 파헤치는 구조화된 토론이 없다. 또한 BizItem이 늘어날수록 전체 Discovery 파이프라인의 병목과 진행 상황을 한눈에 파악하기 어렵다. |
| **Solution** | F188: 6색 모자(White-사실/Red-감정/Black-위험/Yellow-가치/Green-창의/Blue-종합) 관점으로 20턴 AI 토론을 자동 수행하여 PRD의 숨겨진 쟁점을 도출. F189: 전체 BizItem의 9기준 달성률을 집계하고, 히트맵+요약 카드+필터로 포트폴리오 레벨 병목을 시각화. |
| **Function/UX Effect** | PRD 상세 → "Six Hats 토론" 버튼 → AI가 6모자 관점 20턴 토론 자동 수행 → 턴별 카드 뷰 + 쟁점 요약 표시. Discovery 대시보드 → 전체 BizItem 9기준 히트맵 + 상태별 필터 + 파이프라인 요약 카드 표시. |
| **Core Value** | "AI가 토론하고, 사람이 판단한다" — 6가지 사고방식의 충돌로 단일 관점의 맹점을 사전 포착. 포트폴리오 레벨 가시성으로 Discovery 파이프라인 병목을 즉시 식별하여 자원 배분 최적화. |

---

## 1. Overview

### 1.1 Purpose

BDP-002 PRD §4.2 #3(Six Hats 토론) + #4(진행률 대시보드)를 Foundry-X API + 대시보드에 구현하여, PRD 품질 검증의 세 번째 축과 Discovery 파이프라인 가시성을 제공한다.

### 1.2 Background

- **Sprint 55 (F186+F187)**: `ExternalAiReviewer` + `PrdReviewPipeline` + `BizPersonaEvaluator` PRD 모드 — 다중 AI 검토 + 멀티 페르소나 평가 완료
- **Sprint 53 (F183)**: `DiscoveryCriteriaService` + `DiscoveryCriteriaPanel` — BizItem별 9기준 체크리스트 + 상태 관리 완료
- **ax-req-interview Six Hats**: CLI 스킬에서 ChatGPT API로 20턴 Six Hats 토론 수행 중 (395초, 115K 토큰). 이 패턴을 API 서비스로 승격
- **기존 인프라**:
  - ✅ `AgentRunner` + `createAgentRunner()` — LLM 호출 추상화 (OpenRouter > Claude > Mock)
  - ✅ `ExternalAiReviewer` — 외부 AI Provider 인터페이스 (ChatGPT/Gemini/DeepSeek)
  - ✅ `discovery_criteria` 테이블 (0036 마이그레이션) — BizItem별 9기준 상태 저장
  - ✅ `DiscoveryCriteriaPanel` — 개별 BizItem 9기준 UI 컴포넌트
  - ✅ `prd_documents` 테이블 (0037) — PRD 저장
  - ✅ `prd_reviews`, `prd_review_scorecards` (0038) — 다중 AI 검토 결과
  - ✅ `prd_persona_evaluations`, `prd_persona_verdicts` (0039) — 페르소나 평가 결과
- **빠진 부분**:
  - ❌ Six Hats 토론 서비스 (6모자 프롬프트 + 20턴 루프 + 턴별 저장)
  - ❌ Six Hats 토론 결과 테이블
  - ❌ Six Hats 대시보드 UI (턴별 카드 뷰 + 쟁점 요약)
  - ❌ Discovery 포트폴리오 레벨 진행률 집계 서비스
  - ❌ Discovery 진행률 대시보드 UI (히트맵 + 요약 카드)

### 1.3 Related Documents

- SPEC.md §5: F188 (FX-REQ-188, P2), F189 (FX-REQ-189, P2)
- [[FX-SPEC-BDP-002-PRD]]: `docs/specs/bizdevprocess-2/prd-final.md` §4.2 #3+#4
- Sprint 55 Plan: `docs/01-plan/features/sprint-55.plan.md` (F186+F187)
- Six Hats 토론 실물 예시: `docs/specs/bizdevprocess-2/archive/debate/sixhats-discussion.md`
- Sprint 53 Plan: `docs/01-plan/features/sprint-53.plan.md` (F183 DiscoveryCriteria)

---

## 2. Scope

### 2.1 In Scope

#### F188: Six Hats 토론 시뮬레이션

| # | 항목 | 설명 |
|---|------|------|
| 1 | **SixHatsDebateService** | 6색 모자 역할별 프롬프트 생성 + AgentRunner로 20턴 순환 토론 수행 + 턴별 결과 저장 |
| 2 | **Six Hats 프롬프트 템플릿** | 6개 모자별 시스템 프롬프트 + 이전 턴 컨텍스트 주입 방식 |
| 3 | **D1 스키마** | `sixhats_debates`, `sixhats_turns` 테이블 — 토론 메타 + 턴별 결과 저장 |
| 4 | **API 엔드포인트** | `POST /biz-items/:id/prd/:prdId/sixhats` (토론 시작), `GET /biz-items/:id/prd/:prdId/sixhats` (결과 조회) |
| 5 | **대시보드 UI** | 턴별 카드 뷰 (모자 색상 + 발언 내용) + 쟁점 요약 패널 |

#### F189: Discovery 진행률 대시보드

| # | 항목 | 설명 |
|---|------|------|
| 1 | **DiscoveryProgressService** | 전체 BizItem의 9기준 달성 현황을 집계하여 포트폴리오 레벨 통계 산출 |
| 2 | **API 엔드포인트** | `GET /discovery/progress` (전체 진행률), `GET /discovery/progress/summary` (요약 통계) |
| 3 | **대시보드 UI** | 히트맵 (BizItem × 9기준 매트릭스), 파이프라인 요약 카드 (상태별 건수), 필터 (gateStatus별) |

### 2.2 Out of Scope

| # | 항목 | 사유 |
|---|------|------|
| 1 | 시장/트렌드 데이터 연동 (F190) | Sprint 57 범위 (이미 완료) |
| 2 | Six Hats 토론 모델 선택 UI | MVP에서는 기본 AgentRunner 모델 사용 |
| 3 | Six Hats 토론 커스텀 턴 수 | 20턴 고정, 추후 설정 가능하게 확장 |
| 4 | Discovery 진행률 알림/자동화 | 대시보드 조회만, 슬랙/이메일 알림은 추후 |

---

## 3. Technical Design Summary

### 3.1 아키텍처 개요

```
PRD 품질 검증 파이프라인 (완성 후)
    │
    ├── F186: 다중 AI 검토 ──── ✅ Sprint 55
    ├── F187: 멀티 페르소나 ──── ✅ Sprint 55
    ├── F188: Six Hats 토론 ──── 🔧 이번 Sprint
    │    SixHatsDebateService
    │    ├── WhiteHat (사실·데이터)
    │    ├── RedHat (감정·직관)
    │    ├── BlackHat (비판·리스크)
    │    ├── YellowHat (기회·가치)
    │    ├── GreenHat (창의·대안)
    │    └── BlueHat (종합·프로세스)
    │         ↓ 20턴 순환 (3.3턴/모자)
    │    sixhats_turns (D1)
    │
    └── Discovery 파이프라인 가시성
         ├── F183: 개별 BizItem 체크리스트 ── ✅ Sprint 53
         └── F189: 포트폴리오 대시보드 ──── 🔧 이번 Sprint
              DiscoveryProgressService
              ├── 전체 BizItem × 9기준 집계
              ├── gateStatus별 분류
              └── 기준별 병목 분석
```

### 3.2 신규 서비스

| 서비스 | 파일 | 역할 |
|--------|------|------|
| `SixHatsDebateService` | `services/sixhats-debate.ts` | 6모자 프롬프트 생성 + AgentRunner 순환 호출 + D1 저장 |
| `SixHatsPrompts` | `services/sixhats-prompts.ts` | 6개 모자별 시스템 프롬프트 + 컨텍스트 빌더 |
| `DiscoveryProgressService` | `services/discovery-progress.ts` | 전체 BizItem 9기준 집계 + 통계 산출 |

### 3.3 D1 마이그레이션

#### 0040_sixhats_debates.sql

```sql
CREATE TABLE IF NOT EXISTS sixhats_debates (
  id TEXT PRIMARY KEY,
  prd_id TEXT NOT NULL REFERENCES prd_documents(id),
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  status TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'completed' | 'failed'
  total_turns INTEGER NOT NULL DEFAULT 20,
  completed_turns INTEGER NOT NULL DEFAULT 0,
  key_issues TEXT,                          -- JSON: 토론에서 도출된 핵심 쟁점 목록
  summary TEXT,                             -- Blue Hat 종합 요약
  model TEXT NOT NULL,                      -- 사용 모델명
  total_tokens INTEGER DEFAULT 0,
  duration_seconds REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  org_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sixhats_turns (
  id TEXT PRIMARY KEY,
  debate_id TEXT NOT NULL REFERENCES sixhats_debates(id),
  turn_number INTEGER NOT NULL,            -- 1~20
  hat TEXT NOT NULL,                        -- 'white' | 'red' | 'black' | 'yellow' | 'green' | 'blue'
  hat_label TEXT NOT NULL,                  -- '⚪ White Hat (사실·데이터)' 등
  content TEXT NOT NULL,                    -- 발언 내용
  tokens INTEGER DEFAULT 0,
  duration_seconds REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.4 Six Hats 토론 설계

**6색 모자 순환 패턴** (20턴, 3.3턴/모자):

| 턴 | 모자 | 역할 | 순서 논리 |
|----|------|------|----------|
| 1 | ⚪ White | 사실·데이터 | 팩트 기반 출발 |
| 2 | 🔴 Red | 감정·직관 | 초기 감성 반응 |
| 3 | ⚫ Black | 비판·리스크 | 약점 도출 |
| 4 | 🟡 Yellow | 기회·가치 | 균형 잡기 |
| 5 | 🟢 Green | 창의·대안 | 새 아이디어 |
| 6 | 🔵 Blue | 종합·프로세스 | 1라운드 정리 |
| 7~12 | 반복 | 이전 턴 반박/보강 | 심화 토론 |
| 13~18 | 반복 | 합의 수렴 | 쟁점 좁히기 |
| 19 | 🟢 Green | 최종 대안 | 마지막 제안 |
| 20 | 🔵 Blue | 최종 종합 | 핵심 쟁점 + 권고 |

**프롬프트 구조**:
```
[시스템] 당신은 Edward de Bono의 {hat} 사고 모자를 쓴 전문가입니다.
[컨텍스트] PRD 내용: {prdContent (3000자 요약)}
[이전 토론] {이전 턴 발언 요약}
[지시] {hat} 관점에서 이 PRD를 분석하세요. 이전 턴의 논점을 참고하되, 당신의 관점에서 새로운 인사이트를 추가하세요.
```

**AgentRunner 재활용**: 기존 `createAgentRunner()` → LLM 호출. 외부 AI가 아닌 내부 AgentRunner(OpenRouter/Claude)로 20턴 순차 호출.

### 3.5 Discovery 진행률 집계 설계

```typescript
interface DiscoveryPortfolioProgress {
  totalItems: number;
  byGateStatus: { blocked: number; warning: number; ready: number };
  byCriterion: Array<{
    criterionId: number;
    name: string;
    completed: number;
    inProgress: number;
    needsRevision: number;
    pending: number;
    completionRate: number;    // 0~100%
  }>;
  items: Array<{
    bizItemId: string;
    bizItemTitle: string;
    completedCount: number;
    gateStatus: string;
    criteria: CriterionStatus[];  // length=9
  }>;
  bottleneck: {
    criterionId: number;
    name: string;
    completionRate: number;     // 가장 낮은 달성률 기준
  } | null;
}
```

### 3.6 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/biz-items/:id/prd/:prdId/sixhats` | Six Hats 토론 시작 (비동기, 20턴 순차) |
| GET | `/biz-items/:id/prd/:prdId/sixhats` | 토론 결과 조회 (메타 + 전체 턴) |
| GET | `/biz-items/:id/prd/:prdId/sixhats/:debateId` | 특정 토론 상세 조회 |
| GET | `/discovery/progress` | 전체 Discovery 진행률 (포트폴리오) |
| GET | `/discovery/progress/summary` | 요약 통계 (게이트별 건수 + 병목 기준) |

### 3.7 Web 컴포넌트

| 컴포넌트 | 파일 | 역할 |
|----------|------|------|
| `SixHatsDebateView` | `components/feature/SixHatsDebateView.tsx` | 턴별 카드 뷰 — 모자 색상 배지 + 발언 내용 + 타임라인 |
| `SixHatsIssueSummary` | `components/feature/SixHatsIssueSummary.tsx` | 핵심 쟁점 요약 패널 — Blue Hat 종합 + key_issues 목록 |
| `DiscoveryProgressDashboard` | `components/feature/DiscoveryProgressDashboard.tsx` | 히트맵 (BizItem × 9기준) + 파이프라인 요약 카드 |
| 대시보드 페이지 | `app/(app)/discovery/page.tsx` | Discovery 진행률 대시보드 페이지 |

---

## 4. Implementation Order

### Phase A: F188 Six Hats 토론 시뮬레이션

| Step | 작업 | 산출물 | 의존성 |
|------|------|--------|--------|
| A-1 | D1 마이그레이션 0040 생성 | `0040_sixhats_debates.sql` | — |
| A-2 | SixHatsPrompts 프롬프트 템플릿 | `services/sixhats-prompts.ts` | — |
| A-3 | SixHatsDebateService 서비스 | `services/sixhats-debate.ts` | A-1, A-2 |
| A-4 | Zod 스키마 | `schemas/sixhats.ts` | — |
| A-5 | API 라우트 (POST sixhats, GET sixhats) | `routes/biz-items.ts` 확장 | A-3, A-4 |
| A-6 | 테스트 | `__tests__/sixhats-*.test.ts` | A-2~A-5 |

### Phase B: F189 Discovery 진행률 대시보드

| Step | 작업 | 산출물 | 의존성 |
|------|------|--------|--------|
| B-1 | DiscoveryProgressService 서비스 | `services/discovery-progress.ts` | — |
| B-2 | Zod 스키마 | `schemas/discovery-progress.ts` | — |
| B-3 | API 라우트 (GET progress, GET summary) | `routes/discovery.ts` 신규 | B-1, B-2 |
| B-4 | 테스트 | `__tests__/discovery-progress-*.test.ts` | B-1~B-3 |

### Phase C: 대시보드 UI

| Step | 작업 | 산출물 | 의존성 |
|------|------|--------|--------|
| C-1 | SixHatsDebateView 컴포넌트 | `components/feature/SixHatsDebateView.tsx` | A-5 |
| C-2 | SixHatsIssueSummary 컴포넌트 | `components/feature/SixHatsIssueSummary.tsx` | A-5 |
| C-3 | DiscoveryProgressDashboard 컴포넌트 | `components/feature/DiscoveryProgressDashboard.tsx` | B-3 |
| C-4 | Discovery 대시보드 페이지 | `app/(app)/discovery/page.tsx` | C-3 |
| C-5 | Web 테스트 | `__tests__/sixhats-*.test.tsx`, `discovery-progress-*.test.tsx` | C-1~C-4 |

---

## 5. Risk & Mitigation

| # | 리스크 | 영향 | 완화 방안 |
|---|--------|------|----------|
| 1 | 20턴 순차 호출 시간 | 6~7분 소요 (기존 CLI 395초 참고) | 턴별 D1 저장으로 중단 시 이어하기 가능 + 프론트엔드 폴링 UI |
| 2 | LLM 토큰 비용 | 20턴 × ~6K 토큰 = ~120K 토큰/회 | PRD 요약본(3000자)으로 입력 최소화, 이전 턴은 최근 3턴만 주입 |
| 3 | AgentRunner 미설정 시 | Mock 모드 fallback | MockRunner가 이미 구현됨 — 더미 토론 생성 |
| 4 | Discovery 집계 쿼리 성능 | BizItem 100건+ 시 | 9기준 × N건 JOIN — 인덱스 이미 있음 (0036), LIMIT/페이징 적용 |

---

## 6. Success Criteria

| 지표 | 목표 |
|------|------|
| Six Hats 토론 완료율 | 20턴 중 18턴 이상 성공 (90%) |
| Discovery 집계 정확도 | DiscoveryCriteriaService 결과와 100% 일치 |
| API 테스트 커버리지 | 신규 엔드포인트 100% |
| Web 컴포넌트 테스트 | 신규 컴포넌트 100% |
| Match Rate 목표 | ≥ 90% |

---

## 7. Estimation

| 항목 | 예상 산출물 |
|------|------------|
| 신규 서비스 | 3개 (SixHatsDebateService, SixHatsPrompts, DiscoveryProgressService) |
| 신규 스키마 | 2개 (sixhats, discovery-progress) |
| D1 마이그레이션 | 1개 (0040) — 2개 테이블 |
| API 엔드포인트 | 5개 신규 |
| 라우트 파일 | 1개 신규 (discovery.ts) + 1개 확장 (biz-items.ts) |
| Web 컴포넌트 | 4개 (SixHatsDebateView, SixHatsIssueSummary, DiscoveryProgressDashboard, discovery page) |
| 테스트 | ~40개 예상 (서비스 20 + 라우트 10 + Web 10) |
