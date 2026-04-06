---
code: FX-RPRT-S180
title: "Sprint 180 완료 보고서 — harness-kit 패키지 생성"
version: "1.0"
status: Active
category: RPRT
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sprint Autopilot)
system-version: "cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0"
---

# Sprint 180 완료 보고서 — harness-kit 패키지 생성

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F394 (harness-kit 패키지) + F395 (harness create CLI + ESLint) |
| **Sprint** | 180 |
| **Phase** | Phase 20-A: 모듈화 (MSA 재조정) |
| **Match Rate** | **100%** (52/52 PASS) |
| **테스트** | 38 tests (9 files) — 전체 pass |
| **typecheck** | 7/7 패키지 pass (harness-kit 포함) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 새 서비스를 만들려면 Workers scaffold + D1 + JWT + CORS + CI/CD를 매번 처음부터 구성 |
| **Solution** | `@foundry-x/harness-kit` 패키지로 공통 인프라 표준화 |
| **Function UX Effect** | `harness create <name>` 한 번으로 서비스 scaffold 1분 내 생성 |
| **Core Value** | MSA 전환 기반 도구 완성 — Sprint 181~188에서 즉시 활용 가능 |

---

## 1. 완료 항목

### F394: harness-kit 패키지 ✅

| 컴포넌트 | 파일 | 상태 |
|----------|------|------|
| JWT 미들웨어 | `src/middleware/jwt.ts` | ✅ public path 스킵 + JWT 검증 |
| CORS 미들웨어 | `src/middleware/cors.ts` | ✅ 설정 기반 origin 허용 |
| RBAC 미들웨어 | `src/middleware/rbac.ts` | ✅ 역할 수준 체크 |
| 에러 핸들러 | `src/middleware/error-handler.ts` | ✅ HarnessError + 500 fallback |
| D1 헬퍼 | `src/d1/setup.ts` | ✅ getDb + runQuery + runExec |
| 이벤트 타입 | `src/events/types.ts` | ✅ 8종 EventType + DomainEvent |
| EventBus | `src/events/bus.ts` | ✅ NoopEventBus (Sprint 185에서 교체) |
| Scaffold 생성기 | `src/scaffold/generator.ts` | ✅ Handlebars 기반 |
| 템플릿 8종 | `src/scaffold/templates/` | ✅ wrangler + pkg + ts + vitest + src 3개 + deploy |

### F395: CLI + ESLint ✅

| 컴포넌트 | 파일 | 상태 |
|----------|------|------|
| CLI 진입점 | `src/cli/index.ts` | ✅ Commander 기반 |
| create 명령 | `src/cli/create.ts` | ✅ scaffold 생성 + service-id 검증 |
| ESLint 룰 | `src/eslint/no-cross-service-import.ts` | ✅ 모듈 경계 import 금지 |
| 플러그인 | `src/eslint/index.ts` | ✅ eslint-plugin-harness-kit |

---

## 2. 수치

| 항목 | 값 |
|------|-----|
| 소스 파일 | 18개 |
| 테스트 파일 | 9개 |
| 테스트 수 | 38개 (전체 pass) |
| 템플릿 파일 | 8개 (.hbs) |
| 패키지 크기 | ~500 LOC (src/) |
| 의존성 | commander, handlebars, hono |

---

## 3. 아키텍처 결정

1. **Foundry-X 패턴 추출**: JWT/CORS/RBAC 미들웨어를 기존 코드에서 범용화 — 설정 기반으로 전환
2. **이벤트는 인터페이스만**: NoopEventBus로 Sprint 185까지 bridge
3. **ESLint 경계 강제**: 코드 리뷰 의존 대신 자동화된 모듈 경계 검증
4. **Handlebars 템플릿**: 단순 변수 치환에 적합, 과도한 복잡성 회피

---

## 4. 다음 단계

- **Sprint 181~182**: Auth/SSO + Portal 모듈 분리 (`modules/auth/`, `modules/portal/`)
- **Sprint 183~184**: Gate + Launch 모듈 분리 + Foundry-X 코어 정리
- **Sprint 185**: EventBus D1 구현 (NoopEventBus → 실제 구현 교체)
