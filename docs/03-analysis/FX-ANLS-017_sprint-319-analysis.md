---
id: FX-ANALYSIS-319
sprint: 319
features: [F572, F574]
matchRate: 100
date: 2026-04-24
status: PASS
---

# Sprint 319 Gap Analysis — F572 + F574

## Match Rate: 100% ✅

| Category | Items | Pass | Status |
|----------|:-----:|:----:|:------:|
| F572 — fx-modules Worker structure | 11 | 11 | ✅ |
| F572 — fx-gateway routing + env | 4 | 4 | ✅ |
| F572 — api/app.ts route removal | 1 | 1 | ✅ |
| F572 — modules/index.ts export removal | 1 | 1 | ✅ |
| F572 — Cross-domain isolation | 1 | 1 | ✅ |
| F574 — D1 migration UNIQUE INDEX | 1 | 1 | ✅ |
| F574 — Schema slug.unique() | 1 | 1 | ✅ |
| F574 — DEFAULT_PROJECT_ID "proj_default" | 2 | 2 | ✅ |
| TDD Red/Green tests | 2 | 2 | ✅ |
| **Total** | **24** | **24** | ✅ |

---

## F572 Verification Detail

### fx-modules Worker
- `packages/fx-modules/src/index.ts` — Hono Worker entry
- `packages/fx-modules/src/app.ts` — 3 health endpoints + auth + tenant + 34 domain routes
- `packages/fx-modules/src/env.ts` — `ModulesEnv` (DB, JWT_SECRET, GITHUB_TOKEN, AI, ...)
- `packages/fx-modules/src/middleware/` — auth/tenant/rbac/role-guard copied
- `packages/fx-modules/src/core/portal/` — 19 routes, 23 services
- `packages/fx-modules/src/core/gate/` — 7 routes, 8 services
- `packages/fx-modules/src/core/launch/` — 8 routes, 14 services
- `packages/fx-modules/wrangler.toml` — real D1 database_id, nodejs_compat

### Cross-domain isolation
- `src/services/notification-service.ts` — Worker-level shared (avoids gate→portal)
- `src/core/gate/services/_pipeline-bridge.ts` — local stub (avoids gate→launch)
- grep `from.*core/portal|gate|launch` across domains: **0 matches** ✅

### fx-gateway routing
- `packages/fx-gateway/src/app.ts` — `/api/portal/*`, `/api/gate/*`, `/api/launch/*` → `MODULES.fetch`
- `packages/fx-gateway/src/env.ts` — `MODULES: Fetcher`
- `packages/fx-gateway/wrangler.toml` — `binding = "MODULES" service = "fx-modules"` (prod + dev)

### api package cleanup
- `packages/api/src/app.ts` — portal/gate/launch routes removed (commented `// F572: moved`)
- `packages/api/src/modules/index.ts` — portal/gate/launch exports removed

---

## F574 Verification Detail

### Bug A — wiki_pages.slug UNIQUE INDEX
- `packages/api/src/db/migrations/0139_wiki_slug_unique.sql` — `CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(slug)`
- `packages/api/src/db/schema.ts:36` — `slug: text("slug").notNull().unique()`

### Bug B — DEFAULT_PROJECT_ID
- `packages/api/src/modules/portal/routes/wiki.ts:19` — `const DEFAULT_PROJECT_ID = "proj_default"`
- `packages/api/src/modules/portal/services/wiki-sync.ts:53` — `"proj_default"`

### TDD Tests
- `packages/api/src/__tests__/wiki-sync-webhook.test.ts` — 3 tests PASS ✅
  - Bug A: ON CONFLICT(slug) DO UPDATE works
  - Bug B: DEFAULT_PROJECT_ID FK matches
  - Combined scenario

---

## Pre-deploy Checklist

- [ ] `wrangler secret put JWT_SECRET --name fx-modules`
- [ ] `wrangler secret put GITHUB_TOKEN --name fx-modules`
- [ ] Smoke: `GET /api/portal/health`, `/api/gate/health`, `/api/launch/health` via gateway
- [ ] Confirm D1 migration 0139 applied to production
