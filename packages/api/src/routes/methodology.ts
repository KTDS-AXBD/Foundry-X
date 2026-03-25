/**
 * Sprint 59 F191: Methodology Routes — 레지스트리 조회 + 추천 + 선택 관리
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { MethodologyRegistry } from "../services/methodology-registry.js";
import { BdpMethodologyModule } from "../services/bdp-methodology-module.js";
import { SelectMethodologySchema } from "../schemas/methodology.js";
import type { BizItemContext } from "../services/methodology-module.js";
import type { MethodologySelection } from "../services/methodology-module.js";

// ─── Registry 초기화: BDP 모듈 자동 등록 ───
const registry = MethodologyRegistry.getInstance();
if (!registry.get("bdp")) {
  registry.register(new BdpMethodologyModule());
}

export const methodologyRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

function generateId(): string {
  return crypto.randomUUID();
}

function toSelection(row: Record<string, unknown>): MethodologySelection {
  return {
    id: row.id as string,
    bizItemId: row.biz_item_id as string,
    methodologyId: row.methodology_id as string,
    matchScore: row.match_score as number | null,
    selectedBy: row.selected_by as "auto" | "manual",
    isCurrent: (row.is_current as number) === 1,
    createdAt: row.created_at as string,
  };
}

// ─── GET /methodologies — 등록된 방법론 목록 ───

methodologyRoute.get("/methodologies", (c) => {
  const registry = MethodologyRegistry.getInstance();
  return c.json(registry.getAllMeta());
});

// ─── GET /methodologies/:id — 방법론 상세 (criteria, reviewMethods 포함) ───

methodologyRoute.get("/methodologies/:id", (c) => {
  const registry = MethodologyRegistry.getInstance();
  const module = registry.get(c.req.param("id"));
  if (!module) {
    return c.json({ error: "Methodology not found" }, 404);
  }
  return c.json({
    id: module.id,
    name: module.name,
    description: module.description,
    version: module.version,
    criteria: module.getCriteria(),
    reviewMethods: module.getReviewMethods(),
  });
});

// ─── POST /biz-items/:itemId/methodology/recommend — 추천 ───

methodologyRoute.post("/biz-items/:itemId/methodology/recommend", async (c) => {
  const itemId = c.req.param("itemId");
  const db = c.env.DB;

  const item = await db
    .prepare("SELECT id, title, description, source, status FROM biz_items WHERE id = ?")
    .bind(itemId)
    .first<{ id: string; title: string; description: string | null; source: string; status: string }>();

  if (!item) {
    return c.json({ error: "Biz item not found" }, 404);
  }

  // 보충: classification + starting_point
  const cls = await db
    .prepare("SELECT item_type, confidence, analysis_weights FROM biz_item_classifications WHERE biz_item_id = ?")
    .bind(itemId)
    .first<{ item_type: string; confidence: number; analysis_weights: string }>();

  const sp = await db
    .prepare("SELECT starting_point FROM biz_starting_points WHERE biz_item_id = ?")
    .bind(itemId)
    .first<{ starting_point: string }>();

  const context: BizItemContext = {
    id: item.id,
    title: item.title,
    description: item.description,
    source: item.source,
    classification: cls
      ? {
          itemType: cls.item_type,
          confidence: cls.confidence,
          analysisWeights: JSON.parse(cls.analysis_weights || "{}"),
        }
      : null,
    startingPoint: sp?.starting_point ?? null,
  };

  const registry = MethodologyRegistry.getInstance();
  const recommendations = await registry.recommend(context);
  return c.json({ recommendations });
});

// ─── POST /biz-items/:itemId/methodology/select — 방법론 선택 ───

methodologyRoute.post("/biz-items/:itemId/methodology/select", async (c) => {
  const itemId = c.req.param("itemId");
  const db = c.env.DB;

  const body = await c.req.json();
  const parsed = SelectMethodologySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  // 아이템 존재 확인
  const item = await db
    .prepare("SELECT id FROM biz_items WHERE id = ?")
    .bind(itemId)
    .first();
  if (!item) {
    return c.json({ error: "Biz item not found" }, 404);
  }

  // 방법론 존재 확인
  const registry = MethodologyRegistry.getInstance();
  const module = registry.get(parsed.data.methodologyId);
  if (!module) {
    return c.json({ error: "Methodology not found" }, 404);
  }

  // 기존 선택을 비활성화
  await db
    .prepare("UPDATE methodology_selections SET is_current = 0 WHERE biz_item_id = ? AND is_current = 1")
    .bind(itemId)
    .run();

  // 새 선택 UPSERT
  const id = generateId();
  await db
    .prepare(
      `INSERT INTO methodology_selections (id, biz_item_id, methodology_id, selected_by, is_current, created_at)
       VALUES (?, ?, ?, 'manual', 1, datetime('now'))
       ON CONFLICT(biz_item_id, methodology_id)
       DO UPDATE SET is_current = 1, selected_by = 'manual'`,
    )
    .bind(id, itemId, parsed.data.methodologyId)
    .run();

  // 방금 저장한 row 반환
  const row = await db
    .prepare("SELECT * FROM methodology_selections WHERE biz_item_id = ? AND is_current = 1 ORDER BY created_at DESC LIMIT 1")
    .bind(itemId)
    .first();

  return c.json(toSelection(row as Record<string, unknown>));
});

// ─── GET /biz-items/:itemId/methodology — 현재 선택 ───

methodologyRoute.get("/biz-items/:itemId/methodology", async (c) => {
  const itemId = c.req.param("itemId");
  const row = await c.env.DB
    .prepare("SELECT * FROM methodology_selections WHERE biz_item_id = ? AND is_current = 1 LIMIT 1")
    .bind(itemId)
    .first();

  if (!row) {
    return c.json({ selection: null });
  }
  return c.json({ selection: toSelection(row as Record<string, unknown>) });
});

// ─── GET /biz-items/:itemId/methodology/history — 선택 이력 ───

methodologyRoute.get("/biz-items/:itemId/methodology/history", async (c) => {
  const itemId = c.req.param("itemId");
  const { results } = await c.env.DB
    .prepare("SELECT * FROM methodology_selections WHERE biz_item_id = ? ORDER BY created_at DESC")
    .bind(itemId)
    .all();

  return c.json({ history: (results ?? []).map((r) => toSelection(r as Record<string, unknown>)) });
});
