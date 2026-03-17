---
code: FX-DSGN-047
title: "fx.minu.best 커스텀 도메인 설정 가이드"
version: "0.1"
status: Draft
category: DSGN
created: 2026-03-17
updated: 2026-03-17
author: AI Agent (Worker-2)
---

# fx.minu.best 커스텀 도메인 설정 가이드

## 1. 개요

Foundry-X 웹 대시보드(packages/web)를 Cloudflare Pages에 배포하고,
커스텀 도메인 `fx.minu.best`를 바인딩하는 절차를 기술한다.

### 아키텍처

```
fx.minu.best (Cloudflare Pages)
  ├── / → Next.js static export (out/)
  └── /api/* → _redirects → foundry-x-api.ktds-axbd.workers.dev
```

## 2. 사전 조건

- Cloudflare 계정에 `minu.best` 도메인의 DNS 관리 권한
- GitHub 리포지토리: KTDS-AXBD/Foundry-X
- Cloudflare API Token (Pages 배포 권한)
- pnpm + Node.js 20+

## 3. Step-by-Step 설정

### Step 1: Next.js Static Export 설정

`packages/web/next.config.js`에 다음 설정이 적용되어 있어야 한다:

```js
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["@foundry-x/shared"],
  // rewrites는 dev 전용 — static export에서는 무시됨
};
```

> **주의**: `output: "export"` 모드에서는 `rewrites()`가 동작하지 않는다.
> 프로덕션 API 프록시는 `public/_redirects`로 처리한다.

### Step 2: API 프록시 설정 (_redirects)

`packages/web/public/_redirects` 파일 생성:

```
/api/*  https://foundry-x-api.ktds-axbd.workers.dev/api/:splat  200
```

이 파일은 Cloudflare Pages가 `/api/*` 요청을 Workers API로 프록시한다.

> **참고**: `:splat`은 Cloudflare Pages의 와일드카드 캡처 문법이다.

### Step 3: Cloudflare Pages 프로젝트 빌드 확인

로컬에서 빌드가 정상인지 확인:

```bash
cd packages/web
pnpm build   # next build → out/ 디렉토리 생성
ls out/       # HTML 파일 확인
```

### Step 4: Cloudflare Dashboard에서 Pages 프로젝트 생성

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create
2. **Pages** 탭 선택 → **Connect to Git**
3. GitHub 리포지토리: `KTDS-AXBD/Foundry-X` 선택
4. 빌드 설정:
   - **Framework preset**: Next.js (Static HTML Export)
   - **Build command**: `cd packages/web && pnpm install && pnpm build`
   - **Build output directory**: `packages/web/out`
   - **Root directory**: `/` (모노리포 루트)
5. **Environment variables** (필요시):
   - `NODE_VERSION`: `20`
6. **Save and Deploy**

> **대안**: Dashboard 대신 Wrangler CLI로 배포 가능 (Step 6 참조).

### Step 5: 커스텀 도메인 바인딩

1. Cloudflare Dashboard → Workers & Pages → `foundry-x-web` 프로젝트
2. **Custom domains** 탭 → **Set up a custom domain**
3. 도메인 입력: `fx.minu.best`
4. Cloudflare가 자동으로 CNAME 레코드 추가:
   - `fx` → `foundry-x-web.pages.dev`
5. SSL 인증서 자동 발급 대기 (보통 몇 분 이내)
6. 확인: `https://fx.minu.best` 접속

### Step 6: Wrangler CLI 배포 (대안)

Dashboard 대신 CLI로 배포하는 방법:

```bash
cd packages/web
pnpm build
npx wrangler pages deploy out --project-name=foundry-x-web
```

> `wrangler.toml`에 `pages_build_output_dir = "out"`이 설정되어 있으므로
> `npx wrangler pages deploy`만으로도 동작한다.

### Step 7: GitHub Actions deploy-web Job 복원

`.github/workflows/deploy.yml`에 다음 job을 추가:

```yaml
deploy-web:
  name: Deploy Web (Pages)
  needs: [test]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/master'
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: 9
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - run: pnpm --filter @foundry-x/web build
    - name: Deploy to Cloudflare Pages
      uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        workingDirectory: packages/web
        command: pages deploy out --project-name=foundry-x-web
```

> **필수**: GitHub Secrets에 `CLOUDFLARE_API_TOKEN` 등록 필요.
> 토큰 권한: Account > Cloudflare Pages > Edit

### Step 8: API Rewrites 프로덕션 전환

개발 환경에서는 `next.config.js`의 `rewrites()`가 localhost:3001로 프록시한다.
프로덕션에서는 `_redirects` 파일이 Workers URL로 프록시한다.

환경별 동작:

| 환경 | API 프록시 방식 | 대상 |
|------|----------------|------|
| `pnpm dev` (로컬) | next.config.js rewrites | http://localhost:3001 |
| Cloudflare Pages (프로덕션) | `_redirects` | foundry-x-api.ktds-axbd.workers.dev |

### Step 9: DNS 전파 확인

```bash
dig fx.minu.best CNAME +short
# 예상: foundry-x-web.pages.dev.

curl -I https://fx.minu.best
# 예상: HTTP/2 200, cf-ray 헤더 포함
```

## 4. 트러블슈팅

### Pages 프로젝트 생성 실패
- Cloudflare API Token에 `Cloudflare Pages:Edit` 권한 확인
- 모노리포에서 Build output directory가 `packages/web/out`인지 확인

### 404 에러
- `output: "export"` 설정 확인 → `out/` 디렉토리에 HTML 파일 존재 여부
- Dynamic routes (`[slug]`) 사용 시 `generateStaticParams()` 필수

### API 요청 실패
- `_redirects` 파일이 `out/` 빌드 결과에 포함되는지 확인
  (소스: `public/_redirects` → 빌드 후 `out/_redirects`)
- Workers URL이 정상 응답하는지 직접 확인:
  `curl https://foundry-x-api.ktds-axbd.workers.dev/api/health`

### SSL 인증서 대기
- 커스텀 도메인 추가 후 최대 24시간 소요 가능 (보통 수 분)
- Cloudflare Dashboard > SSL/TLS > Edge Certificates에서 상태 확인

## 5. 참고 자료

- [Cloudflare Pages - Deploy a Next.js site](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/)
- [Cloudflare Pages - Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare Pages - Redirects](https://developers.cloudflare.com/pages/configuration/redirects/)
- [[FX-PLAN-008]] Sprint 8 Plan
- [[FX-DSGN-008]] Sprint 8 Design
