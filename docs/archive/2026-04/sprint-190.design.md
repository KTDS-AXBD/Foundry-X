---
code: FX-DSGN-S190
title: "Sprint 190 Design — Queue+DO PoC + JWT/API Key/RBAC/CI/CD"
version: 1.0
status: Active
category: DSGN
sprint: 190
f-items: [F404, F405]
created: 2026-04-07
updated: 2026-04-07
author: Sinclair + Claude
---

# Sprint 190 Design — Queue+DO PoC + JWT/API Key/RBAC/CI/CD

## 1. 전체 구조

```
packages/gate-x/src/
├── durable-objects/
│   └── ogd-coordinator.ts          # F404: DO 상태 조율 (job 생명주기)
├── workers/
│   └── ogd-queue-worker.ts         # F404: Queue consumer (O-G-D 단계 실행)
├── services/
│   ├── async-ogd-service.ts        # F404: 비동기 O-G-D 오케스트레이션
│   └── api-key-service.ts          # F405: API Key CRUD + SHA-256 해시
├── middleware/
│   ├── api-key.ts                  # F405: API Key 검증 미들웨어
│   └── auth.ts                     # F405: JWT + API Key 통합 인증
├── routes/
│   ├── ogd-poc.ts                  # F404: PoC endpoints (submit/status/result)
│   └── api-keys.ts                 # F405: API Key 관리 endpoints
├── db/
│   └── migrations/
│       └── 0002_api_keys.sql       # F405: api_keys + api_key_usage 테이블
└── test/
    ├── ogd-coordinator.test.ts     # F404: DO 상태 머신 테스트
    ├── async-ogd-service.test.ts   # F404: Queue submit 테스트
    ├── api-key-service.test.ts     # F405: Key 발급/검증/폐기 테스트
    └── auth-middleware.test.ts     # F405: 통합 인증 흐름 테스트

.github/workflows/
└── deploy-gate-x.yml               # F405: Gate-X 전용 CI/CD
```

## 2. F404 — Durable Object: OgdCoordinator

```typescript
// src/durable-objects/ogd-coordinator.ts
export interface OgdJob {
  id: string;
  evaluationId: string;
  orgId: string;
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  phase: number;          // 현재 O-G-D 단계 (1=Generate, 2=Discriminate, 3=Optimize)
  maxPhases: number;      // 총 반복 횟수 (기본 3)
  result?: string;        // 완료 시 최종 결과
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export class OgdCoordinator {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) { ... }

  // HTTP 핸들러 (내부 통신용)
  async fetch(request: Request): Promise<Response>

  // GET /job → OgdJob
  // POST /start → job 상태를 RUNNING으로 갱신
  // POST /advance → phase++ 또는 DONE
  // POST /fail → error 기록 + FAILED
}
```

**상태 저장:** DO storage (빠른 R/W) + D1 (영구 보존 — 완료/실패 시 동기화)

## 3. F404 — Queue Consumer: OgdQueueWorker

```typescript
// src/workers/ogd-queue-worker.ts
export interface OgdQueueMessage {
  jobId: string;
  evaluationId: string;
  orgId: string;
  phase: number;
  maxPhases: number;
  prompt?: string;
}

// Queue consumer (Cloudflare MessageBatch 기반)
export default {
  async queue(batch: MessageBatch<OgdQueueMessage>, env: GateEnv): Promise<void> {
    for (const msg of batch.messages) {
      // 1. DO에서 job 상태 확인 (RUNNING만 처리)
      // 2. 현재 phase 실행 (LLM 호출 stub — ANTHROPIC_API_KEY 사용 가능)
      // 3. DO에 advance 또는 fail 알림
      // 4. 완료되지 않으면 다음 phase를 Queue에 재enqueue
      msg.ack();
    }
  }
}
```

**재시도:** Queues는 메시지 실패(msg.retry()) 시 지수 백오프로 자동 재시도

## 4. F404 — AsyncOgdService

```typescript
// src/services/async-ogd-service.ts
export class AsyncOgdService {
  constructor(private env: GateEnv) {}

  // job 생성 → DO에 등록 → Queue에 enqueue
  async submitJob(evaluationId: string, orgId: string, maxPhases?: number): Promise<OgdJob>

  // DO에서 job 상태 조회
  async getJob(jobId: string): Promise<OgdJob | null>

  // 완료된 job 결과 조회
  async getResult(jobId: string): Promise<string | null>
}
```

## 5. F404 — PoC REST API

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| POST | /api/ogd/jobs | O-G-D job 제출 | JWT/API Key |
| GET | /api/ogd/jobs/:id | job 상태 조회 | JWT/API Key |
| GET | /api/ogd/jobs/:id/result | 완료 결과 조회 | JWT/API Key |

**요청/응답 예시:**
```json
// POST /api/ogd/jobs
{ "evaluationId": "eval-123", "maxPhases": 3 }
// → 201: { "jobId": "job-abc", "status": "PENDING" }

// GET /api/ogd/jobs/job-abc
// → 200: { "jobId": "job-abc", "status": "RUNNING", "phase": 2, "maxPhases": 3 }
```

## 6. F404 — wrangler.toml 업데이트

```toml
# Queues 바인딩
[[queues.producers]]
binding = "OGD_QUEUE"
queue = "gate-x-ogd-queue"

[[queues.consumers]]
queue = "gate-x-ogd-queue"
max_batch_size = 5
max_batch_timeout = 30

# Durable Objects
[[durable_objects.bindings]]
name = "OGD_COORDINATOR"
class_name = "OgdCoordinator"

[[migrations]]
tag = "v1"
new_classes = ["OgdCoordinator"]
```

## 7. F405 — D1 마이그레이션 (0002_api_keys.sql)

```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,        -- 'gx_' + 8자 (UI 식별용)
  role TEXT NOT NULL DEFAULT 'member',
  scopes TEXT NOT NULL DEFAULT '[]',
  last_used_at TEXT,
  expires_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS api_key_usage (
  id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 8. F405 — ApiKeyService

```typescript
// src/services/api-key-service.ts
export class ApiKeyService {
  constructor(private db: D1Database) {}

  // 신규 API Key 발급: crypto.getRandomValues(32바이트) → hex
  // 반환: { key: 'gx_...원문', record: ApiKey }  ← 원문은 발급 시 1회만
  async create(orgId: string, name: string, role: Role, createdBy: string): Promise<{ key: string; record: ApiKey }>

  // 인증: SHA-256(입력) → key_hash 조회 → 만료/폐기 확인
  async verify(rawKey: string): Promise<ApiKey | null>

  // 조회/폐기
  async list(orgId: string): Promise<ApiKey[]>
  async revoke(id: string, orgId: string): Promise<void>

  // 사용량 기록 (fire-and-forget)
  async recordUsage(keyId: string, endpoint: string, statusCode: number): Promise<void>
}
```

## 9. F405 — 통합 인증 미들웨어 (auth.ts)

```typescript
// src/middleware/auth.ts
// 우선순위: Authorization: Bearer <JWT> → X-API-Key: <key> → 401

export function createUnifiedAuthMiddleware(config: HarnessConfig): MiddlewareHandler {
  return async (c, next) => {
    // 1. public path 체크
    // 2. Bearer JWT 시도 → jwtPayload 설정
    // 3. X-API-Key 시도 → ApiKey 정보로 jwtPayload 호환 객체 생성
    // 4. 둘 다 없으면 401
  };
}
```

## 10. F405 — API Key 관리 엔드포인트

| Method | Path | 설명 | RBAC |
|--------|------|------|------|
| POST | /api/keys | API Key 발급 | member+ |
| GET | /api/keys | 목록 조회 | member+ |
| DELETE | /api/keys/:id | 폐기 | admin |

## 11. F405 — Gate-X CI/CD (deploy-gate-x.yml)

```yaml
name: Deploy Gate-X
on:
  push:
    branches: [master]
    paths:
      - 'packages/gate-x/**'
      - 'packages/harness-kit/**'
      - '.github/workflows/deploy-gate-x.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @foundry-x/gate-x typecheck
      - run: pnpm --filter @foundry-x/gate-x test
      # D1 마이그레이션
      - name: D1 Migrations
        run: npx wrangler d1 migrations apply gate-x-db --remote
        working-directory: packages/gate-x
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
      # Workers 배포
      - name: Deploy Workers
        run: npx wrangler deploy
        working-directory: packages/gate-x
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
      # Smoke test
      - name: Smoke Test
        run: |
          sleep 5
          curl -sf https://gate-x-api.ktds-axbd.workers.dev/api/health | grep '"status":"ok"'
```

## 12. 테스트 매핑

| 파일 | 검증 항목 |
|------|-----------|
| `ogd-coordinator.test.ts` | PENDING→RUNNING→DONE 상태 전환, fail 처리 |
| `async-ogd-service.test.ts` | submitJob (Queue enqueue mock), getJob (DO mock) |
| `api-key-service.test.ts` | 발급 (SHA-256 해시 검증), verify (유효/만료/폐기), revoke |
| `auth-middleware.test.ts` | Bearer JWT 우선, X-API-Key fallback, 둘 다 없으면 401 |

## 13. Worker 파일 매핑

| Worker | 담당 파일 |
|--------|-----------|
| Worker A | `durable-objects/ogd-coordinator.ts`, `workers/ogd-queue-worker.ts`, `services/async-ogd-service.ts`, `routes/ogd-poc.ts`, `wrangler.toml` |
| Worker B | `db/migrations/0002_api_keys.sql`, `services/api-key-service.ts`, `middleware/api-key.ts`, `middleware/auth.ts`, `routes/api-keys.ts`, `app.ts` (업데이트), `.github/workflows/deploy-gate-x.yml` |
| Worker C | `test/ogd-coordinator.test.ts`, `test/async-ogd-service.test.ts`, `test/api-key-service.test.ts`, `test/auth-middleware.test.ts` |
