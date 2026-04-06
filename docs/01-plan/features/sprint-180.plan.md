---
code: FX-PLAN-S180
title: "Sprint 180 — M1: harness-kit 패키지 생성"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sprint Autopilot)
system-version: "cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0"
---

# Sprint 180 Plan — M1: harness-kit 패키지 생성

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F394 (harness-kit 패키지), F395 (harness create CLI + ESLint 룰) |
| **Phase** | Phase 20-A: 모듈화 (MSA 재조정) |
| **Sprint** | 180 |
| **PRD** | `docs/specs/ax-bd-msa/prd-final.md` §8 M1 |
| **선행 Sprint** | Sprint 179 (F392+F393 — 서비스 태깅 + 설계서 v4) |
| **예상 산출물** | `packages/harness-kit/` npm 패키지 + ESLint 룰 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 새 서비스를 만들려면 Workers scaffold + D1 setup + JWT + CORS + CI/CD를 매번 처음부터 구성해야 함 |
| **Solution** | harness-kit 패키지로 공통 인프라를 표준화하고, CLI 명령 하나로 scaffold 생성 |
| **Function UX Effect** | `harness create <service-name>` 한 번으로 1분 내 새 서비스 프로젝트 생성 가능 |
| **Core Value** | MSA 전환의 기반 도구 — Sprint 181~188에서 모듈 분리 후 독립 서비스로 전환할 때 harness-kit이 기반 |

---

## 1. 배경 및 목표

### 1.1 배경

Sprint 179에서 전체 118 routes / 252 services / 133 schemas를 7개 서비스(S0~S6, SX)로 분류하고, D1 테이블 소유권을 태깅했어요. 이제 실제로 새 서비스를 만들 수 있는 **공통 기반 패키지**가 필요해요.

PRD §4.1에서 harness-kit의 범위를 명확히 정의했어요:
- Workers scaffold + D1 setup + JWT 검증 미들웨어 + CORS + 이벤트 인터페이스 + CI/CD 템플릿
- 비즈니스 로직 미포함 — 서비스 간 공통 인프라/운영/보안 프레임워크만

### 1.2 목표

1. **F394**: `packages/harness-kit/` 패키지 생성 — Workers scaffold, D1 setup, JWT 미들웨어, CORS, 이벤트 인터페이스, CI/CD 템플릿
2. **F395**: `harness create` CLI 명령 PoC + ESLint 크로스서비스 접근 금지 룰

---

## 2. F-item 상세

### F394: harness-kit 패키지

**SPEC 정의**: harness-kit 패키지 — Workers scaffold + D1 setup + JWT 미들웨어 + CORS + 이벤트 인터페이스 + CI/CD 템플릿 (FX-REQ-386, P0)

**산출물 구조**:
```
packages/harness-kit/
├── src/
│   ├── index.ts                 # 패키지 진입점 (public API)
│   ├── middleware/
│   │   ├── jwt.ts               # JWT 검증 미들웨어 (Hono 호환)
│   │   ├── cors.ts              # CORS 미들웨어 (설정 기반)
│   │   └── error-handler.ts     # 표준 에러 핸들러
│   ├── d1/
│   │   ├── setup.ts             # D1 바인딩 헬퍼
│   │   └── migration-template.ts # 마이그레이션 템플릿 생성
│   ├── events/
│   │   ├── types.ts             # 이벤트 타입 정의 (8종 카탈로그)
│   │   ├── bus.ts               # EventBus 인터페이스 (D1 Event Table 기반)
│   │   └── publisher.ts         # 이벤트 발행 헬퍼
│   ├── scaffold/
│   │   └── templates/           # Workers 프로젝트 템플릿
│   │       ├── wrangler.toml.hbs
│   │       ├── src/index.ts.hbs
│   │       ├── src/app.ts.hbs
│   │       ├── package.json.hbs
│   │       ├── tsconfig.json.hbs
│   │       ├── vitest.config.ts.hbs
│   │       └── .github/workflows/deploy.yml.hbs
│   └── types.ts                 # 공통 타입 (Env, HarnessConfig)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── __tests__/
    ├── jwt.test.ts
    ├── cors.test.ts
    ├── error-handler.test.ts
    ├── event-bus.test.ts
    └── scaffold.test.ts
```

### F395: harness create CLI + ESLint 룰

**SPEC 정의**: `harness create` CLI 명령 PoC + ESLint 크로스서비스 접근 금지 룰 (FX-REQ-387, P0)

**산출물**:

1. **CLI 명령** (`packages/harness-kit/src/cli/`):
   - `harness create <service-name>` — 템플릿 기반 프로젝트 생성
   - `harness init` — 기존 프로젝트에 harness-kit 적용

2. **ESLint 룰** (`packages/harness-kit/src/eslint/`):
   - `no-cross-service-import` — 서비스 모듈 간 직접 import 금지
   - Sprint 179 service-mapping.md의 서비스 경계를 기반으로 검증

---

## 3. 기술 결정

### 3.1 패키지 구조

- **모노리포 내부 패키지**: `packages/harness-kit/`로 pnpm workspace에 추가
- **Hono 호환**: 미들웨어는 Hono MiddlewareHandler 인터페이스 준수
- **템플릿 엔진**: Handlebars (`.hbs`) — 변수 치환만 하면 되는 단순 케이스
- **ESLint**: flat config 방식, `@typescript-eslint/utils` RuleCreator 사용

### 3.2 기존 Foundry-X 코드 재사용

harness-kit은 Foundry-X의 검증된 패턴을 추출하여 범용화해요:
- JWT 미들웨어: `packages/api/src/middleware/auth.ts` 패턴 추출
- CORS: `packages/api/src/app.ts` CORS 설정 범용화
- D1 setup: `packages/api/src/db/` 패턴 추출
- Error handler: `packages/api/src/middleware/error-handler.ts` 패턴 추출

### 3.3 이벤트 인터페이스

Phase 20-B(Sprint 185)에서 EventBus PoC를 구현하지만, harness-kit에는 **인터페이스만** 미리 정의:
- 이벤트 타입 8종 (PRD §4.2 #6)
- Publisher/Subscriber 인터페이스
- 실제 구현은 Sprint 185에서

---

## 4. 작업 순서

| # | 작업 | F-item | 입력 | 출력 | 예상 |
|---|------|--------|------|------|------|
| 1 | harness-kit 패키지 초기 설정 | F394 | pnpm workspace | package.json + tsconfig | 설정 |
| 2 | JWT 미들웨어 구현 | F394 | api/middleware/auth.ts | middleware/jwt.ts + 테스트 | 구현 |
| 3 | CORS 미들웨어 구현 | F394 | api/app.ts | middleware/cors.ts + 테스트 | 구현 |
| 4 | 에러 핸들러 구현 | F394 | api/middleware/ | middleware/error-handler.ts + 테스트 | 구현 |
| 5 | D1 setup 헬퍼 구현 | F394 | api/db/ | d1/setup.ts + 테스트 | 구현 |
| 6 | 이벤트 타입 + 인터페이스 | F394 | PRD §4.2 | events/*.ts | 구현 |
| 7 | scaffold 템플릿 | F394 | Foundry-X 구조 참고 | scaffold/templates/*.hbs | 구현 |
| 8 | harness create CLI 명령 | F395 | scaffold 템플릿 | cli/create.ts + 테스트 | 구현 |
| 9 | ESLint no-cross-service-import | F395 | service-mapping.md | eslint/rules/*.ts + 테스트 | 구현 |
| 10 | 통합 테스트 + typecheck | F394+F395 | 전체 | turbo test + typecheck | 검증 |

---

## 5. 리스크 및 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Handlebars 템플릿의 복잡도 | 템플릿이 과도하게 복잡해질 수 있음 | 최소 변수만 치환 (service-name, account-id, db-name) |
| ESLint 룰의 false positive | 합법적 크로스 서비스 접근 차단 | `// eslint-disable` + allow-list 설정 지원 |
| 이벤트 인터페이스의 조기 확정 | Sprint 185에서 변경될 수 있음 | 인터페이스만 정의, 구현 없음 |

---

## 6. 검증 기준

| # | 검증 항목 | 방법 | 통과 기준 |
|---|-----------|------|-----------|
| 1 | harness-kit 빌드 | `turbo build --filter=harness-kit` | 에러 0 |
| 2 | 단위 테스트 | `turbo test --filter=harness-kit` | 전체 pass |
| 3 | typecheck | `turbo typecheck --filter=harness-kit` | 에러 0 |
| 4 | scaffold 생성 | `harness create test-service` | 프로젝트 구조 생성 확인 |
| 5 | ESLint 룰 | 크로스서비스 import에서 에러 발생 | violation 감지 |
| 6 | 기존 테스트 무영향 | `turbo test` (전체) | 기존 테스트 pass |

---

## 7. 참조 문서

| 문서 | 용도 |
|------|------|
| `docs/specs/ax-bd-msa/prd-final.md` | PRD (§4.1 harness-kit 범위, §8 M1) |
| `docs/specs/ax-bd-msa/service-mapping.md` | Sprint 179 서비스 태깅 결과 |
| `docs/specs/ax-bd-msa/d1-ownership.md` | D1 테이블 소유권 |
| `docs/specs/ax-bd-msa/adr-001-d1-shared-db.md` | D1 Shared DB 전략 |
| `docs/specs/AX-BD-MSA-Restructuring-Plan.md` | MSA 설계서 v4 |
