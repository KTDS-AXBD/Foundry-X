import type { MeetingType, MeetingStatus } from "../schemas/validation.schema.js";

export interface Meeting { id: string; orgId: string; bizItemId: string; type: MeetingType; title: string; scheduledAt: string; attendees: string[]; location: string | null; notes: string | null; status: MeetingStatus; createdBy: string; createdAt: string; updatedAt: string; }
export interface CreateMeetingInput { bizItemId: string; type?: MeetingType; title: string; scheduledAt: string; attendees?: string[]; location?: string; notes?: string; }
export interface UpdateMeetingInput { title?: string; scheduledAt?: string; attendees?: string[]; location?: string; notes?: string; status?: MeetingStatus; }
export interface MeetingFilters { bizItemId?: string; status?: MeetingStatus; limit?: number; offset?: number; }

export class MeetingService {
  constructor(private db: D1Database) {}

  async create(input: CreateMeetingInput, orgId: string, userId: string): Promise<Meeting> {
    const id = crypto.randomUUID();
    const type = input.type ?? "interview";
    await this.db.prepare(`INSERT INTO expert_meetings (id, org_id, biz_item_id, type, title, scheduled_at, attendees, location, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, orgId, input.bizItemId, type, input.title, input.scheduledAt, JSON.stringify(input.attendees ?? []), input.location ?? null, input.notes ?? null, userId)
      .run();
    return { id, orgId, bizItemId: input.bizItemId, type, title: input.title, scheduledAt: input.scheduledAt, attendees: input.attendees ?? [], location: input.location ?? null, notes: input.notes ?? null, status: "scheduled", createdBy: userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }

  async list(orgId: string, filters?: MeetingFilters): Promise<{ items: Meeting[]; total: number }> {
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;
    const conditions: string[] = ["org_id = ?"];
    const params: unknown[] = [orgId];
    if (filters?.bizItemId) { conditions.push("biz_item_id = ?"); params.push(filters.bizItemId); }
    if (filters?.status) { conditions.push("status = ?"); params.push(filters.status); }
    const where = conditions.join(" AND ");
    const countResult = await this.db.prepare(`SELECT COUNT(*) as cnt FROM expert_meetings WHERE ${where}`).bind(...params).first<{ cnt: number }>();
    const { results } = await this.db.prepare(`SELECT id, org_id, biz_item_id, type, title, scheduled_at, attendees, location, notes, status, created_by, created_at, updated_at FROM expert_meetings WHERE ${where} ORDER BY scheduled_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all<Record<string, unknown>>();
    return { items: results.map((r) => this.mapRow(r)), total: countResult?.cnt ?? 0 };
  }

  async getById(id: string, orgId: string): Promise<Meeting | null> {
    const row = await this.db.prepare(`SELECT id, org_id, biz_item_id, type, title, scheduled_at, attendees, location, notes, status, created_by, created_at, updated_at FROM expert_meetings WHERE id = ? AND org_id = ?`).bind(id, orgId).first<Record<string, unknown>>();
    return row ? this.mapRow(row) : null;
  }

  async update(id: string, orgId: string, input: UpdateMeetingInput): Promise<Meeting | null> {
    const sets: string[] = ["updated_at = datetime('now')"];
    const params: unknown[] = [];
    if (input.title !== undefined) { sets.push("title = ?"); params.push(input.title); }
    if (input.scheduledAt !== undefined) { sets.push("scheduled_at = ?"); params.push(input.scheduledAt); }
    if (input.attendees !== undefined) { sets.push("attendees = ?"); params.push(JSON.stringify(input.attendees)); }
    if (input.location !== undefined) { sets.push("location = ?"); params.push(input.location); }
    if (input.notes !== undefined) { sets.push("notes = ?"); params.push(input.notes); }
    if (input.status !== undefined) { sets.push("status = ?"); params.push(input.status); }
    params.push(id, orgId);
    await this.db.prepare(`UPDATE expert_meetings SET ${sets.join(", ")} WHERE id = ? AND org_id = ?`).bind(...params).run();
    return this.getById(id, orgId);
  }

  async delete(id: string, orgId: string): Promise<boolean> {
    const existing = await this.getById(id, orgId);
    if (!existing) return false;
    await this.db.prepare(`DELETE FROM expert_meetings WHERE id = ? AND org_id = ?`).bind(id, orgId).run();
    return true;
  }

  private mapRow(r: Record<string, unknown>): Meeting {
    let attendees: string[] = [];
    try { attendees = JSON.parse(r["attendees"] as string) as string[]; } catch { attendees = []; }
    return { id: r["id"] as string, orgId: r["org_id"] as string, bizItemId: r["biz_item_id"] as string, type: r["type"] as MeetingType, title: r["title"] as string, scheduledAt: r["scheduled_at"] as string, attendees, location: (r["location"] as string) || null, notes: (r["notes"] as string) || null, status: r["status"] as MeetingStatus, createdBy: r["created_by"] as string, createdAt: r["created_at"] as string, updatedAt: r["updated_at"] as string };
  }
}
