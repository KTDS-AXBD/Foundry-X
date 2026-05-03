/**
 * F135: Shared prompt utilities — extracted from ClaudeApiRunner
 * for reuse across multiple runner backends (Claude API, OpenRouter, etc.)
 */
import type { AgentExecutionRequest, AgentTaskType } from "./execution-types.js";

// F60: Generative UI — instruct LLM to include rendering hints
export const UIHINT_INSTRUCTION = `\n\nAdditionally, include a "uiHint" field in your JSON response to suggest rendering.
Format: { "layout": "card"|"tabs"|"accordion"|"iframe", "sections": [{ "type": "text"|"code"|"diff"|"chart"|"table", "title": string, "data": any }] }
If the result contains HTML visualizations, include an "html" field with self-contained HTML.`;

export const TASK_SYSTEM_PROMPTS: Record<AgentTaskType, string> = {
  "code-review": `You are a code review agent for the Foundry-X project.
Analyze the provided code files against the spec requirements.
Return a JSON object with "reviewComments" array.
Each comment: { "file": string, "line": number, "comment": string, "severity": "error"|"warning"|"info" }` + UIHINT_INSTRUCTION,

  "code-generation": `You are a code generation agent for the Foundry-X project.
Generate TypeScript code based on the spec requirements.
Return a JSON object with "generatedCode" array.
Each item: { "path": string, "content": string, "action": "create"|"modify" }` + UIHINT_INSTRUCTION,

  "spec-analysis": `You are a spec analysis agent for the Foundry-X project.
Analyze the provided spec for completeness, consistency, and feasibility.
Return a JSON object with "analysis" field containing your assessment.` + UIHINT_INSTRUCTION,

  "test-generation": `You are a test generation agent for the Foundry-X project.
Generate vitest test cases for the provided code and spec.
Return a JSON object with "generatedCode" array containing test files.` + UIHINT_INSTRUCTION,

  "policy-evaluation": `You are a policy evaluation agent for the Foundry-X project.
Evaluate the provided code or configuration against organizational policies and governance rules.
Return a JSON object with "evaluation" field containing compliance assessment.` + UIHINT_INSTRUCTION,

  "skill-query": `You are a skill query agent for the Foundry-X project.
Search and retrieve relevant skills, capabilities, or knowledge from the AI Foundry asset registry.
Return a JSON object with "results" array of matching skills.` + UIHINT_INSTRUCTION,

  "ontology-lookup": `You are an ontology lookup agent for the Foundry-X project.
Look up domain concepts, relationships, and definitions from the project ontology.
Return a JSON object with "concepts" array of matching ontology entries.` + UIHINT_INSTRUCTION,

  "security-review": `You are a security review agent for the Foundry-X project.
Analyze code for OWASP Top 10 vulnerabilities and security anti-patterns.
Return a JSON object with vulnerability findings and remediation suggestions.` + UIHINT_INSTRUCTION,

  "qa-testing": `You are a QA testing agent for the Foundry-X project.
Generate browser test scenarios and validate acceptance criteria.
Return a JSON object with test scenarios and coverage analysis.` + UIHINT_INSTRUCTION,

  "infra-analysis": `You are an infrastructure analysis agent for the Foundry-X project.
Analyze Cloudflare Workers, D1, KV, and Pages configurations for health and optimization.
Return a JSON object with health score, resource status, and optimization suggestions.` + UIHINT_INSTRUCTION,

  "bmc-generation": `You are a BMC generation agent for the Foundry-X project.
Generate Business Model Canvas content for all 9 blocks based on a business idea.
Return a JSON object with block keys and string values.` + UIHINT_INSTRUCTION,

  "bmc-insight": `You are a BMC insight agent for the Foundry-X project.
Given a BMC block type and content, suggest 3 improvements.
Return a JSON array with title, description, and suggestedContent.` + UIHINT_INSTRUCTION,

  "market-summary": `You are a market analysis agent for the Foundry-X project.
Given keywords, provide market summary, trends, opportunities, and risks.
Return a JSON object with summary, trends, opportunities, and risks arrays.` + UIHINT_INSTRUCTION,

  "discovery-analysis": `당신은 AX BD팀의 사업 발굴 분석 에이전트입니다.
모든 응답은 반드시 다음 JSON 스키마로 출력하세요:
{
  "summary": "1~2문장 핵심 요약 (한국어)",
  "details": "마크다운 형식 상세 분석 (한국어)",
  "confidence": 0~100 사이 정수
}
다른 필드를 추가하지 마세요. 반드시 위 3개 필드만 포함된 유효한 JSON을 반환하세요.`,
};

/** F60: Default layout per task type — client fallback when uiHint is absent */
export const DEFAULT_LAYOUT_MAP: Record<AgentTaskType, string> = {
  "code-review": "tabs",
  "code-generation": "accordion",
  "spec-analysis": "card",
  "test-generation": "accordion",
  "policy-evaluation": "card",
  "skill-query": "tabs",
  "ontology-lookup": "card",
  "security-review": "tabs",
  "qa-testing": "accordion",
  "infra-analysis": "card",
  "bmc-generation": "card",
  "bmc-insight": "card",
  "market-summary": "card",
  "discovery-analysis": "card",
};

/** F146: Get system prompt — custom override or task-type default */
export function getSystemPrompt(request: AgentExecutionRequest): string {
  if (request.context.systemPromptOverride) {
    return request.context.systemPromptOverride + UIHINT_INSTRUCTION;
  }
  return TASK_SYSTEM_PROMPTS[request.taskType]
    ?? `You are an AI agent for the Foundry-X project. Task: ${request.taskType}.` + UIHINT_INSTRUCTION;
}

/** Build a user prompt from an AgentExecutionRequest */
export function buildUserPrompt(request: AgentExecutionRequest): string {
  const parts: string[] = [];

  if (request.context.spec) {
    parts.push(
      `## Spec\nTitle: ${request.context.spec.title}\nDescription: ${request.context.spec.description}`,
    );
    if (request.context.spec.acceptanceCriteria.length > 0) {
      parts.push(
        `\nAcceptance Criteria:\n${request.context.spec.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}`,
      );
    }
  }

  if (request.context.instructions) {
    parts.push(`\n## Instructions\n${request.context.instructions}`);
  }

  if (request.context.targetFiles?.length) {
    parts.push(
      `\n## Target Files\n${request.context.targetFiles.join("\n")}`,
    );
  }

  parts.push(`\n## Context\nRepo: ${request.context.repoUrl}`);
  parts.push(`Branch: ${request.context.branch}`);

  return parts.join("\n");
}
