/**
 * F141: QAAgent prompts — browser test generation, acceptance criteria validation, regression detection
 */
import type { AgentExecutionRequest } from "./execution-types.js";

export const QA_BROWSER_TEST_PROMPT = `You are a QA engineer generating browser test scenarios for the Foundry-X platform.
Analyze the provided code/spec and generate Playwright test scenarios.

For each scenario:
1. Define clear test steps with selectors and expected outcomes
2. Generate executable Playwright code
3. Prioritize by user impact

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "scenarios": [
    {
      "name": "test scenario name",
      "description": "what this test verifies",
      "steps": [
        {
          "action": "navigate|click|fill|assert|wait",
          "selector": "CSS or text selector if applicable",
          "expected": "expected outcome"
        }
      ],
      "playwrightCode": "import { test, expect } from '@playwright/test';\\ntest('name', async ({ page }) => { ... });",
      "priority": "critical|high|medium|low"
    }
  ],
  "coverageEstimate": 0-100
}

RULES:
- coverageEstimate: estimated percentage of user-facing functionality covered
- Generate valid Playwright code that could be saved and executed
- Include both happy path and error scenarios
- Prioritize critical user flows (auth, data operations, navigation)
- Output ONLY valid JSON, no explanation`;

export const QA_ACCEPTANCE_PROMPT = `You are a QA analyst validating acceptance criteria for the Foundry-X platform.
Compare the provided acceptance criteria against the implementation code.

For each criterion, determine if it is met, partially met, or unmet.

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "overallStatus": "pass|partial|fail",
  "criteria": [
    {
      "criterion": "the acceptance criterion text",
      "status": "met|partial|unmet",
      "evidence": "code evidence supporting the status",
      "gaps": ["what is missing if not fully met"]
    }
  ],
  "completenessScore": 0-100
}

RULES:
- overallStatus: "pass" if all met, "partial" if some met, "fail" if majority unmet
- completenessScore: percentage of criteria fully met
- Reference specific code locations as evidence
- gaps should be actionable — what needs to be implemented
- Output ONLY valid JSON, no explanation`;

export const QA_REGRESSION_PROMPT = `You are a QA engineer analyzing code changes for regression risks.
Given the changed files and existing test files, identify tests that may be affected.

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "riskScore": 0-100,
  "affectedTests": [
    {
      "testFile": "path to test file",
      "riskLevel": "high|medium|low",
      "reason": "why this test may be affected"
    }
  ],
  "suggestedTests": ["description of additional tests that should be written"]
}

RULES:
- riskScore: 0 = no regression risk, 100 = high risk of breaking existing tests
- Only include tests genuinely affected by the changes
- suggestedTests should describe tests not yet covered
- Output ONLY valid JSON, no explanation`;

/**
 * Build user prompt for browser test generation
 */
export function buildBrowserTestPrompt(request: AgentExecutionRequest): string {
  const parts: string[] = [];

  if (request.context.spec) {
    parts.push(
      `## Spec Context\nTitle: ${request.context.spec.title}\nDescription: ${request.context.spec.description}`,
    );
    if (request.context.spec.acceptanceCriteria?.length) {
      parts.push(`\n## Acceptance Criteria\n${request.context.spec.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}`);
    }
  }

  if (request.context.fileContents && Object.keys(request.context.fileContents).length > 0) {
    parts.push("\n## Source Files");
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
 * Build user prompt for acceptance criteria validation
 */
export function buildAcceptancePrompt(
  spec: { title: string; description: string; acceptanceCriteria: string[] },
  files: Record<string, string>,
): string {
  const parts: string[] = [];

  parts.push(`## Spec\nTitle: ${spec.title}\nDescription: ${spec.description}`);
  parts.push(`\n## Acceptance Criteria\n${spec.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}`);

  parts.push("\n## Implementation Files");
  for (const [path, content] of Object.entries(files)) {
    parts.push(`\n### ${path}\n\`\`\`typescript\n${content}\n\`\`\``);
  }

  return parts.join("\n");
}

/**
 * Build user prompt for regression analysis
 */
export function buildRegressionPrompt(
  changes: Record<string, string>,
  existingTests: Record<string, string>,
): string {
  const parts: string[] = [];

  parts.push("## Changed Files");
  for (const [path, content] of Object.entries(changes)) {
    parts.push(`\n### ${path}\n\`\`\`typescript\n${content}\n\`\`\``);
  }

  if (Object.keys(existingTests).length > 0) {
    parts.push("\n## Existing Test Files");
    for (const [path, content] of Object.entries(existingTests)) {
      parts.push(`\n### ${path}\n\`\`\`typescript\n${content}\n\`\`\``);
    }
  }

  return parts.join("\n");
}
