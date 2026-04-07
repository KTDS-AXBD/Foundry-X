# @foundry-x/harness-kit

AX BD MSA 서비스 그룹의 공통 기반 패키지. 새 Cloudflare Workers 서비스를 **1분 내** 생성하고, 인증/CORS/이벤트/ESLint를 일관되게 설정해요.

## Quick Start

### 1. 새 서비스 생성

```bash
npx harness create gate-x --service-id gate-x --account-id <CF_ACCOUNT_ID>
cd gate-x
pnpm install
```

### 2. app.ts에 harness-kit 통합

```typescript
import { Hono } from "hono";
import {
  createAuthMiddleware,
  createCorsMiddleware,
  errorHandler,
  rbac,
} from "@foundry-x/harness-kit";

const config = {
  serviceName: "gate-x",
  serviceId: "gate-x" as const,
  corsOrigins: ["https://fx.minu.best"],
  publicPaths: ["/api/auth/", "/api/openapi.json"],
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", createCorsMiddleware(config));
app.use("*", createAuthMiddleware(config));
app.use("*", errorHandler());

// 관리자 전용 라우트
app.get("/api/admin", rbac("admin"), (c) => c.json({ ok: true }));

export default app;
```

### 3. 실행

```bash
pnpm dev    # wrangler dev (로컬)
pnpm test   # vitest
```

---

## CLI

### `harness create <name>`

새 서비스 scaffold를 생성해요.

```bash
harness create <name> [options]

Options:
  --service-id <id>    서비스 ID (기본: foundry-x)
  --account-id <id>    Cloudflare Account ID
  --db-name <name>     D1 Database 이름 (기본: <name>-db)
  -o, --output <dir>   출력 디렉토리 (기본: ./<name>)
```

**유효한 service-id:**
| ID | 서비스 |
|----|--------|
| `foundry-x` | Foundry-X (발굴+형상화) |
| `gate-x` | Gate-X (검증) |
| `launch-x` | Launch-X (제품화+GTM) |
| `eval-x` | Eval-X (평가) |
| `discovery-x` | Discovery-X (수집) |
| `ai-foundry` | AI Foundry (AI 에이전트) |

**생성 파일:**
```
<name>/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── wrangler.toml
└── src/
    ├── index.ts      # Workers entry
    ├── app.ts        # Hono app + harness-kit 설정
    └── env.ts        # 환경 타입 정의
```

---

## API Reference

### Middleware

#### `createAuthMiddleware(config)`

JWT 검증 미들웨어. `publicPaths`에 등록된 경로는 건너뛰어요.

```typescript
import { createAuthMiddleware } from "@foundry-x/harness-kit";

app.use("*", createAuthMiddleware({
  serviceName: "gate-x",
  serviceId: "gate-x",
  corsOrigins: ["https://fx.minu.best"],
  publicPaths: ["/api/auth/", "/api/openapi.json"],
  jwtAlgorithm: "HS256",  // 기본값
}));
```

JWT Payload 타입:
```typescript
interface JwtPayload {
  sub: string;
  email: string;
  role: "admin" | "member" | "viewer";
  orgId?: string;
  orgRole?: "owner" | "admin" | "member" | "viewer";
  services?: Array<{ id: string; role: string }>;
  iat: number;
  exp: number;
}
```

#### `createCorsMiddleware(config)`

CORS 미들웨어. `corsOrigins` 기반으로 허용 Origin을 설정해요.

```typescript
app.use("*", createCorsMiddleware(config));
```

허용 메서드: `GET, POST, PUT, PATCH, DELETE, OPTIONS`

#### `rbac(minRole)`

역할 기반 접근 제어. JWT payload의 `role`을 확인해요.

```typescript
type Role = "admin" | "member" | "viewer";

// admin만 접근 가능
app.delete("/api/resource/:id", rbac("admin"), handler);

// member 이상 접근 가능
app.post("/api/resource", rbac("member"), handler);
```

역할 레벨: `admin(3) > member(2) > viewer(1)`

#### `errorHandler()`

표준 에러 응답 포맷을 처리해요.

```typescript
app.use("*", errorHandler());

// HarnessError 직접 사용
import { HarnessError } from "@foundry-x/harness-kit";
throw new HarnessError("NOT_FOUND", "Resource not found", 404);
```

#### `createStranglerMiddleware(config)`

Strangler Fig 패턴 라우터. 서비스 이관 전/후 트래픽을 분기해요.

```typescript
import { createStranglerMiddleware } from "@foundry-x/harness-kit";

app.use("*", createStranglerMiddleware({
  routes: [
    {
      pathPrefix: "/api/gate",
      serviceId: "gate-x",
      mode: "local",  // 이관 전: 모놀리스 처리
    },
    {
      pathPrefix: "/api/launch",
      serviceId: "launch-x",
      mode: "proxy",  // 이관 후: 외부 서비스 포워딩
      targetUrl: "https://launch-x.ktds-axbd.workers.dev",
    },
  ],
}));
```

---

### D1 유틸리티

```typescript
import { getDb, runQuery, runExec } from "@foundry-x/harness-kit/d1";

// Workers fetch handler에서
export default {
  async fetch(req: Request, env: Env) {
    const db = getDb(env.DB);
    const rows = await runQuery<User>(db, "SELECT * FROM users WHERE id = ?", [id]);
    return Response.json(rows);
  },
};
```

---

### Event Bus

D1 기반 도메인 이벤트 발행/구독이에요.

```typescript
import { D1EventBus, NoopEventBus, createEvent } from "@foundry-x/harness-kit/events";

// 이벤트 발행
const bus = new D1EventBus(env.DB);
await bus.publish(
  createEvent("discovery.opportunity.created", "gate-x", {
    opportunityId: "opp-123",
    title: "AI 기반 BD 자동화",
  })
);

// 이벤트 구독
bus.subscribe("discovery.opportunity.created", async (event) => {
  console.log("New opportunity:", event.payload);
});

// 폴링으로 미처리 이벤트 처리 (Cron Trigger에서 사용)
await bus.poll("gate-x", 100);  // 최대 100건
```

**D1 마이그레이션 필요:**
```sql
-- 0114_domain_events.sql (Foundry-X DB에 이미 적용됨)
CREATE TABLE IF NOT EXISTS domain_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT NOT NULL,
  metadata TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
```

---

### ESLint Plugin

서비스 간 직접 import를 방지해요.

```javascript
// eslint.config.mjs
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
        // 직접 import 금지 서비스 목록 (기본: 모든 ServiceId)
        forbiddenServices: ["foundry-x", "launch-x"],
      },
    },
  },
];
```

---

## HarnessConfig 타입

```typescript
interface HarnessConfig {
  serviceName: string;          // 서비스 표시명
  serviceId: ServiceId;         // 서비스 식별자
  corsOrigins: string[];        // 허용 CORS Origin 목록
  publicPaths?: string[];       // 인증 불필요 경로 (prefix 매칭)
  jwtAlgorithm?: string;        // JWT 알고리즘 (기본: "HS256")
}
```

---

## 버전 정보

| 버전 | 변경사항 |
|------|---------|
| 0.1.0 | 초기 릴리스 — Phase 20 AX BD MSA 재조정 |
