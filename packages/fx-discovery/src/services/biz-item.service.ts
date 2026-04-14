/**
 * F523: Walking Skeleton — biz_items 목록 조회 (D1 직접 쿼리)
 */
import type { D1Database } from "@cloudflare/workers-types";

interface BizItemRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export async function listBizItems(
  db: D1Database,
  limit: number,
  offset: number,
): Promise<{ items: BizItemRow[]; total: number }> {
  const [rows, countRow] = await Promise.all([
    db
      .prepare("SELECT id, title, status, created_at FROM biz_items ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .bind(limit, offset)
      .all<BizItemRow>(),
    db
      .prepare("SELECT COUNT(*) as count FROM biz_items")
      .bind()
      .first<{ count: number }>(),
  ]);

  return {
    items: rows.results,
    total: countRow?.count ?? 0,
  };
}
