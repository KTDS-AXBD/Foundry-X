import type { BmcVersion, BmcSnapshot } from "../schemas/bmc-history.schema.js";

// ─── DB Row 타입 ───
interface BmcVersionRow {
  id: string;
  bmc_id: string;
  commit_sha: string;
  author_id: string;
  message: string;
  snapshot: string;
  created_at: string;
}

// ─── 변환 헬퍼 ───
function toVersion(row: BmcVersionRow): BmcVersion {
  return {
    id: row.id,
    bmcId: row.bmc_id,
    commitSha: row.commit_sha,
    authorId: row.author_id,
    message: row.message,
    createdAt: row.created_at,
  };
}

export class BmcHistoryService {
  constructor(private db: D1Database) {}

  async recordVersion(
    bmcId: string,
    authorId: string,
    message: string,
    blocks: Record<string, string | null>,
    commitSha?: string
  ): Promise<BmcVersion> {
    const id = crypto.randomUUID();
    const sha = commitSha ?? crypto.randomUUID().slice(0, 8);
    const snapshot = JSON.stringify(blocks);
    const createdAt = new Date().toISOString().replace("T", " ").slice(0, 19);

    await this.db
      .prepare(
        `INSERT INTO ax_bmc_versions (id, bmc_id, commit_sha, author_id, message, snapshot, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, bmcId, sha, authorId, message, snapshot, createdAt)
      .run();

    return { id, bmcId, commitSha: sha, authorId, message, createdAt };
  }

  async getHistory(bmcId: string, limit = 20): Promise<BmcVersion[]> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM ax_bmc_versions WHERE bmc_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?"
      )
      .bind(bmcId, limit)
      .all<BmcVersionRow>();

    return (results ?? []).map(toVersion);
  }

  async getVersion(bmcId: string, commitSha: string): Promise<BmcSnapshot | null> {
    const row = await this.db
      .prepare(
        "SELECT * FROM ax_bmc_versions WHERE bmc_id = ? AND commit_sha = ?"
      )
      .bind(bmcId, commitSha)
      .first<BmcVersionRow>();

    if (!row) return null;

    const blocks = JSON.parse(row.snapshot) as Record<string, string | null>;
    return { version: toVersion(row), blocks };
  }

  async restoreVersion(bmcId: string, commitSha: string): Promise<BmcSnapshot | null> {
    return this.getVersion(bmcId, commitSha);
  }
}
