---
id: FX-RPRT-315
sprint: 315
f_items: [F564, F569]
match_rate: 100
status: complete
created: 2026-04-22
---

# Sprint 315 Report — F564 + F569 (Phase 45 Batch 1)

## 결과 요약

| 항목 | 결과 |
|------|------|
| Sprint | 315 |
| F-items | F564 (MVP M3), F569 (harness-kit) |
| Match Rate | **100%** (9/9) |
| Tests | CLI 175/175 PASS + harness-kit 61/61 PASS |
| Phase 45 Milestone | **MVP M3 달성** |

## F564 — Strangler 완결 (MVP M3) ✅

### 구현 항목

| 항목 | 파일 | 내용 |
|------|------|------|
| (a) apiUrl 타입 | `packages/shared/src/types.ts` | `FoundryXConfig.apiUrl?: string` 추가 |
| (a) apiUrl 기본값 | `packages/cli/src/services/config-manager.ts` | `DEFAULT_API_URL = 'https://fx-gateway.ktds-axbd.workers.dev'` |
| (b) _redirects 수정 | `packages/web/public/_redirects` | foundry-x-api → fx-gateway 전환 |
| (b) grep 0건 확증 | 전체 `packages/` | 직결 URL 0건 (HTTP-Referer 헤더·eslint 플러그인 이름 등 제외) |
| (c) SSO E2E | `packages/web/e2e/strangler-gateway.spec.ts` | discovery/shaping/offering health + no-direct-call 4 테스트 |
| (d) 마이그레이션 가이드 | `docs/guides/api-url-migration.md` | 프로덕션/개발/CLI 환경별 설정 + FAQ |

### Phase 45 MVP M3 달성 선언

```
M3 성공 기준: CLI/Web 모두 VITE_API_URL=fx-gateway + foundry-x-api 직결 코드 0건
→ ✅ PASS
```

- `packages/web/.env.production`: `VITE_API_URL=https://fx-gateway.ktds-axbd.workers.dev/api` (F539b, Sprint 295)
- `packages/web/public/_redirects`: `/api/*` → fx-gateway (F564, Sprint 315)
- CLI `FoundryXConfig.apiUrl`: `https://fx-gateway.ktds-axbd.workers.dev` (F564, Sprint 315)

**Phase 45 "Discovery 완전 분리" M1+M2+M3 모두 달성.**

## F569 — harness-kit 표준화 ✅

### 구현 항목

| 항목 | 파일 | 내용 |
|------|------|------|
| (b-1) fx-discovery auth | `packages/fx-discovery/src/middleware/auth.ts` | `createAuthMiddleware` 교체 |
| (b-2) fx-shaping auth | `packages/fx-shaping/src/middleware/auth.ts` | `createAuthMiddleware` 교체 |
| (b-3) fx-offering auth | `packages/fx-offering/src/middleware/auth.ts` | `createAuthMiddleware` 교체 |
| (b) dep 추가 3건 | 3개 package.json | `@foundry-x/harness-kit: workspace:*` |
| (c) 버전관리 확정 | `packages/harness-kit/package.json` | `private: true` — workspace internal 전략 확정 |
| (d) new-worker.sh | `scripts/new-worker.sh` | scaffold 생성 스크립트 (tsx/node 이중 fallback) |

### 코드 중복 제거 현황

fx-discovery, fx-shaping, fx-offering 3개 Worker가 각각 독립적으로 구현하던 JWT 미들웨어 (~20줄 × 3 = 60줄)를 harness-kit `createAuthMiddleware` 위임으로 제거. 신규 Worker 생성 시 auth.ts 복붙 패턴 재발 차단.

### 이월 항목 (Out-of-scope)

| 항목 | 사유 | 예정 |
|------|------|------|
| F569(e) CI turbo 경유 전환 | C94 PR #670 2주 관찰 후 결정 (2026-05-06 이후) | Sprint 317 |
| F569(f) Remote cache 결정 | turbo 전환 확정 후 | Sprint 317 |
| F569(g) workspace dep 자동 해소 | (e) 완료 후 자동 달성 | Sprint 317 |

## TDD 사이클 기록

| Phase | 커밋 | 내용 |
|-------|------|------|
| Red | `f814263c` | config-manager 2 FAIL + harness-kit JWT Worker publicPaths |
| Green | `00a81e35` | F564+F569 전체 구현 (14파일 변경) |

## Gap Analysis

- **Match Rate**: 100% (9/9)
- **Added (설계 초과)**: DEFAULT_API_URL 상수화, SSO 4번째 테스트(no-direct-call), new-worker.sh dual runtime fallback
- **Changed**: `apiUrl?: string` (optional) vs Design의 required — §6 Breaking Change 사유로 정당화

## 다음 단계

1. **Sprint 315 PR merge** → `deploy.yml` CI 자동 배포
2. **Phase 45 MVP M3 달성 확인 dogfood**: Production에서 `/api/discovery/health` 200 응답 실측
3. **Sprint 316**: F567 Multi-hop latency + F568 EventBus PoC (Batch 2)
4. **Sprint 317**: F565 SDD-drift-check CI + F569(e)(f)(g) turbo 전환 (2주 관찰 완료 후)
