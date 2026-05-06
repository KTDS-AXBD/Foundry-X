// F630: 인터뷰 트랜스크립트 → BeSir 7-타입 엔티티 자동 추출
import { z } from "zod";
import type { EntityRegistry } from "../../entity/types.js";
import { BESIR_ENTITY_TYPES } from "../../entity/types.js";
import type { BesirEntity } from "../../entity/types.js";
import type { LLMService } from "../../infra/types.js";
import type { AuditBus } from "../../infra/types.js";
import { generateTraceId, generateSpanId } from "../../infra/types.js";

export interface TranscriptInput {
  orgId: string;
  transcript: string;
  contextRef?: string;
}

export interface ExtractionResult {
  extractionRunId: string;
  extractedEntities: BesirEntity[];
  extractedAt: number;
}

const ExtractedItemSchema = z.object({
  besirType: z.enum(BESIR_ENTITY_TYPES),
  title: z.string().min(1),
  attributes: z.record(z.unknown()).default({}),
  relationships: z
    .array(z.object({ to: z.string(), type: z.string() }))
    .default([]),
});

type ExtractedItem = z.infer<typeof ExtractedItemSchema>;

const SEVEN_TYPE_SYSTEM_PROMPT = `You are an expert ontology extractor. Given an interview transcript, extract BeSir 7-type entities.

# 7-Type Definitions
- fact: Numeric/measurable objects (revenue, satisfaction score, KPI)
- dimension: Criteria for slicing facts (project, customer, time, region)
- workflow: Business process flows and procedures
- event: Occurrences or incidents in time
- actor: People or systems performing actions or roles
- policy: Rules, regulations, or constraints governing actions
- support: Auxiliary information supporting the above 6 types

# Few-Shot Example
Input: "매출은 프로젝트별로 집계되고, 매월 영업팀장이 검토합니다."
Output: [
  {"besirType": "fact", "title": "매출", "attributes": {}, "relationships": [{"to": "프로젝트", "type": "split_by"}, {"to": "월", "type": "split_by"}]},
  {"besirType": "dimension", "title": "프로젝트", "attributes": {}, "relationships": []},
  {"besirType": "actor", "title": "영업팀장", "attributes": {}, "relationships": [{"to": "매출 검토", "type": "performs"}]},
  {"besirType": "workflow", "title": "매출 검토", "attributes": {"frequency": "monthly"}, "relationships": []}
]

Respond with a JSON array only, no markdown fences.`;

function parseSevenTypeResponse(llmText: string): ExtractedItem[] {
  const cleaned = llmText.trim().replace(/^```(?:json)?\n?|```$/g, "").trim();
  const parsed: unknown = JSON.parse(cleaned);
  return z.array(ExtractedItemSchema).parse(parsed);
}

export class SevenTypeExtractor {
  constructor(
    private readonly entityRegistry: EntityRegistry,
    private readonly llm: LLMService,
    private readonly auditBus?: AuditBus,
  ) {}

  async extractFromTranscript(input: TranscriptInput): Promise<ExtractionResult> {
    const userPrompt = `Extract BeSir 7-type entities from this transcript:\n\n${input.transcript}`;
    const llmResponse = await this.llm.generate(SEVEN_TYPE_SYSTEM_PROMPT, userPrompt);
    const items = parseSevenTypeResponse(llmResponse.content);

    const extractionRunId = crypto.randomUUID();
    const entities: BesirEntity[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const entity = await this.entityRegistry.register({
        serviceId: "ai-foundry",
        entityType: item.besirType,
        besirType: item.besirType,
        externalId: `extracted-${extractionRunId}-${i}`,
        title: item.title,
        metadata: { attributes: item.attributes, relationships: item.relationships },
        orgId: input.orgId,
      });
      entities.push(entity);
    }

    if (this.auditBus) {
      const traceCtx = {
        traceId: generateTraceId(),
        spanId: generateSpanId(),
        sampled: true,
      };
      await this.auditBus.emit(
        "extraction.completed",
        { extractionRunId, entityCount: entities.length, orgId: input.orgId },
        traceCtx,
      );
    }

    return { extractionRunId, extractedEntities: entities, extractedAt: Date.now() };
  }
}
