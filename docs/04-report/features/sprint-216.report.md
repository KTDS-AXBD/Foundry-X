---
code: FX-RPRT-S216
title: Sprint 216 Completion Report — F446 사업기획서 내보내기 강화
version: 1.0
status: Active
category: report
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
match_rate: 100
---

# Sprint 216 Completion Report

## Overview

- **Feature**: F446 — 사업기획서 PDF/PPTX 내보내기 강화
- **Duration**: 2026-04-08 (1일 Sprint)
- **Owner**: Sinclair Seo
- **Match Rate**: 100% (18/18 PASS)
- **Status**: ✅ Complete

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | F444에서 편집된 사업기획서를 PDF/PPTX로 내보낼 수 없어, 실무 제출/발표 시 수동 변환이 필요했어요. |
| **Solution** | 기존 `offering-export` 패턴을 재활용해 `BusinessPlanExportService`를 구현하고, 3종 팔레트(내부보고/제안서/IR피치) 디자인 토큰을 적용했어요. |
| **Function UX Effect** | `BusinessPlanViewer`에 "PDF 내보내기" / "PPTX 내보내기" 버튼 추가. PDF는 HTML 새탭 인쇄, PPTX는 blob 다운로드로 원클릭 제공해요. |
| **Core Value** | 생성(F440) → 편집(F444) → 내보내기(F446) 흐름 완성 — 사업기획서가 전달 가능한 문서로 완결돼요. |

## PDCA Cycle Summary

### Plan
- Plan document: `docs/01-plan/features/sprint-216.plan.md`
- Goal: `business_plan_sections` → HTML/PPTX 변환 엔드포인트 추가 + 디자인 토큰 적용
- Estimated duration: 1일

### Design
- Design document: `docs/02-design/features/sprint-216.design.md`
- Key design decisions:
  - 신규 마이그레이션 없음 (Sprint 215 테이블 재활용)
  - BP_PALETTES 3종 정의: internal / proposal / ir-pitch
  - PDF: HTML 새탭 인쇄 / PPTX: pptxgenjs + 섹션별 슬라이드
  - 기존 offering-export 패턴 직접 활용

### Do
- Implementation scope:
  - `packages/api/src/core/offering/services/business-plan-export-service.ts` (신규)
  - `packages/api/src/core/offering/routes/business-plan-export.ts` (신규)
  - `packages/api/src/core/offering/schemas/business-plan-export.schema.ts` (신규)
  - `packages/web/src/components/feature/discovery/BusinessPlanViewer.tsx` (수정)
  - `packages/web/src/lib/api-client.ts` (수정: exportBusinessPlanPptx/Html 함수 추가)
  - `packages/api/src/__tests__/business-plan-export.test.ts` (신규)
  - `packages/api/src/app.ts` (수정: 라우트 마운트)
- Actual duration: 1일

### Check
- Analysis document: 구현이 100% 설계 사양을 충족함
- Design match rate: 100%
- Issues found: 0

## Results

### Completed Items

#### API 구현 (100% ✅)
- ✅ `GET /biz-items/:id/business-plan/export?format=html|pptx` 라우트 완성
  - format=html: CSS 변수 포함 완전한 HTML 문서 반환
  - format=pptx: pptxgenjs 렌더링 → 바이너리 첨부파일 반환
  - 인증: tenant 미들웨어 기반 org_id 검증

#### BusinessPlanExportService (100% ✅)
- ✅ getBpData(): 최신 draft + sections 조회
- ✅ exportHtml(): CSS 변수 + 섹션 마크다운 → HTML 렌더링
  - 팔레트: BP_PALETTES[templateType] 또는 default="internal"
  - 섹션 fallback: sections 없으면 draft.content 전체 1섹션
  - 마크다운 변환: h1/h2/h3 + 볼드/이탤릭 + 리스트
- ✅ exportPptx(): 섹션 → 슬라이드 매핑
  - 표지 슬라이드 (제목 + 버전 + 생성일)
  - 목차 슬라이드 (섹션 2단 레이아웃)
  - 콘텐츠 슬라이드 (섹션별 1장)
  - 마무리 슬라이드 (감사합니다)

#### 프론트엔드 UI (100% ✅)
- ✅ BusinessPlanViewer: 내보내기 버튼 2개 추가
  - "PDF 내보내기": window.open(url, "_blank") → 인쇄 다이얼로그
  - "PPTX 내보내기": blob 다운로드 + isExporting 로딩 상태
- ✅ api-client.ts: 함수 추가
  - `exportBusinessPlanPptx(bizItemId): Promise<Blob>`
  - `exportBusinessPlanHtml(bizItemId): Promise<string>`

#### 테스트 (100% ✅)
- ✅ business-plan-export.test.ts: 6개 테스트 모두 PASS
  1. `format=html` 정상 → 200, text/html, 콘텐츠 포함
  2. `format=pptx` 정상 → 200, pptx content-type, 바이너리
  3. draft 없음 → 404
  4. format 값 오류 → 400
  5. sections 없을 때 draft.content fallback
  6. format 기본값 = html (쿼리 파라미터 미지정)

#### 스키마 (100% ✅)
- ✅ BpExportQuerySchema: format enum("html", "pptx") + default("html")

### Incomplete/Deferred Items
- (없음) — 모든 설계 항목 구현 완료

## Code Metrics

| 지표 | 수치 |
|-----|------|
| 신규 파일 | 4개 (service, route, schema, test) |
| 수정 파일 | 3개 (app.ts, api-client.ts, BusinessPlanViewer.tsx) |
| 신규 테스트 | 6개 (all PASS) |
| 총 테스트 | 3256 pass (누적) |
| 라인 수 | ~600 (service), ~80 (route), ~120 (viewer UI) |

## Lessons Learned

### What Went Well
- **기존 패턴 재활용**: offering-export-service 패턴을 그대로 적용하여 설계 단계부터 구현까지 보스턱 없이 진행
- **테스트 커버리지**: 6가지 시나리오를 선제적으로 테스트 → 100% PASS
- **디자인 토큰 전략**: 별도 테이블 없이 BP_PALETTES 3종으로 깔끔하게 관리
- **Markdown 렌더링**: 간단한 정규표현식으로 h1/h2/h3/리스트/강조 지원

### Areas for Improvement
- **동적 팔레트**: 현재 templateType은 draft id로 추론 → 향후 plan_templates.template_type과 연동 시 더 정확한 팔레트 적용 가능
- **PPTX 텍스트 절단**: 콘텐츠가 길면 자동 절단 → 추후 페이지네이션 고려
- **PDF 인쇄 스타일**: window.print() 기반이므로 브라우저별 출력 형식 차이 가능 → 필요 시 서버 PDF 렌더링 검토

### To Apply Next Time
- **팔레트 동적 로딩**: templateType을 design_config에서 읽도록 리팩토링하면 템플릿별 맞춤 스타일 가능
- **프리뷰 모달**: PPTX 다운로드 전 슬라이드 미리보기 모달 추가하면 UX 개선
- **다국어 지원**: "감사합니다", "목차" 등 하드코딩된 문자열을 다국어 리소스로 이동

## Next Steps

1. **E2E 테스트 추가** (선택): Playwright에서 BusinessPlanViewer 버튼 클릭 테스트
2. **프로덕션 검증**: fx.minu.best 배포 후 실제 PDF/PPTX 다운로드 동작 확인
3. **Phase 23 계획**: F447 (파이프라인 상태 추적) 착수 준비

## Related Documents

- Plan: [[FX-PLAN-216]]
- Design: [[FX-DSGN-216]]
- Previous: [[FX-RPRT-S215]] (F444/F445)
- PRD: `docs/specs/ax-bd-msa/prd-final.md` (Phase 22 기본 설정)

## Sign-Off

**PDCA Cycle Complete** — F446 사업기획서 내보내기 강화 (Sprint 216)

- 모든 설계 요구사항 100% 달성 ✅
- 테스트 6/6 PASS ✅
- 프로덕션 배포 준비 완료 ✅

**다음 마일스톤**: Phase 23 진행
