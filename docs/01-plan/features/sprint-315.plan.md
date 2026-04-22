---
id: FX-PLAN-315
sprint: 315
f_items: [F564, F569]
status: active
created: 2026-04-22
---

# Sprint 315 Plan — F564 + F569 (Phase 45 Batch 1)

## 1. 목표

| F-item | 제목 | Milestone |
|--------|------|-----------|
| F564 | CLI VITE_API_URL 전환 + Strangler 완결 | Phase 45 MVP M3 |
| F569 | harness-kit 표준화 (Workers scaffold) | Phase 45 P2 |

**Phase 45 MVP M3 달성 기준**: CLI/Web 모두 fx-gateway 단일 진입점 + foundry-x-api 직결 코드 0건

## 2. 범위

### F564 — Strangler 완결 (FX-REQ-607, P1)

| 항목 | 내용 |
|------|------|
| (a) | `packages/shared/src/types.ts`: `FoundryXConfig`에 `apiUrl` 필드 추가 (default: `https://fx-gateway.ktds-axbd.workers.dev`) |
| (a') | `packages/cli/src/services/config-manager.ts`: `init()` 시 `apiUrl` 저장 |
| (b) | `packages/web/public/_redirects`: `/api/*` → fx-gateway URL 전환 (foundry-x-api 직결 제거) |
| (b') | grep 0건 확증: `packages/` 내 foundry-x-api 직결 URL 없음 (wrangler.toml name, eslint plugin 이름, HTTP-Referer 헤더는 제외) |
| (c) | `packages/web/e2e/`: SSO Hub Token 경로 호환성 E2E 테스트 추가 |
| (d) | `docs/`: ENV 마이그레이션 가이드 문서 생성 |

### F569 — harness-kit 표준화 (FX-REQ-612, P2)

| 항목 | 내용 |
|------|------|
| (a) | harness-kit scaffold 완성 확인 (EventBus, middleware, scaffold templates 존재 검증) |
| (b-1) | `packages/fx-discovery/src/middleware/auth.ts` → harness-kit `createAuthMiddleware` 적용 |
| (b-2) | `packages/fx-shaping/src/middleware/auth.ts` → harness-kit `createAuthMiddleware` 적용 |
| (b-3) | `packages/fx-offering/src/middleware/auth.ts` → harness-kit `createAuthMiddleware` 적용 |
| (b-4) | `packages/fx-gateway/src/app.ts` → harness-kit `createCorsMiddleware` 적용 (선택적) |
| (c) | 버전관리: `workspace:*` internal 전략 공식 확정 (package.json 주석 + 문서) |
| (d) | `scripts/new-worker.sh` scaffold 생성 스크립트 |

### Out-of-scope (Sprint 315)

- F569 (e) CI workflow turbo 경유 전환 — C94 PR #670 후 2주 관찰 후 결정 (Sprint 317 예정)
- F569 (f) Remote cache 도입 결정 — turbo 전환 확정 후 선택
- F569 (g) workflow workspace dep 자동 해소 — (e) 완료 후 자동 달성
- fx-gateway tenant middleware 추가 — scope out (각 도메인 고유 로직 유지)
- Offering 이관 (F570) — Sprint 316 예정

## 3. 영향 파일 예측

### F564
- `packages/shared/src/types.ts` — FoundryXConfig.apiUrl 추가
- `packages/cli/src/services/config-manager.ts` — init()에 apiUrl 포함
- `packages/cli/src/services/config-manager.test.ts` — apiUrl 테스트
- `packages/web/public/_redirects` — foundry-x-api → fx-gateway
- `packages/web/e2e/strangler-gateway.spec.ts` — 신규 E2E
- `docs/guides/api-url-migration.md` — 신규 문서

### F569
- `packages/fx-discovery/src/middleware/auth.ts` — createAuthMiddleware 적용
- `packages/fx-shaping/src/middleware/auth.ts` — createAuthMiddleware 적용
- `packages/fx-offering/src/middleware/auth.ts` — createAuthMiddleware 적용
- `packages/fx-discovery/package.json` — @foundry-x/harness-kit dep 추가
- `packages/fx-shaping/package.json` — @foundry-x/harness-kit dep 추가
- `packages/fx-offering/package.json` — @foundry-x/harness-kit dep 추가
- `scripts/new-worker.sh` — 신규 scaffold 스크립트

## 4. 리스크

| 리스크 | 대응 |
|--------|------|
| `_redirects` 변경 시 prod 경로 단절 | fx-gateway가 이미 모든 /api/* 처리 중임을 사전 확인 |
| harness-kit PublicPaths 불일치 | 각 도메인 PUBLIC_PATHS를 HarnessConfig.publicPaths로 정확히 전달 |
| fx-shaping harness-kit dep 미등록 | pnpm install + typecheck 로 확인 |

## 5. 테스트 계획

### F564 TDD
- Red: `config-manager.test.ts`에 `apiUrl` 기본값 테스트 (FAIL 확인)
- Green: 타입 + init() 구현

### F569 TDD
- Red: `packages/harness-kit/__tests__/middleware.test.ts` 신규 케이스 (createAuthMiddleware 적용 Worker 테스트)
- Green: 각 Worker middleware 교체

### E2E
- `strangler-gateway.spec.ts`: health endpoint 200 응답 via fx-gateway 검증
