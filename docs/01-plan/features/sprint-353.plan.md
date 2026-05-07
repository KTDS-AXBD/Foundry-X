---
code: FX-PLAN-353
title: Sprint 353 — F629 5-Asset Model + System Knowledge (T1 토대)
version: 1.1
status: SUPERSEDED
category: PLAN
created: 2026-05-06
updated: 2026-05-08
sprint: 353
f_item: F629
req: FX-REQ-694
priority: P2
---

# Sprint 353 — F629 5-Asset Model + System Knowledge (T1 토대)

> **STATUS: SUPERSEDED (S337, 2026-05-08)** — F629는 S335 17 sprint 시동 신기록 세션에서 코드화 완료. plan §3 (a~h) 100% 충족: D1 0142_system_knowledge.sql + core/asset/{types,schemas,services,routes}/ 평탄 구조 + ASSET_TYPES enum + Asset discriminated union + SystemKnowledgeAsset + AssetTypeSchema + SystemKnowledgeContentTypeSchema + SystemKnowledgeService + Hono sub-app + app.ts `/api/asset` mount + 4 unit tests PASS. 본 sprint 번호로 정식 WT 시동된 적 없음. S337 SPEC sync PR이 row를 ✅로 마킹. SPEC.md F629 row가 진실 — `Sprint 353 | ✅`.

> SPEC.md §5 F629 row가 권위 소스. 본 plan은 17 internal dev plan §3 T1 토대 세 번째 sprint로서 실행 절차 + Phase Exit 체크리스트.

## §1 배경 + 사전 측정

17 plan §3 Tier 1 토대 3건 중 마지막. F606(Sprint 351) + F628(Sprint 352)와 **병렬 가동**.

### 4-Asset → 5-Asset Model 확장 (BeSir A3 P0)

| Asset | 현 매핑 | 본 sprint 처리 |
|-------|---------|----------------|
| **Policy** | F615 Guard-X 후속 | **참조만** (types.ts에 enum) |
| **Ontology** | `core/entity/` (F593+F628) | 참조만 |
| **Skill** | ax-plugin 외부 | 참조만 |
| **Log** | `core/infra/audit-bus` (F606) | 참조만 |
| **System Knowledge** [신규] | 부재 | **신설 (D1 + service stub + route)** |

> BeSir §0.1: "메타는 파일(Git), 인스턴스는 PG" → System Knowledge는 D1 카탈로그 + Git ref 패턴.

## §2 인터뷰 4회 패턴 (S336, 32회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T1 토대 세 번째 = F629 5-Asset Model | F628(Ontology) + F606(Log) 다음 자연 진행 |
| 2차 위치 | **A 별 도메인 `core/asset/`** | 5-Asset 통합 sub-app, 명확한 우권 분리 |
| 3차 분량 | **Minimal** (types + D1 + service stub) | 5-Asset catalog endpoint는 F600 5-Layer 통합 시 |
| 4차 시동 | **즉시 (351/352 병렬, 동시 3개)** | development-workflow 권장 한도 내, 다른 도메인 |

## §3 범위 (a~i)

### (a) 신규 디렉토리
```
packages/api/src/core/asset/
├── types.ts
├── schemas/
│   └── asset.ts
├── services/
│   └── system-knowledge.service.ts
└── routes/
    └── index.ts
```

### (b) D1 migration `0142_system_knowledge.sql`

```sql
-- F629: 5-Asset Model — System Knowledge (5번째 자산, 암묵지 파일)
-- BeSir §0.1: 메타는 파일(Git), 인스턴스는 PG. 본 D1은 메타 카탈로그.

CREATE TABLE system_knowledge (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'system_knowledge',
  title TEXT NOT NULL,
  content_ref TEXT NOT NULL,                   -- Git path (예: knowledge/sop/foo.md) 또는 external URL
  content_type TEXT NOT NULL,                  -- enum (sop/transcript/knowledge_graph_input/domain_rule/tacit_knowledge)
  metadata TEXT,                               -- JSON
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (asset_type = 'system_knowledge'),
  CHECK (content_type IN ('sop','transcript','knowledge_graph_input','domain_rule','tacit_knowledge'))
);

CREATE INDEX idx_system_knowledge_org_type ON system_knowledge(org_id, content_type);
CREATE INDEX idx_system_knowledge_created ON system_knowledge(created_at DESC);
```

### (c) `core/asset/types.ts`

```typescript
// F629: 5-Asset Model (BeSir 정합성 §A3)
// Policy / Ontology / Skill / Log / System Knowledge

export const ASSET_TYPES = [
  "policy",            // 룰/규칙 (F615 Guard-X 후속)
  "ontology",          // 시멘틱 레이어 (core/entity, F593+F628)
  "skill",             // 자동화 단위 (ax-plugin 외부)
  "log",               // 감사·관측 (core/infra/audit-bus, F606)
  "system_knowledge",  // 암묵지 파일 (본 sprint 신설)
] as const;

export type AssetType = typeof ASSET_TYPES[number];

export const SYSTEM_KNOWLEDGE_CONTENT_TYPES = [
  "sop",
  "transcript",
  "knowledge_graph_input",
  "domain_rule",
  "tacit_knowledge",
] as const;

export type SystemKnowledgeContentType = typeof SYSTEM_KNOWLEDGE_CONTENT_TYPES[number];

export interface SystemKnowledgeAsset {
  id: string;
  orgId: string;
  assetType: "system_knowledge";
  title: string;
  contentRef: string;
  contentType: SystemKnowledgeContentType;
  metadata: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

// Discriminated union (4개 자산은 후속 sprint에서 본격화)
export type Asset = SystemKnowledgeAsset; // Policy/Ontology/Skill/Log는 후속 sprint에서 union 확장

export { SystemKnowledgeService } from "./services/system-knowledge.service.js";
export * from "./schemas/asset.js";
```

### (d) `core/asset/schemas/asset.ts`

```typescript
import { z } from "@hono/zod-openapi";
import { ASSET_TYPES, SYSTEM_KNOWLEDGE_CONTENT_TYPES } from "../types.js";

export const AssetTypeSchema = z.enum(ASSET_TYPES);
export const SystemKnowledgeContentTypeSchema = z.enum(SYSTEM_KNOWLEDGE_CONTENT_TYPES);

export const RegisterSystemKnowledgeSchema = z.object({
  orgId: z.string().min(1),
  title: z.string().min(1),
  contentRef: z.string().min(1).openapi({ description: "Git path 또는 external URL" }),
  contentType: SystemKnowledgeContentTypeSchema,
  metadata: z.record(z.unknown()).optional(),
  createdBy: z.string().optional(),
}).openapi("RegisterSystemKnowledge");

export const SystemKnowledgeResponseSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  assetType: z.literal("system_knowledge"),
  title: z.string(),
  contentRef: z.string(),
  contentType: SystemKnowledgeContentTypeSchema,
  metadata: z.record(z.unknown()).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
}).openapi("SystemKnowledgeResponse");
```

### (e) `core/asset/services/system-knowledge.service.ts`

```typescript
// Minimal stub — registerKnowledge + getKnowledge
export class SystemKnowledgeService {
  constructor(private db: D1Database) {}

  async registerKnowledge(input: RegisterInput): Promise<SystemKnowledgeAsset> {
    const id = crypto.randomUUID();
    await this.db.prepare(`
      INSERT INTO system_knowledge (id, org_id, asset_type, title, content_ref, content_type, metadata, created_by)
      VALUES (?, ?, 'system_knowledge', ?, ?, ?, ?, ?)
    `).bind(id, input.orgId, input.title, input.contentRef, input.contentType,
            JSON.stringify(input.metadata ?? {}), input.createdBy ?? null).run();
    return this.getKnowledge(id);
  }

  async getKnowledge(id: string): Promise<SystemKnowledgeAsset> { /* SELECT + map */ }
}
```

### (f) `core/asset/routes/index.ts`

```typescript
// Hono sub-app — POST /system-knowledge + GET /system-knowledge/:id
// 5-Asset catalog endpoint(GET /asset/catalog)는 후속 sprint
export const assetApp = new OpenAPIHono<{ Bindings: Env }>();
// minimal endpoints
```

### (g) `app.ts` mount

```typescript
import { assetApp } from "./core/asset/routes/index.js";
app.route("/api/asset", assetApp);
```

### (h) typecheck + vitest GREEN
- 회귀 0 확증
- 신규 unit test 1건 — registerKnowledge + getKnowledge round-trip

### (i) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | D1 migration 0142 적용 OK + system_knowledge 테이블 | `wrangler d1 execute foundry-x-db --command "PRAGMA table_info(system_knowledge)"` | 테이블 + 모든 컬럼 |
| P-b | core/asset/ 신규 디렉토리 + 5 files | `find packages/api/src/core/asset -type f -name "*.ts"` | types + schemas/asset + services/system-knowledge + routes/index + 1 추가 |
| P-c | types.ts ASSET_TYPES + Asset + SystemKnowledgeAsset export | grep | 모두 export |
| P-d | schemas/asset.ts 4 schema | grep | AssetTypeSchema + ContentType + Register + Response |
| P-e | services/system-knowledge.service.ts SystemKnowledgeService class | grep `class SystemKnowledgeService` | export 존재 |
| P-f | app.ts /api/asset mount 1줄 추가 | `grep "/api/asset" packages/api/src/app.ts` | 1 line |
| P-g | typecheck + tests GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-h | dual_ai_reviews sprint 353 자동 INSERT | D1 query | ≥ 1건 (hook 28 sprint 연속, 누적 ≥ 39건) |
| P-i | F606/F614/F627/F628 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-j | F587~F628 회귀 측정 12항 | grep + count | 모든 항목 회귀 0 |
| P-k | Match ≥ 90% | gap-detector | semantic 100% 목표 |
| P-l | API smoke `/api/asset/system-knowledge` | curl POST + GET | 등록/조회 동작 |

## §5 전제

- Sprint 351 F606 + Sprint 352 F628과 병렬 가능 (다른 도메인, D1 migration 다른 번호 0140/0141/0142)
- C103+C104 ✅ (26 sprint 연속 정상)

## §6 예상 시간

- autopilot **~10분** (단순 sub-app 신설 + D1 migration 1 + types/schemas/service/routes 5 files)

## §7 다음 사이클 후보 (F629 후속)

- **Sprint 354 — F630** 인터뷰 → 트랜스크립트 → 7-타입 자동 추출 (T2, F628 의존)
- **Sprint 355 — F631** 분석X 자동화O 정책 코드 (T2, F606 의존)
- Sprint 356 — F624 Six Hats LLM 호출 패턴 (T2)
- Sprint 357 — F602 4대 진단 PoC (T3)
- 후속 Sprint — 5-Asset catalog endpoint (F600 5-Layer 통합)
