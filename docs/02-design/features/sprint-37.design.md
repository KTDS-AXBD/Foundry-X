---
code: FX-DSGN-037
title: "Sprint 37 — ArchitectAgent + TestAgent 상세 설계 (F138+F139)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-37
sprint: 37
phase: "Phase 5a"
references:
  - "[[FX-PLAN-037]]"
  - "[[FX-DSGN-034]]"
---

## 1. 설계 개요

### 1.1 목적

기존 Agent Evolution 인프라(F135 OpenRouterRunner + F136 ModelRouter + F137 EvaluatorOptimizer) 위에 **역할 전문 에이전트** 2종을 추가한다:
- **ArchitectAgent** — 아키텍처 분석, 설계 문서 검토, 모듈 의존성 분석
- **TestAgent** — 테스트 자동 생성, 커버리지 갭 분석, 엣지 케이스 추천

### 1.2 설계 원칙

| 원칙 | 적용 |
|------|------|
| **ReviewerAgent 패턴 준수** | LLM 시스템 프롬프트 + JSON 파싱 패턴 일관성 유지 |
| **프롬프트 분리** | 서비스 로직과 프롬프트를 별도 파일로 분리 (`*-prompts.ts`) — PlannerAgent 패턴 |
| **ModelRouter 활용** | `createRoutedRunner(env, taskType)` 팩토리로 최적 모델 자동 배정 |
| **parseLlmJson 재사용** | LLM 응답 JSON 파싱 로직 중복 방지 |
| **D1 비저장** | 분석 결과는 API 응답으로만 반환 — DB 저장은 후속 Sprint에서 필요 시 추가 |
| **Orchestrator 위임** | AgentOrchestrator에서 taskType 기반 에이전트 자동 위임 |

---

## 2. 아키텍처

### 2.1 역할 에이전트 계층도

```
                 ┌──────────────────────────────────┐
                 │       AgentOrchestrator           │
                 │  ──────────────────────────────── │
                 │  executeTask(request)              │
                 │    ├─ "spec-analysis"    → ArchitectAgent  ★ 신규
                 │    ├─ "test-generation"  → TestAgent       ★ 신규
                 │    ├─ "code-review"      → ReviewerAgent   (기존)
                 │    └─ 기타              → 범용 Runner      (기존)
                 └───────────┬──────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
   ┌──────────▼───┐  ┌──────▼──────┐  ┌───▼────────┐
   │ Architect    │  │ Test        │  │ Reviewer   │
   │ Agent        │  │ Agent       │  │ Agent      │
   │ ──────────── │  │ ──────────  │  │ ────────── │
   │ analyze()    │  │ generate()  │  │ review()   │
   │ reviewDoc()  │  │ coverage()  │  │            │
   │ deps()       │  │ edgeCases() │  │            │
   └──────┬───────┘  └──────┬──────┘  └────────────┘
          │                 │
          │     ┌───────────┘
          ▼     ▼
   ┌──────────────────┐     ┌──────────────────┐
   │ createRoutedRunner│     │ prompt-utils.ts  │
   │ (F136 ModelRouter)│     │ parseLlmJson()   │
   │ ─────────────────│     │ buildUserPrompt() │
   │ spec-analysis    │     └──────────────────┘
   │  → Opus          │
   │ test-generation  │
   │  → Sonnet        │
   └──────────────────┘
```

### 2.2 파일 구조

```
packages/api/src/
├── services/
│   ├── architect-agent.ts        ★ 신규 (F138)
│   ├── architect-prompts.ts      ★ 신규 (F138)
│   ├── test-agent.ts             ★ 신규 (F139)
│   ├── test-agent-prompts.ts     ★ 신규 (F139)
│   ├── agent-orchestrator.ts     수정 (위임 로직)
│   ├── agent-runner.ts           (변경 없음)
│   ├── model-router.ts           (변경 없음)
│   ├── evaluator-optimizer.ts    (변경 없음)
│   ├── evaluation-criteria.ts    (변경 없음)
│   ├── reviewer-agent.ts         (변경 없음, 참조 패턴)
│   ├── planner-agent.ts          (변경 없음, 참조 패턴)
│   └── prompt-utils.ts           (변경 없음, parseLlmJson 재사용)
├── routes/
│   └── agent.ts                  수정 (4 엔드포인트 추가)
├── schemas/
│   └── agent.ts                  수정 (스키마 추가)
└── __tests__/
    ├── architect-agent.test.ts   ★ 신규
    └── test-agent.test.ts        ★ 신규
```

### 2.3 요청-응답 흐름 (ArchitectAgent)

```
POST /agents/architect/analyze
  │
  ▼
AuthGuard → Zod Validation
  │
  ▼
ArchitectAgent.analyzeArchitecture(request)
  │
  ├─ 1. request.context.fileContents 또는 targetFiles에서 분석 대상 확인
  │
  ├─ 2. createRoutedRunner(env, "spec-analysis", db)
  │     → ModelRouter → Opus (D1 규칙) 또는 DEFAULT_MODEL_MAP 폴백
  │
  ├─ 3. ARCHITECT_SYSTEM_PROMPT 조립
  │     (architect-prompts.ts에서 import)
  │
  ├─ 4. buildArchitectPrompt(request) → userPrompt
  │     ├─ 파일 내용 / diff 포함
  │     ├─ 프로젝트 구조 맥락
  │     └─ 분석 요청 사항
  │
  ├─ 5. runner.execute({
  │       ...request,
  │       taskType: "spec-analysis",
  │       context: { ...request.context, instructions: userPrompt }
  │     })
  │
  ├─ 6. parseLlmJson(result.output.analysis)
  │     → ArchitectureAnalysisResult
  │
  └─ 7. 반환: { ...analysisResult, tokensUsed, model, duration }
```

### 2.4 요청-응답 흐름 (TestAgent)

```
POST /agents/test/generate
  │
  ▼
AuthGuard → Zod Validation
  │
  ▼
TestAgent.generateTests(request)
  │
  ├─ 1. request.context.fileContents에서 소스 코드 확인
  │
  ├─ 2. createRoutedRunner(env, "test-generation", db)
  │     → ModelRouter → Sonnet (D1 규칙) 또는 DEFAULT_MODEL_MAP 폴백
  │
  ├─ 3. TEST_GENERATION_SYSTEM_PROMPT 조립
  │     (test-agent-prompts.ts에서 import)
  │
  ├─ 4. buildTestPrompt(request) → userPrompt
  │     ├─ 소스 코드 포함
  │     ├─ 기존 테스트 패턴 (few-shot 예시)
  │     └─ vitest 컨벤션 주입
  │
  ├─ 5. runner.execute({
  │       ...request,
  │       taskType: "test-generation",
  │       context: { ...request.context, instructions: userPrompt }
  │     })
  │
  ├─ 6. parseLlmJson(result.output.analysis)
  │     → TestGenerationResult
  │
  └─ 7. 반환: { ...generationResult, tokensUsed, model, duration }
```

---

## 3. 상세 설계

### 3.1 F138 — `architect-prompts.ts`

```typescript
// packages/api/src/services/architect-prompts.ts

import type { AgentExecutionRequest } from "./execution-types.js";

export const ARCHITECT_ANALYZE_PROMPT = `You are an architecture reviewer for the Foundry-X platform.
Analyze the given code changes or file contents and evaluate architecture quality.

Evaluate against these criteria:
1. Module cohesion: Does each module have a single, well-defined responsibility?
2. Coupling: Are inter-module dependencies minimal and well-abstracted?
3. Design patterns: Are patterns applied correctly? Any anti-patterns?
4. Scalability impact: Will the changes affect system growth?
5. SDD compliance: Does it align with Spec-Driven Development triangle?

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "impactSummary": "Brief architecture impact summary (1-3 sentences)",
  "designScore": 0-100,
  "dependencyAnalysis": {
    "affectedModules": ["module names found in import paths"],
    "circularDependencies": [["a.ts", "b.ts", "a.ts"]],
    "couplingScore": 0-100
  },
  "riskAssessment": [
    { "risk": "description", "severity": "critical|high|medium|low", "mitigation": "suggestion" }
  ],
  "recommendations": [
    { "category": "structure|pattern|dependency|performance", "suggestion": "description", "priority": "high|medium|low" }
  ]
}

RULES:
- designScore: 100 = perfect architecture, 0 = severe issues
- couplingScore: lower is better (0 = no coupling, 100 = tightly coupled)
- Only report circular dependencies if actually detected in imports
- Output ONLY valid JSON, no explanation`;

export const ARCHITECT_REVIEW_DESIGN_PROMPT = `You are a design document reviewer for the Foundry-X platform.
Review the given design document for completeness, consistency, and feasibility.

Evaluate:
1. Completeness: Are all required sections present? (overview, architecture, API, data model, tests)
2. Consistency: Do components reference each other correctly? Are naming conventions uniform?
3. Feasibility: Is the design implementable within the described constraints?
4. SDD alignment: Does the design enable Spec↔Code↔Test synchronization?

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "completenessScore": 0-100,
  "consistencyScore": 0-100,
  "feasibilityScore": 0-100,
  "overallScore": 0-100,
  "missingElements": ["list of missing required sections or details"],
  "inconsistencies": ["list of contradictions or naming mismatches"],
  "suggestions": ["improvement recommendations"]
}

RULES:
- overallScore = weighted average (completeness 40%, consistency 30%, feasibility 30%)
- Output ONLY valid JSON, no explanation`;

export const ARCHITECT_DEPENDENCIES_PROMPT = `You are a dependency analyzer for the Foundry-X platform.
Analyze the import/export relationships in the provided source files.

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "modules": [
    { "path": "file path", "imports": ["imported module paths"], "exports": ["exported names"] }
  ],
  "circularDependencies": [["a.ts", "b.ts", "a.ts"]],
  "couplingMetrics": {
    "afferentCoupling": { "module": count },
    "efferentCoupling": { "module": count }
  },
  "suggestions": ["decoupling recommendations"]
}

RULES:
- Only include actual import statements found in code
- Circular dependencies must form a cycle (A→B→A or A→B→C→A)
- Output ONLY valid JSON, no explanation`;

/**
 * Build user prompt for architecture analysis
 */
export function buildArchitectPrompt(request: AgentExecutionRequest): string {
  const parts: string[] = [];

  if (request.context.spec) {
    parts.push(
      `## Spec Context\nTitle: ${request.context.spec.title}\nDescription: ${request.context.spec.description}`,
    );
  }

  if (request.context.fileContents && Object.keys(request.context.fileContents).length > 0) {
    parts.push("\n## Files to Analyze");
    for (const [path, content] of Object.entries(request.context.fileContents)) {
      parts.push(`\n### ${path}\n\`\`\`typescript\n${content}\n\`\`\``);
    }
  }

  if (request.context.targetFiles?.length) {
    parts.push(`\n## Target Files\n${request.context.targetFiles.join("\n")}`);
  }

  if (request.context.instructions) {
    parts.push(`\n## Additional Instructions\n${request.context.instructions}`);
  }

  parts.push(`\n## Project\nRepo: ${request.context.repoUrl}\nBranch: ${request.context.branch}`);

  return parts.join("\n");
}

/**
 * Build user prompt for design document review
 */
export function buildDesignReviewPrompt(document: string, title?: string): string {
  const parts: string[] = [];
  if (title) {
    parts.push(`## Document: ${title}`);
  }
  parts.push(`\n## Design Document Content\n${document}`);
  return parts.join("\n");
}
```

### 3.2 F138 — `architect-agent.ts`

```typescript
// packages/api/src/services/architect-agent.ts

import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "./execution-types.js";
import type { AgentRunner } from "./agent-runner.js";
import { createRoutedRunner } from "./agent-runner.js";
import {
  ARCHITECT_ANALYZE_PROMPT,
  ARCHITECT_REVIEW_DESIGN_PROMPT,
  ARCHITECT_DEPENDENCIES_PROMPT,
  buildArchitectPrompt,
  buildDesignReviewPrompt,
} from "./architect-prompts.js";

// ── Result Types ──────────────────────────────────────────

export interface ArchitectureAnalysisResult {
  impactSummary: string;
  designScore: number;
  dependencyAnalysis: {
    affectedModules: string[];
    circularDependencies: string[][];
    couplingScore: number;
  };
  riskAssessment: Array<{
    risk: string;
    severity: "critical" | "high" | "medium" | "low";
    mitigation: string;
  }>;
  recommendations: Array<{
    category: "structure" | "pattern" | "dependency" | "performance";
    suggestion: string;
    priority: "high" | "medium" | "low";
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface DesignReviewResult {
  completenessScore: number;
  consistencyScore: number;
  feasibilityScore: number;
  overallScore: number;
  missingElements: string[];
  inconsistencies: string[];
  suggestions: string[];
  tokensUsed: number;
  model: string;
}

export interface DependencyAnalysisResult {
  modules: Array<{
    path: string;
    imports: string[];
    exports: string[];
  }>;
  circularDependencies: string[][];
  couplingMetrics: {
    afferentCoupling: Record<string, number>;
    efferentCoupling: Record<string, number>;
  };
  suggestions: string[];
  tokensUsed: number;
  model: string;
}

// ── ArchitectAgent ────────────────────────────────────────

export interface ArchitectAgentDeps {
  env: {
    OPENROUTER_API_KEY?: string;
    OPENROUTER_DEFAULT_MODEL?: string;
    ANTHROPIC_API_KEY?: string;
  };
  db?: D1Database;
}

export class ArchitectAgent {
  private readonly env: ArchitectAgentDeps["env"];
  private readonly db?: D1Database;

  constructor(deps: ArchitectAgentDeps) {
    this.env = deps.env;
    this.db = deps.db;
  }

  /**
   * PR diff 또는 소스 파일 기반 아키텍처 영향 분석
   */
  async analyzeArchitecture(
    request: AgentExecutionRequest,
  ): Promise<ArchitectureAnalysisResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "spec-analysis", this.db);

    const userPrompt = buildArchitectPrompt(request);

    const execRequest: AgentExecutionRequest = {
      ...request,
      taskType: "spec-analysis",
      context: {
        ...request.context,
        instructions: `${ARCHITECT_ANALYZE_PROMPT}\n\n${userPrompt}`,
      },
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parseAnalysisResult(result, duration);
  }

  /**
   * 설계 문서 품질 평가 + 개선 제안
   */
  async reviewDesignDoc(
    document: string,
    title?: string,
  ): Promise<DesignReviewResult> {
    const runner = await createRoutedRunner(this.env, "spec-analysis", this.db);

    const userPrompt = buildDesignReviewPrompt(document, title);

    const execRequest: AgentExecutionRequest = {
      taskId: `design-review-${Date.now()}`,
      agentId: "architect-agent",
      taskType: "spec-analysis",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${ARCHITECT_REVIEW_DESIGN_PROMPT}\n\n${userPrompt}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    return this.parseDesignReviewResult(result);
  }

  /**
   * 모듈 간 의존성 분석 + 순환 참조 감지
   */
  async analyzeDependencies(
    files: Record<string, string>,
  ): Promise<DependencyAnalysisResult> {
    const runner = await createRoutedRunner(this.env, "spec-analysis", this.db);

    const fileParts = Object.entries(files)
      .map(([path, content]) => `### ${path}\n\`\`\`typescript\n${content}\n\`\`\``)
      .join("\n\n");

    const execRequest: AgentExecutionRequest = {
      taskId: `dep-analysis-${Date.now()}`,
      agentId: "architect-agent",
      taskType: "spec-analysis",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${ARCHITECT_DEPENDENCIES_PROMPT}\n\n## Files\n${fileParts}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    return this.parseDependencyResult(result);
  }

  // ── Private helpers ─────────────────────────────────────

  private parseAnalysisResult(
    result: AgentExecutionResult,
    duration: number,
  ): ArchitectureAnalysisResult {
    const defaultResult: ArchitectureAnalysisResult = {
      impactSummary: result.output.analysis ?? "Analysis unavailable",
      designScore: 0,
      dependencyAnalysis: {
        affectedModules: [],
        circularDependencies: [],
        couplingScore: 0,
      },
      riskAssessment: [],
      recommendations: [],
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        impactSummary: parsed.impactSummary ?? defaultResult.impactSummary,
        designScore: Math.max(0, Math.min(100, parsed.designScore ?? 0)),
        dependencyAnalysis: {
          affectedModules: parsed.dependencyAnalysis?.affectedModules ?? [],
          circularDependencies: parsed.dependencyAnalysis?.circularDependencies ?? [],
          couplingScore: Math.max(0, Math.min(100, parsed.dependencyAnalysis?.couplingScore ?? 0)),
        },
        riskAssessment: Array.isArray(parsed.riskAssessment) ? parsed.riskAssessment : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseDesignReviewResult(
    result: AgentExecutionResult,
  ): DesignReviewResult {
    const defaultResult: DesignReviewResult = {
      completenessScore: 0,
      consistencyScore: 0,
      feasibilityScore: 0,
      overallScore: 0,
      missingElements: [],
      inconsistencies: [],
      suggestions: [result.output.analysis ?? "Review unavailable"],
      tokensUsed: result.tokensUsed,
      model: result.model,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        completenessScore: Math.max(0, Math.min(100, parsed.completenessScore ?? 0)),
        consistencyScore: Math.max(0, Math.min(100, parsed.consistencyScore ?? 0)),
        feasibilityScore: Math.max(0, Math.min(100, parsed.feasibilityScore ?? 0)),
        overallScore: Math.max(0, Math.min(100, parsed.overallScore ?? 0)),
        missingElements: Array.isArray(parsed.missingElements) ? parsed.missingElements : [],
        inconsistencies: Array.isArray(parsed.inconsistencies) ? parsed.inconsistencies : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseDependencyResult(
    result: AgentExecutionResult,
  ): DependencyAnalysisResult {
    const defaultResult: DependencyAnalysisResult = {
      modules: [],
      circularDependencies: [],
      couplingMetrics: { afferentCoupling: {}, efferentCoupling: {} },
      suggestions: [result.output.analysis ?? "Analysis unavailable"],
      tokensUsed: result.tokensUsed,
      model: result.model,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        modules: Array.isArray(parsed.modules) ? parsed.modules : [],
        circularDependencies: Array.isArray(parsed.circularDependencies) ? parsed.circularDependencies : [],
        couplingMetrics: parsed.couplingMetrics ?? defaultResult.couplingMetrics,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
      };
    } catch {
      return defaultResult;
    }
  }
}
```

### 3.3 F139 — `test-agent-prompts.ts`

```typescript
// packages/api/src/services/test-agent-prompts.ts

import type { AgentExecutionRequest } from "./execution-types.js";

export const TEST_GENERATION_SYSTEM_PROMPT = `You are a test engineer for the Foundry-X platform.
Generate vitest test code for the given source files.

PROJECT CONVENTIONS:
- Framework: vitest 3.x with TypeScript
- Pattern: describe() → it() blocks with clear naming
- Mock strategy: External services only (LLM, HTTP) — use actual implementations for internal modules
- D1 mock: In-memory approach (see existing test patterns)
- Assertion: expect().toBe / toEqual / toContain / toThrow — no chai
- File naming: {module}.test.ts in __tests__/ directory
- Import style: import { ... } from "../services/{module}.js"
- Avoid mocking internal modules unless they have side effects

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "testFiles": [
    {
      "path": "packages/api/src/__tests__/module.test.ts",
      "content": "import { describe, it, expect } from 'vitest'; ...",
      "testCount": 5,
      "framework": "vitest"
    }
  ],
  "totalTestCount": 5,
  "coverageEstimate": 85,
  "edgeCases": [
    { "function": "functionName", "case": "description", "category": "boundary|null|error|concurrency|type" }
  ]
}

RULES:
- Generate only vitest-compatible tests
- Each test should be independent and self-contained
- Use descriptive test names that explain the behavior being tested
- coverageEstimate: percentage of source functions covered
- Output ONLY valid JSON, no explanation`;

export const TEST_COVERAGE_PROMPT = `You are a test coverage analyzer for the Foundry-X platform.
Analyze the provided source files and identify functions/methods without adequate test coverage.

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "analyzedFiles": 5,
  "uncoveredFunctions": [
    {
      "file": "path/to/file.ts",
      "function": "functionName",
      "complexity": "simple|moderate|complex",
      "priority": "high|medium|low"
    }
  ],
  "missingEdgeCases": [
    {
      "file": "path/to/file.ts",
      "function": "functionName",
      "suggestedCases": ["null input handling", "empty array edge case"]
    }
  ],
  "overallCoverage": 75
}

RULES:
- complexity: simple (1-5 branches), moderate (6-15), complex (16+)
- priority: high (public API/critical path), medium (internal logic), low (utility)
- overallCoverage: estimated percentage (0-100)
- Output ONLY valid JSON, no explanation`;

export const TEST_EDGE_CASES_PROMPT = `You are a test edge case specialist for the Foundry-X platform.
Analyze the given function signature and suggest comprehensive edge cases.

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "functionName": "name",
  "edgeCases": [
    {
      "case": "description of test scenario",
      "category": "boundary|null|error|concurrency|type",
      "input": "example input value or description",
      "expectedBehavior": "what should happen"
    }
  ]
}

CATEGORIES:
- boundary: min/max values, empty collections, single elements
- null: null/undefined parameters, optional fields absent
- error: invalid input, network failures, timeout scenarios
- concurrency: race conditions, parallel access, state mutations
- type: type coercion, union type edge cases, generic constraints
- Output ONLY valid JSON, no explanation`;

/**
 * Build user prompt for test generation
 */
export function buildTestGenerationPrompt(request: AgentExecutionRequest): string {
  const parts: string[] = [];

  if (request.context.fileContents && Object.keys(request.context.fileContents).length > 0) {
    parts.push("## Source Files to Test");
    for (const [path, content] of Object.entries(request.context.fileContents)) {
      parts.push(`\n### ${path}\n\`\`\`typescript\n${content}\n\`\`\``);
    }
  }

  if (request.context.spec) {
    parts.push(
      `\n## Spec Requirements\nTitle: ${request.context.spec.title}\nDescription: ${request.context.spec.description}`,
    );
    if (request.context.spec.acceptanceCriteria.length > 0) {
      parts.push(
        `\nAcceptance Criteria:\n${request.context.spec.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}`,
      );
    }
  }

  if (request.context.instructions) {
    parts.push(`\n## Additional Instructions\n${request.context.instructions}`);
  }

  parts.push(`\n## Project\nRepo: ${request.context.repoUrl}\nBranch: ${request.context.branch}`);

  return parts.join("\n");
}

/**
 * Build user prompt for coverage gap analysis
 */
export function buildCoveragePrompt(
  sourceFiles: Record<string, string>,
  testFiles: Record<string, string>,
): string {
  const parts: string[] = [];

  parts.push("## Source Files");
  for (const [path, content] of Object.entries(sourceFiles)) {
    parts.push(`\n### ${path}\n\`\`\`typescript\n${content}\n\`\`\``);
  }

  if (Object.keys(testFiles).length > 0) {
    parts.push("\n## Existing Test Files");
    for (const [path, content] of Object.entries(testFiles)) {
      parts.push(`\n### ${path}\n\`\`\`typescript\n${content}\n\`\`\``);
    }
  }

  return parts.join("\n");
}
```

### 3.4 F139 — `test-agent.ts`

```typescript
// packages/api/src/services/test-agent.ts

import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "./execution-types.js";
import { createRoutedRunner } from "./agent-runner.js";
import {
  TEST_GENERATION_SYSTEM_PROMPT,
  TEST_COVERAGE_PROMPT,
  TEST_EDGE_CASES_PROMPT,
  buildTestGenerationPrompt,
  buildCoveragePrompt,
} from "./test-agent-prompts.js";

// ── Result Types ──────────────────────────────────────────

export interface TestGenerationResult {
  testFiles: Array<{
    path: string;
    content: string;
    testCount: number;
    framework: "vitest";
  }>;
  totalTestCount: number;
  coverageEstimate: number;
  edgeCases: Array<{
    function: string;
    case: string;
    category: "boundary" | "null" | "error" | "concurrency" | "type";
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface CoverageGapResult {
  analyzedFiles: number;
  uncoveredFunctions: Array<{
    file: string;
    function: string;
    complexity: "simple" | "moderate" | "complex";
    priority: "high" | "medium" | "low";
  }>;
  missingEdgeCases: Array<{
    file: string;
    function: string;
    suggestedCases: string[];
  }>;
  overallCoverage: number;
  tokensUsed: number;
  model: string;
}

export interface EdgeCaseSuggestion {
  functionName: string;
  edgeCases: Array<{
    case: string;
    category: "boundary" | "null" | "error" | "concurrency" | "type";
    input: string;
    expectedBehavior: string;
  }>;
  tokensUsed: number;
  model: string;
}

// ── TestAgent ─────────────────────────────────────────────

export interface TestAgentDeps {
  env: {
    OPENROUTER_API_KEY?: string;
    OPENROUTER_DEFAULT_MODEL?: string;
    ANTHROPIC_API_KEY?: string;
  };
  db?: D1Database;
}

export class TestAgent {
  private readonly env: TestAgentDeps["env"];
  private readonly db?: D1Database;

  constructor(deps: TestAgentDeps) {
    this.env = deps.env;
    this.db = deps.db;
  }

  /**
   * 변경 코드 기반 vitest 테스트 자동 생성
   */
  async generateTests(
    request: AgentExecutionRequest,
  ): Promise<TestGenerationResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "test-generation", this.db);

    const userPrompt = buildTestGenerationPrompt(request);

    const execRequest: AgentExecutionRequest = {
      ...request,
      taskType: "test-generation",
      context: {
        ...request.context,
        instructions: `${TEST_GENERATION_SYSTEM_PROMPT}\n\n${userPrompt}`,
      },
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parseTestResult(result, duration);
  }

  /**
   * 파일별 테스트 커버리지 갭 분석
   */
  async analyzeCoverage(
    sourceFiles: Record<string, string>,
    testFiles: Record<string, string> = {},
  ): Promise<CoverageGapResult> {
    const runner = await createRoutedRunner(this.env, "test-generation", this.db);

    const userPrompt = buildCoveragePrompt(sourceFiles, testFiles);

    const execRequest: AgentExecutionRequest = {
      taskId: `coverage-analysis-${Date.now()}`,
      agentId: "test-agent",
      taskType: "test-generation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${TEST_COVERAGE_PROMPT}\n\n${userPrompt}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    return this.parseCoverageResult(result);
  }

  /**
   * 함수 시그니처 기반 엣지 케이스 추천
   */
  async suggestEdgeCases(
    functionSignature: string,
    functionBody?: string,
  ): Promise<EdgeCaseSuggestion> {
    const runner = await createRoutedRunner(this.env, "test-generation", this.db);

    const userPrompt = functionBody
      ? `## Function\n\`\`\`typescript\n${functionSignature}\n${functionBody}\n\`\`\``
      : `## Function Signature\n\`\`\`typescript\n${functionSignature}\n\`\`\``;

    const execRequest: AgentExecutionRequest = {
      taskId: `edge-cases-${Date.now()}`,
      agentId: "test-agent",
      taskType: "test-generation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${TEST_EDGE_CASES_PROMPT}\n\n${userPrompt}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    return this.parseEdgeCaseResult(result);
  }

  // ── Private helpers ─────────────────────────────────────

  private parseTestResult(
    result: AgentExecutionResult,
    duration: number,
  ): TestGenerationResult {
    const defaultResult: TestGenerationResult = {
      testFiles: [],
      totalTestCount: 0,
      coverageEstimate: 0,
      edgeCases: [],
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        testFiles: Array.isArray(parsed.testFiles) ? parsed.testFiles : [],
        totalTestCount: parsed.totalTestCount ?? 0,
        coverageEstimate: Math.max(0, Math.min(100, parsed.coverageEstimate ?? 0)),
        edgeCases: Array.isArray(parsed.edgeCases) ? parsed.edgeCases : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseCoverageResult(
    result: AgentExecutionResult,
  ): CoverageGapResult {
    const defaultResult: CoverageGapResult = {
      analyzedFiles: 0,
      uncoveredFunctions: [],
      missingEdgeCases: [],
      overallCoverage: 0,
      tokensUsed: result.tokensUsed,
      model: result.model,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        analyzedFiles: parsed.analyzedFiles ?? 0,
        uncoveredFunctions: Array.isArray(parsed.uncoveredFunctions) ? parsed.uncoveredFunctions : [],
        missingEdgeCases: Array.isArray(parsed.missingEdgeCases) ? parsed.missingEdgeCases : [],
        overallCoverage: Math.max(0, Math.min(100, parsed.overallCoverage ?? 0)),
        tokensUsed: result.tokensUsed,
        model: result.model,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseEdgeCaseResult(
    result: AgentExecutionResult,
  ): EdgeCaseSuggestion {
    const defaultResult: EdgeCaseSuggestion = {
      functionName: "",
      edgeCases: [],
      tokensUsed: result.tokensUsed,
      model: result.model,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        functionName: parsed.functionName ?? "",
        edgeCases: Array.isArray(parsed.edgeCases) ? parsed.edgeCases : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
      };
    } catch {
      return defaultResult;
    }
  }
}
```

### 3.5 API 엔드포인트 — `agent.ts` routes 추가

```typescript
// packages/api/src/routes/agent.ts — 추가 부분

// F138: ArchitectAgent endpoints
app.post("/agents/architect/analyze", authGuard, async (c) => {
  const body = await c.req.json();
  const parsed = architectAnalyzeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const agent = new ArchitectAgent({ env: c.env, db: c.env.DB });
  const result = await agent.analyzeArchitecture(parsed.data);
  return c.json(result);
});

app.post("/agents/architect/review-design", authGuard, async (c) => {
  const body = await c.req.json();
  const parsed = designReviewSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const agent = new ArchitectAgent({ env: c.env, db: c.env.DB });
  const result = await agent.reviewDesignDoc(parsed.data.document, parsed.data.title);
  return c.json(result);
});

// F139: TestAgent endpoints
app.post("/agents/test/generate", authGuard, async (c) => {
  const body = await c.req.json();
  const parsed = testGenerateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const agent = new TestAgent({ env: c.env, db: c.env.DB });
  const result = await agent.generateTests(parsed.data);
  return c.json(result);
});

app.post("/agents/test/coverage-gaps", authGuard, async (c) => {
  const body = await c.req.json();
  const parsed = coverageGapsSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const agent = new TestAgent({ env: c.env, db: c.env.DB });
  const result = await agent.analyzeCoverage(
    parsed.data.sourceFiles,
    parsed.data.testFiles,
  );
  return c.json(result);
});
```

### 3.6 Zod 스키마 — `agent.ts` schemas 추가

```typescript
// packages/api/src/schemas/agent.ts — 추가 부분

// F138: ArchitectAgent schemas
export const architectAnalyzeSchema = z.object({
  taskId: z.string(),
  agentId: z.string().default("architect-agent"),
  taskType: z.literal("spec-analysis"),
  context: z.object({
    repoUrl: z.string(),
    branch: z.string(),
    targetFiles: z.array(z.string()).optional(),
    spec: z.object({
      title: z.string(),
      description: z.string(),
      acceptanceCriteria: z.array(z.string()),
    }).optional(),
    instructions: z.string().optional(),
    fileContents: z.record(z.string()).optional(),
  }),
  constraints: z.array(z.any()).default([]),
});

export const designReviewSchema = z.object({
  document: z.string().min(1),
  title: z.string().optional(),
});

// F139: TestAgent schemas
export const testGenerateSchema = z.object({
  taskId: z.string(),
  agentId: z.string().default("test-agent"),
  taskType: z.literal("test-generation"),
  context: z.object({
    repoUrl: z.string(),
    branch: z.string(),
    targetFiles: z.array(z.string()).optional(),
    spec: z.object({
      title: z.string(),
      description: z.string(),
      acceptanceCriteria: z.array(z.string()),
    }).optional(),
    instructions: z.string().optional(),
    fileContents: z.record(z.string()).optional(),
  }),
  constraints: z.array(z.any()).default([]),
});

export const coverageGapsSchema = z.object({
  sourceFiles: z.record(z.string()),
  testFiles: z.record(z.string()).default({}),
});
```

### 3.7 AgentOrchestrator 통합 (리더 Step)

```typescript
// packages/api/src/services/agent-orchestrator.ts — 수정 부분

import { ArchitectAgent } from "./architect-agent.js";
import { TestAgent } from "./test-agent.js";

// constructor에 추가
private architectAgent?: ArchitectAgent;
private testAgent?: TestAgent;

// initializeAgents() 또는 constructor에서
this.architectAgent = new ArchitectAgent({ env: this.env, db: this.db });
this.testAgent = new TestAgent({ env: this.env, db: this.db });

// executeTask() 수정 — 기존 범용 Runner 실행 전 역할 에이전트 위임 체크
async executeTask(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
  // 역할 에이전트 위임
  if (request.taskType === "spec-analysis" && this.architectAgent) {
    const analysisResult = await this.architectAgent.analyzeArchitecture(request);
    return {
      status: "success",
      output: {
        analysis: JSON.stringify(analysisResult),
      },
      tokensUsed: analysisResult.tokensUsed,
      model: analysisResult.model,
      duration: analysisResult.duration,
    };
  }

  if (request.taskType === "test-generation" && this.testAgent) {
    const testResult = await this.testAgent.generateTests(request);
    return {
      status: "success",
      output: {
        analysis: JSON.stringify(testResult),
        generatedCode: testResult.testFiles.map((f) => ({
          path: f.path,
          content: f.content,
          action: "create" as const,
        })),
      },
      tokensUsed: testResult.tokensUsed,
      model: testResult.model,
      duration: testResult.duration,
    };
  }

  // 기존 로직 (변경 없음)
  // ...
}
```

---

## 4. 테스트 설계

### 4.1 F138 테스트 (`architect-agent.test.ts`)

| # | 테스트 케이스 | 분류 |
|---|-------------|------|
| 1 | `analyzeArchitecture` — 유효한 JSON 응답 시 ArchitectureAnalysisResult 반환 | Happy path |
| 2 | `analyzeArchitecture` — designScore 0-100 범위 클램핑 | Validation |
| 3 | `analyzeArchitecture` — 순환 의존성 배열 파싱 | Detection |
| 4 | `analyzeArchitecture` — riskAssessment 배열 파싱 | Parsing |
| 5 | `analyzeArchitecture` — LLM 실패 시 기본 결과 반환 (status: failed) | Error handling |
| 6 | `analyzeArchitecture` — 비JSON 응답 시 기본 결과 반환 | Fallback |
| 7 | `analyzeArchitecture` — 빈 fileContents 시 프롬프트 빌드 정상 | Edge case |
| 8 | `reviewDesignDoc` — 점수 3종 + overallScore 반환 | Happy path |
| 9 | `reviewDesignDoc` — missingElements/inconsistencies 배열 파싱 | Parsing |
| 10 | `reviewDesignDoc` — 빈 문서 시 createRoutedRunner 호출 확인 | Edge case |
| 11 | `analyzeDependencies` — modules + circularDependencies 파싱 | Happy path |
| 12 | `analyzeDependencies` — couplingMetrics 파싱 | Parsing |
| 13 | `POST /agents/architect/analyze` — 200 + 분석 결과 | API route |
| 14 | `POST /agents/architect/analyze` — 잘못된 요청 400 | API validation |
| 15 | `POST /agents/architect/review-design` — 200 + 리뷰 결과 | API route |
| 16 | `buildArchitectPrompt` — fileContents 포함 시 코드 블록 생성 | Prompt builder |

### 4.2 F139 테스트 (`test-agent.test.ts`)

| # | 테스트 케이스 | 분류 |
|---|-------------|------|
| 1 | `generateTests` — 유효한 JSON 응답 시 TestGenerationResult 반환 | Happy path |
| 2 | `generateTests` — testFiles 배열 파싱 (path, content, testCount) | Parsing |
| 3 | `generateTests` — coverageEstimate 0-100 범위 클램핑 | Validation |
| 4 | `generateTests` — edgeCases 배열 파싱 | Parsing |
| 5 | `generateTests` — LLM 실패 시 기본 결과 반환 | Error handling |
| 6 | `generateTests` — 비JSON 응답 시 기본 결과 반환 | Fallback |
| 7 | `analyzeCoverage` — uncoveredFunctions 감지 | Happy path |
| 8 | `analyzeCoverage` — missingEdgeCases 배열 파싱 | Parsing |
| 9 | `analyzeCoverage` — 빈 sourceFiles 시 기본 결과 | Edge case |
| 10 | `suggestEdgeCases` — category별 엣지 케이스 반환 | Happy path |
| 11 | `suggestEdgeCases` — functionBody 포함/미포함 프롬프트 분기 | Prompt builder |
| 12 | `POST /agents/test/generate` — 200 + 테스트 코드 | API route |
| 13 | `POST /agents/test/generate` — 잘못된 요청 400 | API validation |
| 14 | `POST /agents/test/coverage-gaps` — 200 + 갭 분석 | API route |
| 15 | `buildTestGenerationPrompt` — fileContents + spec 포함 프롬프트 | Prompt builder |
| 16 | `buildCoveragePrompt` — source + test 파일 포함 프롬프트 | Prompt builder |

### 4.3 기존 테스트 영향 분석

| 테스트 파일 | 영향 | 대응 |
|-------------|------|------|
| `agent-orchestrator*.test.ts` | executeTask 내부 위임 로직 추가 | Mock ArchitectAgent/TestAgent inject |
| `agent-routes*.test.ts` | 새 엔드포인트 추가 | 기존 라우트 테스트 영향 없음 (추가만) |
| `model-router.test.ts` | 변경 없음 | 영향 없음 |
| `evaluator-optimizer.test.ts` | 변경 없음 | 영향 없음 |

---

## 5. Worker 허용 파일 목록

### Worker 1 (F138)

```
packages/api/src/services/architect-agent.ts        (신규)
packages/api/src/services/architect-prompts.ts       (신규)
packages/api/src/routes/agent.ts                     (수정 — 엔드포인트 추가)
packages/api/src/schemas/agent.ts                    (수정 — 스키마 추가)
packages/api/src/__tests__/architect-agent.test.ts   (신규)
```

### Worker 2 (F139)

```
packages/api/src/services/test-agent.ts              (신규)
packages/api/src/services/test-agent-prompts.ts      (신규)
packages/api/src/routes/agent.ts                     (수정 — 엔드포인트 추가)
packages/api/src/schemas/agent.ts                    (수정 — 스키마 추가)
packages/api/src/__tests__/test-agent.test.ts        (신규)
```

### 리더 전용

```
packages/api/src/services/agent-orchestrator.ts      (수정 — 위임 로직)
packages/api/src/routes/agent.ts                     (merge — W1+W2 충돌 해소)
packages/api/src/schemas/agent.ts                    (merge — W1+W2 충돌 해소)
```

---

## 6. 비목표 재확인

| 항목 | 이유 | 대상 Sprint |
|------|------|-------------|
| D1 분석 결과 저장 | 먼저 API 응답으로만 반환, DB 저장은 필요 시 | 후속 |
| SSE 이벤트 (architect.*, test.*) | 비동기 분석 필요 시 추가 | 후속 |
| Web UI (분석 결과 시각화) | API 먼저, UI는 후속 | 후속 |
| SecurityAgent / QAAgent | F140/F141, 별도 Sprint | Sprint 38+ |
| PlannerAgent→ArchitectAgent 파이프라인 | 워크플로우 통합은 후속 | 후속 |
| 실제 LLM 프로덕션 운용 | 이번 Sprint은 구조 + Mock 테스트 | 후속 배포 시 |
| AgentTaskType 추가 | 기존 "spec-analysis"/"test-generation" 재활용 | 불필요 |
