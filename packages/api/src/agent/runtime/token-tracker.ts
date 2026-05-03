// ─── F527: F-L2-5 TokenTracker (Sprint 280) ───

import type { LLMTokenUsage, LLMTokenSummary } from "@foundry-x/shared";

/** 에이전트별 토큰 사용량 추적. Deep Insight Prompt Cache 패턴 적용. */
export class TokenTracker {
  private usage = new Map<string, LLMTokenUsage>();

  /**
   * 특정 에이전트의 토큰 사용량을 누적한다.
   * 같은 에이전트에 대해 여러 번 호출 시 합산됨.
   */
  track(agentId: string, usage: LLMTokenUsage): void {
    const existing = this.usage.get(agentId) ?? {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };

    this.usage.set(agentId, {
      inputTokens: existing.inputTokens + usage.inputTokens,
      outputTokens: existing.outputTokens + usage.outputTokens,
      cacheReadTokens: (existing.cacheReadTokens ?? 0) + (usage.cacheReadTokens ?? 0),
      cacheWriteTokens: (existing.cacheWriteTokens ?? 0) + (usage.cacheWriteTokens ?? 0),
    });
  }

  /** 특정 에이전트의 누적 사용량 반환. 없으면 0으로 초기화된 값 반환. */
  getUsage(agentId: string): LLMTokenSummary {
    const u = this.usage.get(agentId) ?? { inputTokens: 0, outputTokens: 0 };
    return toSummary(u);
  }

  /** 모든 에이전트의 사용량 합산 */
  total(): LLMTokenSummary {
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheWriteTokens = 0;

    for (const u of this.usage.values()) {
      inputTokens += u.inputTokens;
      outputTokens += u.outputTokens;
      cacheReadTokens += u.cacheReadTokens ?? 0;
      cacheWriteTokens += u.cacheWriteTokens ?? 0;
    }

    return toSummary({ inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens });
  }

  /**
   * 사용량 초기화.
   * @param agentId — 지정 시 해당 에이전트만 초기화. 없으면 전체 초기화.
   */
  reset(agentId?: string): void {
    if (agentId !== undefined) {
      this.usage.delete(agentId);
    } else {
      this.usage.clear();
    }
  }

  /** 추적 중인 에이전트 목록 */
  agents(): string[] {
    return Array.from(this.usage.keys());
  }
}

function toSummary(u: LLMTokenUsage): LLMTokenSummary {
  const totalTokens = u.inputTokens + u.outputTokens;
  return {
    inputTokens: u.inputTokens,
    outputTokens: u.outputTokens,
    cacheReadTokens: u.cacheReadTokens,
    cacheWriteTokens: u.cacheWriteTokens,
    totalTokens,
  };
}
