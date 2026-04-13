// ─── F530: MetaAgent — 진단 → 개선 제안 생성 (Sprint 283) ───
// TDD Red stub — Green Phase에서 구현 채움

import type { DiagnosticReport, ImprovementProposal } from "@foundry-x/shared";

export interface MetaAgentConfig {
  apiKey: string;
  model?: string;
}

/** MetaAgent — DiagnosticReport를 받아 ImprovementProposal[]을 생성한다. */
export class MetaAgent {
  constructor(private readonly config: MetaAgentConfig) {}

  async diagnose(_report: DiagnosticReport): Promise<ImprovementProposal[]> {
    throw new Error("Not implemented");
  }
}
