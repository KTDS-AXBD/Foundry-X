import { BMC_BLOCK_TYPES } from "./bmc-service.js";

// ─── DB Row 타입 ───
interface CommentRow {
  id: string;
  bmc_id: string;
  block_type: string | null;
  author_id: string;
  content: string;
  created_at: number;
}

// ─── API 타입 ───
export interface BmcComment {
  id: string;
  bmcId: string;
  blockType: string | null;
  authorId: string;
  content: string;
  createdAt: number;
}

// ─── 변환 헬퍼 ───
function toComment(row: CommentRow): BmcComment {
  return {
    id: row.id,
    bmcId: row.bmc_id,
    blockType: row.block_type,
    authorId: row.author_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

export class BmcCommentService {
  constructor(private db: D1Database) {}

  async createComment(
    bmcId: string,
    authorId: string,
    content: string,
    blockType?: string
  ): Promise<BmcComment> {
    // BMC 존재 확인
    const bmc = await this.db
      .prepare("SELECT id FROM ax_bmcs WHERE id = ? AND is_deleted = 0")
      .bind(bmcId)
      .first();
    if (!bmc) throw new NotFoundError("BMC not found");

    // blockType 유효성 검증
    if (blockType && !(BMC_BLOCK_TYPES as readonly string[]).includes(blockType)) {
      throw new ValidationError(`Invalid block type: ${blockType}`);
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO ax_bmc_comments (id, bmc_id, block_type, author_id, content, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, bmcId, blockType ?? null, authorId, content, now)
      .run();

    // @멘션 파싱 (알림 연동은 Phase 1 scope 외 — 추후 NotificationService 연동)
    const _mentions = this.parseMentions(content);

    return { id, bmcId, blockType: blockType ?? null, authorId, content, createdAt: now };
  }

  async getComments(
    bmcId: string,
    blockType?: string,
    limit = 20,
    offset = 0
  ): Promise<{ comments: BmcComment[]; total: number }> {
    const whereClause = blockType
      ? "WHERE bmc_id = ? AND block_type = ?"
      : "WHERE bmc_id = ?";

    const binds = blockType ? [bmcId, blockType] : [bmcId];

    const stmt = this.db.prepare(
      `SELECT * FROM ax_bmc_comments ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    );
    const { results } = await stmt.bind(...binds, limit, offset).all<CommentRow>();

    const countStmt = this.db.prepare(
      `SELECT COUNT(*) as total FROM ax_bmc_comments ${whereClause}`
    );
    const countRow = await countStmt.bind(...binds).first<{ total: number }>();

    return {
      comments: (results ?? []).map(toComment),
      total: countRow?.total ?? 0,
    };
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const row = await this.db
      .prepare("SELECT * FROM ax_bmc_comments WHERE id = ?")
      .bind(commentId)
      .first<CommentRow>();

    if (!row) throw new NotFoundError("Comment not found");
    if (row.author_id !== userId) throw new ForbiddenError("Cannot delete another user's comment");

    await this.db
      .prepare("DELETE FROM ax_bmc_comments WHERE id = ?")
      .bind(commentId)
      .run();
  }

  async getCommentCounts(bmcId: string): Promise<Record<string, number>> {
    const { results } = await this.db
      .prepare(
        `SELECT block_type, COUNT(*) as count FROM ax_bmc_comments
         WHERE bmc_id = ? GROUP BY block_type`
      )
      .bind(bmcId)
      .all<{ block_type: string | null; count: number }>();

    const counts: Record<string, number> = {};
    let total = 0;

    for (const row of results ?? []) {
      const key = row.block_type ?? "_general";
      counts[key] = row.count;
      total += row.count;
    }

    counts._total = total;
    return counts;
  }

  private parseMentions(content: string): string[] {
    const matches = content.match(/@(\w+)/g);
    if (!matches) return [];
    return matches.map((m) => m.slice(1));
  }
}

// ─── 에러 클래스 ───
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
