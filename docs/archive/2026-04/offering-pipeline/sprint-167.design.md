---
code: FX-DSGN-S167
title: "Sprint 167 — Data Layer: D1 + Offerings CRUD + Sections API"
version: 1.0
status: Active
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-PLAN-S167]], [[FX-PLAN-018]]"
---

# Sprint 167 Design: Data Layer — D1 + Offerings CRUD + Sections API

## 1. 개요

Phase 18 Offering Pipeline의 데이터 레이어를 구축한다.
- F369: D1 4테이블 마이그레이션 (offerings, offering_versions, offering_sections, offering_design_tokens)
- F370: Offerings CRUD API (7개 엔드포인트)
- F371: Offering Sections API (5개 엔드포인트, 22개 표준 목차 초기화)

### 기존 자산 관계
- `offering_packs` (0072, F236): 번들 패키징 — offerings와 **독립** (별도 도메인)
- `biz_items`: offerings.biz_item_id FK 연결 — 발굴 아이템 기반 형상화

---

## 2. D1 스키마 (F369)

### 2-1. 마이그레이션 파일

`packages/api/src/db/migrations/0110_offerings.sql`

```sql
-- F369: Offering Pipeline Data Layer (Sprint 167)
-- offerings, offering_versions, offering_sections, offering_design_tokens

CREATE TABLE IF NOT EXISTS offerings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK(purpose IN ('report','proposal','review')),
  format TEXT NOT NULL CHECK(format IN ('html','pptx')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','generating','review','approved','shared')),
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);
CREATE INDEX IF NOT EXISTS idx_offerings_org_status ON offerings(org_id, status);
CREATE INDEX IF NOT EXISTS idx_offerings_biz_item ON offerings(biz_item_id);

CREATE TABLE IF NOT EXISTS offering_versions (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot TEXT,
  change_summary TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(offering_id, version),
  FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offering_versions_offering ON offering_versions(offering_id, version);

CREATE TABLE IF NOT EXISTS offering_sections (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL,
  section_key TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER NOT NULL,
  is_required INTEGER NOT NULL DEFAULT 1,
  is_included INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(offering_id, section_key),
  FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offering_sections_offering ON offering_sections(offering_id, sort_order);

CREATE TABLE IF NOT EXISTS offering_design_tokens (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL,
  token_key TEXT NOT NULL,
  token_value TEXT NOT NULL,
  token_category TEXT NOT NULL CHECK(token_category IN ('color','typography','layout','spacing')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(offering_id, token_key),
  FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offering_design_tokens_offering ON offering_design_tokens(offering_id, token_category);
```

---

## 3. Zod 스키마

### 3-1. offering.schema.ts

```typescript
// POST /offerings
CreateOfferingSchema = z.object({
  bizItemId: z.string().min(1),
  title: z.string().min(1).max(200),
  purpose: z.enum(['report', 'proposal', 'review']),
  format: z.enum(['html', 'pptx']),
});

// PUT /offerings/:id
UpdateOfferingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  purpose: z.enum(['report', 'proposal', 'review']).optional(),
  status: z.enum(['draft', 'generating', 'review', 'approved', 'shared']).optional(),
});

// GET /offerings (query)
OfferingFilterSchema = z.object({
  status: z.enum(['draft', 'generating', 'review', 'approved', 'shared']).optional(),
  bizItemId: z.string().optional(),
  purpose: z.enum(['report', 'proposal', 'review']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// POST /offerings/:id/versions
CreateVersionSchema = z.object({
  changeSummary: z.string().max(500).optional(),
});
```

### 3-2. offering-section.schema.ts

```typescript
// PUT /offerings/:id/sections/:sectionId
UpdateSectionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
});

// POST /offerings/:id/sections/init
InitSectionsSchema = z.object({
  includeOptional: z.boolean().default(true),
});

// PUT /offerings/:id/sections/reorder
ReorderSectionsSchema = z.object({
  sectionIds: z.array(z.string().min(1)),
});
```

---

## 4. API 엔드포인트 상세

### 4-1. Offerings CRUD (F370) — offerings.ts

| # | Method | Path | 동작 | 응답 |
|---|--------|------|------|------|
| 1 | POST | /offerings | draft 생성 + 표준 목차 자동 초기화 | 201 { offering } |
| 2 | GET | /offerings | 목록 (org_id 필터 + 페이지네이션) | 200 { items, total, page, limit } |
| 3 | GET | /offerings/:id | 상세 + sections 포함 | 200 { offering, sections } |
| 4 | PUT | /offerings/:id | 수정 (title/purpose/status) | 200 { offering } |
| 5 | DELETE | /offerings/:id | 삭제 (CASCADE) | 204 |
| 6 | POST | /offerings/:id/versions | 현재 sections 스냅샷 → version 생성 | 201 { version } |
| 7 | GET | /offerings/:id/versions | 버전 히스토리 | 200 { versions } |

**POST /offerings 흐름:**
1. Zod 검증
2. UUID 생성
3. offerings INSERT
4. offering_sections 22행 INSERT (표준 목차 자동)
5. 응답

### 4-2. Sections API (F371) — offering-sections.ts

| # | Method | Path | 동작 | 응답 |
|---|--------|------|------|------|
| 1 | GET | /offerings/:id/sections | 전체 섹션 목록 (sort_order ASC) | 200 { sections } |
| 2 | PUT | /offerings/:id/sections/:sectionId | 콘텐츠/제목 수정 | 200 { section } |
| 3 | PATCH | /offerings/:id/sections/:sectionId/toggle | is_included 토글 | 200 { section } |
| 4 | POST | /offerings/:id/sections/init | 표준 목차 재초기화 (기존 삭제 후 재생성) | 201 { sections } |
| 5 | PUT | /offerings/:id/sections/reorder | 순서 변경 (sectionIds 배열 순서대로 sort_order 재배정) | 200 { sections } |

---

## 5. 서비스 레이어

### 5-1. offering-service.ts

```typescript
class OfferingService {
  constructor(private db: D1Database) {}

  async create(input: CreateOfferingInput & { orgId: string; createdBy: string }): Promise<Offering>
  async list(orgId: string, filter: OfferingFilter): Promise<{ items: Offering[]; total: number }>
  async getById(orgId: string, id: string): Promise<OfferingWithSections | null>
  async update(orgId: string, id: string, input: UpdateOfferingInput): Promise<Offering | null>
  async delete(orgId: string, id: string): Promise<boolean>
  async createVersion(orgId: string, offeringId: string, createdBy: string, changeSummary?: string): Promise<OfferingVersion>
  async listVersions(orgId: string, offeringId: string): Promise<OfferingVersion[]>
}
```

### 5-2. offering-section-service.ts

```typescript
class OfferingSectionService {
  constructor(private db: D1Database) {}

  async listByOffering(offeringId: string): Promise<OfferingSection[]>
  async update(sectionId: string, input: UpdateSectionInput): Promise<OfferingSection | null>
  async toggleIncluded(sectionId: string): Promise<OfferingSection | null>
  async initStandard(offeringId: string, includeOptional: boolean): Promise<OfferingSection[]>
  async reorder(offeringId: string, sectionIds: string[]): Promise<OfferingSection[]>
}

// 표준 목차 상수
const STANDARD_SECTIONS: { key: string; title: string; sortOrder: number; isRequired: boolean }[]
```

---

## 6. 파일 목록

| # | 파일 | F-item | 신규/수정 |
|---|------|--------|----------|
| 1 | `packages/api/src/db/migrations/0110_offerings.sql` | F369 | 신규 |
| 2 | `packages/api/src/schemas/offering.schema.ts` | F370 | 신규 |
| 3 | `packages/api/src/schemas/offering-section.schema.ts` | F371 | 신규 |
| 4 | `packages/api/src/services/offering-service.ts` | F370 | 신규 |
| 5 | `packages/api/src/services/offering-section-service.ts` | F371 | 신규 |
| 6 | `packages/api/src/routes/offerings.ts` | F370 | 신규 |
| 7 | `packages/api/src/routes/offering-sections.ts` | F371 | 신규 |
| 8 | `packages/api/src/app.ts` | F370, F371 | 수정 (라우트 등록) |
| 9 | `packages/api/src/__tests__/helpers/mock-d1.ts` | F369 | 수정 (DDL 추가) |
| 10 | `packages/api/src/__tests__/offerings.test.ts` | F370 | 신규 |
| 11 | `packages/api/src/__tests__/offering-sections.test.ts` | F371 | 신규 |

---

## 7. 테스트 설계

### 7-1. offerings.test.ts (~15 테스트)

| # | 테스트 | 기대값 |
|---|--------|--------|
| 1 | POST /offerings — 정상 생성 | 201, offering + 22 sections 자동 |
| 2 | POST /offerings — bizItemId 누락 | 400 |
| 3 | POST /offerings — 잘못된 purpose | 400 |
| 4 | GET /offerings — 목록 조회 | 200, items 배열 |
| 5 | GET /offerings — status 필터 | 200, 필터 적용 |
| 6 | GET /offerings — 페이지네이션 | 200, page/limit 적용 |
| 7 | GET /offerings/:id — 상세 + sections | 200, sections 포함 |
| 8 | GET /offerings/:id — 존재하지 않는 ID | 404 |
| 9 | PUT /offerings/:id — title 수정 | 200, 업데이트 반영 |
| 10 | PUT /offerings/:id — status 수정 | 200 |
| 11 | DELETE /offerings/:id — 삭제 | 204 |
| 12 | DELETE /offerings/:id — CASCADE로 sections도 삭제 | sections 0행 |
| 13 | POST /offerings/:id/versions — 버전 생성 | 201 |
| 14 | GET /offerings/:id/versions — 히스토리 | 200 |
| 15 | 멀티테넌시 격리 — 다른 orgId 접근 불가 | 404 |

### 7-2. offering-sections.test.ts (~12 테스트)

| # | 테스트 | 기대값 |
|---|--------|--------|
| 1 | GET sections — 전체 목록 | 200, 22개 |
| 2 | PUT section — content 수정 | 200 |
| 3 | PUT section — title 수정 | 200 |
| 4 | PATCH toggle — is_included 0→1 | 200 |
| 5 | PATCH toggle — is_included 1→0 | 200 |
| 6 | PATCH toggle — 필수 섹션 토글 시도 | 400 (필수는 토글 불가) |
| 7 | POST init — 표준 목차 초기화 | 201, 22개 |
| 8 | POST init — includeOptional=false | 201, 필수만 |
| 9 | POST init — 기존 섹션 있으면 교체 | 22개 |
| 10 | PUT reorder — 순서 변경 | 200, sort_order 반영 |
| 11 | PUT reorder — 잘못된 sectionId | 400 |
| 12 | 존재하지 않는 offering 접근 | 404 |

---

## 8. 22개 표준 목차 매핑

| sort_order | section_key | title | isRequired |
|------------|-------------|-------|------------|
| 0 | hero | Hero | true |
| 1 | exec_summary | Executive Summary | true |
| 2 | s01 | 추진 배경 및 목적 | true |
| 3 | s02 | 사업기회 점검 | true |
| 4 | s02_1 | 왜 이 문제/영역인가 | true |
| 5 | s02_2 | 왜 이 기술/접근법인가 | true |
| 6 | s02_3 | 왜 이 고객/도메인인가 | true |
| 7 | s02_4 | 기존 사업/관계 현황 | false |
| 8 | s02_5 | 현황 Gap 분석 | false |
| 9 | s02_6 | 글로벌·국내 동향 | true |
| 10 | s03 | 제안 방향 | true |
| 11 | s03_1 | 솔루션 개요 | true |
| 12 | s03_2 | 시나리오 / Use Case | true |
| 13 | s03_3 | 사업화 로드맵 | true |
| 14 | s04 | 추진 계획 | true |
| 15 | s04_1 | 데이터 확보 방식 | true |
| 16 | s04_2 | 시장 분석 및 경쟁 환경 | true |
| 17 | s04_3 | 사업화 방향 및 매출 계획 | true |
| 18 | s04_4 | 추진 체계 및 투자 계획 | true |
| 19 | s04_5 | 사업성 교차검증 | true |
| 20 | s04_6 | 기대효과 | true |
| 21 | s05 | KT 연계 GTM 전략(안) | true |
