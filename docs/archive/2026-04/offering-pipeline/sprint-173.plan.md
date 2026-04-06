---
code: FX-PLAN-S173
title: "Sprint 173 — 디자인 토큰 에디터 + Prototype 연동"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Claude
sprint: 173
f_items: [F381, F382]
phase: "18-E"
---

# Sprint 173 Plan — 디자인 토큰 에디터 + Prototype 연동

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F381 디자인 토큰 Phase 2+3, F382 Prototype 연동 |
| 시작일 | 2026-04-07 |
| Phase | 18-E (Offering Pipeline — Polish) |
| 선행 의존 | F365 (토큰 MD ✅), F376 (에디터 ✅), F372 (Export ✅) |

| 관점 | 내용 |
|------|------|
| Problem | 디자인 토큰이 MD 문서 + D1 row로만 존재하여 실시간 편집/프리뷰 불가. Offering→Prototype 수동 연동 |
| Solution | JSON 정규화 API + Web 실시간 토큰 에디터 + Prototype Builder 자동 호출 |
| Function UX Effect | 토큰 변경 즉시 CSS variable 반영 + iframe 프리뷰 / 원클릭 프로토타입 생성 |
| Core Value | 고객별 브랜드 커스터마이징 시간 단축 + Offering→Prototype 파이프라인 자동화 |

---

## 1. 목표

### F381: 디자인 토큰 Phase 2+3
- **Phase 2 — JSON 정규 포맷 + API**
  - design-tokens.md의 토큰을 JSON Schema로 정규화
  - API: `GET /offerings/:id/tokens` (토큰 목록), `PUT /offerings/:id/tokens` (일괄 갱신)
  - 기존 `offering_design_tokens` D1 테이블 활용

- **Phase 3 — Web 실시간 에디터**
  - 카테고리별(color/typography/layout/spacing) 토큰 편집 UI
  - CSS Variables 실시간 변경 → iframe 프리뷰
  - 고객별 브랜드 토큰 저장 (offering별 override)

### F382: Prototype Builder 연동
- Offering 데이터(시나리오/섹션)를 Phase 16 Prototype Builder에 전달
  - API: `POST /offerings/:id/prototype` → prototype-generator 호출
  - 기존 `PrototypeGenerator` 서비스 재활용 (bizItem + offering 데이터 변환)
- 프로토타입 대시보드에 Offering 연동 상태 표시

---

## 2. 선행 조건 확인

| 의존성 | 상태 | 근거 |
|--------|------|------|
| F365 디자인 토큰 MD | ✅ | `.claude/skills/ax-bd/shape/offering-html/design-tokens.md` |
| F369 D1 offerings 테이블 | ✅ | `0110_offerings.sql` — offering_design_tokens 테이블 포함 |
| F372 Export Service | ✅ | `offering-export-service.ts` — 토큰 기반 HTML 렌더링 |
| F376 Offering 에디터 | ✅ | `packages/web/src/routes/offering-edit.tsx` |
| Prototype Generator | ✅ | `packages/api/src/services/prototype-generator.ts` |

---

## 3. 구현 범위

### 3-1. API (packages/api)

| # | 파일 | 작업 |
|---|------|------|
| A1 | `schemas/design-token.schema.ts` | 신규 — JSON 정규 스키마 (DesignTokenJson, TokenCategory enum, BulkUpdateSchema) |
| A2 | `services/design-token-service.ts` | 신규 — CRUD: list/bulkUpsert/getAsJson/resetToDefaults |
| A3 | `routes/design-tokens.ts` | 신규 — GET/PUT `/offerings/:id/tokens` |
| A4 | `services/offering-prototype-service.ts` | 신규 — Offering→Prototype 변환 + generator 호출 |
| A5 | `routes/offering-prototype.ts` | 신규 — POST `/offerings/:id/prototype` |
| A6 | `__tests__/design-tokens.test.ts` | 신규 — 토큰 API 테스트 |
| A7 | `__tests__/offering-prototype.test.ts` | 신규 — Prototype 연동 테스트 |

### 3-2. Web (packages/web)

| # | 파일 | 작업 |
|---|------|------|
| W1 | `components/feature/DesignTokenEditor.tsx` | 신규 — 카테고리별 토큰 에디터 (color picker, input, slider) |
| W2 | `components/feature/DesignTokenPreview.tsx` | 신규 — iframe CSS variable 실시간 프리뷰 |
| W3 | `routes/offering-tokens.tsx` | 신규 — 토큰 에디터 페이지 (offering 상세 → 탭) |
| W4 | `components/feature/OfferingPrototypePanel.tsx` | 신규 — Prototype 생성 버튼 + 상태 표시 |

### 3-3. Shared (packages/shared)

| # | 파일 | 작업 |
|---|------|------|
| S1 | `types/offering.ts` | 수정 — DesignToken JSON 타입 추가 |

---

## 4. 기술 전략

### 디자인 토큰 JSON 정규화
```
design-tokens.md (Phase 1, 읽기 전용 참고)
       ↓ 파싱 → offering_design_tokens D1 테이블
       ↓ API → JSON 정규 포맷
       ↓ Web → CSS Variables + iframe 프리뷰
```

### 실시간 프리뷰 전략
- **CSS Variables + iframe 격리** (PRD R4 대응)
- 토큰 변경 시 `postMessage`로 iframe에 CSS variable 업데이트
- 프리뷰는 기존 offering HTML export를 iframe에 렌더링

### Prototype 연동 전략
- Offering 데이터를 `PrototypeGenerationInput` 형식으로 변환
- bizItem 정보는 offerings 테이블의 `biz_item_id`로 조회
- 기존 prototype-generator의 `generate()` 재활용

---

## 5. Worker 파일 매핑

### Worker 1: 디자인 토큰 API + Web (F381)
**수정 허용 파일:**
- `packages/api/src/schemas/design-token.schema.ts` (신규)
- `packages/api/src/services/design-token-service.ts` (신규)
- `packages/api/src/routes/design-tokens.ts` (신규)
- `packages/api/src/__tests__/design-tokens.test.ts` (신규)
- `packages/web/src/components/feature/DesignTokenEditor.tsx` (신규)
- `packages/web/src/components/feature/DesignTokenPreview.tsx` (신규)
- `packages/web/src/routes/offering-tokens.tsx` (신규)
- `packages/shared/src/types/offering.ts` (수정)

### Worker 2: Prototype 연동 (F382)
**수정 허용 파일:**
- `packages/api/src/services/offering-prototype-service.ts` (신규)
- `packages/api/src/routes/offering-prototype.ts` (신규)
- `packages/api/src/__tests__/offering-prototype.test.ts` (신규)
- `packages/web/src/components/feature/OfferingPrototypePanel.tsx` (신규)

---

## 6. 검증 계획

| 검증 항목 | 방법 | 기준 |
|-----------|------|------|
| 토큰 API CRUD | Vitest (app.request) | GET/PUT 정상 동작 |
| JSON 정규 포맷 | 스키마 검증 | Zod parse 통과 |
| 토큰 에디터 UI | 수동 확인 | 카테고리별 편집 가능 |
| iframe 프리뷰 | 수동 확인 | CSS variable 실시간 반영 |
| Prototype 연동 | Vitest | POST → prototype 생성 |
| 타입체크 | tsc --noEmit | 0 errors |

---

## 7. 리스크

| # | 리스크 | 대응 |
|---|--------|------|
| 1 | iframe 프리뷰 CORS | 같은 도메인 blob URL 사용 |
| 2 | 토큰 에디터 복잡도 | 4카테고리 중 color+typography만 먼저, layout/spacing은 단순 input |
| 3 | PrototypeGenerator 입력 형식 변환 | Offering→BizItem 어댑터로 격리 |

---

## 8. 참조

- PRD: `docs/specs/fx-offering-pipeline/prd-final.md` §2-5
- 디자인 토큰 Phase 1: `.claude/skills/ax-bd/shape/offering-html/design-tokens.md`
- Prototype Generator: `packages/api/src/services/prototype-generator.ts`
- Offering Export Service: `packages/api/src/services/offering-export-service.ts`
