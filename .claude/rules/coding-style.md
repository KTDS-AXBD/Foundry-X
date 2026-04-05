# Foundry-X Coding Style

## TypeScript 공통
- 패키지 매니저: pnpm (npm/yarn 금지)
- 빌드: Turborepo (`turbo build/test/lint/typecheck`)
- Node.js 20, TypeScript strict mode

## API (Hono + Cloudflare Workers)
- 라우트: Zod 스키마 필수 — ESLint `require-zod-schema` 룰 적용
- DB 접근: 서비스 레이어 경유 — ESLint `no-direct-db-in-route` 룰 적용
- Plumb import: 패키지 내부만 — ESLint `no-orphan-plumb-import` 룰 적용
- D1 바인딩: `env.DB`로 접근, raw SQL 대신 prepared statement 사용

## Web (Vite 8 + React 18 + React Router 7)
- 상태관리: Zustand (전역), useState (로컬)
- 라우팅: React Router 7 파일 기반 (`src/routes/`)
- 스타일: CSS Modules 또는 인라인 — Tailwind 미사용

## CLI (Commander + Ink 5)
- TUI: Ink 5 (React 18 기반), render.tsx 4-branch dispatcher
- 컴포넌트: 순수 UI(components/) + 로직(views/) 분리
- 출력: json/short/non-TTY/TTY 4가지 모드 지원
