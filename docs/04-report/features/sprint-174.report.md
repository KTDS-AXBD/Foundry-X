---
code: FX-RPRT-S174
title: "Sprint 174 완료 보고서 — E2E 파이프라인 테스트 + BD ROI 메트릭"
version: "1.0"
status: Active
category: RPRT
created: 2026-04-07
updated: 2026-04-07
author: Claude
sprint: 174
f_items: [F383]
phase: "18-E"
---

# Sprint 174 완료 보고서 — F383

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F383 E2E 파이프라인 테스트 + BD ROI 메트릭 |
| 기간 | 2026-04-07 |
| Phase | 18-E (Offering Pipeline — Polish, Phase 18 최종) |
| Match Rate | **100%** (14/14 PASS) |

| 관점 | 결과 |
|------|------|
| Problem | Phase 18 Offering 파이프라인 전체 흐름 E2E 검증 부재 + Offering 운영 메트릭 미수집 |
| Solution | Playwright 7 시나리오 + Offering 메트릭 API 3 endpoints + BD ROI 연동 |
| Function UX Effect | 발굴→Offering→검증 전 과정 자동 검증, ROI 대시보드에서 Offering 절감액 확인 |
| Core Value | Phase 18 품질 보증 완성 + 데이터 기반 Offering 생산성 측정 |

---

## 산출물

### 신규 파일 (7)
| # | 파일 | 유형 |
|---|------|------|
| 1 | `packages/api/src/schemas/offering-metrics.schema.ts` | Zod 스키마 |
| 2 | `packages/api/src/services/offering-metrics-service.ts` | 서비스 (4 methods) |
| 3 | `packages/api/src/routes/offering-metrics.ts` | 라우트 (3 endpoints) |
| 4 | `packages/web/e2e/offering-pipeline.spec.ts` | E2E 테스트 (7 scenarios) |
| 5 | `packages/api/src/__tests__/offering-metrics-service.test.ts` | 단위 테스트 (7) |
| 6 | `packages/api/src/__tests__/offering-metrics-routes.test.ts` | 라우트 테스트 (6) |
| 7 | `packages/api/src/__tests__/bd-roi-offering.test.ts` | 통합 테스트 (3) |

### 수정 파일 (4)
| # | 파일 | 변경 |
|---|------|------|
| 1 | `packages/api/src/services/bd-roi-calculator.ts` | offering savings 연동 |
| 2 | `packages/api/src/app.ts` | 라우트 등록 |
| 3 | `packages/shared/src/types.ts` | BdRoiSummary.offeringSavingsUsd |
| 4 | `packages/web/e2e/fixtures/mock-factory.ts` | 5 make 함수 추가 |

### PDCA 문서 (4)
- Plan: `FX-PLAN-S174`
- Design: `FX-DSGN-S174`
- Analysis: `FX-ANLS-S174` (Match 100%)
- Report: `FX-RPRT-S174` (본 문서)

---

## 수치

| 지표 | 값 |
|------|-----|
| 신규 API endpoints | 3 |
| 신규 E2E scenarios | 7 |
| 단위 테스트 | 16 pass |
| Typecheck | 0 error |
| Match Rate | 100% |
| 신규 D1 마이그레이션 | 0 (skill_executions 재활용) |

---

## 핵심 설계 결정

**skill_executions 재활용**: 별도 D1 테이블 대신 F274의 기존 `skill_executions` 테이블을 활용. `skill_id = "offering-{eventType}"` 패턴으로 저장하여 기존 메트릭 집계와 자연스럽게 통합. 마이그레이션 0건으로 배포 리스크 최소화.

**BD ROI 연동**: `BdRoiCalculatorService.calculate()`에 `OfferingMetricsService.calculateOfferingSavings()` 연동. 수동 제안서 작성(4시간) 대비 자동화 시간 절감을 달러로 환산하여 `totalSavings`에 합산.

---

## Phase 18 Offering Pipeline 완결

Sprint 174(F383)는 Phase 18의 마지막 Feature. Phase 18 전체 21개 F-item (F363~F383) 구현 완료.

| 배치 | Sprint | F-items | 상태 |
|------|--------|---------|------|
| 1 Foundation | 165, 166 | F363~F368 | ✅ |
| 2 Data Layer | 167, 168 | F369~F373 | ✅ |
| 3 Full UI | 169, 170 | F374~F377 | ✅ |
| 4 Integration | 171, 172 | F378~F380 | ✅ |
| 5 Polish | 173, 174 | F381~F383 | ✅ |
