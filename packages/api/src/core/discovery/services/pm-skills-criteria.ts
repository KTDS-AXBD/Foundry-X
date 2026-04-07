/**
 * Sprint 60: pm-skills 검증 기준 서비스 (F194)
 * BDP 9기준(DiscoveryCriteriaService)과 독립적인 pm-skills 전용 12기준
 */

import type { CriterionDefinition, GateResult } from "../../offering/services/methodology-types.js";

// ─── 12 기준 정의 ───

export const PM_SKILLS_CRITERIA: CriterionDefinition[] = [
  { id: 1, name: "고객 인사이트", skills: ["/interview", "/research-users"],
    condition: "인터뷰 결과 1건+ + 고객 세그먼트 2개+ + JTBD 문장 1개+",
    outputType: "interview_result", isRequired: true },
  { id: 2, name: "시장 기회 정량화", skills: ["/market-scan"],
    condition: "TAM/SAM/SOM 수치 + 연간 성장률 + why now 트리거 1개+",
    outputType: "market_report", isRequired: true },
  { id: 3, name: "경쟁 포지셔닝", skills: ["/competitive-analysis"],
    condition: "경쟁사 3개+ 프로필 + 포지셔닝 맵 + 차별화 전략 1개+",
    outputType: "competitive_report", isRequired: true },
  { id: 4, name: "가치 제안 명확성", skills: ["/value-proposition"],
    condition: "JTBD 문장 + 가치 제안 캔버스 완성 + 차별화 포인트 2개+",
    outputType: "value_proposition", isRequired: true },
  { id: 5, name: "수익 모델 실현성", skills: ["/business-model"],
    condition: "BMC 9블록 완성 + 과금 모델 + 유닛 이코노믹스 초안",
    outputType: "business_model_canvas", isRequired: true },
  { id: 6, name: "리스크 식별 완전성", skills: ["/pre-mortem"],
    condition: "핵심 리스크 5개+ + 우선순위 + 대응 방향",
    outputType: "risk_assessment", isRequired: false },
  { id: 7, name: "검증 실험 설계", skills: ["/pre-mortem"],
    condition: "검증 실험 3개+ + 성공/실패 기준 + 실행 방법",
    outputType: "experiment_design", isRequired: false },
  { id: 8, name: "전략 방향 정합성", skills: ["/strategy"],
    condition: "전략 방향 1개+ + 우선순위 매트릭스 + 로드맵 초안",
    outputType: "strategy_document", isRequired: false },
  { id: 9, name: "비치헤드 시장 선정", skills: ["/beachhead-segment"],
    condition: "비치헤드 시장 프로필 + 선정 근거 3가지+ + 진입 전략",
    outputType: "beachhead_analysis", isRequired: false },
  { id: 10, name: "아이디어 발산 충분성", skills: ["/brainstorm"],
    condition: "Use Case 10개+ + 평가 기준 + 상위 3개 선정 근거",
    outputType: "brainstorm_result", isRequired: false },
  { id: 11, name: "분석 일관성", skills: [],
    condition: "가치 제안 ↔ 경쟁 차별화 ↔ 수익 모델 간 논리적 일관성",
    outputType: "consistency_check", isRequired: true },
  { id: 12, name: "실행 가능성", skills: [],
    condition: "전략 → 비치헤드 → 검증 실험 간 연결고리 + KT DS 역량 매칭",
    outputType: "feasibility_check", isRequired: true },
];

export type PmSkillsCriterionStatus = "pending" | "in_progress" | "completed" | "needs_revision";

export interface PmSkillsCriterion {
  id: string;
  bizItemId: string;
  criterionId: number;
  name: string;
  skill: string;
  condition: string;
  status: PmSkillsCriterionStatus;
  evidence: string | null;
  outputType: string;
  score: number | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface PmSkillsCriteriaProgress {
  total: number;
  completed: number;
  inProgress: number;
  needsRevision: number;
  pending: number;
  criteria: PmSkillsCriterion[];
  gateStatus: "blocked" | "warning" | "ready";
}

interface PmCriteriaRow {
  id: string;
  biz_item_id: string;
  criterion_id: number;
  skill: string;
  status: string;
  evidence: string | null;
  output_type: string | null;
  score: number | null;
  completed_at: string | null;
  updated_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function toPmCriterion(row: PmCriteriaRow): PmSkillsCriterion {
  const meta = PM_SKILLS_CRITERIA.find(c => c.id === row.criterion_id);
  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    criterionId: row.criterion_id,
    name: meta?.name ?? "",
    skill: row.skill,
    condition: meta?.condition ?? "",
    status: row.status as PmSkillsCriterionStatus,
    evidence: row.evidence,
    outputType: row.output_type ?? meta?.outputType ?? "",
    score: row.score,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function computePmGateStatus(completed: number, requiredMissing: number): "blocked" | "warning" | "ready" {
  if (requiredMissing > 0) return "blocked";
  if (completed >= 10) return "ready";
  if (completed >= 8) return "warning";
  return "blocked";
}

export class PmSkillsCriteriaService {
  constructor(private db: D1Database) {}

  async initialize(bizItemId: string): Promise<void> {
    for (const c of PM_SKILLS_CRITERIA) {
      const id = generateId();
      const primarySkill = c.skills[0] ?? "cross-validation";
      await this.db
        .prepare(
          `INSERT OR IGNORE INTO pm_skills_criteria (id, biz_item_id, criterion_id, skill, status, output_type, updated_at)
           VALUES (?, ?, ?, ?, 'pending', ?, datetime('now'))`,
        )
        .bind(id, bizItemId, c.id, primarySkill, c.outputType)
        .run();
    }
  }

  async getAll(bizItemId: string): Promise<PmSkillsCriteriaProgress> {
    const { results } = await this.db
      .prepare("SELECT * FROM pm_skills_criteria WHERE biz_item_id = ? ORDER BY criterion_id")
      .bind(bizItemId)
      .all<PmCriteriaRow>();

    const criteria = results.map(toPmCriterion);

    if (criteria.length === 0) {
      const emptyCriteria: PmSkillsCriterion[] = PM_SKILLS_CRITERIA.map(c => ({
        id: "",
        bizItemId,
        criterionId: c.id,
        name: c.name,
        skill: c.skills[0] ?? "cross-validation",
        condition: c.condition,
        status: "pending" as PmSkillsCriterionStatus,
        evidence: null,
        outputType: c.outputType,
        score: null,
        completedAt: null,
        updatedAt: "",
      }));
      return { total: 12, completed: 0, inProgress: 0, needsRevision: 0, pending: 12, criteria: emptyCriteria, gateStatus: "blocked" };
    }

    const completed = criteria.filter(c => c.status === "completed").length;
    const inProgress = criteria.filter(c => c.status === "in_progress").length;
    const needsRevision = criteria.filter(c => c.status === "needs_revision").length;
    const pending = criteria.filter(c => c.status === "pending").length;

    const requiredIds = PM_SKILLS_CRITERIA.filter(c => c.isRequired).map(c => c.id);
    const requiredMissing = requiredIds.filter(id => {
      const c = criteria.find(cr => cr.criterionId === id);
      return !c || c.status !== "completed";
    }).length;

    return {
      total: 12,
      completed,
      inProgress,
      needsRevision,
      pending,
      criteria,
      gateStatus: computePmGateStatus(completed, requiredMissing),
    };
  }

  async update(
    bizItemId: string,
    criterionId: number,
    data: { status: PmSkillsCriterionStatus; evidence?: string; score?: number },
  ): Promise<PmSkillsCriterion> {
    const now = new Date().toISOString();
    const completedAt = data.status === "completed" ? now : null;

    await this.db
      .prepare(
        `UPDATE pm_skills_criteria
         SET status = ?, evidence = COALESCE(?, evidence), score = COALESCE(?, score), completed_at = ?, updated_at = ?
         WHERE biz_item_id = ? AND criterion_id = ?`,
      )
      .bind(data.status, data.evidence ?? null, data.score ?? null, completedAt, now, bizItemId, criterionId)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM pm_skills_criteria WHERE biz_item_id = ? AND criterion_id = ?")
      .bind(bizItemId, criterionId)
      .first<PmCriteriaRow>();

    return toPmCriterion(row!);
  }

  async checkGate(bizItemId: string): Promise<GateResult> {
    const progress = await this.getAll(bizItemId);
    const details = progress.criteria.map(c => {
      const meta = PM_SKILLS_CRITERIA.find(m => m.id === c.criterionId);
      return {
        criterionId: c.criterionId,
        name: c.name,
        status: c.status,
        isRequired: meta?.isRequired ?? false,
      };
    });

    const requiredMissing = details.filter(d => d.isRequired && d.status !== "completed").length;

    return {
      gateStatus: progress.gateStatus,
      completedCount: progress.completed,
      totalCount: 12,
      requiredMissing,
      details,
    };
  }
}
