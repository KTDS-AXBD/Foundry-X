// fx-shaping D1 shim over better-sqlite3 — shaping tables only
import Database from "better-sqlite3";

class MockD1PreparedStatement {
  private bindings: unknown[] = [];

  constructor(
    private db: Database.Database,
    private query: string,
  ) {}

  bind(...values: unknown[]): MockD1PreparedStatement {
    this.bindings = values;
    return this;
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const stmt = this.db.prepare(this.query);
    const row = stmt.get(...this.bindings) as Record<string, unknown> | undefined;
    if (!row) return null;
    if (colName) return (row[colName] as T) ?? null;
    return row as T;
  }

  async run() {
    const stmt = this.db.prepare(this.query);
    const info = stmt.run(...this.bindings);
    return {
      results: [] as unknown[],
      success: true,
      meta: {
        duration: 0,
        last_row_id: info.lastInsertRowid,
        changes: info.changes,
        served_by: "mock",
        internal_stats: null,
      },
    };
  }

  async all<T = Record<string, unknown>>() {
    const stmt = this.db.prepare(this.query);
    const rows = stmt.all(...this.bindings);
    return {
      results: rows as T[],
      success: true,
      meta: { duration: 0, served_by: "mock", internal_stats: null },
    };
  }

  async raw<T = unknown[]>() {
    const stmt = this.db.prepare(this.query);
    const rawStmt = stmt.raw();
    return rawStmt.all(...this.bindings) as T[];
  }
}

export class MockD1Database {
  readonly rawDb: Database.Database;

  constructor(rawDb: Database.Database) {
    this.rawDb = rawDb;
  }

  prepare(query: string): MockD1PreparedStatement {
    return new MockD1PreparedStatement(this.rawDb, query);
  }

  async batch(statements: MockD1PreparedStatement[]) {
    return Promise.all(statements.map((s) => s.run()));
  }

  async exec(query: string) {
    this.rawDb.exec(query);
    return { results: [], success: true, meta: { duration: 0 } };
  }
}

function initShapingSchema(db: Database.Database) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS shaping_runs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      tenant_id TEXT NOT NULL DEFAULT 'org_test',
      discovery_prd_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running'
        CHECK(status IN ('running','completed','failed','escalated')),
      mode TEXT NOT NULL DEFAULT 'hitl'
        CHECK(mode IN ('hitl','auto')),
      current_phase TEXT NOT NULL DEFAULT 'A'
        CHECK(current_phase IN ('A','B','C','D','E','F')),
      total_iterations INTEGER NOT NULL DEFAULT 0,
      max_iterations INTEGER NOT NULL DEFAULT 3,
      quality_score REAL,
      token_cost INTEGER NOT NULL DEFAULT 0,
      token_limit INTEGER NOT NULL DEFAULT 500000,
      git_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    )`,
  );

  db.exec(
    `CREATE TABLE IF NOT EXISTS shaping_phase_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      run_id TEXT NOT NULL,
      phase TEXT NOT NULL CHECK(phase IN ('A','B','C','D','E','F')),
      round INTEGER NOT NULL DEFAULT 0,
      input_snapshot TEXT,
      output_snapshot TEXT,
      verdict TEXT CHECK(verdict IN ('PASS','MINOR_FIX','MAJOR_ISSUE','ESCALATED')),
      quality_score REAL,
      findings TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  );

  db.exec(
    `CREATE TABLE IF NOT EXISTS shaping_expert_reviews (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      run_id TEXT NOT NULL,
      expert_role TEXT NOT NULL CHECK(expert_role IN ('TA','AA','CA','DA','QA')),
      review_body TEXT NOT NULL,
      findings TEXT,
      quality_score REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  );

  db.exec(
    `CREATE TABLE IF NOT EXISTS shaping_six_hats (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      run_id TEXT NOT NULL,
      hat_color TEXT NOT NULL CHECK(hat_color IN ('white','red','black','yellow','green','blue')),
      round INTEGER NOT NULL,
      opinion TEXT NOT NULL,
      verdict TEXT CHECK(verdict IN ('accept','concern','reject')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  );

  db.exec(
    `CREATE TABLE IF NOT EXISTS shaping_hitl_reviews (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      run_id TEXT NOT NULL,
      section TEXT NOT NULL,
      decision TEXT NOT NULL CHECK(decision IN ('approved','revision_requested','rejected')),
      comment TEXT,
      reviewer_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  );
}

export function createMockD1(): MockD1Database {
  const rawDb = new Database(":memory:");
  rawDb.pragma("journal_mode = WAL");
  rawDb.pragma("foreign_keys = OFF");
  initShapingSchema(rawDb);
  return new MockD1Database(rawDb);
}

export function createShapingTables(): { db: MockD1Database; rawDb: Database.Database } {
  const rawDb = new Database(":memory:");
  rawDb.pragma("journal_mode = WAL");
  rawDb.pragma("foreign_keys = OFF");
  initShapingSchema(rawDb);
  const db = new MockD1Database(rawDb);
  return { db, rawDb };
}
