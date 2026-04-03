---
code: FX-DSGN-116
title: Sprint 116 Design — 2-tier 검증 + 인터뷰/미팅 관리 (F294+F295)
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 116
f-items: F294, F295
phase: "Phase 11-B"
---

# Sprint 116 Design — 2-tier 검증 + 인터뷰/미팅 관리 (F294+F295)

> **Plan**: [[FX-PLAN-116]]  |  **Sprint**: 116  |  **Author**: Sinclair Seo  |  **Date**: 2026-04-03

---

## 1. Overview

F294: 기존 단일 게이트 검증을 본부(division) → 전사(company) 2-tier 워크플로로 확장.
F295: 전문가 인터뷰/미팅 기록을 시스템에서 관리하는 CRUD 기능 추가.

---

## 2. D1 Migration (0086_validation_2tier.sql)

```sql
-- F294: pipeline_stages에 validation_tier 컬럼 추가
ALTER TABLE pipeline_stages ADD COLUMN validation_tier TEXT DEFAULT 'none';
-- values: 'none' | 'division_pending' | 'division_approved' | 'company_pending' | 'company_approved'

-- F295: expert_meetings 테이블
CREATE TABLE IF NOT EXISTS expert_meetings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'interview',
  title TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  attendees TEXT NOT NULL DEFAULT '[]',
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_expert_meetings_org ON expert_meetings(org_id, biz_item_id);
CREATE INDEX IF NOT EXISTS idx_expert_meetings_status ON expert_meetings(org_id, status);
```

---

## 3. API Schema (validation.schema.ts)

```typescript
// F294: Validation tier
export const VALIDATION_TIERS = [
  "none", "division_pending", "division_approved", "company_pending", "company_approved",
] as const;
export type ValidationTier = (typeof VALIDATION_TIERS)[number];
export const ValidationTierEnum = z.enum(VALIDATION_TIERS);

export const SubmitValidationSchema = z.object({
  bizItemId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  comment: z.string().max(2000).optional(),
});

export const ValidationFilterSchema = z.object({
  tier: ValidationTierEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// F295: Meeting
export const MEETING_TYPES = ["interview", "meeting", "workshop", "review"] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export const MEETING_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const CreateMeetingSchema = z.object({
  bizItemId: z.string().min(1),
  type: z.enum(MEETING_TYPES).default("interview"),
  title: z.string().min(1).max(200),
  scheduledAt: z.string(), // ISO datetime
  attendees: z.array(z.string()).default([]),
  location: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
});

export const UpdateMeetingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scheduledAt: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
  status: z.enum(MEETING_STATUSES).optional(),
});
```

---

## 4. Services

### 4.1 ValidationService (validation-service.ts, 신규)

```
class ValidationService {
  constructor(db: D1Database)

  // F294: 2-tier validation
  submitDivisionReview(bizItemId, orgId, decision, comment, userId) → result
  submitCompanyReview(bizItemId, orgId, decision, comment, userId) → result
  getDivisionItems(orgId, filters) → { items, total }
  getCompanyItems(orgId, filters) → { items, total }
  getValidationStatus(bizItemId, orgId) → { tier, history }
}
```

**비즈니스 로직**:
- `submitDivisionReview`: validation_tier = 'division_pending' → approve: 'division_approved', reject: 'none'
- `submitCompanyReview`: tier가 'division_approved'일 때만 진행 가능. approve: 'company_approved', reject: 'division_approved' (본부 재검토)
- division items: pipeline_stages에서 stage='REVIEW' AND validation_tier IN ('none', 'division_pending')
- company items: validation_tier = 'division_approved'

### 4.2 MeetingService (meeting-service.ts, 신규)

```
class MeetingService {
  constructor(db: D1Database)

  create(input, orgId, userId) → Meeting
  list(orgId, bizItemId?, filters?) → { items, total }
  getById(id, orgId) → Meeting | null
  update(id, orgId, input) → Meeting | null
  delete(id, orgId) → boolean
}
```

---

## 5. API Routes

### 5.1 validation-tier.ts (신규, F294)

| Method | Path | Handler | 설명 |
|--------|------|---------|------|
| POST | /validation/division/submit | submitDivisionReview | 본부 검증 제출 |
| POST | /validation/company/submit | submitCompanyReview | 전사 검증 제출 |
| GET | /validation/division/items | getDivisionItems | 본부 검증 대기 목록 |
| GET | /validation/company/items | getCompanyItems | 전사 검증 대기 목록 |
| GET | /validation/status/:bizItemId | getValidationStatus | 아이템별 검증 상태 |

### 5.2 validation-meetings.ts (신규, F295)

| Method | Path | Handler | 설명 |
|--------|------|---------|------|
| POST | /validation/meetings | create | 미팅 생성 |
| GET | /validation/meetings | list | 미팅 목록 |
| GET | /validation/meetings/:id | getById | 미팅 상세 |
| PATCH | /validation/meetings/:id | update | 미팅 수정 |
| DELETE | /validation/meetings/:id | delete | 미팅 삭제 |

---

## 6. Web Pages

### 6.1 validation-division.tsx (F294)

본부 검증 대기 아이템 목록 + 승인/반려 버튼. `GET /validation/division/items` 호출.

### 6.2 validation-company.tsx (F294)

전사 검증 대기 아이템 목록 + 승인/반려 버튼. `GET /validation/company/items` 호출. 본부 승인된 건만 표시.

### 6.3 validation-meetings.tsx (F295)

미팅 목록 (일정순) + 생성 다이얼로그 + 상세 보기. `GET /validation/meetings` 호출.

### 6.4 Sidebar 변경

```typescript
// 4. 검증/공유 그룹에 3건 추가
{
  key: "validate",
  items: [
    { href: "/validation/pipeline", label: "파이프라인", icon: GitBranch },
    { href: "/validation/division", label: "본부 검증", icon: Shield },
    { href: "/validation/company", label: "전사 검증", icon: Building2 },
    { href: "/validation/meetings", label: "미팅 관리", icon: CalendarDays },
  ],
}
```

### 6.5 Router 변경

```typescript
// validation routes 추가
{ path: "validation/division", lazy: () => import("@/routes/validation-division") },
{ path: "validation/company", lazy: () => import("@/routes/validation-company") },
{ path: "validation/meetings", lazy: () => import("@/routes/validation-meetings") },
```

---

## 7. Test Strategy

### 7.1 API Tests (~30건 예상)

- **validation-service.test.ts**: division/company submit, tier transition, guard (company before division → 400), filter queries
- **meeting-service.test.ts**: CRUD 5 operations, validation (empty title, invalid type), list with filters
- **validation-tier.test.ts**: route integration tests (5 endpoints)
- **validation-meetings.test.ts**: route integration tests (5 endpoints)

### 7.2 Web Tests (~8건 예상)

- **validation-division.test.tsx**: 렌더링, 승인/반려 동작
- **validation-company.test.tsx**: 렌더링, 본부 승인건만 표시
- **validation-meetings.test.tsx**: 목록 렌더링, 생성 다이얼로그

---

## 8. File Map

```
packages/api/src/
├── db/migrations/0086_validation_2tier.sql        ← D1 신규
├── schemas/validation.schema.ts                    ← 신규
├── services/validation-service.ts                  ← 신규
├── services/meeting-service.ts                     ← 신규
├── routes/validation-tier.ts                       ← 신규
├── routes/validation-meetings.ts                   ← 신규
└── routes/__tests__/
    ├── validation-tier.test.ts                     ← 신규
    ├── validation-meetings.test.ts                 ← 신규
    ├── validation-service.test.ts                  ← 신규
    └── meeting-service.test.ts                     ← 신규

packages/web/src/
├── routes/validation-division.tsx                  ← 신규
├── routes/validation-company.tsx                   ← 신규
├── routes/validation-meetings.tsx                  ← 신규
├── components/sidebar.tsx                          ← 수정 (3 메뉴 추가)
├── router.tsx                                      ← 수정 (3 라우트 추가)
└── __tests__/
    ├── validation-division.test.tsx                ← 신규
    ├── validation-company.test.tsx                 ← 신규
    └── validation-meetings.test.tsx                ← 신규

packages/api/src/index.ts                           ← 수정 (2 라우트 등록)
```

---

## 9. Implementation Order

1. D1 migration `0086_validation_2tier.sql`
2. Schema `validation.schema.ts`
3. Services: `validation-service.ts` + `meeting-service.ts`
4. Routes: `validation-tier.ts` + `validation-meetings.ts`
5. Route registration in `index.ts`
6. API tests (4 files)
7. Web: sidebar + router + 3 pages
8. Web tests (3 files)
9. typecheck + lint

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial design — F294 2-tier + F295 meetings | Sinclair Seo |
