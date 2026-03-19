---
code: FX-PLAN-023
title: Sprint 20 — 멀티테넌시 고도화 (org 전환 UI, 초대/권한 관리)
version: 1.0
status: Draft
category: PLAN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: F92
req: FX-REQ-092
priority: P1
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F92: 멀티테넌시 고도화 — org 전환 UI, org별 격리 강화, 초대/권한 관리 |
| 시작일 | 2026-03-19 |
| 예상 범위 | Sprint 20 (API 8~10 endpoints + Web UI 3~4 pages + shared types) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | Sprint 18(F83)에서 DB 스키마와 미들웨어만 구축되어, 사용자가 org를 전환하거나 멤버를 관리할 수 있는 경로가 전혀 없음 |
| **Solution** | Org CRUD API + 초대/수락 플로우 + 역할 관리 API를 구현하고, Web UI에 org 전환 드롭다운 + 멤버 관리 페이지 추가 |
| **Function UX Effect** | 사용자가 사이드바에서 org를 즉시 전환하고, 이메일로 팀원을 초대하며, 역할(owner/admin/member/viewer)을 UI에서 변경 가능 |
| **Core Value** | 단일 사용자 → 팀 협업으로의 전환 완성 — Foundry-X가 "조직 협업 플랫폼"이라는 핵심 가치를 실현하는 첫 번째 사용 가능한 멀티테넌시 |

## §1 배경

### 1.1 현재 상태 (F83 Sprint 18 구현 완료)

Sprint 18에서 멀티테넌시 **기반**이 구축되었어요:

| 구현 완료 | 상세 |
|-----------|------|
| DB 스키마 | `organizations` + `org_members` 테이블 (migration 0011, 0012) |
| Tenant 미들웨어 | `tenantGuard()` — JWT orgId/orgRole 검증 + D1 멤버십 확인 |
| JWT 확장 | `orgId`, `orgRole` 클레임 추가 |
| Auto-assign | Signup 시 개인 org 자동 생성 + owner 할당 |
| DB 격리 | `projects`, `agents`, `mcp_servers`에 `org_id` FK + 인덱스 |
| 서비스 필터링 | Agent 라우트 + MCP Registry에서 org_id 필터 |

### 1.2 핵심 갭 (F92에서 해결)

| 영역 | 갭 | 심각도 |
|------|-----|:------:|
| **API** | Org 전용 라우트 0개 — CRUD, 멤버 관리, 초대 모두 없음 | 🔴 |
| **Web UI** | Org 전환 UI 0개 — 사이드바에 org 선택 없음 | 🔴 |
| **초대 플로우** | 팀원을 추가할 방법 자체가 없음 | 🔴 |
| **Shared Types** | Organization, OrgMember 인터페이스 미정의 | 🟡 |
| **역할 기반 가드** | owner-only, admin-only 세분화 없음 (전부 all-or-nothing) | 🟡 |
| **서비스 필터링** | wiki, requirements, token-cost는 org 필터 미적용 | 🟡 |

### 1.3 관련 코드

| 파일 | 역할 |
|------|------|
| `packages/api/src/middleware/tenant.ts` | tenantGuard 미들웨어 (43 LOC) |
| `packages/api/src/middleware/auth.ts` | JWT 페이로드 (orgId, orgRole) |
| `packages/api/src/routes/auth.ts` | Signup/Login org 할당 (242 LOC) |
| `packages/api/src/db/migrations/0011_organizations.sql` | organizations + org_members DDL |
| `packages/api/src/db/migrations/0012_add_org_id.sql` | org_id FK + default org bootstrap |
| `packages/api/src/__tests__/helpers/mock-d1.ts` | 테스트 mock (organizations 포함) |

## §2 구현 전략

### 2.1 서브태스크 분류

F92를 4개 서브태스크로 나눠요:

| # | 서브태스크 | 범위 | 우선순위 |
|:-:|-----------|------|:--------:|
| **A** | Org CRUD API + Shared Types | API 4 endpoints + shared types | P1 |
| **B** | 멤버 관리 API (초대/역할/제거) | API 5~6 endpoints + D1 migration | P1 |
| **C** | 역할 기반 라우트 가드 (roleGuard) | 미들웨어 확장 + 서비스 필터링 보강 | P1 |
| **D** | Web UI — org 전환 + 멤버 관리 페이지 | Sidebar 드롭다운 + 3 pages | P1 |

### 2.2 구현 순서

```
A (Shared Types + Org CRUD API)
  → B (멤버 관리 API + 초대 테이블)
    → C (roleGuard 미들웨어)
      → D (Web UI)
```

**이유**: Shared Types → API → 미들웨어 → UI 순으로 의존성 체인이 형성돼요.

## §3 서브태스크 A: Org CRUD API + Shared Types

### 3.1 Shared Types (`packages/shared/src/types.ts`)

```typescript
// Organization 관련 타입 추가
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  orgId: string;
  userId: string;
  email: string;       // JOIN users.email
  role: OrgRole;
  joinedAt: string;
}

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface OrgInvitation {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  token: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
}
```

### 3.2 Zod 스키마 (`packages/api/src/schemas/org.ts` 신규)

| 스키마 | 용도 |
|--------|------|
| `createOrgSchema` | POST /orgs — name, slug(optional, auto-generate) |
| `updateOrgSchema` | PATCH /orgs/:id — name?, settings?, plan? |
| `orgParamsSchema` | :orgId 경로 파라미터 |

### 3.3 API Endpoints

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| `POST /orgs` | 새 org 생성 | 로그인 사용자 누구나 | auth |
| `GET /orgs` | 내 org 목록 | org_members에서 user_id 조회 | auth |
| `GET /orgs/:orgId` | org 상세 | 해당 org 멤버만 | auth + tenantGuard |
| `PATCH /orgs/:orgId` | org 수정 | owner/admin만 | auth + tenantGuard + roleGuard(admin) |

### 3.4 OrgService (`packages/api/src/services/org.ts` 신규)

```
createOrg(userId, { name, slug? }) → Organization + owner 멤버 자동 추가
listMyOrgs(userId) → Organization[] (JOIN org_members)
getOrg(orgId) → Organization
updateOrg(orgId, patch) → Organization
```

### 3.5 Org 전환 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `POST /auth/switch-org` | 다른 org로 전환 (새 JWT 발급) |

**플로우**:
1. 요청 body: `{ orgId: string }`
2. org_members에서 해당 user의 멤버십 확인
3. 확인되면 새 JWT 발급 (orgId, orgRole 갱신)
4. 기존 access token 무효화는 하지 않음 (stateless JWT)

## §4 서브태스크 B: 멤버 관리 API

### 4.1 D1 Migration (0013)

```sql
-- org_invitations 테이블
CREATE TABLE IF NOT EXISTS org_invitations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT,
  invited_by TEXT NOT NULL REFERENCES users(id)
);
CREATE INDEX idx_invitation_token ON org_invitations(token);
CREATE INDEX idx_invitation_org ON org_invitations(org_id);
CREATE INDEX idx_invitation_email ON org_invitations(email);
```

### 4.2 API Endpoints

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| `GET /orgs/:orgId/members` | 멤버 목록 | member 이상 | auth + tenantGuard |
| `POST /orgs/:orgId/invitations` | 초대 생성 (이메일) | admin 이상 | roleGuard(admin) |
| `GET /orgs/:orgId/invitations` | 대기 초대 목록 | admin 이상 | roleGuard(admin) |
| `POST /invitations/:token/accept` | 초대 수락 | 로그인 사용자 (이메일 일치) | auth |
| `PATCH /orgs/:orgId/members/:userId` | 역할 변경 | owner만 (admin→admin 불가) | roleGuard(owner) |
| `DELETE /orgs/:orgId/members/:userId` | 멤버 제거 | admin 이상 (owner 제거 불가) | roleGuard(admin) |

### 4.3 초대 플로우

```
Admin → POST /orgs/:orgId/invitations { email, role }
  → 서버: org_invitations INSERT + 초대 토큰 생성 (UUID, 7일 만료)
  → 응답: { invitationId, token, expiresAt }
  (이메일 발송은 Phase 4 범위 — 현재는 토큰 URL 복사 방식)

초대받은 사용자 → POST /invitations/:token/accept
  → 서버: 토큰 유효성 검증 + 이메일 일치 확인
  → org_members INSERT + accepted_at 기록
  → 새 JWT 발급 (orgId 전환)
```

### 4.4 Zod 스키마 (`packages/api/src/schemas/org.ts` 확장)

| 스키마 | 용도 |
|--------|------|
| `createInvitationSchema` | POST /orgs/:orgId/invitations — email, role |
| `acceptInvitationSchema` | POST /invitations/:token/accept — token 경로 파라미터 |
| `updateMemberSchema` | PATCH /orgs/:orgId/members/:userId — role |

## §5 서브태스크 C: 역할 기반 라우트 가드

### 5.1 roleGuard 미들웨어 (`packages/api/src/middleware/role-guard.ts` 신규)

```typescript
// 사용법: app.patch('/orgs/:orgId', tenantGuard, roleGuard('admin'), handler)
export function roleGuard(minRole: OrgRole): MiddlewareHandler {
  // 역할 계층: owner > admin > member > viewer
  // c.get('orgRole')과 minRole 비교
  // 권한 부족 시 403 반환
}
```

**역할 계층**:
```
owner (4) > admin (3) > member (2) > viewer (1)
```

### 5.2 기존 서비스 필터링 보강

Sprint 18에서 agent, mcp_servers만 org 필터링이 적용됐어요. 추가 적용:

| 서비스 | 현재 | 변경 |
|--------|------|------|
| `wiki-sync.ts` | org 필터 없음 | project.org_id 기반 필터 추가 |
| `spec-parser.ts` | org 필터 없음 | project.org_id 기반 필터 추가 |
| `freshness-checker.ts` | org 필터 없음 | project.org_id 기반 필터 추가 |

## §6 서브태스크 D: Web UI

### 6.1 Org 전환 드롭다운 (Sidebar)

**위치**: `packages/web/src/components/sidebar.tsx` 상단

- Zustand store `useOrgStore`: activeOrgId, orgs[], switchOrg()
- API client: `getMyOrgs()`, `switchOrg(orgId)` 추가
- 드롭다운 UI: org name + plan badge, 클릭 시 전환 → JWT 갱신 → 페이지 리로드

### 6.2 Org 설정 페이지

**경로**: `/workspace/org/settings`

| 섹션 | 내용 |
|------|------|
| 일반 | org 이름 변경, slug 표시 |
| 플랜 | 현재 플랜 표시 (free/pro/enterprise) |
| 위험 | org 삭제 (owner만, 확인 다이얼로그) |

### 6.3 멤버 관리 페이지

**경로**: `/workspace/org/members`

| 기능 | 설명 | 권한 |
|------|------|------|
| 멤버 목록 | 이메일, 역할, 가입일 테이블 | 모든 멤버 |
| 역할 변경 | 드롭다운으로 역할 선택 | owner만 |
| 멤버 제거 | 삭제 버튼 + 확인 | admin 이상 |
| 초대 보내기 | 이메일 + 역할 입력 폼 | admin 이상 |
| 대기 초대 | 초대 목록 + 취소 버튼 | admin 이상 |

### 6.4 API Client 확장 (`packages/web/src/lib/api-client.ts`)

```typescript
// 추가 함수
getMyOrgs(): Promise<Organization[]>
getOrg(orgId: string): Promise<Organization>
updateOrg(orgId: string, patch: Partial<Organization>): Promise<Organization>
switchOrg(orgId: string): Promise<{ token: string }>
getOrgMembers(orgId: string): Promise<OrgMember[]>
createInvitation(orgId: string, data: { email: string; role: OrgRole }): Promise<OrgInvitation>
getOrgInvitations(orgId: string): Promise<OrgInvitation[]>
acceptInvitation(token: string): Promise<{ token: string }>
updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<void>
removeMember(orgId: string, userId: string): Promise<void>
```

## §7 테스트 전략

### 7.1 API 테스트 (예상 +30~40건)

| 범위 | 테스트 항목 | 예상 건수 |
|------|------------|:---------:|
| Org CRUD | 생성, 조회, 수정, slug 중복, 권한 검증 | 8 |
| 멤버 관리 | 목록, 역할 변경, 제거, owner 보호 | 8 |
| 초대 플로우 | 생성, 중복 방지, 토큰 만료, 수락, 이메일 불일치 | 10 |
| roleGuard | 계층별 허용/거부, edge case | 6 |
| Org 전환 | switch-org JWT 갱신, 비멤버 거부 | 4 |
| 서비스 필터링 | wiki, spec, freshness org 격리 | 4~6 |

### 7.2 Web 테스트

| 범위 | 항목 | 예상 건수 |
|------|------|:---------:|
| OrgSwitcher 컴포넌트 | 렌더링, 전환 동작 | 3 |
| MembersPage | 목록, 역할 변경, 제거 | 4 |
| InvitationForm | 폼 검증, 제출 | 3 |

## §8 D1 Migration 요약

| # | 파일 | 내용 |
|:-:|------|------|
| 0013 | `0013_org_invitations.sql` | org_invitations 테이블 + 인덱스 3개 |

기존 0011(organizations) + 0012(org_id FK)는 변경 없이 유지해요.

## §9 변경 파일 예상

### 신규 파일 (~12개)

| 파일 | 용도 |
|------|------|
| `packages/api/src/routes/org.ts` | Org CRUD + 멤버 관리 라우트 |
| `packages/api/src/services/org.ts` | OrgService (CRUD + 멤버 + 초대) |
| `packages/api/src/schemas/org.ts` | Zod 스키마 |
| `packages/api/src/middleware/role-guard.ts` | roleGuard 미들웨어 |
| `packages/api/src/db/migrations/0013_org_invitations.sql` | 초대 테이블 |
| `packages/api/src/__tests__/org.test.ts` | Org API 테스트 |
| `packages/api/src/__tests__/role-guard.test.ts` | roleGuard 테스트 |
| `packages/web/src/app/(app)/workspace/org/settings/page.tsx` | Org 설정 페이지 |
| `packages/web/src/app/(app)/workspace/org/members/page.tsx` | 멤버 관리 페이지 |
| `packages/web/src/components/feature/org-switcher.tsx` | Org 전환 드롭다운 |
| `packages/web/src/lib/stores/org-store.ts` | Zustand org store |
| `packages/web/src/__tests__/org-switcher.test.tsx` | OrgSwitcher 테스트 |

### 수정 파일 (~10개)

| 파일 | 변경 내용 |
|------|----------|
| `packages/shared/src/types.ts` | Organization, OrgMember, OrgRole, OrgInvitation 타입 추가 |
| `packages/api/src/index.ts` | org 라우트 등록 |
| `packages/api/src/routes/auth.ts` | POST /auth/switch-org 추가 |
| `packages/api/src/services/wiki-sync.ts` | org_id 필터 추가 |
| `packages/api/src/services/spec-parser.ts` | org_id 필터 추가 |
| `packages/api/src/services/freshness-checker.ts` | org_id 필터 추가 |
| `packages/api/src/__tests__/helpers/mock-d1.ts` | org_invitations 테이블 추가 |
| `packages/web/src/components/sidebar.tsx` | OrgSwitcher 삽입 |
| `packages/web/src/lib/api-client.ts` | org 관련 API 함수 추가 |
| `packages/web/src/app/(app)/layout.tsx` | OrgProvider context 추가 |

## §10 위험 요소

| 위험 | 영향 | 완화 |
|------|------|------|
| 초대 이메일 발송 미구현 | 토큰 URL을 수동 공유해야 함 | Phase 4에서 이메일 서비스 연동, 현재는 URL 복사 방식 |
| JWT stateless 특성 | org 전환 후 이전 토큰이 여전히 유효 | tenantGuard가 D1 멤버십을 매 요청마다 검증하므로 실질적 위험 낮음 |
| slug 충돌 | 같은 slug로 org 생성 시도 | UNIQUE 제약 + 서버단 중복 검사 + 자동 suffix 생성 |
| owner 이전 없이 org 삭제 | 데이터 손실 | owner 삭제 불가 정책 + org 삭제 시 확인 다이얼로그 |

## §11 범위 밖 (Not in Scope)

- 이메일 초대 발송 (Phase 4: 외부 이메일 서비스 연동)
- 플랜 기반 quota 강제 (Pro/Enterprise 기능 제한)
- 조직 간 리소스 공유/이전
- Billing/결제 연동
- org.type (personal/team) 구분 — 추후 F97+ 범위
- org 감사 로그 (audit_log) — 추후 범위

## §12 성공 기준

| 기준 | 목표 |
|------|------|
| API 테스트 통과 | +30건 이상 (전체 396+) |
| Match Rate | ≥ 90% |
| typecheck | ✅ 5/5 패키지 |
| org 전환 E2E | Sidebar에서 org 선택 → 대시보드 데이터 변경 확인 |
| 초대 플로우 E2E | 초대 생성 → 토큰 수락 → 멤버 목록에 표시 |
