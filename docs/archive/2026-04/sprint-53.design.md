---
code: FX-DSGN-053
title: Sprint 53 — Discovery 9기준 체크리스트 + pm-skills 가이드 + PRD 자동생성 (F183~F185)
version: 0.1
status: Draft
category: DSGN
created: 2026-03-24
updated: 2026-03-24
author: Sinclair Seo
---

# Sprint 53 Design Document

> **Reference**: [[FX-PLAN-053]] (`docs/01-plan/features/sprint-53.plan.md`)
> **Scope**: F183 (FX-REQ-183), F184 (FX-REQ-184), F185 (FX-REQ-185)

---

## 1. D1 Schema

### 1.1 Migration 0036: Discovery Criteria (F183)

```sql
-- 0036_discovery_criteria.sql
-- Sprint 53: Discovery 9기준 체크리스트 상태 저장 (F183)

CREATE TABLE IF NOT EXISTS biz_discovery_criteria (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  criterion_id INTEGER NOT NULL CHECK (criterion_id BETWEEN 1 AND 9),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'needs_revision')),
  evidence TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
  UNIQUE(biz_item_id, criterion_id)
);

CREATE INDEX idx_discovery_criteria_item ON biz_discovery_criteria(biz_item_id);
```

### 1.2 Migration 0037: Analysis Contexts + Generated PRDs (F184, F185)

```sql
-- 0037_analysis_contexts_prds.sql
-- Sprint 53: 분석 컨텍스트 + PRD 저장 (F184, F185)

CREATE TABLE IF NOT EXISTS biz_analysis_contexts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  pm_skill TEXT NOT NULL,
  input_summary TEXT,
  output_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_analysis_contexts_item ON biz_analysis_contexts(biz_item_id);
CREATE INDEX idx_analysis_contexts_step ON biz_analysis_contexts(biz_item_id, step_order);

CREATE TABLE IF NOT EXISTS biz_generated_prds (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  criteria_snapshot TEXT,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_generated_prds_item ON biz_generated_prds(biz_item_id);
```

---

## 2. Services

### 2.1 DiscoveryCriteriaService (F183)

**파일**: `packages/api/src/services/discovery-criteria.ts`

```typescript
/**
 * Sprint 53: Discovery 9기준 체크리스트 서비스 (F183)
 */

export const DISCOVERY_CRITERIA = [
  { id: 1, name: "문제/고객 정의", condition: "고객 세그먼트 1개+ + 문제 1문장 (JTBD)", pmSkills: ["/interview", "/research-users"] },
  { id: 2, name: "시장 기회", condition: "SOM 시장 규모 수치 + 연간 성장률 + why now 1개", pmSkills: ["/market-scan"] },
  { id: 3, name: "경쟁 환경", condition: "직접 경쟁사 3개+ + 차별화 포지셔닝", pmSkills: ["/competitive-analysis"] },
  { id: 4, name: "가치 제안 가설", condition: "JTBD 1문장 + 차별화 1가지", pmSkills: ["/value-proposition"] },
  { id: 5, name: "수익 구조 가설", condition: "과금 모델 + WTP 추정 + 유닛 이코노믹스 초안", pmSkills: ["/business-model"] },
  { id: 6, name: "핵심 리스크 가정", condition: "우선순위 가정 목록 + 각 검증 방법·기준", pmSkills: ["/pre-mortem"] },
  { id: 7, name: "규제/기술 제약", condition: "규제 목록 + 대응 방향 (없으면 '없음' 명시)", pmSkills: ["/market-scan"] },
  { id: 8, name: "차별화 근거", condition: "지속 가능한 우위 요소 2가지+ + 모방 난이도", pmSkills: ["/competitive-analysis", "/value-proposition"] },
  { id: 9, name: "검증 실험 계획", condition: "최소 실험 3개 + 성공/실패 판단 기준", pmSkills: ["/pre-mortem"] },
] as const;

export type CriterionStatus = "pending" | "in_progress" | "completed" | "needs_revision";

export interface DiscoveryCriterion {
  id: string;
  bizItemId: string;
  criterionId: number;
  name: string;
  condition: string;
  status: CriterionStatus;
  evidence: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface CriteriaProgress {
  total: 9;
  completed: number;
  inProgress: number;
  needsRevision: number;
  pending: number;
  criteria: DiscoveryCriterion[];
  gateStatus: "blocked" | "warning" | "ready";
  // blocked: <7 completed, warning: 7-8, ready: 9
}

export class DiscoveryCriteriaService {
  constructor(private db: D1Database) {}

  /** 아이템의 9기준 초기화 (이미 있으면 무시) */
  async initialize(bizItemId: string): Promise<void>;

  /** 9기준 전체 조회 (정적 메타데이터 포함) */
  async getAll(bizItemId: string): Promise<CriteriaProgress>;

  /** 특정 기준 상태 업데이트 */
  async update(bizItemId: string, criterionId: number, data: {
    status: CriterionStatus;
    evidence?: string;
  }): Promise<DiscoveryCriterion>;

  /** discoveryMapping 기반 자동 체크 제안 */
  async suggestFromStep(bizItemId: string, stepDiscoveryMapping: number[]): Promise<{
    criterionId: number;
    name: string;
    currentStatus: CriterionStatus;
  }[]>;

  /** PRD 생성 게이트 확인 */
  async checkGate(bizItemId: string): Promise<{
    gateStatus: "blocked" | "warning" | "ready";
    completedCount: number;
    missingCriteria: Array<{ id: number; name: string; status: CriterionStatus }>;
  }>;
}
```

**게이트 로직 상세:**
- `completed` ≥ 9 → `ready`
- `completed` ≥ 7 → `warning` (미충족 항목 표시, 진행 가능)
- `completed` < 7 → `blocked` (PRD 생성 차단)

**`initialize()` 호출 시점:**
- `POST /biz-items/:id/starting-point` 성공 직후 자동 호출 (9행 INSERT OR IGNORE)
- 이미 존재하면 무시 (멱등)

### 2.2 PmSkillsGuide 정적 데이터 (F184)

**파일**: `packages/api/src/services/pm-skills-guide.ts`

```typescript
/**
 * Sprint 53: pm-skills 실행 가이드 정적 데이터 (F184)
 */

export interface PmSkillGuide {
  skill: string;
  name: string;
  purpose: string;
  inputExample: string;
  expectedOutput: string;
  tips: string[];
  relatedCriteria: number[];
}

export const PM_SKILLS_GUIDES: PmSkillGuide[] = [
  {
    skill: "/interview",
    name: "고객 인터뷰 설계 + 분석",
    purpose: "타겟 고객의 실제 Pain Point를 파악하고 JTBD를 도출하기 위해 인터뷰를 설계·분석합니다.",
    inputExample: "우리 타겟은 중소 보험사의 손해사정 담당자입니다. 이들의 업무 비효율과 Pain Point를 파악하고 싶습니다.",
    expectedOutput: "인터뷰 질문 리스트 + 예상 답변 + JTBD 가설 + 검증 방법",
    tips: [
      "기존 분석 컨텍스트가 있으면 함께 제공하면 더 정확한 질문이 나옵니다",
      "인터뷰 결과는 반드시 저장하세요 — Discovery 기준 #1 충족 근거가 됩니다",
    ],
    relatedCriteria: [1],
  },
  {
    skill: "/research-users",
    name: "사용자 리서치 + 세그먼트",
    purpose: "고객 세그먼트를 정의하고, 각 세그먼트의 특성·니즈·규모를 분석합니다.",
    inputExample: "보험 산업의 손해사정 프로세스에 관여하는 주요 사용자 그룹을 분석해주세요.",
    expectedOutput: "2~3개 고객 세그먼트 프로필 + 규모 추정 + 우선순위 + 페르소나",
    tips: [
      "/interview 결과가 있으면 실제 데이터 기반으로 더 정확한 세그먼트가 나옵니다",
    ],
    relatedCriteria: [1],
  },
  {
    skill: "/market-scan",
    name: "시장 규모 + 트렌드 분석",
    purpose: "TAM/SAM/SOM 시장 규모를 추정하고, 주요 시장 트렌드와 성장 동인을 분석합니다.",
    inputExample: "한국 보험 IT 시장의 손해사정 자동화 영역 시장 규모와 성장률을 분석해주세요.",
    expectedOutput: "TAM/SAM/SOM 수치 + 연간 성장률 + why now 트리거 + 규제 환경",
    tips: [
      "가능한 구체적인 시장 범위를 지정하면 SOM이 더 현실적으로 나옵니다",
      "규제/기술 제약도 함께 분석되므로 Discovery 기준 #7도 충족할 수 있습니다",
    ],
    relatedCriteria: [2, 7],
  },
  {
    skill: "/competitive-analysis",
    name: "경쟁사 분석 + 포지셔닝",
    purpose: "직접/간접 경쟁사를 식별하고, 차별화 포지셔닝 공간을 발굴합니다.",
    inputExample: "손해사정 AI 자동화 분야의 국내외 경쟁사를 분석하고 KT DS 관점 차별화 포인트를 도출해주세요.",
    expectedOutput: "경쟁사 3~5개 프로필 + SWOT + 포지셔닝 맵 + 차별화 전략",
    tips: [
      "경쟁사가 적은 영역이면 간접 경쟁(대체재)도 포함해야 합니다",
    ],
    relatedCriteria: [3, 8],
  },
  {
    skill: "/value-proposition",
    name: "가치 제안 설계",
    purpose: "JTBD 기반 가치 제안을 설계하고, 고객이 왜 이 솔루션을 선택해야 하는지 정의합니다.",
    inputExample: "손해사정 AI 자동화의 핵심 가치 제안을 JTBD 프레임워크로 설계해주세요.",
    expectedOutput: "JTBD 문장 + 가치 제안 캔버스 + 차별화 포인트",
    tips: [
      "/interview + /competitive-analysis 결과를 함께 제공하면 더 설득력 있는 가치 제안이 나옵니다",
    ],
    relatedCriteria: [4, 8],
  },
  {
    skill: "/business-model",
    name: "비즈니스 모델 캔버스",
    purpose: "수익 모델, 과금 구조, 유닛 이코노믹스를 설계합니다.",
    inputExample: "손해사정 AI SaaS의 비즈니스 모델을 설계해주세요. KT DS 라이선스/M&C 모델 포함.",
    expectedOutput: "BMC + 과금 모델 + WTP 추정 + 유닛 이코노믹스 초안",
    tips: [
      "KT DS 특성상 라이선스/M&C/구독 혼합 모델이 일반적입니다",
    ],
    relatedCriteria: [5],
  },
  {
    skill: "/pre-mortem",
    name: "사전 부검 + 리스크 식별",
    purpose: "프로젝트 실패 시나리오를 미리 상정하고, 핵심 리스크와 검증 실험을 설계합니다.",
    inputExample: "이 사업 아이템이 실패한다면 가장 큰 이유는 무엇일까요? 핵심 리스크와 검증 방법을 설계해주세요.",
    expectedOutput: "리스크 목록 + 우선순위 + 검증 실험 3개+ + 성공/실패 기준",
    tips: [
      "이 스킬 하나로 Discovery 기준 #6(리스크)과 #9(검증 실험) 두 개를 충족할 수 있습니다",
    ],
    relatedCriteria: [6, 9],
  },
  {
    skill: "/strategy",
    name: "전략 수립 + 우선순위 결정",
    purpose: "분석 결과를 종합하여 전략적 방향과 실행 우선순위를 결정합니다.",
    inputExample: "지금까지의 분석 결과를 종합하여 최적의 시장 진입 전략과 우선순위를 결정해주세요.",
    expectedOutput: "전략 방향 + 우선순위 매트릭스 + 실행 로드맵",
    tips: [
      "이전 단계 분석 결과를 모두 제공해야 종합적인 전략이 나옵니다",
    ],
    relatedCriteria: [4, 6],
  },
  {
    skill: "/brainstorm",
    name: "아이디어 발산 + 수렴",
    purpose: "제약 없이 아이디어를 발산하고, 평가 기준으로 수렴합니다.",
    inputExample: "이 기술을 활용할 수 있는 산업별 Use Case를 최대한 많이 도출해주세요.",
    expectedOutput: "Use Case 목록 + 평가 기준 + 상위 3개 선정 + 선정 근거",
    tips: [
      "발산 단계에서는 제약을 두지 말고, 수렴 단계에서 기준을 적용하세요",
    ],
    relatedCriteria: [],
  },
  {
    skill: "/beachhead-segment",
    name: "비치헤드 시장 선정",
    purpose: "최초 진입할 비치헤드 시장을 선정하고 진입 전략을 설계합니다.",
    inputExample: "손해사정 AI 시장에서 가장 먼저 공략할 비치헤드 시장을 선정해주세요.",
    expectedOutput: "비치헤드 시장 프로필 + 선정 근거 + 진입 전략 + 확장 경로",
    tips: [
      "/research-users와 /market-scan 결과를 기반으로 하면 더 정확합니다",
    ],
    relatedCriteria: [1, 3],
  },
] as const;

/** 스킬명으로 가이드 조회 */
export function getSkillGuide(skill: string): PmSkillGuide | undefined;

/** 기준 ID로 관련 스킬 가이드 목록 조회 */
export function getGuidesForCriterion(criterionId: number): PmSkillGuide[];
```

### 2.3 AnalysisContextService (F184)

**파일**: `packages/api/src/services/analysis-context.ts`

```typescript
/**
 * Sprint 53: 분석 컨텍스트 CRUD 서비스 (F184)
 */

export interface AnalysisContext {
  id: string;
  bizItemId: string;
  stepOrder: number;
  pmSkill: string;
  inputSummary: string | null;
  outputText: string;
  createdAt: string;
}

export interface NextGuide {
  currentStep: number;
  nextStep: AnalysisStep | null;     // analysis-paths.ts의 단계
  skillGuide: PmSkillGuide | null;   // pm-skills-guide.ts의 가이드
  previousContexts: AnalysisContext[]; // 이전 단계 결과 (자동 첨부용)
  completedCriteria: number[];        // 이 단계까지 충족된 기준 목록
  suggestedCriteria: number[];        // 이 단계 완료 시 체크 가능한 기준
  isLastStep: boolean;
}

export class AnalysisContextService {
  constructor(private db: D1Database) {}

  /** 분석 결과 저장 */
  async save(bizItemId: string, data: {
    stepOrder: number;
    pmSkill: string;
    inputSummary?: string;
    outputText: string;
  }): Promise<AnalysisContext>;

  /** 아이템의 전체 분석 컨텍스트 조회 (step_order ASC) */
  async getAll(bizItemId: string): Promise<AnalysisContext[]>;

  /** 특정 단계까지의 컨텍스트 조회 (다음 단계 프롬프트에 첨부용) */
  async getUpToStep(bizItemId: string, stepOrder: number): Promise<AnalysisContext[]>;

  /** 다음 단계 가이드 생성 */
  async getNextGuide(bizItemId: string, analysisPath: AnalysisPath): Promise<NextGuide>;
}
```

**`getNextGuide()` 로직:**
1. 현재까지 저장된 컨텍스트에서 마지막 `stepOrder` 확인
2. `analysisPath.steps`에서 다음 단계 결정
3. 해당 단계의 `pmSkills[0]`에 대한 가이드 조회
4. 이전 단계 컨텍스트 전부 수집 (자동 첨부용)
5. `discoveryMapping`에서 충족 가능한 기준 제안

### 2.4 PrdGeneratorService (F185)

**파일**: `packages/api/src/services/prd-generator.ts`

```typescript
/**
 * Sprint 53: PRD 자동 생성 서비스 (F185)
 */

export interface PrdGenerationInput {
  bizItemId: string;
  bizItem: { title: string; description: string | null; source: string };
  criteria: DiscoveryCriterion[];      // 9기준 + evidence
  contexts: AnalysisContext[];          // 전체 분석 결과
  startingPoint: StartingPointType;
}

export interface GeneratedPrd {
  id: string;
  bizItemId: string;
  version: number;
  content: string;                      // 마크다운
  criteriaSnapshot: string;             // JSON
  generatedAt: string;
}

export class PrdGeneratorService {
  constructor(private db: D1Database, private runner: AgentRunner) {}

  /** PRD 생성 (게이트 확인 → 템플릿 매핑 → LLM 보강 → 저장) */
  async generate(input: PrdGenerationInput): Promise<GeneratedPrd>;

  /** 템플릿 기반 PRD 초안 (LLM 없이) */
  buildTemplate(input: PrdGenerationInput): string;

  /** LLM으로 PRD 다듬기 */
  async refineWithLlm(draft: string, input: PrdGenerationInput): Promise<string>;

  /** 생성된 PRD 조회 (최신 버전) */
  async getLatest(bizItemId: string): Promise<GeneratedPrd | null>;

  /** 특정 버전 조회 */
  async getByVersion(bizItemId: string, version: number): Promise<GeneratedPrd | null>;

  /** 전체 버전 목록 */
  async listVersions(bizItemId: string): Promise<Array<{ version: number; generatedAt: string }>>;
}
```

### 2.5 PRD Template (F185)

**파일**: `packages/api/src/services/prd-template.ts`

```typescript
/**
 * Sprint 53: PRD 템플릿 + 매핑 로직 (F185)
 * 9기준 evidence + 분석 컨텍스트를 PRD 섹션에 매핑
 */

export const PRD_SECTIONS = [
  { section: 1, title: "요약 (Executive Summary)", criteriaSource: "all", description: "전체 분석 결과를 1페이지 요약" },
  { section: 2, title: "문제 정의", criteriaSource: [1], description: "고객 세그먼트 + JTBD + Pain Point" },
  { section: 3, title: "타겟 고객", criteriaSource: [1], description: "페르소나 + 세그먼트 프로필" },
  { section: 4, title: "시장 기회", criteriaSource: [2], description: "TAM/SAM/SOM + 성장률 + why now" },
  { section: 5, title: "경쟁 환경 및 차별화", criteriaSource: [3, 8], description: "경쟁사 + 포지셔닝 + 차별화 근거" },
  { section: 6, title: "가치 제안", criteriaSource: [4], description: "JTBD 문장 + 핵심 차별화" },
  { section: 7, title: "수익 구조", criteriaSource: [5], description: "과금 모델 + 유닛 이코노믹스" },
  { section: 8, title: "리스크 및 제약", criteriaSource: [6, 7], description: "리스크 목록 + 규제 + 대응" },
  { section: 9, title: "검증 계획", criteriaSource: [9], description: "실험 3개+ + 판단 기준" },
  { section: 10, title: "오픈 이슈", criteriaSource: "derived", description: "미충족/보완 필요 항목" },
] as const;

/** 9기준 evidence를 PRD 섹션별로 매핑 */
export function mapCriteriaToSections(
  criteria: DiscoveryCriterion[],
  contexts: AnalysisContext[],
): Map<number, string>;

/** 매핑 결과를 마크다운으로 렌더링 */
export function renderPrdMarkdown(
  bizItem: { title: string; description: string | null },
  sectionContents: Map<number, string>,
): string;
```

**LLM 프롬프트 전략:**
- 시스템 프롬프트: "KT DS AX BD팀 사업개발 전문가" + PRD 작성 가이드라인
- 사용자 프롬프트: 템플릿 초안 + "각 섹션을 전문적으로 다듬고, 누락된 내용을 보완해주세요"
- 제약: 기존 evidence를 삭제하지 않고, 보강만 수행

---

## 3. Zod Schemas

### 3.1 Discovery Criteria Schema (F183)

**파일**: `packages/api/src/schemas/discovery-criteria.ts`

```typescript
import { z } from "@hono/zod-openapi";

export const criterionStatusEnum = z.enum(["pending", "in_progress", "completed", "needs_revision"]);

export const UpdateCriterionSchema = z.object({
  status: criterionStatusEnum,
  evidence: z.string().max(5000).optional(),
}).openapi("UpdateCriterion");

export const CriterionResponseSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  criterionId: z.number().int().min(1).max(9),
  name: z.string(),
  condition: z.string(),
  status: criterionStatusEnum,
  evidence: z.string().nullable(),
  completedAt: z.string().nullable(),
  updatedAt: z.string(),
}).openapi("CriterionResponse");

export const CriteriaProgressSchema = z.object({
  total: z.literal(9),
  completed: z.number().int(),
  inProgress: z.number().int(),
  needsRevision: z.number().int(),
  pending: z.number().int(),
  criteria: z.array(CriterionResponseSchema),
  gateStatus: z.enum(["blocked", "warning", "ready"]),
}).openapi("CriteriaProgress");
```

### 3.2 Analysis Context Schema (F184)

**파일**: `packages/api/src/schemas/analysis-context.ts`

```typescript
import { z } from "@hono/zod-openapi";

export const SaveAnalysisContextSchema = z.object({
  stepOrder: z.number().int().min(1).max(10),
  pmSkill: z.string().min(1).max(50),
  inputSummary: z.string().max(3000).optional(),
  outputText: z.string().min(1).max(30000),
}).openapi("SaveAnalysisContext");

export const AnalysisContextSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  stepOrder: z.number().int(),
  pmSkill: z.string(),
  inputSummary: z.string().nullable(),
  outputText: z.string(),
  createdAt: z.string(),
}).openapi("AnalysisContextResponse");
```

### 3.3 PRD Schema (F185)

**파일**: `packages/api/src/schemas/prd.ts`

```typescript
import { z } from "@hono/zod-openapi";

export const GeneratePrdSchema = z.object({
  skipLlmRefine: z.boolean().optional().default(false),
  // true이면 LLM 보강 없이 템플릿 매핑만 수행 (테스트/빠른 생성용)
}).openapi("GeneratePrd");

export const GeneratedPrdSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  version: z.number().int(),
  content: z.string(),
  criteriaSnapshot: z.string(),
  generatedAt: z.string(),
}).openapi("GeneratedPrdResponse");
```

---

## 4. API Endpoints

### 4.1 Discovery Criteria (F183) — biz-items.ts에 추가

```typescript
// ─── GET /biz-items/:id/discovery-criteria — 9기준 체크리스트 조회 (F183) ───

bizItemsRoute.get("/biz-items/:id/discovery-criteria", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const service = new DiscoveryCriteriaService(c.env.DB);
  const progress = await service.getAll(id);

  return c.json(progress);
});

// ─── PATCH /biz-items/:id/discovery-criteria/:criterionId — 기준 상태 업데이트 (F183) ───

bizItemsRoute.patch("/biz-items/:id/discovery-criteria/:criterionId", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const criterionId = Number(c.req.param("criterionId"));

  if (isNaN(criterionId) || criterionId < 1 || criterionId > 9) {
    return c.json({ error: "INVALID_CRITERION_ID" }, 400);
  }

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const body = await c.req.json();
  const parsed = UpdateCriterionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

  const service = new DiscoveryCriteriaService(c.env.DB);
  const updated = await service.update(id, criterionId, parsed.data);

  return c.json(updated);
});
```

### 4.2 Analysis Context (F184) — biz-items.ts에 추가

```typescript
// ─── POST /biz-items/:id/analysis-context — 분석 컨텍스트 저장 (F184) ───

bizItemsRoute.post("/biz-items/:id/analysis-context", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const body = await c.req.json();
  const parsed = SaveAnalysisContextSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

  const service = new AnalysisContextService(c.env.DB);
  const ctx = await service.save(id, parsed.data);

  // discoveryMapping으로 9기준 자동 체크 제안
  const sp = await bizService.getStartingPoint(id);
  let suggestedCriteria: number[] = [];
  if (sp) {
    const path = getAnalysisPath(sp.startingPoint as StartingPointType);
    const step = path.steps.find(s => s.order === parsed.data.stepOrder);
    if (step) {
      const criteriaService = new DiscoveryCriteriaService(c.env.DB);
      const suggestions = await criteriaService.suggestFromStep(id, step.discoveryMapping);
      suggestedCriteria = suggestions.map(s => s.criterionId);
    }
  }

  return c.json({ ...ctx, suggestedCriteria }, 201);
});

// ─── GET /biz-items/:id/analysis-context — 분석 컨텍스트 조회 (F184) ───

bizItemsRoute.get("/biz-items/:id/analysis-context", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const service = new AnalysisContextService(c.env.DB);
  const contexts = await service.getAll(id);

  return c.json({ contexts });
});

// ─── GET /biz-items/:id/next-guide — 다음 단계 가이드 (F184) ───

bizItemsRoute.get("/biz-items/:id/next-guide", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const sp = await bizService.getStartingPoint(id);
  if (!sp) return c.json({ error: "STARTING_POINT_NOT_CLASSIFIED" }, 404);

  const path = getAnalysisPath(sp.startingPoint as StartingPointType);
  const ctxService = new AnalysisContextService(c.env.DB);
  const guide = await ctxService.getNextGuide(id, path);

  return c.json(guide);
});
```

### 4.3 PRD Generation (F185) — biz-items.ts에 추가

```typescript
// ─── POST /biz-items/:id/generate-prd — PRD 자동 생성 (F185) ───

bizItemsRoute.post("/biz-items/:id/generate-prd", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  // 게이트 확인
  const criteriaService = new DiscoveryCriteriaService(c.env.DB);
  const gate = await criteriaService.checkGate(id);
  if (gate.gateStatus === "blocked") {
    return c.json({
      error: "DISCOVERY_CRITERIA_NOT_MET",
      gateStatus: gate.gateStatus,
      completedCount: gate.completedCount,
      missingCriteria: gate.missingCriteria,
    }, 422);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = GeneratePrdSchema.safeParse(body);
  const skipLlm = parsed.success ? parsed.data.skipLlmRefine : false;

  const sp = await bizService.getStartingPoint(id);
  if (!sp) return c.json({ error: "STARTING_POINT_NOT_CLASSIFIED" }, 404);

  const criteria = await criteriaService.getAll(id);
  const ctxService = new AnalysisContextService(c.env.DB);
  const contexts = await ctxService.getAll(id);

  const runner = createAgentRunner(c.env);
  const prdService = new PrdGeneratorService(c.env.DB, runner);

  const prd = await prdService.generate({
    bizItemId: id,
    bizItem: { title: item.title, description: item.description, source: item.source },
    criteria: criteria.criteria,
    contexts,
    startingPoint: sp.startingPoint as StartingPointType,
    skipLlmRefine: skipLlm,
  });

  return c.json(prd, 201);
});

// ─── GET /biz-items/:id/prd — 최신 PRD 조회 (F185) ───

bizItemsRoute.get("/biz-items/:id/prd", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const prdService = new PrdGeneratorService(c.env.DB, null as any);
  const prd = await prdService.getLatest(id);
  if (!prd) return c.json({ error: "PRD_NOT_FOUND" }, 404);

  return c.json(prd);
});

// ─── GET /biz-items/:id/prd/:version — PRD 특정 버전 조회 (F185) ───

bizItemsRoute.get("/biz-items/:id/prd/:version", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const version = Number(c.req.param("version"));

  if (isNaN(version) || version < 1) return c.json({ error: "INVALID_VERSION" }, 400);

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const prdService = new PrdGeneratorService(c.env.DB, null as any);
  const prd = await prdService.getByVersion(id, version);
  if (!prd) return c.json({ error: "PRD_NOT_FOUND" }, 404);

  return c.json(prd);
});
```

---

## 5. Web Components

### 5.1 DiscoveryCriteriaPanel (F183)

**파일**: `packages/web/src/components/feature/DiscoveryCriteriaPanel.tsx`

9기준 진행률 + 각 기준의 상태 배지 + 게이트 상태 표시.

```
┌─────────────────────────────────────────┐
│ Discovery 기준 ████████░░ 7/9           │
│                                         │
│ ✅ 1. 문제/고객 정의                      │
│ ✅ 2. 시장 기회                           │
│ ✅ 3. 경쟁 환경                           │
│ ✅ 4. 가치 제안 가설                      │
│ ✅ 5. 수익 구조 가설                      │
│ ✅ 6. 핵심 리스크 가정                    │
│ ✅ 7. 규제/기술 제약                      │
│ ⬜ 8. 차별화 근거         [보완 필요]     │
│ ⬜ 9. 검증 실험 계획      [보완 필요]     │
│                                         │
│ ⚠️ 2개 미충족 — 보완 없이 진행 가능       │
│                         [PRD 생성]       │
└─────────────────────────────────────────┘
```

**Props:**
```typescript
interface DiscoveryCriteriaPanelProps {
  bizItemId: string;
  progress: CriteriaProgress;
  onUpdate: (criterionId: number, status: CriterionStatus, evidence?: string) => void;
}
```

### 5.2 NextGuidePanel (F184)

**파일**: `packages/web/src/components/feature/NextGuidePanel.tsx`

다음 실행할 pm-skills 가이드 + 이전 컨텍스트 복사 버튼.

```
┌─────────────────────────────────────────┐
│ 📋 다음 단계: Step 4                     │
│                                         │
│ /competitive-analysis                   │
│ 경쟁사 분석 + 포지셔닝                    │
│                                         │
│ 💡 목적: 직접/간접 경쟁사를 식별하고...   │
│                                         │
│ 📝 입력 예시:                             │
│ "손해사정 AI 자동화 분야의 국내외 경쟁사  │
│  를 분석하고..."                         │
│                                         │
│ 📎 이전 분석 결과 (자동 첨부):            │
│ Step 1: 시장 규모 분석 결과...     [복사] │
│ Step 2: 고객 인터뷰 결과...        [복사] │
│ Step 3: 전략 방향 결론...          [복사] │
│                                         │
│ Discovery 기준 연관: #3, #8              │
│                         [전체 복사]       │
└─────────────────────────────────────────┘
```

### 5.3 PrdViewer (F185)

**파일**: `packages/web/src/components/feature/PrdViewer.tsx`

생성된 PRD 마크다운 렌더링 + 버전 선택.

```
┌─────────────────────────────────────────┐
│ 📄 PRD — 손해사정 AI 자동화               │
│ Version: v2 (2026-03-24)  [v1] [v2]    │
│─────────────────────────────────────────│
│ ## 1. 요약                                │
│ ...                                     │
│ ## 2. 문제 정의                           │
│ ...                                     │
│ (마크다운 렌더링)                          │
│                                         │
│                    [다운로드] [재생성]     │
└─────────────────────────────────────────┘
```

---

## 6. Test Strategy

### 6.1 서비스 단위 테스트

| 파일 | 테스트 항목 | 예상 수 |
|------|-----------|--------|
| `discovery-criteria.test.ts` | initialize, getAll, update, suggestFromStep, checkGate (blocked/warning/ready) | 12 |
| `pm-skills-guide.test.ts` | getSkillGuide, getGuidesForCriterion, 전체 커버리지 | 6 |
| `analysis-context.test.ts` | save, getAll, getUpToStep, getNextGuide | 8 |
| `prd-generator.test.ts` | buildTemplate, generate (mock LLM), getLatest, getByVersion | 8 |
| `prd-template.test.ts` | mapCriteriaToSections, renderPrdMarkdown | 4 |

### 6.2 API 통합 테스트

| 파일 | 테스트 항목 | 예상 수 |
|------|-----------|--------|
| `biz-items-criteria.test.ts` | GET/PATCH discovery-criteria, 게이트 검증 | 8 |
| `biz-items-context.test.ts` | POST/GET analysis-context, next-guide | 8 |
| `biz-items-prd.test.ts` | POST generate-prd (게이트 통과/차단), GET prd | 6 |

### 6.3 Web 컴포넌트 테스트

| 파일 | 테스트 항목 | 예상 수 |
|------|-----------|--------|
| `DiscoveryCriteriaPanel.test.tsx` | 렌더링, 진행률, 게이트 상태 | 4 |
| `NextGuidePanel.test.tsx` | 가이드 표시, 컨텍스트 복사 | 3 |
| `PrdViewer.test.tsx` | 마크다운 렌더링, 버전 전환 | 3 |

### 총합: ~70 tests

### 6.4 Mock 전략

- **AgentRunner**: `mockRunner()` 패턴 (기존 `starting-point-classifier.test.ts` 동일)
- **D1**: in-memory SQLite (기존 API 테스트 패턴)
- **LLM 응답**: 고정 마크다운 문자열로 mock

---

## 7. Implementation Order

| Phase | 순서 | 항목 | 의존성 |
|-------|------|------|--------|
| **Schema** | 1 | 0036, 0037 마이그레이션 | — |
| **F183** | 2 | `discovery-criteria.ts` 정적 데이터 + 서비스 | 마이그레이션 |
| **F183** | 3 | `discovery-criteria.ts` Zod 스키마 | — |
| **F183** | 4 | GET/PATCH discovery-criteria API + 테스트 | 서비스 + 스키마 |
| **F184** | 5 | `pm-skills-guide.ts` 정적 데이터 | — |
| **F184** | 6 | `analysis-context.ts` 서비스 | 마이그레이션 |
| **F184** | 7 | POST/GET analysis-context + next-guide API + 테스트 | 서비스 |
| **F185** | 8 | `prd-template.ts` 템플릿 정의 + 매핑 | — |
| **F185** | 9 | `prd-generator.ts` 서비스 | 템플릿 + AgentRunner |
| **F185** | 10 | POST/GET prd API + 테스트 | 서비스 |
| **Web** | 11 | DiscoveryCriteriaPanel + NextGuidePanel + PrdViewer | API 완성 후 |

### Worker 분배 (Agent Team)

- **Worker 1**: 순서 1~7 (F183 + F184 백엔드 전체)
- **Worker 2**: 순서 8~11 (F185 백엔드 + Web 컴포넌트)
- Worker 2는 순서 1(마이그레이션) 완료 후 병렬 시작 가능

---

## 8. Starting Point 연동 수정

### 8.1 자동 초기화 트리거

기존 `POST /biz-items/:id/starting-point` 라우트에서 분류 성공 시 9기준 자동 초기화:

```typescript
// biz-items.ts 수정 (기존 starting-point 라우트)
// 분류 성공 후 추가:
const criteriaService = new DiscoveryCriteriaService(c.env.DB);
await criteriaService.initialize(id);
```

이렇게 하면 시작점 분류 → 9기준 초기화 → 분석 경로 안내가 자연스럽게 연결돼요.

---

## 9. Error Codes

| 코드 | HTTP | 설명 |
|------|------|------|
| `BIZ_ITEM_NOT_FOUND` | 404 | 사업 아이템 없음 |
| `STARTING_POINT_NOT_CLASSIFIED` | 404 | 시작점 미분류 (next-guide, generate-prd 전제조건) |
| `INVALID_CRITERION_ID` | 400 | criterionId 범위 벗어남 (1~9) |
| `INVALID_VERSION` | 400 | PRD 버전 번호 오류 |
| `DISCOVERY_CRITERIA_NOT_MET` | 422 | 9기준 미충족으로 PRD 생성 차단 |
| `PRD_NOT_FOUND` | 404 | 생성된 PRD 없음 |
