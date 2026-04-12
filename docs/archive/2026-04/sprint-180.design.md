---
code: FX-DSGN-S180
title: "Sprint 180 Design — harness-kit 패키지 + CLI + ESLint"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sprint Autopilot)
system-version: "cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0"
---

# Sprint 180 Design — harness-kit 패키지 + CLI + ESLint

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F394 (harness-kit 패키지) + F395 (harness create CLI + ESLint 룰) |
| **핵심 산출물** | `packages/harness-kit/` — 미들웨어 3종 + D1 헬퍼 + 이벤트 인터페이스 + scaffold 템플릿 + CLI + ESLint 룰 |
| **테스트 목표** | harness-kit 패키지 단위 테스트 전체 pass + 기존 turbo test 무영향 |

---

## 1. 패키지 구조

```
packages/harness-kit/
├── src/
│   ├── index.ts                    # Public API 진입점
│   ├── middleware/
│   │   ├── jwt.ts                  # JWT 검증 미들웨어 (Hono MiddlewareHandler)
│   │   ├── cors.ts                 # CORS 미들웨어 (설정 기반)
│   │   ├── rbac.ts                 # RBAC 미들웨어 (역할 수준 체크)
│   │   ├── error-handler.ts        # 표준 에러 핸들러
│   │   └── index.ts                # 미들웨어 re-export
│   ├── d1/
│   │   ├── setup.ts                # D1 바인딩 헬퍼 + prepared statement 래퍼
│   │   └── index.ts
│   ├── events/
│   │   ├── types.ts                # 이벤트 타입 정의 (8종 카탈로그 인터페이스)
│   │   ├── bus.ts                  # EventBus 인터페이스 (구현은 Sprint 185)
│   │   └── index.ts
│   ├── scaffold/
│   │   ├── generator.ts            # 템플릿 렌더링 + 파일 생성 로직
│   │   └── templates/              # Handlebars 템플릿
│   │       ├── wrangler.toml.hbs
│   │       ├── package.json.hbs
│   │       ├── tsconfig.json.hbs
│   │       ├── vitest.config.ts.hbs
│   │       ├── src/
│   │       │   ├── index.ts.hbs
│   │       │   ├── app.ts.hbs
│   │       │   └── env.ts.hbs
│   │       └── .github/
│   │           └── workflows/
│   │               └── deploy.yml.hbs
│   ├── cli/
│   │   ├── index.ts                # CLI 진입점 (Commander)
│   │   └── create.ts               # `harness create <name>` 핸들러
│   ├── eslint/
│   │   ├── no-cross-service-import.ts  # 크로스서비스 import 금지 룰
│   │   └── index.ts                    # 플러그인 export
│   └── types.ts                    # 공통 타입 (HarnessEnv, HarnessConfig, ServiceId)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── __tests__/
    ├── middleware/
    │   ├── jwt.test.ts
    │   ├── cors.test.ts
    │   ├── rbac.test.ts
    │   └── error-handler.test.ts
    ├── d1/
    │   └── setup.test.ts
    ├── events/
    │   └── types.test.ts
    ├── scaffold/
    │   └── generator.test.ts
    ├── cli/
    │   └── create.test.ts
    └── eslint/
        └── no-cross-service-import.test.ts
```

---

## 2. 공통 타입 (`src/types.ts`)

```typescript
// 서비스 식별자 (Sprint 179 service-mapping.md 기반)
export type ServiceId = 'foundry-x' | 'discovery-x' | 'ai-foundry' | 'gate-x' | 'launch-x' | 'eval-x';

// Workers 환경 바인딩 (필수 공통)
export interface HarnessEnv {
  DB: D1Database;
  JWT_SECRET: string;
  CACHE?: KVNamespace;
  [key: string]: unknown;
}

// harness-kit 설정
export interface HarnessConfig {
  serviceName: string;
  serviceId: ServiceId;
  corsOrigins: string[];
  publicPaths?: string[];
  jwtAlgorithm?: string; // default: 'HS256'
}

// scaffold 옵션
export interface ScaffoldOptions {
  name: string;          // 서비스명 (kebab-case)
  serviceId: ServiceId;
  accountId?: string;    // Cloudflare account ID
  dbName?: string;       // D1 database name
  outputDir?: string;    // 출력 디렉토리 (default: current dir)
}
```

---

## 3. 미들웨어 상세 설계

### 3.1 JWT 미들웨어 (`src/middleware/jwt.ts`)

Foundry-X `packages/api/src/middleware/auth.ts` 패턴을 범용화.

```typescript
import { jwt } from 'hono/jwt';
import type { MiddlewareHandler } from 'hono';
import type { HarnessConfig } from '../types.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  orgId?: string;
  orgRole?: 'owner' | 'admin' | 'member' | 'viewer';
  services?: Array<{ id: string; role: string }>;
  iat: number;
  exp: number;
  jti?: string;
}

export function createAuthMiddleware(config: HarnessConfig): MiddlewareHandler {
  const publicPaths = config.publicPaths ?? [];
  return async (c, next) => {
    const path = c.req.path;
    if (publicPaths.some((p) => path.startsWith(p))) {
      return next();
    }
    const secret = (c.env as Record<string, string>)?.JWT_SECRET ?? 'dev-secret';
    const handler = jwt({ secret, alg: (config.jwtAlgorithm ?? 'HS256') as 'HS256' });
    return handler(c, next);
  };
}
```

**Foundry-X와의 차이**: `PUBLIC_PATHS` 하드코딩 → `config.publicPaths` 설정 기반.

### 3.2 CORS 미들웨어 (`src/middleware/cors.ts`)

```typescript
import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';
import type { HarnessConfig } from '../types.js';

export function createCorsMiddleware(config: HarnessConfig): MiddlewareHandler {
  return cors({
    origin: config.corsOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  });
}
```

### 3.3 RBAC 미들웨어 (`src/middleware/rbac.ts`)

Foundry-X `packages/api/src/middleware/rbac.ts` 그대로 범용화.

```typescript
import type { MiddlewareHandler } from 'hono';

export type Role = 'admin' | 'member' | 'viewer';

const ROLE_LEVEL: Record<Role, number> = {
  admin: 3,
  member: 2,
  viewer: 1,
};

export function rbac(minRole: Role): MiddlewareHandler {
  return async (c, next) => {
    const payload = c.get('jwtPayload') as { role?: string } | undefined;
    const userRole = payload?.role as Role | undefined;
    if (!userRole || ROLE_LEVEL[userRole] < ROLE_LEVEL[minRole]) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    return next();
  };
}
```

### 3.4 에러 핸들러 (`src/middleware/error-handler.ts`)

```typescript
import type { ErrorHandler } from 'hono';

export class HarnessError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'HarnessError';
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HarnessError) {
    return c.json(
      { error: err.message, code: err.code },
      err.statusCode as 400,
    );
  }
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
};
```

---

## 4. D1 헬퍼 (`src/d1/setup.ts`)

```typescript
import type { HarnessEnv } from '../types.js';

export function getDb(env: HarnessEnv): D1Database {
  if (!env.DB) {
    throw new Error('D1 database binding (DB) not found in environment');
  }
  return env.DB;
}

export async function runQuery<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const stmt = db.prepare(sql);
  const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all<T>();
  return result.results;
}

export async function runExec(db: D1Database, sql: string): Promise<void> {
  await db.exec(sql);
}
```

---

## 5. 이벤트 인터페이스 (`src/events/`)

PRD §4.2 #6 이벤트 카탈로그 8종의 **타입만** 정의. 구현은 Sprint 185.

### 5.1 이벤트 타입 (`src/events/types.ts`)

```typescript
import type { ServiceId } from '../types.js';

export type EventType =
  | 'biz-item.created'
  | 'biz-item.updated'
  | 'biz-item.stage-changed'
  | 'validation.completed'
  | 'validation.rejected'
  | 'offering.generated'
  | 'prototype.created'
  | 'pipeline.step-completed';

export interface DomainEvent<T = unknown> {
  id: string;               // UUID
  type: EventType;
  source: ServiceId;
  timestamp: string;         // ISO 8601
  payload: T;
  metadata?: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
    orgId?: string;
  };
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export interface EventSubscriber {
  subscribe(type: EventType, handler: (event: DomainEvent) => Promise<void>): void;
}
```

### 5.2 EventBus 인터페이스 (`src/events/bus.ts`)

```typescript
import type { DomainEvent, EventType, EventPublisher, EventSubscriber } from './types.js';

export interface EventBus extends EventPublisher, EventSubscriber {
  publishBatch(events: DomainEvent[]): Promise<void>;
}

// Stub 구현 (Sprint 185에서 D1 Event Table 기반으로 교체)
export class NoopEventBus implements EventBus {
  async publish(_event: DomainEvent): Promise<void> {
    // noop — Sprint 185에서 구현
  }
  async publishBatch(_events: DomainEvent[]): Promise<void> {
    // noop
  }
  subscribe(_type: EventType, _handler: (event: DomainEvent) => Promise<void>): void {
    // noop
  }
}
```

---

## 6. Scaffold 템플릿 + Generator

### 6.1 Generator (`src/scaffold/generator.ts`)

```typescript
import Handlebars from 'handlebars';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ScaffoldOptions } from '../types.js';

const TEMPLATES_DIR = path.join(import.meta.dirname, 'templates');

export async function generateScaffold(options: ScaffoldOptions): Promise<string[]> {
  const outputDir = options.outputDir ?? path.join(process.cwd(), options.name);
  const createdFiles: string[] = [];
  const context = {
    name: options.name,
    serviceId: options.serviceId,
    accountId: options.accountId ?? '<YOUR_ACCOUNT_ID>',
    dbName: options.dbName ?? `${options.name}-db`,
    harnessKitVersion: 'workspace:*',
  };

  await walkTemplates(TEMPLATES_DIR, outputDir, context, createdFiles);
  return createdFiles;
}

async function walkTemplates(
  templateDir: string,
  outputDir: string,
  context: Record<string, string>,
  createdFiles: string[],
): Promise<void> {
  const entries = fs.readdirSync(templateDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(templateDir, entry.name);
    if (entry.isDirectory()) {
      const destDir = path.join(outputDir, entry.name);
      fs.mkdirSync(destDir, { recursive: true });
      await walkTemplates(srcPath, destDir, context, createdFiles);
    } else if (entry.name.endsWith('.hbs')) {
      const destName = entry.name.replace('.hbs', '');
      const destPath = path.join(outputDir, destName);
      const templateSrc = fs.readFileSync(srcPath, 'utf-8');
      const compiled = Handlebars.compile(templateSrc);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, compiled(context));
      createdFiles.push(destPath);
    }
  }
}
```

### 6.2 주요 템플릿

**`wrangler.toml.hbs`**:
```toml
name = "{{name}}"
main = "src/index.ts"
compatibility_date = "2024-12-01"
account_id = "{{accountId}}"

[[d1_databases]]
binding = "DB"
database_name = "{{dbName}}"
database_id = "<RUN: wrangler d1 create {{dbName}}>"
```

**`package.json.hbs`**:
```json
{
  "name": "@ax-bd/{{name}}",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@foundry-x/harness-kit": "{{harnessKitVersion}}",
    "@hono/zod-openapi": "^0.9.0",
    "hono": "^4.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "wrangler": "^4.78.0"
  }
}
```

**`src/app.ts.hbs`**:
```typescript
import { OpenAPIHono } from '@hono/zod-openapi';
import { createAuthMiddleware, createCorsMiddleware, errorHandler } from '@foundry-x/harness-kit';
import type { HarnessEnv } from '@foundry-x/harness-kit';

const config = {
  serviceName: '{{name}}',
  serviceId: '{{serviceId}}' as const,
  corsOrigins: ['http://localhost:3000'],
  publicPaths: ['/api/health'],
};

export const app = new OpenAPIHono<{ Bindings: HarnessEnv }>();

app.use('*', createCorsMiddleware(config));
app.use('*', createAuthMiddleware(config));
app.onError(errorHandler);

app.get('/api/health', (c) => c.json({ status: 'ok', service: '{{name}}' }));
```

**`src/index.ts.hbs`**:
```typescript
import { app } from './app.js';
export default app;
```

**`src/env.ts.hbs`**:
```typescript
import type { HarnessEnv } from '@foundry-x/harness-kit';

// 서비스 고유 환경 바인딩
export interface Env extends HarnessEnv {
  // 여기에 서비스별 바인딩 추가
}
```

**`.github/workflows/deploy.yml.hbs`**:
```yaml
name: Deploy {{name}}
on:
  push:
    branches: [master]
    paths:
      - 'packages/{{name}}/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @ax-bd/{{name}} deploy
        env:
          CLOUDFLARE_API_TOKEN: $\{{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## 7. CLI 명령 (`src/cli/`)

### 7.1 CLI 진입점 (`src/cli/index.ts`)

```typescript
import { Command } from 'commander';
import { createCommand } from './create.js';

const program = new Command()
  .name('harness')
  .description('harness-kit CLI — AX BD 서비스 scaffold 생성')
  .version('0.1.0');

program.addCommand(createCommand);
program.parse();
```

### 7.2 create 명령 (`src/cli/create.ts`)

```typescript
import { Command } from 'commander';
import { generateScaffold } from '../scaffold/generator.js';
import type { ServiceId } from '../types.js';

const VALID_SERVICE_IDS: ServiceId[] = [
  'foundry-x', 'discovery-x', 'ai-foundry', 'gate-x', 'launch-x', 'eval-x',
];

export const createCommand = new Command('create')
  .argument('<name>', '서비스명 (kebab-case)')
  .option('--service-id <id>', '서비스 ID', 'foundry-x')
  .option('--account-id <id>', 'Cloudflare Account ID')
  .option('--db-name <name>', 'D1 Database 이름')
  .option('-o, --output <dir>', '출력 디렉토리')
  .action(async (name: string, opts) => {
    if (!VALID_SERVICE_IDS.includes(opts.serviceId)) {
      console.error(`Invalid service ID: ${opts.serviceId}. Valid: ${VALID_SERVICE_IDS.join(', ')}`);
      process.exit(1);
    }
    console.log(`Creating service scaffold: ${name}...`);
    const files = await generateScaffold({
      name,
      serviceId: opts.serviceId as ServiceId,
      accountId: opts.accountId,
      dbName: opts.dbName,
      outputDir: opts.output,
    });
    console.log(`Created ${files.length} files:`);
    files.forEach((f) => console.log(`  ${f}`));
  });
```

---

## 8. ESLint 크로스서비스 접근 금지 룰

### 8.1 룰 설계 (`src/eslint/no-cross-service-import.ts`)

Sprint 179 service-mapping.md의 서비스 경계를 기반으로, `modules/` 간 직접 import를 금지하는 ESLint 룰.

```typescript
// 모듈 경계 정의 (Sprint 181~184 모듈화 이후 적용)
const MODULE_BOUNDARIES: Record<string, string[]> = {
  'core/discovery': ['core/shaping', 'shared'],
  'core/shaping': ['core/discovery', 'shared'],
  'modules/auth': ['shared'],
  'modules/portal': ['shared'],
  'modules/gate': ['shared'],
  'modules/launch': ['shared'],
  'modules/infra': ['shared'],
};

export const noCrossServiceImport = {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'Disallow cross-service imports between module boundaries',
    },
    messages: {
      noCrossImport:
        'Module "{{source}}" cannot import from "{{target}}". Only imports from allowed modules ({{allowed}}) are permitted.',
    },
    schema: [
      {
        type: 'object' as const,
        properties: {
          boundaries: { type: 'object' as const },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context: { filename: string; options: Array<{ boundaries?: Record<string, string[]> }>; report: (arg: unknown) => void }) {
    const boundaries = context.options[0]?.boundaries ?? MODULE_BOUNDARIES;
    const filename = context.filename;

    // 현재 파일이 어떤 모듈에 속하는지 판별
    const sourceModule = Object.keys(boundaries).find((mod) =>
      filename.includes(`/${mod}/`),
    );
    if (!sourceModule) return {};

    const allowedTargets = boundaries[sourceModule] ?? [];

    return {
      ImportDeclaration(node: { source: { value: string }; loc: unknown }) {
        const importPath = node.source.value;
        // 상대 경로 import만 검사
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) return;

        // import 대상이 다른 모듈에 속하는지 확인
        for (const mod of Object.keys(boundaries)) {
          if (mod === sourceModule) continue;
          if (importPath.includes(`/${mod}/`) || importPath.includes(`../${mod}`)) {
            if (!allowedTargets.includes(mod)) {
              context.report({
                node,
                messageId: 'noCrossImport',
                data: {
                  source: sourceModule,
                  target: mod,
                  allowed: allowedTargets.join(', '),
                },
              });
            }
          }
        }
      },
    };
  },
};
```

### 8.2 플러그인 export (`src/eslint/index.ts`)

```typescript
import { noCrossServiceImport } from './no-cross-service-import.js';

export const harnessKitPlugin = {
  meta: { name: 'eslint-plugin-harness-kit', version: '0.1.0' },
  rules: {
    'no-cross-service-import': noCrossServiceImport,
  },
};
```

---

## 9. package.json

```json
{
  "name": "@foundry-x/harness-kit",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "harness": "dist/cli/index.js"
  },
  "exports": {
    ".": "./dist/index.js",
    "./eslint": "./dist/eslint/index.js",
    "./events": "./dist/events/index.js",
    "./d1": "./dist/d1/index.js",
    "./scaffold": "./dist/scaffold/generator.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "handlebars": "^4.7.8",
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  },
  "peerDependencies": {
    "hono": "^4.0.0"
  }
}
```

---

## 10. 테스트 설계

### 10.1 테스트 매트릭스

| # | 테스트 파일 | 대상 | 주요 검증 |
|---|-----------|------|-----------|
| 1 | `jwt.test.ts` | JWT 미들웨어 | public path 스킵, 유효 JWT 통과, 만료 JWT 거부, dev-secret fallback |
| 2 | `cors.test.ts` | CORS 미들웨어 | 허용 origin 통과, 미허용 origin 거부, preflight OPTIONS |
| 3 | `rbac.test.ts` | RBAC 미들웨어 | admin 통과, viewer 거부, 미인증 거부 |
| 4 | `error-handler.test.ts` | 에러 핸들러 | HarnessError 적절 응답, 일반 Error 500 |
| 5 | `setup.test.ts` | D1 헬퍼 | getDb 바인딩 확인, runQuery 결과 반환 |
| 6 | `types.test.ts` | 이벤트 타입 | 타입 검증 (컴파일 타임), NoopEventBus 동작 |
| 7 | `generator.test.ts` | scaffold 생성기 | 파일 생성 확인, 템플릿 변수 치환 |
| 8 | `create.test.ts` | CLI create | 유효 입력 성공, 잘못된 service-id 거부 |
| 9 | `no-cross-service-import.test.ts` | ESLint 룰 | 동일 모듈 import 허용, 크로스 모듈 거부, shared 허용 |

### 10.2 테스트 전략

- **Hono 미들웨어 테스트**: `new Hono().use(middleware).get('/test', handler)` + `app.request('/test')` 패턴
- **D1 mock**: vitest mock으로 `D1Database` 인터페이스 stub
- **파일 시스템 테스트**: `os.tmpdir()` + 정리 (afterEach)
- **ESLint 룰 테스트**: `RuleTester` 사용

---

## 11. 검증 체크리스트

| # | 항목 | 명령 | 기준 |
|---|------|------|------|
| 1 | harness-kit 빌드 | `cd packages/harness-kit && pnpm build` | exit 0 |
| 2 | 단위 테스트 | `cd packages/harness-kit && pnpm test` | 전체 pass |
| 3 | typecheck | `cd packages/harness-kit && pnpm typecheck` | 에러 0 |
| 4 | scaffold PoC | `node dist/cli/index.js create test-svc --service-id gate-x` | 파일 생성 |
| 5 | ESLint 룰 | RuleTester valid/invalid cases | 전체 pass |
| 6 | 기존 테스트 무영향 | `turbo test` | 기존 패키지 pass |
| 7 | turbo 인식 | `turbo build --filter=harness-kit` | 빌드 성공 |
