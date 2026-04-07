// F139: TestAgent prompts — vitest 테스트 생성 + 커버리지 분석 + 엣지 케이스 추천

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
- Import style: import { ... } from "../../../services/{module}.js"
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
