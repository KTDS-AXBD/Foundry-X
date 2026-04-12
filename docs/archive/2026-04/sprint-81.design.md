---
code: FX-DSGN-081
title: "Sprint 81 — F236 Offering Pack + F238 MVP 추적 + F240 IR Bottom-up 채널 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-PLAN-081]] Sprint 81 Plan"
  - "[[FX-REQ-228]] Offering Pack 생성"
  - "[[FX-REQ-230]] MVP 추적 + 자동화"
  - "[[FX-REQ-232]] IR Bottom-up 채널"
---

# Sprint 81 Design — Offering Pack + MVP 추적 + IR Bottom-up 채널

## 1. 개요

BD 파이프라인 후반부 완성: 패키징(F236) + 추적(F238) + 수집(F240).
Sprint 79의 파이프라인/알림/의사결정 인프라 위에 Offering Pack 번들링, MVP 상태 추적, IR 제안 채널을 추가한다.

## 2. 아키텍처

```
packages/api/src/
├── db/migrations/
│   ├── 0070_offering_packs.sql        # F236 — Offering Pack + 항목
│   ├── 0071_mvp_tracking.sql          # F238 — MVP 추적 + 상태 이력
│   └── 0072_ir_proposals.sql          # F240 — IR 제안
├── services/
│   ├── offering-pack-service.ts       # F236 — Offering Pack CRUD + 공유
│   ├── mvp-tracking-service.ts        # F238 — MVP 상태 추적 + 이력
│   └── ir-proposal-service.ts         # F240 — IR 제안 + biz-item 변환
├── schemas/
│   ├── offering-pack.schema.ts        # F236 — Zod 스키마
│   ├── mvp-tracking.schema.ts         # F238 — Zod 스키마
│   └── ir-proposal.schema.ts          # F240 — Zod 스키마
├── routes/
│   ├── offering-packs.ts              # F236 — 6 endpoints
│   ├── mvp-tracking.ts                # F238 — 5 endpoints
│   └── ir-proposals.ts                # F240 — 5 endpoints
└── __tests__/
    ├── offering-packs.test.ts         # F236 테스트
    ├── offering-pack-service.test.ts  # F236 서비스 테스트
    ├── mvp-tracking.test.ts           # F238 테스트
    ├── mvp-tracking-service.test.ts   # F238 서비스 테스트
    ├── ir-proposals.test.ts           # F240 테스트
    └── ir-proposal-service.test.ts    # F240 서비스 테스트

packages/web/src/
├── app/(app)/
│   ├── offering-packs/page.tsx        # Offering Pack 목록/생성
│   ├── mvp-tracking/page.tsx          # MVP 추적 대시보드
│   └── ir-proposals/page.tsx          # IR 제안 목록/제출
├── components/feature/
│   ├── offering-packs/
│   │   └── offering-pack-detail.tsx   # 팩 상세 + 항목 관리
│   ├── mvp-tracking/
│   │   └── mvp-status-timeline.tsx    # 상태 전환 타임라인
│   └── ir-proposals/
│       └── ir-proposal-form.tsx       # 제안 등록 폼
└── __tests__/
    ├── offering-packs.test.tsx        # Offering Pack 테스트
    ├── mvp-tracking.test.tsx          # MVP 추적 테스트
    └── ir-proposals.test.tsx          # IR 제안 테스트
```

## 3. 상세 설계

### 3.1 D1 마이그레이션

#### 0070_offering_packs.sql

```sql
-- F236: Offering Pack 번들 + 항목
CREATE TABLE IF NOT EXISTS offering_packs (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','review','approved','shared')),
  created_by TEXT NOT NULL,
  share_token TEXT UNIQUE,
  share_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE TABLE IF NOT EXISTS offering_pack_items (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  item_type TEXT NOT NULL
    CHECK(item_type IN ('proposal','demo_link','tech_review','pricing','prototype','bmc','custom')),
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pack_id) REFERENCES offering_packs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_offering_packs_biz_item ON offering_packs(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_offering_packs_org ON offering_packs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_offering_pack_items_pack ON offering_pack_items(pack_id, sort_order);
```

#### 0071_mvp_tracking.sql

```sql
-- F238: MVP 상태 추적 + 이력
CREATE TABLE IF NOT EXISTS mvp_tracking (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'in_dev'
    CHECK(status IN ('in_dev','testing','released')),
  repo_url TEXT,
  deploy_url TEXT,
  tech_stack TEXT,
  assigned_to TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE TABLE IF NOT EXISTS mvp_status_history (
  id TEXT PRIMARY KEY,
  mvp_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (mvp_id) REFERENCES mvp_tracking(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mvp_tracking_biz_item ON mvp_tracking(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_mvp_tracking_org ON mvp_tracking(org_id, status);
CREATE INDEX IF NOT EXISTS idx_mvp_status_history_mvp ON mvp_status_history(mvp_id, created_at DESC);
```

#### 0072_ir_proposals.sql

```sql
-- F240: IR Bottom-up 제안
CREATE TABLE IF NOT EXISTS ir_proposals (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK(category IN ('technology','market','process','partnership','other')),
  rationale TEXT,
  expected_impact TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK(status IN ('submitted','under_review','approved','rejected')),
  submitted_by TEXT NOT NULL,
  reviewed_by TEXT,
  review_comment TEXT,
  biz_item_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE INDEX IF NOT EXISTS idx_ir_proposals_org ON ir_proposals(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ir_proposals_submitter ON ir_proposals(submitted_by, created_at DESC);
```

### 3.2 서비스 레이어

#### OfferingPackService

```typescript
export class OfferingPackService {
  constructor(private db: D1Database) {}

  // Offering Pack 생성 (draft 상태)
  async create(input: CreateOfferingPackInput): Promise<OfferingPack>

  // 목록 조회 (org별, 상태 필터)
  async list(orgId: string, filters?: OfferingPackFilters): Promise<OfferingPack[]>

  // 상세 조회 + 항목 목록
  async getById(id: string, orgId: string): Promise<OfferingPackDetail | null>

  // 항목 추가
  async addItem(packId: string, input: CreatePackItemInput): Promise<OfferingPackItem>

  // 상태 변경 (draft→review→approved→shared)
  async updateStatus(id: string, orgId: string, status: OfferingPackStatus, userId: string): Promise<void>

  // 공유 링크 생성
  async createShareLink(id: string, orgId: string, expiresInDays?: number): Promise<{ token: string; expiresAt: string | null }>
}
```

#### MvpTrackingService

```typescript
export class MvpTrackingService {
  constructor(private db: D1Database) {}

  // MVP 등록 (biz-item 연결)
  async create(input: CreateMvpInput): Promise<MvpTracking>

  // 목록 조회 (org별, 상태 필터)
  async list(orgId: string, filters?: MvpFilters): Promise<MvpTracking[]>

  // 상세 조회
  async getById(id: string, orgId: string): Promise<MvpTracking | null>

  // 상태 변경 + 이력 기록 + 알림 발송
  async updateStatus(id: string, orgId: string, toStatus: MvpStatus, userId: string, reason?: string): Promise<void>

  // 상태 변경 이력 조회
  async getHistory(mvpId: string): Promise<MvpStatusHistory[]>
}
```

#### IrProposalService

```typescript
export class IrProposalService {
  constructor(private db: D1Database) {}

  // 제안 제출
  async submit(input: CreateIrProposalInput): Promise<IrProposal>

  // 제안 목록 (org별, 상태 필터)
  async list(orgId: string, filters?: IrProposalFilters): Promise<IrProposal[]>

  // 제안 상세
  async getById(id: string, orgId: string): Promise<IrProposal | null>

  // 승인 → biz-item 자동 생성 + REGISTERED 단계 진입
  async approve(id: string, orgId: string, reviewerId: string, comment?: string): Promise<{ proposal: IrProposal; bizItemId: string }>

  // 반려 (사유 기록)
  async reject(id: string, orgId: string, reviewerId: string, comment: string): Promise<IrProposal>
}
```

### 3.3 Zod 스키마

#### offering-pack.schema.ts

```typescript
import { z } from "zod";

export const OFFERING_PACK_STATUSES = ["draft", "review", "approved", "shared"] as const;
export type OfferingPackStatus = (typeof OFFERING_PACK_STATUSES)[number];

export const PACK_ITEM_TYPES = [
  "proposal", "demo_link", "tech_review", "pricing", "prototype", "bmc", "custom"
] as const;

export const CreateOfferingPackSchema = z.object({
  bizItemId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export const CreatePackItemSchema = z.object({
  itemType: z.enum(PACK_ITEM_TYPES),
  title: z.string().min(1).max(200),
  content: z.string().max(10000).optional(),
  url: z.string().url().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const UpdatePackStatusSchema = z.object({
  status: z.enum(OFFERING_PACK_STATUSES),
});

export const CreatePackShareSchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const OfferingPackFilterSchema = z.object({
  status: z.enum(OFFERING_PACK_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

#### mvp-tracking.schema.ts

```typescript
import { z } from "zod";

export const MVP_STATUSES = ["in_dev", "testing", "released"] as const;
export type MvpStatus = (typeof MVP_STATUSES)[number];

export const CreateMvpSchema = z.object({
  bizItemId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  repoUrl: z.string().url().optional(),
  deployUrl: z.string().url().optional(),
  techStack: z.string().max(500).optional(),
  assignedTo: z.string().optional(),
});

export const UpdateMvpStatusSchema = z.object({
  status: z.enum(MVP_STATUSES),
  reason: z.string().max(1000).optional(),
});

export const MvpFilterSchema = z.object({
  status: z.enum(MVP_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

#### ir-proposal.schema.ts

```typescript
import { z } from "zod";

export const IR_CATEGORIES = ["technology", "market", "process", "partnership", "other"] as const;
export const IR_STATUSES = ["submitted", "under_review", "approved", "rejected"] as const;
export type IrProposalStatus = (typeof IR_STATUSES)[number];

export const CreateIrProposalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(5000),
  category: z.enum(IR_CATEGORIES),
  rationale: z.string().max(2000).optional(),
  expectedImpact: z.string().max(2000).optional(),
});

export const ReviewIrProposalSchema = z.object({
  comment: z.string().max(2000).optional(),
});

export const IrProposalFilterSchema = z.object({
  status: z.enum(IR_STATUSES).optional(),
  category: z.enum(IR_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

### 3.4 API 라우트 상세

#### offering-packs.ts (6 endpoints)

```
POST   /offering-packs              — create (draft 생성)
GET    /offering-packs              — list (org별, 상태 필터)
GET    /offering-packs/:id          — getById (상세 + 항목)
POST   /offering-packs/:id/items    — addItem (항목 추가)
PATCH  /offering-packs/:id/status   — updateStatus (상태 전환)
POST   /offering-packs/:id/share    — createShareLink (외부 공유)
```

- 상태 전환 유효성: draft→review→approved→shared (역순 불가)
- 공유 링크: `crypto.randomUUID().replace(/-/g, "")`, share 상태에서만 생성 가능

#### mvp-tracking.ts (5 endpoints)

```
POST   /mvp-tracking              — create (MVP 등록)
GET    /mvp-tracking              — list (org별, 상태 필터)
GET    /mvp-tracking/:id          — getById (상세)
PATCH  /mvp-tracking/:id/status   — updateStatus (상태 변경 + 이력 + 알림)
GET    /mvp-tracking/:id/history  — getHistory (상태 이력)
```

- 상태 전환: in_dev→testing→released (역순 허용 — testing→in_dev 가능)
- 상태 변경 시 NotificationService.create 호출 (stage_change 알림)

#### ir-proposals.ts (5 endpoints)

```
POST   /ir-proposals              — submit (제안 제출)
GET    /ir-proposals              — list (org별, 상태/카테고리 필터)
GET    /ir-proposals/:id          — getById (상세)
POST   /ir-proposals/:id/approve  — approve (승인 → biz-item 생성)
POST   /ir-proposals/:id/reject   — reject (반려 + 사유)
```

- approve 시:
  1. ir_proposals.status → 'approved'
  2. biz_items 테이블에 새 아이템 생성 (source='ir_channel', title/description 복사)
  3. pipeline_stages에 REGISTERED 단계 삽입
  4. ir_proposals.biz_item_id 업데이트
  5. NotificationService.create (제안자에게 승인 알림)

### 3.5 Offering Pack 상태 전환 로직

```
draft → review     (작성자가 리뷰 요청)
review → approved  (팀장 승인)
approved → shared  (외부 공유 링크 생성 시 자동)
```

### 3.6 IR 제안 → biz-item 변환 매핑

```
ir_proposals             → biz_items
────────────────────────────────────
title                    → title
description              → description
category                 → category (매핑 필요)
submitted_by             → created_by
'ir_channel'             → source
ir_proposals.id          → source_ref
```

### 3.7 Web 컴포넌트 설계

#### OfferingPackPage

- 상단: 팩 목록 (카드 그리드), 상태 필터 탭 (draft/review/approved/shared)
- 생성 버튼: 제목/설명 입력 → biz-item 선택 → draft 생성
- 카드: 제목, biz-item 이름, 상태 배지, 항목 수, 생성일

#### OfferingPackDetail

- 메타 정보 (제목, 상태, biz-item)
- 항목 목록 (타입 아이콘 + 제목 + 링크/내용)
- 항목 추가 폼 (타입 선택, 제목, URL/내용)
- 상태 변경 버튼
- 공유 링크 생성/복사 (approved 이후)

#### MvpTrackingPage

- MVP 목록 (테이블 뷰), 상태 필터
- 각 행: 제목, biz-item, 상태 배지, 담당자, deploy URL
- 등록 버튼 → MVP 정보 입력 폼

#### MvpStatusTimeline

- 수직 타임라인 뷰
- 각 노드: 상태, 변경일, 변경자, 사유
- 현재 상태 강조

#### IrProposalPage

- 제안 목록 (카드 뷰), 상태/카테고리 필터
- 제안 카드: 제목, 카테고리 배지, 상태, 제안자, 제출일
- 팀장: 승인/반려 버튼 (상세 뷰)

#### IrProposalForm

- 필드: 제목, 설명 (최소 10자), 카테고리 드롭다운, 제안 근거, 예상 효과
- 제출 버튼 → submitted 상태

## 4. 테스트 전략

### 4.1 API 라우트 테스트

| 테스트 파일 | 예상 수 | 주요 케이스 |
|------------|---------|------------|
| `offering-packs.test.ts` | ~16 | CRUD + 항목추가 + 상태전환 + 공유링크 + 404/400 |
| `offering-pack-service.test.ts` | ~8 | 생성/상태전환/공유토큰 로직 |
| `mvp-tracking.test.ts` | ~12 | CRUD + 상태변경 + 이력 + 알림연동 |
| `mvp-tracking-service.test.ts` | ~6 | 상태전환/이력기록 로직 |
| `ir-proposals.test.ts` | ~14 | 제출/목록/승인/반려 + biz-item생성 + 필터 |
| `ir-proposal-service.test.ts` | ~8 | 승인→biz-item변환/파이프라인등록 로직 |
| **합계** | **~64** | |

### 4.2 Web 테스트

| 테스트 파일 | 예상 수 | 주요 케이스 |
|------------|---------|------------|
| `offering-packs.test.tsx` | ~6 | 목록/상세/항목추가/상태변경 렌더링 |
| `mvp-tracking.test.tsx` | ~5 | 목록/상태변경/타임라인 렌더링 |
| `ir-proposals.test.tsx` | ~5 | 폼제출/목록/승인/반려 렌더링 |
| **합계** | **~16** | |

### 4.3 총계: ~80 tests

## 5. Worker 파일 매핑

### Worker 1: D1 마이그레이션 + 스키마 + 서비스

**수정 허용 파일:**
- `packages/api/src/db/migrations/0070_offering_packs.sql`
- `packages/api/src/db/migrations/0071_mvp_tracking.sql`
- `packages/api/src/db/migrations/0072_ir_proposals.sql`
- `packages/api/src/schemas/offering-pack.schema.ts`
- `packages/api/src/schemas/mvp-tracking.schema.ts`
- `packages/api/src/schemas/ir-proposal.schema.ts`
- `packages/api/src/services/offering-pack-service.ts`
- `packages/api/src/services/mvp-tracking-service.ts`
- `packages/api/src/services/ir-proposal-service.ts`
- `packages/api/src/__tests__/offering-pack-service.test.ts`
- `packages/api/src/__tests__/mvp-tracking-service.test.ts`
- `packages/api/src/__tests__/ir-proposal-service.test.ts`

### Worker 2: API 라우트 + 라우트 테스트

**수정 허용 파일:**
- `packages/api/src/routes/offering-packs.ts`
- `packages/api/src/routes/mvp-tracking.ts`
- `packages/api/src/routes/ir-proposals.ts`
- `packages/api/src/app.ts` (import + route 등록 3줄)
- `packages/api/src/__tests__/offering-packs.test.ts`
- `packages/api/src/__tests__/mvp-tracking.test.ts`
- `packages/api/src/__tests__/ir-proposals.test.ts`

### Worker 3: Web 컴포넌트 + 테스트

**수정 허용 파일:**
- `packages/web/src/app/(app)/offering-packs/page.tsx`
- `packages/web/src/components/feature/offering-packs/offering-pack-detail.tsx`
- `packages/web/src/app/(app)/mvp-tracking/page.tsx`
- `packages/web/src/components/feature/mvp-tracking/mvp-status-timeline.tsx`
- `packages/web/src/app/(app)/ir-proposals/page.tsx`
- `packages/web/src/components/feature/ir-proposals/ir-proposal-form.tsx`
- `packages/web/src/__tests__/offering-packs.test.tsx`
- `packages/web/src/__tests__/mvp-tracking.test.tsx`
- `packages/web/src/__tests__/ir-proposals.test.tsx`
