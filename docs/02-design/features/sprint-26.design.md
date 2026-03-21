---
code: FX-DSGN-027
title: "Sprint 26 Design — Phase 4 통합: 프론트엔드 + SSO + API BFF + D1 스키마"
version: 0.1
status: Draft
category: DSGN
system-version: 2.0.0
created: 2026-03-20
updated: 2026-03-20
author: Sinclair Seo
---

# Sprint 26 Design — Phase 4 통합

> **Plan Reference**: [[FX-PLAN-027]]
> **Features**: F106 (프론트엔드 통합), F108 (SSO), F109 (API BFF), F111 (D1 스키마)

---

## 0. 아키텍처 개요

```
┌──────────────────────────────────────────────────────────────┐
│                     fx.minu.best (Pages)                     │
│  ┌─────────────┬─────────────┬──────────────┐               │
│  │  /dashboard  │  /discovery │   /foundry   │  Next.js App  │
│  │  /agents     │  (iframe)   │   (iframe)   │  (static)     │
│  │  /wiki ...   │  dx.minu.   │   aif.pages  │               │
│  └──────┬──────┴──────┬──────┴──────┬───────┘               │
│         │ API calls    │ postMessage │ postMessage            │
│         ▼              ▼             ▼                        │
│  ┌──────────────────────────────────────────┐                │
│  │       Foundry-X Workers (BFF)            │                │
│  │  /api/*        → Hono (native)           │                │
│  │  /api/dx/*     → fetch(dx-worker)        │                │
│  │  /api/aif/*    → fetch(aif-worker)       │                │
│  │  sso-verify    → JWT Hub Token 검증      │                │
│  └──────────────────────────────────────────┘                │
│                          │                                    │
│         ┌────────────────┼────────────────┐                  │
│         ▼                ▼                ▼                   │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐           │
│  │ FX D1 (27) │  │ DX D1 (14) │  │AIF D1(10)+Neo│           │
│  │+entity tbl │  │            │  │              │           │
│  └────────────┘  └────────────┘  └──────────────┘           │
└──────────────────────────────────────────────────────────────┘
```

### 핵심 제약 사항

1. **`output: "export"`**: Next.js가 정적 빌드 → rewrites 프로덕션에서 미동작
   - **결정**: iframe 기반 서비스 임베드 (기존 서비스를 재작성하지 않음)
   - `output: "export"` 유지 — SSR 전환은 범위 과다 + Pages 배포 모델 변경 필요
2. **Service Bindings**: free plan에서도 사용 가능하나, 동일 계정 내 Workers만
   - Discovery-X Workers와 AI Foundry Workers 모두 같은 ktds-axbd 계정 → ✅ 사용 가능
3. **JWT HS256**: 대칭 키 방식 → 서비스 간 비밀키 공유 필요
   - **결정**: 동일 JWT_SECRET을 모든 Workers Secrets에 배포

---

## 1. F108 — 인증 SSO 통합 (선행)

### 1.1 JWT Hub Token 설계

현재 `JwtPayload` (auth.ts:5-14)를 확장하여 `services` 클레임 추가:

```typescript
// packages/api/src/middleware/auth.ts — JwtPayload 확장
export interface JwtPayload {
  sub: string;
  email: string;
  role: "admin" | "member" | "viewer";
  orgId?: string;
  orgRole?: "owner" | "admin" | "member" | "viewer";
  // ── Sprint 26 SSO 확장 ──
  services?: ServiceAccess[];  // Hub Token 전용 (서비스별 접근 권한)
  iat: number;
  exp: number;
  jti?: string;
}

export interface ServiceAccess {
  id: "foundry-x" | "discovery-x" | "ai-foundry";
  role: "admin" | "member" | "viewer";
}
```

### 1.2 org_services 테이블 (D1 migration 0017)

```sql
-- 0017_sso_and_entities.sql

-- F108: Org별 서비스 접근 권한
CREATE TABLE IF NOT EXISTS org_services (
  org_id      TEXT NOT NULL,
  service_id  TEXT NOT NULL CHECK(service_id IN ('foundry-x', 'discovery-x', 'ai-foundry')),
  enabled     INTEGER NOT NULL DEFAULT 1,
  config      TEXT,  -- JSON: 서비스별 추가 설정 (endpoint URL 등)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, service_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- F111: 크로스 서비스 엔티티 레지스트리
CREATE TABLE IF NOT EXISTS service_entities (
  id          TEXT PRIMARY KEY,
  service_id  TEXT NOT NULL CHECK(service_id IN ('foundry-x', 'discovery-x', 'ai-foundry')),
  entity_type TEXT NOT NULL,  -- 'experiment', 'skill', 'agent_task', 'discovery', 'document'
  external_id TEXT NOT NULL,  -- 원본 서비스의 PK
  title       TEXT NOT NULL,
  status      TEXT,
  metadata    TEXT,  -- JSON
  org_id      TEXT NOT NULL,
  synced_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX idx_se_service ON service_entities(service_id, entity_type);
CREATE INDEX idx_se_org ON service_entities(org_id);

-- F111: 엔티티 간 관계 (Discovery 실험 → AI Foundry 스킬 → FX 에이전트 태스크)
CREATE TABLE IF NOT EXISTS entity_links (
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL REFERENCES service_entities(id),
  target_id   TEXT NOT NULL REFERENCES service_entities(id),
  link_type   TEXT NOT NULL,  -- 'derived_from', 'triggers', 'produces', 'references'
  metadata    TEXT,  -- JSON
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_el_source ON entity_links(source_id);
CREATE INDEX idx_el_target ON entity_links(target_id);
```

### 1.3 SSO 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/sso/token` | Hub Token 발급 (기존 access token → services 포함 Hub Token) |
| POST | `/api/auth/sso/verify` | Hub Token 검증 (외부 서비스가 호출) |
| GET | `/api/orgs/:orgId/services` | Org 서비스 목록 조회 |
| PUT | `/api/orgs/:orgId/services/:serviceId` | Org 서비스 활성화/비활성화 |

### 1.4 SSO 토큰 흐름

```
1. 사용자 → POST /api/auth/login → 기존 JWT (access + refresh)
2. 사용자 → POST /api/auth/sso/token → Hub Token (services[] 포함)
     └─ org_services에서 해당 Org의 활성 서비스 조회
     └─ 각 서비스별 role은 org_members.role과 동일 (MVP)
3. iframe(Discovery-X) → postMessage로 Hub Token 전달
4. Discovery-X Workers → POST /api/auth/sso/verify (Hub Token 검증)
     └─ JWT_SECRET 공유로 자체 검증 가능 (또는 FX Workers에 위임)
```

### 1.5 파일 변경 목록

| 파일 | 변경 | 신규/수정 |
|------|------|:---------:|
| `packages/api/src/middleware/auth.ts` | JwtPayload에 services 추가, createHubToken() | 수정 |
| `packages/api/src/routes/sso.ts` | SSO 4 endpoints | **신규** |
| `packages/api/src/schemas/sso.ts` | Zod 스키마 (HubTokenRequest, VerifyRequest, OrgService) | **신규** |
| `packages/api/src/services/sso.ts` | SsoService — Hub Token 발급/검증/서비스 관리 | **신규** |
| `packages/api/src/app.ts` | ssoRoute 등록, PUBLIC_PATHS에 sso/verify 추가 | 수정 |
| `packages/api/src/env.ts` | Env에 Service Bindings 타입 추가 | 수정 |
| `packages/api/src/db/migrations/0017_sso_and_entities.sql` | 3 테이블 | **신규** |
| `packages/shared/src/sso.ts` | ServiceAccess, HubToken 공유 타입 | **신규** |

### 1.6 테스트 계획

| 테스트 | 검증 항목 |
|--------|-----------|
| sso.test.ts | Hub Token 발급 (services[] 포함), 검증 성공/실패, 만료 토큰 |
| sso-routes.test.ts | 4 endpoints CRUD, Org 서비스 활성화/비활성화 |
| auth.test.ts (기존) | 기존 login/signup/refresh가 깨지지 않는지 회귀 |

---

## 2. F109 — API BFF 프록시

### 2.1 Service Bindings 설정

```toml
# packages/api/wrangler.toml — 추가
[[services]]
binding = "DX_WORKER"
service = "discovery-x-radar-worker"  # Discovery-X의 메인 Worker 이름
environment = "production"

[[services]]
binding = "AIF_WORKER"
service = "ai-foundry-svc-gateway"  # AI Foundry의 게이트웨이 Worker 이름
environment = "production"
```

> ⚠️ **주의**: Discovery-X와 AI Foundry의 정확한 Worker 이름은 각 프로젝트의 wrangler.toml에서 확인 필요.
> Service Bindings가 불가능하면 `fetch()` 직접 호출로 폴백.

### 2.2 Env 타입 확장

```typescript
// packages/api/src/env.ts
export type Env = {
  DB: D1Database;
  GITHUB_TOKEN: string;
  JWT_SECRET: string;
  GITHUB_REPO: string;
  CACHE: KVNamespace;
  AI: Ai;
  ANTHROPIC_API_KEY?: string;
  WEBHOOK_SECRET?: string;
  SENTRY_DSN?: string;
  // ── Sprint 26 Service Bindings ──
  DX_WORKER?: Fetcher;   // Discovery-X Worker
  AIF_WORKER?: Fetcher;  // AI Foundry Worker
  DX_API_URL?: string;   // 폴백: Discovery-X API URL (Service Bindings 미사용 시)
  AIF_API_URL?: string;  // 폴백: AI Foundry API URL
};
```

### 2.3 BFF 프록시 서비스

```typescript
// packages/api/src/services/service-proxy.ts

export class ServiceProxy {
  constructor(private env: Env) {}

  async forward(
    service: "dx" | "aif",
    path: string,
    request: Request,
    hubToken: string,
  ): Promise<Response> {
    const binding = service === "dx" ? this.env.DX_WORKER : this.env.AIF_WORKER;
    const fallbackUrl = service === "dx" ? this.env.DX_API_URL : this.env.AIF_API_URL;

    const targetUrl = `/${path}`;
    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${hubToken}`);
    headers.set("X-Forwarded-From", "foundry-x-bff");

    const init: RequestInit = {
      method: request.method,
      headers,
      body: request.method !== "GET" ? request.body : undefined,
    };

    if (binding) {
      // Service Binding (zero-latency, same-account)
      return binding.fetch(new Request(targetUrl, init));
    }

    if (fallbackUrl) {
      // HTTP fetch 폴백
      return fetch(`${fallbackUrl}${targetUrl}`, init);
    }

    return new Response(JSON.stringify({ error: "Service not configured" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

### 2.4 BFF 프록시 라우트

```typescript
// packages/api/src/routes/proxy.ts

const proxyRoute = new OpenAPIHono<{ Bindings: Env }>();

// /api/dx/* → Discovery-X
proxyRoute.all("/dx/*", async (c) => {
  const hubToken = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!hubToken) return c.json({ error: "Hub token required" }, 401);

  // Hub Token 검증 (services에 discovery-x 포함 확인)
  const payload = await verifyHubToken(hubToken, c.env.JWT_SECRET);
  if (!payload?.services?.some(s => s.id === "discovery-x")) {
    return c.json({ error: "Access to discovery-x not granted" }, 403);
  }

  const path = c.req.path.replace("/api/dx", "");
  const proxy = new ServiceProxy(c.env);
  return proxy.forward("dx", path, c.req.raw, hubToken);
});

// /api/aif/* → AI Foundry
proxyRoute.all("/aif/*", async (c) => {
  const hubToken = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!hubToken) return c.json({ error: "Hub token required" }, 401);

  const payload = await verifyHubToken(hubToken, c.env.JWT_SECRET);
  if (!payload?.services?.some(s => s.id === "ai-foundry")) {
    return c.json({ error: "Access to ai-foundry not granted" }, 403);
  }

  const path = c.req.path.replace("/api/aif", "");
  const proxy = new ServiceProxy(c.env);
  return proxy.forward("aif", path, c.req.raw, hubToken);
});
```

### 2.5 파일 변경 목록

| 파일 | 변경 | 신규/수정 |
|------|------|:---------:|
| `packages/api/wrangler.toml` | [[services]] 바인딩 2개 추가 | 수정 |
| `packages/api/src/env.ts` | Env에 DX_WORKER, AIF_WORKER, *_URL 추가 | 수정 |
| `packages/api/src/services/service-proxy.ts` | ServiceProxy 클래스 | **신규** |
| `packages/api/src/routes/proxy.ts` | BFF 프록시 라우트 (/dx/*, /aif/*) | **신규** |
| `packages/api/src/app.ts` | proxyRoute 등록, PUBLIC_PATHS에 /api/dx/*, /api/aif/* 조건부 추가 | 수정 |

### 2.6 테스트 계획

| 테스트 | 검증 항목 |
|--------|-----------|
| service-proxy.test.ts | forward() Service Binding 성공, 폴백 URL 성공, 미설정 시 502 |
| proxy-routes.test.ts | /dx/* 프록시 동작, /aif/* 프록시 동작, Hub Token 검증 실패 시 401/403 |

---

## 3. F106 — 프론트엔드 통합

### 3.1 통합 전략: iframe + postMessage SSO

`output: "export"` 제약으로 인해 Next.js rewrites를 프로덕션에서 사용할 수 없으므로,
**iframe 임베드 + postMessage SSO 토큰 전달** 방식을 채택한다.

```
┌─────────────────────────────────────────────────┐
│  fx.minu.best/discovery                         │
│  ┌────────────────────────────────────────────┐ │
│  │  Sidebar  │  iframe src="dx.minu.best"     │ │
│  │  (FX)     │  ┌──────────────────────────┐  │ │
│  │           │  │  Discovery-X (Remix)     │  │ │
│  │  ★ FX     │  │  Hub Token via           │  │ │
│  │  ☆ DX     │  │  postMessage → session   │  │ │
│  │  ☆ AIF    │  │                          │  │ │
│  │           │  └──────────────────────────┘  │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 3.2 서비스 컨테이너 컴포넌트

```typescript
// packages/web/src/components/feature/ServiceContainer.tsx

"use client";

import { useEffect, useRef } from "react";

interface ServiceContainerProps {
  serviceUrl: string;
  serviceId: string;
  title: string;
}

export function ServiceContainer({ serviceUrl, serviceId, title }: ServiceContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Hub Token을 iframe에 postMessage로 전달
    const hubToken = localStorage.getItem("hubToken");
    if (iframeRef.current && hubToken) {
      const sendToken = () => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "FX_SSO_TOKEN", token: hubToken, serviceId },
          serviceUrl,
        );
      };
      // iframe 로드 완료 후 전달
      iframeRef.current.addEventListener("load", sendToken);
      return () => iframeRef.current?.removeEventListener("load", sendToken);
    }
  }, [serviceUrl, serviceId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 items-center border-b px-4">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <a
          href={serviceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          새 탭에서 열기 ↗
        </a>
      </div>
      <iframe
        ref={iframeRef}
        src={serviceUrl}
        className="flex-1 border-0"
        allow="clipboard-write"
        title={title}
      />
    </div>
  );
}
```

### 3.3 서브 라우트 페이지

```typescript
// packages/web/src/app/(app)/discovery/page.tsx
import { ServiceContainer } from "@/components/feature/ServiceContainer";

export default function DiscoveryPage() {
  return (
    <ServiceContainer
      serviceUrl="https://dx.minu.best"
      serviceId="discovery-x"
      title="Discovery-X — Research & Experimentation"
    />
  );
}

// packages/web/src/app/(app)/foundry/page.tsx
import { ServiceContainer } from "@/components/feature/ServiceContainer";

export default function FoundryPage() {
  return (
    <ServiceContainer
      serviceUrl="https://aif.ktds-axbd.workers.dev"
      serviceId="ai-foundry"
      title="AI Foundry — Knowledge Extraction"
    />
  );
}
```

### 3.4 Sidebar 서비스 스위처 확장

현재 `sidebar.tsx`의 `navItems` 배열을 서비스 그룹으로 분리:

```typescript
// packages/web/src/components/sidebar.tsx — 변경 부분

const fxNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wiki", label: "Wiki", icon: BookOpen },
  { href: "/architecture", label: "Architecture", icon: Blocks },
  { href: "/workspace", label: "Workspace", icon: FolderKanban },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/tokens", label: "Tokens", icon: Coins },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/workflows", label: "Workflows", icon: Blocks },
];

const serviceNavItems = [
  { href: "/discovery", label: "Discovery-X", icon: Search, external: true },
  { href: "/foundry", label: "AI Foundry", icon: FlaskConical, external: true },
];

// NavLinks에서 두 그룹을 구분자와 함께 렌더링:
// ── Foundry-X ──
// [FX nav items]
// ── Services ──
// [service nav items]
```

### 3.5 파일 변경 목록

| 파일 | 변경 | 신규/수정 |
|------|------|:---------:|
| `packages/web/src/components/feature/ServiceContainer.tsx` | iframe + postMessage SSO 컨테이너 | **신규** |
| `packages/web/src/app/(app)/discovery/page.tsx` | Discovery-X 임베드 페이지 | **신규** |
| `packages/web/src/app/(app)/foundry/page.tsx` | AI Foundry 임베드 페이지 | **신규** |
| `packages/web/src/components/sidebar.tsx` | navItems 그룹 분리 + 서비스 섹션 추가 | 수정 |
| `packages/web/src/lib/api-client.ts` | fetchHubToken(), 서비스 관리 API 함수 | 수정 |

### 3.6 테스트 계획

| 테스트 | 검증 항목 |
|--------|-----------|
| ServiceContainer.test.tsx | 렌더링, iframe src 설정, postMessage 호출 |
| discovery/page.test.tsx | 페이지 렌더링, ServiceContainer props |
| sidebar.test.tsx (기존 수정) | 서비스 네비게이션 항목 렌더링 |
| E2E: service-integration.spec.ts | /discovery, /foundry 페이지 로드 + iframe 표시 |

---

## 4. F111 — D1 스키마 통합

### 4.1 테이블 설계

§1.2의 `0017_sso_and_entities.sql`에 포함 (service_entities + entity_links).

### 4.2 EntityRegistry 서비스

```typescript
// packages/api/src/services/entity-registry.ts

export class EntityRegistry {
  constructor(private db: D1Database) {}

  // 엔티티 등록 (외부 서비스 웹훅에서 호출)
  async register(entity: {
    serviceId: string;
    entityType: string;
    externalId: string;
    title: string;
    status?: string;
    metadata?: Record<string, unknown>;
    orgId: string;
  }): Promise<ServiceEntity> { /* ... */ }

  // 크로스 서비스 엔티티 검색
  async search(params: {
    orgId: string;
    serviceId?: string;
    entityType?: string;
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ServiceEntity[]; total: number }> { /* ... */ }

  // 엔티티 간 링크 생성
  async link(params: {
    sourceId: string;
    targetId: string;
    linkType: "derived_from" | "triggers" | "produces" | "references";
    metadata?: Record<string, unknown>;
  }): Promise<EntityLink> { /* ... */ }

  // 관계 그래프 조회 (depth 제한)
  async getGraph(entityId: string, depth: number = 2): Promise<{
    nodes: ServiceEntity[];
    edges: EntityLink[];
  }> { /* ... */ }

  // 벌크 동기화 (서비스별 최신 엔티티 일괄 갱신)
  async bulkSync(
    serviceId: string,
    entities: Array<{ externalId: string; title: string; status?: string; metadata?: Record<string, unknown> }>,
    orgId: string,
  ): Promise<{ created: number; updated: number }> { /* ... */ }
}
```

### 4.3 엔티티 동기화 서비스

```typescript
// packages/api/src/services/entity-sync.ts

export class EntitySyncService {
  constructor(
    private registry: EntityRegistry,
    private proxy: ServiceProxy,
    private env: Env,
  ) {}

  // Discovery-X 이벤트 → 엔티티 등록
  async handleDiscoveryEvent(event: {
    type: "discovery.created" | "experiment.completed" | "signal.detected";
    data: { id: string; title: string; status: string; metadata?: Record<string, unknown> };
    orgId: string;
  }): Promise<void> { /* ... */ }

  // AI Foundry 이벤트 → 엔티티 등록
  async handleFoundryEvent(event: {
    type: "skill.generated" | "policy.approved" | "document.ingested";
    data: { id: string; title: string; status: string; metadata?: Record<string, unknown> };
    orgId: string;
  }): Promise<void> { /* ... */ }

  // 자동 링크 추론 (같은 도메인의 엔티티 간 관계 자동 생성)
  async inferLinks(entityId: string): Promise<EntityLink[]> { /* ... */ }
}
```

### 4.4 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/entities` | 크로스 서비스 엔티티 검색 (쿼리, 필터) |
| POST | `/api/entities` | 엔티티 등록 (웹훅 연동) |
| GET | `/api/entities/:id/graph` | 관계 그래프 조회 |
| POST | `/api/entities/link` | 엔티티 간 링크 생성 |
| POST | `/api/entities/sync` | 벌크 동기화 (서비스별) |

### 4.5 파일 변경 목록

| 파일 | 변경 | 신규/수정 |
|------|------|:---------:|
| `packages/api/src/services/entity-registry.ts` | EntityRegistry 서비스 | **신규** |
| `packages/api/src/services/entity-sync.ts` | EntitySyncService | **신규** |
| `packages/api/src/routes/entities.ts` | 5 endpoints | **신규** |
| `packages/api/src/schemas/entity.ts` | Zod 스키마 | **신규** |

### 4.6 테스트 계획

| 테스트 | 검증 항목 |
|--------|-----------|
| entity-registry.test.ts | register, search, link, getGraph, bulkSync |
| entity-sync.test.ts | DX 이벤트 처리, AIF 이벤트 처리, 자동 링크 |
| entities-routes.test.ts | 5 endpoints CRUD, 권한 체크 |

---

## 5. 구현 순서 (Implementation Order)

```
Step 1: DB + 공유 타입 (기반)
├── 1-1. 0017_sso_and_entities.sql 작성 + 로컬 적용
├── 1-2. packages/shared/src/sso.ts 공유 타입
├── 1-3. packages/api/src/env.ts 확장
└── 1-4. mock-d1에 신규 테이블 추가

Step 2: F108 SSO (인증)
├── 2-1. schemas/sso.ts Zod 스키마
├── 2-2. middleware/auth.ts JwtPayload 확장 + createHubToken()
├── 2-3. services/sso.ts SsoService
├── 2-4. routes/sso.ts 4 endpoints
├── 2-5. app.ts에 ssoRoute 등록
└── 2-6. sso.test.ts + sso-routes.test.ts

Step 3: F109 BFF (프록시)
├── 3-1. wrangler.toml Service Bindings 추가
├── 3-2. services/service-proxy.ts
├── 3-3. routes/proxy.ts BFF 라우트
├── 3-4. app.ts에 proxyRoute 등록
└── 3-5. service-proxy.test.ts + proxy-routes.test.ts

Step 4: F106 프론트엔드 (UI)
├── 4-1. components/feature/ServiceContainer.tsx
├── 4-2. app/(app)/discovery/page.tsx
├── 4-3. app/(app)/foundry/page.tsx
├── 4-4. components/sidebar.tsx 서비스 스위처
├── 4-5. lib/api-client.ts SSO API 함수
└── 4-6. 테스트 + E2E

Step 5: F111 D1 스키마 (데이터)
├── 5-1. services/entity-registry.ts
├── 5-2. services/entity-sync.ts
├── 5-3. schemas/entity.ts
├── 5-4. routes/entities.ts 5 endpoints
├── 5-5. app.ts에 entitiesRoute 등록
└── 5-6. 테스트

Step 6: 통합 검증 + 배포
├── 6-1. typecheck 0 에러
├── 6-2. 전체 테스트 pass
├── 6-3. D1 migration 0017 remote 적용
├── 6-4. Workers 배포 (v2.1)
└── 6-5. Pages 배포 + 크로스 서비스 검증
```

---

## 6. 신규 파일 요약

| # | 파일 | 타입 |
|:-:|------|------|
| 1 | `packages/api/src/db/migrations/0017_sso_and_entities.sql` | SQL |
| 2 | `packages/shared/src/sso.ts` | TypeScript |
| 3 | `packages/api/src/schemas/sso.ts` | TypeScript |
| 4 | `packages/api/src/services/sso.ts` | TypeScript |
| 5 | `packages/api/src/routes/sso.ts` | TypeScript |
| 6 | `packages/api/src/services/service-proxy.ts` | TypeScript |
| 7 | `packages/api/src/routes/proxy.ts` | TypeScript |
| 8 | `packages/web/src/components/feature/ServiceContainer.tsx` | React |
| 9 | `packages/web/src/app/(app)/discovery/page.tsx` | React |
| 10 | `packages/web/src/app/(app)/foundry/page.tsx` | React |
| 11 | `packages/api/src/services/entity-registry.ts` | TypeScript |
| 12 | `packages/api/src/services/entity-sync.ts` | TypeScript |
| 13 | `packages/api/src/schemas/entity.ts` | TypeScript |
| 14 | `packages/api/src/routes/entities.ts` | TypeScript |

**수정 파일**: 5개
- `packages/api/src/middleware/auth.ts` — JwtPayload 확장
- `packages/api/src/env.ts` — Service Bindings 타입
- `packages/api/src/app.ts` — 신규 라우트 등록
- `packages/api/wrangler.toml` — Service Bindings
- `packages/web/src/components/sidebar.tsx` — 서비스 네비게이션

**총**: 신규 14 + 수정 5 = **19개 파일**

---

## 7. 리스크 대응 상세

| 리스크 | 대응 전략 |
|--------|-----------|
| iframe CSP 차단 | Discovery-X/AI Foundry의 `X-Frame-Options` 헤더 제거 또는 `ALLOW-FROM fx.minu.best` 설정. 각 서비스의 wrangler.toml 또는 미들웨어에서 설정 |
| Service Bindings Worker 이름 불일치 | 각 프로젝트의 wrangler.toml에서 정확한 name 확인. 불일치 시 `*_API_URL` 환경변수로 HTTP 폴백 |
| postMessage 보안 | origin 검증 필수: `event.origin === "https://fx.minu.best"`. 토큰은 일회용 교환 토큰으로 전환 검토 |
| JWT_SECRET 공유 | 동일 Cloudflare 계정이므로 `wrangler secret put JWT_SECRET`를 각 Worker에 동일하게 설정 |
| D1 eventual consistency | service_entities는 캐시 성격이므로 최신성 보장 불필요. synced_at으로 최신 여부 표시 |
