/**
 * F136: 태스크별 모델 라우팅 — D1 규칙 기반 자동 모델 선택
 */
import type { AgentTaskType, AgentRunnerType } from "./execution-types.js";

export interface RoutingRule {
  id: string;
  taskType: AgentTaskType;
  modelId: string;
  runnerType: AgentRunnerType;
  priority: number;
  maxCostPerCall: number | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** D1 규칙 없을 때 하드코딩 폴백 */
export const DEFAULT_MODEL_MAP: Record<AgentTaskType, string> = {
  "code-review": "anthropic/claude-sonnet-4",
  "code-generation": "anthropic/claude-sonnet-4",
  "spec-analysis": "anthropic/claude-opus-4",
  "test-generation": "anthropic/claude-haiku-4-5",
  "policy-evaluation": "anthropic/claude-haiku-4-5",
  "skill-query": "anthropic/claude-haiku-4-5",
  "ontology-lookup": "anthropic/claude-haiku-4-5",
  "security-review": "anthropic/claude-sonnet-4-5-20250514",
  "qa-testing": "anthropic/claude-haiku-4-5",
  "infra-analysis": "anthropic/claude-sonnet-4",
  "bmc-generation": "anthropic/claude-sonnet-4-6",
  "bmc-insight": "anthropic/claude-sonnet-4-6",
  "market-summary": "anthropic/claude-sonnet-4-6",
};

interface D1RoutingRow {
  id: string;
  task_type: string;
  model_id: string;
  runner_type: string;
  priority: number;
  max_cost_per_call: number | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export function toRoutingRule(row: D1RoutingRow): RoutingRule {
  return {
    id: row.id,
    taskType: row.task_type as AgentTaskType,
    modelId: row.model_id,
    runnerType: row.runner_type as AgentRunnerType,
    priority: row.priority,
    maxCostPerCall: row.max_cost_per_call,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ModelRouter {
  constructor(private db: D1Database) {}

  async getModelForTask(taskType: AgentTaskType): Promise<RoutingRule> {
    const result = await this.db
      .prepare(
        "SELECT * FROM model_routing_rules WHERE task_type = ? AND enabled = 1 ORDER BY priority ASC LIMIT 1",
      )
      .bind(taskType)
      .first<D1RoutingRow>();

    if (result) {
      return toRoutingRule(result);
    }

    // D1 규칙 없으면 DEFAULT_MODEL_MAP 폴백
    const modelId = DEFAULT_MODEL_MAP[taskType] ?? "anthropic/claude-sonnet-4";
    return {
      id: `default_${taskType}`,
      taskType,
      modelId,
      runnerType: "openrouter",
      priority: 999,
      maxCostPerCall: null,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /** F144: task_type별 전체 enabled 규칙을 priority ASC로 반환 (Fallback 체인용) */
  async getFallbackChain(taskType: AgentTaskType): Promise<RoutingRule[]> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM model_routing_rules WHERE task_type = ? AND enabled = 1 ORDER BY priority ASC",
      )
      .bind(taskType)
      .all<D1RoutingRow>();

    if (results.length > 0) {
      return results.map(toRoutingRule);
    }

    // D1 규칙 없으면 getModelForTask() 단일 항목 배열로 폴백
    const fallback = await this.getModelForTask(taskType);
    return [fallback];
  }

  async listRules(): Promise<RoutingRule[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM model_routing_rules ORDER BY task_type, priority")
      .all<D1RoutingRow>();

    return results.map(toRoutingRule);
  }

  async upsertRule(
    taskType: AgentTaskType,
    patch: {
      modelId: string;
      runnerType?: AgentRunnerType;
      priority?: number;
      maxCostPerCall?: number | null;
      enabled?: boolean;
    },
  ): Promise<RoutingRule> {
    const id = `mrr_${Date.now()}`;
    const runnerType = patch.runnerType ?? "openrouter";
    const priority = patch.priority ?? 1;
    const maxCostPerCall = patch.maxCostPerCall ?? null;
    const enabled = patch.enabled !== undefined ? (patch.enabled ? 1 : 0) : 1;

    await this.db
      .prepare(
        `INSERT INTO model_routing_rules (id, task_type, model_id, runner_type, priority, max_cost_per_call, enabled, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(task_type, model_id) DO UPDATE SET
           runner_type = excluded.runner_type,
           priority = excluded.priority,
           max_cost_per_call = excluded.max_cost_per_call,
           enabled = excluded.enabled,
           updated_at = datetime('now')`,
      )
      .bind(id, taskType, patch.modelId, runnerType, priority, maxCostPerCall, enabled)
      .run();

    const row = await this.db
      .prepare(
        "SELECT * FROM model_routing_rules WHERE task_type = ? AND model_id = ?",
      )
      .bind(taskType, patch.modelId)
      .first<D1RoutingRow>();

    return toRoutingRule(row!);
  }
}
