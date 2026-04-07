---
code: FX-PLAN-216
title: Sprint 216 — 사업기획서 내보내기 강화 (PDF/PPTX + 디자인 토큰)
version: 1.0
status: Draft
category: PLAN
system-version: Sprint 216
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
---

# Sprint 216 Plan — 사업기획서 내보내기 강화

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | F444에서 편집된 사업기획서를 PDF/PPTX로 내보낼 수 없어, 실무 제출/발표 시 수동 변환이 필요해요. |
| **Solution** | 기존 `offering-export` 패턴을 재활용해 사업기획서 전용 PDF/PPTX 내보내기 엔드포인트를 추가하고, 디자인 토큰을 적용해 기업 브랜딩을 반영해요. |
| **Function UX Effect** | 기획서 편집기 UI에 "PDF 내보내기" / "PPTX 내보내기" 버튼을 추가하고, 다운로드 흐름을 원클릭으로 제공해요. |
| **Core Value** | 생성 → 편집(F444) → 내보내기(F446) 흐름을 완성하여 사업기획서를 "전달 가능한 문서"로 완결해요. |

## 1. 목표

F444에서 구현된 `business_plan_sections` 데이터를 기반으로, **PDF/PPTX 내보내기** 기능을 추가한다.

- **F446**: `BusinessPlanExportService` 신규 구현 + `business-plan-export` 라우트 추가
  - PDF: HTML 렌더링 → 브라우저 print API (클라이언트) 방식
  - PPTX: `pptxgenjs` 기반 (`pptx-renderer.ts` 패턴 재활용)
  - 디자인 토큰: `offering_design_tokens` 테이블 또는 템플릿별 기본 팔레트

## 2. F-items

| F# | 제목 | REQ | 우선순위 |
|----|------|-----|---------|
| F446 | 내보내기 강화 — 사업기획서 PDF/PPTX 내보내기 + 디자인 토큰 적용 | FX-REQ-438 | P0 |

## 3. 현재 상태 (As-Is)

### F444/F445 구현 결과 (Sprint 215)

```
business_plan_drafts   — 버전별 전체 마크다운 저장
business_plan_sections — 섹션별 편집 내용 저장 (0117_bp_editor.sql)
plan_templates         — 3종 템플릿 정의 (0117_bp_editor.sql)
```

### 기존 코드 경로

| 파일 | 역할 | 재활용 여부 |
|------|------|-----------|
| `packages/api/src/core/offering/services/offering-export-service.ts` | Offering HTML/PPTX 내보내기 | 패턴 참조 |
| `packages/api/src/core/offering/services/pptx-renderer.ts` | pptxgenjs 래퍼 | 직접 참조 |
| `packages/api/src/core/offering/schemas/offering-export.schema.ts` | 내보내기 쿼리 스키마 | 참조 |
| `packages/web/src/components/feature/discovery/BusinessPlanViewer.tsx` | 읽기 뷰어 | UI 확장 |

### Gap 분석

1. `business_plan_sections` → PPTX 변환 로직 없음
2. 사업기획서 HTML 내보내기 엔드포인트 없음
3. 기획서 편집기 UI에 내보내기 버튼 없음
4. 디자인 토큰 → 기획서 PDF/PPTX 적용 없음

## 4. 목표 상태 (To-Be)

### API 구조

```
GET /api/biz-items/:id/business-plan/export?format=html|pptx
  ├── format=html → 디자인 토큰 적용 HTML 문자열 반환
  └── format=pptx → pptxgenjs 바이너리 첨부파일 반환
```

### 서비스 구조

```
BusinessPlanExportService (신규)
  ├── getBpData(bizItemId) → 최신 draft + sections + 템플릿 토큰
  ├── exportHtml(bizItemId) → CSS 변수 + 섹션 마크다운 → HTML
  └── exportPptx(bizItemId) → 섹션 → slide[]  → renderPptx()
```

### 프론트엔드 UI

```
BusinessPlanViewer (또는 BusinessPlanEditor)
  └── 우측 상단 버튼 그룹 (신규)
        ├── [PDF 내보내기] → href=window.print() 또는 /export?format=html 새탭
        └── [PPTX 내보내기] → GET /export?format=pptx → blob 다운로드
```

### 디자인 토큰 전략

| 토큰 소스 | 조건 |
|----------|------|
| `offering_design_tokens` (기존) | Offering에 연결된 기획서인 경우 |
| 템플릿 기본 팔레트 3종 | `plan_templates.template_type` 기준 |

## 5. 구현 계획

### Phase A: API (1단계)
1. `BusinessPlanExportService` 구현 (offering-export-service 패턴 복제)
2. `business-plan-export.schema.ts` Zod 스키마 (ExportQuerySchema 재활용)
3. `business-plan-export.ts` 라우트 등록
4. `app.ts`에 라우트 마운트

### Phase B: Web (2단계)
1. `BusinessPlanViewer.tsx` → 내보내기 버튼 2개 추가
2. `useBusinessPlanExport()` 훅 — PPTX blob 다운로드 처리

### Phase C: D1 마이그레이션 (필요 시)
- 디자인 토큰 테이블이 `biz_item_id` 기준으로 분리 필요한 경우에만 추가

## 6. 의존성 및 선행 조건

| 항목 | 상태 |
|------|------|
| F444 사업기획서 편집기 | ✅ Sprint 215 완료 |
| F445 템플릿 다양화 | ✅ Sprint 215 완료 |
| `pptxgenjs` 의존성 | ✅ 기존 설치됨 (offering-export) |
| `business_plan_sections` D1 테이블 | ✅ 0117_bp_editor.sql |

## 7. 성공 기준

| 항목 | 기준 |
|------|------|
| PPTX 내보내기 | 섹션 수 만큼 슬라이드 생성, 200 OK + 바이너리 |
| HTML 내보내기 | 디자인 토큰 CSS 변수 포함 HTML, 200 OK |
| 다운로드 UX | 클릭 → 파일 저장 다이얼로그 |
| 테스트 | API 테스트 2건 이상 (html/pptx 각 1건) |
| Gap Analysis | Match Rate ≥ 90% |

## 8. 참고 문서

- [[FX-PLAN-215]] `docs/01-plan/features/sprint-215.plan.md`
- offering-export-service: `packages/api/src/core/offering/services/offering-export-service.ts`
- pptx-renderer: `packages/api/src/core/offering/services/pptx-renderer.ts`
- PRD: `docs/specs/fx-discovery-pipeline-v2/prd-final.md`
