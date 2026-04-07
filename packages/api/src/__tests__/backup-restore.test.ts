import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { backupRestoreRoute } from "../core/harness/routes/backup-restore.js";
import { BackupRestoreService } from "../core/harness/services/backup-restore-service.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTestApp(db: any, role = "admin") {
  const app = new Hono();
  app.use("*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).env = { DB: db };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.set("orgId" as any, "org_test");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.set("orgRole" as any, role);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.set("userId" as any, "test-user");
    await next();
  });
  app.route("/api", backupRestoreRoute);
  return app;
}

function post(app: Hono, path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function json(res: Response): Promise<any> {
  return res.json();
}

async function seedArtifact(db: ReturnType<typeof createMockD1>, bizItemId = "biz-1") {
  const id = crypto.randomUUID();
  await (db as unknown as D1Database).prepare(
    `INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, tokens_used, duration_ms, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, "org_test", bizItemId, "skill-1", "2-0", 1, "input", "output", "claude", 100, 500, "completed", "test-user").run();
  return id;
}

async function seedPipelineRun(db: ReturnType<typeof createMockD1>, bizItemId = "biz-1") {
  const id = crypto.randomUUID();
  await (db as unknown as D1Database).prepare(
    `INSERT INTO discovery_pipeline_runs (id, tenant_id, biz_item_id, status, created_by)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(id, "org_test", bizItemId, "discovery_running", "test-user").run();
  return id;
}

async function seedCheckpoint(db: ReturnType<typeof createMockD1>, runId: string) {
  const id = crypto.randomUUID();
  await (db as unknown as D1Database).prepare(
    `INSERT INTO pipeline_checkpoints (id, pipeline_run_id, step_id, checkpoint_type, status)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(id, runId, "2-1", "viability", "pending").run();
  return id;
}

async function seedEvent(db: ReturnType<typeof createMockD1>, runId: string) {
  const id = crypto.randomUUID();
  await (db as unknown as D1Database).prepare(
    `INSERT INTO pipeline_events (id, pipeline_run_id, event_type, step_id)
     VALUES (?, ?, ?, ?)`,
  ).bind(id, runId, "START", "2-0").run();
  return id;
}

describe("backup-restore (F317)", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: Hono;

  beforeEach(() => {
    db = createMockD1();
    app = createTestApp(db);
  });

  // 1. Export full — 전체 org 데이터 직렬화
  it("exports full org backup with all tables", async () => {
    const runId = await seedPipelineRun(db);
    await seedArtifact(db);
    await seedCheckpoint(db, runId);
    await seedEvent(db, runId);

    const res = await post(app, "/api/backup/export", { scope: "full" });
    expect(res.status).toBe(201);

    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.backupType).toBe("manual");
    expect(body.scope).toBe("full");
    expect(body.itemCount).toBe(4); // 1 artifact + 1 run + 1 checkpoint + 1 event
    expect(body.sizeBytes).toBeGreaterThan(0);
    expect(body.tablesIncluded).toEqual([
      "bd_artifacts",
      "discovery_pipeline_runs",
      "pipeline_checkpoints",
      "pipeline_events",
    ]);
  });

  // 2. Export item — 특정 biz_item_id 범위
  it("exports item-scoped backup filtering by bizItemId", async () => {
    await seedArtifact(db, "biz-1");
    await seedArtifact(db, "biz-2"); // different item
    await seedPipelineRun(db, "biz-1");

    const res = await post(app, "/api/backup/export", {
      scope: "item",
      bizItemId: "biz-1",
    });
    expect(res.status).toBe(201);

    const body = await json(res);
    expect(body.scope).toBe("item");
    expect(body.bizItemId).toBe("biz-1");
    // Should have 1 artifact (biz-1) + 1 run — not the biz-2 artifact
    expect(body.itemCount).toBe(2);
  });

  // 3. Import merge — 기존 데이터 보존
  it("imports with merge strategy preserving existing data", async () => {
    // Create some data and export
    await seedArtifact(db);
    const runId = await seedPipelineRun(db);
    await seedCheckpoint(db, runId);

    const exportRes = await post(app, "/api/backup/export", { scope: "full" });
    const backup = await json(exportRes);

    // Import the same backup — should skip all (already exists)
    const importRes = await post(app, "/api/backup/import", {
      backupId: backup.id,
      strategy: "merge",
    });
    expect(importRes.status).toBe(200);

    const result = await json(importRes);
    expect(result.skipped).toBeGreaterThanOrEqual(3); // all already exist
    expect(result.inserted).toBe(0);
  });

  // 4. Import replace — scope 내 데이터 교체
  it("imports with replace strategy replacing existing data", async () => {
    await seedArtifact(db);
    const runId = await seedPipelineRun(db);
    await seedCheckpoint(db, runId);

    const exportRes = await post(app, "/api/backup/export", { scope: "full" });
    const backup = await json(exportRes);

    const importRes = await post(app, "/api/backup/import", {
      backupId: backup.id,
      strategy: "replace",
    });
    expect(importRes.status).toBe(200);

    const result = await json(importRes);
    expect(result.inserted).toBeGreaterThanOrEqual(3); // re-inserted
  });

  // 5. Export-Import 라운드트립
  it("round-trips data through export and import", async () => {
    const artifactId = await seedArtifact(db);
    const runId = await seedPipelineRun(db);
    await seedCheckpoint(db, runId);

    // Export
    const exportRes = await post(app, "/api/backup/export", { scope: "full" });
    const backup = await json(exportRes);

    // Delete originals
    await (db as unknown as D1Database).prepare("DELETE FROM bd_artifacts WHERE id = ?").bind(artifactId).run();
    await (db as unknown as D1Database).prepare("DELETE FROM pipeline_checkpoints WHERE pipeline_run_id = ?").bind(runId).run();
    await (db as unknown as D1Database).prepare("DELETE FROM discovery_pipeline_runs WHERE id = ?").bind(runId).run();

    // Import to restore
    const importRes = await post(app, "/api/backup/import", {
      backupId: backup.id,
      strategy: "merge",
    });
    const result = await json(importRes);
    expect(result.inserted).toBe(3);

    // Verify restored
    const restored = await (db as unknown as D1Database)
      .prepare("SELECT id FROM bd_artifacts WHERE id = ?")
      .bind(artifactId)
      .first();
    expect(restored).not.toBeNull();
  });

  // 6. 빈 데이터 Export
  it("exports empty backup with zero items", async () => {
    const res = await post(app, "/api/backup/export", { scope: "full" });
    expect(res.status).toBe(201);

    const body = await json(res);
    expect(body.itemCount).toBe(0);
    expect(body.sizeBytes).toBeGreaterThan(0); // JSON envelope still has bytes
  });

  // 7. 존재하지 않는 backup Import → 404
  it("returns 404 when importing non-existent backup", async () => {
    const res = await post(app, "/api/backup/import", {
      backupId: "non-existent-id",
      strategy: "merge",
    });
    expect(res.status).toBe(404);
  });

  // 8. 권한 체크 — member가 export 시도 → 403
  it("returns 403 when member tries to export", async () => {
    const memberApp = createTestApp(db, "member");
    const res = await post(memberApp, "/api/backup/export", { scope: "full" });
    expect(res.status).toBe(403);
  });

  // 9. autoBackup + 7일 자동 삭제
  it("auto backup creates backup and cleans old ones", async () => {
    const service = new BackupRestoreService(db as unknown as D1Database);

    // Create an old auto backup (simulate 8 days ago)
    await service.exportBackup({
      tenantId: "org_test",
      backupType: "auto",
      scope: "full",
      createdBy: "system:cron",
    });

    // Backdating the old backup
    await (db as unknown as D1Database).prepare(
      "UPDATE backup_metadata SET created_at = datetime('now', '-8 days') WHERE backup_type = 'auto'",
    ).run();

    // Run auto backup — should create new + delete old
    const newBackup = await service.autoBackup("org_test");
    expect(newBackup.backupType).toBe("auto");

    // Old one should be deleted
    const { items } = await service.list("org_test", { limit: 100, offset: 0 });
    const autoBackups = items.filter((b) => b.backupType === "auto");
    expect(autoBackups.length).toBe(1);
    expect(autoBackups[0]!.id).toBe(newBackup.id);
  });

  // 10. 백업 목록 + 페이지네이션
  it("lists backups with pagination", async () => {
    // Create 3 backups
    for (let i = 0; i < 3; i++) {
      await post(app, "/api/backup/export", { scope: "full" });
    }

    // Get first page
    const res1 = await app.request("/api/backup/list?limit=2");
    expect(res1.status).toBe(200);
    const body1 = await json(res1);
    expect(body1.items.length).toBe(2);
    expect(body1.total).toBe(3);

    // Get second page
    const res2 = await app.request("/api/backup/list?limit=2&offset=2");
    const body2 = await json(res2);
    expect(body2.items.length).toBe(1);
  });
});
