---
id: FX-PLAN-319
title: Sprint 319 — F572 fx-modules Worker + F574 wiki-sync bug fix
sprint: 319
features: [F572, F574]
status: in_progress
created: 2026-04-24
---

# Sprint 319 Plan

## F572: fx-modules 단일 Worker 분리 (Phase 45 Batch 5)

### 목표
portal(19 routes/23 services) + gate(7 routes/8 services) + launch(8 routes/14 services)
을 `packages/fx-modules/` 단일 Worker로 이관.

### 핵심 결정 (S313)
- 단일 Worker `fx-modules` (3 Worker 분리 않음)
- prefix 라우팅: `/api/portal/*`, `/api/gate/*`, `/api/launch/*`
- harness-kit JWT middleware 재사용 (F569 패턴)
- 기존 `packages/api/src/modules/portal|gate|launch` → `packages/fx-modules/src/core/portal|gate|launch`

### 구현 순서
1. TDD Red: fx-modules health endpoint 테스트 + cross-domain import guard
2. packages/fx-modules/ 패키지 생성 (wrangler.toml, package.json, tsconfig.json)
3. 인프라 파일 생성: env.ts, middleware/, db/, schemas/
4. core/portal|gate|launch 이동 (상대 import 경로 동일 → 수정 불필요)
5. app.ts: 3개 sub-app mount (/api/portal, /api/gate, /api/launch)
6. fx-gateway: MODULES Service Binding + 3 prefix catch-all 추가
7. packages/api/src/app.ts: portal/gate/launch route 등록 ~12줄 제거
8. cross-domain grep 0건 확증

### Gateway 변경
```typescript
// 추가
app.all("/api/portal/*", (c) => c.env.MODULES.fetch(c.req.raw));
app.all("/api/gate/*", (c) => c.env.MODULES.fetch(c.req.raw));
app.all("/api/launch/*", (c) => c.env.MODULES.fetch(c.req.raw));
```

### Phase Exit P1~P4
- P1: fx-modules /api/portal/health → 200
- P2: /api/gate/health, /api/launch/health → 200
- P3: cross-domain grep 0건
- P4: dogfood 회고

---

## F574: wiki-sync webhook 2종 버그 fix

### 근본 원인 2종 (C87 → F574)
- (A) `wiki_pages.slug` UNIQUE 제약 부재 → ON CONFLICT(slug) SQLite reject
- (B) `DEFAULT_PROJECT_ID = "default"` 하드코딩 ≠ 실측 FK `proj_default`

### 구현 순서
1. TDD Red: webhook redelivery + proj_default FK 시나리오
2. D1 migration `0139_wiki_slug_unique.sql`
3. schema.ts: wikiPages.slug `.unique()` 추가
4. wiki.ts: `DEFAULT_PROJECT_ID = "proj_default"`
5. wiki-sync.ts: `'default'` → `'proj_default'`
6. TDD Green: 모든 테스트 PASS

### Phase Exit Reality
- POST /api/wiki 경로 sync PASS
- webhook 경로 sync PASS (ON CONFLICT DO UPDATE 정상 작동)
