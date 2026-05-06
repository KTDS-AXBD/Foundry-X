// F617: Guard-X Integration TDD — WorkflowHookService + RuleEngine E2E (GX-I06)
import { describe, it, expect, vi } from "vitest";
import { WorkflowHookService } from "../core/guard/services/workflow-hook.service.js";
import { RuleEngine } from "../core/guard/services/rule-engine.service.js";
import type { WorkflowAction } from "../core/guard/types.js";

const SAMPLE_YAML = `
rules:
  - id: rule-confidential-publish-block
    name: ConfidentialPublishBlock
    description: confidential 라벨이 붙은 정책팩 publish 차단
    matchPattern:
      sensitivityLabel: ["confidential", "secret"]
      actionType: ["publish_policy_pack"]
    action: deny
    severity: critical
`;

function makeD1Mock(activeRules: unknown[] = []) {
  return {
    prepare: vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockImplementation(() => ({
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(null),
      })),
      all: vi.fn().mockResolvedValue({ results: activeRules }),
    })),
  } as unknown as D1Database;
}

function makeGuardMock(allowed: boolean, checkId = "01ABCDEFGHIJKLMNOPQRSTUVWX") {
  return {
    check: vi.fn().mockResolvedValue({
      checkId,
      allowed,
      violations: allowed ? [] : [{ policyId: null, reason: "default-deny", severity: "warning" }],
      hmacSignature: "mock-sig",
      auditEventId: null,
      decidedAt: Date.now(),
    }),
  };
}

function makeAuditMock() {
  const emits: Array<{ event: string; payload: unknown }> = [];
  return {
    emits,
    emit: vi.fn().mockImplementation((event: string, payload: unknown) => {
      emits.push({ event, payload });
      return Promise.resolve({ id: 1 });
    }),
  };
}

describe("F617 Guard-X Integration", () => {
  describe("WorkflowHookService", () => {
    it("T1: confidential 정책팩 publish → blocked=true + violation 1건 + audit 3 emits", async () => {
      const db = makeD1Mock();
      const audit = makeAuditMock();
      const guardMock = makeGuardMock(true); // policy allowed
      const ruleEngine = new RuleEngine(db, audit);
      await ruleEngine.loadRulesFromYaml(SAMPLE_YAML);

      const svc = new WorkflowHookService(
        guardMock as any,
        ruleEngine,
        audit,
      );

      const action: WorkflowAction = {
        workflowId: "wf-test-1",
        action: "publish_policy_pack",
        orgId: "org-1",
        actor: "user-1",
        sensitivityLabel: "confidential",
      };

      const result = await svc.interceptPolicyPackPublish(action);

      expect(result.blocked).toBe(true);
      expect(result.checkId).toBeTruthy();
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleId).toBe("rule-confidential-publish-block");

      const emittedEvents = audit.emits.map((e) => e.event);
      expect(emittedEvents).toContain("guard.workflow_hook_invoked");
      expect(emittedEvents).toContain("guard.rule_violation");
      expect(emittedEvents).toContain("guard.publish_blocked");
    });

    it("T2: internal 라벨 정책팩 publish → blocked=false + violations 0건", async () => {
      const db = makeD1Mock();
      const audit = makeAuditMock();
      const guardMock = makeGuardMock(true);
      const ruleEngine = new RuleEngine(db, audit);
      await ruleEngine.loadRulesFromYaml(SAMPLE_YAML);

      const svc = new WorkflowHookService(guardMock as any, ruleEngine, audit);

      const action: WorkflowAction = {
        workflowId: "wf-test-2",
        action: "publish_policy_pack",
        orgId: "org-1",
        actor: "user-1",
        sensitivityLabel: "internal",
      };

      const result = await svc.interceptPolicyPackPublish(action);

      expect(result.blocked).toBe(false);
      expect(result.violations).toHaveLength(0);

      const emittedEvents = audit.emits.map((e) => e.event);
      expect(emittedEvents).toContain("guard.workflow_hook_invoked");
      expect(emittedEvents).not.toContain("guard.publish_blocked");
    });

    it("T3: policy deny → blocked=true even without rule violations", async () => {
      const db = makeD1Mock();
      const audit = makeAuditMock();
      const guardMock = makeGuardMock(false); // policy denied
      const ruleEngine = new RuleEngine(db, audit);
      await ruleEngine.loadRulesFromYaml(SAMPLE_YAML);

      const svc = new WorkflowHookService(guardMock as any, ruleEngine, audit);

      const action: WorkflowAction = {
        workflowId: "wf-test-3",
        action: "publish_policy_pack",
        orgId: "org-1",
        actor: "user-1",
        sensitivityLabel: "public",
      };

      const result = await svc.interceptPolicyPackPublish(action);

      expect(result.blocked).toBe(true);
      expect(result.reason).toBeDefined();
    });
  });

  describe("RuleEngine", () => {
    it("T4: loadRulesFromYaml → rules 1건 로드", async () => {
      const db = makeD1Mock();
      const audit = makeAuditMock();
      const engine = new RuleEngine(db, audit);
      await engine.loadRulesFromYaml(SAMPLE_YAML);

      const rules = await engine.getActiveRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe("rule-confidential-publish-block");
      expect(rules[0].severity).toBe("critical");
    });

    it("T5: getActiveRules fallback — in-memory 없으면 D1 SELECT 호출", async () => {
      const dbRule = {
        id: "rule-db-1",
        rule_name: "DBRule",
        rule_yaml: JSON.stringify({
          id: "rule-db-1",
          name: "DBRule",
          description: "from db",
          matchPattern: { sensitivityLabel: ["secret"] },
          action: "deny",
          severity: "warning",
        }),
      };
      const db = makeD1Mock([dbRule]);
      const audit = makeAuditMock();
      const engine = new RuleEngine(db, audit);

      // no loadRulesFromYaml called → fallback to D1
      const rules = await engine.getActiveRules();
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
      );
      expect(rules).toHaveLength(1);
    });

    it("T6: evaluateRules — violation INSERT to D1 + audit emit", async () => {
      const db = makeD1Mock();
      const audit = makeAuditMock();
      const engine = new RuleEngine(db, audit);
      await engine.loadRulesFromYaml(SAMPLE_YAML);

      const action: WorkflowAction = {
        workflowId: "wf-6",
        action: "publish_policy_pack",
        orgId: "org-1",
        actor: "user-1",
        sensitivityLabel: "secret",
      };

      const violations = await engine.evaluateRules(action);
      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe("critical");

      // D1 INSERT called
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO guard_rule_violations"),
      );
      // audit emit
      expect(audit.emit).toHaveBeenCalledWith(
        "guard.rule_violation",
        expect.objectContaining({ ruleId: "rule-confidential-publish-block" }),
      );
    });
  });
});
