/**
 * Sprint 53: Discovery 9기준 체크리스트 서비스 (F183)
 */

export const DISCOVERY_CRITERIA = [
  { id: 1, name: "문제/고객 정의", condition: "고객 세그먼트 1개+ + 문제 1문장 (JTBD)", pmSkills: ["/interview", "/research-users"] },
  { id: 2, name: "시장 기회", condition: "SOM 시장 규모 수치 + 연간 성장률 + why now 1개", pmSkills: ["/market-scan"] },
  { id: 3, name: "경쟁 환경", condition: "직접 경쟁사 3개+ + 차별화 포지셔닝", pmSkills: ["/competitive-analysis"] },
  { id: 4, name: "가치 제안 가설", condition: "JTBD 1문장 + 차별화 1가지", pmSkills: ["/value-proposition"] },
  { id: 5, name: "수익 구조 가설", condition: "과금 모델 + WTP 추정 + 유닛 이코노믹스 초안", pmSkills: ["/business-model"] },
  { id: 6, name: "핵심 리스크 가정", condition: "우선순위 가정 목록 + 각 검증 방법·기준", pmSkills: ["/pre-mortem"] },
  { id: 7, name: "규제/기술 제약", condition: "규제 목록 + 대응 방향 (없으면 '없음' 명시)", pmSkills: ["/market-scan"] },
  { id: 8, name: "차별화 근거", condition: "지속 가능한 우위 요소 2가지+ + 모방 난이도", pmSkills: ["/competitive-analysis", "/value-proposition"] },
  { id: 9, name: "검증 실험 계획", condition: "최소 실험 3개 + 성공/실패 판단 기준", pmSkills: ["/pre-mortem"] },
] as const;

export type CriterionStatus = "pending" | "in_progress" | "completed" | "needs_revision";

export interface DiscoveryCriterion {
  id: string;
  bizItemId: string;
  criterionId: number;
  name: string;
  condition: string;
  status: CriterionStatus;
  evidence: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface CriteriaProgress {
  total: 9;
  completed: number;
  inProgress: number;
  needsRevision: number;
  pending: number;
  criteria: DiscoveryCriterion[];
  gateStatus: "blocked" | "warning" | "ready";
}

interface CriteriaRow {
  id: string;
  biz_item_id: string;
  criterion_id: number;
  status: string;
  evidence: string | null;
  completed_at: string | null;
  updated_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toDiscoveryCriterion(row: CriteriaRow): DiscoveryCriterion {
  const meta = DISCOVERY_CRITERIA.find((c) => c.id === row.criterion_id);
  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    criterionId: row.criterion_id,
    name: meta?.name ?? "",
    condition: meta?.condition ?? "",
    status: row.status as CriterionStatus,
    evidence: row.evidence,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function computeGateStatus(completedCount: number): "blocked" | "warning" | "ready" {
  if (completedCount >= 9) return "ready";
  if (completedCount >= 7) return "warning";
  return "blocked";
}

export class DiscoveryCriteriaService {
  constructor(private db: D1Database) {}

  async initialize(bizItemId: string): Promise<void> {
    for (const c of DISCOVERY_CRITERIA) {
      const id = generateId();
      await this.db
        .prepare(
          `INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
           VALUES (?, ?, ?, 'pending', datetime('now'))`,
        )
        .bind(id, bizItemId, c.id)
        .run();
    }
  }

  async getAll(bizItemId: string): Promise<CriteriaProgress> {
    const { results } = await this.db
      .prepare("SELECT * FROM biz_discovery_criteria WHERE biz_item_id = ? ORDER BY criterion_id")
      .bind(bizItemId)
      .all<CriteriaRow>();

    const criteria = results.map(toDiscoveryCriterion);

    // If not initialized yet, return all pending
    if (criteria.length === 0) {
      const emptyCriteria: DiscoveryCriterion[] = DISCOVERY_CRITERIA.map((c) => ({
        id: "",
        bizItemId,
        criterionId: c.id,
        name: c.name,
        condition: c.condition,
        status: "pending" as CriterionStatus,
        evidence: null,
        completedAt: null,
        updatedAt: "",
      }));
      return {
        total: 9,
        completed: 0,
        inProgress: 0,
        needsRevision: 0,
        pending: 9,
        criteria: emptyCriteria,
        gateStatus: "blocked",
      };
    }

    const completed = criteria.filter((c) => c.status === "completed").length;
    const inProgress = criteria.filter((c) => c.status === "in_progress").length;
    const needsRevision = criteria.filter((c) => c.status === "needs_revision").length;
    const pending = criteria.filter((c) => c.status === "pending").length;

    return {
      total: 9,
      completed,
      inProgress,
      needsRevision,
      pending,
      criteria,
      gateStatus: computeGateStatus(completed),
    };
  }

  async update(
    bizItemId: string,
    criterionId: number,
    data: { status: CriterionStatus; evidence?: string },
  ): Promise<DiscoveryCriterion> {
    const now = new Date().toISOString();
    const completedAt = data.status === "completed" ? now : null;

    await this.db
      .prepare(
        `UPDATE biz_discovery_criteria
         SET status = ?, evidence = COALESCE(?, evidence), completed_at = ?, updated_at = ?
         WHERE biz_item_id = ? AND criterion_id = ?`,
      )
      .bind(data.status, data.evidence ?? null, completedAt, now, bizItemId, criterionId)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM biz_discovery_criteria WHERE biz_item_id = ? AND criterion_id = ?")
      .bind(bizItemId, criterionId)
      .first<CriteriaRow>();

    return toDiscoveryCriterion(row!);
  }

  async suggestFromStep(
    bizItemId: string,
    stepDiscoveryMapping: number[],
  ): Promise<Array<{ criterionId: number; name: string; currentStatus: CriterionStatus }>> {
    if (stepDiscoveryMapping.length === 0) return [];

    const { results } = await this.db
      .prepare("SELECT * FROM biz_discovery_criteria WHERE biz_item_id = ?")
      .bind(bizItemId)
      .all<CriteriaRow>();

    return stepDiscoveryMapping
      .map((criterionId) => {
        const row = results.find((r) => r.criterion_id === criterionId);
        const meta = DISCOVERY_CRITERIA.find((c) => c.id === criterionId);
        return {
          criterionId,
          name: meta?.name ?? "",
          currentStatus: (row?.status ?? "pending") as CriterionStatus,
        };
      })
      .filter((s) => s.currentStatus !== "completed");
  }

  async checkGate(bizItemId: string): Promise<{
    gateStatus: "blocked" | "warning" | "ready";
    completedCount: number;
    missingCriteria: Array<{ id: number; name: string; status: CriterionStatus }>;
  }> {
    const progress = await this.getAll(bizItemId);
    const missingCriteria = progress.criteria
      .filter((c) => c.status !== "completed")
      .map((c) => ({ id: c.criterionId, name: c.name, status: c.status }));

    return {
      gateStatus: progress.gateStatus,
      completedCount: progress.completed,
      missingCriteria,
    };
  }
}
