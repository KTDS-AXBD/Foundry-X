import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import type { Env } from "../env.js";
import { axBdDiscoveryRoute } from "../core/discovery/routes/ax-bd-discovery.js";
import {
  discoveryIngestPayloadSchema,
  discoveryDataItemSchema,
  collectionSourceSchema,
} from "../core/discovery/schemas/discovery-x.schema.js";
import { DiscoveryXIngestService } from "../core/discovery/services/discovery-x-ingest-service.js";

function makeValidPayload(overrides?: Record<string, unknown>) {
  return {
    version: "v1",
    source: {
      id: "src-001",
      type: "market_trend",
      name: "Tech Radar",
      url: "https://techradar.example.com",
    },
    timestamp: Date.now(),
    data: [
      {
        id: "item-001",
        sourceId: "src-001",
        type: "market_trend",
        title: "AI 시장 동향 2026",
        summary: "생성형 AI 시장이 2026년 500조 규모로 성장 전망",
        tags: ["AI", "market"],
        confidence: 0.85,
        collectedAt: Date.now(),
      },
    ],
    ...overrides,
  };
}

// ─── Route 테스트 (미니 Hono 앱) ───

describe("Discovery-X Route (F208)", () => {
  let db: ReturnType<typeof createMockD1>;
  let testApp: Hono;

  beforeEach(() => {
    db = createMockD1();

    // 미니 Hono 앱 — 미들웨어 mock + 라우트 마운트
    testApp = new Hono();
    testApp.use("*", async (c, next) => {
      (c.env as any) = { DB: db } as unknown as Env;
      c.set("orgId" as any, "org_test");
      c.set("userId" as any, "test-user");
      await next();
    });
    testApp.route("/", axBdDiscoveryRoute);
  });

  // ─── POST /ax-bd/discovery/ingest ───

  describe("POST /ax-bd/discovery/ingest", () => {
    it("accepts valid ingest payload and returns 200", async () => {
      const res = await testApp.request("/ax-bd/discovery/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(makeValidPayload()),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.ok).toBe(true);
      expect(data.received).toBe(1);
      expect(data.message).toContain("stub");
    });

    it("returns 400 for empty data array", async () => {
      const res = await testApp.request("/ax-bd/discovery/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(makeValidPayload({ data: [] })),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for wrong version", async () => {
      const res = await testApp.request("/ax-bd/discovery/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(makeValidPayload({ version: "v2" })),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for confidence out of range", async () => {
      const payload = makeValidPayload();
      (payload.data[0] as Record<string, unknown>).confidence = 1.5;
      const res = await testApp.request("/ax-bd/discovery/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(400);
    });

    it("accepts multiple data items", async () => {
      const payload = makeValidPayload({
        data: [
          {
            id: "item-001",
            sourceId: "src-001",
            type: "market_trend",
            title: "트렌드 A",
            summary: "요약 A",
            tags: ["AI"],
            confidence: 0.9,
            collectedAt: Date.now(),
          },
          {
            id: "item-002",
            sourceId: "src-001",
            type: "competitor",
            title: "경쟁사 B",
            summary: "요약 B",
            tags: ["competitor"],
            confidence: 0.7,
            collectedAt: Date.now(),
          },
        ],
      });
      const res = await testApp.request("/ax-bd/discovery/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.received).toBe(2);
    });
  });

  // ─── GET /ax-bd/discovery/status ───

  describe("GET /ax-bd/discovery/status", () => {
    it("returns default status with connected=false", async () => {
      const res = await testApp.request("/ax-bd/discovery/status");
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.connected).toBe(false);
      expect(data.lastSyncAt).toBeNull();
      expect(data.pendingItems).toBe(0);
      expect(data.failedItems).toBe(0);
      expect(data.version).toBe("v1");
    });
  });

  // ─── POST /ax-bd/discovery/sync ───

  describe("POST /ax-bd/discovery/sync", () => {
    it("returns 200 with stub message", async () => {
      const res = await testApp.request("/ax-bd/discovery/sync", {
        method: "POST",
      });
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.ok).toBe(true);
      expect(data.message).toContain("Sync triggered");
    });
  });
});

// ─── Service 테스트 ───

describe("DiscoveryXIngestService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: DiscoveryXIngestService;

  beforeEach(() => {
    db = createMockD1();
    service = new DiscoveryXIngestService(db as unknown as D1Database);
  });

  it("ingest returns received count", async () => {
    const payload = makeValidPayload() as any;
    const result = await service.ingest(payload, "org_test");
    expect(result.received).toBe(1);
  });

  it("getStatus returns default disconnected status", async () => {
    const status = await service.getStatus("org_test");
    expect(status.connected).toBe(false);
    expect(status.version).toBe("v1");
  });

  it("triggerSync completes without error", async () => {
    await expect(service.triggerSync("org_test")).resolves.toBeUndefined();
  });
});

// ─── Zod Schema 단위 테스트 ───

describe("Discovery-X Zod Schemas", () => {
  it("parses valid DiscoveryIngestPayload", () => {
    const payload = {
      version: "v1",
      source: { id: "s1", type: "competitor", name: "CompetitorWatch" },
      timestamp: Date.now(),
      data: [
        {
          id: "d1",
          sourceId: "s1",
          type: "competitor",
          title: "경쟁사 A 분석",
          summary: "경쟁사 A가 신규 AI 서비스를 출시",
          tags: ["competitor"],
          confidence: 0.9,
          collectedAt: Date.now(),
        },
      ],
    };
    const result = discoveryIngestPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects invalid type enum value", () => {
    const source = { id: "s1", type: "invalid_type", name: "Test" };
    const result = collectionSourceSchema.safeParse(source);
    expect(result.success).toBe(false);
  });

  it("rejects tags exceeding max 20", () => {
    const item = {
      id: "d1",
      sourceId: "s1",
      type: "technology",
      title: "Test",
      summary: "Test summary",
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
      confidence: 0.5,
      collectedAt: Date.now(),
    };
    const result = discoveryDataItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it("rejects data array exceeding max 100 items", () => {
    const baseItem = {
      id: "d",
      sourceId: "s1",
      type: "market_trend" as const,
      title: "T",
      summary: "S",
      tags: [],
      confidence: 0.5,
      collectedAt: Date.now(),
    };
    const payload = {
      version: "v1",
      source: { id: "s1", type: "market_trend", name: "Test" },
      timestamp: Date.now(),
      data: Array.from({ length: 101 }, (_, i) => ({ ...baseItem, id: `d${i}` })),
    };
    const result = discoveryIngestPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects confidence outside 0~1 range", () => {
    const item = {
      id: "d1",
      sourceId: "s1",
      type: "pain_point",
      title: "Test",
      summary: "Test",
      tags: [],
      confidence: -0.1,
      collectedAt: Date.now(),
    };
    const result = discoveryDataItemSchema.safeParse(item);
    expect(result.success).toBe(false);

    const item2 = { ...item, confidence: 1.1 };
    const result2 = discoveryDataItemSchema.safeParse(item2);
    expect(result2.success).toBe(false);
  });

  it("rejects content exceeding 50000 chars", () => {
    const item = {
      id: "d1",
      sourceId: "s1",
      type: "regulation",
      title: "Test",
      summary: "Test",
      tags: [],
      confidence: 0.5,
      collectedAt: Date.now(),
      content: "x".repeat(50001),
    };
    const result = discoveryDataItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });
});
