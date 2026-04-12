---
code: FX-DSGN-059
title: "Sprint 59 — F191 방법론 레지스트리+라우터 + F192 BDP 모듈화 래핑"
version: 1.0
status: Active
category: DSGN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 59
features: [F191, F192]
req: [FX-REQ-191, FX-REQ-192]
plan: "[[FX-PLAN-059]]"
---

## 1. 설계 개요

### 1.1 목표

Sprint 59는 Phase 5c 방법론 플러그인 아키텍처의 **기반**을 구축해요:
- **F191**: MethodologyModule 인터페이스 + Registry + Router + DB + API 엔드포인트
- **F192**: 기존 BDP 서비스를 BdpMethodologyModule로 래핑 (기능 변경 없음)

### 1.2 설계 원칙

| 원칙 | 적용 |
|------|------|
| Strategy Pattern | MethodologyModule 인터페이스를 구현하는 다중 모듈 |
| Registry Singleton | 앱 라이프사이클에서 모듈 등록/조회 |
| Delegation (Wrapper) | BDP 모듈은 기존 서비스에 위임만, 비즈니스 로직 변경 없음 |
| Interface Segregation | 선택적 메서드에 default 동작 제공 |

---

## 2. F191 — MethodologyModule 인터페이스 + Registry + Router

### 2.1 인터페이스 정의

**파일**: `packages/api/src/services/methodology-module.ts`

```typescript
import type { AgentRunner } from "./agent-runner.js";

// ─── 공통 타입 ───

export interface BizItemContext {
  id: string;
  title: string;
  description: string | null;
  source: string;
  classification?: {
    itemType: string;
    confidence: number;
    analysisWeights: Record<string, number>;
  } | null;
  startingPoint?: string | null;
}

export interface ModuleClassificationResult {
  /** 방법론 고유 분류 체계 (BDP: type_a/b/c, pm-skills: TBD) */
  classificationKey: string;
  confidence: number;
  details: Record<string, unknown>;
}

export interface AnalysisStepDefinition {
  order: number;
  activity: string;
  toolIds: string[];         // pm-skills IDs or custom tool refs
  discoveryMapping: number[];
}

export interface CriterionDefinition {
  id: number;
  name: string;
  condition: string;
  relatedTools: string[];
}

export interface GateCheckResult {
  gateStatus: "blocked" | "warning" | "ready";
  completedCount: number;
  totalCount: number;
  missingCriteria: Array<{ id: number; name: string; status: string }>;
}

export interface ReviewMethodDefinition {
  id: string;
  name: string;
  type: "ai-review" | "persona-evaluation" | "debate" | "custom";
  description: string;
}

// ─── 핵심 인터페이스 ───

export interface MethodologyModule {
  /** 고유 식별자 (e.g., "bdp", "pm-skills") */
  readonly id: string;
  /** 표시명 */
  readonly name: string;
  /** 설명 */
  readonly description: string;
  /** 버전 */
  readonly version: string;

  /**
   * 아이템 특성 기반 적합도 점수 (0~100).
   * Registry.findBest()가 모든 모듈의 matchScore를 비교하여 추천.
   */
  matchScore(item: BizItemContext): Promise<number>;

  /**
   * 아이템 분류.
   * BDP: Type A/B/C, pm-skills: TBD
   */
  classifyItem(
    item: BizItemContext,
    runner: AgentRunner,
    db: D1Database,
  ): Promise<ModuleClassificationResult>;

  /**
   * 분석 단계 목록 반환.
   * BDP: ANALYSIS_PATHS[startingPoint].steps
   */
  getAnalysisSteps(classification: ModuleClassificationResult): AnalysisStepDefinition[];

  /**
   * 검증 기준 목록.
   * BDP: DISCOVERY_CRITERIA (9개)
   */
  getCriteria(): CriterionDefinition[];

  /**
   * Gate 통과 여부 확인.
   */
  checkGate(bizItemId: string, db: D1Database): Promise<GateCheckResult>;

  /**
   * 검토 방법 목록.
   * BDP: [AI 3-provider, 페르소나 8인, Six Hats]
   */
  getReviewMethods(): ReviewMethodDefinition[];
}

/**
 * MethodologyModule 메타데이터 (DB 저장용, 런타임 인스턴스 없이 조회 가능)
 */
export interface MethodologyModuleMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  configJson: Record<string, unknown> | null;
  criteriaCount: number;
  reviewMethodCount: number;
}

/**
 * 아이템별 방법론 선택 기록
 */
export interface MethodologySelection {
  id: string;
  bizItemId: string;
  methodologyId: string;
  matchScore: number | null;
  selectedBy: "auto" | "manual";
  isCurrent: boolean;
  createdAt: string;
}

/**
 * 방법론 추천 결과
 */
export interface MethodologyRecommendation {
  methodologyId: string;
  name: string;
  matchScore: number;
  description: string;
}
```

**설계 결정:**
- `classifyItem()`에 `runner`와 `db`를 파라미터로 전달 — 모듈이 자체적으로 의존성을 가지지 않고, 호출 시점에 주입받는 구조. 이유: Workers 환경에서 모듈이 싱글톤으로 등록되지만 `c.env.DB`는 요청별로 다를 수 있음
- `toolIds` (기존 `pmSkills`): 방법론에 따라 다른 도구 체계를 사용할 수 있으므로 범용 이름으로 변경
- `MethodologyModuleMeta`: DB에 저장되는 정적 메타데이터. 런타임 모듈 인스턴스 없이도 목록 조회 가능

### 2.2 Registry 설계

**파일**: `packages/api/src/services/methodology-registry.ts`

```typescript
import type { MethodologyModule, MethodologyModuleMeta, MethodologyRecommendation, BizItemContext } from "./methodology-module.js";

export class MethodologyRegistry {
  private static instance: MethodologyRegistry | null = null;
  private modules: Map<string, MethodologyModule> = new Map();

  private constructor() {}

  static getInstance(): MethodologyRegistry {
    if (!MethodologyRegistry.instance) {
      MethodologyRegistry.instance = new MethodologyRegistry();
    }
    return MethodologyRegistry.instance;
  }

  /** 테스트용 리셋 */
  static resetForTest(): void {
    MethodologyRegistry.instance = null;
  }

  register(module: MethodologyModule): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Methodology module '${module.id}' is already registered`);
    }
    this.modules.set(module.id, module);
  }

  unregister(id: string): boolean {
    return this.modules.delete(id);
  }

  get(id: string): MethodologyModule | undefined {
    return this.modules.get(id);
  }

  getAll(): MethodologyModule[] {
    return Array.from(this.modules.values());
  }

  getAllMeta(): MethodologyModuleMeta[] {
    return this.getAll().map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      version: m.version,
      isActive: true,
      configJson: null,
      criteriaCount: m.getCriteria().length,
      reviewMethodCount: m.getReviewMethods().length,
    }));
  }

  /**
   * 모든 모듈의 matchScore를 비교하여 추천 목록 반환 (점수 내림차순)
   */
  async recommend(item: BizItemContext): Promise<MethodologyRecommendation[]> {
    const results: MethodologyRecommendation[] = [];

    for (const module of this.modules.values()) {
      const score = await module.matchScore(item);
      results.push({
        methodologyId: module.id,
        name: module.name,
        matchScore: score,
        description: module.description,
      });
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * 가장 적합한 모듈 반환 (matchScore 최고)
   */
  async findBest(item: BizItemContext): Promise<MethodologyRecommendation | null> {
    const recommendations = await this.recommend(item);
    return recommendations[0] ?? null;
  }

  get size(): number {
    return this.modules.size;
  }
}
```

**설계 결정:**
- **싱글톤**: Workers에서 모듈러 instantiation이 요청별이므로 `static instance` 패턴. `resetForTest()` 제공
- **recommend()는 async**: matchScore가 향후 LLM 기반 판단을 포함할 수 있음
- **Map 기반**: O(1) 조회, 등록 순서 보존 (`Map` iteration order)

### 2.3 D1 마이그레이션

**파일**: `packages/api/src/db/migrations/0044_methodology_selections.sql`

```sql
-- Sprint 59 F191: 방법론 모듈 메타데이터 + 아이템별 선택 이력

CREATE TABLE IF NOT EXISTS methodology_modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_active INTEGER NOT NULL DEFAULT 1,
  config_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS methodology_selections (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  methodology_id TEXT NOT NULL,
  match_score REAL,
  selected_by TEXT NOT NULL DEFAULT 'auto',
  is_current INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id, methodology_id)
);

CREATE INDEX IF NOT EXISTS idx_methodology_selections_biz_item
  ON methodology_selections(biz_item_id);

-- 초기 BDP 모듈 시드 데이터
INSERT OR IGNORE INTO methodology_modules (id, name, description, version)
VALUES ('bdp', 'BDP (Business Development Process)', 'AX-Discovery-Process v0.8 기반 6단계 사업개발 방법론. Type A/B/C 분류 → 5시작점 → 9기준 검증 → PRD/사업계획서/Prototype 생성', '1.0.0');
```

**설계 결정:**
- `methodology_modules` 테이블: Registry와 별도로 DB에 메타데이터 저장 — 관리 UI(F195)에서 활성/비활성 토글 가능
- `methodology_selections`: UNIQUE(biz_item_id, methodology_id) — 같은 아이템에 같은 방법론 중복 선택 방지. `is_current`로 현재 활성 선택 관리
- 시드 데이터: BDP 모듈을 마이그레이션에서 바로 등록

### 2.4 Zod 스키마

**파일**: `packages/api/src/schemas/methodology.ts`

```typescript
import { z } from "@hono/zod-openapi";

export const MethodologyModuleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    version: z.string(),
    isActive: z.boolean(),
    criteriaCount: z.number(),
    reviewMethodCount: z.number(),
  })
  .openapi("MethodologyModule");

export const MethodologyDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    version: z.string(),
    isActive: z.boolean(),
    criteria: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        condition: z.string(),
        relatedTools: z.array(z.string()),
      }),
    ),
    analysisStepCount: z.record(z.string(), z.number()),
    reviewMethods: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(["ai-review", "persona-evaluation", "debate", "custom"]),
        description: z.string(),
      }),
    ),
  })
  .openapi("MethodologyDetail");

export const MethodologyRecommendationSchema = z
  .object({
    methodologyId: z.string(),
    name: z.string(),
    matchScore: z.number().min(0).max(100),
    description: z.string(),
  })
  .openapi("MethodologyRecommendation");

export const MethodologySelectionSchema = z
  .object({
    id: z.string(),
    bizItemId: z.string(),
    methodologyId: z.string(),
    matchScore: z.number().nullable(),
    selectedBy: z.enum(["auto", "manual"]),
    isCurrent: z.boolean(),
    createdAt: z.string(),
  })
  .openapi("MethodologySelection");

export const SelectMethodologySchema = z
  .object({
    methodologyId: z.string().min(1),
  })
  .openapi("SelectMethodology");
```

### 2.5 Shared 타입

**파일**: `packages/shared/src/methodology.ts`

```typescript
/** 방법론 모듈 요약 (목록 조회용) */
export interface MethodologyModuleSummary {
  id: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  criteriaCount: number;
  reviewMethodCount: number;
}

/** 방법론 추천 결과 */
export interface MethodologyRecommendationResult {
  methodologyId: string;
  name: string;
  matchScore: number;
  description: string;
}

/** 방법론 선택 기록 */
export interface MethodologySelectionRecord {
  id: string;
  bizItemId: string;
  methodologyId: string;
  matchScore: number | null;
  selectedBy: "auto" | "manual";
  isCurrent: boolean;
  createdAt: string;
}
```

### 2.6 API 라우트

**파일**: `packages/api/src/routes/methodology.ts`

| # | Method | Path | 설명 | 요청 | 응답 |
|---|--------|------|------|------|------|
| 1 | GET | `/methodologies` | 등록된 방법론 목록 | — | `MethodologyModule[]` |
| 2 | GET | `/methodologies/:id` | 방법론 상세 (criteria, steps, reviews) | — | `MethodologyDetail` |
| 3 | POST | `/biz-items/:itemId/methodology/recommend` | matchScore 기반 추천 | `{ context?: string }` | `MethodologyRecommendation[]` |
| 4 | POST | `/biz-items/:itemId/methodology/select` | 방법론 선택 | `{ methodologyId }` | `MethodologySelection` |
| 5 | GET | `/biz-items/:itemId/methodology` | 현재 선택된 방법론 | — | `MethodologySelection \| null` |
| 6 | GET | `/biz-items/:itemId/methodology/history` | 선택 이력 | — | `MethodologySelection[]` |

**라우트 구현 상세:**

```typescript
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { MethodologyRegistry } from "../services/methodology-registry.js";
import { SelectMethodologySchema } from "../schemas/methodology.js";
import type { BizItemContext } from "../services/methodology-module.js";

export const methodologyRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── GET /methodologies ───
methodologyRoute.get("/methodologies", async (c) => {
  const registry = MethodologyRegistry.getInstance();
  return c.json(registry.getAllMeta());
});

// ─── GET /methodologies/:id ───
methodologyRoute.get("/methodologies/:id", async (c) => {
  const registry = MethodologyRegistry.getInstance();
  const module = registry.get(c.req.param("id"));
  if (!module) return c.json({ error: "Methodology not found" }, 404);

  // 빈 classification으로 analysis steps count만 조회
  const criteria = module.getCriteria();
  const reviewMethods = module.getReviewMethods();

  return c.json({
    id: module.id,
    name: module.name,
    description: module.description,
    version: module.version,
    isActive: true,
    criteria,
    analysisStepCount: {}, // startingPoint별 step count는 classification 이후 의미 있음
    reviewMethods,
  });
});

// ─── POST /biz-items/:itemId/methodology/recommend ───
methodologyRoute.post("/biz-items/:itemId/methodology/recommend", async (c) => {
  const itemId = c.req.param("itemId");

  // BizItem 조회
  const row = await c.env.DB
    .prepare("SELECT * FROM biz_items WHERE id = ?")
    .bind(itemId)
    .first();
  if (!row) return c.json({ error: "BizItem not found" }, 404);

  const item: BizItemContext = {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    source: row.source as string,
  };

  // classification 정보 보충
  const classRow = await c.env.DB
    .prepare("SELECT * FROM biz_classifications WHERE biz_item_id = ? ORDER BY classified_at DESC LIMIT 1")
    .bind(itemId)
    .first();
  if (classRow) {
    item.classification = {
      itemType: classRow.item_type as string,
      confidence: classRow.confidence as number,
      analysisWeights: JSON.parse((classRow.analysis_weights as string) || "{}"),
    };
  }

  // startingPoint 정보 보충
  const spRow = await c.env.DB
    .prepare("SELECT * FROM biz_starting_points WHERE biz_item_id = ? ORDER BY classified_at DESC LIMIT 1")
    .bind(itemId)
    .first();
  if (spRow) {
    item.startingPoint = spRow.starting_point as string;
  }

  const registry = MethodologyRegistry.getInstance();
  const recommendations = await registry.recommend(item);

  return c.json(recommendations);
});

// ─── POST /biz-items/:itemId/methodology/select ───
methodologyRoute.post("/biz-items/:itemId/methodology/select", async (c) => {
  const itemId = c.req.param("itemId");
  const body = await c.req.json();
  const parsed = SelectMethodologySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const registry = MethodologyRegistry.getInstance();
  const module = registry.get(parsed.data.methodologyId);
  if (!module) return c.json({ error: "Methodology not found" }, 404);

  // 기존 current 선택 해제
  await c.env.DB
    .prepare("UPDATE methodology_selections SET is_current = 0 WHERE biz_item_id = ?")
    .bind(itemId)
    .run();

  // 새 선택 기록 (UPSERT)
  const id = crypto.randomUUID();
  await c.env.DB
    .prepare(`INSERT INTO methodology_selections (id, biz_item_id, methodology_id, selected_by, is_current)
              VALUES (?, ?, ?, 'manual', 1)
              ON CONFLICT(biz_item_id, methodology_id) DO UPDATE SET is_current = 1, selected_by = 'manual'`)
    .bind(id, itemId, parsed.data.methodologyId)
    .run();

  const selection = await c.env.DB
    .prepare("SELECT * FROM methodology_selections WHERE biz_item_id = ? AND is_current = 1")
    .bind(itemId)
    .first();

  return c.json(toSelection(selection!), 200);
});

// ─── GET /biz-items/:itemId/methodology ───
methodologyRoute.get("/biz-items/:itemId/methodology", async (c) => {
  const itemId = c.req.param("itemId");
  const row = await c.env.DB
    .prepare("SELECT * FROM methodology_selections WHERE biz_item_id = ? AND is_current = 1")
    .bind(itemId)
    .first();

  if (!row) return c.json(null);
  return c.json(toSelection(row));
});

// ─── GET /biz-items/:itemId/methodology/history ───
methodologyRoute.get("/biz-items/:itemId/methodology/history", async (c) => {
  const itemId = c.req.param("itemId");
  const { results } = await c.env.DB
    .prepare("SELECT * FROM methodology_selections WHERE biz_item_id = ? ORDER BY created_at DESC")
    .bind(itemId)
    .all();

  return c.json(results.map(toSelection));
});

// ─── 헬퍼 ───
function toSelection(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    bizItemId: row.biz_item_id as string,
    methodologyId: row.methodology_id as string,
    matchScore: row.match_score as number | null,
    selectedBy: row.selected_by as string,
    isCurrent: Boolean(row.is_current),
    createdAt: row.created_at as string,
  };
}
```

**app.ts 등록:**
```typescript
// Sprint 59: Methodology registry (auth + tenant required)
import { methodologyRoute } from "./routes/methodology.js";
app.route("/api", methodologyRoute);
```

---

## 3. F192 — BDP 모듈화 래핑

### 3.1 BdpMethodologyModule

**파일**: `packages/api/src/services/bdp-methodology-module.ts`

```typescript
import type {
  MethodologyModule,
  BizItemContext,
  ModuleClassificationResult,
  AnalysisStepDefinition,
  CriterionDefinition,
  GateCheckResult,
  ReviewMethodDefinition,
} from "./methodology-module.js";
import type { AgentRunner } from "./agent-runner.js";
import { ItemClassifier } from "./item-classifier.js";
import { ANALYSIS_PATHS, type StartingPointType, STARTING_POINTS } from "./analysis-paths.js";
import { DISCOVERY_CRITERIA, DiscoveryCriteriaService } from "./discovery-criteria.js";

/**
 * BDP (Business Development Process) 방법론 모듈.
 * 기존 BDP 서비스들을 MethodologyModule 인터페이스로 래핑.
 * 비즈니스 로직 변경 없음 — 기존 서비스에 위임만 수행.
 */
export class BdpMethodologyModule implements MethodologyModule {
  readonly id = "bdp";
  readonly name = "BDP (Business Development Process)";
  readonly description =
    "AX-Discovery-Process v0.8 기반 6단계 사업개발 방법론. " +
    "Type A/B/C 분류 → 5시작점 → 9기준 검증 → PRD/사업계획서/Prototype 생성";
  readonly version = "1.0.0";

  /**
   * 적합도 점수 (0~100).
   *
   * BDP는 범용 방법론이므로 기본 점수가 높음.
   * 분류 정보가 있으면 Type별 가중치 적용:
   * - Type A (벤치마크): +10 (BDP 최적)
   * - Type B (트렌드): +5
   * - Type C (Pain): +0 (다른 방법론이 더 적합할 수 있음)
   */
  async matchScore(item: BizItemContext): Promise<number> {
    let score = 75; // BDP 기본 점수

    if (item.classification) {
      switch (item.classification.itemType) {
        case "type_a":
          score += 10;
          break;
        case "type_b":
          score += 5;
          break;
        case "type_c":
          score += 0;
          break;
      }
    }

    // 시작점이 이미 분류되어 있으면 BDP 친화도 약간 증가
    if (item.startingPoint && STARTING_POINTS.includes(item.startingPoint as StartingPointType)) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * 아이템 분류 — ItemClassifier에 위임.
   * ModuleClassificationResult로 매핑.
   */
  async classifyItem(
    item: BizItemContext,
    runner: AgentRunner,
    db: D1Database,
  ): Promise<ModuleClassificationResult> {
    const classifier = new ItemClassifier(runner, db);
    const result = await classifier.classify(
      { id: item.id, title: item.title, description: item.description, source: item.source },
      undefined,
    );

    return {
      classificationKey: result.itemType,
      confidence: result.confidence,
      details: {
        turnAnswers: result.turnAnswers,
        analysisWeights: result.analysisWeights,
        reasoning: result.reasoning,
      },
    };
  }

  /**
   * 분석 단계 — ANALYSIS_PATHS 정적 데이터에서 조회.
   * classification.details.startingPoint가 없으면 "idea" 기본값.
   */
  getAnalysisSteps(classification: ModuleClassificationResult): AnalysisStepDefinition[] {
    const sp = (classification.details.startingPoint as StartingPointType) ?? "idea";
    const path = ANALYSIS_PATHS[sp] ?? ANALYSIS_PATHS.idea;

    return path.steps.map((step) => ({
      order: step.order,
      activity: step.activity,
      toolIds: step.pmSkills,
      discoveryMapping: step.discoveryMapping,
    }));
  }

  /**
   * 검증 기준 — DISCOVERY_CRITERIA 상수 반환.
   */
  getCriteria(): CriterionDefinition[] {
    return DISCOVERY_CRITERIA.map((c) => ({
      id: c.id,
      name: c.name,
      condition: c.condition,
      relatedTools: [...c.pmSkills],
    }));
  }

  /**
   * Gate 확인 — DiscoveryCriteriaService.checkGate()에 위임.
   */
  async checkGate(bizItemId: string, db: D1Database): Promise<GateCheckResult> {
    const service = new DiscoveryCriteriaService(db);
    const result = await service.checkGate(bizItemId);

    return {
      gateStatus: result.gateStatus,
      completedCount: result.completedCount,
      totalCount: DISCOVERY_CRITERIA.length,
      missingCriteria: result.missingCriteria.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
      })),
    };
  }

  /**
   * 검토 방법 — BDP 고유 3종 반환.
   */
  getReviewMethods(): ReviewMethodDefinition[] {
    return [
      {
        id: "ai-3-provider",
        name: "다중 AI 검토 (3-Provider)",
        type: "ai-review",
        description: "Claude + GPT + Gemini 3개 AI로 교차 검토",
      },
      {
        id: "persona-8",
        name: "멀티 페르소나 평가 (8인)",
        type: "persona-evaluation",
        description: "전략/영업/AP사업/AI기술/재무/보안/파트너십/제품 8개 관점 평가",
      },
      {
        id: "six-hats",
        name: "Six Hats 토론",
        type: "debate",
        description: "De Bono 6색 모자 토론 시뮬레이션 (20턴 순환)",
      },
    ];
  }
}
```

### 3.2 Registry 초기화

**위치**: `packages/api/src/routes/methodology.ts` 상단 (모듈 로드 시 자동 실행)

```typescript
import { MethodologyRegistry } from "../services/methodology-registry.js";
import { BdpMethodologyModule } from "../services/bdp-methodology-module.js";

// ─── Registry 초기화: BDP 모듈 등록 ───
const registry = MethodologyRegistry.getInstance();
if (!registry.get("bdp")) {
  registry.register(new BdpMethodologyModule());
}
```

**설계 결정:**
- 라우트 모듈 로드 시점에 Registry 초기화 — Workers에서 모듈은 cold start 시 한 번만 로드됨
- `if (!registry.get("bdp"))` 가드 — 핫 리로드 시 중복 등록 방지

---

## 4. 구현 순서

### 4.1 W1 (F191) — 기반 인프라

| 순서 | 파일 | 설명 | 예상 LOC |
|------|------|------|----------|
| 1 | `services/methodology-module.ts` | 인터페이스 + 공통 타입 | ~120 |
| 2 | `services/methodology-registry.ts` | 싱글톤 Registry | ~80 |
| 3 | `shared/src/methodology.ts` | 공유 타입 | ~30 |
| 4 | `schemas/methodology.ts` | Zod 스키마 | ~60 |
| 5 | `db/migrations/0044_methodology_selections.sql` | D1 마이그레이션 | ~25 |
| 6 | `routes/methodology.ts` | 6개 API 엔드포인트 | ~150 |
| 7 | `app.ts` | 라우트 등록 (1줄 import + 1줄 route) | ~2 |
| 8 | `__tests__/methodology-registry.test.ts` | Registry 단위 테스트 | ~100 |
| 9 | `__tests__/methodology-routes.test.ts` | API 통합 테스트 | ~180 |

### 4.2 W2 (F192) — BDP 모듈 래핑

| 순서 | 파일 | 설명 | 예상 LOC |
|------|------|------|----------|
| 1 | `services/bdp-methodology-module.ts` | BDP 모듈 구현 | ~140 |
| 2 | `__tests__/bdp-methodology-module.test.ts` | BDP 모듈 테스트 | ~150 |

### 4.3 의존 관계 & 병렬화

```
W1 Step 1-2 (인터페이스+Registry)  ──→  W2 Step 1 (BDP 모듈)
         │                                     │
         ▼                                     ▼
W1 Step 3-9 (나머지)              W2 Step 2 (테스트)
```

- W1 Step 1-2가 완료되면 W2 시작 가능 (인터페이스만 있으면 됨)
- W1 나머지와 W2는 병렬 실행 가능

---

## 5. 테스트 설계

### 5.1 Registry 단위 테스트

**파일**: `packages/api/src/__tests__/methodology-registry.test.ts`

| # | 테스트명 | 검증 |
|---|---------|------|
| 1 | `getInstance returns same instance` | 싱글톤 보장 |
| 2 | `register adds module` | register → get 확인 |
| 3 | `register throws on duplicate` | 중복 등록 에러 |
| 4 | `unregister removes module` | unregister → get undefined |
| 5 | `getAll returns all modules` | 복수 등록 → 목록 |
| 6 | `getAllMeta returns metadata` | criteriaCount, reviewMethodCount 포함 |
| 7 | `recommend returns sorted by score` | 점수 내림차순 |
| 8 | `findBest returns highest score` | 최고 점수 모듈 |
| 9 | `resetForTest clears instance` | 테스트 격리 |

### 5.2 API 통합 테스트

**파일**: `packages/api/src/__tests__/methodology-routes.test.ts`

| # | 테스트명 | Method | Path | 검증 |
|---|---------|--------|------|------|
| 1 | `GET /methodologies returns list` | GET | /methodologies | 200, BDP 포함 |
| 2 | `GET /methodologies/:id returns detail` | GET | /methodologies/bdp | 200, criteria 9개 |
| 3 | `GET /methodologies/:id 404` | GET | /methodologies/unknown | 404 |
| 4 | `POST recommend returns scores` | POST | /biz-items/:id/methodology/recommend | 200, matchScore 포함 |
| 5 | `POST recommend 404 unknown item` | POST | /biz-items/xxx/methodology/recommend | 404 |
| 6 | `POST select sets methodology` | POST | /biz-items/:id/methodology/select | 200, isCurrent true |
| 7 | `POST select 404 unknown methodology` | POST | /biz-items/:id/methodology/select | 404 |
| 8 | `POST select overwrites previous` | POST | (2회 select) | 첫 번째 is_current=0 |
| 9 | `GET current returns selection` | GET | /biz-items/:id/methodology | 200 or null |
| 10 | `GET history returns all` | GET | /biz-items/:id/methodology/history | 200, 이력 배열 |

### 5.3 BDP 모듈 단위 테스트

**파일**: `packages/api/src/__tests__/bdp-methodology-module.test.ts`

| # | 테스트명 | 검증 |
|---|---------|------|
| 1 | `matchScore returns 75 for no classification` | 기본 점수 |
| 2 | `matchScore returns 85 for type_a` | Type A 가중치 |
| 3 | `matchScore returns 80 for type_b` | Type B 가중치 |
| 4 | `matchScore returns 80 with startingPoint bonus` | SP 보너스 |
| 5 | `matchScore capped at 100` | 최대값 제한 |
| 6 | `classifyItem delegates to ItemClassifier` | Mock runner 검증 |
| 7 | `getAnalysisSteps returns idea path` | 기본 경로 8단계 |
| 8 | `getAnalysisSteps returns problem path` | 문제 경로 9단계 |
| 9 | `getCriteria returns 9 criteria` | 9개 기준 |
| 10 | `checkGate delegates to DiscoveryCriteriaService` | Mock DB 검증 |
| 11 | `getReviewMethods returns 3 methods` | 3종 검토 |
| 12 | `id/name/description/version are correct` | 메타데이터 |

---

## 6. 변경 영향 분석

### 6.1 기존 코드 변경

| 파일 | 변경 | 영향 |
|------|------|------|
| `app.ts` | import + route 등록 1줄 추가 | 없음 (기존 라우트 영향 없음) |
| `shared/src/index.ts` | methodology.ts export 추가 | 없음 (추가만) |

### 6.2 기존 코드 미변경

| 파일 | 이유 |
|------|------|
| `routes/biz-items.ts` | F192는 래핑만, biz-items 라우트는 건드리지 않음 |
| `services/item-classifier.ts` | BDP 모듈이 import만 |
| `services/discovery-criteria.ts` | BDP 모듈이 import만 |
| `services/analysis-paths.ts` | BDP 모듈이 import만 |
| 기존 테스트 파일들 | 회귀 없음 |

### 6.3 새로 생성하는 파일 (10개)

```
packages/api/src/services/methodology-module.ts     (F191)
packages/api/src/services/methodology-registry.ts   (F191)
packages/api/src/services/bdp-methodology-module.ts  (F192)
packages/api/src/routes/methodology.ts               (F191)
packages/api/src/schemas/methodology.ts              (F191)
packages/api/src/db/migrations/0044_methodology_selections.sql (F191)
packages/api/src/__tests__/methodology-registry.test.ts   (F191)
packages/api/src/__tests__/methodology-routes.test.ts     (F191)
packages/api/src/__tests__/bdp-methodology-module.test.ts (F192)
packages/shared/src/methodology.ts                        (F191)
```

---

## 7. 향후 확장 (Sprint 60)

이 설계가 Sprint 60에서 어떻게 확장되는지:

| Sprint 60 | 이 설계의 확장점 |
|-----------|-----------------|
| F193 pm-skills 모듈 | `PmSkillsMethodologyModule implements MethodologyModule` 추가 + Registry 등록 |
| F194 검증기준 설계 | `getCriteria()` 반환값 — BDP 9기준과 독립적 기준 정의 |
| F195 관리 UI | `GET /methodologies` API를 Web 대시보드에서 호출 + 선택/변경 UI |
