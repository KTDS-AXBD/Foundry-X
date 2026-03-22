---
code: FX-PLAN-044
title: Sprint 44 Plan — F116 KT DS SR 시나리오 구체화
version: "1.0"
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# Sprint 44 Plan — F116 KT DS SR 시나리오 구체화

## Executive Summary

### Problem
KT DS는 월 평균 200~300건의 SR(Service Request)을 수동으로 처리해요. 유형 분류, 담당자 배정, 처리 워크플로우 선택이 모두 사람 손을 거쳐서 평균 처리 시간이 4~8시간에 달해요.

### Solution
Foundry-X 에이전트 팀(6종 에이전트: Planner, Architect, Test, Security, QA, Reviewer)을 SR 처리에 직접 연결해요. `SrClassifier`가 SR을 5종 유형으로 자동 분류하고, `SrWorkflowMapper`가 유형별 최적 에이전트 DAG를 선택해서 실행해요.

### Functional UX
1. 고객(KT DS 담당자)이 SR 제목 + 설명을 `POST /api/sr-requests`로 제출
2. 시스템이 자동 분류 → 워크플로우 DAG 선택 → 에이전트 순차 실행
3. `GET /api/sr-requests/:id` 폴링 또는 SSE로 실시간 진행상황 확인
4. 완료 시 결과 리포트(변경 파일, 테스트 결과, 보안 스캔) 반환

### Core Value
기존 4~8시간 → 15~30분으로 단축. 에이전트가 분류·설계·구현·테스트·보안 검토를 자동 수행.

---

## Sprint 범위

| 항목 | 내용 |
|------|------|
| F번호 | F116 |
| 스프린트 | Sprint 44 |
| Phase | Phase 5 — 고객 파일럿 준비 |
| 목표 | KT DS SR 데모 시나리오 2종 구현 + API 5 endpoints |
| 팀 구성 | 2-Worker Agent Team |
| PRD 연결 | PRD v5 Q4 — 고객 파일럿 SR 자동화 |

---

## SR 유형 분류 체계 (5종)

| srType | 설명 | 대표 키워드 |
|--------|------|------------|
| `security_patch` | 보안 취약점 패치 | CVE, 취약점, OWASP, 인증 우회 |
| `bug_fix` | 버그 수정 (기능 오작동) | 버그, 오류, 에러, 500, crash |
| `env_config` | 환경 설정 변경 | 환경변수, config, 설정, timeout |
| `doc_update` | 문서/주석 업데이트 | README, 문서, 주석, API spec |
| `code_change` | 신규 기능/코드 변경 | 추가, 구현, 신규, endpoint |

분류 알고리즘: 키워드 매칭 + confidence 점수 (0.0~1.0). confidence < 0.5이면 `code_change`로 폴백.

---

## 워크플로우 DAG 설계 (유형별)

### `code_change` (시나리오 A 기준)
```
PlannerAgent → ArchitectAgent → TestAgent → ReviewerAgent
```

### `bug_fix` (시나리오 B 기준)
```
QAAgent → PlannerAgent → TestAgent → SecurityAgent → ReviewerAgent
```

### `security_patch`
```
SecurityAgent → PlannerAgent → TestAgent → ReviewerAgent
```

### `env_config`
```
PlannerAgent → ReviewerAgent
```

### `doc_update`
```
PlannerAgent → ReviewerAgent
```

---

## 데모 시나리오 요약

### 시나리오 A — 신규 API 엔드포인트 추가 (code_change)
- SR 제목: "사용자 활동 로그 조회 API 추가 요청"
- 에이전트 4종 순차 실행
- 예상 소요: ~18분 (기존 수동 6시간 대비 ~95% 절감)
- 상세: `[[FX-SPEC-SR-002]]`

### 시나리오 B — 프로덕션 버그 긴급 수정 (bug_fix)
- SR 제목: "JWT 갱신 후 403 에러 발생 — 긴급 수정 요청"
- 에이전트 5종 순차 실행
- 예상 소요: ~25분 (기존 수동 4시간 대비 ~90% 절감)
- 상세: `[[FX-SPEC-SR-003]]`

---

## API 설계 (5 endpoints)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/sr-requests` | SR 생성 + 자동 분류 |
| GET | `/api/sr-requests` | SR 목록 조회 |
| GET | `/api/sr-requests/:id` | SR 상세 + 실행 상태 |
| POST | `/api/sr-requests/:id/execute` | 워크플로우 수동 실행 트리거 |
| PATCH | `/api/sr-requests/:id` | SR 상태/정보 업데이트 |

---

## D1 마이그레이션 (0027)

### `sr_requests` 테이블
```sql
CREATE TABLE sr_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sr_type TEXT NOT NULL,           -- 5종 enum
  confidence REAL NOT NULL,
  matched_keywords TEXT,           -- JSON array
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### `sr_workflow_runs` 테이블
```sql
CREATE TABLE sr_workflow_runs (
  id TEXT PRIMARY KEY,
  sr_id TEXT NOT NULL REFERENCES sr_requests(id),
  workflow_type TEXT NOT NULL,
  nodes TEXT NOT NULL,             -- JSON: WorkflowNode[]
  current_node TEXT,
  result TEXT,                     -- JSON: 최종 결과
  status TEXT NOT NULL DEFAULT 'pending',
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL
);
```

---

## 테스트 계획 (28개)

| 구분 | 개수 | 내용 |
|------|------|------|
| SrClassifier 단위 | 10 | 5종 유형 × 2케이스, confidence 경계값 |
| SrWorkflowMapper 단위 | 5 | 유형별 DAG 매핑 검증 |
| sr-requests 라우트 | 13 | CRUD + execute, 에러 케이스 |

---

## 실행 계획 (2-Worker Agent Team)

| Worker | 담당 | 파일 |
|--------|------|------|
| Worker 1 | SrClassifier + SrWorkflowMapper 서비스 + D1 0027 | `services/sr-classifier.ts`, `services/sr-workflow-mapper.ts`, `db/migrations/0027_sr_requests.sql` |
| Worker 2 | sr-requests 라우트 + 스키마 + 테스트 | `routes/sr-requests.ts`, `schemas/sr.ts`, `routes/__tests__/sr-requests.test.ts` |

---

## 성공 기준

- [ ] API 5 endpoints 정상 동작
- [ ] SR 유형 자동 분류 정확도 ≥ 90% (5종 테스트케이스 기준)
- [ ] 시나리오 A/B E2E 데모 재현 가능
- [ ] 테스트 28/28 통과
- [ ] typecheck 에러 0건
- [ ] PRD v5 Q4 항목 해소

## 참조 문서
- `[[FX-DSGN-044]]` Sprint 44 Design
- `[[FX-SPEC-SR-001]]` SR 유형 분류 체계
- `[[FX-SPEC-SR-002]]` 시나리오 A: 신규 API 엔드포인트 추가
- `[[FX-SPEC-SR-003]]` 시나리오 B: 프로덕션 버그 긴급 수정
