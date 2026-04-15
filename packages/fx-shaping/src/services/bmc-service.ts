// ─── DB Row 타입 ───
interface BmcRow {
  id: string;
  idea_id: string | null;
  title: string;
  git_ref: string;
  author_id: string;
  org_id: string;
  sync_status: "synced" | "pending" | "failed";
  is_deleted: number; // 0 | 1
  created_at: number;
  updated_at: number;
}

interface BmcBlockRow {
  bmc_id: string;
  block_type: string;
  content: string | null;
  updated_at: number;
}

// ─── API 타입 ───
export interface Bmc {
  id: string;
  ideaId: string | null;
  title: string;
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  blocks: BmcBlock[];
  createdAt: number;
  updatedAt: number;
}

export interface BmcBlock {
  blockType: string;
  content: string | null;
  updatedAt: number;
}

// ─── 9개 블록 타입 상수 ───
export const BMC_BLOCK_TYPES = [
  "customer_segments",
  "value_propositions",
  "channels",
  "customer_relationships",
  "revenue_streams",
  "key_resources",
  "key_activities",
  "key_partnerships",
  "cost_structure",
] as const;

// ─── 변환 헬퍼 ───
function toBmc(row: BmcRow, blocks: BmcBlockRow[]): Bmc {
  return {
    id: row.id,
    ideaId: row.idea_id,
    title: row.title,
    gitRef: row.git_ref,
    authorId: row.author_id,
    orgId: row.org_id,
    syncStatus: row.sync_status as Bmc["syncStatus"],
    blocks: blocks.map((b) => ({
      blockType: b.block_type,
      content: b.content,
      updatedAt: b.updated_at,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class BmcService {
  constructor(private db: D1Database) {}

  async create(orgId: string, userId: string, data: { title: string; ideaId?: string }): Promise<Bmc> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const gitRef = "pending"; // Git 커밋 전 상태

    // 1) BMC 메타 INSERT
    await this.db
      .prepare(
        `INSERT INTO ax_bmcs (id, idea_id, title, git_ref, author_id, org_id, sync_status, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`
      )
      .bind(id, data.ideaId ?? null, data.title, gitRef, userId, orgId, now, now)
      .run();

    // 2) 9개 블록 빈 초기화
    for (const type of BMC_BLOCK_TYPES) {
      await this.db
        .prepare(
          `INSERT INTO ax_bmc_blocks (bmc_id, block_type, content, updated_at)
           VALUES (?, ?, '', ?)`
        )
        .bind(id, type, now)
        .run();
    }

    return this.getById(orgId, id) as Promise<Bmc>;
  }

  async getById(orgId: string, id: string): Promise<Bmc | null> {
    const row = await this.db
      .prepare("SELECT * FROM ax_bmcs WHERE id = ? AND org_id = ? AND is_deleted = 0")
      .bind(id, orgId)
      .first<BmcRow>();
    if (!row) return null;

    const { results: blocks } = await this.db
      .prepare("SELECT * FROM ax_bmc_blocks WHERE bmc_id = ?")
      .bind(id)
      .all<BmcBlockRow>();

    return toBmc(row, blocks ?? []);
  }

  async list(orgId: string, opts: { page: number; limit: number; sort: string }) {
    const offset = (opts.page - 1) * opts.limit;
    const orderBy = opts.sort === "created_at_asc" ? "created_at ASC" : "updated_at DESC";

    const { results } = await this.db
      .prepare(`SELECT * FROM ax_bmcs WHERE org_id = ? AND is_deleted = 0 ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .bind(orgId, opts.limit, offset)
      .all<BmcRow>();

    const countRow = await this.db
      .prepare("SELECT COUNT(*) as total FROM ax_bmcs WHERE org_id = ? AND is_deleted = 0")
      .bind(orgId)
      .first<{ total: number }>();

    // 각 BMC의 블록도 가져오기 (N+1 최적화는 Phase 1 후)
    const items = await Promise.all(
      (results ?? []).map(async (row) => {
        const { results: blocks } = await this.db
          .prepare("SELECT * FROM ax_bmc_blocks WHERE bmc_id = ?")
          .bind(row.id)
          .all<BmcBlockRow>();
        return toBmc(row, blocks ?? []);
      })
    );

    return { items, total: countRow?.total ?? 0, page: opts.page, limit: opts.limit };
  }

  async update(
    orgId: string,
    id: string,
    userId: string,
    data: { title?: string; blocks?: Array<{ blockType: string; content: string }> }
  ): Promise<Bmc | null> {
    const existing = await this.getById(orgId, id);
    if (!existing) return null;

    const now = Date.now();

    // 타이틀 업데이트
    if (data.title) {
      await this.db
        .prepare("UPDATE ax_bmcs SET title = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?")
        .bind(data.title, now, id)
        .run();
    }

    // 블록 업데이트
    if (data.blocks) {
      for (const b of data.blocks) {
        await this.db
          .prepare(
            `UPDATE ax_bmc_blocks SET content = ?, updated_at = ? WHERE bmc_id = ? AND block_type = ?`
          )
          .bind(b.content, now, id, b.blockType)
          .run();
      }

      // BMC 메타 업데이트 시간도 갱신
      await this.db
        .prepare("UPDATE ax_bmcs SET updated_at = ?, sync_status = 'pending' WHERE id = ?")
        .bind(now, id)
        .run();
    }

    return this.getById(orgId, id);
  }

  async softDelete(orgId: string, id: string): Promise<boolean> {
    const result = await this.db
      .prepare("UPDATE ax_bmcs SET is_deleted = 1, updated_at = ? WHERE id = ? AND org_id = ?")
      .bind(Date.now(), id, orgId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async stage(orgId: string, id: string, _userId: string): Promise<{ staged: true; bmcId: string } | null> {
    const existing = await this.getById(orgId, id);
    if (!existing) return null;

    // sync_status를 'pending'으로 유지 — 프론트엔드가 커밋 요청을 보내기 전까지 대기
    await this.db
      .prepare("UPDATE ax_bmcs SET sync_status = 'pending', updated_at = ? WHERE id = ?")
      .bind(Date.now(), id)
      .run();

    return { staged: true, bmcId: id };
  }
}
