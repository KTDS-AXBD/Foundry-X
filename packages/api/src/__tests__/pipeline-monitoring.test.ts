import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { pipelineMonitoringRoute } from "../modules/launch/routes/pipeline-monitoring.js";
import { discoveryPipelineRoute } from "../core/discovery/routes/discovery-pipeline.js";
import { PipelinePermissionService } from "../modules/launch/services/pipeline-permission-service.js";
import { PipelineNotificationService } from "../modules/launch/services/pipeline-notification-service.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTestApp(db: any, role = "admin") {
  const app = new Hono();
  app.use("*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).env = { DB: db, ANTHROPIC_API_KEY: "test-key" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.set("orgId" as any, "org_test");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.set("orgRole" as any, role);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.set("jwtPayload" as any, { sub: "test-user", role });
    await next();
  });
  app.route("/api", pipelineMonitoringRoute);
  app.route("/api", discoveryPipelineRoute);
  return app;
}

function post(app: Hono, path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function put(app: Hono, path: string, body: unknown) {
  return app.request(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function json(res: Response): Promise<any> {
  return res.json();
}

async function seedRun(db: ReturnType<typeof createMockD1>, status = "discovery_running") {
  const id = crypto.randomUUID();
  await (db as unknown as D1Database).prepare(
    `INSERT INTO discovery_pipeline_runs (id, tenant_id, biz_item_id, status, created_by)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(id, "org_test", "biz-1", status, "test-user").run();
  return id;
}

async function seedBizItem(db: ReturnType<typeof createMockD1>) {
  await (db as unknown as D1Database).prepare(
    `INSERT INTO biz_items (id, title, type, status, tenant_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  ).bind("biz-1", "Test Item", "idea", "active", "org_test", "test-user").run();
}

async function seedTenantMember(db: ReturnType<typeof createMockD1>, userId: string, role: string) {
  const id = crypto.randomUUID();
  await (db as unknown as D1Database).prepare(
    `INSERT INTO tenant_members (id, tenant_id, user_id, role, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
  ).bind(id, "org_test", userId, role).run();
}

describe("pipeline-monitoring (F315)", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: Hono;

  beforeEach(async () => {
    db = createMockD1();
    app = createTestApp(db);
    await seedBizItem(db);
  });

  // ── Dashboard ──

  it("GET /dashboard returns summary and runs", async () => {
    await seedRun(db, "discovery_running");
    await seedRun(db, "failed");

    const res = await app.request("/api/discovery-pipeline/dashboard");
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.summary.discovery_running).toBe(1);
    expect(body.summary.failed).toBe(1);
    expect(body.runs).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("GET /dashboard filters by status", async () => {
    await seedRun(db, "discovery_running");
    await seedRun(db, "failed");

    const res = await app.request("/api/discovery-pipeline/dashboard?status=failed");
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.runs).toHaveLength(1);
    expect(body.runs[0].status).toBe("failed");
  });

  // ── Permissions ──

  it("PUT /permissions creates permission (admin)", async () => {
    const runId = await seedRun(db);

    const res = await put(app, `/api/discovery-pipeline/runs/${runId}/permissions`, {
      minRole: "member",
      canApprove: true,
      canAbort: false,
    });
    expect(res.status).toBe(201);

    const body = await json(res);
    expect(body.minRole).toBe("member");
    expect(body.canApprove).toBe(true);
  });

  it("PUT /permissions requires admin role", async () => {
    const viewerApp = createTestApp(db, "viewer");
    const runId = await seedRun(db);

    const res = await put(viewerApp, `/api/discovery-pipeline/runs/${runId}/permissions`, {
      minRole: "member",
    });
    expect(res.status).toBe(403);
  });

  it("GET /permissions lists permissions", async () => {
    const runId = await seedRun(db);
    const svc = new PipelinePermissionService(db as unknown as D1Database);
    await svc.setPermission(runId, { minRole: "member", canApprove: true, canAbort: false }, "test-user");

    const res = await app.request(`/api/discovery-pipeline/runs/${runId}/permissions`);
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.permissions).toHaveLength(1);
  });

  // ── Permission Service ──

  it("admin can always approve", async () => {
    const runId = await seedRun(db);
    const svc = new PipelinePermissionService(db as unknown as D1Database);
    expect(await svc.canApprove(runId, "any-user", "admin")).toBe(true);
  });

  it("viewer cannot approve by default", async () => {
    const runId = await seedRun(db);
    const svc = new PipelinePermissionService(db as unknown as D1Database);
    expect(await svc.canApprove(runId, "viewer-user", "viewer")).toBe(false);
  });

  it("member can approve by default (no explicit permission)", async () => {
    const runId = await seedRun(db);
    const svc = new PipelinePermissionService(db as unknown as D1Database);
    expect(await svc.canApprove(runId, "member-user", "member")).toBe(true);
  });

  it("abort requires admin or creator", async () => {
    const runId = await seedRun(db);
    const svc = new PipelinePermissionService(db as unknown as D1Database);

    // admin can abort
    expect(await svc.canAbort(runId, "admin-user", "admin")).toBe(true);
    // creator can abort
    expect(await svc.canAbort(runId, "test-user", "member")).toBe(true);
    // other member cannot
    expect(await svc.canAbort(runId, "other-member", "member")).toBe(false);
  });

  // ── Notification Service ──

  it("notifyStepFailed creates notification for creator", async () => {
    const runId = await seedRun(db);
    const notifSvc = new PipelineNotificationService(db as unknown as D1Database);

    await notifSvc.notifyStepFailed(runId, "2-3", "test error", "org_test");

    const result = await (db as unknown as D1Database)
      .prepare("SELECT * FROM notifications WHERE type = 'pipeline_step_failed'")
      .all();
    expect(result.results.length).toBe(1);
    expect((result.results[0] as Record<string, unknown>).recipient_id).toBe("test-user");
  });

  it("duplicate notifications within 5min are blocked", async () => {
    const runId = await seedRun(db);
    const notifSvc = new PipelineNotificationService(db as unknown as D1Database);

    await notifSvc.notifyStepFailed(runId, "2-3", "error1", "org_test");
    await notifSvc.notifyStepFailed(runId, "2-3", "error2", "org_test");

    const result = await (db as unknown as D1Database)
      .prepare("SELECT * FROM notifications WHERE type = 'pipeline_step_failed'")
      .all();
    expect(result.results.length).toBe(1);
  });

  it("notifyCheckpointPending sends to approvers", async () => {
    const runId = await seedRun(db);
    await seedTenantMember(db, "admin-user", "admin");

    const notifSvc = new PipelineNotificationService(db as unknown as D1Database);
    await notifSvc.notifyCheckpointPending(runId, "2-5", "org_test");

    const result = await (db as unknown as D1Database)
      .prepare("SELECT * FROM notifications WHERE type = 'pipeline_checkpoint_pending'")
      .all();
    // admin-user + test-user (creator)
    expect(result.results.length).toBeGreaterThanOrEqual(1);
  });

  // ── Audit Log ──

  it("GET /audit-log returns checkpoint decisions", async () => {
    const runId = await seedRun(db);

    // Seed a decided checkpoint
    await (db as unknown as D1Database).prepare(
      `INSERT INTO pipeline_checkpoints (id, pipeline_run_id, step_id, checkpoint_type, status, decided_by, decided_at, approver_role)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
    ).bind("cp-1", runId, "2-5", "commit_gate", "approved", "test-user", "admin").run();

    const res = await app.request(`/api/discovery-pipeline/runs/${runId}/audit-log`);
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.checkpointDecisions).toHaveLength(1);
    expect(body.checkpointDecisions[0].approverRole).toBe("admin");
  });
});
