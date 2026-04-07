/**
 * F262: BD 프로세스 진행 추적 — 기존 5개 테이블 Aggregation Layer
 * 새 DB 테이블 없이 pipeline_stages, ax_viability_checkpoints, ax_commit_gates,
 * decisions, bd_artifacts를 조합하여 통합 진행 상태를 제공한다.
 */

export const DISCOVERY_STAGES = [
  { id: "2-0", name: "아이템 등록" },
  { id: "2-1", name: "시장 조사" },
  { id: "2-2", name: "경쟁 분석" },
  { id: "2-3", name: "고객 분석" },
  { id: "2-4", name: "비즈니스 모델" },
  { id: "2-5", name: "Commit Gate" },
  { id: "2-6", name: "기술 검증" },
  { id: "2-7", name: "시제품 검증" },
  { id: "2-8", name: "사업 계획서" },
  { id: "2-9", name: "투자 심사" },
  { id: "2-10", name: "최종 보고" },
] as const;

export interface DiscoveryStageProgress {
  stageId: string;
  stageName: string;
  hasArtifacts: boolean;
  artifactCount: number;
  checkpoint?: {
    decision: string;
    decidedAt: string;
  };
}

export interface ProcessProgress {
  bizItemId: string;
  title: string;
  status: string;
  pipelineStage: string;
  pipelineEnteredAt: string;
  currentDiscoveryStage: string;
  discoveryStages: DiscoveryStageProgress[];
  completedStageCount: number;
  totalStageCount: number;
  trafficLight: {
    overallSignal: "green" | "yellow" | "red";
    go: number;
    pivot: number;
    drop: number;
    pending: number;
  };
  commitGate: { decision: string; decidedAt: string } | null;
  lastDecision: {
    decision: string;
    stage: string;
    comment: string;
    decidedAt: string;
  } | null;
}

export interface PortfolioSummary {
  totalItems: number;
  bySignal: { green: number; yellow: number; red: number };
  byPipelineStage: Record<string, number>;
  avgCompletionRate: number;
  bottleneck: { stageId: string; stageName: string; itemCount: number } | null;
}

interface PipelineRow {
  biz_item_id: string;
  stage: string;
  entered_at: string;
  title: string;
  status: string;
}

interface CheckpointRow {
  biz_item_id: string;
  stage: string;
  decision: string;
  decided_at: string;
}

interface CommitGateRow {
  biz_item_id: string;
  final_decision: string;
  decided_at: string;
}

interface ArtifactCountRow {
  biz_item_id: string;
  stage_id: string;
  cnt: number;
}

interface DecisionRow {
  biz_item_id: string;
  decision: string;
  stage: string;
  comment: string;
  created_at: string;
}

const ALL_CHECKPOINT_STAGES = ["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7"];

function computeSignal(
  checkpoints: CheckpointRow[],
  commitGate: CommitGateRow | undefined,
): "green" | "yellow" | "red" {
  const dropCount = checkpoints.filter((c) => c.decision === "drop").length;
  const pivotCount = checkpoints.filter((c) => c.decision === "pivot").length;

  if (dropCount >= 1 || commitGate?.final_decision === "drop") return "red";
  if (pivotCount >= 2 || commitGate?.final_decision === "explore_alternatives") return "yellow";
  return "green";
}

export class BdProcessTracker {
  constructor(private db: D1Database) {}

  async getItemProgress(bizItemId: string, orgId: string): Promise<ProcessProgress | null> {
    // Pipeline stage
    const pipelineRow = await this.db
      .prepare(
        `SELECT ps.biz_item_id, ps.stage, ps.entered_at, bi.title, bi.status
         FROM pipeline_stages ps
         JOIN biz_items bi ON bi.id = ps.biz_item_id
         WHERE ps.biz_item_id = ? AND ps.org_id = ? AND ps.exited_at IS NULL`,
      )
      .bind(bizItemId, orgId)
      .first<PipelineRow>();

    if (!pipelineRow) return null;

    // Checkpoints
    const { results: checkpoints } = await this.db
      .prepare(
        "SELECT biz_item_id, stage, decision, decided_at FROM ax_viability_checkpoints WHERE biz_item_id = ? ORDER BY stage",
      )
      .bind(bizItemId)
      .all<CheckpointRow>();

    // Commit gate
    const commitGateRow = await this.db
      .prepare(
        "SELECT biz_item_id, final_decision, decided_at FROM ax_commit_gates WHERE biz_item_id = ?",
      )
      .bind(bizItemId)
      .first<CommitGateRow>();

    // Artifact counts by stage
    const { results: artifactCounts } = await this.db
      .prepare(
        "SELECT biz_item_id, stage_id, COUNT(*) as cnt FROM bd_artifacts WHERE biz_item_id = ? AND status = 'completed' GROUP BY stage_id",
      )
      .bind(bizItemId)
      .all<ArtifactCountRow>();

    // Latest decision
    const latestDecision = await this.db
      .prepare(
        "SELECT biz_item_id, decision, stage, comment, created_at FROM decisions WHERE biz_item_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 1",
      )
      .bind(bizItemId, orgId)
      .first<DecisionRow>();

    const checkpointMap = new Map(checkpoints.map((c) => [c.stage, c]));
    const artifactMap = new Map(artifactCounts.map((a) => [a.stage_id, a.cnt]));

    return this.assembleProgress(
      pipelineRow,
      checkpointMap,
      commitGateRow ?? undefined,
      artifactMap,
      latestDecision ?? undefined,
    );
  }

  async getPortfolioProgress(
    orgId: string,
    filters?: { signal?: string; pipelineStage?: string; page?: number; limit?: number },
  ): Promise<{ items: ProcessProgress[]; summary: PortfolioSummary; total: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    // Batch 1: All active pipeline items
    const { results: pipelineRows } = await this.db
      .prepare(
        `SELECT ps.biz_item_id, ps.stage, ps.entered_at, bi.title, bi.status
         FROM pipeline_stages ps
         JOIN biz_items bi ON bi.id = ps.biz_item_id
         WHERE ps.org_id = ? AND ps.exited_at IS NULL
         ORDER BY ps.entered_at DESC`,
      )
      .bind(orgId)
      .all<PipelineRow>();

    if (pipelineRows.length === 0) {
      return {
        items: [],
        summary: {
          totalItems: 0,
          bySignal: { green: 0, yellow: 0, red: 0 },
          byPipelineStage: {},
          avgCompletionRate: 0,
          bottleneck: null,
        },
        total: 0,
      };
    }

    // Batch 2: All checkpoints
    const { results: allCheckpoints } = await this.db
      .prepare(
        "SELECT biz_item_id, stage, decision, decided_at FROM ax_viability_checkpoints WHERE org_id = ? ORDER BY stage",
      )
      .bind(orgId)
      .all<CheckpointRow>();

    // Batch 3: All commit gates
    const bizItemIds = pipelineRows.map((r) => r.biz_item_id);
    const placeholders = bizItemIds.map(() => "?").join(",");
    const { results: allCommitGates } = await this.db
      .prepare(
        `SELECT cg.biz_item_id, cg.final_decision, cg.decided_at
         FROM ax_commit_gates cg
         WHERE cg.biz_item_id IN (${placeholders})`,
      )
      .bind(...bizItemIds)
      .all<CommitGateRow>();

    // Batch 4: Artifact counts
    const { results: allArtifactCounts } = await this.db
      .prepare(
        `SELECT biz_item_id, stage_id, COUNT(*) as cnt
         FROM bd_artifacts WHERE org_id = ? AND status = 'completed'
         GROUP BY biz_item_id, stage_id`,
      )
      .bind(orgId)
      .all<ArtifactCountRow>();

    // Batch 5: Latest decisions (one per item)
    const { results: allDecisions } = await this.db
      .prepare(
        `SELECT d.biz_item_id, d.decision, d.stage, d.comment, d.created_at
         FROM decisions d
         INNER JOIN (
           SELECT biz_item_id, MAX(created_at) as max_created
           FROM decisions WHERE org_id = ?
           GROUP BY biz_item_id
         ) latest ON d.biz_item_id = latest.biz_item_id AND d.created_at = latest.max_created
         WHERE d.org_id = ?`,
      )
      .bind(orgId, orgId)
      .all<DecisionRow>();

    // Group by biz_item_id
    const checkpointsByItem = this.groupBy(allCheckpoints, "biz_item_id");
    const commitGateByItem = new Map(allCommitGates.map((g) => [g.biz_item_id, g]));
    const artifactsByItem = this.groupBy(allArtifactCounts, "biz_item_id");
    const decisionByItem = new Map(allDecisions.map((d) => [d.biz_item_id, d]));

    // Assemble all progress items
    const allItems: ProcessProgress[] = pipelineRows.map((row) => {
      const itemCheckpoints = checkpointsByItem.get(row.biz_item_id) ?? [];
      const checkpointMap = new Map(itemCheckpoints.map((c) => [c.stage, c]));
      const commitGate = commitGateByItem.get(row.biz_item_id);
      const artifactCounts = artifactsByItem.get(row.biz_item_id) ?? [];
      const artifactMap = new Map(artifactCounts.map((a) => [a.stage_id, a.cnt]));
      const latestDecision = decisionByItem.get(row.biz_item_id);

      return this.assembleProgress(row, checkpointMap, commitGate, artifactMap, latestDecision);
    });

    // Compute summary from ALL items (before filtering)
    const summary = this.computeSummary(allItems);

    // Apply filters
    let filtered = allItems;
    if (filters?.signal) {
      filtered = filtered.filter((i) => i.trafficLight.overallSignal === filters.signal);
    }
    if (filters?.pipelineStage) {
      filtered = filtered.filter((i) => i.pipelineStage === filters.pipelineStage);
    }

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return { items: paginated, summary, total };
  }

  async getPortfolioSummary(orgId: string): Promise<PortfolioSummary> {
    const { summary } = await this.getPortfolioProgress(orgId);
    return summary;
  }

  private assembleProgress(
    pipelineRow: PipelineRow,
    checkpointMap: Map<string, CheckpointRow>,
    commitGate: CommitGateRow | undefined,
    artifactMap: Map<string, number>,
    latestDecision: DecisionRow | undefined,
  ): ProcessProgress {
    const discoveryStages: DiscoveryStageProgress[] = DISCOVERY_STAGES.map((s) => {
      const artCount = artifactMap.get(s.id) ?? 0;
      const checkpoint = checkpointMap.get(s.id);
      return {
        stageId: s.id,
        stageName: s.name,
        hasArtifacts: artCount > 0,
        artifactCount: artCount,
        ...(checkpoint
          ? { checkpoint: { decision: checkpoint.decision, decidedAt: checkpoint.decided_at } }
          : {}),
      };
    });

    const completedStageCount = discoveryStages.filter((s) => s.hasArtifacts).length;

    // Current discovery stage = highest stage with artifacts
    let currentDiscoveryStage = "2-0";
    for (let i = DISCOVERY_STAGES.length - 1; i >= 0; i--) {
      const ds = discoveryStages[i];
      if (ds && ds.hasArtifacts) {
        currentDiscoveryStage = DISCOVERY_STAGES[i]!.id;
        break;
      }
    }

    const checkpoints = Array.from(checkpointMap.values());
    const completedCheckpointStages = new Set(checkpoints.map((c) => c.stage));
    const pendingCount = ALL_CHECKPOINT_STAGES.filter((s) => !completedCheckpointStages.has(s)).length;

    return {
      bizItemId: pipelineRow.biz_item_id,
      title: pipelineRow.title,
      status: pipelineRow.status,
      pipelineStage: pipelineRow.stage,
      pipelineEnteredAt: pipelineRow.entered_at,
      currentDiscoveryStage,
      discoveryStages,
      completedStageCount,
      totalStageCount: DISCOVERY_STAGES.length,
      trafficLight: {
        overallSignal: computeSignal(checkpoints, commitGate),
        go: checkpoints.filter((c) => c.decision === "go").length,
        pivot: checkpoints.filter((c) => c.decision === "pivot").length,
        drop: checkpoints.filter((c) => c.decision === "drop").length,
        pending: pendingCount,
      },
      commitGate: commitGate
        ? { decision: commitGate.final_decision, decidedAt: commitGate.decided_at }
        : null,
      lastDecision: latestDecision
        ? {
            decision: latestDecision.decision,
            stage: latestDecision.stage,
            comment: latestDecision.comment,
            decidedAt: latestDecision.created_at,
          }
        : null,
    };
  }

  private computeSummary(items: ProcessProgress[]): PortfolioSummary {
    const bySignal = { green: 0, yellow: 0, red: 0 };
    const byPipelineStage: Record<string, number> = {};
    let totalCompletionRate = 0;
    const stageItemCount: Record<string, number> = {};

    for (const item of items) {
      bySignal[item.trafficLight.overallSignal]++;
      byPipelineStage[item.pipelineStage] = (byPipelineStage[item.pipelineStage] ?? 0) + 1;
      totalCompletionRate += item.completedStageCount / item.totalStageCount;

      // Track items stuck at each discovery stage for bottleneck detection
      stageItemCount[item.currentDiscoveryStage] =
        (stageItemCount[item.currentDiscoveryStage] ?? 0) + 1;
    }

    // Bottleneck = discovery stage with most items stuck
    let bottleneck: PortfolioSummary["bottleneck"] = null;
    let maxCount = 0;
    for (const [stageId, count] of Object.entries(stageItemCount)) {
      if (count > maxCount) {
        maxCount = count;
        const stageDef = DISCOVERY_STAGES.find((s) => s.id === stageId);
        bottleneck = {
          stageId,
          stageName: stageDef?.name ?? stageId,
          itemCount: count,
        };
      }
    }

    return {
      totalItems: items.length,
      bySignal,
      byPipelineStage,
      avgCompletionRate: items.length > 0 ? Math.round((totalCompletionRate / items.length) * 100) : 0,
      bottleneck,
    };
  }

  private groupBy<T extends { biz_item_id: string }>(
    rows: T[],
    _key: "biz_item_id",
  ): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const k = row.biz_item_id;
      const arr = map.get(k) ?? [];
      arr.push(row);
      map.set(k, arr);
    }
    return map;
  }
}
