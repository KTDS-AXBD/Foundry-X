---
code: FX-PLAN-S189
title: "Sprint 189 — Gate-X 독립 Workers scaffold + Gate 모듈 추출"
version: 1.0
status: Active
category: PLAN
phase: "Phase 21: Gate-X 독립 서비스"
sprint: 189
f-items: [F402, F403]
req-codes: [FX-REQ-394, FX-REQ-395]
created: 2026-04-07
updated: 2026-04-07
author: Sinclair + Claude
---

# Sprint 189 Plan — Gate-X 독립 Workers scaffold + Gate 모듈 추출

## 1. Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F402: Gate-X 독립 Workers scaffold + D1 전용 DB, F403: Gate 모듈 추출 (7R + 7S + 6Sch) |
| Sprint | 189 |
| Phase | Phase 21-A: 코어 API + 독립 배포 (M1, P0) |
| 예상 산출물 | packages/gate-x/ 독립 Workers 서비스 + D1 마이그레이션 + 테스트 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Gate(검증) 기능이 FX 모놀리스에 묶여 독립 사용 불가 |
| Solution | harness-kit 기반 독립 Workers 서비스로 분리 |
| Function UX Effect | gate-x-api.workers.dev에서 검증 API를 독립 호출 가능 |
| Core Value | 외부 제공 가능한 독립 검증 서비스 기반 확보 |

## 2. 범위

### 2.1 F402 — Gate-X 독립 Workers scaffold + D1 전용 DB

- **목표**: harness-kit scaffold 기반으로 Gate-X 독립 Workers 프로젝트 구조 생성
- **산출물**:
  - `packages/gate-x/` 디렉토리 (package.json, tsconfig, vitest.config, wrangler.toml)
  - `src/app.ts` — Hono 앱 + harness-kit 미들웨어 (CORS, JWT, ErrorHandler)
  - `src/env.ts` — Gate-X 전용 환경 바인딩
  - `src/index.ts` — Workers entry point
  - D1 마이그레이션: Gate-X 전용 테이블 (~10개) 초기 스키마
  - `src/middleware/tenant.ts` — 테넌트 가드 (harness-kit JWT 기반)
- **의존**: harness-kit 패키지 (workspace:*)

### 2.2 F403 — Gate 모듈 추출 (7 routes + 7 services + 6 schemas)

- **목표**: `packages/api/src/modules/gate/`의 20개 파일을 Gate-X로 이전
- **산출물**:
  - `packages/gate-x/src/routes/` — 7 라우트 (import 경로 재작성)
  - `packages/gate-x/src/services/` — 7 서비스 (크로스 모듈 의존 해소)
  - `packages/gate-x/src/schemas/` — 6 Zod 스키마
- **크로스 모듈 의존 해소**:
  - `KpiService` (portal) → 평가 라우트에서 KPI 연동을 이벤트 기반 stub으로 대체
  - `PipelineService` (launch) → decision-service에서 파이프라인 단계 조회를 D1 직접 쿼리로 대체 (Gate-X DB에 pipeline_stages 뷰 생성)
  - `NotificationService` (portal) → 이벤트 발행으로 대체 (D1EventBus)
  - `Env`, `TenantVariables` → Gate-X 자체 타입으로 전환
- **테스트**: 이전된 서비스 단위 테스트 (vitest)

## 3. 기술 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| D1 전략 | 새 DB (gate-x-db) | PRD 권장 — 외부 제공 시 깨끗한 분리 |
| 인증 | 독립 JWT (harness-kit) | PRD 권장 — API Key 방식 병행은 Sprint 190 |
| 크로스 의존 | Adapter 패턴 + EventBus | 직접 import 제거, 느슨한 연결 유지 |
| package 위치 | `packages/gate-x/` | 모노리포 내 독립 패키지 (pnpm workspace) |
| 라우트 prefix | `/api/gate/` | Gate-X 전용 네임스페이스 |

## 4. D1 마이그레이션 계획

Gate-X 전용 D1에 필요한 테이블 (FX modules/gate/ 사용 테이블 기반):

| 테이블 | 원본 마이그레이션 | 용도 |
|--------|-------------------|------|
| ax_evaluations | 0052 | 평가 (핵심) |
| ax_evaluation_history | 0054 | 평가 이력 |
| decisions | 0069 | Go/Hold/Drop 의사결정 |
| gate_packages | 0071 | 게이트 패키지 |
| evaluation_reports | 0085 | 평가 리포트 |
| expert_meetings | 0086 | 전문가 미팅 |
| validation_history | 0086 | 검증 이력 |
| ax_team_reviews | 0101 | 팀 리뷰 |
| biz_items | (참조) | decision-service가 조회 — 최소 뷰 또는 stub |
| pipeline_stages | (참조) | decision-service가 조회 — 최소 뷰 또는 stub |

## 5. 실행 순서

| # | 작업 | 예상 파일 수 |
|---|------|-------------|
| 1 | packages/gate-x/ scaffold 생성 (package.json, tsconfig, wrangler.toml, vitest) | 5 |
| 2 | src/app.ts + src/env.ts + src/index.ts 기본 구조 | 3 |
| 3 | src/middleware/tenant.ts 테넌트 가드 | 1 |
| 4 | D1 마이그레이션 파일 (0001_initial.sql) | 1 |
| 5 | schemas/ 6파일 복사 + import 경로 수정 | 6 |
| 6 | services/ 7파일 이전 + 크로스 의존 해소 (adapter) | 9 (7 + 2 adapter) |
| 7 | routes/ 7파일 이전 + import 경로 재작성 | 7 |
| 8 | app.ts에 라우트 등록 | (수정) |
| 9 | 단위 테스트 | 3+ |
| **합계** | | **~35 파일** |

## 6. 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 크로스 모듈 의존이 예상보다 깊음 | 중 | 중 | Adapter에서 stub 반환, P1에서 이벤트 연동 완성 |
| D1 테이블 스키마 복잡도 | 하 | 하 | FX 마이그레이션 SQL 재사용 |
| pnpm workspace 설정 | 하 | 하 | 기존 패키지 구조 참고 |

## 7. 성공 기준

- [ ] `packages/gate-x/` 독립 패키지 존재
- [ ] `pnpm typecheck` 성공 (gate-x 포함)
- [ ] D1 마이그레이션 SQL 파일 생성
- [ ] 7 routes + 7 services + 6 schemas 이전 완료
- [ ] health check 엔드포인트 동작 (GET /api/health)
- [ ] 크로스 모듈 import 0개 (gate → portal/launch 직접 참조 없음)
- [ ] 단위 테스트 통과
