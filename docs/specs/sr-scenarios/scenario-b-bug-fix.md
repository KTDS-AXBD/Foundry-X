---
code: FX-SPEC-SR-003
title: "데모 시나리오 B: 프로덕션 버그 긴급 수정 (bug_fix)"
version: "1.0"
status: Active
category: SPEC
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# 데모 시나리오 B: 프로덕션 버그 긴급 수정

## 시나리오 개요

| 항목 | 내용 |
|------|------|
| 시나리오 ID | SR-DEMO-B |
| SR 유형 | `bug_fix` |
| 요청 제목 | JWT 갱신 후 403 에러 발생 — 긴급 수정 요청 |
| 예상 소요 | ~25분 |
| 기존 수동 처리 | ~4시간 |
| 절감률 | ~83% |
| 실행 에이전트 | QAAgent → PlannerAgent → TestAgent → SecurityAgent → ReviewerAgent (5종) |

---

## 1. SR 입력 내용

```json
{
  "title": "JWT 갱신 후 403 에러 발생 — 긴급 수정 요청",
  "description": "프로덕션 환경에서 액세스 토큰 만료 후 리프레시 토큰으로 갱신 시 일부 사용자에게 403 Forbidden이 반환되는 문제가 발생하고 있습니다. 재현율 약 30%. Sentry에서 확인한 스택트레이스: TokenService.verify() at line 47 — 'invalid signature'. 긴급 수정 요청드립니다."
}
```

---

## 2. 자동 분류 결과

```json
{
  "srType": "bug_fix",
  "confidence": 0.81,
  "matchedKeywords": ["에러", "버그", "긴급", "재현", "수정", "stacktrace"]
}
```

---

## 3. 워크플로우 DAG

```
[SR 생성]
    ↓
[QAAgent] — 버그 재현 분석
  - 재현 조건 파악 (재현율 30% → 특정 조건 탐색)
  - 에러 패턴 분류 (invalid signature → 서명 키 불일치 가능성)
  - 재현 테스트케이스 초안 작성
    ↓
[PlannerAgent] — 수정 계획 수립
  - 근본 원인 후보 목록 (키 로테이션 미동기화, 클럭 드리프트, 알고리즘 불일치)
  - 수정 범위 산정 (TokenService만? 미들웨어 포함?)
  - 롤백 플랜 포함
    ↓
[TestAgent] — 회귀 테스트 생성
  - 리프레시 토큰 정상 갱신 (200)
  - 만료된 리프레시 토큰 (401)
  - 변조된 토큰 서명 (403)
  - 연속 갱신 시나리오 (토큰 재사용 방지)
  - 클럭 드리프트 시뮬레이션
    ↓
[SecurityAgent] — 보안 영향 검토
  - JWT 관련 OWASP 취약점 스캔 (alg:none 공격 방어 여부)
  - 토큰 재사용 공격 방어 확인
  - 수정 코드의 보안 회귀 없음 확인
    ↓
[ReviewerAgent] — 최종 코드 리뷰
  - 수정 범위 최소화 확인
  - 에러 핸들링 완결성
  - 프로덕션 배포 승인
    ↓
[완료 리포트]
```

---

## 4. End-to-End API 호출 시퀀스

### Step 1: SR 생성

```bash
POST /api/sr-requests
Authorization: Bearer {jwt}

{
  "title": "JWT 갱신 후 403 에러 발생 — 긴급 수정 요청",
  "description": "..."
}

# Response 201
{
  "id": "sr_02HZ...",
  "srType": "bug_fix",
  "confidence": 0.81,
  "matchedKeywords": ["에러", "버그", "긴급", "재현", "수정", "stacktrace"],
  "status": "pending"
}
```

### Step 2: 워크플로우 실행

```bash
POST /api/sr-requests/sr_02HZ.../execute

# Response 202
{
  "runId": "run_02HZ...",
  "status": "running",
  "estimatedMinutes": 25,
  "nodes": [
    { "agentType": "qa", "order": 1, "status": "pending" },
    { "agentType": "planner", "order": 2, "status": "pending" },
    { "agentType": "test", "order": 3, "status": "pending" },
    { "agentType": "security", "order": 4, "required": false, "status": "pending" },
    { "agentType": "reviewer", "order": 5, "status": "pending" }
  ]
}
```

### Step 3: 진행상황 폴링

```bash
GET /api/sr-requests/sr_02HZ...

# 보안 검토 중 응답
{
  "id": "sr_02HZ...",
  "status": "running",
  "run": {
    "currentNode": "security",
    "completedNodes": ["qa", "planner", "test"],
    "progress": "4/5"
  }
}
```

### Step 4: 완료 결과 확인

```bash
GET /api/sr-requests/sr_02HZ...

# 완료 응답
{
  "id": "sr_02HZ...",
  "status": "completed",
  "run": {
    "status": "completed",
    "completedAt": 1742609500000,
    "result": {
      "qaOutput": {
        "rootCauseCandidates": [
          "JWT_SECRET 환경변수 Workers 인스턴스 간 불일치",
          "리프레시 토큰 서명 알고리즘 HS256/RS256 혼용"
        ],
        "reproductionCondition": "Workers Cold Start 직후 첫 번째 리프레시 요청",
        "reproducedAt": "TokenService.verify() line 47"
      },
      "plannerOutput": {
        "rootCause": "Workers 환경에서 JWT_SECRET이 KV 캐시 미스 시 undefined로 폴백되는 버그",
        "fixScope": ["services/token.ts", "services/kv-cache.ts"],
        "rollbackPlan": "이전 Workers 버전으로 즉시 롤백 가능 (wrangler rollback)"
      },
      "testOutput": {
        "generatedTests": 5,
        "regressionSuite": ["리프레시 정상", "만료된 토큰", "변조 서명", "연속 갱신", "KV 미스 시뮬레이션"]
      },
      "securityOutput": {
        "owaspChecks": ["A02 Cryptographic Failures ✅", "alg:none 방어 ✅", "토큰 재사용 방어 ✅"],
        "securityIssues": 0,
        "riskLevel": "LOW"
      },
      "reviewerOutput": {
        "approved": true,
        "comments": ["KV 캐시 미스 핸들링 로직 명확히 문서화 권장"],
        "productionReady": true
      }
    }
  }
}
```

---

## 5. ROI 분석

| 지표 | 기존 수동 | Foundry-X 자동 | 절감 |
|------|----------|---------------|------|
| 버그 재현/분석 | 1시간 | 6분 (QAAgent) | 90% |
| 수정 계획 수립 | 1시간 | 5분 (PlannerAgent) | 92% |
| 회귀 테스트 작성 | 1시간 | 6분 (TestAgent) | 90% |
| 보안 영향 검토 | 30분 | 4분 (SecurityAgent) | 87% |
| 코드 리뷰 | 30분 | 4분 (ReviewerAgent) | 87% |
| 총 처리 시간 | **4~4.5시간** | **~25분** | **~83%** |

**긴급 대응 가치:** 버그가 프로덕션에 머무는 시간을 4시간 → 25분으로 단축. 서비스 영향 범위 대폭 감소.

---

## 6. 시나리오 A vs B 비교

| 항목 | 시나리오 A (code_change) | 시나리오 B (bug_fix) |
|------|------------------------|---------------------|
| SR 유형 | 신규 기능 추가 | 버그 긴급 수정 |
| 에이전트 수 | 4종 | 5종 |
| 첫 번째 에이전트 | PlannerAgent (계획) | QAAgent (분석) |
| 보안 에이전트 | 없음 | SecurityAgent (선택적) |
| 소요 시간 | ~18분 | ~25분 |
| 기존 대비 절감 | ~95% | ~83% |

버그 수정 시나리오가 더 많은 에이전트를 사용하는 이유는 QA 분석(재현)과 보안 영향 검토가 추가되기 때문이에요. 이는 실제 KT DS 긴급 수정 프로세스(재현 → 원인분석 → 수정 → 보안검토 → 배포 승인)를 그대로 반영한 거예요.

---

## 7. KT DS 데모 시나리오 활용법

1. **사전 준비:** 테스트 테넌트 생성 + JWT 발급 + Sentry 스택트레이스 스크린샷 준비
2. **라이브 데모:** 시나리오 A → 시나리오 B 순서로 15분 내 시연
3. **임팩트 강조:** ROI 수치 + "긴급 버그가 프로덕션에 머무는 시간 4시간 → 25분" 포인트
4. **Q&A 대비:** 분류 오작동 케이스 → confidence 점수 + 수동 override 옵션 설명

---

## 참조
- 분류 체계: `[[FX-SPEC-SR-001]]`
- 시나리오 A: `[[FX-SPEC-SR-002]]`
- Plan: `[[FX-PLAN-044]]`
- Design: `[[FX-DSGN-044]]`
