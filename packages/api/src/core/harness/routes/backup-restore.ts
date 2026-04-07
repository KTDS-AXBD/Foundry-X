/**
 * F317: Backup/Restore Routes — 5 EP
 * Export + Import + List + Detail + Delete
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { roleGuard } from "../../../middleware/role-guard.js";
import { BackupRestoreService } from "../services/backup-restore-service.js";
import { backupCreateSchema, backupImportSchema, backupListQuerySchema } from "../schemas/backup-restore.js";

export const backupRestoreRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// 1) POST /backup/export — 백업 생성 (admin only)
backupRestoreRoute.post("/backup/export", roleGuard("admin"), async (c) => {
  const body = await c.req.json();
  const parsed = backupCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { backupType, scope, bizItemId } = parsed.data;
  if (scope === "item" && !bizItemId) {
    return c.json({ error: "bizItemId is required for item-scoped backup" }, 400);
  }

  const service = new BackupRestoreService(c.env.DB);
  const backup = await service.exportBackup({
    tenantId: c.get("orgId"),
    backupType,
    scope,
    bizItemId,
    createdBy: c.get("userId"),
  });

  return c.json(backup, 201);
});

// 2) POST /backup/import — 백업 복원 (admin only)
backupRestoreRoute.post("/backup/import", roleGuard("admin"), async (c) => {
  const body = await c.req.json();
  const parsed = backupImportSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const service = new BackupRestoreService(c.env.DB);
  try {
    const result = await service.importBackup({
      tenantId: c.get("orgId"),
      backupId: parsed.data.backupId,
      strategy: parsed.data.strategy,
    });
    return c.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Backup not found") {
      return c.json({ error: "Backup not found" }, 404);
    }
    throw err;
  }
});

// 3) GET /backup/list — 백업 목록 (member+)
backupRestoreRoute.get("/backup/list", async (c) => {
  const parsed = backupListQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const service = new BackupRestoreService(c.env.DB);
  const result = await service.list(c.get("orgId"), parsed.data);
  return c.json(result);
});

// 4) GET /backup/:id — 백업 상세
backupRestoreRoute.get("/backup/:id", async (c) => {
  const service = new BackupRestoreService(c.env.DB);
  const backup = await service.getById(c.get("orgId"), c.req.param("id"));
  if (!backup) {
    return c.json({ error: "Backup not found" }, 404);
  }
  return c.json(backup);
});

// 5) DELETE /backup/:id — 백업 삭제 (admin only)
backupRestoreRoute.delete("/backup/:id", roleGuard("admin"), async (c) => {
  const service = new BackupRestoreService(c.env.DB);
  const deleted = await service.delete(c.get("orgId"), c.req.param("id") ?? "");
  if (!deleted) {
    return c.json({ error: "Backup not found" }, 404);
  }
  return c.json({ success: true });
});
