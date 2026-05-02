// F571 TDD helper — minimal mock env for fx-agent tests
import type { AgentEnv } from "../../env.js";

const MOCK_META = {
  duration: 0,
  last_row_id: 0,
  changes: 0,
  served_by: "",
  internal_stats: null,
  rows_read: 0,
  rows_written: 0,
  size_after: 0,
  changed_db: false,
} as const;

function createMockD1(): D1Database {
  const prepared = (_sql: string) => ({
    bind: (..._args: unknown[]) => ({
      first: async (): Promise<unknown> => null,
      all: async (): Promise<{ results: unknown[] }> => ({ results: [] }),
      run: async (): Promise<D1Result> => ({
        success: true,
        results: [],
        meta: MOCK_META,
      } as D1Result),
    }),
    first: async (): Promise<unknown> => null,
    all: async (): Promise<{ results: unknown[] }> => ({ results: [] }),
    run: async (): Promise<D1Result> => ({
      success: true,
      results: [],
      meta: MOCK_META,
    } as D1Result),
  });

  return {
    prepare: (sql: string) => prepared(sql),
    batch: async (statements: D1PreparedStatement[]) =>
      statements.map(() => ({
        success: true,
        results: [],
        meta: MOCK_META,
      } as D1Result)),
    dump: async () => new ArrayBuffer(0),
    exec: async (_query: string) => ({ count: 0, duration: 0 }),
  } as unknown as D1Database;
}

export function createMockEnv(): AgentEnv {
  return {
    DB: createMockD1(),
    JWT_SECRET: "test-secret",
    MAIN_API: {} as unknown as Fetcher,
  };
}
