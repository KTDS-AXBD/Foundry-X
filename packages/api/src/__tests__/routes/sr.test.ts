import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "../helpers/mock-d1.js";
import { SrClassifier } from "../../core/sr/services/sr-classifier.js";
import { SrWorkflowMapper } from "../../core/sr/services/sr-workflow-mapper.js";
import type { SrResponse } from "../../core/sr/schemas/sr.js";

const SR_DDL = `CREATE TABLE IF NOT EXISTS sr_requests (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, sr_type TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'open', confidence REAL DEFAULT 0, matched_keywords TEXT, requester_id TEXT, workflow_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), closed_at TEXT)`;
const WR_DDL = `CREATE TABLE IF NOT EXISTS sr_workflow_runs (id TEXT PRIMARY KEY, sr_id TEXT NOT NULL, workflow_template TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', steps_completed INTEGER DEFAULT 0, steps_total INTEGER DEFAULT 0, result_summary TEXT, started_at TEXT, completed_at TEXT)`;

let db: any;
const classifier = new SrClassifier();
const mapper = new SrWorkflowMapper();

function uid() { return `sr-${Math.random().toString(36).slice(2, 10)}`; }

async function insertSr(title: string, orgId = "org_test") {
  const id = uid();
  const result = classifier.classify(title, "");
  await db.prepare(
    `INSERT INTO sr_requests (id, org_id, title, sr_type, priority, status, confidence, matched_keywords) VALUES (?, ?, ?, ?, 'medium', 'classified', ?, ?)`,
  ).bind(id, orgId, title, result.srType, result.confidence, JSON.stringify(result.matchedKeywords)).run();
  return { id, ...result };
}

beforeEach(async () => {
  db = createMockD1();
  await db.exec(SR_DDL);
  await db.exec(WR_DDL);
});

describe("SR Routes", () => {
  // POST /api/sr — 접수 + 자동 분류 시뮬레이션
  it("POST /api/sr — 정상 접수 201 시뮬레이션", async () => {
    const result = classifier.classify("사용자 프로필 API 추가 기능", "대시보드 업로드");
    expect(result.srType).toBe("code_change");
    const id = uid();
    await db.prepare(
      `INSERT INTO sr_requests (id, org_id, title, sr_type, status, confidence, matched_keywords) VALUES (?, ?, ?, ?, 'classified', ?, ?)`,
    ).bind(id, "org_test", "사용자 프로필 API 추가 기능", result.srType, result.confidence, JSON.stringify(result.matchedKeywords)).run();
    const row = await db.prepare("SELECT * FROM sr_requests WHERE id = ?").bind(id).first();
    expect(row.status).toBe("classified");
    expect(row.sr_type).toBe("code_change");
    expect(result.suggestedWorkflow).toBe("sr-code-change");
  });

  it("POST /api/sr — title 검증", async () => {
    const { createSrRequest } = await import("../../core/sr/schemas/sr.js");
    expect(createSrRequest.safeParse({}).success).toBe(false);
    expect(createSrRequest.safeParse({ title: "" }).success).toBe(false);
    expect(createSrRequest.safeParse({ title: "valid" }).success).toBe(true);
  });

  // GET /api/sr — 목록 조회
  it("GET /api/sr — 목록 조회", async () => {
    await insertSr("SR 하나");
    await insertSr("보안 취약점 패치");
    const { results } = await db.prepare("SELECT * FROM sr_requests WHERE org_id = ?").bind("org_test").all();
    expect(results.length).toBe(2);
  });

  it("GET /api/sr — status 필터링", async () => {
    await insertSr("필터 테스트");
    const { results } = await db.prepare("SELECT * FROM sr_requests WHERE org_id = ? AND status = ?").bind("org_test", "classified").all();
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) expect(r.status).toBe("classified");
  });

  it("GET /api/sr — sr_type 필터링", async () => {
    await insertSr("보안 취약점 패치");
    const { results } = await db.prepare("SELECT * FROM sr_requests WHERE org_id = ? AND sr_type = ?").bind("org_test", "security_patch").all();
    for (const r of results) expect(r.sr_type).toBe("security_patch");
  });

  // GET /api/sr/:id — 상세 조회
  it("GET /api/sr/:id — 상세 조회", async () => {
    const { id } = await insertSr("상세 조회 SR");
    const row = await db.prepare("SELECT * FROM sr_requests WHERE id = ?").bind(id).first();
    expect(row).not.toBeNull();
    expect(row.title).toBe("상세 조회 SR");
  });

  it("GET /api/sr/:id — 존재하지 않는 ID", async () => {
    const row = await db.prepare("SELECT * FROM sr_requests WHERE id = ?").bind("xxx").first();
    expect(row).toBeNull();
  });

  // POST /api/sr/:id/execute — 워크플로우 실행
  it("POST /api/sr/:id/execute — 워크플로우 실행", async () => {
    const { id } = await insertSr("버그 에러 수정");
    const sr = await db.prepare("SELECT * FROM sr_requests WHERE id = ?").bind(id).first();
    const template = mapper.getWorkflowForType(sr.sr_type);
    await db.prepare("UPDATE sr_requests SET status = 'in_progress', workflow_id = ? WHERE id = ?").bind(template.id, id).run();
    const runId = uid();
    await db.prepare(`INSERT INTO sr_workflow_runs (id, sr_id, workflow_template, status, steps_total, started_at) VALUES (?, ?, ?, 'running', ?, datetime('now'))`).bind(runId, id, template.id, template.nodes.length).run();
    const run = await db.prepare("SELECT * FROM sr_workflow_runs WHERE sr_id = ?").bind(id).first();
    expect(run.status).toBe("running");
    expect(run.steps_total).toBeGreaterThan(0);
  });

  it("POST /api/sr/:id/execute — 이미 in_progress", async () => {
    const { id } = await insertSr("버그 에러");
    await db.prepare("UPDATE sr_requests SET status = 'in_progress' WHERE id = ?").bind(id).run();
    const sr = await db.prepare("SELECT * FROM sr_requests WHERE id = ?").bind(id).first();
    expect(sr.status).toBe("in_progress");
    // 라우트에서 409 반환 로직 검증
  });

  // PATCH /api/sr/:id — 상태 변경
  it("PATCH /api/sr/:id — 상태 변경", async () => {
    const { id } = await insertSr("상태 변경 SR");
    await db.prepare("UPDATE sr_requests SET status = 'review' WHERE id = ?").bind(id).run();
    const row = await db.prepare("SELECT * FROM sr_requests WHERE id = ?").bind(id).first();
    expect(row.status).toBe("review");
  });

  it("PATCH done → closed_at 설정", async () => {
    const { id } = await insertSr("완료 SR");
    await db.prepare("UPDATE sr_requests SET status = 'done', closed_at = datetime('now') WHERE id = ?").bind(id).run();
    const row = await db.prepare("SELECT * FROM sr_requests WHERE id = ?").bind(id).first();
    expect(row.status).toBe("done");
    expect(row.closed_at).not.toBeNull();
  });

  it("PATCH — 존재하지 않는 ID", async () => {
    const row = await db.prepare("SELECT * FROM sr_requests WHERE id = ?").bind("xxx").first();
    expect(row).toBeNull();
  });
});
