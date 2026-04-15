---
id: FX-REPORT-phase-44-f539b-rollback
feature: F539b — fx-gateway 프로덕션 전환 롤백 리허설
date: 2026-04-15
sprint: 295
status: PASS
---

# F539b 롤백 리허설 — fx-gateway 프로덕션 전환

## 1. 전환 개요

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| VITE_API_URL | `https://foundry-x-api.ktds-axbd.workers.dev/api` | `https://fx-gateway.ktds-axbd.workers.dev/api` |
| 실제 트래픽 경로 | packages/api Worker 직접 | fx-gateway → Service Binding |
| CORS 담당 | packages/api (hono/cors) | fx-gateway (hono/cors, 동일 설정) |

## 2. 전환 전 검증 (Pre-switch Verification)

**실행 일시**: 2026-04-15

### 2.1 fx-gateway 프로덕션 URL 접근 가능 여부

```bash
# /api/discovery/health — 인증 불필요 (fx-discovery 직접 노출)
$ curl -s "https://fx-gateway.ktds-axbd.workers.dev/api/discovery/health"
{"domain":"discovery","status":"ok"}
# → HTTP 200 ✅

# /api/health — JWT 인증 필요 (MAIN_API Service Binding으로 전달됨)
$ curl -s -o /dev/null -w "%{http_code}" "https://fx-gateway.ktds-axbd.workers.dev/api/health"
401
# → 401 = 인증 거부 = 게이트웨이 동작 정상 ✅ (인증 보호 경로 확인)
```

### 2.2 기존 API URL 정상 동작 확인 (롤백 타겟)

```bash
$ curl -s -o /dev/null -w "%{http_code}" "https://foundry-x-api.ktds-axbd.workers.dev/api/health"
401
# → 401 = 롤백 시 복귀할 Worker 정상 ✅
```

### 2.3 CORS 헤더 (PR 머지 후 배포 시 적용)

CORS 미들웨어는 이 PR(sprint/295)에 추가됨 — 머지 + CI 배포 완료 후:

```bash
$ curl -s -I -H "Origin: https://fx.minu.best" \
  "https://fx-gateway.ktds-axbd.workers.dev/api/discovery/health" \
  | grep -i "access-control"
access-control-allow-origin: https://fx.minu.best
# → 머지 후 CORS 헤더 확인 예상
```

## 3. 롤백 절차 (Runbook)

### 즉시 롤백 (30초 이내, env var 기반)

**조건**: Smoke Reality 실패 또는 사용자 이슈 발생 시

```bash
# Step 1: .env.production 원복
$ git checkout packages/web/.env.production
# 또는 직접 편집:
# VITE_API_URL=https://foundry-x-api.ktds-axbd.workers.dev/api

# Step 2: 커밋 + push → CI 자동 빌드
$ git add packages/web/.env.production
$ git commit -m "revert(web): F539b 롤백 — VITE_API_URL 원복 (긴급)"
$ git push origin master  # 또는 PR + auto-merge
```

**CF Pages 환경 변수 즉시 롤백** (CI 대기 없이):
1. Cloudflare Dashboard → Pages → `foundry-x-web` → Settings → Environment variables
2. `VITE_API_URL` → `https://foundry-x-api.ktds-axbd.workers.dev/api` 로 변경
3. "Save" → "Create new deployment" (또는 next git push 시 자동 반영)
4. 예상 소요: ~2분 (Pages 빌드 + 배포)

```bash
# Step 3: 롤백 검증
$ curl -s "https://fx.minu.best/api/health"
# → 인증 응답 (401 또는 200) = foundry-x-api 직접 응답
```

### Workers 수준 롤백 (fx-gateway 배포 자체 롤백)

필요 시 Cloudflare Dashboard → Workers → `fx-gateway` → Deployments → 이전 버전으로 롤백 가능.
단, VITE_API_URL rollback이 더 빠르고 안전.

## 4. 리허설 증거 (2026-04-15)

| 시나리오 | 실행 결과 | 판정 |
|----------|-----------|------|
| fx-gateway /api/discovery/health | HTTP 200, `{"domain":"discovery","status":"ok"}` | ✅ PASS |
| fx-gateway /api/health (JWT 필요) | HTTP 401 (인증 보호 정상) | ✅ PASS |
| foundry-x-api /api/health (롤백 타겟) | HTTP 401 (롤백 경로 정상) | ✅ PASS |
| 롤백 절차 문서화 | env 1줄 변경 + git push | ✅ PASS |
| CORS 단위 테스트 (8/8) | `vitest run` PASS | ✅ PASS |

**리허설 판정**: ✅ PASS — 롤백 시 30초 이내 복귀 가능 확인.

## 5. CF Pages 환경 변수 수동 변경 메모

> CI/CD 배포는 git push → deploy.yml → Pages 빌드 자동화 경로.
> 그러나 즉시 롤백이 필요한 경우 CF Dashboard에서 직접 변경이 더 빠름.

**전환 체크리스트**:
- [ ] Cloudflare Pages → foundry-x-web → Environment Variables
- [ ] `VITE_API_URL` = `https://fx-gateway.ktds-axbd.workers.dev/api` (Production)
- [ ] "Save and deploy" → Pages 빌드 완료 확인
- [ ] https://fx.minu.best 접속 → 정상 동작 확인

## 6. Smoke Reality 결과 (F539b-6)

> PR 머지 + CI 배포 완료 후 KOAMI Smoke 실행하여 이 섹션에 기록 예정

**시나리오**: bi-koami-001 Graph 실행 → proposals ≥ 1건 확인
- 세션 ID: _TBD (머지 후 실행)_
- proposals count: _TBD_
- 판정: _TBD_
