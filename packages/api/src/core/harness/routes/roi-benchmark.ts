/**
 * F278: BD ROI 벤치마크 라우트 — 8 endpoints (Sprint 107)
 */

import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { RoiBenchmarkService } from "../services/roi-benchmark.js";
import { SignalValuationService } from "../../discovery/services/signal-valuation.js";
import { BdRoiCalculatorService } from "../services/bd-roi-calculator.js";
import {
  runBenchmarkSchema,
  latestBenchmarkQuerySchema,
  benchmarkHistoryQuerySchema,
  byStageQuerySchema,
  roiSummaryQuerySchema,
  updateSignalValuationsSchema,
} from "../schemas/roi-benchmark.js";

export const roiBenchmarkRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /roi/benchmark/run — 벤치마크 실행
roiBenchmarkRoute.post("/roi/benchmark/run", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = runBenchmarkSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);

  const svc = new RoiBenchmarkService(c.env.DB);
  const result = await svc.run(c.get("orgId"), parsed.data);
  return c.json(result, 201);
});

// GET /roi/benchmark/latest — 최신 결과
roiBenchmarkRoute.get("/roi/benchmark/latest", async (c) => {
  const parsed = latestBenchmarkQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);

  const svc = new RoiBenchmarkService(c.env.DB);
  const result = await svc.getLatest(c.get("orgId"), parsed.data);
  return c.json(result);
});

// GET /roi/benchmark/history — 스킬별 이력
roiBenchmarkRoute.get("/roi/benchmark/history", async (c) => {
  const parsed = benchmarkHistoryQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);

  const svc = new RoiBenchmarkService(c.env.DB);
  const result = await svc.getHistory(c.get("orgId"), parsed.data);
  return c.json(result);
});

// GET /roi/benchmark/skill/:skillId — 스킬 상세
roiBenchmarkRoute.get("/roi/benchmark/skill/:skillId", async (c) => {
  const svc = new RoiBenchmarkService(c.env.DB);
  const detail = await svc.getSkillDetail(c.get("orgId"), c.req.param("skillId"));
  if (!detail) return c.json({ error: "Not found" }, 404);
  return c.json(detail);
});

// GET /roi/benchmark/by-stage — BD 단계별 집계
roiBenchmarkRoute.get("/roi/benchmark/by-stage", async (c) => {
  const parsed = byStageQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);

  const svc = new RoiBenchmarkService(c.env.DB);
  const stages = await svc.getByStage(c.get("orgId"), parsed.data);
  return c.json({ stages });
});

// GET /roi/summary — BD_ROI 종합
roiBenchmarkRoute.get("/roi/summary", async (c) => {
  const parsed = roiSummaryQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);

  const benchSvc = new RoiBenchmarkService(c.env.DB);
  const signalSvc = new SignalValuationService(c.env.DB);
  const calcSvc = new BdRoiCalculatorService(c.env.DB, benchSvc, signalSvc);
  const summary = await calcSvc.calculate(c.get("orgId"), parsed.data);
  return c.json(summary);
});

// GET /roi/signal-valuations — 신호등 설정 조회
roiBenchmarkRoute.get("/roi/signal-valuations", async (c) => {
  const svc = new SignalValuationService(c.env.DB);
  const valuations = await svc.getValuations(c.get("orgId"));
  return c.json({ valuations });
});

// PUT /roi/signal-valuations — 신호등 설정 갱신
roiBenchmarkRoute.put("/roi/signal-valuations", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateSignalValuationsSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);

  const svc = new SignalValuationService(c.env.DB);
  const valuations = await svc.updateValuations(c.get("orgId"), parsed.data, c.get("userId"));
  return c.json({ valuations });
});
