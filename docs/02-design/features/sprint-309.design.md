---
id: FX-DESIGN-309
sprint: 309
f_items: [F541]
req_codes: [FX-REQ-580]
phase: "Phase 44"
status: design
date: "2026-04-18"
---

# Sprint 309 Design — F541 Offering 도메인 분리

## §1 목표

`core/offering` 12 routes / 29 services / 19 schemas를 `packages/fx-offering` 독립 Cloudflare Worker로 분리.
F540 fx-shaping 선례 패턴 그대로 적용.

## §2 현재 상태

- `packages/api/src/core/offering/` — 61개 파일 (routes 12, services 29, schemas 19, index.ts 1)
- `packages/api/src/app.ts` — 12 route mount 존재
- fx-gateway — DISCOVERY + SHAPING binding 있음, OFFERING 없음

## §3 테스트 계약 (TDD Red Target)

### 3.1 Unit Tests (packages/fx-offering/src/__tests__/)

```typescript
// health.test.ts
describe("F541: fx-offering health", () => {
  test("GET /api/offering/health → 200 { domain: 'offering', status: 'ok' }", async () => {
    const res = await app.request("/api/offering/health");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.domain).toBe("offering");
  });
});

// offerings.test.ts
describe("F541: offerings CRUD", () => {
  test("GET /api/offerings requires auth → 401", async () => {
    const res = await app.request("/api/offerings");
    expect(res.status).toBe(401);
  });
});
```

### 3.2 D1 체크리스트 (D1~D4)

| # | 항목 | 검증 |
|---|------|------|
| D1 | 주입 사이트 — 12 routes 전부 fx-offering app.ts에 등록 | grep으로 전수 확인 |
| D2 | 식별자 계약 — offering ID는 `/api/offerings/:id` 패턴 | SSOT는 offerings.ts |
| D3 | app.ts 기존 12 mount 제거 — 소비자 없음 (web → gateway) | grep 확인 |
| D4 | TDD Red 파일 존재 | 커밋 해시 기록 |

## §4 아키텍처 변경

```
Before:
  Browser → fx-gateway → MAIN_API(packages/api) → offering routes

After:
  Browser → fx-gateway → OFFERING(fx-offering) → offering routes
                       → MAIN_API(packages/api) → 나머지 routes
```

## §5 파일 매핑

### A. 신규 생성: packages/fx-offering/

| 파일 | 내용 |
|------|------|
| `package.json` | name="@foundry-x/fx-offering", deps=hono/zod/anthropic-ai/shared |
| `wrangler.toml` | D1 + R2(FILES_BUCKET) + AI + JWT_SECRET |
| `tsconfig.json` | fx-shaping 동일 |
| `vitest.config.ts` | fx-shaping 동일 |
| `eslint.config.js` | fx-shaping 동일 |
| `src/index.ts` | ExportedHandler → app.fetch |
| `src/app.ts` | Hono app + 12 routes |
| `src/env.ts` | OfferingEnv { DB, FILES_BUCKET, AI, JWT_SECRET, ANTHROPIC_API_KEY? } |
| `src/middleware/auth.ts` | JWT auth — PUBLIC_PATHS=["/api/offering/health"] |
| `src/middleware/tenant.ts` | orgId tenant guard |
| `src/routes/offerings.ts` | Env=OfferingEnv 적용 |
| `src/routes/offering-sections.ts` | " |
| `src/routes/offering-export.ts` | " |
| `src/routes/offering-validate.ts` | " |
| `src/routes/offering-metrics.ts` | " |
| `src/routes/offering-prototype.ts` | " |
| `src/routes/content-adapter.ts` | " |
| `src/routes/design-tokens.ts` | " |
| `src/routes/bdp.ts` | " (AI binding 필요) |
| `src/routes/methodology.ts` | " |
| `src/routes/business-plan.ts` | " |
| `src/routes/business-plan-export.ts` | " |
| `src/services/` | 29개 서비스 파일 (OfferingEnv 적용) |
| `src/schemas/` | 19개 스키마 파일 (변경 없음) |
| `src/__tests__/health.test.ts` | TDD Red |
| `src/__tests__/offerings.test.ts` | TDD Red |

### B. 수정: packages/api/src/app.ts

제거 대상 (imports + route mounts):
```typescript
// 제거: import 라인
offeringsRoute, offeringSectionsRoute, offeringExportRoute,
offeringValidateRoute, offeringMetricsRoute, offeringPrototypeRoute,
designTokensRoute, contentAdapterRoute, bdpRoute, methodologyRoute,
businessPlanRoute, businessPlanExportRoute,

// 제거: route mount 라인 (약 12줄)
app.route("/api", methodologyRoute);      // line ~285
app.route("/api", bdpRoute);              // line ~324
app.route("/api", businessPlanRoute);     // line ~326
app.route("/api", businessPlanExportRoute); // line ~328
app.route("/api", offeringsRoute);        // line ~408
app.route("/api", offeringSectionsRoute); // line ~409
app.route("/api", offeringExportRoute);   // line ~412
app.route("/api", offeringValidateRoute); // line ~413
app.route("/api", contentAdapterRoute);   // line ~416
app.route("/api", designTokensRoute);     // line ~418
app.route("/api", offeringPrototypeRoute); // line ~419
app.route("/api", offeringMetricsRoute);  // line ~421
```

### C. 수정: packages/fx-gateway/wrangler.toml

```toml
# F541: Service Binding — Offering Worker
[[services]]
binding = "OFFERING"
service = "fx-offering"

[env.dev]
# ...
[[env.dev.services]]
binding = "OFFERING"
service = "fx-offering-dev"
```

### D. 수정: packages/fx-gateway/src/env.ts

```typescript
OFFERING: Fetcher;  // F541: Offering 도메인 분리
```

### E. 수정: packages/fx-gateway/src/app.ts

> ⚠️ D1 체크리스트: biz-items/:id 정적 경로 먼저 등록 필수

```typescript
// F541: /api/biz-items/:id/business-plan* → OFFERING (biz-items/:id 앞 등록 필수)
app.all("/api/biz-items/:id/business-plan", async (c) => c.env.OFFERING.fetch(c.req.raw));
app.all("/api/biz-items/:id/business-plan/*", async (c) => c.env.OFFERING.fetch(c.req.raw));
// F541: /api/biz-items/:id/methodology* → OFFERING
app.all("/api/biz-items/:id/methodology", async (c) => c.env.OFFERING.fetch(c.req.raw));
app.all("/api/biz-items/:id/methodology/*", async (c) => c.env.OFFERING.fetch(c.req.raw));
// F541: offerings + bdp + methodologies
app.all("/api/offerings/*", async (c) => c.env.OFFERING.fetch(c.req.raw));
app.all("/api/offerings", async (c) => c.env.OFFERING.fetch(c.req.raw));
app.all("/api/bdp/*", async (c) => c.env.OFFERING.fetch(c.req.raw));
app.all("/api/bdp", async (c) => c.env.OFFERING.fetch(c.req.raw));
app.all("/api/methodologies", async (c) => c.env.OFFERING.fetch(c.req.raw));
app.all("/api/methodologies/*", async (c) => c.env.OFFERING.fetch(c.req.raw));
```

### F. 수정: .github/workflows/deploy.yml

```yaml
# msa paths-filter에 추가:
- 'packages/fx-offering/**'

# deploy-msa job에 추가 (fx-shaping 앞):
- name: Deploy fx-offering Worker
  working-directory: packages/fx-offering
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  run: ../api/node_modules/.bin/wrangler deploy
```

### G. 검증: scripts/ax-bd/shape path refs

```bash
grep -rn "\.claude/skills/ax-bd/shape" . --include="*.ts" --include="*.md" \
  | grep -v archive | grep -v ".git"
# 기대: 0건
```

## §6 D1 스키마 이전 계획

offering_* 테이블은 기존 `foundry-x-db`를 그대로 공유 (F540과 동일 패턴).
Phase 44 완료 후 독립 DB 분리 예정 (C56).
신규 migration 파일 불필요.

## §7 cross-domain import 검증 결과 (D 항목)

사전 조사 결과:
- `core/offering/` → `core/shaping/`: **0건** (PASS)
- `core/offering/` → `core/discovery/`: **0건** (PASS)
- `core/shaping/` → `core/offering/`: **0건** (PASS)

cross-domain import 없음 — contract 분리 추가 작업 불필요.

## §8 변경 영향도 (Breaking change)

| 변경 | 소비자 | 영향 |
|------|--------|------|
| app.ts 12 route 제거 | web (브라우저) | gateway가 대신 라우팅 — 투명 |
| gateway OFFERING binding | 없음 | 신규 추가만 |
| fx-offering Worker | 없음 | 신규 생성 |
