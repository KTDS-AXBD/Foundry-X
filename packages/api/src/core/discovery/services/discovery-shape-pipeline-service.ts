/**
 * F379: Discovery → Shape Pipeline Service (Sprint 171)
 *
 * 발굴 완료 시 EventBus 이벤트를 통해 Offering을 자동 생성하고
 * DiscoveryPackage 데이터로 섹션을 프리필하는 파이프라인.
 */

import type { TaskEvent } from "@foundry-x/shared";
import { createTaskEvent } from "@foundry-x/shared";
import type { EventBus } from "../../../services/event-bus.js";
import { OfferingService } from "../../offering/services/offering-service.js";
import { ContentAdapterService } from "../../offering/services/content-adapter-service.js";
import type { AdaptTone } from "../../offering/schemas/content-adapter.schema.js";
import type {
  ShapePipelineResult,
  ShapePipelineStatus,
  ShapePipelineStatusResponse,
} from "../schemas/discovery-shape-pipeline.schema.js";

interface ReportRow {
  item_id: string;
  org_id: string;
  overall_verdict: string | null;
  team_decision: string | null;
}

interface OfferingRow {
  id: string;
  title: string;
}

interface SectionRow {
  content: string | null;
}

interface BizItemRow {
  id: string;
  title: string;
}

export class DiscoveryShapePipelineService {
  private offeringService: OfferingService;
  private adapterService: ContentAdapterService;

  constructor(
    private db: D1Database,
    private eventBus: EventBus,
  ) {
    this.offeringService = new OfferingService(db);
    this.adapterService = new ContentAdapterService(db);
  }

  /** EventBus에 파이프라인 핸들러 등록 */
  registerHandlers(): void {
    this.eventBus.subscribe("pipeline", async (event: TaskEvent) => {
      if (event.payload.type !== "pipeline") return;
      if (event.payload.action !== "discovery.completed") return;

      const { itemId } = event.payload;
      const orgId = event.tenantId;

      try {
        await this.triggerPipeline(orgId, itemId, "system");
      } catch (err) {
        console.error(`[Pipeline] Failed to process discovery.completed for item ${itemId}:`, err);
      }
    });
  }

  /** 수동 또는 자동 트리거 — 특정 아이템의 Offering 생성 */
  async triggerPipeline(
    orgId: string,
    itemId: string,
    createdBy: string,
    tone: AdaptTone = "executive",
  ): Promise<ShapePipelineResult> {
    // 1. DiscoveryReport 조회 — teamDecision 확인
    const report = await this.db
      .prepare("SELECT item_id, org_id, overall_verdict, team_decision FROM ax_discovery_reports WHERE item_id = ?")
      .bind(itemId)
      .first<ReportRow>();

    if (!report) {
      return {
        offeringId: "",
        prefilledSections: 0,
        totalSections: 0,
        tone,
        status: "failed",
        error: "Discovery report not found",
      };
    }

    if (report.team_decision !== "Go") {
      return {
        offeringId: "",
        prefilledSections: 0,
        totalSections: 0,
        tone,
        status: "failed",
        error: `Team decision is '${report.team_decision ?? "null"}', not 'Go'`,
      };
    }

    // 2. 기존 Offering 존재 여부 확인 (중복 방지)
    const existing = await this.db
      .prepare("SELECT id, title FROM offerings WHERE biz_item_id = ? AND org_id = ?")
      .bind(itemId, orgId)
      .first<OfferingRow>();

    if (existing) {
      return {
        offeringId: existing.id,
        prefilledSections: 0,
        totalSections: 0,
        tone,
        status: "partial",
        error: "Offering already exists for this item",
      };
    }

    // 3. BizItem 제목 조회
    const bizItem = await this.db
      .prepare("SELECT id, title FROM biz_items WHERE id = ?")
      .bind(itemId)
      .first<BizItemRow>();

    const title = bizItem?.title ?? `Offering for ${itemId}`;

    // 4. Offering 자동 생성 (draft + 21개 표준 섹션)
    const offering = await this.offeringService.create({
      orgId,
      bizItemId: itemId,
      title: `[${title}] 사업기획서`,
      purpose: "report",
      format: "html",
      createdBy,
    });

    // 5. EventBus: offering.created 발행
    const createdEvent = createTaskEvent(
      "pipeline",
      "info",
      itemId,
      orgId,
      {
        type: "pipeline",
        action: "offering.created",
        itemId,
        offeringId: offering.id,
        details: `Offering created: ${offering.title}`,
      },
    );
    await this.eventBus.emit(createdEvent);

    // 6. 콘텐츠 어댑터로 톤 적용 (프리필)
    const adaptedSections = await this.adapterService.adaptSections(orgId, offering.id, tone);

    // 7. 프리필된 섹션 수 계산
    const prefilledCount = adaptedSections.filter((s) => s.content && s.content.trim().length > 0).length;
    const totalSections = offering.sections.length;

    // 8. EventBus: offering.prefilled 발행
    const prefilledEvent = createTaskEvent(
      "pipeline",
      "info",
      itemId,
      orgId,
      {
        type: "pipeline",
        action: "offering.prefilled",
        itemId,
        offeringId: offering.id,
        details: `Prefilled ${prefilledCount}/${totalSections} sections with ${tone} tone`,
      },
    );
    await this.eventBus.emit(prefilledEvent);

    return {
      offeringId: offering.id,
      prefilledSections: prefilledCount,
      totalSections,
      tone,
      status: "success",
    };
  }

  /** 파이프라인 상태 조회 */
  async getStatus(orgId: string, itemId: string): Promise<ShapePipelineStatusResponse> {
    // Offering 존재 여부로 상태 판단
    const offering = await this.db
      .prepare("SELECT id, title FROM offerings WHERE biz_item_id = ? AND org_id = ?")
      .bind(itemId, orgId)
      .first<OfferingRow>();

    if (!offering) {
      return { status: "idle" };
    }

    // 프리필 완료 여부 확인
    const sections = await this.db
      .prepare("SELECT content FROM offering_sections WHERE offering_id = ?")
      .bind(offering.id)
      .all<SectionRow>();

    const prefilledCount = sections.results.filter(
      (s) => s.content !== null && s.content.trim().length > 0,
    ).length;

    return {
      status: prefilledCount > 0 ? "completed" : "processing",
      offering: {
        id: offering.id,
        title: offering.title,
        prefilledCount,
      },
    };
  }
}
