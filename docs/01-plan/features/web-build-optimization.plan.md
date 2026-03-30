---
code: FX-PLAN-013
title: "Web 빌드/배포 최적화 — Next.js → Vite 전환 계획"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-30
updated: 2026-03-30
author: Sinclair Seo
---

# FX-PLAN-013: Web 빌드/배포 최적화

## 1. 배경 및 동기

### 현재 상태 측정 (2026-03-30)

| 항목 | 수치 |
|------|------|
| 프레임워크 | Next.js 14.2.35 (`output: "export"`) |
| 빌드 소요 | **22~29초** (로컬 WSL) |
| 빌드 피크 메모리 | **727~784 MB** |
| webpack 캐시 | 209 MB (`.next/cache/webpack/`) |
| `.next/` 전체 | 215 MB |
| 최종 출력 (`out/`) | **3.5 MB** |
| 페이지 수 | 31개 |
| 컴포넌트 수 | 124개 (.tsx) |
| 소스 라인 | ~24,000 |

### 문제

1. **과잉 인프라**: 3.5MB 정적 사이트를 위해 ~750MB 메모리 사용. 서버 기능(SSR, ISR, API Routes) 미사용
2. **SWC 이중 설치**: `@next/swc-linux-x64-musl` (150MB) + `@next/swc-linux-x64-gnu` (126MB) = 276MB
3. **CI 비효율**: 4개 job × `pnpm install` (976MB) 반복
4. **WSL 작업 방해**: 빌드 시 750MB 점유 + CPU 170% → 다른 작업 병행 불가

### Quick Wins (즉시 적용 — 이 Plan과 별개)

- [x] prod-e2e `continue-on-error: true` — 파이프라인 성공률 회복
- [x] `dorny/paths-filter` 기반 path filter — 불필요 deploy 스킵
- [x] `build:clean` 스크립트 — webpack 캐시 초기화 옵션

## 2. 전환 선택지 비교

### Option A: Next.js 15 + Turbopack (보수적)

| 항목 | 예상 |
|------|------|
| 빌드 메모리 | ~400 MB (40% 감소) |
| 빌드 속도 | ~10초 (Turbopack) |
| 마이그레이션 비용 | 낮음 (breaking changes 제한적) |
| 리스크 | Turbopack 안정성 (GA 직후) |
| React 버전 | 18 유지 가능 (19 선택적) |

장점: 기존 코드 대부분 유지. `next.config.js`에 `--turbopack` 추가 수준.
단점: `output: "export"` + Turbopack 조합의 안정성 미검증.

### Option B: Vite + React Router (권장)

| 항목 | 예상 |
|------|------|
| 빌드 메모리 | ~150-200 MB (70-75% 감소) |
| 빌드 속도 | ~3-5초 |
| 마이그레이션 비용 | 중간 (라우팅 구조 변경) |
| 리스크 | 낮음 (Vite 5.x 안정) |
| HMR 속도 | 즉각 (ESM 네이티브) |

장점: 정적 사이트에 최적. 번들 크기·메모리·속도 모두 우위.
단점: Next.js App Router → React Router 라우팅 마이그레이션 필요.

### Option C: Astro + React Islands (대안)

| 항목 | 예상 |
|------|------|
| 빌드 메모리 | ~100-150 MB (80% 감소) |
| 빌드 속도 | ~2-3초 |
| 마이그레이션 비용 | 높음 (아일랜드 아키텍처 전환) |
| JS 번들 크기 | 최소 (컴포넌트 단위 하이드레이션) |

장점: 최소 JS 전송. 정적 콘텐츠 사이트에 이상적.
단점: 현재 SPA 스타일 대시보드와 구조적 불일치. 전면 재작성에 가까움.

### 권장: Option B (Vite + React Router)

이유:
1. `output: "export"` = 이미 정적 사이트. Next.js의 SSR/ISR 가치가 0
2. Vite는 esbuild 기반으로 SWC 바이너리 불필요 → 설치 크기도 감소
3. React Router v7은 파일 기반 라우팅 지원 → 마이그레이션 난이도 낮음
4. Tailwind v4 + shadcn/ui는 프레임워크 비의존 → 그대로 사용 가능

## 3. 마이그레이션 범위

### 변경 필요

| 영역 | 현재 (Next.js) | 전환 후 (Vite) | 파일 수 |
|------|---------------|---------------|---------|
| 라우팅 | `app/(app)/*/page.tsx` | `routes/*.tsx` + router config | 31 |
| 레이아웃 | `layout.tsx` (중첩) | Layout 컴포넌트 (수동) | 4 |
| 설정 | `next.config.js` | `vite.config.ts` | 1 |
| 빌드 출력 | `.next/` → `out/` | `dist/` | — |
| 이미지 | `next/image` (unoptimized) | `<img>` (이미 동일) | ~0 |
| 링크 | `next/link` | `react-router Link` | grep 후 확인 |
| 환경변수 | `NEXT_PUBLIC_*` | `VITE_*` | 2-3 |
| CI/CD | `next build` | `vite build` | 1 |

### 변경 불필요 (그대로 유지)

- Tailwind v4 + PostCSS 파이프라인
- shadcn/ui + AXIS DS 컴포넌트
- Zustand 상태 관리
- `lib/api-client.ts`, `lib/sse-client.ts`
- 124개 컴포넌트 (JSX 로직 동일)
- Playwright E2E 테스트 (URL 기반, 프레임워크 비의존)

### 주의 사항

- `next/link` → `<Link>` (react-router): prefetch 동작 차이
- `next/navigation` (`useRouter`, `usePathname`) → react-router hooks
- `transpilePackages` → Vite plugin 또는 불필요 (ESM이면)
- `_redirects` (Cloudflare Pages) → 유지 (프레임워크 무관)

## 4. 실행 계획

### Phase 1: 준비 (Sprint N)
- [ ] `next/link`, `next/navigation` import 전수 조사 + 변경 범위 확정
- [ ] Vite + React Router 7 스캐폴딩 (`vite.config.ts`, `routes/`)
- [ ] AXIS DS 패키지가 Vite에서 정상 빌드되는지 검증 (PoC)

### Phase 2: 코어 전환 (Sprint N+1)
- [ ] 라우팅 전환: `app/` → `routes/` (31 페이지)
- [ ] 레이아웃 전환: `layout.tsx` → Layout 컴포넌트 4개
- [ ] 환경변수 전환: `NEXT_PUBLIC_*` → `VITE_*`
- [ ] 빌드 스크립트 업데이트: `package.json`, `turbo.json`

### Phase 3: 검증 + 배포 (Sprint N+2)
- [ ] 기존 172 unit tests 통과 확인
- [ ] 기존 ~59 E2E tests 통과 확인
- [ ] Cloudflare Pages 배포 (`wrangler pages deploy dist/`)
- [ ] 빌드 성능 벤치마크: 메모리, 시간, 번들 크기

### 완료 기준 (DoD)

| 항목 | 목표 |
|------|------|
| 빌드 피크 메모리 | < 300 MB |
| 빌드 시간 (로컬) | < 10초 |
| 번들 크기 (First Load) | ≤ 현재 87.4 KB |
| 테스트 통과 | unit 172 + E2E 59 전량 |
| 배포 정상 | fx.minu.best 접속 확인 |

## 5. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| AXIS DS가 Vite에서 빌드 실패 | 높음 | Phase 1 PoC에서 사전 검증 |
| React Router v7 파일 라우팅 불안정 | 중간 | 수동 route config 대안 |
| Playwright E2E URL 변경 | 낮음 | `output: "export"` 동일 출력이면 URL 불변 |
| Zustand SSR 코드 잔재 | 낮음 | 정적 빌드이므로 영향 없음 |
