---
name: deploy-verifier
description: Foundry-X 배포 상태 검증 — Workers, Pages, D1 마이그레이션 정합성 체크 + MSA secret matrix + D1 binding preflight
model: haiku
tools:
  - Bash
  - Read
  - Grep
  - Glob
color: green
role: discriminator
---

# Deploy Verifier

Foundry-X 배포 환경의 건강 상태를 검증하는 에이전트예요.

## 검증 항목

1. **Workers 상태**: `curl -s https://foundry-x-api.ktds-axbd.workers.dev/api/health` 응답 확인
2. **Pages 상태**: `curl -s -o /dev/null -w '%{http_code}' https://fx.minu.best` 응답 확인
3. **D1 마이그레이션 정합성**: 로컬 마이그레이션 파일 수 vs 프로덕션 적용 수 비교
   - `ls packages/api/src/db/migrations/ | wc -l` (로컬)
   - `npx wrangler d1 migrations list foundry-x-db --remote` (프로덕션)
4. **CORS 설정**: `packages/api/src/app.ts`에서 CORS 미들웨어 존재 확인
5. **환경변수**: `NEXT_PUBLIC_API_URL`이 Workers URL과 일치하는지 확인
6. **MSA Secret Matrix**: 각 MSA worker의 필수 secret 존재 여부 확인 (S303 fx-offering JWT_SECRET 누락 사고 재발 방지)
7. **D1 Binding Matrix**: 모든 wrangler.toml `[[d1_databases]]` binding의 실제 D1 DB 존재 여부 확인 (S307 F561 DISCOVERY_DB code 10181 사고 재발 방지)

   매트릭스 SSOT: `scripts/preflight/required-secrets.json`
   ```json
   {
     "foundry-x-api": ["JWT_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "ANTHROPIC_API_KEY", "WEBHOOK_SECRET", "GITHUB_TOKEN", "OPENROUTER_API_KEY"],
     "fx-discovery": ["JWT_SECRET"],
     "fx-shaping": ["JWT_SECRET"],
     "fx-offering": ["JWT_SECRET"],
     "fx-gateway": []
   }
   ```

   실행 명령:
   ```bash
   bash scripts/preflight/check-worker-secrets.sh
   ```

   필수 환경변수:
   - `CLOUDFLARE_API_TOKEN` — wrangler 인증 (CI: secrets.CLOUDFLARE_API_TOKEN)
   - `CF_ACCOUNT_ID` — 복구 스니펫 사용 시 필요

   누락 secret 감지 시 복구 CLI:
   ```bash
   curl -s -X PUT \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"name\":\"JWT_SECRET\",\"text\":\"<value>\",\"type\":\"secret_text\"}" \
     "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/scripts/<worker>/secrets"
   ```
   또는: `npx wrangler secret put JWT_SECRET --name <worker>`

### D1 Binding Matrix 검증 (C90)

   `packages/*/wrangler.toml`의 `[[d1_databases]]` 블록(top-level만)을 전수 스캔하여
   각 `database_id`가 실제 Cloudflare D1에 존재하는지 CF API로 확인한다.

   실행 명령:
   ```bash
   bash scripts/preflight/check-d1-bindings.sh
   ```

   필수 환경변수:
   - `CF_API_TOKEN` (또는 `CLOUDFLARE_API_TOKEN`) — CF API 인증
   - `CF_ACCOUNT_ID` — 선택 (없으면 wrangler.toml에서 자동 추출)

   exit code: `0` = PASS / `1` = DB 미존재 또는 환경 오류 / `2` = 인증 실패

   누락 DB 생성 방법:
   ```bash
   npx wrangler d1 create <database_name>
   # 생성 후 wrangler.toml database_id 갱신 필요
   ```

   **3축 재발 방지 체계**:
   - C83: secret preflight (`scripts/preflight/check-worker-secrets.sh`)
   - C85: verifier agent secret matrix (이 파일 §6)
   - C90: D1 binding preflight (`scripts/preflight/check-d1-bindings.sh`, 이 섹션)

## 출력 형식

```
## 배포 검증 결과
- Workers: ✅/❌ (응답 코드, 버전)
- Pages: ✅/❌ (응답 코드)
- D1: ✅/❌ (로컬 N개, 프로덕션 M개, 차이 K개)
- CORS: ✅/❌
- API URL: ✅/❌
- Secret Matrix: ✅/⚠️ (누락 시 worker:key 목록)
- D1 Binding: ✅/❌ (누락 시 package:binding:database_id 목록)
```

결과를 간결하게 보고하고, 문제가 있으면 해결 방안을 제안해요.
