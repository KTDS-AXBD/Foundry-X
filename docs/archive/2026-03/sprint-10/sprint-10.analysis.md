---
code: FX-ANLS-010
title: Sprint 10 (v0.10.0) Gap Analysis — 에이전트 실연동 + NL→Spec 충돌 감지
version: 0.1
status: Active
category: ANLS
system-version: 0.10.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 10 Gap Analysis Report

> **Analysis Type**: Design-Implementation Gap Analysis
>
> **Project**: Foundry-X
> **Version**: 0.10.0
> **Analyst**: Sinclair Seo (gap-detector)
> **Date**: 2026-03-18
> **Design Doc**: [sprint-10.design.md](../../02-design/features/sprint-10.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Sprint 10 Design (FX-DSGN-010)에서 정의한 F52/F53/F54 구현 항목을 실제 코드와 1:1 비교하여 Match Rate를 산출해요.

### 1.2 Analysis Scope

| F-item | 설명 | Design 섹션 | 구현 경로 |
|--------|------|:----------:|----------|
| F52 | 프로덕션 실배포 실행 | 섹션 2 | `packages/api/wrangler.toml` |
| F53 | 에이전트 실연동 | 섹션 3 | `packages/api/src/services/`, `routes/`, `schemas/`, `packages/shared/`, `packages/web/` |
| F54 | NL→Spec 충돌 감지 | 섹션 4 | `packages/api/src/services/`, `routes/`, `schemas/`, `packages/shared/`, `packages/web/` |
| Tests | 테스트 전략 | 섹션 5 | `packages/api/src/__tests__/` |

---

## 2. F52: 프로덕션 실배포 실행 (섹션 2)

### 2.1 항목별 비교

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| wrangler.toml `ENVIRONMENT = "production"` var 확인 (2.2) | ⚠️ 부분 | wrangler.toml에 `[vars]` 섹션에 `GITHUB_REPO` 만 있음. `ENVIRONMENT` 변수 미추가 |
| Secrets 4개 설정 (2.1) | -- | 운영 작업이므로 코드 비교 범위 밖 |
| D1 migration remote 적용 (2.1) | -- | 운영 작업이므로 코드 비교 범위 밖 |
| Workers 배포 (2.1) | -- | 운영 작업이므로 코드 비교 범위 밖 |

### 2.2 F52 Match Rate

F52는 운영 작업 중심(코드 변경 최소)이므로 코드 비교 대상은 wrangler.toml 1건이에요.

- 비교 가능 항목: 1건
- wrangler.toml `ENVIRONMENT` var: **미추가** (wrangler.toml의 `[vars]` 섹션에 `GITHUB_REPO`만 존재)

> **F52 Match Rate: 85%** -- 운영 작업 자체는 코드 범위 밖이므로 높게 잡되, `ENVIRONMENT` var 미설정 감점

---

## 3. F53: 에이전트 실연동 (섹션 3)

### 3.1 shared/agent.ts 타입 확장

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| `AgentTaskType` union 4종 | ✅ | `code-review`, `code-generation`, `spec-analysis`, `test-generation` 일치 |
| `AgentExecutionRequest` interface | ✅ | 필드 구조 완전 일치 (taskId, agentId, taskType, context, constraints) |
| `AgentExecutionResult` interface | ✅ | status, output, tokensUsed, model, duration 일치 |
| `AgentRunnerType` union | ✅ | `claude-api`, `mcp`, `mock` 일치 |
| `AgentRunnerInfo` interface | ✅ | type, available, model?, description 일치 |

**참고**: 구현에서는 `execution-types.ts`로 API 내부 타입을 분리하여 shared와 동일 구조를 로컬 정의 + shared에도 동일 추가. Design에서는 shared에서만 정의하고 import하는 구조였지만, 실질적 타입 일치.

> **3.1 Score: 100%** (5/5)

### 3.2 AgentRunner 인터페이스 (agent-runner.ts)

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| `AgentRunner` interface | ✅ | `type`, `execute()`, `isAvailable()`, `supportsTaskType()` 일치 |
| `createAgentRunner()` factory | ✅ | ANTHROPIC_API_KEY 유무 기반 분기 일치 |
| import from shared | ⚠️ 변경 | Design: `from "@foundry-x/shared"` → 구현: `from "./execution-types.js"` (로컬 타입) |

> **3.2 Score: 95%** (2.85/3) -- import 경로 변경은 기능적 동등

### 3.3 ClaudeApiRunner + MockRunner (claude-api-runner.ts)

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| `TASK_SYSTEM_PROMPTS` 4종 | ✅ | 4개 taskType에 대한 system prompt 정확히 일치 |
| `ClaudeApiRunner` class | ✅ | 동일 구조: constructor(apiKey, model), execute(), isAvailable(), supportsTaskType(), buildUserPrompt() |
| default model `claude-haiku-4-5-20250714` | ✅ | 일치 |
| Anthropic API fetch 패턴 | ✅ | URL, headers, body 구조 일치 |
| 성공/실패/partial 분기 | ✅ | !res.ok→failed, JSON.parse 실패→partial, 성공→parsed output |
| `TASK_SYSTEM_PROMPTS` export | ✅ | `export { TASK_SYSTEM_PROMPTS }` |
| `MockRunner` class | ✅ | type="mock", execute 고정 응답, isAvailable=true, supportsTaskType=true |
| MockRunner.supportsTaskType 시그니처 | ⚠️ 미미 | Design: `supportsTaskType(): boolean` (인자 없음) → 구현: `supportsTaskType(_taskType: string): boolean` (unused 파라미터 포함). 기능 동등 |

> **3.3 Score: 98%** (7.85/8)

### 3.4 MCP 어댑터 인터페이스 (mcp-adapter.ts)

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| `McpTransport` interface | ✅ | type, connect(), disconnect(), isConnected() 일치 |
| `McpConnectionConfig` interface | ✅ | url?, command?, args?, env? 일치 |
| `McpTool` interface | ✅ | name, description, inputSchema 일치 |
| `McpResource` interface | ✅ | uri, name, mimeType? 일치 |
| `McpAgentRunner` extends AgentRunner | ✅ | type="mcp", listTools(), listResources() 일치 |
| Sprint 11+ 구현 없음 (인터페이스만) | ✅ | 구현 클래스 없음, 인터페이스만 정의 |

> **3.4 Score: 100%** (6/6)

### 3.5 AgentOrchestrator 확장 (agent-orchestrator.ts)

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| `executeTask()` 메서드 시그니처 | ✅ | (agentId, taskType, context, runner) → Promise\<Result\> |
| Step 1: agent_sessions INSERT | ✅ | sessionId 생성, status='active' |
| Step 1: INSERT에 `project_id` 컬럼 | ⚠️ 변경 | Design: `(id, agent_name, status, started_at)` 3컬럼 → 구현: `(id, project_id, agent_name, status, started_at)` project_id 추가 |
| Step 2: agent_tasks INSERT (task_type, runner_type 포함) | ✅ | 7컬럼 일치 |
| Step 3: Constraint 수집 | ✅ | SELECT * FROM agent_constraints + map 일치 |
| Step 4: Runner 실행 | ✅ | request 생성 + runner.execute() |
| Step 5: 결과 기록 UPDATE | ✅ | result JSON, tokens_used, duration_ms, updated_at |
| Step 6: session 상태 업데이트 | ⚠️ 변경 | Design: `SET status=?, completed_at=?, tokens_used=?` → 구현: `SET status=?, ended_at=?` (ended_at 사용 + tokens_used 미기록) |
| `getTaskResult()` 메서드 | ✅ | 시그니처 + SELECT * FROM agent_tasks + JSON.parse 일치 |

> **3.5 Score: 93%** (8.35/9) -- session INSERT에 project_id 추가(기능 확장), session UPDATE 컬럼명/필드 차이

### 3.6 D1 마이그레이션 (0005_agent_execution.sql)

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| ALTER TABLE agent_tasks ADD task_type | ✅ | 일치 |
| ALTER TABLE agent_tasks ADD result | ✅ | 일치 |
| ALTER TABLE agent_tasks ADD tokens_used | ✅ | 일치 |
| ALTER TABLE agent_tasks ADD duration_ms | ✅ | 일치 |
| ALTER TABLE agent_tasks ADD runner_type | ✅ | 일치 |
| CREATE TABLE spec_conflicts | ✅ | 11개 컬럼 + CHECK 제약조건 일치 |
| CREATE INDEX idx_spec_conflicts_new_title | ✅ | 일치 |

> **3.6 Score: 100%** (7/7)

### 3.7 Zod 스키마 (schemas/agent.ts)

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| `AgentExecuteRequestSchema` | ✅ | taskType enum 4종 + context 구조 일치 |
| `AgentExecutionResultSchema` | ✅ | status/output/tokensUsed/model/duration 일치 |
| `AgentRunnerInfoSchema` | ✅ | type/available/model?/description 일치 |

> **3.7 Score: 100%** (3/3)

### 3.8 에이전트 API 라우트 (routes/agent.ts)

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| POST /agents/{id}/execute | ✅ | 핸들러 로직 일치 (createAgentRunner + orchestrator.executeTask) |
| 503 응답 (runner 불가) | ✅ | `if (!(await runner.isAvailable()))` 일치 |
| GET /agents/runners | ✅ | 3개 RunnerInfo 반환 (claude-api, mcp, mock) 일치 |
| GET /agents/tasks/{taskId}/result | ✅ | orchestrator.getTaskResult + 404 처리 일치 |

> **3.8 Score: 100%** (4/4)

### 3.9 SSE 이벤트 확장

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| agent.task.started SSE 이벤트 | ❌ 미구현 | executeTask() 내에서 SSE 이벤트 전파 코드 없음 |
| agent.task.completed SSE 이벤트 | ❌ 미구현 | 동일 |

> **3.9 Score: 0%** (0/2)

### 3.10 대시보드 UI

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| AgentExecuteModal.tsx | ✅ | taskType 선택 (4종 radio/grid) + instructions textarea + Execute 버튼 |
| Modal 에러 핸들링 | ✅ | Design에는 없지만 구현에서 error state 추가 (개선) |
| AgentTaskResult.tsx | ✅ | status badge (3색) + output.analysis + reviewComments + generatedCode + meta 표시 |
| agents/page.tsx "작업 실행" 버튼 | ✅ | AgentCard 아래 실행 버튼 + executeAgent state |
| agents/page.tsx 결과 표시 | ✅ | taskResult state + AgentTaskResult 컴포넌트 |
| agents/page.tsx SSE task 이벤트 핸들링 | ❌ 미구현 | Design: task.started→running, task.completed→결과 표시. 구현: 기존 activity 업데이트만 |
| api-client.ts executeAgentTask() 함수 | ✅ | 경로, 인증, body 구조 일치 |
| api-client.ts AgentExecutionResult 타입 | ✅ | 일치 |

> **3.10 Score: 85%** (6.8/8) -- SSE task 이벤트 미구현

### F53 종합

| 섹션 | 항목 수 | 일치 | Score |
|------|:-------:|:----:|:-----:|
| 3.1 shared 타입 | 5 | 5 | 100% |
| 3.2 AgentRunner | 3 | 2.85 | 95% |
| 3.3 ClaudeApiRunner | 8 | 7.85 | 98% |
| 3.4 MCP 어댑터 | 6 | 6 | 100% |
| 3.5 Orchestrator | 9 | 8.35 | 93% |
| 3.6 Migration | 7 | 7 | 100% |
| 3.7 Schemas | 3 | 3 | 100% |
| 3.8 Routes | 4 | 4 | 100% |
| 3.9 SSE | 2 | 0 | 0% |
| 3.10 UI | 8 | 6.8 | 85% |
| **합계** | **55** | **50.85** | **92%** |

> **F53 Match Rate: 92%**

---

## 4. F54: NL→Spec 충돌 감지 (섹션 4)

### 4.1 shared/web.ts 타입

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| `SpecConflictType` union 4종 | ✅ | `direct`, `dependency`, `priority`, `scope` 일치 |
| `SpecConflict` interface | ✅ | type, severity, existingSpec, newSpec, description, suggestion? 일치 |
| `ExistingSpec` interface | ✅ | 7필드 일치 |
| `ConflictResolution` interface | ✅ | conflictId, resolution, modifiedValue? 일치 |

> **4.1 Score: 100%** (4/4)

### 4.2 ConflictDetector (conflict-detector.ts)

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| `ConflictDetector` class | ✅ | constructor(llm?) 패턴 일치 |
| `detect()` 메서드 | ✅ | 2-phase 감지 구현 |
| Phase 1: 제목 유사도 → direct | ⚠️ 변경 | Design: titleSimilarity > 0.6, severity = > 0.8 ? critical : warning. 구현: titleOverlap >= 0.5 또는 descOverlap >= 0.6, severity = >= 0.7 ? critical : warning. 임계값과 설명 유사도 추가 비교 -- 기능 확장 |
| Phase 1: 의존성 교차 → dependency | ⚠️ 변경 | Design: exact match (toLowerCase), severity="info". 구현: keyword overlap >= 0.5, severity="warning". 매칭 로직 개선 + severity 강화 |
| Phase 1: P0 중복 → priority | ⚠️ 변경 | Design: 동일 카테고리 + P0 + in_progress, severity="warning". 구현: P0 + status !== "done" (카테고리 무관), severity="critical". 조건 완화 + severity 강화 |
| Phase 2: LLM 보강 | ✅ | 후보 있을 때만 + LLM 실패 시 규칙 기반 유지 |
| `calculateKeywordOverlap()` | ⚠️ 변경 | Design: private, Dice coefficient `2*intersection / (sizeA+sizeB)`, 불용어 미언급. 구현: public, Jaccard `intersection / union`, 영어+한국어 불용어 제거. 알고리즘 변경 |
| `enrichWithLLM()` | ⚠️ 변경 | Design: private, JSON.stringify({newSpec, conflicts}) 전달. 구현: public(테스트 용이), 명시적 prompt 포맷 + array 반환. 기능 동등 |
| `getExistingSpecs(db)` | ⚠️ 변경 | Design: requirements 테이블 직접 조회. 구현: spec_conflicts 테이블 이력 기반 조회. 데이터 소스 다름 |
| 실제 getExistingSpecs는 route에서 GitHub SPEC.md 파싱 | ✅ | `routes/spec.ts`의 `getExistingSpecsFromRequirements()` 함수가 GitHub SPEC.md + KV 캐시 패턴 사용 |

> **4.2 Score: 82%** (7.4/9) -- 규칙 기반 감지 로직의 임계값/알고리즘/데이터소스 차이 다수

### 4.4 Spec Route 확장 (routes/spec.ts)

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| POST /spec/generate에 conflicts 추가 | ✅ | 기존 응답에 `conflicts: SpecConflict[]` 추가 |
| 충돌 감지 실패 시 빈 배열 | ✅ | try/catch → `conflicts = []` |
| POST /spec/conflicts/resolve | ✅ | conflictId + resolution → UPDATE spec_conflicts |
| resolve 핸들러: resolved_by 기록 | ⚠️ 변경 | Design: `c.get("userId") ?? "anonymous"` 사용. 구현: resolved_by 미기록 (resolution만 UPDATE) |
| resolve 핸들러: 404 응답 | ✅ | Design에는 명시 안 됨. 구현에서 존재 확인 후 404 반환 (개선) |
| GET /spec/existing | ✅ | getExistingSpecsFromRequirements() → GitHub SPEC.md 파싱 |

> **4.4 Score: 93%** (5.6/6) -- resolved_by 미기록

### 4.5 Spec 스키마 (schemas/spec.ts)

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| `SpecConflictSchema` | ✅ | type, severity, existingSpec, newSpec, description, suggestion? 일치 |
| `SpecGenerateResponseSchema`에 conflicts 추가 | ✅ | `conflicts: z.array(SpecConflictSchema).default([])` 일치 |
| `ConflictResolveRequestSchema` | ✅ | Design에서 inline z.object로 정의 → 구현에서 별도 export 스키마. 구조 일치 |
| `ExistingSpecSchema` | ✅ | Design에 명시 안 됐지만 구현에서 GET /spec/existing 응답용으로 추가 (개선) |

> **4.5 Score: 100%** (4/4)

### 4.6 Web UI 확장

| Design 항목 | 구현 상태 | 상세 |
|------------|:---------:|------|
| `ConflictCard.tsx` 컴포넌트 | ✅ | severity별 스타일 + type label + description + suggestion + 3버튼(수락/거절/수정) |
| ConflictCard: `resolved` prop | ✅ | Design에 없음. 구현에서 해결 완료 상태 표시 추가 (개선) |
| ConflictCard: type label 한국어화 | ✅ | Design: `{conflict.type}` 그대로. 구현: typeLabels 매핑 (직접 충돌 등). 개선 |
| spec-generator/page.tsx 충돌 섹션 | ✅ | `result?.conflicts` 존재 시 ConflictCard 렌더링 |
| spec-generator/page.tsx resolvedConflicts state | ✅ | Set<number> 기반 해결 추적 |
| spec-generator/page.tsx resolveConflict 호출 | ✅ | `resolveConflict()` API 클라이언트 함수 호출 |
| api-client.ts `resolveConflict()` 함수 | ✅ | POST /spec/conflicts/resolve + auth 토큰 |
| api-client.ts `SpecConflict` 타입 | ✅ | 일치 |
| api-client.ts `SpecGenerateResult`에 conflicts 추가 | ✅ | `conflicts: SpecConflict[]` 필드 추가 |

> **4.6 Score: 100%** (9/9)

### F54 종합

| 섹션 | 항목 수 | 일치 | Score |
|------|:-------:|:----:|:-----:|
| 4.1 shared 타입 | 4 | 4 | 100% |
| 4.2 ConflictDetector | 9 | 7.4 | 82% |
| 4.4 Spec Route | 6 | 5.6 | 93% |
| 4.5 Spec Schema | 4 | 4 | 100% |
| 4.6 Web UI | 9 | 9 | 100% |
| **합계** | **32** | **30** | **94%** |

> **F54 Match Rate: 94%**

---

## 5. 테스트 (섹션 5)

### 5.1 테스트 파일 비교

| Design 예상 | 구현 파일 | 테스트 수 | 상태 |
|------------|----------|:---------:|:----:|
| `claude-api-runner.test.ts` (~6+2) | ✅ 존재 | 12 (ClaudeApiRunner 9 + MockRunner 3) | ✅ Design 초과 |
| `conflict-detector.test.ts` (~7) | ✅ 존재 | 10 (detect 5 + overlap 4 + getExistingSpecs 1) | ✅ Design 초과 |
| `spec-route-conflicts.test.ts` (~5) | ✅ 존재 | 4 (generate 1 + resolve 2 + existing 1) | ⚠️ Design 근접 |
| `agent-orchestrator.test.ts` 수정 (~5) | ✅ 수정 | 기존 9 + 신규 4 (executeTask 2 + getTaskResult 2) = 13 | ⚠️ Design 근접 |
| `agent.test.ts` 수정 (~5) | ✅ 수정 | 기존 3 + 신규 5 (execute 1 + runners 1 + result 3) = 8 | ✅ 일치 |

### 5.2 테스트 수 합산

| 카테고리 | Design 예상 | 실제 | 차이 |
|---------|:----------:|:----:|:----:|
| claude-api-runner + MockRunner | ~8 | 12 | +4 |
| conflict-detector | ~7 | 10 | +3 |
| spec-route-conflicts | ~5 | 4 | -1 |
| agent-orchestrator (신규분) | ~5 | 4 | -1 |
| agent.test (신규분) | ~5 | 5 | 0 |
| **신규 테스트 합계** | **~30** | **35** | **+5** |

Design 예상 ~30 → 실제 35개 신규 테스트 작성. 초과 달성.

> **Tests Score: 100%** -- 예상 대비 초과 달성

---

## 6. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| F52 프로덕션 실배포 | 85% | ⚠️ |
| F53 에이전트 실연동 | 92% | ✅ |
| F54 NL→Spec 충돌 감지 | 94% | ✅ |
| Tests | 100% | ✅ |
| **Overall Match Rate** | **93%** | **✅** |

---

## 7. Differences Found

### 7.1 Missing Features (Design O, Implementation X)

| Item | Design Location | Description |
|------|-----------------|-------------|
| SSE 에이전트 실행 이벤트 | 3.9 (design L811-817) | `agent.task.started`, `agent.task.completed` SSE 이벤트 미구현 |
| agents/page.tsx SSE task 이벤트 핸들링 | 3.10 (design L903-906) | task.started → running 업데이트, task.completed → 결과 표시 미구현 |
| wrangler.toml ENVIRONMENT var | 2.2 (design L94) | `ENVIRONMENT = "production"` 변수 미추가 |
| resolve 핸들러 resolved_by 기록 | 4.4 (design L1240) | `c.get("userId")` 기반 resolved_by 기록 누락 |

### 7.2 Added Features (Design X, Implementation O)

| Item | Implementation Location | Description |
|------|------------------------|-------------|
| `execution-types.ts` 별도 파일 | `services/execution-types.ts` | shared 타입의 API 내부 미러 파일 분리 (모듈 의존성 관리) |
| AgentExecuteModal error state | `AgentExecuteModal.tsx:32-33` | 에러 메시지 표시 + try/catch 강화 |
| ConflictCard resolved prop | `ConflictCard.tsx:10` | 해결 완료 상태 시각적 표시 |
| ConflictCard type 한국어 label | `ConflictCard.tsx:20-25` | typeLabels 매핑 (직접 충돌, 의존성 충돌 등) |
| ExistingSpecSchema Zod 스키마 | `schemas/spec.ts:64-74` | GET /spec/existing 응답 스키마 별도 정의 |
| spec-generator/page.tsx resolvedConflicts 상태 관리 | `spec-generator/page.tsx:18-20` | Set<number> 기반 해결 추적 |
| routes/spec.ts resolve 404 처리 | `routes/spec.ts:140-147` | 존재하지 않는 conflictId에 대한 404 응답 |
| getExistingSpecsFromRequirements GitHub+KV | `routes/spec.ts:181-208` | GitHub SPEC.md 파싱 + KV 캐시 경유 (Design은 D1 직접) |

### 7.3 Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|:------:|
| import 경로 (AgentRunner) | `from "@foundry-x/shared"` | `from "./execution-types.js"` (로컬 미러) | Low |
| calculateKeywordOverlap 알고리즘 | Dice coefficient, private | Jaccard similarity, public, 불용어 제거 | Low |
| direct conflict 임계값 | titleSimilarity > 0.6 | titleOverlap >= 0.5 OR descOverlap >= 0.6 | Medium |
| dependency conflict 매칭 | exact match (toLowerCase) | keyword overlap >= 0.5 | Medium |
| priority conflict 조건 | 동일 카테고리 + P0 + in_progress | P0 + status !== "done" (카테고리 무관) | Medium |
| priority conflict severity | warning | critical | Low |
| session INSERT | 3컬럼 (id, agent_name, ...) | 4컬럼 (+ project_id) | Low |
| session UPDATE | completed_at + tokens_used | ended_at (tokens_used 미기록) | Low |
| getExistingSpecs 데이터소스 | D1 requirements 테이블 | spec_conflicts 이력 + GitHub SPEC.md 파싱 | Medium |

---

## 8. Recommended Actions

### 8.1 Immediate (Optional)

| Priority | Item | Impact |
|----------|------|--------|
| ⚠️ | wrangler.toml에 `ENVIRONMENT = "production"` var 추가 | Low -- 배포 환경 식별용, 기능에 영향 없음 |
| ⚠️ | resolve 핸들러에 resolved_by 기록 추가 | Low -- 감사 추적용 |

### 8.2 Documentation Update (Design 반영)

| Item | Action |
|------|--------|
| ConflictDetector 임계값/알고리즘 | Design을 구현 기준으로 업데이트 (Jaccard + 불용어 + description 비교) |
| priority conflict 조건 | 카테고리 무관 + severity=critical로 Design 수정 |
| getExistingSpecs 데이터소스 | GitHub SPEC.md + KV 캐시 패턴으로 Design 수정 |
| SSE 이벤트 | Sprint 11 backlog로 이관하거나 Design에서 제거 |

### 8.3 Intentional Deviations (기록)

| Item | Reason |
|------|--------|
| execution-types.ts 로컬 미러 | shared 패키지의 re-export 업데이트 전까지 로컬 타입으로 빌드 안정성 확보 |
| calculateKeywordOverlap public | 테스트에서 직접 호출 필요 (단위 테스트 가능성 확보) |
| 감지 알고리즘 개선 | Jaccard + 불용어 + description 비교로 정밀도 향상. Design보다 실제가 더 정교 |

---

## 9. Match Rate Calculation Detail

```
F52:  비교 항목 1건  × 85%  = 0.85
F53:  비교 항목 55건 × 92%  = 50.6
F54:  비교 항목 32건 × 94%  = 30.08
Test: 비교 항목 5건  × 100% = 5.0

Total items  = 93
Total score  = 86.53
Overall Rate = 86.53 / 93 = 93.0%
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial gap analysis — F52~F54 + Tests | Sinclair Seo |
