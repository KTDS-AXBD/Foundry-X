---
code: FX-ANLS-S168
title: "Sprint 168 Gap Analysis — Offering Export + Validate API"
version: 1.0
status: Active
category: ANLS
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo (gap-detector agent)
references: "[[FX-DSGN-S168]], [[FX-PLAN-S168]]"
---

# Sprint 168 Gap Analysis

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F372 (Export API) + F373 (Validate API) |
| Sprint | 168 |
| Match Rate | **100%** (16/16 PASS) |
| 신규 파일 | 10개 |
| 수정 파일 | 2개 |
| 테스트 | 12개 (전체 통과) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 사업기획서 HTML 렌더링/교차검증 API 부재 |
| Solution | Export API (HTML 렌더링) + Validate API (O-G-D 교차검증) |
| Function UX Effect | 한 클릭 HTML Export + 자동 교차검증 |
| Core Value | 형상화→검증 파이프라인 완성, 수작업 80% 절감 |

## Checkpoint Results

### F372 Export API (8/8 PASS)

| # | Checkpoint | Status |
|---|-----------|:------:|
| 1 | GET /offerings/:id/export?format=html | ✅ |
| 2 | ExportQuerySchema Zod 스키마 | ✅ |
| 3 | OfferingExportService HTML 렌더링 | ✅ |
| 4 | is_included=1 섹션만 포함 | ✅ |
| 5 | sort_order 순서 보장 | ✅ |
| 6 | design_tokens → CSS variable | ✅ |
| 7 | 마크다운 → HTML 변환 | ✅ |
| 8 | escapeHtml XSS 방어 | ✅ |

### F373 Validate API (8/8 PASS)

| # | Checkpoint | Status |
|---|-----------|:------:|
| 1 | POST /offerings/:id/validate | ✅ |
| 2 | GET /offerings/:id/validations 히스토리 | ✅ |
| 3 | ValidateOfferingSchema Zod 스키마 | ✅ |
| 4 | offering_validations D1 마이그레이션 | ✅ |
| 5 | OfferingValidateOgdAdapter | ✅ |
| 6 | OfferingValidateService + O-G-D Runner | ✅ |
| 7 | mode=full/quick 지원 | ✅ |
| 8 | 7개 표준 질문 루브릭 | ✅ |

## File Coverage (12/12)

| 파일 | 유형 | 상태 |
|------|------|:----:|
| `schemas/offering-export.schema.ts` | 신규 | ✅ |
| `schemas/offering-validate.schema.ts` | 신규 | ✅ |
| `services/offering-export-service.ts` | 신규 | ✅ |
| `services/offering-validate-service.ts` | 신규 | ✅ |
| `services/adapters/offering-validate-ogd-adapter.ts` | 신규 | ✅ |
| `routes/offering-export.ts` | 신규 | ✅ |
| `routes/offering-validate.ts` | 신규 | ✅ |
| `db/migrations/0111_offering_validations.sql` | 신규 | ✅ |
| `__tests__/offerings-export.test.ts` | 신규 | ✅ |
| `__tests__/offerings-validate.test.ts` | 신규 | ✅ |
| `app.ts` | 수정 | ✅ |
| `__tests__/helpers/mock-d1.ts` | 수정 | ✅ |

## Test Results (12/12 PASS)

- Export: 6 tests (HTML 렌더링, 섹션 필터링, CSS variable, 404, format 검증, 순서)
- Validate: 6 tests (생성, 빈 섹션 실패, quick 모드, 404, 히스토리, 빈 결과)
- 기존 offerings: 14 tests (회귀 없음)

## Positive Enhancements (Design 초과 구현)

1. `OfferingNotFoundError` 커스텀 에러 클래스
2. O-G-D 어댑터 미등록 시 간이 검증 fallback
3. `ValidationMode`, `ValidationStatus` 타입 별칭 export
