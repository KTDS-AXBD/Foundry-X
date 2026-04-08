/**
 * Sprint 223: F459 PortfolioService 단위 테스트
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PortfolioService, NotFoundError } from "../core/discovery/services/portfolio-service.js";

const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
    source TEXT NOT NULL DEFAULT 'field', status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_item_classifications (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL UNIQUE, item_type TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.0, turn_1_answer TEXT, turn_2_answer TEXT,
    turn_3_answer TEXT, analysis_weights TEXT NOT NULL DEFAULT '{}',
    classified_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_evaluations (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, verdict TEXT NOT NULL,
    avg_score REAL NOT NULL DEFAULT 0.0, total_concerns INTEGER NOT NULL DEFAULT 0,
    evaluated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_evaluation_scores (
    id TEXT PRIMARY KEY, evaluation_id TEXT NOT NULL, persona_id TEXT NOT NULL,
    business_viability REAL NOT NULL DEFAULT 0, strategic_fit REAL NOT NULL DEFAULT 0,
    customer_value REAL NOT NULL DEFAULT 0, tech_market REAL NOT NULL DEFAULT 0,
    execution REAL NOT NULL DEFAULT 0, financial_feasibility REAL NOT NULL DEFAULT 0,
    competitive_diff REAL NOT NULL DEFAULT 0, scalability REAL NOT NULL DEFAULT 0,
    summary TEXT, concerns TEXT
  );
  CREATE TABLE IF NOT EXISTS biz_item_starting_points (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL UNIQUE,
    starting_point TEXT NOT NULL CHECK (starting_point IN ('idea','market','problem','tech','service')),
    confidence REAL NOT NULL DEFAULT 0.0, reasoning TEXT,
    needs_confirmation INTEGER NOT NULL DEFAULT 0,
    confirmed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS biz_discovery_criteria (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    criterion_id INTEGER NOT NULL CHECK (criterion_id BETWEEN 1 AND 9),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','needs_revision')),
    evidence TEXT, completed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(biz_item_id, criterion_id)
  );
  CREATE TABLE IF NOT EXISTS business_plan_drafts (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL, sections_snapshot TEXT, model_used TEXT,
    tokens_used INTEGER DEFAULT 0, generated_at TEXT NOT NULL,
    UNIQUE(biz_item_id, version)
  );
  CREATE TABLE IF NOT EXISTS offerings (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL,
    title TEXT NOT NULL, purpose TEXT NOT NULL CHECK(purpose IN ('report','proposal','review')),
    format TEXT NOT NULL CHECK(format IN ('html','pptx')),
    status TEXT NOT NULL DEFAULT 'draft',
    current_version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS offering_sections (
    id TEXT PRIMARY KEY, offering_id TEXT NOT NULL, section_key TEXT NOT NULL,
    title TEXT NOT NULL, content TEXT, sort_order INTEGER NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 1, is_included INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(offering_id, section_key)
  );
  CREATE TABLE IF NOT EXISTS offering_versions (
    id TEXT PRIMARY KEY, offering_id TEXT NOT NULL, version INTEGER NOT NULL,
    snapshot TEXT, change_summary TEXT, created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(offering_id, version)
  );
  CREATE TABLE IF NOT EXISTS offering_prototypes (
    id TEXT PRIMARY KEY, offering_id TEXT NOT NULL, prototype_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(offering_id, prototype_id)
  );
  CREATE TABLE IF NOT EXISTS prototypes (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    format TEXT NOT NULL DEFAULT 'html', content TEXT NOT NULL,
    template_used TEXT, model_used TEXT, tokens_used INTEGER DEFAULT 0,
    generated_at TEXT NOT NULL, UNIQUE(biz_item_id, version)
  );
  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'REGISTERED',
    entered_at TEXT NOT NULL DEFAULT (datetime('now')),
    exited_at TEXT, entered_by TEXT NOT NULL, notes TEXT
  );
`;

describe("PortfolioService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: PortfolioService;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(TABLES_SQL);
    service = new PortfolioService(db as unknown as D1Database);
  });

  function seed(sql: string) {
    (db as any).exec(sql);
  }

  function seedItem(id = "item-1", orgId = "org-1") {
    seed(`INSERT INTO biz_items (id, org_id, title, description, source, status, created_by)
          VALUES ('${id}', '${orgId}', 'AI 품질예측', '품질 예측 시스템', 'field', 'draft', 'user-1')`);
  }

  it("존재하지 않는 아이템 — NotFoundError", async () => {
    await expect(service.getPortfolioTree("no-item", "org-1")).rejects.toThrow(NotFoundError);
  });

  it("다른 org 아이템 접근 — NotFoundError (권한 차단)", async () => {
    seedItem("item-1", "org-A");
    await expect(service.getPortfolioTree("item-1", "org-B")).rejects.toThrow(NotFoundError);
  });

  it("하위 데이터 없는 아이템 — 빈 배열/null 반환, 에러 없음", async () => {
    seedItem();
    const result = await service.getPortfolioTree("item-1", "org-1");

    expect(result.item.id).toBe("item-1");
    expect(result.classification).toBeNull();
    expect(result.evaluations).toEqual([]);
    expect(result.startingPoint).toBeNull();
    expect(result.criteria).toEqual([]);
    expect(result.businessPlans).toEqual([]);
    expect(result.offerings).toEqual([]);
    expect(result.prototypes).toEqual([]);
    expect(result.pipelineStages).toEqual([]);
    expect(result.progress.overallPercent).toBeGreaterThanOrEqual(0);
  });

  it("전체 연결 데이터가 있는 아이템 — 모든 필드 반환", async () => {
    seedItem();

    seed(`INSERT INTO biz_item_classifications (id, biz_item_id, item_type, confidence)
          VALUES ('cls-1', 'item-1', '기술형', 0.92)`);
    seed(`INSERT INTO biz_evaluations (id, biz_item_id, verdict, avg_score, total_concerns)
          VALUES ('eval-1', 'item-1', 'APPROVED', 4.2, 1)`);
    seed(`INSERT INTO biz_evaluation_scores (id, evaluation_id, persona_id, business_viability, strategic_fit, customer_value)
          VALUES ('score-1', 'eval-1', 'pm', 4.5, 4.0, 4.1)`);
    seed(`INSERT INTO biz_item_starting_points (id, biz_item_id, starting_point, confidence)
          VALUES ('sp-1', 'item-1', 'tech', 0.85)`);
    seed(`INSERT INTO biz_discovery_criteria (biz_item_id, criterion_id, status, completed_at)
          VALUES ('item-1', 1, 'completed', '2026-01-01')`);
    seed(`INSERT INTO business_plan_drafts (id, biz_item_id, version, content, generated_at)
          VALUES ('bp-1', 'item-1', 1, '{}', '2026-01-02')`);
    seed(`INSERT INTO offerings (id, org_id, biz_item_id, title, purpose, format, created_by)
          VALUES ('off-1', 'org-1', 'item-1', '제안서', 'proposal', 'html', 'user-1')`);
    seed(`INSERT INTO prototypes (id, biz_item_id, version, content, generated_at)
          VALUES ('proto-1', 'item-1', 1, '<html/>', '2026-01-03')`);
    seed(`INSERT INTO offering_prototypes (id, offering_id, prototype_id)
          VALUES ('op-1', 'off-1', 'proto-1')`);
    seed(`INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_by)
          VALUES ('ps-1', 'item-1', 'org-1', 'DISCOVERY', 'user-1')`);

    const result = await service.getPortfolioTree("item-1", "org-1");

    expect(result.classification?.itemType).toBe("기술형");
    expect(result.evaluations).toHaveLength(1);
    expect(result.evaluations[0]!.scores).toHaveLength(1);
    expect(result.startingPoint?.startingPoint).toBe("tech");
    expect(result.criteria).toHaveLength(1);
    expect(result.criteria[0]!.status).toBe("completed");
    expect(result.businessPlans).toHaveLength(1);
    expect(result.offerings).toHaveLength(1);
    expect(result.offerings[0]!.linkedPrototypeIds).toContain("proto-1");
    expect(result.prototypes).toHaveLength(1);
    expect(result.pipelineStages).toHaveLength(1);
    expect(result.pipelineStages[0]!.stage).toBe("DISCOVERY");
  });

  it("progress 계산 — criteria 5/9 완료 + plan 있음 + offering 없음", () => {
    const stages = [{ stage: "FORMALIZATION" }];
    const criteria = [
      ...Array(5).fill({ status: "completed" }),
      ...Array(4).fill({ status: "pending" }),
    ];
    const plans = [{}];
    const offerings: unknown[] = [];
    const prototypes: unknown[] = [];

    const progress = service.calculateProgress(stages, criteria, plans, offerings, prototypes);

    // 단계진입: 3/6 * 30 = 15 + 기준: 5/9 * 25 ≈ 13.88 + 기획서: 15 = ~43.88 → 44
    expect(progress.currentStage).toBe("FORMALIZATION");
    expect(progress.completedStages).toEqual(["REGISTERED", "DISCOVERY", "FORMALIZATION"]);
    expect(progress.criteriaCompleted).toBe(5);
    expect(progress.hasBusinessPlan).toBe(true);
    expect(progress.hasOffering).toBe(false);
    expect(progress.overallPercent).toBe(44);
  });

  it("progress — 빈 stages는 REGISTERED로 처리", () => {
    const progress = service.calculateProgress([], [], [], [], []);
    expect(progress.currentStage).toBe("REGISTERED");
    expect(progress.completedStages).toEqual(["REGISTERED"]);
    expect(progress.overallPercent).toBeGreaterThan(0);
  });
});
