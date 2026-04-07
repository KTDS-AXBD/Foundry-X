import { describe, it, expect, vi } from "vitest";
import { CustomRuleService } from "../services/custom-rule-service.js";
import { DynamicRuleCriteria } from "../services/evaluation-criteria.js";
import type { CustomValidationRule } from "../schemas/custom-rule.schema.js";
import type { AgentExecutionResult, AgentExecutionRequest } from "../types/agent-execution.js";

const MOCK_CONDITIONS = [
  { field: "output.score", operator: "gte" as const, value: 80, score_weight: 0.6 },
  { field: "output.label", operator: "contains" as const, value: "pass", score_weight: 0.4 },
];

function makeDb(overrides: Partial<{ firstResult: unknown; allResults: unknown[] }> = {}) {
  const firstResult = overrides.firstResult ?? null;
  const allResults = overrides.allResults ?? [];
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    first: vi.fn().mockResolvedValue(firstResult),
    all: vi.fn().mockResolvedValue({ results: allResults }),
  };
  return { prepare: vi.fn().mockReturnValue(stmt) } as unknown as D1Database;
}

function makeRuleRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "rule-1",
    org_id: "org-1",
    name: "헬스케어 AI 기준",
    description: "헬스케어 AI 검증 루브릭",
    weight: 0.3,
    threshold: 60,
    conditions: JSON.stringify(MOCK_CONDITIONS),
    is_active: 1,
    created_by: "user-1",
    created_at: "2026-04-07T00:00:00.000Z",
    updated_at: "2026-04-07T00:00:00.000Z",
    ...overrides,
  };
}

describe("CustomRuleService", () => {
  it("list — empty org returns []", async () => {
    const svc = new CustomRuleService(makeDb());
    const result = await svc.list("org-1");
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("list — returns parsed rules", async () => {
    const db = makeDb({ allResults: [makeRuleRow()] });
    const svc = new CustomRuleService(db);
    const result = await svc.list("org-1");
    expect(result.total).toBe(1);
    const first = result.items[0]!;
    expect(first.name).toBe("헬스케어 AI 기준");
    expect(Array.isArray(first.conditions)).toBe(true);
  });

  it("list — conditions parsed from JSON string", async () => {
    const db = makeDb({ allResults: [makeRuleRow()] });
    const svc = new CustomRuleService(db);
    const result = await svc.list("org-1");
    const first = result.items[0]!;
    expect(first.conditions).toHaveLength(2);
    expect(first.conditions[0]!.operator).toBe("gte");
  });

  it("create — returns new rule with generated id", async () => {
    const svc = new CustomRuleService(makeDb());
    const rule = await svc.create("org-1", "user-1", {
      name: "테스트 룰",
      description: "테스트",
      weight: 0.2,
      threshold: 60,
      conditions: MOCK_CONDITIONS,
    });
    expect(rule.id).toBeTruthy();
    expect(rule.org_id).toBe("org-1");
    expect(rule.is_active).toBe(true);
    expect(rule.conditions).toHaveLength(2);
  });

  it("getById — found returns rule", async () => {
    const db = makeDb({ firstResult: makeRuleRow() });
    const svc = new CustomRuleService(db);
    const rule = await svc.getById("rule-1", "org-1");
    expect(rule).not.toBeNull();
    expect(rule!.id).toBe("rule-1");
    expect(rule!.is_active).toBe(true);
  });

  it("getById — not found returns null", async () => {
    const svc = new CustomRuleService(makeDb());
    const rule = await svc.getById("nonexistent", "org-1");
    expect(rule).toBeNull();
  });

  it("getById — org isolation: different org returns null", async () => {
    const db = makeDb({ firstResult: null });
    const svc = new CustomRuleService(db);
    const rule = await svc.getById("rule-1", "org-OTHER");
    expect(rule).toBeNull();
  });

  it("update — success returns updated rule", async () => {
    const db = makeDb({ firstResult: makeRuleRow() });
    const svc = new CustomRuleService(db);
    const updated = await svc.update("rule-1", "org-1", { name: "수정된 룰" });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("수정된 룰");
  });

  it("update — not found returns null", async () => {
    const svc = new CustomRuleService(makeDb());
    const updated = await svc.update("nonexistent", "org-1", { name: "수정" });
    expect(updated).toBeNull();
  });

  it("delete — success returns true", async () => {
    const svc = new CustomRuleService(makeDb());
    const deleted = await svc.delete("rule-1", "org-1");
    expect(deleted).toBe(true);
  });

  it("delete — not found returns false", async () => {
    const db = makeDb();
    const stmt = {
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
    };
    (db.prepare as ReturnType<typeof vi.fn>).mockReturnValue(stmt);
    const svc = new CustomRuleService(db);
    const deleted = await svc.delete("nonexistent", "org-1");
    expect(deleted).toBe(false);
  });

  it("toggleActivate — activate (is_active: false → true)", async () => {
    const db = makeDb({ firstResult: makeRuleRow({ is_active: 0 }) });
    const svc = new CustomRuleService(db);
    const result = await svc.toggleActivate("rule-1", "org-1");
    expect(result).not.toBeNull();
    expect(result!.is_active).toBe(true);
  });

  it("toggleActivate — deactivate (is_active: true → false)", async () => {
    const db = makeDb({ firstResult: makeRuleRow({ is_active: 1 }) });
    const svc = new CustomRuleService(db);
    const result = await svc.toggleActivate("rule-1", "org-1");
    expect(result).not.toBeNull();
    expect(result!.is_active).toBe(false);
  });

  it("toggleActivate — not found returns null", async () => {
    const svc = new CustomRuleService(makeDb());
    const result = await svc.toggleActivate("nonexistent", "org-1");
    expect(result).toBeNull();
  });

  it("getActiveRules — returns only active rules", async () => {
    const db = makeDb({ allResults: [makeRuleRow({ is_active: 1 })] });
    const svc = new CustomRuleService(db);
    const rules = await svc.getActiveRules("org-1");
    expect(rules).toHaveLength(1);
    expect(rules[0]!.is_active).toBe(true);
  });

  it("getActiveRules — empty when no active rules", async () => {
    const svc = new CustomRuleService(makeDb());
    const rules = await svc.getActiveRules("org-1");
    expect(rules).toHaveLength(0);
  });
});

describe("DynamicRuleCriteria", () => {
  function makeRule(overrides: Partial<CustomValidationRule> = {}): CustomValidationRule {
    return {
      id: "rule-1",
      org_id: "org-1",
      name: "테스트 룰",
      description: "",
      weight: 0.3,
      threshold: 60,
      conditions: MOCK_CONDITIONS,
      is_active: true,
      created_by: "user-1",
      created_at: "2026-04-07T00:00:00.000Z",
      updated_at: "2026-04-07T00:00:00.000Z",
      ...overrides,
    };
  }

  function makeResult(output: Record<string, unknown>): AgentExecutionResult {
    return { output, taskType: "code-review", success: true, durationMs: 0 };
  }

  const dummyRequest: AgentExecutionRequest = { taskType: "code-review", input: {} };

  it("all conditions met — score 100, passed true", () => {
    const criteria = new DynamicRuleCriteria(makeRule());
    const score = criteria.evaluate(makeResult({ output: { score: 90, label: "pass-grade" } }), dummyRequest);
    expect(score.score).toBe(100);
    expect(score.passed).toBe(true);
    expect(score.feedback).toHaveLength(0);
  });

  it("no conditions met — score 0, passed false", () => {
    const criteria = new DynamicRuleCriteria(makeRule());
    const score = criteria.evaluate(makeResult({ output: { score: 50, label: "fail" } }), dummyRequest);
    expect(score.score).toBe(0);
    expect(score.passed).toBe(false);
    expect(score.feedback).toHaveLength(2);
  });

  it("partial conditions met — weighted score", () => {
    const criteria = new DynamicRuleCriteria(makeRule());
    // score >= 80: true (0.6), label contains "pass": false
    const score = criteria.evaluate(makeResult({ output: { score: 90, label: "fail" } }), dummyRequest);
    expect(score.score).toBe(60);
    expect(score.passed).toBe(score.score >= 60);
  });

  it("threshold boundary — exactly at threshold passes", () => {
    const rule = makeRule({ threshold: 60 });
    const criteria = new DynamicRuleCriteria(rule);
    const score = criteria.evaluate(makeResult({ output: { score: 90, label: "fail" } }), dummyRequest);
    // score_weight 0.6 → score 60 → exactly at threshold
    expect(score.score).toBe(60);
    expect(score.passed).toBe(true);
  });

  it("contains operator — string inclusion check", () => {
    const rule = makeRule({
      conditions: [{ field: "output.text", operator: "contains", value: "hello", score_weight: 1.0 }],
    });
    const criteria = new DynamicRuleCriteria(rule);
    const pass = criteria.evaluate(makeResult({ output: { text: "hello world" } }), dummyRequest);
    expect(pass.score).toBe(100);
    const fail = criteria.evaluate(makeResult({ output: { text: "goodbye" } }), dummyRequest);
    expect(fail.score).toBe(0);
  });

  it("dot-path nested field access", () => {
    const rule = makeRule({
      conditions: [{ field: "output.inner.value", operator: "eq", value: 42, score_weight: 1.0 }],
    });
    const criteria = new DynamicRuleCriteria(rule);
    const score = criteria.evaluate(makeResult({ output: { inner: { value: 42 } } }), dummyRequest);
    expect(score.score).toBe(100);
    expect(score.passed).toBe(true);
  });

  it("criteriaName includes rule id", () => {
    const criteria = new DynamicRuleCriteria(makeRule({ id: "rule-xyz" }));
    expect(criteria.name).toBe("custom:rule-xyz");
  });

  it("details includes ruleId and ruleName", () => {
    const criteria = new DynamicRuleCriteria(makeRule());
    const score = criteria.evaluate(makeResult({ output: {} }), dummyRequest);
    expect(score.details["ruleId"]).toBe("rule-1");
    expect(score.details["ruleName"]).toBe("테스트 룰");
  });
});
