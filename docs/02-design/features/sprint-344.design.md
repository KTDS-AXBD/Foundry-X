---
id: FX-DSGN-344
sprint: 344
feature: F610
req: FX-REQ-674
status: approved
date: 2026-05-05
---

# Sprint 344 Design — F610: MSA 룰 강제 교정 Pass 3 — biz-items.ts 19건

## 목표 요약

`core/discovery/routes/biz-items.ts` 19건 cross-domain import → `{domain}/types.ts` re-export 경유로 변경.  
F609 패턴 재현: target types.ts에 누락 symbol 추가 export → caller import path 갱신.

## §1 현재 위반 목록

| Line | Symbol(s) | Current Source | Target types.ts |
|------|-----------|----------------|-----------------|
| 12 | BizPersonaEvaluator, EvaluationError | shaping/services/biz-persona-evaluator.js | shaping |
| 13 | createAgentRunner | core/agent/services/agent-runner.js | agent (✅ 이미 존재) |
| 16 | PrdConfirmationService | offering/services/prd-confirmation-service.js | offering |
| 17 | prdEditSchema, prdDiffQuerySchema | offering/schemas/prd-confirmation-schema.js | offering |
| 21 | PrdReviewPipeline, PipelineError | offering/services/prd-review-pipeline.js | offering |
| 22 | savePrdPersonaEvaluations, getPrdPersonaEvaluations | shaping/services/biz-persona-evaluator.js | shaping |
| 26 | PrdGeneratorService | offering/services/prd-generator.js | offering |
| 29 | GeneratePrdSchema | offering/schemas/prd.js | offering |
| 31 | SixHatsDebateService, SixHatsDebateError | shaping/services/sixhats-debate.js | shaping |
| 37 | BusinessPlanGeneratorService | offering/services/business-plan-generator.js | offering |
| 38 | GenerateBusinessPlanSchema | offering/schemas/business-plan.js | offering |
| 39 | PrototypeGeneratorService | offering/services/prototype-generator.js | offering |
| 40 | GeneratePrototypeSchema | harness/schemas/prototype.js | harness |
| 42 | SetDiscoveryTypeSchema | shaping/schemas/viability-checkpoint.schema.js | shaping |
| 45 | BpHtmlParser | offering/services/bp-html-parser.js | offering |
| 46 | BpPrdGenerator | offering/services/bp-prd-generator.js | offering |
| 47 | PrdInterviewService | offering/services/prd-interview-service.js | offering |
| 48 | GeneratePrdFromBpSchema | offering/schemas/bp-prd.js | offering |
| 49 | StartInterviewSchema, AnswerInterviewSchema | offering/schemas/prd-interview.js | offering |

## §2 구현 전략 (F609 패턴)

```
Phase 1: types.ts에 누락 symbol re-export 추가
Phase 2: biz-items.ts 19개 import line → types.ts 경로로 갱신
Phase 3: baseline JSON에서 19 fingerprint 제거
Phase 4: typecheck + lint 검증
```

## §3 변경 파일 매핑 (§5)

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/core/shaping/types.ts` | +7 export: BizPersonaEvaluator, EvaluationError, savePrdPersonaEvaluations, getPrdPersonaEvaluations, SixHatsDebateService, SixHatsDebateError, SetDiscoveryTypeSchema |
| `packages/api/src/core/offering/types.ts` | +16 export: PrdConfirmationService, prdEditSchema, prdDiffQuerySchema, PrdReviewPipeline, PipelineError, PrdGeneratorService, GeneratePrdSchema, BusinessPlanGeneratorService, GenerateBusinessPlanSchema, PrototypeGeneratorService, BpHtmlParser, BpPrdGenerator, PrdInterviewService, GeneratePrdFromBpSchema, StartInterviewSchema, AnswerInterviewSchema |
| `packages/api/src/core/harness/types.ts` | +1 export: GeneratePrototypeSchema |
| `packages/api/src/core/discovery/routes/biz-items.ts` | 19 import line → types.ts 경로 변경 (line 13 createAgentRunner도 포함) |
| `packages/api/.eslint-baseline.json` | biz-items.ts 19 fingerprint 제거 (161→142) |

## §4 테스트 계약 (TDD Red Target)

F610은 types.ts re-export 패턴 + import path 변경이므로 TDD 면제 범위:
- shared 타입 변경 (re-export 추가)
- import path 리팩터링 (로직 변경 없음)

검증 방법: typecheck PASS + lint baseline check exit 0

## §5 Worker 파일 매핑

단일 Worker (직접 구현):
- shaping/types.ts 수정
- offering/types.ts 수정
- harness/types.ts 수정
- biz-items.ts 19 import line 변경
- baseline JSON 갱신

## §6 Phase Exit 체크리스트

| # | 항목 |
|---|------|
| P-a | shaping +7 / offering +16 / harness +1 export 반영 |
| P-b | biz-items.ts cross-domain import = 0 |
| P-c | baseline 161 → 142 |
| P-d | `pnpm lint --rule no-cross-domain-import` exit 0 |
| P-e | typecheck 회귀 0건 |
| P-i | Match ≥ 90% |
