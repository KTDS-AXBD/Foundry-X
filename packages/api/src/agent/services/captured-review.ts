/**
 * F277: CapturedReviewService — HITL 승인 워크플로우 + skill_registry 등록 + 통계
 */

import type {
  CapturedReview,
  CapturedStats,
} from "@foundry-x/shared";
import type { ReviewCapturedCandidateInput } from "../schemas/captured-engine.js";
import { SafetyChecker } from "../../core/harness/services/safety-checker.js";
import { SkillMdGeneratorService } from "./skill-md-generator.js";

export class CapturedReviewService {
  constructor(private db: D1Database) {}

  async review(
    tenantId: string,
    candidateId: string,
    params: ReviewCapturedCandidateInput,
    reviewerId: string,
  ): Promise<CapturedReview> {
    const candidate = await this.db
      .prepare("SELECT * FROM captured_candidates WHERE tenant_id = ? AND id = ?")
      .bind(tenantId, candidateId)
      .first<CandidateRow>();

    if (!candidate) throw new Error("Candidate not found");

    const reviewId = generateId("cr");
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO captured_reviews (id, tenant_id, candidate_id, action, comment, modified_prompt, reviewer_id)
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
          "UPDATE captured_candidates SET review_status = 'rejected', reviewed_at = ?, reviewed_by = ? WHERE id = ?",
        )
        .bind(now, reviewerId, candidateId)
        .run();
    } else if (params.action === "revision_requested") {
      await this.handleRevision(candidateId, params, reviewerId, now);
    }

    return {
      id: reviewId,
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
    params: ReviewCapturedCandidateInput,
    reviewerId: string,
    now: string,
  ): Promise<void> {
    const newSkillId = `captured_${candidate.id}`;
    const registryId = generateId("sr");
    const promptTemplate = params.modifiedPrompt ?? candidate.prompt_template;

    // 1. Register in skill_registry
    await this.db
      .prepare(
        `INSERT INTO skill_registry
          (id, tenant_id, skill_id, name, description, category,
           source_type, source_ref, prompt_template, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'captured', ?, ?, ?)`,
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
           VALUES (?, ?, ?, ?, 'captured', ?)`,
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
        JSON.stringify({ source: "CAPTURED", patternId: candidate.pattern_id }),
      )
      .run();

    // 4. Update candidate
    await this.db
      .prepare(
        `UPDATE captured_candidates
         SET review_status = 'approved', registered_skill_id = ?, reviewed_at = ?, reviewed_by = ?
         WHERE id = ?`,
      )
      .bind(newSkillId, now, reviewerId, candidate.id)
      .run();

    // 5. Consume pattern
    await this.db
      .prepare("UPDATE captured_workflow_patterns SET status = 'consumed' WHERE id = ?")
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
      sourceType: "captured",
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
    candidateId: string,
    params: ReviewCapturedCandidateInput,
    reviewerId: string,
    now: string,
  ): Promise<void> {
    if (params.modifiedPrompt) {
      const safetyResult = SafetyChecker.check(params.modifiedPrompt);
      await this.db
        .prepare(
          `UPDATE captured_candidates
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
          `UPDATE captured_candidates
           SET review_status = 'revision_requested', reviewed_at = ?, reviewed_by = ?
           WHERE id = ?`,
        )
        .bind(now, reviewerId, candidateId)
        .run();
    }
  }

  async getStats(tenantId: string): Promise<CapturedStats> {
    const pRow = await this.db
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_cnt,
           AVG(CASE WHEN status = 'active' THEN confidence ELSE NULL END) as avg_conf,
           AVG(CASE WHEN status = 'active' THEN success_rate ELSE NULL END) as avg_sr
         FROM captured_workflow_patterns WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{
        total: number; active_cnt: number;
        avg_conf: number | null; avg_sr: number | null;
      }>();

    const cRow = await this.db
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending_cnt,
           SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved_cnt,
           SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected_cnt
         FROM captured_candidates WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{
        total: number; pending_cnt: number; approved_cnt: number; rejected_cnt: number;
      }>();

    return {
      totalPatterns: pRow?.total ?? 0,
      activePatterns: pRow?.active_cnt ?? 0,
      totalCandidates: cRow?.total ?? 0,
      pendingCandidates: cRow?.pending_cnt ?? 0,
      approvedCandidates: cRow?.approved_cnt ?? 0,
      rejectedCandidates: cRow?.rejected_cnt ?? 0,
      avgConfidence: Math.round((pRow?.avg_conf ?? 0) * 1000) / 1000,
      avgSuccessRate: Math.round((pRow?.avg_sr ?? 0) * 1000) / 1000,
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
  source_workflow_steps: string;
  source_skills: string;
  similarity_score: number;
  safety_grade: string;
  safety_score: number;
  review_status: string;
  registered_skill_id: string | null;
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
