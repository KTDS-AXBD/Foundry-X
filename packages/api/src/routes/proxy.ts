// ─── F399: Strangler Fig 프록시 레이어 (Sprint 186) ───
// createStranglerMiddleware로 라우팅 규칙을 선언적으로 관리한다.
// 이미 분리된 서비스(dx, aif): Workers Service Binding 활용 (ServiceProxy 유지)
// 이관 예정 서비스(gate, launch, auth, portal): mode:'local' → 이관 완료 후 mode:'proxy'로 전환

import { OpenAPIHono } from "@hono/zod-openapi";
import { createStranglerMiddleware } from "@foundry-x/harness-kit";
import type { StranglerRoute } from "@foundry-x/harness-kit";
import { SsoService } from "../modules/auth/services/sso.js";
import { ServiceProxy } from "../services/service-proxy.js";
import type { Env } from "../env.js";

export const proxyRoute = new OpenAPIHono<{ Bindings: Env }>();

const ssoService = new SsoService();

/**
 * 서비스별 라우팅 규칙 — Phase 20-B 이관 로드맵 반영
 * mode:'local'  → 현재 모놀리스에서 처리 (이관 전)
 * mode:'proxy'  → 외부 서비스로 포워딩 (이관 후, targetUrl 또는 Workers Binding 필요)
 *
 * dx / aif는 Workers Service Binding 기반이므로 아래 StranglerConfig 대신
 * ServiceProxy를 직접 사용한다 (Binding은 URL이 아닌 fetch 인터페이스).
 */
export const stranglerRoutes: StranglerRoute[] = [
  // ─── 이관 예정 (현재 local 모드) — M5 이후 proxy 전환 ───
  { pathPrefix: "/gate", serviceId: "gate-x", mode: "local" },
  { pathPrefix: "/launch", serviceId: "launch-x", mode: "local" },
];

// 이관 예정 서비스 라우트 등록 (local 모드 — next()로 fallthrough)
proxyRoute.use("*", createStranglerMiddleware({ routes: stranglerRoutes }));

// ─── /dx/* → Discovery-X (Workers Service Binding 기반) ───

proxyRoute.all("/dx/*", async (c) => {
  const hubToken = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!hubToken) {
    return c.json({ error: "Hub token required" }, 401);
  }

  const result = await ssoService.verifyHubToken(hubToken, c.env.JWT_SECRET);
  if (!result.valid || !result.payload?.services?.some((s) => s.id === "discovery-x")) {
    return c.json({ error: "Access to discovery-x not granted" }, 403);
  }

  const path = c.req.path.replace("/api/dx", "");
  const proxy = new ServiceProxy(c.env);
  return proxy.forward("dx", path, c.req.raw, hubToken);
});

// ─── /aif/* → AI Foundry (Workers Service Binding 기반) ───

proxyRoute.all("/aif/*", async (c) => {
  const hubToken = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!hubToken) {
    return c.json({ error: "Hub token required" }, 401);
  }

  const result = await ssoService.verifyHubToken(hubToken, c.env.JWT_SECRET);
  if (!result.valid || !result.payload?.services?.some((s) => s.id === "ai-foundry")) {
    return c.json({ error: "Access to ai-foundry not granted" }, 403);
  }

  const path = c.req.path.replace("/api/aif", "");
  const proxy = new ServiceProxy(c.env);
  return proxy.forward("aif", path, c.req.raw, hubToken);
});
