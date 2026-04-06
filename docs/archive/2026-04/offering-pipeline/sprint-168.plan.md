---
code: FX-PLAN-S168
title: "Sprint 168 — Offering Export API + Validate API (F372, F373)"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-DSGN-S168]]"
---

# Sprint 168: Offering Export API + Validate API

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F372 (Offering Export API) + F373 (Offering Validate API) |
| Sprint | 168 |
| Phase | 18-B (Data Layer) |
| 우선순위 | P0 |
| 의존성 | Sprint 167 (F369 D1 + F370 CRUD + F371 Sections) ✅ 완료 |
| Design | docs/02-design/features/sprint-168.design.md |
| PRD | docs/specs/fx-offering-pipeline/prd-final.md §2-2 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 사업기획서 내용이 DB에 있지만 보기 좋은 HTML로 내보내기/교차검증 불가 |
| Solution | Export API로 HTML 렌더링, Validate API로 O-G-D + Six Hats + Expert 자동 검증 |
| Function UX Effect | 사업기획서 한 클릭 Export + 자동 교차검증으로 품질 보증 |
| Core Value | 형상화 → 검증 파이프라인 자동화, 수작업 품질 검토 시간 80% 절감 |

## 범위 (Scope)

### F372: Offering Export API
- **라우트**: `GET /offerings/:id/export?format=html` (향후 pdf 확장)
- **서비스**: `OfferingExportService` — offering + sections 조합 → HTML 렌더링
- **HTML 렌더링**: base.html 템플릿 + 섹션별 컴포넌트 조합 + design tokens CSS variable
- **Zod 스키마**: `ExportQuerySchema` (format 필터)
- **테스트**: export route + service 단위 테스트

### F373: Offering Validate API
- **라우트**: `POST /offerings/:id/validate`
- **서비스**: `OfferingValidateService` — O-G-D Loop(F335) 호출 + 결과 저장
- **D1 마이그레이션**: `offering_validations` 테이블 (검증 결과 저장)
- **검증 파이프라인**: GAN 교차검증 → Six Hats 토론 → Expert 5인 리뷰
- **Zod 스키마**: `ValidateOfferingSchema` (옵션: 검증 모드 선택)
- **라우트 추가**: `GET /offerings/:id/validations` (검증 히스토리 조회)
- **테스트**: validate route + service 단위 테스트

### 범위 외
- Web UI (Sprint 169~170)
- PPTX 포맷 export (Sprint 172 F380)
- 콘텐츠 어댑터 (Sprint 171 F378)

## 구현 계획

### Phase A: Export API (F372)
1. `offering-export.schema.ts` — ExportQuery Zod 스키마
2. `offering-export-service.ts` — HTML 렌더링 로직
3. `offering-export.ts` (routes) — GET /offerings/:id/export
4. `offerings-export.test.ts` — 단위 테스트
5. `app.ts` 라우트 등록

### Phase B: Validate API (F373)
1. D1 마이그레이션 — `offering_validations` 테이블
2. `offering-validate.schema.ts` — Validate Zod 스키마
3. `offering-validate-service.ts` — O-G-D Loop 호출 + 결과 저장
4. `offering-validate.ts` (routes) — POST validate + GET validations
5. `offerings-validate.test.ts` — 단위 테스트
6. `app.ts` 라우트 등록

### Phase C: 통합 검증
1. typecheck 통과
2. 전체 테스트 통과
3. 기존 offerings 테스트 회귀 없음

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| O-G-D Loop 연동 복잡도 | 중 | 기존 OrchestrationLoop 인터페이스 재사용, 신규 어댑터만 추가 |
| HTML 렌더링 Workers 제약 | 하 | DOM 없이 문자열 템플릿 방식, Puppeteer 미사용 |
| D1 마이그레이션 번호 충돌 | 하 | `ls migrations/*.sql | sort | tail -1`로 최신 번호 확인 |

## 완료 기준

- [ ] F372: GET /offerings/:id/export 200 HTML 반환
- [ ] F372: 22개 섹션 순서대로 HTML 렌더링
- [ ] F372: is_included=false 섹션 제외
- [ ] F372: design_tokens CSS variable 적용
- [ ] F373: POST /offerings/:id/validate 201 검증 결과 반환
- [ ] F373: offering_validations 테이블에 결과 저장
- [ ] F373: GET /offerings/:id/validations 히스토리 조회
- [ ] typecheck 통과 + 테스트 통과 + 기존 테스트 회귀 없음
