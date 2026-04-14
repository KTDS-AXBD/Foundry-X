// F542 M4: ProposalRubric TDD Red Phase
// Sprint 290 — 자동 rubric 채점 (R1 재현성 + R2 실행가능성 + R3 근거명시)

import { describe, it, expect } from "vitest";
import { ProposalRubric } from "../../core/agent/services/proposal-rubric.js";
import type { ImprovementProposal } from "@foundry-x/shared";

function makeProposal(overrides: Partial<ImprovementProposal> = {}): ImprovementProposal {
  return {
    id: "prop-1",
    sessionId: "sess-1",
    agentId: "agent-1",
    type: "prompt",
    title: "시스템 프롬프트에 도구 우선순위 추가",
    reasoning: "ToolEffectiveness score가 40으로 낮기 때문에(because) 도구 선택 우선순위 가이드가 필요합니다.",
    yamlDiff: '- systemPrompt: "You are..."\n+ systemPrompt: "You are...\\nTool Priority: prefer search first."',
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("F542 ProposalRubric", () => {
  const rubric = new ProposalRubric();

  it("완전한 제안에 대해 100점 만점 이하의 점수를 반환한다", () => {
    const score = rubric.score(makeProposal());
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("R1 재현성: title/reasoning/yamlDiff 3필드가 모두 있으면 R1 만점(30)", () => {
    const score = rubric.score(makeProposal());
    const breakdown = rubric.breakdown(makeProposal());
    expect(breakdown.r1).toBe(30);
  });

  it("R1 재현성: title이 비어있으면 R1 감점", () => {
    const breakdown = rubric.breakdown(makeProposal({ title: "" }));
    expect(breakdown.r1).toBeLessThan(30);
  });

  it("R2 실행가능성: yamlDiff에 + 라인이 있고 길이 > 50이면 R2 만점(40)", () => {
    const breakdown = rubric.breakdown(makeProposal());
    expect(breakdown.r2).toBe(40);
  });

  it("R2 실행가능성: yamlDiff가 빈 문자열이면 R2=0", () => {
    const breakdown = rubric.breakdown(makeProposal({ yamlDiff: "" }));
    expect(breakdown.r2).toBe(0);
  });

  it("R3 근거명시: reasoning에 because/therefore/score/axis 키워드가 있으면 R3 만점(30)", () => {
    const breakdown = rubric.breakdown(makeProposal());
    expect(breakdown.r3).toBe(30);
  });

  it("R3 근거명시: reasoning에 키워드가 없으면 R3=0", () => {
    const breakdown = rubric.breakdown(makeProposal({
      reasoning: "This is a simple suggestion. It does not explain the root cause.",
    }));
    expect(breakdown.r3).toBe(0);
  });

  it("최소 제안(빈 필드들)에 대해 0점을 반환한다", () => {
    const score = rubric.score(makeProposal({
      title: "",
      reasoning: "",
      yamlDiff: "",
    }));
    expect(score).toBe(0);
  });

  it("총점은 R1+R2+R3의 합이다", () => {
    const proposal = makeProposal();
    const score = rubric.score(proposal);
    const breakdown = rubric.breakdown(proposal);
    expect(score).toBe(breakdown.r1 + breakdown.r2 + breakdown.r3);
  });
});
