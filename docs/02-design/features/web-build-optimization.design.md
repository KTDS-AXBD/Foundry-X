---
code: FX-DSGN-013
title: "Web 빌드/배포 최적화 — Next.js → Vite + React Router 전환 설계"
version: 1.0
status: Draft
category: DSGN
created: 2026-03-30
updated: 2026-03-30
author: Sinclair Seo
references: "[[FX-PLAN-013]]"
---

# FX-DSGN-013: Next.js → Vite + React Router 전환 설계

## 1. 개요

`packages/web`을 Next.js 14 (`output: "export"`)에서 Vite 6 + React Router 7로 전환해요.
SSR/ISR을 전혀 쓰지 않는 정적 SPA이므로, Next.js의 오버헤드 없이 동일한 출력을 만들어요.

### 전환 대상 요약 (정밀 조사 결과)

| 항목 | 현재 | 전환 후 | 영향 파일 수 |
|------|------|---------|-------------|
| 라우팅 | `app/(app)/*/page.tsx` | `src/routes/*.tsx` + router config | 31 pages |
| 레이아웃 | 3× `layout.tsx` (중첩) | 2× Layout 컴포넌트 (Router Outlet) | 3 |
| 링크 | `next/link` Link | `react-router-dom` Link | 19파일 24곳 |
| 네비게이션 | `next/navigation` 훅 | `react-router-dom` 훅 | 11파일 18곳 |
| 환경변수 | `NEXT_PUBLIC_*` (2종) | `VITE_*` | 9파일 |
| 폰트 | `next/font/google` (3종) | `@fontsource/*` 또는 CSS `@import` | 1파일 |
| 메타데이터 | `export const metadata` | `react-helmet-async` 또는 직접 `<title>` | 1파일 |
| 빌드 설정 | `next.config.js` | `vite.config.ts` | 1 |
| Path Alias | `@/*` (tsconfig paths) | `vite resolve.alias` | 유지 |
| PostCSS | `@tailwindcss/postcss` | 동일 (Vite 네이티브 지원) | 유지 |
| 테스트 | vitest (이미 사용 중) | 동일 | 유지 |

### 변경 불필요

- 124개 컴포넌트 (`components/`) — JSX/스타일 그대로
- Tailwind v4 + AXIS DS + shadcn/ui
- Zustand 상태 관리 (`lib/stores/`)
- API 클라이언트 (`lib/api-client.ts`) — 환경변수명만 변경
- SSE 클라이언트 (`lib/sse-client.ts`)
- Playwright E2E — URL 기반이라 프레임워크 무관
- `public/_redirects` — Cloudflare Pages 라우팅

## 2. 아키텍처 설계

### 2.1 프로젝트 구조 (전환 후)

```
packages/web/
├── index.html                  # Vite 엔트리 (SPA)
├── vite.config.ts              # Vite 설정
├── postcss.config.mjs          # 유지 (Tailwind v4)
├── tsconfig.json               # paths 유지, Next.js plugin 제거
├── vitest.config.ts            # 유지 (이미 Vite 기반)
├── public/
│   └── _redirects              # Cloudflare Pages API 프록시 (유지)
├── src/
│   ├── main.tsx                # React 렌더 엔트리
│   ├── router.tsx              # React Router 설정 (전체 라우트 정의)
│   ├── app/
│   │   └── globals.css         # 유지 (Tailwind + AXIS DS tokens)
│   ├── layouts/
│   │   ├── RootLayout.tsx      # 폰트 + ThemeProvider + GoogleAuth
│   │   ├── AppLayout.tsx       # Sidebar + ProcessStageGuide
│   │   └── LandingLayout.tsx   # Navbar + Footer
│   ├── routes/                 # 페이지 컴포넌트 (page.tsx → route 파일)
│   │   ├── landing.tsx
│   │   ├── login.tsx
│   │   ├── invite.tsx
│   │   ├── dashboard.tsx
│   │   ├── agents.tsx
│   │   ├── ...
│   │   └── ax-bd/
│   │       ├── index.tsx
│   │       ├── discovery.tsx
│   │       ├── bmc.tsx
│   │       └── bmc-new.tsx
│   ├── components/             # 유지 (변경 없음)
│   ├── lib/                    # 유지 (환경변수명만 변경)
│   └── __tests__/              # 유지
└── wrangler.toml               # pages_build_output_dir: "dist"
```

### 2.2 엔트리 포인트

**index.html** (Vite SPA 엔트리):
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Foundry-X — AI 에이전트가 일하는 방식을 설계하는 곳</title>
    <meta name="description" content="AX 사업개발 라이프사이클을 AI 에이전트로 자동화하는 오케스트레이션 플랫폼." />
  </head>
  <body class="min-h-screen bg-background font-sans text-foreground antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**src/main.tsx**:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ThemeProvider } from "@/components/theme-provider";
import { GoogleAuthProvider } from "@/components/google-auth-provider";
import "./app/globals.css";

// 폰트 로딩 (CSS @import 방식)
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/syne/400.css";
import "@fontsource/syne/700.css";
import "@fontsource-variable/jetbrains-mono";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark">
      <GoogleAuthProvider>
        <RouterProvider router={router} />
      </GoogleAuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
```

### 2.3 라우터 설계

**src/router.tsx** — createBrowserRouter 기반:
```tsx
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { LandingLayout } from "@/layouts/LandingLayout";

export const router = createBrowserRouter([
  // Landing 그룹
  {
    element: <LandingLayout />,
    children: [
      { index: true, lazy: () => import("@/routes/landing") },
    ],
  },
  // 인증 페이지 (레이아웃 없음)
  { path: "login", lazy: () => import("@/routes/login") },
  { path: "invite", lazy: () => import("@/routes/invite") },
  // App 그룹
  {
    element: <AppLayout />,
    children: [
      { path: "dashboard", lazy: () => import("@/routes/dashboard") },
      { path: "agents", lazy: () => import("@/routes/agents") },
      { path: "analytics", lazy: () => import("@/routes/analytics") },
      { path: "architecture", lazy: () => import("@/routes/architecture") },
      { path: "discovery", lazy: () => import("@/routes/discovery") },
      { path: "discovery/collection", lazy: () => import("@/routes/discovery-collection") },
      { path: "discovery-progress", lazy: () => import("@/routes/discovery-progress") },
      { path: "foundry", lazy: () => import("@/routes/foundry") },
      { path: "getting-started", lazy: () => import("@/routes/getting-started") },
      { path: "ir-proposals", lazy: () => import("@/routes/ir-proposals") },
      { path: "methodologies", lazy: () => import("@/routes/methodologies") },
      { path: "mvp-tracking", lazy: () => import("@/routes/mvp-tracking") },
      { path: "offering-packs", lazy: () => import("@/routes/offering-packs") },
      { path: "pipeline", lazy: () => import("@/routes/pipeline") },
      { path: "projects", lazy: () => import("@/routes/projects") },
      { path: "settings/jira", lazy: () => import("@/routes/settings-jira") },
      { path: "spec-generator", lazy: () => import("@/routes/spec-generator") },
      { path: "sr", lazy: () => import("@/routes/sr") },
      { path: "tokens", lazy: () => import("@/routes/tokens") },
      { path: "wiki", lazy: () => import("@/routes/wiki") },
      { path: "workspace", lazy: () => import("@/routes/workspace") },
      { path: "workspace/org/members", lazy: () => import("@/routes/workspace-org-members") },
      { path: "workspace/org/settings", lazy: () => import("@/routes/workspace-org-settings") },
      // AX BD 서브그룹
      { path: "ax-bd", lazy: () => import("@/routes/ax-bd/index") },
      { path: "ax-bd/discovery", lazy: () => import("@/routes/ax-bd/discovery") },
      { path: "ax-bd/bmc", lazy: () => import("@/routes/ax-bd/bmc") },
      { path: "ax-bd/bmc/new", lazy: () => import("@/routes/ax-bd/bmc-new") },
      { path: "ax-bd/ideas", lazy: () => import("@/routes/ax-bd/ideas") },
    ],
  },
]);
```

**레이아웃 컴포넌트** — `Outlet` 사용:
```tsx
// src/layouts/AppLayout.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";
import { ProcessStageGuide } from "@/components/feature/ProcessStageGuide";
import { OnboardingTour } from "@/components/feature/OnboardingTour";
import { FeedbackWidget } from "@/components/feature/FeedbackWidget";

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 lg:p-6">
        <ProcessStageGuide />
        <Outlet />
      </main>
      <OnboardingTour />
      <FeedbackWidget />
    </div>
  );
}
```

### 2.4 페이지 컴포넌트 변환 패턴

Next.js `page.tsx`의 default export를 React Router의 `lazy` 패턴용 named export로 변환:

```tsx
// Before: app/(app)/dashboard/page.tsx
export default function DashboardPage() { ... }

// After: routes/dashboard.tsx
export function Component() { ... }
// React Router lazy()는 { Component } named export를 자동 인식
```

변환은 기계적이에요:
1. `export default function XxxPage` → `export function Component`
2. `import Link from "next/link"` → `import { Link } from "react-router-dom"`
3. `import { useRouter } from "next/navigation"` → `import { useNavigate } from "react-router-dom"`
4. `import { usePathname } from "next/navigation"` → `import { useLocation } from "react-router-dom"` + `location.pathname`
5. `import { useSearchParams } from "next/navigation"` → `import { useSearchParams } from "react-router-dom"`
6. `router.push("/path")` → `navigate("/path")`
7. `process.env.NEXT_PUBLIC_*` → `import.meta.env.VITE_*`

## 3. 변환 매핑 (전수)

### 3.1 next/link → react-router-dom Link

| 파일 | 변환 내용 |
|------|----------|
| `sidebar.tsx` | `import Link from "next/link"` → `import { Link } from "react-router-dom"` (4곳, `href` → `to`) |
| `landing/navbar.tsx` | 3곳 (로고, 네비, CTA) |
| `landing/footer.tsx` | 2곳 |
| `OrgSwitcher.tsx` | 1곳 |
| `SrListTable.tsx` | 1곳 |
| `InviteForm.tsx` | 1곳 |
| `ProcessStageGuide.tsx` | 1곳 |
| 7개 page.tsx | 총 11곳 |

**API 변환**: `<Link href="/path">` → `<Link to="/path">`. 동일 컴포넌트명이라 JSX는 거의 그대로.

### 3.2 next/navigation → react-router-dom

| 훅 | 현재 | 전환 후 | 파일 수 |
|----|------|---------|---------|
| `useRouter()` | `router.push(path)` | `const navigate = useNavigate(); navigate(path)` | 7 |
| `usePathname()` | `const pathname = usePathname()` | `const { pathname } = useLocation()` | 3 |
| `useSearchParams()` | `const [params] = useSearchParams()` | `const [params] = useSearchParams()` (동일 API!) | 2 |

### 3.3 환경변수

| 현재 | 전환 후 | 사용 파일 |
|------|---------|----------|
| `process.env.NEXT_PUBLIC_API_URL` | `import.meta.env.VITE_API_URL` | 6파일 |
| `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `import.meta.env.VITE_GOOGLE_CLIENT_ID` | 3파일 |

`.env.production` 변경:
```
VITE_API_URL=https://foundry-x-api.ktds-axbd.workers.dev/api
```

### 3.4 폰트 로딩

| 현재 (`next/font/google`) | 전환 후 | CSS 변수 |
|--------------------------|---------|----------|
| `Plus_Jakarta_Sans` | `@fontsource-variable/plus-jakarta-sans` | `--font-sans` |
| `Syne` | `@fontsource/syne` | `--font-display` |
| `JetBrains_Mono` | `@fontsource-variable/jetbrains-mono` | `--font-mono` |

`next/font`는 빌드 시 폰트를 self-host하고 CSS 변수를 주입해요.
`@fontsource`도 동일하게 self-host하며, CSS `@font-face`를 자동 생성해요.
다만 CSS 변수 자동 주입은 없으므로 `globals.css`에 `font-family` 매핑 추가가 필요해요.

## 4. 설정 파일

### 4.1 vite.config.ts

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@foundry-x/shared": resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
```

### 4.2 tsconfig.json 변경

```diff
  "compilerOptions": {
-   "target": "es5",
+   "target": "ES2020",
    "jsx": "preserve",
-   "plugins": [{ "name": "next" }],
+   // Next.js plugin 제거
    "paths": {
      "@/*": ["./src/*"],
      "@foundry-x/shared": ["../shared/src/index.ts"]
    }
  },
- "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
+ "include": ["src/**/*.ts", "src/**/*.tsx", "vite-env.d.ts"],
```

### 4.3 package.json 변경

```diff
  "scripts": {
-   "dev": "next dev --port 3000",
-   "build": "next build",
-   "build:clean": "rm -rf .next && next build",
-   "start": "next start",
+   "dev": "vite",
+   "build": "vite build",
+   "preview": "vite preview",
  },
  "dependencies": {
-   "next": "^14.0.0",
+   "react-router-dom": "^7.0.0",
+   "@fontsource-variable/plus-jakarta-sans": "^5.0.0",
+   "@fontsource/syne": "^5.0.0",
+   "@fontsource-variable/jetbrains-mono": "^5.0.0",
  },
  "devDependencies": {
+   "vite": "^6.0.0",
+   "@vitejs/plugin-react": "^4.0.0",
  }
```

### 4.4 wrangler.toml 변경

```diff
  name = "foundry-x-web"
- pages_build_output_dir = "out"
+ pages_build_output_dir = "dist"
```

### 4.5 CI deploy.yml 변경

```diff
  - run: pnpm --filter @foundry-x/web build
  - uses: cloudflare/wrangler-action@v3
    with:
      apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      workingDirectory: packages/web
-     command: pages deploy out --project-name=foundry-x-web --commit-dirty=true --commit-message="deploy"
+     command: pages deploy dist --project-name=foundry-x-web --commit-dirty=true --commit-message="deploy"
```

### 4.6 turbo.json 변경

```diff
  "build": {
    "dependsOn": ["^build"],
-   "outputs": ["dist/**", ".next/**"]
+   "outputs": ["dist/**"]
  },
```

## 5. SPA 라우팅 + Cloudflare Pages

정적 SPA에서 클라이언트 사이드 라우팅을 위해 404 fallback이 필요해요.
Cloudflare Pages는 `_redirects`에서 처리:

```
/api/*  https://foundry-x-api.ktds-axbd.workers.dev/api/:splat  200
/*      /index.html                                              200
```

두 번째 줄이 SPA fallback이에요 — 모든 경로를 `index.html`로 보내서 React Router가 처리.
현재 Next.js `output: "export"`는 각 페이지별 HTML을 생성하지만, SPA에서는 단일 `index.html`이에요.

## 6. 삭제 대상

| 파일/디렉토리 | 사유 |
|-------------|------|
| `next.config.js` | Vite로 대체 |
| `next-env.d.ts` | Vite 타입으로 대체 (`vite-env.d.ts`) |
| `app/layout.tsx` | `layouts/RootLayout.tsx` + `main.tsx`로 분리 |
| `app/(app)/layout.tsx` | `layouts/AppLayout.tsx`로 이동 |
| `app/(landing)/layout.tsx` | `layouts/LandingLayout.tsx`로 이동 |
| `app/*/page.tsx` (31개) | `routes/*.tsx`로 이동 (내용 유지, export 변경) |
| `.next/` | Vite는 `.next` 미생성 |
| `postcss.config.mjs` | 유지 (Vite가 자동 감지) |

## 7. 구현 순서 (단일 Sprint)

Plan에서 3 Phase로 나눴지만, 실제 변경량이 기계적이라 **단일 Sprint**으로 통합 가능해요.

### Step 1: 인프라 설정 (PoC 포함)
1. `pnpm add vite @vitejs/plugin-react react-router-dom @fontsource-variable/plus-jakarta-sans @fontsource/syne @fontsource-variable/jetbrains-mono -F @foundry-x/web`
2. `pnpm remove next -F @foundry-x/web`
3. `vite.config.ts` 생성
4. `index.html` 생성
5. `src/main.tsx` 생성
6. `src/vite-env.d.ts` 생성
7. AXIS DS 빌드 검증 (`pnpm build`)

### Step 2: 라우팅 전환
1. `src/router.tsx` 생성 (전체 라우트 정의)
2. `src/layouts/` 3개 파일 생성 (기존 layout.tsx 내용 이동)
3. `app/*/page.tsx` → `src/routes/*.tsx` 이동 + export 변경
4. `next/link` → `react-router-dom Link` 일괄 치환 (19파일)
5. `next/navigation` 훅 치환 (11파일)

### Step 3: 환경변수 + 설정 정리
1. `NEXT_PUBLIC_*` → `VITE_*` 치환 (9파일)
2. `.env.production` 갱신
3. `tsconfig.json` 정리
4. `package.json` scripts 변경
5. `wrangler.toml` output dir 변경
6. `turbo.json` outputs 변경
7. `.github/workflows/deploy.yml` 빌드 출력 경로 변경
8. `public/_redirects` SPA fallback 추가
9. Next.js 잔여 파일 삭제

### Step 4: 검증
1. `pnpm build` — 빌드 성공 + 메모리/속도 벤치마크
2. `pnpm test` — 172 unit tests 통과
3. `pnpm dev` — 로컬 페이지 동작 확인
4. `pnpm e2e` — Playwright E2E 통과
5. Cloudflare Pages 배포 확인

## 8. 리스크 + 대응

| 리스크 | 영향 | 확률 | 대응 |
|--------|------|------|------|
| AXIS DS ESM 빌드 실패 | 높음 | 낮음 | Step 1에서 PoC. 실패 시 `optimizeDeps.include`에 추가 |
| `@fontsource` 폰트 로딩 FOUT | 낮음 | 중간 | `<link rel="preload">`로 사전 로딩 |
| SPA fallback 미적용 | 중간 | 낮음 | `_redirects` 규칙 순서 주의 (API가 먼저) |
| 테스트 환경변수 미변환 | 낮음 | 중간 | vitest.config에 `define` 또는 `.env.test` |
| React Router `lazy` CSR waterfall | 낮음 | 낮음 | 현재도 CSR이라 체감 차이 없음 |
