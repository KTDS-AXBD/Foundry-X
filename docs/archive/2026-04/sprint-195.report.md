---
code: FX-RPRT-S195
title: Sprint 195 완료 보고서 — F411 과금 체계
version: "1.0"
status: Active
category: RPRT
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 195 완료 보고서 — F411 과금 체계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F411 — 과금 체계 (API 호출량 추적 + 요금제 Free/Pro/Enterprise) |
| Sprint | 195 |
| 기간 | 2026-04-07 (1일) |
| Match Rate | **100%** |
| 테스트 | 15개 (단위 8 + 통합 7), 전체 통과 |

| 관점 | 내용 |
|------|------|
| Problem | Gate-X SaaS 기반 부재 — 사용량 추적, 요금제 제어, 한도 관리 없음 |
| Solution | D1 UPSERT 집계 + Hono 미들웨어 제어 + REST API 3개 엔드포인트 |
| Function/UX Effect | API 호출 시 자동 추적, 한도 초과 시 429 + Rate-Limit 헤더 반환 |
| Core Value | SaaS 과금 인프라 완성 — F412 SDK에서 즉시 활용 가능한 기반 |

## 구현 결과

### 신규 파일 (9개)

| 파일 | 역할 |
|------|------|
| `db/migrations/0116_billing.sql` | subscription_plans + tenant_subscriptions + usage_records 3개 테이블 |
| `modules/billing/services/usage-tracking.service.ts` | recordCall (UPSERT) + getSummary + isOverLimit |
| `modules/billing/services/plan.service.ts` | listPlans + getTenantPlan + updateTenantPlan |
| `modules/billing/schemas/billing.schema.ts` | UpdatePlanSchema (enum) + UsageSummarySchema + SubscriptionPlanSchema |
| `modules/billing/routes/billing.ts` | GET /usage, GET /plans, PUT /plan (admin 전용) |
| `modules/billing/index.ts` | 모듈 진입점 |
| `middleware/usage-limiter.ts` | API 호출 추적 + 한도 제어 미들웨어 |
| `__tests__/services/usage-tracking.test.ts` | 단위 테스트 8개 |
| `__tests__/billing.test.ts` | 통합 테스트 7개 |

### 수정 파일 (3개)

| 파일 | 변경 내용 |
|------|-----------|
| `modules/index.ts` | billing 모듈 등록 |
| `app.ts` | usageLimiter 미들웨어 주입 + billingRoute 등록 |
| `__tests__/helpers/mock-d1.ts` | billing 테이블 3개 추가 |

## 요금제 구조

| 플랜 | 월간 한도 | Enterprise 특수 처리 |
|------|-----------|---------------------|
| Free | 1,000 회 | — |
| Pro | 50,000 회 | — |
| Enterprise | 무제한 (`-1`) | isOverLimit 항상 false |

## 기술 결정

- **UPSERT 패턴**: `ON CONFLICT DO UPDATE SET api_calls = api_calls + 1` — 원자적 카운터 (레이스 컨디션 없음)
- **미들웨어 위치**: tenantGuard → usageLimiter → 라우트 (orgId 주입 후에 추적)
- **스킵 경로**: `/api/billing/*`, `/api/health` (과금 조회 자체는 카운트 안 함)
- **헤더 표현**: Enterprise `"unlimited"` 문자열 (숫자 -1보다 가독성 좋음)
- **admin 체크**: `admin` OR `owner` 역할 허용 (owner가 admin 권한 포함하는 것이 합리적)

## Gap Analysis 결과

| 카테고리 | 항목 수 | 통과 | 점수 |
|----------|---------|------|------|
| DB Schema | 6 | 6 | 100% |
| Services | 9 | 9 | 100% |
| Middleware | 8 | 8 | 100% |
| API | 4 | 4 | 100% |
| Zod Schema | 2 | 2 | 100% |
| Tests | 9 | 9 | 100% |
| **합계** | **38** | **38** | **100%** |

## 다음 작업

- **F412 (Sprint 196)**: TypeScript SDK + CLI 도구 — F411 billing API를 SDK에서 래핑
- **F413 (Sprint 197)**: Foundry-X 수집 코드 격리 (core/collection/ 분리)
