---
id: FX-PLAN-sprint-295
feature: F539b — fx-gateway 프로덕션 배포 + URL 전환 + 롤백
sprint: 295
date: 2026-04-15
status: active
req: FX-REQ-577
prd: docs/specs/fx-gateway-cutover/prd-final.md
---

# Sprint 295 Plan — F539b

## 목표

fx-gateway Worker를 공식 프로덕션 API URL로 전환하고, 롤백 리허설을 완료한다.
전제: F539a GO 판정 완료 (Sprint 294, PR #595 — p50 +5ms, 증분 허용 기준 충족).

## 현재 상태 (as-is)

| 항목 | 상태 |
|------|------|
| fx-gateway Worker 배포 | ✅ 이미 배포됨 (`fx-gateway.ktds-axbd.workers.dev`, 2026-04-14T23:25:52) |
| Service Binding DISCOVERY | ✅ `/api/discovery/health` → `{"domain":"discovery","status":"ok"}` |
| Service Binding MAIN_API | ✅ `/api/health` → 401 (JWT 인증 정상 전파) |
| deploy.yml 경로 필터 | ✅ `packages/fx-gateway/**` 포함 |
| wrangler 상대 경로 | ✅ `../api/node_modules/.bin/wrangler` |
| VITE_API_URL (web) | ❌ 여전히 `foundry-x-api.ktds-axbd.workers.dev` |
| CLI API URL | ❌ 확인 필요 |
| CORS 헤더 (gateway) | ❓ 검증 필요 |
| 롤백 문서 | ❌ 미작성 |

## 목표 상태 (to-be)

| 항목 | 목표 |
|------|------|
| VITE_API_URL | `https://fx-gateway.ktds-axbd.workers.dev/api` |
| fx-gateway CORS | `fx.minu.best` 허용 |
| 롤백 방법 | `.env.production` 원복 + CF Pages 재빌드 |
| Smoke Reality | KOAMI Smoke — `/api/discovery/health` + JWT 인증 시나리오 PASS |

## Open Issue #1 해결 (PRD §11)

**결정**: `fx-gateway.ktds-axbd.workers.dev` 사용
- 이미 Workers.dev URL로 배포 확인됨
- `fx-api.minu.best` DNS 전환은 Out-of-Scope (PRD §9)
- VITE_API_URL env var 기반 전환 → rollback = 1 env var 변경

## 작업 목록

| # | 작업 | 파일 | TDD |
|---|------|------|-----|
| T1 | fx-gateway CORS 미들웨어 추가 (fx.minu.best 허용) | `packages/fx-gateway/src/app.ts` | Red→Green |
| T2 | JWT/인증 헤더 전달 검증 (현재 MAIN_API.fetch(c.req.raw) 패스스루) | `packages/fx-gateway/src/__tests__/gateway.test.ts` | 테스트 추가 |
| T3 | `.env.production` VITE_API_URL 전환 | `packages/web/.env.production` | N/A |
| T4 | `.env.example` VITE_API_URL 전환 | `packages/web/.env.example` | N/A |
| T5 | 롤백 문서 작성 | `docs/04-report/phase-44-f539b-rollback-drill.md` | N/A |
| T6 | CF Pages env var 전환 메모 (수동) | — | N/A |

## 선제 체크리스트 (feedback_msa_deploy_pipeline_gaps)

- [x] deploy.yml `msa` path filter에 fx-gateway 포함
- [x] fx-gateway wrangler 경로 (`../api/node_modules/.bin/wrangler`)
- [x] 로컬 wrangler deploy 경로 확인
- [ ] packages/api 관련 test 파편 없음 확인 (F539b는 routes 이전 없음 — N/A)
- [ ] Smoke Reality는 fx-gateway URL 직접 hit 확인

## TDD 대상

**T1 (CORS)**: `app.ts`에 CORS 미들웨어 추가 — Red(CORS 헤더 없는 실패 테스트) → Green

**T2 (Auth 전달)**: 게이트웨이가 Authorization 헤더를 MAIN_API/DISCOVERY에 그대로 전달하는지 — 기존 테스트 보완

## 성공 기준

- fx-gateway URL에서 `curl -H "Origin: https://fx.minu.best"` → CORS 헤더 확인
- VITE_API_URL 전환 후 Web 빌드 PASS
- 롤백 문서 + 리허설 완료 (`phase-44-f539b-rollback-drill.md`)
- `pnpm test` PASS (기존 + 신규 gateway 테스트)
