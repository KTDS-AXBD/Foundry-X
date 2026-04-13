// F523: GET /api/discovery/items (FX-REQ-551)
import { Hono } from "hono";
import type { DiscoveryEnv } from "../env.js";
import { listBizItems } from "../services/biz-item.service.js";

const items = new Hono<{ Bindings: DiscoveryEnv }>();

items.get("/api/discovery/items", async (c) => {
  const limitStr = c.req.query("limit") ?? "20";
  const offsetStr = c.req.query("offset") ?? "0";

  const limit = parseInt(limitStr, 10);
  const offset = parseInt(offsetStr, 10);

  if (isNaN(limit) || isNaN(offset)) {
    return c.json({ error: "limit and offset must be numbers" }, 400);
  }

  const result = await listBizItems(c.env.DB, limit, offset);
  return c.json(result);
});

export default items;
