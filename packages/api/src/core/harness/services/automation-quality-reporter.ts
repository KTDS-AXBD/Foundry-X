/**
 * AutomationQualityReporter — 기존 5개 데이터 소스를 집계하여
 * 품질 리포트 + 실패 패턴 + 개선 제안 자동 생성 (F151)
 */

// ── 타입 정의 ──────────────────────────────────

export interface QualityMetrics {
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  partialCount: number;
  successRate: number;
  avgDurationMs: number;
  totalCostUsd: number;
  avgCostPerExecution: number;
  fallbackCount: number;
  fallbackRate: number;
  feedbackPending: number;
  feedbackApplied: number;
  feedbackProcessingRate: number;
}

export interface TaskTypeBreakdown {
  taskType: string;
  executions: number;
  successRate: number;
  avgDurationMs: number;
  totalCostUsd: number;
  avgCostPerExecution: number;
}

export interface ModelBreakdown {
  model: string;
  executions: number;
  successRate: number;
  avgDurationMs: number;
  totalCostUsd: number;
  tokenEfficiency: number;
}

export interface QualityReport {
  period: { from: string; to: string; days: number };
  overall: QualityMetrics;
  byTaskType: TaskTypeBreakdown[];
  byModel: ModelBreakdown[];
  dailyTrends: DailyTrend[];
}

export interface DailyTrend {
  date: string;
  executions: number;
  successRate: number;
  avgDurationMs: number;
  totalCostUsd: number;
}

export interface FailurePattern {
  taskType: string;
  model: string;
  failureCount: number;
  topReasons: string[];
  pendingFeedback: number;
}

export type SuggestionSeverity = "info" | "warning" | "critical";
export type SuggestionType =
  | "model-unstable"
  | "fallback-frequent"
  | "cost-anomaly"
  | "feedback-backlog"
  | "retry-excessive"
  | "task-low-quality";

export interface Suggestion {
  type: SuggestionType;
  severity: SuggestionSeverity;
  message: string;
  data: Record<string, unknown>;
}

interface QualitySnapshotRow {
  id: string;
  snapshot_date: string;
  task_type: string | null;
  total_executions: number;
  success_count: number;
  failed_count: number;
  success_rate: number;
  avg_duration_ms: number;
  total_cost_usd: number;
  avg_cost_per_execution: number;
  feedback_pending: number;
  feedback_applied: number;
  fallback_count: number;
  top_failure_reason: string | null;
  created_at: string;
}

// ── 유틸리티 ──────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getToday(): string {
  return formatDate(new Date());
}

function getDateRange(days: number): { from: string; to: string; dates: string[] } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days + 1);

  const dates: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    dates.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return { from: formatDate(from), to: formatDate(to), dates };
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

// ── 제안 규칙 ──────────────────────────────────

const SUGGESTION_RULES: Array<{
  type: SuggestionType;
  severity: SuggestionSeverity;
  evaluate: (report: QualityReport) => Suggestion | null;
}> = [
  {
    type: "model-unstable",
    severity: "warning",
    evaluate: (report) => {
      const unstable = report.byModel.filter(m => m.successRate < 80 && m.executions >= 5);
      if (unstable.length === 0) return null;
      return {
        type: "model-unstable",
        severity: "warning",
        message: `모델 ${unstable.map(m => m.model).join(", ")}의 성공률이 80% 미만이에요. 모델 교체 또는 Fallback 체인 추가를 권장해요.`,
        data: { models: unstable.map(m => ({ model: m.model, successRate: m.successRate, executions: m.executions })) },
      };
    },
  },
  {
    type: "fallback-frequent",
    severity: "warning",
    evaluate: (report) => {
      if (report.overall.fallbackRate <= 20) return null;
      return {
        type: "fallback-frequent",
        severity: "warning",
        message: `Fallback 발생률이 ${report.overall.fallbackRate.toFixed(1)}%로 높아요. 주 모델 안정성을 점검해주세요.`,
        data: { fallbackRate: report.overall.fallbackRate, fallbackCount: report.overall.fallbackCount },
      };
    },
  },
  {
    type: "cost-anomaly",
    severity: "info",
    evaluate: (report) => {
      const avgCost = report.overall.avgCostPerExecution;
      const expensive = report.byTaskType.filter(t => t.avgCostPerExecution > avgCost * 2 && t.executions >= 3);
      if (expensive.length === 0) return null;
      return {
        type: "cost-anomaly",
        severity: "info",
        message: `${expensive.map(t => t.taskType).join(", ")} 태스크의 평균 비용이 전체 평균의 2배 이상이에요.`,
        data: { tasks: expensive, overallAvg: avgCost },
      };
    },
  },
  {
    type: "feedback-backlog",
    severity: "warning",
    evaluate: (report) => {
      if (report.overall.feedbackPending <= 10) return null;
      return {
        type: "feedback-backlog",
        severity: "warning",
        message: `미처리 피드백이 ${report.overall.feedbackPending}건 쌓여 있어요. 학습 루프가 지연되고 있어요.`,
        data: { pending: report.overall.feedbackPending, processingRate: report.overall.feedbackProcessingRate },
      };
    },
  },
  {
    type: "retry-excessive",
    severity: "info",
    evaluate: () => null, // 별도 쿼리 필요 — skip
  },
  {
    type: "task-low-quality",
    severity: "critical",
    evaluate: (report) => {
      const lowQuality = report.byTaskType.filter(t => t.successRate < 60 && t.executions >= 5);
      if (lowQuality.length === 0) return null;
      return {
        type: "task-low-quality",
        severity: "critical",
        message: `${lowQuality.map(t => t.taskType).join(", ")} 태스크의 성공률이 60% 미만이에요. 자동화 적합성을 재검토하세요.`,
        data: { tasks: lowQuality },
      };
    },
  },
];

// ── 서비스 ──────────────────────────────────

export class AutomationQualityReporter {
  constructor(private db: D1Database) {}

  async generateReport(days = 7, taskType?: string): Promise<QualityReport> {
    const range = getDateRange(days);
    const today = getToday();

    // 일별 스냅샷 수집
    const dailyTrends: DailyTrend[] = [];
    let totalExec = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalPartial = 0;
    let totalDurationSum = 0;
    let totalCost = 0;
    let totalFallback = 0;
    let totalFeedbackPending = 0;
    let totalFeedbackApplied = 0;
    let totalFeedbackAll = 0;

    for (const date of range.dates) {
      const isToday = date === today;
      const snapshot = await this.getOrCreateSnapshot(date, taskType ?? null, isToday);

      dailyTrends.push({
        date,
        executions: snapshot.total_executions,
        successRate: snapshot.success_rate,
        avgDurationMs: snapshot.avg_duration_ms,
        totalCostUsd: snapshot.total_cost_usd,
      });

      totalExec += snapshot.total_executions;
      totalSuccess += snapshot.success_count;
      totalFailed += snapshot.failed_count;
      totalPartial += snapshot.total_executions - snapshot.success_count - snapshot.failed_count;
      totalDurationSum += snapshot.avg_duration_ms * snapshot.total_executions;
      totalCost += snapshot.total_cost_usd;
      totalFallback += snapshot.fallback_count;
      totalFeedbackPending += snapshot.feedback_pending;
      totalFeedbackApplied += snapshot.feedback_applied;
    }

    // feedback 전체 수 (pending + reviewed + applied) — 기간 전체 집계
    const fbAgg = await this.aggregateFeedback(range.from, range.to, taskType);
    totalFeedbackAll = fbAgg.pending + fbAgg.reviewed + fbAgg.applied;
    totalFeedbackPending = fbAgg.pending;
    totalFeedbackApplied = fbAgg.applied;

    const overall: QualityMetrics = {
      totalExecutions: totalExec,
      successCount: totalSuccess,
      failedCount: totalFailed,
      partialCount: totalPartial,
      successRate: safeRate(totalSuccess, totalExec),
      avgDurationMs: totalExec > 0 ? Math.round(totalDurationSum / totalExec) : 0,
      totalCostUsd: Math.round(totalCost * 10000) / 10000,
      avgCostPerExecution: totalExec > 0 ? Math.round((totalCost / totalExec) * 10000) / 10000 : 0,
      fallbackCount: totalFallback,
      fallbackRate: safeRate(totalFallback, totalExec),
      feedbackPending: totalFeedbackPending,
      feedbackApplied: totalFeedbackApplied,
      feedbackProcessingRate: safeRate(totalFeedbackApplied, totalFeedbackAll),
    };

    // byTaskType, byModel — 기간 전체 직접 집계
    const byTaskType = await this.aggregateByTaskType(range.from, range.to);
    const byModel = await this.aggregateByModel(range.from, range.to);

    return {
      period: { from: range.from, to: range.to, days },
      overall,
      byTaskType,
      byModel,
      dailyTrends,
    };
  }

  async getFailurePatterns(days = 30): Promise<FailurePattern[]> {
    const range = getDateRange(days);

    const rows = await this.db
      .prepare(
        `SELECT
           m.task_type,
           m.model,
           COUNT(*) as failure_count
         FROM model_execution_metrics m
         WHERE m.status = 'failed'
           AND date(m.recorded_at) >= ?
           AND date(m.recorded_at) <= ?
         GROUP BY m.task_type, m.model
         ORDER BY failure_count DESC`,
      )
      .bind(range.from, range.to)
      .all<{ task_type: string; model: string; failure_count: number }>();

    const patterns: FailurePattern[] = [];

    for (const row of rows.results) {
      // topReasons from agent_feedback
      const reasons = await this.db
        .prepare(
          `SELECT failure_reason, COUNT(*) as cnt
           FROM agent_feedback
           WHERE task_type = ?
             AND failure_reason IS NOT NULL
             AND date(created_at) >= ?
             AND date(created_at) <= ?
           GROUP BY failure_reason
           ORDER BY cnt DESC
           LIMIT 3`,
        )
        .bind(row.task_type, range.from, range.to)
        .all<{ failure_reason: string; cnt: number }>();

      // pendingFeedback count
      const pending = await this.db
        .prepare(
          `SELECT COUNT(*) as cnt
           FROM agent_feedback
           WHERE task_type = ?
             AND status = 'pending'
             AND date(created_at) >= ?
             AND date(created_at) <= ?`,
        )
        .bind(row.task_type, range.from, range.to)
        .first<{ cnt: number }>();

      patterns.push({
        taskType: row.task_type,
        model: row.model,
        failureCount: row.failure_count,
        topReasons: reasons.results.map(r => r.failure_reason),
        pendingFeedback: pending?.cnt ?? 0,
      });
    }

    return patterns;
  }

  async getImprovementSuggestions(days = 30): Promise<Suggestion[]> {
    const report = await this.generateReport(days);
    const suggestions: Suggestion[] = [];

    for (const rule of SUGGESTION_RULES) {
      const suggestion = rule.evaluate(report);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  // ── 내부 메서드 ──────────────────────────────

  private async getOrCreateSnapshot(
    date: string,
    taskType: string | null,
    forceRefresh: boolean,
  ): Promise<QualitySnapshotRow> {
    if (!forceRefresh) {
      const cached = taskType
        ? await this.db
            .prepare(
              "SELECT * FROM automation_quality_snapshots WHERE snapshot_date = ? AND task_type = ?",
            )
            .bind(date, taskType)
            .first<QualitySnapshotRow>()
        : await this.db
            .prepare(
              "SELECT * FROM automation_quality_snapshots WHERE snapshot_date = ? AND task_type IS NULL",
            )
            .bind(date)
            .first<QualitySnapshotRow>();

      if (cached) return cached;
    }

    // 집계
    const exec = await this.aggregateExecutions(date, date, taskType ?? undefined);
    const fb = await this.aggregateFeedback(date, date, taskType ?? undefined);
    const fallback = await this.aggregateFallbacks(date, date);

    // top failure reason
    const topReason = await this.db
      .prepare(
        `SELECT failure_reason, COUNT(*) as cnt
         FROM agent_feedback
         WHERE failure_reason IS NOT NULL
           AND date(created_at) = ?
           ${taskType ? "AND task_type = ?" : ""}
         GROUP BY failure_reason
         ORDER BY cnt DESC
         LIMIT 1`,
      )
      .bind(...(taskType ? [date, taskType] : [date]))
      .first<{ failure_reason: string; cnt: number }>();

    const id = `qs_${date}_${taskType ?? "all"}_${crypto.randomUUID().slice(0, 8)}`;
    const successRate = safeRate(exec.success, exec.total);
    const avgCostPerExec = exec.total > 0
      ? Math.round((exec.totalCost / exec.total) * 10000) / 10000
      : 0;

    // UPSERT (삭제 후 삽입 — SQLite UPSERT 대안)
    if (taskType) {
      await this.db
        .prepare("DELETE FROM automation_quality_snapshots WHERE snapshot_date = ? AND task_type = ?")
        .bind(date, taskType)
        .run();
    } else {
      await this.db
        .prepare("DELETE FROM automation_quality_snapshots WHERE snapshot_date = ? AND task_type IS NULL")
        .bind(date)
        .run();
    }

    await this.db
      .prepare(
        `INSERT INTO automation_quality_snapshots
          (id, snapshot_date, task_type, total_executions, success_count, failed_count,
           success_rate, avg_duration_ms, total_cost_usd, avg_cost_per_execution,
           feedback_pending, feedback_applied, fallback_count, top_failure_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id, date, taskType,
        exec.total, exec.success, exec.failed,
        successRate, exec.avgDuration, exec.totalCost, avgCostPerExec,
        fb.pending, fb.applied, fallback.count,
        topReason?.failure_reason ?? null,
      )
      .run();

    return {
      id,
      snapshot_date: date,
      task_type: taskType,
      total_executions: exec.total,
      success_count: exec.success,
      failed_count: exec.failed,
      success_rate: successRate,
      avg_duration_ms: exec.avgDuration,
      total_cost_usd: exec.totalCost,
      avg_cost_per_execution: avgCostPerExec,
      feedback_pending: fb.pending,
      feedback_applied: fb.applied,
      fallback_count: fallback.count,
      top_failure_reason: topReason?.failure_reason ?? null,
      created_at: new Date().toISOString(),
    };
  }

  private async aggregateExecutions(
    from: string,
    to: string,
    taskType?: string,
  ): Promise<{ total: number; success: number; failed: number; partial: number; avgDuration: number; totalCost: number }> {
    const taskFilter = taskType ? "AND task_type = ?" : "";
    const row = await this.db
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
           SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
           SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial,
           AVG(duration_ms) as avg_duration,
           SUM(cost_usd) as total_cost
         FROM model_execution_metrics
         WHERE date(recorded_at) >= ? AND date(recorded_at) <= ?
           ${taskFilter}`,
      )
      .bind(...(taskType ? [from, to, taskType] : [from, to]))
      .first<{ total: number; success: number; failed: number; partial: number; avg_duration: number; total_cost: number }>();

    return {
      total: row?.total ?? 0,
      success: row?.success ?? 0,
      failed: row?.failed ?? 0,
      partial: row?.partial ?? 0,
      avgDuration: Math.round(row?.avg_duration ?? 0),
      totalCost: Math.round((row?.total_cost ?? 0) * 10000) / 10000,
    };
  }

  private async aggregateFeedback(
    from: string,
    to: string,
    taskType?: string,
  ): Promise<{ pending: number; reviewed: number; applied: number }> {
    const taskFilter = taskType ? "AND task_type = ?" : "";
    const row = await this.db
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed,
           SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied
         FROM agent_feedback
         WHERE date(created_at) >= ? AND date(created_at) <= ?
           ${taskFilter}`,
      )
      .bind(...(taskType ? [from, to, taskType] : [from, to]))
      .first<{ pending: number; reviewed: number; applied: number }>();

    return {
      pending: row?.pending ?? 0,
      reviewed: row?.reviewed ?? 0,
      applied: row?.applied ?? 0,
    };
  }

  private async aggregateFallbacks(
    from: string,
    to: string,
  ): Promise<{ count: number }> {
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) as cnt
         FROM fallback_events
         WHERE date(created_at) >= ? AND date(created_at) <= ?`,
      )
      .bind(from, to)
      .first<{ cnt: number }>();

    return { count: row?.cnt ?? 0 };
  }

  private async aggregateByModel(from: string, to: string): Promise<ModelBreakdown[]> {
    const rows = await this.db
      .prepare(
        `SELECT
           model,
           COUNT(*) as executions,
           SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
           AVG(duration_ms) as avg_duration,
           SUM(cost_usd) as total_cost,
           SUM(input_tokens + output_tokens) as total_tokens,
           SUM(output_tokens) as output_tokens
         FROM model_execution_metrics
         WHERE date(recorded_at) >= ? AND date(recorded_at) <= ?
         GROUP BY model
         ORDER BY executions DESC`,
      )
      .bind(from, to)
      .all<{
        model: string;
        executions: number;
        success: number;
        avg_duration: number;
        total_cost: number;
        total_tokens: number;
        output_tokens: number;
      }>();

    return rows.results.map(r => ({
      model: r.model,
      executions: r.executions,
      successRate: safeRate(r.success, r.executions),
      avgDurationMs: Math.round(r.avg_duration),
      totalCostUsd: Math.round(r.total_cost * 10000) / 10000,
      tokenEfficiency: r.total_tokens > 0
        ? Math.round((r.output_tokens / r.total_tokens) * 10000) / 10000
        : 0,
    }));
  }

  private async aggregateByTaskType(from: string, to: string): Promise<TaskTypeBreakdown[]> {
    const rows = await this.db
      .prepare(
        `SELECT
           task_type,
           COUNT(*) as executions,
           SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
           AVG(duration_ms) as avg_duration,
           SUM(cost_usd) as total_cost
         FROM model_execution_metrics
         WHERE date(recorded_at) >= ? AND date(recorded_at) <= ?
         GROUP BY task_type
         ORDER BY executions DESC`,
      )
      .bind(from, to)
      .all<{
        task_type: string;
        executions: number;
        success: number;
        avg_duration: number;
        total_cost: number;
      }>();

    return rows.results.map(r => ({
      taskType: r.task_type,
      executions: r.executions,
      successRate: safeRate(r.success, r.executions),
      avgDurationMs: Math.round(r.avg_duration),
      totalCostUsd: Math.round(r.total_cost * 10000) / 10000,
      avgCostPerExecution: r.executions > 0
        ? Math.round((r.total_cost / r.executions) * 10000) / 10000
        : 0,
    }));
  }
}
