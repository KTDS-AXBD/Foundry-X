import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { createStranglerMiddleware } from "../../src/middleware/strangler.js";
import type { StranglerConfig } from "../../src/middleware/strangler.js";

function createApp(config: StranglerConfig) {
  const app = new Hono();
  app.use("*", createStranglerMiddleware(config));
  app.get("/gate/items", (c) => c.json({ source: "local", path: "/gate/items" }));
  app.get("/other/data", (c) => c.json({ source: "local", path: "/other/data" }));
  app.get("/gate", (c) => c.json({ source: "local", path: "/gate" }));
  return app;
}

// vi.stubGlobal 사용 — ESM 모듈 내 fetch 참조를 안정적으로 intercept
function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createStranglerMiddleware", () => {
  describe("미매칭 경로", () => {
    it("등록되지 않은 경로는 next()로 로컬 핸들러 실행", async () => {
      const app = createApp({ routes: [{ pathPrefix: "/gate", serviceId: "gate-x", mode: "local" }] });
      const res = await app.request("/other/data");
      expect(res.status).toBe(200);
      const body = await res.json<{ source: string }>();
      expect(body.source).toBe("local");
    });
  });

  describe("local 모드", () => {
    it("local 모드는 next()로 로컬 핸들러 실행", async () => {
      const app = createApp({ routes: [{ pathPrefix: "/gate", serviceId: "gate-x", mode: "local" }] });
      const res = await app.request("/gate/items");
      expect(res.status).toBe(200);
      const body = await res.json<{ source: string }>();
      expect(body.source).toBe("local");
    });
  });

  describe("proxy 모드 — targetUrl 없음", () => {
    it("proxy 모드 + targetUrl 없으면 502 반환", async () => {
      const app = createApp({ routes: [{ pathPrefix: "/gate", serviceId: "gate-x", mode: "proxy" }] });
      const res = await app.request("/gate/items");
      expect(res.status).toBe(502);
      const body = await res.json<{ error: string; serviceId: string }>();
      expect(body.error).toBe("Service not configured");
      expect(body.serviceId).toBe("gate-x");
    });
  });

  describe("proxy 모드 — targetUrl 있음", () => {
    it("proxy 모드 + targetUrl → fetch 호출", async () => {
      const fetchMock = mockFetch(new Response(JSON.stringify({ proxied: true }), { status: 200 }));
      const app = createApp({
        routes: [{ pathPrefix: "/gate", serviceId: "gate-x", mode: "proxy", targetUrl: "https://gate-x.example.com" }],
      });
      const res = await app.request("/gate/items");
      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledOnce();
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toBe("https://gate-x.example.com/items");
    });

    it("proxy 모드 — X-Forwarded-From 헤더 설정", async () => {
      const fetchMock = mockFetch(new Response("{}", { status: 200 }));
      const app = createApp({
        routes: [{ pathPrefix: "/gate", serviceId: "gate-x", mode: "proxy", targetUrl: "https://gate-x.example.com" }],
      });
      await app.request("/gate/items");
      expect(fetchMock).toHaveBeenCalledOnce();
      const init = fetchMock.mock.calls[0][1] as RequestInit & { headers: Headers };
      const headers = new Headers(init.headers);
      expect(headers.get("x-forwarded-from")).toBe("foundry-x-strangler");
      expect(headers.get("x-service-id")).toBe("gate-x");
      expect(headers.get("x-original-path")).toBe("/gate/items");
    });

    it("proxy 모드 — query string 보존", async () => {
      const fetchMock = mockFetch(new Response("{}", { status: 200 }));
      const app = createApp({
        routes: [{ pathPrefix: "/gate", serviceId: "gate-x", mode: "proxy", targetUrl: "https://gate-x.example.com" }],
      });
      await app.request("/gate/items?page=2&limit=10");
      expect(fetchMock).toHaveBeenCalledOnce();
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("?page=2&limit=10");
    });

    it("더 긴 prefix가 우선 매칭", async () => {
      const fetchMock = mockFetch(new Response("{}", { status: 200 }));
      const app = createApp({
        routes: [
          { pathPrefix: "/gate", serviceId: "gate-x", mode: "proxy", targetUrl: "https://gate.example.com" },
          { pathPrefix: "/gate/items", serviceId: "gate-x", mode: "proxy", targetUrl: "https://items.example.com" },
        ],
      });
      await app.request("/gate/items");
      expect(fetchMock).toHaveBeenCalledOnce();
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toBe("https://items.example.com/");
    });
  });

  describe("루트 경로 처리", () => {
    it("prefix만 일치하는 경우 '/' 경로로 포워딩", async () => {
      const fetchMock = mockFetch(new Response("{}", { status: 200 }));
      const app = createApp({
        routes: [{ pathPrefix: "/gate", serviceId: "gate-x", mode: "proxy", targetUrl: "https://gate.example.com" }],
      });
      await app.request("/gate");
      expect(fetchMock).toHaveBeenCalledOnce();
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toBe("https://gate.example.com/");
    });
  });
});
