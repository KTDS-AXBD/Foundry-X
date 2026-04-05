// ─── F335: TelemetryCollector 테스트 (Sprint 150) ───

import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { TelemetryCollector } from "../services/telemetry-collector.js";
import { EventBus } from "../services/event-bus.js";
import { createTaskEvent } from "@foundry-x/shared";

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
  CREATE INDEX IF NOT EXISTS idx_ee_task ON execution_events(task_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ee_tenant_source ON execution_events(tenant_id, source, created_at DESC);
`;

const TENANT = "org_test";

const exec = (db: D1Database, q: string) =>
  (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);

describe("TelemetryCollector", () => {
  let db: D1Database;
  let collector: TelemetryCollector;
  let eventBus: EventBus;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await exec(db, DDL);
    collector = new TelemetryCollector(db);
    eventBus = new EventBus();
  });

  it("EventBus 구독 → D1 기록", async () => {
    collector.subscribe(eventBus);

    const event = createTaskEvent("hook", "info", "task-1", TENANT, {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 0,
      stderr: "",
    });
    await eventBus.emit(event);

    const result = await collector.getEvents("task-1", TENANT);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.source).toBe("hook");
    expect(result.items[0]!.severity).toBe("info");
  });

  it("직접 record() 호출", async () => {
    const event = createTaskEvent("discriminator", "warning", "task-2", TENANT, {
      type: "discriminator",
      verdict: "CONDITIONAL_PASS",
      score: 0.65,
      feedback: ["Minor issues found"],
    });
    await collector.record(event);

    const result = await collector.getEvents("task-2", TENANT);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.payload).toBeTruthy();
  });

  it("taskId 필터링", async () => {
    const e1 = createTaskEvent("hook", "info", "task-a", TENANT, {
      type: "hook", hookType: "PostToolUse", exitCode: 0, stderr: "",
    });
    const e2 = createTaskEvent("hook", "error", "task-b", TENANT, {
      type: "hook", hookType: "PreToolUse", exitCode: 1, stderr: "blocked",
    });

    await collector.record(e1);
    await collector.record(e2);

    const resultA = await collector.getEvents("task-a", TENANT);
    expect(resultA.items).toHaveLength(1);
    expect(resultA.total).toBe(1);

    const resultB = await collector.getEvents("task-b", TENANT);
    expect(resultB.items).toHaveLength(1);
  });

  it("source 필터링", async () => {
    const e1 = createTaskEvent("hook", "info", "task-3", TENANT, {
      type: "hook", hookType: "PostToolUse", exitCode: 0, stderr: "",
    });
    const e2 = createTaskEvent("ci", "error", "task-3", TENANT, {
      type: "ci", provider: "github", runId: "123", status: "failure",
    });

    await collector.record(e1);
    await collector.record(e2);

    const hookOnly = await collector.getEvents("task-3", TENANT, { source: "hook" });
    expect(hookOnly.items).toHaveLength(1);
    expect(hookOnly.items[0]!.source).toBe("hook");
  });

  it("소스별 집계", async () => {
    const events = [
      createTaskEvent("hook", "info", "t1", TENANT, { type: "hook", hookType: "PostToolUse", exitCode: 0, stderr: "" }),
      createTaskEvent("hook", "error", "t2", TENANT, { type: "hook", hookType: "PreToolUse", exitCode: 1, stderr: "x" }),
      createTaskEvent("ci", "info", "t3", TENANT, { type: "ci", provider: "github", runId: "1", status: "success" }),
    ];
    for (const e of events) await collector.record(e);

    const counts = await collector.getEventCounts(TENANT);
    expect(counts.hook).toBe(2);
    expect(counts.ci).toBe(1);
  });

  it("limit/offset 페이징", async () => {
    for (let i = 0; i < 5; i++) {
      const e = createTaskEvent("hook", "info", "task-page", TENANT, {
        type: "hook", hookType: "PostToolUse", exitCode: 0, stderr: "",
      });
      await collector.record(e);
    }

    const page1 = await collector.getEvents("task-page", TENANT, { limit: 2, offset: 0 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(5);

    const page2 = await collector.getEvents("task-page", TENANT, { limit: 2, offset: 2 });
    expect(page2.items).toHaveLength(2);
  });

  it("빈 결과", async () => {
    const result = await collector.getEvents("nonexistent", TENANT);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("unsubscribe 후 기록 중단", async () => {
    const unsub = collector.subscribe(eventBus);
    const e1 = createTaskEvent("hook", "info", "task-unsub", TENANT, {
      type: "hook", hookType: "PostToolUse", exitCode: 0, stderr: "",
    });
    await eventBus.emit(e1);

    unsub();

    const e2 = createTaskEvent("hook", "info", "task-unsub", TENANT, {
      type: "hook", hookType: "PostToolUse", exitCode: 0, stderr: "",
    });
    await eventBus.emit(e2);

    const result = await collector.getEvents("task-unsub", TENANT);
    expect(result.items).toHaveLength(1);
  });
});
