---
code: FX-PLAN-S183
title: "Sprint 183 — F397 Gate+Launch 모듈 분리 (modules/gate/ + modules/launch/)"
version: 1.0
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 183 Plan — Gate + Launch 모듈 분리

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Sprint 181~182에서 Auth(5)+Portal(19) 라우트를 모듈화했으나, 검증(S4: 7개)과 제품화/GTM(S5: 8개) 라우트가 여전히 flat `routes/`에 혼재 |
| **Solution** | S4 Gate-X 7 routes + S5 Launch-X 8 routes와 연관 서비스/스키마를 `modules/gate/`, `modules/launch/`로 이동 + 인덱스 re-export |
| **Function/UX Effect** | Gate/Launch 도메인 독립 개발/테스트 가능, 기존 API 경로 100% 호환 유지 |
| **Core Value** | MSA 전환 M2 3단계 완성 — Gate-X, Launch-X 서비스로 즉시 분리 가능한 기반 |

---

## 1. Scope

### 1.1 F-item

| F-item | 설명 | Sprint 범위 |
|--------|------|-------------|
| F397 | 검증 → `modules/gate/` + 제품화/GTM → `modules/launch/` + Foundry-X 코어 정리 | Sprint 183~184 |

> Sprint 181: Auth 5 routes → `modules/auth/` ✅
> Sprint 182: Portal 19 routes → `modules/portal/` ✅
> **Sprint 183: Gate 7 routes + Launch 8 routes → `modules/gate/` + `modules/launch/` (본 Sprint)**
> Sprint 184: Foundry-X 코어 정리 (다음 Sprint)

### 1.2 Gate 이동 대상 (S4: 7 routes + 7 services + 6 schemas = 20개)

**Routes (7개)**

| # | Route File | Export Name | 도메인 |
|---|-----------|-------------|--------|
| 1 | ax-bd-evaluations.ts | axBdEvaluationsRoute | 평가 |
| 2 | decisions.ts | decisionsRoute | 의사결정 |
| 3 | evaluation-report.ts | evaluationReportRoute | 평가 리포트 |
| 4 | gate-package.ts | gatePackageRoute | 게이트 패키지 |
| 5 | team-reviews.ts | teamReviewsRoute | 팀 리뷰 |
| 6 | validation-meetings.ts | validationMeetingsRoute | 검증 미팅 |
| 7 | validation-tier.ts | validationTierRoute | 검증 티어 |

**Services (7개)**

| # | Service File | 도메인 |
|---|-------------|--------|
| 1 | decision-service.ts | 의사결정 |
| 2 | evaluation-criteria.ts | 평가 기준 |
| 3 | evaluation-report-service.ts | 평가 리포트 |
| 4 | evaluation-service.ts | 평가 |
| 5 | gate-package-service.ts | 게이트 패키지 |
| 6 | meeting-service.ts | 미팅 |
| 7 | validation-service.ts | 검증 |

**Schemas (6개)**

| # | Schema File |
|---|------------|
| 1 | decision.schema.ts |
| 2 | evaluation.schema.ts |
| 3 | evaluation-report.schema.ts |
| 4 | gate-package.schema.ts |
| 5 | team-review-schema.ts |
| 6 | validation.schema.ts |

### 1.3 Launch 이동 대상 (S5: 8 routes + 14 services + 8 schemas = 30개)

**Routes (8개)**

| # | Route File | Export Name | 도메인 |
|---|-----------|-------------|--------|
| 1 | gtm-customers.ts | gtmCustomersRoute | GTM 고객 |
| 2 | gtm-outreach.ts | gtmOutreachRoute | GTM 아웃리치 |
| 3 | mvp-tracking.ts | mvpTrackingRoute | MVP 추적 |
| 4 | offering-packs.ts | offeringPacksRoute | Offering Pack |
| 5 | pipeline.ts | pipelineRoute | 파이프라인 |
| 6 | pipeline-monitoring.ts | pipelineMonitoringRoute | 파이프라인 모니터링 |
| 7 | poc.ts | pocRoute | PoC |
| 8 | share-links.ts | shareLinksRoute | 공유 링크 |

**Services (14개)**

| # | Service File | 도메인 |
|---|-------------|--------|
| 1 | gtm-customer-service.ts | GTM 고객 |
| 2 | gtm-outreach-service.ts | GTM 아웃리치 |
| 3 | mvp-tracking-service.ts | MVP 추적 |
| 4 | offering-pack-service.ts | Offering Pack |
| 5 | outreach-proposal-service.ts | 아웃리치 제안 |
| 6 | pipeline-checkpoint-service.ts | 파이프라인 체크포인트 |
| 7 | pipeline-error-handler.ts | 파이프라인 에러 |
| 8 | pipeline-notification-service.ts | 파이프라인 알림 |
| 9 | pipeline-permission-service.ts | 파이프라인 권한 |
| 10 | pipeline-service.ts | 파이프라인 |
| 11 | pipeline-state-machine.ts | 파이프라인 상태머신 |
| 12 | poc-env-service.ts | PoC 환경 |
| 13 | poc-service.ts | PoC |
| 14 | share-link-service.ts | 공유 링크 |

**Schemas (8개)**

| # | Schema File |
|---|------------|
| 1 | gtm-customer.schema.ts |
| 2 | gtm-outreach.schema.ts |
| 3 | mvp-tracking.schema.ts |
| 4 | offering-pack.schema.ts |
| 5 | pipeline.schema.ts |
| 6 | pipeline-monitoring.schema.ts |
| 7 | poc.schema.ts |
| 8 | share-link.schema.ts |

### 1.4 Out of Scope

- Foundry-X 코어 정리 (`core/discovery`, `core/shaping`) — Sprint 184
- S6 Eval-X (roi-benchmark, user-evaluations) — 향후 별도 분리
- SX Infra 서비스 — 공유 인프라로 잔류
- D1 테이블 물리적 분리 — Phase 20-B 범위
- 테스트 파일 이동 — 기존 위치 유지 (import 경로만 업데이트)

---

## 2. Implementation Strategy

Sprint 181~182에서 확립된 패턴 동일 적용:

1. **디렉토리 생성**: `modules/gate/{routes,services,schemas}/`, `modules/launch/{routes,services,schemas}/`
2. **파일 이동**: `git mv` 사용 (이력 보존)
3. **인덱스 생성**: `modules/gate/index.ts`, `modules/launch/index.ts` (라우트 re-export)
4. **modules/index.ts 갱신**: gate + launch export 추가
5. **app.ts 갱신**: modules/index.ts에서 gate/launch 라우트 import → 기존 import 제거
6. **import 경로 수정**: 서비스/스키마 간 상호 참조 경로 업데이트
7. **검증**: typecheck + lint + test 통과

### 2.1 총 이동 파일 수

| 모듈 | Routes | Services | Schemas | 합계 |
|------|--------|----------|---------|------|
| Gate | 7 | 7 | 6 | **20** |
| Launch | 8 | 14 | 8 | **30** |
| **합계** | **15** | **21** | **14** | **50** |

---

## 3. Risk & Mitigation

| 리스크 | 영향 | 완화 |
|--------|------|------|
| import 경로 누락 | typecheck 실패 | 이동 후 전체 `turbo typecheck` 실행 |
| 크로스 모듈 의존 | ESLint `no-cross-module-import` 위반 | 공유 서비스는 `services/` 잔류, 모듈 내부만 이동 |
| app.ts 라우트 등록 누락 | API 404 | modules/index.ts re-export 패턴으로 일원화 |
| 테스트 import 깨짐 | test 실패 | 테스트 파일의 상대 import 경로 일괄 수정 |

---

## 4. Definition of Done

- [ ] Gate 20개 파일 → `modules/gate/` 이동 완료
- [ ] Launch 30개 파일 → `modules/launch/` 이동 완료
- [ ] `modules/gate/index.ts` + `modules/launch/index.ts` 생성
- [ ] `modules/index.ts` 갱신 (gate + launch export)
- [ ] app.ts에서 modules/index.ts 통합 import
- [ ] `turbo typecheck` 통과
- [ ] `turbo test` 통과 (or `pnpm test` per package)
- [ ] `turbo lint` 통과
