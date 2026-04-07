import { describe, it, expect, vi } from "vitest";
import { EvaluationService } from "../services/evaluation-service.js";

function makeDb() {
  const mockResult = { meta: { changes: 1 } };
  const prepare = vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue(mockResult),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
  });
  return { prepare } as unknown as D1Database;
}

describe("EvaluationService", () => {
  it("should list evaluations (empty org)", async () => {
    const svc = new EvaluationService(makeDb());
    const result = await svc.list("org-1");
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("should return null for missing evaluation", async () => {
    const svc = new EvaluationService(makeDb());
    const result = await svc.getById("nonexistent", "org-1");
    expect(result).toBeNull();
  });

  it("should return empty portfolio for new org", async () => {
    const db = makeDb();
    // Stub STATUS group query
    (db.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
    });
    const svc = new EvaluationService(db);
    const portfolio = await svc.getPortfolio("org-1");
    expect(portfolio.total).toBe(0);
    expect(portfolio.byStatus).toEqual({});
  });
});
