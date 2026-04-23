---
id: FX-DESIGN-319
title: Sprint 319 — F572 fx-modules Worker + F574 wiki-sync bug fix
sprint: 319
features: [F572, F574]
status: in_progress
created: 2026-04-24
---

# Sprint 319 Design

## §1 F572 — fx-modules Worker 아키텍처

### §1-1 패키지 구조
```
packages/fx-modules/
├── package.json            (@foundry-x/fx-modules, workspace:*)
├── wrangler.toml           (name=fx-modules, DB binding, JWT_SECRET)
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── index.ts            (Worker entry)
    ├── app.ts              (Hono 3-domain mount)
    ├── env.ts              (ModulesEnv interface)
    ├── middleware/
    │   ├── auth.ts         (createAuthMiddleware from harness-kit)
    │   └── tenant.ts       (copied from api/src/middleware/tenant.ts)
    ├── db/
    │   ├── index.ts        (getDb — drizzle-orm/d1)
    │   └── schema.ts       (wikiPages + orgs + users + relevant tables)
    ├── schemas/
    │   └── common.ts       (ErrorSchema, validationHook)
    ├── middleware/
    │   ├── rbac.ts         (copied from api)
    │   └── role-guard.ts   (copied from api)
    └── core/
        ├── portal/         (moved from api/src/modules/portal/)
        │   ├── routes/     (19 route files — unchanged imports)
        │   ├── services/   (23 service files — unchanged imports)
        │   └── schemas/    (schema files)
        ├── gate/           (moved from api/src/modules/gate/)
        │   ├── routes/     (7 route files)
        │   ├── services/   (8 service files)
        │   └── schemas/
        └── launch/         (moved from api/src/modules/launch/)
            ├── routes/     (8 route files)
            ├── services/   (14 service files)
            └── schemas/
```

### §1-2 app.ts — 3-domain Sub-app 마운트
```typescript
// Health endpoints (public)
app.get("/api/portal/health", (c) => c.json({ domain: "portal", status: "ok" }));
app.get("/api/gate/health", (c) => c.json({ domain: "gate", status: "ok" }));
app.get("/api/launch/health", (c) => c.json({ domain: "launch", status: "ok" }));

// JWT auth
app.use("/api/*", authMiddleware);

// Domain sub-apps (tenant guard included)
const authenticated = new Hono<{ Bindings: ModulesEnv; Variables: TenantVariables }>();
authenticated.use("*", tenantGuard);

// Portal: 19 routes
authenticated.route("/api/portal", portalApp);
// Gate: 7 routes
authenticated.route("/api/gate", gateApp);
// Launch: 8 routes
authenticated.route("/api/launch", launchApp);
```

### §1-3 Import 호환성 (핵심 인사이트)
```
api/src/modules/portal/routes/wiki.ts → ../../../middleware/auth.js
                                         (depth: routes→portal→modules→src)
fx-modules/src/core/portal/routes/wiki.ts → ../../../middleware/auth.js  
                                         (depth: routes→portal→core→src) ✓ SAME DEPTH
```
**상대 import 수정 불필요** — 디렉토리 깊이가 동일함.

단, 인프라 파일 생성 필요:
- `src/middleware/auth.ts` — harness-kit createAuthMiddleware
- `src/middleware/tenant.ts` — copied from api
- `src/middleware/rbac.ts` — copied from api
- `src/middleware/role-guard.ts` — copied from api
- `src/db/index.ts` — getDb (drizzle-orm/d1)
- `src/db/schema.ts` — 필요 테이블 포함 (wiki_pages, orgs, users, projects, ...)
- `src/schemas/common.ts` — ErrorSchema, validationHook

### §1-4 fx-gateway 변경 (catch-all 3줄 추가)
```typescript
// F572: portal/gate/launch → fx-modules
app.all("/api/portal/*", async (c) => c.env.MODULES.fetch(c.req.raw));
app.all("/api/gate/*", async (c) => c.env.MODULES.fetch(c.req.raw));
app.all("/api/launch/*", async (c) => c.env.MODULES.fetch(c.req.raw));
```
wrangler.toml에 `[[services]] binding = "MODULES" service = "fx-modules"` 추가.

### §1-5 packages/api/src/app.ts 변경 (portal/gate/launch 제거)
- portal routes import 제거 (~8줄)
- gate routes import 제거 (~3줄)
- launch routes import 제거 (~5줄)
- app.route("/api", ...) 호출 ~12줄 제거

### §1-6 TDD Red Target (F572)
```typescript
// packages/fx-modules/src/__tests__/health.test.ts
describe("fx-modules F572 health", () => {
  it("GET /api/portal/health → 200");
  it("GET /api/gate/health → 200");
  it("GET /api/launch/health → 200");
});

// cross-domain import guard
describe("cross-domain import guard", () => {
  it("core/portal imports no core/gate or core/launch");
  it("core/gate imports no core/portal or core/launch");
  it("core/launch imports no core/portal or core/gate");
});
```

## §2 F574 — wiki-sync bug fix

### §2-1 D1 Migration
파일: `packages/api/src/db/migrations/0139_wiki_slug_unique.sql`
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(slug);
```

### §2-2 Schema 변경
```typescript
// packages/api/src/db/schema.ts
slug: text("slug").notNull().unique(),
```

### §2-3 Code Fix
```typescript
// packages/api/src/modules/portal/routes/wiki.ts (line 19)
const DEFAULT_PROJECT_ID = "proj_default";  // was "default"

// packages/api/src/modules/portal/services/wiki-sync.ts (line 53)
VALUES (?, 'proj_default', ?, ?, ?, ?, 'git', datetime('now'))  // was 'default'
```

### §2-4 TDD Red Target (F574)
```typescript
// packages/api/src/__tests__/wiki-sync-webhook.test.ts
describe("F574 wiki-sync bug fix", () => {
  it("pullFromGit upserts duplicate slug (UNIQUE index enables ON CONFLICT)");
  it("pullFromGit uses proj_default project_id — no FK violation");
  it("pullFromGit returns synced=1 on second identical file push");
});
```

## §5 파일 매핑

### 신규 파일 (F572)
| 파일 | 역할 |
|------|------|
| `packages/fx-modules/package.json` | 패키지 메타데이터 |
| `packages/fx-modules/wrangler.toml` | Worker 배포 설정 |
| `packages/fx-modules/tsconfig.json` | TypeScript 설정 |
| `packages/fx-modules/vitest.config.ts` | 테스트 설정 |
| `packages/fx-modules/src/index.ts` | Worker entry |
| `packages/fx-modules/src/app.ts` | Hono 3-domain 마운트 |
| `packages/fx-modules/src/env.ts` | ModulesEnv 인터페이스 |
| `packages/fx-modules/src/middleware/auth.ts` | JWT auth (harness-kit) |
| `packages/fx-modules/src/middleware/tenant.ts` | Tenant guard |
| `packages/fx-modules/src/middleware/rbac.ts` | RBAC middleware |
| `packages/fx-modules/src/middleware/role-guard.ts` | Role guard |
| `packages/fx-modules/src/db/index.ts` | drizzle-orm getDb |
| `packages/fx-modules/src/db/schema.ts` | D1 스키마 |
| `packages/fx-modules/src/schemas/common.ts` | ErrorSchema, validationHook |
| `packages/fx-modules/src/core/portal/**` | portal 이관 (19 routes, 23 services) |
| `packages/fx-modules/src/core/gate/**` | gate 이관 (7 routes, 8 services) |
| `packages/fx-modules/src/core/launch/**` | launch 이관 (8 routes, 14 services) |
| `packages/fx-modules/src/__tests__/health.test.ts` | TDD Red — health + cross-domain |

### 수정 파일 (F572)
| 파일 | 변경 내용 |
|------|----------|
| `packages/fx-gateway/wrangler.toml` | MODULES Service Binding 추가 |
| `packages/fx-gateway/src/app.ts` | /api/portal,gate,launch catch-all 3줄 추가 |
| `packages/fx-gateway/src/env.ts` | MODULES: Service 추가 |
| `packages/api/src/app.ts` | portal/gate/launch route 등록 ~12줄 제거 |
| `packages/api/src/modules/index.ts` | portal/gate/launch export 제거 |

### 신규 파일 (F574)
| 파일 | 역할 |
|------|------|
| `packages/api/src/db/migrations/0139_wiki_slug_unique.sql` | UNIQUE index migration |
| `packages/api/src/__tests__/wiki-sync-webhook.test.ts` | TDD Red — webhook redelivery |

### 수정 파일 (F574)
| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/db/schema.ts` | wikiPages.slug `.unique()` 추가 |
| `packages/api/src/modules/portal/routes/wiki.ts` | DEFAULT_PROJECT_ID → "proj_default" |
| `packages/api/src/modules/portal/services/wiki-sync.ts` | 'default' → 'proj_default' |

## §6 D1 체크리스트 (Stage 3 Exit)

| # | 항목 | 상태 |
|---|------|------|
| D1 | 신규 API 주입 사이트 전수 확인 | fx-modules health 3개, 포털/게이트/런치 서브앱 마운트 전수 |
| D2 | cross-domain import 0건 확증 | grep 스크립트 포함 |
| D3 | Breaking change 영향도 | wiki /api/wiki → /api/portal/wiki (web 참조 1개: architecture.tsx:116) |
| D4 | TDD Red 파일 존재 | health.test.ts + wiki-sync-webhook.test.ts FAIL 확인 |
