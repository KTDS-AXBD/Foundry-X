# Foundry-X Security Rules

## 인증
- JWT + PBKDF2 + RBAC + SSO Hub Token + Google OAuth
- Secrets: `wrangler secret put`으로만 등록 — 코드에 하드코딩 절대 금지
- 등록된 Secrets: JWT_SECRET, GITHUB_TOKEN, WEBHOOK_SECRET, ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OPENROUTER_API_KEY

## CORS
- Pages(fx.minu.best) → Workers(foundry-x-api) 크로스오리진
- `packages/api/src/app.ts` CORS 미들웨어 필수
- `VITE_API_URL`에 `/api` 경로 포함 필수 (빠뜨리면 404)

## Cloudflare Workers
- D1 migrations: CI/CD 자동 적용, 수동 시 `--remote` 필수 (누락 = 프로덕션 500)
- 보호 파일: `.env`, `credentials`, `pnpm-lock.yaml` 편집 차단 (PreToolUse hook)
- wrangler.toml에 `account_id` 명시 필수 (환경변수 의존 금지)
