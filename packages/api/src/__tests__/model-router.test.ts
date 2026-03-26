import { describe, it, expect, beforeEach } from "vitest";
import { createTestEnv } from "./helpers/test-app.js";
import {
  ModelRouter,
  DEFAULT_MODEL_MAP,
  toRoutingRule,
  type RoutingRule,
} from "../services/model-router.js";
import { createRoutedRunner, createAgentRunner } from "../services/agent-runner.js";
import type { AgentTaskType } from "../services/execution-types.js";

let env: ReturnType<typeof createTestEnv>;

function createModelRoutingTable() {
  (env.DB as any).db.exec(`
    CREATE TABLE IF NOT EXISTS model_routing_rules (
      id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      model_id TEXT NOT NULL,
      runner_type TEXT NOT NULL DEFAULT 'openrouter',
      priority INTEGER NOT NULL DEFAULT 1,
      max_cost_per_call REAL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(task_type, model_id)
    );
  `);
}

function seedRule(
  id: string,
  taskType: string,
  modelId: string,
  opts?: { runnerType?: string; priority?: number; enabled?: number },
) {
  const runnerType = opts?.runnerType ?? "openrouter";
  const priority = opts?.priority ?? 1;
  const enabled = opts?.enabled ?? 1;
  (env.DB as any).db
    .prepare(
      "INSERT INTO model_routing_rules (id, task_type, model_id, runner_type, priority, enabled) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(id, taskType, modelId, runnerType, priority, enabled);
}

beforeEach(() => {
  env = createTestEnv();
  createModelRoutingTable();
});

describe("ModelRouter", () => {
  describe("getModelForTask", () => {
    it("D1 규칙 존재 시 최우선 모델 반환", async () => {
      seedRule("r1", "code-review", "anthropic/claude-opus-4");

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const rule = await router.getModelForTask("code-review");

      expect(rule.taskType).toBe("code-review");
      expect(rule.modelId).toBe("anthropic/claude-opus-4");
      expect(rule.id).toBe("r1");
    });

    it("D1 규칙 없으면 DEFAULT_MODEL_MAP 폴백", async () => {
      const router = new ModelRouter(env.DB as unknown as D1Database);
      const rule = await router.getModelForTask("spec-analysis");

      expect(rule.modelId).toBe(DEFAULT_MODEL_MAP["spec-analysis"]);
      expect(rule.id).toMatch(/^default_/);
      expect(rule.priority).toBe(999);
    });

    it("disabled 규칙(enabled=0) 건너뜀", async () => {
      seedRule("r1", "code-review", "anthropic/claude-opus-4", { enabled: 0 });

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const rule = await router.getModelForTask("code-review");

      expect(rule.id).toMatch(/^default_/);
      expect(rule.modelId).toBe(DEFAULT_MODEL_MAP["code-review"]);
    });

    it("priority 순서 정렬 — 낮을수록 우선", async () => {
      seedRule("r1", "code-review", "anthropic/claude-opus-4", { priority: 5 });
      seedRule("r2", "code-review", "anthropic/claude-haiku-4-5", { priority: 1 });

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const rule = await router.getModelForTask("code-review");

      expect(rule.modelId).toBe("anthropic/claude-haiku-4-5");
      expect(rule.priority).toBe(1);
    });

    it("복수 규칙 중 priority 1인 것만 반환", async () => {
      seedRule("r1", "test-generation", "model-a", { priority: 3 });
      seedRule("r2", "test-generation", "model-b", { priority: 1 });
      seedRule("r3", "test-generation", "model-c", { priority: 2 });

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const rule = await router.getModelForTask("test-generation");

      expect(rule.modelId).toBe("model-b");
    });
  });

  describe("listRules", () => {
    it("전체 규칙 조회 — task_type, priority 순", async () => {
      seedRule("r1", "code-review", "model-a", { priority: 2 });
      seedRule("r2", "code-review", "model-b", { priority: 1 });
      seedRule("r3", "spec-analysis", "model-c");

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const rules = await router.listRules();

      expect(rules).toHaveLength(3);
      // code-review가 먼저, 그 중 priority 1이 먼저
      expect(rules[0]!.taskType).toBe("code-review");
      expect(rules[0]!.priority).toBe(1);
      expect(rules[1]!.taskType).toBe("code-review");
      expect(rules[1]!.priority).toBe(2);
      expect(rules[2]!.taskType).toBe("spec-analysis");
    });
  });

  describe("upsertRule", () => {
    it("새 규칙 생성", async () => {
      const router = new ModelRouter(env.DB as unknown as D1Database);
      const rule = await router.upsertRule("code-review", {
        modelId: "anthropic/claude-opus-4",
        runnerType: "openrouter",
        priority: 1,
      });

      expect(rule.taskType).toBe("code-review");
      expect(rule.modelId).toBe("anthropic/claude-opus-4");
      expect(rule.enabled).toBe(true);
    });

    it("기존 규칙 갱신 — 같은 task_type+model_id", async () => {
      seedRule("r1", "code-review", "anthropic/claude-sonnet-4", { priority: 5 });

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const rule = await router.upsertRule("code-review", {
        modelId: "anthropic/claude-sonnet-4",
        priority: 1,
      });

      expect(rule.priority).toBe(1);
      // 규칙은 1개만 존재해야 함
      const all = await router.listRules();
      expect(all.filter((r) => r.taskType === "code-review")).toHaveLength(1);
    });

    it("enabled false로 설정 가능", async () => {
      const router = new ModelRouter(env.DB as unknown as D1Database);
      const rule = await router.upsertRule("skill-query", {
        modelId: "anthropic/claude-haiku-4-5",
        enabled: false,
      });

      expect(rule.enabled).toBe(false);
    });
  });
});

describe("DEFAULT_MODEL_MAP", () => {
  it("7종 taskType 모두 매핑 존재", () => {
    const taskTypes: AgentTaskType[] = [
      "code-review",
      "code-generation",
      "spec-analysis",
      "test-generation",
      "policy-evaluation",
      "skill-query",
      "ontology-lookup",
    ];

    for (const tt of taskTypes) {
      expect(DEFAULT_MODEL_MAP[tt]).toBeDefined();
      expect(typeof DEFAULT_MODEL_MAP[tt]).toBe("string");
    }

    expect(Object.keys(DEFAULT_MODEL_MAP)).toHaveLength(13);
  });
});

describe("toRoutingRule", () => {
  it("D1 row → RoutingRule 변환", () => {
    const row = {
      id: "r1",
      task_type: "code-review",
      model_id: "anthropic/claude-sonnet-4",
      runner_type: "openrouter",
      priority: 1,
      max_cost_per_call: 0.05,
      enabled: 1,
      created_at: "2026-03-22T00:00:00",
      updated_at: "2026-03-22T00:00:00",
    };

    const rule = toRoutingRule(row);

    expect(rule.id).toBe("r1");
    expect(rule.taskType).toBe("code-review");
    expect(rule.modelId).toBe("anthropic/claude-sonnet-4");
    expect(rule.runnerType).toBe("openrouter");
    expect(rule.enabled).toBe(true);
    expect(rule.maxCostPerCall).toBe(0.05);
  });
});

describe("createRoutedRunner", () => {
  it("OpenRouter키 + D1 규칙 → OpenRouterRunner with 올바른 모델", async () => {
    createModelRoutingTable();
    seedRule("r1", "spec-analysis", "anthropic/claude-opus-4");

    const runner = await createRoutedRunner(
      { OPENROUTER_API_KEY: "sk-or-test", ANTHROPIC_API_KEY: "sk-ant-test" },
      "spec-analysis",
      env.DB as unknown as D1Database,
    );

    expect(runner.type).toBe("openrouter");
  });

  it("OpenRouter키 없으면 claude-api 규칙으로 ClaudeApiRunner 폴백", async () => {
    createModelRoutingTable();
    seedRule("r1", "code-review", "claude-sonnet-4", { runnerType: "claude-api" });

    const runner = await createRoutedRunner(
      { ANTHROPIC_API_KEY: "sk-ant-test" },
      "code-review",
      env.DB as unknown as D1Database,
    );

    expect(runner.type).toBe("claude-api");
  });

  it("두 키 다 없으면 MockRunner", async () => {
    const runner = await createRoutedRunner(
      {},
      "code-review",
      env.DB as unknown as D1Database,
    );

    expect(runner.type).toBe("mock");
  });

  it("db 미제공 시 기존 createAgentRunner 로직", async () => {
    const runner = await createRoutedRunner(
      { OPENROUTER_API_KEY: "sk-or-test" },
      "code-review",
    );

    expect(runner.type).toBe("openrouter");
  });

  it("db 미제공 + 키 없으면 MockRunner", async () => {
    const runner = await createRoutedRunner({}, "code-review");
    expect(runner.type).toBe("mock");
  });
});
