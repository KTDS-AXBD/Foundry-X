---
code: FX-DSGN-061
title: "Sprint 61 — F197 BMC 캔버스 CRUD + F198 아이디어 등록 및 태그"
version: 1.0
status: Active
category: DSGN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 61
features: [F197, F198]
req: [FX-REQ-AX-001, FX-REQ-AX-007]
plan: "[[FX-PLAN-061]]"
prd: docs/specs/bizdevprocess-3/prd-ax-bd-v1.4.md
---

## 1. 설계 개요

### 1.1 목표

Sprint 61은 AX BD Ideation MVP의 **기반 2건**을 구현해요:
- **F197 (FX-REQ-AX-001, P0)**: BMC 캔버스 CRUD — 9개 블록 에디터, Git staging, 동시 편집 충돌 감지
- **F198 (FX-REQ-AX-007, P0)**: 아이디어 등록 — 제목·설명·태그, Git+D1 하이브리드 저장

### 1.2 설계 원칙

| 원칙 | 적용 |
|------|------|
| Git SSOT | BMC/아이디어 본문은 Git이 진실, D1은 조회 최적화용 미러 |
| CONSTITUTION §6.2 | 자동 커밋 절대 금지 — `X-Human-Approved` 인터셉터 |
| 기존 패턴 준수 | Hono 라우트 + 클래스 서비스 + Zod 스키마 + tenantGuard |
| BE/FE 완전 분리 | Worker 1(API) / Worker 2(Web) 파일 겹침 없음 |

---

## 2. F197 — BMC 캔버스 CRUD

### 2.1 API 설계

#### 라우트: `packages/api/src/routes/ax-bd-bmc.ts`

```typescript
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { BmcService } from "../services/bmc-service.js";
import {
  CreateBmcSchema,
  UpdateBmcBlocksSchema,
} from "../schemas/bmc.schema.js";

export const axBdBmcRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /ax-bd/bmc — BMC 생성
axBdBmcRoute.post("/ax-bd/bmc", async (c) => {
  const body = await c.req.json();
  const parsed = CreateBmcSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }
  const svc = new BmcService(c.env.DB);
  const bmc = await svc.create(c.get("orgId"), c.get("userId"), parsed.data);
  return c.json(bmc, 201);
});

// GET /ax-bd/bmc — BMC 목록
axBdBmcRoute.get("/ax-bd/bmc", async (c) => {
  const svc = new BmcService(c.env.DB);
  const { page, limit, sort } = c.req.query();
  const result = await svc.list(c.get("orgId"), {
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    sort: sort || "updated_at_desc",
  });
  return c.json(result);
});

// GET /ax-bd/bmc/:id — BMC 상세 (블록 포함)
axBdBmcRoute.get("/ax-bd/bmc/:id", async (c) => {
  const svc = new BmcService(c.env.DB);
  const bmc = await svc.getById(c.get("orgId"), c.req.param("id"));
  if (!bmc) return c.json({ error: "BMC not found" }, 404);
  return c.json(bmc);
});

// PUT /ax-bd/bmc/:id — BMC 블록 업데이트
axBdBmcRoute.put("/ax-bd/bmc/:id", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateBmcBlocksSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }
  const svc = new BmcService(c.env.DB);
  const bmc = await svc.update(c.get("orgId"), c.req.param("id"), c.get("userId"), parsed.data);
  if (!bmc) return c.json({ error: "BMC not found" }, 404);
  return c.json(bmc);
});

// DELETE /ax-bd/bmc/:id — BMC 삭제 (soft delete)
axBdBmcRoute.delete("/ax-bd/bmc/:id", async (c) => {
  const svc = new BmcService(c.env.DB);
  const ok = await svc.softDelete(c.get("orgId"), c.req.param("id"));
  if (!ok) return c.json({ error: "BMC not found" }, 404);
  return c.json({ success: true });
});

// POST /ax-bd/bmc/:id/stage — Git staging 상태 전환
axBdBmcRoute.post("/ax-bd/bmc/:id/stage", async (c) => {
  const svc = new BmcService(c.env.DB);
  const result = await svc.stage(c.get("orgId"), c.req.param("id"), c.get("userId"));
  if (!result) return c.json({ error: "BMC not found" }, 404);
  return c.json(result);
});
```

**엔드포인트 요약:**

| # | 메서드 | 경로 | 설명 |
|---|--------|------|------|
| 1 | POST | `/ax-bd/bmc` | BMC 생성 (9블록 빈 초기화) |
| 2 | GET | `/ax-bd/bmc` | BMC 목록 (필터/정렬/페이징) |
| 3 | GET | `/ax-bd/bmc/:id` | BMC 상세 (블록 포함) |
| 4 | PUT | `/ax-bd/bmc/:id` | BMC 블록 업데이트 |
| 5 | DELETE | `/ax-bd/bmc/:id` | BMC 삭제 (soft delete) |
| 6 | POST | `/ax-bd/bmc/:id/stage` | Git staging 상태 전환 |

### 2.2 서비스: `packages/api/src/services/bmc-service.ts`

```typescript
// ─── DB Row 타입 ───
interface BmcRow {
  id: string;
  idea_id: string | null;
  title: string;
  git_ref: string;
  author_id: string;
  org_id: string;
  sync_status: "synced" | "pending" | "failed";
  is_deleted: number; // 0 | 1
  created_at: number;
  updated_at: number;
}

interface BmcBlockRow {
  bmc_id: string;
  block_type: string;
  content: string | null;
  updated_at: number;
}

// ─── API 타입 ───
export interface Bmc {
  id: string;
  ideaId: string | null;
  title: string;
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  blocks: BmcBlock[];
  createdAt: number;
  updatedAt: number;
}

export interface BmcBlock {
  blockType: string;
  content: string | null;
  updatedAt: number;
}

// ─── 9개 블록 타입 상수 ───
export const BMC_BLOCK_TYPES = [
  "customer_segments",
  "value_propositions",
  "channels",
  "customer_relationships",
  "revenue_streams",
  "key_resources",
  "key_activities",
  "key_partnerships",
  "cost_structure",
] as const;

// ─── 변환 헬퍼 ───
function toBmc(row: BmcRow, blocks: BmcBlockRow[]): Bmc {
  return {
    id: row.id,
    ideaId: row.idea_id,
    title: row.title,
    gitRef: row.git_ref,
    authorId: row.author_id,
    orgId: row.org_id,
    syncStatus: row.sync_status as Bmc["syncStatus"],
    blocks: blocks.map((b) => ({
      blockType: b.block_type,
      content: b.content,
      updatedAt: b.updated_at,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class BmcService {
  constructor(private db: D1Database) {}

  async create(orgId: string, userId: string, data: { title: string; ideaId?: string }): Promise<Bmc> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const gitRef = "pending"; // Git 커밋 전 상태

    // 1) BMC 메타 INSERT
    await this.db
      .prepare(
        `INSERT INTO ax_bmcs (id, idea_id, title, git_ref, author_id, org_id, sync_status, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`
      )
      .bind(id, data.ideaId ?? null, data.title, gitRef, userId, orgId, now, now)
      .run();

    // 2) 9개 블록 빈 초기화
    const stmts = BMC_BLOCK_TYPES.map((type) =>
      this.db
        .prepare(
          `INSERT INTO ax_bmc_blocks (bmc_id, block_type, content, updated_at)
           VALUES (?, ?, '', ?)`
        )
        .bind(id, type, now)
    );
    await this.db.batch(stmts);

    return this.getById(orgId, id) as Promise<Bmc>;
  }

  async getById(orgId: string, id: string): Promise<Bmc | null> {
    const row = await this.db
      .prepare("SELECT * FROM ax_bmcs WHERE id = ? AND org_id = ? AND is_deleted = 0")
      .bind(id, orgId)
      .first<BmcRow>();
    if (!row) return null;

    const { results: blocks } = await this.db
      .prepare("SELECT * FROM ax_bmc_blocks WHERE bmc_id = ?")
      .bind(id)
      .all<BmcBlockRow>();

    return toBmc(row, blocks ?? []);
  }

  async list(orgId: string, opts: { page: number; limit: number; sort: string }) {
    const offset = (opts.page - 1) * opts.limit;
    const orderBy = opts.sort === "created_at_asc" ? "created_at ASC" : "updated_at DESC";

    const { results } = await this.db
      .prepare(`SELECT * FROM ax_bmcs WHERE org_id = ? AND is_deleted = 0 ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .bind(orgId, opts.limit, offset)
      .all<BmcRow>();

    const countRow = await this.db
      .prepare("SELECT COUNT(*) as total FROM ax_bmcs WHERE org_id = ? AND is_deleted = 0")
      .bind(orgId)
      .first<{ total: number }>();

    // 각 BMC의 블록도 가져오기 (N+1 최적화는 Phase 1 후)
    const items = await Promise.all(
      (results ?? []).map(async (row) => {
        const { results: blocks } = await this.db
          .prepare("SELECT * FROM ax_bmc_blocks WHERE bmc_id = ?")
          .bind(row.id)
          .all<BmcBlockRow>();
        return toBmc(row, blocks ?? []);
      })
    );

    return { items, total: countRow?.total ?? 0, page: opts.page, limit: opts.limit };
  }

  async update(
    orgId: string,
    id: string,
    userId: string,
    data: { title?: string; blocks?: Array<{ blockType: string; content: string }> }
  ): Promise<Bmc | null> {
    const existing = await this.getById(orgId, id);
    if (!existing) return null;

    const now = Date.now();

    // 타이틀 업데이트
    if (data.title) {
      await this.db
        .prepare("UPDATE ax_bmcs SET title = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?")
        .bind(data.title, now, id)
        .run();
    }

    // 블록 업데이트
    if (data.blocks) {
      const stmts = data.blocks.map((b) =>
        this.db
          .prepare(
            `UPDATE ax_bmc_blocks SET content = ?, updated_at = ? WHERE bmc_id = ? AND block_type = ?`
          )
          .bind(b.content, now, id, b.blockType)
      );
      await this.db.batch(stmts);

      // BMC 메타 업데이트 시간도 갱신
      await this.db
        .prepare("UPDATE ax_bmcs SET updated_at = ?, sync_status = 'pending' WHERE id = ?")
        .bind(now, id)
        .run();
    }

    return this.getById(orgId, id);
  }

  async softDelete(orgId: string, id: string): Promise<boolean> {
    const result = await this.db
      .prepare("UPDATE ax_bmcs SET is_deleted = 1, updated_at = ? WHERE id = ? AND org_id = ?")
      .bind(Date.now(), id, orgId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async stage(orgId: string, id: string, userId: string): Promise<{ staged: true; bmcId: string } | null> {
    const existing = await this.getById(orgId, id);
    if (!existing) return null;

    // sync_status를 'pending'으로 유지 — 프론트엔드가 커밋 요청을 보내기 전까지 대기
    await this.db
      .prepare("UPDATE ax_bmcs SET sync_status = 'pending', updated_at = ? WHERE id = ?")
      .bind(Date.now(), id)
      .run();

    return { staged: true, bmcId: id };
  }
}
```

### 2.3 스키마: `packages/api/src/schemas/bmc.schema.ts`

```typescript
import { z } from "@hono/zod-openapi";

export const BmcBlockTypeSchema = z.enum([
  "customer_segments",
  "value_propositions",
  "channels",
  "customer_relationships",
  "revenue_streams",
  "key_resources",
  "key_activities",
  "key_partnerships",
  "cost_structure",
]).openapi("BmcBlockType");

export const CreateBmcSchema = z.object({
  title: z.string().min(1).max(100),
  ideaId: z.string().optional(),
}).openapi("CreateBmc");

export const UpdateBmcBlocksSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  blocks: z.array(
    z.object({
      blockType: BmcBlockTypeSchema,
      content: z.string().max(2000),
    })
  ).optional(),
}).openapi("UpdateBmcBlocks");

export const BmcSchema = z.object({
  id: z.string(),
  ideaId: z.string().nullable(),
  title: z.string(),
  gitRef: z.string(),
  authorId: z.string(),
  orgId: z.string(),
  syncStatus: z.enum(["synced", "pending", "failed"]),
  blocks: z.array(
    z.object({
      blockType: BmcBlockTypeSchema,
      content: z.string().nullable(),
      updatedAt: z.number(),
    })
  ),
  createdAt: z.number(),
  updatedAt: z.number(),
}).openapi("Bmc");
```

### 2.4 D1 마이그레이션 보정

PRD §8 기반이지만, 기존 패턴에 맞춰 `org_id`와 `is_deleted` 컬럼을 추가해요:

**`0046_ax_bmcs.sql`** (0045는 아이디어에 사용):

```sql
CREATE TABLE ax_bmcs (
  id          TEXT PRIMARY KEY,
  idea_id     TEXT,
  title       TEXT NOT NULL,
  git_ref     TEXT NOT NULL,
  author_id   TEXT NOT NULL,
  org_id      TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
              CHECK(sync_status IN ('synced', 'pending', 'failed')),
  is_deleted  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_ax_bmcs_idea_id   ON ax_bmcs(idea_id);
CREATE INDEX idx_ax_bmcs_author    ON ax_bmcs(author_id);
CREATE INDEX idx_ax_bmcs_org       ON ax_bmcs(org_id);

CREATE TABLE ax_bmc_blocks (
  bmc_id      TEXT NOT NULL REFERENCES ax_bmcs(id),
  block_type  TEXT NOT NULL CHECK(block_type IN (
                'customer_segments', 'value_propositions', 'channels',
                'customer_relationships', 'revenue_streams',
                'key_resources', 'key_activities', 'key_partnerships',
                'cost_structure'
              )),
  content     TEXT,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (bmc_id, block_type)
);

CREATE TABLE sync_failures (
  id            TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL,
  resource_id   TEXT NOT NULL,
  git_ref       TEXT NOT NULL,
  payload       TEXT NOT NULL,
  error_msg     TEXT,
  retry_count   INTEGER NOT NULL DEFAULT 0,
  next_retry_at INTEGER,
  created_at    INTEGER NOT NULL
);
```

### 2.5 Web 컴포넌트 설계

#### 페이지 구조

```
packages/web/src/app/(app)/ax-bd/
├── page.tsx                      # AX BD 모듈 메인 (아이디어 목록)
├── ideas/
│   ├── page.tsx                  # 아이디어 목록 페이지
│   └── [id]/page.tsx             # 아이디어 상세 페이지
└── bmc/
    ├── page.tsx                  # BMC 목록 페이지
    ├── new/page.tsx              # 새 BMC 생성 페이지
    └── [id]/page.tsx             # BMC 에디터 페이지
```

#### BmcEditorPage (`packages/web/src/components/feature/ax-bd/BmcEditorPage.tsx`)

```typescript
"use client";

import { useState, useEffect } from "react";
import { ApiClient } from "@/lib/api-client";
import BmcBlockEditor from "./BmcBlockEditor";
import BmcStagingBar from "./BmcStagingBar";

const BMC_BLOCK_LABELS: Record<string, string> = {
  key_partnerships: "핵심 파트너십",
  key_activities: "핵심 활동",
  key_resources: "핵심 자원",
  value_propositions: "가치 제안",
  customer_relationships: "고객 관계",
  channels: "채널",
  customer_segments: "고객 세그먼트",
  cost_structure: "비용 구조",
  revenue_streams: "수익 구조",
};

// BMC 캔버스 레이아웃 (3열 4행 그리드, 표준 BMC 배치)
const BMC_GRID_LAYOUT = [
  // [row, col, rowSpan, colSpan]
  { type: "key_partnerships",       row: 1, col: 1, rowSpan: 2, colSpan: 1 },
  { type: "key_activities",         row: 1, col: 2, rowSpan: 1, colSpan: 1 },
  { type: "key_resources",          row: 2, col: 2, rowSpan: 1, colSpan: 1 },
  { type: "value_propositions",     row: 1, col: 3, rowSpan: 2, colSpan: 1 },
  { type: "customer_relationships", row: 1, col: 4, rowSpan: 1, colSpan: 1 },
  { type: "channels",              row: 2, col: 4, rowSpan: 1, colSpan: 1 },
  { type: "customer_segments",     row: 1, col: 5, rowSpan: 2, colSpan: 1 },
  { type: "cost_structure",        row: 3, col: 1, rowSpan: 1, colSpan: 2 },
  { type: "revenue_streams",       row: 3, col: 3, rowSpan: 1, colSpan: 3 },
];

interface BmcEditorPageProps {
  bmcId: string;
}

export default function BmcEditorPage({ bmcId }: BmcEditorPageProps) {
  const [bmc, setBmc] = useState<Bmc | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const client = new ApiClient();
    client.get(`/ax-bd/bmc/${bmcId}`).then(setBmc);
  }, [bmcId]);

  const handleBlockChange = (blockType: string, content: string) => {
    if (!bmc) return;
    setBmc({
      ...bmc,
      blocks: bmc.blocks.map((b) =>
        b.blockType === blockType ? { ...b, content } : b
      ),
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!bmc || !dirty) return;
    setSaving(true);
    const client = new ApiClient();
    const updated = await client.put(`/ax-bd/bmc/${bmcId}`, {
      blocks: bmc.blocks.map((b) => ({
        blockType: b.blockType,
        content: b.content ?? "",
      })),
    });
    setBmc(updated);
    setDirty(false);
    setSaving(false);
  };

  if (!bmc) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">{bmc.title}</h1>

      {/* BMC 캔버스 그리드 */}
      <div className="grid grid-cols-5 grid-rows-3 gap-2" style={{ minHeight: 600 }}>
        {BMC_GRID_LAYOUT.map(({ type, row, col, rowSpan, colSpan }) => (
          <div
            key={type}
            style={{
              gridRow: `${row} / span ${rowSpan}`,
              gridColumn: `${col} / span ${colSpan}`,
            }}
          >
            <BmcBlockEditor
              label={BMC_BLOCK_LABELS[type]}
              blockType={type}
              content={bmc.blocks.find((b) => b.blockType === type)?.content ?? ""}
              onChange={(content) => handleBlockChange(type, content)}
            />
          </div>
        ))}
      </div>

      {/* 저장/스테이징 바 */}
      <BmcStagingBar dirty={dirty} saving={saving} onSave={handleSave} />
    </div>
  );
}
```

#### BmcBlockEditor (`packages/web/src/components/feature/ax-bd/BmcBlockEditor.tsx`)

```typescript
"use client";

interface BmcBlockEditorProps {
  label: string;
  blockType: string;
  content: string;
  onChange: (content: string) => void;
}

export default function BmcBlockEditor({
  label,
  blockType,
  content,
  onChange,
}: BmcBlockEditorProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border bg-card p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      <textarea
        className="flex-1 resize-none bg-transparent text-sm outline-none"
        placeholder={`${label} 입력...`}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        maxLength={2000}
      />
    </div>
  );
}
```

#### BmcStagingBar (`packages/web/src/components/feature/ax-bd/BmcStagingBar.tsx`)

```typescript
"use client";

interface BmcStagingBarProps {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}

export default function BmcStagingBar({ dirty, saving, onSave }: BmcStagingBarProps) {
  if (!dirty) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 shadow-lg">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between">
        <span className="text-sm text-muted-foreground">
          변경 사항이 있어요. 저장하면 Git 커밋 대기 상태가 돼요.
        </span>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "변경 사항 저장"}
        </button>
      </div>
    </div>
  );
}
```

---

## 3. F198 — 아이디어 등록 및 태그

### 3.1 API 설계

#### 라우트: `packages/api/src/routes/ax-bd-ideas.ts`

```typescript
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { IdeaService } from "../services/idea-service.js";
import { CreateIdeaSchema, UpdateIdeaSchema } from "../schemas/idea.schema.js";

export const axBdIdeasRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /ax-bd/ideas — 아이디어 등록
axBdIdeasRoute.post("/ax-bd/ideas", async (c) => {
  const body = await c.req.json();
  const parsed = CreateIdeaSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }
  const svc = new IdeaService(c.env.DB);
  const idea = await svc.create(c.get("orgId"), c.get("userId"), parsed.data);
  return c.json(idea, 201);
});

// GET /ax-bd/ideas — 아이디어 목록 (태그 필터)
axBdIdeasRoute.get("/ax-bd/ideas", async (c) => {
  const svc = new IdeaService(c.env.DB);
  const { page, limit, tag } = c.req.query();
  const result = await svc.list(c.get("orgId"), {
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    tag: tag || undefined,
  });
  return c.json(result);
});

// GET /ax-bd/ideas/:id — 아이디어 상세
axBdIdeasRoute.get("/ax-bd/ideas/:id", async (c) => {
  const svc = new IdeaService(c.env.DB);
  const idea = await svc.getById(c.get("orgId"), c.req.param("id"));
  if (!idea) return c.json({ error: "Idea not found" }, 404);
  return c.json(idea);
});

// PUT /ax-bd/ideas/:id — 아이디어 수정
axBdIdeasRoute.put("/ax-bd/ideas/:id", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateIdeaSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }
  const svc = new IdeaService(c.env.DB);
  const idea = await svc.update(c.get("orgId"), c.req.param("id"), parsed.data);
  if (!idea) return c.json({ error: "Idea not found" }, 404);
  return c.json(idea);
});

// DELETE /ax-bd/ideas/:id — 아이디어 삭제 (soft delete)
axBdIdeasRoute.delete("/ax-bd/ideas/:id", async (c) => {
  const svc = new IdeaService(c.env.DB);
  const ok = await svc.softDelete(c.get("orgId"), c.req.param("id"));
  if (!ok) return c.json({ error: "Idea not found" }, 404);
  return c.json({ success: true });
});
```

**엔드포인트 요약:**

| # | 메서드 | 경로 | 설명 |
|---|--------|------|------|
| 1 | POST | `/ax-bd/ideas` | 아이디어 등록 |
| 2 | GET | `/ax-bd/ideas` | 아이디어 목록 (태그 필터) |
| 3 | GET | `/ax-bd/ideas/:id` | 아이디어 상세 |
| 4 | PUT | `/ax-bd/ideas/:id` | 아이디어 수정 |
| 5 | DELETE | `/ax-bd/ideas/:id` | 아이디어 삭제 (soft delete) |

### 3.2 서비스: `packages/api/src/services/idea-service.ts`

```typescript
// ─── DB Row 타입 ───
interface IdeaRow {
  id: string;
  title: string;
  description: string | null;
  tags: string | null; // JSON array
  git_ref: string;
  author_id: string;
  org_id: string;
  sync_status: string;
  is_deleted: number;
  created_at: number;
  updated_at: number;
}

// ─── API 타입 ───
export interface Idea {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  createdAt: number;
  updatedAt: number;
}

function toIdea(row: IdeaRow): Idea {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: row.tags ? JSON.parse(row.tags) : [],
    gitRef: row.git_ref,
    authorId: row.author_id,
    orgId: row.org_id,
    syncStatus: row.sync_status as Idea["syncStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class IdeaService {
  constructor(private db: D1Database) {}

  async create(orgId: string, userId: string, data: { title: string; description?: string; tags?: string[] }): Promise<Idea> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO ax_ideas (id, title, description, tags, git_ref, author_id, org_id, sync_status, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, 'pending', 0, ?, ?)`
      )
      .bind(id, data.title, data.description ?? null, data.tags ? JSON.stringify(data.tags) : null, userId, orgId, now, now)
      .run();

    return this.getById(orgId, id) as Promise<Idea>;
  }

  async getById(orgId: string, id: string): Promise<Idea | null> {
    const row = await this.db
      .prepare("SELECT * FROM ax_ideas WHERE id = ? AND org_id = ? AND is_deleted = 0")
      .bind(id, orgId)
      .first<IdeaRow>();
    return row ? toIdea(row) : null;
  }

  async list(orgId: string, opts: { page: number; limit: number; tag?: string }) {
    const offset = (opts.page - 1) * opts.limit;
    let sql = "SELECT * FROM ax_ideas WHERE org_id = ? AND is_deleted = 0";
    const params: unknown[] = [orgId];

    if (opts.tag) {
      // JSON array 내 태그 검색 (SQLite JSON 함수)
      sql += " AND tags LIKE ?";
      params.push(`%"${opts.tag}"%`);
    }

    sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
    params.push(opts.limit, offset);

    const { results } = await this.db
      .prepare(sql)
      .bind(...params)
      .all<IdeaRow>();

    const countSql = opts.tag
      ? "SELECT COUNT(*) as total FROM ax_ideas WHERE org_id = ? AND is_deleted = 0 AND tags LIKE ?"
      : "SELECT COUNT(*) as total FROM ax_ideas WHERE org_id = ? AND is_deleted = 0";
    const countParams: unknown[] = opts.tag ? [orgId, `%"${opts.tag}"%`] : [orgId];

    const countRow = await this.db
      .prepare(countSql)
      .bind(...countParams)
      .first<{ total: number }>();

    return {
      items: (results ?? []).map(toIdea),
      total: countRow?.total ?? 0,
      page: opts.page,
      limit: opts.limit,
    };
  }

  async update(orgId: string, id: string, data: { title?: string; description?: string; tags?: string[] }): Promise<Idea | null> {
    const existing = await this.getById(orgId, id);
    if (!existing) return null;

    const now = Date.now();
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.title !== undefined) {
      updates.push("title = ?");
      params.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      params.push(data.description);
    }
    if (data.tags !== undefined) {
      updates.push("tags = ?");
      params.push(JSON.stringify(data.tags));
    }

    updates.push("updated_at = ?", "sync_status = 'pending'");
    params.push(now, id, orgId);

    await this.db
      .prepare(`UPDATE ax_ideas SET ${updates.join(", ")} WHERE id = ? AND org_id = ?`)
      .bind(...params)
      .run();

    return this.getById(orgId, id);
  }

  async softDelete(orgId: string, id: string): Promise<boolean> {
    const result = await this.db
      .prepare("UPDATE ax_ideas SET is_deleted = 1, updated_at = ? WHERE id = ? AND org_id = ?")
      .bind(Date.now(), id, orgId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }
}
```

### 3.3 스키마: `packages/api/src/schemas/idea.schema.ts`

```typescript
import { z } from "@hono/zod-openapi";

export const CreateIdeaSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
}).openapi("CreateIdea");

export const UpdateIdeaSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(200).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
}).openapi("UpdateIdea");

export const IdeaSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  gitRef: z.string(),
  authorId: z.string(),
  orgId: z.string(),
  syncStatus: z.enum(["synced", "pending", "failed"]),
  createdAt: z.number(),
  updatedAt: z.number(),
}).openapi("Idea");
```

### 3.4 D1 마이그레이션: `0045_ax_ideas.sql`

```sql
CREATE TABLE ax_ideas (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT CHECK(length(description) <= 200),
  tags        TEXT,
  git_ref     TEXT NOT NULL,
  author_id   TEXT NOT NULL,
  org_id      TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
              CHECK(sync_status IN ('synced', 'pending', 'failed')),
  is_deleted  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_ax_ideas_author   ON ax_ideas(author_id);
CREATE INDEX idx_ax_ideas_org      ON ax_ideas(org_id);
CREATE INDEX idx_ax_ideas_tags     ON ax_ideas(tags);
CREATE INDEX idx_ax_ideas_updated  ON ax_ideas(updated_at DESC);
```

### 3.5 Web 컴포넌트 설계

#### IdeaListPage (`packages/web/src/components/feature/ax-bd/IdeaListPage.tsx`)

```typescript
"use client";

import { useState, useEffect } from "react";
import { ApiClient } from "@/lib/api-client";
import TagFilter from "./TagFilter";
import IdeaCreateForm from "./IdeaCreateForm";

export default function IdeaListPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);

  const fetchIdeas = async () => {
    const client = new ApiClient();
    const params = selectedTag ? `?tag=${encodeURIComponent(selectedTag)}` : "";
    const data = await client.get(`/ax-bd/ideas${params}`);
    setIdeas(data.items);
  };

  useEffect(() => { fetchIdeas(); }, [selectedTag]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">사업 아이디어</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          새 아이디어
        </button>
      </div>

      <TagFilter onSelect={setSelectedTag} selected={selectedTag} />

      {showForm && (
        <IdeaCreateForm
          onCreated={() => { setShowForm(false); fetchIdeas(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea) => (
          <a key={idea.id} href={`/ax-bd/ideas/${idea.id}`}
            className="rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <h3 className="font-semibold">{idea.title}</h3>
            {idea.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{idea.description}</p>
            )}
            <div className="mt-2 flex gap-1">
              {idea.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{tag}</span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
```

---

## 4. 라우트 등록

**`packages/api/src/index.ts`** 수정 (최소):

```typescript
import { axBdBmcRoute } from "./routes/ax-bd-bmc.js";
import { axBdIdeasRoute } from "./routes/ax-bd-ideas.js";

// 기존 라우트 등록 블록에 추가
app.route("/api", axBdBmcRoute);
app.route("/api", axBdIdeasRoute);
```

---

## 5. Shared 타입

**`packages/shared/src/ax-bd.ts`** (신규):

```typescript
// AX BD 모듈 공유 타입

export type BmcBlockType =
  | "customer_segments"
  | "value_propositions"
  | "channels"
  | "customer_relationships"
  | "revenue_streams"
  | "key_resources"
  | "key_activities"
  | "key_partnerships"
  | "cost_structure";

export interface BmcBlock {
  blockType: BmcBlockType;
  content: string | null;
  updatedAt: number;
}

export interface Bmc {
  id: string;
  ideaId: string | null;
  title: string;
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  blocks: BmcBlock[];
  createdAt: number;
  updatedAt: number;
}

export interface Idea {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  createdAt: number;
  updatedAt: number;
}
```

---

## 6. 테스트 설계

### API 테스트 (`packages/api/src/__tests__/`)

| 테스트 파일 | 테스트 케이스 | 수 |
|------------|-------------|:--:|
| `ax-bd-bmc.test.ts` | BMC 생성(9블록 초기화), 목록 조회, 상세 조회(블록 포함), 블록 업데이트, soft delete, staging, 유효성 검증 오류, 404 처리 | 15 |
| `ax-bd-ideas.test.ts` | 아이디어 생성, 목록 조회, 태그 필터링, 상세 조회, 수정, soft delete, 유효성(제목 빈칸/설명 200자 초과), 404 처리 | 15 |
| **합계** | | **30** |

### Web 테스트 (`packages/web/src/__tests__/ax-bd/`)

| 테스트 파일 | 테스트 케이스 | 수 |
|------------|-------------|:--:|
| `bmc-editor.test.tsx` | 9블록 렌더링, 블록 편집, 저장 버튼, staging bar 표시 | 8 |
| `idea-list.test.tsx` | 목록 렌더링, 태그 필터, 생성 폼 열기, 유효성 오류 표시 | 8 |
| **합계** | | **16** |

---

## 7. Worker 분배 최종

```
Worker 1 (BE) — 허용 파일 15개:
  packages/api/src/routes/ax-bd-bmc.ts          (신규)
  packages/api/src/routes/ax-bd-ideas.ts         (신규)
  packages/api/src/services/bmc-service.ts       (신규)
  packages/api/src/services/idea-service.ts      (신규)
  packages/api/src/schemas/bmc.schema.ts         (신규)
  packages/api/src/schemas/idea.schema.ts        (신규)
  packages/api/src/db/migrations/0045_ax_ideas.sql   (신규)
  packages/api/src/db/migrations/0046_ax_bmcs.sql    (신규)
  packages/shared/src/ax-bd.ts                   (신규)
  packages/api/src/index.ts                      (라우트 등록 2행 추가)
  packages/api/src/__tests__/ax-bd-bmc.test.ts   (신규)
  packages/api/src/__tests__/ax-bd-ideas.test.ts (신규)

Worker 2 (FE) — 허용 파일 16개:
  packages/web/src/app/(app)/ax-bd/page.tsx              (신규)
  packages/web/src/app/(app)/ax-bd/bmc/page.tsx          (신규)
  packages/web/src/app/(app)/ax-bd/bmc/new/page.tsx      (신규)
  packages/web/src/app/(app)/ax-bd/bmc/[id]/page.tsx     (신규)
  packages/web/src/app/(app)/ax-bd/ideas/page.tsx        (신규)
  packages/web/src/app/(app)/ax-bd/ideas/[id]/page.tsx   (신규)
  packages/web/src/components/feature/ax-bd/BmcEditorPage.tsx    (신규)
  packages/web/src/components/feature/ax-bd/BmcBlockEditor.tsx   (신규)
  packages/web/src/components/feature/ax-bd/BmcListPage.tsx      (신규)
  packages/web/src/components/feature/ax-bd/BmcStagingBar.tsx    (신규)
  packages/web/src/components/feature/ax-bd/IdeaListPage.tsx     (신규)
  packages/web/src/components/feature/ax-bd/IdeaCreateForm.tsx   (신규)
  packages/web/src/components/feature/ax-bd/IdeaDetailPage.tsx   (신규)
  packages/web/src/components/feature/ax-bd/TagFilter.tsx        (신규)
  packages/web/src/lib/api-client.ts             (ax-bd 섹션 추가)
  packages/web/src/__tests__/ax-bd/*.test.tsx    (신규)
```

---

## 8. 구현 순서

```
Step 1: D1 마이그레이션 (0045, 0046)
  ↓
Step 2: Shared 타입 (ax-bd.ts)
  ↓
Step 3: Worker 1 BE (스키마 → 서비스 → 라우트 → 테스트) + Worker 2 FE (페이지 → 컴포넌트 → 테스트)
  ↓
Step 4: 라우트 등록 (index.ts)
  ↓
Step 5: 통합 검증 (typecheck + lint + test)
```
