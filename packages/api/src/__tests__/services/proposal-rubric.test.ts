// F556 ProposalRubric v2 — A/B regression + 그라디언트 채점 검증
// Sprint 310 — rubric_score=100 천장 현상 완화

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

function makeDetailedProposal(): ImprovementProposal {
  return makeProposal({
    reasoning: "ToolEffectiveness score가 40으로 낮기 때문에(because) 도구 선택 우선순위 가이드가 필요합니다. "
      + "현재 end_turn 비율이 0.4로 낮아서 도구 호출 후 결론 도달에 실패하는 경우가 많습니다. "
      + "따라서 systemPrompt에 Tool Priority 가이드를 추가하여 도구 우선순위를 명시해야 합니다.",
  });
}

describe("F542 ProposalRubric", () => {
  const rubric = new ProposalRubric();

  it("완전한 제안에 대해 100점 만점 이하의 점수를 반환한다", () => {
    const score = rubric.score(makeProposal());
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  // F556: 변별력 검증 — 완전한 제안이 100점이 아니어야 한다
  it("F556: 표준 makeProposal()은 100점 미만을 반환한다 (변별력)", () => {
    const score = rubric.score(makeProposal());
    expect(score).toBeLessThan(100);
  });

  // F556: reasoning이 충분히 길면 더 높은 점수를 받는다
  it("F556: reasoning이 100자 이상이면 표준 제안보다 높은 R1 점수를 받는다", () => {
    const baseBreakdown = rubric.breakdown(makeProposal());
    const detailBreakdown = rubric.breakdown(makeDetailedProposal());
    expect(detailBreakdown.r1).toBeGreaterThan(baseBreakdown.r1);
  });

  // R1 갱신: reasoning < 100자이면 R1 = 25 (not 30)
  it("R1 재현성: title/reasoning/yamlDiff 3필드 있고 reasoning<100자이면 R1=25", () => {
    const breakdown = rubric.breakdown(makeProposal());
    expect(breakdown.r1).toBe(25);
  });

  it("R1 재현성: title이 비어있으면 R1 감점", () => {
    const breakdown = rubric.breakdown(makeProposal({ title: "" }));
    expect(breakdown.r1).toBeLessThan(25);
  });

  it("R1 재현성: reasoning이 100자 이상이면 R1 만점(30)", () => {
    const breakdown = rubric.breakdown(makeDetailedProposal());
    expect(breakdown.r1).toBe(30);
  });

  it("R2 실행가능성: yamlDiff에 + 라인이 있고 proper diff이면 R2 만점(40)", () => {
    const breakdown = rubric.breakdown(makeProposal());
    expect(breakdown.r2).toBe(40);
  });

  it("R2 실행가능성: yamlDiff가 빈 문자열이면 R2=0", () => {
    const breakdown = rubric.breakdown(makeProposal({ yamlDiff: "" }));
    expect(breakdown.r2).toBe(0);
  });

  // F556: proper diff 없으면 감점
  it("F556: R2 — '-'라인 없이 '+'만 있으면 R2 감점 (proper diff 아님)", () => {
    const breakdown = rubric.breakdown(makeProposal({
      yamlDiff: '+ systemPrompt: "You are...\\nTool Priority: prefer search first."',
    }));
    expect(breakdown.r2).toBeLessThan(40);
  });

  it("R3 근거명시: reasoning에 because+ToolEffectiveness+숫자 모두 있으면 R3 만점(30)", () => {
    const breakdown = rubric.breakdown(makeProposal());
    expect(breakdown.r3).toBe(30);
  });

  it("R3 근거명시: reasoning에 키워드가 없으면 R3=0", () => {
    const breakdown = rubric.breakdown(makeProposal({
      reasoning: "This is a simple suggestion. It does not explain the root cause.",
    }));
    expect(breakdown.r3).toBe(0);
  });

  // F556: R3 그라디언트 — 1개 기준만 충족하면 10점
  it("F556: R3 — 인과 키워드만 있고 축이름/숫자 없으면 R3=10", () => {
    const breakdown = rubric.breakdown(makeProposal({
      reasoning: "Because the system needs improvement, we should add more instructions.",
    }));
    expect(breakdown.r3).toBe(10);
  });

  // F556: R3 그라디언트 — 2개 기준 충족하면 20점
  it("F556: R3 — 키워드+숫자 있지만 축이름 없으면 R3=20", () => {
    const breakdown = rubric.breakdown(makeProposal({
      reasoning: "Because the score is 40, improvement is needed.",
    }));
    expect(breakdown.r3).toBe(20);
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
