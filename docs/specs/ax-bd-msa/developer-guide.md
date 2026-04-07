# AX BD MSA 개발자 가이드

> **대상**: AX BD팀 개발자 (AI Agent 기반 개발)  
> **기준**: Phase 20 AX BD MSA 재조정 완료 시점 (Sprint 188)  
> **harness-kit 버전**: 0.1.0

---

## 개요

Phase 20을 통해 Foundry-X는 **발굴+형상화 전용 서비스**로 한정됐고, 새 서비스(Gate-X, Launch-X 등)를 독립적으로 만들 수 있는 `@foundry-x/harness-kit`이 완성됐어요.

이 가이드는 harness-kit을 사용해 새 Workers 서비스를 만들고, 기존 Foundry-X 모듈과 연동하는 방법을 설명해요.

---

## 1. 새 서비스 생성

### 1.1 harness create 실행

```bash
# gate-x 서비스 생성 (예시)
npx harness create gate-x \
  --service-id gate-x \
  --account-id b6c06059b413892a92f150e5ca496236 \
  --db-name gate-x-db

# 출력:
# Creating service scaffold: gate-x...
# Created 8 files:
#   gate-x/package.json
#   gate-x/tsconfig.json
#   gate-x/vitest.config.ts
#   gate-x/wrangler.toml
#   gate-x/src/index.ts
#   gate-x/src/app.ts
#   gate-x/src/env.ts
```

### 1.2 생성된 파일 구조

```
gate-x/
├── package.json          # @foundry-x/harness-kit 의존성 포함
├── tsconfig.json         # TypeScript strict mode
├── vitest.config.ts      # Vitest 설정
├── wrangler.toml         # Cloudflare Workers 설정
└── src/
    ├── index.ts          # Workers fetch/scheduled 핸들러
    ├── app.ts            # Hono app + harness-kit 미들웨어 스택
    └── env.ts            # Env 인터페이스 (D1, KV, Secrets)
```

### 1.3 wrangler.toml 완성

생성 직후 `<RUN: wrangler d1 create gate-x-db>` 부분을 실제 D1 ID로 교체해야 해요.

```bash
cd gate-x
npx wrangler d1 create gate-x-db
# → database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

그런 다음 `wrangler.toml`에서:

```toml
[[d1_databases]]
binding = "DB"
database_name = "gate-x-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # 위에서 복사
```

### 1.4 Secrets 등록

```bash
# 필수 Secrets
npx wrangler secret put JWT_SECRET      # Foundry-X와 동일한 시크릿 사용 (JWT 호환성)
npx wrangler secret put ANTHROPIC_API_KEY  # AI 기능 사용 시
```

---

## 2. harness-kit 통합 패턴

### 2.1 기본 미들웨어 스택 (app.ts)

```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import {
  createAuthMiddleware,
  createCorsMiddleware,
  errorHandler,
  rbac,
} from "@foundry-x/harness-kit";
import type { HarnessEnv } from "@foundry-x/harness-kit";

const config = {
  serviceName: "gate-x",
  serviceId: "gate-x" as const,
  corsOrigins: ["https://fx.minu.best", "http://localhost:3000"],
  publicPaths: ["/api/health", "/api/openapi.json"],
};

export const app = new OpenAPIHono<{ Bindings: HarnessEnv }>();

// 순서 중요: CORS → Auth → ErrorHandler
app.use("*", createCorsMiddleware(config));
app.use("*", createAuthMiddleware(config));
app.onError(errorHandler);

// 헬스체크 (인증 불필요)
app.get("/api/health", (c) => c.json({ status: "ok", service: "gate-x" }));

// 인증 필요 라우트
app.get("/api/validations", rbac("member"), async (c) => {
  // ...
});
```

### 2.2 JWT 공유 방식

모든 AX BD MSA 서비스는 **동일한 JWT_SECRET**을 사용해요. Foundry-X가 발급한 JWT를 Gate-X, Launch-X 등에서 그대로 검증할 수 있어요.

```
User → Foundry-X /api/auth/login → JWT 발급
         ↓
User → Gate-X /api/validations  → JWT 검증 (createAuthMiddleware)
         ↓
User → Launch-X /api/products   → JWT 검증 (createAuthMiddleware)
```

JWT Payload에서 사용자 정보 접근:

```typescript
app.get("/api/resource", rbac("member"), (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload;
  const userId = jwt.sub;
  const userRole = jwt.role;
  const orgId = jwt.orgId;
  return c.json({ userId, userRole });
});
```

---

## 3. 서비스 간 통신

### 3.1 REST API 호출 (동기 통신)

```typescript
// gate-x에서 foundry-x API 호출
const FOUNDRY_X_URL = "https://foundry-x-api.ktds-axbd.workers.dev";

async function getOpportunity(id: string, token: string) {
  const res = await fetch(`${FOUNDRY_X_URL}/api/opportunities/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}
```

### 3.2 D1EventBus (비동기 이벤트)

서비스 간 느슨한 결합이 필요할 때 이벤트 기반 통신을 사용해요.

```typescript
import { D1EventBus, createEvent } from "@foundry-x/harness-kit/events";

// 이벤트 발행 (gate-x)
app.post("/api/validations", rbac("member"), async (c) => {
  const body = await c.req.json();
  const bus = new D1EventBus(c.env.DB);

  // 검증 생성 이벤트 발행
  await bus.publish(
    createEvent("gate.validation.created", "gate-x", {
      validationId: body.id,
      opportunityId: body.opportunityId,
    })
  );

  return c.json({ ok: true });
});
```

```typescript
// 이벤트 구독 (Cron Trigger에서 폴링, src/index.ts)
export default {
  async scheduled(_: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const bus = new D1EventBus(env.DB);
    bus.subscribe("discovery.opportunity.created", async (event) => {
      // gate-x 로직 처리
      console.log("Processing:", event.payload);
    });
    ctx.waitUntil(bus.poll("gate-x", 100));
  },
};
```

---

## 4. 로컬 개발

### 4.1 wrangler dev

```bash
cd gate-x
pnpm dev        # wrangler dev (http://localhost:8787)
```

환경 변수는 `.dev.vars` 파일에:

```bash
# gate-x/.dev.vars (git에 포함하지 말 것)
JWT_SECRET=dev-secret-change-in-production
```

### 4.2 로컬 D1 초기화

```bash
# 마이그레이션 생성
npx wrangler d1 execute gate-x-db --local --command "
  CREATE TABLE IF NOT EXISTS validations (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending'
  );
"

# 또는 SQL 파일 실행
npx wrangler d1 execute gate-x-db --local --file ./migrations/0001_init.sql
```

### 4.3 테스트

```bash
pnpm test              # vitest run (유닛 + 통합)
pnpm test -- --watch   # watch 모드
```

---

## 5. 배포

### 5.1 CI/CD 자동 배포 (권장)

GitHub Actions를 사용해요. `.github/workflows/deploy.yml` 패턴:

```yaml
name: Deploy
on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - name: D1 Migrations
        run: npx wrangler d1 migrations apply gate-x-db --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
      - name: Deploy Workers
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
```

### 5.2 수동 배포

```bash
# D1 마이그레이션 (필수 선행)
npx wrangler d1 migrations apply gate-x-db --remote

# Workers 배포
npx wrangler deploy
```

### 5.3 Smoke Test

새 서비스용 smoke test 스크립트:

```bash
#!/usr/bin/env bash
API_URL="${API_URL:-https://gate-x.ktds-axbd.workers.dev}"
curl -sf "$API_URL/api/health" | grep '"status":"ok"' && echo "✅ Health OK"
```

---

## 6. ESLint 설정 (서비스 경계 보호)

```javascript
// gate-x/eslint.config.mjs
import { harnessKitPlugin } from "@foundry-x/harness-kit/eslint";

export default [
  {
    plugins: { "harness-kit": harnessKitPlugin },
    rules: {
      "harness-kit/no-cross-service-import": "error",
    },
    settings: {
      "harness-kit": {
        currentService: "gate-x",
      },
    },
  },
];
```

이 규칙이 활성화되면 gate-x 코드에서 `foundry-x` 서비스의 모듈을 직접 import할 수 없어요. 서비스 간 통신은 반드시 REST API 또는 EventBus를 통해야 해요.

---

## 7. 디렉토리 규칙

```
packages/
├── harness-kit/     # 공통 기반 패키지 (@foundry-x/harness-kit)
├── cli/             # Foundry-X CLI
├── api/             # Foundry-X API Workers (발굴+형상화)
├── web/             # Foundry-X Web (대시보드)
└── shared/          # 공유 타입

# 향후 추가될 서비스 (Phase 21+)
gate-x/              # 모노리포 외부 독립 리포 또는 monorepo 내 패키지
launch-x/
eval-x/
```

---

## 참고 자료

| 문서 | 위치 |
|------|------|
| PRD (Phase 20) | `docs/specs/ax-bd-msa/prd-final.md` |
| 서비스 매핑 | `docs/specs/ax-bd-msa/service-mapping.md` |
| D1 Ownership | `docs/specs/ax-bd-msa/d1-ownership.md` |
| ADR-001 (D1 전략) | `docs/specs/ax-bd-msa/adr-001-d1-shared-db.md` |
| 마이그레이션 가이드 | `docs/specs/ax-bd-msa/migration-guide.md` |
| harness-kit API | `packages/harness-kit/README.md` |
