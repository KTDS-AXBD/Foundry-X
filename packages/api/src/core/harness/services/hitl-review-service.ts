/**
 * F266: HITL Review Service — 산출물 리뷰 기록 + artifact 상태 전환
 */

import type { HitlReview } from "../schemas/hitl-review-schema.js";
import { BdArtifactService } from "../../shaping/services/bd-artifact-service.js";

interface ReviewRow {
  id: string;
  tenant_id: string;
  artifact_id: string;
  reviewer_id: string;
  action: string;
  reason: string | null;
  modified_content: string | null;
  previous_version: string | null;
  created_at: string;
}

function rowToReview(row: ReviewRow): HitlReview {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    artifactId: row.artifact_id,
    reviewerId: row.reviewer_id,
    action: row.action as HitlReview["action"],
    reason: row.reason,
    modifiedContent: row.modified_content,
    previousVersion: row.previous_version,
    createdAt: row.created_at,
  };
}

export class HitlReviewService {
  private artifactService: BdArtifactService;

  constructor(private db: D1Database) {
    this.artifactService = new BdArtifactService(db);
  }

  async submitReview(input: {
    orgId: string;
    artifactId: string;
    reviewerId: string;
    action: "approved" | "modified" | "regenerated" | "rejected";
    reason?: string;
    modifiedContent?: string;
  }): Promise<HitlReview> {
    // Verify artifact exists and belongs to org
    const artifact = await this.artifactService.getById(input.orgId, input.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }

    const id = crypto.randomUUID().replace(/-/g, "");

    // For 'modified' action, store current output as previous version
    const previousVersion =
      input.action === "modified" ? artifact.outputText : null;

    await this.db
      .prepare(
        `INSERT INTO hitl_artifact_reviews (id, tenant_id, artifact_id, reviewer_id, action, reason, modified_content, previous_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.orgId,
        input.artifactId,
        input.reviewerId,
        input.action,
        input.reason ?? null,
        input.modifiedContent ?? null,
        previousVersion,
      )
      .run();

    // Update artifact status based on action
    if (input.action === "approved") {
      await this.artifactService.updateStatus(input.artifactId, "approved");
    } else if (input.action === "rejected") {
      await this.artifactService.updateStatus(input.artifactId, "rejected");
    } else if (input.action === "modified") {
      // Update output_text with modified content and set approved
      await this.artifactService.updateStatus(input.artifactId, "approved", {
        outputText: input.modifiedContent,
      });
    }
    // 'regenerated' — artifact stays as-is; caller triggers re-execution separately

    return {
      id,
      tenantId: input.orgId,
      artifactId: input.artifactId,
      reviewerId: input.reviewerId,
      action: input.action,
      reason: input.reason ?? null,
      modifiedContent: input.modifiedContent ?? null,
      previousVersion,
      createdAt: new Date().toISOString(),
    };
  }

  async getHistory(artifactId: string): Promise<HitlReview[]> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM hitl_artifact_reviews WHERE artifact_id = ? ORDER BY created_at DESC",
      )
      .bind(artifactId)
      .all<ReviewRow>();
    return (results ?? []).map(rowToReview);
  }
}
