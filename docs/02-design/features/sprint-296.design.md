---
id: FX-DESIGN-sprint-296
feature: F539c — 7 라우트 Service Binding 이전
sprint: 296
date: 2026-04-15
status: active
req: FX-REQ-578
---

# Sprint 296 Design — F539c

## §1 목표

fx-gateway → fx-discovery Service Binding 경로에 7개 라우트 추가.
biz-items CRUD 3개 + discovery-stages 2개 + discovery-pipeline GET 2개.

## §2 아키텍처 변화 (F539c After)

```
Browser → fx-gateway (https://fx-gateway.ktds-axbd.workers.dev)
  ├─ GET  /api/biz-items           → [SB] → fx-discovery  ★신규
  ├─ POST /api/biz-items           → [SB] → fx-discovery  ★신규
  ├─ GET  /api/biz-items/:id       → [SB] → fx-discovery  ★신규
  ├─ GET  /api/biz-items/:id/discovery-progress → [SB] → fx-discovery ★신규
  ├─ POST /api/biz-items/:id/discovery-stage    → [SB] → fx-discovery ★신규
  ├─ GET  /api/discovery-pipeline/runs          → [SB] → fx-discovery ★신규
  ├─ GET  /api/discovery-pipeline/runs/:id      → [SB] → fx-discovery ★신규
  ├─ /api/discovery/*              → [SB] → fx-discovery  (기존)
  ├─ /api/ax-bd/discovery-report*  → [SB] → fx-discovery  (기존)
  └─ /api/* (나머지)               → [SB] → MAIN_API
```

**핵심 설계 결정**: Hono의 `:id` 파라미터는 단일 경로 세그먼트만 매칭.
- `GET /api/biz-items/:id` → `/api/biz-items/abc123` ✓, `/api/biz-items/abc123/classify` ✗
- classify/evaluate 등 나머지 biz-items 서브 라우트는 catch-all → MAIN_API로 자연 fall-through

## §3 D1~D3 체크리스트 (Stage 3 Exit)

### D1: 주입 사이트 전수 검증

| 신규 라우트 | 등록 위치 | 라우팅 위치 |
|------------|----------|------------|
| biz-items 3 라우트 | fx-discovery/src/app.ts | fx-gateway/src/app.ts (3 lines) |
| discovery-stages 2 라우트 | fx-discovery/src/app.ts | fx-gateway/src/app.ts (2 lines) |
| discovery-pipeline GET 2 라우트 | fx-discovery/src/app.ts | fx-gateway/src/app.ts (2 lines) |

확인 방법: `grep -n "DISCOVERY.fetch" packages/fx-gateway/src/app.ts` = 기존 3 + 신규 7 = 10줄

### D2: 식별자 계약

- **bizItemId 포맷**: 32자 hex (crypto.getRandomValues, biz-item-service.ts 동일 함수)
  - packages/api `generateId()` = `Uint8Array(16).map(b=>b.toString(16).padStart(2,"0")).join("")`
  - fx-discovery에 동일 함수 복사 → 포맷 일치 보장
- **orgId**: JWT tenantGuard가 이미 `c.get("orgId")` 설정 — Service Binding 전파 자동
- **discovery-stage ID**: 동일 hex 포맷

### D3: Breaking change 영향도

| 변경 | 영향 파일 | 마이그레이션 |
|------|----------|------------|
| biz-items 3 라우트 packages/api 제거 | biz-items.ts (나머지 유지) | 없음 — 동일 D1 DB |
| discovery-stages packages/api 제거 | discovery-stages.ts (전체 제거 가능) | 없음 — 동일 D1 DB |
| discovery-pipeline GET 2개 제거 | discovery-pipeline.ts (나머지 유지) | 없음 — 동일 D1 DB |

### D4: TDD Red 파일

- `packages/fx-discovery/src/__tests__/biz-items.test.ts` — 3 라우트 Red 커밋
- `packages/fx-discovery/src/__tests__/discovery-stages.test.ts` — 2 라우트 Red 커밋
- `packages/fx-discovery/src/__tests__/discovery-pipeline.test.ts` — 2 라우트 Red 커밋

## §4 TDD 테스트 계약

### Group A — biz-items 3 라우트

```typescript
// packages/fx-discovery/src/__tests__/biz-items.test.ts
describe("F539c Group A: biz-items 3 라우트", () => {
  it("GET /api/biz-items → 401 (인증 미적용 시)", async () => {
    const res = await app.request("/api/biz-items", {}, env);
    expect([200, 401]).toContain(res.status);
  });
  it("POST /api/biz-items → 201 or 401", async () => {
    const res = await app.request("/api/biz-items", { method: "POST", body: JSON.stringify({ title: "test" }) }, env);
    expect([201, 400, 401]).toContain(res.status);
  });
  it("GET /api/biz-items/:id → 404 or 401 (미존재 ID)", async () => {
    const res = await app.request("/api/biz-items/nonexistent-id", {}, env);
    expect([404, 401]).toContain(res.status);
  });
  it("GET /api/biz-items/:id/classify → 404 (fx-discovery 미구현 — MAIN_API로 fall-through)", async () => {
    // fx-discovery에 없는 라우트는 404 응답 (게이트웨이 레이어 검증)
    const res = await app.request("/api/biz-items/abc/classify", {}, env);
    expect(res.status).toBe(404);
  });
});
```

### Group B — discovery-stages + pipeline

```typescript
// packages/fx-discovery/src/__tests__/discovery-stages.test.ts
describe("F539c Group B: discovery-stages", () => {
  it("GET /api/biz-items/:id/discovery-progress → 401 or 200", async () => {});
  it("POST /api/biz-items/:id/discovery-stage → 401 or 400", async () => {});
});

// packages/fx-discovery/src/__tests__/discovery-pipeline.test.ts
describe("F539c Group B: discovery-pipeline GET", () => {
  it("GET /api/discovery-pipeline/runs → 401 or 200", async () => {});
  it("GET /api/discovery-pipeline/runs/:id → 401 or 404", async () => {});
});
```

## §5 파일 매핑 (Worker 매핑)

### A. packages/fx-discovery — 신규/수정 파일

| 파일 | 변경 | 내용 |
|------|------|------|
| `src/services/biz-item-full.service.ts` | 신규 | BizItemService.create/list/getById 이전 (순수 D1, cross-domain 의존 없음) |
| `src/schemas/biz-item.ts` | 신규 | CreateBizItemSchema (z.object title/description/source) |
| `src/routes/biz-items.ts` | 신규 | 3 라우트 — GET /api/biz-items, POST /api/biz-items, GET /api/biz-items/:id |
| `src/services/discovery-stage.service.ts` | 신규 | DiscoveryStageService.getProgress/updateStage (순수 D1) |
| `src/schemas/discovery-stage.ts` | 신규 | DISCOVERY_STAGES 상수 + UpdateDiscoveryStageSchema |
| `src/routes/discovery-stages.ts` | 신규 | 2 라우트 — GET :id/discovery-progress, POST :id/discovery-stage |
| `src/services/discovery-pipeline-read.service.ts` | 신규 | listRuns/getRun read-only (FSM 의존 제거, validEvents 단순화) |
| `src/schemas/discovery-pipeline.ts` | 신규 | listPipelineRunsSchema (status/bizItemId/limit/offset) |
| `src/routes/discovery-pipeline.ts` | 신규 | 2 GET 라우트 — /runs, /runs/:id |
| `src/app.ts` | 수정 | 3개 신규 라우트 파일 마운트 (authenticated 그룹에 추가) |
| `src/__tests__/biz-items.test.ts` | 신규 | TDD Red → Green |
| `src/__tests__/discovery-stages.test.ts` | 신규 | TDD Red → Green |
| `src/__tests__/discovery-pipeline.test.ts` | 신규 | TDD Red → Green |

### B. packages/fx-gateway — 수정 파일

| 파일 | 변경 | 내용 |
|------|------|------|
| `src/app.ts` | 수정 | 7개 특정 패턴 → DISCOVERY 라우팅 추가 (catch-all 전) |
| `src/__tests__/gateway.test.ts` | 수정 | 7 라우트 → DISCOVERY 전달 테스트 추가 |

**fx-gateway app.ts 추가 순서** (중요: 특정 패턴이 먼저, catch-all 마지막 유지):
```typescript
// F539c Group A: biz-items 3 라우트
app.get("/api/biz-items", (c) => c.env.DISCOVERY.fetch(c.req.raw));
app.post("/api/biz-items", (c) => c.env.DISCOVERY.fetch(c.req.raw));
app.get("/api/biz-items/:id", (c) => c.env.DISCOVERY.fetch(c.req.raw));

// F539c Group B: discovery-stages + pipeline GET
app.get("/api/biz-items/:id/discovery-progress", (c) => c.env.DISCOVERY.fetch(c.req.raw));
app.post("/api/biz-items/:id/discovery-stage", (c) => c.env.DISCOVERY.fetch(c.req.raw));
app.get("/api/discovery-pipeline/runs", (c) => c.env.DISCOVERY.fetch(c.req.raw));
app.get("/api/discovery-pipeline/runs/:id", (c) => c.env.DISCOVERY.fetch(c.req.raw));

// 기존 catch-all (변경 없음)
app.all("/api/*", (c) => c.env.MAIN_API.fetch(c.req.raw));
```

**주의**: `GET /api/biz-items/:id` 와 `GET /api/biz-items/:id/discovery-progress`
- Hono는 등록 순서 기반이므로 특정 패턴(`/:id/discovery-progress`)을 `:id` 앞에 등록
- 실제 매칭: `/api/biz-items/abc/discovery-progress` → 4세그먼트이므로 `:id` (3세그먼트)와 불일치 → 자동 올바른 라우팅

### C. packages/api — 수정 파일

| 파일 | 변경 | 내용 |
|------|------|------|
| `src/core/discovery/routes/biz-items.ts` | 수정 | `bizItemsRoute.get("/biz-items")`, `bizItemsRoute.post("/biz-items")`, `bizItemsRoute.get("/biz-items/:id")` 3개 handler 제거 |
| `src/core/discovery/routes/discovery-stages.ts` | 수정 or 삭제 | 2개 handler 제거 (파일 비게 되면 삭제 후 app.ts에서 import 제거) |
| `src/core/discovery/routes/discovery-pipeline.ts` | 수정 | GET runs, GET runs/:id 2개 handler 제거 |
| `src/app.ts` | 수정 | discoveryStagesRoute import/mount 제거 (stages 전체 제거 시) |

### D. scripts + web e2e — URL 전환 (F539b 이월)

| 파일 | 변경 |
|------|------|
| `scripts/seed-discovery-reports.sh` | 기본 URL: foundry-x-api → fx-gateway |
| `scripts/session-collector.sh` | 기본 URL 전환 |
| `scripts/skill-demo-seed.sh` | 기본 URL 전환 |
| `scripts/sf-scan-register.sh` | 기본 URL 전환 |
| `scripts/usage-tracker-hook.sh` | 기본 URL 전환 |
| `scripts/task/task-daemon.sh` | 기본 URL 전환 |
| `scripts/feedback-consumer.sh` | 기본 URL 전환 |
| `packages/web/e2e/prod/smoke.spec.ts` | API_URL 기본값 전환 |

### E. ESLint 룰 확장

| 파일 | 변경 |
|------|------|
| `packages/api/src/eslint-rules/index.ts` | no-cross-domain-import 룰에 bizItems/biz-items → discovery 도메인 mapping 추가 |

## §6 DiscoveryPipelineReadService 설계 (FSM 의존 제거)

packages/api의 DiscoveryPipelineService는 생성자에서 PipelineStateMachine을 초기화.
fx-discovery용 Read-Only 서비스는 이 의존을 제거:

```typescript
// fx-discovery/src/services/discovery-pipeline-read.service.ts
export class DiscoveryPipelineReadService {
  constructor(private db: D1Database) {}

  async listRuns(orgId: string, filters: { status?: string; bizItemId?: string; limit: number; offset: number }) {
    // 순수 D1 SELECT — FSM 불필요
  }

  async getRun(id: string, orgId: string) {
    // validEvents 제외 (FSM 불필요) — 클라이언트가 현재 UI에서 미사용
    // 필요 시 후속 sprint에서 PipelineStateMachine 이전 후 추가
  }
}
```

**tradeoff**: `validEvents` 필드가 getRun 응답에서 누락됨.
- 현재 Web UI에서 `validEvents`를 UI에 표시하지 않음 (미사용 확인 필요)
- 확인 필요: `grep -rn "validEvents" packages/web/src/` 결과

## §7 KOAMI Smoke Reality (F539b 이월 + F539c PR1/PR2)

각 PR merge 후 실행:
```bash
curl -H "Authorization: Bearer $JWT" \
  https://fx-gateway.ktds-axbd.workers.dev/api/biz-items
# → 200 {"items":[...]}

curl -H "Authorization: Bearer $JWT" \
  https://fx-gateway.ktds-axbd.workers.dev/api/biz-items/bi-koami-001/discovery-progress
# → 200 {"stages":[...]}
```

KOAMI Graph 1회 실행 후 proposals ≥ 1건 확인 (Phase 43 P3 Dogfood 재현).
