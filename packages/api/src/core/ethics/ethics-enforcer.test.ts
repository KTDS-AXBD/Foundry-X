// F607: EthicsEnforcer TDD Red Phase — confidence threshold + FP + kill switch
import { describe, it, expect, vi } from "vitest";
import { EthicsEnforcer } from "./services/ethics-enforcer.service.js";

type InsertCall = { table: string; values: Record<string, unknown> };

function makeD1Mock() {
  const insertLog: InsertCall[] = [];
  const mock = {
    insertLog,
    prepare: vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockImplementation((...args: unknown[]) => {
        if (sql.includes("INSERT INTO ethics_violations")) {
          insertLog.push({ table: "ethics_violations", values: { args } });
        }
        if (sql.includes("INSERT INTO kill_switch_state")) {
          insertLog.push({ table: "kill_switch_state", values: { args } });
        }
        return {
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue(
            sql.includes("kill_switch_state")
              ? {
                  id: "ks-1",
                  org_id: "org-test",
                  agent_id: "agent-test",
                  active: 1,
                  reason: "test",
                  activated_at: Date.now(),
                  deactivated_at: null,
                  created_at: Date.now(),
                  updated_at: Date.now(),
                }
              : null,
          ),
        };
      }),
    })),
  };
  return mock;
}

function makeAuditBusMock() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

describe("F607 EthicsEnforcer", () => {
  const orgId = "org-test";
  const agentId = "agent-test";

  it("T1: confidence 0.6 → checkConfidence → passed=false + escalated=true + ethics_violations INSERT + audit emit", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const enforcer = new EthicsEnforcer(db as unknown as D1Database, bus as any);

    const result = await enforcer.checkConfidence({
      orgId,
      agentId,
      callMeta: { confidence: 0.6, callId: "call-1", traceId: "trace-abc" },
    });

    expect(result.passed).toBe(false);
    expect(result.escalated).toBe(true);
    expect(db.insertLog.some((r) => r.table === "ethics_violations")).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      "ethics.threshold_violated",
      expect.objectContaining({ orgId, agentId, violationType: "confidence_threshold" }),
      expect.objectContaining({ traceId: expect.any(String) }),
    );
  });

  it("T2: recordFP → ethics_violations INSERT + audit emit", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const enforcer = new EthicsEnforcer(db as unknown as D1Database, bus as any);

    await enforcer.recordFP({ orgId, agentId, callId: "call-fp-1", reason: "wrong category" });

    expect(db.insertLog.some((r) => r.table === "ethics_violations")).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      "ethics.fp_recorded",
      expect.objectContaining({ orgId, agentId, callId: "call-fp-1" }),
      expect.objectContaining({ traceId: expect.any(String) }),
    );
  });

  it("T3: triggerKillSwitch(active=true) → active=true 반환 + audit emit", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const enforcer = new EthicsEnforcer(db as unknown as D1Database, bus as any);

    const state = await enforcer.triggerKillSwitch({ orgId, agentId, active: true, reason: "anomaly" });

    expect(state.active).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      "ethics.kill_switch_triggered",
      expect.objectContaining({ orgId, agentId, active: true }),
      expect.objectContaining({ traceId: expect.any(String) }),
    );
  });
});
