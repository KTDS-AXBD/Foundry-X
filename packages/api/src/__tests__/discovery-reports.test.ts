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

  // ─── F483: 평가결과서 HTML 테스트 ───

  it("saveHtml — 새 리포트에 HTML 저장", async () => {
    const sampleHtml = "<html><body><h1>평가결과서</h1></body></html>";
    const result = await svc.saveHtml(itemId, orgId, sampleHtml);

    expect(result.updatedAt).toBeTruthy();

    const html = await svc.getHtml(itemId);
    expect(html).not.toBeNull();
    expect(html!.html).toBe(sampleHtml);
  });

  it("saveHtml — 기존 리포트에 HTML 갱신", async () => {
    await svc.upsert(itemId, orgId, {
      reportJson: { tabs: {} },
      overallVerdict: "Go",
      teamDecision: null,
    });

    const sampleHtml = "<html><body>Updated</body></html>";
    await svc.saveHtml(itemId, orgId, sampleHtml);

    const html = await svc.getHtml(itemId);
    expect(html!.html).toBe(sampleHtml);

    // report_json은 그대로 유지
    const report = await svc.getByItem(itemId);
    expect(report!.overall_verdict).toBe("Go");
  });

  it("getHtml — HTML 미등록 시 null 반환", async () => {
    await svc.upsert(itemId, orgId, {
      reportJson: {},
      overallVerdict: null,
      teamDecision: null,
    });

    const result = await svc.getHtml(itemId);
    expect(result).toBeNull();
  });

  it("getHtml — 리포트 자체가 없으면 null", async () => {
    const result = await svc.getHtml("nonexistent");
    expect(result).toBeNull();
  });

  it("getHtmlByToken — 공유 토큰으로 HTML 조회", async () => {
    const sampleHtml = "<html><body>Shared Report</body></html>";
    await svc.saveHtml(itemId, orgId, sampleHtml);

    const token = await svc.generateShareToken(itemId);
    const html = await svc.getHtmlByToken(token);
    expect(html).toBe(sampleHtml);
  });

  it("getHtmlByToken — HTML 없으면 null", async () => {
    await svc.upsert(itemId, orgId, {
      reportJson: {},
      overallVerdict: null,
      teamDecision: null,
    });

    const token = await svc.generateShareToken(itemId);
    const html = await svc.getHtmlByToken(token);
    expect(html).toBeNull();
  });

  it("getHtmlByToken — 잘못된 토큰이면 null", async () => {
    const html = await svc.getHtmlByToken("invalid_token_12345");
    expect(html).toBeNull();
  });

  it("saveHtml + getHtml 라운드트립", async () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head><title>KOAMI 평가결과서</title></head>
<body>
  <div class="tabs">
    <div id="tab-2-1">레퍼런스 분석</div>
    <div id="tab-2-9">멀티페르소나 평가</div>
  </div>
</body>
</html>`;

    await svc.saveHtml(itemId, orgId, fullHtml);
    const result = await svc.getHtml(itemId);
    expect(result!.html).toBe(fullHtml);
    expect(result!.updatedAt).toBeTruthy();
  });
});
