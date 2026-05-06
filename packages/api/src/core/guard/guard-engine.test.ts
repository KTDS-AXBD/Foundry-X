// F615: Guard-X Solo TDD — PolicyEngine consumer + HMAC + D1 INSERT
import { describe, it, expect, vi } from "vitest";
import { GuardEngine } from "./services/guard-engine.service.js";
import type { GuardCheckRequest } from "./types.js";

function makeD1Mock() {
  const inserts: unknown[][] = [];
  return {
    inserts,
    prepare: vi.fn().mockImplementation((_sql: string) => ({
      bind: vi.fn().mockImplementation((...args: unknown[]) => ({
        run: vi.fn().mockImplementation(() => {
          inserts.push(args);
          return Promise.resolve({ success: true });
        }),
        first: vi.fn().mockResolvedValue(null),
      })),
    })),
  };
}

function makePolicyMock(allowed: boolean, policyId: string | null = "pol-1") {
  return {
    evaluate: vi.fn().mockResolvedValue({
      allowed,
      reason: allowed ? "whitelist match" : "default-deny: no policy registered",
      policyId: allowed ? policyId : null,
      evaluatedAt: Date.now(),
    }),
  };
}

function makeAuditMock() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

const HMAC_KEY = "test-guard-hmac-key-32chars-pad!";

describe("F615 GuardEngine", () => {
  const baseRequest: GuardCheckRequest = {
    context: { orgId: "org-test", actor: "user-1" },
    actionType: "read_only",
  };

  it("T1: allowed=true — PolicyEngine 통과 → checkId 26자 + HMAC + allowed=true", async () => {
    const db = makeD1Mock();
    const policy = makePolicyMock(true);
    const audit = makeAuditMock();
    const engine = new GuardEngine(
      db as unknown as D1Database,
      policy,
      audit as any,
      HMAC_KEY,
    );

    const result = await engine.check(baseRequest);

    expect(result.allowed).toBe(true);
    expect(result.checkId).toHaveLength(26);
    expect(result.hmacSignature).toBeTruthy();
    expect(result.violations).toHaveLength(0);
    expect(result.decidedAt).toBeGreaterThan(0);
    expect(db.inserts.length).toBeGreaterThanOrEqual(1);
    expect(audit.emit).toHaveBeenCalledWith(
      "guard.checked",
      expect.objectContaining({ allowed: true }),
      expect.any(Object),
      "user-1",
      undefined,
    );
  });

  it("T2: allowed=false — default-deny → violations[0] + violation=1 D1 INSERT", async () => {
    const db = makeD1Mock();
    const policy = makePolicyMock(false);
    const audit = makeAuditMock();
    const engine = new GuardEngine(
      db as unknown as D1Database,
      policy,
      audit as any,
      HMAC_KEY,
    );

    const result = await engine.check({
      ...baseRequest,
      actionType: "destructive_op",
    });

    expect(result.allowed).toBe(false);
    expect(result.violations).toHaveLength(1);
    const v = result.violations[0];
    expect(v?.reason).toMatch(/default-deny/);
    expect(v?.severity).toBe("warning");
    expect(db.inserts.length).toBeGreaterThanOrEqual(1);
  });
});
