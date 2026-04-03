/**
 * OfferingBriefService — Offering Brief 생성/조회 (F293)
 */
import type { MeetingType } from "../schemas/offering-brief.schema.js";
import type { OfferingPackDetail, OfferingPackItem } from "./offering-pack-service.js";

export interface OfferingBrief {
  id: string;
  orgId: string;
  offeringPackId: string;
  title: string;
  content: string;
  targetAudience: string | null;
  meetingType: MeetingType;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferingBriefInput {
  orgId: string;
  offeringPackId: string;
  title: string;
  targetAudience?: string;
  meetingType?: MeetingType;
}

const TYPE_LABELS: Record<string, string> = {
  proposal: "제안서",
  demo_link: "데모",
  tech_review: "기술 검토",
  pricing: "가격 정보",
  prototype: "프로토타입",
  bmc: "BMC",
  custom: "기타",
};

export class OfferingBriefService {
  constructor(private db: D1Database) {}

  async create(input: CreateOfferingBriefInput): Promise<OfferingBrief> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const meetingType = input.meetingType ?? "initial";

    await this.db
      .prepare(
        `INSERT INTO offering_briefs (id, org_id, offering_pack_id, title, content, target_audience, meeting_type, generated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, '', ?, ?, 'ai', ?, ?)`,
      )
      .bind(id, input.orgId, input.offeringPackId, input.title, input.targetAudience ?? null, meetingType, now, now)
      .run();

    return {
      id,
      orgId: input.orgId,
      offeringPackId: input.offeringPackId,
      title: input.title,
      content: "",
      targetAudience: input.targetAudience ?? null,
      meetingType,
      generatedBy: "ai",
      createdAt: now,
      updatedAt: now,
    };
  }

  async createWithContent(input: CreateOfferingBriefInput, pack: OfferingPackDetail): Promise<OfferingBrief> {
    const brief = await this.create(input);
    const content = this.generateContent(pack, input.targetAudience, input.meetingType);

    await this.db
      .prepare(`UPDATE offering_briefs SET content = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(content, brief.id)
      .run();

    return { ...brief, content };
  }

  async getLatest(offeringPackId: string, orgId: string): Promise<OfferingBrief | null> {
    const row = await this.db
      .prepare(
        `SELECT id, org_id, offering_pack_id, title, content, target_audience, meeting_type, generated_by, created_at, updated_at
         FROM offering_briefs WHERE offering_pack_id = ? AND org_id = ?
         ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(offeringPackId, orgId)
      .first<Record<string, unknown>>();

    return row ? this.mapRow(row) : null;
  }

  async list(
    offeringPackId: string,
    orgId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<OfferingBrief[]> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;

    const { results } = await this.db
      .prepare(
        `SELECT id, org_id, offering_pack_id, title, content, target_audience, meeting_type, generated_by, created_at, updated_at
         FROM offering_briefs WHERE offering_pack_id = ? AND org_id = ?
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(offeringPackId, orgId, limit, offset)
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapRow(r));
  }

  generateContent(
    pack: OfferingPackDetail,
    targetAudience?: string,
    meetingType?: MeetingType,
  ): string {
    const lines: string[] = [];

    lines.push(`# ${pack.title} — Offering Brief`);
    lines.push("");

    if (targetAudience) {
      lines.push(`**대상**: ${targetAudience}`);
      lines.push("");
    }

    if (pack.description) {
      lines.push("## 개요");
      lines.push(pack.description);
      lines.push("");
    }

    // Group items by type
    const grouped = new Map<string, OfferingPackItem[]>();
    for (const item of pack.items) {
      const group = grouped.get(item.itemType) ?? [];
      group.push(item);
      grouped.set(item.itemType, group);
    }

    if (grouped.size > 0) {
      lines.push("## 주요 항목");
      lines.push("");

      for (const [type, items] of grouped) {
        const label = TYPE_LABELS[type] ?? type;
        lines.push(`### ${label}`);
        lines.push("");
        for (const item of items) {
          lines.push(`- **${item.title}**`);
          if (item.content) {
            lines.push(`  ${item.content}`);
          }
        }
        lines.push("");
      }
    }

    const meetingLabel = meetingType === "followup" ? "후속 미팅"
      : meetingType === "demo" ? "데모 미팅"
      : meetingType === "closing" ? "클로징 미팅"
      : "초도 미팅";

    lines.push("---");
    lines.push(`*${meetingLabel}용 자동 생성 브리프 | ${new Date().toLocaleDateString("ko")}*`);

    return lines.join("\n");
  }

  private mapRow(r: Record<string, unknown>): OfferingBrief {
    return {
      id: r.id as string,
      orgId: r.org_id as string,
      offeringPackId: r.offering_pack_id as string,
      title: r.title as string,
      content: r.content as string,
      targetAudience: r.target_audience as string | null,
      meetingType: r.meeting_type as MeetingType,
      generatedBy: r.generated_by as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }
}
