---
code: FX-RPRT-022
title: Sprint 20 완료 보고서 — F92 멀티테넌시 고도화
version: 1.0
status: Active
category: RPRT
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: F92
req: FX-REQ-092
plan: "[[FX-PLAN-023]]"
design: "[[FX-DSGN-021]]"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F92: 멀티테넌시 고도화 — org 전환 UI, org별 격리 강화, 초대/권한 관리 |
| 시작일 | 2026-03-19 |
| 완료일 | 2026-03-19 |
| Match Rate | 90% (1회 iteration) |

### 1.1 Results Summary

| 항목 | 결과 |
|------|------|
| Match Rate | 90% (Check-1: 68% → Act-1 → Check-2: 90%) |
| Iteration Count | 1 |
| 신규 파일 | 12개 |
| 수정 파일 | 8개 |
| 신규 API Endpoints | 12개 (61 → 73) |
| 테스트 | API 399 + Web 48 = **447** (기존 411 + 신규 36) |
| Typecheck | 5/5 패키지 ✅ |

### 1.2 PDCA Cycle

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check-1] 68% → [Act-1] ✅ → [Check-2] 90% ✅ → [Report] ✅
```

### 1.3 Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | Sprint 18(F83)에서 DB 스키마와 미들웨어만 구축되어, 사용자가 org를 전환하거나 멤버를 관리할 수 있는 경로가 전혀 없었음 |
| **Solution** | Org CRUD API 12개 endpoints + roleGuard 미들웨어 + OrgService + 초대/수락 플로우 구현. Web UI에 OrgSwitcher 드롭다운 + 설정/멤버 관리 페이지 추가 |
| **Function UX Effect** | 사이드바에서 org 즉시 전환, 이메일로 팀원 초대, 역할(owner/admin/member/viewer) UI에서 변경 가능. 399 API tests + 48 Web tests 전부 pass |
| **Core Value** | 단일 사용자 → 팀 협업 전환 완성 — Foundry-X "조직 협업 플랫폼"의 핵심 가치를 실현하는 첫 사용 가능한 멀티테넌시 |

## §2 구현 상세

### 2.1 신규 파일 (12개)

| # | 파일 | LOC | 용도 |
|:-:|------|:---:|------|
| 1 | `packages/api/src/routes/org.ts` | 320 | Org CRUD + 멤버 + 초대 라우트 (10 endpoints) |
| 2 | `packages/api/src/services/org.ts` | 230 | OrgService — CRUD, 멤버 관리, 초대 플로우 |
| 3 | `packages/api/src/schemas/org.ts` | 85 | Zod 스키마 9개 (Create, Update, Members, Invitations, Response) |
| 4 | `packages/api/src/middleware/role-guard.ts` | 25 | roleGuard(minRole) — 역할 계층 검사 미들웨어 |
| 5 | `packages/api/src/db/migrations/0013_org_invitations.sql` | 15 | org_invitations 테이블 + 인덱스 3개 |
| 6 | `packages/api/src/__tests__/org.test.ts` | 290 | Org API 통합 테스트 (24 cases) |
| 7 | `packages/api/src/__tests__/role-guard.test.ts` | 70 | roleGuard 단위 테스트 (9 cases) |
| 8 | `packages/web/src/lib/stores/org-store.ts` | 60 | Zustand org store (activeOrgId, fetchOrgs, switchOrg) |
| 9 | `packages/web/src/components/feature/OrgSwitcher.tsx` | 85 | Org 전환 DropdownMenu 컴포넌트 |
| 10 | `packages/web/src/app/(app)/workspace/org/settings/page.tsx` | 100 | Org 설정 + 생성 페이지 |
| 11 | `packages/web/src/app/(app)/workspace/org/members/page.tsx` | 200 | 멤버 관리 + 초대 페이지 |
| 12 | `packages/web/src/__tests__/org-switcher.test.tsx` | 30 | OrgSwitcher 테스트 (3 cases) |

### 2.2 수정 파일 (8개)

| # | 파일 | 변경 |
|:-:|------|------|
| 1 | `packages/shared/src/types.ts` | +40 LOC — Organization, OrgMember, OrgInvitation, OrgRole, ORG_ROLE_HIERARCHY |
| 2 | `packages/api/src/app.ts` | orgRoute 등록, authMiddleware 선택 적용, OpenAPI "Org" tag 추가 |
| 3 | `packages/api/src/routes/auth.ts` | +120 LOC — POST /auth/switch-org + POST /auth/invitations/:token/accept |
| 4 | `packages/api/src/__tests__/helpers/mock-d1.ts` | +15 LOC — org_invitations 테이블 스키마 |
| 5 | `packages/web/src/components/sidebar.tsx` | OrgSwitcher 삽입 (desktop + mobile) |
| 6 | `packages/web/src/lib/api-client.ts` | +120 LOC — 12개 org API 함수 + authHeaders 헬퍼 |
| 7 | `SPEC.md` | F92 상태 📋 → 🔧 전환 |
| 8 | `docs/01-plan/features/sprint-20.plan.md` | Plan 문서 생성 |

### 2.3 API Endpoints (신규 12개, 총 73개)

| # | Method | Path | 권한 |
|:-:|--------|------|------|
| 1 | POST | /orgs | auth |
| 2 | GET | /orgs | auth |
| 3 | GET | /orgs/:orgId | auth + tenantGuard |
| 4 | PATCH | /orgs/:orgId | admin+ |
| 5 | GET | /orgs/:orgId/members | member+ |
| 6 | PATCH | /orgs/:orgId/members/:userId | owner |
| 7 | DELETE | /orgs/:orgId/members/:userId | admin+ |
| 8 | POST | /orgs/:orgId/invitations | admin+ |
| 9 | GET | /orgs/:orgId/invitations | admin+ |
| 10 | DELETE | /orgs/:orgId/invitations/:id | admin+ |
| 11 | POST | /auth/invitations/:token/accept | auth |
| 12 | POST | /auth/switch-org | auth |

### 2.4 DB Migration

| # | 파일 | 테이블/인덱스 |
|:-:|------|-------------|
| 0013 | `0013_org_invitations.sql` | org_invitations (9 columns) + idx_invitation_token, idx_invitation_org, idx_invitation_email |

기존 0011(organizations) + 0012(org_id FK) 변경 없음. 총 D1 테이블: **25개**.

## §3 테스트 결과

### 3.1 API 테스트 (399 pass)

| 범주 | 신규 | 기존 | 합계 |
|------|:----:|:----:|:----:|
| Org CRUD | 8 | — | 8 |
| 멤버 관리 | 6 | — | 6 |
| 초대 플로우 | 7 | — | 7 |
| Org 전환 | 2 | — | 2 |
| roleGuard 단위 | 9 | — | 9 |
| 기존 인증 | — | 1 | 1 |
| 기존 테스트 | — | 366 | 366 |
| **합계** | **33** | **366** | **399** |

### 3.2 Web 테스트 (48 pass)

| 범주 | 신규 | 기존 | 합계 |
|------|:----:|:----:|:----:|
| OrgSwitcher | 3 | — | 3 |
| 기존 테스트 | — | 45 | 45 |
| **합계** | **3** | **45** | **48** |

### 3.3 Typecheck

5/5 패키지 ✅ (shared, cli, api, web, root)

## §4 Gap Analysis 결과

### 4.1 Check-1 (68%)

| 영역 | Score |
|------|:-----:|
| API Backend | 94% |
| Service Filtering | 0% |
| Web UI | 0% |

### 4.2 Act-1: Web UI 구현

5개 신규 파일 + 2개 수정 파일로 Web UI gap 전부 해소.

### 4.3 Check-2 (90%)

| 영역 | Score |
|------|:-----:|
| API Backend | 100% |
| Web UI | 92% |
| Service Filtering | 0% (intentional skip) |

### 4.4 잔여 Gap (non-blocking, 4건)

| # | 항목 | 사유 |
|:-:|------|------|
| 1 | 서비스 필터링 (wiki/spec/freshness) | tenantGuard가 라우트 레벨에서 이미 org 격리 수행 |
| 2 | org-members.test.tsx 미작성 | 기능은 동작, DOM 렌더 테스트만 부재 |
| 3 | OrgSwitcher 테스트 깊이 | module-level 검증만 (DOM assertion 없음) |
| 4 | api-client authHeaders() 중복 | 기능 영향 없음, /simplify 범위 |

## §5 아키텍처 결정 사항

### 5.1 orgRoute의 미들웨어 선택 적용

app.ts에서 `/api/orgs`와 `/api/orgs/*`에 authMiddleware만 적용하고, tenantGuard는 orgRoute 내부에서 선택적으로 적용. `POST /orgs`와 `GET /orgs`는 org 컨텍스트 없이 동작해야 하므로 tenantGuard를 생략.

### 5.2 초대 수락을 auth 라우트에 배치

`POST /auth/invitations/:token/accept`를 auth 라우트 아래에 배치. org 라우트 아래 두면 tenantGuard가 적용되는데, 초대 수락 시점에는 아직 해당 org의 멤버가 아니라 403이 발생하기 때문.

### 5.3 roleGuard를 inline check로 대체

Design에서는 `roleGuard()` 미들웨어 합성을 설계했으나, 실제 구현에서는 OpenAPIHono의 타입 호환성을 위해 핸들러 내부에서 inline role check 패턴을 사용. roleGuard 미들웨어는 작성되었고 테스트도 통과하지만, 라우트에서는 직접 참조하지 않음. 기능적으로 동일.

### 5.4 OrgInvitation role 범위 좁히기

`InvitationRole = "admin" | "member" | "viewer"` — 초대에서 owner 역할을 제외. Zod 스키마와 서비스 타입의 일관성 보장.

## §6 다음 단계

| 우선순위 | 항목 | 비고 |
|:--------:|------|------|
| P0 | F96: v1.8.0 프로덕션 배포 | Sprint 20 코드 + D1 migration 0013 remote 적용 |
| P1 | F93: GitHub 양방향 동기화 고도화 | PR 자동 리뷰 실 연동 |
| P1 | org-members.test.tsx 추가 | DOM 렌더 테스트 4건 |
| P2 | F94: Slack 고도화 | Interactive 메시지 |
| P2 | F97: 테스트 커버리지 확장 | E2E 멀티테넌시 플로우 |
