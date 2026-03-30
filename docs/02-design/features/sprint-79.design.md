---
code: FX-DSGN-079
title: "Sprint 79 — F232 파이프라인 대시보드 + F233 산출물 공유 + F239 의사결정 워크플로 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-PLAN-079]] Sprint 79 Plan"
  - "[[FX-REQ-224]] 파이프라인 통합 대시보드"
  - "[[FX-REQ-225]] 산출물 공유 시스템"
  - "[[FX-REQ-231]] 의사결정 워크플로"
---

# Sprint 79 Design — 파이프라인 + 공유 + 의사결정

## 1. 개요

BD 파이프라인 E2E 통합의 코어 삼각형: 가시성(F232) + 협업(F233) + 통제(F239).
기존 biz-items 엔드포인트 위에 파이프라인 단계 추적, 공유 링크, 알림, 의사결정 레이어를 추가한다.

## 2. 아키텍처

```
packages/api/src/
├── db/migrations/
│   ├── 0066_pipeline_stages.sql       # F232 — 파이프라인 단계
│   ├── 0067_share_links.sql           # F233 — 공유 링크
│   ├── 0068_notifications.sql         # F233 — 인앱 알림
│   └── 0069_decisions.sql             # F239 — 의사결정
├── services/
│   ├── pipeline-service.ts            # F232 — 파이프라인 CRUD + 통계
│   ├── share-link-service.ts          # F233 — 공유 링크 생성/조회/무효화
│   ├── notification-service.ts        # F233 — 알림 생성/조회/읽음
│   └── decision-service.ts            # F239 — 의사결정 등록/이력/통계
├── schemas/
│   ├── pipeline.schema.ts             # F232 — Zod 스키마
│   ├── share-link.schema.ts           # F233 — Zod 스키마
│   ├── notification.schema.ts         # F233 — Zod 스키마
│   └── decision.schema.ts             # F239 — Zod 스키마
├── routes/
│   ├── pipeline.ts                    # F232 — 5 endpoints
│   ├── share-links.ts                 # F233 — 4 endpoints
│   ├── notifications.ts               # F233 — 2 endpoints
│   └── decisions.ts                   # F239 — 4 endpoints
└── __tests__/
    ├── pipeline.test.ts               # F232 테스트
    ├── pipeline-service.test.ts       # F232 서비스 테스트
    ├── share-links.test.ts            # F233 테스트
    ├── notifications.test.ts          # F233 테스트
    └── decisions.test.ts              # F239 테스트

packages/web/src/
├── app/(app)/pipeline/
│   └── page.tsx                       # 파이프라인 메인 페이지
├── components/feature/
│   ├── pipeline/
│   │   ├── kanban-board.tsx           # 칸반 뷰
│   │   ├── pipeline-view.tsx          # 파이프라인 흐름도
│   │   └── item-card.tsx              # 아이템 카드
│   ├── sharing/
│   │   └── share-dialog.tsx           # 공유 다이얼로그
│   ├── notifications/
│   │   └── notification-list.tsx      # 알림 목록
│   └── decisions/
│       └── decision-panel.tsx         # 의사결정 패널
└── __tests__/
    ├── pipeline.test.tsx              # 파이프라인 테스트
    ├── sharing.test.tsx               # 공유 테스트
    └── decisions.test.tsx             # 의사결정 테스트
```

## 3. 상세 설계

### 3.1 파이프라인 단계 정의

BD 프로세스 7단계 (SPEC.md §3 BD 프로세스 + PRD 워크플로 기반):

```typescript
type PipelineStage =
  | "REGISTERED"      // 아이템 등록
  | "DISCOVERY"       // 발굴/분석 (Discovery 9기준)
  | "FORMALIZATION"   // 형상화 (BMC/PRD 작성)
  | "REVIEW"          // 리뷰/공유
  | "DECISION"        // 의사결정 (Go/Hold/Drop)
  | "OFFERING"        // Offering Pack / ORB/PRB
  | "MVP";            // MVP/PoC
```

### 3.2 D1 마이그레이션

#### 0066_pipeline_stages.sql

```sql
-- F232: 파이프라인 단계 추적
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'REGISTERED'
    CHECK(stage IN ('REGISTERED','DISCOVERY','FORMALIZATION','REVIEW','DECISION','OFFERING','MVP')),
  entered_at TEXT NOT NULL DEFAULT (datetime('now')),
  exited_at TEXT,
  entered_by TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_item ON pipeline_stages(biz_item_id, entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org ON pipeline_stages(org_id, stage);
```

#### 0067_share_links.sql

```sql
-- F233: 산출물 공유 링크
CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  access_level TEXT NOT NULL DEFAULT 'view'
    CHECK(access_level IN ('view','comment','edit')),
  expires_at TEXT,
  created_by TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_item ON share_links(biz_item_id);
```

#### 0068_notifications.sql

```sql
-- F233: 인앱 알림
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK(type IN ('stage_change','review_request','decision_made','share_created','comment_added')),
  biz_item_id TEXT,
  title TEXT NOT NULL,
  body TEXT,
  actor_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(org_id, created_at DESC);
```

#### 0069_decisions.sql

```sql
-- F239: 의사결정 이력
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  decision TEXT NOT NULL
    CHECK(decision IN ('GO','HOLD','DROP')),
  stage TEXT NOT NULL,
  comment TEXT NOT NULL,
  decided_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE INDEX IF NOT EXISTS idx_decisions_item ON decisions(biz_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_org ON decisions(org_id, created_at DESC);
```

### 3.3 서비스 레이어

#### PipelineService

```typescript
export class PipelineService {
  constructor(private db: D1Database) {}

  // 아이템의 현재 단계 조회 (latest pipeline_stages entry)
  async getCurrentStage(bizItemId: string): Promise<PipelineStageRecord | null>

  // 단계 전환 (새 row 삽입 + 이전 row exited_at 갱신)
  async advanceStage(bizItemId: string, orgId: string, newStage: string, userId: string, notes?: string): Promise<PipelineStageRecord>

  // 칸반 데이터: 단계별 아이템 그룹핑
  async getKanbanData(orgId: string, filters?: PipelineFilters): Promise<KanbanData>

  // 파이프라인 통계: 단계별 개수 + 평균 체류시간
  async getStats(orgId: string): Promise<PipelineStats>

  // 아이템 목록 (단계 필터 + 페이지네이션)
  async listItems(orgId: string, filters?: PipelineFilters): Promise<PaginatedResult<PipelineItem>>

  // 아이템 상세 + 전체 단계 이력
  async getItemDetail(bizItemId: string, orgId: string): Promise<PipelineItemDetail | null>
}
```

#### ShareLinkService

```typescript
export class ShareLinkService {
  constructor(private db: D1Database) {}

  // 공유 링크 생성 (crypto.randomUUID 토큰)
  async create(input: CreateShareLinkInput): Promise<ShareLink>

  // 내 공유 링크 목록
  async listByUser(orgId: string, userId: string): Promise<ShareLink[]>

  // 토큰으로 조회 (공유 페이지 접근 시)
  async getByToken(token: string): Promise<ShareLink | null>

  // 공유 링크 무효화 (revoked_at 설정)
  async revoke(id: string, orgId: string): Promise<void>
}
```

#### NotificationService

```typescript
export class NotificationService {
  constructor(private db: D1Database) {}

  // 알림 생성 (내부 호출 — 단계 전환/리뷰 요청/의사결정 시)
  async create(input: CreateNotificationInput): Promise<Notification>

  // 배치 알림 생성 (여러 수신자에게 동시 발송)
  async createBatch(inputs: CreateNotificationInput[]): Promise<void>

  // 내 알림 목록 (최신순, 페이지네이션)
  async listByRecipient(recipientId: string, orgId: string, opts?: { unreadOnly?: boolean; limit?: number; offset?: number }): Promise<Notification[]>

  // 읽음 처리
  async markAsRead(id: string, recipientId: string): Promise<void>

  // 안읽은 알림 수
  async countUnread(recipientId: string, orgId: string): Promise<number>
}
```

#### DecisionService

```typescript
export class DecisionService {
  constructor(private db: D1Database) {}

  // 의사결정 등록 (+ pipeline 단계 자동 전환 + 알림 발송)
  async create(input: CreateDecisionInput): Promise<Decision>

  // 아이템별 의사결정 이력
  async listByItem(bizItemId: string, orgId: string): Promise<Decision[]>

  // org 전체 의사결정 이력
  async listByOrg(orgId: string, opts?: { limit?: number; offset?: number }): Promise<Decision[]>

  // 의사결정 통계 (Go/Hold/Drop 비율)
  async getStats(orgId: string): Promise<DecisionStats>

  // 대기 중 의사결정 (REVIEW 단계 아이템 목록)
  async getPending(orgId: string): Promise<PendingDecisionItem[]>
}
```

### 3.4 Zod 스키마

#### pipeline.schema.ts

```typescript
import { z } from "zod";

export const PIPELINE_STAGES = [
  "REGISTERED", "DISCOVERY", "FORMALIZATION", "REVIEW", "DECISION", "OFFERING", "MVP"
] as const;

export const PipelineStageEnum = z.enum(PIPELINE_STAGES);

export const AdvanceStageSchema = z.object({
  stage: PipelineStageEnum,
  notes: z.string().optional(),
});

export const PipelineFilterSchema = z.object({
  stage: PipelineStageEnum.optional(),
  assignee: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

#### share-link.schema.ts

```typescript
import { z } from "zod";

export const CreateShareLinkSchema = z.object({
  bizItemId: z.string().min(1),
  accessLevel: z.enum(["view", "comment", "edit"]).default("view"),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const ReviewRequestSchema = z.object({
  recipientIds: z.array(z.string().min(1)).min(1).max(10),
  message: z.string().max(500).optional(),
});
```

#### notification.schema.ts

```typescript
import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "stage_change", "review_request", "decision_made", "share_created", "comment_added"
] as const;

export const NotificationFilterSchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

#### decision.schema.ts

```typescript
import { z } from "zod";

export const DecisionEnum = z.enum(["GO", "HOLD", "DROP"]);

export const CreateDecisionSchema = z.object({
  bizItemId: z.string().min(1),
  decision: DecisionEnum,
  comment: z.string().min(1).max(2000),
});

export const DecisionFilterSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

### 3.5 API 라우트 상세

#### pipeline.ts (5 endpoints)

```
GET  /pipeline/items          — listItems (필터 + 페이지네이션)
GET  /pipeline/items/:id      — getItemDetail (상세 + 단계 이력)
PATCH /pipeline/items/:id/stage — advanceStage (단계 전환)
GET  /pipeline/stats           — getStats (단계별 통계)
GET  /pipeline/kanban          — getKanbanData (칸반 뷰)
```

- 모든 엔드포인트: `orgId = c.get("orgId")`, `userId = jwtPayload.sub`
- advanceStage: 단계 전환 시 NotificationService.create 호출 (stage_change 알림)

#### share-links.ts (4 endpoints)

```
POST   /share-links              — create (공유 링크 생성)
GET    /share-links              — listByUser (내 공유 목록)
DELETE /share-links/:id          — revoke (무효화)
POST   /share-links/:id/review-request — reviewRequest (리뷰 요청 + 알림)
```

- reviewRequest: NotificationService.createBatch로 수신자 전원에게 review_request 알림
- 토큰 생성: `crypto.randomUUID().replace(/-/g, "")`

#### notifications.ts (2 endpoints)

```
GET   /notifications           — listByRecipient (내 알림)
PATCH /notifications/:id/read  — markAsRead (읽음 처리)
```

#### decisions.ts (4 endpoints)

```
POST /decisions          — create (Go/Hold/Drop 등록)
GET  /decisions          — listByOrg (이력 조회)
GET  /decisions/stats    — getStats (통계)
GET  /decisions/pending  — getPending (대기 목록)
```

- create 시:
  1. decisions 테이블에 삽입
  2. GO → PipelineService.advanceStage (다음 단계 자동 전환)
  3. HOLD → 단계 유지, 알림만 발송
  4. DROP → biz_items.status를 'dropped'으로 변경
  5. NotificationService.create (decision_made 알림)

### 3.6 의사결정 자동 단계 전환 로직

```
현재 단계   + GO    → 다음 단계
REGISTERED  + GO    → DISCOVERY
DISCOVERY   + GO    → FORMALIZATION
FORMALIZATION + GO  → REVIEW
REVIEW      + GO    → DECISION (→OFFERING)
DECISION    + GO    → OFFERING
OFFERING    + GO    → MVP
MVP         + GO    → (완료 — status='completed')
```

### 3.7 Web 컴포넌트 설계

#### PipelinePage (`app/(app)/pipeline/page.tsx`)

- 상단: 뷰 전환 탭 (칸반 / 파이프라인)
- 칸반 뷰: 7개 컬럼, 각 컬럼에 ItemCard 목록
- 파이프라인 뷰: 단계별 진행률 바 + 아이템 수
- API: `GET /pipeline/kanban` 호출

#### ItemCard

- 제목, 현재 단계 배지, 진행률(%), 담당자, 최근 업데이트
- 클릭 시 상세 사이드패널 열기

#### ShareDialog

- 접근 레벨 선택 (View/Comment/Edit)
- 만료 설정 (1일/7일/30일/무제한)
- 생성된 링크 복사 버튼
- 리뷰 요청: 팀원 선택 + 메시지

#### NotificationList

- 벨 아이콘 + 안읽은 수 배지
- 드롭다운: 알림 목록 (최신 20개)
- 클릭 시 읽음 처리 + 해당 아이템으로 이동

#### DecisionPanel

- 아이템 상세 페이지 하단
- Go/Hold/Drop 3개 버튼
- 코멘트 텍스트에어리어 (필수)
- 이전 의사결정 이력 타임라인

## 4. 테스트 전략

### 4.1 API 라우트 테스트

각 라우트 파일별 테스트. DDL은 기존 biz_items + 신규 4개 테이블.

| 테스트 파일 | 예상 테스트 수 | 주요 케이스 |
|------------|---------------|------------|
| `pipeline.test.ts` | ~15 | 목록/상세/단계전환/통계/칸반 + 필터 + 404 |
| `pipeline-service.test.ts` | ~10 | 단계 전환 로직, 통계 계산, 체류시간 |
| `share-links.test.ts` | ~12 | 생성/목록/무효화/리뷰요청 + 만료 + 권한 |
| `notifications.test.ts` | ~8 | 목록/읽음/배치생성 + unreadOnly 필터 |
| `decisions.test.ts` | ~15 | Go/Hold/Drop + 자동단계전환 + 알림연동 + 통계 |
| **합계** | **~60** | |

### 4.2 Web 테스트

| 테스트 파일 | 예상 테스트 수 | 주요 케이스 |
|------------|---------------|------------|
| `pipeline.test.tsx` | ~8 | 칸반/파이프라인 뷰 전환, 아이템 카드 렌더링 |
| `sharing.test.tsx` | ~5 | 공유 다이얼로그 열기, 링크 생성, 복사 |
| `decisions.test.tsx` | ~5 | Go/Hold/Drop 버튼, 코멘트 입력, 이력 표시 |
| **합계** | **~18** | |

### 4.3 총계: ~78 tests

## 5. Worker 파일 매핑

### Worker 1: D1 마이그레이션 + 스키마 + 서비스

**수정 허용 파일:**
- `packages/api/src/db/migrations/0066_pipeline_stages.sql`
- `packages/api/src/db/migrations/0067_share_links.sql`
- `packages/api/src/db/migrations/0068_notifications.sql`
- `packages/api/src/db/migrations/0069_decisions.sql`
- `packages/api/src/schemas/pipeline.schema.ts`
- `packages/api/src/schemas/share-link.schema.ts`
- `packages/api/src/schemas/notification.schema.ts`
- `packages/api/src/schemas/decision.schema.ts`
- `packages/api/src/services/pipeline-service.ts`
- `packages/api/src/services/share-link-service.ts`
- `packages/api/src/services/notification-service.ts`
- `packages/api/src/services/decision-service.ts`
- `packages/api/src/__tests__/pipeline-service.test.ts`

### Worker 2: API 라우트 + 라우트 테스트

**수정 허용 파일:**
- `packages/api/src/routes/pipeline.ts`
- `packages/api/src/routes/share-links.ts`
- `packages/api/src/routes/notifications.ts`
- `packages/api/src/routes/decisions.ts`
- `packages/api/src/app.ts` (import + route 등록 4줄)
- `packages/api/src/__tests__/pipeline.test.ts`
- `packages/api/src/__tests__/share-links.test.ts`
- `packages/api/src/__tests__/notifications.test.ts`
- `packages/api/src/__tests__/decisions.test.ts`

### Worker 3: Web 컴포넌트 + 테스트

**수정 허용 파일:**
- `packages/web/src/app/(app)/pipeline/page.tsx`
- `packages/web/src/components/feature/pipeline/kanban-board.tsx`
- `packages/web/src/components/feature/pipeline/pipeline-view.tsx`
- `packages/web/src/components/feature/pipeline/item-card.tsx`
- `packages/web/src/components/feature/sharing/share-dialog.tsx`
- `packages/web/src/components/feature/notifications/notification-list.tsx`
- `packages/web/src/components/feature/decisions/decision-panel.tsx`
- `packages/web/src/__tests__/pipeline.test.tsx`
- `packages/web/src/__tests__/sharing.test.tsx`
- `packages/web/src/__tests__/decisions.test.tsx`
