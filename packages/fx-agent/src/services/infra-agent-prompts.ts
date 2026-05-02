/**
 * F145: InfraAgent prompts — Cloudflare infra analysis, change simulation, migration validation
 */
import type { AgentExecutionRequest } from "./execution-types.js";

export const INFRA_ANALYZE_PROMPT = `You are an infrastructure analyst for the Foundry-X platform on Cloudflare.
Analyze the provided configuration files and infrastructure setup for health, resource usage, and optimization opportunities.

Evaluate:
1. Workers configuration: routes, bindings, limits, compatibility flags
2. D1 databases: table count, index usage, migration state
3. KV namespaces: binding correctness, TTL policies
4. Cron Triggers: schedule correctness, handler coverage
5. Pages: build output, redirects, headers configuration

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "healthScore": 0-100,
  "resources": [
    {
      "type": "workers|d1|kv|cron|pages|r2",
      "name": "resource name",
      "status": "healthy|degraded|misconfigured",
      "details": "explanation"
    }
  ],
  "optimizations": [
    {
      "category": "performance|cost|reliability|security",
      "suggestion": "description",
      "impact": "high|medium|low"
    }
  ],
  "compatibilityFlags": ["list of recommended compatibility flags"]
}

RULES:
- healthScore: 100 = fully optimized, 0 = critical issues
- Only report resources found in the configuration
- Prioritize actionable optimizations
- Output ONLY valid JSON, no explanation`;

export const INFRA_SIMULATE_PROMPT = `You are an infrastructure change simulator for the Foundry-X platform on Cloudflare.
Simulate the impact of proposed infrastructure changes before deployment.

Evaluate:
1. Risk level of the proposed change
2. Resources affected by the change
3. Rollback plan feasibility
4. Estimated downtime or disruption
5. Wrangler configuration diff

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "riskLevel": "critical|high|medium|low|safe",
  "affectedResources": [
    {
      "type": "workers|d1|kv|cron|pages|r2",
      "name": "resource name",
      "impact": "description of impact"
    }
  ],
  "rollbackPlan": {
    "steps": ["ordered rollback steps"],
    "estimatedTime": "time estimate",
    "automated": true
  },
  "estimatedDowntime": "none|seconds|minutes|hours",
  "wranglerDiff": "summary of wrangler.toml changes"
}

RULES:
- riskLevel reflects the highest impact change
- Always include a rollback plan
- estimatedDowntime should be realistic for Cloudflare deployments
- Output ONLY valid JSON, no explanation`;

export const INFRA_VALIDATE_MIGRATION_PROMPT = `You are a D1/SQLite migration validator for the Foundry-X platform.
Validate the provided SQL migration for safety and correctness.

Check for:
1. Destructive operations: DROP TABLE, DROP COLUMN, TRUNCATE
2. Foreign key violations: referencing non-existent tables or columns
3. Data loss risk: ALTER TABLE that may lose data
4. Index impact: missing indexes on frequently queried columns
5. SQLite compatibility: features not supported by D1/SQLite

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "safe": true,
  "riskScore": 0-100,
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "type": "destructive|fk-violation|data-loss|missing-index|compatibility",
      "description": "what the issue is",
      "suggestion": "how to fix it",
      "line": 0
    }
  ],
  "schemaChanges": [
    {
      "operation": "CREATE TABLE|ALTER TABLE|CREATE INDEX|DROP TABLE|DROP INDEX",
      "target": "table or index name",
      "details": "description of change"
    }
  ]
}

RULES:
- safe: false if any critical or high severity issues exist
- riskScore: 0 = perfectly safe, 100 = extremely dangerous
- line numbers should reference the SQL input
- Output ONLY valid JSON, no explanation`;

/**
 * Build user prompt for infrastructure analysis
 */
export function buildInfraAnalyzePrompt(request: AgentExecutionRequest): string {
  const parts: string[] = [];

  if (request.context.spec) {
    parts.push(
      `## Spec Context\nTitle: ${request.context.spec.title}\nDescription: ${request.context.spec.description}`,
    );
  }

  if (request.context.fileContents && Object.keys(request.context.fileContents).length > 0) {
    parts.push("\n## Infrastructure Files");
    for (const [path, content] of Object.entries(request.context.fileContents)) {
      const ext = path.endsWith(".toml") ? "toml" : path.endsWith(".json") ? "json" : "text";
      parts.push(`\n### ${path}\n\`\`\`${ext}\n${content}\n\`\`\``);
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
 * Build user prompt for migration validation
 */
export function buildMigrationPrompt(sql: string, existingSchema?: string): string {
  const parts: string[] = [];
  if (existingSchema) {
    parts.push(`## Existing Schema\n\`\`\`sql\n${existingSchema}\n\`\`\``);
  }
  parts.push(`\n## Migration SQL\n\`\`\`sql\n${sql}\n\`\`\``);
  return parts.join("\n");
}
