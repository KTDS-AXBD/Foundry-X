---
code: FX-PLAN-034
title: "Sprint 34 — OpenRouter 게이트웨이 통합 (F135)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: F135
sprint: 34
phase: "Phase 5a"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F135: OpenRouter 게이트웨이 통합 |
| Sprint | 34 |
| 기간 | 2026-03-22 ~ (1 Sprint) |
| Phase | Phase 5a (Agent Evolution Track A 시작) |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 현재 ClaudeApiRunner가 Anthropic API(Haiku) 단일 모델만 지원하여, 태스크 복잡도에 따른 최적 모델 선택이 불가능하고 비용 최적화 여지가 없음 |
| **Solution** | OpenRouter API(OpenAI 호환 포맷)를 사용하는 `OpenRouterRunner` 구현체를 기존 `AgentRunner` 추상화에 추가하여 300+ 모델 접근 가능 |
| **Function UX Effect** | 에이전트 태스크 실행 시 OpenRouter를 통해 다양한 모델(GPT-4o, Gemini, Llama 등) 사용 가능. 기존 Anthropic 직접 호출은 Fallback으로 유지 |
| **Core Value** | 멀티모델 기반 에이전트 시스템의 토대 — F136(태스크별 라우팅), F137(Evaluator-Optimizer) 등 후속 기능의 필수 전제 |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표
- `OpenRouterRunner` 클래스를 `AgentRunner` 인터페이스 구현체로 작성
- `createAgentRunner` 팩토리에서 `OPENROUTER_API_KEY` 환경 변수 기반으로 Runner 선택
- OpenRouter API `/v1/chat/completions` (OpenAI 호환) 호출 및 응답 변환
- 기존 `AgentExecutionResult` 포맷으로 응답 정규화 (tokensUsed, model, uiHint 등)
- 에러 핸들링 + Fallback (OpenRouter 실패 시 → ClaudeApiRunner로 전환)
- 단위 테스트 + 통합 테스트 작성

### 1.2 성공 기준
| 기준 | 목표 |
|------|------|
| OpenRouterRunner 단위 테스트 | 10개+ 통과 |
| 기존 테스트 회귀 | 0건 |
| Runner 팩토리 분기 | 3-way (OpenRouter / Claude / Mock) |
| 지원 모델 | 최소 3개 (GPT-4o, Claude Sonnet, Gemini) 확인 |
| typecheck + lint | 에러 0건 |

### 1.3 비목표 (Non-Goals)
- 태스크별 자동 모델 라우팅 (F136 범위)
- model_routing_rules DB 테이블 (F136 범위)
- Evaluator-Optimizer 패턴 (F137 범위)
- Web Dashboard 모델 선택 UI (F139+ 범위)
- 프로덕션 배포 (PoC 검증 후 Sprint 35+에서 배포)

---

## 2. 배경 (Context)

### 2.1 관련 문서
| 문서 | 참조 |
|------|------|
| Agent Evolution PRD | `docs/specs/agent-evolution/prd-final.md` §4.1 A1 |
| 기존 Runner 추상화 | `packages/api/src/services/agent-runner.ts` |
| ClaudeApiRunner | `packages/api/src/services/claude-api-runner.ts` |
| Execution Types | `packages/api/src/services/execution-types.ts` |
| Phase 5 로드맵 | MEMORY.md "다음 작업" 섹션 |

### 2.2 현재 상태 (As-Is)
```
AgentRunner (interface)
├── ClaudeApiRunner  — Anthropic /v1/messages (Haiku 고정)
├── MockRunner       — 테스트용 mock
└── (MCP Runner)     — mcp-runner.ts (별도 파일, AgentRunner 미구현)
```

- `AgentRunnerType = "claude-api" | "mcp" | "mock"`
- `createAgentRunner(env)` — `ANTHROPIC_API_KEY` 존재 시 ClaudeApiRunner, 아니면 MockRunner
- `AgentTaskType` 7종: code-review, code-generation, spec-analysis, test-generation, policy-evaluation, skill-query, ontology-lookup
- 시스템 프롬프트가 `TASK_SYSTEM_PROMPTS` Record에 하드코딩

### 2.3 목표 상태 (To-Be)
```
AgentRunner (interface)
├── OpenRouterRunner — OpenRouter /v1/chat/completions (모델 파라미터화)
├── ClaudeApiRunner  — Anthropic /v1/messages (Fallback)
├── MockRunner       — 테스트용 mock
└── (MCP Runner)
```

- `AgentRunnerType = "claude-api" | "openrouter" | "mcp" | "mock"`
- `createAgentRunner(env)` — 우선순위: OpenRouter > Claude > Mock
- OpenRouterRunner는 모델을 파라미터로 받아 동적 선택 가능 (기본값: `anthropic/claude-sonnet-4`)

---

## 3. 구현 계획 (Implementation Plan)

### 3.1 파일 변경 목록

| # | 파일 | 변경 유형 | 설명 |
|---|------|-----------|------|
| 1 | `packages/api/src/services/execution-types.ts` | 수정 | `AgentRunnerType`에 `"openrouter"` 추가 |
| 2 | `packages/api/src/services/openrouter-runner.ts` | 신규 | `OpenRouterRunner` 클래스 구현 |
| 3 | `packages/api/src/services/agent-runner.ts` | 수정 | 팩토리 함수에 OpenRouter 분기 추가, import 추가 |
| 4 | `packages/api/src/services/claude-api-runner.ts` | 수정 (최소) | `TASK_SYSTEM_PROMPTS` export 유지 (OpenRouterRunner에서 재사용) |
| 5 | `packages/api/src/__tests__/openrouter-runner.test.ts` | 신규 | OpenRouterRunner 단위 테스트 |
| 6 | `packages/api/src/__tests__/agent-runner-factory.test.ts` | 신규/수정 | 팩토리 3-way 분기 테스트 |

### 3.2 구현 순서

```
Step 1: execution-types.ts 확장
  └─ AgentRunnerType에 "openrouter" 추가

Step 2: openrouter-runner.ts 작성
  ├─ OpenRouterRunner class implements AgentRunner
  ├─ constructor(apiKey, model?, baseUrl?)
  ├─ execute() — OpenAI 호환 포맷으로 변환 + 호출
  ├─ isAvailable() — API key 존재 확인
  └─ supportsTaskType() — TASK_SYSTEM_PROMPTS 기반

Step 3: agent-runner.ts 팩토리 확장
  └─ OPENROUTER_API_KEY 우선 → ANTHROPIC_API_KEY → MockRunner

Step 4: 테스트 작성
  ├─ openrouter-runner.test.ts (API mock, 응답 변환, 에러 핸들링)
  └─ agent-runner-factory.test.ts (3-way 분기)

Step 5: typecheck + lint + 기존 테스트 회귀 확인
```

### 3.3 OpenRouter API 연동 상세

**요청 포맷 (OpenAI 호환):**
```typescript
// POST https://openrouter.ai/api/v1/chat/completions
{
  "model": "anthropic/claude-sonnet-4",  // OpenRouter 모델 ID
  "messages": [
    { "role": "system", "content": systemPrompt },
    { "role": "user", "content": userPrompt }
  ],
  "max_tokens": 4096,
  "temperature": 0.1
}
```

**응답 변환:**
```
OpenRouter response.choices[0].message.content
  → JSON parse → AgentExecutionResult.output

OpenRouter response.usage.{prompt_tokens, completion_tokens}
  → AgentExecutionResult.tokensUsed

OpenRouter response.model
  → AgentExecutionResult.model
```

**인증:**
```
Authorization: Bearer ${OPENROUTER_API_KEY}
HTTP-Referer: https://foundry-x-api.ktds-axbd.workers.dev
X-Title: Foundry-X
```

### 3.4 에러 핸들링 전략

| 시나리오 | 처리 |
|----------|------|
| OpenRouter API 타임아웃 (30s) | `status: "failed"` 반환, 로그 기록 |
| 모델 미지원 에러 (404) | Fallback 모델로 재시도 1회 |
| Rate limit (429) | 지수 백오프 1회 재시도 |
| 응답 JSON 파싱 실패 | `status: "partial"`, raw text를 analysis에 저장 (ClaudeApiRunner 패턴 동일) |
| API key 미설정 | `isAvailable()` false 반환, 팩토리에서 다음 Runner로 |

### 3.5 환경 변수

| 변수 | 용도 | 필수 |
|------|------|------|
| `OPENROUTER_API_KEY` | OpenRouter API 인증 | F135 사용 시 필수 |
| `OPENROUTER_DEFAULT_MODEL` | 기본 모델 ID (미설정 시 `anthropic/claude-sonnet-4`) | 선택 |
| `ANTHROPIC_API_KEY` | 기존 Anthropic Fallback | 기존 유지 |

---

## 4. 리스크 및 의존성

### 4.1 리스크

| # | 리스크 | 영향도 | 대응 |
|---|--------|--------|------|
| R1 | OpenRouter API 응답 포맷이 모델마다 다를 수 있음 | 중간 | JSON 파싱 실패 시 partial 처리 + 모델별 테스트 |
| R2 | Workers 환경에서 OpenRouter API 호출 지연 | 낮음 | 30s 타임아웃, AbortController 사용 |
| R3 | 기존 테스트 회귀 (import 경로 변경) | 낮음 | 기존 export 유지, 신규 export만 추가 |

### 4.2 의존성

| 의존 | 상태 | 비고 |
|------|------|------|
| OpenRouter API 키 | ✅ 발급 완료 (F155) | `.dev.vars` OPENROUTER_API_KEY |
| AgentRunner 인터페이스 | ✅ 존재 | `packages/api/src/services/agent-runner.ts` |
| execution-types.ts | ✅ 존재 | AgentRunnerType 확장 필요 |

---

## 5. 체크리스트

- [ ] `execution-types.ts` — `AgentRunnerType`에 `"openrouter"` 추가
- [ ] `openrouter-runner.ts` — `OpenRouterRunner` 클래스 구현
  - [ ] constructor (apiKey, model, baseUrl)
  - [ ] execute() — OpenAI 호환 요청 + 응답 변환
  - [ ] isAvailable()
  - [ ] supportsTaskType()
  - [ ] 에러 핸들링 (타임아웃, 429, 파싱 실패)
- [ ] `agent-runner.ts` — 팩토리에 OpenRouter 분기 추가
- [ ] `openrouter-runner.test.ts` — 단위 테스트 10개+
- [ ] `agent-runner-factory.test.ts` — 3-way 분기 테스트
- [ ] typecheck 통과 (에러 0건)
- [ ] lint 통과
- [ ] 기존 API 테스트 583개 회귀 없음
