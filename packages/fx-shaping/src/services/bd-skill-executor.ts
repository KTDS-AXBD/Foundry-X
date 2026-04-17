/**
 * F260: BD 스킬 실행 엔진
 * 스킬 ID → 프롬프트 조합 → Anthropic Messages API 직접 호출 → 산출물 생성.
 * PromptGatewayService로 입력 sanitize, 커스텀 system prompt로 LLM 호출.
 */

import { PromptGatewayService } from "../agent/services/prompt-gateway.js";
import { BdArtifactService } from "./bd-artifact-service.js";
import { getSkillPrompt } from "./bd-skill-prompts.js";
import { SkillMetricsService } from "../agent/services/skill-metrics.js";
import type { ExecuteSkillInput, SkillExecutionResult } from "@foundry-x/shared";

const MODEL = "claude-haiku-4-5-20251001";

export class BdSkillExecutor {
  private gateway: PromptGatewayService;
  private artifactService: BdArtifactService;

  constructor(private db: D1Database, private apiKey: string) {
    this.gateway = new PromptGatewayService(db);
    this.artifactService = new BdArtifactService(db);
  }

  async execute(
    orgId: string,
    userId: string,
    skillId: string,
    input: ExecuteSkillInput,
  ): Promise<SkillExecutionResult> {
    const promptDef = getSkillPrompt(skillId);
    if (!promptDef) {
      throw new Error(`Unsupported skill: ${skillId}`);
    }

    const version = await this.artifactService.getNextVersion(input.bizItemId, skillId);

    const artifactId = generateId();
    await this.artifactService.create({
      id: artifactId,
      orgId,
      bizItemId: input.bizItemId,
      skillId,
      stageId: input.stageId,
      version,
      inputText: input.inputText,
      model: MODEL,
      createdBy: userId,
    });

    await this.artifactService.updateStatus(artifactId, "running");

    const startTime = Date.now();

    try {
      const sanitized = await this.gateway.sanitizePrompt(input.inputText, orgId);
      const bizContext = await this.loadBizItemContext(input.bizItemId);

      const userPrompt = bizContext
        ? `## 사업 아이템 컨텍스트\n${bizContext}\n\n## 분석 요청\n${sanitized.sanitizedContent}`
        : sanitized.sanitizedContent;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: promptDef.maxTokens,
          system: promptDef.systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      const durationMs = Date.now() - startTime;

      if (!res.ok) {
        const errorMsg = `Anthropic API error: ${res.status} ${res.statusText}`;
        await this.artifactService.updateStatus(artifactId, "failed", {
          outputText: errorMsg,
          tokensUsed: 0,
          durationMs,
        });
        return { artifactId, skillId, version, outputText: errorMsg, model: MODEL, tokensUsed: 0, durationMs, status: "failed" };
      }

      const data = (await res.json()) as {
        content: Array<{ type: string; text: string }>;
        usage: { input_tokens: number; output_tokens: number };
      };

      const outputText = data.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("");
      const tokensUsed = data.usage.input_tokens + data.usage.output_tokens;

      await this.artifactService.updateStatus(artifactId, "completed", {
        outputText,
        tokensUsed,
        durationMs,
      });

      // F274: 스킬 실행 메트릭 기록
      await this.recordMetrics(orgId, skillId, version, artifactId, input.bizItemId, userId, "completed", data.usage.input_tokens, data.usage.output_tokens, durationMs);

      return { artifactId, skillId, version, outputText, model: MODEL, tokensUsed, durationMs, status: "completed" };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.artifactService.updateStatus(artifactId, "failed", {
        outputText: errorMsg,
        tokensUsed: 0,
        durationMs,
      });

      // F274: 실패 메트릭도 기록
      await this.recordMetrics(orgId, skillId, version, artifactId, input.bizItemId, userId, "failed", 0, 0, durationMs, errorMsg);

      return { artifactId, skillId, version, outputText: errorMsg, model: MODEL, tokensUsed: 0, durationMs, status: "failed" };
    }
  }

  private async recordMetrics(
    orgId: string, skillId: string, version: number, artifactId: string,
    bizItemId: string, userId: string, status: "completed" | "failed",
    inputTokens: number, outputTokens: number, durationMs: number, errorMessage?: string,
  ): Promise<void> {
    try {
      const metricsService = new SkillMetricsService(this.db);
      await metricsService.recordExecution({
        tenantId: orgId,
        skillId,
        version,
        bizItemId,
        artifactId,
        model: MODEL,
        status,
        inputTokens,
        outputTokens,
        costUsd: estimateCost(MODEL, inputTokens, outputTokens),
        durationMs,
        executedBy: userId,
        errorMessage,
      });
    } catch {
      // 메트릭 기록 실패는 스킬 실행 결과에 영향 주지 않음
    }
  }

  private async loadBizItemContext(bizItemId: string): Promise<string | null> {
    const row = await this.db
      .prepare("SELECT title, description, status FROM biz_items WHERE id = ?")
      .bind(bizItemId)
      .first<{ title: string; description: string | null; status: string }>();
    if (!row) return null;
    return `- 제목: ${row.title}\n- 설명: ${row.description ?? "(없음)"}\n- 상태: ${row.status}`;
  }
}

function generateId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `art_${t}${r}`;
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Haiku 4.5 pricing: $0.80/1M input, $4.00/1M output
  if (model.includes("haiku")) {
    return (inputTokens * 0.8 + outputTokens * 4.0) / 1_000_000;
  }
  // Sonnet: $3/1M input, $15/1M output
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}
