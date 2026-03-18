import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlannerAgent } from "../services/planner-agent.js";

function createMockDb() {
  return {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
  } as any;
}

function createMockSSE() {
  return { pushEvent: vi.fn() } as any;
}

describe("PlannerAgent", () => {
  let db: ReturnType<typeof createMockDb>;
  let sse: ReturnType<typeof createMockSSE>;
  let planner: PlannerAgent;

  beforeEach(() => {
    db = createMockDb();
    sse = createMockSSE();
    planner = new PlannerAgent({ db, sse });
  });

  // ─── createPlan ───

  it("creates a plan with pending_approval status", async () => {
    const plan = await planner.createPlan("agent-1", "code-generation", {
      repoUrl: "https://github.com/test/repo",
      branch: "master",
      targetFiles: ["src/index.ts", "src/utils.ts"],
    });

    expect(plan.status).toBe("pending_approval");
    expect(plan.agentId).toBe("agent-1");
    expect(plan.proposedSteps).toHaveLength(2);
    expect(plan.estimatedFiles).toBe(2);
    expect(plan.id).toMatch(/^plan-/);
    expect(db.prepare).toHaveBeenCalled();
  });

  it("creates a plan with empty steps when no targetFiles", async () => {
    const plan = await planner.createPlan("agent-2", "spec-analysis", {
      repoUrl: "https://github.com/test/repo",
      branch: "main",
    });

    expect(plan.proposedSteps).toHaveLength(0);
    expect(plan.estimatedFiles).toBe(1); // no targetFiles → default 1
  });

  it("creates a plan with instructions step", async () => {
    const plan = await planner.createPlan("agent-3", "code-generation", {
      repoUrl: "https://github.com/test/repo",
      branch: "master",
      targetFiles: ["src/a.ts"],
      instructions: "Add error handling",
    });

    expect(plan.proposedSteps).toHaveLength(2);
    expect(plan.proposedSteps[1]!.description).toBe("Add error handling");
    expect(plan.proposedSteps[1]!.type).toBe("create");
  });

  it("emits SSE agent.plan.created event", async () => {
    await planner.createPlan("agent-1", "code-generation", {
      repoUrl: "https://github.com/test/repo",
      branch: "master",
      targetFiles: ["src/a.ts"],
    });

    expect(sse.pushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "agent.plan.created",
        data: expect.objectContaining({
          agentId: "agent-1",
          stepsCount: 1,
        }),
      }),
    );
  });

  it("adds risk when targetFiles > 5", async () => {
    const files = Array.from({ length: 7 }, (_, i) => `src/file${i}.ts`);
    const plan = await planner.createPlan("agent-1", "code-generation", {
      repoUrl: "https://github.com/test/repo",
      branch: "master",
      targetFiles: files,
    });

    expect(plan.risks).toHaveLength(1);
    expect(plan.risks[0]).toContain("7개 파일");
  });

  // ─── revisePlan ───

  it("revises a plan with feedback", async () => {
    db.first.mockResolvedValueOnce({
      id: "plan-1", task_id: "task-1", agent_id: "agent-1",
      codebase_analysis: "test", proposed_steps: "[]",
      estimated_files: 0, risks: "[]", estimated_tokens: 0,
      status: "modified", human_feedback: "more tests",
      created_at: "2026-03-18T00:00:00Z",
      approved_at: null, rejected_at: null,
    });

    const plan = await planner.revisePlan("plan-1", "more tests");
    expect(plan.status).toBe("modified");
    expect(plan.humanFeedback).toBe("more tests");
  });

  // ─── approvePlan ───

  it("approves a plan and sets approvedAt", async () => {
    db.first.mockResolvedValueOnce({
      id: "plan-1", task_id: "task-1", agent_id: "agent-1",
      codebase_analysis: "test", proposed_steps: "[]",
      estimated_files: 0, risks: "[]", estimated_tokens: 0,
      status: "approved", human_feedback: null,
      created_at: "2026-03-18T00:00:00Z",
      approved_at: "2026-03-18T01:00:00Z", rejected_at: null,
    });

    const plan = await planner.approvePlan("plan-1");
    expect(plan.status).toBe("approved");
    expect(plan.approvedAt).toBeTruthy();
    expect(sse.pushEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "agent.plan.approved" }),
    );
  });

  // ─── rejectPlan ───

  it("rejects a plan with reason", async () => {
    db.first.mockResolvedValueOnce({
      id: "plan-1", task_id: "task-1", agent_id: "agent-1",
      codebase_analysis: "test", proposed_steps: "[]",
      estimated_files: 0, risks: "[]", estimated_tokens: 0,
      status: "rejected", human_feedback: "too risky",
      created_at: "2026-03-18T00:00:00Z",
      approved_at: null, rejected_at: "2026-03-18T01:00:00Z",
    });

    const plan = await planner.rejectPlan("plan-1", "too risky");
    expect(plan.status).toBe("rejected");
    expect(sse.pushEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "agent.plan.rejected" }),
    );
  });

  it("rejects without reason", async () => {
    db.first.mockResolvedValueOnce({
      id: "plan-1", task_id: "task-1", agent_id: "agent-1",
      codebase_analysis: "test", proposed_steps: "[]",
      estimated_files: 0, risks: "[]", estimated_tokens: 0,
      status: "rejected", human_feedback: null,
      created_at: "2026-03-18T00:00:00Z",
      approved_at: null, rejected_at: "2026-03-18T01:00:00Z",
    });

    const plan = await planner.rejectPlan("plan-1");
    expect(plan.status).toBe("rejected");
  });

  // ─── getPlan ───

  it("returns plan when found", async () => {
    db.first.mockResolvedValueOnce({
      id: "plan-1", task_id: "task-1", agent_id: "agent-1",
      codebase_analysis: "analysis", proposed_steps: '[{"type":"modify","description":"test"}]',
      estimated_files: 1, risks: "[]", estimated_tokens: 2000,
      status: "pending_approval", human_feedback: null,
      created_at: "2026-03-18T00:00:00Z",
      approved_at: null, rejected_at: null,
    });

    const plan = await planner.getPlan("plan-1");
    expect(plan).not.toBeNull();
    expect(plan!.proposedSteps).toHaveLength(1);
  });

  it("returns null when plan not found", async () => {
    db.first.mockResolvedValueOnce(null);
    const plan = await planner.getPlan("nonexistent");
    expect(plan).toBeNull();
  });

  // ─── listPlans ───

  it("lists plans filtered by agentId", async () => {
    db.all.mockResolvedValueOnce({
      results: [{
        id: "plan-1", task_id: "task-1", agent_id: "agent-1",
        codebase_analysis: "test", proposed_steps: "[]",
        estimated_files: 0, risks: "[]", estimated_tokens: 0,
        status: "pending_approval", human_feedback: null,
        created_at: "2026-03-18T00:00:00Z",
        approved_at: null, rejected_at: null,
      }],
    });

    const plans = await planner.listPlans("agent-1");
    expect(plans).toHaveLength(1);
    expect(plans[0]!.agentId).toBe("agent-1");
  });

  it("lists all plans without filter", async () => {
    db.all.mockResolvedValueOnce({ results: [] });
    const plans = await planner.listPlans();
    expect(plans).toHaveLength(0);
  });

  // ─── LLM Integration (F75) ───

  it("T1: uses LLM analysis when apiKey is provided and response is valid JSON", async () => {
    const llmResponse = {
      content: [{
        type: "text",
        text: JSON.stringify({
          codebaseAnalysis: "LLM이 분석한 코드베이스",
          proposedSteps: [
            { description: "서비스 수정", type: "modify", targetFile: "src/service.ts", estimatedLines: 30 },
          ],
          risks: ["타입 호환성 문제"],
          estimatedTokens: 3000,
        }),
      }],
    };

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(llmResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const llmPlanner = new PlannerAgent({ db, sse, apiKey: "test-key" });
    const plan = await llmPlanner.createPlan("agent-llm", "code-generation", {
      repoUrl: "https://github.com/test/repo",
      branch: "master",
      targetFiles: ["src/service.ts"],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({ method: "POST" }),
    );
    expect(plan.codebaseAnalysis).toBe("LLM이 분석한 코드베이스");
    expect(plan.proposedSteps[0]!.description).toBe("서비스 수정");
    expect(plan.risks).toContain("타입 호환성 문제");
    expect(plan.estimatedTokens).toBe(3000);

    vi.unstubAllGlobals();
  });

  it("T2: falls back to mock when LLM returns invalid JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: "text", text: "This is not valid JSON at all" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const llmPlanner = new PlannerAgent({ db, sse, apiKey: "test-key" });
    const plan = await llmPlanner.createPlan("agent-llm", "code-generation", {
      repoUrl: "https://github.com/test/repo",
      branch: "master",
      targetFiles: ["src/a.ts"],
    });

    // Should fall back to mock analysis
    expect(plan.codebaseAnalysis).toContain("대상 파일 1개 분석");
    expect(plan.proposedSteps[0]!.description).toBe("src/a.ts 수정");

    vi.unstubAllGlobals();
  });

  it("T3: falls back to mock when API returns 500 error", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", fetchMock);

    const llmPlanner = new PlannerAgent({ db, sse, apiKey: "test-key" });
    const plan = await llmPlanner.createPlan("agent-llm", "code-generation", {
      repoUrl: "https://github.com/test/repo",
      branch: "master",
      targetFiles: ["src/b.ts"],
    });

    expect(plan.codebaseAnalysis).toContain("대상 파일 1개 분석");

    vi.unstubAllGlobals();
  });

  it("T4: uses mock directly when no apiKey", async () => {
    // Default planner has no apiKey
    const plan = await planner.createPlan("agent-no-key", "code-generation", {
      repoUrl: "https://github.com/test/repo",
      branch: "master",
      targetFiles: ["src/c.ts"],
    });

    expect(plan.codebaseAnalysis).toContain("대상 파일 1개 분석");
    expect(plan.proposedSteps[0]!.description).toBe("src/c.ts 수정");
  });

  it("T5: parseAnalysisResponse parses valid JSON", () => {
    const json = JSON.stringify({
      codebaseAnalysis: "분석 결과",
      proposedSteps: [{ description: "step1", type: "modify" }],
      risks: ["risk1"],
      estimatedTokens: 5000,
    });

    const result = planner.parseAnalysisResponse(json, {
      repoUrl: "https://github.com/test/repo",
      branch: "master",
    });

    expect(result.codebaseAnalysis).toBe("분석 결과");
    expect(result.proposedSteps).toHaveLength(1);
    expect(result.risks).toEqual(["risk1"]);
    expect(result.estimatedTokens).toBe(5000);
  });

  it("T6: parseAnalysisResponse extracts JSON from ```json wrapper", () => {
    const wrapped = '```json\n{"codebaseAnalysis":"래핑된 분석","proposedSteps":[],"risks":[],"estimatedTokens":1000}\n```';

    const result = planner.parseAnalysisResponse(wrapped, {
      repoUrl: "https://github.com/test/repo",
      branch: "master",
    });

    expect(result.codebaseAnalysis).toBe("래핑된 분석");
    expect(result.estimatedTokens).toBe(1000);
  });
});
