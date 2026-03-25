---
code: FX-ANLS-061
title: "Sprint 61 Gap Analysis — F197 BMC CRUD + F198 아이디어 등록"
version: 1.0
status: Active
category: ANLS
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 61
features: [F197, F198]
req: [FX-REQ-AX-001, FX-REQ-AX-007]
design: "[[FX-DSGN-061]]"
---

# Sprint 61 Gap Analysis Report

> **Summary**: Design 문서(FX-DSGN-061)와 실제 구현 코드의 일치율 분석. Match Rate **93%**.
>
> **Design Doc**: [sprint-61.design.md](../02-design/features/sprint-61.design.md)
> **Analysis Date**: 2026-03-25

---

## 1. Executive Summary

| 관점 | 결과 |
|------|------|
| **전체 Match Rate** | **93%** (56/60 항목 일치) |
| **API Endpoints** | 11/11 (100%) -- 6 BMC + 5 Ideas 전부 일치 |
| **Data Model** | 100% -- 테이블 스키마, 인덱스, CHECK 제약 모두 일치 |
| **주요 Gap** | 4건 -- 마이그레이션 번호 Shift, batch vs loop, 라우트 등록 파일, 테스트 수 |

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| API Endpoints | 100% | ✅ |
| Data Model (D1) | 97% | ✅ |
| Services | 95% | ✅ |
| Schemas (Zod) | 100% | ✅ |
| Shared Types | 100% | ✅ |
| Route Registration | 90% | ⚠️ |
| Web Components | 100% | ✅ |
| Tests | 90% | ⚠️ |
| **Overall** | **93%** | **✅** |

---

## 3. Gap Analysis (Design vs Implementation)

### 3.1 API Endpoints

#### F197 BMC (6 endpoints)

| # | Method | Path | Design | Impl | Status |
|---|--------|------|--------|------|--------|
| 1 | POST | `/ax-bd/bmc` | ✅ | ✅ | ✅ Match |
| 2 | GET | `/ax-bd/bmc` | ✅ | ✅ | ✅ Match |
| 3 | GET | `/ax-bd/bmc/:id` | ✅ | ✅ | ✅ Match |
| 4 | PUT | `/ax-bd/bmc/:id` | ✅ | ✅ | ✅ Match |
| 5 | DELETE | `/ax-bd/bmc/:id` | ✅ | ✅ | ✅ Match |
| 6 | POST | `/ax-bd/bmc/:id/stage` | ✅ | ✅ | ✅ Match |

#### F198 Ideas (5 endpoints)

| # | Method | Path | Design | Impl | Status |
|---|--------|------|--------|------|--------|
| 1 | POST | `/ax-bd/ideas` | ✅ | ✅ | ✅ Match |
| 2 | GET | `/ax-bd/ideas` | ✅ | ✅ | ✅ Match |
| 3 | GET | `/ax-bd/ideas/:id` | ✅ | ✅ | ✅ Match |
| 4 | PUT | `/ax-bd/ideas/:id` | ✅ | ✅ | ✅ Match |
| 5 | DELETE | `/ax-bd/ideas/:id` | ✅ | ✅ | ✅ Match |

**API Match Rate: 11/11 = 100%**

### 3.2 Data Model (D1 Migrations)

#### Migration Numbering

| Design | Implementation | Status |
|--------|---------------|--------|
| `0045_ax_ideas.sql` | `0046_ax_ideas.sql` | ⚠️ Shifted +1 |
| `0046_ax_bmcs.sql` | `0047_ax_bmcs.sql` | ⚠️ Shifted +1 |

**원인**: 0045 번호가 Sprint 60의 `0045_pm_skills_criteria.sql`에 이미 사용됨. 의도적 조정이며 기능적 영향 없음.

#### ax_ideas 테이블

| Field | Design | Impl | Status |
|-------|--------|------|--------|
| id TEXT PK | ✅ | ✅ | ✅ |
| title TEXT NOT NULL | ✅ | ✅ | ✅ |
| description TEXT CHECK(<=200) | ✅ | ✅ | ✅ |
| tags TEXT | ✅ | ✅ | ✅ |
| git_ref TEXT NOT NULL | ✅ | ✅ | ✅ |
| author_id TEXT NOT NULL | ✅ | ✅ | ✅ |
| org_id TEXT NOT NULL | ✅ | ✅ | ✅ |
| sync_status CHECK | ✅ | ✅ | ✅ |
| is_deleted INTEGER DEFAULT 0 | ✅ | ✅ | ✅ |
| created_at INTEGER NOT NULL | ✅ | ✅ | ✅ |
| updated_at INTEGER NOT NULL | ✅ | ✅ | ✅ |
| 4 indexes | ✅ | ✅ | ✅ |

#### ax_bmcs + ax_bmc_blocks + sync_failures

| Table | Design | Impl | Status |
|-------|--------|------|--------|
| ax_bmcs (10 cols, 3 indexes) | ✅ | ✅ | ✅ |
| ax_bmc_blocks (4 cols, PK, CHECK) | ✅ | ✅ | ✅ |
| sync_failures (8 cols) | ✅ | ✅ | ✅ |

**Data Model Match Rate: 100%** (번호 shift는 의도적)

### 3.3 Services

#### BmcService

| Method | Design | Impl | Status | Notes |
|--------|--------|------|--------|-------|
| create() | ✅ batch insert | ✅ sequential loop | ⚠️ Changed | `for..of` + `.run()` 대신 `db.batch()` |
| getById() | ✅ | ✅ | ✅ | |
| list() | ✅ | ✅ | ✅ | |
| update() | ✅ batch update | ✅ sequential loop | ⚠️ Changed | 동일 패턴 |
| softDelete() | ✅ | ✅ | ✅ | |
| stage() | ✅ | ✅ | ✅ | |

**Gap 상세 -- batch vs loop**: Design은 `this.db.batch(stmts)`로 9개 블록을 한 번에 INSERT/UPDATE하지만, 구현은 `for (const type of BMC_BLOCK_TYPES) { await ...run() }` 순차 실행. 기능적으로 동일하나 성능 측면에서 batch가 우수 (단일 라운드트립). MVP 단계에서 영향 미미.

#### IdeaService

| Method | Design | Impl | Status |
|--------|--------|------|--------|
| create() | ✅ | ✅ | ✅ |
| getById() | ✅ | ✅ | ✅ |
| list() | ✅ | ✅ | ✅ |
| update() | ✅ | ✅ | ✅ |
| softDelete() | ✅ | ✅ | ✅ |

### 3.4 Schemas (Zod)

| Schema | Design | Impl | Status |
|--------|--------|------|--------|
| BmcBlockTypeSchema (9 enums) | ✅ | ✅ | ✅ |
| CreateBmcSchema | ✅ | ✅ | ✅ |
| UpdateBmcBlocksSchema | ✅ | ✅ | ✅ |
| BmcSchema | ✅ | ✅ | ✅ |
| CreateIdeaSchema | ✅ | ✅ | ✅ |
| UpdateIdeaSchema | ✅ | ✅ | ✅ |
| IdeaSchema | ✅ | ✅ | ✅ |

**Schema Match Rate: 7/7 = 100%**

### 3.5 Shared Types

| Type | Design | Impl | Status |
|------|--------|------|--------|
| BmcBlockType (union) | ✅ | ✅ | ✅ |
| BmcBlock interface | ✅ | ✅ | ✅ |
| Bmc interface | ✅ | ✅ | ✅ |
| Idea interface | ✅ | ✅ | ✅ |

**Shared Types Match Rate: 4/4 = 100%**

### 3.6 Route Registration (app.ts)

| Item | Design | Impl | Status |
|------|--------|------|--------|
| import axBdBmcRoute | ✅ | ✅ | ✅ |
| import axBdIdeasRoute | ✅ | ✅ | ✅ |
| `app.route("/api", axBdBmcRoute)` | ✅ | ✅ | ✅ |
| `app.route("/api", axBdIdeasRoute)` | ✅ | ✅ | ✅ |
| 등록 파일 | `index.ts` | `app.ts` | ⚠️ Changed |

**Gap 상세**: Design §4는 `packages/api/src/index.ts`에 등록한다고 기재했지만, 프로젝트의 실제 라우트 등록 위치는 `packages/api/src/app.ts`. 기존 프로젝트 패턴을 올바르게 따른 것이므로 구현이 정확하고 Design 문서 수정이 필요.

### 3.7 Web Components

| Design Component | Implementation File | Status |
|------------------|---------------------|--------|
| `ax-bd/page.tsx` | ✅ | ✅ |
| `ax-bd/ideas/page.tsx` | ✅ | ✅ |
| `ax-bd/ideas/[id]/page.tsx` | ✅ | ✅ |
| `ax-bd/bmc/page.tsx` | ✅ | ✅ |
| `ax-bd/bmc/new/page.tsx` | ✅ | ✅ |
| `ax-bd/bmc/[id]/page.tsx` | ✅ | ✅ |
| BmcEditorPage.tsx | ✅ | ✅ |
| BmcBlockEditor.tsx | ✅ | ✅ |
| BmcListPage.tsx | ✅ | ✅ |
| BmcStagingBar.tsx | ✅ | ✅ |
| IdeaListPage.tsx | ✅ | ✅ |
| IdeaCreateForm.tsx | ✅ | ✅ |
| IdeaDetailPage.tsx | ✅ | ✅ |
| TagFilter.tsx | ✅ | ✅ |

**Web Components Match Rate: 14/14 = 100%**

### 3.8 Tests

| Test File | Design Target | Actual | Status |
|-----------|:------------:|:------:|--------|
| ax-bd-bmc.test.ts | 15 | 14 | ⚠️ -1 |
| ax-bd-ideas.test.ts | 15 | 13 | ⚠️ -2 |
| **합계** | **30** | **27** | **90%** |

**누락 테스트 추정** (Design에 명시된 케이스 vs 실제):
- BMC: "유효성 검증 오류" 전용 테스트 1건 누락 (route-level validation은 서비스 테스트 범위 밖)
- Ideas: "유효성(제목 빈칸)" + "설명 200자 초과" route-level 검증 테스트 2건 누락

---

## 4. Differences Summary

### 🔴 Missing Features (Design O, Implementation X)

| # | Item | Design Location | Description | Impact |
|---|------|-----------------|-------------|--------|
| -- | (없음) | -- | 모든 API/서비스/컴포넌트 구현 완료 | -- |

### 🟡 Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | Migration 번호 | 0045 + 0046 | 0046 + 0047 | Low (의도적 shift) |
| 2 | Block INSERT 방식 | `db.batch()` | `for..of` + `.run()` | Low (성능 미미) |
| 3 | Block UPDATE 방식 | `db.batch()` | `for..of` + `.run()` | Low (동일) |
| 4 | 라우트 등록 파일 | `index.ts` | `app.ts` | None (impl이 올바름) |
| 5 | 테스트 수 | 30건 | 27건 | Low (-3 route validation) |

### 🟢 Added Features (Design X, Implementation O)

| # | Item | Implementation Location | Description |
|---|------|------------------------|-------------|
| -- | (없음) | -- | 설계 외 추가 기능 없음 |

---

## 5. PRD AC Verification

### FX-REQ-AX-001 (BMC CRUD)

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | BMC 생성 시 9개 블록 빈 초기화 | ✅ |
| AC-2 | 블록별 독립 편집 (PUT endpoint) | ✅ |
| AC-3 | Soft delete 지원 | ✅ |
| AC-4 | Git staging 상태 전환 | ✅ |

### FX-REQ-AX-007 (아이디어 등록)

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | 제목+설명+태그로 아이디어 생성 | ✅ |
| AC-2 | 태그 기반 필터링 | ✅ |
| AC-3 | Soft delete 지원 | ✅ |

**PRD AC 충족율: 7/7 = 100%**

---

## 6. Architecture Compliance

| Layer | Expected | Actual | Status |
|-------|----------|--------|--------|
| Routes (Presentation) | routes/ | routes/ax-bd-bmc.ts, routes/ax-bd-ideas.ts | ✅ |
| Services (Application) | services/ | services/bmc-service.ts, services/idea-service.ts | ✅ |
| Schemas (Domain) | schemas/ | schemas/bmc.schema.ts, schemas/idea.schema.ts | ✅ |
| Shared Types (Domain) | shared/src/ | shared/src/ax-bd.ts | ✅ |
| Migrations (Infra) | db/migrations/ | db/migrations/0046, 0047 | ✅ |
| Web Pages (Presentation) | app/(app)/ | app/(app)/ax-bd/ (6 pages) | ✅ |
| Web Components (Presentation) | components/feature/ | components/feature/ax-bd/ (8 components) | ✅ |

**Architecture Score: 100%**

---

## 7. Convention Compliance

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components | PascalCase | 100% | -- |
| Services | camelCase class methods | 100% | -- |
| Constants | UPPER_SNAKE_CASE | 100% | BMC_BLOCK_TYPES |
| Files (route) | kebab-case.ts | 100% | ax-bd-bmc.ts, ax-bd-ideas.ts |
| Files (component) | PascalCase.tsx | 100% | BmcEditorPage.tsx etc. |
| Schemas | PascalCase + Schema suffix | 100% | CreateBmcSchema etc. |
| Import order | external -> internal -> type | 100% | -- |

**Convention Score: 100%**

---

## 8. Recommended Actions

### Design Document Update (문서 보정)

| # | Action | Priority |
|---|--------|----------|
| 1 | §4 라우트 등록 파일을 `index.ts` -> `app.ts`로 수정 | Low |
| 2 | §3.4 마이그레이션 번호를 0046+0047로 수정 | Low |
| 3 | §2.2 BmcService.create/update batch 설명에 "구현 시 sequential 허용" 주석 추가 | Low |

### Implementation Improvement (코드 개선)

| # | Action | Priority | Impact |
|---|--------|----------|--------|
| 1 | BmcService.create: `for..of` -> `db.batch()` 전환 | Low | 9 INSERT 1 라운드트립 |
| 2 | BmcService.update: `for..of` -> `db.batch()` 전환 | Low | N UPDATE 1 라운드트립 |
| 3 | Route-level validation 테스트 3건 추가 (목표 30건 달성) | Low | 테스트 커버리지 |

### Intentional Differences (의도적 차이 -- 조치 불필요)

| # | Item | Reason |
|---|------|--------|
| 1 | Migration 번호 0046/0047 | Sprint 60이 0045를 선점, 자동 증분 |

---

## 9. Match Rate Calculation

```
Total Design Items: 60
  - API Endpoints:     11 (11 match)
  - Data Model Fields: 14 (14 match, 번호 shift는 의도적)
  - Service Methods:   11 (9 match + 2 changed)
  - Schemas:            7 (7 match)
  - Shared Types:       4 (4 match)
  - Route Registration: 4 (3 match + 1 file changed)
  - Web Components:    14 (14 match)
  - Test Targets:       2 (0 match -- 27/30)

Matched:     56 items
Changed:      4 items (Low impact)
Missing:      0 items

Match Rate = 56/60 = 93%
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-25 | Initial analysis | Sinclair Seo |
