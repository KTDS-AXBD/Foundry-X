import { describe, it, expect, vi } from "vitest";
import { getDb, runQuery, runExec } from "../../src/d1/setup.js";
import type { HarnessEnv } from "../../src/types.js";

function createMockDb() {
  const mockAll = vi.fn().mockResolvedValue({ results: [{ id: "1", name: "test" }] });
  const mockBind = vi.fn().mockReturnValue({ all: mockAll });
  const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind, all: mockAll });
  const mockExec = vi.fn().mockResolvedValue(undefined);

  return {
    db: { prepare: mockPrepare, exec: mockExec } as unknown as D1Database,
    mockPrepare,
    mockBind,
    mockAll,
    mockExec,
  };
}

describe("D1 Setup", () => {
  it("getDb should return DB binding", () => {
    const { db } = createMockDb();
    const env = { DB: db, JWT_SECRET: "test" } as HarnessEnv;
    expect(getDb(env)).toBe(db);
  });

  it("getDb should throw when DB is not bound", () => {
    const env = { JWT_SECRET: "test" } as unknown as HarnessEnv;
    expect(() => getDb(env)).toThrow("D1 database binding (DB) not found");
  });

  it("runQuery should execute prepared statement with params", async () => {
    const { db, mockPrepare, mockBind } = createMockDb();
    const result = await runQuery(db, "SELECT * FROM users WHERE id = ?", ["1"]);
    expect(mockPrepare).toHaveBeenCalledWith("SELECT * FROM users WHERE id = ?");
    expect(mockBind).toHaveBeenCalledWith("1");
    expect(result).toEqual([{ id: "1", name: "test" }]);
  });

  it("runQuery should execute without params", async () => {
    const { db, mockPrepare, mockAll } = createMockDb();
    await runQuery(db, "SELECT * FROM users");
    expect(mockPrepare).toHaveBeenCalledWith("SELECT * FROM users");
    expect(mockAll).toHaveBeenCalled();
  });

  it("runExec should execute raw SQL", async () => {
    const { db, mockExec } = createMockDb();
    await runExec(db, "CREATE TABLE test (id TEXT)");
    expect(mockExec).toHaveBeenCalledWith("CREATE TABLE test (id TEXT)");
  });
});
