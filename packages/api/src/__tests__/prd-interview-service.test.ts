/**
 * Sprint 220 F455: PrdInterviewService 테스트
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PrdInterviewService } from "../core/offering/services/prd-interview-service.js";
import type { AgentRunner } from "../core/agent/services/agent-runner.js";
import type { AgentExecutionResult } from "../core/agent/services/execution-types.js";

const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'field',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS biz_generated_prds (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    criteria_snapshot TEXT,
    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
    source_type TEXT NOT NULL DEFAULT 'discovery',
    bp_draft_id TEXT
  );

  CREATE TABLE IF NOT EXISTS prd_interviews (
    id             TEXT PRIMARY KEY,
    biz_item_id    TEXT NOT NULL,
    prd_id         TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'in_progress',
    question_count INTEGER NOT NULL DEFAULT 0,
    answered_count INTEGER NOT NULL DEFAULT 0,
    started_at     INTEGER NOT NULL DEFAULT (unixepoch()),
    completed_at   INTEGER
  );

  CREATE TABLE IF NOT EXISTS prd_interview_qas (
    id                TEXT PRIMARY KEY,
    interview_id      TEXT NOT NULL,
    seq               INTEGER NOT NULL,
    question          TEXT NOT NULL,
    question_context  TEXT,
    answer            TEXT,
    answered_at       INTEGER,
    UNIQUE(interview_id, seq)
  );
`;

function mockRunner(analysis = "Enhanced PRD content with interview"): AgentRunner {
  return {
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: {
        analysis: JSON.stringify([
          { question: "고객의 핵심 불편함은 무엇인가요?", context: "프로젝트 개요" },
          { question: "타깃 고객 페르소나를 설명해주세요.", context: "타깃 고객" },
          { question: "시장 규모와 성장률은?", context: "시장 분석" },
          { question: "핵심 기술 스택은?", context: "기술 요건" },
          { question: "MVP 핵심 기능 Top 3는?", context: "기능 범위" },
        ]),
      },
      tokensUsed: 100,
      model: "mock",
      duration: 500,
    } satisfies AgentExecutionResult),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  };
}

function mockAnswerRunner(): AgentRunner {
  return {
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis: "# PRD v2\n\n[보강] 인터뷰 응답 반영된 내용\n\n## 1. 프로젝트 개요\n..." },
      tokensUsed: 200,
      model: "mock",
      duration: 800,
    } satisfies AgentExecutionResult),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  };
}

let db: D1Database;

async function seedData() {
  await (db as any).exec(TABLES_SQL);

  // 아이템 & PRD 시드
  await (db as any)
    .prepare("INSERT INTO biz_items (id, org_id, title, description, source, status, created_at) VALUES (?, ?, ?, ?, 'field', 'draft', datetime('now'))")
    .bind("item-1", "org-1", "AI 헬스케어", "설명")
    .run();

  await (db as any)
    .prepare("INSERT INTO biz_generated_prds (id, biz_item_id, version, content, generated_at, source_type) VALUES (?, ?, 1, ?, datetime('now'), 'business_plan')")
    .bind("prd-1", "item-1", "# PRD: AI 헬스케어\n\n## 1. 프로젝트 개요\n미정\n\n## 2. 타깃 고객\nTBD")
    .run();
}

describe("PrdInterviewService (F455)", () => {
  beforeEach(async () => {
    const mockDb = createMockD1();
    db = mockDb as unknown as D1Database;
    await seedData();
  });

  it("인터뷰 시작 — 5개 이상 질문 생성", async () => {
    const service = new PrdInterviewService(db, mockRunner());
    const session = await service.startInterview("item-1", "prd-1");

    expect(session.id).toBeDefined();
    expect(session.bizItemId).toBe("item-1");
    expect(session.prdId).toBe("prd-1");
    expect(session.status).toBe("in_progress");
    expect(session.questionCount).toBeGreaterThanOrEqual(5);
    expect(session.questions.length).toBeGreaterThanOrEqual(5);
  });

  it("PRD 미존재 시 인터뷰 시작 불가 — PRD_NOT_FOUND 에러", async () => {
    const service = new PrdInterviewService(db, mockRunner());

    await expect(service.startInterview("item-1", "nonexistent-prd")).rejects.toThrow("PRD_NOT_FOUND");
  });

  it("중복 인터뷰 방지 — INTERVIEW_ALREADY_IN_PROGRESS 에러", async () => {
    const service = new PrdInterviewService(db, mockRunner());

    await service.startInterview("item-1", "prd-1");
    await expect(service.startInterview("item-1", "prd-1")).rejects.toThrow("INTERVIEW_ALREADY_IN_PROGRESS");
  });

  it("응답 저장 — prd_interview_qas 테이블 UPDATE", async () => {
    const service = new PrdInterviewService(db, mockRunner());
    const session = await service.startInterview("item-1", "prd-1");

    const result = await service.submitAnswer(session.id, 1, "AI 헬스케어가 만성질환 환자의 자가 모니터링 어려움을 해결합니다.");

    expect(result.interviewId).toBe(session.id);
    expect(result.seq).toBe(1);
    expect(result.answeredCount).toBe(1);
    expect(result.isComplete).toBe(false);
  });

  it("getStatus — 현재 인터뷰 상태 조회", async () => {
    const service = new PrdInterviewService(db, mockRunner());
    await service.startInterview("item-1", "prd-1");

    const status = await service.getStatus("item-1");
    expect(status).not.toBeNull();
    expect(status!.status).toBe("in_progress");
    expect(status!.questions.length).toBeGreaterThan(0);
  });

  it("인터뷰 없으면 getStatus null 반환", async () => {
    const service = new PrdInterviewService(db, mockRunner());

    const status = await service.getStatus("nonexistent-item");
    expect(status).toBeNull();
  });
});
