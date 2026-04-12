---
code: FX-DSGN-056
title: Sprint 56 — Six Hats 토론 시뮬레이션 + Discovery 진행률 대시보드 (F188, F189)
version: 0.1
status: Draft
category: DSGN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo
source: "[[FX-PLAN-056]]"
---

# Sprint 56 Design Document

> **Ref**: [[FX-PLAN-056]] Sprint 56 Plan
> **Scope**: F188 Six Hats 토론 시뮬레이션 + F189 Discovery 진행률 대시보드

---

## 1. System Architecture

### 1.1 전체 흐름

```
                   ┌──────────────────────────────────────────────┐
                   │              biz-items Route                 │
                   │  POST /:id/prd/:prdId/sixhats       (F188)  │
                   │  GET  /:id/prd/:prdId/sixhats       (F188)  │
                   │  GET  /:id/prd/:prdId/sixhats/:did  (F188)  │
                   └──────┬───────────────────────────────────────┘
                          │
              ┌───────────▼──────────────────┐
              │   SixHatsDebateService       │
              │   ─ 20턴 순환 토론 오케스트레이터 │
              └──────┬───────────────────────┘
                     │
        ┌────────────┼──────────────────────────┐
        │ buildTurnPrompt()                     │
        │ (SixHatsPrompts)                      │
        │  ├── 시스템 프롬프트: 모자별 역할     │
        │  ├── PRD 요약 (≤3000자)              │
        │  └── 이전 3턴 컨텍스트               │
        └────────────┬──────────────────────────┘
                     │ for turn 1..20 (sequential)
              ┌──────▼────────────┐
              │  AgentRunner      │
              │  (OpenRouter/     │
              │   Claude/Mock)    │
              └──────┬────────────┘
                     │ turn result
              ┌──────▼────────────┐
              │    D1 Database    │
              │  sixhats_debates  │
              │  sixhats_turns    │
              └───────────────────┘


                   ┌──────────────────────────────────────────────┐
                   │              discovery Route (신규)           │
                   │  GET  /discovery/progress            (F189)  │
                   │  GET  /discovery/progress/summary    (F189)  │
                   └──────┬───────────────────────────────────────┘
                          │
              ┌───────────▼──────────────────────┐
              │  DiscoveryProgressService        │
              │  ─ 전체 BizItem 9기준 집계       │
              └──────┬───────────────────────────┘
                     │ JOIN biz_items + biz_discovery_criteria
              ┌──────▼────────────┐
              │    D1 Database    │
              │  (기존 테이블만)    │
              └───────────────────┘
```

### 1.2 기존 인프라 재사용 맵

| 기존 모듈 | Sprint | 재사용 방식 |
|-----------|--------|------------|
| `AgentRunner` interface + `createAgentRunner()` | 10/34 | F188 — 20턴 LLM 호출에 사용 (OpenRouter > Claude > Mock) |
| `AgentExecutionRequest` | 10 | F188 — `systemPromptOverride` 필드로 모자별 프롬프트 주입 |
| `DiscoveryCriteriaService` | 53 | F189 — `getAll()` 로직을 포트폴리오 집계에 재활용 |
| `DISCOVERY_CRITERIA` 상수 | 53 | F189 — 9기준 메타데이터 (name, condition, pmSkills) |
| `computeGateStatus()` | 53 | F189 — BizItem별 gate 판정 로직 그대로 재사용 |
| `BizItemService` | 51 | 아이템 목록 조회 (orgId 필터) |
| `PrdGeneratorService` | 53 | F188 — PRD content 조회 (getLatest) |
| `createMockD1()` | 7 | 테스트 DB 모킹 |

---

## 2. F188: Six Hats 토론 시뮬레이션 — 상세 설계

### 2.1 SixHatsPrompts

**파일**: `packages/api/src/services/sixhats-prompts.ts`

```typescript
export type HatColor = "white" | "red" | "black" | "yellow" | "green" | "blue";

export interface HatConfig {
  color: HatColor;
  emoji: string;
  label: string;
  role: string;
  systemPrompt: string;
}

export const HAT_CONFIGS: Record<HatColor, HatConfig> = {
  white: {
    color: "white",
    emoji: "⚪",
    label: "White Hat (사실·데이터)",
    role: "사실과 데이터만을 기반으로 PRD를 분석합니다",
    systemPrompt: `당신은 Edward de Bono의 Six Hats 토론에서 ⚪ White Hat 역할입니다.
오직 사실, 수치, 데이터, 근거에 기반하여 PRD를 분석하세요.
감정이나 판단 없이, "무엇이 사실인가?"에만 집중하세요.
- 정량적 수치의 존재 여부와 신뢰성을 검토
- 근거 없는 주장을 식별
- 빠진 데이터나 검증이 필요한 항목을 지적`,
  },
  red: {
    color: "red",
    emoji: "🔴",
    label: "Red Hat (감정·직관)",
    role: "감정적 반응과 직관으로 PRD를 평가합니다",
    systemPrompt: `당신은 Edward de Bono의 Six Hats 토론에서 🔴 Red Hat 역할입니다.
논리적 근거 없이, 순수한 감정과 직관으로 PRD를 평가하세요.
- 이 PRD를 읽었을 때 드는 첫인상과 느낌
- 팀원들이 어떻게 반응할지 직감적 예측
- "느낌이 좋은/나쁜" 부분을 솔직하게 표현`,
  },
  black: {
    color: "black",
    emoji: "⚫",
    label: "Black Hat (비판·리스크)",
    role: "비판적 관점에서 약점과 리스크를 찾습니다",
    systemPrompt: `당신은 Edward de Bono의 Six Hats 토론에서 ⚫ Black Hat 역할입니다.
비판적·부정적 관점에서 PRD의 약점, 리스크, 실패 가능성을 집중 분석하세요.
- 왜 이 프로젝트가 실패할 수 있는지
- 누락된 리스크, 과소평가된 위험 요소
- 시장/기술/조직적 장벽과 제약사항`,
  },
  yellow: {
    color: "yellow",
    emoji: "🟡",
    label: "Yellow Hat (기회·가치)",
    role: "긍정적 가치와 기회를 탐색합니다",
    systemPrompt: `당신은 Edward de Bono의 Six Hats 토론에서 🟡 Yellow Hat 역할입니다.
긍정적·낙관적 관점에서 PRD의 가치, 기회, 잠재력을 분석하세요.
- 이 프로젝트가 성공하면 어떤 가치를 만드는지
- 숨겨진 기회와 시너지 효과
- 최선의 시나리오와 그 달성 조건`,
  },
  green: {
    color: "green",
    emoji: "🟢",
    label: "Green Hat (창의·대안)",
    role: "창의적 대안과 새로운 아이디어를 제시합니다",
    systemPrompt: `당신은 Edward de Bono의 Six Hats 토론에서 🟢 Green Hat 역할입니다.
창의적·혁신적 관점에서 기존 PRD를 넘어서는 새로운 아이디어와 대안을 제시하세요.
- PRD에 없는 새로운 접근법이나 기능
- 기존 가정을 뒤집는 역발상
- 다른 산업/분야에서의 유사 성공 패턴 적용`,
  },
  blue: {
    color: "blue",
    emoji: "🔵",
    label: "Blue Hat (종합·프로세스)",
    role: "토론을 종합하고 프로세스를 관리합니다",
    systemPrompt: `당신은 Edward de Bono의 Six Hats 토론에서 🔵 Blue Hat 역할입니다.
지금까지의 토론을 종합하고, 핵심 쟁점을 정리하세요.
- 각 모자 관점에서 나온 핵심 논점 요약
- 합의된 부분과 여전히 논쟁 중인 부분 분류
- 다음 논의가 필요한 액션 아이템 정리
- 최종 권고사항 (Go/Conditional/Reconsider)`,
  },
};

// 20턴 순환 패턴: 6모자 × 3라운드 + Green(19) + Blue(20)
export const TURN_SEQUENCE: HatColor[] = [
  "white", "red", "black", "yellow", "green", "blue",   // Round 1: 기본 분석
  "white", "red", "black", "yellow", "green", "blue",   // Round 2: 심화 토론
  "white", "red", "black", "yellow", "green", "blue",   // Round 3: 합의 수렴
  "green", "blue",                                       // 마무리: 최종 대안 + 종합
];

export const MAX_PRD_SUMMARY_LENGTH = 3000;
export const CONTEXT_WINDOW_TURNS = 3;  // 이전 3턴만 컨텍스트 주입

export function summarizePrd(prdContent: string): string {
  if (prdContent.length <= MAX_PRD_SUMMARY_LENGTH) return prdContent;
  const half = Math.floor(MAX_PRD_SUMMARY_LENGTH / 2);
  return prdContent.slice(0, half) + "\n\n[...중략...]\n\n" + prdContent.slice(-half);
}

export interface TurnContext {
  turnNumber: number;
  hat: HatConfig;
  prdSummary: string;
  previousTurns: Array<{ hat: string; content: string }>;
  roundInfo: string;  // e.g., "라운드 2/3, 심화 토론"
}

export function buildTurnPrompt(ctx: TurnContext): { system: string; user: string } {
  const roundLabel = ctx.turnNumber <= 6 ? "기본 분석"
    : ctx.turnNumber <= 12 ? "심화 토론 — 이전 관점을 반박하거나 보강하세요"
    : ctx.turnNumber <= 18 ? "합의 수렴 — 핵심 쟁점으로 좁히세요"
    : ctx.turnNumber === 19 ? "최종 대안 — 모든 논의를 고려한 마지막 창의적 제안"
    : "최종 종합 — 전체 토론의 핵심 쟁점과 권고사항 정리";

  const prevContext = ctx.previousTurns.length > 0
    ? `\n\n[이전 토론]\n${ctx.previousTurns.map((t) => `${t.hat}: ${t.content}`).join("\n\n")}`
    : "";

  return {
    system: ctx.hat.systemPrompt,
    user: `[Turn ${ctx.turnNumber}/20 — ${roundLabel}]

[PRD 내용]
${ctx.prdSummary}
${prevContext}

${ctx.hat.emoji} ${ctx.hat.label} 관점에서 분석하세요. 300~500자로 작성하세요.`,
  };
}
```

### 2.2 SixHatsDebateService

**파일**: `packages/api/src/services/sixhats-debate.ts`

```typescript
import { createAgentRunner, type AgentRunner } from "./agent-runner.js";
import {
  TURN_SEQUENCE, HAT_CONFIGS, CONTEXT_WINDOW_TURNS,
  summarizePrd, buildTurnPrompt,
  type HatColor,
} from "./sixhats-prompts.js";

export class SixHatsDebateError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "SixHatsDebateError";
  }
}

export interface DebateResult {
  id: string;
  prdId: string;
  bizItemId: string;
  status: "completed" | "failed";
  totalTurns: number;
  completedTurns: number;
  turns: TurnResult[];
  keyIssues: string[];
  summary: string;
  model: string;
  totalTokens: number;
  durationSeconds: number;
}

export interface TurnResult {
  turnNumber: number;
  hat: HatColor;
  hatLabel: string;
  content: string;
  tokens: number;
  durationSeconds: number;
}

export class SixHatsDebateService {
  private runner: AgentRunner;

  constructor(private db: D1Database, env: {
    OPENROUTER_API_KEY?: string;
    OPENROUTER_DEFAULT_MODEL?: string;
    ANTHROPIC_API_KEY?: string;
  }) {
    this.runner = createAgentRunner(env);
  }

  async startDebate(
    prdId: string,
    bizItemId: string,
    prdContent: string,
    orgId: string,
  ): Promise<DebateResult> {
    const debateId = generateId();
    const prdSummary = summarizePrd(prdContent);
    const model = this.runner.type;

    // Insert debate record (status = 'running')
    await this.db.prepare(`
      INSERT INTO sixhats_debates (id, prd_id, biz_item_id, status, total_turns, completed_turns, model, org_id)
      VALUES (?, ?, ?, 'running', 20, 0, ?, ?)
    `).bind(debateId, prdId, bizItemId, model, orgId).run();

    const turns: TurnResult[] = [];
    const startTime = Date.now();
    let totalTokens = 0;

    try {
      for (let i = 0; i < TURN_SEQUENCE.length; i++) {
        const turnNumber = i + 1;
        const hatColor = TURN_SEQUENCE[i]!;
        const hat = HAT_CONFIGS[hatColor];

        // 이전 N턴 컨텍스트
        const recentTurns = turns.slice(-CONTEXT_WINDOW_TURNS).map((t) => ({
          hat: HAT_CONFIGS[t.hat].label,
          content: t.content,
        }));

        const { system, user } = buildTurnPrompt({
          turnNumber,
          hat,
          prdSummary,
          previousTurns: recentTurns,
          roundInfo: "",
        });

        const turnStart = Date.now();
        const result = await this.runner.execute({
          taskId: `sixhats-${debateId}-turn-${turnNumber}`,
          agentId: "sixhats-debate",
          taskType: "spec-analysis",
          context: {
            repoUrl: "",
            branch: "",
            instructions: user,
            systemPromptOverride: system,
          },
          constraints: [],
        });

        const content = result.output?.analysis ?? result.output?.code ?? "";
        const turnTokens = result.tokensUsed ?? 0;
        const turnDuration = (Date.now() - turnStart) / 1000;

        const turnResult: TurnResult = {
          turnNumber,
          hat: hatColor,
          hatLabel: `${hat.emoji} ${hat.label}`,
          content,
          tokens: turnTokens,
          durationSeconds: turnDuration,
        };
        turns.push(turnResult);
        totalTokens += turnTokens;

        // Save turn to D1
        await this.db.prepare(`
          INSERT INTO sixhats_turns (id, debate_id, turn_number, hat, hat_label, content, tokens, duration_seconds)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          generateId(), debateId, turnNumber, hatColor,
          turnResult.hatLabel, content, turnTokens, turnDuration,
        ).run();

        // Update progress
        await this.db.prepare(
          `UPDATE sixhats_debates SET completed_turns = ? WHERE id = ?`
        ).bind(turnNumber, debateId).run();
      }

      // Extract key issues from last Blue Hat turn
      const lastBlue = turns.filter((t) => t.hat === "blue").pop();
      const keyIssues = this.extractKeyIssues(lastBlue?.content ?? "");
      const summary = lastBlue?.content ?? "";
      const duration = (Date.now() - startTime) / 1000;

      // Update debate as completed
      await this.db.prepare(`
        UPDATE sixhats_debates
        SET status = 'completed', completed_turns = 20, key_issues = ?,
            summary = ?, total_tokens = ?, duration_seconds = ?,
            completed_at = datetime('now')
        WHERE id = ?
      `).bind(JSON.stringify(keyIssues), summary, totalTokens, duration, debateId).run();

      return {
        id: debateId,
        prdId, bizItemId,
        status: "completed",
        totalTurns: 20,
        completedTurns: turns.length,
        turns, keyIssues, summary,
        model, totalTokens, durationSeconds: duration,
      };
    } catch (err) {
      const duration = (Date.now() - startTime) / 1000;
      await this.db.prepare(`
        UPDATE sixhats_debates SET status = 'failed', duration_seconds = ?, completed_at = datetime('now')
        WHERE id = ?
      `).bind(duration, debateId).run();

      throw new SixHatsDebateError(
        `Debate failed at turn ${turns.length + 1}: ${err instanceof Error ? err.message : String(err)}`,
        "DEBATE_FAILED",
      );
    }
  }

  async getDebate(debateId: string): Promise<DebateResult | null> {
    const debate = await this.db.prepare(
      "SELECT * FROM sixhats_debates WHERE id = ?"
    ).bind(debateId).first<SixHatsDebateRow>();
    if (!debate) return null;

    const { results: turnRows } = await this.db.prepare(
      "SELECT * FROM sixhats_turns WHERE debate_id = ? ORDER BY turn_number"
    ).bind(debateId).all<SixHatsTurnRow>();

    return toDebateResult(debate, turnRows);
  }

  async listDebates(prdId: string): Promise<DebateResult[]> {
    const { results: debates } = await this.db.prepare(
      "SELECT * FROM sixhats_debates WHERE prd_id = ? ORDER BY created_at DESC"
    ).bind(prdId).all<SixHatsDebateRow>();

    const results: DebateResult[] = [];
    for (const debate of debates) {
      const { results: turnRows } = await this.db.prepare(
        "SELECT * FROM sixhats_turns WHERE debate_id = ? ORDER BY turn_number"
      ).bind(debate.id).all<SixHatsTurnRow>();
      results.push(toDebateResult(debate, turnRows));
    }
    return results;
  }

  private extractKeyIssues(blueHatContent: string): string[] {
    // Parse numbered/bulleted items from Blue Hat's summary
    const lines = blueHatContent.split("\n");
    const issues: string[] = [];
    for (const line of lines) {
      const trimmed = line.replace(/^[\s\-\*\d.]+/, "").trim();
      if (trimmed.length > 10 && trimmed.length < 500) {
        issues.push(trimmed);
      }
    }
    return issues.slice(0, 10);  // max 10 key issues
  }
}

// ─── D1 Row Types ───

interface SixHatsDebateRow {
  id: string;
  prd_id: string;
  biz_item_id: string;
  status: string;
  total_turns: number;
  completed_turns: number;
  key_issues: string | null;
  summary: string | null;
  model: string;
  total_tokens: number;
  duration_seconds: number;
  created_at: string;
  completed_at: string | null;
  org_id: string;
}

interface SixHatsTurnRow {
  id: string;
  debate_id: string;
  turn_number: number;
  hat: string;
  hat_label: string;
  content: string;
  tokens: number;
  duration_seconds: number;
  created_at: string;
}

function toDebateResult(row: SixHatsDebateRow, turns: SixHatsTurnRow[]): DebateResult {
  return {
    id: row.id,
    prdId: row.prd_id,
    bizItemId: row.biz_item_id,
    status: row.status as "completed" | "failed",
    totalTurns: row.total_turns,
    completedTurns: row.completed_turns,
    turns: turns.map((t) => ({
      turnNumber: t.turn_number,
      hat: t.hat as HatColor,
      hatLabel: t.hat_label,
      content: t.content,
      tokens: t.tokens,
      durationSeconds: t.duration_seconds,
    })),
    keyIssues: row.key_issues ? JSON.parse(row.key_issues) : [],
    summary: row.summary ?? "",
    model: row.model,
    totalTokens: row.total_tokens,
    durationSeconds: row.duration_seconds,
  };
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

### 2.3 D1 마이그레이션

**파일**: `packages/api/src/db/migrations/0040_sixhats_debates.sql`

```sql
-- 0040_sixhats_debates.sql
-- Sprint 56: Six Hats 토론 시뮬레이션 (F188)

CREATE TABLE IF NOT EXISTS sixhats_debates (
  id TEXT PRIMARY KEY,
  prd_id TEXT NOT NULL REFERENCES prd_documents(id),
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  total_turns INTEGER NOT NULL DEFAULT 20,
  completed_turns INTEGER NOT NULL DEFAULT 0,
  key_issues TEXT,
  summary TEXT,
  model TEXT NOT NULL,
  total_tokens INTEGER DEFAULT 0,
  duration_seconds REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  org_id TEXT NOT NULL
);

CREATE INDEX idx_sixhats_debates_prd ON sixhats_debates(prd_id);
CREATE INDEX idx_sixhats_debates_org ON sixhats_debates(org_id);

CREATE TABLE IF NOT EXISTS sixhats_turns (
  id TEXT PRIMARY KEY,
  debate_id TEXT NOT NULL REFERENCES sixhats_debates(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL CHECK (turn_number BETWEEN 1 AND 20),
  hat TEXT NOT NULL CHECK (hat IN ('white', 'red', 'black', 'yellow', 'green', 'blue')),
  hat_label TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,
  duration_seconds REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(debate_id, turn_number)
);

CREATE INDEX idx_sixhats_turns_debate ON sixhats_turns(debate_id);
```

### 2.4 Zod 스키마

**파일**: `packages/api/src/schemas/sixhats.ts`

```typescript
import { z } from "zod";

export const HatColorSchema = z.enum(["white", "red", "black", "yellow", "green", "blue"]);

export const StartSixHatsSchema = z.object({
  // 별도 body 파라미터 없음 — prdId는 URL path에서
}).optional();

export const SixHatsTurnSchema = z.object({
  turnNumber: z.number().int().min(1).max(20),
  hat: HatColorSchema,
  hatLabel: z.string(),
  content: z.string(),
  tokens: z.number().int().min(0),
  durationSeconds: z.number().min(0),
});

export const SixHatsDebateSchema = z.object({
  id: z.string(),
  prdId: z.string(),
  bizItemId: z.string(),
  status: z.enum(["running", "completed", "failed"]),
  totalTurns: z.number().int(),
  completedTurns: z.number().int(),
  turns: z.array(SixHatsTurnSchema),
  keyIssues: z.array(z.string()),
  summary: z.string(),
  model: z.string(),
  totalTokens: z.number().int(),
  durationSeconds: z.number(),
});
```

### 2.5 API 라우트 확장

**파일**: `packages/api/src/routes/biz-items.ts` (추가 부분만)

```typescript
// Sprint 56 imports (F188)
import { SixHatsDebateService, SixHatsDebateError } from "../services/sixhats-debate.js";

// ─── POST /biz-items/:id/prd/:prdId/sixhats — Six Hats 토론 시작 (F188) ───

bizItemsRoute.post("/biz-items/:id/prd/:prdId/sixhats", async (c) => {
  const { id, prdId } = c.req.param();
  const orgId = c.get("orgId");

  // PRD 조회
  const prd = await c.env.DB.prepare(
    "SELECT content FROM prd_documents WHERE id = ? AND biz_item_id = ? AND org_id = ?"
  ).bind(prdId, id, orgId).first<{ content: string }>();
  if (!prd) return c.json({ error: "PRD not found" }, 404);

  const service = new SixHatsDebateService(c.env.DB, c.env);
  try {
    const result = await service.startDebate(prdId, id, prd.content, orgId);
    return c.json(result, 201);
  } catch (err) {
    if (err instanceof SixHatsDebateError) {
      return c.json({ error: err.message, code: err.code }, 500);
    }
    throw err;
  }
});

// ─── GET /biz-items/:id/prd/:prdId/sixhats — 토론 목록 조회 (F188) ───

bizItemsRoute.get("/biz-items/:id/prd/:prdId/sixhats", async (c) => {
  const { prdId } = c.req.param();
  const service = new SixHatsDebateService(c.env.DB, c.env);
  const debates = await service.listDebates(prdId);
  return c.json({ debates });
});

// ─── GET /biz-items/:id/prd/:prdId/sixhats/:debateId — 특정 토론 상세 (F188) ───

bizItemsRoute.get("/biz-items/:id/prd/:prdId/sixhats/:debateId", async (c) => {
  const { debateId } = c.req.param();
  const service = new SixHatsDebateService(c.env.DB, c.env);
  const debate = await service.getDebate(debateId);
  if (!debate) return c.json({ error: "Debate not found" }, 404);
  return c.json(debate);
});
```

---

## 3. F189: Discovery 진행률 대시보드 — 상세 설계

### 3.1 DiscoveryProgressService

**파일**: `packages/api/src/services/discovery-progress.ts`

```typescript
import { DISCOVERY_CRITERIA, type CriterionStatus } from "./discovery-criteria.js";

export interface DiscoveryPortfolioProgress {
  totalItems: number;
  byGateStatus: { blocked: number; warning: number; ready: number };
  byCriterion: CriterionStat[];
  items: ItemProgress[];
  bottleneck: { criterionId: number; name: string; completionRate: number } | null;
}

export interface CriterionStat {
  criterionId: number;
  name: string;
  completed: number;
  inProgress: number;
  needsRevision: number;
  pending: number;
  completionRate: number;
}

export interface ItemProgress {
  bizItemId: string;
  title: string;
  completedCount: number;
  gateStatus: "blocked" | "warning" | "ready";
  criteria: Array<{ criterionId: number; status: CriterionStatus }>;
}

export interface DiscoverySummary {
  totalItems: number;
  readyCount: number;
  warningCount: number;
  blockedCount: number;
  overallCompletionRate: number;  // 0~100%
  bottleneckCriterion: string | null;
}

interface ProgressRow {
  biz_item_id: string;
  title: string;
  criterion_id: number;
  status: string;
}

export class DiscoveryProgressService {
  constructor(private db: D1Database) {}

  async getProgress(orgId: string): Promise<DiscoveryPortfolioProgress> {
    // JOIN biz_items + biz_discovery_criteria
    const { results } = await this.db.prepare(`
      SELECT bi.id as biz_item_id, bi.title, dc.criterion_id, dc.status
      FROM biz_items bi
      LEFT JOIN biz_discovery_criteria dc ON bi.id = dc.biz_item_id
      WHERE bi.org_id = ?
      ORDER BY bi.created_at DESC, dc.criterion_id
    `).bind(orgId).all<ProgressRow>();

    // Group by bizItem
    const itemMap = new Map<string, { title: string; criteria: Map<number, CriterionStatus> }>();
    for (const row of results) {
      if (!itemMap.has(row.biz_item_id)) {
        itemMap.set(row.biz_item_id, { title: row.title, criteria: new Map() });
      }
      if (row.criterion_id != null) {
        itemMap.get(row.biz_item_id)!.criteria.set(
          row.criterion_id, (row.status ?? "pending") as CriterionStatus
        );
      }
    }

    // Build items array
    const items: ItemProgress[] = [];
    const gateCount = { blocked: 0, warning: 0, ready: 0 };

    for (const [bizItemId, data] of itemMap) {
      const criteria: Array<{ criterionId: number; status: CriterionStatus }> = [];
      for (let i = 1; i <= 9; i++) {
        criteria.push({ criterionId: i, status: data.criteria.get(i) ?? "pending" });
      }
      const completedCount = criteria.filter((c) => c.status === "completed").length;
      const gateStatus = completedCount >= 9 ? "ready"
        : completedCount >= 7 ? "warning" : "blocked";
      gateCount[gateStatus]++;
      items.push({ bizItemId, title: data.title, completedCount, gateStatus, criteria });
    }

    // Aggregate by criterion
    const byCriterion: CriterionStat[] = DISCOVERY_CRITERIA.map((meta) => {
      let completed = 0, inProgress = 0, needsRevision = 0, pending = 0;
      for (const item of items) {
        const c = item.criteria.find((cr) => cr.criterionId === meta.id);
        const s = c?.status ?? "pending";
        if (s === "completed") completed++;
        else if (s === "in_progress") inProgress++;
        else if (s === "needs_revision") needsRevision++;
        else pending++;
      }
      const total = items.length || 1;
      return {
        criterionId: meta.id, name: meta.name,
        completed, inProgress, needsRevision, pending,
        completionRate: Math.round(completed / total * 100),
      };
    });

    // Find bottleneck (lowest completion rate)
    const sorted = [...byCriterion].sort((a, b) => a.completionRate - b.completionRate);
    const bottleneck = sorted.length > 0 && sorted[0]!.completionRate < 100
      ? { criterionId: sorted[0]!.criterionId, name: sorted[0]!.name, completionRate: sorted[0]!.completionRate }
      : null;

    return {
      totalItems: items.length,
      byGateStatus: gateCount,
      byCriterion,
      items,
      bottleneck,
    };
  }

  async getSummary(orgId: string): Promise<DiscoverySummary> {
    const progress = await this.getProgress(orgId);
    const totalCriteria = progress.totalItems * 9;
    const completedCriteria = progress.byCriterion.reduce((s, c) => s + c.completed, 0);

    return {
      totalItems: progress.totalItems,
      readyCount: progress.byGateStatus.ready,
      warningCount: progress.byGateStatus.warning,
      blockedCount: progress.byGateStatus.blocked,
      overallCompletionRate: totalCriteria > 0
        ? Math.round(completedCriteria / totalCriteria * 100) : 0,
      bottleneckCriterion: progress.bottleneck?.name ?? null,
    };
  }
}
```

### 3.2 Zod 스키마

**파일**: `packages/api/src/schemas/discovery-progress.ts`

```typescript
import { z } from "zod";

export const CriterionStatSchema = z.object({
  criterionId: z.number().int().min(1).max(9),
  name: z.string(),
  completed: z.number().int().min(0),
  inProgress: z.number().int().min(0),
  needsRevision: z.number().int().min(0),
  pending: z.number().int().min(0),
  completionRate: z.number().min(0).max(100),
});

export const ItemProgressSchema = z.object({
  bizItemId: z.string(),
  title: z.string(),
  completedCount: z.number().int().min(0).max(9),
  gateStatus: z.enum(["blocked", "warning", "ready"]),
  criteria: z.array(z.object({
    criterionId: z.number().int(),
    status: z.enum(["pending", "in_progress", "completed", "needs_revision"]),
  })),
});

export const DiscoveryProgressSchema = z.object({
  totalItems: z.number().int(),
  byGateStatus: z.object({
    blocked: z.number().int(),
    warning: z.number().int(),
    ready: z.number().int(),
  }),
  byCriterion: z.array(CriterionStatSchema),
  items: z.array(ItemProgressSchema),
  bottleneck: z.object({
    criterionId: z.number().int(),
    name: z.string(),
    completionRate: z.number(),
  }).nullable(),
});

export const DiscoverySummarySchema = z.object({
  totalItems: z.number().int(),
  readyCount: z.number().int(),
  warningCount: z.number().int(),
  blockedCount: z.number().int(),
  overallCompletionRate: z.number().min(0).max(100),
  bottleneckCriterion: z.string().nullable(),
});
```

### 3.3 Discovery 라우트 (신규)

**파일**: `packages/api/src/routes/discovery.ts`

```typescript
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { DiscoveryProgressService } from "../services/discovery-progress.js";

export const discoveryRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── GET /discovery/progress — 전체 Discovery 진행률 (F189) ───

discoveryRoute.get("/discovery/progress", async (c) => {
  const orgId = c.get("orgId");
  const service = new DiscoveryProgressService(c.env.DB);
  const progress = await service.getProgress(orgId);
  return c.json(progress);
});

// ─── GET /discovery/progress/summary — 요약 통계 (F189) ───

discoveryRoute.get("/discovery/progress/summary", async (c) => {
  const orgId = c.get("orgId");
  const service = new DiscoveryProgressService(c.env.DB);
  const summary = await service.getSummary(orgId);
  return c.json(summary);
});
```

**app.ts 등록** (추가):
```typescript
import { discoveryRoute } from "./routes/discovery.js";
// ... 기존 route(...) 호출 뒤에
api.route("/", discoveryRoute);
```

---

## 4. Web 컴포넌트 설계

### 4.1 SixHatsDebateView

**파일**: `packages/web/src/components/feature/SixHatsDebateView.tsx`

```typescript
// Props
interface SixHatsDebateViewProps {
  bizItemId: string;
  prdId: string;
  debate: SixHatsDebate | null;
  onStartDebate: () => void;
  isLoading: boolean;
}

// 렌더링:
// - debate === null → "Six Hats 토론 시작" 버튼
// - debate.status === "running" → 진행률 바 + 완료된 턴 카드
// - debate.status === "completed" → 전체 턴 타임라인
//
// 턴 카드:
// ┌─────────────────────────────┐
// │ ⚪ White Hat (사실·데이터)   │  ← 모자 색상 배지
// │ Turn 1/20                   │
// │ ─────────────────────────── │
// │ 핵심 정량 기준, 기능 범위,    │  ← content
// │ 사용 조건은 비교적 명확히... │
// │ ─────────────────────────── │
// │ 🕐 6.4s · 📊 2,847 tokens   │  ← 메타
// └─────────────────────────────┘
```

### 4.2 SixHatsIssueSummary

**파일**: `packages/web/src/components/feature/SixHatsIssueSummary.tsx`

```typescript
// Props
interface SixHatsIssueSummaryProps {
  keyIssues: string[];
  summary: string;
  totalTokens: number;
  durationSeconds: number;
}

// 렌더링:
// ┌─────────────────────────────┐
// │ 📋 핵심 쟁점 (5건)          │
// │ ─────────────────────────── │
// │ 1. 기초 데이터 부재 ...      │
// │ 2. 보안/컴플라이언스 ...     │
// │ 3. ...                      │
// │ ─────────────────────────── │
// │ 🔵 종합 의견                │
// │ {summary}                   │
// │ ─────────────────────────── │
// │ ⏱️ 395s · 📊 115K tokens   │
// └─────────────────────────────┘
```

### 4.3 DiscoveryProgressDashboard

**파일**: `packages/web/src/components/feature/DiscoveryProgressDashboard.tsx`

```typescript
// Props
interface DiscoveryProgressDashboardProps {
  progress: DiscoveryPortfolioProgress;
}

// 렌더링:
// ┌─────────────────────────────────────────────────────┐
// │ Discovery 진행률 대시보드                             │
// ├─────────────────────────────────────────────────────┤
// │ ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐            │
// │ │  12  │  │  3   │  │  5   │  │  4   │  ← 요약 카드 │
// │ │전체   │  │Ready │  │Warning│ │Blocked│            │
// │ └──────┘  └──────┘  └──────┘  └──────┘            │
// ├─────────────────────────────────────────────────────┤
// │        히트맵 (BizItem × 9기준)                     │
// │                                                     │
// │          C1  C2  C3  C4  C5  C6  C7  C8  C9        │
// │ Item A  🟢 🟢 🟡 🟢 ⬜ 🟢 🟢 🟡 ⬜         │
// │ Item B  🟢 🟢 🟢 🟢 🟢 🟢 🟢 🟢 🟢         │
// │ Item C  🔴 ⬜ ⬜ 🟡 ⬜ ⬜ ⬜ ⬜ ⬜         │
// │                                                     │
// │ 범례: 🟢 완료  🟡 진행중  🔴 보완필요  ⬜ 미시작  │
// ├─────────────────────────────────────────────────────┤
// │ ⚠️ 병목 기준: "검증 실험 계획" (달성률 25%)          │
// └─────────────────────────────────────────────────────┘
```

### 4.4 Discovery 대시보드 페이지

**파일**: `packages/web/src/app/(app)/discovery/page.tsx`

- Sidebar에 "Discovery" 메뉴 추가 (기존 sidebar.tsx 확장)
- `DiscoveryProgressDashboard` 렌더링
- API 호출: `GET /api/discovery/progress`

---

## 5. 테스트 전략

### 5.1 F188 테스트

| 파일 | 범위 | 테스트 수 |
|------|------|----------|
| `__tests__/sixhats-prompts.test.ts` | TURN_SEQUENCE 길이, buildTurnPrompt 출력, summarizePrd 절삭 | ~8 |
| `__tests__/sixhats-debate.test.ts` | startDebate (MockRunner), getDebate, listDebates, D1 저장 검증 | ~10 |
| `__tests__/biz-items-sixhats.test.ts` | POST/GET 라우트, 404/에러 케이스 | ~8 |

### 5.2 F189 테스트

| 파일 | 범위 | 테스트 수 |
|------|------|----------|
| `__tests__/discovery-progress.test.ts` | getProgress 집계, getSummary, 빈 데이터, 병목 감지 | ~8 |
| `__tests__/discovery-route.test.ts` | GET progress, GET summary, orgId 필터 | ~6 |

### 5.3 Web 테스트

| 파일 | 범위 | 테스트 수 |
|------|------|----------|
| `__tests__/sixhats-debate-view.test.tsx` | 렌더링, 버튼 클릭, 턴 카드 표시 | ~4 |
| `__tests__/discovery-progress-dashboard.test.tsx` | 히트맵, 요약 카드, 병목 표시 | ~4 |

**총 예상: ~48 tests**

---

## 6. Implementation Checklist

### Phase A: F188 Six Hats 토론

- [ ] A-1: `0040_sixhats_debates.sql` 마이그레이션
- [ ] A-2: `sixhats-prompts.ts` — HAT_CONFIGS, TURN_SEQUENCE, buildTurnPrompt
- [ ] A-3: `sixhats-debate.ts` — SixHatsDebateService (startDebate, getDebate, listDebates)
- [ ] A-4: `schemas/sixhats.ts` — Zod 스키마
- [ ] A-5: `routes/biz-items.ts` — POST/GET sixhats 3개 엔드포인트 추가
- [ ] A-6: `__tests__/sixhats-prompts.test.ts`
- [ ] A-7: `__tests__/sixhats-debate.test.ts`
- [ ] A-8: `__tests__/biz-items-sixhats.test.ts`

### Phase B: F189 Discovery 진행률

- [ ] B-1: `discovery-progress.ts` — DiscoveryProgressService
- [ ] B-2: `schemas/discovery-progress.ts` — Zod 스키마
- [ ] B-3: `routes/discovery.ts` — 신규 라우트 + app.ts 등록
- [ ] B-4: `__tests__/discovery-progress.test.ts`
- [ ] B-5: `__tests__/discovery-route.test.ts`

### Phase C: 대시보드 UI

- [ ] C-1: `SixHatsDebateView.tsx`
- [ ] C-2: `SixHatsIssueSummary.tsx`
- [ ] C-3: `DiscoveryProgressDashboard.tsx`
- [ ] C-4: `app/(app)/discovery/page.tsx` + sidebar 메뉴 추가
- [ ] C-5: Web 테스트 (debate-view, progress-dashboard)
