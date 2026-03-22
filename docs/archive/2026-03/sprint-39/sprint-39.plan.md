---
code: FX-PLAN-039
title: "Sprint 39 — Fallback 체인 + 프라이빗 프롬프트 게이트웨이 + AI-휴먼 피드백 루프 (F144+F149+F150)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-39
sprint: 39
phase: "Phase 5a"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F144: Fallback 체인 + F149: 프라이빗 프롬프트 게이트웨이 + F150: AI-휴먼 피드백 루프 |
| Sprint | 39 |
| 기간 | 2026-03-22 ~ (1 Sprint) |
| Phase | Phase 5a (Agent Evolution Track A — F140/F141 Security+QA 후속) |

### Results (예상)

| 항목 | 목표 |
|------|------|
| 신규 서비스 | 3개 (FallbackChain, PromptGateway, FeedbackLoop) |
| 신규 테스트 | 40개+ |
| D1 마이그레이션 | 1개 (0023 — fallback_chains + prompt_sanitization_rules + agent_feedback) |
| API 엔드포인트 | 6개 |
| 기존 테스트 회귀 | 0건 |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | ModelRouter가 단일 모델만 시도하므로 모델 장애 시 에이전트 전체가 중단됨. 소스 코드가 LLM에 그대로 전송되어 보안 우려. 에이전트 실패 시 피드백 채널이 없어 동일 실패 반복 |
| **Solution** | F144: priority 기반 N-level 모델 체인 + 자동 재시도. F149: 코드 추상화/요약 후 LLM 전송하는 게이트웨이 레이어. F150: 자동화 실패 시 사용자 피드백 수집 → 프롬프트/모델 자동 조정 |
| **Function UX Effect** | 모델 장애 시 투명한 폴백(사용자는 지연만 감지). 민감 코드가 LLM에 도달하지 않음. 실패한 에이전트 작업에 "왜 실패했나?" 피드백 버튼 |
| **Core Value** | 6종 역할 에이전트(Sprint 38 완성)의 운영 안정성·보안·학습 능력 확보. 프로덕션 에이전트 배포의 3대 전제조건 충족 |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표

**F144 — Fallback 체인:**
- `FallbackChainService` 구현 — ModelRouter 위에 N-level 재시도 체인
- `executeWithFallback(request, chain)` — 체인 순서대로 모델 시도, 첫 성공 반환
- `buildChain(taskType)` — D1 routing_rules에서 priority 순 체인 자동 구성
- `recordFailover(fromModel, toModel, reason)` — 폴백 이벤트 로깅 (model_metrics 테이블 활용)
- ModelRouter.getModelForTask() → getFallbackChain() 확장
- 최대 재시도 횟수: 3 (설정 가능)

**F149 — 프라이빗 프롬프트 게이트웨이:**
- `PromptGatewayService` 구현 — LLM 전송 전 코드 정보 추상화
- `sanitizePrompt(prompt, files)` — 민감 정보(API 키, 비밀번호, 내부 URL) 마스킹
- `abstractCode(files)` — 전체 코드 대신 구조/시그니처/패턴만 추출하여 요약
- `applyRules(content, rules)` — D1 기반 정규화 규칙 적용 (부서/팀별 커스텀 가능)
- 기존 AgentRunner 파이프라인에 미들웨어로 삽입 (prompt-utils.ts 확장)

**F150 — AI-휴먼 피드백 루프:**
- `AgentFeedbackLoopService` 구현 — 기존 FeedbackService 확장
- `captureFailure(executionResult, context)` — 에이전트 실패/partial 결과 자동 수집
- `submitHumanFeedback(failureId, feedback)` — 사용자 피드백 제출 (왜 실패? 어떤 결과 기대?)
- `applyLearning(feedbackId)` — 피드백 기반 프롬프트 힌트 업데이트 (prompt_hints 테이블)
- AgentOrchestrator.executeTask() 결과가 failed/partial일 때 자동 피드백 요청 트리거

### 1.2 범위 제한
- F144: 실제 모델 장애 테스트는 mock 기반 — 프로덕션 검증은 별도
- F149: 코드 추상화는 정규식 + 패턴 기반 — LLM 기반 추상화는 후속 Sprint
- F150: 피드백 → 프롬프트 자동 조정은 hint 수준 — 프롬프트 전체 재생성은 F146 범위
- 기존 에이전트(Reviewer, Planner, Architect, Test, Security, QA) 동작에 영향 없음

## 2. 기술 설계 요약

### 2.1 파일 구조
```
packages/api/src/services/
├── fallback-chain.ts            # FallbackChainService
├── prompt-gateway.ts            # PromptGatewayService
└── agent-feedback-loop.ts       # AgentFeedbackLoopService

packages/api/src/__tests__/
├── fallback-chain.test.ts       # FallbackChain 테스트 15개+
├── prompt-gateway.test.ts       # PromptGateway 테스트 13개+
└── agent-feedback-loop.test.ts  # FeedbackLoop 테스트 12개+

packages/api/src/
├── routes/agent.ts              # 6개 엔드포인트 추가
├── schemas/agent.ts             # Fallback + Gateway + Feedback 스키마
├── services/model-router.ts     # getFallbackChain() 메서드 추가
├── services/prompt-utils.ts     # sanitize 미들웨어 통합점
└── services/agent-orchestrator.ts  # 실패 시 피드백 루프 트리거
```

### 2.2 D1 마이그레이션 (0023)
```sql
-- Fallback 체인 로그
CREATE TABLE fallback_events (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  from_model TEXT NOT NULL,
  to_model TEXT NOT NULL,
  reason TEXT NOT NULL,           -- timeout | error | rate-limit | quality
  latency_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 프롬프트 정규화 규칙
CREATE TABLE prompt_sanitization_rules (
  id TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,          -- 정규식 패턴
  replacement TEXT NOT NULL,      -- 치환 문자열
  category TEXT NOT NULL,         -- secret | url | pii | custom
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 에이전트 피드백
CREATE TABLE agent_feedback (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  failure_reason TEXT,
  human_feedback TEXT,
  prompt_hint TEXT,               -- 학습된 프롬프트 힌트
  status TEXT DEFAULT 'pending',  -- pending | reviewed | applied
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### 2.3 API 엔드포인트

| Method | Path | 용도 |
|--------|------|------|
| GET | /agents/fallback/chain/:taskType | 특정 taskType의 폴백 체인 조회 |
| GET | /agents/fallback/events | 최근 폴백 이벤트 목록 (모니터링) |
| POST | /agents/gateway/sanitize | 프롬프트 정규화 테스트 (dry-run) |
| GET | /agents/gateway/rules | 정규화 규칙 목록 |
| POST | /agents/feedback | 사용자 피드백 제출 |
| GET | /agents/feedback/:executionId | 특정 실행의 피드백 조회 |

### 2.4 아키텍처 흐름
```
사용자 요청
  → AgentOrchestrator.executeTask()
    → PromptGatewayService.sanitizePrompt()     ← F149 NEW
    → FallbackChainService.executeWithFallback() ← F144 NEW
      → ModelRouter.getFallbackChain(taskType)
      → Runner.execute(model[0]) → 실패 시 model[1] → model[2]
    → 결과 반환
    → 실패/partial 시:
      → AgentFeedbackLoopService.captureFailure() ← F150 NEW
      → 사용자에게 피드백 요청 SSE 이벤트
```

## 3. 위험 및 의존성

| 위험 | 대응 |
|------|------|
| Fallback 체인 무한 루프 | maxRetries=3 하드캡 + 동일 모델 중복 방지 |
| 코드 추상화 시 정보 손실 | 추상화 전/후 비교 로그 + dry-run 엔드포인트로 사전 검증 |
| 피드백 학습 품질 | hint 수준만 적용 (프롬프트 suffix), 전체 프롬프트 변경은 수동 |
| Sprint 38 의존성 | SecurityAgent/QAAgent가 완료되어야 8종 에이전트 전체에 적용 가능 |

## 4. 작업 순서

1. **D1 마이그레이션** — 0023 작성 + 로컬 적용
2. **F144 FallbackChainService** — ModelRouter 확장 + 서비스 + 테스트
3. **F149 PromptGatewayService** — 정규화 서비스 + prompt-utils 통합 + 테스트
4. **F150 AgentFeedbackLoopService** — FeedbackService 확장 + Orchestrator 통합 + 테스트
5. **Routes/Schemas** — 6개 엔드포인트 + Zod 스키마
6. **통합 테스트** — 3서비스 연동 시나리오

## 5. 성공 기준

| 기준 | 목표 |
|------|------|
| Match Rate | ≥ 90% |
| 신규 테스트 | 40개+ 전체 통과 |
| 기존 테스트 회귀 | 0건 |
| typecheck | 에러 0건 |
| 폴백 체인 동작 | mock 모델 실패 시 다음 모델로 자동 전환 확인 |
| 프롬프트 정규화 | API 키, 비밀번호 패턴 100% 마스킹 |
| 피드백 루프 | failed 실행 시 feedback 레코드 자동 생성 확인 |
