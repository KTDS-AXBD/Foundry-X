---
code: FX-ANLS-067
title: "Sprint 67 Gap Analysis — F209 AI Foundry 흡수 + F210 비밀번호 재설정"
version: 1.0
status: Active
category: ANLS
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 67
features: [F209, F210]
match_rate: 95
---

## Executive Summary

| 항목 | 값 |
|------|-----|
| **Match Rate** | 95% |
| **신규 파일** | 19 (services 5, routes 1, schemas 2, migrations 3, tests 7, modified 3) |
| **신규 테스트** | 72 (all pass) |
| **기존 테스트 회귀** | 0 (3 pre-existing failures unrelated) |
| **Typecheck** | Sprint 67 파일 0 errors |

## Design vs Implementation

| # | Design 항목 | 구현 | 상태 |
|---|---|---|---|
| 1 | 0051_poc_environments.sql | ✅ 동일 | Match |
| 2 | 0052_tech_reviews.sql | ✅ 동일 | Match |
| 3 | 0053_password_reset_tokens.sql | ✅ 동일 | Match |
| 4 | prototype-service.ts (CRUD) | ✅ list/getById/delete + tenant 격리 | Match |
| 5 | poc-env-service.ts | ✅ provision/get/teardown + re-provision 지원 | Match+ |
| 6 | tech-review-service.ts | ✅ 규칙 기반 분석 + DB 저장 | Match |
| 7 | email-service.ts | ✅ Resend API + log-only fallback | Match |
| 8 | password-reset-service.ts | ✅ 토큰 생성/검증/리셋 + RT 폐기 | Match |
| 9 | prototype-ext.ts schema | ✅ 6 Zod schemas | Match |
| 10 | password-reset.ts schema | ✅ 5 Zod schemas | Match |
| 11 | ax-bd-prototypes.ts (8 EP) | ✅ 8 endpoints with error handling | Match |
| 12 | auth.ts (+3 EP) | ✅ forgot/validate/reset | Match |
| 13 | app.ts 라우트 등록 | ✅ axBdPrototypesRoute | Match |
| 14 | env.ts RESEND_API_KEY | ✅ | Match |
| 15 | 테스트 7파일 72건 | ✅ 72/72 pass | Match |

## Improvements Over Design

1. **poc-env-service**: terminated/failed 환경 re-provision 시 기존 레코드 삭제 후 재생성 (UNIQUE 제약 해소)
2. **auth route**: OpenAPIHono `createRoute()` 패턴으로 Swagger 문서 자동 생성
3. **password-reset**: 기존 토큰 자동 무효화 (같은 유저의 미사용 토큰)

## Test Coverage

| 파일 | 테스트 수 | 주요 커버리지 |
|------|----------|--------------|
| prototype-service.test.ts | 12 | list, getById, delete, pagination, tenant isolation, poc/review 포함 |
| poc-env-service.test.ts | 12 | provision, teardown, re-provision, tenant isolation, error cases |
| tech-review-service.test.ts | 10 | analyze (3 feasibility levels), complexity, persist, tenant isolation |
| email-service.test.ts | 3 | log-only, Resend success, Resend failure |
| password-reset-service.test.ts | 11 | createToken, validateToken, resetPassword, expiry, used token, RT revoke |
| auth-password-reset.test.ts | 6 | Full flow, security (single-use, expiry, RT revoke, previous invalidation) |
| ax-bd-prototypes.test.ts | 18 | All 8 endpoints (list, get, delete, poc CRUD, tech-review CRUD) |
| **Total** | **72** | |
