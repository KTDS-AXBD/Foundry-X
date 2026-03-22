---
code: FX-PLAN-018
title: "F78 프로덕션 E2E 테스트 — Smoke + 크리티컬 패스 검증"
version: 0.1
status: Draft
category: PLAN
system-version: 1.4.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
related-req: FX-REQ-078
priority: P1
---

# F78 프로덕션 E2E 테스트 — Smoke + 크리티컬 패스 검증

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F78 Production E2E Tests |
| **기간** | 2026-03-18 ~ 2026-03-19 (1일) |
| **REQ** | FX-REQ-078 (P1) |
| **시스템 버전** | v1.4.0 |

| 관점 | 내용 |
|------|------|
| **Problem** | 기존 E2E(10 spec)는 `localhost:3000` 전용이에요. 프로덕션(fx.minu.best) 배포 후 실제 사용자 관점의 검증이 없어서, 배포 깨짐을 smoke-test.sh의 curl HTTP 상태 코드로만 감지하고 있어요. |
| **Solution** | Playwright 프로덕션 전용 config(`playwright.prod.config.ts`)를 추가하고, smoke E2E + 크리티컬 패스 E2E spec을 작성해요. CI deploy.yml의 smoke-test job을 Playwright 기반으로 확장해요. |
| **Function UX Effect** | 배포 직후 랜딩 렌더링, 네비게이션, 핵심 페이지 접근성을 브라우저 수준에서 자동 검증해요. 실패 시 스크린샷 artifact로 즉시 디버깅할 수 있어요. |
| **Core Value** | "Git이 진실, Foundry-X는 렌즈" — 프로덕션 렌즈가 정상 작동하는지 매 배포마다 자동 확인하는 안전망이에요. |

---

## 1. Overview

### 1.1 목적

프로덕션 환경(fx.minu.best + foundry-x-api.ktds-axbd.workers.dev)에서 Playwright 브라우저 E2E 테스트를 실행하여, 배포 후 사용자 경험 수준의 검증을 자동화해요.

### 1.2 배경

| 구분 | 현재 상태 | 문제 |
|------|----------|------|
| **로컬 E2E** | `packages/web/e2e/` 10 spec, `playwright.config.ts` (baseURL: localhost:3000, webServer: pnpm dev) | 프로덕션 환경과 무관 |
| **프로덕션 검증** | `scripts/smoke-test.sh` (curl 7개 체크, HTTP 상태 코드만 확인) | DOM 렌더링, JS 에러, 네비게이션 깨짐 감지 불가 |
| **CI** | `deploy.yml` → `smoke-test` job이 curl 스크립트 실행 | 브라우저 수준 검증 없음 |
| **E2E CI** | `e2e.yml` → PR에서만 localhost 기반 실행 | 프로덕션 대상 실행 불가 |

### 1.3 기존 E2E spec 현황 (참고)

| spec 파일 | 인증 | 주요 검증 |
|-----------|:----:|----------|
| `landing.spec.ts` | ✗ | Hero 텍스트, 네비게이션 링크 |
| `auth-flow.spec.ts` | ✗ | 대시보드 접근 시 URL 패턴 |
| `dashboard.spec.ts` | ✓ | 사이드바 네비게이션, 헤딩 |
| `agents.spec.ts` | ✓ | Agent Transparency 헤딩, 에이전트 목록 |
| `spec-generator.spec.ts` | ✓ | Spec 생성기 UI |
| `agent-execute.spec.ts` | ✓ | 에이전트 실행 모달 |
| `conflict-resolution.spec.ts` | ✓ | 충돌 해결 UI |
| `sse-lifecycle.spec.ts` | ✓ | SSE 연결 라이프사이클 |
| `mcp-server.spec.ts` | ✓ | MCP 서버 관리 UI |

### 1.4 기존 인증 fixture

`e2e/fixtures/auth.ts`에서 `authenticatedPage`를 제공해요:
- `POST /api/auth/login` → JWT 토큰 획득
- `localStorage.setItem("fx-token", token)` → 클라이언트 인증

프로덕션에서는 테스트 계정이 DB에 존재해야 하므로, **비인증(public) 경로만 우선 구현**하고 인증 경로는 Phase 2로 분리해요.

---

## 2. Scope

### 2.1 F78 체크리스트

- [ ] `packages/web/playwright.prod.config.ts` 신규 생성
  - `baseURL: "https://fx.minu.best"`
  - `webServer` 설정 없음 (프로덕션 직접 접속)
  - `timeout: 30000` (네트워크 지연 대비)
  - `retries: 1` (flaky 방지)
  - Chromium only
- [ ] `packages/web/e2e/prod/smoke.spec.ts` 신규
  - API health check (`/` → 200)
  - 랜딩 페이지 로딩 + Hero 텍스트 검증
  - 네비게이션 링크 존재 확인
  - 콘솔 에러 없음 확인
- [ ] `packages/web/e2e/prod/critical-path.spec.ts` 신규
  - 랜딩 → Features 섹션 스크롤
  - 랜딩 → Dashboard 링크 클릭 → 대시보드 페이지 도달
  - 대시보드 → Agents 사이드바 네비게이션
  - 대시보드 → Spec Generator 네비게이션
- [ ] `package.json` scripts 추가: `"e2e:prod": "playwright test --config playwright.prod.config.ts"`
- [ ] `.github/workflows/deploy.yml` — smoke-test job에 Playwright 프로덕션 E2E step 추가
- [ ] (검토) 프로덕션 테스트 계정 필요 여부 → **Phase 2 (F78-auth)로 분리**

### 2.2 명시적 제외 (Out of Scope)

- 인증이 필요한 프로덕션 E2E (테스트 계정 DB 시드 필요)
- 프로덕션 데이터 쓰기 (POST/PUT/DELETE 호출)
- 기존 localhost E2E spec 수정
- API 단위 테스트 추가

---

## 3. Technical Details

### 3.1 파일 목록

| # | 파일 | 유형 | 설명 |
|---|------|------|------|
| 1 | `packages/web/playwright.prod.config.ts` | 신규 | 프로덕션 전용 Playwright config |
| 2 | `packages/web/e2e/prod/smoke.spec.ts` | 신규 | Smoke E2E (health + 랜딩 + 콘솔 에러) |
| 3 | `packages/web/e2e/prod/critical-path.spec.ts` | 신규 | 크리티컬 패스 네비게이션 E2E |
| 4 | `packages/web/package.json` | 수정 | `e2e:prod` 스크립트 추가 |
| 5 | `.github/workflows/deploy.yml` | 수정 | smoke-test job 확장 |

### 3.2 구현 순서

```
Step 1: playwright.prod.config.ts 작성
  └── baseURL, timeout, retries, reporter 설정

Step 2: e2e/prod/smoke.spec.ts 작성
  ├── API root health GET 200
  ├── 랜딩 페이지 렌더링 검증
  ├── Hero 텍스트 + 네비게이션 링크
  └── 콘솔 에러 0건 확인

Step 3: e2e/prod/critical-path.spec.ts 작성
  ├── 랜딩 → Dashboard 네비게이션
  ├── Dashboard → Agents 네비게이션
  └── Dashboard → Spec Generator 네비게이션

Step 4: package.json e2e:prod 스크립트 추가

Step 5: deploy.yml CI 연동
  ├── Playwright install step
  ├── e2e:prod 실행 step
  └── playwright-report artifact 업로드
```

### 3.3 playwright.prod.config.ts 설계

```typescript
// 핵심 설정 방향
{
  testDir: "./e2e/prod",           // 프로덕션 전용 디렉토리
  baseURL: process.env.PROD_WEB_URL || "https://fx.minu.best",
  timeout: 30_000,                  // 네트워크 지연 대비
  retries: 1,                       // flaky 방지 1회 재시도
  reporter: process.env.CI ? "github" : "html",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // webServer 없음 — 프로덕션 직접 접속
}
```

### 3.4 CI deploy.yml 변경안

기존 `smoke-test` job을 확장해요:

```yaml
smoke-test:
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

    # 기존 curl smoke test (빠른 실패 감지)
    - name: Curl smoke test
      run: bash scripts/smoke-test.sh

    # 프로덕션 E2E (브라우저 수준 검증)
    - name: Install Playwright
      run: pnpm -F @foundry-x/web exec playwright install --with-deps chromium
    - name: Run production E2E
      run: pnpm -F @foundry-x/web e2e:prod
      env:
        PROD_WEB_URL: https://fx.minu.best
        PROD_API_URL: https://foundry-x-api.ktds-axbd.workers.dev

    - uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }}
      with:
        name: prod-e2e-report
        path: packages/web/playwright-report/
        retention-days: 14
```

---

## 4. Risk & Mitigation

| # | 리스크 | 심각도 | 완화 방안 |
|---|--------|:------:|----------|
| R1 | **프로덕션 데이터 오염** — E2E가 POST/PUT 호출로 프로덕션 DB를 변경할 수 있어요 | 🔴 High | F78 범위를 **GET(읽기) + 네비게이션만**으로 제한해요. 인증 필요 E2E는 Phase 2로 분리하고, 테스트 계정 + 전용 테넌트 설계 후 구현해요 |
| R2 | **네트워크 의존성** — CI에서 프로덕션 서버 접속 불가 시 E2E 실패 | 🟡 Medium | `retries: 1` + `timeout: 30s` 설정. curl smoke test를 먼저 실행해서 서버 불가 시 빠르게 실패하도록 해요 |
| R3 | **Flaky 테스트** — Cloudflare CDN 캐시, cold start 등으로 간헐적 실패 | 🟡 Medium | `retries: 1`로 1회 재시도. `waitForLoadState("networkidle")` 사용. 첫 테스트에 warm-up 요청 포함해요 |
| R4 | **인증 토큰 관리** — 프로덕션 테스트 계정 JWT가 CI secrets에 노출될 수 있어요 | 🟡 Medium | F78에서는 비인증 경로만 테스트해요. 향후 인증 E2E 시 GitHub Actions secrets + 테스트 전용 계정 사용해요 |
| R5 | **UI 변경에 따른 깨짐** — 프로덕션 E2E가 텍스트/선택자에 강하게 의존하면 유지보수 부담 | 🟢 Low | `getByRole()`, `getByText()` 등 시맨틱 선택자 사용. 구체적 텍스트 대신 패턴(`/heading/i`) 사용해요 |

---

## 5. 테스트 예상 규모

| 구분 | spec 수 | 예상 테스트 케이스 |
|------|:-------:|:-----------------:|
| smoke.spec.ts | 1 | 4~5 |
| critical-path.spec.ts | 1 | 3~4 |
| **합계** | **2 spec** | **7~9 케이스** |

기존 E2E 20 spec에 프로덕션 2 spec이 추가되어 총 **22 spec**이 돼요.

---

## 6. 성공 기준

| 지표 | 목표 |
|------|------|
| 프로덕션 smoke E2E 통과율 | 100% (CI green) |
| CI smoke-test job 실행 시간 | < 3분 (curl + Playwright 합산) |
| 프로덕션 데이터 변경 | 0건 (GET only) |
| Flaky rate | < 10% (retries로 커버) |

---

## 7. 향후 확장 (Phase 2)

- **F78-auth**: 프로덕션 테스트 계정 시드 + 인증 E2E (대시보드, 에이전트 실행)
- **F78-api**: API 엔드포인트 프로덕션 E2E (OpenAPI 스키마 검증)
- **F78-perf**: Lighthouse CI 통합 (성능 회귀 감지)
- **F78-schedule**: GitHub Actions cron으로 주기적 프로덕션 헬스 체크
