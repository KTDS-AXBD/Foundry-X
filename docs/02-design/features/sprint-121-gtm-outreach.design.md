---
code: FX-DSGN-121
title: Sprint 121 — 대고객 선제안 GTM Design (F299)
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 121
f-items: F299
phase: "Phase 11-C"
---

# Sprint 121 — 대고객 선제안 GTM Design (F299)

> **Summary**: GTM 6단계에 고객 선제안 워크플로 추가. 고객 프로필 + Offering Pack 기반 맞춤 제안서 AI 생성 + 아웃리치 파이프라인 추적.
>
> **Project**: Foundry-X  |  **Sprint**: 121  |  **Author**: Sinclair Seo  |  **Date**: 2026-04-03
> **Status**: Draft
> **Planning Doc**: [sprint-121-gtm-outreach.plan.md](../01-plan/features/sprint-121-gtm-outreach.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 기존 Offering Pack/Brief 인프라를 재사용하여 고객 맞춤 제안서를 AI 생성
2. 아웃리치 파이프라인(draft→sent→converted) 상태 추적으로 전환율 가시화
3. 사이드바 GTM 섹션 확장 — "프로젝트 현황" + "선제안" 2개 메뉴

### 1.2 Design Principles

- **기존 패턴 준수**: Hono route + Zod schema + Service 3-layer (offering-packs.ts 패턴)
- **Offering Pack 재사용**: 제안서 생성 시 OfferingPackService.getById()로 items join 활용
- **Workers AI + Fallback**: ProposalGenerator 패턴 — AI 실패 시 extractive summary

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────┐     ┌────────────────────────┐     ┌──────────┐
│  Web Pages   │────▶│  API Routes (Hono)     │────▶│  D1 DB   │
│  /gtm/*      │     │  gtm-customers.ts      │     │  0088    │
│              │     │  gtm-outreach.ts        │     │          │
└──────────────┘     └────────┬───────────────┘     └──────────┘
                              │
                    ┌─────────▼───────────┐
                    │  Services           │
                    │  ├ gtm-customer     │
                    │  ├ gtm-outreach     │
                    │  └ outreach-proposal │──▶ Workers AI (Llama 3.1)
                    │       ↓             │
                    │  OfferingPackService │ (기존 재사용)
                    └─────────────────────┘
```

### 2.2 Data Flow — 제안서 생성

```
POST /gtm/outreach/:id/generate
  → OutreachProposalService.generate()
    → GtmOutreachService.getById() — outreach 조회
    → GtmCustomerService.getById() — 고객 정보 조회
    → OfferingPackService.getById() — Offering Pack + items 조회
    → Workers AI: 고객 맞춤 프롬프트 → 제안서 Markdown
    → D1 UPDATE gtm_outreach SET proposal_content, status='proposal_ready'
  ← 200 { ...outreach, proposalContent }
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| outreach-proposal-service | OfferingPackService | Offering Pack + items 조회 |
| outreach-proposal-service | GtmCustomerService | 고객 프로필 (industry, size) |
| outreach-proposal-service | Workers AI (Ai binding) | LLM 제안서 생성 |
| gtm-outreach route | gtm-customer.schema, gtm-outreach.schema | 입력 검증 |
| Web gtm-outreach | api-client.ts | API 호출 함수 |

---

## 3. Data Model

### 3.1 D1 Migration — `0088_gtm_outreach.sql`

```sql
-- ─── Sprint 121: GTM 선제안 워크플로 (F299) ───

CREATE TABLE IF NOT EXISTS gtm_customers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_role TEXT,
  company_size TEXT CHECK(company_size IN ('startup', 'smb', 'mid', 'enterprise')),
  notes TEXT,
  tags TEXT,                          -- comma-separated
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_gtm_customers_org ON gtm_customers(org_id);
CREATE INDEX idx_gtm_customers_industry ON gtm_customers(org_id, industry);

CREATE TABLE IF NOT EXISTS gtm_outreach (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES gtm_customers(id),
  offering_pack_id TEXT REFERENCES offering_packs(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft', 'proposal_ready', 'sent', 'opened', 'responded', 'meeting_set', 'converted', 'declined', 'archived')),
  proposal_content TEXT,
  proposal_generated_at TEXT,
  sent_at TEXT,
  response_note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_gtm_outreach_org ON gtm_outreach(org_id);
CREATE INDEX idx_gtm_outreach_customer ON gtm_outreach(customer_id);
CREATE INDEX idx_gtm_outreach_status ON gtm_outreach(org_id, status);
```

### 3.2 Entity Relationships

```
[gtm_customers] 1 ──── N [gtm_outreach]
                              │
                              └──── 0..1 [offering_packs] (FK nullable)
```

### 3.3 테스트 헬퍼 SQL (vitest setup)

```sql
-- packages/api/src/__tests__/helpers/test-db.ts에 추가
CREATE TABLE IF NOT EXISTS gtm_customers ( ... );  -- 위와 동일
CREATE TABLE IF NOT EXISTS gtm_outreach ( ... );   -- 위와 동일
```

---

## 4. API Specification

### 4.1 Zod Schemas

#### `gtm-customer.schema.ts`

```typescript
import { z } from "zod";

export const COMPANY_SIZES = ["startup", "smb", "mid", "enterprise"] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export const CreateGtmCustomerSchema = z.object({
  companyName: z.string().min(1).max(200),
  industry: z.string().max(100).optional(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().max(200).optional(),
  contactRole: z.string().max(100).optional(),
  companySize: z.enum(COMPANY_SIZES).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.string().max(500).optional(),
});

export const UpdateGtmCustomerSchema = CreateGtmCustomerSchema.partial();

export const GtmCustomerFilterSchema = z.object({
  search: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  companySize: z.enum(COMPANY_SIZES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

#### `gtm-outreach.schema.ts`

```typescript
import { z } from "zod";

export const OUTREACH_STATUSES = [
  "draft", "proposal_ready", "sent", "opened",
  "responded", "meeting_set", "converted", "declined", "archived",
] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const CreateGtmOutreachSchema = z.object({
  customerId: z.string().min(1),
  offeringPackId: z.string().optional(),
  title: z.string().min(1).max(300),
});

export const UpdateOutreachStatusSchema = z.object({
  status: z.enum(OUTREACH_STATUSES),
  responseNote: z.string().max(5000).optional(),
});

export const GtmOutreachFilterSchema = z.object({
  status: z.enum(OUTREACH_STATUSES).optional(),
  customerId: z.string().optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

### 4.2 Endpoint Detail

#### 4.2.1 GTM Customers

**`POST /gtm/customers`** — 고객 등록

```
Request:  CreateGtmCustomerSchema
Response: 201 { id, orgId, companyName, ... }
Errors:   400 (validation)
```

**`GET /gtm/customers`** — 고객 목록

```
Query:    GtmCustomerFilterSchema (?search=&industry=&companySize=&limit=&offset=)
Response: 200 { items: GtmCustomer[], total: number }
```

**`GET /gtm/customers/:id`** — 고객 상세

```
Response: 200 GtmCustomer
Errors:   404
```

**`PATCH /gtm/customers/:id`** — 고객 수정

```
Request:  UpdateGtmCustomerSchema (partial)
Response: 200 GtmCustomer
Errors:   400, 404
```

#### 4.2.2 GTM Outreach

**`POST /gtm/outreach`** — 아웃리치 생성

```
Request:  CreateGtmOutreachSchema { customerId, offeringPackId?, title }
Response: 201 GtmOutreach
Errors:   400, 404 (customer not found)
```

**`GET /gtm/outreach`** — 아웃리치 목록

```
Query:    GtmOutreachFilterSchema (?status=&customerId=&search=&limit=&offset=)
Response: 200 { items: GtmOutreach[], total: number }
Note:     items에 customerName, offeringPackTitle join 포함
```

**`GET /gtm/outreach/stats`** — 파이프라인 통계 (목록보다 먼저 등록 — Hono 라우트 순서)

```
Response: 200 {
  total: number,
  byStatus: Record<OutreachStatus, number>,
  conversionRate: number    // converted / (total - draft - archived)
}
```

**`GET /gtm/outreach/:id`** — 아웃리치 상세

```
Response: 200 GtmOutreach (customerName, offeringPackTitle join)
Errors:   404
```

**`PATCH /gtm/outreach/:id/status`** — 상태 변경

```
Request:  UpdateOutreachStatusSchema { status, responseNote? }
Response: 200 GtmOutreach
Errors:   400 (invalid transition), 404
Transition Rules:
  - draft → proposal_ready (auto only, via /generate)
  - proposal_ready → sent
  - sent → opened | responded
  - opened → responded
  - responded → meeting_set
  - meeting_set → converted
  - any → declined | archived
```

**`DELETE /gtm/outreach/:id`** — 삭제 (draft만)

```
Response: 204
Errors:   400 (status != draft), 404
```

**`POST /gtm/outreach/:id/generate`** — 맞춤 제안서 생성

```
Request:  (body 없음)
Response: 200 GtmOutreach { proposalContent: "...", status: "proposal_ready" }
Errors:   400 (no offeringPackId), 404
Flow:
  1. outreach.offeringPackId 필수 확인
  2. OfferingPackService.getById() → pack + items
  3. GtmCustomerService.getById() → customer profile
  4. Workers AI 프롬프트:
     "다음 Offering Pack을 기반으로 {companyName} ({industry}, {companySize})
      {contactRole} 대상 맞춤 사업 제안서를 작성하세요..."
  5. fallback: pack items를 고객명 맞춤으로 연결한 extractive summary
  6. UPDATE status='proposal_ready', proposal_content, proposal_generated_at
```

---

## 5. Service Implementation

### 5.1 GtmCustomerService

```typescript
// packages/api/src/services/gtm-customer-service.ts

export class GtmCustomerService {
  constructor(private db: D1Database) {}

  async create(input: { orgId: string; createdBy: string } & CreateInput): Promise<GtmCustomer>
  async list(orgId: string, filter: FilterInput): Promise<{ items: GtmCustomer[]; total: number }>
  async getById(id: string, orgId: string): Promise<GtmCustomer | null>
  async update(id: string, orgId: string, input: Partial<CreateInput>): Promise<GtmCustomer>

  private mapRow(r: Record<string, unknown>): GtmCustomer  // snake_case → camelCase
}
```

**list() 검색 로직**: `WHERE org_id = ? AND (company_name LIKE ? OR contact_name LIKE ?)` + industry/companySize 필터

### 5.2 GtmOutreachService

```typescript
// packages/api/src/services/gtm-outreach-service.ts

export class GtmOutreachService {
  constructor(private db: D1Database) {}

  async create(input: { orgId: string; createdBy: string } & CreateInput): Promise<GtmOutreach>
  async list(orgId: string, filter: FilterInput): Promise<{ items: GtmOutreach[]; total: number }>
  async getById(id: string, orgId: string): Promise<GtmOutreach | null>
  async updateStatus(id: string, orgId: string, status: string, note?: string): Promise<GtmOutreach>
  async delete(id: string, orgId: string): Promise<void>
  async getStats(orgId: string): Promise<OutreachStats>
  async updateProposal(id: string, content: string): Promise<void>

  // list() — LEFT JOIN gtm_customers + offering_packs for customerName, offeringPackTitle
  // getStats() — GROUP BY status + conversion rate 계산
  // delete() — status='draft' 검증 후 삭제
}
```

**상태 전이 검증** (updateStatus 내부):

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: [],  // draft → proposal_ready는 generate에서만
  proposal_ready: ["sent", "declined", "archived"],
  sent: ["opened", "responded", "declined", "archived"],
  opened: ["responded", "declined", "archived"],
  responded: ["meeting_set", "declined", "archived"],
  meeting_set: ["converted", "declined", "archived"],
  converted: ["archived"],
  declined: ["archived"],
  archived: [],
};
```

### 5.3 OutreachProposalService

```typescript
// packages/api/src/services/outreach-proposal-service.ts

export class OutreachProposalService {
  constructor(
    private db: D1Database,
    private ai?: Ai,
  ) {}

  async generate(outreachId: string, orgId: string): Promise<GtmOutreach> {
    // 1. outreach 조회 → offeringPackId 필수 검증
    // 2. OfferingPackService.getById() → pack + items
    // 3. GtmCustomerService.getById() → customer
    // 4. AI 또는 fallback으로 제안서 생성
    // 5. gtm_outreach UPDATE (proposal_content, status, proposal_generated_at)
    // 6. 갱신된 outreach 반환
  }

  private async generateWithAi(pack: OfferingPackDetail, customer: GtmCustomer): Promise<string> {
    // Workers AI: @cf/meta/llama-3.1-8b-instruct
    // 프롬프트: 고객 맞춤 제안서 (companyName, industry, companySize, contactRole 반영)
  }

  private generateFallback(pack: OfferingPackDetail, customer: GtmCustomer): string {
    // Extractive: Offering Pack items를 고객명 맞춤으로 Markdown 조합
    // OfferingBriefService.generateContent() 패턴 참조
  }
}
```

**AI 프롬프트 설계**:

```
다음 Offering Pack 내용을 기반으로 {customer.companyName} ({customer.industry}, {sizeLabel}) 
{customer.contactRole} 대상 맞춤 사업 제안서를 작성하세요.

[요구사항]
1. 고객사의 업종 특성에 맞는 가치 제안 강조
2. {sizeLabel} 규모에 적합한 도입 방안 제시  
3. 1500자 이내 구조화된 Markdown

[Offering Pack: {pack.title}]
{pack.description}

[항목]
{items.map(i => `- ${i.itemType}: ${i.title}\n  ${i.content}`).join('\n')}
```

---

## 6. Route Implementation

### 6.1 gtm-customers.ts

```typescript
// packages/api/src/routes/gtm-customers.ts
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { GtmCustomerService } from "../services/gtm-customer-service.js";
import {
  CreateGtmCustomerSchema,
  UpdateGtmCustomerSchema,
  GtmCustomerFilterSchema,
} from "../schemas/gtm-customer.schema.js";

export const gtmCustomersRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /gtm/customers
// GET /gtm/customers
// GET /gtm/customers/:id
// PATCH /gtm/customers/:id
```

### 6.2 gtm-outreach.ts

```typescript
// packages/api/src/routes/gtm-outreach.ts
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { GtmOutreachService } from "../services/gtm-outreach-service.js";
import { OutreachProposalService } from "../services/outreach-proposal-service.js";
import {
  CreateGtmOutreachSchema,
  UpdateOutreachStatusSchema,
  GtmOutreachFilterSchema,
} from "../schemas/gtm-outreach.schema.js";

export const gtmOutreachRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// GET /gtm/outreach/stats     ← /gtm/outreach/:id 보다 먼저 등록 (Hono 순서)
// POST /gtm/outreach
// GET /gtm/outreach
// GET /gtm/outreach/:id
// PATCH /gtm/outreach/:id/status
// DELETE /gtm/outreach/:id
// POST /gtm/outreach/:id/generate
```

### 6.3 app.ts 등록

```typescript
// packages/api/src/app.ts에 추가
import { gtmCustomersRoute } from "./routes/gtm-customers.js";
import { gtmOutreachRoute } from "./routes/gtm-outreach.js";

// ─── Sprint 121: GTM 선제안 (F299) ───
app.route("/api", gtmCustomersRoute);
app.route("/api", gtmOutreachRoute);
```

---

## 7. Web Implementation

### 7.1 api-client.ts 추가 함수

```typescript
// ─── Sprint 121: GTM Outreach (F299) ───

export interface GtmCustomer {
  id: string; orgId: string; companyName: string;
  industry: string | null; contactName: string | null;
  contactEmail: string | null; contactRole: string | null;
  companySize: string | null; notes: string | null;
  tags: string | null; createdBy: string;
  createdAt: string; updatedAt: string;
}

export interface GtmOutreach {
  id: string; orgId: string; customerId: string;
  offeringPackId: string | null; title: string;
  status: string; proposalContent: string | null;
  proposalGeneratedAt: string | null; sentAt: string | null;
  responseNote: string | null; createdBy: string;
  createdAt: string; updatedAt: string;
  customerName?: string; offeringPackTitle?: string;
}

export interface OutreachStats {
  total: number;
  byStatus: Record<string, number>;
  conversionRate: number;
}

// Customers
export async function fetchGtmCustomers(params?: Record<string, string>): Promise<{ items: GtmCustomer[]; total: number }> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetchApi(`/gtm/customers${qs}`);
}

export async function createGtmCustomer(data: Partial<GtmCustomer>): Promise<GtmCustomer> {
  return postApi("/gtm/customers", data);
}

export async function fetchGtmCustomer(id: string): Promise<GtmCustomer> {
  return fetchApi(`/gtm/customers/${id}`);
}

export async function updateGtmCustomer(id: string, data: Partial<GtmCustomer>): Promise<GtmCustomer> {
  return patchApi(`/gtm/customers/${id}`, data);
}

// Outreach
export async function fetchGtmOutreachList(params?: Record<string, string>): Promise<{ items: GtmOutreach[]; total: number }> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetchApi(`/gtm/outreach${qs}`);
}

export async function createGtmOutreach(data: { customerId: string; offeringPackId?: string; title: string }): Promise<GtmOutreach> {
  return postApi("/gtm/outreach", data);
}

export async function fetchGtmOutreach(id: string): Promise<GtmOutreach> {
  return fetchApi(`/gtm/outreach/${id}`);
}

export async function updateOutreachStatus(id: string, data: { status: string; responseNote?: string }): Promise<GtmOutreach> {
  return patchApi(`/gtm/outreach/${id}/status`, data);
}

export async function deleteGtmOutreach(id: string): Promise<void> {
  return deleteApi(`/gtm/outreach/${id}`);
}

export async function generateOutreachProposal(id: string): Promise<GtmOutreach> {
  return postApi(`/gtm/outreach/${id}/generate`, {});
}

export async function fetchOutreachStats(): Promise<OutreachStats> {
  return fetchApi("/gtm/outreach/stats");
}
```

### 7.2 router.tsx 추가

```typescript
// ── 6단계 GTM ── (기존 line 63 이후)
{ path: "gtm/projects", lazy: () => import("@/routes/projects") },
{ path: "gtm/outreach", lazy: () => import("@/routes/gtm-outreach") },
{ path: "gtm/outreach/:id", lazy: () => import("@/routes/gtm-outreach-detail") },
```

### 7.3 sidebar.tsx 수정

```typescript
// GTM 그룹 items (line 183-185)
items: [
  { href: "/gtm/projects", label: "프로젝트 현황", icon: FolderKanban },
  { href: "/gtm/outreach", label: "선제안", icon: Send },  // ← 추가
],
```

`Send` 아이콘 import: `import { Send } from "lucide-react";`

### 7.4 gtm-outreach.tsx — 아웃리치 목록 페이지

```
┌──────────────────────────────────────────────────────────┐
│  선제안 관리                                    [+ 새 선제안]│
├──────────────────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │Draft│ │Sent │ │Resp.│ │Meet.│ │Conv.│  ← 통계 카드    │
│  │  3  │ │  5  │ │  2  │ │  1  │ │  4  │              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
├──────────────────────────────────────────────────────────┤
│  [상태 필터 ▼]  [검색: 고객명/제목________]               │
├──────────────────────────────────────────────────────────┤
│  제목              │ 고객사    │ 상태       │ 생성일      │
│─────────────────────────────────────────────────────────│
│  헬스케어 AI 제안   │ 삼성SDS  │ 🟢 sent    │ 2026-04-01 │
│  스마트팩토리 제안   │ LG CNS  │ 🔵 draft   │ 2026-04-02 │
│  ...               │         │            │            │
└──────────────────────────────────────────────────────────┘
```

**컴포넌트 구조**:
- 통계 카드: `OutreachStats` API → 상태별 카운트 + 전환율
- 필터: status dropdown + 검색 input → query param
- 테이블: `fetchGtmOutreachList()` 결과 렌더링
- 새 선제안 모달: 고객 선택(dropdown/검색) + Offering Pack 선택 + 제목

### 7.5 gtm-outreach-detail.tsx — 아웃리치 상세 페이지

```
┌────────────────────────────────────────────────────────────┐
│  ← 목록  │  헬스케어 AI 제안                    [상태: sent]│
├──────────────┬─────────────────────────────────────────────┤
│  고객 정보    │  제안서 내용                                 │
│              │                                             │
│  삼성SDS     │  # 헬스케어 AI 솔루션 제안서                  │
│  IT서비스    │                                             │
│  enterprise  │  ## 개요                                    │
│  김철수      │  귀사의 헬스케어 분야 디지털 전환을...          │
│  부장        │                                             │
│              │  ## 핵심 가치 제안                            │
│  ─────────  │  ...                                        │
│  메모        │                                             │
│  [텍스트 입력]│  [제안서 생성] [제안서 재생성]                 │
│              │                                             │
│  ─────────  ├─────────────────────────────────────────────┤
│  상태 변경   │  상태 이력                                   │
│  [▼ sent → │  • 04-02 draft 생성                          │
│    opened]  │  • 04-02 proposal_ready 제안서 생성           │
│  [변경]     │  • 04-03 sent 발송                           │
└──────────────┴─────────────────────────────────────────────┘
```

**컴포넌트 구조**:
- 좌측 패널: 고객 정보 카드 + 메모 입력 + 상태 변경 드롭다운
- 중앙: 제안서 Markdown 렌더링 (react-markdown + remark-gfm, 기존 사용 중) + 생성 버튼
- 하단: 상태 이력 (createdAt, proposalGeneratedAt, sentAt 기반 타임라인)

---

## 8. Shared Types

```typescript
// packages/shared/src/types.ts 맨 하단에 추가

// ─── Sprint 121: GTM Outreach (F299) ───

export type CompanySize = "startup" | "smb" | "mid" | "enterprise";

export type OutreachStatus =
  | "draft" | "proposal_ready" | "sent" | "opened"
  | "responded" | "meeting_set" | "converted" | "declined" | "archived";

export interface GtmCustomer {
  id: string;
  orgId: string;
  companyName: string;
  industry: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactRole: string | null;
  companySize: CompanySize | null;
  notes: string | null;
  tags: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GtmOutreach {
  id: string;
  orgId: string;
  customerId: string;
  offeringPackId: string | null;
  title: string;
  status: OutreachStatus;
  proposalContent: string | null;
  proposalGeneratedAt: string | null;
  sentAt: string | null;
  responseNote: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  offeringPackTitle?: string;
}

export interface OutreachStats {
  total: number;
  byStatus: Record<string, number>;
  conversionRate: number;
}
```

---

## 9. Error Handling

| Code | Endpoint | Cause | Handling |
|------|----------|-------|----------|
| 400 | POST /gtm/customers | Zod validation 실패 | `{ error, details }` |
| 400 | PATCH /:id/status | 잘못된 상태 전이 | `{ error: "Invalid transition from X to Y" }` |
| 400 | DELETE /:id | status != draft | `{ error: "Can only delete draft outreach" }` |
| 400 | POST /:id/generate | offeringPackId 없음 | `{ error: "Offering pack is required for generation" }` |
| 404 | GET /:id | 존재하지 않는 리소스 | `{ error: "Not found" }` |
| 404 | POST /outreach | customerId 미존재 | `{ error: "Customer not found" }` |

---

## 10. Test Plan

### 10.1 Test Scope

| Type | Target | Tool | Files |
|------|--------|------|-------|
| Service Unit | GtmCustomerService | Vitest + D1 mock | `gtm-customer-service.test.ts` |
| Service Unit | GtmOutreachService | Vitest + D1 mock | `gtm-outreach-service.test.ts` |
| Service Unit | OutreachProposalService | Vitest + D1 mock + AI mock | `outreach-proposal-service.test.ts` |
| Route Integration | /gtm/customers | Vitest + app.request() | `gtm-customers.test.ts` |
| Route Integration | /gtm/outreach | Vitest + app.request() | `gtm-outreach.test.ts` |
| Component | Web pages | Vitest + testing-library | `gtm-outreach.test.tsx` |

### 10.2 Key Test Cases

**GtmCustomerService (8)**:
- [ ] create — 정상 생성
- [ ] create — companyName 누락 시 에러
- [ ] list — org_id 필터 + 페이지네이션
- [ ] list — search (companyName LIKE)
- [ ] list — industry 필터
- [ ] getById — 정상 조회
- [ ] getById — 404
- [ ] update — partial 업데이트

**GtmOutreachService (10)**:
- [ ] create — 정상 생성 (status=draft)
- [ ] create — 존재하지 않는 customerId → 에러
- [ ] list — status 필터 + join (customerName)
- [ ] list — search (title LIKE)
- [ ] getById — join 포함 조회
- [ ] updateStatus — 유효한 전이 (proposal_ready → sent)
- [ ] updateStatus — 잘못된 전이 (draft → sent) → 에러
- [ ] updateStatus — responseNote 저장
- [ ] delete — draft만 삭제 가능
- [ ] getStats — 상태별 집계 + conversionRate

**OutreachProposalService (5)**:
- [ ] generate — AI 성공 시 proposalContent 저장 + status=proposal_ready
- [ ] generate — AI 실패 시 fallback extractive summary
- [ ] generate — offeringPackId 없으면 에러
- [ ] generate — 존재하지 않는 outreachId → 에러
- [ ] generateFallback — 고객명 맞춤 Markdown 출력 검증

**Route Tests (16)**:
- [ ] POST/GET/GET/:id/PATCH customers — CRUD 4건
- [ ] POST/GET/GET/stats/GET/:id/PATCH/DELETE/POST generate outreach — 7+건
- [ ] 인증 없이 요청 → 401
- [ ] 다른 org의 데이터 접근 → 404
- [ ] Zod validation 에러 → 400

**Web Tests (8)**:
- [ ] 목록 페이지 렌더링 + 통계 카드
- [ ] 빈 목록 → empty state
- [ ] 필터 변경 → API 재호출
- [ ] 상세 페이지 렌더링
- [ ] 제안서 생성 버튼 클릭 → API 호출
- [ ] 상태 변경 드롭다운
- [ ] 새 선제안 모달
- [ ] 로딩/에러 상태

---

## 11. Implementation Order (Checklist)

1. [ ] D1 마이그레이션 `0088_gtm_outreach.sql`
2. [ ] 테스트 헬퍼 SQL 추가 (`test-db.ts`)
3. [ ] Shared types 추가 (`packages/shared/src/types.ts`)
4. [ ] Zod schemas 2개 (`gtm-customer.schema.ts`, `gtm-outreach.schema.ts`)
5. [ ] `GtmCustomerService` 구현 + 테스트 (8)
6. [ ] `GtmOutreachService` 구현 + 테스트 (10)
7. [ ] `OutreachProposalService` 구현 + 테스트 (5)
8. [ ] `gtm-customers.ts` route 구현 + 테스트 (6)
9. [ ] `gtm-outreach.ts` route 구현 + 테스트 (10)
10. [ ] `app.ts` 라우트 등록 (import + app.route)
11. [ ] `api-client.ts` GTM 함수 추가
12. [ ] `router.tsx` 라우트 등록
13. [ ] `sidebar.tsx` GTM "선제안" 메뉴 추가
14. [ ] `gtm-outreach.tsx` 목록 페이지 + 테스트
15. [ ] `gtm-outreach-detail.tsx` 상세 페이지 + 테스트
16. [ ] typecheck + lint + build 검증

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial draft | Sinclair Seo |
