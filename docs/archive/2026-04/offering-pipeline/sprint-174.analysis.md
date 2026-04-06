---
code: FX-ANLS-S174
title: "Sprint 174 Gap Analysis — E2E 파이프라인 테스트 + BD ROI 메트릭"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-07
updated: 2026-04-07
author: Claude
sprint: 174
f_items: [F383]
phase: "18-E"
design_ref: "[[FX-DSGN-S174]]"
---

# Sprint 174 Gap Analysis — F383

## Match Rate: 100% (14/14 PASS)

| # | 검증 항목 | 판정 |
|---|----------|:----:|
| 1 | POST /offerings/metrics/record → 201 | PASS |
| 2 | GET /offerings/metrics → summary | PASS |
| 3 | GET /offerings/:id/metrics/events → history | PASS |
| 4 | GET /roi/summary → offeringSavingsUsd | PASS |
| 5 | BdRoiCalculatorService offering savings | PASS |
| 6 | E2E: Offering 목록 렌더링 | PASS |
| 7 | E2E: 생성 위자드 | PASS |
| 8 | E2E: 에디터 | PASS |
| 9 | E2E: 디자인 토큰 | PASS |
| 10 | E2E: Export | PASS |
| 11 | E2E: Prototype | PASS |
| 12 | E2E: 검증 | PASS |
| 13 | typecheck 통과 | PASS |
| 14 | 단위 테스트 통과 (16 tests) | PASS |

## 추가 구현 (Design 범위 확장)

- `OfferingEventHistoryQuerySchema` — pagination (limit/offset) 지원
- `makeOfferingPack` — 기존 E2E 호환 mock 함수 (별도 추가)

## 신규 산출물

| 유형 | 파일 | 비고 |
|------|------|------|
| Schema | `offering-metrics.schema.ts` | Zod 5 types |
| Service | `offering-metrics-service.ts` | 4 methods |
| Route | `offering-metrics.ts` | 3 endpoints |
| E2E | `offering-pipeline.spec.ts` | 7 scenarios |
| Unit Test | `offering-metrics-service.test.ts` | 7 tests |
| Unit Test | `offering-metrics-routes.test.ts` | 6 tests |
| Unit Test | `bd-roi-offering.test.ts` | 3 tests |

## 수정 파일

| 파일 | 변경 |
|------|------|
| `bd-roi-calculator.ts` | offering savings 연동 |
| `app.ts` | 라우트 등록 |
| `shared/types.ts` | BdRoiSummary.offeringSavingsUsd |
| `mock-factory.ts` | 5 make 함수 추가 |
