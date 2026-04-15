---
id: FX-DESIGN-297
feature: F540
req: FX-REQ-579
sprint: 297
status: approved
created: 2026-04-15
---

# Sprint 297 Design — F540: Shaping 도메인 분리

## §1 아키텍처 개요

```
Browser / CLI
    │
    ▼
fx-gateway (CORS)
    ├── /api/shaping/* ──────────► fx-shaping Worker [NEW]
    ├── /api/ax-bd/* ────────────► fx-shaping Worker [NEW]
    ├── /api/discovery/* ────────► fx-discovery Worker [기존]
    └── /api/* ──────────────────► foundry-x-api [잔여]

fx-shaping
    ├── DB (D1: foundry-x-db, 공유)
    ├── CACHE (KV: 030b30d47a98485ea3af95b3347163d6)
    ├── FILES_BUCKET (R2: foundry-x-files)
    └── ANTHROPIC_API_KEY (Secret)
```

## §2 신규 패키지 구조 (packages/fx-shaping/)

```
packages/fx-shaping/
├── wrangler.toml
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
└── src/
    ├── index.ts
    ├── app.ts
    ├── env.ts
    ├── middleware/
    │   ├── auth.ts
    │   └── tenant.ts
    ├── routes/         (13개 — core/shaping/routes/* 포팅)
    │   ├── shaping.ts
    │   ├── ax-bd-bmc.ts
    │   ├── ax-bd-agent.ts
    │   ├── ax-bd-comments.ts
    │   ├── ax-bd-history.ts
    │   ├── ax-bd-links.ts
    │   ├── ax-bd-viability.ts
    │   ├── ax-bd-prototypes.ts
    │   ├── ax-bd-skills.ts
    │   ├── ax-bd-persona-eval.ts
    │   ├── ax-bd-progress.ts
    │   ├── persona-configs.ts
    │   └── persona-evals.ts
    ├── schemas/        (16개 — core/shaping/schemas/* 복사)
    │   ├── shaping.ts
    │   ├── bmc.schema.ts
    │   ├── bmc-comment.schema.ts
    │   ├── bmc-history.schema.ts
    │   ├── bmc-insight.schema.ts
    │   ├── bmc-agent.schema.ts
    │   ├── bd-progress.schema.ts
    │   ├── commit-gate.schema.ts
    │   ├── hitl-section.schema.ts
    │   ├── idea-bmc-link.schema.ts
    │   ├── persona-config-schema.ts
    │   ├── persona-config.ts
    │   ├── persona-eval-schema.ts
    │   ├── persona-eval.ts
    │   └── viability-checkpoint.schema.ts
    ├── services/       (22개 — core/shaping/services/* 복사)
    │   └── [모든 service 파일 동일]
    └── __tests__/
        ├── health.test.ts
        └── shaping-routes.test.ts
```

## §3 환경 바인딩 (env.ts)

```typescript
export interface ShapingEnv {
  DB: D1Database;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY?: string;
  CACHE: KVNamespace;
  FILES_BUCKET: R2Bucket;
  MARKER_PROJECT_ID?: string;
}
```

## §4 타입 변환 계약 (TDD Red Target)

모든 route 파일에서:
- `import type { Env } from "../../../env.js"` → `import type { ShapingEnv } from "../env.js"`
- `import type { TenantVariables } from "../../../middleware/tenant.js"` → 로컬 경로
- `Bindings: Env` → `Bindings: ShapingEnv`

## §5 파일 매핑 (D1 체크리스트)

### 신규 생성 파일

| 파일 | 내용 |
|------|------|
| packages/fx-shaping/wrangler.toml | D1 + KV(CACHE) + R2(FILES_BUCKET) + Secrets |
| packages/fx-shaping/package.json | name: @foundry-x/fx-shaping, hono, zod, @anthropic-ai/sdk |
| packages/fx-shaping/tsconfig.json | fx-discovery와 동일 |
| packages/fx-shaping/vitest.config.ts | fx-discovery와 동일 |
| packages/fx-shaping/eslint.config.js | fx-discovery와 동일 |
| packages/fx-shaping/src/index.ts | ExportedHandler wiring |
| packages/fx-shaping/src/app.ts | health + auth 미들웨어 + 13개 route 마운트 |
| packages/fx-shaping/src/env.ts | ShapingEnv interface |
| packages/fx-shaping/src/middleware/auth.ts | JWT authMiddleware (shaping health 공개) |
| packages/fx-shaping/src/middleware/tenant.ts | tenantGuard |
| packages/fx-shaping/src/routes/*.ts | 13개 routes (Env 타입 교체) |
| packages/fx-shaping/src/schemas/*.ts | 16개 schemas (변경 없음) |
| packages/fx-shaping/src/services/*.ts | 22개 services (변경 없음) |
| packages/fx-shaping/src/__tests__/health.test.ts | GET /api/shaping/health → 200 |
| packages/fx-shaping/src/__tests__/shaping-routes.test.ts | POST /api/shaping/runs → 401 (미인증) |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| packages/fx-gateway/wrangler.toml | [[services]] SHAPING 추가 |
| packages/fx-gateway/src/env.ts | SHAPING: Fetcher 추가 |
| packages/fx-gateway/src/app.ts | /api/shaping/* + /api/ax-bd/* → SHAPING 라우팅 추가 |
| packages/api/src/app.ts | shaping 관련 import 13개 + app.route() 14개 제거 |
| .github/workflows/deploy.yml | msa filter에 fx-shaping 추가, deploy-msa step 추가 |

## §6 D1/Breaking Change 검증

- D1 migration 신규 없음 (테이블 동일 DB 공유, 스키마 변경 없음)
- Breaking change: packages/api에서 shaping routes 제거 → Gateway를 통해서만 접근
- 주입 사이트: Gateway가 유일한 진입점

## §7 Cross-domain Import 검증 (D1 체크리스트)

- shaping → discovery: 없음 (shaping-review-service.ts 주석만)
- shaping → offering: 없음
- shaping → shared: BdArtifact, ArtifactListQuery, ExecuteSkillInput, SkillExecutionResult, TriggerShapingInput (허용 — contract)

## §8 msa-lint 확인 사항

- foundry-x-api/no-cross-domain-import: packages/api에서 shaping 제거 후 잔여 import 없음 확인
- foundry-x-api/no-direct-route-register: app.ts에서 shaping app.route() 제거 확인

## §9 Gateway 라우팅 설계

```
Discovery 패턴 참조:
  app.all("/api/discovery/*", (c) => c.env.DISCOVERY.fetch(c.req.raw))

Shaping 라우팅:
  // Shaping runs (BD 형상화 세션)
  app.all("/api/shaping/*", (c) => c.env.SHAPING.fetch(c.req.raw))
  // AX-BD 공통 라우트 (BMC, prototypes, skills, viability, persona, etc.)
  app.all("/api/ax-bd/*", (c) => c.env.SHAPING.fetch(c.req.raw))
  // ideas/:id/bmc — shaping이 소유
  app.all("/api/ideas/:id/bmc", (c) => c.env.SHAPING.fetch(c.req.raw))
  app.all("/api/ideas/:id/bmc/*", (c) => c.env.SHAPING.fetch(c.req.raw))

주의: /api/ax-bd/* 중 discovery-report* 는 DISCOVERY에 이미 라우팅됨(F538)
  → Gateway에서 /api/ax-bd/discovery-report* 먼저 등록(DISCOVERY) 후 /api/ax-bd/* (SHAPING) 후 등록
```

## §10 TDD Red Target

```
test: GET /api/shaping/health → { domain: "shaping", status: "ok" } (public)
test: POST /api/shaping/runs (no auth) → 401
test: POST /api/ax-bd/bmc (no auth) → 401
```
