import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";
import { MonitoringService } from "../services/monitoring.js";

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

function seedDb(sql: string) {
  (env.DB as any).prepare(sql).run();
}

beforeEach(() => {
  env = createTestEnv();
  seedDb(
    "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test User', 'admin', datetime('now'), datetime('now'))"
  );
  seedDb(
    "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')"
  );
});

describe("MonitoringService", () => {
  it("getDetailedHealth returns service statuses", async () => {
    const service = new MonitoringService(
      env.CACHE as unknown as KVNamespace,
      env.DB as unknown as D1Database,
    );
    const health = await service.getDetailedHealth();
    expect(health.overall).toBe("healthy");
    expect(health.services.length).toBeGreaterThanOrEqual(2);

    const dbService = health.services.find((s) => s.name === "D1 Database");
    expect(dbService).toBeDefined();
    expect(dbService!.status).toBe("healthy");
  });

  it("getWorkerStats returns stats with caching", async () => {
    const service = new MonitoringService(
      env.CACHE as unknown as KVNamespace,
      env.DB as unknown as D1Database,
    );

    // First call — generates fresh stats
    const stats1 = await service.getWorkerStats();
    expect(stats1.timestamp).toBeTruthy();
    expect(stats1.avgResponseTimeMs).toBeDefined();

    // Second call — should return cached (KV stores string, get with 'json' parses it)
    const stats2 = await service.getWorkerStats();
    expect(stats2).toBeDefined();
    expect(stats2.avgResponseTimeMs).toBe(stats1.avgResponseTimeMs);
  });

  it("getWorkerStats returns fresh stats after cache miss", async () => {
    const service = new MonitoringService(
      env.CACHE as unknown as KVNamespace,
      env.DB as unknown as D1Database,
    );

    const stats = await service.getWorkerStats();
    expect(stats.requestsPerMinute).toBeDefined();
    expect(stats.errorRate).toBeDefined();
  });
});
