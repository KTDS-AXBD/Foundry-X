---
id: FX-GUIDE-API-URL-MIGRATION
created: 2026-04-22
sprint: 315
f_item: F564
---

# API URL 마이그레이션 가이드 — fx-gateway 단일 진입점

## 배경

Phase 45 MVP M3 (F564) 완결로 모든 API 트래픽이 **fx-gateway 단일 진입점**을 통해 라우팅됩니다.

| 구분 | 변경 전 | 변경 후 |
|------|---------|---------|
| Web VITE_API_URL | `https://foundry-x-api.ktds-axbd.workers.dev/api` | `https://fx-gateway.ktds-axbd.workers.dev/api` |
| Pages `_redirects` 폴백 | `foundry-x-api.ktds-axbd.workers.dev` | `fx-gateway.ktds-axbd.workers.dev` |
| CLI `apiUrl` 기본값 | (없음) | `https://fx-gateway.ktds-axbd.workers.dev` |

## 환경별 설정

### 1. 프로덕션 (Cloudflare Pages + Workers)

**`packages/web/.env.production`** — 이미 적용됨 (F539b, Sprint 295):
```bash
VITE_API_URL=https://fx-gateway.ktds-axbd.workers.dev/api
```

**`packages/web/public/_redirects`** — F564(b)에서 갱신:
```
/api/*  https://fx-gateway.ktds-axbd.workers.dev/api/:splat  200
```

### 2. 개발 환경

**`packages/web/.env.local`** 또는 **`packages/web/.env`** (로컬 개발):
```bash
# 로컬 개발: Workers를 로컬에서 실행 시 gateway 포트 사용
VITE_API_URL=http://localhost:8788/api
# (fx-gateway 로컬 포트는 wrangler.toml [dev] port 참조)
```

### 3. CLI (`foundry-x` 도구)

`foundry-x init` 실행 시 `.foundry-x/config.json`에 자동으로 `apiUrl` 저장:
```json
{
  "apiUrl": "https://fx-gateway.ktds-axbd.workers.dev",
  ...
}
```

직접 변경 시:
```bash
# .foundry-x/config.json 수동 편집
{
  "apiUrl": "https://fx-gateway.ktds-axbd.workers.dev"
}
```

## 롤백

fx-gateway 장애 시 `_redirects`에서 1줄만 되돌리면 즉시 복구 가능:
```
/api/*  https://foundry-x-api.ktds-axbd.workers.dev/api/:splat  200
```

## FAQ

**Q: foundry-x-api Worker는 삭제되나요?**  
A: 아니요. foundry-x-api는 fx-gateway의 서비스 바인딩(catch-all) 대상으로 계속 존재합니다. 클라이언트가 직접 호출하지 않을 뿐이며, 이관되지 않은 도메인의 요청은 여전히 fx-gateway → foundry-x-api로 포워딩됩니다.

**Q: SSO Hub Token 경로는 어떻게 변경되나요?**  
A: `/api/auth/*` 경로는 fx-gateway catch-all → foundry-x-api로 투명하게 포워딩됩니다. 클라이언트 코드 변경 불필요.

**Q: Phase 45 이후 도메인 이관 계획은?**  
A: F570(Offering, Sprint 316), F572(modules, Sprint 317), F571(Agent, Sprint 318) 순서로 순차 이관 예정. 각 이관 후에도 `_redirects`는 변경 없음.
