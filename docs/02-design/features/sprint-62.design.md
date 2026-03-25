---
code: FX-DSGN-062
title: "Sprint 62 Design — F199 BMCAgent 초안 자동 생성 + F200 BMC 버전 히스토리"
version: 1.0
status: Active
category: DSGN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 62
features: [F199, F200]
plan: "[[FX-PLAN-062]]"
prd: docs/specs/bizdevprocess-3/prd-ax-bd-v1.4.md
---

## 1. 아키텍처 개요

### 1.1 데이터 플로우

```
[F199 BMCAgent 초안 생성]

  사용자 (Web)
    │ POST /api/ax-bd/bmc/generate { idea, context? }
    ▼
  ax-bd 라우트 (Hono)
    │ 1. Zod 검증
    │ 2. Rate Limit 체크 (분당 5회)
    ▼
  BmcAgentService.generateDraft()
    │ 3. 시스템 프롬프트 조립
    │ 4. PromptGateway.sanitizePrompt() — KT DS 고유명사 마스킹
    │ 5. X-Gateway-Processed 플래그 설정
    ▼
  ModelRouter.route("bmc-generation")
    │ 6. claude-sonnet-4-6 호출 (15초 타임아웃)
    ▼
  LLM 응답 (JSON: 9개 블록)
    │ 7. JSON 파싱 + 블록별 200자 트리밍
    │ 8. PromptGateway 언마스킹 (마스킹 복원)
    ▼
  Response: { draft: { [block]: string }, processingTimeMs }
    │ 에디터에 적용되기 전까지 Git/D1에 아무것도 저장하지 않음
    ▼
  사용자: 미리보기 → "에디터에 적용" → BMC 에디터로 이동


[F200 BMC 버전 히스토리]

  사용자 (Web)
    │ GET /api/ax-bd/bmc/:id/history
    ▼
  ax-bd 라우트
    │ BmcHistoryService.getHistory(bmcId)
    ▼
  D1 ax_bmc_versions (캐시)
    │ commit_sha, author_id, message, snapshot(JSON), created_at
    │ Git이 SSOT — D1은 빠른 목록 조회용 미러
    ▼
  Response: { versions: BmcVersion[] }

  [버전 복원]
  POST /api/ax-bd/bmc/:id/history/:commitSha/restore
    │ BmcHistoryService.restoreVersion()
    │ → 해당 커밋 스냅샷을 현재 에디터에 로드
    │ → 사용자가 저장 시 새 커밋 생성 (이전 버전 덮어쓰기 없음)
    ▼
  Response: { restored: BmcSnapshot, newVersionId: string }
```

### 1.2 Worker 분리 전략

```
┌─────────────────────────────────────────────────────────┐
│ Sprint 62 — 2-Worker 병렬 구현                           │
├───────────────────────────┬─────────────────────────────┤
│ W1: F199 BMCAgent         │ W2: F200 버전 히스토리        │
├───────────────────────────┼─────────────────────────────┤
│ services/bmc-agent.ts     │ services/bmc-history.ts     │
│ schemas/bmc-agent.ts      │ schemas/bmc-history.ts      │
│ routes/ax-bd-agent.ts  ★  │ routes/ax-bd-history.ts  ★  │
│ __tests__/bmc-agent.*.ts  │ __tests__/bmc-history.*.ts  │
│                           │ web/BmcVersionHistory.tsx   │
│                           │ web/api-client.ts (history) │
├───────────────────────────┴─────────────────────────────┤
│ ★ 라우트 충돌 방지: ax-bd.ts 대신 별도 파일 분리           │
│   리더가 merge 시 app.ts에 .route() 추가                  │
└─────────────────────────────────────────────────────────┘
```

> **핵심**: `routes/ax-bd.ts`는 Sprint 61이 생성한 파일이므로, Sprint 62에서는 **별도 라우트 파일**(`ax-bd-agent.ts`, `ax-bd-history.ts`)을 생성하고, `app.ts`에서 `.route("/ax-bd", axBdAgentRoute)` 등으로 마운트. 리더가 merge 시 통합.

---

## 2. F199 BMCAgent — 상세 설계

### 2.1 BMC 9개 블록 타입

```typescript
// packages/shared/src/bmc.ts (Sprint 61에서 정의, 참조만)
export const BMC_BLOCKS = [
  "customerSegments",
  "valuePropositions",
  "channels",
  "customerRelationships",
  "revenueStreams",
  "keyResources",
  "keyActivities",
  "keyPartnerships",
  "costStructure",
] as const;

export type BmcBlockKey = (typeof BMC_BLOCKS)[number];

// Sprint 62 추가
export interface BmcDraft {
  blocks: Record<BmcBlockKey, string>;
  processingTimeMs: number;
  model: string;
  masked: boolean; // PromptGateway 경유 여부
}
```

### 2.2 BmcAgentService

```typescript
// packages/api/src/services/bmc-agent.ts

import { PromptGatewayService } from "./prompt-gateway.js";
import { ModelRouter } from "./model-router.js";
import type { BmcBlockKey, BmcDraft } from "@foundry-x/shared";

const BMC_SYSTEM_PROMPT = `You are a business model canvas expert.
Given a business idea, generate content for all 9 BMC blocks.
Return JSON with exactly these keys: customerSegments, valuePropositions,
channels, customerRelationships, revenueStreams, keyResources,
keyActivities, keyPartnerships, costStructure.
Each block must be 1-3 sentences, max 200 characters.
Write in the same language as the input.`;

export class BmcAgentService {
  private gateway: PromptGatewayService;
  private db: D1Database;

  constructor(db: D1Database) {
    this.gateway = new PromptGatewayService();
    this.db = db;
  }

  async generateDraft(
    idea: string,
    context?: string,
    tenantId?: string,
  ): Promise<BmcDraft> {
    const startTime = Date.now();

    // 1. 프롬프트 조립
    const userPrompt = context
      ? `Business idea: ${idea}\nAdditional context: ${context}`
      : `Business idea: ${idea}`;

    // 2. PromptGateway 마스킹
    const sanitized = await this.gateway.sanitizePrompt(userPrompt, tenantId);

    // 3. ModelRouter로 LLM 호출
    //    AgentTaskType에 "bmc-generation" 추가 필요 → 또는 기존 "code-generation" 재사용
    //    → Design 결정: 새로운 taskType "bmc-generation" 추가
    const router = new ModelRouter(this.db);
    const result = await router.route({
      taskType: "bmc-generation" as any, // execution-types.ts 확장 필요
      prompt: sanitized.sanitizedContent,
      systemPrompt: BMC_SYSTEM_PROMPT,
      maxTokens: 1024,
      temperature: 0.7,
      timeoutMs: 15_000,
      metadata: {
        gatewayProcessed: true,
        appliedRules: sanitized.appliedRules.length,
      },
    });

    // 4. JSON 파싱 + 블록별 200자 트리밍
    const blocks = this.parseBlocks(result.content);

    return {
      blocks,
      processingTimeMs: Date.now() - startTime,
      model: "claude-sonnet-4-6",
      masked: sanitized.appliedRules.length > 0,
    };
  }

  private parseBlocks(content: string): Record<BmcBlockKey, string> {
    // LLM 응답에서 JSON 추출 (```json ... ``` 또는 순수 JSON)
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
    const raw = JSON.parse(jsonStr);

    const blocks: Record<string, string> = {};
    for (const key of BMC_BLOCKS) {
      const value = typeof raw[key] === "string" ? raw[key] : "";
      blocks[key] = value.slice(0, 200); // 200자 트리밍
    }
    return blocks as Record<BmcBlockKey, string>;
  }
}
```

### 2.3 Rate Limit 설계

```typescript
// routes/ax-bd-agent.ts 내부

// Rate Limit: 사용자당 분당 5회 (KV 기반)
const rateLimitKey = `bmc-gen:${userId}`;
const count = await c.env.CACHE.get(rateLimitKey);
if (count && parseInt(count) >= 5) {
  return c.json({ error: "RATE_LIMIT_EXCEEDED", retryAfterSeconds: 60 }, 429);
}
await c.env.CACHE.put(rateLimitKey, String((parseInt(count ?? "0")) + 1), {
  expirationTtl: 60,
});
```

### 2.4 X-Gateway-Processed 검증

PRD 보안 AC에 따라, LLM 호출 직전에 Gateway 경유 여부를 검증해요.
`ModelRouter.route()` 내부가 아닌 **BmcAgentService** 레벨에서 플래그를 관리:

```typescript
// BmcAgentService.generateDraft() 내부 — sanitizePrompt 호출 후
if (sanitized.appliedRules.length === 0 && !sanitized.sanitizedContent) {
  throw new Error("GATEWAY_NOT_PROCESSED");
}
// metadata.gatewayProcessed = true 로 전달
```

테스트에서는 PromptGateway를 우회한 요청이 거부되는지 검증.

### 2.5 에러 핸들링

| 상황 | HTTP | 응답 |
|------|:----:|------|
| idea 누락/500자 초과 | 400 | `{ error: "VALIDATION_ERROR" }` |
| Rate Limit 초과 | 429 | `{ error: "RATE_LIMIT_EXCEEDED", retryAfterSeconds: 60 }` |
| LLM 타임아웃 (>15초) | 504 | `{ error: "LLM_TIMEOUT" }` |
| LLM 응답 파싱 실패 | 502 | `{ error: "LLM_PARSE_ERROR" }` |
| Gateway 미경유 | 500 | `{ error: "GATEWAY_NOT_PROCESSED" }` |

### 2.6 API 엔드포인트

```
POST /api/ax-bd/bmc/generate
  Request:  { idea: string, context?: string }
  Response: { draft: Record<BmcBlockKey, string>, processingTimeMs: number, model: string, masked: boolean }
  Auth:     JWT (BD 애널리스트 이상)
  Rate:     사용자당 분당 5회
```

---

## 3. F200 BMC 버전 히스토리 — 상세 설계

### 3.1 D1 스키마

```sql
-- 0047_bmc_versions.sql (Sprint 61 D1 번호 확인 후 조정)
CREATE TABLE IF NOT EXISTS ax_bmc_versions (
  id TEXT PRIMARY KEY,
  bmc_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  author_id TEXT NOT NULL,
  message TEXT DEFAULT '',
  snapshot TEXT NOT NULL,  -- JSON: 9개 블록 스냅샷
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(bmc_id, commit_sha)
);
CREATE INDEX idx_bmc_versions_bmc_id ON ax_bmc_versions(bmc_id);
```

> `snapshot`은 `JSON` 대신 `TEXT`로 정의 (D1/SQLite JSON 지원 제한). 앱 레이어에서 JSON.parse/stringify.

### 3.2 BmcHistoryService

```typescript
// packages/api/src/services/bmc-history.ts

export interface BmcVersion {
  id: string;
  bmcId: string;
  commitSha: string;
  authorId: string;
  message: string;
  createdAt: string;
}

export interface BmcSnapshot {
  version: BmcVersion;
  blocks: Record<BmcBlockKey, string>;
}

export class BmcHistoryService {
  constructor(private db: D1Database) {}

  /** BMC 저장 시 호출 — 버전 기록 추가 */
  async recordVersion(
    bmcId: string,
    authorId: string,
    message: string,
    blocks: Record<BmcBlockKey, string>,
    commitSha?: string,
  ): Promise<BmcVersion> {
    const id = crypto.randomUUID();
    const sha = commitSha ?? crypto.randomUUID().slice(0, 8); // Git 미연동 시 임시 해시
    await this.db
      .prepare(
        `INSERT INTO ax_bmc_versions (id, bmc_id, commit_sha, author_id, message, snapshot)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, bmcId, sha, authorId, message, JSON.stringify(blocks))
      .run();

    return { id, bmcId, commitSha: sha, authorId, message, createdAt: new Date().toISOString() };
  }

  /** 히스토리 목록 (최신순) */
  async getHistory(bmcId: string, limit = 20): Promise<BmcVersion[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, bmc_id, commit_sha, author_id, message, created_at
         FROM ax_bmc_versions WHERE bmc_id = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .bind(bmcId, limit)
      .all();

    return (results ?? []).map((r) => ({
      id: r.id as string,
      bmcId: r.bmc_id as string,
      commitSha: r.commit_sha as string,
      authorId: r.author_id as string,
      message: (r.message as string) ?? "",
      createdAt: r.created_at as string,
    }));
  }

  /** 특정 버전 스냅샷 */
  async getVersion(bmcId: string, commitSha: string): Promise<BmcSnapshot | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM ax_bmc_versions WHERE bmc_id = ? AND commit_sha = ?`,
      )
      .bind(bmcId, commitSha)
      .first();

    if (!row) return null;

    return {
      version: {
        id: row.id as string,
        bmcId: row.bmc_id as string,
        commitSha: row.commit_sha as string,
        authorId: row.author_id as string,
        message: (row.message as string) ?? "",
        createdAt: row.created_at as string,
      },
      blocks: JSON.parse(row.snapshot as string),
    };
  }

  /** 버전 복원 (스냅샷 반환 — 실제 저장은 사용자 확인 후 BMC CRUD로) */
  async restoreVersion(bmcId: string, commitSha: string): Promise<BmcSnapshot | null> {
    return this.getVersion(bmcId, commitSha);
  }
}
```

### 3.3 API 엔드포인트

```
GET  /api/ax-bd/bmc/:id/history
  Response: { versions: BmcVersion[] }

GET  /api/ax-bd/bmc/:id/history/:commitSha
  Response: { version: BmcVersion, blocks: Record<BmcBlockKey, string> }

POST /api/ax-bd/bmc/:id/history/:commitSha/restore
  Response: { restored: BmcSnapshot }
  Note: 스냅샷만 반환. 실제 BMC 업데이트는 사용자가 에디터에서 저장 시 수행.
```

### 3.4 Web 컴포넌트 설계

```
BmcVersionHistory.tsx
├── 상태: versions[], selectedVersion, loading
├── useEffect: fetchHistory(bmcId) → GET /bmc/:id/history
├── 렌더링:
│   ├── 버전 목록 (최신순)
│   │   └── 각 항목: 날짜 | 작성자 | 메시지 | "보기" 버튼
│   ├── 선택된 버전 미리보기 (9개 블록 읽기 전용)
│   └── "이 버전으로 복원" 버튼
│       └── 확인 다이얼로그 → POST restore → 에디터에 블록 데이터 전달
└── 빈 상태: "아직 저장된 버전이 없습니다"
```

---

## 4. execution-types 확장

`AgentTaskType`에 `"bmc-generation"`을 추가해야 해요:

```typescript
// packages/api/src/services/execution-types.ts
export type AgentTaskType =
  | "code-review"
  | "code-generation"
  | "spec-analysis"
  | "test-generation"
  | "security-review"
  | "qa-testing"
  | "infra-analysis"
  | "policy-evaluation"
  | "skill-query"
  | "ontology-lookup"
  | "bmc-generation";  // ← Sprint 62 추가
```

`ModelRouter`의 `DEFAULT_MODEL_MAP`에도 추가:

```typescript
"bmc-generation": "anthropic/claude-sonnet-4-6",
```

---

## 5. 파일 매핑 (Worker별)

### W1: F199 BMCAgent

| # | 파일 | 작업 | 비고 |
|---|------|------|------|
| 1 | `services/bmc-agent.ts` | NEW | BMCAgent 서비스 |
| 2 | `schemas/bmc-agent.ts` | NEW | Zod 스키마 (GenerateBmcDraft, BmcDraftResult) |
| 3 | `routes/ax-bd-agent.ts` | NEW | POST /bmc/generate 라우트 |
| 4 | `services/execution-types.ts` | MODIFY | "bmc-generation" 추가 |
| 5 | `services/model-router.ts` | MODIFY | DEFAULT_MODEL_MAP에 bmc-generation 추가 |
| 6 | `app.ts` | MODIFY | axBdAgentRoute 마운트 |
| 7 | `__tests__/bmc-agent.test.ts` | NEW | 서비스 단위 테스트 (15개+) |
| 8 | `__tests__/routes/bmc-agent.test.ts` | NEW | 라우트 통합 테스트 (5개+) |

### W2: F200 버전 히스토리

| # | 파일 | 작업 | 비고 |
|---|------|------|------|
| 1 | `services/bmc-history.ts` | NEW | 히스토리 서비스 |
| 2 | `schemas/bmc-history.ts` | NEW | Zod 스키마 |
| 3 | `routes/ax-bd-history.ts` | NEW | GET/POST history 라우트 |
| 4 | `db/migrations/0047_bmc_versions.sql` | NEW | ax_bmc_versions 테이블 |
| 5 | `app.ts` | MODIFY | axBdHistoryRoute 마운트 |
| 6 | `__tests__/bmc-history.test.ts` | NEW | 서비스 단위 테스트 (10개+) |
| 7 | `__tests__/routes/bmc-history.test.ts` | NEW | 라우트 통합 테스트 (5개+) |
| 8 | `web/components/feature/BmcVersionHistory.tsx` | NEW | 히스토리 UI |
| 9 | `web/lib/api-client.ts` | MODIFY | history API 메서드 추가 |
| 10 | `web/__tests__/bmc-history.test.tsx` | NEW | UI 테스트 (3개+) |

### 공유 (리더 통합)

| # | 파일 | 작업 | 비고 |
|---|------|------|------|
| 1 | `shared/src/bmc.ts` | MODIFY | BmcDraft 타입 추가 (Sprint 61 기존 타입 확장) |

---

## 6. 테스트 설계

### 6.1 F199 BMCAgent 테스트 (20개)

```
bmc-agent.test.ts:
  ✓ 아이디어 입력 → 9개 블록 모두 채워진 초안 반환
  ✓ context 포함 시 프롬프트에 반영
  ✓ 각 블록 200자 이하로 트리밍
  ✓ PromptGateway 마스킹이 적용됨
  ✓ 빈 아이디어 → ValidationError
  ✓ 500자 초과 아이디어 → ValidationError
  ✓ LLM 타임아웃 → LLM_TIMEOUT 에러
  ✓ LLM 응답 파싱 실패 → LLM_PARSE_ERROR 에러
  ✓ processingTimeMs가 양수
  ✓ masked 플래그가 마스킹 적용 시 true

bmc-agent-routes.test.ts:
  ✓ POST /bmc/generate → 200 + 9개 블록
  ✓ POST /bmc/generate 미인증 → 401
  ✓ POST /bmc/generate idea 누락 → 400
  ✓ POST /bmc/generate idea 500자 초과 → 400
  ✓ Rate Limit 5회 초과 → 429
  ✓ Gateway 미경유 요청 → 500

bmc-agent-security.test.ts:
  ✓ KT DS 고유명사가 마스킹된 상태로 LLM에 전달
  ✓ 응답에서 마스킹이 복원됨
  ✓ X-Gateway-Processed 메타데이터 존재
  ✓ PromptGateway 비활성 시 에러
```

### 6.2 F200 버전 히스토리 테스트 (18개)

```
bmc-history.test.ts:
  ✓ recordVersion → 버전 기록 생성
  ✓ getHistory → 최신순 정렬된 목록
  ✓ getHistory 빈 결과 → 빈 배열
  ✓ getVersion → 특정 커밋 스냅샷 반환
  ✓ getVersion 존재하지 않는 sha → null
  ✓ restoreVersion → 스냅샷 반환
  ✓ limit 파라미터 동작
  ✓ 같은 BMC에 여러 버전 기록

bmc-history-routes.test.ts:
  ✓ GET /bmc/:id/history → 200 + versions[]
  ✓ GET /bmc/:id/history 미인증 → 401
  ✓ GET /bmc/:id/history 존재하지 않는 BMC → 200 (빈 배열)
  ✓ GET /bmc/:id/history/:sha → 200 + 스냅샷
  ✓ GET /bmc/:id/history/:sha 존재하지 않는 sha → 404
  ✓ POST /bmc/:id/history/:sha/restore → 200 + restored

bmc-history-web.test.tsx:
  ✓ 버전 목록 렌더링
  ✓ 버전 선택 → 미리보기 표시
  ✓ 빈 히스토리 → "아직 저장된 버전이 없습니다" 표시
  ✓ "이 버전으로 복원" 버튼 클릭 → 확인 다이얼로그
```

---

## 7. CONSTITUTION 경계 (PRD §6 기반)

| 경계 | F199 BMCAgent | F200 히스토리 |
|------|--------------|--------------|
| **Always** | 생성 결과를 미리보기로 제공 | 복원 전 확인 다이얼로그 표시 |
| **Always** | PromptGateway 경유 마스킹 | 복원 시 새 커밋 생성 (기존 덮어쓰기 없음) |
| **Never** | 사용자 확인 없이 에디터 반영 | 자동 복원 (사용자 승인 없이) |
| **Never** | PromptGateway 우회 전송 | 버전 자동 삭제 |
| **Never** | 자동 Git 커밋 | — |

---

## 8. 구현 순서 (Worker 프롬프트용)

### W1 순서 (F199)
1. `execution-types.ts`에 `"bmc-generation"` 추가
2. `model-router.ts`에 `bmc-generation` 매핑 추가
3. `schemas/bmc-agent.ts` 작성
4. `services/bmc-agent.ts` 작성 (PromptGateway + ModelRouter 연동)
5. `routes/ax-bd-agent.ts` 작성 (POST /bmc/generate + Rate Limit)
6. `app.ts`에 라우트 마운트
7. `__tests__/bmc-agent.test.ts` + `__tests__/routes/bmc-agent.test.ts` 작성

### W2 순서 (F200)
1. `db/migrations/0047_bmc_versions.sql` 작성
2. `schemas/bmc-history.ts` 작성
3. `services/bmc-history.ts` 작성
4. `routes/ax-bd-history.ts` 작성 (GET history + GET snapshot + POST restore)
5. `app.ts`에 라우트 마운트
6. `__tests__/bmc-history.test.ts` + `__tests__/routes/bmc-history.test.ts` 작성
7. `web/components/feature/BmcVersionHistory.tsx` 작성
8. `web/lib/api-client.ts`에 history 메서드 추가
9. `web/__tests__/bmc-history.test.tsx` 작성
