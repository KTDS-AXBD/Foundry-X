/**
 * Sprint 235 F482: sync-artifacts 엔드포인트 테스트
 */
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";
import type { SyncResult } from "../core/discovery/schemas/artifact-sync.js";

let env: ReturnType<typeof createTestEnv>;

function seedDb(sql: string) {
  (env.DB as unknown as { exec: (s: string) => void }).exec(sql);
}

function req(method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) {
  const url = `http://localhost${path}`;
  const init: RequestInit = { method, headers: { "Content-Type": "application/json", ...opts?.headers } };
  if (opts?.body) init.body = JSON.stringify(opts.body);
  return app.request(url, init, env);
}

function seedBizItem(id = "bi-test-001") {
  seedDb(`
    INSERT OR IGNORE INTO biz_items (id, org_id, title, description, status, type, source, created_by, created_at, updated_at)
    VALUES ('${id}', 'org_test', 'Test Item', 'Test description', 'draft', 'I', 'manual', 'test-user', datetime('now'), datetime('now'))
  `);
}

describe("POST /api/biz-items/:id/sync-artifacts (F482)", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    authHeader = await createAuthHeaders();
    seedBizItem();
  });

  it("단일 stage 동기화 — artifact 생성 + stage completed", async () => {
    const res = await req("POST", "/api/biz-items/bi-test-001/sync-artifacts", {
      headers: authHeader,
      body: {
        stages: [
          { stage: "2-1", outputText: "레퍼런스 분석 결과입니다.", skillId: "competitor-analysis" },
        ],
        source: "claude-skill",
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as SyncResult;
    expect(body.synced).toBe(1);
    expect(body.stagesUpdated).toBe(1);
    expect(body.statusChanged).toBe(false);
    expect(body.artifacts).toHaveLength(1);
    expect(body.artifacts[0]!.stageId).toBe("2-1");
    expect(body.artifacts[0]!.skillId).toBe("competitor-analysis");
    expect(body.artifacts[0]!.version).toBe(1);
  });

  it("여러 stage 동기화 — 3개 artifact 생성", async () => {
    const res = await req("POST", "/api/biz-items/bi-test-001/sync-artifacts", {
      headers: authHeader,
      body: {
        stages: [
          { stage: "2-1", outputText: "레퍼런스 분석", skillId: "competitor-analysis" },
          { stage: "2-2", outputText: "시장 검증", skillId: "market-sizing" },
          { stage: "2-3", outputText: "경쟁 분석", skillId: "swot-analysis" },
        ],
        source: "claude-skill",
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as SyncResult;
    expect(body.synced).toBe(3);
    expect(body.stagesUpdated).toBe(3);
    expect(body.artifacts).toHaveLength(3);
  });

  it("2-8 포함 시 status → evaluated 전환", async () => {
    const res = await req("POST", "/api/biz-items/bi-test-001/sync-artifacts", {
      headers: authHeader,
      body: {
        stages: [
          { stage: "2-8", outputText: "발굴 결과 패키징", skillId: "gtm-strategy" },
        ],
        source: "claude-skill",
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as SyncResult;
    expect(body.statusChanged).toBe(true);
  });

  it("2-7까지만 포함 시 status 미전환", async () => {
    const res = await req("POST", "/api/biz-items/bi-test-001/sync-artifacts", {
      headers: authHeader,
      body: {
        stages: [
          { stage: "2-7", outputText: "비즈니스 모델", skillId: "business-model" },
        ],
        source: "claude-skill",
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as SyncResult;
    expect(body.statusChanged).toBe(false);
  });

  it("잘못된 stage 형식 → 400", async () => {
    const res = await req("POST", "/api/biz-items/bi-test-001/sync-artifacts", {
      headers: authHeader,
      body: {
        stages: [
          { stage: "3-1", outputText: "invalid", skillId: "test" },
        ],
        source: "claude-skill",
      },
    });

    expect(res.status).toBe(400);
  });

  it("빈 stages 배열 → 400", async () => {
    const res = await req("POST", "/api/biz-items/bi-test-001/sync-artifacts", {
      headers: authHeader,
      body: { stages: [], source: "claude-skill" },
    });

    expect(res.status).toBe(400);
  });

  it("존재하지 않는 biz_item → 404", async () => {
    const res = await req("POST", "/api/biz-items/nonexistent/sync-artifacts", {
      headers: authHeader,
      body: {
        stages: [
          { stage: "2-1", outputText: "test", skillId: "test" },
        ],
        source: "claude-skill",
      },
    });

    expect(res.status).toBe(404);
  });

  it("중복 호출 시 version 증가", async () => {
    // 첫 번째 호출
    await req("POST", "/api/biz-items/bi-test-001/sync-artifacts", {
      headers: authHeader,
      body: {
        stages: [{ stage: "2-1", outputText: "v1", skillId: "competitor-analysis" }],
        source: "claude-skill",
      },
    });

    // 두 번째 호출 (같은 skillId)
    const res = await req("POST", "/api/biz-items/bi-test-001/sync-artifacts", {
      headers: authHeader,
      body: {
        stages: [{ stage: "2-1", outputText: "v2", skillId: "competitor-analysis" }],
        source: "claude-skill",
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as SyncResult;
    expect(body.artifacts[0]!.version).toBe(2);
  });
});
