---
code: FX-PLAN-025
title: Sprint 22 — PlannerAgent 고도화 (LLM 분석 정확도 개선)
version: 1.0
status: Draft
category: PLAN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: F95
req: FX-REQ-095
priority: P2
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F95: PlannerAgent 고도화 — 실 LLM 기반 코드베이스 분석 정확도 개선 |
| 시작일 | 2026-03-19 |
| 예상 범위 | Sprint 22 (서비스 2~3개 수정/신규 + 테스트 +20건 + 프롬프트 엔지니어링) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | PlannerAgent가 targetFiles 목록만으로 계획을 세움 — 파일 내용·의존관계를 모른 채 추측 기반 분석. LLM 실패 시 silent fallback으로 사용자가 mock 분석임을 알 수 없음. Haiku 모델의 reasoning 한계로 복잡한 리팩토링 계획 품질이 낮음 |
| **Solution** | Import graph 기반 파일 내용 수집 + task-type별 전문 프롬프트 + 모델 설정 가능화(기본 Sonnet) + 토큰 예산 관리 + LLM/mock 투명성 메타데이터 |
| **Function UX Effect** | 계획 문서에 실제 코드 구조 분석이 반영되고, 어떤 분석 모드(LLM/mock)로 생성됐는지 명시되며, task-type에 최적화된 계획이 생성됨 |
| **Core Value** | "계획의 정확도 = 실행의 효율" — PlannerAgent가 실제 코드를 읽고 이해한 계획을 세움으로써, 에이전트의 자율적 코드 수정 신뢰도를 근본적으로 높임 |

## §1 배경

### 1.1 현재 상태 (Sprint 15~17 구현 완료)

| 구현 완료 | 상세 |
|-----------|------|
| Plan 생성 | `createPlan()` — mock 또는 LLM 분석 → proposedSteps + risks + estimatedTokens |
| LLM 연동 | Claude Haiku 4.5 (4096 max_tokens), PLANNER_SYSTEM_PROMPT 기반 |
| MCP 도구 통합 | `gatherExternalToolInfo()` — 활성 MCP 서버의 도구 목록을 프롬프트에 포함 |
| 승인 플로우 | pending_approval → approved/rejected/modified → executing → completed/failed |
| Orchestrator 통합 | `createPlanAndWait()` 폴링 + `executePlan()` 라이프사이클 |
| 테스트 | 18개 스위트, 37개 테스트 케이스 (planner-agent.test.ts 485 LOC) |

### 1.2 핵심 갭 (F95에서 해결)

| # | 갭 | 현재 | 목표 | 심각도 |
|:-:|-----|------|------|:------:|
| G1 | 파일 내용 미전달 | targetFiles 이름 목록만 전달 | 실제 파일 내용 + import graph 전달 | 🔴 |
| G2 | Silent fallback | LLM 실패 시 mock으로 조용히 전환, 사용자 모름 | 분석 모드 메타데이터 (analysisMode: "llm" \| "mock") | 🔴 |
| G3 | 단일 프롬프트 | 모든 task-type에 동일한 시스템 프롬프트 | task-type별 전문 프롬프트 (review vs generation) | 🟡 |
| G4 | 모델 고정 | Haiku 4.5 하드코딩 (기본값) | 기본 Sonnet 4.5 + 설정 가능 | 🟡 |
| G5 | 토큰 추정 부정확 | `files * 2000` 단순 공식 | 실제 파일 크기 기반 추정 | 🟡 |
| G6 | 프롬프트 크기 제한 없음 | buildPlannerPrompt 무제한 | 토큰 예산(budget) 기반 truncation | 🟡 |
| G7 | Retry 없음 | API 에러 시 즉시 mock fallback | 1회 retry + exponential backoff | ⚪ |

### 1.3 관련 코드

| 파일 | 역할 | LOC |
|------|------|:---:|
| `services/planner-agent.ts` | PlannerAgent 핵심 서비스 | 395 |
| `services/agent-orchestrator.ts` | createPlanAndWait + executePlan | 734 |
| `routes/agent.ts` | Plan API 라우트 (6 endpoints) | 953 |
| `schemas/plan.ts` | Zod 스키마 (createPlanSchema) | 32 |
| `__tests__/planner-agent.test.ts` | 테스트 스위트 | 485 |

### 1.4 관련 테스트

| 파일 | 테스트 수 | 커버 범위 |
|------|:---------:|----------|
| `planner-agent.test.ts` | 37 | CRUD, LLM 통합, 응답 파싱, MCP 도구 |

## §2 구현 전략

### 2.1 서브태스크 분류

| # | 서브태스크 | 범위 | 우선순위 |
|:-:|-----------|------|:--------:|
| **A** | Import graph 수집 + 파일 내용 전달 | planner-agent 확장 + 신규 유틸 | P1 |
| **B** | 분석 모드 투명성 (analysisMode 메타데이터) | planner-agent + 타입 + API 응답 | P1 |
| **C** | Task-type별 전문 프롬프트 | 프롬프트 분리 + 프롬프트 팩토리 | P1 |
| **D** | 모델 설정 가능화 + 기본값 Sonnet 전환 | planner-agent deps + 라우트 | P2 |
| **E** | 토큰 예산(budget) 관리 + truncation | 프롬프트 빌더 확장 | P2 |
| **F** | Retry + backoff + 에러 분류 | LLM 호출 래퍼 | P2 |

### 2.2 구현 순서

```
A (Import graph + 파일 내용 수집)
  → B (분석 모드 투명성)
    → C (Task-type별 프롬프트)
      → D (모델 설정 + Sonnet 기본값)
        → E (토큰 예산 관리)
          → F (Retry + backoff)
```

**이유**: A가 프롬프트 내용의 품질을 결정하는 핵심이고, B는 A와 함께 analysisMode를 추적해야 하며, C는 풍부해진 컨텍스트에 맞춘 프롬프트 최적화, D~F는 운영 안정성 개선.

## §3 서브태스크 A: Import Graph + 파일 내용 수집

### 3.1 문제

현재 `buildPlannerPrompt()`는 `targetFiles` 이름만 나열:
```
Target Files: src/services/planner-agent.ts, src/routes/agent.ts
```

LLM이 파일 이름만으로는 코드 구조, 함수 시그니처, 의존관계를 파악할 수 없어요.

### 3.2 해결: FileContextCollector

신규 유틸 `packages/api/src/services/file-context-collector.ts`:

```typescript
interface FileContext {
  path: string;
  content: string;        // truncated by budget
  imports: string[];       // import 경로 목록
  exports: string[];       // export 이름 목록
  lineCount: number;
}

interface CollectorOptions {
  maxDepth: number;        // import graph 탐색 깊이 (기본: 1)
  tokenBudget: number;     // 전체 토큰 예산 (기본: 50000)
  maxFileLines: number;    // 파일당 최대 줄 수 (기본: 500)
}

class FileContextCollector {
  constructor(
    private githubService: GitHubService,
    private options: CollectorOptions
  ) {}

  async collect(
    repo: string,
    branch: string,
    targetFiles: string[],
  ): Promise<FileContext[]>
}
```

### 3.3 Import Graph 탐색 전략

```
1. targetFiles를 seed로 시작 (depth=0)
2. 각 파일의 import 문 파싱 (정규식: import ... from "..." / require("..."))
3. 상대 경로 import만 추적 (node_modules 제외)
4. depth=1: 직접 import 파일 수집
5. 순환 참조 방지: visited Set
6. 파일 내용 가져오기: GitHubService.getFileContent() (GitHub API)
```

### 3.4 토큰 예산 분배

```
총 예산: 50,000 tokens (Sonnet 200K context의 25%)

1차 할당: targetFiles (70%) = 35,000 tokens
2차 할당: import graph (30%) = 15,000 tokens

파일당 할당: budget / fileCount
초과 시: 중요도 순 truncation
  - 함수 시그니처 + JSDoc 우선
  - 구현 body는 요약
```

### 3.5 Workers 환경 제약

Workers에서는 파일 시스템 접근이 불가능해요. 두 가지 경로:

| 경로 | 소스 | 장단점 |
|------|------|--------|
| **GitHub API** | `GET /repos/:owner/:repo/contents/:path` | 어디서나 가능, rate limit 주의 |
| **클라이언트 제공** | API 호출 시 body에 파일 내용 포함 | rate limit 없음, 호출자 부담 |

**선택**: GitHub API 기본 + 클라이언트 제공 옵션 (`context.fileContents` 필드 추가)

### 3.6 GitHubService 확장

```typescript
// 신규 메서드
async getFileContent(
  repo: string, path: string, ref?: string
): Promise<string | null>

async getMultipleFiles(
  repo: string, paths: string[], ref?: string
): Promise<Map<string, string>>
```

**Rate limit 보호**: 파일 10개 이상이면 Trees API (`GET /repos/:owner/:repo/git/trees/:sha?recursive=1`)로 한 번에 가져오기.

## §4 서브태스크 B: 분석 모드 투명성

### 4.1 현재 문제

```typescript
// LLM 실패 시 silent fallback
if (!res.ok) {
  return this.mockAnalysis(taskType, context); // 사용자 모름!
}
```

### 4.2 해결: analysisMode 메타데이터

`AgentPlan` 타입에 메타데이터 추가:

```typescript
// packages/shared/src/agent.ts
interface AgentPlan {
  // ... 기존 필드
  analysisMode?: "llm" | "mock";           // 어떤 모드로 분석했는지
  analysisModel?: string;                  // 사용된 모델 (e.g., "claude-sonnet-4-5-20250514")
  analysisTokensUsed?: number;             // 실제 사용 토큰
  analysisDurationMs?: number;             // 분석 소요 시간
  fileContextCount?: number;               // 전달된 파일 수
}
```

### 4.3 D1 컬럼 추가

```sql
-- 0015_planner_analysis_metadata.sql
ALTER TABLE agent_plans ADD COLUMN analysis_mode TEXT DEFAULT 'mock';
ALTER TABLE agent_plans ADD COLUMN analysis_model TEXT;
ALTER TABLE agent_plans ADD COLUMN analysis_tokens_used INTEGER;
ALTER TABLE agent_plans ADD COLUMN analysis_duration_ms INTEGER;
ALTER TABLE agent_plans ADD COLUMN file_context_count INTEGER DEFAULT 0;
```

### 4.4 API 응답 변경

`GET /plan/:id` 응답에 분석 메타데이터가 포함:

```json
{
  "id": "plan-abc123",
  "analysisMode": "llm",
  "analysisModel": "claude-sonnet-4-5-20250514",
  "analysisTokensUsed": 12340,
  "analysisDurationMs": 3200,
  "fileContextCount": 8,
  "codebaseAnalysis": "...",
  "proposedSteps": [...]
}
```

## §5 서브태스크 C: Task-type별 전문 프롬프트

### 5.1 현재 문제

모든 task-type에 동일한 `PLANNER_SYSTEM_PROMPT`를 사용:
- `code-review` 태스크에 "create/modify/delete" 스텝을 요청하는 것은 부적절
- `bug-fix`와 `feature`는 분석 관점이 다름

### 5.2 해결: 프롬프트 팩토리

```typescript
// services/planner-prompts.ts (신규)
const PROMPT_TEMPLATES: Record<string, string> = {
  "code-review": "... 리뷰 관점 프롬프트 ...",
  "code-generation": "... 생성 관점 프롬프트 ...",
  "bug-fix": "... 디버깅 관점 프롬프트 ...",
  "refactor": "... 리팩토링 관점 프롬프트 ...",
  "default": "... 범용 프롬프트 ...",
};

function getPlannerPrompt(taskType: AgentTaskType): string {
  return PROMPT_TEMPLATES[taskType] ?? PROMPT_TEMPLATES["default"];
}
```

### 5.3 프롬프트 차별화 핵심

| Task Type | 분석 관점 | 출력 형식 강조 |
|-----------|----------|---------------|
| `code-review` | 기존 코드 품질, 보안, 패턴 준수 | findings[] (위치 + 심각도 + 제안) |
| `code-generation` | 아키텍처 적합성, 의존성 영향 | proposedSteps[] (생성/수정 순서) |
| `bug-fix` | 원인 분석, 영향 범위, 회귀 위험 | rootCause + fix + regressionTest |
| `refactor` | 현재 구조 문제, 개선 방향, 호환성 | before/after 비교 + migration path |
| `test` | 커버리지 갭, 엣지 케이스 | testCases[] (입력 + 기대 + 근거) |

### 5.4 공통 프롬프트 구조

모든 task-type 프롬프트가 공유하는 기본 구조:

```
[공통 헤더: JSON 스키마 + 가이드라인]
[Task-specific 지시사항]
[Available External Tools (기존)]
[File Contents (신규)]
```

## §6 서브태스크 D: 모델 설정 가능화

### 6.1 변경 사항

| 항목 | 현재 | 변경 |
|------|------|------|
| 기본 모델 | `claude-haiku-4-5-20250714` | `claude-sonnet-4-5-20250514` |
| 설정 경로 | `deps.model` (이미 존재) | 동일 — 기본값만 변경 |
| API 레벨 | 없음 | `POST /plan` body에 `model` 옵션 추가 |

### 6.2 스키마 확장

```typescript
// schemas/plan.ts
export const createPlanSchema = z.object({
  agentId: z.string(),
  taskType: z.string(),
  context: z.object({
    repoUrl: z.string().optional(),
    branch: z.string().optional(),
    targetFiles: z.array(z.string()).optional(),
    instructions: z.string().optional(),
    spec: z.string().optional(),
    fileContents: z.record(z.string()).optional(),  // 신규: 클라이언트 제공 파일 내용
  }),
  model: z.enum([
    "claude-sonnet-4-5-20250514",
    "claude-haiku-4-5-20250714",
  ]).optional(),
});
```

## §7 서브태스크 E: 토큰 예산 관리

### 7.1 토큰 추정 함수

```typescript
function estimateTokens(text: string): number {
  // 영문: ~4 chars/token, 한국어: ~2 chars/token
  // 보수적 추정: 3 chars/token (한영 혼합)
  return Math.ceil(text.length / 3);
}
```

### 7.2 프롬프트 조립 시 예산 관리

```typescript
function buildPromptWithBudget(
  systemPrompt: string,
  userContext: string,
  fileContexts: FileContext[],
  budget: number = 100000,  // Sonnet 200K의 50%
): { system: string; user: string; truncated: boolean } {
  const systemTokens = estimateTokens(systemPrompt);
  const contextTokens = estimateTokens(userContext);
  const remaining = budget - systemTokens - contextTokens;

  // 파일 내용을 중요도 순으로 정렬 (targetFiles 우선, import 후순위)
  // remaining 토큰 내에서 포함
  // 초과 시 truncated = true
}
```

### 7.3 기존 estimatedTokens 개선

```typescript
// 현재: (targetFiles.length || 1) * 2000
// 변경: 실제 파일 크기 기반
const estimatedTokens = fileContexts.reduce(
  (sum, f) => sum + estimateTokens(f.content), 0
) + estimateTokens(systemPrompt) + 1000; // 1000 = overhead
```

## §8 서브태스크 F: Retry + Backoff

### 8.1 현재 → 변경

**현재**: API 에러 → 즉시 mock fallback
**변경**: 에러 분류 → retry 가능하면 1회 재시도 → 실패 시 mock + analysisMode 기록

### 8.2 에러 분류

| HTTP Status | 분류 | 동작 |
|:-----------:|------|------|
| 429 | Rate limit | 1초 대기 후 1회 retry |
| 500, 502, 503 | 서버 에러 | 2초 대기 후 1회 retry |
| 400, 401, 403 | 클라이언트 에러 | 즉시 mock fallback (retry 없음) |
| Network error | 네트워크 | 2초 대기 후 1회 retry |

### 8.3 구현

```typescript
private async callLlmWithRetry(
  prompt: string,
  systemPrompt: string,
  model: string,
): Promise<{ text: string; tokensUsed: number } | null> {
  const maxRetries = 1;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(...);
      if (res.ok) {
        const body = await res.json();
        return { text: ..., tokensUsed: body.usage?.output_tokens ?? 0 };
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        return null; // 즉시 포기
      }
      // 429, 5xx: retry
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, res.status === 429 ? 1000 : 2000));
      }
    } catch {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  return null; // all retries failed
}
```

## §9 테스트 전략

### 9.1 API 테스트 (예상 +20건)

| 범위 | 테스트 항목 | 예상 건수 |
|------|------------|:---------:|
| FileContextCollector | import 파싱, graph 탐색, 순환 참조, budget truncation | 8 |
| 분석 모드 투명성 | analysisMode llm/mock, 메타데이터 저장/조회 | 4 |
| Task-type 프롬프트 | 프롬프트 팩토리, task-type별 분기, 기본값 | 4 |
| Retry + backoff | 429 retry, 5xx retry, 401 즉시 포기, 성공 | 4 |

### 9.2 기존 테스트 영향

| 파일 | 영향 |
|------|------|
| `planner-agent.test.ts` | analysisMode 관련 assertion 추가, 기본 모델 변경 반영 |
| `mock-d1.ts` | agent_plans 스키마에 신규 컬럼 추가 |

## §10 D1 Migration

```sql
-- 0015_planner_analysis_metadata.sql
ALTER TABLE agent_plans ADD COLUMN analysis_mode TEXT DEFAULT 'mock';
ALTER TABLE agent_plans ADD COLUMN analysis_model TEXT;
ALTER TABLE agent_plans ADD COLUMN analysis_tokens_used INTEGER;
ALTER TABLE agent_plans ADD COLUMN analysis_duration_ms INTEGER;
ALTER TABLE agent_plans ADD COLUMN file_context_count INTEGER DEFAULT 0;
```

## §11 변경 파일 예상

### 신규 파일 (~3개)

| 파일 | 용도 |
|------|------|
| `packages/api/src/services/file-context-collector.ts` | Import graph 수집 + 파일 내용 가져오기 |
| `packages/api/src/services/planner-prompts.ts` | Task-type별 프롬프트 팩토리 |
| `packages/api/src/__tests__/file-context-collector.test.ts` | FileContextCollector 테스트 |

### 수정 파일 (~6개)

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/services/planner-agent.ts` | analyzeCodebase 리팩토링, callLlmWithRetry, analysisMode 메타 |
| `packages/api/src/services/github.ts` | getFileContent, getMultipleFiles 메서드 추가 |
| `packages/api/src/schemas/plan.ts` | model, fileContents 필드 추가 |
| `packages/api/src/routes/agent.ts` | model 옵션 전달 |
| `packages/shared/src/agent.ts` | AgentPlan 타입에 메타데이터 필드 추가 |
| `packages/api/src/__tests__/planner-agent.test.ts` | 신규 기능 테스트 추가 |
| `packages/api/src/__tests__/helpers/mock-d1.ts` | agent_plans 스키마 확장 |
| `packages/api/src/db/migrations/0015_planner_analysis_metadata.sql` | 신규 마이그레이션 |

## §12 위험 요소

| 위험 | 영향 | 완화 |
|------|------|------|
| GitHub API Rate Limit | 파일 내용 수집 시 API 호출 증가 (depth=1이면 파일당 1+N) | Trees API 일괄 조회 + 클라이언트 제공 경로 |
| Sonnet 비용 증가 | Haiku 대비 ~3배 비용 | 모델 설정 가능 — 운영자가 Haiku로 변경 가능 |
| 프롬프트 크기 초과 | 대규모 리팩토링 (100+ 파일) 시 context window 초과 | 토큰 예산 50K 상한 + truncation |
| Import graph 순환 참조 | 무한 루프 | visited Set + maxDepth 제한 (기본 1) |
| 기존 테스트 깨짐 | 기본 모델 변경으로 mock assertion 불일치 | 테스트에서 model 명시 또는 mock 갱신 |

## §13 범위 밖 (Not in Scope)

- 실제 코드 실행 (AST 파싱) — 정규식 기반 import 추출로 충분
- 멀티 리포 지원 — 단일 리포 내 import graph만
- LLM 응답 캐싱 — 동일 targetFiles에 대한 재분석 캐시 (향후 Sprint)
- 프롬프트 A/B 테스트 프레임워크 — 현재는 수동 비교
- Web UI — PlannerAgent 분석 결과 시각화 (별도 Sprint)
- Streaming 응답 — 계획 생성 중 실시간 스트리밍

## §14 성공 기준

| 기준 | 목표 |
|------|------|
| API 테스트 통과 | +20건 (전체 455+) |
| Match Rate | ≥ 90% |
| typecheck | ✅ 5/5 패키지 |
| LLM 분석 정확도 | targetFiles 실제 내용이 프롬프트에 포함 확인 |
| 모드 투명성 | API 응답에 analysisMode 필드 포함 확인 |
| Import graph | depth=1 파일 수집 + 순환 참조 방지 확인 |
| 모델 설정 | POST /plan body에 model 옵션 반영 확인 |

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-19 | Initial draft | Sinclair Seo |
