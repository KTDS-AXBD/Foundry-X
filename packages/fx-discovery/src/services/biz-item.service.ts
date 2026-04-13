// F523: biz_items 조회 서비스 (FX-REQ-551)
// Option B: 공유 D1 DB, biz_items 테이블 READ 전용

export interface BizItem {
  id: string;
  title: string;
  source: string;
  status: string;
  created_at: string;
}

export interface BizItemListResult {
  items: BizItem[];
  total: number;
}

export async function listBizItems(
  db: D1Database,
  limit: number,
  offset: number,
): Promise<BizItemListResult> {
  const [rowsResult, countResult] = await Promise.all([
    db
      .prepare("SELECT id, title, source, status, created_at FROM biz_items ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .bind(limit, offset)
      .all<BizItem>(),
    db
      .prepare("SELECT COUNT(*) as count FROM biz_items")
      .bind()
      .first<{ count: number }>(),
  ]);

  return {
    items: rowsResult.results,
    total: countResult?.count ?? 0,
  };
}
