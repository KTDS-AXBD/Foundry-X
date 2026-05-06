// F631: PolicyEngine TDD Red Phase — whitelist + default-deny
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PolicyEngine } from "./services/policy-engine.service.js";
import type { AutomationActionType } from "./types.js";

function makeD1Mock(policyRow: unknown = null) {
  let violationInsertCount = 0;
  const mock = {
    violationInsertCount: () => violationInsertCount,
    prepare: vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockImplementation(() => ({
        run: vi.fn().mockImplementation(() => {
          if (sql.includes("policy_violations")) violationInsertCount++;
          return Promise.resolve({ success: true });
        }),
        first: vi.fn().mockResolvedValue(policyRow),
      })),
    })),
  };
  return mock;
}

function makeAuditBusMock() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

describe("F631 PolicyEngine", () => {
  const orgId = "org-test";
  const allowedAction: AutomationActionType = "read_only";
  const deniedAction: AutomationActionType = "state_change";

  it("T1: whitelist 통과 — allowed=true 정책 → evaluate → allowed=true", async () => {
    const db = makeD1Mock({ id: "pol-1", allowed: 1, reason: "읽기 허용" });
    const bus = makeAuditBusMock();
    const engine = new PolicyEngine(db as unknown as D1Database, bus as any);

    const result = await engine.evaluate(orgId, allowedAction);

    expect(result.allowed).toBe(true);
    expect(result.policyId).toBe("pol-1");
    expect(result.evaluatedAt).toBeGreaterThan(0);
  });

  it("T2: default-deny — 미등록 action_type → allowed=false + violation INSERT", async () => {
    const db = makeD1Mock(null);
    const bus = makeAuditBusMock();
    const engine = new PolicyEngine(db as unknown as D1Database, bus as any);

    const result = await engine.evaluate(orgId, deniedAction);

    expect(result.allowed).toBe(false);
    expect(result.policyId).toBeNull();
    expect(result.reason).toMatch(/default-deny/);
    expect(db.violationInsertCount()).toBeGreaterThanOrEqual(1);
  });

  it("T3: evaluate → policy.evaluated audit 이벤트 발행", async () => {
    const db = makeD1Mock({ id: "pol-2", allowed: 1, reason: null });
    const bus = makeAuditBusMock();
    const engine = new PolicyEngine(db as unknown as D1Database, bus as any);

    await engine.evaluate(orgId, allowedAction);

    expect(bus.emit).toHaveBeenCalledWith(
      "policy.evaluated",
      expect.objectContaining({ orgId, actionType: allowedAction }),
      expect.objectContaining({ traceId: expect.any(String) }),
    );
  });

  it("T4: default-deny → policy.violation audit 이벤트 발행", async () => {
    const db = makeD1Mock(null);
    const bus = makeAuditBusMock();
    const engine = new PolicyEngine(db as unknown as D1Database, bus as any);

    await engine.evaluate(orgId, deniedAction);

    const calls = (bus.emit as ReturnType<typeof vi.fn>).mock.calls;
    const violationCall = calls.find((c: unknown[]) => c[0] === "policy.violation");
    expect(violationCall).toBeDefined();
    expect(violationCall?.[1]).toMatchObject({ orgId, actionType: deniedAction });
  });
});
