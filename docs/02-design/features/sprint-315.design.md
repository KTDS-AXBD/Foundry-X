---
id: FX-DESIGN-315
sprint: 315
f_items: [F564, F569]
status: active
created: 2026-04-22
---

# Sprint 315 Design — F564 + F569

## 1. 개요

Phase 45 Batch 1: Strangler 완결(MVP M3) + harness-kit 표준화

## 2. F564 — Strangler 완결 설계

### 2.1 FoundryXConfig.apiUrl 추가 (a)

**파일**: `packages/shared/src/types.ts`

```typescript
// 변경 전
export interface FoundryXConfig {
  version: string;
  // ...
  git: { provider: 'github' | 'gitlab'; remote?: string };
}

// 변경 후
export interface FoundryXConfig {
  version: string;
  // ...
  apiUrl: string;  // 신규: fx-gateway 단일 진입점 URL (default: https://fx-gateway.ktds-axbd.workers.dev)
  git: { provider: 'github' | 'gitlab'; remote?: string };
}
```

**파일**: `packages/cli/src/services/config-manager.ts`

```typescript
// init() 내 config 객체에 apiUrl 추가
const config: FoundryXConfig = {
  version: '0.1.0',
  initialized: new Date().toISOString(),
  template,
  mode,
  repoProfile,
  apiUrl: 'https://fx-gateway.ktds-axbd.workers.dev',  // 신규
  plumb: { ... },
  git: { ... },
};
```

### 2.2 _redirects 수정 (b)

**파일**: `packages/web/public/_redirects`

```
# 변경 전
/api/*  https://foundry-x-api.ktds-axbd.workers.dev/api/:splat  200

# 변경 후
/api/*  https://fx-gateway.ktds-axbd.workers.dev/api/:splat  200
```

**근거**: VITE_API_URL=fx-gateway가 production env에서 설정되더라도, _redirects는 CDN 레벨 폴백 경로로 작동함. foundry-x-api 직결을 완전히 제거하여 Strangler 완결.

**grep 0건 확증 대상** (변경 후):
- `packages/web/public/_redirects` → fx-gateway로 변경됨
- `packages/web/.env.production` → 주석(rollback comment)만 남음 (코드 아님)
- `packages/api/wrangler.toml` → 서비스 이름 정의 (직결 URL 아님, 제외)
- `packages/api/eslint.config.js` → ESLint plugin 이름 (제외)
- `packages/fx-gateway/wrangler.toml` → service binding 이름 (제외)
- `packages/fx-shaping/src/agent/services/openrouter-runner.ts:52` → HTTP-Referer 헤더 (도메인 이름일 뿐, API 직결 아님, 제외)
- `packages/api/src/core/agent/services/openrouter-runner.ts:51` → 동일 이유 제외
- `packages/api/src/app.ts:107` → 서비스 이름 리터럴 (제외)

**확증 명령**:
```bash
grep -rn "foundry-x-api.ktds-axbd.workers.dev" packages/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules\|dist/" \
  | grep -v "HTTP-Referer\|service.*=.*\"foundry-x-api\"" \
  | grep -v "eslint\|wrangler.toml\|\.env"
# → 0건 기대
```

### 2.3 SSO Hub Token E2E (c)

**파일**: `packages/web/e2e/strangler-gateway.spec.ts` (신규)

시나리오:
1. `GET /api/discovery/health` via fx-gateway → 200 OK
2. `GET /api/shaping/health` via fx-gateway → 200 OK
3. `GET /api/offering/health` via fx-gateway → 200 OK

E2E 환경: `page.route()` mock으로 gateway response 검증

### 2.4 ENV 마이그레이션 문서 (d)

**파일**: `docs/guides/api-url-migration.md` (신규)

## 3. F569 — harness-kit 표준화 설계

### 3.1 Worker 미들웨어 적용 계획 (b)

3개 Worker에서 동일하게 중복된 `middleware/auth.ts` → harness-kit `createAuthMiddleware`로 교체

#### fx-discovery 변경

**파일**: `packages/fx-discovery/src/middleware/auth.ts`

```typescript
// 변경 전: 자체 구현
import { jwt } from "hono/jwt";

// 변경 후: harness-kit 위임
import { createAuthMiddleware } from "@foundry-x/harness-kit";

export const authMiddleware = createAuthMiddleware({
  serviceName: "fx-discovery",
  serviceId: "discovery-x",
  corsOrigins: [],
  publicPaths: ["/api/discovery/health"],
});
```

**파일**: `packages/fx-discovery/package.json`
- `@foundry-x/harness-kit: "workspace:*"` 추가

#### fx-shaping 변경

**파일**: `packages/fx-shaping/src/middleware/auth.ts`

```typescript
import { createAuthMiddleware } from "@foundry-x/harness-kit";

export const authMiddleware = createAuthMiddleware({
  serviceName: "fx-shaping",
  serviceId: "foundry-x",
  corsOrigins: [],
  publicPaths: ["/api/shaping/health", "/api/ax-bd/health"],
});
```

**파일**: `packages/fx-shaping/package.json` — harness-kit dep 추가

#### fx-offering 변경

**파일**: `packages/fx-offering/src/middleware/auth.ts`

```typescript
import { createAuthMiddleware } from "@foundry-x/harness-kit";

export const authMiddleware = createAuthMiddleware({
  serviceName: "fx-offering",
  serviceId: "foundry-x",
  corsOrigins: [],
  publicPaths: ["/api/offering/health"],
});
```

**파일**: `packages/fx-offering/package.json` — harness-kit dep 추가

### 3.2 버전관리 전략 (c)

`workspace:*` internal 전략 확정:
- 이유: Workers간 동일 monorepo → npm publish 불필요, Cloudflare Workers Service Binding으로 배포
- harness-kit README에 "internal only, not published to npm" 명시
- `packages/harness-kit/package.json` `private: true` 확인 또는 추가

### 3.3 new-worker.sh (d)

**파일**: `scripts/new-worker.sh` (신규)

```bash
#!/usr/bin/env bash
# Usage: bash scripts/new-worker.sh <name> <service-id>
# Example: bash scripts/new-worker.sh fx-agent foundry-x
```

기능:
1. `packages/harness-kit/src/scaffold/generator.ts`의 `generateScaffold()` 호출
2. `packages/` 하위에 Worker 디렉토리 생성
3. pnpm-workspace.yaml에 패키지 추가 안내 출력

## 4. TDD 계약 (Red 타겟)

### F564 Red Tests

**파일**: `packages/cli/src/services/config-manager.test.ts` (기존 파일에 추가)

```typescript
describe('ConfigManager.init — F564', () => {
  it('should include apiUrl defaulting to fx-gateway', async () => {
    const mgr = new ConfigManager(tmpDir);
    const config = await mgr.init('monorepo', 'web-only', 'default');
    expect(config.apiUrl).toBe('https://fx-gateway.ktds-axbd.workers.dev');
  });

  it('should persist apiUrl on write/read roundtrip', async () => {
    const mgr = new ConfigManager(tmpDir);
    await mgr.init('monorepo', 'web-only', 'default');
    const read = await mgr.read();
    expect(read?.apiUrl).toBe('https://fx-gateway.ktds-axbd.workers.dev');
  });
});
```

### F569 Red Tests

**파일**: `packages/harness-kit/__tests__/middleware/jwt.test.ts` (기존에 Worker 적용 케이스 추가)

```typescript
describe('createAuthMiddleware — worker public path config', () => {
  it('discovery health is public', async () => {
    const app = createApp({ publicPaths: ['/api/discovery/health'] });
    const res = await app.request('/api/discovery/health', undefined, { JWT_SECRET: SECRET });
    expect(res.status).toBe(200);
  });
});
```

## 5. 파일 매핑 (D1 체크리스트)

| 파일 | 변경 | F-item |
|------|------|--------|
| `packages/shared/src/types.ts` | `apiUrl` 필드 추가 | F564(a) |
| `packages/cli/src/services/config-manager.ts` | `init()`에 `apiUrl` 포함 | F564(a) |
| `packages/cli/src/services/config-manager.test.ts` | apiUrl TDD Red 테스트 | F564(a) |
| `packages/web/public/_redirects` | foundry-x-api → fx-gateway | F564(b) |
| `packages/web/e2e/strangler-gateway.spec.ts` | SSO Hub Token E2E | F564(c) |
| `docs/guides/api-url-migration.md` | 환경변수 마이그레이션 가이드 | F564(d) |
| `packages/fx-discovery/src/middleware/auth.ts` | harness-kit 적용 | F569(b-1) |
| `packages/fx-discovery/package.json` | harness-kit dep 추가 | F569(b-1) |
| `packages/fx-shaping/src/middleware/auth.ts` | harness-kit 적용 | F569(b-2) |
| `packages/fx-shaping/package.json` | harness-kit dep 추가 | F569(b-2) |
| `packages/fx-offering/src/middleware/auth.ts` | harness-kit 적용 | F569(b-3) |
| `packages/fx-offering/package.json` | harness-kit dep 추가 | F569(b-3) |
| `packages/harness-kit/package.json` | `private: true` 확인/추가 | F569(c) |
| `scripts/new-worker.sh` | scaffold 생성 스크립트 | F569(d) |
| `packages/harness-kit/__tests__/middleware/jwt.test.ts` | Worker 적용 TDD Red | F569(b) |

## 6. Breaking Change 영향도 (D3)

### FoundryXConfig.apiUrl 추가

- **생산자**: `config-manager.ts` `init()` — 항상 `https://fx-gateway.ktds-axbd.workers.dev` 기본값
- **소비자**: 현재 없음 (forward-looking 필드)
- **타입 소비자**: `packages/cli/src/commands/init.ts`, `packages/cli/src/commands/status.ts` — 읽기만 하므로 영향 없음
- **마이그레이션**: 기존 `.foundry-x/config.json`에 apiUrl 없으면 런타임에서 `undefined` → read() 시 null-safe하게 처리 필요

### _redirects 변경

- **영향**: Production Pages CDN 폴백 경로 변경
- **롤백**: git revert 1줄로 즉시 복구 가능
- **사전 확인**: fx-gateway가 `/api/discovery/*`, `/api/shaping/*`, `/api/offerings/*` 모두 처리 중임을 확인 (기존 F539b, F540, F541에서 완료)

### auth.ts 교체 (3 Worker)

- **생산자**: harness-kit `createAuthMiddleware`
- **소비자**: 각 Worker의 `app.ts` — `authMiddleware` import 경로는 `./middleware/auth.js`로 동일 (변경 없음)
- **동작 일치**: harness-kit JWT 미들웨어가 각 Worker의 기존 `jwt(secret)` 패턴과 동일하게 동작
- **publicPaths 매핑**: 도메인별 `/api/{domain}/health` → HarnessConfig.publicPaths로 명시적 전달

## 7. Out-of-scope (명시)

- F569 (e)(f)(g): CI turbo 경유 전환 + Remote cache — C94 PR #670 2주 관찰 후 Sprint 317
- fx-gateway CORS → harness-kit 전환 — 기존 inline cors() 코드 정상 동작 중, 별도 scope
- tenant.ts 교체 — 도메인 고유 로직, scope out
