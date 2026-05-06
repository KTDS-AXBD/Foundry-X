// F603: CrossOrgEnforcer — Cross-Org 4그룹 분류 + core_differentiator default-deny
import type { AuditBus } from "../../infra/types.js";
import { generateTraceId, generateSpanId } from "../../infra/types.js";
import type {
  CrossOrgGroup,
  AssetKind,
  ExportBlockReason,
  GroupAssignment,
  ExportCheckResult,
  GroupStats,
} from "../types.js";
import { CROSS_ORG_GROUPS } from "../types.js";

export class CrossOrgEnforcer {
  constructor(
    private readonly db: D1Database,
    private readonly auditBus: Pick<AuditBus, "emit">,
  ) {}

  async assignGroup(input: {
    assetId: string;
    assetKind: AssetKind;
    orgId: string;
    groupType: CrossOrgGroup;
    signals?: {
      commonality?: number;
      variance?: number;
      documentationRate?: number;
      businessImpact?: "low" | "medium" | "high";
    };
    assignedBy?: "auto" | "sme" | "manual";
  }): Promise<GroupAssignment> {
    const id = crypto.randomUUID();
    const assignedBy = input.assignedBy ?? "manual";

    await this.db
      .prepare(
        `INSERT INTO cross_org_groups
          (id, asset_id, asset_kind, org_id, group_type, commonality, variance,
           documentation_rate, business_impact, assigned_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (asset_id, asset_kind) DO UPDATE SET
           group_type = excluded.group_type,
           commonality = excluded.commonality,
           variance = excluded.variance,
           documentation_rate = excluded.documentation_rate,
           business_impact = excluded.business_impact,
           assigned_by = excluded.assigned_by,
           assigned_at = unixepoch('now') * 1000`,
      )
      .bind(
        id,
        input.assetId,
        input.assetKind,
        input.orgId,
        input.groupType,
        input.signals?.commonality ?? null,
        input.signals?.variance ?? null,
        input.signals?.documentationRate ?? null,
        input.signals?.businessImpact ?? null,
        assignedBy,
      )
      .run();

    const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
    await this.auditBus.emit(
      "cross_org.group_assigned",
      {
        assetId: input.assetId,
        assetKind: input.assetKind,
        orgId: input.orgId,
        groupType: input.groupType,
        assignedBy,
      },
      ctx,
    );

    return this.fetchAssignment(input.assetId, input.assetKind);
  }

  // BeSir CO2 약속: core_differentiator → default-deny
  async checkExport(input: {
    assetId: string;
    attemptedAction?: string;
    traceId?: string;
  }): Promise<ExportCheckResult> {
    const row = await this.db
      .prepare(
        `SELECT id, asset_kind, org_id, group_type
         FROM cross_org_groups WHERE asset_id = ?`,
      )
      .bind(input.assetId)
      .first<{ id: string; asset_kind: AssetKind; org_id: string; group_type: CrossOrgGroup }>();

    if (!row) {
      return { allowed: true, groupType: null, reason: null, blockId: null };
    }

    if (row.group_type === "core_differentiator") {
      const blockId = crypto.randomUUID();
      const reason: ExportBlockReason = "export_blocked";

      await this.db
        .prepare(
          `INSERT INTO cross_org_export_blocks
            (id, asset_id, org_id, reason, attempted_action, trace_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          blockId,
          input.assetId,
          row.org_id,
          reason,
          input.attemptedAction ?? null,
          input.traceId ?? null,
        )
        .run();

      const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
      await this.auditBus.emit(
        "cross_org.export_blocked",
        { blockId, assetId: input.assetId, orgId: row.org_id, reason },
        ctx,
      );

      return { allowed: false, groupType: row.group_type, reason, blockId };
    }

    return { allowed: true, groupType: row.group_type, reason: null, blockId: null };
  }

  async getGroupStats(orgId: string): Promise<GroupStats> {
    const result = await this.db
      .prepare(
        `SELECT group_type, COUNT(*) as cnt
         FROM cross_org_groups WHERE org_id = ? GROUP BY group_type`,
      )
      .bind(orgId)
      .all<{ group_type: CrossOrgGroup; cnt: number }>();

    const counts: Record<CrossOrgGroup, number> = {
      common_standard: 0,
      org_specific: 0,
      tacit_knowledge: 0,
      core_differentiator: 0,
    };
    for (const row of result.results ?? []) {
      counts[row.group_type] = row.cnt;
    }
    return { orgId, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  }

  private async fetchAssignment(assetId: string, assetKind: AssetKind): Promise<GroupAssignment> {
    const row = await this.db
      .prepare(
        `SELECT id, asset_id, asset_kind, org_id, group_type,
                commonality, variance, documentation_rate, business_impact,
                assigned_by, assigned_at
         FROM cross_org_groups WHERE asset_id = ? AND asset_kind = ?`,
      )
      .bind(assetId, assetKind)
      .first<{
        id: string;
        asset_id: string;
        asset_kind: AssetKind;
        org_id: string;
        group_type: CrossOrgGroup;
        commonality: number | null;
        variance: number | null;
        documentation_rate: number | null;
        business_impact: "low" | "medium" | "high" | null;
        assigned_by: "auto" | "sme" | "manual";
        assigned_at: number;
      }>();

    if (!row) throw new Error(`cross_org_groups not found: ${assetId}/${assetKind}`);

    return {
      id: row.id,
      assetId: row.asset_id,
      assetKind: row.asset_kind,
      orgId: row.org_id,
      groupType: row.group_type,
      commonality: row.commonality,
      variance: row.variance,
      documentationRate: row.documentation_rate,
      businessImpact: row.business_impact,
      assignedBy: row.assigned_by,
      assignedAt: row.assigned_at,
    };
  }
}
