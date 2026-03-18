---
code: FX-GUID-001
title: Foundry-X Deployment Runbook
version: 0.1
status: Active
category: GUID
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Foundry-X Deployment Runbook

## 1. 사전 조건

| 항목 | 확인 |
|------|------|
| Cloudflare 계정 | KTDS-AXBD org |
| API Token | Workers + Pages + D1 + KV 권한 |
| GitHub Secrets | `CLOUDFLARE_API_TOKEN` 설정 |
| Node.js | 20.x |
| pnpm | 9.x |

## 2. Secrets 설정 (최초 1회)

```bash
cd packages/api

# JWT 인증 시크릿 (랜덤 생성)
wrangler secret put JWT_SECRET
# → 프롬프트에 64자 이상 랜덤 문자열 입력

# GitHub API 토큰 (repo read 권한)
wrangler secret put GITHUB_TOKEN
# → GitHub PAT 입력

# Webhook 검증 시크릿
wrangler secret put WEBHOOK_SECRET
# → GitHub Webhook secret 입력

# Claude API 키 (NL→Spec fallback, 선택)
wrangler secret put ANTHROPIC_API_KEY
# → Anthropic API key 입력
```

## 3. D1 Migration

```bash
# 적용 상태 확인
wrangler d1 migrations list foundry-x-db --remote

# 미적용 마이그레이션 적용
wrangler d1 migrations apply foundry-x-db --remote
```

> **주의**: 로컬에서만 적용하고 프로덕션에 누락하면 런타임 500 에러 발생.
> `--command` 수동 적용은 `d1_migrations` 추적 테이블에 기록되지 않으므로 권장하지 않음.

## 4. 배포 순서

### 4.1 자동 배포 (CI)

master push 시 GitHub Actions가 자동 실행:
1. `test` → typecheck + lint + test
2. `deploy-api` → Workers 배포
3. `deploy-web` → Pages 배포
4. `smoke-test` → 배포 후 검증

### 4.2 수동 배포

```bash
# 1. API (Workers)
cd packages/api
wrangler deploy

# 2. Web (Pages)
cd packages/web
pnpm build
wrangler pages deploy out --project-name=foundry-x-web
```

## 5. 배포 검증

```bash
# Smoke test 실행
bash scripts/smoke-test.sh

# 또는 수동 확인
curl -s https://foundry-x-api.ktds-axbd.workers.dev/health | jq .
curl -s https://fx.minu.best | head -20
```

## 6. 롤백

### Workers 롤백

```bash
# 이전 버전으로 롤백
cd packages/api
wrangler rollback
```

### Pages 롤백

Cloudflare Dashboard → Pages → foundry-x-web → Deployments → 이전 빌드 선택 → "Rollback to this deployment"

### D1 롤백

D1은 자동 롤백 미지원. 역방향 마이그레이션 SQL을 수동 작성하여 적용:

```bash
wrangler d1 execute foundry-x-db --remote --command "DROP TABLE IF EXISTS agent_tasks; ..."
```

## 7. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `401 Unauthorized` on deploy | API Token 만료 또는 권한 부족 | Cloudflare Dashboard에서 토큰 갱신 |
| `KV namespace not found` | wrangler.toml KV ID 불일치 | `wrangler kv namespace list`로 확인 |
| D1 migration drift | 로컬만 적용, remote 누락 | `wrangler d1 migrations list --remote`로 확인 후 apply |
| Pages 404 | `out/` 디렉토리 미생성 | `next.config.js`에 `output: "export"` 확인 |
| Smoke test 실패 | DNS 미전파 또는 배포 지연 | 2-3분 대기 후 재시도 |

## 8. 환경 정보

| 항목 | 값 |
|------|-----|
| Workers URL | `https://foundry-x-api.ktds-axbd.workers.dev` |
| Pages URL | `https://fx.minu.best` |
| D1 Database | `foundry-x-db` (ID: `6338688e-b050-4835-98a2-7101f9215c76`) |
| KV Namespace | `CACHE` (ID: `030b30d47a98485ea3af95b3347163d6`) |
| GitHub Repo | `KTDS-AXBD/Foundry-X` |
