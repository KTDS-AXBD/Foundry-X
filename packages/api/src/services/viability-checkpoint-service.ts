/**
 * Sprint 69: 사업성 체크포인트 서비스 (F213)
 * 2-1~2-7 각 단계 완료 시 Go/Pivot/Drop 판단 CRUD + 트래픽 라이트 집계
 */

export interface CheckpointInput {
  bizItemId: string;
  stage: string;
  decision: string;
  question: string;
  reason?: string;
}

export interface CheckpointUpdateInput {
  decision?: string;
  question?: string;
  reason?: string;
}

export interface Checkpoint {
  id: string;
  bizItemId: string;
  orgId: string;
  stage: string;
  decision: string;
  question: string;
  reason: string | null;
  decidedBy: string;
  decidedAt: string;
  createdAt: string;
}

export interface TrafficLight {
  bizItemId: string;
  summary: { go: number; pivot: number; drop: number; pending: number };
  commitGate: { decision: string; decidedAt: string } | null;
  checkpoints: Checkpoint[];
  overallSignal: "green" | "yellow" | "red";
}

interface CheckpointRow {
  id: string;
  biz_item_id: string;
  org_id: string;
  stage: string;
  decision: string;
  question: string;
  reason: string | null;
  decided_by: string;
  decided_at: string;
  created_at: string;
}

interface CommitGateRow {
  final_decision: string;
  decided_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toCheckpoint(row: CheckpointRow): Checkpoint {
  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    orgId: row.org_id,
    stage: row.stage,
    decision: row.decision,
    question: row.question,
    reason: row.reason,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

const ALL_STAGES = ["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7"];

function computeOverallSignal(
  checkpoints: Checkpoint[],
  commitGate: { decision: string } | null,
): "green" | "yellow" | "red" {
  const dropCount = checkpoints.filter((c) => c.decision === "drop").length;
  const pivotCount = checkpoints.filter((c) => c.decision === "pivot").length;

  if (dropCount >= 1 || commitGate?.decision === "drop") return "red";
  if (pivotCount >= 2 || commitGate?.decision === "explore_alternatives") return "yellow";
  return "green";
}

export class ViabilityCheckpointService {
  constructor(private db: D1Database) {}

  async create(orgId: string, userId: string, input: CheckpointInput): Promise<Checkpoint> {
    const id = generateId();
    const now = new Date().toISOString();

    // UPSERT: replace if same biz_item_id + stage
    await this.db
      .prepare(
        `INSERT INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(biz_item_id, stage) DO UPDATE SET
           decision = excluded.decision,
           question = excluded.question,
           reason = excluded.reason,
           decided_by = excluded.decided_by,
           decided_at = excluded.decided_at`,
      )
      .bind(id, input.bizItemId, orgId, input.stage, input.decision, input.question, input.reason ?? null, userId, now, now)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM ax_viability_checkpoints WHERE biz_item_id = ? AND stage = ?")
      .bind(input.bizItemId, input.stage)
      .first<CheckpointRow>();

    return toCheckpoint(row!);
  }

  async listByItem(bizItemId: string): Promise<Checkpoint[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM ax_viability_checkpoints WHERE biz_item_id = ? ORDER BY stage")
      .bind(bizItemId)
      .all<CheckpointRow>();

    return results.map(toCheckpoint);
  }

  async update(bizItemId: string, stage: string, input: CheckpointUpdateInput): Promise<Checkpoint | null> {
    const existing = await this.db
      .prepare("SELECT * FROM ax_viability_checkpoints WHERE biz_item_id = ? AND stage = ?")
      .bind(bizItemId, stage)
      .first<CheckpointRow>();

    if (!existing) return null;

    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE ax_viability_checkpoints
         SET decision = ?, question = ?, reason = ?, decided_at = ?
         WHERE biz_item_id = ? AND stage = ?`,
      )
      .bind(
        input.decision ?? existing.decision,
        input.question ?? existing.question,
        input.reason !== undefined ? input.reason : existing.reason,
        now,
        bizItemId,
        stage,
      )
      .run();

    const row = await this.db
      .prepare("SELECT * FROM ax_viability_checkpoints WHERE biz_item_id = ? AND stage = ?")
      .bind(bizItemId, stage)
      .first<CheckpointRow>();

    return toCheckpoint(row!);
  }

  async delete(bizItemId: string, stage: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM ax_viability_checkpoints WHERE biz_item_id = ? AND stage = ?")
      .bind(bizItemId, stage)
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  async getTrafficLight(bizItemId: string): Promise<TrafficLight> {
    const checkpoints = await this.listByItem(bizItemId);

    // Commit Gate 조회
    const gateRow = await this.db
      .prepare("SELECT final_decision, decided_at FROM ax_commit_gates WHERE biz_item_id = ?")
      .bind(bizItemId)
      .first<CommitGateRow>();

    const commitGate = gateRow
      ? { decision: gateRow.final_decision, decidedAt: gateRow.decided_at }
      : null;

    const completedStages = new Set(checkpoints.map((c) => c.stage));
    const pendingCount = ALL_STAGES.filter((s) => !completedStages.has(s)).length;

    const summary = {
      go: checkpoints.filter((c) => c.decision === "go").length,
      pivot: checkpoints.filter((c) => c.decision === "pivot").length,
      drop: checkpoints.filter((c) => c.decision === "drop").length,
      pending: pendingCount,
    };

    return {
      bizItemId,
      summary,
      commitGate,
      checkpoints,
      overallSignal: computeOverallSignal(checkpoints, commitGate),
    };
  }
}
