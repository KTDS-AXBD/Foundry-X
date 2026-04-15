/**
 * Sprint 94: F263 Discovery Stage 라우트 — biz-item별 단계 진행 추적
 * F539c: 2개 라우트 전부 fx-discovery로 이전 (FX-REQ-578)
 * 라우팅: fx-gateway /api/biz-items/:id/discovery-progress → fx-discovery
 *         fx-gateway /api/biz-items/:id/discovery-stage → fx-discovery
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";

export const discoveryStagesRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// F539c: 두 라우트 모두 fx-discovery로 이전됨
// GET /biz-items/:id/discovery-progress → fx-discovery (Service Binding)
// POST /biz-items/:id/discovery-stage   → fx-discovery (Service Binding)
