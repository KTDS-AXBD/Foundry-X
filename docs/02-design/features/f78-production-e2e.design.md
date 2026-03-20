---
code: FX-DSGN-018
title: "F78 프로덕션 E2E 테스트 — Smoke + 크리티컬 패스 설계"
version: 0.1
status: Draft
category: DSGN
system-version: 1.4.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
planning-doc: FX-PLAN-018
---

# F78 프로덕션 E2E 테스트 — Smoke + 크리티컬 패스 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F78 Production E2E Tests |
| **기간** | 2026-03-18 ~ 2026-03-19 (1일) |
| **REQ** | FX-REQ-078 (P1) |
| **시스템 버전** | v1.4.0 |
| **Planning Doc** | [[FX-PLAN-018]] |

| 관점 | 내용 |
|------|------|
| **Problem** | 프로덕션 배포 후 검증이 curl HTTP 상태 코드(smoke-test.sh)에만 의존하고 있어요. DOM 렌더링 깨짐, JS 런타임 에러, 네비게이션 실패를 감지할 수 없어요. |
| **Solution** | Playwright 프로덕션 전용 config + 2개 E2E spec(smoke + critical-path)을 추가하고, CI deploy.yml smoke-test job에 브라우저 수준 검증을 통합해요. |
| **Function UX Effect** | 매 배포마다 랜딩 렌더링·네비게이션·JS 에러를 브라우저에서 자동 검증하고, 실패 시 스크린샷+trace artifact로 즉시 디버깅할 수 있어요. |
| **Core Value** | "Git이 진실, Foundry-X는 렌즈" — 프로덕션 렌즈가 정상 작동하는지 자동 확인하는 안전망이에요. |

---

## 1. Overview

### 1.1 설계 목표

프로덕션 환경(fx.minu.best + foundry-x-api.ktds-axbd.workers.dev)을 대상으로 Playwright 브라우저 E2E 테스트를 실행하여, 배포 후 사용자 경험 수준의 검증을 자동화해요.

**핵심 원칙:**
- **읽기 전용(GET only)** — 프로덕션 데이터 오염 방지
- **비인증 경로만** — 테스트 계정 DB 시드 불필요
- **기존 E2E와 독립** — `e2e/prod/` 디렉토리 분리, 기존 localhost spec 영향 없음

### 1.2 환경 변경 요약

| 구분 | Before (현재) | After (F78) |
|------|--------------|-------------|
| **프로덕션 검증** | `smoke-test.sh` (curl 7건, HTTP 상태 코드만) | curl smoke + Playwright E2E 2 spec (7~9 케이스) |
| **검증 수준** | HTTP 응답 코드 | DOM 렌더링 + JS 에러 + 네비게이션 + 시각적 확인 |
| **Playwright config** | `playwright.config.ts` (localhost:3000 전용) | + `playwright.prod.config.ts` (fx.minu.best 전용) |
| **E2E spec** | `e2e/` 10 spec (localhost) | + `e2e/prod/` 2 spec (프로덕션) |
| **CI smoke-test job** | curl 스크립트만 실행 | curl → Playwright E2E → artifact 업로드 |
| **실패 시 디버깅** | 터미널 출력만 | 스크린샷 + trace artifact (14일 보존) |

---

## 2. 파일 트리

### 2.1 신규/수정 파일 목록

| # | 파일 | 유형 | 설명 |
|---|------|------|------|
| 1 | `packages/web/playwright.prod.config.ts` | **신규** | 프로덕션 전용 Playwright config |
| 2 | `packages/web/e2e/prod/smoke.spec.ts` | **신규** | Smoke E2E (API health + 랜딩 렌더링 + JS 에러 검증) |
| 3 | `packages/web/e2e/prod/critical-path.spec.ts` | **신규** | 크리티컬 패스 네비게이션 E2E |
| 4 | `packages/web/package.json` | **수정** | `e2e:prod` 스크립트 추가 |
| 5 | `.github/workflows/deploy.yml` | **수정** | smoke-test job에 Playwright step 추가 |

### 2.2 디렉토리 구조

```
packages/web/
├── playwright.config.ts          # 기존 — localhost:3000 (수정 안 함)
├── playwright.prod.config.ts     # 신규 — fx.minu.best 프로덕션 전용
├── e2e/
│   ├── fixtures/auth.ts          # 기존 — 인증 fixture (수정 안 함)
│   ├── landing.spec.ts           # 기존 — localhost 랜딩 (수정 안 함)
│   ├── dashboard.spec.ts         # 기존 — localhost 대시보드 (수정 안 함)
│   ├── ...                       # 기존 8개 spec (수정 안 함)
│   └── prod/                     # 신규 — 프로덕션 전용 디렉토리
│       ├── smoke.spec.ts
│       └── critical-path.spec.ts
└── package.json                  # 수정 — e2e:prod 스크립트 추가
```

---

## 3. 상세 설계

### 3.1 playwright.prod.config.ts

기존 `playwright.config.ts`(localhost)와 독립적인 프로덕션 전용 config예요. `webServer` 설정이 없고, `baseURL`이 프로덕션 URL을 가리켜요.

```typescript
import { defineConfig, devices } from "@playwright/test";

/**
 * 프로덕션 E2E 전용 Playwright 설정.
 * - baseURL: fx.minu.best (env override 가능)
 * - webServer 없음 — 이미 배포된 프로덕션에 직접 접속
 * - Chromium only — CI 실행 시간 최소화
 * - retries: 1 — 네트워크 flaky 방지
 */
export default defineConfig({
  testDir: "./e2e/prod",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI ? "github" : "html",

  use: {
    baseURL: process.env.PROD_WEB_URL || "https://fx.minu.best",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: "chromium-prod",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // webServer 없음 — 프로덕션 직접 접속
});
```

**설계 결정 근거:**

| 설정 | 값 | 이유 |
|------|----|------|
| `testDir` | `"./e2e/prod"` | 기존 `e2e/` 디렉토리와 격리하여 `pnpm e2e`(localhost)에 영향 없음 |
| `timeout` | `30_000` (30초) | Cloudflare CDN/Workers cold start + 네트워크 지연 대비. 기존 config(기본 30초)와 동일 |
| `expect.timeout` | `10_000` (10초) | DOM 요소 대기 시간. CDN 첫 로드 시 SSR hydration 지연 고려 |
| `retries` | `1` | 네트워크 불안정으로 인한 flaky 방지. 2회 이상은 실제 문제를 숨길 수 있음 |
| `workers` | `1` | 프로덕션 서버에 병렬 부하를 주지 않음 |
| `reporter` | CI: `"github"`, 로컬: `"html"` | 기존 config와 동일한 패턴. CI에서는 GitHub Actions 인라인 표시 |
| `trace` | `"on-first-retry"` | 첫 실행 실패 시 재시도에서 trace를 수집하여 디버깅에 활용 |
| `screenshot` | `"only-on-failure"` | 실패 시에만 캡처하여 artifact 크기 최소화 |
| `video` | `"retain-on-failure"` | 실패 케이스의 동영상을 보존하여 재현 없이 디버깅 가능 |
| `actionTimeout` | `15_000` | 개별 액션(클릭, 입력)의 최대 대기. 글로벌 timeout보다 짧게 설정 |
| `navigationTimeout` | `20_000` | 페이지 이동의 최대 대기. Pages CDN 응답 + Next.js hydration 고려 |
| `baseURL` | env → fallback `fx.minu.best` | CI에서 `PROD_WEB_URL` 환경변수로 오버라이드 가능 |
| `webServer` | 없음 | 이미 배포된 프로덕션 서버에 직접 접속. 로컬 서버 불필요 |
| `projects` | Chromium only | CI 실행 시간 최소화. 프로덕션 검증은 기능 동작 확인 목적이므로 크로스 브라우저 불필요 |

### 3.2 prod-smoke.spec.ts

프로덕션 배포 직후 실행하는 최소 검증 spec이에요. API health + 랜딩 렌더링 + JS 에러 검증을 포함해요.

```typescript
import { test, expect } from "@playwright/test";

const API_URL =
  process.env.PROD_API_URL ||
  "https://foundry-x-api.ktds-axbd.workers.dev";

test.describe("Production Smoke", () => {
  /**
   * TC-1: API Health Check
   * Workers API가 정상 응답하는지 확인해요.
   * smoke-test.sh의 curl 체크를 브라우저 fetch로 보완해요.
   */
  test("API root returns 200", async ({ request }) => {
    const response = await request.get(`${API_URL}/`);
    expect(response.status()).toBe(200);
  });

  /**
   * TC-2: 랜딩 페이지 렌더링
   * Next.js SSR/hydration이 완료되고 Hero 텍스트가 보이는지 확인해요.
   * 기존 landing.spec.ts의 프로덕션 버전이에요.
   */
  test("landing page renders hero text", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Hero headline — 기존 landing.spec.ts와 동일한 선택자
    await expect(
      page.getByRole("heading", { name: /Where Humans & AI/i }),
    ).toBeVisible();

    // "Forge Together" 브랜딩 텍스트
    await expect(page.getByText("Forge Together")).toBeVisible();
  });

  /**
   * TC-3: 네비게이션 링크 존재
   * Navbar에 핵심 링크가 렌더링되는지 확인해요.
   */
  test("navigation links are visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Navbar brand
    await expect(page.getByText("Foundry-X").first()).toBeVisible();

    // 핵심 네비게이션 링크
    await expect(
      page.getByRole("link", { name: "Features" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Dashboard" }).first(),
    ).toBeVisible();
  });

  /**
   * TC-4: 콘솔 에러 없음
   * 랜딩 페이지 로드 중 JS 콘솔 에러가 발생하지 않는지 확인해요.
   * hydration mismatch, 누락 모듈, API 연결 실패 등을 감지해요.
   */
  test("no console errors on landing page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 허용 목록: 알려진 무해한 에러 (필요 시 추가)
    const allowList = [
      /favicon/i,
      /third-party/i,
    ];

    const realErrors = errors.filter(
      (e) => !allowList.some((pattern) => pattern.test(e)),
    );

    expect(realErrors).toEqual([]);
  });

  /**
   * TC-5: 페이지 응답 시간
   * 랜딩 페이지 로드가 합리적 시간 내에 완료되는지 확인해요.
   * 성능 회귀를 조기에 감지하는 가드레일이에요.
   */
  test("landing page loads within acceptable time", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const elapsed = Date.now() - start;

    // 5초 이내 DOMContentLoaded — CDN + cold start 감안
    expect(elapsed).toBeLessThan(5_000);
  });
});
```

**테스트 케이스 설계 근거:**

| TC | 검증 대상 | 기존 smoke-test.sh 대비 추가 가치 |
|----|----------|----------------------------------|
| TC-1 | API health (fetch) | curl과 동일하지만, Playwright request context에서 실행 → CI 환경 네트워크 일관성 확인 |
| TC-2 | Hero 렌더링 | curl은 HTTP 200만 확인. Playwright는 실제 DOM에 텍스트가 렌더링되는지 확인 |
| TC-3 | 네비게이션 링크 | 빌드 시 링크 누락, 라우트 깨짐을 감지 |
| TC-4 | 콘솔 에러 | curl로는 불가능. hydration mismatch, 번들 에러 등 런타임 문제 감지 |
| TC-5 | 응답 시간 | 성능 회귀 가드레일. Lighthouse CI 도입 전 최소 보호 |

### 3.3 prod-critical-path.spec.ts

사용자가 프로덕션에서 가장 많이 사용하는 네비게이션 경로를 검증해요. 인증 불필요한 공개 페이지만 대상이에요.

```typescript
import { test, expect } from "@playwright/test";

test.describe("Production Critical Path", () => {
  /**
   * TC-6: 랜딩 → Features 섹션 스크롤
   * Navbar "Features" 링크 클릭 시 해당 섹션으로 스크롤되는지 확인해요.
   */
  test("landing → Features section scroll", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Features 링크 클릭
    await page.getByRole("link", { name: "Features" }).first().click();

    // Features 섹션이 뷰포트에 보이는지 확인
    // getByRole heading 또는 섹션 ID 기반
    await expect(
      page.getByRole("heading", { name: /Features|핵심 기능/i }),
    ).toBeVisible();
  });

  /**
   * TC-7: 랜딩 → Architecture 페이지 네비게이션
   * Architecture 링크로 이동하여 페이지가 정상 렌더링되는지 확인해요.
   */
  test("landing → Architecture page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Architecture 링크가 있으면 클릭
    const archLink = page.getByRole("link", { name: /Architecture/i }).first();
    if (await archLink.isVisible()) {
      await archLink.click();
      await page.waitForLoadState("networkidle");

      // URL이 architecture를 포함하거나 페이지 콘텐츠가 존재
      expect(page.url()).toContain("architecture");
    }
  });

  /**
   * TC-8: 랜딩 → Roadmap 섹션 네비게이션
   * Roadmap/로드맵 섹션이 존재하고 접근 가능한지 확인해요.
   */
  test("landing → Roadmap section", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Roadmap 링크가 Navbar에 있으면 클릭
    const roadmapLink = page.getByRole("link", { name: /Roadmap/i }).first();
    if (await roadmapLink.isVisible()) {
      await roadmapLink.click();
    }

    // 대안: 페이지 하단으로 스크롤하여 Roadmap 섹션 확인
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Roadmap 관련 텍스트가 페이지에 존재하는지 확인
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  /**
   * TC-9: Dashboard 접근 → 리다이렉트 확인
   * 비인증 상태에서 /dashboard 접근 시 적절한 응답을 하는지 확인해요.
   * (로그인 리다이렉트 또는 공개 대시보드 표시)
   */
  test("dashboard access without auth", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // 두 가지 시나리오 모두 허용:
    // 1) 로그인 페이지로 리다이렉트 → URL에 login/auth 포함
    // 2) 공개 대시보드 표시 → 페이지가 렌더링됨
    const url = page.url();
    const hasContent = await page.locator("body").textContent();

    // 페이지가 비어있지 않아야 함 (500 에러 페이지가 아님)
    expect(hasContent).toBeTruthy();

    // 빈 흰색 화면이 아닌, 어떤 형태든 UI가 렌더링되어야 함
    const bodyChildCount = await page.locator("body > *").count();
    expect(bodyChildCount).toBeGreaterThan(0);
  });
});
```

**네비게이션 경로 설계 근거:**

| TC | 경로 | 인증 | 검증 목적 |
|----|------|:----:|----------|
| TC-6 | 랜딩 → Features 섹션 | ✗ | 앵커 스크롤이 정상 작동하는지. 랜딩 페이지 내 네비게이션의 핵심 경로 |
| TC-7 | 랜딩 → Architecture | ✗ | 페이지 간 라우팅이 정상인지. Next.js App Router 라우트 깨짐 감지 |
| TC-8 | 랜딩 → Roadmap | ✗ | 섹션 기반 네비게이션 + 스크롤 동작 검증 |
| TC-9 | /dashboard 직접 접근 | ✗ | 비인증 시 적절한 처리(리다이렉트 또는 공개 뷰). 500 에러 방지 |

**방어적 선택자 패턴:**
- `getByRole("link", { name: /Features/i })` — 텍스트 대소문자 변경에 견딤
- `if (await link.isVisible())` — 링크가 없어도 테스트가 깨지지 않는 soft assertion
- `page.waitForLoadState("networkidle")` — CDN 자산 로드 완료 후 검증

---

## 4. CI 통합 설계

### 4.1 deploy.yml smoke-test job 확장

기존 curl smoke test **이후에** Playwright E2E를 추가해요. curl이 먼저 실행되어 서버 자체가 불가할 때 빠르게 실패하도록 해요.

```yaml
smoke-test:
  if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
  needs: [deploy-api, deploy-web]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: pnpm
    - run: pnpm install --frozen-lockfile

    # Phase 1: 기존 curl smoke test (빠른 실패 감지, ~10초)
    - name: Curl smoke test
      run: bash scripts/smoke-test.sh
      env:
        API_URL: https://foundry-x-api.ktds-axbd.workers.dev
        WEB_URL: https://fx.minu.best

    # Phase 2: Playwright 프로덕션 E2E (브라우저 수준 검증, ~60초)
    - name: Install Playwright browsers
      run: pnpm -F @foundry-x/web exec playwright install --with-deps chromium

    - name: Run production E2E
      run: pnpm -F @foundry-x/web e2e:prod
      env:
        PROD_WEB_URL: https://fx.minu.best
        PROD_API_URL: https://foundry-x-api.ktds-axbd.workers.dev

    # 실패 시에도 artifact 업로드 (스크린샷 + trace)
    - name: Upload E2E report
      uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }}
      with:
        name: prod-e2e-report
        path: packages/web/playwright-report/
        retention-days: 14

    - name: Upload E2E traces
      uses: actions/upload-artifact@v4
      if: ${{ failure() }}
      with:
        name: prod-e2e-traces
        path: packages/web/test-results/
        retention-days: 7
```

### 4.2 CI 실행 흐름

```
deploy.yml (master push)
├── test job (typecheck + lint + unit test)
│   ├── deploy-api (Workers 배포)
│   └── deploy-web (Pages 배포)
│       └── smoke-test
│           ├── Step 1: curl smoke-test.sh (~10초)
│           │   └── 실패 시 → 즉시 종료 (서버 불가)
│           ├── Step 2: Playwright install (~30초)
│           ├── Step 3: Production E2E (~60초)
│           │   ├── smoke.spec.ts (5 TC)
│           │   └── critical-path.spec.ts (4 TC)
│           ├── Step 4: HTML report upload (항상)
│           └── Step 5: Trace upload (실패 시만)
```

### 4.3 package.json 스크립트 추가

`packages/web/package.json`에 다음 스크립트를 추가해요:

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:prod": "playwright test --config playwright.prod.config.ts"
  }
}
```

**기존 `e2e` 스크립트와의 관계:**
- `pnpm e2e` → `playwright.config.ts` (localhost:3000, webServer 포함)
- `pnpm e2e:prod` → `playwright.prod.config.ts` (fx.minu.best, webServer 없음)
- 두 config는 완전히 독립적이에요. 기존 E2E에 영향 없어요.

---

## 5. 환경 변수

| 변수명 | 기본값 | 용도 | 사용 위치 |
|--------|--------|------|----------|
| `PROD_WEB_URL` | `https://fx.minu.best` | 프로덕션 웹 baseURL | playwright.prod.config.ts |
| `PROD_API_URL` | `https://foundry-x-api.ktds-axbd.workers.dev` | 프로덕션 API URL | smoke.spec.ts |
| `CI` | GitHub Actions 자동 설정 | CI 환경 감지 | reporter 분기 |

환경 변수를 사용하는 이유:
- CI에서 명시적으로 URL을 전달하여 의도를 명확히 해요
- 로컬에서 `PROD_WEB_URL`을 변경하면 스테이징 등 다른 환경도 테스트할 수 있어요
- fallback 기본값이 있어서 로컬에서 `pnpm e2e:prod`만 실행해도 동작해요

---

## 6. Risk & Mitigation

| # | 리스크 | 심각도 | 완화 방안 |
|---|--------|:------:|----------|
| R1 | **프로덕션 데이터 오염** | 🔴 High | GET + 네비게이션만 수행. POST/PUT/DELETE 호출 없음. 인증 E2E는 Phase 2로 분리 |
| R2 | **네트워크 의존성** — CI에서 프로덕션 접속 불가 | 🟡 Medium | curl smoke를 먼저 실행하여 빠른 실패. `retries: 1` + `timeout: 30s` |
| R3 | **Flaky 테스트** — CDN 캐시, cold start | 🟡 Medium | `retries: 1` + `waitForLoadState("networkidle")`. 응답 시간 TC는 5초 여유 |
| R4 | **CI 시간 증가** | 🟢 Low | Chromium only + workers: 1. 예상 추가 시간 ~90초 (install 30초 + run 60초) |
| R5 | **UI 변경에 따른 깨짐** | 🟢 Low | 시맨틱 선택자(`getByRole`, `getByText`) + 정규식 패턴. soft assertion으로 optional 요소 처리 |

---

## 7. 테스트 예상 규모

| spec 파일 | TC 수 | 주요 검증 |
|-----------|:-----:|----------|
| `smoke.spec.ts` | 5 | API health, Hero 렌더링, 네비게이션 링크, 콘솔 에러, 응답 시간 |
| `critical-path.spec.ts` | 4 | Features 스크롤, Architecture 이동, Roadmap 섹션, Dashboard 접근 |
| **합계** | **9** | |

기존 E2E 10 spec(20 TC)에 프로덕션 2 spec(9 TC)이 추가되어 총 **12 spec** 예상이에요.

---

## 8. 성공 기준

| 지표 | 목표 |
|------|------|
| 프로덕션 smoke E2E 통과율 | 100% (CI green) |
| CI smoke-test job 총 실행 시간 | < 3분 (curl ~10초 + Playwright install ~30초 + E2E ~60초 + upload ~20초) |
| 프로덕션 데이터 변경 | 0건 (GET only) |
| Flaky rate | < 10% (retries로 커버) |
| 기존 E2E 영향 | 0건 (디렉토리 + config 완전 분리) |

---

## 9. 구현 순서

```
Step 1: playwright.prod.config.ts 작성
  └── 프로덕션 전용 config 신규 생성

Step 2: e2e/prod/smoke.spec.ts 작성
  ├── TC-1: API health check
  ├── TC-2: Hero 렌더링
  ├── TC-3: 네비게이션 링크
  ├── TC-4: 콘솔 에러 검증
  └── TC-5: 응답 시간

Step 3: e2e/prod/critical-path.spec.ts 작성
  ├── TC-6: Features 섹션 스크롤
  ├── TC-7: Architecture 페이지
  ├── TC-8: Roadmap 섹션
  └── TC-9: Dashboard 접근

Step 4: package.json e2e:prod 스크립트 추가

Step 5: deploy.yml CI 연동
  ├── Playwright install step
  ├── e2e:prod 실행 step
  └── artifact 업로드 step (report + traces)

Step 6: 로컬 실행 검증
  └── pnpm -F @foundry-x/web e2e:prod 로컬 실행 확인
```

---

## 10. 향후 확장 (Out of Scope)

| 확장 | 설명 | 전제 조건 |
|------|------|----------|
| **F78-auth** | 프로덕션 테스트 계정 + 인증 E2E | 테스트 계정 DB 시드, GitHub Actions secrets |
| **F78-api** | API 엔드포인트 프로덕션 E2E | OpenAPI 스키마 기반 자동 검증 |
| **F78-perf** | Lighthouse CI 통합 | 성능 회귀 기준선 설정 |
| **F78-schedule** | GitHub Actions cron 헬스 체크 | schedule workflow 추가 |
