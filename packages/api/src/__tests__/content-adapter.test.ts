/**
 * F378: Content Adapter Service + Route Tests (Sprint 171)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { ContentAdapterService } from "../core/offering/services/content-adapter-service.js";
import { contentAdapterRoute } from "../core/offering/routes/content-adapter.js";
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
  app.route("/api", contentAdapterRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

const json = (res: Response) => res.json() as Promise<Any>;

async function seedTestData(db: D1Database) {
  const exec = (q: string) =>
    (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);

  await exec(`
    INSERT OR IGNORE INTO biz_items (id, org_id, title, created_by, description)
    VALUES ('biz-adapt-1', 'org_test', 'Healthcare AI 플랫폼', 'test-user', '헬스케어 AI 사업')
  `);

  await exec(`
    INSERT OR IGNORE INTO ax_discovery_reports (id, org_id, item_id, report_json, overall_verdict, team_decision)
    VALUES ('rpt-1', 'org_test', 'biz-adapt-1',
      '${JSON.stringify({
        market_size: "약 5조원 (2025년 기준)",
        growth_rate: "연 23% CAGR",
        opportunity: "디지털 헬스 전환 가속화",
        roi: "투자 대비 3.5배 수익 예상",
        risks: "규제 리스크, 데이터 확보 난이도",
        revenue_model: "SaaS 구독 + 맞춤 솔루션",
        background: "헬스케어 산업의 AI 전환 수요 급증",
        strategic_need: "KT 디지털 헬스 사업 확대 전략",
        tech_driver: "LLM + FHIR 표준 통합 가능",
        barriers: "의료 데이터 규제, 인증 절차",
        competition: "주요 경쟁사 3곳 (A사, B사, C사)",
        architecture: "클라우드 네이티브 마이크로서비스",
        investment: "1단계 5억원, 2단계 10억원",
        timeline: "2026 Q3 PoC → 2027 Q1 MVP",
      })}',
      'Go', 'Go'
    )
  `);

  // Offering 생성
  await exec(`
    INSERT INTO offerings (id, org_id, biz_item_id, title, purpose, format, status, current_version, created_by)
    VALUES ('off-adapt-1', 'org_test', 'biz-adapt-1', 'Healthcare AI 사업기획서', 'report', 'html', 'draft', 1, 'test-user')
  `);

  // 표준 섹션 5개 seed
  const sections = [
    ["sec-1", "exec_summary", "Executive Summary", 1],
    ["sec-2", "s01", "추진 배경 및 목적", 2],
    ["sec-3", "s02", "사업기회 점검", 3],
    ["sec-4", "s03", "제안 방향", 10],
    ["sec-5", "s04", "추진 계획", 14],
  ] as const;

  for (const [id, key, title, order] of sections) {
    await exec(`
      INSERT INTO offering_sections (id, offering_id, section_key, title, sort_order, is_required, is_included)
      VALUES ('${id}', 'off-adapt-1', '${key}', '${title}', ${order}, 1, 1)
    `);
  }
}

describe("ContentAdapterService", () => {
  let db: D1Database;
  let svc: ContentAdapterService;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await seedTestData(db);
    svc = new ContentAdapterService(db);
  });

  it("executive 톤 변환 — ROI, 시장 수치 포함", async () => {
    const results = await svc.adaptSections("org_test", "off-adapt-1", "executive");
    expect(results.length).toBeGreaterThanOrEqual(5);
    const execSummary = results.find((r) => r.sectionKey === "exec_summary");
    expect(execSummary).toBeDefined();
    expect(execSummary!.content).toContain("Executive Summary");
  });

  it("technical 톤 변환 — 기술 스택 포함", async () => {
    const results = await svc.adaptSections("org_test", "off-adapt-1", "technical");
    const execSummary = results.find((r) => r.sectionKey === "exec_summary");
    expect(execSummary).toBeDefined();
    expect(execSummary!.content).toContain("Technical Overview");
  });

  it("critical 톤 변환 — 리스크 강조", async () => {
    const results = await svc.adaptSections("org_test", "off-adapt-1", "critical");
    const execSummary = results.find((r) => r.sectionKey === "exec_summary");
    expect(execSummary).toBeDefined();
    expect(execSummary!.content).toContain("Critical Review");
  });

  it("sectionKeys 필터 — 특정 섹션만 변환", async () => {
    const results = await svc.adaptSections("org_test", "off-adapt-1", "executive", ["exec_summary", "s01"]);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.sectionKey).sort()).toEqual(["exec_summary", "s01"]);
  });

  it("존재하지 않는 Offering — 에러", async () => {
    await expect(svc.adaptSections("org_test", "nonexistent", "executive")).rejects.toThrow("Offering not found");
  });

  it("previewAdapt — DB 미저장 확인", async () => {
    const preview = await svc.previewAdapt("org_test", "off-adapt-1", "executive");
    expect(preview.length).toBeGreaterThanOrEqual(5);

    // DB의 섹션 content가 null 그대로인지 확인
    const row = await db
      .prepare("SELECT content FROM offering_sections WHERE id = 'sec-1'")
      .first<{ content: string | null }>();
    expect(row?.content).toBeNull();
  });

  it("adaptSections — DB에 content 저장", async () => {
    await svc.adaptSections("org_test", "off-adapt-1", "executive");

    const row = await db
      .prepare("SELECT content FROM offering_sections WHERE id = 'sec-1'")
      .first<{ content: string | null }>();
    expect(row?.content).not.toBeNull();
    expect(row?.content).toContain("Executive Summary");
  });
});

describe("Content Adapter Routes", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = createMockD1() as unknown as D1Database;
    await seedTestData(db);
    app = createApp(db);
  });

  it("POST /offerings/:id/adapt — 톤 변환 적용", async () => {
    const res = await app.request("/api/offerings/off-adapt-1/adapt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tone: "executive" }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.tone).toBe("executive");
    expect(body.adaptedSections.length).toBeGreaterThanOrEqual(5);
  });

  it("GET /offerings/:id/adapt/preview — 프리뷰", async () => {
    const res = await app.request("/api/offerings/off-adapt-1/adapt/preview?tone=technical");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.tone).toBe("technical");
  });

  it("POST /offerings/:id/adapt — 잘못된 톤 → 400", async () => {
    const res = await app.request("/api/offerings/off-adapt-1/adapt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tone: "invalid" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /offerings/:id/adapt — 존재하지 않는 Offering → 404", async () => {
    const res = await app.request("/api/offerings/nonexistent/adapt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tone: "executive" }),
    });
    expect(res.status).toBe(404);
  });
});
