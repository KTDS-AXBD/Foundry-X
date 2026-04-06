---
code: FX-PLAN-S167
title: "Sprint 167 — Data Layer: D1 마이그레이션 + Offerings CRUD + Sections API"
version: 1.0
status: Active
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-018]]"
---

# Sprint 167: Data Layer — D1 마이그레이션 + Offerings CRUD + Sections API

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F369(D1 마이그레이션), F370(Offerings CRUD API), F371(Sections API) |
| Sprint | 167 |
| Phase | 18-B (Data Layer) |
| 우선순위 | P0 |
| 의존성 | Sprint 165~166 (Foundation: F363~F368) 완료 |
| PRD | docs/specs/fx-offering-pipeline/prd-final.md §2-2 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 발굴 산출물→사업기획서 변환에 영속적 데이터 레이어가 없어 형상화 파이프라인 구현 불가 |
| Solution | offerings/versions/sections/design_tokens 4테이블 D1 스키마 + Offerings CRUD + Sections 18섹션 표준 목차 API |
| Function UX Effect | Offering 생성→버전관리→섹션편집→디자인토큰 전체 데이터 흐름 확보 |
| Core Value | Phase 18 후속 Sprint(169~174)의 Full UI + Export + Validate의 데이터 기반 확보 |

---

## 1. F369: D1 마이그레이션 (4테이블)

### 마이그레이션 파일

- `packages/api/src/db/migrations/0110_offerings.sql`

### 테이블 설계

#### offerings (사업기획서 메인)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| org_id | TEXT | NOT NULL | 멀티테넌시 |
| biz_item_id | TEXT | FK → biz_items(id) | 연결 발굴 아이템 |
| title | TEXT | NOT NULL | 기획서 제목 |
| purpose | TEXT | NOT NULL, CHECK | 'report' / 'proposal' / 'review' (보고/제안/검토) |
| format | TEXT | NOT NULL, CHECK | 'html' / 'pptx' |
| status | TEXT | NOT NULL, CHECK | 'draft' / 'generating' / 'review' / 'approved' / 'shared' |
| current_version | INTEGER | DEFAULT 1 | 현재 버전 번호 |
| created_by | TEXT | NOT NULL | 생성자 |
| created_at | TEXT | DEFAULT datetime('now') | |
| updated_at | TEXT | DEFAULT datetime('now') | |

#### offering_versions (버전 이력)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| offering_id | TEXT | FK → offerings(id) ON DELETE CASCADE | |
| version | INTEGER | NOT NULL | 버전 번호 |
| snapshot | TEXT | | 전체 섹션 JSON 스냅샷 |
| change_summary | TEXT | | 변경 요약 |
| created_by | TEXT | NOT NULL | |
| created_at | TEXT | DEFAULT datetime('now') | |
| UNIQUE | (offering_id, version) | | 중복 방지 |

#### offering_sections (섹션별 콘텐츠)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| offering_id | TEXT | FK → offerings(id) ON DELETE CASCADE | |
| section_key | TEXT | NOT NULL | 'hero', 'exec_summary', 's01', 's02_1', ..., 's05' |
| title | TEXT | NOT NULL | 섹션 제목 |
| content | TEXT | | 마크다운/HTML 콘텐츠 |
| sort_order | INTEGER | NOT NULL | 정렬 순서 |
| is_required | INTEGER | DEFAULT 1 | 필수(1)/선택(0) |
| is_included | INTEGER | DEFAULT 1 | 포함 여부 토글 |
| created_at | TEXT | DEFAULT datetime('now') | |
| updated_at | TEXT | DEFAULT datetime('now') | |
| UNIQUE | (offering_id, section_key) | | 중복 방지 |

#### offering_design_tokens (디자인 토큰)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| offering_id | TEXT | FK → offerings(id) ON DELETE CASCADE | |
| token_key | TEXT | NOT NULL | 'color_primary', 'font_heading', ... |
| token_value | TEXT | NOT NULL | 값 |
| token_category | TEXT | NOT NULL | 'color' / 'typography' / 'layout' / 'spacing' |
| created_at | TEXT | DEFAULT datetime('now') | |
| updated_at | TEXT | DEFAULT datetime('now') | |
| UNIQUE | (offering_id, token_key) | | 중복 방지 |

### 인덱스

```sql
idx_offerings_org_status (org_id, status)
idx_offerings_biz_item (biz_item_id)
idx_offering_versions_offering (offering_id, version)
idx_offering_sections_offering (offering_id, sort_order)
idx_offering_design_tokens_offering (offering_id, token_category)
```

---

## 2. F370: Offerings CRUD API

### 엔드포인트

| Method | Path | 설명 | Zod Schema |
|--------|------|------|-----------|
| POST | /offerings | 생성 (draft) | CreateOfferingSchema |
| GET | /offerings | 목록 (필터+페이지네이션) | OfferingFilterSchema |
| GET | /offerings/:id | 상세 (+ sections 포함) | — |
| PUT | /offerings/:id | 수정 (title, purpose, status) | UpdateOfferingSchema |
| DELETE | /offerings/:id | 삭제 (soft delete 아님, CASCADE) | — |
| POST | /offerings/:id/versions | 버전 스냅샷 생성 | CreateVersionSchema |
| GET | /offerings/:id/versions | 버전 히스토리 | — |

### 파일 목록

| 파일 | 용도 |
|------|------|
| `packages/api/src/schemas/offering.schema.ts` | Zod 스키마 |
| `packages/api/src/services/offering-service.ts` | 서비스 레이어 |
| `packages/api/src/routes/offerings.ts` | 라우트 |

---

## 3. F371: Offering Sections API

### 엔드포인트

| Method | Path | 설명 | Zod Schema |
|--------|------|------|-----------|
| GET | /offerings/:id/sections | 전체 섹션 목록 | — |
| PUT | /offerings/:id/sections/:sectionId | 섹션 콘텐츠 수정 | UpdateSectionSchema |
| PATCH | /offerings/:id/sections/:sectionId/toggle | is_included 토글 | — |
| POST | /offerings/:id/sections/init | 18섹션 표준 목차 초기화 | InitSectionsSchema |
| PUT | /offerings/:id/sections/reorder | 순서 변경 | ReorderSectionsSchema |

### 18섹션 표준 목차 (시드 데이터)

```typescript
const STANDARD_SECTIONS = [
  { key: 'hero', title: 'Hero', sortOrder: 0, isRequired: true },
  { key: 'exec_summary', title: 'Executive Summary', sortOrder: 1, isRequired: true },
  { key: 's01', title: '추진 배경 및 목적', sortOrder: 2, isRequired: true },
  { key: 's02', title: '사업기회 점검', sortOrder: 3, isRequired: true },
  { key: 's02_1', title: '왜 이 문제/영역인가', sortOrder: 4, isRequired: true },
  { key: 's02_2', title: '왜 이 기술/접근법인가', sortOrder: 5, isRequired: true },
  { key: 's02_3', title: '왜 이 고객/도메인인가', sortOrder: 6, isRequired: true },
  { key: 's02_4', title: '기존 사업/관계 현황', sortOrder: 7, isRequired: false },
  { key: 's02_5', title: '현황 Gap 분석', sortOrder: 8, isRequired: false },
  { key: 's02_6', title: '글로벌·국내 동향', sortOrder: 9, isRequired: true },
  { key: 's03', title: '제안 방향', sortOrder: 10, isRequired: true },
  { key: 's03_1', title: '솔루션 개요', sortOrder: 11, isRequired: true },
  { key: 's03_2', title: '시나리오 / Use Case', sortOrder: 12, isRequired: true },
  { key: 's03_3', title: '사업화 로드맵', sortOrder: 13, isRequired: true },
  { key: 's04', title: '추진 계획', sortOrder: 14, isRequired: true },
  { key: 's04_1', title: '데이터 확보 방식', sortOrder: 15, isRequired: true },
  { key: 's04_2', title: '시장 분석 및 경쟁 환경', sortOrder: 16, isRequired: true },
  { key: 's04_3', title: '사업화 방향 및 매출 계획', sortOrder: 17, isRequired: true },
  { key: 's04_4', title: '추진 체계 및 투자 계획', sortOrder: 18, isRequired: true },
  { key: 's04_5', title: '사업성 교차검증', sortOrder: 19, isRequired: true },
  { key: 's04_6', title: '기대효과', sortOrder: 20, isRequired: true },
  { key: 's05', title: 'KT 연계 GTM 전략(안)', sortOrder: 21, isRequired: true },
];
```

### 파일 목록

| 파일 | 용도 |
|------|------|
| `packages/api/src/schemas/offering-section.schema.ts` | Zod 스키마 |
| `packages/api/src/services/offering-section-service.ts` | 서비스 레이어 |
| `packages/api/src/routes/offering-sections.ts` | 라우트 (offerings.ts와 분리) |

---

## 4. 테스트 계획

### API 테스트 (Vitest + Hono app.request())

| 파일 | 범위 | 예상 테스트 수 |
|------|------|---------------|
| `offerings.test.ts` | CRUD + 필터 + 버전 | ~15개 |
| `offering-sections.test.ts` | 섹션 CRUD + 표준 목차 초기화 + 토글 + 순서 | ~12개 |
| `offering-service.test.ts` | 서비스 단위 테스트 | ~8개 |

### 검증 항목

- [ ] D1 마이그레이션 로컬 적용 성공
- [ ] offerings CRUD 전체 동작
- [ ] sections 표준 목차 초기화 (22개 행 생성)
- [ ] sections is_included 토글
- [ ] sections reorder
- [ ] versions 스냅샷 생성 + 조회
- [ ] org_id 멀티테넌시 격리
- [ ] typecheck 통과
- [ ] lint 통과

---

## 5. 작업 순서

```
1. D1 마이그레이션 0110 생성 + 로컬 적용 확인
2. Zod 스키마 2개 (offering.schema.ts, offering-section.schema.ts)
3. 서비스 2개 (offering-service.ts, offering-section-service.ts)
4. 라우트 2개 (offerings.ts, offering-sections.ts)
5. app.ts 라우트 등록
6. 테스트 작성 + 실행
7. typecheck + lint
```
