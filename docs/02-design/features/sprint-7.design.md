---
code: FX-DSGN-007
title: Sprint 7 (v0.7.0) — OpenAPI 전환 + API 실데이터 + Web 고도화 상세 설계
version: 0.1
status: Draft
category: DSGN
system-version: 0.7.0
created: 2026-03-17
updated: 2026-03-17
author: Sinclair Seo
---

# Sprint 7 Design Document

> **Summary**: 9개 API 라우트를 @hono/zod-openapi createRoute 패턴으로 전환하고, data-reader를 D1 + GitHub API로 리팩토링하며, shadcn/ui로 웹 대시보드를 고도화하는 상세 설계.
>
> **Project**: Foundry-X
> **Version**: 0.7.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-17
> **Status**: Draft
> **Planning Doc**: [sprint-7.plan.md](../../01-plan/features/sprint-7.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **Contract-First API**: OpenAPI 3.1 스펙이 코드에서 자동 생성 — 문서와 코드 불일치 원천 제거
2. **실데이터 전환**: mock → D1(wiki, token, agent) + GitHub API(requirements) — Workers 환경에서 동작
3. **node:fs 완전 제거**: Workers 런타임 호환성 확보
4. **디자인 시스템**: shadcn/ui 기반 일관된 UI + 반응형 + 다크모드
5. **테스트 안정성**: OpenAPI 스키마 변경 시 테스트가 자동 감지

### 1.2 현재 코드 분석

| 파일 | 현재 패턴 | 문제 | Sprint 7 변경 |
|------|----------|------|--------------|
| app.ts | Hono + 정적 openapi.json | 스펙에 endpoint 정보 없음 | OpenAPIHono + app.doc() |
| routes/*.ts | new Hono() + 수동 타입 | 런타임 검증 없음 | createRoute() + Zod |
| data-reader.ts | node:fs + mock 상수 | Workers 불호환 | D1 서비스 레이어 |
| routes/wiki.ts | node:fs/promises 직접 사용 | Workers 불호환 | D1 wiki_pages CRUD |
| routes/requirements.ts | getProjectRoot() + fs 파싱 | Workers 불호환 | GitHub API (fetch) |
| routes/auth.ts | Map 인메모리 | 재시작 시 데이터 유실 | D1 users + refresh_tokens |

---

## 2. F38 — OpenAPI 3.1 상세 설계

### 2.1 app.ts 전환

현재: Hono + 정적 openapi.json (태그만)
전환 후: OpenAPIHono + app.doc() 자동 스펙 생성

```typescript
// 전환 후 app.ts
import { OpenAPIHono } from "@hono/zod-openapi";

const app = new OpenAPIHono<{ Bindings: Env }>();

app.doc("/api/openapi.json", {
  openapi: "3.1.0",
  info: { title: "Foundry-X API", version: "0.7.0" },
});
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));
```

### 2.2 createRoute 패턴

표준 라우트 패턴 — 모든 라우트에 동일 적용:

```typescript
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

// 1) Zod 스키마 정의
const HealthResponseSchema = z.object({
  overall: z.number(),
  specToCode: z.number(),
  codeToTest: z.number(),
  specToTest: z.number(),
  grade: z.string(),
});

// 2) createRoute 정의
const getHealthRoute = createRoute({
  method: "get",
  path: "/api/health",
  tags: ["Health"],
  responses: {
    200: {
      content: { "application/json": { schema: HealthResponseSchema } },
      description: "SDD Triangle Health Score",
    },
  },
});

// 3) handler 등록
app.openapi(getHealthRoute, (c) => {
  return c.json({ overall: 82, ... });
});
```

### 2.3 라우트별 Zod 스키마

| Route | Request Schema | Response Schema |
|-------|---------------|-----------------|
| GET /api/health | — | HealthResponseSchema |
| GET /api/profile | — | RepoProfileSchema |
| GET /api/integrity | — | IntegritySchema |
| GET /api/freshness | — | FreshnessSchema |
| GET /api/wiki | — | z.array(WikiPageSchema) |
| GET /api/wiki/:slug | params: slug | WikiPageSchema |
| POST /api/wiki | WikiCreateSchema | WikiPageSchema |
| PUT /api/wiki/:slug | WikiUpdateSchema | WikiPageSchema |
| DELETE /api/wiki/:slug | params: slug | SuccessSchema |
| GET /api/requirements | — | z.array(RequirementSchema) |
| PUT /api/requirements/:id | ReqUpdateSchema | RequirementSchema |
| GET /api/agents | — | z.array(AgentProfileSchema) |
| GET /api/tokens/summary | — | TokenSummarySchema |
| GET /api/tokens/usage | — | z.array(TokenUsageSchema) |
| POST /api/auth/signup | SignupSchema | AuthResponseSchema |
| POST /api/auth/login | LoginSchema | AuthResponseSchema |
| POST /api/auth/refresh | RefreshSchema | TokenPairSchema |

### 2.4 파일 구조 변경

```
packages/api/src/
├── app.ts              # OpenAPIHono + app.doc() + swaggerUI
├── schemas/            # [NEW] Zod 스키마 (라우트별)
│   ├── health.ts
│   ├── wiki.ts
│   ├── requirements.ts
│   ├── agent.ts
│   ├── token.ts
│   ├── auth.ts
│   ├── profile.ts
│   ├── integrity.ts
│   ├── freshness.ts
│   └── common.ts       # ErrorSchema, SuccessSchema
├── routes/             # createRoute() + handler
│   ├── health.ts       # 수정: Hono → OpenAPIHono
│   ├── wiki.ts         # 수정: fs → D1
│   ├── requirements.ts # 수정: fs → GitHub API
│   ├── agent.ts        # 수정: mock → D1
│   ├── token.ts        # 수정: mock → D1
│   ├── auth.ts         # 수정: Map → D1
│   ├── profile.ts
│   ├── integrity.ts
│   └── freshness.ts
├── services/           # [NEW] 비즈니스 로직 분리
│   ├── wiki-service.ts    # D1 wiki CRUD
│   ├── token-service.ts   # D1 token 집계
│   ├── agent-service.ts   # D1 agent 조회
│   ├── user-service.ts    # D1 user CRUD (auth에서 분리)
│   └── github-service.ts  # GitHub API (requirements)
├── db/
│   ├── schema.ts       # Drizzle 스키마 (기존)
│   └── migrations/     # 마이그레이션 (기존)
└── middleware/
    ├── auth.ts         # JWT (기존)
    └── rbac.ts         # RBAC (기존)
```

### 2.5 Zod → shared 타입 동기화

기존 shared 타입(WikiPage, RequirementItem 등)은 유지하고, Zod 스키마는 API 패키지 내부에서만 사용. shared 타입과 Zod 스키마가 동일 구조를 표현하되, 직접 import 의존은 만들지 않아요 (빌드 순서 독립).

---

## 3. F41 — API 실데이터 연동 상세 설계

### 3.1 서비스 레이어 패턴

각 서비스가 DrizzleD1Database를 인자로 받는 클래스 패턴:

```typescript
// services/wiki-service.ts
import { eq } from "drizzle-orm";
import { wikiPages } from "../db/schema.js";

export class WikiService {
  constructor(private db: DrizzleD1Database) {}

  async list(projectId: string) {
    return this.db.select().from(wikiPages)
      .where(eq(wikiPages.projectId, projectId));
  }

  async getBySlug(slug: string) {
    const rows = await this.db.select().from(wikiPages)
      .where(eq(wikiPages.slug, slug)).limit(1);
    return rows[0] ?? null;
  }

  async create(data: {
    projectId: string; slug: string; title: string;
    content: string; updatedBy: string;
  }) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.insert(wikiPages).values({
      id, ...data, ownershipMarker: "human", updatedAt: now,
    });
    return this.getBySlug(data.slug);
  }

  async update(slug: string, content: string, updatedBy: string) {
    await this.db.update(wikiPages)
      .set({ content, updatedBy, updatedAt: new Date().toISOString() })
      .where(eq(wikiPages.slug, slug));
    return this.getBySlug(slug);
  }

  async delete(slug: string) {
    return this.db.delete(wikiPages)
      .where(eq(wikiPages.slug, slug));
  }
}
```

### 3.2 auth → D1 전환

현재: `const users = new Map<string, User>()` — 재시작 시 데이터 유실

```typescript
// services/user-service.ts
export class UserService {
  constructor(private db: DrizzleD1Database) {}

  async findByEmail(email: string) {
    const rows = await this.db.select().from(users)
      .where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  }

  async create(data: {
    email: string; name: string; passwordHash: string;
  }) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.insert(users).values({
      id, ...data, role: "member", createdAt: now, updatedAt: now,
    });
    return this.findByEmail(data.email);
  }

  async findById(id: string) {
    const rows = await this.db.select().from(users)
      .where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }
}
```

### 3.3 requirements → GitHub API

현재: node:fs + getProjectRoot() + SPEC.md 로컬 파싱
전환: GitHub REST API로 SPEC.md 내용 가져오기

```typescript
// services/github-service.ts
export class GitHubService {
  constructor(
    private repo: string,    // "KTDS-AXBD/Foundry-X"
    private token?: string,  // PAT (optional)
  ) {}

  async getFileContent(path: string): Promise<string | null> {
    const [owner, name] = this.repo.split("/");
    const url = `https://api.github.com/repos/${owner}/${name}/contents/${path}`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.raw",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return res.text();
  }

  async getSpecRequirements(): Promise<RequirementItem[]> {
    const content = await this.getFileContent("SPEC.md");
    if (!content) return [];
    return parseSpecRequirements(content);
  }
}
```

### 3.4 D1 바인딩 주입

```typescript
// app.ts — 미들웨어로 D1 주입
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema.js";

app.use("/api/*", async (c, next) => {
  const db = drizzle(c.env.DB, { schema });
  c.set("db", db);
  await next();
});
```

### 3.5 Endpoint별 전환 매트릭스

| Endpoint | 현재 | Sprint 7 | D1 테이블 |
|----------|------|---------|----------|
| GET /api/wiki | fs scanMarkdown | WikiService.list() | wiki_pages |
| GET /api/wiki/:slug | fs readFile | WikiService.getBySlug() | wiki_pages |
| POST /api/wiki | fs writeFile | WikiService.create() | wiki_pages |
| PUT /api/wiki/:slug | fs writeFile | WikiService.update() | wiki_pages |
| DELETE /api/wiki/:slug | fs unlink | WikiService.delete() | wiki_pages |
| GET /api/tokens/summary | mock/fs JSONL | TokenService.summary() | token_usage |
| GET /api/tokens/usage | mock/fs JSONL | TokenService.recent() | token_usage |
| GET /api/agents | mock/fs JSON | AgentService.list() | agent_sessions |
| GET /api/requirements | fs SPEC.md | GitHubService | GitHub API |
| GET /api/profile | mock/fs JSON | mock 유지 (JWT 보충) | users |
| GET /api/health | mock | mock 유지 | — |
| GET /api/integrity | mock | mock 유지 | — |
| GET /api/freshness | mock | mock 유지 | — |
| POST /api/auth/signup | Map | UserService.create() | users |
| POST /api/auth/login | Map.get() | UserService.findByEmail() | users |
| POST /api/auth/refresh | Map.find() | UserService.findById() | users + refresh_tokens |

### 3.6 node:fs import 제거 체크리스트

| 파일 | 현재 import | 제거 방법 |
|------|------------|----------|
| data-reader.ts | readFile, writeFile | 파일 삭제 (서비스로 대체) |
| routes/wiki.ts | readdir, stat, unlink, mkdir | D1 WikiService |
| routes/requirements.ts | join (node:path) | GitHub API |
| routes/token.ts | foundryXPath, readTextFile | D1 TokenService |
| routes/agent.ts | readJsonFile, foundryXPath | D1 AgentService |
| routes/profile.ts | readJsonFile, foundryXPath | mock 인라인 (fs 제거) |

---

## 4. F42 — Web 고도화 상세 설계

### 4.1 shadcn/ui 설치

```bash
cd packages/web
npx shadcn-ui@latest init
npx shadcn-ui@latest add card button table badge
npx shadcn-ui@latest add tabs input textarea
npx shadcn-ui@latest add dropdown-menu sheet avatar skeleton
```

### 4.2 컴포넌트 매핑

| 현재 컴포넌트 | shadcn 교체 | 위치 |
|-------------|-----------|------|
| DashboardCard (인라인) | Card + CardHeader + CardContent | components/feature/ |
| AgentCard (인라인) | Card + Badge + Progress | components/feature/ |
| MarkdownViewer (인라인) | Card + prose 스타일 | components/feature/ |
| 테이블 (HTML) | Table + TableHeader + TableRow | shadcn Table |
| 네비게이션 | Sheet (모바일) + 사이드바 | components/layout/ |

### 4.3 다크모드

```typescript
// app/layout.tsx — ThemeProvider 추가
import { ThemeProvider } from "next-themes";

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 4.4 반응형 레이아웃

Desktop (>= 1024px): Sidebar(240px) + Main Content
Mobile (< 1024px): Header(햄버거) + Full-width Content

Tailwind 반응형 클래스 사용: `lg:flex lg:w-60 hidden`

---

## 5. F43 — 테스트 상세 설계

### 5.1 D1 Mock 전략

better-sqlite3로 in-memory SQLite 사용 — Drizzle 쿼리가 실제 SQL로 동작:

```typescript
// __tests__/helpers/mock-db.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../src/db/schema.js";

export function createMockDb() {
  const sqlite = new Database(":memory:");
  // 마이그레이션 SQL 실행
  const migration = readFileSync("src/db/migrations/0001_initial.sql", "utf-8");
  sqlite.exec(migration);
  return drizzle(sqlite, { schema });
}
```

### 5.2 API 테스트 패턴

```typescript
// __tests__/wiki.test.ts
import { createTestApp } from "./helpers/test-app.js";

describe("Wiki API", () => {
  it("POST /api/wiki → 201", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/wiki", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer ..." },
      body: JSON.stringify({ slug: "test", title: "Test", content: "Hello" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toBe("test");
  });
});
```

### 5.3 테스트 목표

| 영역 | 현재 | Sprint 7 목표 |
|------|:----:|:----:|
| API 테스트 | 39 | 50+ |
| Web 테스트 | 18 | 25+ |
| CLI 테스트 | 106 | 106 (유지) |
| 전체 | 145 | 180+ |

---

## 6. 마이그레이션 전략

### 6.1 단계별 전환 (Big Bang 금지)

```
Step 1: schemas/ 디렉토리 + Zod 스키마 정의 (테스트 영향 없음)
Step 2: app.ts → OpenAPIHono 전환 (라우트 등록 변경)
Step 3: 라우트 1개씩 createRoute() 마이그레이션
        순서: health → profile → integrity → freshness → auth →
              wiki → requirements → agent → token
Step 4: services/ 레이어 생성 (D1 비즈니스 로직)
Step 5: 라우트에서 mock → service 호출 전환
Step 6: data-reader.ts 삭제 (모든 의존 제거 확인 후)
Step 7: 테스트 갱신
```

### 6.2 호환성 유지

- Step 2~3 중 Swagger UI는 점진적으로 풍부해짐
- Step 5 중 mock fallback 유지 — D1 실패 시 mock 반환 (graceful degradation)
- 기존 테스트는 Step 7에서 일괄 갱신

---

## 7. 환경 설정

### 7.1 패키지 추가

```bash
# API
cd packages/api
pnpm add drizzle-orm   # 이미 설치됨
pnpm add -D better-sqlite3 @types/better-sqlite3  # 테스트용

# Web
cd packages/web
pnpm add next-themes class-variance-authority clsx tailwind-merge
pnpm add -D tailwindcss postcss autoprefixer
```

---

## 8. 완료 기준 체크리스트

| # | 항목 | 검증 방법 |
|---|------|----------|
| 1 | app.ts → OpenAPIHono 전환 | app.doc() 호출 성공 |
| 2 | 9개 라우트 createRoute() | Swagger UI에 전체 표시 |
| 3 | Zod 런타임 검증 | 잘못된 요청 → 400 + Zod error |
| 4 | wiki CRUD → D1 | curl create/read/update/delete |
| 5 | auth → D1 users | signup → login → refresh 유지 |
| 6 | token/agent → D1 | seed 데이터 조회 |
| 7 | requirements → GitHub API | SPEC.md F-items 반환 |
| 8 | node:fs import 0건 | grep 확인 |
| 9 | data-reader.ts 삭제 | 파일 부재 |
| 10 | shadcn/ui Card/Button/Table | 웹 UI 확인 |
| 11 | 다크모드 토글 | 테마 전환 |
| 12 | 반응형 레이아웃 | 모바일 사이드바 → 햄버거 |
| 13 | API 테스트 50+ | turbo test |
| 14 | Web 테스트 25+ | turbo test |
| 15 | Workers 배포 성공 | wrangler deploy + 프로덕션 확인 |
