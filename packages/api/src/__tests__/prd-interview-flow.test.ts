/**
 * Sprint 220 F455: PRD 인터뷰 E2E 흐름 테스트
 * 1차 PRD → 인터뷰 시작 → 모든 질문 응답 → 2차 PRD 생성
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

// 질문 생성은 도메인 템플릿 폴백 (LLM 실패 시뮬레이션)
function mockFailingQuestionsRunner(): AgentRunner {
  const execute = vi.fn();
  // 첫 번째 호출(질문 생성)은 실패, 두 번째 호출(2차 PRD)은 성공
  execute
    .mockResolvedValueOnce({
      status: "failed",
      output: {},
      tokensUsed: 0,
      model: "mock",
      duration: 100,
    } satisfies AgentExecutionResult)
    .mockResolvedValueOnce({
      status: "success",
      output: { analysis: "# PRD v2\n\n[보강] 인터뷰 반영 완료\n\n---\n\n## 타깃 고객\n50대 이상 만성질환 위험군 (인터뷰 보강)" },
      tokensUsed: 200,
      model: "mock",
      duration: 500,
    } satisfies AgentExecutionResult);

  return {
    type: "mock",
    execute,
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  };
}

function mockSuccessRunner(): AgentRunner {
  return {
    type: "mock",
    execute: vi.fn()
      .mockResolvedValueOnce({
        status: "success",
        output: {
          analysis: JSON.stringify([
            { question: "Q1: 목적?", context: "프로젝트 개요" },
            { question: "Q2: 타깃?", context: "타깃 고객" },
            { question: "Q3: 시장?", context: "시장 분석" },
            { question: "Q4: 기술?", context: "기술 요건" },
            { question: "Q5: 기능?", context: "기능 범위" },
          ]),
        },
        tokensUsed: 100,
        model: "mock",
        duration: 300,
      } satisfies AgentExecutionResult)
      .mockResolvedValueOnce({
        status: "success",
        output: { analysis: "# PRD v2\n\n[보강] 전체 인터뷰 반영" },
        tokensUsed: 300,
        model: "mock",
        duration: 600,
      } satisfies AgentExecutionResult),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  };
}

let db: D1Database;

async function seedData(prdContent = "# PRD\n\n## 1. 개요\n미정\n\n## 2. 타깃\nTBD") {
  await (db as any).exec(TABLES_SQL);

  await (db as any)
    .prepare("INSERT INTO biz_items (id, org_id, title, description, source, status, created_at) VALUES (?, 'org-1', 'AI 헬스케어', null, 'field', 'draft', datetime('now'))")
    .bind("item-1")
    .run();

  await (db as any)
    .prepare("INSERT INTO biz_generated_prds (id, biz_item_id, version, content, generated_at, source_type) VALUES ('prd-1', 'item-1', 1, ?, datetime('now'), 'business_plan')")
    .bind(prdContent)
    .run();
}

describe("PRD Interview Flow (F455)", () => {
  beforeEach(async () => {
    const mockDb = createMockD1();
    db = mockDb as unknown as D1Database;
    await seedData();
  });

  it("E2E 흐름: 1차 PRD → 인터뷰 → 모든 응답 → 2차 PRD version=2", async () => {
    const service = new PrdInterviewService(db, mockSuccessRunner());

    // 인터뷰 시작
    const session = await service.startInterview("item-1", "prd-1");
    expect(session.questionCount).toBe(5);

    // 모든 질문 응답
    for (let seq = 1; seq <= session.questionCount; seq++) {
      const result = await service.submitAnswer(session.id, seq, `답변 ${seq}`);

      if (seq < session.questionCount) {
        expect(result.isComplete).toBe(false);
        expect(result.updatedPrd).toBeUndefined();
      } else {
        // 마지막 응답 시 2차 PRD 생성
        expect(result.isComplete).toBe(true);
        expect(result.updatedPrd).toBeDefined();
        expect(result.updatedPrd!.version).toBe(2);
        expect(result.updatedPrd!.content).toContain("[보강]");
      }
    }

    // 인터뷰 완료 확인
    const status = await service.getStatus("item-1");
    expect(status!.status).toBe("completed");
    expect(status!.answeredCount).toBe(5);
  });

  it("LLM 질문 생성 실패 시 도메인 템플릿 폴백", async () => {
    const service = new PrdInterviewService(db, mockFailingQuestionsRunner());

    const session = await service.startInterview("item-1", "prd-1");

    // 도메인 템플릿에서 최소 5개 생성
    expect(session.questionCount).toBeGreaterThanOrEqual(5);
    expect(session.questions.length).toBeGreaterThanOrEqual(5);
  });

  it("1차 PRD 없이 인터뷰 시도 — PRD_NOT_FOUND 에러", async () => {
    const service = new PrdInterviewService(db, mockSuccessRunner());

    await expect(service.startInterview("item-1", "nonexistent-prd")).rejects.toThrow("PRD_NOT_FOUND");
  });

  it("2차 PRD 생성 후 DB에 source_type='interview' 저장 확인", async () => {
    const service = new PrdInterviewService(db, mockSuccessRunner());
    const session = await service.startInterview("item-1", "prd-1");

    // 모든 질문 응답
    for (let seq = 1; seq <= session.questionCount; seq++) {
      await service.submitAnswer(session.id, seq, `응답 ${seq}`);
    }

    // DB에서 직접 확인
    const row = await (db as any)
      .prepare("SELECT * FROM biz_generated_prds WHERE biz_item_id = 'item-1' AND version = 2")
      .first();

    expect(row).not.toBeNull();
    expect(row.source_type).toBe("interview");
  });
});
