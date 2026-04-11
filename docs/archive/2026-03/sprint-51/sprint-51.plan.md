---
code: FX-PLAN-051
title: Sprint 51 — 사업 아이템 분류 Agent + AI 멀티 페르소나 사전 평가
version: 0.1
status: Draft
category: PLAN
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
---

# Sprint 51 Planning Document

> **Summary**: AX-Discovery-Process v0.8의 2단계(발굴) 핵심 자동화를 시작한다. AI Agent가 사업 아이템을 3턴 대화로 Type A/B/C로 분류하고(F175), KT DS 내부 8개 역할 페르소나가 자동으로 사업성을 평가하여 G/K/R 판정을 내리는(F178) 시스템을 구축한다.
>
> **Project**: Foundry-X
> **Version**: Sprint 51 (api 0.1.0 / web 0.1.0)
> **Author**: Sinclair Seo
> **Date**: 2026-03-23
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | AX BD팀이 사업 아이템을 발굴할 때 담당자별 분석 방법론이 부재하고, 사업성 판단이 주관적이며, 500개 Use Case 같은 대량 아이템을 체계적으로 선별할 방법이 없다. |
| **Solution** | F175: 사업 아이템 분류 Agent — 자연어 3턴 대화로 Type A(벤치마크)/B(트렌드)/C(Pain 기반) 자동 분류 + 유형별 분석 경로 추천. F178: 멀티 페르소나 사전 평가 — KT DS 내부 8개 역할(전략기획~기술사업화PM)을 AI Agent로 구현, 8축 레이더 차트 + G/K/R 판정. |
| **Function/UX Effect** | 담당자가 사업 아이템 설명을 입력하면 → AI가 3턴 대화로 분류 → 유형별 분석 가이드 제시. 발굴 완료 후 → 8개 페르소나가 자동 평가 → 레이더 차트 + 핵심 쟁점 요약 → Go/Keep/Drop 판정. |
| **Core Value** | "사업 아이템 하나를 분석하는 데 2주 → 2시간" — 담당자의 도메인 판단에 AI의 체계적 분석을 결합하여 발굴 속도와 품질을 동시에 향상 |

---

## 1. Overview

### 1.1 Purpose

AX-Discovery-Process v0.8에서 정의한 **2단계 발굴 프로세스**의 핵심 자동화를 Foundry-X 플랫폼에 구현한다.
기존 에이전트 아키텍처(6종 역할 에이전트 + 앙상블 투표)를 **사업성 평가 도메인**으로 확장하여, 사업 아이템의 분류·분석·평가를 체계화한다.

### 1.2 Background

- **AX-Discovery-Process v0.8**: AX BD팀 사업개발 6단계 프로세스 체계안 (2026-03)
  - 프로세스 정의서: [[FX-SPEC-BDP-001]] (`docs/specs/bizdevprocess/AX-Discovery-Process-v0.8-summary.md`)
  - Figma 원본: AX-Discovery-Process v0.8 Board
  - PDF 상세: `docs/specs/bizdevprocess/` (8개 파일)

- **기존 인프라 (Sprint 34~48)**:
  - ✅ Agent Runner: `agent-runner.ts` — 에이전트 실행 엔진 (Sprint 34)
  - ✅ 6종 역할 에이전트: Reviewer, Architect, Test, Security, QA, Infra (Sprint 37~38)
  - ✅ 앙상블 투표: `ensemble-voting.ts` — 다중 에이전트 합의 (Sprint 39)
  - ✅ 프롬프트 게이트웨이: `prompt-gateway.ts` — 에이전트 프롬프트 관리 (Sprint 39)
  - ✅ 피드백 루프: `agent-feedback-loop.ts` — 에이전트 자기 반성 (Sprint 39)
  - ✅ 모델 라우팅: `model-router.ts` — 태스크별 최적 모델 선택 (Sprint 36)
  - ✅ Evaluator-Optimizer: `evaluator-optimizer.ts` — 품질 자동 개선 (Sprint 36)
  - ✅ 멀티 페르소나 평가: Discovery-X에서 개념 설계 완료 (v0.8 §2-9)

- **해결할 Gap**:
  - ❌ 사업 아이템 유형 분류 시스템 (Type A/B/C 자동 분류)
  - ❌ 사업성 평가 전용 페르소나 에이전트 (8개 역할)
  - ❌ 평가 결과 시각화 (레이더 차트 + G/K/R 판정)
  - ❌ 사업 아이템 데이터 모델 (D1 테이블)

### 1.3 Related Documents

- SPEC.md §5: F175, F178 (📋 PLANNED)
- 프로세스 정의: [[FX-SPEC-BDP-001]]
- PRD v8: `docs/specs/FX-SPEC-PRD-V8_foundry-x.md`
- 에이전트 아키텍처: Sprint 37~39 Design 문서 (archived)

---

## 2. Scope

### 2.1 In Scope

**F175: 사업 아이템 분류 Agent (P0)**
- [ ] 사업 아이템 데이터 모델 (D1 테이블: `biz_items`, `biz_item_classifications`)
- [ ] 아이템 분류 서비스 (`item-classifier.ts`) — 3턴 대화 로직
- [ ] 3가지 유형 정의 (Type A: 벤치마크 / Type B: 트렌드 / Type C: Pain 기반)
- [ ] 유형별 분석 경로 추천 로직 (2-1~2-7 가중치 매핑)
- [ ] API 엔드포인트: `POST /api/biz-items`, `POST /api/biz-items/:id/classify`
- [ ] 분류 결과 저장 및 조회 API

**F178: AI 멀티 페르소나 사전 평가 (P0)**
- [ ] 8개 KT DS 페르소나 프롬프트 정의 (`biz-persona-prompts.ts`)
- [ ] 페르소나 평가 서비스 (`biz-persona-evaluator.ts`) — 기존 agent-runner 활용
- [ ] 8축 평가 기준 스키마 (사업성, 전략적합성, 고객가치, 기술시장성, 실행력, 재무타당성, 경쟁차별화, 확장가능성)
- [ ] 평가 결과 집계 및 G/K/R 판정 로직
- [ ] API 엔드포인트: `POST /api/biz-items/:id/evaluate`, `GET /api/biz-items/:id/evaluation`
- [ ] 평가 결과 D1 저장 (`biz_evaluations`, `biz_evaluation_scores`)

### 2.2 Out of Scope

- F176: 유형별 분석 파이프라인 (2-1~2-7 HITL 워크플로우) → Sprint 52+
- F177: 발굴 결과 패키징 (Discovery Output Report) → Sprint 52+
- F179: 수집 채널 통합 → Sprint 53+
- F180/F181: 형상화 자동 생성 → 후속 Sprint
- 평가 결과 UI 대시보드 (웹 프론트엔드) → Sprint 52+ 별도 계획
- Discovery-X 연동 (외부 시스템 통합) → Phase 5b 후반

### 2.3 Dependencies

| 의존성 | 상태 | 설명 |
|--------|------|------|
| agent-runner | ✅ 구현 완료 | 에이전트 실행 엔진 재활용 |
| ensemble-voting | ✅ 구현 완료 | 다중 페르소나 투표 로직 참고 |
| prompt-gateway | ✅ 구현 완료 | 프롬프트 관리 패턴 재활용 |
| model-router | ✅ 구현 완료 | LLM 호출 라우팅 |
| D1 마이그레이션 | 🔧 필요 | 0033: biz_items + biz_item_classifications + biz_evaluations + biz_evaluation_scores |

---

## 3. Technical Approach

### 3.1 F175: 사업 아이템 분류 Agent

#### 3턴 대화 구조

```
Turn 1 (출처 파악):
  "이 아이템은 어디서 시작됐나요? 참고한 서비스·URL이 있나요,
   아니면 기술 키워드나 고객 요청인가요?"

Turn 2 (핵심 강점):
  "현재 갖고 계신 자료가 어느 수준인가요?
   레퍼런스 자료/시장 데이터/고객 인터뷰 중 무엇이 있나요?"

Turn 3 (초점 검증):
  "KT DS 관점 수익 등가는 무엇인가요?
   신사업 개척/기존 고객 확장/수익모델 전환 중 어디에 가깝나요?"
```

#### 분류 결과 → 분석 경로 매핑

| 분석 단계 | Type A (벤치마크) | Type B (트렌드) | Type C (Pain) |
|-----------|:-:|:-:|:-:|
| 2-1 레퍼런스 | ★★★ | ★ | - |
| 2-2 시장 검증 | ★ | ★★★ | ★ |
| 2-3 경쟁·자사 | ★★★ | ★★ | ★★ |
| 2-4 아이템 도출 | ★★★ | ★★★ | ★ |
| 2-5 아이템 선정 | ★★ | ★★★ | ★ |
| 2-6 고객 정의 | ★★ | ★★ | ★★★ |
| 2-7 BM 정의 | ★★ | ★★ | ★★★ |

(★★★: 핵심/심화, ★★: 보통, ★: 간소, -: 스킵 가능)

#### 데이터 모델

```sql
-- 0033 마이그레이션
CREATE TABLE biz_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,          -- 'agent' | 'field' | 'idea_portal'
  status TEXT DEFAULT 'draft',  -- 'draft' | 'classifying' | 'classified' | 'evaluating' | 'evaluated' | 'archived'
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE TABLE biz_item_classifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL UNIQUE,
  item_type TEXT NOT NULL,       -- 'type_a' | 'type_b' | 'type_c'
  confidence REAL,               -- 0.0 ~ 1.0
  turn_1_answer TEXT,
  turn_2_answer TEXT,
  turn_3_answer TEXT,
  analysis_weights TEXT,         -- JSON: {"ref":3,"market":1,...}
  classified_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);
```

### 3.2 F178: AI 멀티 페르소나 사전 평가

#### 8개 페르소나 에이전트

기존 `agent-runner.ts` + `prompt-gateway.ts` 인프라를 재활용.
각 페르소나는 **시스템 프롬프트 + 평가 기준 + 점수 스키마**로 구성.

```typescript
// biz-persona-prompts.ts
export const BIZ_PERSONAS = [
  { id: 'strategy',    name: '전략기획팀장', focus: ['전략적합성', '시장규모', '성장잠재력'] },
  { id: 'sales',       name: '영업총괄부장', focus: ['수주확보', '기존고객 확장', '영업난이도'] },
  { id: 'ap_biz',      name: 'AP사업본부장', focus: ['기술실현', '자원투입비', '타임라인'] },
  { id: 'ai_tech',     name: 'AI기술본부장', focus: ['기술차별성', 'AI 적합성', '데이터 확보'] },
  { id: 'finance',     name: '경영기획팀장', focus: ['재무타당성', 'ROI', '투자회수기간'] },
  { id: 'security',    name: '보안전략팀장', focus: ['보안위험', '컴플라이언스', '데이터 거버넌스'] },
  { id: 'partnership', name: '대외협력팀장', focus: ['파트너십', '규제환경', '시장진입 장벽'] },
  { id: 'product',     name: '기술사업화PM', focus: ['사업화 실행력', '리스크', 'MVP 가능성'] },
] as const;
```

#### 8축 평가 스키마

```typescript
// Zod 스키마
const evaluationScoreSchema = z.object({
  businessViability: z.number().min(1).max(10),   // 사업성/사업타당성
  strategicFit: z.number().min(1).max(10),        // 전략적합성
  customerValue: z.number().min(1).max(10),        // 고객가치
  techMarket: z.number().min(1).max(10),           // 기술시장성
  execution: z.number().min(1).max(10),            // 실행력/리스크
  financialFeasibility: z.number().min(1).max(10), // 재무타당성
  competitiveDiff: z.number().min(1).max(10),      // 경쟁차별화
  scalability: z.number().min(1).max(10),          // 확장가능성
  summary: z.string(),                             // 핵심 소견 (200자 이내)
  concerns: z.array(z.string()),                   // 주요 쟁점
});
```

#### G/K/R 판정 로직

```
평균 점수 계산 → 8개 페르소나의 8축 점수 평균
  ├─ 🟢 G (Green): 평균 >= 7.0 AND 쟁점 0~2개 → 형상화 진행
  ├─ 🟡 K (Keep):  평균 5.0~6.9 OR 쟁점 3~5개 → 보완 후 재평가
  └─ 🔴 R (Red):   평균 < 5.0 OR 쟁점 6개+ → Drop 또는 피봇
```

#### 데이터 모델

```sql
CREATE TABLE biz_evaluations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  verdict TEXT,            -- 'green' | 'keep' | 'red'
  avg_score REAL,
  total_concerns INTEGER,
  evaluated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE TABLE biz_evaluation_scores (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  evaluation_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  business_viability REAL,
  strategic_fit REAL,
  customer_value REAL,
  tech_market REAL,
  execution REAL,
  financial_feasibility REAL,
  competitive_diff REAL,
  scalability REAL,
  summary TEXT,
  concerns TEXT,           -- JSON array
  FOREIGN KEY (evaluation_id) REFERENCES biz_evaluations(id)
);
```

---

## 4. Implementation Plan

### 4.1 Build Sequence

```
Phase 1: 데이터 모델 + 기본 API (Day 1)
├── D1 마이그레이션 0033: biz_items + biz_item_classifications
├── D1 마이그레이션 0034: biz_evaluations + biz_evaluation_scores
├── Zod 스키마: biz-item.ts, biz-evaluation.ts
├── CRUD 서비스: biz-item-service.ts
└── 기본 라우트: POST/GET /api/biz-items

Phase 2: 아이템 분류 Agent (Day 1~2)
├── item-classifier.ts: 3턴 대화 분류 로직
├── 프롬프트: item-classification-prompts.ts
├── 분석 경로 매핑: analysis-weight-mapper.ts
├── 라우트: POST /api/biz-items/:id/classify
└── 테스트: classifier 단위 + API 통합

Phase 3: 멀티 페르소나 평가 (Day 2~3)
├── biz-persona-prompts.ts: 8개 페르소나 시스템 프롬프트
├── biz-persona-evaluator.ts: 병렬 평가 + 집계
├── verdict-calculator.ts: G/K/R 판정 로직
├── 라우트: POST /api/biz-items/:id/evaluate, GET evaluation
└── 테스트: evaluator 단위 + API 통합

Phase 4: 통합 테스트 + 배포 (Day 3)
├── E2E: 아이템 생성 → 분류 → 평가 → 판정 흐름
├── Workers 배포 + D1 마이그레이션 적용
└── 프로덕션 검증
```

### 4.2 예상 산출물

| 구분 | 파일 | 설명 |
|------|------|------|
| 마이그레이션 | `0033_biz_items.sql` | 사업 아이템 + 분류 테이블 |
| 마이그레이션 | `0034_biz_evaluations.sql` | 평가 + 점수 테이블 |
| 스키마 | `biz-item.ts` | Zod 스키마 |
| 스키마 | `biz-evaluation.ts` | Zod 스키마 |
| 서비스 | `biz-item-service.ts` | CRUD + 상태 관리 |
| 서비스 | `item-classifier.ts` | 3턴 대화 분류 |
| 서비스 | `biz-persona-evaluator.ts` | 8 페르소나 병렬 평가 |
| 서비스 | `verdict-calculator.ts` | G/K/R 판정 |
| 프롬프트 | `item-classification-prompts.ts` | 분류 Agent 프롬프트 |
| 프롬프트 | `biz-persona-prompts.ts` | 8개 페르소나 프롬프트 |
| 라우트 | `biz-items.ts` | API 엔드포인트 |
| 테스트 | `biz-item-service.test.ts` | 서비스 단위 테스트 |
| 테스트 | `item-classifier.test.ts` | 분류 로직 테스트 |
| 테스트 | `biz-persona-evaluator.test.ts` | 평가 로직 테스트 |
| 테스트 | `biz-items.test.ts` | API 통합 테스트 |

### 4.3 예상 엔드포인트 (6개 신규)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/biz-items` | 사업 아이템 등록 |
| GET | `/api/biz-items` | 아이템 목록 조회 (org별 필터) |
| GET | `/api/biz-items/:id` | 아이템 상세 조회 |
| POST | `/api/biz-items/:id/classify` | 아이템 분류 실행 |
| POST | `/api/biz-items/:id/evaluate` | 멀티 페르소나 평가 실행 |
| GET | `/api/biz-items/:id/evaluation` | 평가 결과 조회 |

---

## 5. Risk & Mitigation

| 리스크 | 영향 | 완화 |
|--------|------|------|
| LLM 응답 품질 불일치 | 페르소나별 평가 편차 | Evaluator-Optimizer 패턴으로 품질 보정 + 온도 파라미터 조정 |
| 8개 페르소나 병렬 호출 비용 | API 비용 증가 | model-router로 저비용 모델 우선 시도, 핵심 페르소나만 고급 모델 |
| 3턴 대화 UX | 사용자 이탈 | 1턴으로도 기본 분류 가능하게 fallback 제공 |
| D1 마이그레이션 충돌 | 0033~0034 번호 충돌 | 세션 시작 시 최신 번호 확인 |

---

## 6. Success Criteria

| 기준 | 목표 |
|------|------|
| Match Rate | >= 90% |
| 신규 API 테스트 | >= 30개 |
| 분류 정확도 | Type A/B/C 명확한 케이스에서 90%+ |
| 평가 완료 시간 | 8 페르소나 병렬 평가 < 30초 |
| G/K/R 판정 | 테스트 아이템 3개 이상으로 검증 |
