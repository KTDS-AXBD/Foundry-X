/**
 * F546 fx-decode-bridge — Hono sub-app
 * Sprint 298 | FX-REQ-582
 *
 * Proxies Decode-X (svc-extraction/svc-ontology) endpoints.
 * Auth: Foundry-X JWT middleware handles user auth.
 *       Decode-X internal auth via X-Internal-Secret (forwarded by decode-client).
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../../../env.js";
import {
  getOntologyGraph,
  getAnalysisSummary,
  getAnalysisFindings,
  getAnalysisComparison,
  triggerAnalysis,
} from "../services/decode-client.js";
import { LPON_HARNESS_METRICS } from "../data/lpon-mock.js";

export const decodeBridgeRoute = new OpenAPIHono<{ Bindings: Env }>();

// ── KG Ontology Graph (F549) ──────────────────────────────────────────

decodeBridgeRoute.get("/decode/ontology/graph", async (c) => {
  const data = await getOntologyGraph(c.env);
  return c.json(data);
});

decodeBridgeRoute.get("/decode/ontology/terms", async (c) => {
  // Simple mock — ontology terms list
  return c.json({ terms: [], total: 0, note: "ontology-terms-mock" });
});

// ── Extraction Analysis (F547) ────────────────────────────────────────

decodeBridgeRoute.post("/decode/analyze", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const documentId = (body as Record<string, string>).documentId ?? "lpon-demo";
  const orgId = (body as Record<string, string>).orgId ?? "org_452b33c1";
  const result = await triggerAnalysis(c.env, { documentId, orgId });
  return c.json(result);
});

decodeBridgeRoute.get("/decode/analysis/:documentId/summary", async (c) => {
  const { documentId } = c.req.param();
  const data = await getAnalysisSummary(c.env, documentId);
  return c.json(data);
});

decodeBridgeRoute.get("/decode/analysis/:documentId/findings", async (c) => {
  const { documentId } = c.req.param();
  const data = await getAnalysisFindings(c.env, documentId);
  return c.json(data);
});

decodeBridgeRoute.get("/decode/analysis/:documentId/compare", async (c) => {
  const { documentId } = c.req.param();
  const data = await getAnalysisComparison(c.env, documentId);
  return c.json(data);
});

// ── Harness Metrics (F548) ────────────────────────────────────────────

decodeBridgeRoute.get("/decode/harness/metrics", async (c) => {
  // F548: Currently mock-based. Real-time indicator: agent_improvement_proposals count
  let concreteness = LPON_HARNESS_METRICS.concreteness;
  try {
    const row = await c.env.DB
      .prepare("SELECT COUNT(*) as cnt FROM agent_improvement_proposals WHERE status = 'accepted'")
      .first<{ cnt: number }>();
    if (row?.cnt !== undefined) {
      concreteness = Math.min(100, 60 + Math.floor(row.cnt * 2));
    }
  } catch {
    // Table may not exist — use mock
  }
  return c.json({ ...LPON_HARNESS_METRICS, concreteness });
});

// ── LPON Export / Download (F547) ─────────────────────────────────────

decodeBridgeRoute.get("/decode/export/:documentId", async (c) => {
  const { documentId } = c.req.param();
  // Returns download metadata — actual file served via R2 or inline
  return c.json({
    documentId,
    downloadUrl: `/api/decode/download/${documentId}`,
    fileName: `lpon-type1-semipro-${documentId}.zip`,
    note: "LPON Type 1 반제품 (온누리상품권 취소) — Decode-X working-version 패키징",
    contents: [
      "src/ — 구현 코드",
      "__tests__/ — 테스트",
      "migrations/0001_init.sql — D1 스키마",
      "docs/ — 6종 Spec (01~06)",
    ],
  });
});

decodeBridgeRoute.get("/decode/download/:documentId", async (c) => {
  // For MVP: return informational response with file listing
  // Production: stream ZIP from R2
  const { documentId } = c.req.param();
  return c.json({
    status: "ready",
    message: "LPON Type 1 반제품 패키지",
    documentId,
    fileCount: 24,
    totalSize: "182KB",
    note: "실제 배포 환경에서는 R2 zip 스트리밍 제공",
  });
});
