/**
 * F517: Gateway routing tests (TDD Red Phase)
 * FX-REQ-545 — fx-gateway Worker, Service Binding 라우팅
 */
import { describe, it, expect, vi } from "vitest";
import app from "../app.js";
import type { GatewayEnv } from "../env.js";

const makeMainApiMock = (status = 200, body = '{"ok":true}') => ({
  fetch: vi.fn().mockResolvedValue(new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  })),
}) as unknown as Fetcher;

const makeDiscoveryMock = (status = 200, body = '{"domain":"discovery"}') => ({
  fetch: vi.fn().mockResolvedValue(new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  })),
}) as unknown as Fetcher;

describe("F517: Gateway routing", () => {
  it("routes /api/discovery/* to DISCOVERY binding when available", async () => {
    const discovery = makeDiscoveryMock();
    const mainApi = makeMainApiMock();
    const env: GatewayEnv = { MAIN_API: mainApi, DISCOVERY: discovery };

    const res = await app.request("/api/discovery/health", {}, env);

    expect(discovery.fetch).toHaveBeenCalledTimes(1);
    expect(mainApi.fetch).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("falls back to MAIN_API when DISCOVERY binding absent", async () => {
    const mainApi = makeMainApiMock();
    const env: GatewayEnv = { MAIN_API: mainApi };

    const res = await app.request("/api/discovery/items", {}, env);

    expect(mainApi.fetch).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it("routes /api/biz-items to MAIN_API", async () => {
    const mainApi = makeMainApiMock();
    const env: GatewayEnv = { MAIN_API: mainApi };

    const res = await app.request("/api/biz-items", {}, env);

    expect(mainApi.fetch).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it("passes through request headers to downstream", async () => {
    const mainApi = makeMainApiMock();
    const env: GatewayEnv = { MAIN_API: mainApi };

    await app.request(
      "/api/health",
      { headers: { Authorization: "Bearer test-token" } },
      env,
    );

    const calledRequest = (mainApi.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(calledRequest).toBeDefined();
  });
});
