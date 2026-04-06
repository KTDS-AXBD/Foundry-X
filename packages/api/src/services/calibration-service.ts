// ─── F391: Calibration Service (Sprint 178) ───
// 자동 5차원 점수와 수동 사용자 평가 간 Pearson 상관관계 계산

import type { CorrelationResult, CorrelationSummary } from "../schemas/user-evaluation-schema.js";

interface AutoScore {
  jobId: string;
  build: number;
  ui: number;
  functional: number;
  prd: number;
  code: number;
  total: number;
}

interface ManualScore {
  jobId: string;
  build: number;
  ui: number;
  functional: number;
  prd: number;
  code: number;
  overall: number;
}

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - meanX;
    const dy = ys[i]! - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : Math.round((num / denom) * 1000) / 1000;
}

function mean(arr: number[]): number {
  return arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 1000) / 1000 : 0;
}

// 수동 1~5 → 자동 0~1 스케일 변환
function manualToAutoScale(score: number): number {
  return (score - 1) / 4;
}

export class CalibrationService {
  constructor(private db: D1Database) {}

  async computeCorrelation(orgId: string): Promise<CorrelationSummary> {
    // 자동 점수: 각 job의 최신 라운드
    const { results: autoRows } = await this.db
      .prepare(
        `SELECT pq.job_id, pq.build_score, pq.ui_score, pq.functional_score,
                pq.prd_score, pq.code_score, pq.total_score
         FROM prototype_quality pq
         JOIN prototype_jobs pj ON pq.job_id = pj.id
         WHERE pj.org_id = ?
           AND pq.round = (SELECT MAX(pq2.round) FROM prototype_quality pq2 WHERE pq2.job_id = pq.job_id)`,
      )
      .bind(orgId)
      .all<{ job_id: string; build_score: number; ui_score: number; functional_score: number; prd_score: number; code_score: number; total_score: number }>();

    // 수동 평가: 각 job별 평균 (여러 평가자 평균)
    const { results: manualRows } = await this.db
      .prepare(
        `SELECT job_id,
                AVG(build_score) AS build, AVG(ui_score) AS ui,
                AVG(functional_score) AS functional, AVG(prd_score) AS prd,
                AVG(code_score) AS code, AVG(overall_score) AS overall
         FROM user_evaluations
         WHERE org_id = ?
         GROUP BY job_id`,
      )
      .bind(orgId)
      .all<{ job_id: string; build: number; ui: number; functional: number; prd: number; code: number; overall: number }>();

    const autoMap = new Map<string, AutoScore>();
    for (const r of autoRows ?? []) {
      autoMap.set(r.job_id, {
        jobId: r.job_id,
        build: r.build_score,
        ui: r.ui_score,
        functional: r.functional_score,
        prd: r.prd_score,
        code: r.code_score,
        total: r.total_score,
      });
    }

    const manualMap = new Map<string, ManualScore>();
    for (const r of manualRows ?? []) {
      manualMap.set(r.job_id, {
        jobId: r.job_id,
        build: r.build,
        ui: r.ui,
        functional: r.functional,
        prd: r.prd,
        code: r.code,
        overall: r.overall,
      });
    }

    // 양쪽 데이터가 있는 job만 매칭
    const matchedJobs = [...autoMap.keys()].filter((id) => manualMap.has(id));
    const totalEvaluations = (manualRows ?? []).length;

    if (matchedJobs.length < 3) {
      return {
        correlations: [],
        overallPearson: 0,
        totalEvaluations,
        calibrationStatus: "insufficient_data",
      };
    }

    const dimensions: Array<{ name: string; autoKey: keyof AutoScore; manualKey: keyof ManualScore }> = [
      { name: "build", autoKey: "build", manualKey: "build" },
      { name: "ui", autoKey: "ui", manualKey: "ui" },
      { name: "functional", autoKey: "functional", manualKey: "functional" },
      { name: "prd", autoKey: "prd", manualKey: "prd" },
      { name: "code", autoKey: "code", manualKey: "code" },
    ];

    const correlations: CorrelationResult[] = dimensions.map((dim) => {
      const autoValues = matchedJobs.map((id) => autoMap.get(id)![dim.autoKey] as number);
      const manualValues = matchedJobs.map((id) => manualToAutoScale(manualMap.get(id)![dim.manualKey] as number));
      return {
        dimension: dim.name,
        pearson: pearsonR(autoValues, manualValues),
        sampleSize: matchedJobs.length,
        autoMean: mean(autoValues),
        manualMean: mean(manualValues),
      };
    });

    // overall: total_score (0~100) vs overall (1~5 → 0~1 → 0~100)
    const autoTotals = matchedJobs.map((id) => autoMap.get(id)!.total);
    const manualOveralls = matchedJobs.map((id) => manualToAutoScale(manualMap.get(id)!.overall) * 100);
    const overallPearson = pearsonR(autoTotals, manualOveralls);

    const avgPearson = correlations.reduce((s, c) => s + Math.abs(c.pearson), 0) / correlations.length;
    const calibrationStatus = avgPearson >= 0.7 ? "good" : avgPearson >= 0.4 ? "needs_attention" : "insufficient_data";

    return {
      correlations,
      overallPearson,
      totalEvaluations,
      calibrationStatus,
    };
  }
}
