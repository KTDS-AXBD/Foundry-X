---
code: FX-RPRT-S167
title: "Sprint 167 완료 보고서 — Data Layer: D1 + Offerings CRUD + Sections API"
version: 1.0
status: Active
category: RPRT
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-PLAN-S167]], [[FX-DSGN-S167]]"
---

# Sprint 167 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F369(D1 마이그레이션), F370(Offerings CRUD API), F371(Sections API) |
| Sprint | 167 |
| Phase | 18-B (Data Layer) |
| Match Rate | **99%** |
| 테스트 | 26 pass / 0 fail |
| 신규 파일 | 9개 |
| 수정 파일 | 2개 (app.ts, mock-d1.ts) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 발굴 산출물→사업기획서 변환에 영속적 데이터 레이어가 없어 형상화 파이프라인 구현 불가 |
| Solution | offerings/versions/sections/design_tokens 4테이블 D1 + CRUD 12 엔드포인트 + 22섹션 표준 목차 |
| Function UX Effect | Offering 생성→버전관리→섹션편집→디자인토큰 전체 데이터 흐름 확보 |
| Core Value | Phase 18 후속 Sprint(168~174)의 Full UI + Export + Validate 데이터 기반 확보 |

---

## 구현 결과

### F369: D1 마이그레이션 (4테이블)

| 테이블 | 컬럼 | 인덱스 |
|--------|------|--------|
| offerings | 11 | idx_org_status, idx_biz_item |
| offering_versions | 7 + UNIQUE | idx_offering_version |
| offering_sections | 10 + UNIQUE | idx_offering_sortorder |
| offering_design_tokens | 7 + UNIQUE | idx_offering_category |

- 마이그레이션 파일: `0110_offerings.sql`
- mock-d1.ts DDL 동기화 완료

### F370: Offerings CRUD API (7 엔드포인트)

| Method | Path | 동작 |
|--------|------|------|
| POST | /offerings | 생성 + 22섹션 자동 초기화 |
| GET | /offerings | 목록 (필터+페이지네이션) |
| GET | /offerings/:id | 상세 + sections 포함 |
| PUT | /offerings/:id | 수정 (title/purpose/status) |
| DELETE | /offerings/:id | 삭제 (CASCADE) |
| POST | /offerings/:id/versions | 버전 스냅샷 생성 |
| GET | /offerings/:id/versions | 버전 히스토리 |

### F371: Offering Sections API (5 엔드포인트)

| Method | Path | 동작 |
|--------|------|------|
| GET | /offerings/:id/sections | 전체 섹션 목록 |
| PUT | /offerings/:id/sections/:sectionId | 콘텐츠/제목 수정 |
| PATCH | /offerings/:id/sections/:sectionId/toggle | 포함 여부 토글 |
| POST | /offerings/:id/sections/init | 표준 목차 재초기화 |
| PUT | /offerings/:id/sections/reorder | 순서 변경 |

---

## Gap 분석 결과

| 카테고리 | 점수 | 판정 |
|----------|------|------|
| D1 스키마 | 100% | PASS |
| Zod 스키마 | 100% | PASS |
| 엔드포인트 | 100% | PASS |
| 서비스 메서드 | 100% | PASS |
| 테스트 | 96% | PASS |
| 표준 목차 | 100% | PASS |
| **전체** | **99%** | **PASS** |

### 미미한 차이 (1%)
- offerings.test.ts에서 CASCADE 후 sections 행 수 별도 검증 테스트 1건 미작성 (DELETE 후 offering 404 확인으로 대체)

---

## 파일 목록

| # | 파일 | 상태 | F-item |
|---|------|------|--------|
| 1 | `packages/api/src/db/migrations/0110_offerings.sql` | 신규 | F369 |
| 2 | `packages/api/src/schemas/offering.schema.ts` | 신규 | F370 |
| 3 | `packages/api/src/schemas/offering-section.schema.ts` | 신규 | F371 |
| 4 | `packages/api/src/services/offering-service.ts` | 신규 | F370 |
| 5 | `packages/api/src/services/offering-section-service.ts` | 신규 | F371 |
| 6 | `packages/api/src/routes/offerings.ts` | 신규 | F370 |
| 7 | `packages/api/src/routes/offering-sections.ts` | 신규 | F371 |
| 8 | `packages/api/src/app.ts` | 수정 | F370, F371 |
| 9 | `packages/api/src/__tests__/helpers/mock-d1.ts` | 수정 | F369 |
| 10 | `packages/api/src/__tests__/offerings.test.ts` | 신규 | F370 |
| 11 | `packages/api/src/__tests__/offering-sections.test.ts` | 신규 | F371 |

---

## 교훈

1. **Hono 라우팅 순서 주의**: 정적 경로(`/sections/reorder`)를 동적 경로(`/sections/:sectionId`) 앞에 등록해야 충돌 방지
2. **표준 목차 상수**: STANDARD_SECTIONS를 스키마 파일에 const로 정의하여 서비스와 테스트에서 재사용 — 중복 제거
3. **POST 생성 시 자동 초기화**: Offering 생성 시 22섹션을 자동으로 생성하여 후속 API 호출 단순화
