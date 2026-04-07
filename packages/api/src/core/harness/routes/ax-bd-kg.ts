/**
 * F255: KG Ontology routes — /ax-bd/kg/*
 */

import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { KgNodeService } from "../services/kg-node.js";
import { KgEdgeService } from "../services/kg-edge.js";
import { KgQueryService } from "../services/kg-query.js";
import { KgSeedService } from "../services/kg-seed.js";
import { KgScenarioService } from "../services/kg-scenario.js";
import {
  createNodeSchema,
  updateNodeSchema,
  nodeQuerySchema,
  createEdgeSchema,
  pathQuerySchema,
  impactBodySchema,
  neighborQuerySchema,
  subgraphQuerySchema,
  scenarioSimulateSchema,
} from "../schemas/kg-ontology.schema.js";

export const axBdKgRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// ── Nodes ──────────────────────────────────────────

// POST /ax-bd/kg/nodes — Create node
axBdKgRoute.post("/ax-bd/kg/nodes", async (c) => {
  const body = await c.req.json();
  const parsed = createNodeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

  const svc = new KgNodeService(c.env.DB);
  const node = await svc.create({
    id: crypto.randomUUID(),
    orgId: c.get("orgId"),
    ...parsed.data,
  });
  return c.json(node, 201);
});

// GET /ax-bd/kg/nodes — List nodes
axBdKgRoute.get("/ax-bd/kg/nodes", async (c) => {
  const query = nodeQuerySchema.safeParse(c.req.query());
  if (!query.success) return c.json({ error: "Invalid query", details: query.error.flatten() }, 400);

  const svc = new KgNodeService(c.env.DB);
  const result = await svc.list(c.get("orgId"), query.data);
  return c.json(result);
});

// GET /ax-bd/kg/nodes/search — Search nodes
axBdKgRoute.get("/ax-bd/kg/nodes/search", async (c) => {
  const q = c.req.query("q") ?? "";
  if (!q) return c.json({ items: [] });

  const svc = new KgNodeService(c.env.DB);
  const items = await svc.search(c.get("orgId"), q);
  return c.json({ items });
});

// GET /ax-bd/kg/nodes/:id — Get node
axBdKgRoute.get("/ax-bd/kg/nodes/:id", async (c) => {
  const svc = new KgNodeService(c.env.DB);
  const node = await svc.getById(c.req.param("id"), c.get("orgId"));
  if (!node) return c.json({ error: "Node not found" }, 404);
  return c.json(node);
});

// PATCH /ax-bd/kg/nodes/:id — Update node
axBdKgRoute.patch("/ax-bd/kg/nodes/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateNodeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

  const svc = new KgNodeService(c.env.DB);
  const node = await svc.update(c.req.param("id"), c.get("orgId"), parsed.data);
  if (!node) return c.json({ error: "Node not found" }, 404);
  return c.json(node);
});

// DELETE /ax-bd/kg/nodes/:id — Delete node
axBdKgRoute.delete("/ax-bd/kg/nodes/:id", async (c) => {
  const svc = new KgNodeService(c.env.DB);
  const deleted = await svc.delete(c.req.param("id"), c.get("orgId"));
  if (!deleted) return c.json({ error: "Node not found" }, 404);
  return c.json({ ok: true });
});

// ── Edges ──────────────────────────────────────────

// POST /ax-bd/kg/edges — Create edge
axBdKgRoute.post("/ax-bd/kg/edges", async (c) => {
  const body = await c.req.json();
  const parsed = createEdgeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

  const svc = new KgEdgeService(c.env.DB);
  const edge = await svc.create({
    id: crypto.randomUUID(),
    orgId: c.get("orgId"),
    ...parsed.data,
  });
  return c.json(edge, 201);
});

// GET /ax-bd/kg/nodes/:id/neighbors — Get neighbors
axBdKgRoute.get("/ax-bd/kg/nodes/:id/neighbors", async (c) => {
  const query = neighborQuerySchema.safeParse(c.req.query());
  const direction = query.success ? query.data.direction : "both";

  const svc = new KgEdgeService(c.env.DB);
  const result = await svc.getNeighbors(c.req.param("id"), c.get("orgId"), direction);
  return c.json(result);
});

// DELETE /ax-bd/kg/edges/:id — Delete edge
axBdKgRoute.delete("/ax-bd/kg/edges/:id", async (c) => {
  const svc = new KgEdgeService(c.env.DB);
  const deleted = await svc.delete(c.req.param("id"), c.get("orgId"));
  if (!deleted) return c.json({ error: "Edge not found" }, 404);
  return c.json({ ok: true });
});

// ── Queries ────────────────────────────────────────

// GET /ax-bd/kg/path — Find path between nodes
axBdKgRoute.get("/ax-bd/kg/path", async (c) => {
  const query = pathQuerySchema.safeParse(c.req.query());
  if (!query.success) return c.json({ error: "Invalid query", details: query.error.flatten() }, 400);

  const svc = new KgQueryService(c.env.DB);
  const paths = await svc.findAllPaths(
    query.data.source,
    query.data.target,
    c.get("orgId"),
    query.data.maxDepth
  );
  return c.json({ paths });
});

// POST /ax-bd/kg/impact — Impact propagation
axBdKgRoute.post("/ax-bd/kg/impact", async (c) => {
  const body = await c.req.json();
  const parsed = impactBodySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

  const svc = new KgQueryService(c.env.DB);
  const result = await svc.propagateImpact(parsed.data.sourceNodeId, c.get("orgId"), {
    decayFactor: parsed.data.decayFactor,
    threshold: parsed.data.threshold,
    maxDepth: parsed.data.maxDepth,
    relationTypes: parsed.data.relationTypes,
  });
  return c.json(result);
});

// GET /ax-bd/kg/subgraph/:nodeId — Get subgraph
axBdKgRoute.get("/ax-bd/kg/subgraph/:nodeId", async (c) => {
  const query = subgraphQuerySchema.safeParse(c.req.query());
  const depth = query.success ? query.data.depth : 2;

  const svc = new KgQueryService(c.env.DB);
  const result = await svc.getSubgraph(c.req.param("nodeId"), c.get("orgId"), depth);
  return c.json(result);
});

// GET /ax-bd/kg/stats — KG statistics
axBdKgRoute.get("/ax-bd/kg/stats", async (c) => {
  const svc = new KgQueryService(c.env.DB);
  const stats = await svc.getStats(c.get("orgId"));
  return c.json(stats);
});

// ── Scenario ──────────────────────────────────────

// GET /ax-bd/kg/scenario/presets — List scenario presets
axBdKgRoute.get("/ax-bd/kg/scenario/presets", async (c) => {
  const svc = new KgScenarioService(c.env.DB);
  return c.json({ presets: svc.getPresets() });
});

// GET /ax-bd/kg/scenario/presets/:id — Get preset detail
axBdKgRoute.get("/ax-bd/kg/scenario/presets/:id", async (c) => {
  const svc = new KgScenarioService(c.env.DB);
  const preset = svc.getPresetById(c.req.param("id"));
  if (!preset) return c.json({ error: "Preset not found" }, 404);
  return c.json(preset);
});

// POST /ax-bd/kg/scenario/simulate — Run scenario simulation
axBdKgRoute.post("/ax-bd/kg/scenario/simulate", async (c) => {
  const body = await c.req.json();
  const parsed = scenarioSimulateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

  const svc = new KgScenarioService(c.env.DB);
  const result = await svc.simulateScenario(parsed.data, c.get("orgId"));
  return c.json(result);
});

// ── Seed ───────────────────────────────────────────

// POST /ax-bd/kg/seed — Seed sample data
axBdKgRoute.post("/ax-bd/kg/seed", async (c) => {
  const svc = new KgSeedService(c.env.DB);
  const result = await svc.seedAll(c.get("orgId"));
  return c.json({ ok: true, ...result });
});

// DELETE /ax-bd/kg/seed — Clear seed data
axBdKgRoute.delete("/ax-bd/kg/seed", async (c) => {
  const svc = new KgSeedService(c.env.DB);
  await svc.clearAll(c.get("orgId"));
  return c.json({ ok: true });
});
