---
code: FX-DSGN-064
title: "Sprint 64 Design — F203 아이디어-BMC 연결 + F204 BMC 댓글 및 협업"
version: 1.0
status: Active
category: DSGN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 64
features: [F203, F204]
req: [FX-REQ-AX-008, FX-REQ-AX-003]
plan: "[[FX-PLAN-064]]"
---

## Executive Summary

| 관점 | 결과 |
|------|------|
| **Match Rate 목표** | 92% (F203: 92%, F204: 90%) |
| **신규 파일** | 12 (services 2, routes 2, schemas 2, migrations 2, tests 2, Web 2+) |
| **수정 파일** | 2 (app.ts, shared/ax-bd.ts) |
| **D1 테이블** | 2 (ax_idea_bmc_links, ax_bmc_comments) |

---

## 1. 아키텍처 개요

```
[아이디어 상세 UI]           [BMC 에디터 UI]
  "BMC 생성/연결"             블록별 댓글 아이콘
       │                          │
       ▼                          ▼
  /api/ax-bd/ideas/:id/bmc   /api/ax-bd/bmcs/:id/comments
       │                          │
       ▼                          ▼
  IdeaBmcLinkService          BmcCommentService
       │                          │
       ├─ BmcService.create()     ├─ @멘션 파싱
       ├─ D1 ax_idea_bmc_links    ├─ D1 ax_bmc_comments
       └─ 양방향 링크 관리          └─ 블록별 집계
```

---

## 2. F203 — 아이디어-BMC 연결 상세 설계

### 2.1 IdeaBmcLinkService

```typescript
// packages/api/src/services/idea-bmc-link-service.ts

export class IdeaBmcLinkService {
  constructor(private db: D1Database) {}

  /** 아이디어에서 새 BMC 생성 + 링크 */
  async createBmcFromIdea(
    ideaId: string, tenantId: string, userId: string, title?: string
  ): Promise<{ bmc: Bmc; linkId: string }> {
    // 1. 아이디어 존재 확인
    // 2. BmcService.create() 호출 (title = idea.title || title)
    // 3. ax_idea_bmc_links INSERT
    // 4. 결과 반환
  }

  /** 기존 BMC와 연결 */
  async linkBmc(
    ideaId: string, bmcId: string, tenantId: string
  ): Promise<{ linkId: string }> {
    // 1. 아이디어 + BMC 존재 확인
    // 2. 중복 체크 (UNIQUE constraint → 409)
    // 3. INSERT
  }

  /** 연결 해제 */
  async unlinkBmc(ideaId: string, bmcId: string, tenantId: string): Promise<void>

  /** 아이디어의 BMC 목록 */
  async getBmcsByIdea(ideaId: string, tenantId: string): Promise<BmcSummary[]>

  /** BMC의 아이디어 조회 */
  async getIdeaByBmc(bmcId: string, tenantId: string): Promise<IdeaSummary | null>
}
```

### 2.2 Route: ax-bd-links.ts

```typescript
// packages/api/src/routes/ax-bd-links.ts

// POST /api/ax-bd/ideas/:ideaId/bmc          → createBmcFromIdea
// POST /api/ax-bd/ideas/:ideaId/bmc/link     → linkBmc { bmcId }
// DELETE /api/ax-bd/ideas/:ideaId/bmc/link    → unlinkBmc { bmcId }
// GET /api/ax-bd/ideas/:ideaId/bmcs           → getBmcsByIdea
// GET /api/ax-bd/bmcs/:bmcId/idea             → getIdeaByBmc
```

### 2.3 Schema: idea-bmc-link.schema.ts

```typescript
import { z } from "zod";

export const linkBmcSchema = z.object({
  bmcId: z.string().min(1),
});

export const createBmcFromIdeaSchema = z.object({
  title: z.string().max(200).optional(),
});
```

### 2.4 D1: 0048_ax_idea_bmc_links.sql

```sql
CREATE TABLE ax_idea_bmc_links (
  id         TEXT PRIMARY KEY,
  idea_id    TEXT NOT NULL,
  bmc_id     TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(idea_id, bmc_id)
);
CREATE INDEX idx_links_idea_id ON ax_idea_bmc_links(idea_id);
CREATE INDEX idx_links_bmc_id ON ax_idea_bmc_links(bmc_id);
```

### 2.5 Web: IdeaBmcSection

```
아이디어 상세 페이지
┌──────────────────────────────────────┐
│ [아이디어 제목]                        │
│ [설명...]                             │
│                                      │
│ ── 연결된 BMC ──                      │
│ ┌──────────────┐  ┌──────────────┐   │
│ │ BMC: XX사업   │  │ + BMC 생성    │   │
│ │ 9블록 완성도  │  │ 🔗 기존 연결  │   │
│ └──────────────┘  └──────────────┘   │
└──────────────────────────────────────┘
```

컴포넌트:
- `IdeaBmcSection.tsx` — 아이디어 상세 페이지 내 BMC 연결 영역
- `BmcSelectModal.tsx` — 기존 BMC 선택 모달

---

## 3. F204 — BMC 댓글 상세 설계

### 3.1 BmcCommentService

```typescript
// packages/api/src/services/bmc-comment-service.ts

export class BmcCommentService {
  constructor(private db: D1Database) {}

  /** 댓글 작성 */
  async createComment(
    bmcId: string, authorId: string, content: string, blockType?: string
  ): Promise<BmcComment> {
    // 1. BMC 존재 확인
    // 2. blockType 유효성 (null 허용 = BMC 전체 댓글)
    // 3. @멘션 파싱 → mentionedUserIds
    // 4. INSERT ax_bmc_comments
    // 5. 멘션 알림 전송 (NotificationService 연동)
    // 6. 결과 반환
  }

  /** 댓글 목록 (블록 필터 선택적) */
  async getComments(
    bmcId: string, blockType?: string, limit?: number, offset?: number
  ): Promise<{ comments: BmcComment[]; total: number }>

  /** 댓글 삭제 (본인만) */
  async deleteComment(commentId: string, userId: string): Promise<void>

  /** 블록별 댓글 수 집계 */
  async getCommentCounts(bmcId: string): Promise<Record<string, number>>

  /** @멘션 파싱 */
  private parseMentions(content: string): string[] {
    return [...content.matchAll(/@(\w+)/g)].map(m => m[1]);
  }
}
```

### 3.2 Route: ax-bd-comments.ts

```typescript
// packages/api/src/routes/ax-bd-comments.ts

// POST   /api/ax-bd/bmcs/:bmcId/comments             → createComment
// GET    /api/ax-bd/bmcs/:bmcId/comments              → getComments (?block=, ?limit=, ?offset=)
// DELETE /api/ax-bd/bmcs/:bmcId/comments/:commentId   → deleteComment
// GET    /api/ax-bd/bmcs/:bmcId/comments/count        → getCommentCounts
```

### 3.3 Schema: bmc-comment.schema.ts

```typescript
import { z } from "zod";

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  blockType: z.enum([
    "customer_segments", "value_propositions", "channels",
    "customer_relationships", "revenue_streams",
    "key_resources", "key_activities", "key_partnerships",
    "cost_structure"
  ]).optional(),
});
```

### 3.4 D1: 0049_ax_bmc_comments.sql

```sql
CREATE TABLE ax_bmc_comments (
  id         TEXT PRIMARY KEY,
  bmc_id     TEXT NOT NULL,
  block_type TEXT,
  author_id  TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_comments_bmc_id ON ax_bmc_comments(bmc_id);
CREATE INDEX idx_comments_block ON ax_bmc_comments(bmc_id, block_type);
```

### 3.5 Web: CommentPanel

```
BMC 에디터 — 댓글 사이드패널
┌─────────────────────────────────────────────┐
│ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│ │ 고객 세그  │ │ 가치 제안  │ │ 채널 💬(3) │  │
│ │           │ │ 💬(1)     │ │           │   │
│ └───────────┘ └───────────┘ └───────────┘   │
│                    ↓ 클릭                     │
│ ┌── 댓글 패널 ─────────────────────┐         │
│ │ 📝 @홍길동: 고객 세그먼트 ...     │         │
│ │ 📝 @김철수: 이 부분 수정 ...      │         │
│ │ ──────────────────────           │         │
│ │ [댓글 입력...         ] [전송]    │         │
│ └──────────────────────────────────┘         │
└─────────────────────────────────────────────┘
```

컴포넌트:
- `CommentPanel.tsx` — 블록별 댓글 사이드패널
- `CommentBadge.tsx` — 블록 옆 댓글 수 배지
- `MentionInput.tsx` — @멘션 자동완성 입력

---

## 4. 공유 타입 확장

```typescript
// packages/shared/src/ax-bd.ts (추가)

export interface IdeaBmcLink {
  id: string;
  ideaId: string;
  bmcId: string;
  createdAt: number;
}

export interface BmcComment {
  id: string;
  bmcId: string;
  blockType?: string;
  authorId: string;
  authorName?: string;  // JOIN 시
  content: string;
  createdAt: number;
}

export interface CommentCounts {
  [blockType: string]: number;
  _total: number;  // BMC 전체 댓글 포함
}
```

---

## 5. Worker 파일 매핑 (충돌 방지)

### W1: F203 아이디어-BMC 연결
**수정 허용 파일:**
- `packages/api/src/services/idea-bmc-link-service.ts` (NEW)
- `packages/api/src/routes/ax-bd-links.ts` (NEW)
- `packages/api/src/schemas/idea-bmc-link.schema.ts` (NEW)
- `packages/api/src/db/migrations/0048_ax_idea_bmc_links.sql` (NEW)
- `packages/api/src/__tests__/ax-bd-links.test.ts` (NEW)
- `packages/web/src/components/feature/ax-bd/IdeaBmcSection.tsx` (NEW)
- `packages/web/src/components/feature/ax-bd/BmcSelectModal.tsx` (NEW)

### W2: F204 BMC 댓글
**수정 허용 파일:**
- `packages/api/src/services/bmc-comment-service.ts` (NEW)
- `packages/api/src/routes/ax-bd-comments.ts` (NEW)
- `packages/api/src/schemas/bmc-comment.schema.ts` (NEW)
- `packages/api/src/db/migrations/0049_ax_bmc_comments.sql` (NEW)
- `packages/api/src/__tests__/ax-bd-comments.test.ts` (NEW)
- `packages/web/src/components/feature/ax-bd/CommentPanel.tsx` (NEW)
- `packages/web/src/components/feature/ax-bd/CommentBadge.tsx` (NEW)
- `packages/web/src/components/feature/ax-bd/MentionInput.tsx` (NEW)

### 리더 처리 (merge 후):
- `packages/api/src/app.ts` — 라우트 등록 2줄 추가
- `packages/shared/src/ax-bd.ts` — 타입 추가

---

## 6. 테스트 설계

### F203 테스트 (~15건)
| # | 테스트 | 유형 |
|---|--------|------|
| 1 | 아이디어에서 새 BMC 생성 + 링크 | Happy |
| 2 | 기존 BMC 연결 | Happy |
| 3 | 연결 해제 | Happy |
| 4 | 아이디어의 BMC 목록 조회 | Happy |
| 5 | BMC의 아이디어 조회 | Happy |
| 6 | 미존재 아이디어 → 404 | Error |
| 7 | 미존재 BMC → 404 | Error |
| 8 | 중복 연결 → 409 | Error |
| 9 | 타 테넌트 접근 → 403 | Auth |
| 10 | 연결 해제 후 재연결 | Edge |

### F204 테스트 (~15건)
| # | 테스트 | 유형 |
|---|--------|------|
| 1 | 블록 댓글 작성 | Happy |
| 2 | BMC 전체 댓글 작성 (blockType=null) | Happy |
| 3 | 댓글 목록 조회 | Happy |
| 4 | 블록별 필터 조회 | Happy |
| 5 | 댓글 삭제 (본인) | Happy |
| 6 | 타인 댓글 삭제 → 403 | Auth |
| 7 | 블록별 댓글 수 집계 | Happy |
| 8 | @멘션 파싱 검증 | Unit |
| 9 | 미존재 BMC → 404 | Error |
| 10 | 빈 댓글 → 400 | Validation |
| 11 | 2000자 초과 → 400 | Validation |
| 12 | 잘못된 blockType → 400 | Validation |

---

## 7. Sprint 62와의 병렬 전략

Sprint 62 (BMCAgent + 버전히스토리)와 파일 겹침 없음:
- Sprint 62: `bmc-agent-service`, `bmc-history-service`, `ax-bd-agent`, `ax-bd-history`
- Sprint 64: `idea-bmc-link-service`, `bmc-comment-service`, `ax-bd-links`, `ax-bd-comments`

**Migration 번호 조정**: Sprint 62가 먼저 merge되면 0048~0049 사용 가능. 동시 merge 시 리더가 renumber.
