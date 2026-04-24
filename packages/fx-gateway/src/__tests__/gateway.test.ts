/**
 * F523: Gateway DISCOVERY routing (TDD — 하드와이어 방식)
 * FX-REQ-545/551 — DISCOVERY_ENABLED 스위치 제거, DISCOVERY 직접 바인딩
 * F539b: CORS 미들웨어 + 인증 헤더 전달 검증 (FX-REQ-577)
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

const makeModulesMock = () => ({ fetch: vi.fn().mockResolvedValue(new Response("{}")) } as unknown as Fetcher);

describe("F523: Gateway DISCOVERY routing (hardwired)", () => {
  it("/api/discovery/* → DISCOVERY Service Binding으로 전달한다", async () => {
    const discovery = makeDiscoveryMock();
    const mainApi = makeMainApiMock();
    const shapingMock = { fetch: vi.fn().mockResolvedValue(new Response("{}")) } as unknown as Fetcher;
    const offeringMock = { fetch: vi.fn().mockResolvedValue(new Response("{}")) } as unknown as Fetcher;
    const env: GatewayEnv = { MAIN_API: mainApi, DISCOVERY: discovery, SHAPING: shapingMock, OFFERING: offeringMock, MODULES: makeModulesMock() };

    const res = await app.request("/api/discovery/items", {}, env);

    expect(discovery.fetch).toHaveBeenCalledTimes(1);
    expect(mainApi.fetch).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("/api/discovery/health → DISCOVERY로 전달한다", async () => {
    const discovery = makeDiscoveryMock();
    const mainApi = makeMainApiMock();
    const shapingMock = { fetch: vi.fn().mockResolvedValue(new Response("{}")) } as unknown as Fetcher;
    const offeringMock = { fetch: vi.fn().mockResolvedValue(new Response("{}")) } as unknown as Fetcher;
    const env: GatewayEnv = { MAIN_API: mainApi, DISCOVERY: discovery, SHAPING: shapingMock, OFFERING: offeringMock, MODULES: makeModulesMock() };

    await app.request("/api/discovery/health", {}, env);

    expect(discovery.fetch).toHaveBeenCalledTimes(1);
    expect(mainApi.fetch).not.toHaveBeenCalled();
  });

  // F539c: /api/biz-items → DISCOVERY로 변경됨
  it("/api/biz-items → DISCOVERY Service Binding으로 전달한다", async () => {
    const discovery = makeDiscoveryMock();
    const mainApi = makeMainApiMock();
    const shapingMock = { fetch: vi.fn().mockResolvedValue(new Response("{}")) } as unknown as Fetcher;
    const offeringMock = { fetch: vi.fn().mockResolvedValue(new Response("{}")) } as unknown as Fetcher;
    const env: GatewayEnv = { MAIN_API: mainApi, DISCOVERY: discovery, SHAPING: shapingMock, OFFERING: offeringMock, MODULES: makeModulesMock() };

    const res = await app.request("/api/biz-items", {}, env);

    expect(discovery.fetch).toHaveBeenCalledTimes(1);
    expect(mainApi.fetch).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("Authorization 헤더가 MAIN_API downstream으로 그대로 전달된다", async () => {
    const mainApi = makeMainApiMock();
    const discovery = makeDiscoveryMock();
    const shapingMock = { fetch: vi.fn().mockResolvedValue(new Response("{}")) } as unknown as Fetcher;
    const offeringMock = { fetch: vi.fn().mockResolvedValue(new Response("{}")) } as unknown as Fetcher;
    const env: GatewayEnv = { MAIN_API: mainApi, DISCOVERY: discovery, SHAPING: shapingMock, OFFERING: offeringMock, MODULES: makeModulesMock() };

    await app.request(
      "/api/health",
      { headers: { Authorization: "Bearer test-token" } },
      env,
    );

    const calledRequest = (mainApi.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Request;
    expect(calledRequest).toBeDefined();
    expect(calledRequest.headers.get("authorization")).toBe("Bearer test-token");
  });
});

// F539b: CORS 미들웨어 테스트
describe("F539b: Gateway CORS (FX-REQ-577)", () => {
  const makeShapingMock = () => ({ fetch: vi.fn().mockResolvedValue(new Response("{}")) } as unknown as Fetcher);
  const makeOfferingMock = () => ({ fetch: vi.fn().mockResolvedValue(new Response("{}")) } as unknown as Fetcher);
  const makeEnv = (): GatewayEnv => ({
    MAIN_API: makeMainApiMock(),
    DISCOVERY: makeDiscoveryMock(),
    SHAPING: makeShapingMock(),
    OFFERING: makeOfferingMock(),
    MODULES: makeModulesMock(),
  });

  it("OPTIONS preflight 요청에 CORS 헤더를 반환한다", async () => {
    const res = await app.request("/api/health", {
      method: "OPTIONS",
      headers: {
        "Origin": "https://fx.minu.best",
        "Access-Control-Request-Method": "GET",
      },
    }, makeEnv());

    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });

  it("GET 요청에 Access-Control-Allow-Origin 헤더가 포함된다", async () => {
    const res = await app.request("/api/discovery/health", {
      headers: { "Origin": "https://fx.minu.best" },
    }, makeEnv());

    expect(res.headers.get("access-control-allow-origin")).toBe("https://fx.minu.best");
  });

  it("localhost:3000 Origin도 허용한다", async () => {
    const res = await app.request("/api/health", {
      headers: { "Origin": "http://localhost:3000" },
    }, makeEnv());

    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });

  it("허용되지 않은 Origin은 CORS 헤더를 반환하지 않는다", async () => {
    const res = await app.request("/api/health", {
      headers: { "Origin": "https://evil.example.com" },
    }, makeEnv());

    expect(res.headers.get("access-control-allow-origin")).not.toBe("https://evil.example.com");
  });
});
