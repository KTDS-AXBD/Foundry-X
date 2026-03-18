---
code: FX-DSGN-016
title: "Phase 3 멀티테넌시 설계 — 조직 단위 데이터 격리 + 테넌트 관리"
version: 0.1
status: Draft
category: DSGN
system-version: 1.2.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Phase 3 멀티테넌시 설계

> FX-DSGN-016 · v0.1 · Draft
> 참조: [[FX-SPEC-001]] PRD v4 Phase 3, [[FX-DSGN-012]] MCP 프로토콜 설계

---

## 1. Overview

### 1.1 Phase 3 목표

Foundry-X를 **조직 단위 멀티테넌시 SaaS**로 전환해요. 여러 조직(팀/회사)이 동일 인스턴스를 공유하면서도 **데이터 격리**를 보장하고, 조직별 설정·권한·과금 기반을 마련하는 것이 핵심 목표예요.

### 1.2 현재 상태 (Phase 2, v1.2.0)

| 항목 | 현재 값 |
|------|---------|
| 테넌시 | 단일 테넌트 (모든 데이터가 한 공간) |
| D1 테이블 | 15개 (0001~0008 마이그레이션) |
| 인증 | JWT (Access 1h / Refresh 7d) + PBKDF2 |
| RBAC | 3등급 — admin / member / viewer (글로벌) |
| API | 50 endpoints (Hono + Cloudflare Workers) |
| 테스트 | 429 (CLI 106 + API 278 + Web 45) + E2E 20 |

### 1.3 Phase 3에서 해결할 문제

1. **데이터 격리**: 조직 A의 프로젝트·위키·에이전트 세션이 조직 B에 노출되면 안 돼요
2. **권한 분리**: 글로벌 admin/member/viewer → 조직별 owner/admin/member/viewer로 세분화
3. **에이전트 범위 제한**: 에이전트가 자기 조직 밖의 리포지토리·MCP 서버에 접근 불가
4. **과금 기반**: 조직별 토큰 사용량 집계 → 플랜별 한도 적용 (Phase 3+)

---

## 2. 테넌시 모델 비교

| 모델 | 격리 수준 | D1 호환 | 비용 | 운영 복잡도 | 마이그레이션 난이도 |
|------|:---------:|:-------:|:----:|:-----------:|:------------------:|
| **Database-per-tenant** | ★★★★★ | ⚠️ D1당 하나 가능하나 Workers 바인딩 동적 불가 | 높음 | 높음 (N개 DB 관리) | 높음 |
| **Schema-per-tenant** | ★★★★ | ❌ SQLite는 스키마 분리 미지원 | 중간 | 중간 | N/A |
| **Row-level isolation** | ★★★ | ✅ 모든 테이블에 `org_id` 컬럼 | 낮음 | 낮음 (단일 DB) | 낮음 |

### 결정: Row-level Isolation + 애플리케이션 레벨 RLS

**선택 근거:**

1. **D1 제약**: Cloudflare D1은 SQLite 기반이라 스키마 분리가 불가능하고, Workers 바인딩이 정적이라 런타임에 DB를 동적 선택할 수 없어요
2. **비용 효율**: 단일 D1 데이터베이스로 운영하면 Cloudflare 무료/프로 플랜 안에서 충분해요
3. **마이그레이션 용이**: 기존 15 테이블에 `org_id` 컬럼만 추가하면 되고, 기존 데이터는 `default` org에 귀속
4. **격리 보완**: SQLite에는 네이티브 RLS가 없으므로, **Hono 미들웨어**에서 모든 D1 쿼리에 `WHERE org_id = ?`를 강제하는 애플리케이션 레벨 RLS를 구현해요

> ⚠️ **Phase 4 재검토**: 테넌트 100개 이상 또는 데이터 1GB 초과 시 PostgreSQL(Hyperdrive) 전환 검토

---

## 3. 데이터 모델 변경

### 3.1 신규 테이블

#### organizations

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'pro', 'enterprise')),
  settings TEXT NOT NULL DEFAULT '{}',  -- JSON: {maxProjects, maxAgents, tokenLimit}
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_org_slug ON organizations(slug);
```

#### org_members

```sql
CREATE TABLE org_members (
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by TEXT REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);
```

### 3.2 기존 테이블 변경 — org_id FK 추가

`org_id` 컬럼을 추가해야 하는 테이블 (11개):

| 테이블 | org_id 추가 | 비고 |
|--------|:-----------:|------|
| `projects` | ✅ | 프로젝트는 조직 소속 |
| `wiki_pages` | ✅ | project 경유 간접 격리도 가능하나, 직접 FK로 쿼리 성능 확보 |
| `agent_sessions` | ✅ | 에이전트 세션은 조직 범위 |
| `agent_tasks` | ✅ | 세션 경유 간접 가능하나 직접 쿼리 빈번 |
| `token_usage` | ✅ | 조직별 과금 집계 핵심 |
| `mcp_servers` | ✅ | MCP 서버 등록은 조직 단위 |
| `agent_prs` | ✅ | PR 추적은 조직 범위 |
| `merge_queue` | ✅ | 머지 큐는 조직별 독립 |
| `parallel_executions` | ✅ | 병렬 실행 조직 격리 |
| `spec_conflicts` | ✅ | 스펙 충돌은 조직 내부 |
| `mcp_sampling_log` | ✅ | 샘플링 로그 조직별 집계 |

**변경 불필요 테이블 (4개):**

| 테이블 | 이유 |
|--------|------|
| `users` | 유저는 여러 조직에 소속 가능 (N:M via `org_members`) |
| `refresh_tokens` | 유저 단위, 조직과 무관 |
| `agents` | 에이전트 정의는 글로벌 (조직별 인스턴스는 `agent_sessions`로 구분) |
| `agent_constraints` | 제약 정책은 시스템 전역 (조직별 커스텀은 `org_agent_constraints` 신규 검토, Phase 3+) |

### 3.3 ALTER 문 예시

```sql
-- 기존 테이블에 org_id 추가 (DEFAULT로 하위 호환)
ALTER TABLE projects ADD COLUMN org_id TEXT NOT NULL DEFAULT 'default' REFERENCES organizations(id);
ALTER TABLE wiki_pages ADD COLUMN org_id TEXT NOT NULL DEFAULT 'default' REFERENCES organizations(id);
ALTER TABLE agent_sessions ADD COLUMN org_id TEXT NOT NULL DEFAULT 'default' REFERENCES organizations(id);
ALTER TABLE agent_tasks ADD COLUMN org_id TEXT NOT NULL DEFAULT 'default' REFERENCES organizations(id);
ALTER TABLE token_usage ADD COLUMN org_id TEXT NOT NULL DEFAULT 'default' REFERENCES organizations(id);
ALTER TABLE mcp_servers ADD COLUMN org_id TEXT NOT NULL DEFAULT 'default' REFERENCES organizations(id);
ALTER TABLE agent_prs ADD COLUMN org_id TEXT NOT NULL DEFAULT 'default' REFERENCES organizations(id);
ALTER TABLE merge_queue ADD COLUMN org_id TEXT NOT NULL DEFAULT 'default' REFERENCES organizations(id);
ALTER TABLE parallel_executions ADD COLUMN org_id TEXT NOT NULL DEFAULT 'default' REFERENCES organizations(id);
ALTER TABLE spec_conflicts ADD COLUMN org_id TEXT NOT NULL DEFAULT 'default' REFERENCES organizations(id);
ALTER TABLE mcp_sampling_log ADD COLUMN org_id TEXT NOT NULL DEFAULT 'default' REFERENCES organizations(id);

-- 인덱스 추가 (org_id 기반 쿼리 최적화)
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_wiki_org ON wiki_pages(org_id);
CREATE INDEX idx_agent_sessions_org ON agent_sessions(org_id);
CREATE INDEX idx_agent_tasks_org ON agent_tasks(org_id);
CREATE INDEX idx_token_usage_org ON token_usage(org_id);
CREATE INDEX idx_mcp_servers_org ON mcp_servers(org_id);
CREATE INDEX idx_agent_prs_org ON agent_prs(org_id);
CREATE INDEX idx_merge_queue_org ON merge_queue(org_id);
CREATE INDEX idx_parallel_exec_org ON parallel_executions(org_id);
CREATE INDEX idx_spec_conflicts_org ON spec_conflicts(org_id);
CREATE INDEX idx_mcp_sampling_org ON mcp_sampling_log(org_id);
```

### 3.4 ERD 관계 (텍스트)

```
organizations 1──N org_members N──1 users
     │
     ├──N projects
     │       ├──N wiki_pages
     │       └──N token_usage
     ├──N agent_sessions
     │       └──N agent_tasks
     │               └──N agent_prs
     │                       └──N merge_queue
     ├──N mcp_servers
     │       └──N mcp_sampling_log
     ├──N parallel_executions
     └──N spec_conflicts
```

---

## 4. 인증/인가 확장

### 4.1 JWT 페이로드 변경

**현재 (Phase 2):**

```typescript
interface JwtPayload {
  sub: string;     // user ID
  email: string;
  role: "admin" | "member" | "viewer";  // 글로벌 역할
  iat: number;
  exp: number;
  jti?: string;
}
```

**Phase 3:**

```typescript
interface JwtPayload {
  sub: string;     // user ID
  email: string;
  role: "admin" | "member" | "viewer";  // 글로벌 역할 (유지, 시스템 관리용)
  orgId: string;   // 현재 활성 조직 ID
  orgRole: "owner" | "admin" | "member" | "viewer";  // 조직 내 역할
  iat: number;
  exp: number;
  jti?: string;
}
```

> **멀티 org 전환**: 유저가 다른 조직으로 전환하면 `POST /auth/switch-org` → 새 JWT 발급 (orgId, orgRole 변경)

### 4.2 RBAC 확장

#### 글로벌 역할 (기존 유지)

| 역할 | 용도 |
|------|------|
| `admin` | 시스템 전역 관리 (모든 조직 조회, 시스템 설정) |
| `member` | 일반 사용자 (조직 생성 가능) |
| `viewer` | 읽기 전용 (시스템 대시보드만) |

#### 조직 역할 (신규)

| orgRole | 조직 설정 | 멤버 관리 | 프로젝트 생성 | 에이전트 실행 | 읽기 |
|---------|:---------:|:---------:|:------------:|:------------:|:----:|
| `owner` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `member` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `viewer` | ❌ | ❌ | ❌ | ❌ | ✅ |

> **owner vs admin**: owner만 조직 삭제·플랜 변경·소유권 이전 가능. 조직 생성자가 자동으로 owner.

### 4.3 API 미들웨어 확장

```typescript
// middleware/org-guard.ts — 조직 격리 미들웨어
export const orgGuard: MiddlewareHandler = async (c, next) => {
  const payload = c.get("jwtPayload") as JwtPayload;

  // 글로벌 admin은 X-Org-Id 헤더로 org 지정 가능
  const orgId = payload.role === "admin"
    ? (c.req.header("X-Org-Id") ?? payload.orgId)
    : payload.orgId;

  if (!orgId) {
    return c.json({ error: "Organization context required" }, 403);
  }

  // 컨텍스트에 orgId 주입 → 이후 모든 서비스에서 사용
  c.set("orgId", orgId);
  c.set("orgRole", payload.orgRole);

  await next();
};
```

### 4.4 에이전트 서비스 계정

```sql
-- 조직별 API Key (에이전트·CI/CD용)
CREATE TABLE org_api_keys (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,  -- PBKDF2 해시
  scopes TEXT NOT NULL DEFAULT '["agent:execute","project:read"]',  -- JSON array
  last_used_at TEXT,
  expires_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

> API Key 인증 시 JWT 대신 `Authorization: Bearer fx_org_...` → 미들웨어에서 `org_api_keys` 조회 → orgId 추출

---

## 5. API 변경

### 5.1 기존 엔드포인트 변경 (50개)

모든 D1 쿼리에 `WHERE org_id = ?` 조건 추가:

```typescript
// Before (Phase 2)
const projects = await db.prepare("SELECT * FROM projects WHERE owner_id = ?").bind(userId).all();

// After (Phase 3)
const orgId = c.get("orgId");
const projects = await db.prepare("SELECT * FROM projects WHERE org_id = ? AND owner_id = ?").bind(orgId, userId).all();
```

**변경 패턴 요약:**

| 라우트 파일 | 영향 엔드포인트 수 | 변경 내용 |
|------------|:-----------------:|----------|
| `routes/spec.ts` | 4 | org_id 필터 추가 |
| `routes/agent.ts` | 8 | org_id 필터 + 에이전트 범위 제한 |
| `routes/webhook.ts` | 3 | org_id 매핑 (repo URL → org) |
| `routes/wiki.ts` | 5 | org_id 필터 |
| `routes/token.ts` | 3 | org_id 기반 과금 집계 |
| `routes/mcp.ts` | 10 | org_id 필터 (서버·리소스·도구) |
| `routes/profile.ts` | 2 | 유저 프로필 + org 목록 |
| `routes/health.ts` | 2 | org별 건강도 |
| `routes/freshness.ts` | 2 | org 필터 |
| `routes/integrity.ts` | 2 | org 필터 |
| `routes/requirements.ts` | 3 | org 필터 |

### 5.2 신규 엔드포인트

| 메서드 | 경로 | 설명 | orgRole 요구 |
|--------|------|------|:------------:|
| `POST` | `/orgs` | 조직 생성 | (글로벌 member+) |
| `GET` | `/orgs` | 내 조직 목록 | - |
| `GET` | `/orgs/:orgId` | 조직 상세 | viewer+ |
| `PATCH` | `/orgs/:orgId` | 조직 설정 수정 | admin+ |
| `DELETE` | `/orgs/:orgId` | 조직 삭제 | owner |
| `GET` | `/orgs/:orgId/members` | 멤버 목록 | viewer+ |
| `POST` | `/orgs/:orgId/invite` | 멤버 초대 | admin+ |
| `PATCH` | `/orgs/:orgId/members/:userId` | 역할 변경 | admin+ |
| `DELETE` | `/orgs/:orgId/members/:userId` | 멤버 제거 | admin+ |
| `POST` | `/auth/switch-org` | 조직 전환 (JWT 재발급) | - |
| `POST` | `/orgs/:orgId/api-keys` | API Key 생성 | admin+ |
| `GET` | `/orgs/:orgId/api-keys` | API Key 목록 | admin+ |
| `DELETE` | `/orgs/:orgId/api-keys/:keyId` | API Key 삭제 | admin+ |

### 5.3 마이그레이션 전략 (기존 데이터)

```sql
-- 1. default 조직 생성
INSERT INTO organizations (id, name, slug, plan) VALUES ('default', 'Default Organization', 'default', 'free');

-- 2. 기존 유저를 default 조직의 멤버로 등록 (기존 role 매핑)
INSERT INTO org_members (org_id, user_id, role)
SELECT 'default', id, CASE
  WHEN role = 'admin' THEN 'owner'
  ELSE role
END FROM users;

-- 3. 기존 데이터의 org_id는 ALTER 시 DEFAULT 'default'로 자동 설정
```

---

## 6. 마이그레이션 계획

4단계 점진적 마이그레이션:

### Stage 1: 테이블 생성 (Sprint 15-A)

```
0009_multitenancy_tables.sql
├── organizations 테이블 생성
├── org_members 테이블 생성
├── org_api_keys 테이블 생성
└── default 조직 시드 데이터
```

- 기존 기능에 영향 없음 (신규 테이블만 추가)
- 배포 후 smoke test: 기존 50 엔드포인트 정상 동작 확인

### Stage 2: org_id 컬럼 추가 (Sprint 15-B)

```
0010_add_org_id.sql
├── 11개 테이블에 org_id 컬럼 추가 (DEFAULT 'default')
├── 기존 유저 → default org_members 마이그레이션
└── org_id 인덱스 생성
```

- `DEFAULT 'default'`로 기존 데이터 자동 귀속
- 아직 미들웨어는 적용하지 않음 → 기존 API 동작 유지

### Stage 3: 미들웨어 + API 적용 (Sprint 16)

```
코드 변경:
├── middleware/org-guard.ts 추가
├── 50개 기존 엔드포인트에 org_id 필터 적용
├── 신규 /orgs 엔드포인트 구현 (13개)
├── JWT 페이로드 확장 (orgId, orgRole)
└── auth/switch-org 엔드포인트
```

- Feature flag `MULTITENANCY_ENABLED=true`로 점진 적용
- 기존 JWT(orgId 없음)는 `default` org으로 자동 매핑 (하위 호환)

### Stage 4: 초대/가입 플로우 (Sprint 17)

```
├── 이메일 초대 (KV 기반 초대 토큰)
├── 초대 수락 → org_members 생성
├── 대시보드 org 전환 UI
├── org 설정 페이지
└── API Key 관리 UI
```

---

## 7. 보안 고려사항

### 7.1 Cross-tenant 접근 방지

| 방어 계층 | 구현 방식 |
|-----------|----------|
| **Layer 1: JWT** | `orgId`가 토큰에 포함 → 위변조 불가 |
| **Layer 2: Middleware** | `orgGuard`가 모든 비-public 라우트에 적용, `c.set("orgId")` 주입 |
| **Layer 3: Query** | 모든 D1 쿼리에 `WHERE org_id = c.get("orgId")` 필수 |
| **Layer 4: Test** | 크로스테넌트 접근 시도 테스트 (org-A 토큰으로 org-B 데이터 접근 → 403) |

> **누락 방지 전략**: 서비스 함수 시그니처에 `orgId: string`을 첫 번째 파라미터로 강제. `orgId` 없이 호출하면 TypeScript 컴파일 에러.

### 7.2 에이전트 작업 org 범위 제한

```typescript
// agent-orchestrator.ts 변경
async executeTask(orgId: string, request: AgentExecutionRequest) {
  // 1. 에이전트가 접근하는 repo가 org 소속인지 확인
  const project = await this.getProject(orgId, request.projectId);
  if (!project) throw new ForbiddenError("Project not in organization");

  // 2. MCP 서버도 org 범위 확인
  if (request.mcpServerId) {
    const server = await this.getMcpServer(orgId, request.mcpServerId);
    if (!server) throw new ForbiddenError("MCP server not in organization");
  }

  // 3. 실행 기록에 org_id 포함
  await this.createTask({ ...request, orgId });
}
```

### 7.3 SSE 이벤트 org 필터링

```typescript
// sse-manager.ts 변경
broadcast(orgId: string, event: SSEEvent) {
  // org_id가 일치하는 연결에만 이벤트 전송
  for (const [connId, conn] of this.connections) {
    if (conn.orgId === orgId) {
      conn.stream.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  }
}
```

### 7.4 추가 보안 점검 항목

- [ ] 조직 slug에 XSS 방지 (영숫자 + 하이픈만 허용, `^[a-z0-9-]{3,40}$`)
- [ ] API Key는 `fx_org_` 접두사 + 32바이트 랜덤 → DB에는 PBKDF2 해시만 저장
- [ ] 조직 삭제 시 cascade 범위 확인 (orphan 데이터 방지)
- [ ] Rate limiting: org별 API 호출 한도 (플랜별 차등)

---

## 8. 제약사항 및 결정 사항

### 8.1 D1/SQLite 한계

| 한계 | 영향 | 대응 |
|------|------|------|
| 네이티브 RLS 미지원 | 쿼리 레벨에서 누락 가능 | 미들웨어 + TypeScript 타입 강제 |
| 단일 파일 DB | 동시 쓰기 경합 | Workers 자동 직렬화 (D1 보장) |
| ALTER TABLE 제약 | NOT NULL + FK 동시 추가 불가한 경우 | DEFAULT 값 활용 |
| 데이터 크기 한계 | 무료 5GB, Pro 50GB | Phase 4 PostgreSQL 전환 검토 |

### 8.2 Cloudflare Workers 한계

| 한계 | 영향 | 대응 |
|------|------|------|
| 무상태 실행 | 매 요청마다 org 컨텍스트 재구성 | JWT에 orgId 포함 |
| CPU 시간 10~50ms | 복잡한 권한 체크 시 지연 | KV 캐시로 org 설정 캐싱 |
| 메모리 128MB | 대형 조직 목록 처리 | 페이지네이션 필수 |

### 8.3 현재 결정 사항

| 결정 | 상태 | 재검토 시점 |
|------|:----:|:----------:|
| Row-level isolation 선택 | ✅ 확정 | Phase 4 |
| PostgreSQL 전환 보류, D1 유지 | ✅ 확정 | 테넌트 100개 초과 시 |
| JWT에 orgId 포함 | ✅ 확정 | - |
| 글로벌 에이전트 정의 (org별 인스턴스) | ✅ 확정 | Phase 3+ |
| 조직별 커스텀 제약 정책 | ⏳ 보류 | Phase 3 후반 |
| 이메일 초대 (Cloudflare Email Workers) | ⏳ 보류 | Sprint 17 |

### 8.4 Phase 3 범위 외 (명시적 제외)

- SSO / SAML / OAuth 소셜 로그인 (Phase 4)
- 조직 간 프로젝트 공유 / 포크 (Phase 4)
- 조직별 커스텀 도메인 (Phase 5)
- 감사 로그 (audit log) (Phase 4)
- 결제/구독 연동 (Stripe 등) (Phase 4)

---

## 부록 A: 전체 테이블 목록 (Phase 3 후)

| # | 테이블 | 신규/변경 | org_id |
|---|--------|:---------:|:------:|
| 1 | `users` | 변경 없음 | ❌ |
| 2 | `refresh_tokens` | 변경 없음 | ❌ |
| 3 | `agents` | 변경 없음 | ❌ |
| 4 | `agent_constraints` | 변경 없음 | ❌ |
| 5 | `organizations` | **신규** | (PK) |
| 6 | `org_members` | **신규** | FK |
| 7 | `org_api_keys` | **신규** | FK |
| 8 | `projects` | 변경 | ✅ |
| 9 | `wiki_pages` | 변경 | ✅ |
| 10 | `agent_sessions` | 변경 | ✅ |
| 11 | `agent_tasks` | 변경 | ✅ |
| 12 | `token_usage` | 변경 | ✅ |
| 13 | `mcp_servers` | 변경 | ✅ |
| 14 | `agent_prs` | 변경 | ✅ |
| 15 | `merge_queue` | 변경 | ✅ |
| 16 | `parallel_executions` | 변경 | ✅ |
| 17 | `spec_conflicts` | 변경 | ✅ |
| 18 | `mcp_sampling_log` | 변경 | ✅ |

**합계: 18 테이블** (기존 15 + 신규 3)
