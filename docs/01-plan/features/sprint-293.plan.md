---
code: FX-PLAN-F538
title: "F538 — Discovery 완전 분리 (Sprint 293)"
version: 1.0
status: Active
sprint: 293
feature: F538
req: FX-REQ-575
priority: P0
created: 2026-04-14
---

# F538 Plan — Discovery 완전 분리

## 1. 목표

`packages/api/src/core/discovery/*` 전체를 `packages/fx-discovery`로 이전하여
Discovery 도메인을 독립 Worker로 완전 분리한다.
Walking Skeleton (Phase 39 F521) 구조를 프로덕션 수준으로 완성.

## 2. 선행 조건

- F543 CONDITIONAL GO ✅ (Service Binding 오버헤드 +10~14ms 허용 확정, PR #583)
- fx-gateway `/api/discovery/*` → fx-discovery Service Binding 라우팅 ✅ (F523)
- fx-discovery Walking Skeleton ✅ (1 route + 1 service: items)

## 3. 현황 분석

### packages/api/src/core/discovery/* (이전 대상)

| 폴더 | 파일 수 | 주요 내용 |
|------|---------|----------|
| routes/ | 10개 | 10개 Hono 라우트 파일 |
| services/ | 27개 | Discovery 비즈니스 로직 전체 |
| schemas/ | 11개 | Zod 스키마 + 타입 정의 |
| index.ts | 1개 | 배럴 익스포트 |
| **합계** | **49개** | |

### 교차 도메인 의존성 (MSA 위반, F538에서 해소)

| 소비자 | discovery 사용 | 처리 방법 |
|--------|---------------|----------|
| `core/agent/orchestration/graphs/discovery-graph.ts` | `StageRunnerService`, `DiscoveryType` | fx-discovery로 이동 (discovery 오케스트레이션) |
| `core/agent/services/skill-pipeline-runner.ts` | `DiscoveryPipelineService`, `DiscoveryStageService` | fx-discovery 내부 이동 (discovery pipeline) |
| `core/shaping/services/bd-artifact-service.ts` 외 3개 | 타입 import (`BdArtifact` 등) | `packages/shared` 타입으로 승격 |
| `core/collection/routes/collection.ts` | `AgentCollector` 서비스 | `core/collection/services/`로 이동 |

## 4. 실행 범위

### (a) core/discovery/* 전체 이전

- 49개 파일 → `packages/fx-discovery/src/`로 이전
- 구조 유지: routes/ services/ schemas/
- D1 바인딩: fx-discovery에 이미 `foundry-x-db` 연결됨

### (b) packages/api 마운트 제거

- `packages/api/src/app.ts`에서 10개 discovery route import + mount 제거
- `packages/api/src/core/discovery/index.ts` 삭제
- MSA lint 통과 확인

### (c) 교차 도메인 의존성 해소

- **agent/discovery-graph.ts** → `packages/fx-discovery/src/orchestration/`으로 이동
- **agent/skill-pipeline-runner.ts** → `packages/fx-discovery/src/services/`으로 이동
- **shaping→discovery 타입** → `packages/shared/src/types/discovery.ts`로 승격
- **collection/AgentCollector** → `packages/api/src/core/collection/services/`으로 이동

### (d) fx-gateway 라우팅 검증

- `GET /api/discovery/items` → fx-gateway → fx-discovery 경유 동작 확인
- Service Binding `DISCOVERY` 바인딩 유지 (wrangler.toml 확인)

### (e) Stage 3 Exit D1~D3 체크리스트

- **D1**: 주입 사이트 전수 grep — 모든 discovery 소비자 파악 완료 (§3 테이블)
- **D2**: cross-domain ID 계약 — bizItemId 포맷 단일화 (UUID)
- **D3**: Breaking change 영향도 — shaping/collection/agent 소비자 전수 목록 (§3 테이블)

### (f) 롤백 플랜

- fx-gateway `wrangler.toml`에서 Service Binding 주석 처리 시 `/api/discovery/*`가 `MAIN_API`(fallback) 경유
- MAIN_API에 기존 discovery route 잔존 여부: **F538 완료 후 제거** → 롤백 필요 시 git revert

## 5. 제외 범위 (후속 F-item)

- D1 독립화 (현재 공유 DB) → C56
- shared 슬리밍 → C57
- E2E shard 결정론적 실패 → C66
- fx-gateway 프로덕션 배포 + URL 전환 → F539 (F538 완료 후)

## 6. 성공 지표

- [ ] `packages/api/src/core/discovery/` 디렉토리 없음
- [ ] `turbo typecheck` PASS (packages/api + packages/fx-discovery)
- [ ] `turbo test` PASS
- [ ] `msa-lint` 교차 도메인 위반 0건
- [ ] fx-discovery `/api/discovery/health` + `/api/discovery/items` 응답 확인
- [ ] Phase Exit P1: fx-gateway 경유 Dogfood 1회 (Smoke Reality)

## 7. 테스트 전략 (TDD)

### Red Phase 대상
- `packages/fx-discovery/src/__tests__/discovery-routes.test.ts` — 이전 후 10개 route 동작 검증
- `packages/api/src/__tests__/discovery-removed.test.ts` — packages/api에 discovery route 없음 검증

### 면제
- 기존 discovery 테스트 파일: 이전(copy)하면 동작 유지 (Red→Green 불필요)
- D1 migration: 동일 DB 사용, 스키마 변경 없음

## 8. 리스크

| 리스크 | 가능성 | 영향 | 완화 |
|--------|--------|------|------|
| agent cross-domain 리팩토링 범위 초과 | 중 | 고 | skill-pipeline-runner HTTP 전환은 F538 제외, types만 shared로 |
| D1 동일 DB 공유 중 migration drift | 저 | 중 | `IF NOT EXISTS` 패턴 유지, C56으로 독립화 |
| fx-discovery 빌드 실패 (import 경로 차이) | 중 | 중 | .js 확장자 + 타입 확인 |
