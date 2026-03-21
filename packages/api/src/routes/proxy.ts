import { OpenAPIHono } from "@hono/zod-openapi";
import { SsoService } from "../services/sso.js";
import { ServiceProxy } from "../services/service-proxy.js";
import type { Env } from "../env.js";

export const proxyRoute = new OpenAPIHono<{ Bindings: Env }>();

const ssoService = new SsoService();

// ─── /dx/* → Discovery-X ───

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

// ─── /aif/* → AI Foundry ───

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
