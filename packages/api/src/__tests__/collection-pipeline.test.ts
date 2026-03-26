import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

// Mock agent-runner for AgentCollector
vi.mock("../services/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: {
        analysis: JSON.stringify({
          items: [
            { title: "AI 손해사정 자동화", description: "보험 손해사정 프로세스를 AI로 자동화", keywords: ["보험", "AI"] },
            { title: "스마트팩토리 이상 감지", description: "제조 현장 센서 기반 실시간 이상 감지", keywords: ["제조", "IoT"] },
          ],
        }),
      },
      tokensUsed: 800,
      model: "mock-model",
      duration: 2000,
    }),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  }),
  createRoutedRunner: () => Promise.resolve({
    type: "mock",
    execute: vi.fn(),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  }),
}));

let env: ReturnType<typeof createTestEnv>;

function req(method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) {
  const url = `http://localhost${path}`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  };
  if (opts?.body) init.body = JSON.stringify(opts.body);
  return app.request(url, init, env);
}

function execSql(sql: string) {
  (env.DB as any).exec(sql);
}

function seedDb(sql: string) {
  (env.DB as any).prepare(sql).run();
}

const COLLECTION_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'field',
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS collection_jobs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    keywords TEXT,
    items_found INTEGER DEFAULT 0,
    items_new INTEGER DEFAULT 0,
    items_duplicate INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    created_by TEXT NOT NULL
  );
`;

describe("Collection Pipeline API (F179)", () => {
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    headers = await createAuthHeaders();
    execSql(COLLECTION_TABLES_SQL);
  });

  // ─── POST /collection/agent-collect ───

  describe("POST /api/collection/agent-collect", () => {
    it("should collect items via agent and return results", async () => {
      const res = await req("POST", "/api/collection/agent-collect", {
        headers,
        body: { keywords: ["AI 보험", "손해사정"], maxItems: 5 },
      });
      expect(res.status).toBe(201);
      const data = (((await res.json()) as any)) as any;
      expect(data.itemsFound).toBe(2);
      expect(data.itemsNew).toBe(2);
      expect(data.itemsDuplicate).toBe(0);
      expect(data.items).toHaveLength(2);
      expect(data.items[0].status).toBe("pending_review");
      expect(data.jobId).toBeTruthy();
    });

    it("should detect duplicates on second collect with same titles", async () => {
      // First collect
      await req("POST", "/api/collection/agent-collect", {
        headers,
        body: { keywords: ["AI 보험"], maxItems: 5 },
      });
      // Second collect (same titles)
      const res = await req("POST", "/api/collection/agent-collect", {
        headers,
        body: { keywords: ["AI 보험"], maxItems: 5 },
      });
      expect(res.status).toBe(201);
      const data = (((await res.json()) as any)) as any;
      expect(data.itemsNew).toBe(0);
      expect(data.itemsDuplicate).toBe(2);
    });

    it("should return 400 for empty keywords", async () => {
      const res = await req("POST", "/api/collection/agent-collect", {
        headers,
        body: { keywords: [] },
      });
      expect(res.status).toBe(400);
    });

    it("should return 401 without auth", async () => {
      const res = await req("POST", "/api/collection/agent-collect", {
        body: { keywords: ["test"] },
      });
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /collection/jobs ───

  describe("GET /api/collection/jobs", () => {
    it("should return empty jobs list initially", async () => {
      const res = await req("GET", "/api/collection/jobs", { headers });
      expect(res.status).toBe(200);
      const data = (((await res.json()) as any)) as any;
      expect(data.jobs).toHaveLength(0);
    });

    it("should return jobs after agent-collect", async () => {
      await req("POST", "/api/collection/agent-collect", {
        headers,
        body: { keywords: ["AI"] },
      });
      const res = await req("GET", "/api/collection/jobs", { headers });
      expect(res.status).toBe(200);
      const data = (((await res.json()) as any)) as any;
      expect(data.jobs.length).toBeGreaterThanOrEqual(1);
      expect(data.jobs[0].channel).toBe("agent");
      expect(data.jobs[0].status).toBe("completed");
    });

    it("should filter by channel", async () => {
      await req("POST", "/api/collection/agent-collect", {
        headers,
        body: { keywords: ["AI"] },
      });
      const res = await req("GET", "/api/collection/jobs?channel=idea_portal", { headers });
      const data = (((await res.json()) as any)) as any;
      expect(data.jobs).toHaveLength(0);
    });
  });

  // ─── GET /collection/stats ───

  describe("GET /api/collection/stats", () => {
    it("should return stats with zero initially", async () => {
      const res = await req("GET", "/api/collection/stats", { headers });
      expect(res.status).toBe(200);
      const data = (((await res.json()) as any)) as any;
      expect(data.total).toBe(0);
      expect(data.approvalRate).toBe(0);
    });

    it("should count items after collect", async () => {
      await req("POST", "/api/collection/agent-collect", {
        headers,
        body: { keywords: ["AI"] },
      });
      const res = await req("GET", "/api/collection/stats", { headers });
      const data = (((await res.json()) as any)) as any;
      expect(data.total).toBe(2);
      expect(data.byChannel.agent).toBe(2);
    });
  });

  // ─── Screening Queue ───

  describe("Screening Queue", () => {
    it("should list pending_review items", async () => {
      await req("POST", "/api/collection/agent-collect", {
        headers,
        body: { keywords: ["AI"] },
      });
      const res = await req("GET", "/api/collection/screening-queue", { headers });
      expect(res.status).toBe(200);
      const data = (((await res.json()) as any)) as any;
      expect(data.items.length).toBe(2);
      expect(data.items[0].source).toBe("agent");
    });

    it("should approve item (pending_review → draft)", async () => {
      await req("POST", "/api/collection/agent-collect", {
        headers,
        body: { keywords: ["AI"] },
      });
      const queue: any = await (await req("GET", "/api/collection/screening-queue", { headers })).json();
      const itemId = queue.items[0].id;

      const res = await req("POST", `/api/collection/screening-queue/${itemId}/approve`, { headers });
      expect(res.status).toBe(200);
      const data = (((await res.json()) as any)) as any;
      expect(data.status).toBe("draft");

      // Should no longer be in queue
      const queue2: any = await (await req("GET", "/api/collection/screening-queue", { headers })).json();
      expect(queue2.items.length).toBe(1);
    });

    it("should reject item (pending_review → rejected)", async () => {
      await req("POST", "/api/collection/agent-collect", {
        headers,
        body: { keywords: ["AI"] },
      });
      const queue: any = await (await req("GET", "/api/collection/screening-queue", { headers })).json();
      const itemId = queue.items[0].id;

      const res = await req("POST", `/api/collection/screening-queue/${itemId}/reject`, {
        headers,
        body: { reason: "중복 아이템" },
      });
      expect(res.status).toBe(200);
      const data = (((await res.json()) as any)) as any;
      expect(data.status).toBe("rejected");
    });

    it("should return 404 for non-existent item approve", async () => {
      const res = await req("POST", "/api/collection/screening-queue/nonexistent/approve", { headers });
      expect(res.status).toBe(404);
    });
  });

  // ─── POST /webhooks/idea-portal ───

  describe("POST /api/webhooks/idea-portal", () => {
    async function signPayload(payload: unknown): Promise<string> {
      const body = JSON.stringify(payload);
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode("test-webhook-secret"),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const hex = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return `sha256=${hex}`;
    }

    beforeEach(() => {
      // Set WEBHOOK_SECRET in test env
      (env as any).WEBHOOK_SECRET = "test-webhook-secret";
    });

    it("should accept valid webhook payload", async () => {
      const payload = { title: "전사 IDEA Portal 아이디어", description: "임직원 제안", submittedBy: "직원A" };
      const signature = await signPayload(payload);

      const url = `http://localhost/api/webhooks/idea-portal?org_id=org_test`;
      const res = await app.request(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Webhook-Signature": signature },
        body: JSON.stringify(payload),
      }, env);

      expect(res.status).toBe(201);
      const data = (((await res.json()) as any)) as any;
      expect(data.id).toBeTruthy();
      expect(data.status).toBe("pending_review");
    });

    it("should return 401 for invalid signature", async () => {
      const url = `http://localhost/api/webhooks/idea-portal?org_id=org_test`;
      const res = await app.request(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Webhook-Signature": "sha256=invalid" },
        body: JSON.stringify({ title: "test" }),
      }, env);

      expect(res.status).toBe(401);
    });

    it("should return 400 for missing title", async () => {
      const payload = { description: "no title" };
      const signature = await signPayload(payload);

      const url = `http://localhost/api/webhooks/idea-portal?org_id=org_test`;
      const res = await app.request(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Webhook-Signature": signature },
        body: JSON.stringify(payload),
      }, env);

      expect(res.status).toBe(400);
    });
  });

  // ─── Approval rate calculation ───

  describe("Stats approval rate", () => {
    it("should calculate correct approval rate", async () => {
      await req("POST", "/api/collection/agent-collect", {
        headers,
        body: { keywords: ["AI"] },
      });
      const queue: any = await (await req("GET", "/api/collection/screening-queue", { headers })).json();

      // Approve first, reject second
      await req("POST", `/api/collection/screening-queue/${queue.items[0].id}/approve`, { headers });
      await req("POST", `/api/collection/screening-queue/${queue.items[1].id}/reject`, { headers });

      const stats: any = await (await req("GET", "/api/collection/stats", { headers })).json();
      expect(stats.approvalRate).toBe(0.5);
    });
  });
});
