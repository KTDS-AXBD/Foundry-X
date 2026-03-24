---
code: FX-DSGN-052
title: Sprint 52 — 5시작점 분류 + 경로 안내 (F182) 설계서
version: 0.1
status: Draft
category: DSGN
created: 2026-03-24
updated: 2026-03-24
author: Sinclair Seo
related: "[[FX-PLAN-052]]"
---

# Sprint 52 Design Document

> F182: 5시작점 분류 + 경로 안내 — API 서비스 + 대시보드 UI 상세 설계

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Web Dashboard                                                   │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ StartingPointBadge│  │AnalysisPathStepper│  │ConfirmModal  │ │
│  └───────┬───────────┘  └─────────┬────────┘  └──────┬───────┘ │
│          │ GET /analysis-path      │                   │ PATCH   │
└──────────┼─────────────────────────┼───────────────────┼─────────┘
           │                         │                   │
┌──────────┼─────────────────────────┼───────────────────┼─────────┐
│  API     │                         │                   │         │
│  ┌───────▼──────────────────────────────────────────────▼──────┐ │
│  │                    biz-items route                          │ │
│  │  POST /:id/starting-point  |  PATCH /:id/starting-point    │ │
│  │  GET  /:id/analysis-path                                   │ │
│  └────────────┬─────────────────────────────────────────┬─────┘ │
│               │                                         │       │
│  ┌────────────▼────────────┐    ┌───────────────────────▼────┐  │
│  │ StartingPointClassifier │    │   BizItemService           │  │
│  │ (LLM → 5시작점 분류)    │    │   (확장: startingPoint     │  │
│  └────────────┬────────────┘    │    save/get/confirm)       │  │
│               │                 └────────────────────────────┘  │
│  ┌────────────▼────────────┐    ┌────────────────────────────┐  │
│  │ starting-point-prompts  │    │   analysis-paths           │  │
│  │ (시스템+유저 프롬프트)   │    │   (5경로 정적 데이터)      │  │
│  └─────────────────────────┘    └────────────────────────────┘  │
│               │                                                  │
│  ┌────────────▼────────────┐    ┌────────────────────────────┐  │
│  │     AgentRunner         │    │   D1 Database              │  │
│  │  (기존 팩토리 재사용)    │    │   biz_item_starting_points │  │
│  └─────────────────────────┘    └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Design

### 2.1 D1 Migration — `0035_biz_starting_points.sql`

```sql
-- 0035_biz_starting_points.sql
-- Sprint 52: 5시작점 분류 결과 저장 (F182)

CREATE TABLE IF NOT EXISTS biz_item_starting_points (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL UNIQUE,
  starting_point TEXT NOT NULL CHECK (starting_point IN ('idea', 'market', 'problem', 'tech', 'service')),
  confidence REAL NOT NULL DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  reasoning TEXT,
  needs_confirmation INTEGER NOT NULL DEFAULT 0,
  confirmed_by TEXT,
  confirmed_at TEXT,
  classified_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_biz_starting_points_item ON biz_item_starting_points(biz_item_id);
```

**설계 결정**:
- `needs_confirmation`: confidence < 0.6일 때 자동으로 1 설정. BOOLEAN 대신 INTEGER (D1/SQLite 호환)
- `confirmed_by`/`confirmed_at`: 담당자가 PATCH로 확인하면 채워짐
- `biz_item_id UNIQUE`: 아이템당 시작점 분류는 1건만 (재분류 시 UPDATE)

### 2.2 TypeScript Types

```typescript
// packages/api/src/services/analysis-paths.ts

export const STARTING_POINTS = ["idea", "market", "problem", "tech", "service"] as const;
export type StartingPointType = (typeof STARTING_POINTS)[number];

export interface AnalysisStep {
  order: number;
  activity: string;
  pmSkills: string[];
  discoveryMapping: number[];  // Discovery 9기준 번호
}

export interface AnalysisPath {
  startingPoint: StartingPointType;
  label: string;              // "아이디어에서 시작"
  description: string;        // 한 줄 설명
  steps: AnalysisStep[];
}

export interface StartingPointResult {
  id: string;
  bizItemId: string;
  startingPoint: StartingPointType;
  confidence: number;
  reasoning: string;
  needsConfirmation: boolean;
  confirmedBy: string | null;
  confirmedAt: string | null;
  classifiedAt: string;
}
```

---

## 3. Service Design

### 3.1 `analysis-paths.ts` — 정적 분석 경로 데이터

BDP-002 §4의 5시작점별 경로를 정적 데이터로 정의. 각 경로는 BDP-002 원문 그대로 반영.

```typescript
// packages/api/src/services/analysis-paths.ts

export const ANALYSIS_PATHS: Record<StartingPointType, AnalysisPath> = {
  idea: {
    startingPoint: "idea",
    label: "아이디어에서 시작",
    description: "솔루션 아이디어는 있지만 근거가 없다",
    steps: [
      { order: 1, activity: "아이디어/솔루션 입력", pmSkills: [], discoveryMapping: [] },
      { order: 2, activity: "아이디어 핵심 파악 + Pain Point 가설 생성", pmSkills: ["/brainstorm"], discoveryMapping: [1] },
      { order: 3, activity: "타깃 고객 JTBD 나열 + 인터뷰 반영", pmSkills: ["/interview"], discoveryMapping: [1, 4] },
      { order: 4, activity: "고객 세그먼트 생성 + 문제 심도 측정", pmSkills: ["/research-users"], discoveryMapping: [1] },
      { order: 5, activity: "타깃 고객 인터뷰 + 실질 문제 확인", pmSkills: ["/interview"], discoveryMapping: [1, 9] },
      { order: 6, activity: "리서치 결론 — 문제-솔루션 방향 확정 or 피봇", pmSkills: ["/strategy"], discoveryMapping: [4, 6] },
      { order: 7, activity: "시장 규모 + 경쟁사 분석", pmSkills: ["/competitive-analysis", "/market-scan"], discoveryMapping: [2, 3] },
      { order: 8, activity: "수익 구조 + 리스크 + 규제/기술 제약 + 차별화", pmSkills: ["/business-model", "/value-proposition"], discoveryMapping: [5, 6, 7, 8] },
    ],
  },
  market: { /* BDP-002 §4-2 ... */ },
  problem: { /* BDP-002 §4-3 ... */ },
  tech: { /* BDP-002 §4-4 ... */ },
  service: { /* BDP-002 §4-5 ... */ },
};

export function getAnalysisPath(startingPoint: StartingPointType): AnalysisPath {
  return ANALYSIS_PATHS[startingPoint];
}
```

### 3.2 `starting-point-prompts.ts` — LLM 프롬프트

```typescript
// packages/api/src/services/starting-point-prompts.ts

export const STARTING_POINT_SYSTEM_PROMPT = `당신은 KT DS AX BD팀의 사업개발 전문가입니다.
사업 아이템의 설명을 분석하여, 담당자가 어디서 분석을 시작해야 하는지 5가지 시작점 중 하나로 분류합니다.

5가지 시작점:
1. idea (아이디어에서 시작): 솔루션 아이디어는 있지만 시장/고객 근거가 없다. 핵심 단서: "이런 걸 만들면 어떨까", 아이디어/컨셉 위주 설명.
2. market (시장 또는 타겟에서 시작): 타겟 시장이나 고객군은 있지만 구체적 솔루션이 없다. 핵심 단서: 시장 규모, 타겟 고객층, 산업 트렌드 언급.
3. problem (고객 문제에서 시작): 고객의 구체적 문제/Pain Point를 발견했지만 해결 방법이 없다. 핵심 단서: 고객 불만, VOC, 업무 비효율 언급.
4. tech (기술에서 시작): 기술이나 기술 트렌드가 있지만 적용 분야를 모른다. 핵심 단서: AI, 블록체인, 클라우드 등 기술명 위주 설명.
5. service (기존 서비스에서 시작): 운영 중인 서비스에서 신규 사업 확장을 탐색한다. 핵심 단서: 기존 서비스명, 확장/피봇, 부가 수익 언급.

분류 기준:
- 설명의 핵심 내용이 어떤 시작점에 가장 가까운지 판단
- 2개 이상에 해당할 수 있으면, 가장 강한 시작점을 선택하고 confidence를 낮게(0.4~0.6) 설정
- 판단 근거를 한국어로 1~2문장 작성

반드시 한국어로 분석하세요.`;

export function buildStartingPointPrompt(
  item: { title: string; description: string | null; source: string },
  context?: string,
): string {
  const contextBlock = context ? `\n추가 컨텍스트: ${context}` : "";

  return `다음 사업 아이템을 분석하고, 5가지 시작점 중 가장 적합한 하나를 선택해주세요.

[사업 아이템]
제목: ${item.title}
설명: ${item.description ?? "(설명 없음)"}
출처: ${item.source}${contextBlock}

[출력 형식] 반드시 아래 JSON 형식으로만 응답하세요. JSON 외 텍스트를 포함하지 마세요.
{
  "startingPoint": "idea" | "market" | "problem" | "tech" | "service",
  "confidence": 0.0~1.0,
  "reasoning": "분류 근거 (한국어 1~2문장)"
}`;
}
```

### 3.3 `StartingPointClassifier` — 분류 서비스

```typescript
// packages/api/src/services/starting-point-classifier.ts

import type { AgentRunner } from "./agent-runner.js";
import type { AgentExecutionResult } from "./execution-types.js";
import {
  STARTING_POINT_SYSTEM_PROMPT,
  buildStartingPointPrompt,
} from "./starting-point-prompts.js";
import { STARTING_POINTS, type StartingPointType } from "./analysis-paths.js";

const CONFIDENCE_THRESHOLD = 0.6;

export interface StartingPointClassificationResult {
  startingPoint: StartingPointType;
  confidence: number;
  reasoning: string;
  needsConfirmation: boolean;
}

export class StartingPointClassifier {
  constructor(private runner: AgentRunner) {}

  async classify(
    item: { title: string; description: string | null; source: string },
    context?: string,
  ): Promise<StartingPointClassificationResult> {
    const prompt = buildStartingPointPrompt(item, context);

    const result: AgentExecutionResult = await this.runner.execute({
      taskId: `sp-classify-${Date.now()}`,
      agentId: "starting-point-classifier",
      taskType: "policy-evaluation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: prompt,
        systemPromptOverride: STARTING_POINT_SYSTEM_PROMPT,
      },
      constraints: [],
    });

    if (result.status === "failed") {
      throw new StartingPointError("LLM execution failed", "LLM_EXECUTION_FAILED");
    }

    const rawText = result.output.analysis ?? "";
    return this.parseResponse(rawText);
  }

  private parseResponse(rawText: string): StartingPointClassificationResult {
    let jsonStr = rawText.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]!.trim();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new StartingPointError(
        `Failed to parse LLM response: ${rawText.slice(0, 200)}`,
        "LLM_PARSE_ERROR",
      );
    }

    const sp = parsed.startingPoint as string;
    if (!STARTING_POINTS.includes(sp as StartingPointType)) {
      throw new StartingPointError(
        `Invalid starting point: ${sp}. Expected: ${STARTING_POINTS.join(", ")}`,
        "LLM_PARSE_ERROR",
      );
    }

    const confidence = Number(parsed.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      throw new StartingPointError(
        `Invalid confidence: ${parsed.confidence}`,
        "LLM_PARSE_ERROR",
      );
    }

    return {
      startingPoint: sp as StartingPointType,
      confidence,
      reasoning: String(parsed.reasoning ?? ""),
      needsConfirmation: confidence < CONFIDENCE_THRESHOLD,
    };
  }
}

export class StartingPointError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "StartingPointError";
  }
}
```

**설계 결정 — ItemClassifier와의 차이점**:
| 항목 | ItemClassifier (Type A/B/C) | StartingPointClassifier (5시작점) |
|------|---------------------------|----------------------------------|
| LLM 호출 | 3턴 시뮬레이션 | 단일 질문 (시작점만 판별) |
| 출력 | type + turnAnswers + weights | startingPoint + reasoning |
| DB 의존성 | constructor에서 DB 주입 | DB 불필요 (순수 분류만) |
| confidence 임계 | 없음 | 0.6 미만 → needsConfirmation |

### 3.4 `BizItemService` 확장 — 시작점 저장/조회

기존 `BizItemService`에 3개 메서드를 추가:

```typescript
// packages/api/src/services/biz-item-service.ts (추가)

interface StartingPointRow {
  id: string;
  biz_item_id: string;
  starting_point: string;
  confidence: number;
  reasoning: string | null;
  needs_confirmation: number;
  confirmed_by: string | null;
  confirmed_at: string | null;
  classified_at: string;
}

// --- 추가 메서드 ---

async saveStartingPoint(
  bizItemId: string,
  result: { startingPoint: string; confidence: number; reasoning: string; needsConfirmation: boolean },
): Promise<string> {
  const id = generateId();
  await this.db
    .prepare(
      `INSERT INTO biz_item_starting_points
         (id, biz_item_id, starting_point, confidence, reasoning, needs_confirmation, classified_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(biz_item_id) DO UPDATE SET
         starting_point = excluded.starting_point,
         confidence = excluded.confidence,
         reasoning = excluded.reasoning,
         needs_confirmation = excluded.needs_confirmation,
         classified_at = datetime('now'),
         confirmed_by = NULL,
         confirmed_at = NULL`,
    )
    .bind(id, bizItemId, result.startingPoint, result.confidence, result.reasoning, result.needsConfirmation ? 1 : 0)
    .run();
  return id;
}

async getStartingPoint(bizItemId: string): Promise<StartingPointResult | null> {
  const row = await this.db
    .prepare("SELECT * FROM biz_item_starting_points WHERE biz_item_id = ?")
    .bind(bizItemId)
    .first<StartingPointRow>();

  if (!row) return null;

  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    startingPoint: row.starting_point as StartingPointType,
    confidence: row.confidence,
    reasoning: row.reasoning ?? "",
    needsConfirmation: row.needs_confirmation === 1,
    confirmedBy: row.confirmed_by,
    confirmedAt: row.confirmed_at,
    classifiedAt: row.classified_at,
  };
}

async confirmStartingPoint(
  bizItemId: string,
  userId: string,
  startingPoint?: string,
): Promise<void> {
  const now = new Date().toISOString();
  if (startingPoint) {
    // 시작점 수정 + 확인
    await this.db
      .prepare(
        `UPDATE biz_item_starting_points
         SET starting_point = ?, confirmed_by = ?, confirmed_at = ?, needs_confirmation = 0
         WHERE biz_item_id = ?`,
      )
      .bind(startingPoint, userId, now, bizItemId)
      .run();
  } else {
    // 기존 분류 확인만
    await this.db
      .prepare(
        `UPDATE biz_item_starting_points
         SET confirmed_by = ?, confirmed_at = ?, needs_confirmation = 0
         WHERE biz_item_id = ?`,
      )
      .bind(userId, now, bizItemId)
      .run();
  }
}
```

**설계 결정 — UPSERT 사용 이유**: 재분류 시 기존 결과를 덮어쓰되, 확인 정보는 초기화 (confirmed_by/confirmed_at = NULL). 아이템당 시작점은 1건만 유지.

---

## 4. API Design

### 4.1 Zod 스키마 — `starting-point.ts`

```typescript
// packages/api/src/schemas/starting-point.ts

import { z } from "@hono/zod-openapi";

export const startingPointEnum = z.enum(["idea", "market", "problem", "tech", "service"]);

// --- 요청 스키마 ---
export const ClassifyStartingPointSchema = z
  .object({
    context: z.string().max(3000).optional(),
  })
  .openapi("ClassifyStartingPoint");

export const ConfirmStartingPointSchema = z
  .object({
    startingPoint: startingPointEnum.optional(), // 수정 시 전달, 확인만 할 때는 생략
  })
  .openapi("ConfirmStartingPoint");

// --- 응답 스키마 ---
export const StartingPointResultSchema = z
  .object({
    startingPoint: startingPointEnum,
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    needsConfirmation: z.boolean(),
    confirmedBy: z.string().nullable(),
    confirmedAt: z.string().nullable(),
    classifiedAt: z.string(),
  })
  .openapi("StartingPointResult");

export const AnalysisStepSchema = z
  .object({
    order: z.number().int().min(1),
    activity: z.string(),
    pmSkills: z.array(z.string()),
    discoveryMapping: z.array(z.number().int().min(1).max(9)),
  })
  .openapi("AnalysisStep");

export const AnalysisPathSchema = z
  .object({
    startingPoint: startingPointEnum,
    label: z.string(),
    description: z.string(),
    steps: z.array(AnalysisStepSchema),
  })
  .openapi("AnalysisPath");
```

### 4.2 라우트 확장 — `biz-items.ts`

기존 `bizItemsRoute`에 3개 엔드포인트 추가:

```typescript
// 추가 import
import { StartingPointClassifier, StartingPointError } from "../services/starting-point-classifier.js";
import { getAnalysisPath } from "../services/analysis-paths.js";
import { ClassifyStartingPointSchema, ConfirmStartingPointSchema } from "../schemas/starting-point.js";

// ─── POST /biz-items/:id/starting-point — 5시작점 분류 실행 ───

bizItemsRoute.post("/biz-items/:id/starting-point", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = ClassifyStartingPointSchema.safeParse(body);
  const context = parsed.success ? parsed.data.context : undefined;

  const runner = createAgentRunner(c.env);
  const classifier = new StartingPointClassifier(runner);

  try {
    const result = await classifier.classify(
      { title: item.title, description: item.description, source: item.source },
      context,
    );

    await service.saveStartingPoint(id, result);

    return c.json({
      ...result,
      analysisPath: getAnalysisPath(result.startingPoint),
    });
  } catch (e) {
    if (e instanceof StartingPointError) {
      const status = e.code === "LLM_PARSE_ERROR" ? 502 : 500;
      return c.json({ error: e.code, message: e.message }, status);
    }
    throw e;
  }
});

// ─── PATCH /biz-items/:id/starting-point — 시작점 확인/수정 ───

bizItemsRoute.patch("/biz-items/:id/starting-point", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const existing = await service.getStartingPoint(id);
  if (!existing) return c.json({ error: "STARTING_POINT_NOT_CLASSIFIED" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = ConfirmStartingPointSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

  await service.confirmStartingPoint(id, userId, parsed.data.startingPoint);

  const updated = await service.getStartingPoint(id);
  return c.json(updated);
});

// ─── GET /biz-items/:id/analysis-path — 분석 경로 조회 ───

bizItemsRoute.get("/biz-items/:id/analysis-path", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const sp = await service.getStartingPoint(id);
  if (!sp) return c.json({ error: "STARTING_POINT_NOT_CLASSIFIED" }, 404);

  const path = getAnalysisPath(sp.startingPoint as StartingPointType);
  return c.json({
    startingPoint: sp,
    analysisPath: path,
  });
});
```

### 4.3 API 시퀀스 다이어그램

```
담당자 → POST /biz-items/:id/starting-point
          → StartingPointClassifier.classify()
          → AgentRunner.execute() (LLM 호출)
          → parseResponse() → { startingPoint, confidence, reasoning }
          → BizItemService.saveStartingPoint()
          ← { startingPoint, confidence, needsConfirmation, analysisPath }

[needsConfirmation = true 인 경우]
담당자 → PATCH /biz-items/:id/starting-point  { startingPoint?: "tech" }
          → BizItemService.confirmStartingPoint()
          ← { updated result }

담당자 → GET /biz-items/:id/analysis-path
          ← { startingPoint, analysisPath: { steps: [...] } }
```

---

## 5. Web UI Design

### 5.1 StartingPointBadge

`packages/web/src/components/feature/StartingPointBadge.tsx`

시작점 유형을 색상 배지로 표시:

| 시작점 | 색상 | 아이콘 | 텍스트 |
|--------|------|--------|--------|
| idea | purple | 💡 | 아이디어 |
| market | blue | 📊 | 시장·타겟 |
| problem | orange | 🔍 | 고객 문제 |
| tech | green | 🔧 | 기술 |
| service | gray | 🏢 | 기존 서비스 |

confidence < 0.6이면 배지 우측에 `⚠️ 확인 필요` 표시.

```tsx
interface StartingPointBadgeProps {
  startingPoint: string;
  confidence: number;
  needsConfirmation: boolean;
  onConfirmClick?: () => void;
}
```

### 5.2 AnalysisPathStepper

`packages/web/src/components/feature/AnalysisPathStepper.tsx`

세로 타임라인 UI로 분석 경로 표시:

```
┌─────────────────────────────────────────────────┐
│  📊 시장 또는 타겟에서 시작                       │
│  "누구를 볼지는 알지만 무엇을 만들지 모른다"       │
│                                                   │
│  ● 1. 시장 또는 타겟 고객 입력                    │
│  │                                                │
│  ● 2. 타깃 고객 JTBD 나열                        │
│  │   → /interview                                 │
│  │                                                │
│  ● 3. 핵심 검증 + 현장 대화 수집                  │
│  │   → /research-users                            │
│  │                                                │
│  ○ 4. 문제 해결 우선순위 선정                     │
│  │   → /strategy                                  │
│  ...                                              │
└─────────────────────────────────────────────────┘
```

```tsx
interface AnalysisPathStepperProps {
  path: {
    startingPoint: string;
    label: string;
    description: string;
    steps: Array<{
      order: number;
      activity: string;
      pmSkills: string[];
      discoveryMapping: number[];
    }>;
  };
}
```

### 5.3 StartingPointConfirm

`packages/web/src/components/feature/StartingPointConfirm.tsx`

confidence < 0.6일 때 표시되는 확인 모달:

```
┌──────────────────────────────────────┐
│  시작점 확인                          │
│                                       │
│  AI가 이 아이템을 "기술에서 시작"으로  │
│  분류했어요 (confidence: 52%)          │
│                                       │
│  이 분류가 맞나요?                    │
│                                       │
│  ○ 💡 아이디어에서 시작               │
│  ○ 📊 시장 또는 타겟에서 시작         │
│  ○ 🔍 고객 문제에서 시작              │
│  ● 🔧 기술에서 시작 (AI 추천)         │
│  ○ 🏢 기존 서비스에서 시작            │
│                                       │
│  [확인]  [취소]                        │
└──────────────────────────────────────┘
```

---

## 6. Test Design

### 6.1 서비스 테스트 — `starting-point-classifier.test.ts`

| # | 테스트 케이스 | 검증 항목 |
|---|-------------|----------|
| 1 | classify — 정상 분류 (idea) | startingPoint=idea, confidence, reasoning 반환 |
| 2 | classify — 정상 분류 (tech) | startingPoint=tech 반환 |
| 3 | classify — 정상 분류 (market) | startingPoint=market 반환 |
| 4 | classify — 정상 분류 (problem) | startingPoint=problem 반환 |
| 5 | classify — 정상 분류 (service) | startingPoint=service 반환 |
| 6 | classify — confidence < 0.6 → needsConfirmation=true | needsConfirmation 플래그 |
| 7 | classify — confidence >= 0.6 → needsConfirmation=false | needsConfirmation=false |
| 8 | classify — LLM 실패 → StartingPointError | 에러 code=LLM_EXECUTION_FAILED |
| 9 | classify — JSON 파싱 실패 → StartingPointError | 에러 code=LLM_PARSE_ERROR |
| 10 | classify — 잘못된 startingPoint 값 → StartingPointError | 유효성 검증 |
| 11 | classify — confidence 범위 초과 → StartingPointError | 유효성 검증 |
| 12 | classify — markdown 코드블록 래핑 JSON 파싱 | 코드블록 제거 후 파싱 |

### 6.2 분석 경로 테스트 — `analysis-paths.test.ts`

| # | 테스트 케이스 | 검증 항목 |
|---|-------------|----------|
| 1 | getAnalysisPath(idea) — 8단계 | steps.length === 8, 각 step에 pmSkills 존재 |
| 2 | getAnalysisPath(market) — 7단계 | BDP-002 §4-2 매칭 |
| 3 | getAnalysisPath(problem) — 9단계 | BDP-002 §4-3 매칭 |
| 4 | getAnalysisPath(tech) — 8단계 | BDP-002 §4-4 매칭 |
| 5 | getAnalysisPath(service) — 4단계 | BDP-002 §4-5 매칭 |
| 6 | 모든 경로 — discoveryMapping 값이 1~9 범위 | 유효성 |
| 7 | 모든 경로 — order가 1부터 순차 증가 | 순서 정합성 |

### 6.3 라우트 테스트 — `biz-items-starting-point.test.ts`

| # | 테스트 케이스 | 검증 항목 |
|---|-------------|----------|
| 1 | POST /starting-point — 정상 분류 | 200 + startingPoint + analysisPath |
| 2 | POST /starting-point — 아이템 미존재 | 404 BIZ_ITEM_NOT_FOUND |
| 3 | POST /starting-point — LLM 실패 | 500/502 에러 |
| 4 | POST /starting-point — 재분류 (UPSERT) | 기존 결과 덮어쓰기 |
| 5 | PATCH /starting-point — 확인만 (startingPoint 없음) | confirmedBy 채워짐 |
| 6 | PATCH /starting-point — 시작점 수정 + 확인 | startingPoint 변경 + confirmed |
| 7 | PATCH /starting-point — 분류 전 PATCH → 404 | STARTING_POINT_NOT_CLASSIFIED |
| 8 | GET /analysis-path — 정상 | startingPoint + analysisPath 반환 |
| 9 | GET /analysis-path — 분류 전 → 404 | STARTING_POINT_NOT_CLASSIFIED |

### 6.4 Web 컴포넌트 테스트

| # | 파일 | 테스트 케이스 |
|---|------|-------------|
| 1 | StartingPointBadge.test.tsx | 5종 시작점별 올바른 색상/아이콘 렌더링 |
| 2 | StartingPointBadge.test.tsx | needsConfirmation=true → 경고 배지 표시 |
| 3 | AnalysisPathStepper.test.tsx | steps 렌더링 + pmSkills 링크 |
| 4 | StartingPointConfirm.test.tsx | 라디오 선택 + 확인 콜백 |

---

## 7. Implementation Order

| 순서 | 파일 | 설명 | 예상 테스트 |
|------|------|------|------------|
| 1 | `packages/api/src/services/analysis-paths.ts` | 5시작점 정의 + 분석 경로 정적 데이터 | 7개 |
| 2 | `packages/api/src/db/migrations/0035_biz_starting_points.sql` | D1 테이블 생성 | — |
| 3 | `packages/api/src/services/starting-point-prompts.ts` | LLM 프롬프트 | — |
| 4 | `packages/api/src/services/starting-point-classifier.ts` | 분류 서비스 | 12개 |
| 5 | `packages/api/src/schemas/starting-point.ts` | Zod 스키마 | — |
| 6 | `packages/api/src/services/biz-item-service.ts` *(확장)* | save/get/confirm 메서드 | — |
| 7 | `packages/api/src/routes/biz-items.ts` *(확장)* | 3개 엔드포인트 | 9개 |
| 8 | `packages/web/src/components/feature/StartingPointBadge.tsx` | 배지 컴포넌트 | 2개 |
| 9 | `packages/web/src/components/feature/AnalysisPathStepper.tsx` | 경로 스텝퍼 | 1개 |
| 10 | `packages/web/src/components/feature/StartingPointConfirm.tsx` | 확인 모달 | 1개 |
| **합계** | **신규 6 + 확장 2 + 마이그레이션 1** | | **~32개** |

---

## 8. Acceptance Criteria

| # | 기준 | 검증 방법 |
|---|------|----------|
| 1 | POST /starting-point → 5종 시작점 분류 성공 | 테스트 5종 |
| 2 | confidence < 0.6 → needsConfirmation=true | 테스트 |
| 3 | PATCH /starting-point → 확인/수정 후 confirmed_by 설정 | 테스트 |
| 4 | GET /analysis-path → 시작점별 BDP-002 §4 경로 반환 | 테스트 + 수동 검증 |
| 5 | 재분류 시 UPSERT → 이전 결과 덮어쓰기 | 테스트 |
| 6 | 대시보드 배지 + 스텝퍼 렌더링 | Web 테스트 |
| 7 | 전체 테스트 ~32개 통과 | vitest run |
| 8 | typecheck + lint 에러 0건 | turbo typecheck && turbo lint |
