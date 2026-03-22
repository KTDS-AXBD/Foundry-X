---
code: FX-GUID-004
title: F169 데모 환경 계정 셋업 가이드
version: "1.0"
status: Draft
category: GUID
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# 데모 환경 계정 셋업 가이드

> 데모 환경 준비, 비밀번호 해시 생성, 초기화/리셋 절차

## 1. 사전 요구사항

- `wrangler` CLI 설치 (`npm install -g wrangler`)
- Cloudflare 계정 인증 완료 (`wrangler login`)
- 프로젝트 루트 디렉토리에서 실행

## 2. 데모 비밀번호 해시 생성

Foundry-X는 PBKDF2 해싱을 사용해요. 시드 SQL의 `$DEMO_PASSWORD_HASH` 플레이스홀더를 실제 해시로 교체해야 해요.

### Node.js로 해시 생성

```bash
node -e "
const crypto = require('crypto');
const password = 'demo1234';
const salt = crypto.randomBytes(16).toString('hex');
crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, key) => {
  const hash = salt + ':' + key.toString('hex');
  console.log(hash);
});
"
```

### 출력 예시

```
a1b2c3d4e5f6...:8f9e7d6c5b4a...
```

이 값을 시드 SQL에서 `$DEMO_PASSWORD_HASH` 대신 사용해요.

## 3. 시드 데이터 삽입

### 방법 A: 해시를 직접 교체 후 파일 실행 (권장)

```bash
# 1. 시드 파일 복사
cp packages/api/src/db/demo-seed.sql /tmp/demo-seed-ready.sql

# 2. 플레이스홀더를 실제 해시로 교체
sed -i "s|\$DEMO_PASSWORD_HASH|<위에서 생성한 해시값>|g" /tmp/demo-seed-ready.sql

# 3. D1 remote에 실행
wrangler d1 execute foundry-x-db --remote --file=/tmp/demo-seed-ready.sql

# 4. 임시 파일 정리
rm /tmp/demo-seed-ready.sql
```

### 방법 B: 인라인 명령으로 개별 실행

```bash
# 조직
wrangler d1 execute foundry-x-db --remote --command="INSERT OR IGNORE INTO organizations (id, name, slug, plan, settings, created_at, updated_at) VALUES ('demo-org-001', 'KT DS 파일럿', 'kt-ds-pilot', 'enterprise', '{\"demo\": true}', datetime('now'), datetime('now'));"

# 사용자 (해시 직접 입력)
wrangler d1 execute foundry-x-db --remote --command="INSERT OR IGNORE INTO users (id, email, name, role, password_hash, created_at, updated_at) VALUES ('demo-user-001', 'demo@foundry-x.dev', 'Demo User', 'admin', '<해시값>', datetime('now'), datetime('now'));"

# 멤버십
wrangler d1 execute foundry-x-db --remote --command="INSERT OR IGNORE INTO org_members (org_id, user_id, role, joined_at) VALUES ('demo-org-001', 'demo-user-001', 'admin', datetime('now'));"

# 프로젝트
wrangler d1 execute foundry-x-db --remote --command="INSERT OR IGNORE INTO projects (id, name, repo_url, owner_id, org_id, created_at) VALUES ('demo-proj-001', 'KT DS ITSM 파일럿', 'https://github.com/KTDS-AXBD/kt-ds-itsm-pilot', 'demo-user-001', 'demo-org-001', datetime('now'));"

# SR 및 워크플로우는 시드 파일을 참조
```

## 4. 삽입 확인

```bash
# 조직 확인
wrangler d1 execute foundry-x-db --remote --command="SELECT id, name, slug FROM organizations WHERE id = 'demo-org-001';"

# 사용자 확인
wrangler d1 execute foundry-x-db --remote --command="SELECT id, email, name FROM users WHERE id = 'demo-user-001';"

# 멤버십 확인
wrangler d1 execute foundry-x-db --remote --command="SELECT * FROM org_members WHERE org_id = 'demo-org-001';"

# SR 확인
wrangler d1 execute foundry-x-db --remote --command="SELECT id, title, sr_type, status FROM sr_requests WHERE org_id = 'demo-org-001';"

# 워크플로우 확인
wrangler d1 execute foundry-x-db --remote --command="SELECT id, sr_id, workflow_template, status FROM sr_workflow_runs WHERE sr_id LIKE 'demo-sr-%';"
```

## 5. 데모 환경 리셋

데모 데이터를 초기화하고 다시 삽입하는 절차예요.

### 전체 리셋 (데모 데이터만 삭제)

```bash
# 워크플로우 실행 기록 삭제 (FK 의존 → SR보다 먼저)
wrangler d1 execute foundry-x-db --remote --command="DELETE FROM sr_workflow_runs WHERE sr_id LIKE 'demo-sr-%';"

# SR 삭제
wrangler d1 execute foundry-x-db --remote --command="DELETE FROM sr_requests WHERE org_id = 'demo-org-001';"

# 프로젝트 삭제
wrangler d1 execute foundry-x-db --remote --command="DELETE FROM projects WHERE id = 'demo-proj-001';"

# 멤버십 삭제
wrangler d1 execute foundry-x-db --remote --command="DELETE FROM org_members WHERE org_id = 'demo-org-001' AND user_id = 'demo-user-001';"

# 사용자 삭제
wrangler d1 execute foundry-x-db --remote --command="DELETE FROM users WHERE id = 'demo-user-001';"

# 조직 삭제
wrangler d1 execute foundry-x-db --remote --command="DELETE FROM organizations WHERE id = 'demo-org-001';"
```

### 리셋 후 재삽입

```bash
# 해시가 교체된 시드 파일로 재삽입
wrangler d1 execute foundry-x-db --remote --file=/tmp/demo-seed-ready.sql
```

## 6. 로그인 테스트

시드 데이터 삽입 후 로그인이 정상 동작하는지 확인해요.

```bash
curl -X POST https://foundry-x-api.ktds-axbd.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@foundry-x.dev", "password": "demo1234"}'
```

200 응답과 JWT 토큰이 반환되면 셋업 완료예요.

## 7. 주의사항

- 데모 비밀번호(`demo1234`)는 데모 전용이에요. 프로덕션 데이터와 혼용하지 마세요.
- `INSERT OR IGNORE` 패턴을 사용하므로 이미 데이터가 있으면 건너뛰어요. 변경이 필요하면 먼저 리셋(섹션 5)을 실행하세요.
- D1 remote 실행 시 `--file` 옵션에서 OAuth 에러가 발생하면 `--command` 인라인 방식으로 전환하세요.
- 해시 생성 시 salt는 매번 랜덤으로 생성되므로, 같은 비밀번호라도 해시값이 달라요.
