---
id: FX-PLAN-344
sprint: 344
feature: F610
req: FX-REQ-674
status: approved
date: 2026-05-05
depends_on: F608 (Sprint 342, baseline JSON), F609 (Sprint 343, types.ts re-export 패턴)
---

# Sprint 344 Plan — F610: MSA 룰 강제 교정 Pass 3 — biz-items.ts 19건 단일 파일 리팩터링

## 목표

**F609 (Sprint 343, types.ts 13 도메인 신설 + single-domain 44 fix) MERGED 후속.** baseline 잔존 multi-domain 9 파일 중 가장 큰 단일 핫스팟 `core/discovery/routes/biz-items.ts` 19 violations 자동화 fix. F609 re-export 패턴을 multi-domain caller에 재현.

**핵심 원칙**:
- **F609 re-export 자동화 무기 재사용**: 3 target types.ts(shaping/offering/harness)에 누락 symbol 추가 export → biz-items.ts caller import path 일괄 갱신
- **shaping 6 + offering 16 + harness 1 = 23 symbol re-export 추가**: 각 도메인 owner contract 정제는 후속 sprint 별 PR로 deferred
- **baseline 161 → 142 목표**: 19 violations fix (단일 파일 100% 해소)

## 사전 측정 (S332/S333, 2026-05-05 KST)

### biz-items.ts 위반 19건 (baseline 라인 번호 정확)

| Line | Symbol | Source | Target types.ts |
|------|--------|--------|-----------------|
| 12 | BizPersonaEvaluator, EvaluationError | shaping/services/biz-persona-evaluator | shaping |
| 13 | createAgentRunner | agent/services/agent-runner | agent (✅ 이미 export) |
| 16 | PrdConfirmationService | offering/services/prd-confirmation-service | offering |
| 17 | prdEditSchema, prdDiffQuerySchema | offering/schemas/prd-confirmation-schema | offering |
| 21 | PrdReviewPipeline, PipelineError | offering/services/prd-review-pipeline | offering |
| 22 | savePrdPersonaEvaluations, getPrdPersonaEvaluations | shaping/services/biz-persona-evaluator | shaping |
| 26 | PrdGeneratorService | offering/services/prd-generator | offering |
| 29 | GeneratePrdSchema | offering/schemas/prd | offering |
| 31 | SixHatsDebateService, SixHatsDebateError | shaping/services/sixhats-debate | shaping |
| 37 | BusinessPlanGeneratorService | offering/services/business-plan-generator | offering |
| 38 | GenerateBusinessPlanSchema | offering/schemas/business-plan | offering |
| 39 | PrototypeGeneratorService | offering/services/prototype-generator | offering |
| 40 | GeneratePrototypeSchema | harness/schemas/prototype | harness |
| 42 | SetDiscoveryTypeSchema | shaping/schemas/viability-checkpoint.schema | shaping |
| 45 | BpHtmlParser | offering/services/bp-html-parser | offering |
| 46 | BpPrdGenerator | offering/services/bp-prd-generator | offering |
| 47 | PrdInterviewService | offering/services/prd-interview-service | offering |
| 48 | GeneratePrdFromBpSchema | offering/schemas/bp-prd | offering |
| 49 | StartInterviewSchema, AnswerInterviewSchema | offering/schemas/prd-interview | offering |

### Target types.ts 신규 re-export 매핑

- **shaping/types.ts** (+6): BizPersonaEvaluator, EvaluationError, savePrdPersonaEvaluations, getPrdPersonaEvaluations, SixHatsDebateService, SixHatsDebateError, SetDiscoveryTypeSchema (실제 7)
- **offering/types.ts** (+16): PrdConfirmationService, prdEditSchema, prdDiffQuerySchema, PrdReviewPipeline, PipelineError, PrdGeneratorService, GeneratePrdSchema, BusinessPlanGeneratorService, GenerateBusinessPlanSchema, PrototypeGeneratorService, BpHtmlParser, BpPrdGenerator, PrdInterviewService, GeneratePrdFromBpSchema, StartInterviewSchema, AnswerInterviewSchema
- **harness/types.ts** (+1): GeneratePrototypeSchema
- **agent/types.ts**: createAgentRunner ✅ 이미 존재 (변경 불필요)

### caller import path 변경 패턴

```typescript
// Before (line 12)
import { BizPersonaEvaluator, EvaluationError } from "../../shaping/services/biz-persona-evaluator.js";

// After
import { BizPersonaEvaluator, EvaluationError } from "../../shaping/types.js";
```

## 인터뷰 패턴 (S332+S333, 28~29회차)

| # | 질문 | 사용자 답변 |
|---|------|-------------|
| 1 | F610 자동화 fix 전략 (S332 deferred, S333 메인 결정) | 옵션 A 자동화 (F609 패턴 재현) |

## 범위

### (a) 3 target types.ts re-export 추가

- `core/shaping/types.ts` +7 export (BizPersonaEvaluator, EvaluationError, savePrdPersonaEvaluations, getPrdPersonaEvaluations, SixHatsDebateService, SixHatsDebateError, SetDiscoveryTypeSchema)
- `core/offering/types.ts` +16 export (위 매핑)
- `core/harness/types.ts` +1 export (GeneratePrototypeSchema)

### (b) biz-items.ts caller 19 import line 변경

19 라인 모두 `../../{target}/services/foo.js` → `../../{target}/types.js` 변경. agent createAgentRunner(line 13)만 path 변경 (이미 types.ts에 존재).

### (c) baseline JSON 갱신

`packages/api/.eslint-baseline.json`에서 biz-items.ts 19 fingerprints 제거. 새 카운트 161 → 142. `scripts/lint-baseline-update.sh` 실행.

### (d) typecheck + tests GREEN 회귀

re-export 패턴 export 누락 0건. F609에서 검증한 도메인 외부 caller 타입 호환 패턴 재현.

## Phase Exit P-a~P-i

- **P-a**: shaping/types.ts +7 export, offering/types.ts +16 export, harness/types.ts +1 export 정확 반영
- **P-b**: biz-items.ts cross-domain import = 0 (NEW path만)
- **P-c**: baseline fingerprints 161 → 142 (정확 -19)
- **P-d**: baseline check exit 0 (regression 0)
- **P-e**: typecheck + tests 회귀 0건
- **P-f**: dual_ai_reviews sprint 344 INSERT ≥ 1건 (hook 19 sprint 연속)
- **P-g**: F608/F609 회귀 0
- **P-h**: 그 외 multi-domain 8 파일 잔존 (F612 deferred)
- **P-i**: Match ≥ 90%

## 전제

- F608 ✅ MERGED (baseline JSON 존재 필수)
- F609 ✅ MERGED (12 types.ts 신설 + 44 single-domain caller 패턴)
- C103+C104 ✅ (hook + WT secrets 정상)

## Out-of-scope

- multi-domain 잔여 8 파일 (F612 Sprint 346)
- cross-domain-d1 31 warnings (F611 Sprint 345)
- no-direct-route-register 1 (F613 Sprint 347)
- 도메인 owner contract 정제 (F614+ 후속, 단순 re-export 인플레이션 정제)

## 예상 가동 시간

autopilot ~20분 (F609 자동화 ~3분 대비 multi-domain 분산 + symbol 매핑 검증 부담 +17분).
