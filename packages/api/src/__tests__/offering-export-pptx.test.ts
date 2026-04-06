/**
 * F380: Offering Export PPTX Tests (Sprint 172)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { offeringExportRoute } from "../routes/offering-export.js";
import { Hono } from "hono";
import type { Env } from "../env.js";
import { buildDesignConfig } from "../services/pptx-renderer.js";
import {
  SECTION_SLIDE_MAP,
  calculateTotalSlides,
  getSlideMapping,
} from "../services/pptx-slide-types.js";
import { STANDARD_SECTIONS } from "../schemas/offering-section.schema.js";

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

async function seedOffering(db: D1Database, id = "off-1", format = "pptx") {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT OR IGNORE INTO biz_items (id, org_id, title, created_by) VALUES ('biz-1', 'org_test', 'Test BizItem', 'test-user')`,
  );
  await (db as Any).exec(
    `INSERT INTO offerings (id, org_id, biz_item_id, title, purpose, format, status, current_version, created_by)
     VALUES ('${id}', 'org_test', 'biz-1', 'Healthcare AI 사업기획서', 'report', '${format}', 'draft', 1, 'test-user')`,
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

async function seedDesignToken(
  db: D1Database,
  offeringId: string,
  key: string,
  value: string,
  category: string,
) {
  const id = `tok-${key}`;
  await (db as Any).exec(
    `INSERT INTO offering_design_tokens (id, offering_id, token_key, token_value, token_category)
     VALUES ('${id}', '${offeringId}', '${key}', '${value}', '${category}')`,
  );
}

describe("Offering Export PPTX API", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  it("GET /offerings/:id/export?format=pptx — returns PPTX binary with correct Content-Type", async () => {
    await seedOffering(db);
    await seedSection(db, "off-1", "hero", "Hero", "핵심 KPI 요약", 0);
    await seedSection(db, "off-1", "exec_summary", "Executive Summary", "사업 개요 요약", 1);

    const res = await app.request("/api/offerings/off-1/export?format=pptx");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    expect(res.headers.get("content-disposition")).toContain("off-1.pptx");
  });

  it("GET /offerings/:id/export?format=pptx — returns valid ZIP (PK signature)", async () => {
    await seedOffering(db);
    await seedSection(db, "off-1", "hero", "Hero", "Content", 0);

    const res = await app.request("/api/offerings/off-1/export?format=pptx");
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PPTX is a ZIP file — starts with PK (0x50 0x4B 0x03 0x04)
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
  });

  it("GET /offerings/:id/export?format=pptx — returns 404 for non-existent offering", async () => {
    const res = await app.request("/api/offerings/non-existent/export?format=pptx");
    expect(res.status).toBe(404);
  });

  it("GET /offerings/:id/export — defaults to html format", async () => {
    await seedOffering(db, "off-2", "html");
    await seedSection(db, "off-2", "hero", "Hero", "Content", 0);

    const res = await app.request("/api/offerings/off-2/export");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("PPTX includes all included sections", async () => {
    await seedOffering(db);
    await seedSection(db, "off-1", "hero", "Hero", "KPI Summary", 0);
    await seedSection(db, "off-1", "exec_summary", "Executive Summary", "Summary text", 1);
    await seedSection(db, "off-1", "s01", "추진 배경", "Background", 2);
    await seedSection(db, "off-1", "s02_4", "기존 사업", "Existing", 7, 0); // excluded

    const res = await app.request("/api/offerings/off-1/export?format=pptx");
    expect(res.status).toBe(200);

    // binary output should be non-trivial (has slides)
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});

describe("PPTX Design Config", () => {
  it("builds default config when no tokens provided", () => {
    const config = buildDesignConfig([]);
    expect(config.bgColor).toBe("FFFFFF");
    expect(config.primaryColor).toBe("2563EB");
    expect(config.fontFamily).toBe("Pretendard");
    expect(config.titleFontSize).toBe(24);
    expect(config.bodyFontSize).toBe(14);
  });

  it("overrides values from token rows", () => {
    const tokens = [
      { token_key: "color-primary", token_value: "#FF5500", token_category: "color" },
      { token_key: "color-bg-default", token_value: "#F0F0F0", token_category: "color" },
      { token_key: "color-data-positive", token_value: "#00AA00", token_category: "color" },
    ];
    const config = buildDesignConfig(tokens);
    expect(config.primaryColor).toBe("FF5500");
    expect(config.bgColor).toBe("F0F0F0");
    expect(config.dataPositive).toBe("00AA00");
  });

  it("strips # prefix from token values", () => {
    const tokens = [
      { token_key: "color-primary", token_value: "#ABC123", token_category: "color" },
    ];
    const config = buildDesignConfig(tokens);
    expect(config.primaryColor).toBe("ABC123");
  });
});

describe("PPTX Slide Types", () => {
  it("SECTION_SLIDE_MAP covers all standard sections", () => {
    const mapKeys = SECTION_SLIDE_MAP.filter((m) => !m.sectionKey.startsWith("_")).map(
      (m) => m.sectionKey,
    );
    const standardKeys = STANDARD_SECTIONS.map((s) => s.key);

    // Every standard section should have a slide mapping
    for (const key of standardKeys) {
      // s02, s03, s04 are parent sections without direct slides
      if (["s02", "s03", "s04"].includes(key)) continue;
      expect(mapKeys).toContain(key);
    }
  });

  it("calculates total slides correctly", () => {
    // All required sections
    const requiredKeys = SECTION_SLIDE_MAP.filter((m) => m.isRequired).map((m) => m.sectionKey);
    const total = calculateTotalSlides(requiredKeys);
    // 필수 슬라이드: 표지(1)+목��(1)+hero(1)+exec(2)+s01(2)+s02_1~3(3)+s02_6(2)+s03_1(2)+s03_2(2)+s03_3(1)+s04_1(1)+s04_2(2)+s04_3(2)+s04_4(1)+s04_5(2)+s04_6(1)+s05(2)+마무리(1) = 29
    expect(total).toBe(29);
  });

  it("calculates max slides with optional sections", () => {
    const allKeys = SECTION_SLIDE_MAP.map((m) => m.sectionKey);
    const total = calculateTotalSlides(allKeys);
    // 전체: 필수 29 + 선택 s02_4(1) + s02_5(1) = 31
    expect(total).toBe(31);
  });

  it("getSlideMapping returns correct type for known keys", () => {
    expect(getSlideMapping("hero")?.slideType).toBe("hero-slide");
    expect(getSlideMapping("s04_5")?.slideType).toBe("gan-slide");
    expect(getSlideMapping("_cover")?.slideType).toBe("title-slide");
    expect(getSlideMapping("nonexistent")).toBeUndefined();
  });
});
