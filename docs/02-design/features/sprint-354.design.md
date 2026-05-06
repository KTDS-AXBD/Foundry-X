---
code: FX-DESIGN-354
title: Sprint 354 — F630 인터뷰 → 7-타입 자동 추출 (Design)
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 354
f_item: F630
req: FX-REQ-695
priority: P2
---

# Sprint 354 — F630 인터뷰 → 7-타입 자동 추출 (Design)

> Plan: `docs/01-plan/features/sprint-354.plan.md`
> 의존: F628 ✅ MERGED (BesirEntityType), F606 ✅ (AuditBus), F627 ✅ (LLMService)

## §1 설계 결정

| 결정 항목 | 선택 | 근거 |
|-----------|------|------|
| 위치 | `core/discovery/services/` | BD 발굴 인터뷰 트랙 연장 (Plan §2 2차) |
| 분량 | Minimal | T2 첫 sprint, 정밀화는 후속 (Plan §2 3차) |
| route 파일 | 신규 `routes/seven-type-extraction.ts` | 관심사 분리, biz-items.ts 비대화 방지 |
| LLM 호출 방식 | `LLMService.generate(systemPrompt, userPrompt)` | F627 wrapper 재사용 |
| AuditBus trace | 서비스 내부 generateTraceId/SpanId 생성 | 독립 추출 run = 독립 trace |

## §2 인터페이스 설계

### TranscriptInput / ExtractionResult

```typescript
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
```

### SevenTypeExtractor

```typescript
class SevenTypeExtractor {
  constructor(
    private entityRegistry: EntityRegistry,
    private llm: LLMService,
    private auditBus?: AuditBus,
  ) {}

  async extractFromTranscript(input: TranscriptInput): Promise<ExtractionResult>
}
```

`auditBus` optional — AuditBus 미설정 시에도 추출 기능 동작.

## §3 Prompt 구조

- system prompt: 7-타입 정의 (7개) + few-shot 예제 1건
- user prompt: transcript 텍스트
- 응답 형식: JSON array `[{besirType, title, attributes, relationships}]`
- 파싱: zod `ExtractedItemSchema` 검증 (잘못된 JSON 또는 invalid besirType → throw)

## §4 Entity 등록 흐름

```
SevenTypeExtractor.extractFromTranscript()
  → LLMService.generate(systemPrompt, userPrompt)
  → parseSevenTypeResponse() [zod 파싱]
  → for each item: EntityRegistry.register({serviceId: "ai-foundry", besirType, ...})
  → AuditBus.emit("extraction.completed", payload, traceCtx)
  → return ExtractionResult
```

## §5 파일 매핑 (Worker 단위)

| 파일 | 액션 | 내용 |
|------|------|------|
| `core/discovery/services/seven-type-extractor.service.ts` | **신규** | SevenTypeExtractor class + TranscriptInput + ExtractionResult |
| `core/discovery/services/__tests__/seven-type-extractor.test.ts` | **신규** | TDD Red → Green 단위 테스트 |
| `core/discovery/routes/seven-type-extraction.ts` | **신규** | POST /discovery/extract-seven-types Hono route |
| `core/discovery/types.ts` | **수정** | TranscriptInput + ExtractionResult + SevenTypeExtractor re-export |
| `app.ts` | **수정** | sevenTypeExtractionRoute import + `app.route("/api", sevenTypeExtractionRoute)` |

## §6 TDD Red Target

```typescript
describe("F630: SevenTypeExtractor", () => {
  it("T1: LLM 응답을 파싱하여 4개 엔티티를 entity-registry에 등록한다")
  it("T2: audit-bus에 extraction.completed 이벤트를 발행한다")
  it("T3: 잘못된 LLM 응답(invalid JSON)은 에러를 던진다")
  it("T4: auditBus 미제공 시에도 추출이 정상 동작한다")
})
```

## §7 Phase Exit 체크리스트 (Plan §4 재확인)

| ID | 항목 | 기준 |
|----|------|------|
| P-a | seven-type-extractor.service.ts 신설 + SevenTypeExtractor export | grep |
| P-b | TranscriptInput + ExtractionResult types.ts re-export | grep |
| P-c | prompt 7-타입 정의 + few-shot 1 | grep buildSevenTypePrompt |
| P-d | entity-registry 통합 INSERT 검증 | unit test T1 |
| P-e | POST /api/discovery/extract-seven-types 등록 | grep app.ts |
| P-f | audit-bus extraction.completed 발행 | unit test T2 |
| P-g | typecheck + tests GREEN | pnpm -F api typecheck && test |
| P-h | dual_ai_reviews sprint 354 INSERT ≥ 1 | hook 자동 |
| P-i | F606/F628 baseline=0 회귀 | lint-baseline-check.sh |
| P-k | Match ≥ 90% | gap-detector |
| P-l | POST 추출 1건 + INSERT 검증 | unit test |
