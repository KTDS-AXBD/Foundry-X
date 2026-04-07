/**
 * F379: Discovery→Shape Pipeline Service + Route Tests (Sprint 171)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { EventBus } from "../services/event-bus.js";
import { DiscoveryShapePipelineService } from "../core/discovery/services/discovery-shape-pipeline-service.js";
import { discoveryShapePipelineRoute } from "../core/discovery/routes/discovery-shape-pipeline.js";
import { createTaskEvent } from "@foundry-x/shared";
import { Hono } from "hono";
import type { Env } from "../env.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", discoveryShapePipelineRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

const json = (res: Response) => res.json() as Promise<Any>;

async function seedDiscoveryData(db: D1Database, itemId = "biz-pipe-1", teamDecision = "Go") {
  const exec = (q: string) =>
    (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);

  await exec(`
    INSERT OR IGNORE INTO biz_items (id, org_id, title, created_by)
    VALUES ('${itemId}', 'org_test', 'Pipeline Test Item', 'test-user')
  `);

  const rptId = `rpt-${itemId}`;
  const verdict = teamDecision === "Go" ? "Go" : teamDecision === "Hold" ? "Conditional" : "NoGo";
  await exec(`
    INSERT OR IGNORE INTO ax_discovery_reports (id, org_id, item_id, report_json, overall_verdict, team_decision)
    VALUES ('${rptId}', 'org_test', '${itemId}',
      '${JSON.stringify({
        market_size: "3조원",
        opportunity: "AI 기반 물류 최적화",
        risks: "초기 투자 부담",
        revenue_model: "SaaS 구독형",
      })}',
      '${verdict}', '${teamDecision}'
    )
  `);
}

describe("DiscoveryShapePipelineService", () => {
  let db: D1Database;
  let eventBus: EventBus;
  let svc: DiscoveryShapePipelineService;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    eventBus = new EventBus();
    svc = new DiscoveryShapePipelineService(db, eventBus);
    await seedDiscoveryData(db);
  });

  it("triggerPipeline — Go 결정 시 Offering 자동 생성", async () => {
    const result = await svc.triggerPipeline("org_test", "biz-pipe-1", "test-user");
    expect(result.status).toBe("success");
    expect(result.offeringId).toBeTruthy();
    expect(result.totalSections).toBeGreaterThanOrEqual(21);
    expect(result.prefilledSections).toBeGreaterThan(0);
    expect(result.tone).toBe("executive");
  });

  it("triggerPipeline — 중복 Offering 방지", async () => {
    const first = await svc.triggerPipeline("org_test", "biz-pipe-1", "test-user");
    expect(first.status).toBe("success");

    const second = await svc.triggerPipeline("org_test", "biz-pipe-1", "test-user");
    expect(second.status).toBe("partial");
    expect(second.error).toContain("already exists");
  });

  it("triggerPipeline — Go가 아닌 결정 시 실패", async () => {
    await seedDiscoveryData(db, "biz-hold-1", "Hold");
    const result = await svc.triggerPipeline("org_test", "biz-hold-1", "test-user");
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Hold");
  });

  it("triggerPipeline — Report 없으면 실패", async () => {
    const result = await svc.triggerPipeline("org_test", "nonexistent", "test-user");
    expect(result.status).toBe("failed");
    expect(result.error).toContain("not found");
  });

  it("triggerPipeline — technical 톤 지정", async () => {
    const result = await svc.triggerPipeline("org_test", "biz-pipe-1", "test-user", "technical");
    expect(result.status).toBe("success");
    expect(result.tone).toBe("technical");
  });

  it("getStatus — idle (Offering 없음)", async () => {
    const status = await svc.getStatus("org_test", "biz-pipe-1");
    expect(status.status).toBe("idle");
    expect(status.offering).toBeUndefined();
  });

  it("getStatus — completed (Offering + 프리필 있음)", async () => {
    await svc.triggerPipeline("org_test", "biz-pipe-1", "test-user");
    const status = await svc.getStatus("org_test", "biz-pipe-1");
    expect(status.status).toBe("completed");
    expect(status.offering).toBeDefined();
    expect(status.offering!.prefilledCount).toBeGreaterThan(0);
  });

  it("EventBus 이벤트 발행 확인", async () => {
    const events: string[] = [];
    eventBus.subscribe("pipeline", (e) => {
      if (e.payload.type === "pipeline") {
        events.push(e.payload.action);
      }
    });

    await svc.triggerPipeline("org_test", "biz-pipe-1", "test-user");

    expect(events).toContain("offering.created");
    expect(events).toContain("offering.prefilled");
  });

  it("registerHandlers — discovery.completed 이벤트 처리", async () => {
    svc.registerHandlers();

    const event = createTaskEvent("pipeline", "info", "biz-pipe-1", "org_test", {
      type: "pipeline",
      action: "discovery.completed",
      itemId: "biz-pipe-1",
    });

    await eventBus.emit(event);

    // Offering이 생성되었는지 확인
    const offering = await db
      .prepare("SELECT id FROM offerings WHERE biz_item_id = 'biz-pipe-1'")
      .first<{ id: string }>();
    expect(offering).not.toBeNull();
  });
});

describe("Discovery→Shape Pipeline Routes", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await seedDiscoveryData(db);
    app = createApp(db);
  });

  it("POST /pipeline/shape/trigger — Offering 생성", async () => {
    const res = await app.request("/api/pipeline/shape/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: "biz-pipe-1", tone: "executive" }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.status).toBe("success");
    expect(body.offeringId).toBeTruthy();
  });

  it("POST /pipeline/shape/trigger — Report 없으면 400", async () => {
    const res = await app.request("/api/pipeline/shape/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: "nonexistent" }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /pipeline/shape/status — idle 상태", async () => {
    const res = await app.request("/api/pipeline/shape/status?itemId=biz-pipe-1");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe("idle");
  });

  it("GET /pipeline/shape/status — completed 상태", async () => {
    // 먼저 트리거
    await app.request("/api/pipeline/shape/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: "biz-pipe-1" }),
    });

    const res = await app.request("/api/pipeline/shape/status?itemId=biz-pipe-1");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe("completed");
    expect(body.offering).toBeDefined();
  });

  it("GET /pipeline/shape/status — itemId 누락 → 400", async () => {
    const res = await app.request("/api/pipeline/shape/status");
    expect(res.status).toBe(400);
  });
});
