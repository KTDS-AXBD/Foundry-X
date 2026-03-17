# Changelog

All notable changes to the Foundry-X project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.6.0] - 2026-03-17

### Summary
**Phase 2 Sprint 6 완료** — Cloudflare 인프라 기반 구축 (F37 배포 + F39 D1 스키마 + F40 JWT 인증 + RBAC). F38 OpenAPI는 복잡도 증가로 Sprint 7 이관. 전체 Match Rate 84% (F37+F39+F40 범위 96%).

### Added
- **Cloudflare Workers 배포 파이프라인**
  - `wrangler.toml` — D1 바인딩 + env 설정
  - `.github/workflows/deploy.yml` — CI/CD (typecheck/lint/test/deploy)
  - `src/index.ts` — Workers entry point (`export default app`)
  - Hono + Workers 네이티브 지원

- **D1 데이터베이스 (SQLite)**
  - `src/db/schema.ts` — Drizzle ORM 스키마 (6 테이블)
    - `users` (인증 + RBAC)
    - `projects` (Git 리포 연결)
    - `wiki_pages` (Wiki CRUD + ownership)
    - `token_usage` (AI 비용 추적)
    - `agent_sessions` (에이전트 작업 추적)
    - `refresh_tokens` (JWT 회전)
  - `src/db/migrations/0001_initial.sql` — 초기 DDL (6 테이블 + 6 인덱스)
  - `src/db/seed.sql` — 샘플 데이터 (admin 사용자 + Foundry-X 프로젝트)
  - `src/db/index.ts` — D1 helper (Database 타입 export)

- **JWT 인증 + RBAC 미들웨어**
  - `src/routes/auth.ts` — auth 라우트 (signup/login/refresh)
  - `src/middleware/auth.ts` — JWT 검증 + 토큰 발급
    - Access Token: 1h TTL
    - Refresh Token: 7d TTL
    - `createTokenPair()` 유틸
  - `src/middleware/rbac.ts` — 역할 기반 접근 제어
    - admin (모든 권한)
    - member (쓰기 권한, 일부 관리 기능)
    - viewer (읽기 전용)
  - `src/utils/crypto.ts` — PBKDF2 기반 비밀번호 해싱 (Web Crypto API)

- **API 엔드포인트 인증 적용**
  - GET /api/profile, /api/integrity, /api/freshness, /api/wiki — `viewer` 역할
  - POST/PUT/DELETE /api/wiki, PUT /api/requirements — `member` 역할
  - Public 엔드포인트: /api/health, /api/auth/*, /api/docs, /api/openapi.json

- **테스트 강화**
  - `packages/api/src/__tests__/auth.test.ts` — JWT 토큰 발급 + 검증 (8 tests)
  - `packages/api/src/__tests__/middleware.test.ts` — auth/RBAC 미들웨어 (6 tests)
  - `packages/api/src/__tests__/simple-routes.test.ts` — JWT 헤더 추가 (16 tests)
  - `packages/api/src/__tests__/wiki.test.ts` — jwtPayload mock 미들웨어 (5 tests)
  - `packages/api/src/__tests__/requirements.test.ts` — jwtPayload mock 미들웨어 (4 tests)
  - 합계: API 39 tests + CLI 106 tests = **145 pass (100%)**

- **Swagger UI**
  - `/api/docs` — Swagger UI 마운트
  - `/api/openapi.json` — OpenAPI 3.1 spec (static stub, Sprint 7에서 동적 생성)

- **DB 관리 스크립트** (package.json)
  - `db:migrate:local` — D1 로컬 마이그레이션
  - `db:migrate:remote` — D1 프로덕션 마이그레이션
  - `db:seed:local` — 로컬 샘플 데이터 적용

### Changed
- **배포 워크플로우**
  - 개발: `turbo dev` → `wrangler dev` (D1 로컬 포함)
  - 배포: GitHub push → GitHub Actions → Cloudflare Workers + Pages

- **API 미들웨어 구조**
  - `app.use("/api/*", authMiddleware)` — 전역 JWT 검증
  - 엔드포인트별 `rbac("member")` 선택적 적용

- **테스트 환경 설정**
  - testApp에서 jwtPayload mock 미들웨어 구성
  - Bearer token 자동 주입

- **의존성**
  - `@hono/node-server` → devDependencies 이동 (Workers 배포 시 불필요)
  - `@hono/swagger-ui` 추가

### Fixed
- wiki 라우트 PUT/POST/DELETE에 RBAC 미들웨어 적용
- requirements PUT에 RBAC 미들웨어 적용
- authMiddleware 전역 미적용 해소

### Deprecated
- 마이막 메모리 기반 auth store (Sprint 7에서 D1 users 테이블로 대체 예정)

### Removed
- 프로토타입 mock auth routes (auth.ts로 통합)

### Notes
- **F38 OpenAPI 3.1 전환**: 9개 라우트 createRoute + Zod 스키마 복잡도 증가로 Sprint 7 초반으로 이관
- **Design Match Rate**: 전체 84% (F37 92% + F38 35% + F39 97% + F40 100%)
- **Sprint 6 고유 범위 Match Rate**: 96% (F37+F39+F40, F38 제외)
- **Iteration 2회**: v0.1 (61%) → v0.2 (76%) → v0.3 (84%)

### Sprint Details
- **Week 1**: 배포 파이프라인 + DB 스키마 (Iteration 1 추가: auth + deploy.yml + Swagger)
- **Week 2**: JWT + RBAC (Iteration 2 추가: 마이그레이션 + seed + RBAC 실제 적용 + 테스트)
- **Commit 수**: 3 (배포 기반 + Iteration 1 + Iteration 2)

---

## [0.5.0] - 2026-03-17

### Summary
**Phase 1 MVP 완료** — CLI v0.5.0, Sprint 1~5 모두 완료 (36/36 F-items DONE). PDCA Match Rate 93~97%.

### Added
- CLI 3개 커맨드 (init, status, sync)
- 하네스 빌더 4개 (Architecture, Constitution, CLAUDE, Agents)
- 동적 산출물 생성 (templates 15개)
- 린팅 + watch 모드
- UI 테스트 프레임워크 (ink-testing-library)
- 106개 테스트 (100% pass)

### Details
참고: [Sprint 5 Part B 완료 보고서](features/sprint-5-part-b.report.md)

---

## [0.4.0] - 2026-03-17

**Sprint 5 Part B** — 하네스 산출물 확장 (F32~F36), Builder 패턴

---

## [0.3.0] - 2026-03-XX

**Sprint 4** — UI 테스트 + watch 모드

---

## [0.2.0] - 2026-03-XX

**Sprint 3** — Ink TUI + ESLint

---

## [0.1.0] - 2026-03-XX

**Sprint 1~2** — MVP CLI (3개 커맨드) + 기초 하네스

---

## 참고

- **PDCA 문서**: `docs/01-plan/`, `docs/02-design/`, `docs/03-analysis/`, `docs/04-report/`
- **현재 상태**: Phase 2 Sprint 6 완료, Sprint 7 준비 중
- **다음 릴리스**: v0.7.0 (Sprint 7, OpenAPI + D1 실연동)
