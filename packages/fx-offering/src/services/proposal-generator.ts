/**
 * ProposalGenerator — BDP에서 사업제안서 요약본 LLM 생성 (F237)
 */
import { BdpService } from "./bdp-service.js";
import type { BdpVersion } from "./bdp-service.js";

export interface GenerateProposalInput {
  bizItemId: string;
  orgId: string;
  createdBy: string;
  maxLength?: number;
}

export class ProposalGenerator {
  private bdpService: BdpService;

  constructor(
    private db: D1Database,
    private ai?: Ai,
  ) {
    this.bdpService = new BdpService(db);
  }

  async generate(input: GenerateProposalInput): Promise<BdpVersion> {
    const latest = await this.bdpService.getLatest(input.bizItemId, input.orgId);
    if (!latest) {
      throw new NoBdpError(input.bizItemId);
    }

    const maxLength = input.maxLength ?? 1500;
    const proposal = await this.generateSummary(latest.content, maxLength);

    // Save as new BDP version with [PROPOSAL] prefix
    const version = await this.bdpService.createVersion({
      bizItemId: input.bizItemId,
      orgId: input.orgId,
      content: `[PROPOSAL]\n\n${proposal}`,
      createdBy: input.createdBy,
    });

    return version;
  }

  private async generateSummary(content: string, maxLength: number): Promise<string> {
    // If AI binding is available, use it
    if (this.ai) {
      try {
        const response = await (this.ai as { run: (model: string, input: { prompt: string; max_tokens?: number }) => Promise<{ response?: string }> }).run(
          "@cf/meta/llama-3.1-8b-instruct",
          {
            prompt: `다음 사업계획서를 ${maxLength}자 이내의 게이트 제출용 사업제안서 요약본으로 작성하세요.
핵심 내용만 추출하여 구조화된 요약을 만드세요:
1. 사업 개요 (1-2줄)
2. 핵심 가치 제안
3. 시장 기회
4. 주요 성과 지표

---

${content}`,
            max_tokens: Math.min(maxLength * 2, 4096),
          },
        );
        if (response?.response) {
          return response.response;
        }
      } catch {
        // Fallback to extractive summary
      }
    }

    // Fallback: extractive summary (first N chars)
    return this.extractiveSummary(content, maxLength);
  }

  private extractiveSummary(content: string, maxLength: number): string {
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    let summary = "";
    for (const line of lines) {
      if (summary.length + line.length + 1 > maxLength) break;
      summary += (summary ? "\n" : "") + line;
    }
    return summary || content.slice(0, maxLength);
  }
}

export class NoBdpError extends Error {
  constructor(bizItemId: string) {
    super(`No BDP found for item ${bizItemId}`);
    this.name = "NoBdpError";
  }
}
