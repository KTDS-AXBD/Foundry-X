/**
 * F276: DerivedReviewService — HITL 승인 워크플로우 + skill_registry 등록 + 통계
 */

import type {
  DerivedReview,
  DerivedStats,
  SkillSafetyGrade,
} from "@foundry-x/shared";
import type { ReviewCandidateInput } from "../schemas/derived-engine.js";
import { SafetyChecker } from "../../harness/services/safety-checker.js";
import { SkillMdGeneratorService } from "./skill-md-generator.js";

export class DerivedReviewService {
  constructor(private db: D1Database) {}

  async review(
    tenantId: string,
    candidateId: string,
    params: ReviewCandidateInput,
    reviewerId: string,
  ): Promise<DerivedReview> {
    // Verify candidate exists and is reviewable
    const candidate = await this.db
      .prepare("SELECT * FROM derived_candidates WHERE tenant_id = ? AND id = ?")
      .bind(tenantId, candidateId)
      .first<CandidateRow>();

    if (!candidate) throw new Error("Candidate not found");

    const reviewId = generateId("dr");
    const now = new Date().toISOString();

    // Insert review record
    await this.db
      .prepare(
        `INSERT INTO derived_reviews (id, tenant_id, candidate_id, action, comment, modified_prompt, reviewer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        reviewId, tenantId, candidateId,
        params.action, params.comment ?? null, params.modifiedPrompt ?? null,
        reviewerId,
      )
      .run();

    if (params.action === "approved") {
      await this.handleApproval(tenantId, candidate, params, reviewerId, now);
    } else if (params.action === "rejected") {
      await this.db
        .prepare(
          "UPDATE derived_candidates SET review_status = 'rejected', reviewed_at = ?, reviewed_by = ? WHERE id = ?",
        )
        .bind(now, reviewerId, candidateId)
        .run();
    } else if (params.action === "revision_requested") {
      await this.handleRevision(tenantId, candidateId, params, reviewerId, now);
    }

    return {
      id: reviewId,
      tenantId,
      candidateId,
      action: params.action,
      comment: params.comment ?? null,
      modifiedPrompt: params.modifiedPrompt ?? null,
      reviewerId,
      createdAt: now,
    };
  }

  private async handleApproval(
    tenantId: string,
    candidate: CandidateRow,
    params: ReviewCandidateInput,
    reviewerId: string,
    now: string,
  ): Promise<void> {
    const newSkillId = `derived_${candidate.id}`;
    const registryId = generateId("sr");
    const promptTemplate = params.modifiedPrompt ?? candidate.prompt_template;

    // 1. Register in skill_registry
    await this.db
      .prepare(
        `INSERT INTO skill_registry
          (id, tenant_id, skill_id, name, description, category,
           source_type, source_ref, prompt_template, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'derived', ?, ?, ?)`,
      )
      .bind(
        registryId, tenantId, newSkillId,
        candidate.name, candidate.description, candidate.category,
        candidate.pattern_id, promptTemplate, reviewerId,
      )
      .run();

    // 2. Record lineage for each source skill
    const sourceSkills: { skillId: string; contribution: number }[] = parseJson(candidate.source_skills, []);
    for (const ss of sourceSkills) {
      const lineageId = generateId("sl");
      await this.db
        .prepare(
          `INSERT INTO skill_lineage
            (id, tenant_id, parent_skill_id, child_skill_id, derivation_type, created_by)
           VALUES (?, ?, ?, ?, 'derived', ?)`,
        )
        .bind(lineageId, tenantId, ss.skillId, newSkillId, reviewerId)
        .run();
    }

    // 3. Audit log
    const auditId = generateId("sa");
    await this.db
      .prepare(
        `INSERT INTO skill_audit_log
          (id, tenant_id, entity_type, entity_id, action, actor_id, details)
         VALUES (?, ?, 'skill', ?, 'created', ?, ?)`,
      )
      .bind(
        auditId, tenantId, newSkillId, reviewerId,
        JSON.stringify({ source: "DERIVED", patternId: candidate.pattern_id }),
      )
      .run();

    // 4. Update candidate
    await this.db
      .prepare(
        `UPDATE derived_candidates
         SET review_status = 'approved', registered_skill_id = ?, reviewed_at = ?, reviewed_by = ?
         WHERE id = ?`,
      )
      .bind(newSkillId, now, reviewerId, candidate.id)
      .run();

    // 5. Consume pattern
    await this.db
      .prepare("UPDATE derived_patterns SET status = 'consumed' WHERE id = ?")
      .bind(candidate.pattern_id)
      .run();

    // 6. F306: SKILL.md 자동 생성
    const parsedTags: string[] = parseJson(candidate.source_skills, [])
      .map((s: { skillId: string }) => s.skillId);
    const mdGenerator = new SkillMdGeneratorService();
    const skillMd = mdGenerator.generate({
      skillId: newSkillId,
      name: candidate.name,
      description: candidate.description ?? "",
      category: candidate.category,
      tags: parsedTags,
      sourceType: "derived",
      promptTemplate: promptTemplate,
      version: 1,
    });

    await this.db
      .prepare(
        "UPDATE skill_registry SET skill_md_content = ?, skill_md_generated_at = datetime('now') WHERE tenant_id = ? AND skill_id = ?"
      )
      .bind(skillMd, tenantId, newSkillId)
      .run();
  }

  private async handleRevision(
    tenantId: string,
    candidateId: string,
    params: ReviewCandidateInput,
    reviewerId: string,
    now: string,
  ): Promise<void> {
    if (params.modifiedPrompt) {
      // Update prompt + re-check safety
      const safetyResult = SafetyChecker.check(params.modifiedPrompt);
      await this.db
        .prepare(
          `UPDATE derived_candidates
           SET prompt_template = ?, safety_grade = ?, safety_score = ?,
               review_status = 'pending', reviewed_at = ?, reviewed_by = ?
           WHERE id = ?`,
        )
        .bind(
          params.modifiedPrompt, safetyResult.grade, safetyResult.score,
          now, reviewerId, candidateId,
        )
        .run();
    } else {
      await this.db
        .prepare(
          `UPDATE derived_candidates
           SET review_status = 'revision_requested', reviewed_at = ?, reviewed_by = ?
           WHERE id = ?`,
        )
        .bind(now, reviewerId, candidateId)
        .run();
    }
  }

  async getReviews(tenantId: string, candidateId: string): Promise<DerivedReview[]> {
    const rows = await this.db
      .prepare(
        "SELECT * FROM derived_reviews WHERE tenant_id = ? AND candidate_id = ? ORDER BY created_at DESC",
      )
      .bind(tenantId, candidateId)
      .all<ReviewRow>();

    return (rows.results ?? []).map(mapReviewRow);
  }

  async getStats(tenantId: string): Promise<DerivedStats> {
    const pRow = await this.db
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_cnt,
           SUM(CASE WHEN status = 'consumed' THEN 1 ELSE 0 END) as consumed_cnt,
           SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_cnt,
           AVG(CASE WHEN status = 'active' THEN confidence ELSE NULL END) as avg_conf
         FROM derived_patterns WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{
        total: number; active_cnt: number; consumed_cnt: number;
        expired_cnt: number; avg_conf: number | null;
      }>();

    const cRow = await this.db
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending_cnt,
           SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved_cnt,
           SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected_cnt,
           SUM(CASE WHEN registered_skill_id IS NOT NULL THEN 1 ELSE 0 END) as registered_cnt
         FROM derived_candidates WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{
        total: number; pending_cnt: number; approved_cnt: number;
        rejected_cnt: number; registered_cnt: number;
      }>();

    const topStageRows = await this.db
      .prepare(
        `SELECT pipeline_stage as stage, COUNT(*) as cnt
         FROM derived_patterns WHERE tenant_id = ?
         GROUP BY pipeline_stage ORDER BY cnt DESC LIMIT 5`,
      )
      .bind(tenantId)
      .all<{ stage: string; cnt: number }>();

    const approved = cRow?.approved_cnt ?? 0;
    const rejected = cRow?.rejected_cnt ?? 0;
    const reviewedTotal = approved + rejected;

    return {
      totalPatterns: pRow?.total ?? 0,
      activePatterns: pRow?.active_cnt ?? 0,
      consumedPatterns: pRow?.consumed_cnt ?? 0,
      expiredPatterns: pRow?.expired_cnt ?? 0,
      totalCandidates: cRow?.total ?? 0,
      pendingCandidates: cRow?.pending_cnt ?? 0,
      approvedCandidates: approved,
      rejectedCandidates: rejected,
      approvalRate: reviewedTotal > 0 ? Math.round((approved / reviewedTotal) * 100) / 100 : 0,
      registeredSkills: cRow?.registered_cnt ?? 0,
      avgConfidence: Math.round((pRow?.avg_conf ?? 0) * 1000) / 1000,
      topStages: (topStageRows.results ?? []).map((r) => ({
        stage: r.stage,
        patternCount: r.cnt,
      })),
    };
  }
}

// ─── Helpers ───

interface CandidateRow {
  id: string;
  tenant_id: string;
  pattern_id: string;
  name: string;
  description: string | null;
  category: string;
  prompt_template: string;
  source_skills: string;
  similarity_score: number;
  safety_grade: string;
  safety_score: number;
  review_status: string;
  registered_skill_id: string | null;
}

interface ReviewRow {
  id: string;
  tenant_id: string;
  candidate_id: string;
  action: string;
  comment: string | null;
  modified_prompt: string | null;
  reviewer_id: string;
  created_at: string;
}

function mapReviewRow(r: ReviewRow): DerivedReview {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    candidateId: r.candidate_id,
    action: r.action as DerivedReview["action"],
    comment: r.comment,
    modifiedPrompt: r.modified_prompt,
    reviewerId: r.reviewer_id,
    createdAt: r.created_at,
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

function generateId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${t}${r}`;
}
