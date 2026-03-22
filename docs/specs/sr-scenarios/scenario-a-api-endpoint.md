---
code: FX-SPEC-SR-002
title: "데모 시나리오 A: 신규 API 엔드포인트 추가 요청 (code_change)"
version: "1.0"
status: Active
category: SPEC
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# 데모 시나리오 A: 신규 API 엔드포인트 추가 요청

## 시나리오 개요

| 항목 | 내용 |
|------|------|
| 시나리오 ID | SR-DEMO-A |
| SR 유형 | `code_change` |
| 요청 제목 | 사용자 활동 로그 조회 API 추가 요청 |
| 예상 소요 | ~18분 |
| 기존 수동 처리 | ~6시간 |
| 절감률 | ~95% |
| 실행 에이전트 | PlannerAgent → ArchitectAgent → TestAgent → ReviewerAgent (4종) |

---

## 1. SR 입력 내용

```json
{
  "title": "사용자 활동 로그 조회 API 추가 요청",
  "description": "관리자 대시보드에서 특정 사용자의 최근 30일 활동 이력을 페이지네이션으로 조회할 수 있는 API가 필요합니다. GET /api/users/:id/activity-logs 형태로 구현 요청드립니다. 응답에는 액션 타입, 타임스탬프, IP 주소, 요청 경로가 포함되어야 합니다."
}
```

---

## 2. 자동 분류 결과

```json
{
  "srType": "code_change",
  "confidence": 0.73,
  "matchedKeywords": ["추가", "api", "구현", "endpoint"]
}
```

---

## 3. 워크플로우 DAG

```
[SR 생성]
    ↓
[PlannerAgent] — 구현 계획 수립
  - 필요 DB 컬럼 파악 (user_activity_logs 테이블)
  - API 응답 스펙 정의 (페이지네이션 포함)
  - 구현 순서 계획 (마이그레이션 → 서비스 → 라우트)
    ↓
[ArchitectAgent] — 아키텍처 설계
  - 기존 패턴과의 정합성 검토 (routes/users.ts 참조)
  - D1 쿼리 최적화 방안 제안 (인덱스 필요 여부)
  - 보안 고려사항 (자기 자신 또는 admin만 조회 가능)
    ↓
[TestAgent] — 테스트 생성
  - 정상 조회 (200)
  - 페이지네이션 검증
  - 권한 없는 사용자 (403)
  - 존재하지 않는 사용자 (404)
  - 날짜 범위 필터 검증
    ↓
[ReviewerAgent] — 코드 리뷰
  - 보안 패턴 준수 (JWT 인증 미들웨어 적용 여부)
  - 스키마 정의 일관성
  - 에러 핸들링 완결성
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
  "title": "사용자 활동 로그 조회 API 추가 요청",
  "description": "..."
}

# Response 201
{
  "id": "sr_01HZ...",
  "srType": "code_change",
  "confidence": 0.73,
  "matchedKeywords": ["추가", "api", "구현", "endpoint"],
  "status": "pending"
}
```

### Step 2: 워크플로우 실행

```bash
POST /api/sr-requests/sr_01HZ.../execute

# Response 202
{
  "runId": "run_01HZ...",
  "status": "running",
  "estimatedMinutes": 18,
  "nodes": [
    { "agentType": "planner", "order": 1, "status": "pending" },
    { "agentType": "architect", "order": 2, "status": "pending" },
    { "agentType": "test", "order": 3, "status": "pending" },
    { "agentType": "reviewer", "order": 4, "status": "pending" }
  ]
}
```

### Step 3: 진행상황 폴링

```bash
GET /api/sr-requests/sr_01HZ...

# 실행 중 응답
{
  "id": "sr_01HZ...",
  "status": "running",
  "run": {
    "currentNode": "architect",
    "completedNodes": ["planner"],
    "progress": "2/4"
  }
}
```

### Step 4: 완료 결과 확인

```bash
GET /api/sr-requests/sr_01HZ...

# 완료 응답
{
  "id": "sr_01HZ...",
  "status": "completed",
  "run": {
    "status": "completed",
    "completedAt": 1742608200000,
    "result": {
      "plannerOutput": {
        "implementationPlan": "1. D1 마이그레이션 추가 (user_activity_logs 테이블)...",
        "estimatedFiles": 3
      },
      "architectOutput": {
        "designDecisions": ["기존 users 라우트에 서브라우트 추가", "인덱스: (user_id, created_at)"],
        "securityNotes": "admin 또는 본인만 조회 가능 — JWT sub 비교"
      },
      "testOutput": {
        "generatedTests": 5,
        "coverageTargets": ["200 정상", "403 권한없음", "404 미존재", "페이지네이션", "날짜필터"]
      },
      "reviewerOutput": {
        "approved": true,
        "comments": [],
        "securityIssues": 0
      }
    }
  }
}
```

---

## 5. ROI 분석

| 지표 | 기존 수동 | Foundry-X 자동 | 절감 |
|------|----------|---------------|------|
| 요구사항 분석 | 1시간 | 4분 (PlannerAgent) | 93% |
| 아키텍처 설계 | 2시간 | 5분 (ArchitectAgent) | 96% |
| 테스트 작성 | 1.5시간 | 4분 (TestAgent) | 96% |
| 코드 리뷰 | 1시간 | 5분 (ReviewerAgent) | 92% |
| 총 처리 시간 | **5.5~6시간** | **~18분** | **~95%** |

---

## 6. KT DS 데모 시나리오 활용법

1. 사전 준비: 테스트 테넌트 생성 + JWT 발급
2. 라이브 데모: `POST /api/sr-requests` → `POST .../execute` → 실시간 폴링 시연
3. 결과 발표: 18분 후 완료 리포트를 슬라이드 대신 API 응답으로 직접 보여줌

---

## 참조
- 분류 체계: `[[FX-SPEC-SR-001]]`
- 시나리오 B: `[[FX-SPEC-SR-003]]`
- Plan: `[[FX-PLAN-044]]`
- Design: `[[FX-DSGN-044]]`
