---
code: FX-GUID-003
title: F169 SR 자동 처리 데모 시나리오
version: "1.0"
status: Draft
category: GUID
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# SR 자동 처리 데모 시나리오

> 고객 데모 진행자가 따라할 수 있는 step-by-step 스크립트

## 사전 준비

- 데모 환경 셋업 완료 (`demo-account-setup.md` 참조)
- 데모 URL: `https://fx.minu.best`
- API URL: `https://foundry-x-api.ktds-axbd.workers.dev/api`
- 데모 계정: `demo@foundry-x.dev` / 데모 시 안내하는 비밀번호

---

## Step 1: 로그인

데모 계정으로 로그인하여 JWT 토큰을 획득해요.

### API 호출

```bash
# 로그인하여 토큰 획득
curl -X POST https://foundry-x-api.ktds-axbd.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@foundry-x.dev",
    "password": "demo1234"
  }'
```

### 기대 결과

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "...",
  "user": {
    "id": "demo-user-001",
    "email": "demo@foundry-x.dev",
    "name": "Demo User",
    "role": "admin"
  }
}
```

> 이후 모든 API 호출에 `Authorization: Bearer <token>` 헤더를 포함해요.

```bash
# 편의를 위해 환경변수로 저장
export TOKEN="<위에서 받은 token>"
export API="https://foundry-x-api.ktds-axbd.workers.dev/api"
```

---

## Step 2: 프로젝트 확인

KT DS ITSM 파일럿 프로젝트가 존재하는지 확인해요.

### API 호출

```bash
curl -s "$API/projects" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 기대 결과

프로젝트 목록에 `KT DS ITSM 파일럿`이 포함되어 있어요.

```json
{
  "projects": [
    {
      "id": "demo-proj-001",
      "name": "KT DS ITSM 파일럿",
      "org_id": "demo-org-001"
    }
  ]
}
```

---

## Step 3: SR 제출 (2건)

실제 SR을 제출하면 **SrClassifier**가 자동으로 유형을 분류해요.

### SR-1: 버그 수정 요청

```bash
curl -X POST "$API/sr" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "사용자 로그인 시 간헐적 500 에러 발생",
    "description": "운영 환경에서 사용자 로그인 시 약 5% 확률로 HTTP 500 에러가 발생합니다. 세션 만료 후 재로그인 시 주로 발생하며, 에러 로그에 DB connection timeout이 기록되어 있습니다.",
    "priority": "high"
  }'
```

### SR-1 기대 결과

```json
{
  "id": "...",
  "sr_type": "bug_fix",
  "confidence": 0.73,
  "matched_keywords": ["에러", "500", "장애"],
  "status": "classified",
  "suggestedWorkflow": "sr-bug-fix"
}
```

> 데모 포인트: "에러", "500" 키워드를 감지하여 `bug_fix`로 자동 분류되었어요.

### SR-2: 성능 개선 요청

```bash
curl -X POST "$API/sr" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API 응답시간 P95 3초 → 1초 이내로 개선",
    "description": "현재 주요 API 엔드포인트의 P95 응답시간이 3초를 초과합니다. 기능 변경을 통해 N+1 쿼리 제거, 인덱스 추가, 캐싱 적용으로 1초 이내 목표를 달성해야 합니다.",
    "priority": "medium"
  }'
```

### SR-2 기대 결과

```json
{
  "id": "...",
  "sr_type": "code_change",
  "confidence": 0.64,
  "matched_keywords": ["기능", "변경", "추가"],
  "status": "classified",
  "suggestedWorkflow": "sr-code-change"
}
```

> 데모 포인트: "기능", "변경" 키워드로 `code_change`로 분류. 성능 이슈지만 코드 변경이 필요하므로 적절한 분류예요.

---

## Step 4: 자동 분류 결과 확인

제출된 SR 목록을 조회하여 분류 결과를 확인해요.

### API 호출

```bash
# 전체 SR 목록
curl -s "$API/sr" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 특정 SR 상세 (시드 데이터 SR)
curl -s "$API/sr/demo-sr-001" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 기대 결과

```json
{
  "items": [
    {
      "id": "demo-sr-001",
      "title": "사용자 로그인 시 간헐적 500 에러 발생",
      "sr_type": "bug_fix",
      "status": "classified",
      "confidence": 0.73,
      "matched_keywords": ["에러", "500", "장애"]
    },
    {
      "id": "demo-sr-002",
      "title": "API 응답시간 P95 3초 → 1초 이내로 개선",
      "sr_type": "code_change",
      "status": "classified",
      "confidence": 0.64,
      "matched_keywords": ["기능", "변경", "추가"]
    }
  ],
  "total": 2
}
```

> 데모 포인트: SrClassifier의 5종 분류 체계 — `bug_fix`, `code_change`, `env_config`, `doc_update`, `security_patch`

---

## Step 5: 에이전트 워크플로우 실행

분류된 SR에 대해 에이전트 워크플로우를 실행해요. **SrWorkflowMapper**가 유형별 에이전트 DAG를 생성해요.

### SR-1 워크플로우 실행 (bug_fix)

```bash
curl -X POST "$API/sr/demo-sr-001/execute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### SR-1 기대 결과

```json
{
  "sr_id": "demo-sr-001",
  "workflow_run_id": "...",
  "template": "sr-bug-fix",
  "steps_total": 6,
  "status": "running"
}
```

> 데모 포인트: `bug_fix` 워크플로우는 6단계 — QAAgent(재현) → PlannerAgent(진단) → TestAgent(회귀) → SecurityAgent(검증) → ReviewerAgent(리뷰) → 승인 확인

### SR-2 워크플로우 실행 (code_change)

```bash
curl -X POST "$API/sr/demo-sr-002/execute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### SR-2 기대 결과

```json
{
  "sr_id": "demo-sr-002",
  "workflow_run_id": "...",
  "template": "sr-code-change",
  "steps_total": 5,
  "status": "running"
}
```

> 데모 포인트: `code_change` 워크플로우는 5단계 — PlannerAgent(분석) → ArchitectAgent(설계 리뷰) → TestAgent(테스트 생성) → ReviewerAgent(PR 리뷰) → 승인 확인

---

## Step 6: 대시보드에서 결과 확인

### 웹 대시보드 접속

1. `https://fx.minu.best`에 접속
2. 데모 계정으로 로그인
3. 사이드바에서 **Dashboard** 선택
4. 프로젝트 개요에서 SR 현황 위젯 확인

### API로 워크플로우 진행 상태 확인

```bash
# SR-1 상세 + 워크플로우 실행 상태
curl -s "$API/sr/demo-sr-001" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 기대 결과

```json
{
  "id": "demo-sr-001",
  "title": "사용자 로그인 시 간헐적 500 에러 발생",
  "sr_type": "bug_fix",
  "status": "in_progress",
  "workflow_run": {
    "id": "...",
    "workflow_template": "sr-bug-fix",
    "status": "running",
    "steps_completed": 0,
    "steps_total": 6,
    "result_summary": null
  }
}
```

---

## 데모 핵심 메시지

| 관점 | 메시지 |
|------|--------|
| **자동화** | SR 제출 → 자동 분류 → 워크플로우 실행까지 사람 개입 없이 진행 |
| **투명성** | 각 단계의 에이전트, 진행 상태, 결과를 실시간 확인 가능 |
| **확장성** | 5종 SR 유형 × 에이전트 역할 조합으로 다양한 시나리오 대응 |
| **커스터마이징** | 워크플로우 노드 추가/제거로 고객사 프로세스에 맞춤 가능 |

## 예상 질문 & 답변

**Q: SR 유형은 어떻게 분류되나요?**
A: 규칙 기반 키워드 매칭으로 5종(`bug_fix`, `code_change`, `env_config`, `doc_update`, `security_patch`)으로 분류해요. 향후 ML 하이브리드 분류기(F167)로 정확도를 높일 계획이에요.

**Q: 분류가 잘못된 경우 수정할 수 있나요?**
A: PATCH `/sr/:id`로 `sr_type`을 수동 변경할 수 있어요. 변경 이력은 추적되며, 오분류 데이터는 ML 학습에 활용돼요.

**Q: 에이전트 워크플로우는 실제로 코드를 변경하나요?**
A: 현재는 분석/리뷰/테스트 생성 단계까지 자동화되어 있어요. 코드 변경은 에이전트가 PR을 생성하고 사람이 승인하는 Human-in-the-loop 방식이에요.

**Q: 기존 ITSM 시스템과 연동할 수 있나요?**
A: Jira 어댑터(F109)가 이미 구현되어 있고, 웹훅 레지스트리를 통해 커스텀 ITSM 연동이 가능해요.
