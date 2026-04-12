---
code: FX-DSGN-114
title: Sprint 114 — Route Namespace 마이그레이션 Design (F290)
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 114
f-items: F290
phase: "Phase 11-A"
refs: FX-PLAN-114
---

# Sprint 114 — Route Namespace 마이그레이션 Design (F290)

> **Design for**: [[FX-PLAN-114]] Sprint 114 — Route Namespace 마이그레이션
>
> **Project**: Foundry-X
> **Version**: Sprint 114
> **Author**: Sinclair Seo
> **Date**: 2026-04-03

---

## 1. Design Overview

flat 라우트 경로를 BD 6단계 계층 namespace로 전환하는 순수 프론트엔드 작업.
API 경로는 변경 없음. 라우트 파일의 물리적 위치도 변경 없음 (import 경로 유지).

**변경 원칙**: router.tsx의 `path` 속성 + sidebar/컴포넌트의 `href`/`to` 속성만 변경.

---

## 2. Route Mapping — 완전 명세

### 2.1 프로세스 경로 전환 (22건)

#### 1단계 수집 (collection) — 4건

| # | as-is path | to-be path | route file | redirect |
|:-:|------------|------------|------------|:--------:|
| 1 | `sr` | `collection/sr` | sr.tsx | Yes |
| 2 | `sr/:id` | `collection/sr/:id` | sr-detail.tsx | — |
| 3 | `discovery/collection` | `collection/field` | discovery-collection.tsx | Yes |
| 4 | `ir-proposals` | `collection/ideas` | ir-proposals.tsx | Yes |

#### 2단계 발굴 (discovery) — 5건

| # | as-is path | to-be path | route file | redirect |
|:-:|------------|------------|------------|:--------:|
| 5 | `ax-bd/discovery` | `discovery/items` | ax-bd/discovery.tsx | Yes |
| 6 | `ax-bd/discovery/:id` | `discovery/items/:id` | ax-bd/discovery-detail.tsx | — |
| 7 | `ax-bd/ideas-bmc` | `discovery/ideas-bmc` | ax-bd/ideas-bmc.tsx | Yes |
| 8 | `ax-bd/discover-dashboard` | `discovery/dashboard` | ax-bd/discover-dashboard.tsx | Yes |
| 9 | `discovery-progress` | `discovery/progress` | discovery-progress.tsx | Yes |

#### 3단계 형상화 (shaping) — 7건

| # | as-is path | to-be path | route file | redirect |
|:-:|------------|------------|------------|:--------:|
| 10 | `spec-generator` | `shaping/prd` | spec-generator.tsx | Yes |
| 11 | `ax-bd` | `shaping/proposal` | ax-bd/index.tsx | Yes |
| 12 | `ax-bd/shaping` | `shaping/review` | ax-bd/shaping.tsx | Yes |
| 13 | `ax-bd/shaping/:runId` | `shaping/review/:runId` | ax-bd/shaping-detail.tsx | — |
| 14 | `offering-packs` | `shaping/offering` | offering-packs.tsx | Yes |
| 15 | `offering-packs/givc-pitch` | `shaping/offering/givc-pitch` | offering-pack-givc-pitch.tsx | — |
| 16 | `offering-packs/:id` | `shaping/offering/:id` | offering-pack-detail.tsx | — |

#### 4단계 검증/공유 (validation) — 1건

| # | as-is path | to-be path | route file | redirect |
|:-:|------------|------------|------------|:--------:|
| 17 | `pipeline` | `validation/pipeline` | pipeline.tsx | Yes |

#### 5단계 제품화 (product) — 1건

| # | as-is path | to-be path | route file | redirect |
|:-:|------------|------------|------------|:--------:|
| 18 | `mvp-tracking` | `product/mvp` | mvp-tracking.tsx | Yes |

#### 6단계 GTM (gtm) — 1건

| # | as-is path | to-be path | route file | redirect |
|:-:|------------|------------|------------|:--------:|
| 19 | `projects` | `gtm/projects` | projects.tsx | Yes |

#### 외부 서비스 이전 — 2건

| # | as-is path | to-be path | route file | redirect |
|:-:|------------|------------|------------|:--------:|
| 20 | `discovery` | `external/discovery-x` | discovery.tsx | Yes |
| 21 | `foundry` | `external/foundry` | foundry.tsx | Yes |

#### ax-bd 하위 (현행 유지) — 사이드바 미노출 상세 페이지

| as-is path | 변경 | 비고 |
|------------|:----:|------|
| `ax-bd/ideas` | 유지 | 발굴 상세 (이 Sprint 범위 외) |
| `ax-bd/ideas/:id` | 유지 | 아이디어 상세 |
| `ax-bd/bmc` | 유지 | BMC 목록 |
| `ax-bd/bmc/new` | 유지 | BMC 신규 |
| `ax-bd/bmc/:id` | 유지 | BMC 상세 |
| `ax-bd/bdp/:bizItemId` | 유지 | 사업제안서 상세 |
| `ax-bd/process-guide` | 유지 | 프로세스 가이드 |
| `ax-bd/skill-catalog` | 유지 | 스킬 카탈로그 |
| `ax-bd/artifacts` | 유지 | 산출물 |
| `ax-bd/artifacts/:id` | 유지 | 산출물 상세 |
| `ax-bd/progress` | 유지 | 발굴 진행 |
| `ax-bd/ontology` | 유지 | Ontology |
| `ax-bd/demo` | 유지 | 데모 시나리오 |

### 2.2 Redirect 목록 (16건)

```typescript
// router.tsx에 추가할 redirect 정의
import { Navigate } from "react-router-dom";

const redirects = [
  // 1단계 수집
  { path: "sr", element: <Navigate to="/collection/sr" replace /> },
  { path: "discovery/collection", element: <Navigate to="/collection/field" replace /> },
  { path: "ir-proposals", element: <Navigate to="/collection/ideas" replace /> },
  // 2단계 발굴
  { path: "ax-bd/discovery", element: <Navigate to="/discovery/items" replace /> },
  { path: "ax-bd/ideas-bmc", element: <Navigate to="/discovery/ideas-bmc" replace /> },
  { path: "ax-bd/discover-dashboard", element: <Navigate to="/discovery/dashboard" replace /> },
  { path: "discovery-progress", element: <Navigate to="/discovery/progress" replace /> },
  // 3단계 형상화
  { path: "spec-generator", element: <Navigate to="/shaping/prd" replace /> },
  { path: "ax-bd", element: <Navigate to="/shaping/proposal" replace /> },
  { path: "ax-bd/shaping", element: <Navigate to="/shaping/review" replace /> },
  { path: "offering-packs", element: <Navigate to="/shaping/offering" replace /> },
  // 4단계 검증
  { path: "pipeline", element: <Navigate to="/validation/pipeline" replace /> },
  // 5단계 제품화
  { path: "mvp-tracking", element: <Navigate to="/product/mvp" replace /> },
  // 6단계 GTM
  { path: "projects", element: <Navigate to="/gtm/projects" replace /> },
  // 외부 서비스
  { path: "discovery", element: <Navigate to="/external/discovery-x" replace /> },
  { path: "foundry", element: <Navigate to="/external/foundry" replace /> },
];
```

> **주의**: `ax-bd` redirect는 exact match여야 함. `ax-bd/ideas`, `ax-bd/bmc` 등 하위 경로에 영향 없어야 하므로 `ax-bd/*` 와일드카드 사용 금지. React Router v6는 `path: "ax-bd"`가 exact match이므로 안전.

---

## 3. File-by-File Change Specification

### 3.1 router.tsx (핵심 — 전체 재구성)

**변경 전** 구조: flat children 배열 (67줄)
**변경 후** 구조: namespace 그룹 + redirect 배열

```typescript
// 변경 후 구조 스케치
export const router = createBrowserRouter([
  // Landing + Auth (변경 없음)
  { element: <LandingLayout />, children: [{ index: true, lazy: () => import("@/routes/landing") }] },
  { path: "login", lazy: () => import("@/routes/login") },
  { path: "invite", lazy: () => import("@/routes/invite") },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppLayout />,
      children: [
        // ── 비프로세스 (변경 없음) ──
        { path: "dashboard", lazy: () => import("@/routes/dashboard") },
        { path: "getting-started", lazy: () => import("@/routes/getting-started") },
        { path: "team-shared", lazy: () => import("@/routes/team-shared") },
        { path: "ax-bd/demo", lazy: () => import("@/routes/ax-bd/demo-scenario") },

        // ── 1단계 수집 ──
        { path: "collection/sr", lazy: () => import("@/routes/sr") },
        { path: "collection/sr/:id", lazy: () => import("@/routes/sr-detail") },
        { path: "collection/field", lazy: () => import("@/routes/discovery-collection") },
        { path: "collection/ideas", lazy: () => import("@/routes/ir-proposals") },

        // ── 2단계 발굴 ──
        { path: "discovery/items", lazy: () => import("@/routes/ax-bd/discovery") },
        { path: "discovery/items/:id", lazy: () => import("@/routes/ax-bd/discovery-detail") },
        { path: "discovery/ideas-bmc", lazy: () => import("@/routes/ax-bd/ideas-bmc") },
        { path: "discovery/dashboard", lazy: () => import("@/routes/ax-bd/discover-dashboard") },
        { path: "discovery/progress", lazy: () => import("@/routes/discovery-progress") },

        // ── 3단계 형상화 ──
        { path: "shaping/prd", lazy: () => import("@/routes/spec-generator") },
        { path: "shaping/proposal", lazy: () => import("@/routes/ax-bd/index") },
        { path: "shaping/review", lazy: () => import("@/routes/ax-bd/shaping") },
        { path: "shaping/review/:runId", lazy: () => import("@/routes/ax-bd/shaping-detail") },
        { path: "shaping/offering", lazy: () => import("@/routes/offering-packs") },
        { path: "shaping/offering/givc-pitch", lazy: () => import("@/routes/offering-pack-givc-pitch") },
        { path: "shaping/offering/:id", lazy: () => import("@/routes/offering-pack-detail") },

        // ── 4단계 검증/공유 ──
        { path: "validation/pipeline", lazy: () => import("@/routes/pipeline") },

        // ── 5단계 제품화 ──
        { path: "product/mvp", lazy: () => import("@/routes/mvp-tracking") },

        // ── 6단계 GTM ──
        { path: "gtm/projects", lazy: () => import("@/routes/projects") },

        // ── ax-bd 하위 (유지) ──
        { path: "ax-bd/ideas", lazy: () => import("@/routes/ax-bd/ideas") },
        { path: "ax-bd/ideas/:id", lazy: () => import("@/routes/ax-bd/idea-detail") },
        { path: "ax-bd/bmc", lazy: () => import("@/routes/ax-bd/bmc") },
        { path: "ax-bd/bmc/new", lazy: () => import("@/routes/ax-bd/bmc-new") },
        { path: "ax-bd/bmc/:id", lazy: () => import("@/routes/ax-bd/bmc-detail") },
        { path: "ax-bd/bdp/:bizItemId", lazy: () => import("@/routes/ax-bd/bdp-detail") },
        { path: "ax-bd/process-guide", lazy: () => import("@/routes/ax-bd/process-guide") },
        { path: "ax-bd/skill-catalog", lazy: () => import("@/routes/ax-bd/skill-catalog") },
        { path: "ax-bd/artifacts", lazy: () => import("@/routes/ax-bd/artifacts") },
        { path: "ax-bd/artifacts/:id", lazy: () => import("@/routes/ax-bd/artifact-detail") },
        { path: "ax-bd/progress", lazy: () => import("@/routes/ax-bd/progress") },
        { path: "ax-bd/ontology", lazy: () => import("@/routes/ax-bd/ontology") },

        // ── 지식/관리/설정 (변경 없음) ──
        { path: "wiki", lazy: () => import("@/routes/wiki") },
        { path: "methodologies", lazy: () => import("@/routes/methodologies") },
        { path: "analytics", lazy: () => import("@/routes/analytics") },
        { path: "agents", lazy: () => import("@/routes/agents") },
        { path: "tokens", lazy: () => import("@/routes/tokens") },
        { path: "architecture", lazy: () => import("@/routes/architecture") },
        { path: "workspace", lazy: () => import("@/routes/workspace") },
        { path: "workspace/org/members", lazy: () => import("@/routes/workspace-org-members") },
        { path: "workspace/org/settings", lazy: () => import("@/routes/workspace-org-settings") },
        { path: "settings/jira", lazy: () => import("@/routes/settings-jira") },
        { path: "settings/nps", lazy: () => import("@/routes/nps-dashboard") },

        // ── 외부 서비스 ──
        { path: "external/discovery-x", lazy: () => import("@/routes/discovery") },
        { path: "external/foundry", lazy: () => import("@/routes/foundry") },

        // ── Redirects (16건) ──
        { path: "sr", element: <Navigate to="/collection/sr" replace /> },
        { path: "discovery/collection", element: <Navigate to="/collection/field" replace /> },
        { path: "ir-proposals", element: <Navigate to="/collection/ideas" replace /> },
        { path: "ax-bd/discovery", element: <Navigate to="/discovery/items" replace /> },
        { path: "ax-bd/ideas-bmc", element: <Navigate to="/discovery/ideas-bmc" replace /> },
        { path: "ax-bd/discover-dashboard", element: <Navigate to="/discovery/dashboard" replace /> },
        { path: "discovery-progress", element: <Navigate to="/discovery/progress" replace /> },
        { path: "spec-generator", element: <Navigate to="/shaping/prd" replace /> },
        { path: "ax-bd", element: <Navigate to="/shaping/proposal" replace /> },
        { path: "ax-bd/shaping", element: <Navigate to="/shaping/review" replace /> },
        { path: "offering-packs", element: <Navigate to="/shaping/offering" replace /> },
        { path: "pipeline", element: <Navigate to="/validation/pipeline" replace /> },
        { path: "mvp-tracking", element: <Navigate to="/product/mvp" replace /> },
        { path: "projects", element: <Navigate to="/gtm/projects" replace /> },
        { path: "discovery", element: <Navigate to="/external/discovery-x" replace /> },
        { path: "foundry", element: <Navigate to="/external/foundry" replace /> },
      ],
    }],
  },
]);
```

### 3.2 sidebar.tsx — href 갱신 (16건)

| Line | as-is | to-be |
|-----:|-------|-------|
| 120 | `href: "/sr"` | `href: "/collection/sr"` |
| 121 | `href: "/discovery/collection"` | `href: "/collection/field"` |
| 122 | `href: "/ir-proposals"` | `href: "/collection/ideas"` |
| 131 | `href: "/ax-bd/discovery"` | `href: "/discovery/items"` |
| 132 | `href: "/ax-bd/ideas-bmc"` | `href: "/discovery/ideas-bmc"` |
| 133 | `href: "/ax-bd/discover-dashboard"` | `href: "/discovery/dashboard"` |
| 142 | `href: "/spec-generator"` | `href: "/shaping/prd"` |
| 143 | `href: "/ax-bd"` | `href: "/shaping/proposal"` |
| 144 | `href: "/ax-bd/shaping"` | `href: "/shaping/review"` |
| 145 | `href: "/offering-packs"` | `href: "/shaping/offering"` |
| 154 | `href: "/pipeline"` | `href: "/validation/pipeline"` |
| 163 | `href: "/mvp-tracking"` | `href: "/product/mvp"` |
| 172 | `href: "/projects"` | `href: "/gtm/projects"` |
| 215 | `href: "/discovery"` | `href: "/external/discovery-x"` |
| 216 | `href: "/foundry"` | `href: "/external/foundry"` |

> `topItems`, `knowledgeGroup`, `adminGroup`, `memberBottomItems` — 변경 없음

### 3.3 ProcessStageGuide.tsx — STAGES 배열 갱신

```typescript
// Stage 1: 수집
paths: ["/collection/sr", "/collection/field", "/collection/ideas"],
nextAction: { label: "아이디어 발굴로 이동", href: "/discovery/items" },

// Stage 2: 발굴
paths: ["/discovery/items", "/ax-bd/ideas", "/ax-bd/bmc", "/discovery/progress"],
nextAction: { label: "Spec 형상화로 이동", href: "/shaping/prd" },

// Stage 3: 형상화
paths: ["/shaping/prd", "/shaping/proposal", "/shaping/offering"],
nextAction: { label: "파이프라인 검증으로", href: "/validation/pipeline" },

// Stage 4: 검증/공유
paths: ["/validation/pipeline"],
nextAction: { label: "MVP 제작으로", href: "/product/mvp" },

// Stage 5: 제품화
paths: ["/product/mvp"],
nextAction: { label: "GTM 준비로", href: "/gtm/projects" },

// Stage 6: GTM
paths: ["/gtm/projects"],
nextAction: { label: "대시보드로", href: "/dashboard" },
```

> `findStage()` 함수는 prefix 매칭을 이미 지원하므로 변경 불필요. `/collection/sr/123`도 Stage 1로 매칭됨.

### 3.4 컴포넌트 내부 링크 갱신 (11개 파일)

#### dashboard.tsx (line 134~137)

```typescript
// Before
{ label: "SR 등록", href: "/sr", icon: ClipboardList },
{ label: "Spec 생성", href: "/spec-generator", icon: FileText },
{ label: "파이프라인", href: "/pipeline", icon: GitBranch },
// After
{ label: "SR 등록", href: "/collection/sr", icon: ClipboardList },
{ label: "Spec 생성", href: "/shaping/prd", icon: FileText },
{ label: "파이프라인", href: "/validation/pipeline", icon: GitBranch },
```

#### getting-started.tsx (line 56, 68, 92)

```typescript
// workflowCards
href: "/sr"           → href: "/collection/sr"
href: "/spec-generator" → href: "/shaping/prd"
href: "/ax-bd/discovery" → href: "/discovery/items"
```

#### MemberQuickStart.tsx (line 15)

```typescript
href: "/sr" → href: "/collection/sr"
```

#### AdminQuickGuide.tsx (line 22)

```typescript
href: "/projects" → href: "/gtm/projects"
```

#### CoworkSetupGuide.tsx (line 392)

```typescript
href: "/ax-bd/discovery" → href: "/discovery/items"
```

#### ax-bd/progress.tsx (line 46)

```typescript
<Link to="/ax-bd/discovery" → <Link to="/discovery/items"
```

#### ax-bd/discovery-detail.tsx (line 29)

```typescript
<Link to="/ax-bd/discovery" → <Link to="/discovery/items"
```

#### ax-bd/shaping-detail.tsx (line 110)

```typescript
<Link to="/ax-bd/shaping" → <Link to="/shaping/review"
```

#### ax-bd/bdp-detail.tsx (line 27)

```typescript
<Link to="/ax-bd" → <Link to="/shaping/proposal"
```

#### offering-pack-detail.tsx (line 36)

```typescript
<Link to="/offering-packs" → <Link to="/shaping/offering"
```

#### offering-pack-givc-pitch.tsx (line 24)

```typescript
to="/offering-packs" → to="/shaping/offering"
```

#### sr-detail.tsx (line 27)

```typescript
<Link to="/sr" → <Link to="/collection/sr"
```

### 3.5 ax-bd/index.tsx — navigate 대상 변경

```typescript
// Before (line 10)
navigate("/ax-bd/ideas", { replace: true });
// After — 이 파일은 이제 shaping/proposal 경로에서 렌더됨
// 하지만 내부 navigate는 ax-bd/ideas로 가야 함 (ideas 목록은 현행 유지)
// → 변경 없음! ax-bd/ideas 경로는 유지이므로
```

### 3.6 변경하지 않는 파일 (명시적 제외)

| 파일 | 이유 |
|------|------|
| `ax-bd/index.tsx` navigate | `/ax-bd/ideas` 경로 유지 |
| `IdeaDetailPage.tsx` navigate | `/ax-bd/ideas` 경로 유지 |
| `BmcEditorPage.tsx` navigate | `/ax-bd/bmc/:id` 경로 유지 |
| `InviteForm.tsx` navigate | `/getting-started` 경로 유지 |
| `ServiceContainer.tsx` navigate | 동적 경로 (data.path) — redirect가 커버 |
| `login.tsx` navigate | `/dashboard` 경로 유지 |
| `landing.tsx` links | CTA → `/dashboard`, `/login` — 변경 없음 |
| `api-client.ts` | API 경로 — 프론트 라우트와 무관 |

---

## 4. E2E 테스트 경로 갱신

### 4.1 영향받는 spec 파일 (17개 중 경로 변경 필요한 파일)

| spec 파일 | 변경 필요 경로 | 변경 내용 |
|-----------|---------------|-----------|
| `spec-generator.spec.ts` | `goto("/spec-generator")` ×2 | → `goto("/shaping/prd")` |
| `pipeline-dashboard.spec.ts` | `goto("/pipeline")` ×4 | → `goto("/validation/pipeline")` |
| `ax-bd-hub.spec.ts` | `goto("/ax-bd")`, `goto("/ax-bd/ideas")`, `goto("/ax-bd/bmc")`, `goto("/ax-bd/discovery")` | `/ax-bd` → `/shaping/proposal`, 나머지는 유지 (ax-bd 하위 유지) |
| `discovery-wizard.spec.ts` | 경로 확인 필요 | `/ax-bd/discovery` 참조 시 갱신 |
| `shaping.spec.ts` | `/ax-bd/shaping` 참조 시 | → `/shaping/review` |
| `kg-ontology.spec.ts` | `goto("/ax-bd/ontology")` ×7 | 유지 (ontology 경로 변경 없음) |
| `uncovered-pages.spec.ts` | 페이지 목록에 기존 경로 | 새 경로로 갱신 |

### 4.2 E2E waitForURL 패턴

```typescript
// ax-bd-hub.spec.ts line 17 — 기존
await page.waitForURL("**/ax-bd/ideas", { timeout: 10000 });
// → 유지 (ax-bd/ideas 경로 변경 없음)
```

---

## 5. Implementation Steps (실행 순서)

### Step 1: router.tsx 전체 재구성

1. `Navigate` import 추가
2. 프로세스 경로를 namespace prefix 적용 (22건)
3. 외부 서비스 경로 이전 (2건)
4. Redirect 등록 (16건)
5. 비프로세스 경로 + ax-bd 하위 유지 확인

> **핵심**: redirect는 반드시 실제 경로 **뒤에** 배치. React Router는 순서대로 매칭하므로 redirect가 먼저 있으면 실제 라우트에 도달 못함.
> 단, `ax-bd` redirect와 `ax-bd/ideas` 등 하위 경로 — React Router v6는 best match이므로 순서 무관. 그래도 가독성을 위해 redirect를 마지막에 배치.

### Step 2: sidebar.tsx href 갱신

processGroups + externalGroup의 href 16건 변경.

### Step 3: ProcessStageGuide.tsx paths/nextAction 갱신

STAGES 배열 6개 항목의 paths + nextAction.href 변경.

### Step 4: 컴포넌트 내부 링크 갱신

11개 파일의 `<Link to=...>`, `href` 값 변경. (§3.4 명세 참조)

### Step 5: E2E 테스트 갱신

영향받는 spec 파일의 `page.goto()` 경로 변경.

### Step 6: 테스트 + 빌드 확인

```bash
cd packages/web
pnpm typecheck
pnpm test
pnpm build
pnpm e2e        # redirect 동작 확인 포함
```

---

## 6. Testing Strategy

### 6.1 Redirect 동작 검증

E2E에 redirect 검증 테스트 추가 (선택적 — 기존 spec에서 커버될 수 있음):

```typescript
// e2e/route-redirects.spec.ts (선택적 추가)
test("기존 /sr 경로가 /collection/sr로 redirect", async ({ page }) => {
  await page.goto("/sr");
  await expect(page).toHaveURL(/\/collection\/sr/);
});
```

### 6.2 기존 테스트 통과 기준

| 테스트 | 통과 기준 |
|--------|----------|
| `pnpm typecheck` | 에러 0건 |
| `pnpm test` | 265+ pass |
| `pnpm build` | 성공 |
| `pnpm e2e` | 35 specs pass |

---

## 7. Sidebar href ↔ Router path ↔ ProcessStageGuide paths 정합 매트릭스

| Stage | sidebar href | router path | PSG paths | PSG nextAction |
|:-----:|-------------|------------|-----------|---------------|
| 1-수집 | `/collection/sr` | `collection/sr` | `/collection/sr` | `/discovery/items` |
| 1-수집 | `/collection/field` | `collection/field` | `/collection/field` | — |
| 1-수집 | `/collection/ideas` | `collection/ideas` | `/collection/ideas` | — |
| 2-발굴 | `/discovery/items` | `discovery/items` | `/discovery/items` | `/shaping/prd` |
| 2-발굴 | `/discovery/ideas-bmc` | `discovery/ideas-bmc` | — | — |
| 2-발굴 | `/discovery/dashboard` | `discovery/dashboard` | — | — |
| 3-형상화 | `/shaping/prd` | `shaping/prd` | `/shaping/prd` | `/validation/pipeline` |
| 3-형상화 | `/shaping/proposal` | `shaping/proposal` | `/shaping/proposal` | — |
| 3-형상화 | `/shaping/review` | `shaping/review` | — | — |
| 3-형상화 | `/shaping/offering` | `shaping/offering` | `/shaping/offering` | — |
| 4-검증 | `/validation/pipeline` | `validation/pipeline` | `/validation/pipeline` | `/product/mvp` |
| 5-제품화 | `/product/mvp` | `product/mvp` | `/product/mvp` | `/gtm/projects` |
| 6-GTM | `/gtm/projects` | `gtm/projects` | `/gtm/projects` | `/dashboard` |

> 이 매트릭스가 3곳에서 완전 일치해야 함. Gap Analysis 시 이 표를 기준으로 검증.

---

## 8. Edge Cases

### 8.1 /ax-bd redirect와 하위 경로 공존

- `path: "ax-bd"` redirect → `/shaping/proposal`
- `path: "ax-bd/ideas"` → 유지 (실제 라우트)
- React Router v6는 **most specific match** 방식이므로 `ax-bd/ideas`가 `ax-bd`보다 우선 매칭됨
- 따라서 `/ax-bd/ideas`로 접근하면 redirect가 아닌 실제 라우트에 도달

### 8.2 /discovery namespace와 /discovery redirect

- `path: "discovery/items"` → 실제 라우트 (새 경로)
- `path: "discovery"` redirect → `/external/discovery-x`
- `/discovery/items`는 `discovery`보다 specific하므로 redirect에 영향 없음

### 8.3 동적 params 경로

- `/collection/sr/:id` — 기존 `/sr/:id`의 redirect는 등록하지 않음
- 이유: `:id` 파라미터를 포함한 redirect는 React Router에서 `Navigate`로 구현이 복잡
- 대안: `/sr/:id` 패턴은 사용 빈도가 낮고 (상세 페이지는 보통 목록에서 이동), 목록 경로는 redirect가 커버

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial design — F290 Route namespace migration | Sinclair Seo |
