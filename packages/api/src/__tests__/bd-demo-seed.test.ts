/**
 * Sprint 109: F281 — BD 데모 시드 데이터 API 응답 검증
 * D1 0082 시드 데이터(헬스케어AI + GIVC)가 각 라우트에서 정상 반환되는지 확인
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { axBdArtifactsRoute } from "../routes/ax-bd-artifacts.js";

const TABLES = `
  CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'free', settings TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', password_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS biz_items (id TEXT PRIMARY KEY, org_id TEXT, title TEXT, description TEXT, source TEXT, status TEXT, created_by TEXT, created_at TEXT, updated_at TEXT);
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL, stage_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL, output_text TEXT,
    model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20250714',
    tokens_used INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bd_artifacts_org ON bd_artifacts(org_id);
  CREATE INDEX IF NOT EXISTS idx_bd_artifacts_biz_item ON bd_artifacts(biz_item_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bd_artifacts_version ON bd_artifacts(biz_item_id, skill_id, version);
`;

/**
 * 시드 데이터 — D1 0082 구조 반영 (헬스케어AI + GIVC 2개 아이디어)
 */
function seedDemoData(db: any) {
  (db as any).exec(`
    INSERT INTO organizations (id, name, slug) VALUES ('org-demo', 'AX BD Demo', 'ax-bd-demo');
    INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('user-demo', 'demo@foundry-x.dev', 'Demo User', '2026-01-01', '2026-01-01');

    -- 2개 시드 아이디어
    INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
      VALUES ('biz-health', 'org-demo', '헬스케어 AI 진단 보조', 'AI 기반 의료 영상 분석 진단 보조 시스템', 'discovery', 'active', 'user-demo', '2026-03-01', '2026-03-30');
    INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
      VALUES ('biz-givc', 'org-demo', 'GIVC 플랫폼', '그린 인텔리전트 차량 커넥티드 플랫폼', 'discovery', 'active', 'user-demo', '2026-03-01', '2026-03-30');

    -- 산출물 (헬스케어AI 기준 3건)
    INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, status, created_by, created_at, tokens_used, duration_ms, model)
      VALUES ('art-h1', 'org-demo', 'biz-health', 'ai-biz:market-scan', '2-1', 1, '헬스케어 AI 시장 조사', '## 시장 조사 결과\n\n### 시장 규모\n- 글로벌 헬스케어 AI 시장: **187억 달러** (2026)\n- 연평균 성장률: **38.4%**\n\n### 주요 플레이어\n| 기업 | 분야 | 점유율 |\n|------|------|--------|\n| Google Health | 영상 분석 | 15% |\n| IBM Watson | 진단 보조 | 12% |', 'completed', 'user-demo', '2026-03-15T10:00:00Z', 500, 3000, 'claude-haiku-4-5-20250714');
    INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, status, created_by, created_at, tokens_used, duration_ms, model)
      VALUES ('art-h2', 'org-demo', 'biz-health', 'ai-biz:ecosystem-map', '2-2', 1, '헬스케어 AI 생태계 분석', '## 생태계 맵\n\n- **공급자**: 의료 영상 장비 제조사\n- **경쟁자**: Aidoc, Zebra Medical\n- **규제**: FDA 510(k), CE 마킹', 'completed', 'user-demo', '2026-03-16T10:00:00Z', 400, 2500, 'claude-haiku-4-5-20250714');
    INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, status, created_by, created_at, tokens_used, duration_ms, model)
      VALUES ('art-h3', 'org-demo', 'biz-health', 'pm:persona', '2-6', 1, '헬스케어 AI 사용자 페르소나', '## 페르소나: 김영수 교수\n\n- **직업**: 영상의학과 전문의\n- **Pain Point**: 하루 100+ 케이스 판독 피로\n- **Goal**: AI 보조로 판독 시간 50% 단축', 'completed', 'user-demo', '2026-03-17T10:00:00Z', 300, 2000, 'claude-haiku-4-5-20250714');

    -- 산출물 (GIVC 기준 2건)
    INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, status, created_by, created_at, tokens_used, duration_ms, model)
      VALUES ('art-g1', 'org-demo', 'biz-givc', 'ai-biz:market-scan', '2-1', 1, 'GIVC 시장 조사', '## GIVC 시장 분석\n\n차량 커넥티드 시장 규모 **450억 달러**', 'completed', 'user-demo', '2026-03-15T11:00:00Z', 450, 2800, 'claude-haiku-4-5-20250714');
    INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, status, created_by, created_at, tokens_used, duration_ms, model)
      VALUES ('art-g2', 'org-demo', 'biz-givc', 'ai-biz:feasibility-study', '2-3', 1, 'GIVC 사업성 분석', '## 사업성 분석\n\n**결론**: Go 판정\n- TAM: 450억$\n- SAM: 50억$', 'completed', 'user-demo', '2026-03-16T11:00:00Z', 350, 2200, 'claude-haiku-4-5-20250714');

  `);
}

function createTestApp(db: any) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    (c as any).env = { DB: db };
    c.set("orgId" as any, "org-demo");
    c.set("userId" as any, "user-demo");
    await next();
  });
  app.route("/api", axBdArtifactsRoute);
  return app;
}

describe("BD 데모 시드 데이터 API 검증", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: Hono;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(TABLES);
    seedDemoData(db);
    app = createTestApp(db);
  });

  describe("산출물 (artifacts)", () => {
    it("GET /api/ax-bd/artifacts — 시드 산출물 5건 반환", async () => {
      const res = await app.request("/api/ax-bd/artifacts");
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.total).toBe(5);
      expect(body.items).toHaveLength(5);
    });

    it("GET /api/ax-bd/artifacts/:id — Markdown outputText 포함", async () => {
      const res = await app.request("/api/ax-bd/artifacts/art-h1");
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.id).toBe("art-h1");
      expect(body.outputText).toContain("## 시장 조사 결과");
      expect(body.outputText).toContain("187억 달러");
      expect(body.skillId).toBe("ai-biz:market-scan");
    });

    it("GET /api/ax-bd/biz-items/:id/artifacts — 헬스케어AI 산출물 3건", async () => {
      const res = await app.request("/api/ax-bd/biz-items/biz-health/artifacts");
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.total).toBe(3);
    });

    it("GET /api/ax-bd/biz-items/:id/artifacts — GIVC 산출물 2건", async () => {
      const res = await app.request("/api/ax-bd/biz-items/biz-givc/artifacts");
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.total).toBe(2);
    });

    it("GET /api/ax-bd/artifacts — stageId 필터링", async () => {
      const res = await app.request("/api/ax-bd/artifacts?stageId=2-1");
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.total).toBe(2); // health + givc 각 1건
    });
  });

  describe("Markdown 콘텐츠 검증", () => {
    it("시드 산출물 outputText에 Markdown 마크업 포함", async () => {
      const res = await app.request("/api/ax-bd/artifacts/art-h1");
      const body = await res.json() as any;
      // Markdown 헤딩, 볼드, 리스트, 테이블 마크업 확인
      expect(body.outputText).toContain("##");
      expect(body.outputText).toContain("**");
      expect(body.outputText).toContain("|");
    });

    it("GIVC 산출물도 Markdown 포함", async () => {
      const res = await app.request("/api/ax-bd/artifacts/art-g1");
      const body = await res.json() as any;
      expect(body.outputText).toContain("## GIVC");
    });
  });
});
