# AX BD MSA 재조정 Planning Document

> **Summary**: Foundry-X 모놀리스를 BD 2~3단계 전용으로 모듈화하고, harness-kit 공통 기반 패키지를 생성하여 MSA 전환의 토대를 마련
>
> **Project**: Foundry-X
> **Version**: Phase 20 (cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0)
> **Author**: Sinclair Seo (AX BD팀)
> **Date**: 2026-04-07
> **Status**: Draft
> **PRD Reference**: `docs/specs/ax-bd-msa/prd-final.md`
> **MSA 설계서**: `docs/specs/AX-BD-MSA-Restructuring-Plan.md` (FX-DSGN-MSA-001 v3)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Foundry-X 모놀리스(118 routes, 252 services, D1 113건)에 BD 6+1단계가 혼재 — 단계별 독립 배포/운영 불가, 복잡도 한계 도달 |
| **Solution** | 2단계 접근법: Phase 20-A(단일 Workers 내 모듈화) → Phase 20-B(harness-kit + 이벤트/프록시 인프라) — 물리적 서비스 분리는 후속 Phase |
| **Function/UX Effect** | 코드 모듈 경계 확립으로 독립 개발/테스트 가능, harness-kit으로 1분 내 새 서비스 scaffold 생성, 기존 기능 회귀 0건 |
| **Core Value** | BD 프로세스 각 단계의 독립 운영 기반 확보 — 향후 Gate-X, Launch-X 등 서비스 즉시 창건 가능 |

---

## 1. Overview

### 1.1 Purpose

Foundry-X 모놀리스에서 BD 프로세스 2~3단계(발굴+형상화) 이외의 기능을 모듈 경계로 분리하고, 새 서비스의 공통 기반인 harness-kit 패키지를 구축하여, MSA 전환의 첫 단계를 완성한다.

### 1.2 Background

- Foundry-X는 F1~F391(19 Phase, 178 Sprint)를 거치며 모놀리스로 성장
- 현재 118 routes, 252 services, 133 schemas, D1 0001~0113 규모
- Auth/SSO, Dashboard, Wiki, 검증, 제품화, GTM, 평가까지 BD 전 단계가 단일 Workers에 혼재
- MSA 설계서(FX-DSGN-MSA-001 v3)에서 7개 서비스 + AXIS DS 분리 계획 수립
- **Phase 20 범위**: Foundry-X 축소 + harness-kit만 실행 (나머지 서비스는 별도 프로젝트)

### 1.3 Related Documents

- PRD: `docs/specs/ax-bd-msa/prd-final.md`
- MSA 설계서: `docs/specs/AX-BD-MSA-Restructuring-Plan.md`
- 인터뷰 로그: `docs/specs/ax-bd-msa/interview-log.md`
- AI 검토 이력: `docs/specs/ax-bd-msa/review-history.md`

---

## 2. Scope

### 2.1 In Scope (F392~F401)

- [x] F392: 전체 라우트/서비스/스키마 서비스별 태깅 + D1 테이블 소유권 태깅 + FK 목록
- [x] F393: F268~F391 증분 124건 서비스 배정 확정 + MSA 설계서 갱신
- [x] F394: harness-kit 패키지 — Workers scaffold + D1 + JWT + CORS + 이벤트 + CI/CD
- [x] F395: `harness create` CLI + ESLint 크로스서비스 접근 금지 룰
- [x] F396: Auth/SSO → `modules/auth/` + Dashboard/Wiki → `modules/portal/` 모듈 분리
- [x] F397: 검증 → `modules/gate/` + 제품화/GTM → `modules/launch/` + 코어 정리
- [x] F398: 이벤트 카탈로그 8종 스키마 + EventBus PoC + Web IA 개편 (sidebar 서비스 경계 그룹, `/ax-bd/*` redirect, 코어 메뉴 정리)
- [x] F399: Strangler Fig 프록시 레이어 + harness-kit 이벤트 유틸리티
- [x] F400: E2E 서비스별 태깅 + IA E2E 검증 + 전체 회귀 테스트 + Gate-X scaffold PoC
- [x] F401: Production 배포 + smoke test + harness-kit 문서화

### 2.2 Out of Scope

- AI Foundry 포털 서비스 구현 (harness-kit 기반 별도 프로젝트)
- Discovery-X / Gate-X / Launch-X / Eval-X 서비스 구현 (별도)
- Recon-X 리네임 (별도 프로젝트)
- AXIS Design System 확장 (독립 프로젝트)
- Foundry-X에서 이관 대상 기능 실제 삭제 (별도 서비스 구축 후)
- 물리적 D1 데이터베이스 분리 (Phase 20 이후)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 118 라우트를 `core/` vs `modules/` 디렉토리로 분류 | High | Pending |
| FR-02 | 252 서비스를 서비스별로 태깅 (foundry-x / portal / gate / launch) | High | Pending |
| FR-03 | D1 50+ 테이블에 `@service` 소유권 주석 추가 | High | Pending |
| FR-04 | 크로스 서비스 FK 목록 문서화 (users.id, biz_items.id 등) | High | Pending |
| FR-05 | harness-kit: Workers scaffold 생성 (Hono + D1 + JWT + CORS) | High | Pending |
| FR-06 | harness-kit: `harness create <name>` CLI 명령 | High | Pending |
| FR-07 | ESLint 룰: `modules/auth/`에서 `core/discovery/`의 서비스 직접 import 금지 | High | Pending |
| FR-08 | Auth/SSO 코드를 `modules/auth/` 디렉토리로 이동 | High | Pending |
| FR-09 | Dashboard/KPI/Wiki 코드를 `modules/portal/` 디렉토리로 이동 | High | Pending |
| FR-10 | 검증(validation/decision) 코드를 `modules/gate/` 디렉토리로 이동 | High | Pending |
| FR-11 | 제품화/GTM(pipeline/mvp/offering-pack) 코드를 `modules/launch/` 이동 | High | Pending |
| FR-12 | 이벤트 카탈로그 8종 TypeScript 스키마 정의 | Medium | Pending |
| FR-13 | EventBus PoC — D1 Event Table + Cron Trigger 폴링 | Medium | Pending |
| FR-14 | Strangler Fig 프록시 미들웨어 — 이관 대상 라우트 프록시 가능 | Medium | Pending |
| FR-15 | E2E 테스트 서비스별 태깅 (263개) | Medium | Pending |
| FR-16 | Gate-X scaffold PoC — harness-kit으로 생성 + modules/gate/ 코드 이식 검증 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 회귀 방지 | E2E 263개 + API 전체 테스트 100% 통과 | `pnpm e2e` + `turbo test` |
| 배포 안정성 | Production smoke test 정상 | deploy.yml smoke test |
| 성능 | Workers Cold Start 증가 없음 (<50ms 유지) | Cloudflare Analytics |
| 보안 | JWT/RBAC 인증 체계 유지 | 기존 인증 테스트 통과 |
| 개발 경험 | harness-kit scaffold 1분 내 생성 | `harness create test` 실행 시간 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 118 라우트/252 서비스가 `core/` 또는 `modules/` 디렉토리에 분류됨
- [ ] harness-kit 패키지가 동작하고, `harness create` 명령으로 scaffold 생성 가능
- [ ] Auth/SSO, Dashboard/Wiki, 검증, 제품화/GTM이 모듈 경계로 분리됨
- [ ] ESLint 크로스모듈 접근 금지 룰이 활성화됨
- [ ] 이벤트 카탈로그 8종 스키마가 TypeScript로 정의됨
- [ ] E2E 263개 + API 전체 테스트 100% 통과
- [ ] Production 배포 + smoke test 정상
- [ ] harness-kit 문서 + 개발자 가이드 완성

### 4.2 Quality Criteria

- [ ] E2E 회귀 테스트: 263개 전체 통과
- [ ] API 단위 테스트: 전체 통과
- [ ] TypeCheck: `turbo typecheck` 성공
- [ ] Lint: `turbo lint` 성공
- [ ] Production smoke: deploy.yml 통과

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| D1 데이터 분리 시 FK 무결성 깨짐 | High | Medium | Phase 20에서는 물리적 분리 안 함 — 논리적 태깅 + ESLint 접근 제한만 |
| 모듈 이동 시 import 경로 깨짐 | High | High | Sprint별 git revert 롤백 + 점진적 이동 (1 모듈/Sprint) |
| 1인 개발 일정 초과 | Medium | Medium | Sprint 8 초과 시 범위 재조정 (P1 기능 후순위화) |
| harness-kit이 분산 모놀리스가 됨 | Medium | Low | 비즈니스 로직 포함 금지 원칙 + SemVer 관리 |
| 테스트 분리 시 커버리지 저하 | Medium | Medium | 분리 전/후 비교 커버리지 리포트 |
| Workers Cold Start 증가 | Low | Low | 모듈화만으로는 단일 Workers 유지 — Cold Start 변화 없음 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, BaaS | Web apps with backend | ☑ |
| **Enterprise** | Strict layer separation, microservices | High-traffic systems | ☐ |

> Dynamic 레벨 유지 — Phase 20은 모듈화까지. 실제 MSA 분리가 완료되면 Enterprise로 전환 검토.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 전환 접근법 | Big Bang / Strangler Fig / 모듈화 우선 | **2단계: 모듈화 → Strangler Fig** | 롤백 비용 최소화, 점진적 검증 |
| D1 분리 전략 | 물리적 분리 / 논리적 분리 / Shared DB | **Shared DB + 논리적 분리** | Phase 20에서는 단일 DB 유지, FK 깨짐 방지 |
| 이벤트 버스 | Cloudflare Queue / D1 Event Table / KV | **D1 Event Table + Cron Trigger** | 추가 비용 없음, 기존 D1 활용 |
| 서비스 통신 | REST only / Event only / 혼합 | **REST 기본 + EventBus 보조** | 기존 REST 유지, 비동기는 이벤트 |
| 모듈 경계 강화 | Convention only / ESLint / TS paths | **ESLint 커스텀 룰** | 기존 3종 ESLint 룰 패턴 활용 |
| harness-kit 배포 | npm publish / workspace local | **pnpm workspace local** | 모노리포 내 패키지, 외부 배포 불필요 |

### 6.3 디렉토리 구조 목표

```
packages/api/src/
├── core/                    # Foundry-X 코어 (2~3단계) ← 잔류
│   ├── discovery/           # 발굴: routes, services, schemas
│   └── shaping/             # 형상화: routes, services, schemas
├── modules/                 # 이관 대상 모듈 ← Phase 20-A에서 분리
│   ├── auth/                # Auth/SSO → AI Foundry
│   ├── portal/              # Dashboard/KPI/Wiki/Workspace → AI Foundry
│   ├── gate/                # 검증 → Gate-X
│   ├── launch/              # 제품화/GTM → Launch-X
│   └── infra/               # Agent Orchestration, 공통
├── routes/                  # 기존 라우트 (점진적으로 core/modules로 이동)
├── services/                # 기존 서비스 (점진적으로 core/modules로 이동)
└── index.ts                 # 단일 진입점 유지 (Phase 20 내내)
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] `.claude/rules/` 5종 (coding-style, git-workflow, testing, security, sdd-triangle)
- [x] ESLint configuration (flat config, 3 커스텀 룰)
- [x] Prettier 미사용 (ESLint --fix로 대체)
- [x] TypeScript configuration (`tsconfig.json` strict mode)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **모듈 경계** | 미정의 | `core/` vs `modules/` import 규칙 | High |
| **서비스 태깅** | 미정의 | 테이블/라우트 `@service` 주석 규칙 | High |
| **이벤트 스키마** | 미정의 | `packages/shared/events/` 네이밍 | Medium |
| **harness-kit API** | 미정의 | scaffold 구조 + CLI 인터페이스 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| 기존 7종 유지 | JWT_SECRET, GITHUB_TOKEN 등 | Server | ☐ (이미 존재) |
| 신규 없음 | Phase 20에서 새 env var 불필요 | — | — |

---

## 8. Implementation Plan (Sprint 배정)

### Phase 20-A: 모듈화 (Sprint 179~184) — 단일 Workers 내 분리

| Sprint | F-items | 작업 | 산출물 |
|--------|---------|------|--------|
| 179 | F392, F393 | 서비스 태깅 + D1 소유권 + FK 목록 + 증분 배정 확정 | 매핑 문서 + ADR |
| 180 | F394, F395 | harness-kit 패키지 + CLI + ESLint 룰 | `packages/harness-kit/` |
| 181 | F396 (전반) | Auth/SSO → `modules/auth/` 이동 | 모듈 분리, 테스트 통과 |
| 182 | F396 (후반) | Dashboard/KPI/Wiki → `modules/portal/` 이동 | 모듈 분리 |
| 183 | F397 (전반) | 검증 → `modules/gate/` + 제품화 → `modules/launch/` | 모듈 분리 |
| 184 | F397 (후반) | Foundry-X 코어(core/) 정리 + 의존성 제거 | 축소된 Foundry-X |

### Phase 20-B: 분리 준비 (Sprint 185~188) — 인프라 + 이벤트 + IA 개편

| Sprint | F-items | 작업 | 산출물 |
|--------|---------|------|--------|
| 185 | F398 | 이벤트 카탈로그 8종 + EventBus PoC + **Web IA 개편** (sidebar 서비스 경계 그룹, `/ax-bd/*` redirect, "이관 예정" 라벨, 코어 메뉴 정리) | `packages/shared/events/` + sidebar.tsx + router.tsx |
| 186 | F399 | Strangler Fig 프록시 + harness-kit 이벤트 | 프록시 미들웨어 |
| 187 | F400 | E2E 태깅 + IA E2E 검증 + 회귀 테스트 + Gate-X PoC | PoC 서비스 동작 확인 + IA E2E |
| 188 | F401 | Production 배포 + smoke + 문서화 | Production 정상 + 문서 |

### Sprint 의존성

```
Sprint 179 (태깅/분류) ──→ Sprint 180 (harness-kit)
     │                          │
     ▼                          ▼
Sprint 181~184 (모듈 이동) ──→ Sprint 185~186 (이벤트/프록시)
                                    │
                                    ▼
                              Sprint 187~188 (검증/배포)
```

---

## 9. Next Steps

1. [ ] Write design document (`ax-bd-msa.design.md`) — `/pdca design ax-bd-msa`
2. [ ] Sprint 179 착수 — 서비스 태깅 + 아키텍처 결정
3. [ ] harness-kit 기존 scaffold 확인 (`packages/harness-kit/` untracked 상태)
4. [ ] Gap analysis 후 완료 보고 — `/pdca analyze ax-bd-msa`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-07 | PRD 기반 초안 — 2단계 접근법, 10 Sprint, F392~F401 | Sinclair Seo |
