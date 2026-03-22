---
code: FX-PLAN-041
title: "Sprint 41 — 에이전트 역할 커스터마이징 + 멀티모델 앙상블 투표 (F146+F147)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-41
sprint: 41
phase: "Phase 5a"
references:
  - "[[FX-PLAN-040]]"
  - "[[FX-PLAN-039]]"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F146: 에이전트 역할 커스터마이징 + F147: 멀티모델 앙상블 투표 |
| Sprint | 41 |
| 기간 | 2026-03-22 ~ (1 Sprint) |
| Phase | Phase 5a (Agent Evolution Track A — 에이전트 플랫폼 확장) |

### Results (예상)

| 항목 | 목표 |
|------|------|
| 신규 서비스 | 2개 (CustomRoleManager, EnsembleVoting) |
| 신규 테스트 | 40개+ |
| D1 마이그레이션 | 0024 (custom_agent_roles 테이블) |
| API 엔드포인트 | 7개 |
| 기존 테스트 회귀 | 0건 |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 에이전트 역할이 하드코딩되어 새 역할 추가 시 코드 변경 필수. 단일 모델 의존으로 모델 특성별 장점 활용 불가 |
| **Solution** | F146: CustomRoleManager — D1 기반 사용자 정의 역할(프롬프트/도구/모델) CRUD + Orchestrator 동적 위임. F147: EnsembleVoting — N개 모델 병렬 실행 + 투표/점수 기반 최적 결과 선택 |
| **Function UX Effect** | 코드 변경 없이 API로 새 역할 에이전트 등록. 중요한 태스크에 다모델 합의 → 신뢰도 향상 |
| **Core Value** | Agent Evolution A12+A13 달성. 하드코딩 → 데이터 기반 역할 관리로 에이전트 확장성 획득. 앙상블 투표로 단일 모델 편향 제거 |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표

**F146 — 에이전트 역할 커스터마이징 (Agent Evolution A12):**
- `CustomRoleManager` 서비스 구현 — D1 기반 사용자 정의 역할 관리
- `createRole(role)` — 새 커스텀 역할 등록 (이름, 시스템 프롬프트, 허용 도구, 모델 선호)
- `getRole(roleId)` → 역할 정의 조회
- `listRoles(orgId?)` → 역할 목록 조회 (내장 역할 + 커스텀 역할)
- `updateRole(roleId, patch)` — 역할 수정
- `deleteRole(roleId)` — 역할 삭제 (내장 역할 삭제 불가)
- D1 마이그레이션 0024: `custom_agent_roles` 테이블
- Orchestrator 위임: 커스텀 taskType → CustomRoleManager 기반 동적 Runner 생성

**F147 — 멀티모델 앙상블 투표 (Agent Evolution A13):**
- `EnsembleVoting` 서비스 구현 — N개 모델 병렬 실행 + 결과 종합
- `executeEnsemble(request, models)` — 지정된 모델들로 병렬 실행 + 투표
- `selectBest(results, strategy)` — 투표 전략별 최적 결과 선택
- 투표 전략 3종: `majority` (다수결), `quality-score` (점수 기반), `weighted` (모델 가중치)
- `Promise.allSettled` 기반 — 일부 모델 실패해도 나머지 결과로 합의

### 1.2 범위 제한
- F146: 커스텀 역할의 "도구" 필드는 문자열 목록으로 저장 — 실제 도구 실행 권한 검증은 Phase 5b
- F146: 내장 7종 역할(reviewer, planner, architect, test, security, qa, infra)은 D1 미저장 — 코드 기반 유지
- F147: 앙상블 모델 수 최대 5개 하드캡 — 비용/시간 제한
- F147: 앙상블 결과 D1 저장 없음 — API 응답에만 포함 (메트릭스는 ModelMetrics 기존 서비스 활용)
- 기존 에이전트 7종 동작 불변, ModelRouter/EvaluatorOptimizer 시그니처 불변

## 2. 기술 설계 요약

### 2.1 파일 구조
```
packages/api/src/services/
├── custom-role-manager.ts       # F146: 커스텀 역할 관리 서비스
└── ensemble-voting.ts           # F147: 앙상블 투표 서비스

packages/api/src/__tests__/
├── custom-role-manager.test.ts  # 테스트 20개+
└── ensemble-voting.test.ts      # 테스트 20개+

packages/api/src/db/migrations/
└── 0024_custom_agent_roles.sql  # D1 마이그레이션

packages/api/src/
├── routes/agent.ts              # 7개 엔드포인트 추가
├── schemas/agent.ts             # CustomRole + Ensemble 스키마
└── services/
    └── agent-orchestrator.ts    # 커스텀 역할 위임 블록 추가
```

### 2.2 API 엔드포인트

| Method | Path | 용도 |
|--------|------|------|
| POST | /agents/roles | 커스텀 역할 생성 |
| GET | /agents/roles | 역할 목록 조회 (내장+커스텀) |
| GET | /agents/roles/:id | 단일 역할 조회 |
| PUT | /agents/roles/:id | 역할 수정 |
| DELETE | /agents/roles/:id | 역할 삭제 |
| POST | /agents/ensemble | 앙상블 투표 실행 |
| GET | /agents/ensemble/strategies | 투표 전략 목록 조회 |

### 2.3 D1 마이그레이션 0024

```sql
CREATE TABLE IF NOT EXISTS custom_agent_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL,
  allowed_tools TEXT NOT NULL DEFAULT '[]',     -- JSON array
  preferred_model TEXT,                          -- e.g. "anthropic/claude-sonnet-4"
  preferred_runner_type TEXT DEFAULT 'openrouter',
  task_type TEXT NOT NULL,                       -- 매핑할 AgentTaskType
  org_id TEXT,                                   -- NULL = 글로벌
  is_builtin INTEGER NOT NULL DEFAULT 0,         -- 1 = 내장(삭제 불가)
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_custom_roles_org ON custom_agent_roles(org_id);
CREATE INDEX idx_custom_roles_task ON custom_agent_roles(task_type);
```

### 2.4 CustomRoleManager 핵심 설계

```
사용자 → POST /agents/roles { name, systemPrompt, tools, model, taskType }
  │
  ├─ CustomRoleManager.createRole() → D1 INSERT
  │
  └─ 이후 AgentOrchestrator.executeTask(taskType="custom:my-role")
       │
       ├─ CustomRoleManager.getRole("my-role")
       │     └─ D1 SELECT → { systemPrompt, preferredModel, allowedTools }
       │
       ├─ createRoutedRunner(env, taskType, db) 또는 모델 직접 지정
       │     └─ Runner.execute({ ...request, systemPrompt: role.systemPrompt })
       │
       └─ 결과 반환
```

**커스텀 taskType 네이밍**: `"custom:{roleId}"` 형태로 AgentTaskType 확장. 기존 하드코딩 taskType과 충돌 방지.

### 2.5 EnsembleVoting 핵심 설계

```
사용자 → POST /agents/ensemble {
  request: AgentExecutionRequest,
  models: ["anthropic/claude-sonnet-4", "google/gemini-2.5-pro", "openai/gpt-4o"],
  strategy: "quality-score"
}
  │
  ├─ EnsembleVoting.executeEnsemble()
  │     ├─ Promise.allSettled([
  │     │     runner1.execute(request),  // sonnet
  │     │     runner2.execute(request),  // gemini
  │     │     runner3.execute(request),  // gpt-4o
  │     │   ])
  │     │
  │     ├─ 실패 모델 제외, 성공 결과 수집
  │     │
  │     └─ selectBest(results, strategy)
  │           ├─ "majority": 가장 유사한 결론에 도달한 결과 선택
  │           ├─ "quality-score": 각 결과를 다른 모델이 평가 → 최고 점수
  │           └─ "weighted": 모델별 가중치 × 품질 점수 합산
  │
  └─ 반환: EnsembleResult { winner, allResults, votingDetails }
```

### 2.6 투표 전략 상세

| 전략 | 방식 | 비용 | 적합한 태스크 |
|------|------|------|-------------|
| `majority` | N개 결과의 핵심 결론 유사도 비교 → 다수 결론 채택 | 1x (추가 호출 없음) | 코드 리뷰, 보안 검토 |
| `quality-score` | 각 결과를 LLM으로 0-100 점수 평가 → 최고 점수 | 1.3x (평가 호출 추가) | 코드 생성, 아키텍처 설계 |
| `weighted` | 모델별 사전 가중치 × 결과 품질 합산 | 1x (추가 호출 없음) | 비용 최적화, 속도 우선 |

## 3. 위험 및 의존성

| 위험 | 대응 |
|------|------|
| 커스텀 역할로 위험한 도구 접근 시도 | allowedTools는 메타데이터 — 실제 도구 실행 권한은 Orchestrator 제약 체크 유지 |
| 앙상블 비용 폭증 (5모델 × 토큰) | maxModels=5 하드캡, 기본 3모델 권장 |
| 앙상블 모델 간 출력 형식 불일치 | JSON 파싱 후 비교, 형식 오류 시 해당 결과 제외 |
| Sprint 40 execution-types.ts 충돌 | F146/F147은 execution-types.ts 수정 최소화 — 커스텀 taskType은 `"custom:*"` 패턴 |
| D1 마이그레이션 0024 충돌 | Sprint 40은 마이그레이션 없음 → 안전 |

## 4. 작업 순서 (2-Worker 병렬)

### Worker 1: F146 커스텀 역할 관리
1. `0024_custom_agent_roles.sql` — D1 마이그레이션
2. `custom-role-manager.ts` — CustomRoleManager 서비스 (5 CRUD 메서드 + 타입)
3. `custom-role-manager.test.ts` — 테스트 20개+
4. `routes/agent.ts` + `schemas/agent.ts` — 5개 엔드포인트 + 스키마
5. `agent-orchestrator.ts` — 커스텀 역할 위임 블록 (custom:* taskType)

### Worker 2: F147 앙상블 투표
1. `ensemble-voting.ts` — EnsembleVoting 서비스 (executeEnsemble, selectBest, 3종 전략)
2. `ensemble-voting.test.ts` — 테스트 20개+
3. `routes/agent.ts` + `schemas/agent.ts` — 2개 엔드포인트 + 스키마

### 통합 (리더)
4. Orchestrator 통합 검증
5. 전체 테스트 회귀 확인

### 충돌 관리

| 공유 파일 | Worker 1 변경 | Worker 2 변경 | 충돌 위험 |
|----------|-------------|-------------|----------|
| `routes/agent.ts` | 하단에 5개 라우트 추가 | 하단에 2개 라우트 추가 | ⚠️ 낮음 — 순차 병합 |
| `schemas/agent.ts` | 하단에 스키마 추가 | 하단에 스키마 추가 | ⚠️ 낮음 — 순차 병합 |
| `agent-orchestrator.ts` | 커스텀 위임 블록 추가 | 수정 없음 | ✅ 없음 |

**병합 전략**: Worker 1 먼저 커밋 → Worker 2 변경 사항 병합 (리더가 수동 조정)

## 5. 성공 기준

| 기준 | 목표 |
|------|------|
| Match Rate | ≥ 90% |
| 신규 테스트 | 40개+ 전체 통과 |
| 기존 테스트 회귀 | 0건 |
| typecheck | 에러 0건 |
| CustomRoleManager CRUD | 5개 메서드 정상 동작 (D1 연동) |
| 내장 역할 삭제 방지 | is_builtin=1 역할 DELETE 시 403 반환 |
| 커스텀 역할 Orchestrator 위임 | custom:* taskType → 동적 Runner 생성 → 실행 |
| EnsembleVoting 병렬 실행 | 3개 모델 allSettled → 일부 실패 시에도 결과 반환 |
| 투표 전략 3종 | majority, quality-score, weighted 각각 정상 동작 |
| 앙상블 maxModels 캡 | 6개 이상 모델 요청 시 에러 반환 |
