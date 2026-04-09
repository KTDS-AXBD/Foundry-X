/**
 * F296: 통합 평가 결과서 생성 + 조회 서비스
 * F493: v2 DiscoveryReportData (9탭 리치 리포트) generateFromFixture() 추가
 */

import type {
  DiscoveryReportData,
  EvaluationReport,
  GenerateReportInput,
  ReportListQuery,
} from "../schemas/evaluation-report.schema.js";

interface ReportRow {
  id: string;
  org_id: string;
  biz_item_id: string;
  title: string;
  summary: string | null;
  skill_scores: string;
  report_data: string | null;
  traffic_light: string;
  traffic_light_history: string;
  recommendation: string | null;
  generated_by: string;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ArtifactRow {
  skill_id: string;
  status: string;
  output_text: string | null;
  duration_ms: number;
}

/** 스킬 ID → 사람이 읽을 수 있는 라벨 */
const SKILL_LABELS: Record<string, string> = {
  "2-1": "시장 규모 분석",
  "2-2": "경쟁 분석",
  "2-3": "고객 분석",
  "2-4": "기술 분석",
  "2-5": "사업성 평가",
  "2-6": "리스크 분석",
  "2-7": "재무 분석",
  "2-8": "종합 판단",
};

function rowToReport(row: ReportRow): EvaluationReport {
  let reportData: DiscoveryReportData | null = null;
  if (row.report_data) {
    try {
      reportData = JSON.parse(row.report_data) as DiscoveryReportData;
    } catch {
      reportData = null;
    }
  }

  return {
    id: row.id,
    orgId: row.org_id,
    bizItemId: row.biz_item_id,
    title: row.title,
    summary: row.summary,
    skillScores: JSON.parse(row.skill_scores),
    reportData,
    trafficLight: row.traffic_light as EvaluationReport["trafficLight"],
    trafficLightHistory: JSON.parse(row.traffic_light_history),
    recommendation: row.recommendation,
    generatedBy: row.generated_by,
    version: row.version,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function computeTrafficLight(scores: Record<string, { score: number }>): "green" | "yellow" | "red" {
  const values = Object.values(scores).map((s) => s.score);
  if (values.length === 0) return "red";
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg >= 70) return "green";
  if (avg >= 40) return "yellow";
  return "red";
}

export class EvaluationReportService {
  constructor(private db: D1Database) {}

  /**
   * F493: v2 fixture 기반 결과서 생성 (9탭 리치 리포트)
   * INSERT OR REPLACE — idempotent (id = `eval-{bizItemId}-v1`)
   */
  async generateFromFixture(
    orgId: string,
    userId: string,
    bizItemId: string,
    fixtureData: DiscoveryReportData,
  ): Promise<EvaluationReport> {
    const id = `eval-${bizItemId}-v1`;
    const now = new Date().toISOString();
    const trafficLight = fixtureData.summary.trafficLight;

    // v1 호환: skill_scores에도 요약 넣어두기 (레거시 페이지 폴백용)
    const legacySkillScores: Record<string, { score: number; label: string; summary: string }> =
      Object.fromEntries(
        Object.entries(fixtureData.tabs).map(([stageId, tab]) => [
          stageId,
          { score: 80, label: tab.title, summary: tab.subtitle ?? "" },
        ]),
      );

    await this.db
      .prepare(
        `INSERT OR REPLACE INTO evaluation_reports
           (id, org_id, biz_item_id, title, summary, skill_scores, report_data,
            traffic_light, traffic_light_history, recommendation, generated_by,
            created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fixture', ?, ?, ?)`,
      )
      .bind(
        id,
        orgId,
        bizItemId,
        fixtureData.bizItemTitle,
        fixtureData.summary.executiveSummary,
        JSON.stringify(legacySkillScores),
        JSON.stringify(fixtureData),
        trafficLight,
        JSON.stringify([{ date: now, value: trafficLight }]),
        fixtureData.summary.recommendation,
        userId,
        now,
        now,
      )
      .run();

    return (await this.getById(orgId, id)) as EvaluationReport;
  }

  /**
   * @deprecated Use generateFromFixture() for v2 reports, or future AI pipeline (Phase 31+)
   */
  async generate(
    orgId: string,
    userId: string,
    input: GenerateReportInput,
  ): Promise<EvaluationReport> {
    // 1. biz-item의 산출물 조회
    const { results: artifacts } = await this.db
      .prepare(
        `SELECT skill_id, status, output_text, duration_ms
         FROM bd_artifacts
         WHERE org_id = ? AND biz_item_id = ? AND status = 'completed'
         ORDER BY skill_id, version DESC`,
      )
      .bind(orgId, input.bizItemId)
      .all<ArtifactRow>();

    // 2. 스킬별 최신 산출물로 그룹핑 → 점수 산출
    const seen = new Set<string>();
    const skillScores: Record<string, { score: number; label: string; summary: string }> = {};

    for (const art of artifacts) {
      if (seen.has(art.skill_id)) continue;
      seen.add(art.skill_id);

      const outputLen = art.output_text?.length ?? 0;
      const score = Math.min(100, Math.round((outputLen / 500) * 100));
      const summary = art.output_text ? art.output_text.slice(0, 200) : "(산출물 없음)";

      skillScores[art.skill_id] = {
        score,
        label: SKILL_LABELS[art.skill_id] ?? art.skill_id,
        summary,
      };
    }

    // 3. 신호등 산출
    const trafficLight = computeTrafficLight(skillScores);
    const now = new Date().toISOString();
    const title = input.title ?? `${input.bizItemId} 통합 평가 결과서`;

    // 4. INSERT
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    await this.db
      .prepare(
        `INSERT INTO evaluation_reports
           (id, org_id, biz_item_id, title, summary, skill_scores, traffic_light, traffic_light_history, recommendation, generated_by, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai', ?, ?, ?)`,
      )
      .bind(
        id,
        orgId,
        input.bizItemId,
        title,
        null,
        JSON.stringify(skillScores),
        trafficLight,
        JSON.stringify([{ date: now, value: trafficLight }]),
        null,
        userId,
        now,
        now,
      )
      .run();

    return {
      id,
      orgId,
      bizItemId: input.bizItemId,
      title,
      summary: null,
      skillScores,
      reportData: null,
      trafficLight,
      trafficLightHistory: [{ date: now, value: trafficLight }],
      recommendation: null,
      generatedBy: "ai",
      version: 1,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getById(orgId: string, id: string): Promise<EvaluationReport | null> {
    const row = await this.db
      .prepare("SELECT * FROM evaluation_reports WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<ReportRow>();
    return row ? rowToReport(row) : null;
  }

  async list(
    orgId: string,
    query: ReportListQuery,
  ): Promise<{ items: EvaluationReport[]; total: number }> {
    const conditions = ["org_id = ?"];
    const params: unknown[] = [orgId];

    if (query.bizItemId) {
      conditions.push("biz_item_id = ?");
      params.push(query.bizItemId);
    }

    const where = conditions.join(" AND ");

    const countRow = await this.db
      .prepare(`SELECT COUNT(*) as cnt FROM evaluation_reports WHERE ${where}`)
      .bind(...params)
      .first<{ cnt: number }>();

    const { results } = await this.db
      .prepare(
        `SELECT * FROM evaluation_reports WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, query.limit, query.offset)
      .all<ReportRow>();

    return {
      items: results.map(rowToReport),
      total: countRow?.cnt ?? 0,
    };
  }
}
