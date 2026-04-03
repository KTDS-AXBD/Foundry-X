---
code: FX-DSGN-119
title: Sprint 119 Design — 초도 미팅용 Offering Brief (F293)
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 119
f-items: F293
phase: "Phase 11-B"
---

# Sprint 119 Design — 초도 미팅용 Offering Brief (F293)

> **Plan 참조**: [[FX-PLAN-119]]

---

## 1. Overview

Offering Pack에서 핵심 정보를 추출하여 고객 초도 미팅용 1~2페이지 Offering Brief를 자동 생성하는 기능.

---

## 2. D1 Schema (0089)

```sql
-- 0089_offering_briefs.sql
CREATE TABLE IF NOT EXISTS offering_briefs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  offering_pack_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  target_audience TEXT,
  meeting_type TEXT NOT NULL DEFAULT 'initial',
  generated_by TEXT NOT NULL DEFAULT 'ai',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (offering_pack_id) REFERENCES offering_packs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_offering_briefs_pack ON offering_briefs(offering_pack_id);
CREATE INDEX IF NOT EXISTS idx_offering_briefs_org ON offering_briefs(org_id);
```

---

## 3. API Design

### 3.1 Zod Schema (`offering-brief.schema.ts`)

```typescript
import { z } from "zod";

export const MEETING_TYPES = ["initial", "followup", "demo", "closing"] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export const CreateOfferingBriefSchema = z.object({
  targetAudience: z.string().max(500).optional(),
  meetingType: z.enum(MEETING_TYPES).default("initial"),
});

export const OfferingBriefFilterSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

### 3.2 Endpoints (offering-packs.ts에 추가)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/offering-packs/:id/brief` | 브리프 생성 (AI 또는 템플릿 기반) |
| GET | `/offering-packs/:id/brief` | 최신 브리프 조회 |
| GET | `/offering-packs/:id/briefs` | 브리프 목록 |

### 3.3 Service (`offering-brief-service.ts`)

```
class OfferingBriefService
  constructor(db: D1Database)
  
  create(input: { orgId, offeringPackId, title, targetAudience?, meetingType? }) → OfferingBrief
  getLatest(offeringPackId, orgId) → OfferingBrief | null
  list(offeringPackId, orgId, opts?) → OfferingBrief[]
  generateContent(pack: OfferingPackDetail) → string  // 템플릿 기반 콘텐츠 생성
```

**generateContent** — Offering Pack의 items를 순회하며 마크다운 형태의 브리프 생성:
- 제목 + 요약
- Pack items를 타입별로 그룹핑 (proposal, tech_review, pricing 등)
- 각 항목에서 title + content 요약
- AI 호출 없이 템플릿 기반 (MVP) — AI 연동은 후속 Sprint

---

## 4. Web Design

### 4.1 새 페이지: `routes/offering-brief.tsx`

- 경로: `/shaping/offering/:id/brief`
- Offering Pack 정보 + 브리프 목록 표시
- "브리프 생성" 버튼 → POST → 목록 갱신
- 브리프 콘텐츠 마크다운 렌더링 (prose 스타일)
- 프린트 버튼 → `window.print()` (CSS @media print 최적화)

### 4.2 기존 페이지 수정: `routes/offering-pack-detail.tsx`

- "미팅 브리프" 버튼 추가 → `/shaping/offering/:id/brief` 링크

### 4.3 Router 등록

```typescript
{ path: "shaping/offering/:id/brief", lazy: () => import("@/routes/offering-brief") },
```

### 4.4 API Client 함수 추가

```typescript
export async function createOfferingBrief(packId: string, data?: { targetAudience?: string; meetingType?: string }) 
export async function fetchOfferingBriefLatest(packId: string)
export async function fetchOfferingBriefs(packId: string)
```

---

## 5. File Mapping

| # | File | Action | Lines |
|---|------|--------|-------|
| 1 | `packages/api/src/db/migrations/0089_offering_briefs.sql` | 신규 | ~15 |
| 2 | `packages/api/src/schemas/offering-brief.schema.ts` | 신규 | ~20 |
| 3 | `packages/api/src/services/offering-brief-service.ts` | 신규 | ~120 |
| 4 | `packages/api/src/routes/offering-packs.ts` | 수정 | +40 |
| 5 | `packages/api/src/__tests__/offering-brief.test.ts` | 신규 | ~150 |
| 6 | `packages/web/src/routes/offering-brief.tsx` | 신규 | ~120 |
| 7 | `packages/web/src/routes/offering-pack-detail.tsx` | 수정 | +5 |
| 8 | `packages/web/src/router.tsx` | 수정 | +1 |
| 9 | `packages/web/src/lib/api-client.ts` | 수정 | +15 |

---

## 6. Test Strategy

- **API 테스트** (`offering-brief.test.ts`): DDL에 offering_briefs 추가, CRUD 3 endpoint 검증 (7~10 cases)
- **기존 테스트**: 변경 없음 (offering-packs.test.ts는 기존 endpoint만 커버)

---

## 7. Success Criteria

- [ ] D1 0089 마이그레이션 적용
- [ ] POST/GET 3 endpoint 동작
- [ ] Web 브리프 페이지 렌더링
- [ ] offering-pack-detail에 브리프 버튼 존재
- [ ] API 테스트 전체 통과
- [ ] typecheck + build 통과

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial design — F293 | Sinclair Seo |
