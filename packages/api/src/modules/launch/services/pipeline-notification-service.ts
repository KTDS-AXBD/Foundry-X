/**
 * F315: PipelineNotificationService — 파이프라인 이벤트→인앱 알림 자동 발행
 */
import { NotificationService } from "../../portal/services/notification-service.js";
import type { PipelineNotificationType } from "../schemas/pipeline-monitoring.schema.js";

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5분

export class PipelineNotificationService {
  private notifSvc: NotificationService;

  constructor(private db: D1Database) {
    this.notifSvc = new NotificationService(db);
  }

  /**
   * HITL 체크포인트 대기 시 → 승인 권한자들에게 알림
   */
  async notifyCheckpointPending(
    runId: string,
    stepId: string,
    orgId: string,
  ): Promise<void> {
    if (await this.isDuplicate(runId, stepId, "pipeline_checkpoint_pending")) return;

    const approverIds = await this.getApproverIds(runId, orgId);
    const bizItemName = await this.getBizItemName(runId);

    for (const recipientId of approverIds) {
      await this.notifSvc.create({
        orgId,
        recipientId,
        type: "pipeline_checkpoint_pending",
        bizItemId: (await this.getBizItemId(runId)) ?? undefined,
        title: `[파이프라인] ${bizItemName} — ${stepId} 체크포인트 승인 대기`,
        body: `파이프라인 단계 ${stepId}에서 HITL 승인을 기다리고 있어요. 24시간 내 결정이 필요해요.`,
      });
    }
  }

  /**
   * 단계 실패 시 → 파이프라인 생성자에게 알림
   */
  async notifyStepFailed(
    runId: string,
    stepId: string,
    errorMsg: string,
    orgId: string,
  ): Promise<void> {
    if (await this.isDuplicate(runId, stepId, "pipeline_step_failed")) return;

    const creatorId = await this.getCreatorId(runId);
    if (!creatorId) return;

    const bizItemName = await this.getBizItemName(runId);

    await this.notifSvc.create({
      orgId,
      recipientId: creatorId,
      type: "pipeline_step_failed",
      bizItemId: (await this.getBizItemId(runId)) ?? undefined,
      title: `[파이프라인] ${bizItemName} — ${stepId} 실패`,
      body: `단계 ${stepId}에서 오류가 발생했어요: ${errorMsg.slice(0, 200)}`,
    });
  }

  /**
   * 파이프라인 완료 시 → 관련자 전체 알림
   */
  async notifyCompleted(runId: string, orgId: string): Promise<void> {
    if (await this.isDuplicate(runId, "completed", "pipeline_completed")) return;

    const recipients = await this.getAllRelatedUserIds(runId, orgId);
    const bizItemName = await this.getBizItemName(runId);

    for (const recipientId of recipients) {
      await this.notifSvc.create({
        orgId,
        recipientId,
        type: "pipeline_completed",
        bizItemId: (await this.getBizItemId(runId)) ?? undefined,
        title: `[파이프라인] ${bizItemName} — 완료`,
        body: "발굴→형상화 파이프라인이 성공적으로 완료되었어요.",
      });
    }
  }

  /**
   * 파이프라인 중단 시 → 생성자 + 승인자들에게 알림
   */
  async notifyAborted(runId: string, orgId: string): Promise<void> {
    if (await this.isDuplicate(runId, "aborted", "pipeline_aborted")) return;

    const recipients = await this.getAllRelatedUserIds(runId, orgId);
    const bizItemName = await this.getBizItemName(runId);

    for (const recipientId of recipients) {
      await this.notifSvc.create({
        orgId,
        recipientId,
        type: "pipeline_aborted",
        bizItemId: (await this.getBizItemId(runId)) ?? undefined,
        title: `[파이프라인] ${bizItemName} — 중단됨`,
        body: "파이프라인이 사용자에 의해 중단되었어요.",
      });
    }
  }

  /**
   * 승인 가능 사용자 ID 목록 (명시적 권한 + admin 역할)
   */
  async getApproverIds(runId: string, orgId: string): Promise<string[]> {
    const ids = new Set<string>();

    // 명시적 권한 사용자
    const { results: perms } = await this.db
      .prepare(
        "SELECT user_id FROM pipeline_permissions WHERE pipeline_run_id = ? AND user_id IS NOT NULL AND can_approve = 1",
      )
      .bind(runId)
      .all<{ user_id: string }>();

    for (const p of perms ?? []) {
      ids.add(p.user_id);
    }

    // org admin들
    const { results: admins } = await this.db
      .prepare(
        "SELECT user_id FROM tenant_members WHERE tenant_id = ? AND role IN ('admin', 'owner')",
      )
      .bind(orgId)
      .all<{ user_id: string }>();

    for (const a of admins ?? []) {
      ids.add(a.user_id);
    }

    // 파이프라인 생성자도 포함
    const creatorId = await this.getCreatorId(runId);
    if (creatorId) ids.add(creatorId);

    return [...ids];
  }

  // ── Private Helpers ──

  private async isDuplicate(
    runId: string,
    stepId: string,
    type: PipelineNotificationType,
  ): Promise<boolean> {
    const bizItemId = await this.getBizItemId(runId);
    if (!bizItemId) return false;

    // biz_item_id + type + stepId(title LIKE) 기반 중복 감지 (5분 윈도우)
    const existing = await this.db
      .prepare(
        `SELECT id FROM notifications
         WHERE type = ? AND biz_item_id = ? AND title LIKE ?
           AND created_at >= datetime('now', '-5 minutes')
         LIMIT 1`,
      )
      .bind(type, bizItemId, `%${stepId}%`)
      .first();

    return !!existing;
  }

  private async getCreatorId(runId: string): Promise<string | null> {
    const row = await this.db
      .prepare("SELECT created_by FROM discovery_pipeline_runs WHERE id = ?")
      .bind(runId)
      .first<{ created_by: string }>();

    return row?.created_by ?? null;
  }

  private async getBizItemId(runId: string): Promise<string | null> {
    const row = await this.db
      .prepare("SELECT biz_item_id FROM discovery_pipeline_runs WHERE id = ?")
      .bind(runId)
      .first<{ biz_item_id: string }>();

    return row?.biz_item_id ?? null;
  }

  private async getBizItemName(runId: string): Promise<string> {
    const row = await this.db
      .prepare(
        `SELECT b.title FROM discovery_pipeline_runs p
         JOIN biz_items b ON b.id = p.biz_item_id
         WHERE p.id = ?`,
      )
      .bind(runId)
      .first<{ title: string }>();

    return row?.title ?? "Unknown";
  }

  private async getAllRelatedUserIds(runId: string, orgId: string): Promise<string[]> {
    const ids = new Set<string>();

    // 생성자
    const creatorId = await this.getCreatorId(runId);
    if (creatorId) ids.add(creatorId);

    // 체크포인트 결정자들
    const { results: deciders } = await this.db
      .prepare(
        "SELECT DISTINCT decided_by FROM pipeline_checkpoints WHERE pipeline_run_id = ? AND decided_by IS NOT NULL",
      )
      .bind(runId)
      .all<{ decided_by: string }>();

    for (const d of deciders ?? []) {
      ids.add(d.decided_by);
    }

    // 명시적 권한 사용자
    const { results: perms } = await this.db
      .prepare(
        "SELECT user_id FROM pipeline_permissions WHERE pipeline_run_id = ? AND user_id IS NOT NULL",
      )
      .bind(runId)
      .all<{ user_id: string }>();

    for (const p of perms ?? []) {
      ids.add(p.user_id);
    }

    return [...ids];
  }
}
