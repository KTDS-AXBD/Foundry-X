/**
 * F372: Offering Export API Tests (Sprint 168)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { offeringExportRoute } from "../core/offering/routes/offering-export.js";
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
  app.route("/api", offeringExportRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedOffering(db: D1Database, id = "off-1") {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT OR IGNORE INTO biz_items (id, org_id, title, created_by) VALUES ('biz-1', 'org_test', 'Test BizItem', 'test-user')`,
  );
  await (db as Any).exec(
    `INSERT INTO offerings (id, org_id, biz_item_id, title, purpose, format, status, current_version, created_by)
     VALUES ('${id}', 'org_test', 'biz-1', 'Healthcare AI 사업기획서', 'report', 'html', 'draft', 1, 'test-user')`,
  );
}

async function seedSection(
  db: D1Database,
  offeringId: string,
  key: string,
  title: string,
  content: string | null,
  sortOrder: number,
  isIncluded = 1,
) {
  const id = `sec-${key}`;
  await (db as Any).exec(
    `INSERT INTO offering_sections (id, offering_id, section_key, title, content, sort_order, is_required, is_included)
     VALUES ('${id}', '${offeringId}', '${key}', '${title}', ${content ? `'${content}'` : "NULL"}, ${sortOrder}, 1, ${isIncluded})`,
  );
}

async function seedDesignToken(db: D1Database, offeringId: string, key: string, value: string, category: string) {
  const id = `tok-${key}`;
  await (db as Any).exec(
    `INSERT INTO offering_design_tokens (id, offering_id, token_key, token_value, token_category)
     VALUES ('${id}', '${offeringId}', '${key}', '${value}', '${category}')`,
  );
}

describe("Offering Export API", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  it("GET /offerings/:id/export — returns HTML with included sections", async () => {
    await seedOffering(db);
    await seedSection(db, "off-1", "hero", "Hero", "Welcome to our proposal", 0);
    await seedSection(db, "off-1", "exec_summary", "Executive Summary", "This is the summary", 1);
    await seedSection(db, "off-1", "s01", "추진 배경", null, 2);

    const res = await app.request("/api/offerings/off-1/export");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");

    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Healthcare AI 사업기획서");
    expect(html).toContain('data-key="hero"');
    expect(html).toContain('data-key="exec_summary"');
    expect(html).toContain("Welcome to our proposal");
    expect(html).toContain("(내용 없음)");
  });

  it("GET /offerings/:id/export — excludes is_included=0 sections", async () => {
    await seedOffering(db);
    await seedSection(db, "off-1", "hero", "Hero", "Visible", 0, 1);
    await seedSection(db, "off-1", "optional", "Optional", "Hidden", 1, 0);

    const res = await app.request("/api/offerings/off-1/export");
    const html = await res.text();
    expect(html).toContain('data-key="hero"');
    expect(html).not.toContain('data-key="optional"');
  });

  it("GET /offerings/:id/export — includes design tokens as CSS variables", async () => {
    await seedOffering(db);
    await seedSection(db, "off-1", "hero", "Hero", "Content", 0);
    await seedDesignToken(db, "off-1", "color-primary", "#2563eb", "color");
    await seedDesignToken(db, "off-1", "font-size-heading", "28px", "typography");

    const res = await app.request("/api/offerings/off-1/export");
    const html = await res.text();
    expect(html).toContain("--color-primary: #2563eb");
    expect(html).toContain("--font-size-heading: 28px");
  });

  it("GET /offerings/:id/export — returns 404 for non-existent offering", async () => {
    const res = await app.request("/api/offerings/non-existent/export");
    expect(res.status).toBe(404);
  });

  it("GET /offerings/:id/export?format=html — accepts explicit html format", async () => {
    await seedOffering(db);
    await seedSection(db, "off-1", "hero", "Hero", "Content", 0);

    const res = await app.request("/api/offerings/off-1/export?format=html");
    expect(res.status).toBe(200);
  });

  it("GET /offerings/:id/export — falls back to business plan HTML when 0 sections", async () => {
    await seedOffering(db);
    // 섹션 없음. 연결된 biz-1 의 business_plan_drafts 에 draft 하나 시드.
    await (db as Any).exec(
      `INSERT INTO business_plan_drafts (id, biz_item_id, version, content, generated_at)
       VALUES ('bpd-1', 'biz-1', 1, '## Executive Summary\n\nFallback business plan content', datetime('now'))`,
    );

    const res = await app.request("/api/offerings/off-1/export");
    expect(res.status).toBe(200);
    const html = await res.text();
    // BusinessPlanExportService.renderHtml 산출물에 포함되는 표식
    expect(html).toContain("Fallback business plan content");
    // offering-export-service.renderHtml 의 offering-header 클래스가 없어야 함 (BP HTML로 대체됨)
    expect(html).not.toContain("offering-doc");
  });

  it("GET /offerings/:id/export — sections ordered by sort_order", async () => {
    await seedOffering(db);
    await seedSection(db, "off-1", "s03", "제안 방향", "Third", 2);
    await seedSection(db, "off-1", "hero", "Hero", "First", 0);
    await seedSection(db, "off-1", "s01", "추진 배경", "Second", 1);

    const res = await app.request("/api/offerings/off-1/export");
    const html = await res.text();
    const heroIdx = html.indexOf('data-key="hero"');
    const s01Idx = html.indexOf('data-key="s01"');
    const s03Idx = html.indexOf('data-key="s03"');
    expect(heroIdx).toBeLessThan(s01Idx);
    expect(s01Idx).toBeLessThan(s03Idx);
  });
});
