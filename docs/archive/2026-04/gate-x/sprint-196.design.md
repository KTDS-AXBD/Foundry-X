---
code: FX-DSGN-S196
title: "Sprint 196 — F412 SDK/CLI 클라이언트 설계"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: autopilot
---

# Sprint 196 Design — F412 SDK/CLI 클라이언트

## 1. 아키텍처 개요

```
@foundry-x/gate-x-sdk
├── GateXClient (HTTP 클라이언트 코어)
│   ├── EvaluationsResource
│   ├── GatePackageResource
│   └── OgdResource
└── CLI (Commander.js, Node.js 전용)
    ├── gate-x health
    ├── gate-x eval [list|create|status]
    ├── gate-x gate-package [get|download]
    └── gate-x ogd run
```

SDK는 순수 fetch 기반이므로 Node.js 18+ / Deno / 브라우저 모두 사용 가능해요.

## 2. 타입 정의 (`src/types.ts`)

```typescript
// 인증
export interface GateXClientOptions {
  apiKey: string;
  baseUrl?: string; // default: https://gate-x.ktds-axbd.workers.dev
}

// Evaluation
export interface Evaluation {
  id: string;
  orgId: string;
  title: string;
  bizItemId?: string;
  gateType: string;
  status: "draft" | "in_review" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface CreateEvaluationInput {
  title: string;
  bizItemId?: string;
  gateType: string;
  description?: string;
}

export interface EvaluationKpi {
  id: string;
  evalId: string;
  name: string;
  target: string;
  actual?: string;
  status: "pending" | "met" | "not_met";
}

// GatePackage
export interface GatePackage {
  id: string;
  bizItemId: string;
  orgId: string;
  gateType: string;
  status: string;
  createdAt: string;
}

// OGD
export interface OgdRunInput {
  content: string;
  rubric?: string;
  maxIterations?: number;
  modelProvider?: "anthropic" | "openai" | "google";
}

export interface OgdRunResult {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  iterations: number;
  output?: string;
  score?: number;
}

// 공통
export interface ListResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface GateXError {
  status: number;
  error: string;
  details?: unknown;
}
```

## 3. GateXClient (`src/client.ts`)

```typescript
export class GateXClient {
  readonly evaluations: EvaluationsResource;
  readonly gatePackage: GatePackageResource;
  readonly ogd: OgdResource;

  constructor(options: GateXClientOptions) {
    // baseUrl + apiKey 설정, 각 Resource 인스턴스화
  }

  async health(): Promise<{ service: string; status: string; ts: string }>;

  // 내부 헬퍼
  private async request<T>(path: string, init?: RequestInit): Promise<T>;
}
```

### 인증 방식
- `Authorization: Bearer {apiKey}` 헤더 — Gate-X auth 미들웨어가 API Key로 검증

## 4. 리소스 클래스

### 4.1 EvaluationsResource (`src/resources/evaluations.ts`)

| 메서드 | HTTP | 경로 |
|--------|------|------|
| `create(input)` | POST | `/api/gate/ax-bd/evaluations` |
| `list(opts?)` | GET | `/api/gate/ax-bd/evaluations` |
| `get(evalId)` | GET | `/api/gate/ax-bd/evaluations/:evalId` |
| `updateStatus(evalId, status, reason?)` | PATCH | `/api/gate/ax-bd/evaluations/:evalId` |
| `createKpi(evalId, input)` | POST | `/api/gate/ax-bd/evaluations/:evalId/kpis` |
| `listKpis(evalId)` | GET | `/api/gate/ax-bd/evaluations/:evalId/kpis` |
| `updateKpi(evalId, kpiId, input)` | PATCH | `/api/gate/ax-bd/evaluations/:evalId/kpis/:kpiId` |
| `getHistory(evalId)` | GET | `/api/gate/ax-bd/evaluations/:evalId/history` |
| `getPortfolio()` | GET | `/api/gate/ax-bd/evaluations/portfolio` |

### 4.2 GatePackageResource (`src/resources/gate-package.ts`)

| 메서드 | HTTP | 경로 |
|--------|------|------|
| `create(bizItemId, input)` | POST | `/api/gate/gate-package/:bizItemId` |
| `get(bizItemId)` | GET | `/api/gate/gate-package/:bizItemId` |
| `download(bizItemId)` | GET | `/api/gate/gate-package/:bizItemId/download` |
| `updateStatus(bizItemId, status)` | PATCH | `/api/gate/gate-package/:bizItemId/status` |

### 4.3 OgdResource (`src/resources/ogd.ts`)

| 메서드 | HTTP | 경로 |
|--------|------|------|
| `run(input)` | POST | `/api/ogd/run` |
| `getStatus(jobId)` | GET | `/api/ogd/status/:jobId` |

## 5. Worker 파일 매핑

| 파일 | 담당 작업 |
|------|-----------|
| `packages/gate-x-sdk/package.json` | 패키지 설정, bin 등록 |
| `packages/gate-x-sdk/tsconfig.json` | TypeScript 설정 |
| `packages/gate-x-sdk/src/types.ts` | 인라인 타입 정의 |
| `packages/gate-x-sdk/src/client.ts` | GateXClient 코어 |
| `packages/gate-x-sdk/src/resources/evaluations.ts` | Evaluations 리소스 |
| `packages/gate-x-sdk/src/resources/gate-package.ts` | GatePackage 리소스 |
| `packages/gate-x-sdk/src/resources/ogd.ts` | OGD 리소스 |
| `packages/gate-x-sdk/src/index.ts` | public exports |
| `packages/gate-x-sdk/bin/gate-x.ts` | CLI entry point |
| `packages/gate-x-sdk/src/__tests__/client.test.ts` | SDK 유닛 테스트 |
| `packages/gate-x-sdk/src/__tests__/cli.test.ts` | CLI 유닛 테스트 |
| `packages/gate-x-sdk/README.md` | API 문서 |
| `pnpm-workspace.yaml` | 새 패키지 등록 |

## 6. CLI 설계 (`bin/gate-x.ts`)

```
$ gate-x health
{ "service": "gate-x", "status": "ok", "ts": "..." }

$ gate-x eval list --limit 5
[{ "id": "...", "title": "헬스케어 AI 검증", "status": "in_review" }, ...]

$ gate-x eval create --title "신규 검증" --gate-type ax_bd
{ "id": "...", "status": "draft" }

$ gate-x eval status <evalId> approved
{ "id": "...", "status": "approved" }

$ gate-x gate-package get <bizItemId>
{ "id": "...", "gateType": "...", "status": "..." }

$ gate-x ogd run --content "검증할 내용" --max-iterations 3
{ "jobId": "...", "status": "queued" }
```

환경변수:
- `GATEX_API_KEY` — API Key (--api-key 대체)
- `GATEX_BASE_URL` — Workers URL (--base-url 대체)

## 7. 테스트 계획

### 유닛 테스트 (`src/__tests__/client.test.ts`)
- `GateXClient` 생성 — baseUrl 기본값 검증
- `health()` — fetch mock → `{ status: "ok" }` 반환 검증
- `evaluations.create()` — POST 요청 본문/헤더 검증
- `evaluations.list()` — query string 변환 검증
- `evaluations.updateStatus()` — PATCH 본문 검증
- 에러 처리 — 4xx/5xx 응답 시 `GateXError` throw

### CLI 테스트 (`src/__tests__/cli.test.ts`)
- `gate-x health` — GateXClient.health() 호출 + JSON 출력 검증
- `gate-x eval list` — evaluations.list() 호출 검증
- `--api-key` 옵션 → client 생성 시 전달 검증
- `GATEX_API_KEY` 환경변수 → apiKey로 사용 검증

## 8. 에러 처리

```typescript
// 4xx/5xx 모두 GateXError로 throw
class GateXRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: string,
    public readonly details?: unknown
  ) { super(`[${status}] ${error}`); }
}
```

## 9. Skip 사유

없음 — 전체 구현 가능.
