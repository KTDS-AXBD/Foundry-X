---
id: FX-DSGN-347
sprint: 347
feature: F613
req: FX-REQ-677
status: approved
date: 2026-05-05
---

# Sprint 347 Design — F613: MSA 룰 강제 교정 Pass 6 — `/api/docs` sub-app 신설 (Pass 시리즈 종결)

## §1 목표

baseline 1 → 0 달성. `no-direct-route-register` 1건(`src/app.ts:129`) 해소.
`core/docs/` sub-app 신설 → `app.route("/api/docs", docsApp)` mount 패턴 적용.
Pass 시리즈(F608~F613) 완전 종결.

## §2 접근 방식

기존 `app.get("/api/docs", swaggerUI(...))` 직접 등록을 sub-app으로 추출.
- `core/docs/routes/index.ts`에 `docsApp` Hono 인스턴스 생성
- `docsApp.get("/", swaggerUI({ url: "/api/openapi.json" }))` — sub-app 마운트 후 `/api/docs/` → `/` 매핑
- `app.ts`에서 `app.route("/api/docs", docsApp)` 1줄로 대체

## §3 변경 파일 매핑

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/core/docs/routes/index.ts` | 신규 — `docsApp` sub-app |
| `packages/api/src/app.ts` | 3줄 변경: import 제거 + import 추가 + route 교체 |
| `packages/api/.eslint-baseline.json` | fingerprint 1건 제거, msa_total/errors 1→0 |

## §4 상세 구현

### 4a. `core/docs/routes/index.ts` (신규)

```typescript
import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import type { Env } from "../../../env.js";

export const docsApp = new Hono<{ Bindings: Env }>();
docsApp.get("/", swaggerUI({ url: "/api/openapi.json" }));
```

### 4b. `app.ts` 변경 (3줄)

- L2 제거: `import { swaggerUI } from "@hono/swagger-ui";`
- 신규 import 추가: `import { docsApp } from "./core/docs/routes/index.js";`
- L129 교체: `app.get("/api/docs", swaggerUI(...))` → `app.route("/api/docs", docsApp)`

### 4c. baseline JSON 갱신

```json
{
  "version": "1.0",
  "generated_at": "<현재 시각>",
  "description": "F613 Pass 시리즈 종결 baseline — violations 0, MSA 룰 강제 교정 완결.",
  "msa_total": 0,
  "msa_errors": 0,
  "msa_warnings": 0,
  "fingerprints": []
}
```

## §5 TDD

면제 대상: 단순 라우트 re-export + swaggerUI 핸들러. 회귀 위험 최소 (UI-only).
기존 typecheck + lint baseline check가 정확성 보증.

## §6 검증 기준 (P-a ~ P-j)

| # | 항목 | 검증 |
|---|------|------|
| P-a | `core/docs/routes/index.ts` 신설 + `docsApp` export | `ls` 확인 |
| P-b | `app.ts` `app.get("/api/docs", ...)` 0건 | grep 확인 |
| P-c | `app.ts` `app.route("/api/docs", docsApp)` 1건 | grep 확인 |
| P-d | baseline fingerprints 1 → 0 | JSON 확인 |
| P-e | `pnpm lint` exit 0 | 직접 실행 |
| P-f | typecheck PASS | turbo typecheck |
| P-g | dual_ai_reviews hook 정상 | codex-review.sh |
| P-h | F608~F612 회귀 0 | baseline check |
| P-i | Match ≥ 90% | Gap Analysis |
| P-j | `pnpm lint` errors 0 + warnings 0 (Pass 시리즈 100% 종결) | 직접 실행 |
