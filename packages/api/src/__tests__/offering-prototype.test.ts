/**
 * F382: Offering → Prototype 연동 테스트 (Sprint 173)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { offeringPrototypeRoute } from "../routes/offering-prototype.js";
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
  app.route("/api", offeringPrototypeRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedBizItem(db: D1Database, id = "biz-1") {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT OR IGNORE INTO biz_items (id, org_id, title, created_by) VALUES ('${id}', 'org_test', 'Healthcare AI', 'test-user')`,
  );
}

async function seedOffering(
  db: D1Database,
  id = "off-1",
  bizItemId = "biz-1",
) {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO offerings (id, org_id, biz_item_id, title, purpose, format, status, current_version, created_by)
     VALUES ('${id}', 'org_test', '${bizItemId}', 'Test Offering', 'report', 'html', 'draft', 1, 'test-user')`,
  );
}

async function seedSections(db: D1Database, offeringId = "off-1") {
  const sections = [
    { key: "executive_summary", title: "Executive Summary", content: "환자 데이터를 활용한 진단 자동화", order: 1 },
    { key: "market_analysis", title: "시장 분석", content: "글로벌 헬스케어 AI 시장 $45B", order: 2 },
    { key: "product_overview", title: "제품 개요", content: "- AI 진단 엔진\n- 환자 대시보드\n- 의료진 협업 도구", order: 3 },
    { key: "value_proposition", title: "가치 제안", content: "Healthcare AI — 진단 정확도 혁신\n빠르고 정확한 AI 기반 진단 솔루션", order: 4 },
    { key: "competitive_analysis", title: "경쟁 분석", content: "- MedTech Corp\n- HealthAI Inc\n- DiagnosticPro", order: 5 },
  ];

  for (const s of sections) {
    await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
      `INSERT INTO offering_sections (id, offering_id, section_key, title, content, sort_order, is_required, is_included)
       VALUES ('sec-${s.key}', '${offeringId}', '${s.key}', '${s.title}', '${s.content.replace(/'/g, "''")}', ${s.order}, 1, 1)`,
    );
  }
}

const json = (res: Response) => res.json() as Promise<Any>;

describe("Offering → Prototype 연동 API", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    db = mockDb as unknown as D1Database;
    await seedBizItem(db);
    await seedOffering(db);
    await seedSections(db);
    app = createApp(db);
  });

  // ── POST /offerings/:id/prototype ──

  it("POST /offerings/:id/prototype — generates prototype from offering", async () => {
    const res = await app.request("/api/offerings/off-1/prototype", {
      method: "POST",
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeTruthy();
    expect(body.bizItemId).toBe("biz-1");
    expect(body.version).toBe(1);
    expect(body.format).toBe("html");
    expect(body.content).toBeTruthy();
    expect(body.templateUsed).toBe("idea");
    expect(body.generatedAt).toBeTruthy();
  });

  it("POST /offerings/:id/prototype — returns 404 for non-existent offering", async () => {
    const res = await app.request("/api/offerings/nonexistent/prototype", {
      method: "POST",
    });
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error).toBe("Offering not found");
  });

  it("POST /offerings/:id/prototype — saves mapping in offering_prototypes", async () => {
    const res = await app.request("/api/offerings/off-1/prototype", {
      method: "POST",
    });
    expect(res.status).toBe(201);
    const body = await json(res);

    // 매핑 확인
    const mapping = await db
      .prepare(
        "SELECT * FROM offering_prototypes WHERE offering_id = ? AND prototype_id = ?",
      )
      .bind("off-1", body.id)
      .first();
    expect(mapping).toBeTruthy();
  });

  // ── GET /offerings/:id/prototypes ──

  it("GET /offerings/:id/prototypes — returns empty list initially", async () => {
    const res = await app.request("/api/offerings/off-1/prototypes");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it("GET /offerings/:id/prototypes — returns linked prototypes after generation", async () => {
    // 프로토타입 2개 생성
    await app.request("/api/offerings/off-1/prototype", { method: "POST" });
    await app.request("/api/offerings/off-1/prototype", { method: "POST" });

    const res = await app.request("/api/offerings/off-1/prototypes");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.items).toHaveLength(2);
    expect(body.total).toBe(2);
    // 최신 버전이 먼저 (DESC)
    expect(body.items[0].version).toBe(2);
    expect(body.items[1].version).toBe(1);
  });

  it("POST /offerings/:id/prototype — uses offering sections for prototype content", async () => {
    const res = await app.request("/api/offerings/off-1/prototype", {
      method: "POST",
    });
    expect(res.status).toBe(201);
    const body = await json(res);

    // HTML에 offering 데이터 반영 확인
    expect(body.content).toContain("Healthcare AI");
  });
});
