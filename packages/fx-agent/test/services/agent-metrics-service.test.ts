// F529 Agent Streaming (L1) — AgentMetricsService TDD Red Phase
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { AgentMetricsService } from "../../src/streaming/agent-metrics-service.js";
import type { D1Database } from "@cloudflare/workers-types";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ─── 인메모리 D1 mock (agent_run_metrics 전용) ───

function createTestDb(): D1Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");

  // migration SQL 파일 적용
  const sql = readFileSync(
    join(__dirname, "../../db/migrations/0132_agent_run_metrics.sql"),
    "utf-8",
  );
  db.exec(sql);

  // D1Database shim
  return {
    prepare(query: string) {
      const bindings: unknown[] = [];
      const stmt = {
        bind(...vals: unknown[]) { bindings.push(...vals); return stmt; },
        async first<T>() {
          const s = db.prepare(query);
          const row = s.get(...bindings) as T | undefined;
          return row ?? null;
        },
        async run() {
          const s = db.prepare(query);
          const info = s.run(...bindings);
          return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
        },
        async all<T>() {
          const s = db.prepare(query);
          const rows = s.all(...bindings);
          return { results: rows as T[], success: true, meta: {} };
        },
      };
      return stmt;
    },
    async exec(q: string) { db.exec(q); return { count: 1, duration: 0 }; },
    async batch() { return []; },
    async dump() { return new ArrayBuffer(0); },
  } as unknown as D1Database;
}

// ─── 테스트 ───

describe("F529 AgentMetricsService", () => {
  let db: D1Database;
  let service: AgentMetricsService;

  beforeEach(() => {
    db = createTestDb();
    service = new AgentMetricsService(db);
  });

  describe("createRunning()", () => {
    it("status='running' 행을 삽입하고 UUID를 반환한다", async () => {
      const id = await service.createRunning("sess-001", "planner");

      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);

      const row = await db.prepare("SELECT * FROM agent_run_metrics WHERE id = ?").bind(id).first<{ status: string; agent_id: string }>();
      expect(row).not.toBeNull();
      expect(row!.status).toBe("running");
      expect(row!.agent_id).toBe("planner");
    });

    it("같은 세션에 두 번 호출하면 두 행이 생성된다", async () => {
      const id1 = await service.createRunning("sess-002", "planner");
      const id2 = await service.createRunning("sess-002", "architect");

      expect(id1).not.toBe(id2);

      const all = await db.prepare("SELECT id FROM agent_run_metrics WHERE session_id = ?").bind("sess-002").all<{ id: string }>();
      expect(all.results).toHaveLength(2);
    });
  });

  describe("complete()", () => {
    it("status='completed'로 업데이트하고 토큰/라운드를 저장한다", async () => {
      const id = await service.createRunning("sess-003", "planner");

      await service.complete(id, {
        output: "done",
        stopReason: "end_turn",
        rounds: 3,
        tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      }, 1234);

      const row = await db.prepare("SELECT * FROM agent_run_metrics WHERE id = ?").bind(id).first<Record<string, unknown>>();
      expect(row!.status).toBe("completed");
      expect(row!.rounds).toBe(3);
      expect(row!.input_tokens).toBe(100);
      expect(row!.output_tokens).toBe(50);
      expect(row!.duration_ms).toBe(1234);
      expect(row!.stop_reason).toBe("end_turn");
      expect(row!.finished_at).toBeTruthy();
    });
  });

  describe("getBySessionId()", () => {
    it("세션 ID로 메트릭 목록을 반환한다", async () => {
      const id1 = await service.createRunning("sess-004", "planner");
      const id2 = await service.createRunning("sess-004", "architect");

      const results = await service.getBySessionId("sess-004");

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id)).toContain(id1);
      expect(results.map((r) => r.id)).toContain(id2);
    });

    it("세션에 메트릭이 없으면 빈 배열을 반환한다", async () => {
      const results = await service.getBySessionId("sess-nonexistent");
      expect(results).toEqual([]);
    });
  });

  describe("failRun()", () => {
    it("status='failed'로 업데이트하고 error_msg를 저장한다", async () => {
      const id = await service.createRunning("sess-005", "planner");

      await service.failRun(id, "API rate limit exceeded");

      const row = await db.prepare("SELECT * FROM agent_run_metrics WHERE id = ?").bind(id).first<Record<string, unknown>>();
      expect(row!.status).toBe("failed");
      expect(row!.error_msg).toBe("API rate limit exceeded");
      expect(row!.finished_at).toBeTruthy();
    });
  });
});
