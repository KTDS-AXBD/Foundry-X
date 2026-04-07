// ─── F357: DataDiagnosticService 테스트 (Sprint 161) ───

import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { DataDiagnosticService } from "../core/harness/services/data-diagnostic-service.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS execution_events (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    source TEXT NOT NULL,
    severity TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS task_state_history (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    from_state TEXT NOT NULL,
    to_state TEXT NOT NULL,
    trigger_source TEXT,
    trigger_event TEXT,
    guard_result TEXT,
    transitioned_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const exec = (db: D1Database, q: string) =>
  (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);

const T = "org-test";

describe("DataDiagnosticService", () => {
  let db: D1Database;
  let svc: DataDiagnosticService;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await exec(db, DDL);
    svc = new DataDiagnosticService(db);
  });

  it("빈 DB — totalEvents=0, isDataSufficient=false", async () => {
    const result = await svc.diagnose(T);
    expect(result.totalEvents).toBe(0);
    expect(result.totalFailedTransitions).toBe(0);
    expect(result.isDataSufficient).toBe(false);
    expect(result.earliestEvent).toBeNull();
    expect(result.sourceDistribution).toEqual({});
  });

  it("충분한 데이터 — 분포 정확, isDataSufficient=true", async () => {
    // 10건 + 8일 분산 삽입
    for (let i = 0; i < 10; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString();
      const source = i % 2 === 0 ? "hook" : "agent";
      const severity = i < 3 ? "error" : "info";
      await db
        .prepare(
          `INSERT INTO execution_events (id, task_id, tenant_id, source, severity, payload, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(`ev-${i}`, `task-1`, T, source, severity, "{}", date)
        .run();
    }

    // FAILED 전이 2건
    await db
      .prepare(
        `INSERT INTO task_state_history (id, task_id, tenant_id, from_state, to_state, trigger_source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .bind("tsh-1", "task-1", T, "RUNNING", "FAILED", "hook")
      .run();
    await db
      .prepare(
        `INSERT INTO task_state_history (id, task_id, tenant_id, from_state, to_state, trigger_source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .bind("tsh-2", "task-2", T, "RUNNING", "FAILED", "agent")
      .run();

    const result = await svc.diagnose(T);
    expect(result.totalEvents).toBe(10);
    expect(result.isDataSufficient).toBe(true);
    expect(result.totalFailedTransitions).toBe(2);
    expect(result.sourceDistribution["hook"]).toBe(5);
    expect(result.sourceDistribution["agent"]).toBe(5);
    expect(result.severityDistribution["error"]).toBe(3);
    expect(result.severityDistribution["info"]).toBe(7);
    expect(result.failedTransitionsBySource["hook"]).toBe(1);
    expect(result.failedTransitionsBySource["agent"]).toBe(1);
    expect(result.dataCoverageDays).toBeGreaterThanOrEqual(7);
  });

  it("기간 부족 — 10건이지만 같은 날 → isDataSufficient=false", async () => {
    const now = new Date().toISOString();
    for (let i = 0; i < 10; i++) {
      await db
        .prepare(
          `INSERT INTO execution_events (id, task_id, tenant_id, source, severity, payload, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(`ev-${i}`, `task-1`, T, "hook", "info", "{}", now)
        .run();
    }

    const result = await svc.diagnose(T);
    expect(result.totalEvents).toBe(10);
    expect(result.dataCoverageDays).toBe(0);
    expect(result.isDataSufficient).toBe(false);
  });
});
