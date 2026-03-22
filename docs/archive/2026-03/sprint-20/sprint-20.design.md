---
code: FX-DSGN-021
title: Sprint 20 — 멀티테넌시 고도화 상세 설계
version: 1.0
status: Draft
category: DSGN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: F92
req: FX-REQ-092
plan: "[[FX-PLAN-023]]"
---

## §1 설계 개요

### 1.1 참조 문서

- Plan: [[FX-PLAN-023]] `docs/01-plan/features/sprint-20.plan.md`
- F83 Migration: `packages/api/src/db/migrations/0011_organizations.sql`, `0012_add_org_id.sql`
- 기존 미들웨어: `packages/api/src/middleware/tenant.ts`, `auth.ts`

### 1.2 구현 순서

```
Step 1: Shared Types (packages/shared)
  ↓
Step 2: Zod 스키마 + DB Migration 0013 (packages/api)
  ↓
Step 3: roleGuard 미들웨어 (packages/api)
  ↓
Step 4: OrgService (packages/api)
  ↓
Step 5: Org 라우트 + Auth switch-org (packages/api)
  ↓
Step 6: 서비스 필터링 보강 (packages/api)
  ↓
Step 7: API 테스트 (packages/api)
  ↓
Step 8: Web UI — api-client + store + 컴포넌트 (packages/web)
  ↓
Step 9: Web 테스트 (packages/web)
```

## §2 Step 1: Shared Types

### 2.1 파일: `packages/shared/src/types.ts` (수정)

기존 파일 끝에 org 관련 타입을 추가해요.

```typescript
// ─── Multi-tenancy Types (F92) ───

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export type OrgPlan = 'free' | 'pro' | 'enterprise';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  orgId: string;
  userId: string;
  email: string;       // users 테이블 JOIN
  name: string;        // users 테이블 JOIN
  role: OrgRole;
  joinedAt: string;
}

export interface OrgInvitation {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  token: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  invitedBy: string;
}

/** 역할 계층 — 숫자가 높을수록 상위 */
export const ORG_ROLE_HIERARCHY: Record<OrgRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};
```

## §3 Step 2: Zod 스키마 + DB Migration

### 3.1 파일: `packages/api/src/schemas/org.ts` (신규)

```typescript
import { z } from "@hono/zod-openapi";

// ─── Org CRUD ───

export const CreateOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
}).openapi("CreateOrg");

export const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z.record(z.unknown()).optional(),
}).openapi("UpdateOrg");

export const OrgParamsSchema = z.object({
  orgId: z.string().min(1),
}).openapi("OrgParams");

// ─── Members ───

export const MemberParamsSchema = z.object({
  orgId: z.string().min(1),
  userId: z.string().min(1),
}).openapi("MemberParams");

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]),
}).openapi("UpdateMemberRole");
// Note: owner는 role 변경 대상이 아니므로 제외

// ─── Invitations ───

export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
}).openapi("CreateInvitation");

export const InvitationTokenSchema = z.object({
  token: z.string().min(1),
}).openapi("InvitationToken");

// ─── Org 전환 ───

export const SwitchOrgSchema = z.object({
  orgId: z.string().min(1),
}).openapi("SwitchOrg");

// ─── Response Schemas ───

export const OrgResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  plan: z.enum(["free", "pro", "enterprise"]),
  settings: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi("OrgResponse");

export const OrgMemberResponseSchema = z.object({
  orgId: z.string(),
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(["owner", "admin", "member", "viewer"]),
  joinedAt: z.string(),
}).openapi("OrgMemberResponse");

export const OrgInvitationResponseSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  email: z.string(),
  role: z.enum(["admin", "member", "viewer"]),
  token: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
  acceptedAt: z.string().nullable(),
  invitedBy: z.string(),
}).openapi("OrgInvitationResponse");
```

### 3.2 파일: `packages/api/src/db/migrations/0013_org_invitations.sql` (신규)

```sql
-- Migration: 0013_org_invitations
-- Created: 2026-03-19
-- Description: F92 — 초대 테이블 + org_members invited_by 컬럼

CREATE TABLE IF NOT EXISTS org_invitations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member','viewer')),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT,
  invited_by TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_invitation_token ON org_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitation_org ON org_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitation_email ON org_invitations(email);
```

## §4 Step 3: roleGuard 미들웨어

### 4.1 파일: `packages/api/src/middleware/role-guard.ts` (신규)

```typescript
import type { MiddlewareHandler } from "hono";
import type { OrgRole } from "foundry-x-shared";

const ROLE_LEVEL: Record<OrgRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

/**
 * roleGuard — tenantGuard 이후에 사용.
 * 지정한 최소 역할 이상인지 확인하고, 미달 시 403 반환.
 *
 * @example
 * app.patch('/orgs/:orgId', tenantGuard, roleGuard('admin'), handler)
 */
export function roleGuard(minRole: OrgRole): MiddlewareHandler {
  return async (c, next) => {
    const currentRole = c.get("orgRole") as OrgRole | undefined;
    if (!currentRole) {
      return c.json({ error: "Organization role not found" }, 403);
    }

    const required = ROLE_LEVEL[minRole] ?? 0;
    const current = ROLE_LEVEL[currentRole] ?? 0;

    if (current < required) {
      return c.json(
        { error: `Requires ${minRole} role or higher` },
        403,
      );
    }

    await next();
  };
}
```

### 4.2 사용 패턴

```typescript
// 모든 멤버 접근 가능
orgRoute.get('/orgs/:orgId/members', handler);

// admin 이상만
orgRoute.post('/orgs/:orgId/invitations', roleGuard('admin'), handler);

// owner만
orgRoute.patch('/orgs/:orgId/members/:userId', roleGuard('owner'), handler);
```

## §5 Step 4: OrgService

### 5.1 파일: `packages/api/src/services/org.ts` (신규)

**메서드 시그니처:**

```typescript
export class OrgService {
  constructor(private db: D1Database) {}

  // ─── Org CRUD ───
  async createOrg(userId: string, params: { name: string; slug?: string }): Promise<Organization>;
  async listMyOrgs(userId: string): Promise<Organization[]>;
  async getOrg(orgId: string): Promise<Organization | null>;
  async updateOrg(orgId: string, patch: { name?: string; settings?: Record<string, unknown> }): Promise<Organization>;

  // ─── Members ───
  async listMembers(orgId: string): Promise<OrgMember[]>;
  async updateMemberRole(orgId: string, userId: string, newRole: OrgRole): Promise<void>;
  async removeMember(orgId: string, userId: string): Promise<void>;

  // ─── Invitations ───
  async createInvitation(orgId: string, params: { email: string; role: OrgRole; invitedBy: string }): Promise<OrgInvitation>;
  async listInvitations(orgId: string): Promise<OrgInvitation[]>;
  async acceptInvitation(token: string, userId: string, userEmail: string): Promise<{ orgId: string; role: OrgRole }>;
  async deleteInvitation(invitationId: string, orgId: string): Promise<void>;

  // ─── Helpers ───
  private generateSlug(name: string): string;
  private ensureUniqueSlug(baseSlug: string): Promise<string>;
}
```

### 5.2 핵심 로직 상세

#### createOrg

```
1. slug 생성: params.slug ?? generateSlug(params.name)
2. slug 유일성 보장: ensureUniqueSlug(slug) — 중복 시 '-2', '-3' suffix
3. INSERT INTO organizations
4. INSERT INTO org_members (role: 'owner')
5. return Organization
```

#### listMyOrgs

```sql
SELECT o.* FROM organizations o
JOIN org_members m ON o.id = m.org_id
WHERE m.user_id = ?
ORDER BY m.joined_at ASC
```

#### updateMemberRole

```
1. 대상이 owner인지 확인 → owner의 역할은 변경 불가 (403)
2. 대상이 자기 자신인지 확인 → 자신의 역할은 변경 불가 (400)
3. UPDATE org_members SET role = ? WHERE org_id = ? AND user_id = ?
```

#### removeMember

```
1. 대상이 owner인지 확인 → owner는 제거 불가 (403)
2. 대상이 자기 자신인지 확인 → 자기 자신은 제거 불가 (400, "탈퇴"는 별도 기능)
3. DELETE FROM org_members WHERE org_id = ? AND user_id = ?
```

#### createInvitation

```
1. 이미 해당 org의 멤버인지 확인 → 이미 멤버면 409
2. 기존 pending 초대가 있는지 확인 → 있으면 409
3. token = crypto.randomUUID()
4. expires_at = now + 7일
5. INSERT INTO org_invitations
6. return OrgInvitation
```

#### acceptInvitation

```
1. SELECT ... WHERE token = ? AND accepted_at IS NULL
2. 만료 확인: expires_at < now → 410 Gone
3. 이메일 일치 확인: invitation.email === userEmail → 불일치 시 403
4. INSERT INTO org_members (org_id, user_id, role)
5. UPDATE org_invitations SET accepted_at = datetime('now')
6. return { orgId, role }
```

## §6 Step 5: Org 라우트

### 6.1 파일: `packages/api/src/routes/org.ts` (신규)

**전체 엔드포인트:**

| # | Method | Path | 미들웨어 | 핸들러 |
|:-:|--------|------|---------|--------|
| 1 | POST | `/orgs` | auth | createOrg — 새 org 생성 |
| 2 | GET | `/orgs` | auth | listMyOrgs — 내 org 목록 |
| 3 | GET | `/orgs/:orgId` | auth + tenantGuard | getOrg — org 상세 |
| 4 | PATCH | `/orgs/:orgId` | auth + tenantGuard + roleGuard('admin') | updateOrg — org 수정 |
| 5 | GET | `/orgs/:orgId/members` | auth + tenantGuard | listMembers |
| 6 | PATCH | `/orgs/:orgId/members/:userId` | auth + tenantGuard + roleGuard('owner') | updateMemberRole |
| 7 | DELETE | `/orgs/:orgId/members/:userId` | auth + tenantGuard + roleGuard('admin') | removeMember |
| 8 | POST | `/orgs/:orgId/invitations` | auth + tenantGuard + roleGuard('admin') | createInvitation |
| 9 | GET | `/orgs/:orgId/invitations` | auth + tenantGuard + roleGuard('admin') | listInvitations |
| 10 | DELETE | `/orgs/:orgId/invitations/:invitationId` | auth + tenantGuard + roleGuard('admin') | deleteInvitation |

### 6.2 초대 수락 라우트 (Auth 확장)

| # | Method | Path | 미들웨어 | 핸들러 |
|:-:|--------|------|---------|--------|
| 11 | POST | `/auth/invitations/:token/accept` | auth (공개 X, 로그인 필수) | acceptInvitation |
| 12 | POST | `/auth/switch-org` | auth | switchOrg — JWT 재발급 |

### 6.3 app.ts 등록

```typescript
// app.ts — 기존 코드 수정
import { orgRoute } from "./routes/org.js";

// Public auth routes (기존)
app.route("/api", authRoute);

// Org routes — 일부는 auth만, 일부는 tenantGuard+roleGuard
// orgRoute 내부에서 미들웨어를 개별 적용
app.route("/api", orgRoute);

// Protected API routes (기존)
app.use("/api/*", authMiddleware);
app.use("/api/*", tenantGuard);
// ... 나머지 라우트
```

**주의**: orgRoute의 `POST /orgs`와 `GET /orgs`는 tenantGuard가 필요 없어요 (org 생성/목록은 org 컨텍스트 없이 동작). 라우트 내부에서 미들웨어를 선택적으로 적용해요.

### 6.4 라우트 상세 — createOrg (예시)

```typescript
const createOrg = createRoute({
  method: "post",
  path: "/orgs",
  tags: ["Org"],
  summary: "Create a new organization",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateOrgSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: OrgResponseSchema } },
      description: "Organization created",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Slug already exists",
    },
  },
});

orgRoute.openapi(createOrg, async (c) => {
  const payload = c.get("jwtPayload") as JwtPayload;
  const { name, slug } = c.req.valid("json");
  const service = new OrgService(c.env.DB);
  const org = await service.createOrg(payload.sub, { name, slug });
  return c.json(org, 201);
});
```

### 6.5 switchOrg 상세

```typescript
// POST /auth/switch-org
authRoute.openapi(switchOrgRoute, async (c) => {
  const { orgId } = c.req.valid("json");
  const payload = c.get("jwtPayload") as JwtPayload;

  // 멤버십 확인
  const member = await c.env.DB.prepare(
    "SELECT role FROM org_members WHERE org_id = ? AND user_id = ?"
  ).bind(orgId, payload.sub).first();

  if (!member) {
    return c.json({ error: "Not a member of this organization" }, 403);
  }

  // 새 토큰 발급
  const secret = c.env.JWT_SECRET ?? "dev-secret";
  const tokens = await createTokenPair({
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    orgId,
    orgRole: (member as Record<string, unknown>).role as OrgRole,
  }, secret);

  return c.json(tokens, 200);
});
```

## §7 Step 6: 서비스 필터링 보강

### 7.1 기존 org 필터 현황

| 서비스 | 파일 | 현재 org 필터 | 변경 |
|--------|------|:------------:|------|
| agent 라우트 | routes/agent.ts | ✅ | 유지 |
| mcp-registry | services/mcp-registry.ts | ✅ | 유지 |
| wiki-sync | services/wiki-sync.ts | ❌ | 추가 |
| spec-parser | services/spec-parser.ts | ❌ | 추가 |
| freshness-checker | services/freshness-checker.ts | ❌ | 추가 |

### 7.2 wiki-sync 변경

`listPages()` 메서드에 orgId 파라미터 추가:

```typescript
// 변경 전
async listPages(projectId: string): Promise<WikiPage[]> {
  // SELECT * FROM wiki_pages WHERE project_id = ?
}

// 변경 후
async listPages(projectId: string, orgId?: string): Promise<WikiPage[]> {
  if (orgId) {
    // SELECT wp.* FROM wiki_pages wp
    // JOIN projects p ON wp.project_id = p.id
    // WHERE p.org_id = ? AND wp.project_id = ?
  }
  // 기존 로직 유지 (orgId 없으면)
}
```

### 7.3 spec-parser, freshness-checker 변경

동일한 패턴: 프로젝트 조회 시 `WHERE p.org_id = ?` 조건 추가.

## §8 Step 7: API 테스트 설계

### 8.1 파일: `packages/api/src/__tests__/org.test.ts` (신규)

| # | 테스트 케이스 | 예상 결과 |
|:-:|-------------|----------|
| 1 | POST /orgs — 정상 생성 | 201, org 반환 + owner 멤버 자동 추가 |
| 2 | POST /orgs — slug 중복 | 409 |
| 3 | POST /orgs — slug 미지정 시 자동 생성 | 201, name에서 slug 파생 |
| 4 | GET /orgs — 내 org 목록 | 200, 배열 반환 |
| 5 | GET /orgs/:orgId — 멤버 접근 | 200 |
| 6 | GET /orgs/:orgId — 비멤버 접근 | 403 |
| 7 | PATCH /orgs/:orgId — admin 수정 | 200 |
| 8 | PATCH /orgs/:orgId — member 수정 시도 | 403 |
| 9 | GET /orgs/:orgId/members — 목록 | 200, 멤버 배열 |
| 10 | PATCH /orgs/:orgId/members/:userId — owner가 역할 변경 | 200 |
| 11 | PATCH /orgs/:orgId/members/:userId — admin이 역할 변경 시도 | 403 |
| 12 | PATCH /orgs/:orgId/members/:userId — owner 역할 변경 불가 | 403 |
| 13 | DELETE /orgs/:orgId/members/:userId — admin이 member 제거 | 200 |
| 14 | DELETE /orgs/:orgId/members/:userId — owner 제거 불가 | 403 |
| 15 | POST /orgs/:orgId/invitations — 정상 초대 | 201, invitation 반환 |
| 16 | POST /orgs/:orgId/invitations — 이미 멤버인 이메일 | 409 |
| 17 | POST /orgs/:orgId/invitations — 이미 pending 초대 | 409 |
| 18 | POST /orgs/:orgId/invitations — member가 초대 시도 | 403 |
| 19 | GET /orgs/:orgId/invitations — admin 조회 | 200 |
| 20 | POST /auth/invitations/:token/accept — 정상 수락 | 200, org 멤버 추가 |
| 21 | POST /auth/invitations/:token/accept — 만료 토큰 | 410 |
| 22 | POST /auth/invitations/:token/accept — 이메일 불일치 | 403 |
| 23 | POST /auth/invitations/:token/accept — 이미 수락된 토큰 | 409 |
| 24 | POST /auth/switch-org — 정상 전환 | 200, 새 JWT |
| 25 | POST /auth/switch-org — 비멤버 org | 403 |
| 26 | DELETE /orgs/:orgId/invitations/:id — 정상 삭제 | 200 |

### 8.2 파일: `packages/api/src/__tests__/role-guard.test.ts` (신규)

| # | 테스트 케이스 | 예상 결과 |
|:-:|-------------|----------|
| 1 | roleGuard('admin') — owner 접근 | next() 호출 |
| 2 | roleGuard('admin') — admin 접근 | next() 호출 |
| 3 | roleGuard('admin') — member 접근 | 403 |
| 4 | roleGuard('admin') — viewer 접근 | 403 |
| 5 | roleGuard('owner') — owner 접근 | next() 호출 |
| 6 | roleGuard('owner') — admin 접근 | 403 |
| 7 | roleGuard('member') — member 접근 | next() 호출 |
| 8 | roleGuard('member') — viewer 접근 | 403 |
| 9 | orgRole 누락 시 | 403 |

### 8.3 mock-d1.ts 변경

`initSchema()` 함수에 `org_invitations` 테이블 CREATE 추가.

## §9 Step 8: Web UI

### 9.1 Zustand Store: `packages/web/src/lib/stores/org-store.ts` (신규)

```typescript
import { create } from "zustand";
import type { Organization } from "foundry-x-shared";

interface OrgState {
  activeOrgId: string | null;
  orgs: Organization[];
  isLoading: boolean;

  // Actions
  setOrgs: (orgs: Organization[]) => void;
  setActiveOrg: (orgId: string) => void;
  fetchOrgs: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
}

export const useOrgStore = create<OrgState>((set, get) => ({
  activeOrgId: null,
  orgs: [],
  isLoading: false,

  setOrgs: (orgs) => set({ orgs }),
  setActiveOrg: (orgId) => set({ activeOrgId: orgId }),

  fetchOrgs: async () => {
    set({ isLoading: true });
    const orgs = await getMyOrgs();   // api-client
    set({ orgs, isLoading: false });
    if (!get().activeOrgId && orgs.length > 0) {
      set({ activeOrgId: orgs[0].id });
    }
  },

  switchOrg: async (orgId) => {
    const result = await apiSwitchOrg(orgId);
    localStorage.setItem("token", result.accessToken);
    set({ activeOrgId: orgId });
    window.location.reload();  // JWT 교체 후 모든 데이터 리페치
  },
}));
```

### 9.2 OrgSwitcher 컴포넌트: `packages/web/src/components/feature/org-switcher.tsx` (신규)

```
┌─────────────────────┐
│ [icon] Org Name  ▼  │  ← 드롭다운 트리거
├─────────────────────┤
│  My Personal Org    │  ← org 목록
│  ● Team Alpha  PRO  │  ← 활성 org에 ● 표시, plan badge
│  Team Beta     FREE │
├─────────────────────┤
│  + Create Org       │  ← 새 org 생성 링크
└─────────────────────┘
```

**UI 컴포넌트**: shadcn/ui `DropdownMenu` 사용

**위치**: Sidebar 상단 (`Foundry-X` 로고 아래, NavLinks 위)

### 9.3 Sidebar 수정: `packages/web/src/components/sidebar.tsx`

```typescript
// 변경: OrgSwitcher를 NavLinks 위에 삽입
import { OrgSwitcher } from "@/components/feature/org-switcher";

// Desktop sidebar 내부
<aside ...>
  <div className="flex h-14 items-center border-b px-4">
    <Link href="/dashboard">Foundry-X</Link>
    <ThemeToggle />
  </div>
  <div className="p-3">
    <OrgSwitcher />           {/* ← 추가 */}
    <div className="mt-3">
      <NavLinks />
    </div>
  </div>
</aside>
```

### 9.4 Org 설정 페이지: `packages/web/src/app/(app)/workspace/org/settings/page.tsx` (신규)

| 섹션 | 컴포넌트 | 기능 |
|------|---------|------|
| 일반 | OrgGeneralForm | 이름 변경, slug 표시 (read-only) |
| 플랜 | OrgPlanBadge | 현재 플랜 표시 |

### 9.5 멤버 관리 페이지: `packages/web/src/app/(app)/workspace/org/members/page.tsx` (신규)

| 섹션 | 컴포넌트 | 기능 |
|------|---------|------|
| 멤버 목록 | MemberTable | 이메일, 이름, 역할, 가입일 |
| 역할 변경 | RoleDropdown | Select로 역할 선택 (owner만 보임) |
| 멤버 제거 | RemoveButton | 확인 다이얼로그 후 삭제 (admin 이상) |
| 초대 폼 | InviteForm | 이메일 + 역할 입력, admin 이상에만 표시 |
| 대기 초대 | PendingInvitesTable | 초대 목록 + 취소 버튼 |

### 9.6 api-client 확장: `packages/web/src/lib/api-client.ts` (수정)

```typescript
// ─── Org API (F92) ───

export async function getMyOrgs(): Promise<Organization[]> {
  return authFetchApi<Organization[]>("/orgs");
}

export async function createOrg(params: { name: string; slug?: string }): Promise<Organization> {
  return authPostApi<Organization>("/orgs", params);
}

export async function getOrg(orgId: string): Promise<Organization> {
  return authFetchApi<Organization>(`/orgs/${orgId}`);
}

export async function updateOrg(orgId: string, patch: { name?: string }): Promise<Organization> {
  return authPatchApi<Organization>(`/orgs/${orgId}`, patch);
}

export async function switchOrg(orgId: string): Promise<TokenPairResponse> {
  return authPostApi<TokenPairResponse>("/auth/switch-org", { orgId });
}

export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  return authFetchApi<OrgMember[]>(`/orgs/${orgId}/members`);
}

export async function updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<void> {
  return authPatchApi(`/orgs/${orgId}/members/${userId}`, { role });
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  return authDeleteApi(`/orgs/${orgId}/members/${userId}`);
}

export async function createInvitation(orgId: string, data: { email: string; role: OrgRole }): Promise<OrgInvitation> {
  return authPostApi<OrgInvitation>(`/orgs/${orgId}/invitations`, data);
}

export async function getOrgInvitations(orgId: string): Promise<OrgInvitation[]> {
  return authFetchApi<OrgInvitation[]>(`/orgs/${orgId}/invitations`);
}

export async function acceptInvitation(token: string): Promise<TokenPairResponse> {
  return authPostApi<TokenPairResponse>(`/auth/invitations/${token}/accept`, {});
}

export async function deleteInvitation(orgId: string, invitationId: string): Promise<void> {
  return authDeleteApi(`/orgs/${orgId}/invitations/${invitationId}`);
}
```

**Note**: `authFetchApi`, `authPostApi`, `authPatchApi`, `authDeleteApi`는 기존 `fetchApi` 패턴에서 Authorization 헤더를 자동 추가하는 헬퍼예요. 기존 코드에서 반복되는 패턴을 추출해요.

## §10 Step 9: Web 테스트

### 10.1 파일: `packages/web/src/__tests__/org-switcher.test.tsx` (신규)

| # | 테스트 케이스 |
|:-:|-------------|
| 1 | org 목록 렌더링 (2개 org) |
| 2 | 활성 org 표시 (● 마커) |
| 3 | org 클릭 시 switchOrg 호출 |

### 10.2 파일: `packages/web/src/__tests__/org-members.test.tsx` (신규)

| # | 테스트 케이스 |
|:-:|-------------|
| 1 | 멤버 목록 렌더링 |
| 2 | 역할 변경 드롭다운 (owner만 보임) |
| 3 | 멤버 제거 확인 다이얼로그 |
| 4 | 초대 폼 제출 |

## §11 OpenAPI Tags 업데이트

`app.ts`의 tags 배열에 추가:

```typescript
{ name: "Org", description: "Organization management (CRUD, members, invitations)" },
```

## §12 변경 파일 종합

### 신규 (~12개)

| # | 파일 | LOC 예상 |
|:-:|------|:--------:|
| 1 | `packages/api/src/routes/org.ts` | 350~400 |
| 2 | `packages/api/src/services/org.ts` | 250~300 |
| 3 | `packages/api/src/schemas/org.ts` | 100~120 |
| 4 | `packages/api/src/middleware/role-guard.ts` | 30~40 |
| 5 | `packages/api/src/db/migrations/0013_org_invitations.sql` | 15 |
| 6 | `packages/api/src/__tests__/org.test.ts` | 400~500 |
| 7 | `packages/api/src/__tests__/role-guard.test.ts` | 100~120 |
| 8 | `packages/web/src/components/feature/org-switcher.tsx` | 80~100 |
| 9 | `packages/web/src/lib/stores/org-store.ts` | 50~60 |
| 10 | `packages/web/src/app/(app)/workspace/org/settings/page.tsx` | 80~100 |
| 11 | `packages/web/src/app/(app)/workspace/org/members/page.tsx` | 200~250 |
| 12 | `packages/web/src/__tests__/org-switcher.test.tsx` | 50~60 |

### 수정 (~8개)

| # | 파일 | 변경 내용 |
|:-:|------|----------|
| 1 | `packages/shared/src/types.ts` | +40 LOC (Org 타입 추가) |
| 2 | `packages/api/src/app.ts` | orgRoute 등록 + OpenAPI tag 추가 |
| 3 | `packages/api/src/routes/auth.ts` | switch-org + accept-invitation 라우트 추가 |
| 4 | `packages/api/src/services/wiki-sync.ts` | orgId 필터 추가 |
| 5 | `packages/api/src/services/spec-parser.ts` | orgId 필터 추가 |
| 6 | `packages/api/src/services/freshness-checker.ts` | orgId 필터 추가 |
| 7 | `packages/api/src/__tests__/helpers/mock-d1.ts` | org_invitations 테이블 추가 |
| 8 | `packages/web/src/components/sidebar.tsx` | OrgSwitcher 삽입 |
| 9 | `packages/web/src/lib/api-client.ts` | org API 함수 12개 + auth 헬퍼 추가 |

## §13 API 엔드포인트 요약 (신규 12개)

| # | Method | Path | 총 엔드포인트 |
|:-:|--------|------|:------------:|
| 1 | POST | /orgs | 62 |
| 2 | GET | /orgs | 63 |
| 3 | GET | /orgs/:orgId | 64 |
| 4 | PATCH | /orgs/:orgId | 65 |
| 5 | GET | /orgs/:orgId/members | 66 |
| 6 | PATCH | /orgs/:orgId/members/:userId | 67 |
| 7 | DELETE | /orgs/:orgId/members/:userId | 68 |
| 8 | POST | /orgs/:orgId/invitations | 69 |
| 9 | GET | /orgs/:orgId/invitations | 70 |
| 10 | DELETE | /orgs/:orgId/invitations/:invitationId | 71 |
| 11 | POST | /auth/invitations/:token/accept | 72 |
| 12 | POST | /auth/switch-org | 73 |

**결과**: 61 → **73 엔드포인트**
