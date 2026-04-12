---
code: FX-ANLS-S181
title: "Sprint 181 Gap Analysis — Auth 모듈 분리 (F396)"
version: 1.0
status: Active
category: ANLS
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 181 Gap Analysis

> **Design**: [[ax-bd-msa.design.md]] §3.3, §11
> **Sprint**: 181 (F396 — Auth/SSO 모듈 분리)
> **Match Rate**: **100%** (12/12 PASS)

---

## 1. Analysis Summary

| # | Design Item | Expected | Actual | Status |
|---|------------|----------|--------|--------|
| 1 | auth 5 routes → modules/auth/routes/ | auth, sso, token, profile, admin | 5/5 이동 | ✅ PASS |
| 2 | auth services → modules/auth/services/ | sso, admin-service | 4개 이동 (+ password-reset, email) | ✅ PASS |
| 3 | auth schemas → modules/auth/schemas/ | auth, sso, token, profile, admin | 6개 이동 (+ password-reset) | ✅ PASS |
| 4 | modules/auth/index.ts | 5 route re-export | 정확히 5개 export | ✅ PASS |
| 5 | modules/index.ts | 모듈 총괄 index | auth 포함, portal placeholder | ✅ PASS |
| 6 | app.ts import 변경 | 모듈 경로로 전환 | 개별 import → 단일 모듈 import | ✅ PASS |
| 7 | 외부 참조 수정 (proxy.ts) | SsoService 경로 | modules/auth/services/sso.js | ✅ PASS |
| 8 | 테스트 파일 import 수정 | 이동된 파일 참조 | 5개 test 파일 수정 완료 | ✅ PASS |
| 9 | no-cross-module-import ESLint 룰 | CLI 플러그인 등록 | 4번째 커스텀 룰 추가 | ✅ PASS |
| 10 | portal 디렉토리 구조 | 빈 placeholder | modules/portal/ (routes/services/schemas) | ✅ PASS |
| 11 | typecheck 전체 통과 | 7/7 packages | 7/7 성공 | ✅ PASS |
| 12 | test 전체 통과 | 회귀 0건 | 309 files, 3161 pass, 0 fail | ✅ PASS |

## 2. File Changes Summary

### 이동된 파일 (14개)
- `routes/` → `modules/auth/routes/`: auth.ts, sso.ts, token.ts, profile.ts, admin.ts (5)
- `schemas/` → `modules/auth/schemas/`: auth.ts, sso.ts, token.ts, profile.ts, admin.ts, password-reset.ts (6)
- `services/` → `modules/auth/services/`: sso.ts, admin-service.ts, password-reset-service.ts, email-service.ts (4 — Design 예상 대비 +2)

### 신규 파일 (4개)
- `modules/auth/index.ts` — 모듈 인덱스
- `modules/index.ts` — 모듈 총괄
- `modules/portal/index.ts` — Portal placeholder
- `packages/cli/src/harness/lint-rules/no-cross-module-import.ts` — ESLint 룰

### 수정된 파일 (7개)
- `app.ts` — import 경로 변경 (5개 라우트 → 모듈)
- `routes/proxy.ts` — SsoService import 경로 변경
- `__tests__/token.test.ts` — import 경로
- `__tests__/email-service.test.ts` — import 경로
- `__tests__/password-reset-service.test.ts` — import 경로
- `__tests__/auth-password-reset.test.ts` — import 경로
- `__tests__/model-metrics.test.ts` — import 경로

## 3. Design vs Implementation Deviations

| Deviation | Reason | Impact |
|-----------|--------|--------|
| password-reset-service, email-service도 auth로 이동 | auth 도메인에 밀접하게 결합 | 긍정적 — 도메인 응집도 향상 |
| password-reset.ts 스키마도 auth로 이동 | auth route에서만 사용 | 긍정적 — 스키마 로컬리티 |
| Design은 ~15 파일 예상, 실제 14+4=18 | 신규 인덱스/ESLint 파일 포함 | 범위 내 |

## 4. Conclusion

Sprint 181은 Design §11 "Sprint 181: auth 5 라우트 + 관련 서비스/스키마 이동"을 100% 달성.
추가로 password-reset-service와 email-service도 auth 도메인으로 이동하여 응집도를 높임.
ESLint no-cross-module-import 룰을 CLI 플러그인에 등록하여 모듈 경계 보호 기반 마련.
