import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createWebhook,
  listWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  dispatch,
  signPayload,
} from "../services/webhook-service.js";

function makeWebhookRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "wh-1",
    org_id: "org-1",
    url: "https://example.com/webhook",
    events: '["evaluation.completed","evaluation.failed"]',
    secret: "supersecret123",
    description: "Test webhook",
    is_active: 1,
    created_by: "user-1",
    created_at: "2026-04-07T00:00:00.000Z",
    updated_at: "2026-04-07T00:00:00.000Z",
    ...overrides,
  };
}

function makeDb(overrides: Partial<{ firstResult: unknown; allResults: unknown[]; changes: number }> = {}) {
  const firstResult = overrides.firstResult ?? null;
  const allResults = overrides.allResults ?? [];
  const changes = overrides.changes ?? 1;
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ meta: { changes } }),
    first: vi.fn().mockResolvedValue(firstResult),
    all: vi.fn().mockResolvedValue({ results: allResults }),
  };
  return { prepare: vi.fn().mockReturnValue(stmt) } as unknown as D1Database;
}

describe("webhookService", () => {
  describe("signPayload", () => {
    it("returns hex string of HMAC-SHA256", async () => {
      const sig = await signPayload("hello", "secret");
      // 64자 hex 문자열이어야 함
      expect(sig).toMatch(/^[0-9a-f]{64}$/);
    });

    it("same input always produces same signature", async () => {
      const sig1 = await signPayload("payload-abc", "key");
      const sig2 = await signPayload("payload-abc", "key");
      expect(sig1).toBe(sig2);
    });

    it("different secrets produce different signatures", async () => {
      const sig1 = await signPayload("payload", "key1");
      const sig2 = await signPayload("payload", "key2");
      expect(sig1).not.toBe(sig2);
    });
  });

  describe("createWebhook", () => {
    it("creates webhook and returns with secret exposed", async () => {
      const row = makeWebhookRow();
      const db = makeDb({ firstResult: row });

      const result = await createWebhook(
        "org-1",
        { url: "https://example.com/webhook", events: ["evaluation.completed"], description: "" },
        "user-1",
        db,
      );

      expect(result.orgId).toBe("org-1");
      expect(result.url).toBe("https://example.com/webhook");
      // 생성 시 secret 노출 (마스킹 없음)
      expect(result.secret).toBe("supersecret123");
      expect(result.isActive).toBe(true);
    });
  });

  describe("listWebhooks", () => {
    it("masks secret in list results", async () => {
      const db = makeDb({ allResults: [makeWebhookRow()] });
      const list = await listWebhooks("org-1", db);
      expect(list).toHaveLength(1);
      expect(list[0]!.secret).toBe("***");
    });

    it("returns empty array when no subscriptions", async () => {
      const db = makeDb({ allResults: [] });
      const list = await listWebhooks("org-1", db);
      expect(list).toEqual([]);
    });
  });

  describe("getWebhook", () => {
    it("returns null if not found", async () => {
      const db = makeDb({ firstResult: null });
      const result = await getWebhook("wh-x", "org-1", db);
      expect(result).toBeNull();
    });

    it("masks secret on single get", async () => {
      const db = makeDb({ firstResult: makeWebhookRow() });
      const result = await getWebhook("wh-1", "org-1", db);
      expect(result?.secret).toBe("***");
    });
  });

  describe("dispatch", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    it("returns empty array when no active subscriptions", async () => {
      const db = makeDb({ allResults: [] });
      const results = await dispatch("evaluation.completed", "org-1", {}, db);
      expect(results).toEqual([]);
    });

    it("dispatches to each subscription with HMAC signature header", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      vi.stubGlobal("fetch", mockFetch);

      const db = makeDb({ allResults: [makeWebhookRow()] });
      const results = await dispatch("evaluation.completed", "org-1", { evalId: "e-1" }, db);

      expect(results).toHaveLength(1);
      expect(results[0]!.status).toBe("delivered");
      expect(results[0]!.statusCode).toBe(200);

      const call = mockFetch.mock.calls[0] as [string, RequestInit] | undefined;
      const [url, options] = call ?? ["", {} as RequestInit];
      expect(url).toBe("https://example.com/webhook");
      expect((options.headers as Record<string, string>)["X-Webhook-Event"]).toBe("evaluation.completed");
      expect((options.headers as Record<string, string>)["X-Signature-256"]).toMatch(/^sha256=[0-9a-f]{64}$/);
    });

    it("marks failed when fetch throws", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

      const db = makeDb({ allResults: [makeWebhookRow()] });
      const results = await dispatch("evaluation.failed", "org-1", {}, db);

      expect(results[0]!.status).toBe("failed");
      expect(results[0]!.error).toContain("ECONNREFUSED");
    });
  });

  describe("deleteWebhook", () => {
    it("returns true when deleted", async () => {
      const db = makeDb({ changes: 1 });
      const ok = await deleteWebhook("wh-1", "org-1", db);
      expect(ok).toBe(true);
    });

    it("returns false when not found", async () => {
      const db = makeDb({ changes: 0 });
      const ok = await deleteWebhook("wh-x", "org-1", db);
      expect(ok).toBe(false);
    });
  });
});
