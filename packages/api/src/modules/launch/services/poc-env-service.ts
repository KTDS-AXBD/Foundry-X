/**
 * Sprint 67: F209 — PoC 환경 관리 서비스
 * 상태 머신: pending → provisioning → ready → teardown → terminated
 *                         ↓ (실패)
 *                       failed
 */

export type PocEnvStatus = "pending" | "provisioning" | "ready" | "teardown" | "terminated" | "failed";

export interface PocEnvironment {
  id: string;
  prototypeId: string;
  status: PocEnvStatus;
  config: Record<string, unknown>;
  provisionedAt: string | null;
  terminatedAt: string | null;
  createdAt: string;
}

interface PocEnvRow {
  id: string;
  prototype_id: string;
  status: string;
  config: string;
  provisioned_at: string | null;
  terminated_at: string | null;
  created_at: string;
  updated_at: string;
}

function toEnv(row: PocEnvRow): PocEnvironment {
  return {
    id: row.id,
    prototypeId: row.prototype_id,
    status: row.status as PocEnvStatus,
    config: JSON.parse(row.config || "{}") as Record<string, unknown>,
    provisionedAt: row.provisioned_at,
    terminatedAt: row.terminated_at,
    createdAt: row.created_at,
  };
}

export class PocEnvService {
  constructor(private db: D1Database) {}

  async provision(prototypeId: string, tenantId: string, config?: Record<string, unknown>): Promise<PocEnvironment> {
    // 1. Verify prototype exists and belongs to tenant
    const proto = await this.db.prepare(
      `SELECT p.id FROM prototypes p
       JOIN biz_items bi ON p.biz_item_id = bi.id
       WHERE p.id = ? AND bi.org_id = ?`
    ).bind(prototypeId, tenantId).first();
    if (!proto) throw new Error("Prototype not found");

    // 2. Check for existing environment
    const existing = await this.db.prepare(
      "SELECT id, status FROM poc_environments WHERE prototype_id = ?"
    ).bind(prototypeId).first<{ id: string; status: string }>();

    if (existing) {
      if (existing.status !== "terminated" && existing.status !== "failed") {
        throw new Error("Active PoC environment already exists");
      }
      // Remove old terminated/failed record to allow re-provision
      await this.db.prepare("DELETE FROM poc_environments WHERE id = ?").bind(existing.id).run();
    }

    // 3. Create new environment
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const configJson = JSON.stringify(config ?? {});

    await this.db.prepare(
      `INSERT INTO poc_environments (id, prototype_id, status, config, created_at, updated_at)
       VALUES (?, ?, 'pending', ?, ?, ?)`
    ).bind(id, prototypeId, configJson, now, now).run();

    return {
      id,
      prototypeId,
      status: "pending",
      config: config ?? {},
      provisionedAt: null,
      terminatedAt: null,
      createdAt: now,
    };
  }

  async getByPrototype(prototypeId: string, tenantId: string): Promise<PocEnvironment | null> {
    const row = await this.db.prepare(
      `SELECT pe.* FROM poc_environments pe
       JOIN prototypes p ON pe.prototype_id = p.id
       JOIN biz_items bi ON p.biz_item_id = bi.id
       WHERE pe.prototype_id = ? AND bi.org_id = ?`
    ).bind(prototypeId, tenantId).first<PocEnvRow>();
    return row ? toEnv(row) : null;
  }

  async teardown(prototypeId: string, tenantId: string): Promise<void> {
    // Verify access
    const env = await this.getByPrototype(prototypeId, tenantId);
    if (!env) throw new Error("PoC environment not found");
    if (env.status === "terminated" || env.status === "failed") {
      throw new Error("Environment already terminated");
    }

    const now = new Date().toISOString();
    await this.db.prepare(
      "UPDATE poc_environments SET status = 'terminated', terminated_at = ?, updated_at = ? WHERE prototype_id = ?"
    ).bind(now, now, prototypeId).run();
  }
}
