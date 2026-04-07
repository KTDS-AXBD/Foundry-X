import { describe, it, expect, vi } from "vitest";
import { DecisionService } from "../services/decision-service.js";

function makeDb(overrides: Record<string, unknown> = {}) {
  const runResult = { meta: { changes: 1 } };
  const prepare = vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue(runResult),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
  });
  return { prepare, ...overrides } as unknown as D1Database;
}

describe("DecisionService", () => {
  it("should list pending decisions (empty)", async () => {
    const db = makeDb();
    const svc = new DecisionService(db);
    const result = await svc.getPending("org-1");
    expect(result).toEqual([]);
  });

  it("should return empty stats when no decisions", async () => {
    const db = makeDb();
    const svc = new DecisionService(db);
    const stats = await svc.getStats("org-1");
    expect(stats.total).toBe(0);
    expect(stats.go).toBe(0);
  });

  it("should list empty decisions by org", async () => {
    const db = makeDb();
    const svc = new DecisionService(db);
    const decisions = await svc.listByOrg("org-1");
    expect(decisions).toEqual([]);
  });
});
