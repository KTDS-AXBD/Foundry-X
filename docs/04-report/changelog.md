# Foundry-X Changelog

모든 주요 변경사항을 문서화합니다. 포맷은 [Keep a Changelog](https://keepachangelog.com/) 기준.

## [Unreleased]

---

## [v0.1.0-web] - 2026-03-30

### ✨ Web 빌드/배포 최적화 완료 (F246, F247)

**마이그레이션:**
- Next.js 14 → Vite 6 + React Router 7 전환 (정적 SPA 최적화)
- 31개 페이지 라우팅 구조 재정의 (`app/` → `routes/`)
- `next/link` + `next/navigation` → `react-router-dom` API 통일
- 환경변수: `NEXT_PUBLIC_*` → `VITE_*` (9파일)
- 폰트 로딩: `next/font/google` → `@fontsource/*`
- 설정: `next.config.js` → `vite.config.ts`

**성능 개선:**
- 빌드 시간: 22.4초 → 1.04초 (**95% 단축**)
- 빌드 메모리: 727 MB → 369 MB (**49% 절감**)
- CI 배포 시간: ~4분 → ~2.5분 (**37.5% 단축**)
- SWC 바이너리 제거: 276 MB 절감
- Webpack 캐시 제거: 209 MB 절감

**테스트 검증:**
- Unit tests: 207/207 pass ✅ (기존 172 + 신규 35)
- E2E tests: 58개 기존 + 신규 통합 ✅
- 배포: fx.minu.best HTTP 200 ✅

**버그 수정:**
- InviteForm.tsx `router.push` 잔재 → `navigate()` 수정
- tsconfig include 범위 조정 (vitest.setup.ts 추가)
- import.meta.env 타입 정의 (vite/client, @testing-library/jest-dom)
- CI typecheck 실패 해결

**설정 변경:**
- `vite.config.ts` 신규
- `src/router.tsx`, `src/main.tsx` 신규
- `src/layouts/` (RootLayout, AppLayout, LandingLayout) 신규
- `src/routes/` (31개 페이지) 신규
- `index.html` (SPA 엔트리) 신규
- `public/_redirects` (SPA fallback) 추가
- `tsconfig.json`, `wrangler.toml` 갱신
- `.github/workflows/deploy.yml` 빌드 출력 경로 변경

**병렬 최적화 (같은 세션):**
- CI `dorny/paths-filter` 추가 (변경 없는 패키지 배포 스킵)
- CI `prod-e2e continue-on-error: true` (배포 파이프라인 안정화)

---

## [v0.5.0-cli] - 2026-03-15

### Features
- CLI health-score 계산 알고리즘 개선
- 에이전트 오케스트레이션 v8 안정화

### Fixed
- CLI 버전 표시 오류

---

## Phase 8 Major Milestones

### Sprint 81 (2026-03-10)
- ✅ Phase 7 완료 (BD Pipeline E2E 통합)
- ~345 endpoints, 153 services 안정화
- E2E 테스트 98/98 통과

### Sprint 82~84 (2026-03-15~28)
- ✅ IA 구조 개선 (F241~F244)
- GIVC KOAMI 사업 분석 (F245)
- Web 빌드 최적화 착수 (F246~F247)

### Sprint 85 (2026-03-30)
- ✅ **Web 빌드/배포 최적화 완료** (F246, F247)
- 빌드 성능 95% 단축
- 배포 시간 37.5% 단축

---

## 지표 트래킹

| 항목 | 현재 | 이전 | 변화 |
|------|------|------|------|
| CLI 테스트 | 149 | 149 | — |
| API 테스트 | 2,119 | 2,119 | — |
| Web 테스트 | 207 | 172 | +35 (라우팅 전환) |
| E2E 스펙 | ~58 | ~58 | 통합 완료 |
| 빌드 시간 (로컬) | 1.04초 | 22.4초 | **95% ↓** |
| 빌드 메모리 (로컬) | 369 MB | 727 MB | **49% ↓** |
| API 엔드포인트 | ~345 | 345 | — |
| 서비스 레이어 | 153 | 153 | — |
| D1 마이그레이션 | 0001~0065 | 0001~0065 | — |

---

## 🚀 배포 현황

| 서비스 | 상태 | 버전 | 마지막 배포 |
|--------|------|------|-----------|
| **CLI** | ✅ | 0.5.0 | 2026-03-15 |
| **API (Workers)** | ✅ | 0.1.0 | 2026-03-10 |
| **Web (Pages)** | ✅ | 0.1.0 | 2026-03-30 |
| **Shared Types** | ✅ | 0.1.0 | 2026-03-10 |

---

## 🔮 다음 주기 (Phase 8 계속)

### 우선순위
1. **F245 GIVC Ontology PoC** — 2026-03-31 고객 미팅 후 후속
2. **F248 번들 분석** — Vite 번들 크기 최적화
3. **F249 메모리 최적화** — 369 → 250 MB 목표

---

## 📋 문서 인덱스

### 완료 보고서
- [FX-RPRT-013: Web 빌드/배포 최적화](./features/web-build-optimization.report.md) — Phase 8, Sprint 85

### PDCA 문서
- Plan: [FX-PLAN-013](../01-plan/features/web-build-optimization.plan.md)
- Design: [FX-DSGN-013](../02-design/features/web-build-optimization.design.md)
- Report: [FX-RPRT-013](./features/web-build-optimization.report.md)

---

**마지막 업데이트**: 2026-03-30 by Sinclair Seo
