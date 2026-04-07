/**
 * F446: 사업기획서 Export API Tests (Sprint 216)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

let env: ReturnType<typeof createTestEnv>;
let authHeaders: Record<string, string>;

async function req(method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) {
  return app.request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  }, env);
}

function seedBizItem(id = "biz-export-1") {
  (env.DB as Any).exec(
    `INSERT OR IGNORE INTO biz_items (id, org_id, title, source, status, created_at, updated_at) VALUES ('${id}', 'org_test', '테스트 사업 아이템', 'manual', 'active', '2026-04-08T00:00:00Z', '2026-04-08T00:00:00Z')`,
  );
}

function seedDraft(bizItemId = "biz-export-1", version = 1) {
  const draftId = `draft-${bizItemId}-${version}`;
  const content = `# 사업기획서 초안\n\n## 1. 요약\n\n테스트 요약 내용\n\n## 2. 사업 개요\n\n사업 개요 내용`;
  (env.DB as Any).exec(
    `INSERT OR IGNORE INTO business_plan_drafts (id, biz_item_id, version, content, sections_snapshot, model_used, tokens_used, generated_at)
     VALUES ('${draftId}', '${bizItemId}', ${version}, '${content.replace(/'/g, "''")}', NULL, NULL, 0, '2026-04-08T00:00:00Z')`,
  );
  return draftId;
}

function seedSection(draftId: string, bizItemId: string, sectionNum: number, content: string) {
  const id = `bpsec-${draftId}-${sectionNum}`;
  (env.DB as Any).exec(
    `INSERT OR IGNORE INTO business_plan_sections (id, draft_id, biz_item_id, section_num, content, updated_at)
     VALUES ('${id}', '${draftId}', '${bizItemId}', ${sectionNum}, '${content.replace(/'/g, "''")}', '2026-04-08T00:00:00Z')`,
  );
}

beforeEach(async () => {
  env = createTestEnv();
  authHeaders = await createAuthHeaders();
});

describe("Business Plan Export API (F446)", () => {
  it("GET /biz-items/:id/business-plan/export?format=html — 200 + text/html", async () => {
    seedBizItem();
    const draftId = seedDraft("biz-export-1");
    seedSection(draftId, "biz-export-1", 1, "요약 내용입니다");
    seedSection(draftId, "biz-export-1", 2, "사업 개요 내용입니다");

    const res = await req("GET", "/api/biz-items/biz-export-1/business-plan/export?format=html");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");

    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("테스트 사업 아이템");
    expect(html).toContain("요약 내용입니다");
    expect(html).toContain("사업 개요 내용입니다");
    expect(html).toContain("data-section=");
  });

  it("GET /biz-items/:id/business-plan/export?format=pptx — 200 + pptx content-type", async () => {
    seedBizItem();
    const draftId = seedDraft("biz-export-1");
    seedSection(draftId, "biz-export-1", 1, "요약 내용");

    const res = await req("GET", "/api/biz-items/biz-export-1/business-plan/export?format=pptx");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    expect(res.headers.get("content-disposition")).toContain(".pptx");
  });

  it("GET /biz-items/:id/business-plan/export — draft 없을 때 404", async () => {
    seedBizItem("biz-no-draft");

    const res = await req("GET", "/api/biz-items/biz-no-draft/business-plan/export?format=html");
    expect(res.status).toBe(404);
    const body = await res.json<{ error: string }>();
    expect(body.error).toContain("not found");
  });

  it("GET /biz-items/:id/business-plan/export?format=invalid — 400", async () => {
    const res = await req("GET", "/api/biz-items/biz-export-1/business-plan/export?format=invalid");
    expect(res.status).toBe(400);
    const body = await res.json<{ error: string }>();
    expect(body.error).toBeTruthy();
  });

  it("GET /biz-items/:id/business-plan/export — sections 없을 때 draft.content fallback", async () => {
    seedBizItem("biz-fallback");
    seedDraft("biz-fallback");
    // sections 미삽입 → draft.content 전체가 1섹션 fallback

    const res = await req("GET", "/api/biz-items/biz-fallback/business-plan/export?format=html");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("테스트 사업 아이템");
  });

  it("GET /biz-items/:id/business-plan/export — format 기본값 html", async () => {
    seedBizItem("biz-default");
    seedDraft("biz-default");

    const res = await req("GET", "/api/biz-items/biz-default/business-plan/export");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});
