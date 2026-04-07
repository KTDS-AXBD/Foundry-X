/**
 * Sprint 56: Discovery 진행률 대시보드 서비스 (F189)
 */
import { DISCOVERY_CRITERIA, type CriterionStatus } from "./discovery-criteria.js";

export interface DiscoveryPortfolioProgress {
  totalItems: number;
  byGateStatus: { blocked: number; warning: number; ready: number };
  byCriterion: CriterionStat[];
  items: ItemProgress[];
  bottleneck: { criterionId: number; name: string; completionRate: number } | null;
}

export interface CriterionStat {
  criterionId: number;
  name: string;
  completed: number;
  inProgress: number;
  needsRevision: number;
  pending: number;
  completionRate: number;
}

export interface ItemProgress {
  bizItemId: string;
  title: string;
  completedCount: number;
  gateStatus: "blocked" | "warning" | "ready";
  criteria: Array<{ criterionId: number; status: CriterionStatus }>;
}

export interface DiscoverySummary {
  totalItems: number;
  readyCount: number;
  warningCount: number;
  blockedCount: number;
  overallCompletionRate: number;
  bottleneckCriterion: string | null;
}

interface ProgressRow {
  biz_item_id: string;
  title: string;
  criterion_id: number;
  status: string;
}

export class DiscoveryProgressService {
  constructor(private db: D1Database) {}

  async getProgress(orgId: string): Promise<DiscoveryPortfolioProgress> {
    const { results } = await this.db.prepare(`
      SELECT bi.id as biz_item_id, bi.title, dc.criterion_id, dc.status
      FROM biz_items bi
      LEFT JOIN biz_discovery_criteria dc ON bi.id = dc.biz_item_id
      WHERE bi.org_id = ?
      ORDER BY bi.created_at DESC, dc.criterion_id
    `).bind(orgId).all<ProgressRow>();

    // Group by bizItem
    const itemMap = new Map<string, { title: string; criteria: Map<number, CriterionStatus> }>();
    for (const row of results) {
      if (!itemMap.has(row.biz_item_id)) {
        itemMap.set(row.biz_item_id, { title: row.title, criteria: new Map() });
      }
      if (row.criterion_id != null) {
        itemMap.get(row.biz_item_id)!.criteria.set(
          row.criterion_id, (row.status ?? "pending") as CriterionStatus
        );
      }
    }

    // Build items array
    const items: ItemProgress[] = [];
    const gateCount = { blocked: 0, warning: 0, ready: 0 };

    for (const [bizItemId, data] of itemMap) {
      const criteria: Array<{ criterionId: number; status: CriterionStatus }> = [];
      for (let i = 1; i <= 9; i++) {
        criteria.push({ criterionId: i, status: data.criteria.get(i) ?? "pending" });
      }
      const completedCount = criteria.filter((c) => c.status === "completed").length;
      const gateStatus = completedCount >= 9 ? "ready"
        : completedCount >= 7 ? "warning" : "blocked";
      gateCount[gateStatus]++;
      items.push({ bizItemId, title: data.title, completedCount, gateStatus, criteria });
    }

    // Aggregate by criterion
    const byCriterion: CriterionStat[] = DISCOVERY_CRITERIA.map((meta) => {
      let completed = 0, inProgress = 0, needsRevision = 0, pending = 0;
      for (const item of items) {
        const c = item.criteria.find((cr) => cr.criterionId === meta.id);
        const s = c?.status ?? "pending";
        if (s === "completed") completed++;
        else if (s === "in_progress") inProgress++;
        else if (s === "needs_revision") needsRevision++;
        else pending++;
      }
      const total = items.length || 1;
      return {
        criterionId: meta.id, name: meta.name,
        completed, inProgress, needsRevision, pending,
        completionRate: Math.round(completed / total * 100),
      };
    });

    // Find bottleneck (lowest completion rate) — only when items exist
    let bottleneck: DiscoveryPortfolioProgress["bottleneck"] = null;
    if (items.length > 0) {
      const sorted = [...byCriterion].sort((a, b) => a.completionRate - b.completionRate);
      if (sorted.length > 0 && sorted[0]!.completionRate < 100) {
        bottleneck = { criterionId: sorted[0]!.criterionId, name: sorted[0]!.name, completionRate: sorted[0]!.completionRate };
      }
    }

    return {
      totalItems: items.length,
      byGateStatus: gateCount,
      byCriterion,
      items,
      bottleneck,
    };
  }

  async getSummary(orgId: string): Promise<DiscoverySummary> {
    const progress = await this.getProgress(orgId);
    const totalCriteria = progress.totalItems * 9;
    const completedCriteria = progress.byCriterion.reduce((s, c) => s + c.completed, 0);

    return {
      totalItems: progress.totalItems,
      readyCount: progress.byGateStatus.ready,
      warningCount: progress.byGateStatus.warning,
      blockedCount: progress.byGateStatus.blocked,
      overallCompletionRate: totalCriteria > 0
        ? Math.round(completedCriteria / totalCriteria * 100) : 0,
      bottleneckCriterion: progress.bottleneck?.name ?? null,
    };
  }
}
