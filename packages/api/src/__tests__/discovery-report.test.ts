/**
 * Sprint 156: F346 — Discovery Report API 테스트
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { discoveryReportRoute } from "../routes/discovery-report.js";

function createTestApp(db: unknown) {
  const app = new Hono();
  // 인증 미들웨어 우회 — orgId/userId 직접 세팅
  app.use("*", async (c, next) => {
    (c as unknown as Record<string, unknown>).env = { DB: db };
    c.set("orgId" as never, "org_test");
    c.set("userId" as never, "user_test");
    await next();
  });
  app.route("/api", discoveryReportRoute);
  return app;
}

describe("GET /api/ax-bd/discovery-report/:itemId", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    db = createMockD1();
    app = createTestApp(db);

    // 테스트 biz_item
    db.prepare(
      "INSERT INTO biz_items (id, org_id, title, status, source, type, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind("item-1", "org_test", "테스트 AI 솔루션", "discovery", "manual", "idea", "user_test").run();

    // 완료된 stages
    db.prepare(
      "INSERT INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status) VALUES (?, ?, ?, ?, ?)",
    ).bind("stage-1", "item-1", "org_test", "2-1", "completed").run();

    db.prepare(
      "INSERT INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status) VALUES (?, ?, ?, ?, ?)",
    ).bind("stage-2", "item-1", "org_test", "2-2", "completed").run();

    db.prepare(
      "INSERT INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status) VALUES (?, ?, ?, ?, ?)",
    ).bind("stage-3", "item-1", "org_test", "2-3", "pending").run();

    // bd_artifacts 스킬 결과
    db.prepare(
      "INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      "art-1", "org_test", "item-1", "skill-ref", "2-1", 1, "input",
      JSON.stringify({
        threeLayers: {
          macro: [{ factor: "AI 시장 성장", trend: "상승", impact: "높음" }],
          meso: [{ factor: "SaaS 전환", trend: "가속", impact: "중간" }],
          micro: [{ factor: "팀 역량", trend: "안정", impact: "높음" }],
        },
      }),
      "completed", "user_test",
    ).run();

    db.prepare(
      "INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      "art-2", "org_test", "item-1", "skill-market", "2-2", 1, "input",
      JSON.stringify({
        tam: { value: 12000, unit: "억원", description: "AI 솔루션 전체 시장" },
        sam: { value: 3000, unit: "억원", description: "국내 B2B AI" },
        som: { value: 500, unit: "억원", description: "초기 타겟 세그먼트" },
      }),
      "completed", "user_test",
    ).run();
  });

  it("should return aggregated report for item with stages", async () => {
    const res = await app.request("/api/ax-bd/discovery-report/item-1");

    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.bizItemId).toBe("item-1");
    expect(data.title).toBe("테스트 AI 솔루션");
    expect(data.completedStages).toContain("2-1");
    expect(data.completedStages).toContain("2-2");
    expect(data.completedStages).not.toContain("2-3");
    const tabs = data.tabs as Record<string, Record<string, unknown>>;
    expect(tabs["2-1"]).toBeDefined();
    expect(tabs["2-1"]!.threeLayers).toBeDefined();
    expect(tabs["2-2"]).toBeDefined();
    expect((tabs["2-2"]!.tam as Record<string, unknown>).value).toBe(12000);
    expect(data.overallProgress).toBeGreaterThan(0);
  });

  it("should return 404 for non-existent item", async () => {
    const res = await app.request("/api/ax-bd/discovery-report/non-existent");
    expect(res.status).toBe(404);
  });

  it("should return empty tabs for item with no artifacts", async () => {
    db.prepare(
      "INSERT INTO biz_items (id, org_id, title, status, source, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind("item-2", "org_test", "빈 아이템", "discovery", "manual", "user_test").run();

    const res = await app.request("/api/ax-bd/discovery-report/item-2");
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.completedStages).toEqual([]);
    expect(data.overallProgress).toBe(0);
  });

  it("should cache report in ax_discovery_reports", async () => {
    await app.request("/api/ax-bd/discovery-report/item-1");

    const cached = db.prepare(
      "SELECT * FROM ax_discovery_reports WHERE biz_item_id = ?",
    ).bind("item-1").first();
    expect(cached).not.toBeNull();

    // 두 번째 호출 — 캐시 갱신
    const res2 = await app.request("/api/ax-bd/discovery-report/item-1");
    expect(res2.status).toBe(200);
  });
});
