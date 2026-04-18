/**
 * BdpService — 사업계획서(BDP) 버전 관리 (F234)
 */

export interface BdpVersion {
  id: string;
  orgId: string;
  bizItemId: string;
  versionNum: number;
  content: string;
  isFinal: boolean;
  createdBy: string;
  createdAt: string;
}

export interface CreateBdpVersionInput {
  bizItemId: string;
  orgId: string;
  content: string;
  createdBy: string;
}

export interface BdpDiff {
  v1: number;
  v2: number;
  v1Content: string;
  v2Content: string;
}

export class BdpService {
  constructor(private db: D1Database) {}

  async getLatest(bizItemId: string, orgId: string): Promise<BdpVersion | null> {
    const row = await this.db
      .prepare(
        `SELECT id, org_id, biz_item_id, version_num, content, is_final, created_by, created_at
         FROM bdp_versions WHERE biz_item_id = ? AND org_id = ?
         ORDER BY version_num DESC LIMIT 1`,
      )
      .bind(bizItemId, orgId)
      .first<Record<string, unknown>>();

    return row ? this.mapRow(row) : null;
  }

  async listVersions(bizItemId: string, orgId: string): Promise<BdpVersion[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, org_id, biz_item_id, version_num, content, is_final, created_by, created_at
         FROM bdp_versions WHERE biz_item_id = ? AND org_id = ?
         ORDER BY version_num DESC`,
      )
      .bind(bizItemId, orgId)
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapRow(r));
  }

  async createVersion(input: CreateBdpVersionInput): Promise<BdpVersion> {
    // Check if finalized
    const existing = await this.getLatest(input.bizItemId, input.orgId);
    if (existing?.isFinal) {
      throw new BdpFinalizedError(input.bizItemId);
    }

    const nextVersion = existing ? existing.versionNum + 1 : 1;
    const id = crypto.randomUUID();

    await this.db
      .prepare(
        `INSERT INTO bdp_versions (id, org_id, biz_item_id, version_num, content, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, input.orgId, input.bizItemId, nextVersion, input.content, input.createdBy)
      .run();

    return {
      id,
      orgId: input.orgId,
      bizItemId: input.bizItemId,
      versionNum: nextVersion,
      content: input.content,
      isFinal: false,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };
  }

  async finalize(bizItemId: string, orgId: string, _userId: string): Promise<BdpVersion | null> {
    const latest = await this.getLatest(bizItemId, orgId);
    if (!latest) return null;
    if (latest.isFinal) return latest;

    await this.db
      .prepare(
        `UPDATE bdp_versions SET is_final = 1 WHERE id = ?`,
      )
      .bind(latest.id)
      .run();

    return { ...latest, isFinal: true };
  }

  async getDiff(bizItemId: string, orgId: string, v1: number, v2: number): Promise<BdpDiff | null> {
    const row1 = await this.db
      .prepare(
        `SELECT content FROM bdp_versions WHERE biz_item_id = ? AND org_id = ? AND version_num = ?`,
      )
      .bind(bizItemId, orgId, v1)
      .first<Record<string, unknown>>();

    const row2 = await this.db
      .prepare(
        `SELECT content FROM bdp_versions WHERE biz_item_id = ? AND org_id = ? AND version_num = ?`,
      )
      .bind(bizItemId, orgId, v2)
      .first<Record<string, unknown>>();

    if (!row1 || !row2) return null;

    return {
      v1,
      v2,
      v1Content: row1.content as string,
      v2Content: row2.content as string,
    };
  }

  private mapRow(r: Record<string, unknown>): BdpVersion {
    return {
      id: r.id as string,
      orgId: r.org_id as string,
      bizItemId: r.biz_item_id as string,
      versionNum: r.version_num as number,
      content: r.content as string,
      isFinal: (r.is_final as number) === 1,
      createdBy: r.created_by as string,
      createdAt: r.created_at as string,
    };
  }
}

export class BdpFinalizedError extends Error {
  constructor(bizItemId: string) {
    super(`BDP for item ${bizItemId} is finalized and cannot be modified`);
    this.name = "BdpFinalizedError";
  }
}
