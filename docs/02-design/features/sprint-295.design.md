---
id: FX-DESIGN-sprint-295
feature: F539b — fx-gateway 프로덕션 배포 + URL 전환 + 롤백
sprint: 295
date: 2026-04-15
status: active
req: FX-REQ-577
---

# Sprint 295 Design — F539b

## §1 개요

fx-gateway Worker를 프로덕션 API URL로 승격한다. 핵심 변경 2가지:
1. **CORS 미들웨어** 추가 — 브라우저가 fx-gateway를 직접 호출하므로 필수
2. **VITE_API_URL 전환** — `foundry-x-api.ktds-axbd.workers.dev` → `fx-gateway.ktds-axbd.workers.dev`

## §2 아키텍처 변화

### Before
```
Browser → foundry-x-api.ktds-axbd.workers.dev (packages/api)
                       ↓ (동일 Worker)
                  D1 DB + 모든 도메인
```

### After
```
Browser → fx-gateway.ktds-axbd.workers.dev
              ├─ /api/discovery/* → [Service Binding] → fx-discovery
              ├─ /api/ax-bd/discovery-report* → [Service Binding] → fx-discovery
              └─ /api/* (나머지) → [Service Binding] → foundry-x-api (MAIN_API)
```

## §3 CORS 설계

fx-gateway는 브라우저의 첫 번째 접점이므로 CORS 응답을 담당해야 한다.
MAIN_API와 fx-discovery는 Service Binding을 통해 접근되므로 CORS 응답 불필요.

```typescript
// packages/fx-gateway/src/app.ts 상단에 추가
import { cors } from "hono/cors";

app.use("*", cors({
  origin: ["https://fx.minu.best", "https://foundry-x-web.pages.dev", "http://localhost:3000"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
}));
```

**packages/api CORS와 동일한 설정** — 전환 전후 동작 일관성 유지.

## §4 인증 헤더 전달

현재 구현 (`c.env.MAIN_API.fetch(c.req.raw)`)이 이미 raw Request를 그대로 전달하므로
Authorization 헤더는 자동으로 포함된다. 추가 코드 불필요.

**검증**: 기존 테스트 `gateway.test.ts`에 Authorization 헤더 전달 테스트 추가.

## §5 파일 매핑 (Stage 3 Exit D1)

### 신규/수정 파일

| 파일 | 변경 | 이유 |
|------|------|------|
| `packages/fx-gateway/src/app.ts` | CORS 미들웨어 추가 | 브라우저 직접 접점 |
| `packages/fx-gateway/src/__tests__/gateway.test.ts` | CORS + Auth 헤더 전달 테스트 추가 | TDD Red→Green |
| `packages/web/.env.production` | VITE_API_URL 값 변경 | URL 전환 |
| `packages/web/.env.example` | VITE_API_URL 값 변경 | URL 전환 |
| `docs/04-report/phase-44-f539b-rollback-drill.md` | 신규 생성 | 롤백 절차 + 리허설 기록 |

### 영향 없는 파일 (변경 불필요)

| 파일 | 이유 |
|------|------|
| `packages/fx-gateway/src/env.ts` | 바인딩 구조 변경 없음 |
| `packages/fx-gateway/wrangler.toml` | 이미 account_id + Service Binding 설정 완료 |
| `.github/workflows/deploy.yml` | 이미 fx-gateway 경로 필터 + wrangler 상대경로 설정됨 |
| `packages/api/src/app.ts` | foundry-x-api는 계속 유지 (MAIN_API Service Binding) |

## §6 테스트 계약 (TDD Red Target)

### 신규 테스트 — Red Phase

```typescript
// packages/fx-gateway/src/__tests__/gateway.test.ts 추가

describe("F539b: Gateway CORS 미들웨어", () => {
  it("OPTIONS 요청에 CORS 헤더를 반환한다", async () => {
    const res = await app.request("/api/discovery/health", {
      method: "OPTIONS",
      headers: { "Origin": "https://fx.minu.best" },
    }, env);
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });

  it("GET 요청에도 CORS 헤더가 포함된다", async () => {
    const discovery = makeDiscoveryMock();
    const mainApi = makeMainApiMock();
    const env: GatewayEnv = { MAIN_API: mainApi, DISCOVERY: discovery };
    const res = await app.request("/api/discovery/health", {
      headers: { "Origin": "https://fx.minu.best" },
    }, env);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://fx.minu.best");
  });

  it("Authorization 헤더가 MAIN_API로 전달된다", async () => {
    const discovery = makeDiscoveryMock();
    const mainApi = makeMainApiMock();
    const env: GatewayEnv = { MAIN_API: mainApi, DISCOVERY: discovery };
    await app.request("/api/health", {
      headers: { "Authorization": "Bearer test-token" },
    }, env);
    const calledReq = (mainApi.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as Request;
    expect(calledReq.headers.get("authorization")).toBe("Bearer test-token");
  });
});
```

## §7 VITE_API_URL 전환 상세

```
# 변경 전
VITE_API_URL=https://foundry-x-api.ktds-axbd.workers.dev/api

# 변경 후
VITE_API_URL=https://fx-gateway.ktds-axbd.workers.dev/api
```

변경 대상 파일:
- `packages/web/.env.production`
- `packages/web/.env.example`

CF Pages 환경 변수 (수동):
- Cloudflare Dashboard → Pages → foundry-x-web → Settings → Environment variables
- `VITE_API_URL` = `https://fx-gateway.ktds-axbd.workers.dev/api`
- 저장 후 재빌드 트리거 (또는 next git push로 자동 반영)

## §8 롤백 절차 (Design)

```
롤백 조건: Smoke Reality 실패 또는 사용자 이슈 발생 시

Step 1: packages/web/.env.production 원복
  VITE_API_URL=https://foundry-x-api.ktds-axbd.workers.dev/api

Step 2: CF Pages 환경 변수 원복 (Dashboard)
  VITE_API_URL → foundry-x-api.ktds-axbd.workers.dev/api

Step 3: git push → deploy.yml 자동 빌드+배포 (~2분)
  또는 CF Pages Dashboard → "Create new deployment" 수동 트리거

Step 4: curl 확인
  curl https://fx.minu.best/api/health → 200 (packages/api 직접)
```

## §9 D1~D3 체크리스트 (Stage 3 Exit)

| # | 항목 | 판정 |
|---|------|------|
| D1 | 주입 사이트 전수 — CORS 미들웨어는 `app.ts` 1개 파일에만 추가. `grep -rn "cors" packages/fx-gateway/src/` = 1개 파일 | ✅ 단일 주입 사이트 |
| D2 | 식별자 계약 — VITE_API_URL은 단순 환경변수, 포맷 변경 없음 (`https://*/api`). URL 구조 동일 | ✅ 계약 변경 없음 |
| D3 | Breaking change — CORS 추가는 신규 헤더 응답, 소비자에 영향 없음. VITE_API_URL 변경은 Web 전용 | ✅ 영향 없음 |
| D4 | TDD Red 파일 — gateway.test.ts CORS/Auth 테스트 3개 추가 (FAIL 상태로 커밋) | ⬜ Red 커밋 후 기록 |
