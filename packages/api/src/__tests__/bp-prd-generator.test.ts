/**
 * Sprint 220 F454: BpPrdGenerator 테스트
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { BpPrdGenerator } from "../core/offering/services/bp-prd-generator.js";
import { BpHtmlParser } from "../core/offering/services/bp-html-parser.js";
import type { AgentRunner } from "../core/agent/services/agent-runner.js";
import type { AgentExecutionResult } from "../core/agent/services/execution-types.js";

const TABLES_SQL = `
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
`;

const SAMPLE_HTML = `
<html>
<h1>AI 헬스케어 사업기획서</h1>
<h2>목적 및 배경</h2>
<p>AI 기반 만성질환 조기 진단 자동화</p>
<h2>타깃 고객</h2>
<p>50대 이상 만성질환 위험군</p>
<h2>시장 규모</h2>
<p>국내 디지털 헬스케어 8조원 시장</p>
<h2>기술 아키텍처</h2>
<p>React Native + FastAPI + TensorFlow Lite</p>
<h2>기능 범위</h2>
<p>혈압/혈당 모니터링, AI 알림, 병원 예약</p>
<h2>일정 및 마일스톤</h2>
<p>M1: MVP, M2: 파일럿, M3: 정식 출시</p>
<h2>리스크</h2>
<p>의료기기 인증(MFDS), 개인정보보호법</p>
</html>
`;

function mockRunner(analysis = "LLM refined PRD content"): AgentRunner {
  return {
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis },
      tokensUsed: 100,
      model: "mock",
      duration: 500,
    } satisfies AgentExecutionResult),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  };
}

let db: D1Database;

describe("BpPrdGenerator (F454)", () => {
  beforeEach(() => {
    const mockDb = createMockD1();
    void mockDb.exec(TABLES_SQL);
    db = mockDb as unknown as D1Database;
  });

  it("사업기획서 HTML → 1차 PRD 생성 (skipLlm=true)", async () => {
    const parser = new BpHtmlParser();
    const parsedBp = parser.parse(SAMPLE_HTML);

    const generator = new BpPrdGenerator(db, mockRunner());
    const prd = await generator.generate({
      bizItemId: "item-1",
      bizItem: { title: "AI 헬스케어", description: null },
      parsedBp,
      bpDraftId: "bp-draft-1",
      skipLlmRefine: true,
    });

    expect(prd.id).toBeDefined();
    expect(prd.bizItemId).toBe("item-1");
    expect(prd.version).toBe(1);
    expect(prd.sourceType).toBe("business_plan");
    expect(prd.bpDraftId).toBe("bp-draft-1");
    expect(prd.content).toContain("# PRD: AI 헬스케어");
  });

  it("PRD 내용에 7개 섹션 포함", async () => {
    const parser = new BpHtmlParser();
    const parsedBp = parser.parse(SAMPLE_HTML);

    const generator = new BpPrdGenerator(db, mockRunner());
    const prd = await generator.generate({
      bizItemId: "item-1",
      bizItem: { title: "AI 헬스케어", description: "AI 기반 헬스케어" },
      parsedBp,
      bpDraftId: "bp-draft-1",
      skipLlmRefine: true,
    });

    expect(prd.content).toContain("## 1. 프로젝트 개요");
    expect(prd.content).toContain("## 2. 타깃 고객");
    expect(prd.content).toContain("## 3. 시장 분석");
    expect(prd.content).toContain("## 4. 기술 요건");
    expect(prd.content).toContain("## 5. 기능 범위");
    expect(prd.content).toContain("## 6. 일정 및 마일스톤");
    expect(prd.content).toContain("## 7. 리스크 및 제약");
  });

  it("source_type='business_plan' + bp_draft_id 참조 저장", async () => {
    const parser = new BpHtmlParser();
    const parsedBp = parser.parse(SAMPLE_HTML);

    const generator = new BpPrdGenerator(db, mockRunner());
    const prd = await generator.generate({
      bizItemId: "item-2",
      bizItem: { title: "헬스케어 v2", description: null },
      parsedBp,
      bpDraftId: "bp-draft-999",
      skipLlmRefine: true,
    });

    const row = await (db as any)
      .prepare("SELECT source_type, bp_draft_id FROM biz_generated_prds WHERE id = ?")
      .bind(prd.id)
      .first();

    expect(row?.source_type).toBe("business_plan");
    expect(row?.bp_draft_id).toBe("bp-draft-999");
  });

  it("버전 자동 증가 — 기존 PRD 존재 시 version+1", async () => {
    const parser = new BpHtmlParser();
    const parsedBp = parser.parse(SAMPLE_HTML);
    const generator = new BpPrdGenerator(db, mockRunner());

    // 1차 생성
    const prd1 = await generator.generate({
      bizItemId: "item-3",
      bizItem: { title: "헬스케어 v3", description: null },
      parsedBp,
      bpDraftId: "bp-draft-1",
      skipLlmRefine: true,
    });

    // 2차 생성
    const prd2 = await generator.generate({
      bizItemId: "item-3",
      bizItem: { title: "헬스케어 v3", description: null },
      parsedBp,
      bpDraftId: "bp-draft-2",
      skipLlmRefine: true,
    });

    expect(prd1.version).toBe(1);
    expect(prd2.version).toBe(2);
  });

  it("LLM 보강 호출 (skipLlmRefine=false)", async () => {
    const parser = new BpHtmlParser();
    const parsedBp = parser.parse(SAMPLE_HTML);
    const runner = mockRunner("## LLM Enhanced PRD\n\nEnhanced content here");

    const generator = new BpPrdGenerator(db, runner);
    const prd = await generator.generate({
      bizItemId: "item-4",
      bizItem: { title: "헬스케어 LLM", description: null },
      parsedBp,
      bpDraftId: "bp-draft-1",
      skipLlmRefine: false,
    });

    expect(prd.content).toContain("LLM Enhanced PRD");
    expect(runner.execute).toHaveBeenCalledTimes(1);
  });

  it("getLatestBpPrd — 사업기획서 기반 최신 PRD 조회", async () => {
    const parser = new BpHtmlParser();
    const parsedBp = parser.parse(SAMPLE_HTML);
    const generator = new BpPrdGenerator(db, mockRunner());

    await generator.generate({
      bizItemId: "item-5",
      bizItem: { title: "조회 테스트", description: null },
      parsedBp,
      bpDraftId: "bp-draft-1",
      skipLlmRefine: true,
    });

    const latest = await generator.getLatestBpPrd("item-5");
    expect(latest).not.toBeNull();
    expect(latest!.sourceType).toBe("business_plan");
  });
});
