/**
 * F277: WorkflowPatternExtractorService — workflow_executions + skill_executions 조인 기반 시퀀스 패턴 추출
 */

import type {
  CapturedWorkflowPattern,
  CapturedWorkflowPatternDetail,
  CapturedPatternStatus,
  PipelineStage,
} from "@foundry-x/shared";
import type { ExtractWorkflowPatternsInput, ListWorkflowPatternsQuery } from "../schemas/captured-engine.js";
import { wilsonScoreLowerBound } from "./pattern-extractor.js";

export class WorkflowPatternExtractorService {
  constructor(private db: D1Database) {}

  async extract(
    tenantId: string,
    params: ExtractWorkflowPatternsInput,
  ): Promise<{ patterns: CapturedWorkflowPattern[]; count: number }> {
    // 1. Fetch completed workflow executions with their definitions
    let weSql = `
      SELECT we.id, we.workflow_id, we.status, we.completed_at,
             w.definition, w.name AS workflow_name
      FROM workflow_executions we
        JOIN workflows w ON we.workflow_id = w.id AND we.org_id = w.org_id
      WHERE we.org_id = ? AND we.status = 'completed'
    `;
    const weBindings: unknown[] = [tenantId];

    if (params.methodologyId) {
      // Filter by methodology if workflow has a methodology linkage
      weSql += " AND w.template_id = ?";
      weBindings.push(params.methodologyId);
    }

    const weRows = await this.db
      .prepare(weSql)
      .bind(...weBindings)
      .all<{
        id: string;
        workflow_id: string;
        status: string;
        completed_at: string | null;
        definition: string;
        workflow_name: string;
      }>();

    if (!weRows.results?.length) return { patterns: [], count: 0 };

    // 2. For each execution, parse definition → extract step sequence → find associated skills
    const sequenceGroups = new Map<string, {
      steps: { stepId: string; stepName: string; action: string }[];
      skillIds: string[];
      methodologyId: string | null;
      pipelineStage: string;
      count: number;
      successCount: number;
      totalCost: number;
      totalDuration: number;
    }>();

    for (const we of weRows.results) {
      const nodes = parseJson<WorkflowNodeDef[]>(we.definition, []);
      if (nodes.length === 0) continue;

      const steps = nodes.map((n) => ({
        stepId: n.id,
        stepName: n.label ?? n.id,
        action: n.action ?? "execute",
      }));

      // Find skill_executions associated with this workflow execution's time window
      const skillRows = await this.db
        .prepare(
          `SELECT DISTINCT skill_id FROM skill_executions
           WHERE tenant_id = ? AND status = 'completed'
             AND executed_at >= COALESCE(
               (SELECT started_at FROM workflow_executions WHERE id = ?), datetime('now', '-1 day'))
             AND executed_at <= COALESCE(?, datetime('now'))
           ORDER BY executed_at ASC`,
        )
        .bind(tenantId, we.id, we.completed_at)
        .all<{ skill_id: string }>();

      const skillIds = (skillRows.results ?? []).map((r) => r.skill_id);
      const seqKey = JSON.stringify(steps);

      // Determine pipeline stage from workflow nodes or fallback
      const stage = detectPipelineStage(nodes, we.workflow_name);

      const existing = sequenceGroups.get(seqKey);
      if (existing) {
        existing.count++;
        existing.successCount++;
        // Merge skill IDs
        for (const sid of skillIds) {
          if (!existing.skillIds.includes(sid)) existing.skillIds.push(sid);
        }
      } else {
        sequenceGroups.set(seqKey, {
          steps,
          skillIds,
          methodologyId: params.methodologyId ?? null,
          pipelineStage: stage,
          count: 1,
          successCount: 1,
          totalCost: 0,
          totalDuration: 0,
        });
      }
    }

    // 3. Filter by minSampleCount + minSuccessRate and insert patterns
    const patterns: CapturedWorkflowPattern[] = [];

    for (const [_seqKey, group] of sequenceGroups) {
      if (group.count < params.minSampleCount) continue;
      const successRate = group.successCount / group.count;
      if (successRate < params.minSuccessRate) continue;

      const confidence = wilsonScoreLowerBound(successRate, group.count);
      const id = generateId("cp");
      const expiresAt = new Date(Date.now() + 30 * 86400_000).toISOString();

      await this.db
        .prepare(
          `INSERT INTO captured_workflow_patterns
            (id, tenant_id, methodology_id, pipeline_stage,
             workflow_step_sequence, skill_sequence,
             success_rate, sample_count, avg_cost_usd, avg_duration_ms,
             confidence, status, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        )
        .bind(
          id, tenantId, group.methodologyId, group.pipelineStage,
          JSON.stringify(group.steps), JSON.stringify(group.skillIds),
          successRate, group.count,
          group.count > 0 ? group.totalCost / group.count : 0,
          group.count > 0 ? Math.round(group.totalDuration / group.count) : 0,
          confidence, expiresAt,
        )
        .run();

      patterns.push({
        id,
        tenantId,
        methodologyId: group.methodologyId,
        pipelineStage: group.pipelineStage as PipelineStage,
        workflowStepSequence: group.steps,
        skillSequence: group.skillIds,
        successRate,
        sampleCount: group.count,
        avgCostUsd: group.count > 0 ? group.totalCost / group.count : 0,
        avgDurationMs: group.count > 0 ? Math.round(group.totalDuration / group.count) : 0,
        confidence,
        status: "active",
        extractedAt: new Date().toISOString(),
        expiresAt,
      });
    }

    return { patterns, count: patterns.length };
  }

  async getPatterns(
    tenantId: string,
    params: ListWorkflowPatternsQuery,
  ): Promise<{ patterns: CapturedWorkflowPattern[]; total: number }> {
    let countSql = "SELECT COUNT(*) as cnt FROM captured_workflow_patterns WHERE tenant_id = ?";
    let sql = "SELECT * FROM captured_workflow_patterns WHERE tenant_id = ?";
    const bindings: unknown[] = [tenantId];

    if (params.pipelineStage) {
      countSql += " AND pipeline_stage = ?";
      sql += " AND pipeline_stage = ?";
      bindings.push(params.pipelineStage);
    }
    if (params.methodologyId) {
      countSql += " AND methodology_id = ?";
      sql += " AND methodology_id = ?";
      bindings.push(params.methodologyId);
    }
    if (params.status) {
      countSql += " AND status = ?";
      sql += " AND status = ?";
      bindings.push(params.status);
    }
    if (params.minConfidence !== undefined) {
      countSql += " AND confidence >= ?";
      sql += " AND confidence >= ?";
      bindings.push(params.minConfidence);
    }

    const countBindings = [...bindings];
    sql += " ORDER BY confidence DESC LIMIT ? OFFSET ?";
    bindings.push(params.limit, params.offset);

    const [countRow, rows] = await Promise.all([
      this.db.prepare(countSql).bind(...countBindings).first<{ cnt: number }>(),
      this.db.prepare(sql).bind(...bindings).all<PatternRow>(),
    ]);

    return {
      patterns: (rows.results ?? []).map(mapPatternRow),
      total: countRow?.cnt ?? 0,
    };
  }

  async getPatternById(tenantId: string, patternId: string): Promise<CapturedWorkflowPattern | null> {
    const row = await this.db
      .prepare("SELECT * FROM captured_workflow_patterns WHERE tenant_id = ? AND id = ?")
      .bind(tenantId, patternId)
      .first<PatternRow>();

    return row ? mapPatternRow(row) : null;
  }

  async getPatternDetail(tenantId: string, patternId: string): Promise<CapturedWorkflowPatternDetail | null> {
    const pattern = await this.getPatternById(tenantId, patternId);
    if (!pattern) return null;

    const countRow = await this.db
      .prepare("SELECT COUNT(*) as cnt FROM captured_candidates WHERE tenant_id = ? AND pattern_id = ?")
      .bind(tenantId, patternId)
      .first<{ cnt: number }>();

    const approvedRow = await this.db
      .prepare(
        "SELECT COUNT(*) as cnt FROM captured_candidates WHERE tenant_id = ? AND pattern_id = ? AND review_status = 'approved'",
      )
      .bind(tenantId, patternId)
      .first<{ cnt: number }>();

    return {
      ...pattern,
      candidateCount: countRow?.cnt ?? 0,
      approvedCount: approvedRow?.cnt ?? 0,
    };
  }
}

// ─── Helpers ───

interface WorkflowNodeDef {
  id: string;
  label?: string;
  action?: string;
  type?: string;
}

interface PatternRow {
  id: string;
  tenant_id: string;
  methodology_id: string | null;
  pipeline_stage: string;
  workflow_step_sequence: string;
  skill_sequence: string;
  success_rate: number;
  sample_count: number;
  avg_cost_usd: number;
  avg_duration_ms: number;
  confidence: number;
  status: string;
  extracted_at: string;
  expires_at: string | null;
}

function mapPatternRow(r: PatternRow): CapturedWorkflowPattern {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    methodologyId: r.methodology_id,
    pipelineStage: r.pipeline_stage as PipelineStage,
    workflowStepSequence: parseJson(r.workflow_step_sequence, []),
    skillSequence: parseJson(r.skill_sequence, []),
    successRate: r.success_rate,
    sampleCount: r.sample_count,
    avgCostUsd: r.avg_cost_usd,
    avgDurationMs: r.avg_duration_ms,
    confidence: r.confidence,
    status: r.status as CapturedPatternStatus,
    extractedAt: r.extracted_at,
    expiresAt: r.expires_at,
  };
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const VALID_STAGES = new Set([
  "collection", "discovery", "shaping", "validation", "productization", "gtm",
]);

function detectPipelineStage(nodes: WorkflowNodeDef[], workflowName: string): string {
  // Check node actions/labels for stage hints
  for (const n of nodes) {
    const text = `${n.action ?? ""} ${n.label ?? ""}`.toLowerCase();
    for (const stage of VALID_STAGES) {
      if (text.includes(stage)) return stage;
    }
  }
  // Fallback: check workflow name
  const nameLower = workflowName.toLowerCase();
  for (const stage of VALID_STAGES) {
    if (nameLower.includes(stage)) return stage;
  }
  return "discovery";
}

function generateId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${t}${r}`;
}
