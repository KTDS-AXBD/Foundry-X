/**
 * Work Sessions API tests (F510 M4)
 * WorkService.getSessions + syncSessions
 */
import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { WorkService } from "../services/work.service.js";
import type { Env } from "../env.js";

// ── Minimal D1 mock with agent_sessions schema ─────────────────────────────

class D1PreparedStatement {
  private bindings: unknown[] = [];
  constructor(private db: Database.Database, private query: string) {}

  bind(...values: unknown[]) {
    this.bindings = values;
    return this;
  }

  async first<T = Record<string, unknown>>(col?: string): Promise<T | null> {
    const row = this.db.prepare(this.query).get(...this.bindings) as Record<string, unknown> | undefined;
    if (!row) return null;
    if (col) return (row[col] as T) ?? null;
    return row as T;
  }

  async run() {
    const info = this.db.prepare(this.query).run(...this.bindings);
    return {
      results: [] as unknown[],
      success: true,
      meta: { duration: 0, last_row_id: info.lastInsertRowid, changes: info.changes, served_by: "mock", internal_stats: null },
    };
  }

  async all<T = Record<string, unknown>>() {
    const rows = this.db.prepare(this.query).all(...this.bindings);
    return { results: rows as T[], success: true, meta: { duration: 0, served_by: "mock", internal_stats: null } };
  }
}

class MockSessionsD1 {
  private db: Database.Database;

  constructor() {
    this.db = new Database(":memory:");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_sessions (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'idle',
        profile       TEXT NOT NULL DEFAULT 'coder',
        worktree      TEXT,
        branch        TEXT,
        windows       INTEGER DEFAULT 1,
        last_activity TEXT,
        collected_at  TEXT NOT NULL,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  prepare(query: string) {
    return new D1PreparedStatement(this.db, query);
  }

  async batch(stmts: D1PreparedStatement[]) {
    for (const s of stmts) await s.run();
    return [];
  }

  async exec(query: string) {
    this.db.exec(query);
    return { count: 0, duration: 0 };
  }
}

function makeEnv(db: MockSessionsD1): Env {
  return {
    DB: db as unknown as D1Database,
    GITHUB_TOKEN: "",
    JWT_SECRET: "test",
    GITHUB_REPO: "KTDS-AXBD/Foundry-X",
    CACHE: {} as KVNamespace,
    AI: {} as Ai,
    FILES_BUCKET: {} as R2Bucket,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("WorkService.getSessions", () => {
  let db: MockSessionsD1;

  beforeAll(() => {
    db = new MockSessionsD1();
  });

  it("returns empty list when no sessions", async () => {
    const svc = new WorkService(makeEnv(db));
    const result = await svc.getSessions();
    expect(result.sessions).toEqual([]);
    expect(result.worktrees).toEqual([]);
    expect(result.last_sync).toBeDefined();
  });
});

describe("WorkService.syncSessions", () => {
  let db: MockSessionsD1;

  beforeAll(() => {
    db = new MockSessionsD1();
  });

  const sampleInput = {
    sessions: [
      { name: "sprint-262", status: "busy", profile: "coder", windows: 2, last_activity: 1744450800 },
      { name: "sprint-261", status: "idle", profile: "reviewer", windows: 1, last_activity: 1744447200 },
    ],
    worktrees: [
      { path: "/home/sinclair/work/worktrees/Foundry-X/sprint-262", branch: "refs/heads/sprint/262" },
    ],
    collected_at: "2026-04-12T10:00:00Z",
  };

  it("syncs sessions and returns correct counts", async () => {
    const svc = new WorkService(makeEnv(db));
    const result = await svc.syncSessions(sampleInput);
    expect(result.synced).toBe(2);
    expect(result.removed).toBe(0);
  });

  it("getSessions returns synced data", async () => {
    const svc = new WorkService(makeEnv(db));
    const result = await svc.getSessions();
    expect(result.sessions).toHaveLength(2);

    const busy = result.sessions.find(s => s.name === "sprint-262");
    expect(busy?.status).toBe("busy");
    expect(busy?.profile).toBe("coder");
    expect(busy?.windows).toBe(2);

    const idle = result.sessions.find(s => s.name === "sprint-261");
    expect(idle?.status).toBe("idle");
    expect(idle?.profile).toBe("reviewer");
  });

  it("removes stale sessions on re-sync", async () => {
    const svc = new WorkService(makeEnv(db));

    const result = await svc.syncSessions({
      sessions: [{ name: "sprint-262", status: "busy", profile: "coder", windows: 2, last_activity: 1744450800 }],
      worktrees: [],
      collected_at: "2026-04-12T10:01:00Z",
    });
    expect(result.synced).toBe(1);
    expect(result.removed).toBe(1);

    const list = await svc.getSessions();
    expect(list.sessions).toHaveLength(1);
    expect(list.sessions[0]?.name).toBe("sprint-262");
  });

  it("normalises unknown status to idle", async () => {
    const svc = new WorkService(makeEnv(db));
    await svc.syncSessions({
      sessions: [{ name: "sprint-263", status: "unknown_state", profile: "coder", windows: 1, last_activity: 0 }],
      worktrees: [],
      collected_at: "2026-04-12T10:02:00Z",
    });
    const list = await svc.getSessions();
    const s = list.sessions.find(x => x.name === "sprint-263");
    expect(s?.status).toBe("idle");
  });

  it("normalises unknown profile to unknown", async () => {
    const svc = new WorkService(makeEnv(db));
    await svc.syncSessions({
      sessions: [{ name: "sprint-264", status: "idle", profile: "super-agent", windows: 1, last_activity: 0 }],
      worktrees: [],
      collected_at: "2026-04-12T10:03:00Z",
    });
    const list = await svc.getSessions();
    const s = list.sessions.find(x => x.name === "sprint-264");
    expect(s?.profile).toBe("unknown");
  });

  it("clears all sessions when empty array is synced", async () => {
    const svc = new WorkService(makeEnv(db));
    await svc.syncSessions({
      sessions: [],
      worktrees: [],
      collected_at: "2026-04-12T10:05:00Z",
    });
    const list = await svc.getSessions();
    expect(list.sessions).toHaveLength(0);
  });
});
