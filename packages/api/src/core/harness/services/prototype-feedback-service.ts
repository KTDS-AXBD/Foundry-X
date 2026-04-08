// ─── F356: Prototype Feedback Service (Sprint 160) ───
// F466: triggerRegeneration — feedback_pending Job의 피드백을 Generator에 전달하여 재생성 (Sprint 228)

import type { FeedbackCategory, PrototypeFeedback, OgdSummary } from "@foundry-x/shared";
import { OgdOrchestratorService } from "./ogd-orchestrator-service.js";
import { OgdGeneratorService } from "./ogd-generator-service.js";
import { OgdDiscriminatorService } from "./ogd-discriminator-service.js";
import { OgdFeedbackConverterService } from "./ogd-feedback-converter.js";
import { PrototypeQualityService } from "./prototype-quality-service.js";

interface FeedbackRow {
  id: string;
  job_id: string;
  org_id: string;
  author_id: string | null;
  category: string;
  content: string;
  status: string;
  created_at: number;
}

function toFeedback(row: FeedbackRow): PrototypeFeedback {
  return {
    id: row.id,
    jobId: row.job_id,
    orgId: row.org_id,
    authorId: row.author_id,
    category: row.category as FeedbackCategory,
    content: row.content,
    status: row.status as PrototypeFeedback["status"],
    createdAt: row.created_at,
  };
}

export class PrototypeFeedbackService {
  constructor(private db: D1Database) {}

  async create(
    orgId: string,
    jobId: string,
    input: {
      authorId?: string;
      category: FeedbackCategory;
      content: string;
    },
  ): Promise<PrototypeFeedback> {
    // Verify job exists and belongs to org
    const job = await this.db
      .prepare("SELECT id, status FROM prototype_jobs WHERE id = ? AND org_id = ?")
      .bind(jobId, orgId)
      .first<{ id: string; status: string }>();

    if (!job) throw new Error("Job not found");

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO prototype_feedback (id, job_id, org_id, author_id, category, content, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .bind(id, jobId, orgId, input.authorId ?? null, input.category, input.content, now)
      .run();

    // job이 live 상태면 feedback_pending으로 전환
    if (job.status === "live") {
      await this.db
        .prepare(
          "UPDATE prototype_jobs SET status = 'feedback_pending', feedback_content = ?, updated_at = ? WHERE id = ?",
        )
        .bind(input.content, now, jobId)
        .run();
    }

    const row = await this.db
      .prepare("SELECT * FROM prototype_feedback WHERE id = ?")
      .bind(id)
      .first<FeedbackRow>();
    return toFeedback(row!);
  }

  async listByJob(orgId: string, jobId: string): Promise<PrototypeFeedback[]> {
    const rows = await this.db
      .prepare(
        "SELECT * FROM prototype_feedback WHERE job_id = ? AND org_id = ? ORDER BY created_at DESC",
      )
      .bind(jobId, orgId)
      .all<FeedbackRow>();
    return (rows.results ?? []).map(toFeedback);
  }

  async updateStatus(
    id: string,
    orgId: string,
    status: "applied" | "dismissed",
  ): Promise<PrototypeFeedback | null> {
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .prepare(
        "UPDATE prototype_feedback SET status = ? WHERE id = ? AND org_id = ?",
      )
      .bind(status, id, orgId)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM prototype_feedback WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<FeedbackRow>();
    return row ? toFeedback(row) : null;
  }

  // F466: feedback_pending Job의 피드백을 Generator에 전달하여 재생성 트리거
  async triggerRegeneration(
    jobId: string,
    orgId: string,
    services: {
      generator: OgdGeneratorService;
      discriminator: OgdDiscriminatorService;
      feedbackConverter?: OgdFeedbackConverterService;
      qualityService?: PrototypeQualityService;
    },
  ): Promise<OgdSummary> {
    const job = await this.db
      .prepare(
        "SELECT id, status, prd_content, feedback_content FROM prototype_jobs WHERE id = ? AND org_id = ?",
      )
      .bind(jobId, orgId)
      .first<{ id: string; status: string; prd_content: string; feedback_content: string | null }>();

    if (!job) throw new Error("Job not found");
    if (job.status !== "feedback_pending") {
      throw new Error(`Job is not in feedback_pending status (current: ${job.status})`);
    }

    const now = Math.floor(Date.now() / 1000);

    // building으로 전환
    await this.db
      .prepare("UPDATE prototype_jobs SET status = 'building', updated_at = ? WHERE id = ?")
      .bind(now, jobId)
      .run();

    const orchestrator = new OgdOrchestratorService(
      this.db,
      services.generator,
      services.discriminator,
      services.feedbackConverter,
      services.qualityService,
    );

    try {
      const summary = await orchestrator.runLoop(
        orgId,
        jobId,
        job.prd_content,
        job.feedback_content ?? undefined,  // 외부 피드백을 첫 라운드에 주입
      );

      // 재생성 완료 → live 복귀
      await this.db
        .prepare("UPDATE prototype_jobs SET status = 'live', updated_at = ? WHERE id = ?")
        .bind(Math.floor(Date.now() / 1000), jobId)
        .run();

      // pending 피드백 → applied 일괄 업데이트
      await this.db
        .prepare(
          "UPDATE prototype_feedback SET status = 'applied' WHERE job_id = ? AND org_id = ? AND status = 'pending'",
        )
        .bind(jobId, orgId)
        .run();

      return summary;
    } catch (err) {
      // 실패 시 failed로 전환
      await this.db
        .prepare("UPDATE prototype_jobs SET status = 'failed', updated_at = ? WHERE id = ?")
        .bind(Math.floor(Date.now() / 1000), jobId)
        .run();
      throw err;
    }
  }
}
