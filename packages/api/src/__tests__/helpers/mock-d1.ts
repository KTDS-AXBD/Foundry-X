/**
 * D1Database shim over better-sqlite3 for testing.
 * Implements the Cloudflare D1Database interface using an in-memory SQLite database.
 */
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
  private db: Database.Database;

  constructor() {
    this.db = new Database(":memory:");
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = OFF");
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        password_hash TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        repo_url TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        last_sync_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS wiki_pages (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        file_path TEXT,
        ownership_marker TEXT NOT NULL DEFAULT 'human',
        updated_by TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS token_usage (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd REAL NOT NULL DEFAULT 0,
        recorded_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agent_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        branch TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        progress REAL DEFAULT 0,
        current_task TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT
      );
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        jti TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS agent_capabilities (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        tools TEXT NOT NULL DEFAULT '[]',
        allowed_paths TEXT NOT NULL DEFAULT '[]',
        max_concurrency INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS agent_constraints (
        id TEXT PRIMARY KEY,
        tier TEXT NOT NULL,
        action TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        enforcement_mode TEXT NOT NULL DEFAULT 'block'
      );
      CREATE TABLE IF NOT EXISTS agent_tasks (
        id TEXT PRIMARY KEY,
        agent_session_id TEXT NOT NULL,
        branch TEXT NOT NULL,
        pr_number INTEGER,
        pr_status TEXT NOT NULL DEFAULT 'draft',
        sdd_verified INTEGER NOT NULL DEFAULT 0,
        task_type TEXT,
        result TEXT,
        tokens_used INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        runner_type TEXT DEFAULT 'claude-api',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        server_url TEXT NOT NULL,
        transport_type TEXT NOT NULL DEFAULT 'sse' CHECK (transport_type IN ('sse', 'http')),
        api_key_encrypted TEXT,
        status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
        last_connected_at TEXT,
        error_message TEXT,
        tools_cache TEXT,
        tools_cached_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status);
      CREATE TABLE IF NOT EXISTS spec_conflicts (
        id TEXT PRIMARY KEY,
        new_spec_title TEXT NOT NULL,
        existing_spec_id TEXT,
        conflict_type TEXT NOT NULL CHECK(conflict_type IN ('direct', 'dependency', 'priority', 'scope')),
        severity TEXT NOT NULL CHECK(severity IN ('critical', 'warning', 'info')),
        description TEXT NOT NULL,
        suggestion TEXT,
        resolution TEXT CHECK(resolution IN ('accept', 'reject', 'modify')),
        resolved_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT
      );
    `);
  }

  prepare(query: string) {
    return new MockD1PreparedStatement(this.db, query);
  }

  async batch(statements: MockD1PreparedStatement[]) {
    return Promise.all(statements.map((s) => s.all()));
  }

  async exec(query: string) {
    this.db.exec(query);
    return { count: 1, duration: 0 };
  }

  async dump() {
    return new ArrayBuffer(0);
  }
}

export function createMockD1(): MockD1Database {
  return new MockD1Database();
}
