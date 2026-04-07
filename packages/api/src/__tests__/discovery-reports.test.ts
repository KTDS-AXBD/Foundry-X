/**
 * Sprint 154: F342 DiscoveryReportService Tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { DiscoveryReportService } from "../core/discovery/services/discovery-report-service.js";

describe("DiscoveryReportService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: DiscoveryReportService;
  const orgId = "org_test";
  const itemId = "item_003";

  beforeEach(() => {
    db = createMockD1();
    svc = new DiscoveryReportService(db as unknown as D1Database);
    (db as any).db.prepare("INSERT OR IGNORE INTO biz_items (id, title, created_by) VALUES (?, ?, ?)").run(itemId, "Test Item", "user1");
  });

  it("upsert — 리포트 생성", async () => {
    const report = await svc.upsert(itemId, orgId, {
      reportJson: { tabs: { "2-1": { summary: "레퍼런스 분석 결과" } } },
      overallVerdict: "Go",
      teamDecision: null,
    });

    expect(report.item_id).toBe(itemId);
    expect(report.overall_verdict).toBe("Go");
    expect(JSON.parse(report.report_json).tabs["2-1"].summary).toBe("레퍼런스 분석 결과");
  });

  it("upsert — 기존 리포트 업데이트", async () => {
    await svc.upsert(itemId, orgId, {
      reportJson: { v: 1 },
      overallVerdict: null,
      teamDecision: null,
    });

    const updated = await svc.upsert(itemId, orgId, {
      reportJson: { v: 2, tabs: {} },
      overallVerdict: "Conditional",
      teamDecision: null,
    });

    expect(JSON.parse(updated.report_json).v).toBe(2);
    expect(updated.overall_verdict).toBe("Conditional");
  });

  it("getByItem — 존재하지 않는 리포트 null", async () => {
    const result = await svc.getByItem("nonexistent");
    expect(result).toBeNull();
  });

  it("setTeamDecision — 팀 결정 갱신", async () => {
    await svc.upsert(itemId, orgId, {
      reportJson: {},
      overallVerdict: "Go",
      teamDecision: null,
    });

    await svc.setTeamDecision(itemId, "Go");
    const report = await svc.getByItem(itemId);
    expect(report!.team_decision).toBe("Go");
  });

  it("generateShareToken — 토큰 생성 + 조회", async () => {
    await svc.upsert(itemId, orgId, {
      reportJson: {},
      overallVerdict: null,
      teamDecision: null,
    });

    const token = await svc.generateShareToken(itemId);
    expect(token).toBeTruthy();
    expect(token.length).toBe(64); // 32 bytes hex

    const found = await svc.getByShareToken(token);
    expect(found).not.toBeNull();
    expect(found!.item_id).toBe(itemId);
  });
});
