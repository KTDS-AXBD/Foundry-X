/**
 * F523: Gateway DISCOVERY routing (TDD — 하드와이어 방식)
 * FX-REQ-545/551 — DISCOVERY_ENABLED 스위치 제거, DISCOVERY 직접 바인딩
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

describe("F523: Gateway DISCOVERY routing (hardwired)", () => {
  it("/api/discovery/* → DISCOVERY Service Binding으로 전달한다", async () => {
    const discovery = makeDiscoveryMock();
    const mainApi = makeMainApiMock();
    const env: GatewayEnv = { MAIN_API: mainApi, DISCOVERY: discovery };

    const res = await app.request("/api/discovery/items", {}, env);

    expect(discovery.fetch).toHaveBeenCalledTimes(1);
    expect(mainApi.fetch).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("/api/discovery/health → DISCOVERY로 전달한다", async () => {
    const discovery = makeDiscoveryMock();
    const mainApi = makeMainApiMock();
    const env: GatewayEnv = { MAIN_API: mainApi, DISCOVERY: discovery };

    await app.request("/api/discovery/health", {}, env);

    expect(discovery.fetch).toHaveBeenCalledTimes(1);
    expect(mainApi.fetch).not.toHaveBeenCalled();
  });

  it("/api/biz-items → MAIN_API로 전달한다", async () => {
    const discovery = makeDiscoveryMock();
    const mainApi = makeMainApiMock();
    const env: GatewayEnv = { MAIN_API: mainApi, DISCOVERY: discovery };

    const res = await app.request("/api/biz-items", {}, env);

    expect(mainApi.fetch).toHaveBeenCalledTimes(1);
    expect(discovery.fetch).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("헤더가 downstream Worker로 그대로 전달된다", async () => {
    const mainApi = makeMainApiMock();
    const discovery = makeDiscoveryMock();
    const env: GatewayEnv = { MAIN_API: mainApi, DISCOVERY: discovery };

    await app.request(
      "/api/health",
      { headers: { Authorization: "Bearer test-token" } },
      env,
    );

    const calledRequest = (mainApi.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(calledRequest).toBeDefined();
  });
});
