---
code: FX-PLAN-354
title: Sprint 354 — F630 인터뷰 → 7-타입 자동 추출 (T2 첫 sprint)
version: 1.1
status: SUPERSEDED
category: PLAN
created: 2026-05-06
updated: 2026-05-08
sprint: 354
f_item: F630
req: FX-REQ-695
priority: P2
---

# Sprint 354 — F630 인터뷰 → 7-타입 자동 추출 (T2 첫 sprint)

> **STATUS: SUPERSEDED (S337, 2026-05-08)** — F630는 S335 17 sprint 시동 신기록 세션에서 코드화 완료. 본 sprint 번호로 정식 WT 시동된 적 없음. S337 batch SPEC sync PR이 row를 ✅로 마킹 + plan SUPERSEDED. plan §3 항목들은 모두 코드 측에 정착 (자세한 위치는 SPEC.md row 또는 core/{도메인}/ 디렉토리 참조). SPEC.md F630 row가 진실 — `Sprint 354 | ✅`.

> SPEC.md §5 F630 row가 권위 소스. 본 plan은 17 internal dev plan §3 T2 Domain Extraction 첫 sprint.
> **시동 조건**: Sprint 352 F628 MERGED (BesirEntityType import 의존) 후 자동/수동 시동.

## §1 배경 + 사전 측정

BeSir 정합성 §1.3: **"엑셀 설문 X, 대면 인터뷰 O"** — 한 개념 설명에 이전 맥락·연관 개념 함께 → 관계 자연스럽게 녹아듦 = 온톨로지 자동 추출 원천.

### 의존성

| 의존 F# | 상태 | 본 sprint 영향 |
|---------|------|----------------|
| **F628** 7-타입 Entity (Sprint 352) | 진행 중 | **시동 대기 필수** (BesirEntityType import) |
| F606 Audit Log Bus (Sprint 351) | ✅ MERGED | audit-bus consumer로 활용 |
| F627 llm + service-proxy (Sprint 350) | ✅ MERGED | core/infra/llm.ts wrapper 활용 |

### 기존 자산

| 자산 | 위치 | 활용 |
|------|------|------|
| LLM wrapper | `core/infra/llm.ts` (F627) | 추출 service 호출 |
| 인터뷰 reference | `core/offering/services/prd-interview-service.ts` | 패턴 참고 |
| Entity registry | `core/entity/services/entity-registry.ts` (F593) | 추출 결과 INSERT |
| BesirEntityType | `core/entity/types.ts` (F628 후) | 추출 결과 분류 |

## §2 인터뷰 4회 패턴 (S336, 33회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T2 첫 sprint = F630 7-타입 자동 추출 | F628 unlock 직후 자연 |
| 2차 위치 | **A core/discovery/ 합류** | BD 발굴 인터뷰 트랙 연장 |
| 3차 분량 | **Minimal** (service stub + 간단 prompt + entity-registry 통합) | T2 첫 sprint 적합, 정밀화는 후속 |
| 4차 시동 | **F628 MERGED 대기 후 시동** | dependency 안전 |

## §3 범위 (a~i)

### (a) `core/discovery/services/seven-type-extractor.service.ts` 신설

```typescript
import { LLMService } from "../../infra/types.js";
import { EntityRegistryService } from "../../entity/types.js";
import type { BesirEntityType, BesirEntity } from "../../entity/types.js";
import { AuditBus } from "../../infra/types.js";

export interface TranscriptInput {
  orgId: string;
  transcript: string;
  contextRef?: string; // System Knowledge ref (F629)
}

export interface ExtractionResult {
  extractionRunId: string;
  extractedEntities: BesirEntity[];
  extractedAt: number;
}

export class SevenTypeExtractor {
  constructor(
    private llm: LLMService,
    private entityRegistry: EntityRegistryService,
    private auditBus: AuditBus,
  ) {}

  async extractFromTranscript(input: TranscriptInput): Promise<ExtractionResult> {
    const prompt = buildSevenTypePrompt(input.transcript);
    const llmResponse = await this.llm.complete(prompt);
    const parsed = parseSevenTypeResponse(llmResponse); // zod 검증

    const extractionRunId = crypto.randomUUID();
    const entities: BesirEntity[] = [];

    for (const item of parsed) {
      const entity = await this.entityRegistry.registerEntity({
        serviceId: "ai-foundry",
        entityType: item.besirType, // legacy 호환
        besirType: item.besirType,
        externalId: `extracted-${extractionRunId}-${entities.length}`,
        title: item.title,
        metadata: { attributes: item.attributes, relationships: item.relationships },
        orgId: input.orgId,
      });
      entities.push(entity);
    }

    await this.auditBus.emit("extraction.completed", {
      extractionRunId,
      entityCount: entities.length,
      orgId: input.orgId,
    });

    return { extractionRunId, extractedEntities: entities, extractedAt: Date.now() };
  }
}
```

### (b) Prompt template (간단 버전)

```typescript
function buildSevenTypePrompt(transcript: string): string {
  return `You are an expert ontology extractor. Given an interview transcript, extract 7-type BeSir entities.

# 7-Type Definitions
- fact: Numeric/measurable objects (revenue, satisfaction score)
- dimension: Criteria for slicing facts (project, customer, time)
- workflow: Business process flows
- event: Occurrences in time
- actor: People or systems performing actions
- policy: Rules or regulations
- support: Auxiliary information for the above 6

# Few-Shot Example
Input: "매출은 프로젝트별로 집계되고, 매월 영업팀장이 검토합니다."
Output: [
  {"besirType": "fact", "title": "매출", "attributes": {}, "relationships": [{"to": "프로젝트", "type": "split_by"}, {"to": "월", "type": "split_by"}]},
  {"besirType": "dimension", "title": "프로젝트", "attributes": {}, "relationships": []},
  {"besirType": "actor", "title": "영업팀장", "attributes": {}, "relationships": [{"to": "매출 검토", "type": "performs"}]},
  {"besirType": "workflow", "title": "매출 검토", "attributes": {"frequency": "monthly"}, "relationships": []}
]

# Now extract from this transcript
${transcript}

# Response (JSON array only, no markdown):`;
}
```

### (c) 응답 파싱 (zod)

```typescript
const ExtractedItemSchema = z.object({
  besirType: BesirEntityTypeSchema,
  title: z.string().min(1),
  attributes: z.record(z.unknown()).default({}),
  relationships: z.array(z.object({
    to: z.string(),
    type: z.string(),
  })).default([]),
});

function parseSevenTypeResponse(llmText: string): ExtractedItem[] {
  // strip code fences, parse JSON, validate with zod
  const jsonText = llmText.trim().replace(/^```json\n|```$/g, "");
  const parsed = JSON.parse(jsonText);
  return z.array(ExtractedItemSchema).parse(parsed);
}
```

### (d) routes endpoint `POST /api/discovery/extract-seven-types`

```typescript
// core/discovery/routes/biz-items.ts 또는 별 routes/seven-type-extraction.ts
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
const extractRoute = createRoute({
  method: "post",
  path: "/extract-seven-types",
  request: { body: { content: { "application/json": { schema: TranscriptInputSchema } } } },
  responses: { 200: { content: { "application/json": { schema: ExtractionResultSchema } } } },
});
```

### (e) audit-bus 이벤트 발행 (F606 사용)

`extraction.completed` event_type — payload = { extractionRunId, entityCount, orgId, traceId }.

### (f) test mock 1건

`__tests__/seven-type-extractor.test.ts`:
- Mock LLMService (returns fixed JSON array)
- Mock EntityRegistryService
- Mock AuditBus
- Verify: extracted 4 entities + audit emit called + entity-registry INSERT 4번

### (g) typecheck + vitest GREEN

회귀 0 확증.

### (h) (선택) routes를 별 파일로 분리

`core/discovery/routes/seven-type-extraction.ts` 신규 + `core/discovery/routes/index.ts`에 mount. 또는 기존 biz-items.ts에 통합.

### (i) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | seven-type-extractor.service.ts 신설 + class export | grep | SevenTypeExtractor class |
| P-b | TranscriptInput + ExtractionResult types export | grep | core/discovery/types.ts |
| P-c | prompt template 7-타입 정의 + few-shot 1 | grep prompt buildSevenTypePrompt | 정의 7개 + example 1 |
| P-d | entity-registry 통합 (extractedEntities INSERT) | unit test | service_entities INSERT 검증 |
| P-e | routes endpoint POST /api/discovery/extract-seven-types | grep app.ts 또는 routes/biz-items.ts | route 등록 |
| P-f | audit-bus extraction.completed 이벤트 발행 | mock 검증 | emit called |
| P-g | typecheck + tests GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-h | dual_ai_reviews sprint 354 자동 INSERT | D1 query | ≥ 1건 (hook 29 sprint 연속) |
| P-i | F606/F628/F629 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-j | F587~F629 회귀 측정 13항 | grep + count | 모든 항목 회귀 0 |
| P-k | Match ≥ 90% | gap-detector | semantic 100% 목표 |
| P-l | API smoke `/api/discovery/extract-seven-types` | curl POST mock LLM | 추출 1건 + service_entities INSERT |

## §5 전제

- **F628 MERGED 필수** (BesirEntityType import 의존)
- F606 MERGED ✅ (Sprint 351, audit-bus)
- F627 MERGED ✅ (Sprint 350, llm wrapper)
- F593 entity ✅ (entity-registry 활용)

## §6 예상 시간

- autopilot **~10~15분** (Minimal 분량 — service + prompt + parser + endpoint + 1 test)
- D1 migration 불필요 (service_entities INSERT만, F628이 schema 처리)

## §7 다음 사이클 후보 (F630 후속)

- **Sprint 355 — F631** 분석X 자동화O 정책 코드 강제 (T2, F606 의존 ✅)
- Sprint 356 — F624 Six Hats LLM 호출 패턴 (T2)
- Sprint 357 — F602 4대 진단 PoC (T3)
- 후속 Sprint — F630 정밀화 (Few-shot 5개 + 다중 인터뷰 합치기 + quality metrics)
