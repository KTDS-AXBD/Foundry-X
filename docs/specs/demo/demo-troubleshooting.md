# 데모 환경 트러블슈팅 가이드

> 데모 진행 중 발생할 수 있는 문제와 대응 방법

---

## 1. 인증 문제

### 1.1 로그인 실패 (401 Unauthorized)

**증상**: 데모 계정(demo@foundry-x.dev)으로 로그인 시 401 에러

**원인 및 대응**:
- 비밀번호 해시 불일치 → `demo-account-setup.md` 참고하여 해시 재생성
- JWT_SECRET 불일치 → Workers secrets 확인: `wrangler secret list`
- 시드 데이터 미삽입 → `demo-seed.sql` 재실행

```bash
# 빠른 확인
curl -X POST https://foundry-x-api.ktds-axbd.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@foundry-x.dev","password":"demo1234"}'
```

### 1.2 토큰 만료 (403 Forbidden)

**증상**: 데모 중간에 갑자기 API 호출 실패

**대응**: 브라우저 새로고침 또는 재로그인 (JWT 만료 시간: 24h)

---

## 2. API 문제

### 2.1 CORS 에러

**증상**: 브라우저 콘솔에 `Access-Control-Allow-Origin` 에러

**대응**:
- API URL 확인: `NEXT_PUBLIC_API_URL`이 `https://foundry-x-api.ktds-axbd.workers.dev/api`인지 확인
- Workers CORS 미들웨어 확인: `packages/api/src/app.ts`의 CORS 설정

### 2.2 SR 분류 실패 (500 Internal Server Error)

**증상**: SR 제출 후 분류 결과가 안 나옴

**대응**:
- D1 테이블 확인: `sr_requests` 테이블 존재 여부
- 마이그레이션 확인: `wrangler d1 migrations list --remote`
- 0027_sr.sql이 적용되었는지 확인

```bash
wrangler d1 execute foundry-x-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name='sr_requests';"
```

### 2.3 에이전트 워크플로우 미실행

**증상**: SR이 분류되었지만 에이전트 DAG가 생성되지 않음

**대응**:
- ANTHROPIC_API_KEY secrets 확인
- AgentOrchestrator 로그 확인 (Workers 대시보드 → Logs)
- 데모에서는 워크플로우 "생성"까지만 보여주고, 실제 에이전트 실행은 시뮬레이션으로 대체 가능

---

## 3. 대시보드 문제

### 3.1 페이지 로딩 실패

**증상**: `fx.minu.best`에서 빈 화면 또는 500 에러

**대응**:
- Pages 배포 상태 확인: Cloudflare Dashboard → Pages
- DNS 확인: `dig demo.fx.minu.best` (CNAME 레코드)
- 캐시 문제: 브라우저 하드 새로고침 (Ctrl+Shift+R)

### 3.2 데이터 미표시

**증상**: 대시보드에 데이터가 비어있음

**대응**:
- 시드 데이터 삽입 확인: `demo-seed.sql` 실행 여부
- API 직접 호출로 데이터 존재 확인
- 프로젝트 ID/조직 ID가 시드 데이터와 일치하는지 확인

---

## 4. 네트워크 문제

### 4.1 외부 네트워크 접근 불가

**증상**: 사무실 외부에서 데모 URL 접근 불가

**대응**:
- Cloudflare 방화벽 규칙 확인
- DNS 전파 대기 (최대 48시간, 보통 수분)
- VPN 우회 테스트

### 4.2 응답 속도 느림 (Cold Start)

**증상**: 첫 API 호출이 3~5초 소요

**대응**: 이건 Workers Cold Start로 정상 동작. 데모 시작 5분 전에 미리 API 호출하여 워밍업

```bash
# 데모 전 워밍업
curl https://foundry-x-api.ktds-axbd.workers.dev/api/health
```

---

## 5. 데모 리셋

데모 환경을 초기 상태로 되돌리는 방법:

```bash
# 1. 기존 데모 데이터 삭제
wrangler d1 execute foundry-x-db --remote \
  --command "DELETE FROM sr_workflow_runs WHERE sr_id LIKE 'demo-%'; DELETE FROM sr_requests WHERE id LIKE 'demo-%';"

# 2. 시드 데이터 재삽입
wrangler d1 execute foundry-x-db --remote \
  --file packages/api/src/db/demo-seed.sql
```

---

*이 문서는 Sprint 46 F169 데모 환경 구축의 일부입니다.*
