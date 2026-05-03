// ─── F556: ProposalRubric v2 — 그라디언트 채점 (Sprint 310) ───
// R1 재현성(30) + R2 실행가능성(40) + R3 근거명시(30) = 100점
// v2 변경: 각 축을 binary → 단계별 그라디언트로 개선하여 천장 현상 완화

import type { ImprovementProposal } from "@foundry-x/shared";

export const RUBRIC_VERSION = "v2-f556";

export interface RubricBreakdown {
  r1: number;  // 재현성 (0~30)
  r2: number;  // 실행가능성 (0~40)
  r3: number;  // 근거명시 (0~30)
}

const CAUSAL_KEYWORDS = /because|therefore|score|axis|since|due to|reason/i;
const AXIS_NAMES = /ToolEffectiveness|Memory|Planning|Verification|Cost|Convergence/;
const HAS_NUMBER = /\d+(?:\.\d+)?/;
const YAML_KEY_VALUE = /:\s+\S/;

/** 자동 Rubric 채점기 v2. Human Approval 전 자동 1차 채점에 사용. */
export class ProposalRubric {
  /** 총점 반환 (0~100) */
  score(proposal: ImprovementProposal): number {
    const { r1, r2, r3 } = this.breakdown(proposal);
    return r1 + r2 + r3;
  }

  /** 축별 점수 반환 */
  breakdown(proposal: ImprovementProposal): RubricBreakdown {
    return {
      r1: this.scoreR1(proposal),
      r2: this.scoreR2(proposal),
      r3: this.scoreR3(proposal),
    };
  }

  /**
   * R1 재현성(30점): 제안의 재현 가능성 — 그라디언트 채점
   * - title 비어있지 않음: +5
   * - title 15자 이상(구체적): +5
   * - reasoning 비어있지 않음: +5
   * - reasoning 100자 이상(충분한 설명): +5
   * - yamlDiff 비어있지 않음: +10
   */
  private scoreR1(proposal: ImprovementProposal): number {
    const title = proposal.title?.trim() ?? "";
    const reasoning = proposal.reasoning?.trim() ?? "";
    const yamlDiff = proposal.yamlDiff?.trim() ?? "";

    let score = 0;
    if (title.length >= 1) score += 5;
    if (title.length >= 15) score += 5;
    if (reasoning.length >= 1) score += 5;
    if (reasoning.length >= 100) score += 5;
    if (yamlDiff.length >= 1) score += 10;
    return score;
  }

  /**
   * R2 실행가능성(40점): yamlDiff 품질 — 그라디언트 채점
   * - "+" 라인 존재: +10
   * - "-"와 "+" 모두 존재 (proper diff): +10
   * - 80자 이상 (substantial): +10
   * - YAML key-value 패턴 (`: value`): +10
   */
  private scoreR2(proposal: ImprovementProposal): number {
    const diff = proposal.yamlDiff ?? "";
    if (!diff.trim()) return 0;

    const lines = diff.split("\n");
    const hasAddedLines = lines.some((line) => line.startsWith("+"));
    const hasRemovedLines = lines.some((line) => line.startsWith("-"));

    let score = 0;
    if (hasAddedLines) score += 10;
    if (hasAddedLines && hasRemovedLines) score += 10;
    if (diff.length >= 80) score += 10;
    if (YAML_KEY_VALUE.test(diff)) score += 10;
    return score;
  }

  /**
   * R3 근거명시(30점): reasoning 품질 — graduated 채점
   * - 인과 키워드 포함: +10
   * - 6축 이름 참조: +10
   * - 구체적 수치 포함: +10
   */
  private scoreR3(proposal: ImprovementProposal): number {
    const reasoning = proposal.reasoning ?? "";
    let score = 0;
    if (CAUSAL_KEYWORDS.test(reasoning)) score += 10;
    if (AXIS_NAMES.test(reasoning)) score += 10;
    if (HAS_NUMBER.test(reasoning)) score += 10;
    return score;
  }
}
