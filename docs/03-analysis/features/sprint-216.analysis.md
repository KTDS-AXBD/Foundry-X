---
code: FX-ANLS-216
title: Sprint 216 Gap Analysis — F446 사업기획서 내보내기 강화
version: 1.0
status: Active
category: ANLS
system-version: Sprint 216
created: 2026-04-08
updated: 2026-04-08
author: gap-detector
---

# Sprint 216 Gap Analysis — F446 사업기획서 내보내기 강화

## 분석 개요

| 항목 | 값 |
|------|-----|
| Feature | F446 사업기획서 PDF/PPTX 내보내기 강화 |
| Design | `docs/02-design/features/sprint-216.design.md` |
| 분석 일자 | 2026-04-08 |
| **Overall Match Rate** | **100%** |
| **Status** | **PASS** |

## Gap 체크리스트 (18/18 PASS)

| # | 항목 | Design 근거 | 구현 파일 | 상태 |
|---|------|-----------|-----------|------|
| 1 | API 라우트 app.ts 마운트 | §8 | `app.ts:300` | ✅ PASS |
| 2 | `GET /biz-items/:id/business-plan/export` | §3.1 | `business-plan-export.ts` | ✅ PASS |
| 3 | `BpExportQuerySchema` (format enum) | §3.2 | `business-plan-export.schema.ts` | ✅ PASS |
| 4 | HTML 내보내기 (CSS 변수 포함) | §4.4 | `business-plan-export-service.ts` | ✅ PASS |
| 5 | PPTX 내보내기 (Uint8Array 바이너리) | §4.3 | `business-plan-export-service.ts` | ✅ PASS |
| 6 | 팔레트 3종 (internal/proposal/ir-pitch) | §2.2 | `business-plan-export-service.ts` | ✅ PASS |
| 7 | draft 없음 → 404 | §3.4 | `business-plan-export.ts` | ✅ PASS |
| 8 | format 오류 → 400 | §3.4 | `business-plan-export.ts` | ✅ PASS |
| 9 | "PDF 내보내기" 버튼 | §6.1 | `BusinessPlanViewer.tsx` | ✅ PASS |
| 10 | "PPTX 내보내기" 버튼 + disabled | §6.1 | `BusinessPlanViewer.tsx` | ✅ PASS |
| 11 | PPTX blob 다운로드 (createObjectURL) | §6.2 | `BusinessPlanViewer.tsx` | ✅ PASS |
| 12 | PDF: HTML 새탭 열기 | §6.3 | `BusinessPlanViewer.tsx` | ✅ PASS |
| 13 | `exportBusinessPlanPptx()` api-client | §6.4 | `api-client.ts` | ✅ PASS |
| 14 | 테스트: HTML 200 + text/html | §7.1 | `business-plan-export.test.ts` | ✅ PASS |
| 15 | 테스트: PPTX 200 + Content-Type | §7.1 | `business-plan-export.test.ts` | ✅ PASS |
| 16 | 테스트: draft 없음 404 | §7.1 | `business-plan-export.test.ts` | ✅ PASS |
| 17 | 테스트: format invalid 400 | §7.1 | `business-plan-export.test.ts` | ✅ PASS |
| 18 | PPTX Content-Disposition 헤더 | §3.3 | `business-plan-export.ts` | ✅ PASS |

## 양성 추가 (Design 외 구현 — 품질 향상)

| 항목 | 위치 | 효과 |
|------|------|------|
| `exportBusinessPlanHtml()` api-client | `api-client.ts` | PDF 새탭 열기 외 별도 활용 가능 |
| PPTX 표지 + 목차 + 마무리 슬라이드 | export-service | 완성도 향상 |
| `resolveSections()` fallback | export-service | sections 없을 때 draft.content 활용 |
| 추가 테스트 2건 | export.test.ts | 커버리지 향상 |

## 결론

**Match Rate: 100% → PASS** — 완료 보고서 작성 가능
