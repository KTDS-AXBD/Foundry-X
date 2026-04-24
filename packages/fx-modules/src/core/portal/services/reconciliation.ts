import type { GitHubService } from "./github.js";
import type { SSEManager } from "../../../services/sse-manager.js";
import type { SpecRequirement } from "../../../services/spec-parser.js";

// ─── F99: Git↔D1 Reconciliation Service ───

export interface DriftItem {
  entity: "spec_item" | "requirement" | "wiki_page" | "agent_config";
  id: string;
  gitStatus?: string;
  dbStatus?: string;
  action: "created" | "updated" | "deleted" | "skipped";
}

interface ReconciliationRun {
  runId: string;
  status: "running" | "completed" | "failed";
  strategy: string;
  driftCount: number;
  fixedCount: number;
  skippedCount: number;
  drifts: DriftItem[];
}

export class ReconciliationService {
  constructor(
    private db: D1Database,
    private github: GitHubService,
    private specParser: { parseContent: (content: string) => SpecRequirement[] },
    private sse?: SSEManager,
  ) {}

  async run(
    tenantId: string,
    triggerType: "cron" | "manual",
    strategy: "git-wins" | "db-wins" | "manual" = "git-wins",
  ): Promise<ReconciliationRun> {
    const runId = `recon-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // 1. INSERT running record
    await this.db
      .prepare(
        `INSERT INTO reconciliation_runs (id, tenant_id, trigger_type, status, strategy, started_at)
         VALUES (?, ?, ?, 'running', ?, ?)`,
      )
      .bind(runId, tenantId, triggerType, strategy, now)
      .run();

    try {
      // 2. Git SPEC.md 파싱
      const { content: specContent } = await this.github.getFileContent("SPEC.md");
      const gitItems = this.specParser.parseContent(specContent);

      // 3. D1 spec_items 조회
      const { results: dbSpecRows } = await this.db
        .prepare("SELECT id, title, status FROM spec_items WHERE tenant_id = ?")
        .bind(tenantId)
        .all<{ id: string; title: string; status: string }>();

      // 4. D1 requirements 조회
      const { results: dbReqRows } = await this.db
        .prepare("SELECT id, title, status FROM requirements WHERE tenant_id = ?")
        .bind(tenantId)
        .all<{ id: string; title: string; status: string }>();

      // 5. Drift 감지
      const drifts = this.detectDrift(gitItems, dbSpecRows, dbReqRows);

      // 6. Strategy에 따른 복구
      let fixedCount = 0;
      let skippedCount = 0;

      for (const drift of drifts) {
        if (strategy === "git-wins" && drift.action !== "skipped") {
          await this.applyGitWins(tenantId, drift, gitItems);
          fixedCount++;
        } else if (strategy === "db-wins") {
          skippedCount++;
        } else {
          skippedCount++;
        }
      }

      // 7. UPDATE completed
      const completedAt = new Date().toISOString();
      await this.db
        .prepare(
          `UPDATE reconciliation_runs
           SET status = 'completed', drift_count = ?, fixed_count = ?, skipped_count = ?,
               report = ?, completed_at = ?
           WHERE id = ?`,
        )
        .bind(
          drifts.length,
          fixedCount,
          skippedCount,
          JSON.stringify(drifts),
          completedAt,
          runId,
        )
        .run();

      // 8. SSE event
      this.sse?.pushEvent({
        event: "reconciliation.completed",
        data: {
          runId,
          tenantId,
          driftCount: drifts.length,
          fixedCount,
          skippedCount,
          completedAt,
        },
      });

      return {
        runId,
        status: "completed",
        strategy,
        driftCount: drifts.length,
        fixedCount,
        skippedCount,
        drifts,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.db
        .prepare(
          `UPDATE reconciliation_runs
           SET status = 'failed', error_message = ?, completed_at = ?
           WHERE id = ?`,
        )
        .bind(errorMessage, new Date().toISOString(), runId)
        .run();

      return {
        runId,
        status: "failed",
        strategy,
        driftCount: 0,
        fixedCount: 0,
        skippedCount: 0,
        drifts: [],
      };
    }
  }

  detectDrift(
    gitItems: SpecRequirement[],
    dbSpecRows: Array<{ id: string; title: string; status: string }>,
    dbReqRows: Array<{ id: string; title: string; status: string }>,
  ): DriftItem[] {
    const drifts: DriftItem[] = [];
    const dbSpecMap = new Map(dbSpecRows.map((r) => [r.id, r]));
    const dbReqMap = new Map(dbReqRows.map((r) => [r.id, r]));

    // Git에만 있거나 status 다른 spec_items
    for (const gitItem of gitItems) {
      const dbItem = dbSpecMap.get(gitItem.id);
      if (!dbItem) {
        drifts.push({
          entity: "spec_item",
          id: gitItem.id,
          gitStatus: gitItem.status,
          dbStatus: undefined,
          action: "created",
        });
      } else if (dbItem.status !== gitItem.status) {
        drifts.push({
          entity: "spec_item",
          id: gitItem.id,
          gitStatus: gitItem.status,
          dbStatus: dbItem.status,
          action: "updated",
        });
      }
    }

    // D1에만 있는 spec_items (Git에서 삭제됨)
    const gitIdSet = new Set(gitItems.map((i) => i.id));
    for (const dbItem of dbSpecRows) {
      if (!gitIdSet.has(dbItem.id)) {
        drifts.push({
          entity: "spec_item",
          id: dbItem.id,
          gitStatus: undefined,
          dbStatus: dbItem.status,
          action: "deleted",
        });
      }
    }

    // Requirements drift (Git reqCode → D1 requirements)
    for (const gitItem of gitItems) {
      if (!gitItem.reqCode) continue;
      const dbReq = dbReqMap.get(gitItem.reqCode);
      if (!dbReq) {
        drifts.push({
          entity: "requirement",
          id: gitItem.reqCode,
          gitStatus: gitItem.status,
          dbStatus: undefined,
          action: "created",
        });
      }
    }

    return drifts;
  }

  private async applyGitWins(
    tenantId: string,
    drift: DriftItem,
    gitItems: SpecRequirement[],
  ): Promise<void> {
    if (drift.entity !== "spec_item") return;

    const gitItem = gitItems.find((i) => i.id === drift.id);
    if (!gitItem) return;

    if (drift.action === "created") {
      await this.db
        .prepare(
          `INSERT INTO spec_items (id, tenant_id, title, status, priority, version, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        )
        .bind(gitItem.id, tenantId, gitItem.title, gitItem.status, gitItem.priority, gitItem.version)
        .run();
    } else if (drift.action === "updated") {
      await this.db
        .prepare(
          `UPDATE spec_items SET status = ?, title = ?, updated_at = datetime('now')
           WHERE id = ? AND tenant_id = ?`,
        )
        .bind(gitItem.status, gitItem.title, gitItem.id, tenantId)
        .run();
    } else if (drift.action === "deleted") {
      await this.db
        .prepare("DELETE FROM spec_items WHERE id = ? AND tenant_id = ?")
        .bind(drift.id, tenantId)
        .run();
    }
  }

  async getStatus(tenantId: string): Promise<{
    lastRun: {
      runId: string;
      status: "running" | "completed" | "failed";
      strategy: string;
      driftCount: number;
      fixedCount: number;
      skippedCount: number;
      startedAt: string;
      completedAt: string | null;
    } | null;
  }> {
    const row = await this.db
      .prepare(
        `SELECT id, status, strategy, drift_count, fixed_count, skipped_count, started_at, completed_at
         FROM reconciliation_runs
         WHERE tenant_id = ?
         ORDER BY started_at DESC
         LIMIT 1`,
      )
      .bind(tenantId)
      .first<{
        id: string;
        status: "running" | "completed" | "failed";
        strategy: string;
        drift_count: number;
        fixed_count: number;
        skipped_count: number;
        started_at: string;
        completed_at: string | null;
      }>();

    if (!row) return { lastRun: null };

    return {
      lastRun: {
        runId: row.id,
        status: row.status,
        strategy: row.strategy,
        driftCount: row.drift_count,
        fixedCount: row.fixed_count,
        skippedCount: row.skipped_count,
        startedAt: row.started_at,
        completedAt: row.completed_at,
      },
    };
  }

  async getHistory(
    tenantId: string,
    limit = 10,
  ): Promise<{
    runs: Array<{
      runId: string;
      status: "running" | "completed" | "failed";
      triggerType: string;
      strategy: string;
      driftCount: number;
      fixedCount: number;
      skippedCount: number;
      startedAt: string;
      completedAt: string | null;
    }>;
  }> {
    const { results } = await this.db
      .prepare(
        `SELECT id, status, trigger_type, strategy, drift_count, fixed_count, skipped_count, started_at, completed_at
         FROM reconciliation_runs
         WHERE tenant_id = ?
         ORDER BY started_at DESC
         LIMIT ?`,
      )
      .bind(tenantId, limit)
      .all<{
        id: string;
        status: "running" | "completed" | "failed";
        trigger_type: string;
        strategy: string;
        drift_count: number;
        fixed_count: number;
        skipped_count: number;
        started_at: string;
        completed_at: string | null;
      }>();

    return {
      runs: results.map((r) => ({
        runId: r.id,
        status: r.status,
        triggerType: r.trigger_type,
        strategy: r.strategy,
        driftCount: r.drift_count,
        fixedCount: r.fixed_count,
        skippedCount: r.skipped_count,
        startedAt: r.started_at,
        completedAt: r.completed_at,
      })),
    };
  }
}
