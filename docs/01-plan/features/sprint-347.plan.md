---
id: FX-PLAN-347
sprint: 347
feature: F613
req: FX-REQ-677
status: approved
date: 2026-05-05
depends_on: F608/F609/F610/F611/F612 (Pass 1~5 모두 MERGED)
---

# Sprint 347 Plan — F613: MSA 룰 강제 교정 Pass 6 — `/api/docs` sub-app 신설 (Pass 시리즈 종결)

## 목표

**F608~F612 MERGED 후속, Pass 시리즈 final fix.** 잔존 `no-direct-route-register` 1건(`src/app.ts:129`)을 `core/docs/` sub-app 신설로 해소. baseline 1 → 0 도달, MSA 룰 강제 교정 시리즈 완전 종결.

**핵심 원칙**:
- 사용자 명시 옵션 A 채택 (S333) — sub-app 정식 mount 경로
- swaggerUI 라우트는 `/api/docs` GET 1건뿐이라 sub-app 구조 단순
- 룰 강제 100% 준수 + 향후 docs 라우트 확장 여지 (예: 별 OpenAPI 버전 다중 지원)

## 사전 측정 (S333, F612 MERGED 후 baseline 1 실측)

### 잔존 1건 (Pass 시리즈 final)

| baseline 라인 | 위반 룰 | 위반 코드 |
|--------------|---------|----------|
| `src/app.ts:129` | `foundry-x-api/no-direct-route-register` | `app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));` |

### Mount 패턴 비교

```typescript
// Before (직접 등록 — 룰 위반)
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

// After (sub-app mount — 룰 준수)
import { docsApp } from "./core/docs/routes/index.js";
app.route("/api/docs", docsApp);
```

## 인터뷰 패턴 (S333, 32회차 종결)

| # | 질문 | 답변 |
|---|------|------|
| 1 | F613 fix 옵션 | **옵션 A 채택** — `core/docs/` sub-app 신설 (룰 정확 준수 + 확장 여지) |

## 범위

### (a) `core/docs/` 디렉토리 신설

```
packages/api/src/core/docs/
└── routes/
    └── index.ts        # docsApp Hono sub-app
```

### (b) `core/docs/routes/index.ts` 작성

```typescript
import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import type { Env } from "../../../env.js";

export const docsApp = new Hono<{ Bindings: Env }>();
docsApp.get("/", swaggerUI({ url: "/api/openapi.json" }));
```

(sub-app 경로 `/api/docs` mount 시 GET `/`가 `/api/docs`로 매핑됨)

### (c) `app.ts` 변경

- L2: 기존 `import { swaggerUI } from "@hono/swagger-ui"` 제거 (sub-app 안으로 이전)
- L129: `app.get("/api/docs", ...)` → `app.route("/api/docs", docsApp)` 변경
- 신규 import: `import { docsApp } from "./core/docs/routes/index.js"`

### (d) baseline JSON 갱신

`.eslint-baseline.json` fingerprint `src/app.ts:129:foundry-x-api/no-direct-route-register` 제거. 카운트 1 → 0.

### (e) typecheck + tests GREEN

신규 sub-app 생성 + import 정리만이라 회귀 위험 최소.

### (f) `/api/docs` 동작 검증

prod URL `https://fx-gateway.ktds-axbd.workers.dev/api/docs` 접근 시 swagger UI 정상 표시 확인.

## Phase Exit P-a~P-i (Pass 시리즈 종결 검증)

- **P-a**: `core/docs/routes/index.ts` 신설 + `docsApp` export
- **P-b**: `app.ts` direct route register 0건 (`app.get("/api/...")` 패턴 0)
- **P-c**: `app.ts` `app.route("/api/docs", docsApp)` 1건 추가
- **P-d**: baseline 1 → 0 정확 (Pass 시리즈 종결)
- **P-e**: baseline check exit 0
- **P-f**: typecheck + tests 회귀 0건
- **P-g**: dual_ai_reviews sprint 347 ≥ 1건 (hook 22 sprint 연속)
- **P-h**: F608~F612 회귀 0
- **P-i**: Match ≥ 90%
- **P-j (final)**: `pnpm lint` 직접 실행 시 errors 0 + warnings 0 (Pass 시리즈 100% 종결 증명)

## 전제

- F608~F612 ✅ MERGED
- C103+C104 ✅
- baseline JSON에 마지막 1건만 남음

## Out-of-scope

- 도메인 owner contract 정제 (F614+, 단순 re-export 인플레이션 정제)
- pane border 메커니즘 개선 (별 트랙)
- Pass 시리즈 외 영역 (별 F-item)

## 예상 가동 시간

autopilot ~10분. 신설 디렉토리 1개 + 신설 파일 1개 + app.ts 3줄 변경 = 가장 작은 sprint. F593 본 sprint 최단 기록(3분 42초) 갱신 가능성.

## 후속 사이클

**F608~F613 = Pass 시리즈 6연속 MERGED 완결** — baseline 0 도달. 다음 사이클 후보:

- F614+ (도메인 owner contract 정제)
- AI Foundry W19 BeSir D-day (2026-05-15)
- Phase 47 GAP-3 27 stale proposals
- 모델 A/B Opus 4.7 vs Sonnet 4.6
