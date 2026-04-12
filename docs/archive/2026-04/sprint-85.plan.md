---
code: FX-PLAN-S85
title: "Sprint 85 — Next.js → Vite + React Router 전환"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-30
updated: 2026-03-30
author: Sinclair Seo
references: "[[FX-PLAN-013]], [[FX-DSGN-013]]"
---

# Sprint 85: Next.js → Vite + React Router 전환

## 목표

`packages/web`을 Next.js 14에서 Vite 6 + React Router 7로 전환하여:
- 빌드 피크 메모리 **750MB → <300MB** (60%↓)
- 빌드 시간 **22초 → <10초** (55%↓)
- `next` + SWC 바이너리 **276MB** 제거

## F-Items

| F-Item | 제목 | 우선순위 | 비고 |
|--------|------|---------|------|
| F246 | Vite + React Router 전환 — 빌드 인프라 교체 | P1 | FX-DSGN-013 Step 1~3 |
| F247 | 전환 검증 + 배포 — 테스트 통과 + Pages 배포 확인 | P1 | FX-DSGN-013 Step 4 |

## 실행 계획

### Step 1: 인프라 설정 + PoC (~15분)

```bash
# 의존성 교체
pnpm add vite @vitejs/plugin-react react-router-dom \
  @fontsource-variable/plus-jakarta-sans @fontsource/syne \
  @fontsource-variable/jetbrains-mono -F @foundry-x/web
pnpm remove next -F @foundry-x/web
```

1. `vite.config.ts` 생성
2. `index.html` 생성 (SPA 엔트리)
3. `src/main.tsx` 생성 (React 렌더 엔트리)
4. `src/vite-env.d.ts` 생성
5. AXIS DS 빌드 검증 → **실패 시 Sprint 중단, 대안 검토**

### Step 2: 라우팅 전환 (~20분)

1. `src/router.tsx` — 31개 라우트 정의
2. `src/layouts/` — AppLayout, LandingLayout (기존 layout.tsx 이동)
3. `app/*/page.tsx` → `src/routes/*.tsx` 이동 (31파일)
   - `export default function XxxPage` → `export function Component`
4. `next/link` → `react-router-dom Link` (19파일, `href` → `to`)
5. `next/navigation` 훅 → `react-router-dom` 훅 (11파일)
   - `useRouter().push(path)` → `useNavigate()(path)`
   - `usePathname()` → `useLocation().pathname`
   - `useSearchParams()` → `useSearchParams()` (API 동일)

### Step 3: 설정 정리 (~10분)

1. `NEXT_PUBLIC_API_URL` → `VITE_API_URL` (6파일)
2. `NEXT_PUBLIC_GOOGLE_CLIENT_ID` → `VITE_GOOGLE_CLIENT_ID` (3파일)
3. `.env.production` 갱신
4. `tsconfig.json` — Next.js plugin 제거, target ES2020
5. `package.json` scripts 변경
6. `wrangler.toml` — `out` → `dist`
7. `turbo.json` — outputs에서 `.next/**` 제거
8. `deploy.yml` — `pages deploy out` → `pages deploy dist`
9. `public/_redirects` — SPA fallback 추가
10. Next.js 잔여 파일 삭제 (`next.config.js`, `next-env.d.ts`, `app/` 디렉토리)

### Step 4: 검증 (~15분)

1. `pnpm build` — 빌드 성공 + **메모리/속도 벤치마크**
2. `pnpm test` — 172 unit tests 통과
3. `pnpm dev` — 로컬 페이지 수동 확인
4. `pnpm e2e` — Playwright E2E 통과
5. Cloudflare Pages 프리뷰 배포

## 완료 기준 (DoD)

| 항목 | 기준 |
|------|------|
| 빌드 피크 메모리 | < 300 MB |
| 빌드 시간 (로컬) | < 10초 |
| 번들 크기 (First Load) | ≤ 87.4 KB (현재 수준) |
| Unit Tests | 172 pass |
| E2E Tests | 59 pass |
| Pages 배포 | fx.minu.best 접속 정상 |

## 리스크 체크포인트

| 시점 | 체크 | 실패 시 |
|------|------|---------|
| Step 1 완료 후 | AXIS DS `pnpm build` 성공? | Sprint 중단, `optimizeDeps.include` 시도 후 재평가 |
| Step 2 완료 후 | `pnpm dev` 로컬 페이지 렌더? | 라우팅 설정 디버깅 |
| Step 4 | 벤치마크 DoD 미달? | 성능 프로파일링 후 최적화 |
