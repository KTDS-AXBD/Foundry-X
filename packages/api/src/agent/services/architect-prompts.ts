/**
 * F138: ArchitectAgent prompts — architecture analysis, design review, dependency analysis
 */
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
