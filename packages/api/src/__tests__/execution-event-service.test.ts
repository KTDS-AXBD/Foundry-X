// ─── F334: ExecutionEventService D1 테스트 (Sprint 149) ───

import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { ExecutionEventService } from "../agent/services/execution-event-service.js";
import { createTaskEvent } from "@foundry-x/shared";
import type { HookEventPayload, CIEventPayload } from "@foundry-x/shared";

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

const exec = (db: D1Database, q: string) =>
  (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);

describe("ExecutionEventService", () => {
  let db: D1Database;
  let svc: ExecutionEventService;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await exec(db, DDL);
    svc = new ExecutionEventService(db);
  });

  it("record()로 이벤트 저장", async () => {
    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 1,
      stderr: "error",
    };
    const event = createTaskEvent("hook", "error", "task-1", "org-1", payload);
    await svc.record(event);

    const result = await svc.listByTask("task-1", "org-1");
    expect(result.total).toBe(1);
    expect(result.items[0]!.id).toBe(event.id);
    expect(result.items[0]!.source).toBe("hook");
  });

  it("listByTask — 태스크별 조회", async () => {
    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 0,
      stderr: "",
    };
    await svc.record(createTaskEvent("hook", "info", "task-1", "org-1", payload));
    await svc.record(createTaskEvent("hook", "error", "task-1", "org-1", payload));
    await svc.record(createTaskEvent("hook", "info", "task-2", "org-1", payload));

    const result = await svc.listByTask("task-1", "org-1");
    expect(result.total).toBe(2);
    expect(result.items.every((i) => i.taskId === "task-1")).toBe(true);
  });

  it("listBySource — 소스별 조회", async () => {
    const hookPayload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 0,
      stderr: "",
    };
    const ciPayload: CIEventPayload = {
      type: "ci",
      provider: "github",
      runId: "run-1",
      status: "success",
    };
    await svc.record(createTaskEvent("hook", "info", "task-1", "org-1", hookPayload));
    await svc.record(createTaskEvent("ci", "info", "task-1", "org-1", ciPayload));

    const result = await svc.listBySource("org-1", "hook");
    expect(result.total).toBe(1);
    expect(result.items[0]!.source).toBe("hook");
  });

  it("pagination (limit/offset)", async () => {
    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 0,
      stderr: "",
    };
    for (let i = 0; i < 5; i++) {
      await svc.record(createTaskEvent("hook", "info", "task-1", "org-1", payload));
    }

    const page1 = await svc.listByTask("task-1", "org-1", 2, 0);
    expect(page1.items.length).toBe(2);
    expect(page1.total).toBe(5);

    const page2 = await svc.listByTask("task-1", "org-1", 2, 2);
    expect(page2.items.length).toBe(2);
  });

  it("빈 결과 반환", async () => {
    const result = await svc.listByTask("nonexistent", "org-1");
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("tenant 격리 — 다른 tenant의 이벤트 안 보임", async () => {
    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 0,
      stderr: "",
    };
    await svc.record(createTaskEvent("hook", "info", "task-1", "org-1", payload));
    await svc.record(createTaskEvent("hook", "info", "task-1", "org-2", payload));

    const result = await svc.listByTask("task-1", "org-1");
    expect(result.total).toBe(1);
  });

  it("payload가 JSON 문자열로 저장됨", async () => {
    const payload: HookEventPayload = {
      type: "hook",
      hookType: "PostToolUse",
      exitCode: 1,
      stderr: "lint error",
      filePath: "src/app.ts",
    };
    await svc.record(createTaskEvent("hook", "error", "task-1", "org-1", payload));

    const result = await svc.listByTask("task-1", "org-1");
    const parsed = JSON.parse(result.items[0]!.payload);
    expect(parsed.type).toBe("hook");
    expect(parsed.filePath).toBe("src/app.ts");
  });
});
