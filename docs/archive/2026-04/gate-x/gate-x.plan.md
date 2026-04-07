---
code: FX-PLAN-S189
title: Gate-X 독립 서비스 Phase 21-A Plan
version: 1.0
status: Draft
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Gate-X 독립 서비스 Planning Document

> **Summary**: Foundry-X Gate(검증) 모듈을 harness-kit 기반 독립 Cloudflare Workers로 분리 — Phase 21 M1 코어 API + 독립 배포
>
> **Project**: Foundry-X → Gate-X
> **Author**: Sinclair Seo
> **Date**: 2026-04-07
> **Status**: Draft
> **PRD**: `docs/specs/gate-x/prd-final.md` (Conditional 수용, R2 73점, Ambiguity 0.167)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Gate(검증) 기능이 FX 모놀리스에 묶여 있어 외부 제공/독립 운영 불가. 118 라우트 중 gate 7개만 필요한 외부 고객도 전체 배포 필요 |
| **Solution** | harness-kit 기반 독립 Workers 서비스로 추출. Queue+DO 비동기 아키텍처로 O-G-D 루프 CPU time 제한 해소 |
| **Function/UX Effect** | 독립 REST API + JWT/API Key 인증. 외부 개발자가 검증 파이프라인을 자사 서비스에 API로 통합 가능 |
| **Core Value** | Gate-X = 검증 서비스의 SaaS화 기반. BD팀 독립 운영 + 사내/외부 고객 제공 + 수익 모델 확장 |

---

## 1. Overview

### 1.1 Purpose

Foundry-X `modules/gate/`의 검증 도메인(7 routes, 7 services, 6 schemas, 2,279줄)을 harness-kit 패키지 기반의 독립 Cloudflare Workers 서비스로 추출한다. 이 Plan은 Phase 21의 M1(코어 API + 독립 배포)에 해당하는 Sprint 189~190을 다룬다.

### 1.2 Background

- Phase 20에서 118개 라우트를 9개 도메인으로 모듈화 완료 (Match 94%)
- harness-kit 패키지: JWT, CORS, RBAC, D1, EventBus, scaffold generator 제공
- F400 (Sprint 187): Gate-X scaffold PoC 완료
- F401 (Sprint 188): harness-kit 문서화 + 개발자 가이드 완료
- **핵심 기술 리스크**: Workers CPU time 제한(10ms/50ms)으로 O-G-D LLM 호출 불가 → Queue+DO 비동기 아키텍처 PoC 필수

### 1.3 Related Documents

- PRD: `docs/specs/gate-x/prd-final.md` (Conditional 착수)
- Phase 20 보고서: `docs/04-report/features/phase-20-completion.report.md`
- harness-kit: `packages/harness-kit/README.md`
- Gate 모듈: `packages/api/src/modules/gate/`
- SPEC: F402~F405 (Phase 21-A)

---

## 2. Scope

### 2.1 In Scope (Sprint 189~190)

- [F402] Gate-X 독립 Workers 프로젝트 scaffold + wrangler.toml + D1 전용 DB
- [F403] Gate 모듈 추출 — 7 routes + 7 services + 6 schemas 독립 이전 + Tenant ID
- [F404] O-G-D 루프 비동기 아키텍처 — Cloudflare Queues + Durable Objects PoC
- [F405] JWT 독립 인증 + API Key 발급 + RBAC + CI/CD 파이프라인

### 2.2 Out of Scope

- Web UI 대시보드 (M2, F407)
- Foundry-X ↔ Gate-X 이벤트 연동 (M2, F406)
- 다중 AI 모델 / 커스텀 룰 / 웹훅 / 멀티테넌시 / 과금 / SDK (M2~M4)
- Foundry-X 코어 기능, 다른 모듈 분리

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | F-item | Sprint |
|----|-------------|----------|--------|--------|
| FR-01 | Gate-X Workers scaffold 생성 (harness-kit `scaffold generate`) | P0 | F402 | 189 |
| FR-02 | Gate-X 전용 D1 DB 생성 + gate 테이블 마이그레이션 | P0 | F402 | 189 |
| FR-03 | modules/gate/ 7 routes를 Gate-X Hono app으로 이전 | P0 | F403 | 189 |
| FR-04 | modules/gate/ 7 services + 6 schemas 이전 + 의존성 해소 | P0 | F403 | 189 |
| FR-05 | 모든 엔티티에 `tenant_id` 컬럼 포함 (멀티테넌시 준비) | P0 | F403 | 189 |
| FR-06 | O-G-D 루프를 Cloudflare Queues로 비동기 실행 | P0 | F404 | 190 |
| FR-07 | Durable Objects로 검증 세션 상태 관리 | P0 | F404 | 190 |
| FR-08 | Queue consumer에서 LLM API 호출 + 결과 D1 저장 | P0 | F404 | 190 |
| FR-09 | JWT 독립 인증 (harness-kit createAuthMiddleware) | P0 | F405 | 190 |
| FR-10 | API Key 발급/검증 엔드포인트 | P0 | F405 | 190 |
| FR-11 | RBAC (admin/user/guest) + 테넌트 기반 접근 제어 | P0 | F405 | 190 |
| FR-12 | GitHub Actions deploy.yml (D1 migration + Workers deploy + smoke test) | P0 | F405 | 190 |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | API 응답시간 p95 < 500ms (CRUD 엔드포인트) | Workers Analytics |
| Performance | O-G-D 비동기 처리 완료 < 60s (Queue → LLM → D1) | 로그 타임스탬프 측정 |
| Reliability | Workers 가용성 > 99.5% | Cloudflare dashboard |
| Security | JWT + API Key 인증, RBAC, CORS | 인증 없는 요청 401/403 확인 |
| Compatibility | 기존 gate 모듈과 API 응답 형식 동등성 100% | E2E 비교 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] Gate-X가 `gate-x-api.ktds-axbd.workers.dev`에 독립 배포됨
- [ ] 기존 modules/gate/ 7개 엔드포인트가 Gate-X에서 동일하게 동작
- [ ] O-G-D 루프가 Queue+DO 비동기로 성공적으로 실행됨 (CPU time 초과 없음)
- [ ] JWT + API Key 인증이 동작하고 미인증 요청이 차단됨
- [ ] CI/CD가 자동 D1 마이그레이션 + Workers deploy 수행
- [ ] 단위 테스트 + smoke test 통과

### 4.2 Quality Criteria

- [ ] TypeScript strict mode, eslint 통과
- [ ] Vitest 단위 테스트 주요 서비스 커버리지
- [ ] D1 마이그레이션 정합성 (테이블 + 인덱스)
- [ ] harness-kit ESLint 룰 (no-cross-module-import) 적용

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Workers CPU time 초과로 O-G-D 실행 불가 | **High** | **High** | Queues + DO 비동기 패턴. F404에서 PoC 검증. 실패 시 프로젝트 중단 조건 |
| D1 스키마 마이그레이션 불일치 | Medium | Medium | FX gate 테이블 DDL 기반 + tenant_id 추가. 테스트 환경 먼저 적용 |
| harness-kit 의존성 버전 충돌 | Medium | Low | harness-kit를 pnpm workspace 패키지로 공유. 버전 고정 |
| Gate 서비스 코드에 FX 코어 의존성 잔존 | Medium | Medium | eslint no-cross-module-import 룰로 사전 차단 + import 분석 |
| Queue/DO 비용 예측 불가 | Low | Medium | Free tier 범위 확인 + 사용량 모니터링 |
| 외부 LLM API 장애 시 Queue 적체 | Medium | Medium | 재시도 정책 (3회, exponential backoff) + DLQ (Dead Letter Queue) |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | |
| **Dynamic** | Feature-based modules, BaaS | Web apps, SaaS MVPs | **✅** |
| **Enterprise** | Strict layers, DI, microservices | High-traffic systems | |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Runtime | Cloudflare Workers / Node.js / Deno | **Cloudflare Workers** | FX 기존 스택 + harness-kit 호환 + Edge 성능 |
| Framework | Hono / itty-router / Elysia | **Hono** | FX API와 동일, harness-kit 미들웨어 호환 |
| DB | D1 전용 / Shared D1 / Turso | **D1 전용 (gate-x-db)** | 외부 제공 시 깨끗한 분리. PRD §7.1 권장안 A |
| 비동기 처리 | Queue / DO / Queue+DO | **Queue + DO** | Queue: 작업 분배, DO: 세션 상태 관리 |
| 인증 | FX SSO / 독립 JWT / API Key | **독립 JWT + API Key** | 외부 고객에게 FX 계정 불필요. PRD §7.2 권장안 A |
| CI/CD | GitHub Actions / Wrangler CLI | **GitHub Actions** | FX와 동일 패턴 (deploy.yml) |
| 테스트 | Vitest / Jest | **Vitest** | FX 기존 도구 + harness-kit 테스트 패턴 |
| 모노리포 위치 | packages/gate-x/ vs 별도 리포 | **packages/gate-x/** | 초기 개발 편의. harness-kit 공유. 추후 분리 가능 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

Gate-X 프로젝트 구조:
┌─────────────────────────────────────────────────────┐
│ packages/gate-x/                                    │
│   ├── src/                                          │
│   │   ├── routes/         # Hono 라우트 (7개)       │
│   │   ├── services/       # 비즈니스 로직 (7개)     │
│   │   ├── schemas/        # Zod 스키마 (6개)        │
│   │   ├── queue/          # Queue consumer + producer│
│   │   ├── durables/       # Durable Objects 클래스   │
│   │   ├── middleware/     # JWT, API Key, RBAC       │
│   │   ├── db/                                       │
│   │   │   └── migrations/ # D1 마이그레이션          │
│   │   ├── app.ts          # Hono app 엔트리         │
│   │   └── index.ts        # Workers 엔트리          │
│   ├── __tests__/          # Vitest 테스트            │
│   ├── wrangler.toml       # Workers 설정            │
│   ├── package.json                                  │
│   ├── tsconfig.json                                 │
│   └── vitest.config.ts                              │
└─────────────────────────────────────────────────────┘
```

### 6.4 O-G-D 비동기 아키텍처 (F404 핵심)

```
Client → POST /validate → Workers (즉시 202 Accepted + job_id)
                              ↓
                     Queue Producer (enqueue)
                              ↓
                     Cloudflare Queue
                              ↓
                     Queue Consumer (batch)
                       ├── LLM Generator 호출
                       ├── LLM Discriminator 호출
                       ├── 결과 D1 저장
                       └── DO 상태 업데이트
                              ↓
Client → GET /validate/:job_id → DO (상태 조회: pending/running/completed/failed)
```

### 6.5 D1 스키마 설계 원칙

1. **tenant_id 필수**: 모든 테이블에 `tenant_id TEXT NOT NULL` + 인덱스
2. **FX gate 테이블 기반**: 기존 DDL에서 gate 관련 테이블만 추출
3. **추가 테이블**: `api_keys`, `tenants`, `queue_jobs` (비동기 작업 추적)
4. **마이그레이션 번호**: `0001`부터 독립 시작 (FX D1과 별도)

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] `docs/01-plan/conventions.md` — FX 기존 규칙 적용
- [x] ESLint configuration (flat config)
- [x] TypeScript configuration (strict mode)
- [x] harness-kit ESLint 룰 (no-cross-module-import)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | FX 규칙 존재 | Gate-X 전용 prefix (gx_) for DB | High |
| **Folder structure** | 위 §6.3 참조 | packages/gate-x/ 구조 확정 | High |
| **API versioning** | 없음 | `/v1/` prefix 적용 | High |
| **Error handling** | FX 패턴 존재 | harness-kit HarnessError 활용 | Medium |
| **Environment variables** | 아래 참조 | Gate-X 전용 env vars | High |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `JWT_SECRET` | JWT 서명 키 | Server (Workers Secret) | ✅ |
| `ANTHROPIC_API_KEY` | Claude API 호출 | Server (Workers Secret) | ✅ |
| `OPENAI_API_KEY` | GPT API 호출 | Server (Workers Secret) | ✅ |
| `GOOGLE_AI_API_KEY` | Gemini API 호출 | Server (Workers Secret) | ✅ |

---

## 8. Implementation Strategy

### 8.1 Sprint 189 (F402 + F403)

**목표**: Gate-X Workers 프로젝트 생성 + Gate 모듈 코드 이전

| 순서 | 작업 | 예상 파일 |
|------|------|-----------|
| 1 | harness-kit scaffold generate로 프로젝트 생성 | packages/gate-x/* |
| 2 | wrangler.toml 작성 (D1 binding, Queue, DO) | wrangler.toml |
| 3 | D1 전용 DB 생성 (`wrangler d1 create gate-x-db`) | — |
| 4 | gate 테이블 마이그레이션 작성 (tenant_id 포함) | src/db/migrations/0001_*.sql |
| 5 | modules/gate/ routes → src/routes/ 이전 | src/routes/*.ts (7) |
| 6 | modules/gate/ services → src/services/ 이전 | src/services/*.ts (7) |
| 7 | modules/gate/ schemas → src/schemas/ 이전 | src/schemas/*.ts (6) |
| 8 | FX 코어 의존성 해소 (import 경로 정리) | 전체 |
| 9 | Hono app.ts + index.ts 엔트리 작성 | src/app.ts, src/index.ts |
| 10 | 기본 테스트 (서비스 단위 + 라우트 smoke) | __tests__/*.test.ts |

### 8.2 Sprint 190 (F404 + F405)

**목표**: O-G-D 비동기 PoC + 인증 + CI/CD

| 순서 | 작업 | 예상 파일 |
|------|------|-----------|
| 1 | Cloudflare Queue 설정 (wrangler.toml) | wrangler.toml |
| 2 | Queue producer (POST /validate → enqueue) | src/queue/producer.ts |
| 3 | Queue consumer (LLM 호출 + D1 저장) | src/queue/consumer.ts |
| 4 | Durable Object 클래스 (세션 상태 관리) | src/durables/validation-session.ts |
| 5 | GET /validate/:job_id (DO 상태 조회) | src/routes/validation-status.ts |
| 6 | 재시도 정책 + DLQ 처리 | src/queue/retry.ts |
| 7 | JWT 미들웨어 (harness-kit) | src/middleware/auth.ts |
| 8 | API Key 발급/검증 | src/routes/api-keys.ts, src/services/api-key-service.ts |
| 9 | RBAC 미들웨어 | src/middleware/rbac.ts |
| 10 | CI/CD deploy.yml | .github/workflows/gate-x-deploy.yml |
| 11 | 비동기 PoC E2E 테스트 | __tests__/queue.test.ts |

---

## 9. Next Steps

1. [ ] `/pdca design gate-x` — Design 문서 작성
2. [ ] Sprint 189 착수 (F402 + F403)
3. [ ] Sprint 190 착수 (F404 + F405) — **핵심: Queue+DO PoC**
4. [ ] M1 완료 후 Phase 21-B (M2) Plan 갱신

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-07 | 초안 — Phase 21-A (M1) Sprint 189~190 Plan | Sinclair Seo |
