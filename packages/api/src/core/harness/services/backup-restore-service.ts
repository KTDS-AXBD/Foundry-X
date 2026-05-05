/**
 * F317: BackupRestoreService — Discovery 파이프라인 데이터 Export/Import + 자동 백업
 */

import type { BackupMeta, BackupListQuery, ImportResult } from "../schemas/backup-restore.js";
import {
  queryPipelineRunsByBizItem,
  queryPipelineRunsByTenant,
  queryPipelineCheckpointsByTenant,
  queryPipelineEventsByTenant,
} from "../../discovery/types.js";

interface BackupRow {
  id: string;
  tenant_id: string;
  backup_type: string;
  scope: string;
  biz_item_id: string | null;
  tables_included: string;
  item_count: number;
  size_bytes: number;
  payload: string;
  created_by: string;
  created_at: string;
}

interface BackupPayload {
  version: 1;
  exportedAt: string;
  tenantId: string;
  scope: string;
  bizItemId?: string;
  data: {
    bd_artifacts: Record<string, unknown>[];
    discovery_pipeline_runs: Record<string, unknown>[];
    pipeline_checkpoints: Record<string, unknown>[];
    pipeline_events: Record<string, unknown>[];
  };
}

const BACKUP_TABLES = [
  "bd_artifacts",
  "discovery_pipeline_runs",
  "pipeline_checkpoints",
  "pipeline_events",
] as const;

const AUTO_RETENTION_DAYS = 7;

function rowToMeta(row: BackupRow): BackupMeta {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    backupType: row.backup_type as BackupMeta["backupType"],
    scope: row.scope as BackupMeta["scope"],
    bizItemId: row.biz_item_id,
    tablesIncluded: JSON.parse(row.tables_included),
    itemCount: row.item_count,
    sizeBytes: row.size_bytes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class BackupRestoreService {
  constructor(private db: D1Database) {}

  async exportBackup(input: {
    tenantId: string;
    backupType: "manual" | "auto" | "pre_deploy";
    scope: "full" | "item";
    bizItemId?: string;
    createdBy: string;
  }): Promise<BackupMeta> {
    const { tenantId, backupType, scope, bizItemId, createdBy } = input;

    const data: BackupPayload["data"] = {
      bd_artifacts: [],
      discovery_pipeline_runs: [],
      pipeline_checkpoints: [],
      pipeline_events: [],
    };

    // Collect data from each table
    if (scope === "item" && bizItemId) {
      // Item-scoped: filter by biz_item_id where applicable
      const { results: artifacts } = await this.db
        .prepare("SELECT * FROM bd_artifacts WHERE org_id = ? AND biz_item_id = ?")
        .bind(tenantId, bizItemId)
        .all();
      data.bd_artifacts = artifacts;

      const runs = await queryPipelineRunsByBizItem(this.db, tenantId, bizItemId);
      data.discovery_pipeline_runs = runs;

      // Checkpoints + events by pipeline_run_id (pipeline_checkpoints/events are shared tables)
      const runIds = runs.map((r) => r.id as string);
      if (runIds.length > 0) {
        const placeholders = runIds.map(() => "?").join(",");
        const { results: checkpoints } = await this.db
          .prepare(`SELECT * FROM pipeline_checkpoints WHERE pipeline_run_id IN (${placeholders})`)
          .bind(...runIds)
          .all();
        data.pipeline_checkpoints = checkpoints;

        const { results: events } = await this.db
          .prepare(`SELECT * FROM pipeline_events WHERE pipeline_run_id IN (${placeholders})`)
          .bind(...runIds)
          .all();
        data.pipeline_events = events;
      }
    } else {
      // Full-scoped: all data for this tenant
      const { results: artifacts } = await this.db
        .prepare("SELECT * FROM bd_artifacts WHERE org_id = ?")
        .bind(tenantId)
        .all();
      data.bd_artifacts = artifacts;

      data.discovery_pipeline_runs = await queryPipelineRunsByTenant(this.db, tenantId);
      data.pipeline_checkpoints = await queryPipelineCheckpointsByTenant(this.db, tenantId);
      data.pipeline_events = await queryPipelineEventsByTenant(this.db, tenantId);
    }

    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tenantId,
      scope,
      bizItemId: bizItemId || undefined,
      data,
    };

    const payloadStr = JSON.stringify(payload);
    const itemCount =
      data.bd_artifacts.length +
      data.discovery_pipeline_runs.length +
      data.pipeline_checkpoints.length +
      data.pipeline_events.length;

    const id = crypto.randomUUID().replace(/-/g, "");

    await this.db
      .prepare(
        `INSERT INTO backup_metadata (id, tenant_id, backup_type, scope, biz_item_id, tables_included, item_count, size_bytes, payload, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        tenantId,
        backupType,
        scope,
        bizItemId || null,
        JSON.stringify([...BACKUP_TABLES]),
        itemCount,
        new TextEncoder().encode(payloadStr).length,
        payloadStr,
        createdBy,
      )
      .run();

    const row = await this.db
      .prepare("SELECT * FROM backup_metadata WHERE id = ?")
      .bind(id)
      .first<BackupRow>();

    return rowToMeta(row!);
  }

  async importBackup(input: {
    tenantId: string;
    backupId: string;
    strategy: "replace" | "merge";
  }): Promise<ImportResult> {
    const { tenantId, backupId, strategy } = input;

    const row = await this.db
      .prepare("SELECT * FROM backup_metadata WHERE id = ? AND tenant_id = ?")
      .bind(backupId, tenantId)
      .first<BackupRow>();

    if (!row) {
      throw new Error("Backup not found");
    }

    const payload: BackupPayload = JSON.parse(row.payload);
    const result: ImportResult = {
      inserted: 0,
      skipped: 0,
      deleted: 0,
      tables: {},
    };

    // Import bd_artifacts
    result.tables.bd_artifacts = await this.importTable(
      "bd_artifacts",
      payload.data.bd_artifacts,
      strategy,
      payload.scope === "item" && payload.bizItemId
        ? { column: "biz_item_id", value: payload.bizItemId, tenantColumn: "org_id", tenantId }
        : { tenantColumn: "org_id", tenantId },
    );

    // Import discovery_pipeline_runs
    result.tables.discovery_pipeline_runs = await this.importTable(
      "discovery_pipeline_runs",
      payload.data.discovery_pipeline_runs,
      strategy,
      payload.scope === "item" && payload.bizItemId
        ? { column: "biz_item_id", value: payload.bizItemId, tenantColumn: "tenant_id", tenantId }
        : { tenantColumn: "tenant_id", tenantId },
    );

    // Get run IDs for checkpoints/events scope
    const runIds = payload.data.discovery_pipeline_runs.map((r) => r.id as string);

    // Import pipeline_checkpoints
    result.tables.pipeline_checkpoints = await this.importTable(
      "pipeline_checkpoints",
      payload.data.pipeline_checkpoints,
      strategy,
      { runIds },
    );

    // Import pipeline_events
    result.tables.pipeline_events = await this.importTable(
      "pipeline_events",
      payload.data.pipeline_events,
      strategy,
      { runIds },
    );

    // Sum up totals
    for (const t of Object.values(result.tables)) {
      result.inserted += t.inserted;
      result.skipped += t.skipped;
    }

    return result;
  }

  private async importTable(
    tableName: string,
    rows: Record<string, unknown>[],
    strategy: "replace" | "merge",
    scope: {
      column?: string;
      value?: string;
      tenantColumn?: string;
      tenantId?: string;
      runIds?: string[];
    },
  ): Promise<{ inserted: number; skipped: number }> {
    const stats = { inserted: 0, skipped: 0 };
    if (rows.length === 0) return stats;

    // Replace strategy: delete existing data in scope first
    if (strategy === "replace") {
      if (scope.runIds && scope.runIds.length > 0) {
        const placeholders = scope.runIds.map(() => "?").join(",");
        await this.db
          .prepare(`DELETE FROM ${tableName} WHERE pipeline_run_id IN (${placeholders})`)
          .bind(...scope.runIds)
          .run();
      } else if (scope.column && scope.value && scope.tenantColumn && scope.tenantId) {
        await this.db
          .prepare(`DELETE FROM ${tableName} WHERE ${scope.tenantColumn} = ? AND ${scope.column} = ?`)
          .bind(scope.tenantId, scope.value)
          .run();
      } else if (scope.tenantColumn && scope.tenantId) {
        await this.db
          .prepare(`DELETE FROM ${tableName} WHERE ${scope.tenantColumn} = ?`)
          .bind(scope.tenantId)
          .run();
      }
    }

    // Insert rows
    for (const row of rows) {
      const columns = Object.keys(row);
      const placeholders = columns.map(() => "?").join(",");
      const values = columns.map((col) => {
        const v = row[col];
        return v === null || v === undefined ? null : typeof v === "object" ? JSON.stringify(v) : v;
      });

      const verb = strategy === "merge" ? "INSERT OR IGNORE" : "INSERT OR REPLACE";
      const stmt = `${verb} INTO ${tableName} (${columns.join(",")}) VALUES (${placeholders})`;

      const res = await this.db.prepare(stmt).bind(...values).run();
      if (res.meta.changes > 0) {
        stats.inserted++;
      } else {
        stats.skipped++;
      }
    }

    return stats;
  }

  async list(
    tenantId: string,
    query: BackupListQuery,
  ): Promise<{ items: BackupMeta[]; total: number }> {
    const conditions = ["tenant_id = ?"];
    const params: unknown[] = [tenantId];

    if (query.backupType) {
      conditions.push("backup_type = ?");
      params.push(query.backupType);
    }
    if (query.scope) {
      conditions.push("scope = ?");
      params.push(query.scope);
    }
    if (query.bizItemId) {
      conditions.push("biz_item_id = ?");
      params.push(query.bizItemId);
    }

    const where = conditions.join(" AND ");

    const countRow = await this.db
      .prepare(`SELECT COUNT(*) as cnt FROM backup_metadata WHERE ${where}`)
      .bind(...params)
      .first<{ cnt: number }>();

    const { results } = await this.db
      .prepare(
        `SELECT id, tenant_id, backup_type, scope, biz_item_id, tables_included, item_count, size_bytes, created_by, created_at
         FROM backup_metadata WHERE ${where}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, query.limit, query.offset)
      .all<Omit<BackupRow, "payload">>();

    return {
      items: results.map((r) => rowToMeta(r as BackupRow)),
      total: countRow?.cnt ?? 0,
    };
  }

  async getById(tenantId: string, backupId: string): Promise<BackupMeta | null> {
    const row = await this.db
      .prepare(
        `SELECT id, tenant_id, backup_type, scope, biz_item_id, tables_included, item_count, size_bytes, created_by, created_at
         FROM backup_metadata WHERE id = ? AND tenant_id = ?`,
      )
      .bind(backupId, tenantId)
      .first<Omit<BackupRow, "payload">>();

    return row ? rowToMeta(row as BackupRow) : null;
  }

  async delete(tenantId: string, backupId: string): Promise<boolean> {
    const res = await this.db
      .prepare("DELETE FROM backup_metadata WHERE id = ? AND tenant_id = ?")
      .bind(backupId, tenantId)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }

  async autoBackup(tenantId: string): Promise<BackupMeta> {
    // Cleanup old auto backups (retention: 7 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - AUTO_RETENTION_DAYS);
    await this.db
      .prepare(
        "DELETE FROM backup_metadata WHERE tenant_id = ? AND backup_type = 'auto' AND created_at < ?",
      )
      .bind(tenantId, cutoff.toISOString())
      .run();

    // Create new auto backup
    return this.exportBackup({
      tenantId,
      backupType: "auto",
      scope: "full",
      createdBy: "system:cron",
    });
  }
}
