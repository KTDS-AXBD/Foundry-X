// F530 Meta Layer (L4) — MetaAgent TDD Red Phase
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MetaAgent } from "../../agent/services/meta-agent.js";
import type { DiagnosticReport } from "@foundry-x/shared";

// MetaAgent 내부에서 AgentRuntime을 사용하므로 fetch를 mock한다
vi.stubGlobal("fetch", vi.fn());

function makeLowScoreReport(): DiagnosticReport {
  return {
    sessionId: "sess-low",
    agentId: "agent-test",
    collectedAt: new Date().toISOString(),
    overallScore: 42,
    scores: [
      { axis: "ToolEffectiveness", score: 40, rawValue: 0.4, unit: "ratio", trend: "down" },
      { axis: "Memory",            score: 30, rawValue: 800, unit: "tokens/round", trend: "down" },
      { axis: "Planning",          score: 55, rawValue: 0.55, unit: "ratio", trend: "stable" },
      { axis: "Verification",      score: 50, rawValue: 50, unit: "score", trend: "stable" },
      { axis: "Cost",              score: 35, rawValue: 1200, unit: "tokens/round", trend: "down" },
      { axis: "Convergence",       score: 42, rawValue: 0.42, unit: "ratio", trend: "down" },
    ],
  };
}

describe("F530 MetaAgent", () => {
  let agent: MetaAgent;

  beforeEach(() => {
    agent = new MetaAgent({ apiKey: "test-key" });

    // Anthropic API 응답 mock
    const mockProposals = [
      {
        type: "prompt",
        title: "시스템 프롬프트에 도구 우선순위 가이드 추가",
        reasoning: "ToolEffectiveness 점수가 40으로 낮습니다.",
        yamlDiff: '- systemPrompt: "You are..."\n+ systemPrompt: "You are...\\nTool Priority: prefer search first."',
      },
    ];

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: JSON.stringify(mockProposals) }],
        stop_reason: "end_turn",
        usage: { input_tokens: 500, output_tokens: 200 },
      }),
    });
  });

  it("낮은 점수 DiagnosticReport에서 1개 이상의 ImprovementProposal을 반환한다", async () => {
    const report = makeLowScoreReport();
    const proposals = await agent.diagnose(report);

    expect(proposals.length).toBeGreaterThanOrEqual(1);
  });

  it("반환된 제안의 type이 유효한 값이다 (prompt|tool|model|graph)", async () => {
    const report = makeLowScoreReport();
    const proposals = await agent.diagnose(report);
    const validTypes = ["prompt", "tool", "model", "graph"];

    for (const p of proposals) {
      expect(validTypes).toContain(p.type);
    }
  });

  it("반환된 제안의 yamlDiff가 비어있지 않다", async () => {
    const report = makeLowScoreReport();
    const proposals = await agent.diagnose(report);

    for (const p of proposals) {
      expect(p.yamlDiff.trim().length).toBeGreaterThan(0);
    }
  });

  it("반환된 제안의 status는 기본값 'pending'이다", async () => {
    const report = makeLowScoreReport();
    const proposals = await agent.diagnose(report);

    for (const p of proposals) {
      expect(p.status).toBe("pending");
    }
  });

  it("반환된 제안에 id, sessionId, agentId가 포함된다", async () => {
    const report = makeLowScoreReport();
    const proposals = await agent.diagnose(report);

    for (const p of proposals) {
      expect(p.id).toBeTruthy();
      expect(p.sessionId).toBe(report.sessionId);
      expect(p.agentId).toBe(report.agentId);
    }
  });

  // F542 M2: META_AGENT_MODEL 환경변수 반영 테스트
  it("model 파라미터가 지정되면 해당 모델로 API를 호출한다", async () => {
    const sonnetAgent = new MetaAgent({ apiKey: "test-key", model: "claude-sonnet-4-6" });
    const report = makeLowScoreReport();
    await sonnetAgent.diagnose(report);

    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    const calls = fetchMock.mock.calls;
    const lastCall = calls[calls.length - 1] as [string, { body: string }];
    const body = JSON.parse(lastCall[1].body) as { model: string };
    expect(body.model).toBe("claude-sonnet-4-6");
  });

  it("model 파라미터 없으면 기본값 Sonnet 4.6을 사용한다", async () => {
    const defaultAgent = new MetaAgent({ apiKey: "test-key" });
    const report = makeLowScoreReport();
    await defaultAgent.diagnose(report);

    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    const calls = fetchMock.mock.calls;
    const lastCall = calls[calls.length - 1] as [string, { body: string }];
    const body = JSON.parse(lastCall[1].body) as { model: string };
    expect(body.model).toBe("claude-sonnet-4-6");
  });

  it("모든 축 점수가 높으면 (>80) 제안이 0개일 수 있다", async () => {
    const highReport: DiagnosticReport = {
      sessionId: "sess-high",
      agentId: "agent-good",
      collectedAt: new Date().toISOString(),
      overallScore: 90,
      scores: [
        { axis: "ToolEffectiveness", score: 90, rawValue: 0.9, unit: "ratio", trend: "up" },
        { axis: "Memory",            score: 85, rawValue: 300, unit: "tokens/round", trend: "stable" },
        { axis: "Planning",          score: 88, rawValue: 0.88, unit: "ratio", trend: "up" },
        { axis: "Verification",      score: 92, rawValue: 92, unit: "score", trend: "up" },
        { axis: "Cost",              score: 87, rawValue: 400, unit: "tokens/round", trend: "stable" },
        { axis: "Convergence",       score: 95, rawValue: 0.95, unit: "ratio", trend: "up" },
      ],
    };

    // 높은 점수 → mock을 빈 배열로 변경
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "[]" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 300, output_tokens: 50 },
      }),
    });

    const proposals = await agent.diagnose(highReport);
    expect(proposals.length).toBeGreaterThanOrEqual(0);
  });
});
