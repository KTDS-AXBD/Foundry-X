---
code: FX-DSGN-058
title: "Sprint 58 — F180 사업계획서 초안 + F181 Prototype 자동 생성 상세 설계"
version: 1.0
status: Active
category: DSGN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 58
features: [F180, F181]
ref: "[[FX-PLAN-058]]"
---

# Sprint 58 상세 설계 — F180 + F181

> Plan: [[FX-PLAN-058]] `docs/01-plan/features/sprint-58.plan.md`

---

## 1. 구현 순서 (Implementation Order)

```
Phase A: F180 사업계획서 초안
  A1. D1 migration 0042_business_plan_drafts.sql
  A2. business-plan-template.ts (BP_SECTIONS + mapDataToSections + renderBpMarkdown)
  A3. business-plan-generator.ts (BusinessPlanGeneratorService)
  A4. schemas/business-plan.ts (Zod)
  A5. biz-items route 확장 (+3 endpoints)
  A6. shared/types.ts (BusinessPlanDraft)
  A7. Tests: business-plan-generator.test.ts + biz-items route tests

Phase B: F181 Prototype
  B1. D1 migration 0043_prototypes.sql
  B2. prototype-styles.ts (BASE_CSS + SVG icons + color themes)
  B3. prototype-templates.ts (5 Starting Point templates)
  B4. prototype-generator.ts (PrototypeGeneratorService)
  B5. schemas/prototype.ts (Zod)
  B6. biz-items route 확장 (+3 endpoints)
  B7. shared/types.ts (Prototype)
  B8. Tests: prototype-generator.test.ts + biz-items route tests
```

---

## 2. F180 상세 설계 — 사업계획서 초안 자동 생성

### 2.1 D1 Migration (A1)

```sql
-- packages/api/src/db/migrations/0042_business_plan_drafts.sql
CREATE TABLE IF NOT EXISTS business_plan_drafts (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  sections_snapshot TEXT,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  generated_at TEXT NOT NULL,
  UNIQUE(biz_item_id, version)
);

CREATE INDEX idx_business_plan_drafts_biz_item ON business_plan_drafts(biz_item_id);
```

### 2.2 business-plan-template.ts (A2)

패턴: `prd-template.ts`의 `PRD_SECTIONS` + `mapCriteriaToSections()` + `renderPrdMarkdown()` 동일 구조.

```typescript
// packages/api/src/services/business-plan-template.ts

import type { DiscoveryCriterion } from "./discovery-criteria.js";
import type { AnalysisContext } from "./analysis-context.js";
import type { BizItem, EvaluationWithScores } from "./biz-item-service.js";
import type { StartingPointType } from "./analysis-paths.js";

// ─── 10 섹션 정의 ───

export const BP_SECTIONS = [
  { section: 1, title: "요약 (Executive Summary)", source: "all" as const,
    description: "사업 기회·솔루션·시장·예상 성과 1페이지 요약" },
  { section: 2, title: "사업 개요 (Business Overview)", source: "meta" as const,
    description: "아이템 정의 + 분류 유형 + 배경" },
  { section: 3, title: "문제 정의 및 기회", source: [1] as const,
    description: "고객 Pain + JTBD + 시장 트렌드" },
  { section: 4, title: "솔루션 및 가치 제안", source: [4] as const,
    description: "핵심 솔루션 + 차별화된 가치" },
  { section: 5, title: "시장 분석", source: [2] as const,
    description: "TAM/SAM/SOM + 트렌드 + why now" },
  { section: 6, title: "경쟁 환경 및 차별화", source: [3, 8] as const,
    description: "경쟁사 매핑 + 포지셔닝 + 차별화 근거" },
  { section: 7, title: "사업 모델 (Revenue Model)", source: [5] as const,
    description: "과금 모델 + 유닛 이코노믹스 + WTP" },
  { section: 8, title: "실행 계획 (Go-to-Market)", source: [9] as const,
    description: "MVP 정의 + 마일스톤 + 검증 실험" },
  { section: 9, title: "리스크 및 대응 전략", source: [6, 7] as const,
    description: "핵심 가정 + 리스크 + 규제 + 완화 방안" },
  { section: 10, title: "부록 — 평가 결과", source: "evaluation" as const,
    description: "멀티 페르소나 평가 요약 + 주요 concerns" },
] as const;

// ─── 데이터 집합 인터페이스 ───

export interface BpDataBundle {
  bizItem: BizItem;
  classification: { itemType: string; confidence: number } | null;
  evaluation: EvaluationWithScores | null;
  criteria: DiscoveryCriterion[];
  contexts: AnalysisContext[];
  startingPoint: StartingPointType | null;
  trendReport: {
    marketSummary: string;
    marketSizeEstimate: unknown;
    competitors: unknown;
    trends: unknown;
  } | null;
  prdContent: string | null;   // 최신 PRD (참고용)
}

// ─── 매핑 함수 ───

export function mapDataToSections(data: BpDataBundle): Map<number, string> {
  const sections = new Map<number, string>();

  for (const sec of BP_SECTIONS) {
    const parts: string[] = [];

    if (sec.source === "all") {
      // Section 1: Executive Summary — 전체 종합
      parts.push(`**사업 아이템:** ${data.bizItem.title}`);
      if (data.bizItem.description) parts.push(data.bizItem.description);
      if (data.classification) parts.push(`**유형:** ${formatItemType(data.classification.itemType)} (신뢰도 ${(data.classification.confidence * 100).toFixed(0)}%)`);
      if (data.evaluation) parts.push(`**평가 결과:** ${formatVerdict(data.evaluation.verdict)} (평균 ${data.evaluation.avgScore.toFixed(1)}점)`);
      if (data.trendReport?.marketSummary) parts.push(`**시장 요약:** ${data.trendReport.marketSummary}`);
      if (data.startingPoint) parts.push(`**접근 방식:** ${formatStartingPoint(data.startingPoint)}`);

    } else if (sec.source === "meta") {
      // Section 2: Business Overview
      parts.push(`### 아이템 정보`);
      parts.push(`- **제목:** ${data.bizItem.title}`);
      if (data.bizItem.description) parts.push(`- **설명:** ${data.bizItem.description}`);
      parts.push(`- **출처:** ${data.bizItem.source}`);
      if (data.classification) {
        parts.push(`\n### 분류 결과`);
        parts.push(`- **유형:** ${formatItemType(data.classification.itemType)}`);
        parts.push(`- **신뢰도:** ${(data.classification.confidence * 100).toFixed(0)}%`);
      }
      if (data.startingPoint) {
        parts.push(`\n### 분석 접근`);
        parts.push(`- **시작점:** ${formatStartingPoint(data.startingPoint)}`);
      }

    } else if (sec.source === "evaluation") {
      // Section 10: 부록 — 평가 결과
      if (data.evaluation) {
        parts.push(`### 종합 평가`);
        parts.push(`- **판정:** ${formatVerdict(data.evaluation.verdict)}`);
        parts.push(`- **평균 점수:** ${data.evaluation.avgScore.toFixed(1)} / 10`);
        parts.push(`- **주요 우려사항:** ${data.evaluation.totalConcerns}건`);
        if (data.evaluation.scores.length > 0) {
          parts.push(`\n### 페르소나별 점수`);
          parts.push(`| 페르소나 | 사업성 | 전략적합 | 고객가치 | 기술시장 | 실행력 | 재무 | 경쟁 | 확장 |`);
          parts.push(`|----------|--------|----------|----------|----------|--------|------|------|------|`);
          for (const s of data.evaluation.scores) {
            parts.push(`| ${s.personaId} | ${s.businessViability} | ${s.strategicFit} | ${s.customerValue} | ${s.techMarket} | ${s.execution} | ${s.financialFeasibility} | ${s.competitiveDiff} | ${s.scalability} |`);
          }
          // Top concerns
          const allConcerns = data.evaluation.scores.flatMap(s => s.concerns);
          if (allConcerns.length > 0) {
            parts.push(`\n### 주요 Concerns`);
            for (const concern of allConcerns.slice(0, 5)) {
              parts.push(`- ${concern}`);
            }
          }
        }
      } else {
        parts.push("*평가 미실시*");
      }

    } else {
      // Sections 3~9: 기준 기반 매핑
      const criteriaIds = sec.source as readonly number[];
      for (const cId of criteriaIds) {
        const c = data.criteria.find(cr => cr.criterionId === cId);
        if (c?.evidence) {
          parts.push(`**${c.name}:**\n${c.evidence}`);
        }
      }
      // 트렌드 데이터 보강 (Section 3, 5, 6)
      if ([3, 5, 6].includes(sec.section) && data.trendReport) {
        appendTrendData(parts, sec.section, data.trendReport);
      }
      // 분석 컨텍스트 보강
      for (const ctx of data.contexts) {
        if (isContextRelevant(ctx, criteriaIds, data.criteria)) {
          parts.push(`\n> 분석 Step ${ctx.stepOrder} (${ctx.pmSkill}): ${ctx.outputText.slice(0, 300)}${ctx.outputText.length > 300 ? "..." : ""}`);
        }
      }
    }

    sections.set(sec.section, parts.length > 0 ? parts.join("\n\n") : `*${sec.description} — 데이터 수집 필요*`);
  }

  return sections;
}

// ─── Markdown 렌더링 ───

export function renderBpMarkdown(
  bizItem: { title: string; description: string | null },
  sectionContents: Map<number, string>,
): string {
  const lines: string[] = [];
  lines.push(`# 사업계획서 초안 — ${bizItem.title}`);
  lines.push("");
  if (bizItem.description) {
    lines.push(`> ${bizItem.description}`);
    lines.push("");
  }
  lines.push(`> 자동 생성일: ${new Date().toISOString().split("T")[0]} | Foundry-X Discovery Pipeline`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const sec of BP_SECTIONS) {
    lines.push(`## ${sec.section}. ${sec.title}`);
    lines.push("");
    const content = sectionContents.get(sec.section) ?? `*${sec.description}*`;
    lines.push(content);
    lines.push("");
  }

  return lines.join("\n");
}

// ─── 헬퍼 함수 ───

function formatItemType(type: string): string {
  const map: Record<string, string> = {
    type_a: "Type A (벤치마크/레퍼런스 기반)",
    type_b: "Type B (트렌드/시장 기반)",
    type_c: "Type C (고객 Pain/현장 기반)",
  };
  return map[type] ?? type;
}

function formatVerdict(verdict: string): string {
  const map: Record<string, string> = {
    green: "🟢 Green (진행)",
    keep: "🟡 Keep (보완 후 진행)",
    red: "🔴 Red (재검토 필요)",
  };
  return map[verdict] ?? verdict;
}

function formatStartingPoint(sp: string): string {
  const map: Record<string, string> = {
    idea: "아이디어에서 시작",
    market: "시장/타겟에서 시작",
    problem: "고객 문제에서 시작",
    tech: "기술에서 시작",
    service: "기존 서비스에서 시작",
  };
  return map[sp] ?? sp;
}

function appendTrendData(
  parts: string[],
  section: number,
  trend: NonNullable<BpDataBundle["trendReport"]>,
): void {
  if (section === 3 || section === 5) {
    // 시장 분석 데이터
    if (trend.marketSummary) parts.push(`\n**시장 트렌드:** ${trend.marketSummary}`);
    if (trend.marketSizeEstimate && typeof trend.marketSizeEstimate === "object") {
      const mse = trend.marketSizeEstimate as Record<string, string>;
      if (mse.tam) parts.push(`- TAM: ${mse.tam}`);
      if (mse.sam) parts.push(`- SAM: ${mse.sam}`);
      if (mse.som) parts.push(`- SOM: ${mse.som}`);
    }
    if (Array.isArray(trend.trends)) {
      for (const t of (trend.trends as Array<{ title: string; description: string }>).slice(0, 3)) {
        parts.push(`- **${t.title}:** ${t.description}`);
      }
    }
  }
  if (section === 6) {
    // 경쟁사 데이터
    if (Array.isArray(trend.competitors)) {
      parts.push("\n**경쟁사 (트렌드 분석 기반):**");
      for (const comp of (trend.competitors as Array<{ name: string; description: string }>).slice(0, 5)) {
        parts.push(`- **${comp.name}:** ${comp.description}`);
      }
    }
  }
}

function isContextRelevant(
  ctx: AnalysisContext,
  criteriaIds: readonly number[],
  criteria: DiscoveryCriterion[],
): boolean {
  // 간단한 휴리스틱: 해당 기준이 최소 하나라도 non-pending이면 컨텍스트 포함
  return criteriaIds.some(cId => {
    const c = criteria.find(cr => cr.criterionId === cId);
    return c && c.status !== "pending";
  });
}
```

### 2.3 business-plan-generator.ts (A3)

패턴: `PrdGeneratorService` 동일 — 생성자(db, runner), generate(), buildTemplate(), refineWithLlm(), getLatest(), listVersions()

```typescript
// packages/api/src/services/business-plan-generator.ts

import type { AgentRunner } from "./agent-runner.js";
import type { DiscoveryCriterion } from "./discovery-criteria.js";
import type { AnalysisContext } from "./analysis-context.js";
import type { BizItem, EvaluationWithScores } from "./biz-item-service.js";
import type { StartingPointType } from "./analysis-paths.js";
import { mapDataToSections, renderBpMarkdown, type BpDataBundle } from "./business-plan-template.js";

export interface BpGenerationInput {
  bizItemId: string;
  bizItem: BizItem;
  criteria: DiscoveryCriterion[];
  contexts: AnalysisContext[];
  evaluation: EvaluationWithScores | null;
  startingPoint: StartingPointType | null;
  trendReport: BpDataBundle["trendReport"];
  prdContent: string | null;
  skipLlmRefine?: boolean;
}

export interface BusinessPlanDraft {
  id: string;
  bizItemId: string;
  version: number;
  content: string;
  sectionsSnapshot: string;
  modelUsed: string | null;
  tokensUsed: number;
  generatedAt: string;
}

interface BpRow {
  id: string;
  biz_item_id: string;
  version: number;
  content: string;
  sections_snapshot: string | null;
  model_used: string | null;
  tokens_used: number;
  generated_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function toBp(row: BpRow): BusinessPlanDraft {
  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    version: row.version,
    content: row.content,
    sectionsSnapshot: row.sections_snapshot ?? "{}",
    modelUsed: row.model_used,
    tokensUsed: row.tokens_used,
    generatedAt: row.generated_at,
  };
}

export class BusinessPlanGeneratorService {
  constructor(
    private db: D1Database,
    private runner: AgentRunner | null,
  ) {}

  async generate(input: BpGenerationInput): Promise<BusinessPlanDraft> {
    // 1. Template build
    let content = this.buildTemplate(input);

    // 2. LLM refinement
    if (!input.skipLlmRefine && this.runner) {
      content = await this.refineWithLlm(content, input);
    }

    // 3. Next version
    const latestRow = await this.db
      .prepare("SELECT MAX(version) as max_ver FROM business_plan_drafts WHERE biz_item_id = ?")
      .bind(input.bizItemId)
      .first<{ max_ver: number | null }>();
    const nextVersion = (latestRow?.max_ver ?? 0) + 1;

    // 4. Snapshot
    const snapshot = JSON.stringify({
      classification: input.bizItem.classification?.itemType ?? null,
      startingPoint: input.startingPoint,
      evaluationVerdict: input.evaluation?.verdict ?? null,
      criteriaCompleted: input.criteria.filter(c => c.status === "completed").length,
      contextsCount: input.contexts.length,
      hasTrend: !!input.trendReport,
      hasPrd: !!input.prdContent,
    });

    // 5. Save
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO business_plan_drafts (id, biz_item_id, version, content, sections_snapshot, model_used, tokens_used, generated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, input.bizItemId, nextVersion, content, snapshot, null, 0, now)
      .run();

    return { id, bizItemId: input.bizItemId, version: nextVersion, content, sectionsSnapshot: snapshot, modelUsed: null, tokensUsed: 0, generatedAt: now };
  }

  buildTemplate(input: BpGenerationInput): string {
    const bundle: BpDataBundle = {
      bizItem: input.bizItem,
      classification: input.bizItem.classification,
      evaluation: input.evaluation,
      criteria: input.criteria,
      contexts: input.contexts,
      startingPoint: input.startingPoint,
      trendReport: input.trendReport,
      prdContent: input.prdContent,
    };
    const sectionContents = mapDataToSections(bundle);
    return renderBpMarkdown(
      { title: input.bizItem.title, description: input.bizItem.description },
      sectionContents,
    );
  }

  async refineWithLlm(draft: string, input: BpGenerationInput): Promise<string> {
    if (!this.runner) return draft;
    try {
      const result = await this.runner.execute({
        taskId: `bp-refine-${Date.now()}`,
        agentId: "bp-generator",
        taskType: "policy-evaluation",
        context: {
          repoUrl: "", branch: "",
          instructions: `당신은 KT DS AX BD팀 사업개발 전문가입니다.
아래는 Discovery 분석 결과를 기반으로 자동 생성된 B2B 사업계획서 초안입니다.
각 섹션을 전문적으로 다듬고, 누락된 내용을 보완해주세요.
기존 evidence를 삭제하지 않고, 보강만 수행하세요.
사업 아이템: ${input.bizItem.title}
시작점: ${input.startingPoint ?? "미분류"}

--- 사업계획서 초안 ---
${draft}`,
          systemPromptOverride: "당신은 B2B 사업계획서 전문 편집자입니다. KT DS 사업개발팀 문체에 맞게 구조화된 사업계획서를 다듬어주세요.",
        },
        constraints: [],
      });
      if (result.status === "success" && result.output?.analysis) {
        return result.output.analysis;
      }
      return draft;
    } catch { return draft; }
  }

  async getLatest(bizItemId: string): Promise<BusinessPlanDraft | null> {
    const row = await this.db
      .prepare("SELECT * FROM business_plan_drafts WHERE biz_item_id = ? ORDER BY version DESC LIMIT 1")
      .bind(bizItemId)
      .first<BpRow>();
    return row ? toBp(row) : null;
  }

  async listVersions(bizItemId: string): Promise<Array<{ version: number; generatedAt: string }>> {
    const { results } = await this.db
      .prepare("SELECT version, generated_at FROM business_plan_drafts WHERE biz_item_id = ? ORDER BY version DESC")
      .bind(bizItemId)
      .all<{ version: number; generated_at: string }>();
    return results.map(r => ({ version: r.version, generatedAt: r.generated_at }));
  }
}
```

### 2.4 Zod Schema (A4)

```typescript
// packages/api/src/schemas/business-plan.ts

import { z } from "@hono/zod-openapi";

export const GenerateBusinessPlanSchema = z.object({
  skipLlmRefine: z.boolean().optional().default(false),
}).openapi("GenerateBusinessPlan");

export const BusinessPlanDraftSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  version: z.number().int(),
  content: z.string(),
  sectionsSnapshot: z.string(),
  modelUsed: z.string().nullable(),
  tokensUsed: z.number(),
  generatedAt: z.string(),
}).openapi("BusinessPlanDraft");

export const BusinessPlanVersionsSchema = z.object({
  versions: z.array(z.object({
    version: z.number().int(),
    generatedAt: z.string(),
  })),
}).openapi("BusinessPlanVersions");
```

### 2.5 Route 확장 (A5)

```typescript
// biz-items.ts에 추가 (F180)

// ─── POST /biz-items/:id/generate-business-plan — 사업계획서 자동 생성 (F180) ───
bizItemsRoute.post("/biz-items/:id/generate-business-plan", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  // Pre-check: classification 필수
  if (!item.classification) {
    return c.json({ error: "CLASSIFICATION_REQUIRED" }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = GenerateBusinessPlanSchema.safeParse(body);
  const skipLlm = parsed.success ? parsed.data.skipLlmRefine : false;

  // 데이터 수집
  const sp = await bizService.getStartingPoint(id);
  const evaluation = await bizService.getEvaluation(id);
  const criteriaService = new DiscoveryCriteriaService(c.env.DB);
  const criteriaProgress = await criteriaService.getAll(id);
  const ctxService = new AnalysisContextService(c.env.DB);
  const contexts = await ctxService.getAll(id);
  const trendReport = await bizService.getTrendReport(id);
  const prdService = new PrdGeneratorService(c.env.DB, null as any);
  const prd = await prdService.getLatest(id);

  const runner = createAgentRunner(c.env);
  const bpService = new BusinessPlanGeneratorService(c.env.DB, runner);

  const bp = await bpService.generate({
    bizItemId: id,
    bizItem: item,
    criteria: criteriaProgress.criteria,
    contexts,
    evaluation,
    startingPoint: sp?.startingPoint as StartingPointType ?? null,
    trendReport: trendReport ? {
      marketSummary: trendReport.marketSummary,
      marketSizeEstimate: trendReport.marketSizeEstimate,
      competitors: trendReport.competitors,
      trends: trendReport.trends,
    } : null,
    prdContent: prd?.content ?? null,
    skipLlmRefine: skipLlm,
  });

  return c.json(bp, 201);
});

// ─── GET /biz-items/:id/business-plan — 최신 사업계획서 조회 (F180) ───
bizItemsRoute.get("/biz-items/:id/business-plan", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const bpService = new BusinessPlanGeneratorService(c.env.DB, null);
  const bp = await bpService.getLatest(id);
  if (!bp) return c.json({ error: "BUSINESS_PLAN_NOT_FOUND" }, 404);

  return c.json(bp);
});

// ─── GET /biz-items/:id/business-plan/versions — 버전 목록 (F180) ───
bizItemsRoute.get("/biz-items/:id/business-plan/versions", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const bpService = new BusinessPlanGeneratorService(c.env.DB, null);
  const versions = await bpService.listVersions(id);

  return c.json({ versions });
});
```

---

## 3. F181 상세 설계 — Prototype 자동 생성

### 3.1 D1 Migration (B1)

```sql
-- packages/api/src/db/migrations/0043_prototypes.sql
CREATE TABLE IF NOT EXISTS prototypes (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  version INTEGER NOT NULL DEFAULT 1,
  format TEXT NOT NULL DEFAULT 'html',
  content TEXT NOT NULL,
  template_used TEXT,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  generated_at TEXT NOT NULL,
  UNIQUE(biz_item_id, version)
);

CREATE INDEX idx_prototypes_biz_item ON prototypes(biz_item_id);
```

### 3.2 prototype-styles.ts (B2)

Self-contained CSS + SVG 아이콘 + verdict별 컬러 테마.

```typescript
// packages/api/src/services/prototype-styles.ts

export const VERDICT_THEMES = {
  green: { primary: "#059669", bg: "#ecfdf5", accent: "#10b981", text: "#064e3b" },
  keep:  { primary: "#d97706", bg: "#fffbeb", accent: "#f59e0b", text: "#78350f" },
  red:   { primary: "#dc2626", bg: "#fef2f2", accent: "#ef4444", text: "#7f1d1d" },
  default: { primary: "#2563eb", bg: "#eff6ff", accent: "#3b82f6", text: "#1e3a5f" },
} as const;

export function getTheme(verdict: string): typeof VERDICT_THEMES["default"] {
  return VERDICT_THEMES[verdict as keyof typeof VERDICT_THEMES] ?? VERDICT_THEMES.default;
}

export const SVG_ICONS = {
  problem: `<svg ...><!-- 느낌표 아이콘 --></svg>`,    // 축약
  solution: `<svg ...><!-- 전구 아이콘 --></svg>`,
  market: `<svg ...><!-- 차트 아이콘 --></svg>`,
  check: `<svg ...><!-- 체크 아이콘 --></svg>`,
  star: `<svg ...><!-- 별 아이콘 --></svg>`,
} as const;

export function getBaseCSS(theme: typeof VERDICT_THEMES["default"]): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Pretendard', -apple-system, sans-serif; color: #1a1a2e; line-height: 1.6; }
    .hero { background: linear-gradient(135deg, ${theme.primary}, ${theme.accent}); color: white; padding: 80px 40px; text-align: center; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 16px; }
    .hero p { font-size: 1.2rem; opacity: 0.9; max-width: 600px; margin: 0 auto 24px; }
    .hero .cta { display: inline-block; padding: 12px 32px; background: white; color: ${theme.primary}; border-radius: 8px; font-weight: 700; text-decoration: none; }
    .section { padding: 60px 40px; max-width: 960px; margin: 0 auto; }
    .section h2 { font-size: 1.8rem; margin-bottom: 24px; color: ${theme.text}; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h3 { font-size: 1.1rem; margin-bottom: 8px; color: ${theme.primary}; }
    .stat { text-align: center; padding: 20px; }
    .stat .value { font-size: 2rem; font-weight: 800; color: ${theme.primary}; }
    .stat .label { font-size: 0.875rem; color: #6b7280; }
    .quote { background: ${theme.bg}; border-left: 4px solid ${theme.accent}; padding: 16px 24px; margin: 12px 0; border-radius: 0 8px 8px 0; }
    .cta-section { background: ${theme.bg}; padding: 60px 40px; text-align: center; }
    .cta-section .btn { display: inline-block; padding: 14px 40px; background: ${theme.primary}; color: white; border-radius: 8px; font-weight: 700; text-decoration: none; }
    @media (max-width: 768px) { .hero { padding: 40px 20px; } .hero h1 { font-size: 1.8rem; } .section { padding: 40px 20px; } }
  `;
}
```

### 3.3 prototype-templates.ts (B3)

5개 Starting Point별 템플릿 — 섹션 순서와 강조점이 달라요.

```typescript
// packages/api/src/services/prototype-templates.ts

import type { StartingPointType } from "./analysis-paths.js";
import { getBaseCSS, getTheme, SVG_ICONS } from "./prototype-styles.js";

export interface PrototypeData {
  title: string;
  tagline: string;          // 핵심 가치 1줄
  problemStatement: string;
  solutionOverview: string;
  features: Array<{ title: string; description: string }>;
  marketStats: Array<{ label: string; value: string }>;
  competitors: string[];
  evaluationSummary: string;
  personaQuotes: Array<{ persona: string; quote: string }>;
  verdict: string;
  avgScore: number;
  ctaText: string;
}

// ─── 섹션 순서 정의 (Starting Point별) ───

const SECTION_ORDER: Record<StartingPointType, string[]> = {
  idea:    ["hero", "solution", "problem", "market", "proof", "cta"],
  market:  ["hero", "market", "problem", "solution", "proof", "cta"],
  problem: ["hero", "problem", "solution", "market", "proof", "cta"],
  tech:    ["hero", "solution", "market", "problem", "proof", "cta"],
  service: ["hero", "problem", "solution", "proof", "market", "cta"],
};

// ─── 섹션 렌더러 ───

function renderHero(data: PrototypeData, theme: ReturnType<typeof getTheme>): string {
  return `<div class="hero"><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.tagline)}</p><a class="cta" href="#">${escapeHtml(data.ctaText)}</a></div>`;
}

function renderProblem(data: PrototypeData): string {
  return `<div class="section"><h2>해결하려는 문제</h2><p>${escapeHtml(data.problemStatement)}</p></div>`;
}

function renderSolution(data: PrototypeData, theme: ReturnType<typeof getTheme>): string {
  const featureCards = data.features.slice(0, 3).map(f =>
    `<div class="card"><h3>${escapeHtml(f.title)}</h3><p>${escapeHtml(f.description)}</p></div>`
  ).join("");
  return `<div class="section"><h2>솔루션</h2><p>${escapeHtml(data.solutionOverview)}</p><div class="cards">${featureCards}</div></div>`;
}

function renderMarket(data: PrototypeData): string {
  const stats = data.marketStats.slice(0, 3).map(s =>
    `<div class="stat"><div class="value">${escapeHtml(s.value)}</div><div class="label">${escapeHtml(s.label)}</div></div>`
  ).join("");
  return `<div class="section"><h2>시장 기회</h2><div class="cards">${stats}</div></div>`;
}

function renderProof(data: PrototypeData): string {
  const quotes = data.personaQuotes.slice(0, 3).map(q =>
    `<div class="quote"><strong>${escapeHtml(q.persona)}</strong><p>"${escapeHtml(q.quote)}"</p></div>`
  ).join("");
  const scoreBar = `<div class="stat"><div class="value">${data.avgScore.toFixed(1)}/10</div><div class="label">전문가 평균 평가</div></div>`;
  return `<div class="section"><h2>검증 결과</h2>${scoreBar}${quotes}</div>`;
}

function renderCta(data: PrototypeData, theme: ReturnType<typeof getTheme>): string {
  return `<div class="cta-section"><h2>다음 단계</h2><p>${escapeHtml(data.evaluationSummary)}</p><a class="btn" href="#">자세히 보기</a></div>`;
}

// ─── HTML 조립 ───

export function renderPrototypeHtml(
  data: PrototypeData,
  startingPoint: StartingPointType,
): string {
  const theme = getTheme(data.verdict);
  const css = getBaseCSS(theme);
  const order = SECTION_ORDER[startingPoint] ?? SECTION_ORDER.idea;

  const renderers: Record<string, () => string> = {
    hero: () => renderHero(data, theme),
    problem: () => renderProblem(data),
    solution: () => renderSolution(data, theme),
    market: () => renderMarket(data),
    proof: () => renderProof(data),
    cta: () => renderCta(data, theme),
  };

  const body = order.map(sec => renderers[sec]?.() ?? "").join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)} — Prototype</title>
  <style>${css}</style>
</head>
<body>
${body}
<footer style="text-align:center;padding:20px;color:#9ca3af;font-size:0.75rem;">
  Generated by Foundry-X Discovery Pipeline — ${new Date().toISOString().split("T")[0]}
</footer>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
```

### 3.4 prototype-generator.ts (B4)

```typescript
// packages/api/src/services/prototype-generator.ts

import type { AgentRunner } from "./agent-runner.js";
import type { BizItem, EvaluationWithScores } from "./biz-item-service.js";
import type { DiscoveryCriterion } from "./discovery-criteria.js";
import type { StartingPointType } from "./analysis-paths.js";
import type { GeneratedPrd } from "./prd-generator.js";
import { renderPrototypeHtml, type PrototypeData } from "./prototype-templates.js";

export interface PrototypeGenerationInput {
  bizItemId: string;
  bizItem: BizItem;
  evaluation: EvaluationWithScores | null;
  criteria: DiscoveryCriterion[];
  startingPoint: StartingPointType;
  trendReport: { marketSummary: string; marketSizeEstimate: unknown; competitors: unknown; trends: unknown } | null;
  prd: GeneratedPrd | null;
  businessPlan: { content: string } | null;
  template?: StartingPointType;  // 오버라이드
}

export interface PrototypeResult {
  id: string;
  bizItemId: string;
  version: number;
  format: "html";
  content: string;
  templateUsed: string;
  modelUsed: string | null;
  tokensUsed: number;
  generatedAt: string;
}

interface ProtoRow {
  id: string; biz_item_id: string; version: number; format: string;
  content: string; template_used: string | null; model_used: string | null;
  tokens_used: number; generated_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function toProto(row: ProtoRow): PrototypeResult {
  return {
    id: row.id, bizItemId: row.biz_item_id, version: row.version,
    format: "html", content: row.content, templateUsed: row.template_used ?? "idea",
    modelUsed: row.model_used, tokensUsed: row.tokens_used, generatedAt: row.generated_at,
  };
}

export class PrototypeGeneratorService {
  constructor(
    private db: D1Database,
    private runner: AgentRunner | null,
  ) {}

  async generate(input: PrototypeGenerationInput): Promise<PrototypeResult> {
    // 1. 데이터 → PrototypeData 변환
    const protoData = this.extractPrototypeData(input);
    const templateType = input.template ?? input.startingPoint;

    // 2. HTML 렌더링
    const content = renderPrototypeHtml(protoData, templateType);

    // 3. 버전
    const latestRow = await this.db
      .prepare("SELECT MAX(version) as max_ver FROM prototypes WHERE biz_item_id = ?")
      .bind(input.bizItemId).first<{ max_ver: number | null }>();
    const nextVersion = (latestRow?.max_ver ?? 0) + 1;

    // 4. 저장
    const id = generateId();
    const now = new Date().toISOString();

    await this.db.prepare(
      `INSERT INTO prototypes (id, biz_item_id, version, format, content, template_used, model_used, tokens_used, generated_at)
       VALUES (?, ?, ?, 'html', ?, ?, ?, ?, ?)`,
    ).bind(id, input.bizItemId, nextVersion, content, templateType, null, 0, now).run();

    return { id, bizItemId: input.bizItemId, version: nextVersion, format: "html", content, templateUsed: templateType, modelUsed: null, tokensUsed: 0, generatedAt: now };
  }

  extractPrototypeData(input: PrototypeGenerationInput): PrototypeData {
    const item = input.bizItem;
    const eval_ = input.evaluation;

    // 문제 정의 (Criterion 1)
    const c1 = input.criteria.find(c => c.criterionId === 1);
    const problemStatement = c1?.evidence ?? item.description ?? "고객이 겪는 핵심 문제를 정의합니다.";

    // 가치 제안 (Criterion 4)
    const c4 = input.criteria.find(c => c.criterionId === 4);
    const tagline = c4?.evidence?.split("\n")[0] ?? `${item.title} — 새로운 가능성`;

    // 솔루션 (Criterion 4 + PRD)
    const solutionOverview = c4?.evidence ?? "혁신적인 솔루션으로 문제를 해결합니다.";

    // 기능 카드 (분석 컨텍스트에서 추출 또는 기본)
    const features = this.extractFeatures(input);

    // 시장 통계
    const marketStats = this.extractMarketStats(input);

    // 경쟁사
    const competitors = this.extractCompetitors(input);

    // 페르소나 인용
    const personaQuotes = this.extractPersonaQuotes(input);

    return {
      title: item.title,
      tagline,
      problemStatement,
      solutionOverview,
      features,
      marketStats,
      competitors,
      evaluationSummary: eval_ ? `전문가 ${eval_.scores.length}인 평가 평균 ${eval_.avgScore.toFixed(1)}점` : "평가 대기 중",
      personaQuotes,
      verdict: eval_?.verdict ?? "default",
      avgScore: eval_?.avgScore ?? 0,
      ctaText: "자세히 알아보기",
    };
  }

  private extractFeatures(input: PrototypeGenerationInput): PrototypeData["features"] {
    // 수익구조(C5), 검증계획(C9), 가치제안(C4)에서 추출
    const defaults = [
      { title: "핵심 기능 1", description: "고객 Pain Point를 직접 해결하는 기능" },
      { title: "핵심 기능 2", description: "차별화된 가치를 제공하는 기능" },
      { title: "핵심 기능 3", description: "확장 가능한 플랫폼 기능" },
    ];
    const c4 = input.criteria.find(c => c.criterionId === 4);
    if (c4?.evidence) {
      const lines = c4.evidence.split("\n").filter(l => l.trim().startsWith("-"));
      if (lines.length >= 2) {
        return lines.slice(0, 3).map((l, i) => ({
          title: `핵심 기능 ${i + 1}`,
          description: l.replace(/^-\s*/, "").trim(),
        }));
      }
    }
    return defaults;
  }

  private extractMarketStats(input: PrototypeGenerationInput): PrototypeData["marketStats"] {
    const stats: PrototypeData["marketStats"] = [];
    if (input.trendReport?.marketSizeEstimate && typeof input.trendReport.marketSizeEstimate === "object") {
      const mse = input.trendReport.marketSizeEstimate as Record<string, string>;
      if (mse.tam) stats.push({ label: "TAM", value: mse.tam });
      if (mse.sam) stats.push({ label: "SAM", value: mse.sam });
      if (mse.som) stats.push({ label: "SOM", value: mse.som });
    }
    if (stats.length === 0) {
      stats.push({ label: "시장 규모", value: "분석 필요" });
    }
    return stats;
  }

  private extractCompetitors(input: PrototypeGenerationInput): string[] {
    if (Array.isArray(input.trendReport?.competitors)) {
      return (input.trendReport!.competitors as Array<{ name: string }>).slice(0, 5).map(c => c.name);
    }
    return [];
  }

  private extractPersonaQuotes(input: PrototypeGenerationInput): PrototypeData["personaQuotes"] {
    if (!input.evaluation?.scores) return [];
    return input.evaluation.scores
      .filter(s => s.summary)
      .slice(0, 3)
      .map(s => ({ persona: s.personaId, quote: s.summary ?? "" }));
  }

  async getLatest(bizItemId: string): Promise<PrototypeResult | null> {
    const row = await this.db
      .prepare("SELECT * FROM prototypes WHERE biz_item_id = ? ORDER BY version DESC LIMIT 1")
      .bind(bizItemId).first<ProtoRow>();
    return row ? toProto(row) : null;
  }

  async getLatestContent(bizItemId: string): Promise<string | null> {
    const row = await this.db
      .prepare("SELECT content FROM prototypes WHERE biz_item_id = ? ORDER BY version DESC LIMIT 1")
      .bind(bizItemId).first<{ content: string }>();
    return row?.content ?? null;
  }
}
```

### 3.5 Zod Schema (B5)

```typescript
// packages/api/src/schemas/prototype.ts

import { z } from "@hono/zod-openapi";

export const GeneratePrototypeSchema = z.object({
  template: z.enum(["idea", "market", "problem", "tech", "service"]).optional(),
}).openapi("GeneratePrototype");

export const PrototypeSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  version: z.number().int(),
  format: z.literal("html"),
  content: z.string(),
  templateUsed: z.string(),
  modelUsed: z.string().nullable(),
  tokensUsed: z.number(),
  generatedAt: z.string(),
}).openapi("Prototype");
```

### 3.6 Route 확장 (B6)

```typescript
// biz-items.ts에 추가 (F181)

// ─── POST /biz-items/:id/generate-prototype — Prototype 생성 (F181) ───
bizItemsRoute.post("/biz-items/:id/generate-prototype", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const sp = await bizService.getStartingPoint(id);
  if (!sp) return c.json({ error: "STARTING_POINT_REQUIRED" }, 400);

  const body = await c.req.json().catch(() => ({}));
  const parsed = GeneratePrototypeSchema.safeParse(body);
  const templateOverride = parsed.success ? parsed.data.template : undefined;

  const evaluation = await bizService.getEvaluation(id);
  const criteriaService = new DiscoveryCriteriaService(c.env.DB);
  const criteriaProgress = await criteriaService.getAll(id);
  const trendReport = await bizService.getTrendReport(id);
  const prdService = new PrdGeneratorService(c.env.DB, null as any);
  const prd = await prdService.getLatest(id);
  const bpService = new BusinessPlanGeneratorService(c.env.DB, null);
  const bp = await bpService.getLatest(id);

  const runner = createAgentRunner(c.env);
  const protoService = new PrototypeGeneratorService(c.env.DB, runner);

  const proto = await protoService.generate({
    bizItemId: id,
    bizItem: item,
    evaluation,
    criteria: criteriaProgress.criteria,
    startingPoint: sp.startingPoint as StartingPointType,
    trendReport: trendReport ? {
      marketSummary: trendReport.marketSummary,
      marketSizeEstimate: trendReport.marketSizeEstimate,
      competitors: trendReport.competitors,
      trends: trendReport.trends,
    } : null,
    prd,
    businessPlan: bp ? { content: bp.content } : null,
    template: templateOverride as StartingPointType | undefined,
  });

  return c.json(proto, 201);
});

// ─── GET /biz-items/:id/prototype — 최신 Prototype 조회 (F181) ───
bizItemsRoute.get("/biz-items/:id/prototype", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const protoService = new PrototypeGeneratorService(c.env.DB, null);
  const proto = await protoService.getLatest(id);
  if (!proto) return c.json({ error: "PROTOTYPE_NOT_FOUND" }, 404);

  return c.json(proto);
});

// ─── GET /biz-items/:id/prototype/preview — HTML 직접 렌더링 (F181) ───
bizItemsRoute.get("/biz-items/:id/prototype/preview", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const protoService = new PrototypeGeneratorService(c.env.DB, null);
  const content = await protoService.getLatestContent(id);
  if (!content) return c.json({ error: "PROTOTYPE_NOT_FOUND" }, 404);

  return c.html(content);
});
```

---

## 4. Shared Types

```typescript
// packages/shared/src/types.ts에 추가

export interface BusinessPlanDraft {
  id: string;
  bizItemId: string;
  version: number;
  content: string;
  sectionsSnapshot: string;
  modelUsed: string | null;
  tokensUsed: number;
  generatedAt: string;
}

export interface Prototype {
  id: string;
  bizItemId: string;
  version: number;
  format: "html" | "markdown";
  content: string;
  templateUsed: string;
  modelUsed: string | null;
  tokensUsed: number;
  generatedAt: string;
}
```

---

## 5. 테스트 전략

### 5.1 Service Tests

```
packages/api/src/__tests__/
├── business-plan-generator.test.ts     (~15 tests)
│   ├── buildTemplate: 10섹션 매핑 정확성
│   ├── generate: DB 저장 + 버전 관리
│   ├── generate with skipLlmRefine: template-only 모드
│   ├── getLatest: 최신 버전 반환
│   ├── listVersions: 버전 목록
│   └── edge cases: 데이터 누락 시 플레이스홀더
│
├── business-plan-template.test.ts      (~8 tests)
│   ├── mapDataToSections: 각 섹션별 매핑
│   ├── renderBpMarkdown: Markdown 구조
│   ├── formatItemType/formatVerdict: 헬퍼
│   └── appendTrendData: 트렌드 데이터 보강
│
├── prototype-generator.test.ts         (~12 tests)
│   ├── generate: HTML 생성 + DB 저장
│   ├── extractPrototypeData: 데이터 추출
│   ├── 5 templates: 각 starting point별 HTML 구조
│   ├── getLatest: 최신 반환
│   ├── getLatestContent: HTML only
│   └── edge cases: evaluation 없을 때
│
└── prototype-templates.test.ts         (~5 tests)
    ├── renderPrototypeHtml: HTML 유효성
    ├── escapeHtml: XSS 방지
    ├── SECTION_ORDER: starting point별 순서
    └── VERDICT_THEMES: 컬러 테마
```

### 5.2 Route Tests

```
packages/api/src/__tests__/routes/
└── biz-items-f180-f181.test.ts        (~20 tests)
    ├── POST /generate-business-plan: 성공, 404, 400(미분류)
    ├── GET /business-plan: 성공, 404(미생성)
    ├── GET /business-plan/versions: 빈 목록, 다중 버전
    ├── POST /generate-prototype: 성공, 404, 400(시작점 미분류)
    ├── GET /prototype: 성공, 404
    └── GET /prototype/preview: HTML 응답, Content-Type
```

### 5.3 테스트 패턴

```typescript
// test-helpers.ts에 추가 (in-memory SQLite)

export function createBusinessPlanDraftsTable(db: D1Database) {
  return db.prepare(`
    CREATE TABLE IF NOT EXISTS business_plan_drafts (
      id TEXT PRIMARY KEY,
      biz_item_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      content TEXT NOT NULL,
      sections_snapshot TEXT,
      model_used TEXT,
      tokens_used INTEGER DEFAULT 0,
      generated_at TEXT NOT NULL,
      UNIQUE(biz_item_id, version)
    )
  `).run();
}

export function createPrototypesTable(db: D1Database) {
  return db.prepare(`
    CREATE TABLE IF NOT EXISTS prototypes (
      id TEXT PRIMARY KEY,
      biz_item_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      format TEXT NOT NULL DEFAULT 'html',
      content TEXT NOT NULL,
      template_used TEXT,
      model_used TEXT,
      tokens_used INTEGER DEFAULT 0,
      generated_at TEXT NOT NULL,
      UNIQUE(biz_item_id, version)
    )
  `).run();
}
```

---

## 6. 엔드포인트 총괄

| Method | Path | Feature | 설명 |
|--------|------|---------|------|
| POST | `/biz-items/:id/generate-business-plan` | F180 | 사업계획서 생성 |
| GET | `/biz-items/:id/business-plan` | F180 | 최신 사업계획서 |
| GET | `/biz-items/:id/business-plan/versions` | F180 | 버전 목록 |
| POST | `/biz-items/:id/generate-prototype` | F181 | Prototype 생성 |
| GET | `/biz-items/:id/prototype` | F181 | 최신 Prototype |
| GET | `/biz-items/:id/prototype/preview` | F181 | HTML 직접 렌더링 |

---

## 7. 파일 목록 (구현 대상)

| # | 파일 | 유형 | Feature |
|---|------|------|---------|
| 1 | `packages/api/src/db/migrations/0042_business_plan_drafts.sql` | Migration | F180 |
| 2 | `packages/api/src/db/migrations/0043_prototypes.sql` | Migration | F181 |
| 3 | `packages/api/src/services/business-plan-template.ts` | Service | F180 |
| 4 | `packages/api/src/services/business-plan-generator.ts` | Service | F180 |
| 5 | `packages/api/src/services/prototype-styles.ts` | Service | F181 |
| 6 | `packages/api/src/services/prototype-templates.ts` | Service | F181 |
| 7 | `packages/api/src/services/prototype-generator.ts` | Service | F181 |
| 8 | `packages/api/src/schemas/business-plan.ts` | Schema | F180 |
| 9 | `packages/api/src/schemas/prototype.ts` | Schema | F181 |
| 10 | `packages/api/src/routes/biz-items.ts` | Route (수정) | F180+F181 |
| 11 | `packages/shared/src/types.ts` | Types (수정) | F180+F181 |
| 12 | `packages/api/src/__tests__/business-plan-generator.test.ts` | Test | F180 |
| 13 | `packages/api/src/__tests__/business-plan-template.test.ts` | Test | F180 |
| 14 | `packages/api/src/__tests__/prototype-generator.test.ts` | Test | F181 |
| 15 | `packages/api/src/__tests__/prototype-templates.test.ts` | Test | F181 |
| 16 | `packages/api/src/__tests__/routes/biz-items-f180-f181.test.ts` | Test | F180+F181 |
