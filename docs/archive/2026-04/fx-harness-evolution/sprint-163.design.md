---
code: FX-DSGN-S163
title: "Sprint 163 — O-G-D Loop 범용 인터페이스 + 어댑터 레지스트리"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-PLAN-S163]], [[FX-SPEC-001]], fx-harness-evolution/prd-final.md"
---

# Sprint 163 Design: O-G-D Loop 범용 인터페이스 + 어댑터 레지스트리

## 1. Overview

Phase 14의 `OrchestrationLoop` (범용 피드백 루프)과 Phase 16의 `OgdOrchestratorService` (Prototype 전용 O-G-D)를 **도메인 독립적 인터페이스**로 통합한다. 새 도메인 추가 시 `DomainAdapter`만 구현하면 O-G-D Loop을 재활용할 수 있다.

### 핵심 설계 결정

| 결정 | 근거 |
|------|------|
| 기존 `AgentAdapterRegistry` 확장 대신 새 `OgdDomainRegistry` 생성 | Agent Adapter(코드 생성/검증용)와 OGD Domain Adapter(O-G-D 루프 전용)는 역할이 다름. 분리 유지 |
| `OrchestrationLoop`의 adversarial 모드 활용 | 이미 generator→discriminator 패턴이 구현되어 있음. DomainAdapter를 AgentAdapter로 래핑하여 연결 |
| D1 `ogd_domains` 테이블 신규 | 도메인별 설정(rubric, maxRounds, minScore) 영속화. 기존 `ogd_rounds`와 별개 |
| Workers AI(Llama) 유지 | 비용 효율. 코드리뷰/문서검증도 동일 모델 사용, 고도화는 후속 |

---

## 2. Architecture

### 2.1 계층 구조

```
[Route: POST /ogd/run]
    ↓
[OgdGenericRunner]  ← 도메인 독립 러너
    ↓ domain으로 어댑터 조회
[OgdDomainRegistry] → DomainAdapter 인스턴스
    ↓
[DomainAdapter.generate()] → [DomainAdapter.discriminate()]
    ↓ score >= minScore → 수렴
[OGDResult 반환]
```

### 2.2 기존 코드 활용

| 기존 코드 | 활용 방식 |
|-----------|----------|
| `OrchestrationLoop` (345줄) | 참조만. OgdGenericRunner가 자체 루프 구현 (OrchestrationLoop은 TaskState 의존이 강해 직접 사용 비효율) |
| `OgdOrchestratorService` (185줄) | BD/Prototype 어댑터가 내부에서 호출 |
| `OgdGeneratorService` (57줄) | PrototypeAdapter가 직접 사용 |
| `OgdDiscriminatorService` (104줄) | PrototypeAdapter가 직접 사용 |
| `AgentAdapterFactory` | 사용하지 않음 (DomainAdapter는 별도 인터페이스) |

---

## 3. Data Model

### 3.1 D1 Migration: `0109_ogd_domains.sql`

```sql
CREATE TABLE IF NOT EXISTS ogd_domains (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  adapter_type TEXT NOT NULL DEFAULT 'builtin',
  default_rubric TEXT,
  default_max_rounds INTEGER NOT NULL DEFAULT 3,
  default_min_score REAL NOT NULL DEFAULT 0.85,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, domain)
);

CREATE TABLE IF NOT EXISTS ogd_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_summary TEXT,
  total_rounds INTEGER NOT NULL DEFAULT 0,
  best_score REAL,
  converged INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ogd_run_rounds (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES ogd_runs(id),
  round_number INTEGER NOT NULL,
  generator_output TEXT,
  quality_score REAL,
  feedback TEXT,
  passed INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 4. Interface Design

### 4.1 Shared Types (`shared/src/ogd-generic.ts`)

```typescript
// === 도메인 독립 O-G-D 인터페이스 ===

export interface OGDRequest {
  domain: string;
  input: unknown;
  rubric?: string;
  maxRounds?: number;
  minScore?: number;
  tenantId: string;
}

export interface OGDResult {
  runId: string;
  domain: string;
  output: unknown;
  score: number;
  iterations: number;
  converged: boolean;
  rounds: OGDRunRound[];
}

export interface OGDRunRound {
  round: number;
  output: unknown;
  score: number;
  feedback: string;
  passed: boolean;
  durationMs: number;
}

export interface DomainAdapterConfig {
  domain: string;
  displayName: string;
  description: string;
  adapterType: 'builtin' | 'custom';
  defaultRubric: string;
  defaultMaxRounds: number;
  defaultMinScore: number;
}

// DomainAdapter는 API 패키지에서만 사용 (shared에 인터페이스만)
export interface DomainAdapterInterface {
  readonly domain: string;
  generate(input: unknown, feedback?: string): Promise<{ output: unknown }>;
  discriminate(output: unknown, rubric: string): Promise<{ score: number; feedback: string; pass: boolean }>;
  getDefaultRubric(): string;
}

export type OGDRunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'max_rounds';
```

### 4.2 Zod Schema (`api/src/schemas/ogd-generic-schema.ts`)

```typescript
// OGD Run Request
export const OgdRunRequestSchema = z.object({
  domain: z.string().min(1),
  input: z.unknown(),
  rubric: z.string().optional(),
  maxRounds: z.number().int().min(1).max(10).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

// OGD Run Response
export const OgdRunResponseSchema = z.object({
  runId: z.string(),
  domain: z.string(),
  output: z.unknown(),
  score: z.number(),
  iterations: z.number(),
  converged: z.boolean(),
  rounds: z.array(z.object({
    round: z.number(),
    score: z.number(),
    feedback: z.string(),
    passed: z.boolean(),
    durationMs: z.number(),
  })),
});

// Domain Info
export const DomainInfoSchema = z.object({
  domain: z.string(),
  displayName: z.string(),
  description: z.string(),
  adapterType: z.string(),
  defaultMaxRounds: z.number(),
  defaultMinScore: z.number(),
  enabled: z.boolean(),
});
```

---

## 5. Implementation Details

### 5.1 파일 매핑

| # | 영역 | 파일 경로 | 줄 수(예상) | 작업 내용 |
|---|------|----------|------------|-----------|
| 1 | Shared | `packages/shared/src/ogd-generic.ts` | ~60 | OGDRequest, OGDResult, DomainAdapterInterface 타입 |
| 2 | Shared | `packages/shared/src/index.ts` | +3 | ogd-generic re-export 추가 |
| 3 | Migration | `packages/api/src/db/migrations/0109_ogd_domains.sql` | ~35 | ogd_domains + ogd_runs + ogd_run_rounds 3테이블 |
| 4 | Schema | `packages/api/src/schemas/ogd-generic-schema.ts` | ~50 | Zod 3개 (Run request/response, Domain info) |
| 5 | Service | `packages/api/src/services/ogd-domain-registry.ts` | ~80 | 도메인 레지스트리 — register/get/list + D1 동기화 |
| 6 | Service | `packages/api/src/services/ogd-generic-runner.ts` | ~120 | 범용 O-G-D 루프 실행기 — 어댑터 호출 + 수렴 판정 + D1 기록 |
| 7 | Adapter | `packages/api/src/services/adapters/bd-shaping-ogd-adapter.ts` | ~60 | BD 형상화 DomainAdapter — 기존 서비스 래핑 |
| 8 | Adapter | `packages/api/src/services/adapters/prototype-ogd-adapter.ts` | ~60 | Prototype DomainAdapter — OgdGenerator/Discriminator 래핑 |
| 9 | Adapter | `packages/api/src/services/adapters/code-review-ogd-adapter.ts` | ~80 | 코드리뷰 DomainAdapter — diff→LLM 리뷰→점수 |
| 10 | Adapter | `packages/api/src/services/adapters/doc-verify-ogd-adapter.ts` | ~80 | 문서검증 DomainAdapter — 문서→LLM 검증→일관성 점수 |
| 11 | Route | `packages/api/src/routes/ogd-generic.ts` | ~90 | POST /ogd/run + GET /ogd/domains + POST /ogd/domains |
| 12 | Test | `packages/api/src/__tests__/ogd-generic-runner.test.ts` | ~150 | 러너 단위 테스트 (mock adapter, 수렴/미수렴/에러) |
| 13 | Test | `packages/api/src/__tests__/ogd-domain-registry.test.ts` | ~100 | 레지스트리 + 어댑터 테스트 |
| 14 | Route Reg | `packages/api/src/index.ts` | +2 | ogdGenericRoute 등록 |

### 5.2 서비스 상세

#### OgdDomainRegistry

```typescript
class OgdDomainRegistry {
  private adapters: Map<string, DomainAdapterInterface> = new Map();

  register(adapter: DomainAdapterInterface): void;
  get(domain: string): DomainAdapterInterface | undefined;
  list(): DomainAdapterInterface[];
  has(domain: string): boolean;
  get size(): number;

  // D1 동기화 — 등록된 어댑터 메타데이터를 ogd_domains에 upsert
  async syncToDb(db: D1Database, tenantId: string): Promise<void>;
  // D1에서 도메인 목록 조회
  static async listFromDb(db: D1Database, tenantId: string): Promise<DomainAdapterConfig[]>;
}
```

#### OgdGenericRunner

```typescript
class OgdGenericRunner {
  constructor(
    private registry: OgdDomainRegistry,
    private db: D1Database,
  );

  async run(request: OGDRequest): Promise<OGDResult>;
  async getRunHistory(tenantId: string, limit?: number): Promise<OGDResult[]>;
  async getRunById(runId: string, tenantId: string): Promise<OGDResult | null>;
}
```

`run()` 핵심 로직:
1. `registry.get(domain)` → 어댑터 조회 (없으면 404)
2. `ogd_runs` INSERT (status: 'running')
3. for (round = 1; round <= maxRounds; round++)
   - `adapter.generate(input, previousFeedback)`
   - `adapter.discriminate(output, rubric)`
   - `ogd_run_rounds` INSERT
   - if (score >= minScore) → break (converged)
4. `ogd_runs` UPDATE (status, best_score, total_rounds)
5. OGDResult 반환

#### 4개 DomainAdapter

| 어댑터 | generate() | discriminate() | defaultRubric |
|--------|-----------|----------------|---------------|
| BdShapingOgdAdapter | 기존 BD 형상화 로직 위임 (LLM PRD→형상화 문서) | Rubric 기반 점수 산출 | BD 형상화 5차원 평가 기준 |
| PrototypeOgdAdapter | `OgdGeneratorService.generate()` 위임 | `OgdDiscriminatorService.evaluate()` 위임 | PRD 체크리스트 기반 |
| CodeReviewOgdAdapter | diff + context → LLM → 리뷰 리포트 | 리뷰 리포트 → 점수 + 이슈 분류 | OWASP + 코드품질 10항목 |
| DocVerifyOgdAdapter | 문서 → LLM → 일관성 분석 | 분석 결과 → 점수 + 이슈 목록 | 문서 구조/용어/참조 일관성 |

### 5.3 API 설계

| Method | Path | Request | Response | 설명 |
|--------|------|---------|----------|------|
| POST | `/ogd/run` | `{ domain, input, rubric?, maxRounds?, minScore? }` | `OGDResult` | O-G-D Loop 실행 |
| GET | `/ogd/domains` | - | `{ domains: DomainInfo[] }` | 등록된 도메인 목록 |
| GET | `/ogd/runs` | `?limit=20` | `{ runs: OGDResult[] }` | 실행 이력 |
| GET | `/ogd/runs/:runId` | - | `OGDResult` | 특정 실행 상세 |

---

## 6. Test Strategy

### 6.1 단위 테스트 (ogd-generic-runner.test.ts)

| TC | 시나리오 | 검증 |
|----|---------|------|
| TC-01 | Mock adapter로 1라운드 수렴 | converged=true, iterations=1, score >= minScore |
| TC-02 | Mock adapter로 3라운드 수렴 | converged=true, iterations=3, 라운드별 점수 상승 |
| TC-03 | maxRounds 소진 미수렴 | converged=false, iterations=maxRounds |
| TC-04 | 존재하지 않는 도메인 | 404 에러 |
| TC-05 | adapter.generate() 에러 | status=failed, error_message 기록 |
| TC-06 | 커스텀 rubric 전달 | adapter.discriminate에 커스텀 rubric 전달 확인 |

### 6.2 레지스트리 테스트 (ogd-domain-registry.test.ts)

| TC | 시나리오 | 검증 |
|----|---------|------|
| TC-07 | register + get | 어댑터 조회 성공 |
| TC-08 | list 4개 어댑터 | 전체 목록 반환 |
| TC-09 | 중복 도메인 register | 덮어쓰기 |
| TC-10 | has() 존재/미존재 | true/false |

### 6.3 통합 테스트 (라우트)

| TC | 시나리오 | 검증 |
|----|---------|------|
| TC-11 | POST /ogd/run { domain: 'code-review' } | 200 + OGDResult |
| TC-12 | GET /ogd/domains | 200 + 4개 도메인 |
| TC-13 | POST /ogd/run { domain: 'unknown' } | 404 |

---

## 7. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| 기존 O-G-D 테스트 회귀 | 기존 `ogd-quality.ts` 라우트와 서비스는 수정하지 않음. 새 어댑터가 래핑만 함 |
| LLM 응답 불안정 | Mock adapter로 테스트. 실제 LLM 호출은 통합 테스트에서만 |
| D1 마이그레이션 충돌 | 0109번 사용 (0108이 최신) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Initial design — Plan + 기존 코드 분석 기반 | Sinclair Seo |
