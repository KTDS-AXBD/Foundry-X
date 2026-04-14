---
code: FX-DESIGN-F538
title: "F538 — Discovery 완전 분리 Design (Sprint 293)"
version: 1.0
status: Active
sprint: 293
feature: F538
req: FX-REQ-575
created: 2026-04-14
---

# F538 Design — Discovery 완전 분리

## §1 목표 요약 (실측 기반 범위 조정)

> **D3 분석 결과**: discovery 10개 route 중 7개가 shaping/offering/agent/collection 도메인에 5~18개 교차 의존성 보유.  
> URL 구조 (`/api/biz-items/*`)도 discovery-stages와 biz-items 라우트가 공존하여 gateway 분리 불가.  
> **수정 범위**: 3개 clean route 이전 + 서비스 레이어 이전 + 타입 계약 정리. 나머지 7개 route는 F539+ 과제.

**F538 확정 범위:**
- fx-discovery: JWT+tenant 미들웨어 추가 + 3개 clean route 이전 (discovery.ts, discovery-reports.ts, discovery-report.ts)
- Gateway: 2개 URL prefix 추가 (`/api/ax-bd/discovery-report*`)
- packages/api: 3개 route 제거 + shaping cross-domain 타입 → shared
- packages/shared: discovery-contract 타입 신규 추가

**갭 기록 (후속 F-item):** biz-items(18dep), discovery-pipeline(5dep), discovery-stage-runner(5dep), ax-bd-artifacts(shaping dep), ax-bd-discovery(collection dep), discovery-shape-pipeline(offering dep), discovery-stages(URL conflict) — URL 구조 개편 + 도메인 분리 후 이전 가능

## §2 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| discovery-graph.ts 이전 | `core/agent/orchestration/graphs/` → fx-discovery | discovery 오케스트레이션 로직이므로 discovery 도메인 소유 |
| skill-pipeline-runner.ts 이전 | `core/agent/services/` → fx-discovery | discovery-pipeline.ts route만 사용 → 함께 이전 |
| OrchestrationLoop.graphDiscovery 분기 제거 | dead code (production 미호출) | MSA 정리, orchestration.ts route가 non-graph 모드만 사용 |
| shaping 타입 → shared | `BdArtifact`, `executeSkillSchema` 등 → `packages/shared` | cross-domain contract 타입은 shared 소유 |
| AgentCollector → collection | `core/collection/services/agent-collector.ts` | collection 도메인 소유 서비스 |
| gateway 라우팅 확장 | 8개 prefix → fx-discovery | biz-items/*, discovery-pipeline/* 등 현재 누락됨 |

## §3 D1~D3 체크리스트 (Stage 3 Exit)

### D1: 주입 사이트 전수 검증

discovery 코드를 소비하는 모든 호출 지점:

| 소비자 | 현재 import | 처리 |
|--------|-------------|------|
| `app.ts` | 10개 route import | 제거 |
| `core/agent/orchestration/graphs/discovery-graph.ts` | `StageRunnerService`, `DiscoveryType` | fx-discovery로 이동 |
| `core/agent/services/skill-pipeline-runner.ts` | `DiscoveryPipelineService`, `DiscoveryStageService` | fx-discovery로 이동 |
| `core/agent/services/orchestration-loop.ts` | `type GraphStageInput` (dynamic import) | type 인라인화 + graphDiscovery 분기 제거 |
| `core/shaping/services/bd-artifact-service.ts` | `BdArtifact`, `ArtifactListQuery` | `@foundry-x/shared` |
| `core/shaping/services/shaping-orchestrator-service.ts` | `TriggerShapingInput` | `@foundry-x/shared` |
| `core/shaping/services/bd-skill-executor.ts` | `ExecuteSkillInput`, `SkillExecutionResult` | `@foundry-x/shared` |
| `core/shaping/routes/ax-bd-skills.ts` | `executeSkillSchema` | `@foundry-x/shared` |
| `core/collection/routes/collection.ts` | `AgentCollector`, `CollectorError` | `core/collection/services/agent-collector.ts` |

### D2: 식별자 계약 (bizItemId)

- **포맷**: UUID v4 (`/^[0-9a-f-]{36}$/`)
- **생산자**: `core/discovery/services/biz-item-service.ts` → `nanoid()` (현재) → 이전 후 fx-discovery 동일 포맷
- **소비자**: web api-client.ts, CLI harness — URL path param으로 전달
- **계약**: URL path로 전달되므로 Worker 이전 후 동일 포맷 유지, schema 변경 없음

### D3: Breaking change 영향도

| 변경 | 영향 파일 | 마이그레이션 |
|------|----------|------------|
| `BdArtifact` 타입 위치 변경 | shaping 4개 파일 | import path → `@foundry-x/shared` |
| `AgentCollector` 위치 변경 | collection 1개 파일 | import path → `../services/agent-collector.js` |
| discovery route 제거 (packages/api) | packages/api/src/app.ts | import + mount 10건 제거 |
| gateway 라우팅 추가 | fx-gateway/src/app.ts | 8개 prefix 추가 |
| D1 schema: 변경 없음 | — | 동일 DB 공유 |

## §4 테스트 계약 (TDD Red Target)

### Red 1: discovery route 이전 검증

```typescript
// packages/fx-discovery/src/__tests__/discovery-migration.test.ts
// F538 red — discovery routes exist in fx-discovery, NOT in packages/api

describe("F538: Discovery 완전 분리", () => {
  it("fx-discovery: /api/discovery/health 응답", async () => {});
  it("fx-discovery: /api/biz-items → 200 응답 (인증 미적용 시 401)", async () => {});
  it("fx-discovery: /api/discovery-pipeline/runs → 200 or 401", async () => {});
  it("packages/api: /api/biz-items → 404 (route 제거됨)", async () => {});
});
```

### Red 2: cross-domain import 없음 검증 (msa-lint)

- `turbo lint` (msa-lint) → `no-cross-domain-import` 0 violations

## §5 파일 매핑 (Worker 매핑)

### A. packages/fx-discovery — 신규/수정 파일 (F538 확정 범위)

#### 패키지 설정 (완료)

| 파일 | 변경 | 내용 |
|------|------|------|
| `package.json` | 완료 ✅ | `zod`, `@foundry-x/shared`, `nanoid`, `@anthropic-ai/sdk` 추가 |
| `tsconfig.json` | 완료 ✅ | `@foundry-x/shared` 경로 참조 추가 |

#### 미들웨어 추가 (신규)

| 파일 | 내용 |
|------|------|
| `src/middleware/auth.ts` | JWT 검증 미들웨어 (packages/api jwt.ts 기반) |
| `src/middleware/tenant.ts` | TenantVariables 타입 + tenantGuard (D1 org_members 조회) |

#### app.ts (수정)
3개 clean route 마운트 + JWT + tenant 미들웨어 적용.

#### routes/ (3개 이전, 경로 조정)

| 파일 | Env 변경 | 서비스 |
|------|----------|--------|
| `src/routes/discovery.ts` | `Env` → `DiscoveryEnv` | `DiscoveryProgressService` (이미 복사됨) |
| `src/routes/discovery-reports.ts` | `Env` → `DiscoveryEnv` | `DiscoveryReportService` (이미 복사됨) |
| `src/routes/discovery-report.ts` | `Env` → `DiscoveryEnv` | `DiscoveryReportService` (이미 복사됨) |

#### services/, schemas/, orchestration/ (복사 완료, 미사용 상태)
- 29개 서비스 파일 ✅ (복사 완료, 향후 route 이전 시 활용)
- 11개 스키마 파일 ✅ (복사 완료)
- orchestration/discovery-graph.ts ✅ (복사 완료)

### B. packages/api — 수정 파일 (F538 확정 범위)

| 파일 | 변경 |
|------|------|
| `src/app.ts` | 3개 clean route import + `app.route()` 제거 (discoveryRoute, discoveryReportRoute, discoveryReportsRoute) |
| `src/core/shaping/services/bd-artifact-service.ts` | import `@foundry-x/shared` |
| `src/core/shaping/services/shaping-orchestrator-service.ts` | import `@foundry-x/shared` |
| `src/core/shaping/services/bd-skill-executor.ts` | import `@foundry-x/shared` |
| `src/core/shaping/routes/ax-bd-skills.ts` | import `@foundry-x/shared` |
| `src/core/agent/services/orchestration-loop.ts` | `GraphStageInput` type 인라인 정의 (dynamic import 제거는 선택) |

**유지 (후속 F-item)**: `core/discovery/` 디렉토리 전체, biz-items/discovery-pipeline/stage-runner routes, skill-pipeline-runner, discovery-graph.ts

### C. packages/shared — 완료

| 파일 | 변경 |
|------|------|
| `src/discovery-contract.ts` | 완료 ✅ |
| `src/index.ts` | 완료 ✅ |

### C. packages/shared — 신규 타입

| 파일 | 변경 |
|------|------|
| `src/discovery-contract.ts` | **신규** — `BdArtifact`, `ArtifactListQuery`, `executeSkillSchema`, `ExecuteSkillInput`, `SkillExecutionResult`, `TriggerShapingInput` |
| `src/index.ts` | 신규 파일 re-export 추가 |

### D. packages/fx-gateway — 라우팅 확장 (F538 확정 범위)

| 파일 | 변경 |
|------|------|
| `src/app.ts` | `/api/ax-bd/discovery-report*` 2개 prefix 추가 |

**새 라우팅 규칙 (기존 + 추가):**
```typescript
// 기존: /api/discovery/* → DISCOVERY (유지)
// 추가: /api/ax-bd/discovery-report* → DISCOVERY
const path = new URL(c.req.url).pathname;
if (
  path.startsWith("/api/discovery") ||
  path.startsWith("/api/ax-bd/discovery-report")  // discovery-report + discovery-reports
) {
  return c.env.DISCOVERY.fetch(c.req.raw);
}
return c.env.MAIN_API.fetch(c.req.raw);
```

## §6 Env 정합성

### fx-discovery DiscoveryEnv (기존)
```typescript
export interface DiscoveryEnv {
  DB: D1Database;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY?: string;  // 이미 있음
}
```

### 추가 필요 여부
- `ANTHROPIC_API_KEY`: wrangler.toml에 secret으로 등록 필요 (이미 secrets에 있음)
- `JWT_SECRET`: 이미 있음
- `GOOGLE_*`, `OPENROUTER_API_KEY`: discovery 서비스 사용 여부 확인 필요 → 없으면 불필요

## §7 롤백 플랜

fx-gateway `src/app.ts`의 `isDiscovery` 조건을 `false`로 변경하면 모든 요청이 MAIN_API로 fallback.
단, `packages/api`에서 discovery route를 삭제한 후에는 MAIN_API도 404 → **완전 롤백 시 `git revert` 필요**.

롤백 플랜 B: F538 PR revert 후 이전 상태 복원 (squash merge이므로 단일 커밋 revert)

## §8 D4: TDD Red 커밋 계획

- Red 파일: `packages/fx-discovery/src/__tests__/discovery-migration.test.ts`
- Red 커밋: `test(fx-discovery): F538 red — discovery 완전 분리 마이그레이션 검증`
- FAIL 확인: fx-discovery에 routes가 아직 없으므로 health+biz-items 테스트 FAIL
