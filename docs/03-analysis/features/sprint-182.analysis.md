---
code: FX-ANLS-S182
title: "Sprint 182 Gap Analysis — F396 Portal 모듈 분리"
version: 1.0
status: Active
category: ANLS
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
design_doc: "[[FX-DSGN-S182]]"
---

# Sprint 182 Gap Analysis

## Match Rate: 100% (11/11 PASS)

| # | Design Item | Status | Notes |
|---|------------|--------|-------|
| 1 | 19 route 파일 → modules/portal/routes/ | ✅ PASS | 19개 확인 |
| 2 | 23 service 파일 → modules/portal/services/ | ✅ PASS | 23개 확인 |
| 3 | 16+ schema 파일 → modules/portal/schemas/ | ✅ PASS | 17개 (notification.schema.ts 추가 발견) |
| 4 | modules/portal/index.ts — 19 route re-export | ✅ PASS | 19 export 라인 |
| 5 | modules/index.ts — portal exports 추가 | ✅ PASS | auth + portal 모두 export |
| 6 | app.ts — import 소스 변경 (등록 순서 유지) | ✅ PASS | 미들웨어 순서 100% 보존 |
| 7 | 이동된 파일 내부 상대 경로 수정 | ✅ PASS | env, middleware, db, utils, external services/schemas |
| 8 | 테스트 파일 import 경로 수정 | ✅ PASS | 19+ 테스트 파일 + vi.mock 경로 수정 |
| 9 | typecheck 통과 | ✅ PASS | 0 new errors (기존 @foundry-x/shared 에러 무관) |
| 10 | test 통과 | ✅ PASS | 309 files, 3161 passed, 0 failed, 1 skipped |
| 11 | ESLint 경계 — auth↔portal 크로스 허용 | ✅ PASS | 두 모듈 모두 AI Foundry 대상이므로 상호 참조 허용 |

## Design 대비 추가 작업

Design에서 예상하지 못했던 추가 작업:

1. **notification.schema.ts** — 17번째 스키마 파일 (Design은 16개 예상)
2. **ESLint 경계 업데이트** — auth↔portal 크로스 참조 허용 필요
3. **root services 참조 수정** — `github.js`, `slack.js`, `notification-service.js` 등 8개 root 서비스가 portal 서비스를 참조 (경로 수정 필요)
4. **portal services의 외부 서비스 참조** — `reviewer-agent.js`, `sse-manager.js`, `spec-parser.js`, `rule-effectiveness-service.js` 경로 수정
5. **vi.mock 경로** — webhook-comment.test.ts 등에서 동적 mock 경로도 변경 필요

## Test Results

```
Test Files  309 passed (309)
Tests       3161 passed | 1 skipped (3162)
Duration    43.45s
```

Sprint 181 결과(3161 passed, 1 skipped)와 정확히 동일.
