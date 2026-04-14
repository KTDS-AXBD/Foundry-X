// ─── F542 M4: ProposalRubric — 자동 rubric 채점 (Sprint 290) ───
// R1 재현성(30) + R2 실행가능성(40) + R3 근거명시(30) = 100점

import type { ImprovementProposal } from "@foundry-x/shared";

export interface RubricBreakdown {
  r1: number;  // 재현성 (0~30)
  r2: number;  // 실행가능성 (0~40)
  r3: number;  // 근거명시 (0~30)
}

const R3_KEYWORDS = /because|therefore|score|axis|since|due to|reason/i;

/** 자동 Rubric 채점기. Human Approval 전 자동 1차 채점에 사용. */
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

  /** R1 재현성(30점): 3 핵심 필드 존재 여부 */
  private scoreR1(proposal: ImprovementProposal): number {
    let score = 0;
    if (proposal.title?.trim()) score += 10;
    if (proposal.reasoning?.trim()) score += 10;
    if (proposal.yamlDiff?.trim()) score += 10;
    return score;
  }

  /** R2 실행가능성(40점): yamlDiff 품질 */
  private scoreR2(proposal: ImprovementProposal): number {
    const diff = proposal.yamlDiff ?? "";
    if (!diff.trim()) return 0;

    let score = 0;
    const hasAddedLines = diff.split("\n").some((line) => line.startsWith("+"));
    if (hasAddedLines) score += 20;
    if (diff.length > 50) score += 20;
    return score;
  }

  /** R3 근거명시(30점): reasoning에 인과 키워드 존재 */
  private scoreR3(proposal: ImprovementProposal): number {
    const reasoning = proposal.reasoning ?? "";
    return R3_KEYWORDS.test(reasoning) ? 30 : 0;
  }
}
