/**
 * Sprint 221 F456: PRD 확정 + 버전 관리 API 테스트
 */
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";
import { PrdConfirmationService } from "../core/offering/services/prd-confirmation-service.js";

let env: ReturnType<typeof createTestEnv>;
let authHeader: Record<string, string>;

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
  (env.DB as any).exec(sql);
}

const VALID_PRD_CONTENT = [
  "# 프로젝트 개요",
  "이 프로젝트는 AI 기반 사업 포트폴리오 관리 시스템을 구축하는 것을 목표로 합니다. 상세한 내용이 여기에 포함됩니다.",
  "",
  "## 목표",
  "PRD 확정 및 버전 관리 기능을 통해 사업 기획 품질을 높입니다. 구체적인 목표 기술이 들어갑니다.",
  "",
  "## 범위",
  "전체 PRD 생성~확정 파이프라인을 대상으로 합니다. 범위 설명 텍스트입니다.",
  "",
  "## 제약 사항",
  "D1 데이터베이스 환경에서 동작해야 합니다. 제약 조건 설명입니다.",
  "",
  "## 성공 지표",
  "Match Rate 90% 이상, API 응답 200ms 이하입니다. 성공 지표 세부 내용입니다.",
].join("\n");

const SHORT_PRD_CONTENT = "# 짧은 PRD\n내용이 너무 짧습니다.";

beforeEach(async () => {
  env = createTestEnv();
  authHeader = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });

  // Test data setup
  seedDb(`
    INSERT OR IGNORE INTO organizations (id, name, slug)
      VALUES ('org_test', 'Test Org', 'test-org');
    INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at)
      VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'));
    INSERT OR IGNORE INTO biz_items (id, org_id, title, created_by)
      VALUES ('item1', 'org_test', '테스트 아이템', 'test-user');
    INSERT INTO biz_generated_prds (id, biz_item_id, version, status, content, generated_at)
      VALUES ('prd-v1', 'item1', 1, 'draft', '# 1차 PRD 자동 생성 내용입니다.', unixepoch());
    INSERT INTO biz_generated_prds (id, biz_item_id, version, status, content, generated_at)
      VALUES ('prd-v2', 'item1', 2, 'draft', '${VALID_PRD_CONTENT.replace(/'/g, "''")}', unixepoch());
  `);
});

// ── PrdConfirmationService 단위 테스트 ──

describe("PrdConfirmationService.validate", () => {
  it("필수 섹션이 모두 있으면 valid", () => {
    const svc = new PrdConfirmationService(env.DB as unknown as D1Database);
    const result = svc.validate(VALID_PRD_CONTENT);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("필수 섹션이 2개 이상 없으면 invalid", () => {
    const svc = new PrdConfirmationService(env.DB as unknown as D1Database);
    const result = svc.validate(SHORT_PRD_CONTENT);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe("PrdConfirmationService.diff", () => {
  it("동일 content → unchanged만 반환", () => {
    const svc = new PrdConfirmationService(env.DB as unknown as D1Database);
    const hunks = svc.diff("line1\nline2", "line1\nline2");
    expect(hunks.every((h) => h.type === "unchanged")).toBe(true);
  });

  it("추가 줄 → added hunk 포함", () => {
    const svc = new PrdConfirmationService(env.DB as unknown as D1Database);
    const hunks = svc.diff("line1", "line1\nline2");
    expect(hunks.some((h) => h.type === "added" && h.content === "line2")).toBe(true);
  });

  it("삭제 줄 → removed hunk 포함", () => {
    const svc = new PrdConfirmationService(env.DB as unknown as D1Database);
    const hunks = svc.diff("line1\nline2", "line1");
    expect(hunks.some((h) => h.type === "removed" && h.content === "line2")).toBe(true);
  });
});

// ── API 테스트 ──

describe("GET /api/biz-items/:bizItemId/prds", () => {
  it("PRD 목록 반환 — version 1, 2", async () => {
    const res = await req("GET", "/api/biz-items/item1/prds", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { prds: { version: number; contentPreview?: string }[] };
    expect(body.prds).toHaveLength(2);
    expect(body.prds.map((p) => p.version)).toEqual(expect.arrayContaining([1, 2]));
  });

  it("contentPreview는 최대 200자", async () => {
    const res = await req("GET", "/api/biz-items/item1/prds", { headers: authHeader });
    const body = (await res.json()) as { prds: { contentPreview?: string }[] };
    for (const p of body.prds.filter((p) => p.contentPreview)) {
      expect((p.contentPreview ?? "").length).toBeLessThanOrEqual(200);
    }
  });
});

describe("GET /api/biz-items/:bizItemId/prds/:prdId", () => {
  it("PRD 상세 반환", async () => {
    const res = await req("GET", "/api/biz-items/item1/prds/prd-v1", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: number };
    expect(body.version).toBe(1);
  });

  it("존재하지 않는 PRD → 404", async () => {
    const res = await req("GET", "/api/biz-items/item1/prds/no-such", { headers: authHeader });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/biz-items/:bizItemId/prds/:prdId/confirm", () => {
  it("version 2 → 성공: 201 + version 3 생성", async () => {
    const res = await req("POST", "/api/biz-items/item1/prds/prd-v2/confirm", { headers: authHeader });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { version: number; status: string };
    expect(body.version).toBe(3);
    expect(body.status).toBe("confirmed");
  });

  it("version 1 confirm → 400", async () => {
    const res = await req("POST", "/api/biz-items/item1/prds/prd-v1/confirm", { headers: authHeader });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("VERSION_NOT_2");
  });

  it("필수 섹션 누락 PRD confirm → 400 + errors 배열", async () => {
    // version 4 (UNIQUE 제약 우회): 다른 아이템에 version 2로 시드
    seedDb(`
      INSERT INTO biz_items (id, org_id, title, created_by)
        VALUES ('item2', 'org_test', '다른 아이템', 'test-user');
      INSERT INTO biz_generated_prds (id, biz_item_id, version, status, content, generated_at)
        VALUES ('prd-short', 'item2', 2, 'draft', '${SHORT_PRD_CONTENT.replace(/'/g, "''")}', unixepoch());
    `);
    const res = await req("POST", "/api/biz-items/item2/prds/prd-short/confirm", { headers: authHeader });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; errors: string[] };
    expect(body.error).toBe("VALIDATION_FAILED");
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.length).toBeGreaterThan(0);
  });
});

describe("GET /api/biz-items/:bizItemId/prds/diff", () => {
  it("두 버전 비교 → hunks 반환", async () => {
    const res = await req("GET", "/api/biz-items/item1/prds/diff?v1=prd-v1&v2=prd-v2", { headers: authHeader });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { hunks: unknown[]; v1: { id: string }; v2: { id: string } };
    expect(Array.isArray(body.hunks)).toBe(true);
    expect(body.v1.id).toBe("prd-v1");
    expect(body.v2.id).toBe("prd-v2");
  });

  it("쿼리 파라미터 없으면 400", async () => {
    const res = await req("GET", "/api/biz-items/item1/prds/diff", { headers: authHeader });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/biz-items/:bizItemId/prds/:prdId", () => {
  it("version 1 편집 → 403", async () => {
    const res = await req("PATCH", "/api/biz-items/item1/prds/prd-v1", {
      headers: authHeader,
      body: { content: "A".repeat(150) },
    });
    expect(res.status).toBe(403);
  });

  it("version 2 편집 → 200 + 수정된 content", async () => {
    const newContent = `# 수정된 PRD\n${"수정 내용이에요. ".repeat(15)}`;
    const res = await req("PATCH", "/api/biz-items/item1/prds/prd-v2", {
      headers: authHeader,
      body: { content: newContent },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { content: string };
    expect(body.content).toBe(newContent);
  });

  it("content 100자 미만 → 400", async () => {
    const res = await req("PATCH", "/api/biz-items/item1/prds/prd-v2", {
      headers: authHeader,
      body: { content: "짧은 내용" },
    });
    expect(res.status).toBe(400);
  });
});
