---
code: FX-PLAN-S195
title: Sprint 195 Plan — F411 과금 체계 (API 호출량 추적 + 요금제)
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 195 Plan — F411 과금 체계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F411 — 과금 체계 (API 호출량 추적 + 요금제 Free/Pro/Enterprise) |
| Sprint | 195 |
| Phase | 21-D (SaaS 기반, M4) |
| REQ | FX-REQ-403 |
| Priority | P2 |
| 전제 | F410 멀티테넌시 격리 완료 (Sprint 194, PR #336) |

## 목표

Gate-X SaaS 과금 기반을 구축한다:
1. **사용량 추적** — API 호출마다 tenant별 메트릭을 D1에 기록
2. **요금제 제어** — Free/Pro/Enterprise 플랜별 월간 한도 초과 시 429 반환
3. **관리 API** — 사용량 조회 + 플랜 변경 엔드포인트

## 구현 범위

### 신규 파일

| 파일 | 역할 |
|------|------|
| `packages/api/src/db/migrations/0116_billing.sql` | `usage_records` + `subscription_plans` 테이블 |
| `packages/api/src/modules/billing/services/usage-tracking.service.ts` | API 호출량 집계 + 한도 체크 |
| `packages/api/src/modules/billing/services/plan.service.ts` | 요금제 조회/변경 |
| `packages/api/src/modules/billing/schemas/billing.schema.ts` | Zod 스키마 |
| `packages/api/src/modules/billing/routes/billing.ts` | GET /usage, GET /plan, PUT /plan |
| `packages/api/src/modules/billing/index.ts` | 모듈 진입점 |
| `packages/api/src/middleware/usage-limiter.ts` | API 호출 추적 + 한도 미들웨어 |
| `packages/api/src/__tests__/services/usage-tracking.test.ts` | 단위 테스트 |
| `packages/api/src/__tests__/billing.test.ts` | API 통합 테스트 |

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `packages/api/src/modules/index.ts` | billing 모듈 등록 |
| `packages/api/src/app.ts` | usage-limiter 미들웨어 주입 |

## 요금제 정의

| 플랜 | 월간 API 호출 한도 | 가격 |
|------|--------------------|------|
| Free | 1,000 회 | 무료 |
| Pro | 50,000 회 | 추후 결정 |
| Enterprise | 무제한 | 추후 결정 |

## 기술 설계 포인트

- **D1 집계**: `usage_records` 테이블에 tenant + month + count 저장 (UPSERT 패턴)
- **미들웨어 순서**: JWT → tenantGuard → usageLimiter → 라우트 핸들러
- **한도 초과**: HTTP 429 + `X-RateLimit-Limit` / `X-RateLimit-Remaining` 헤더
- **Enterprise 무제한**: limit = -1 로 DB 저장, 미들웨어에서 스킵

## 성공 기준

- [ ] `usage_records` 테이블 생성 (D1 마이그레이션 0116)
- [ ] API 호출 시 usage_records에 UPSERT 기록
- [ ] Free 플랜 1,000회 초과 시 429 반환
- [ ] GET /api/billing/usage → 현재 사용량 + 한도 반환
- [ ] PUT /api/billing/plan → 플랜 변경
- [ ] 단위 테스트 + 통합 테스트 통과

## 비고

- 실제 결제(Stripe 등) 연동은 Out-of-Scope — 요금제 구조와 추적만 구현
- F412 SDK에서 과금 API를 래핑할 예정
