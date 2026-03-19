---
code: FX-DSGN-026
title: Sprint 23 — 테스트 커버리지 확장 상세 설계
version: 1.0
status: Draft
category: DSGN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: F97
req: FX-REQ-097
priority: P2
plan-ref: "[[FX-PLAN-026]]"
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | Sprint 18~22 핵심 기능(멀티테넌시, GitHub, Slack)의 E2E 검증 0건. API 테스트는 기본 흐름을 커버하나 roleGuard 조합/invitation 삭제 등 엣지 미검증 |
| **Solution** | E2E 5개 spec 파일(org 설정/멤버/GitHub/Slack/토큰) + API 2개 test 파일 신규 + 1개 확장. orgContext fixture로 멀티테넌시 E2E 기반 구축 |
| **Function UX Effect** | CI에서 org 전환→멤버 초대→설정 변경까지 전체 흐름이 자동 검증. 코드 변경 시 즉시 회귀 감지 |
| **Core Value** | v1.8.1 프로덕션 배포 전 E2E 안전망 확보 — E2E +15건, API +12건 = 총 ~698건 |

## 1. 현재 상태 분석

### 1.1 기존 API 테스트 커버리지 (재평가)

Plan 작성 시 "4/16 endpoint만 커버"로 추정했으나, 실제 `org.test.ts`를 분석한 결과:

| 영역 | 테스트 수 | 커버 endpoint | 상태 |
|------|:---------:|:------------:|:----:|
| org CRUD (create, list, get, update) | 8 | 4/4 | ✅ |
| 멤버 (list, update role, remove) | 6 | 3/3 | ✅ |
| 초대 (create, list, accept) | 8 | 3/3 | ✅ |
| org 전환 (switch-org) | 2 | 1/1 | ✅ |
| Slack config (list, upsert, delete, test) | 7 | 4/4 | ✅ |
| **소계** | **31** | **15/16** | — |

**미커버 endpoint**: `DELETE /orgs/:orgId/invitations/:invitationId` (초대 취소)

### 1.2 API 테스트 엣지 케이스 갭

| # | 갭 | 현재 | 필요 |
|---|-----|------|------|
| 1 | invitation 삭제 (admin+) | ❌ 없음 | DELETE /invitations/:id 성공 + 404 + 403 |
| 2 | Slack config roleGuard (member 접근) | ❌ 없음 | member → PUT/DELETE → 403 |
| 3 | Slack config 전체 카테고리 순회 | ❌ 일부 | 5개 카테고리 모두 생성 후 list 검증 |
| 4 | org 삭제 후 관련 데이터 정리 | ❌ 없음 | CASCADE 동작 검증 (멤버, 초대, slack config) |

### 1.3 E2E 갭 (변경 없음)

| 기능 | E2E | 우선순위 |
|------|:---:|:--------:|
| Org Settings 페이지 (생성, 수정) | ❌ | High |
| Org Members 페이지 (목록, 초대, 역할 변경, 제거) | ❌ | High |
| OrgSwitcher (드롭다운 전환) | ❌ | High |
| Token 페이지 (비용 요약) | ❌ | Medium |
| GitHub/Slack 설정 페이지 | ❌ | Low (UI 미구현 — workspace 내 별도 페이지 없음) |

> **범위 조정**: GitHub/Slack은 별도 설정 페이지가 없어, E2E 대상에서 제외. 대신 org route 하위 Slack config API를 E2E에서 간접 검증.

## 2. 설계

### 2.1 Playwright Fixture 설계

#### `e2e/fixtures/org.ts` — orgContext fixture

```typescript
import { test as authTest } from "./auth";
import type { Page } from "@playwright/test";

interface OrgContext {
  page: Page;
  orgId: string;
  orgName: string;
}

export const test = authTest.extend<{ orgPage: OrgContext }>({
  orgPage: async ({ authenticatedPage: page }, use) => {
    // 1. Create a test org via API
    const orgName = `test-org-${Date.now()}`;
    const createRes = await page.request.post("/api/orgs", {
      data: { name: orgName },
      headers: {
        Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem("fx-token"))}`,
      },
    });

    let orgId = "test-org-id";
    if (createRes.ok()) {
      const body = await createRes.json();
      orgId = body.id ?? orgId;
    }

    // 2. Store orgId in localStorage for org-aware pages
    await page.evaluate((id) => {
      localStorage.setItem("fx-active-org", id);
    }, orgId);

    await use({ page, orgId, orgName });

    // Teardown: no cleanup needed (test DB is ephemeral)
  },
});

export { expect } from "@playwright/test";
```

**설계 결정:**
- `authenticatedPage` 상속 — 로그인 + org 생성을 하나의 fixture로 통합
- `Date.now()` 접미사 — 병렬 실행 시 org 이름 충돌 방지
- localStorage `fx-active-org` — OrgSwitcher가 이 값을 읽어 활성 org 결정
- teardown 생략 — E2E는 매번 fresh 상태이므로 정리 불필요

### 2.2 E2E 테스트 상세 설계

#### E2E-01: `e2e/org-settings.spec.ts` (4 테스트)

```
describe("Organization Settings")
├── "org 설정 페이지 렌더링"
│   navigate: /workspace/org/settings
│   assert: heading "Organization Settings" visible
│   assert: input[Organization Name] visible
│   assert: button "Save Changes" visible
│   assert: "Create New Organization" section visible
│
├── "org 이름 변경"
│   navigate: /workspace/org/settings
│   action: clear name input → type "Updated Org Name"
│   action: click "Save Changes"
│   assert: page reloaded (window.location.reload 호출됨)
│   note: 실제 API 호출 여부는 network intercept로 검증
│
├── "새 org 생성"
│   navigate: /workspace/org/settings
│   action: type "Brand New Org" in create input
│   action: click "Create"
│   assert: API POST /api/orgs 호출됨 (route intercept)
│
└── "OrgSwitcher 드롭다운 표시"
    navigate: /dashboard
    assert: OrgSwitcher 컴포넌트 visible (Building2 아이콘 + org 이름)
    action: click OrgSwitcher trigger
    assert: dropdown menu visible with org list
```

**mock 전략**: API 응답을 `page.route()` intercept로 제어. 실 API 서버 불필요.

#### E2E-02: `e2e/org-members.spec.ts` (4 테스트)

```
describe("Organization Members")
├── "멤버 페이지 렌더링"
│   fixture: orgPage
│   navigate: /workspace/org/members
│   assert: heading "Members" visible
│   assert: "Invite Member" section visible
│   assert: email input + role select + "Invite" button visible
│   assert: members table visible (Name, Email, Role, Joined, Actions)
│
├── "멤버 목록 표시"
│   fixture: orgPage
│   mock: GET /api/orgs/:orgId/members → [{ name: "Test User", email: "test@example.com", role: "owner" }]
│   navigate: /workspace/org/members
│   assert: table row with "Test User" visible
│   assert: "owner" badge visible
│
├── "멤버 초대 폼 제출"
│   fixture: orgPage
│   navigate: /workspace/org/members
│   action: type "new@example.com" in email input
│   action: select "admin" in role dropdown
│   action: click "Invite"
│   assert: POST /api/orgs/:orgId/invitations 호출됨 (body: { email, role })
│
└── "대기 중인 초대 표시 + 취소"
    fixture: orgPage
    mock: GET /api/orgs/:orgId/invitations → [{ id: "inv-1", email: "pending@example.com", role: "member", expiresAt: future, acceptedAt: null }]
    navigate: /workspace/org/members
    assert: "Pending Invitations (1)" section visible
    assert: "pending@example.com" visible
    action: click "Cancel" button
    assert: DELETE /api/orgs/:orgId/invitations/inv-1 호출됨
```

#### E2E-03: `e2e/workspace-navigation.spec.ts` (3 테스트)

```
describe("Workspace Navigation")
├── "workspace 페이지 접근"
│   fixture: authenticatedPage
│   navigate: /workspace
│   assert: workspace 관련 컨텐츠 visible
│
├── "org settings 네비게이션"
│   fixture: authenticatedPage
│   navigate: /workspace/org/settings
│   assert: "Organization Settings" heading visible
│
└── "org members 네비게이션"
    fixture: authenticatedPage
    navigate: /workspace/org/members
    assert: "Members" heading visible OR "Loading..." visible
```

#### E2E-04: `e2e/tokens.spec.ts` (2 테스트)

```
describe("Token & Cost Management")
├── "토큰 페이지 렌더링"
│   fixture: authenticatedPage
│   navigate: /tokens
│   assert: heading "Token & Cost Management" visible
│   assert: "Loading token data..." OR summary card visible
│
└── "토큰 요약 표시 (mock)"
    fixture: authenticatedPage
    mock: GET /api/tokens/summary → { totalCost: 1.5, period: "2026-03", byModel: { "claude-3": { cost: 1.5 } }, byAgent: {} }
    navigate: /tokens
    assert: "$1.5000" visible (totalCost formatted)
    assert: "2026-03" visible (period)
```

#### E2E-05: `e2e/slack-config.spec.ts` (2 테스트)

> Slack 전용 설정 페이지가 없으므로, API 레벨 E2E로 대체

```
describe("Slack Config API (E2E)")
├── "알림 설정 생성 → 조회 → 삭제"
│   fixture: orgPage
│   action: page.request.put("/api/orgs/{orgId}/slack/configs/agent", { webhook_url, enabled })
│   assert: status 200, category === "agent"
│   action: page.request.get("/api/orgs/{orgId}/slack/configs")
│   assert: configs.length === 1
│   action: page.request.delete("/api/orgs/{orgId}/slack/configs/agent")
│   assert: status 200, deleted === true
│
└── "잘못된 카테고리 → 400"
    fixture: orgPage
    action: page.request.put("/api/orgs/{orgId}/slack/configs/invalid", { webhook_url, enabled })
    assert: status 400
```

### 2.3 API 테스트 보강 설계

#### API-01: `__tests__/org-invitation-delete.test.ts` (신규, 4 테스트)

```
describe("DELETE /api/orgs/:orgId/invitations/:invitationId")
├── "owner가 초대 삭제 성공"
│   seed: 초대 1건 생성
│   action: DELETE /api/orgs/org_test/invitations/{invId} (owner)
│   assert: 200, { ok: true }
│   verify: list invitations → 0건
│
├── "admin이 초대 삭제 성공"
│   seed: admin user + 초대 1건
│   action: DELETE (admin headers)
│   assert: 200
│
├── "member는 초대 삭제 불가 → 403"
│   seed: member user + 초대 1건
│   action: DELETE (member headers)
│   assert: 403
│
└── "존재하지 않는 초대 → 404"
    action: DELETE /api/orgs/org_test/invitations/nonexistent
    assert: 404
```

#### API-02: `__tests__/slack-config.test.ts` 확장 (4 테스트 추가)

```
describe("Slack Config — Edge Cases")
├── "member는 config 생성 불가 → 403"
│   seed: member user
│   action: PUT /api/orgs/org_test/slack/configs/agent (member headers)
│   assert: 403
│
├── "member는 config 삭제 불가 → 403"
│   seed: member user + agent config
│   action: DELETE /api/orgs/org_test/slack/configs/agent (member headers)
│   assert: 403
│
├── "5개 카테고리 전부 생성 후 list 검증"
│   action: PUT agent, pr, plan, queue, message 순차 생성
│   action: GET /api/orgs/org_test/slack/configs
│   assert: configs.length === 5, 각 category 존재
│
└── "존재하지 않는 config 삭제 → 404"
    action: DELETE /api/orgs/org_test/slack/configs/agent (미생성 상태)
    assert: 404
```

#### API-03: `__tests__/webhook-extended.test.ts` (신규, 4 테스트)

```
describe("Webhook Security & Edge Cases")
├── "signature 누락 → 401"
│   action: POST /api/webhook/github (no X-Hub-Signature-256 header)
│   assert: 401
│
├── "signature 불일치 → 401"
│   action: POST /api/webhook/github (wrong signature)
│   assert: 401
│
├── "지원하지 않는 이벤트 타입 → 200 (graceful skip)"
│   action: POST /api/webhook/github (X-GitHub-Event: "deployment")
│   assert: 200, { ignored: true } 또는 유사 응답
│
└── "유효한 push event → 처리"
    action: POST /api/webhook/github (valid signature, X-GitHub-Event: "push")
    assert: 200
```

### 2.4 파일 구조 요약

```
packages/web/
├── e2e/
│   ├── fixtures/
│   │   ├── auth.ts          (기존)
│   │   └── org.ts           (신규 — orgPage fixture)
│   ├── org-settings.spec.ts (신규 — 4 tests)
│   ├── org-members.spec.ts  (신규 — 4 tests)
│   ├── workspace-navigation.spec.ts (신규 — 3 tests)
│   ├── tokens.spec.ts       (신규 — 2 tests)
│   └── slack-config.spec.ts (신규 — 2 tests)

packages/api/src/__tests__/
├── org-invitation-delete.test.ts  (신규 — 4 tests)
├── slack-config.test.ts           (확장 — +4 tests)
└── webhook-extended.test.ts       (신규 — 4 tests)
```

### 2.5 테스트 수 예상

| 영역 | 현재 | 추가 | 합계 |
|------|:----:|:----:|:----:|
| E2E (로컬) | 27 | +15 | 42 |
| E2E (프로덕션) | 9 | 0 | 9 |
| API | 471 | +12 | 483 |
| CLI | 106 | 0 | 106 |
| Web 단위 | 48 | 0 | 48 |
| **합계** | **661** | **+27** | **688** |

## 3. 구현 순서

| Phase | 작업 | 의존성 | 예상 산출 |
|:-----:|------|--------|----------|
| 1 | orgContext fixture 구현 | auth.ts fixture | `e2e/fixtures/org.ts` |
| 2 | E2E org-settings + workspace-navigation | Phase 1 | 7 tests |
| 3 | E2E org-members | Phase 1 | 4 tests |
| 4 | E2E tokens + slack-config | Phase 1 | 4 tests |
| 5 | API org-invitation-delete | — | 4 tests |
| 6 | API slack-config 확장 | — | 4 tests |
| 7 | API webhook-extended | — | 4 tests |
| 8 | 전체 검증 (typecheck + test + e2e) | Phase 1~7 | 통과 확인 |

**병렬 가능**: Phase 2~4 (E2E) ↔ Phase 5~7 (API) 는 독립적으로 병렬 수행 가능.

## 4. API Route Intercept 패턴 (E2E)

E2E에서 실 API 서버 없이 UI를 검증하기 위한 mock 패턴:

```typescript
// page.route()로 API 응답 제어
await page.route("**/api/orgs/*/members", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([
      { orgId: "org-1", userId: "user-1", email: "test@example.com", name: "Test User", role: "owner", joinedAt: "2026-03-19T00:00:00Z" },
    ]),
  });
});
```

**원칙:**
- GET 요청: `page.route()` intercept로 고정 응답 반환
- POST/PUT/DELETE: `page.route()` intercept + `route.request().postData()` 검증
- 네비게이션 + 렌더링 검증에 집중, API 로직은 API 단위 테스트에 위임

## 5. 성공 기준

| 기준 | 목표 |
|------|------|
| E2E 추가 | +15건 (5개 spec 파일) |
| API 추가 | +12건 (2개 신규 + 1개 확장) |
| 기존 테스트 회귀 | 0건 |
| typecheck | ✅ 통과 |
| E2E flaky | 0% (3회 연속 통과) |

## Version History

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| 1.0 | 2026-03-19 | 초안 — F97 테스트 커버리지 확장 Design (코드 기반 재분석) | Sinclair Seo |
