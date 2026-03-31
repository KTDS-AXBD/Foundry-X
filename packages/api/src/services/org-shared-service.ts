/**
 * OrgSharedService — Org-scope 팀 데이터 공유 뷰 (F253)
 */

export interface SharedBmcItem {
  id: string;
  title: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
  syncStatus: string;
  createdAt: number;
  updatedAt: number;
}

export interface ActivityItem {
  type: string;
  resourceId: string;
  title: string;
  actorId: string;
  actorName: string | null;
  timestamp: string;
}

export class OrgSharedService {
  constructor(private db: D1Database) {}

  async getSharedBmcs(
    orgId: string,
    opts: { page: number; limit: number },
  ): Promise<{ items: SharedBmcItem[]; total: number; page: number; limit: number }> {
    const offset = (opts.page - 1) * opts.limit;

    const rows = await this.db
      .prepare(
        `SELECT b.id, b.title, b.author_id, b.sync_status, b.created_at, b.updated_at,
                u.name as author_name, u.email as author_email
         FROM ax_bmcs b
         LEFT JOIN users u ON b.author_id = u.id
         WHERE b.org_id = ? AND b.is_deleted = 0
         ORDER BY b.updated_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(orgId, opts.limit, offset)
      .all<{
        id: string;
        title: string;
        author_id: string;
        sync_status: string;
        created_at: number;
        updated_at: number;
        author_name: string | null;
        author_email: string | null;
      }>();

    const countResult = await this.db
      .prepare("SELECT COUNT(*) as total FROM ax_bmcs WHERE org_id = ? AND is_deleted = 0")
      .bind(orgId)
      .first<{ total: number }>();

    const items: SharedBmcItem[] = (rows.results ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      authorId: r.author_id,
      authorName: r.author_name,
      authorEmail: r.author_email,
      syncStatus: r.sync_status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return { items, total: countResult?.total ?? 0, page: opts.page, limit: opts.limit };
  }

  async getActivityFeed(orgId: string, limit: number = 20): Promise<ActivityItem[]> {
    const rows = await this.db
      .prepare(
        `SELECT type, resource_id, title, actor_id, actor_name, timestamp FROM (
           SELECT 'bmc_created' as type, b.id as resource_id, b.title, b.author_id as actor_id,
                  u.name as actor_name, b.created_at as timestamp
           FROM ax_bmcs b
           LEFT JOIN users u ON b.author_id = u.id
           WHERE b.org_id = ? AND b.is_deleted = 0
           UNION ALL
           SELECT 'feedback_submitted' as type, f.id as resource_id,
                  'NPS ' || f.nps_score as title, f.user_id as actor_id,
                  u2.name as actor_name, f.created_at as timestamp
           FROM onboarding_feedback f
           LEFT JOIN users u2 ON f.user_id = u2.id
           WHERE f.tenant_id = ?
         )
         ORDER BY timestamp DESC
         LIMIT ?`,
      )
      .bind(orgId, orgId, limit)
      .all<{
        type: string;
        resource_id: string;
        title: string;
        actor_id: string;
        actor_name: string | null;
        timestamp: string;
      }>();

    return (rows.results ?? []).map((r) => ({
      type: r.type,
      resourceId: r.resource_id,
      title: r.title,
      actorId: r.actor_id,
      actorName: r.actor_name,
      timestamp: r.timestamp,
    }));
  }
}
