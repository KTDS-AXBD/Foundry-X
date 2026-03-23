---
code: FX-DSGN-051
title: Sprint 51 — 사업 아이템 분류 Agent + AI 멀티 페르소나 사전 평가
version: 0.1
status: Draft
category: DSGN
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
---

# Sprint 51 Design Document

> **Summary**: 사업 아이템 3턴 분류 Agent(F175) + KT DS 8개 역할 페르소나 자동 평가(F178) 상세 설계. 기존 AgentRunner + EnsembleVoting 인프라를 사업성 평가 도메인으로 확장.
>
> **Project**: Foundry-X
> **Version**: Sprint 51 (api 0.1.0 / web 0.1.0)
> **Author**: Sinclair Seo
> **Date**: 2026-03-23
> **Status**: Draft
> **Planning Doc**: [sprint-51.plan.md](../../01-plan/features/sprint-51.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **체계적 분류**: 자연어 3턴 대화로 사업 아이템을 Type A/B/C로 분류하고, 유형별 분석 경로(가중치) 자동 추천
2. **다관점 평가**: KT DS 내부 8개 역할 페르소나가 병렬로 사업성을 평가하여 편향 없는 G/K/R 판정
3. **인프라 재활용**: 기존 `AgentRunner` + `EnsembleVoting` + `ModelRouter` 아키텍처 위에 구축, 신규 코드 최소화

### 1.2 Design Principles

- **기존 패턴 준수**: Hono + Zod + D1 + OpenAPI 패턴 그대로 사용
- **LLM 호출 최소화**: 분류는 단일 호출(3턴 시뮬레이션), 평가는 8개 병렬 1회
- **판정 로직 분리**: LLM 응답과 비즈니스 판정(G/K/R)을 서비스 레이어에서 분리

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  API Layer (Hono Routes)                                             │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  biz-items.ts (NEW route)                                    │    │
│  │  POST /api/biz-items              → CRUD 등록                │    │
│  │  GET  /api/biz-items              → 목록 조회 (org 필터)     │    │
│  │  GET  /api/biz-items/:id          → 상세 조회                │    │
│  │  POST /api/biz-items/:id/classify → 분류 실행                │    │
│  │  POST /api/biz-items/:id/evaluate → 평가 실행                │    │
│  │  GET  /api/biz-items/:id/evaluation → 평가 결과 조회         │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────┐    ┌──────────────────────┐    ┌───────────────────────┐
│ biz-item-   │    │ item-classifier.ts   │    │ biz-persona-          │
│ service.ts  │    │ (NEW)                │    │ evaluator.ts (NEW)    │
│             │    │                      │    │                       │
│ CRUD +      │    │ 3턴 대화 시뮬레이션  │    │ 8 페르소나 병렬 실행  │
│ 상태 관리   │    │ → Type A/B/C 분류    │    │ → 8축 점수 집계       │
│             │    │ → 분석 가중치 매핑   │    │ → G/K/R 판정          │
└──────┬──────┘    └──────────┬───────────┘    └───────────┬───────────┘
       │                      │                            │
       │              ┌───────┴───────┐            ┌───────┴───────┐
       │              ▼               │            ▼               │
       │    ┌──────────────┐          │  ┌──────────────────┐      │
       │    │ AgentRunner  │          │  │ AgentRunner      │      │
       │    │ (기존)       │          │  │ (기존, ×8 병렬)  │      │
       │    └──────┬───────┘          │  └──────┬───────────┘      │
       │           │                  │         │                  │
       ▼           ▼                  ▼         ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  D1 Database                                                         │
│  ┌───────────┐ ┌──────────────────────┐ ┌─────────────────────────┐ │
│  │ biz_items │ │ biz_item_             │ │ biz_evaluations         │ │
│  │           │ │ classifications       │ │ biz_evaluation_scores   │ │
│  └───────────┘ └──────────────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Sequence Diagram — 분류 흐름 (F175)

```
Client              biz-items route       item-classifier        AgentRunner         D1
  │                      │                     │                     │               │
  │ POST /classify       │                     │                     │               │
  │─────────────────────>│                     │                     │               │
  │                      │ classifyItem(id)    │                     │               │
  │                      │────────────────────>│                     │               │
  │                      │                     │ buildPrompt(item)   │               │
  │                      │                     │──────┐              │               │
  │                      │                     │<─────┘              │               │
  │                      │                     │ execute(prompt)     │               │
  │                      │                     │────────────────────>│               │
  │                      │                     │    {type, answers,  │               │
  │                      │                     │     confidence}     │               │
  │                      │                     │<────────────────────│               │
  │                      │                     │ mapWeights(type)    │               │
  │                      │                     │──────┐              │               │
  │                      │                     │<─────┘              │               │
  │                      │                     │ INSERT classification               │
  │                      │                     │──────────────────────────────────────>│
  │                      │  {type, weights}    │                     │               │
  │                      │<────────────────────│                     │               │
  │  200 OK              │                     │                     │               │
  │<─────────────────────│                     │                     │               │
```

### 2.3 Sequence Diagram — 평가 흐름 (F178)

```
Client           biz-items route    biz-persona-evaluator      AgentRunner(×8)       D1
  │                   │                    │                        │                 │
  │ POST /evaluate    │                    │                        │                 │
  │──────────────────>│                    │                        │                 │
  │                   │ evaluateItem(id)   │                        │                 │
  │                   │───────────────────>│                        │                 │
  │                   │                    │ buildPrompts(item, 8)  │                 │
  │                   │                    │──────┐                 │                 │
  │                   │                    │<─────┘                 │                 │
  │                   │                    │ Promise.allSettled(     │                 │
  │                   │                    │   8 × execute(prompt)) │                 │
  │                   │                    │───────────────────────>│                 │
  │                   │                    │   8 × {scores, summary}│                 │
  │                   │                    │<───────────────────────│                 │
  │                   │                    │ aggregateScores()      │                 │
  │                   │                    │──────┐                 │                 │
  │                   │                    │<─────┘                 │                 │
  │                   │                    │ calculateVerdict()     │                 │
  │                   │                    │──────┐                 │                 │
  │                   │                    │<─────┘                 │                 │
  │                   │                    │ INSERT evaluation + scores               │
  │                   │                    │─────────────────────────────────────────>│
  │                   │  {verdict, scores} │                        │                 │
  │                   │<───────────────────│                        │                 │
  │  200 OK           │                    │                        │                 │
  │<──────────────────│                    │                        │                 │
```

---

## 3. Data Model

### 3.1 D1 마이그레이션 0033: biz_items + biz_item_classifications

```sql
-- 0033_biz_items.sql
CREATE TABLE IF NOT EXISTS biz_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'field',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX idx_biz_items_org ON biz_items(org_id);
CREATE INDEX idx_biz_items_status ON biz_items(status);

CREATE TABLE IF NOT EXISTS biz_item_classifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL UNIQUE,
  item_type TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.0,
  turn_1_answer TEXT,
  turn_2_answer TEXT,
  turn_3_answer TEXT,
  analysis_weights TEXT NOT NULL DEFAULT '{}',
  classified_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);
```

**status 열거형**: `draft` → `classifying` → `classified` → `evaluating` → `evaluated` → `archived`
**source 열거형**: `agent` | `field` | `idea_portal`
**item_type 열거형**: `type_a` | `type_b` | `type_c`

### 3.2 D1 마이그레이션 0034: biz_evaluations + biz_evaluation_scores

```sql
-- 0034_biz_evaluations.sql
CREATE TABLE IF NOT EXISTS biz_evaluations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  verdict TEXT NOT NULL,
  avg_score REAL NOT NULL DEFAULT 0.0,
  total_concerns INTEGER NOT NULL DEFAULT 0,
  evaluated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_biz_evaluations_item ON biz_evaluations(biz_item_id);

CREATE TABLE IF NOT EXISTS biz_evaluation_scores (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  evaluation_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  business_viability REAL NOT NULL DEFAULT 0,
  strategic_fit REAL NOT NULL DEFAULT 0,
  customer_value REAL NOT NULL DEFAULT 0,
  tech_market REAL NOT NULL DEFAULT 0,
  execution REAL NOT NULL DEFAULT 0,
  financial_feasibility REAL NOT NULL DEFAULT 0,
  competitive_diff REAL NOT NULL DEFAULT 0,
  scalability REAL NOT NULL DEFAULT 0,
  summary TEXT,
  concerns TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (evaluation_id) REFERENCES biz_evaluations(id) ON DELETE CASCADE
);

CREATE INDEX idx_biz_eval_scores_eval ON biz_evaluation_scores(evaluation_id);
```

**verdict 열거형**: `green` | `keep` | `red`
**persona_id 열거형**: `strategy` | `sales` | `ap_biz` | `ai_tech` | `finance` | `security` | `partnership` | `product`

---

## 4. API Design

### 4.1 Zod 스키마 — `biz-item.ts` (NEW)

```typescript
// packages/api/src/schemas/biz-item.ts

import { z } from '@hono/zod-openapi';

// --- 공통 열거형 ---
export const bizItemSource = z.enum(['agent', 'field', 'idea_portal']);
export const bizItemStatus = z.enum(['draft', 'classifying', 'classified', 'evaluating', 'evaluated', 'archived']);
export const bizItemType = z.enum(['type_a', 'type_b', 'type_c']);
export const evaluationVerdict = z.enum(['green', 'keep', 'red']);
export const personaId = z.enum([
  'strategy', 'sales', 'ap_biz', 'ai_tech',
  'finance', 'security', 'partnership', 'product'
]);

// --- 요청 스키마 ---
export const CreateBizItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  source: bizItemSource.default('field'),
}).openapi('CreateBizItem');

export const ClassifyBizItemSchema = z.object({
  context: z.string().max(3000).optional(),  // 추가 컨텍스트 (선택)
}).openapi('ClassifyBizItem');

export const EvaluateBizItemSchema = z.object({
  models: z.array(z.string()).max(3).optional(),  // 특정 모델 지정 (선택)
}).openapi('EvaluateBizItem');

// --- 응답 스키마 ---
export const BizItemSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  source: bizItemSource,
  status: bizItemStatus,
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  classification: z.object({
    itemType: bizItemType,
    confidence: z.number(),
    analysisWeights: z.record(z.number()),
    classifiedAt: z.string(),
  }).nullable(),
}).openapi('BizItem');

export const ClassificationResultSchema = z.object({
  itemType: bizItemType,
  confidence: z.number().min(0).max(1),
  turnAnswers: z.object({
    turn1: z.string(),
    turn2: z.string(),
    turn3: z.string(),
  }),
  analysisWeights: z.record(z.number()),  // {"ref":3,"market":1,...}
  reasoning: z.string(),
}).openapi('ClassificationResult');

export const EvaluationScoreSchema = z.object({
  personaId: personaId,
  personaName: z.string(),
  businessViability: z.number().min(1).max(10),
  strategicFit: z.number().min(1).max(10),
  customerValue: z.number().min(1).max(10),
  techMarket: z.number().min(1).max(10),
  execution: z.number().min(1).max(10),
  financialFeasibility: z.number().min(1).max(10),
  competitiveDiff: z.number().min(1).max(10),
  scalability: z.number().min(1).max(10),
  summary: z.string(),
  concerns: z.array(z.string()),
}).openapi('EvaluationScore');

export const EvaluationResultSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  verdict: evaluationVerdict,
  avgScore: z.number(),
  totalConcerns: z.number(),
  scores: z.array(EvaluationScoreSchema),
  evaluatedAt: z.string(),
}).openapi('EvaluationResult');
```

### 4.2 엔드포인트 상세 — `biz-items.ts` (NEW route)

| # | Method | Path | Auth | 요청 | 응답 | 설명 |
|---|--------|------|------|------|------|------|
| 1 | POST | `/api/biz-items` | ✅ Bearer | `CreateBizItemSchema` | `BizItemSchema` (201) | 사업 아이템 등록 |
| 2 | GET | `/api/biz-items` | ✅ Bearer | query: `?status=`, `?source=` | `BizItemSchema[]` (200) | 목록 조회 (org 필터) |
| 3 | GET | `/api/biz-items/:id` | ✅ Bearer | - | `BizItemSchema` (200) | 상세 조회 (분류 결과 포함) |
| 4 | POST | `/api/biz-items/:id/classify` | ✅ Bearer | `ClassifyBizItemSchema` | `ClassificationResultSchema` (200) | 분류 실행 |
| 5 | POST | `/api/biz-items/:id/evaluate` | ✅ Bearer | `EvaluateBizItemSchema` | `EvaluationResultSchema` (200) | 멀티 페르소나 평가 |
| 6 | GET | `/api/biz-items/:id/evaluation` | ✅ Bearer | - | `EvaluationResultSchema` (200) | 평가 결과 조회 |

### 4.3 에러 케이스

| 상황 | HTTP | 코드 |
|------|------|------|
| 아이템 미존재 | 404 | `BIZ_ITEM_NOT_FOUND` |
| 분류 전 평가 시도 | 400 | `CLASSIFICATION_REQUIRED` |
| 이미 분류 완료 | 409 | `ALREADY_CLASSIFIED` |
| LLM 응답 파싱 실패 | 502 | `LLM_PARSE_ERROR` |
| LLM 타임아웃 | 504 | `LLM_TIMEOUT` |
| org 권한 없음 | 403 | `ORG_ACCESS_DENIED` |

---

## 5. Service Design

### 5.1 biz-item-service.ts — CRUD + 상태 관리

```typescript
// packages/api/src/services/biz-item-service.ts

export class BizItemService {
  constructor(private db: D1Database) {}

  async create(orgId: string, userId: string, data: CreateBizItemInput): Promise<BizItem>
  async list(orgId: string, filters?: { status?: string; source?: string }): Promise<BizItem[]>
  async getById(orgId: string, id: string): Promise<BizItem | null>
  async updateStatus(id: string, status: BizItemStatus): Promise<void>

  // 분류 결과 저장
  async saveClassification(bizItemId: string, result: ClassificationResult): Promise<void>

  // 평가 결과 저장
  async saveEvaluation(bizItemId: string, evaluation: EvaluationData): Promise<string>
  async saveEvaluationScores(evaluationId: string, scores: EvaluationScoreData[]): Promise<void>

  // 평가 결과 조회 (scores JOIN)
  async getEvaluation(bizItemId: string): Promise<EvaluationWithScores | null>
}
```

### 5.2 item-classifier.ts — 3턴 대화 분류 (F175 핵심)

```typescript
// packages/api/src/services/item-classifier.ts

export class ItemClassifier {
  constructor(
    private runner: AgentRunner,
    private db: D1Database,
  ) {}

  /**
   * 사업 아이템을 Type A/B/C로 분류한다.
   * 3턴 대화를 단일 프롬프트로 시뮬레이션하여 LLM 호출 1회로 완료.
   */
  async classify(item: BizItem, context?: string): Promise<ClassificationResult>
}

// --- 프롬프트 구조 ---
// 단일 호출로 3턴을 시뮬레이션하는 구조화 프롬프트:
//
// System: "당신은 KT DS AX BD팀의 사업 아이템 분류 전문가입니다..."
// User:
//   "다음 사업 아이템을 분석하고, 아래 3가지 질문에 자문자답한 뒤 분류해주세요.
//
//    [사업 아이템]
//    제목: {title}
//    설명: {description}
//    {context가 있으면 추가}
//
//    [질문 1 - 출처 파악]
//    이 아이템은 어디서 시작됐나요? ...
//
//    [질문 2 - 핵심 강점]
//    현재 갖고 계신 자료가 어느 수준인가요? ...
//
//    [질문 3 - 초점 검증]
//    KT DS 관점 수익 등가는 무엇인가요? ...
//
//    [출력 형식] JSON
//    {
//      "type": "type_a" | "type_b" | "type_c",
//      "confidence": 0.0~1.0,
//      "turn1Answer": "...",
//      "turn2Answer": "...",
//      "turn3Answer": "...",
//      "reasoning": "...",
//      "analysisWeights": { "ref": 1~3, "market": 1~3, ... }
//    }"

// --- 분석 가중치 기본값 (LLM이 override 가능) ---
export const DEFAULT_WEIGHTS: Record<string, Record<string, number>> = {
  type_a: { ref: 3, market: 1, competition: 3, derive: 3, select: 2, customer: 2, bm: 2 },
  type_b: { ref: 1, market: 3, competition: 2, derive: 3, select: 3, customer: 2, bm: 2 },
  type_c: { ref: 0, market: 1, competition: 2, derive: 1, select: 1, customer: 3, bm: 3 },
};
```

### 5.3 biz-persona-evaluator.ts — 8 페르소나 병렬 평가 (F178 핵심)

```typescript
// packages/api/src/services/biz-persona-evaluator.ts

export class BizPersonaEvaluator {
  constructor(
    private runner: AgentRunner,
    private db: D1Database,
  ) {}

  /**
   * 8개 페르소나로 사업 아이템을 병렬 평가한다.
   * Promise.allSettled()로 부분 실패 허용 (최소 5/8 성공 시 판정 가능).
   */
  async evaluate(item: BizItem, classification: Classification): Promise<EvaluationResult>

  /**
   * 개별 페르소나 평가 실행 (내부 메서드)
   */
  private async evaluateWithPersona(
    persona: BizPersona,
    item: BizItem,
    classification: Classification,
  ): Promise<EvaluationScoreData>

  /**
   * 8축 점수 집계 + G/K/R 판정
   */
  private aggregateAndVerdict(scores: EvaluationScoreData[]): {
    verdict: 'green' | 'keep' | 'red';
    avgScore: number;
    totalConcerns: number;
  }
}

// --- G/K/R 판정 로직 ---
// Green: avgScore >= 7.0 AND totalConcerns <= 2
// Keep:  avgScore >= 5.0 AND avgScore < 7.0 OR totalConcerns 3~5
// Red:   avgScore < 5.0 OR totalConcerns >= 6
//
// 추가 규칙:
// - 8개 중 3개 이상 페르소나가 특정 축에서 3 이하 → 해당 축 "경고" 플래그
// - 전략기획/경영기획 둘 다 5 미만 → 자동 "Keep" 하향
```

### 5.4 biz-persona-prompts.ts — 8개 페르소나 시스템 프롬프트

```typescript
// packages/api/src/services/biz-persona-prompts.ts

export interface BizPersona {
  id: string;
  name: string;
  role: string;
  focus: string[];
  systemPrompt: string;
}

export const BIZ_PERSONAS: BizPersona[] = [
  {
    id: 'strategy',
    name: '전략기획팀장',
    role: 'KT DS 전략기획팀장 (15년차)',
    focus: ['전략적합성', '시장규모', '성장잠재력'],
    systemPrompt: `당신은 KT DS 전략기획팀장입니다. 15년간 SI/SM 사업의 전략 수립과 신사업 기획을 담당해왔습니다.
평가 관점: KT DS의 중장기 전략과의 정합성, 시장 규모와 성장성, 기존 사업과의 시너지.
주요 질문: "이 사업이 KT DS의 3개년 전략 방향과 맞는가?", "시장이 충분히 크고 성장하는가?"`,
  },
  {
    id: 'sales',
    name: '영업총괄부장',
    role: 'KT DS 영업총괄부장 (20년차)',
    focus: ['수주확보 가능성', '기존고객 확장', '영업난이도'],
    systemPrompt: `당신은 KT DS 영업총괄부장입니다. 20년간 B2B/B2G 영업 현장에서 일해왔습니다.
평가 관점: 실제 수주 가능성, 기존 고객 확장 여부, 영업 사이클과 난이도.
주요 질문: "지금 파이프라인에 이걸 넣을 고객이 있는가?", "단가와 계약 구조가 현실적인가?"`,
  },
  {
    id: 'ap_biz',
    name: 'AP사업본부장',
    role: 'KT DS AP사업본부장 (18년차)',
    focus: ['기술실현 가능성', '자원투입비', '타임라인'],
    systemPrompt: `당신은 KT DS AP사업본부장입니다. 18년간 어플리케이션 개발 사업을 총괄해왔습니다.
평가 관점: 기술적 실현 가능성, 필요 인력과 비용, 개발 타임라인.
주요 질문: "우리 기술 역량으로 만들 수 있는가?", "필요 인력과 기간이 현실적인가?"`,
  },
  {
    id: 'ai_tech',
    name: 'AI기술본부장',
    role: 'KT DS AI기술본부장 (12년차)',
    focus: ['기술차별성', 'AI 적합성', '데이터 확보'],
    systemPrompt: `당신은 KT DS AI기술본부장입니다. 12년간 AI/ML 연구개발과 사업화를 이끌어왔습니다.
평가 관점: AI 기술 차별성, 데이터 확보 가능성, 기술 성숙도.
주요 질문: "AI가 정말 핵심 가치인가 장식인가?", "학습 데이터를 확보할 수 있는가?"`,
  },
  {
    id: 'finance',
    name: '경영기획팀장',
    role: 'KT DS 경영기획팀장 (15년차)',
    focus: ['재무타당성', 'ROI', '투자회수기간'],
    systemPrompt: `당신은 KT DS 경영기획팀장입니다. 15년간 사업 투자 심의와 손익 관리를 담당해왔습니다.
평가 관점: 투자 대비 수익성, BEP 도달 시점, 리스크 대비 기대 수익.
주요 질문: "투자금 회수까지 몇 년인가?", "손익분기점이 현실적인가?"`,
  },
  {
    id: 'security',
    name: '보안전략팀장',
    role: 'KT DS 보안전략팀장 (13년차)',
    focus: ['보안위험', '컴플라이언스', '데이터 거버넌스'],
    systemPrompt: `당신은 KT DS 보안전략팀장입니다. 13년간 정보보안 전략과 컴플라이언스를 관리해왔습니다.
평가 관점: 보안 위험, 개인정보 처리, 규제 준수, 고객 데이터 관리.
주요 질문: "개인정보 이슈가 있는가?", "보안 인증이 필요한가?"`,
  },
  {
    id: 'partnership',
    name: '대외협력팀장',
    role: 'KT DS 대외협력팀장 (14년차)',
    focus: ['파트너십', '규제환경', '시장진입 장벽'],
    systemPrompt: `당신은 KT DS 대외협력팀장입니다. 14년간 파트너 발굴, 제휴, 규제 대응을 총괄해왔습니다.
평가 관점: 파트너십 필요성, 규제 환경, 진입 장벽, 생태계 구축 가능성.
주요 질문: "핵심 파트너가 있는가?", "규제나 인허가 이슈는?"`,
  },
  {
    id: 'product',
    name: '기술사업화PM',
    role: 'KT DS 기술사업화PM (10년차)',
    focus: ['사업화 실행력', '리스크', 'MVP 가능성'],
    systemPrompt: `당신은 KT DS 기술사업화PM입니다. 10년간 기술을 사업으로 전환하는 일을 해왔습니다.
평가 관점: MVP 구축 가능성, Go-to-Market 실행력, 리스크 관리.
주요 질문: "3개월 내 MVP를 만들 수 있는가?", "첫 고객을 어떻게 확보하는가?"`,
  },
];

// --- 공통 평가 프롬프트 템플릿 ---
export function buildEvaluationPrompt(persona: BizPersona, item: BizItem, classification: Classification): string {
  return `${persona.systemPrompt}

다음 사업 아이템을 평가해주세요.

[사업 아이템]
제목: ${item.title}
설명: ${item.description}
유형: ${classification.itemType} (신뢰도: ${classification.confidence})

[평가 기준 - 각 항목 1~10점]
1. 사업성/사업타당성 (businessViability)
2. 전략적합성 (strategicFit)
3. 고객가치 (customerValue)
4. 기술시장성 (techMarket)
5. 실행력/리스크 (execution)
6. 재무타당성 (financialFeasibility)
7. 경쟁차별화 (competitiveDiff)
8. 확장가능성 (scalability)

[출력 형식] JSON
{
  "businessViability": <1-10>,
  "strategicFit": <1-10>,
  "customerValue": <1-10>,
  "techMarket": <1-10>,
  "execution": <1-10>,
  "financialFeasibility": <1-10>,
  "competitiveDiff": <1-10>,
  "scalability": <1-10>,
  "summary": "<200자 이내 핵심 소견>",
  "concerns": ["<주요 쟁점 1>", "<주요 쟁점 2>", ...]
}`;
}
```

---

## 6. Implementation Order

### 6.1 Build Sequence (구현 순서)

```
Phase 1: 데이터 모델 + 기본 CRUD (1h)
├── [1] 0033_biz_items.sql 마이그레이션
├── [2] 0034_biz_evaluations.sql 마이그레이션
├── [3] schemas/biz-item.ts — Zod 스키마
├── [4] services/biz-item-service.ts — CRUD
├── [5] routes/biz-items.ts — POST/GET 기본 3개
└── [6] biz-item-service.test.ts + biz-items.test.ts

Phase 2: 아이템 분류 Agent (1.5h)
├── [7] services/item-classification-prompts.ts — 프롬프트
├── [8] services/item-classifier.ts — 분류 로직
├── [9] routes/biz-items.ts — POST /:id/classify 추가
└── [10] item-classifier.test.ts + classify API 테스트

Phase 3: 멀티 페르소나 평가 (2h)
├── [11] services/biz-persona-prompts.ts — 8개 페르소나
├── [12] services/biz-persona-evaluator.ts — 평가 + 판정
├── [13] routes/biz-items.ts — POST /:id/evaluate + GET evaluation
└── [14] biz-persona-evaluator.test.ts + evaluate API 테스트

Phase 4: 통합 + 배포 (0.5h)
├── [15] E2E 흐름 테스트 (등록 → 분류 → 평가 → 판정)
├── [16] app.ts에 biz-items 라우트 등록
└── [17] wrangler d1 migrations apply + deploy
```

### 6.2 파일 목록

| # | 구분 | 파일 경로 | 액션 |
|---|------|----------|------|
| 1 | 마이그레이션 | `packages/api/src/db/migrations/0033_biz_items.sql` | NEW |
| 2 | 마이그레이션 | `packages/api/src/db/migrations/0034_biz_evaluations.sql` | NEW |
| 3 | 스키마 | `packages/api/src/schemas/biz-item.ts` | NEW |
| 4 | 서비스 | `packages/api/src/services/biz-item-service.ts` | NEW |
| 5 | 서비스 | `packages/api/src/services/item-classifier.ts` | NEW |
| 6 | 서비스 | `packages/api/src/services/item-classification-prompts.ts` | NEW |
| 7 | 서비스 | `packages/api/src/services/biz-persona-evaluator.ts` | NEW |
| 8 | 서비스 | `packages/api/src/services/biz-persona-prompts.ts` | NEW |
| 9 | 라우트 | `packages/api/src/routes/biz-items.ts` | NEW |
| 10 | 앱 진입점 | `packages/api/src/app.ts` | MODIFY (라우트 등록) |
| 11 | 테스트 | `packages/api/src/__tests__/biz-item-service.test.ts` | NEW |
| 12 | 테스트 | `packages/api/src/__tests__/item-classifier.test.ts` | NEW |
| 13 | 테스트 | `packages/api/src/__tests__/biz-persona-evaluator.test.ts` | NEW |
| 14 | 테스트 | `packages/api/src/__tests__/biz-items.test.ts` | NEW |

**신규 파일**: 12개 (마이그레이션 2 + 스키마 1 + 서비스 5 + 라우트 1 + 테스트 4)
**수정 파일**: 1개 (app.ts)

---

## 7. Testing Strategy

### 7.1 테스트 구조

| 레벨 | 파일 | 대상 | 예상 테스트 수 |
|------|------|------|:---:|
| 단위 | `biz-item-service.test.ts` | CRUD + 상태 전이 | 8 |
| 단위 | `item-classifier.test.ts` | 분류 로직 + 가중치 매핑 | 8 |
| 단위 | `biz-persona-evaluator.test.ts` | 평가 집계 + G/K/R 판정 | 10 |
| 통합 | `biz-items.test.ts` | 6개 API 엔드포인트 | 12 |
| | | **합계** | **~38** |

### 7.2 Mock 전략

- **AgentRunner**: Mock — LLM 실제 호출 없이 고정 JSON 응답 반환
- **D1**: in-memory SQLite (기존 패턴 그대로)
- **인증**: 기존 `createTestToken()` 헬퍼 사용

### 7.3 핵심 테스트 케이스

**분류 (item-classifier)**:
- Type A 명확 케이스: "XX사 플랫폼을 KT DS형으로 전환" → type_a
- Type B 명확 케이스: "AI 기반 프로세스 마이닝 시장 기회" → type_b
- Type C 명확 케이스: "고객사 A사 운영 비용 절감 요청" → type_c
- LLM 응답 파싱 실패 → 502 에러
- 가중치 매핑 검증: type_a → ref=3, market=1

**평가 (biz-persona-evaluator)**:
- 8개 모두 성공 → 정상 판정
- 3개 실패, 5개 성공 → 부분 평가 판정
- 4개 이상 실패 → 에러 (최소 5개 필요)
- avgScore >= 7.0 + concerns <= 2 → green
- avgScore 5.0~6.9 → keep
- avgScore < 5.0 → red
- 전략기획+경영기획 둘 다 < 5 → 자동 keep 하향

---

## 8. Non-Functional Requirements

| 항목 | 요구사항 |
|------|----------|
| 분류 응답시간 | < 10초 (LLM 1회 호출) |
| 평가 응답시간 | < 30초 (8개 병렬, Promise.allSettled) |
| 부분 실패 허용 | 8개 중 5개 이상 성공 시 판정 가능 |
| 비용 제어 | model-router로 저비용 모델 우선 (Haiku → Sonnet fallback) |
| 데이터 격리 | org_id 기반 멀티테넌시 (기존 패턴) |
