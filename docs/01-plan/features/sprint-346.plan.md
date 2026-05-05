---
id: FX-PLAN-346
sprint: 346
feature: F612
req: FX-REQ-676
status: approved
date: 2026-05-05
depends_on: F608 (baseline JSON), F609 (types.ts re-export), F610 (multi-domain caller pattern), F611 (cross-domain-d1 종결)
---

# Sprint 346 Plan — F612: MSA 룰 강제 교정 Pass 5 — multi-domain 26 violations 8 파일 자동화 fix

## 목표

**F611 (Sprint 345) MERGED 후속.** Pass 시리즈의 final mass-fix — 잔존 multi-domain caller 26 violations(8 파일)을 F609/F610 정착화된 types.ts re-export 패턴으로 일괄 자동화. 이후 F613 1건만 남아 baseline → 1로 도달.

**핵심 원칙**:
- F609 정착 패턴 그대로 재현 (target types.ts에 누락 symbol 추가 export + caller path 변경)
- 8 파일 분산이지만 single-domain caller 패턴이 11~12 파일 처리한 F609(~3분)와 유사 동작 예상
- offering 도메인 caller 13건이 가장 큰 핫스팟 (3 files all in offering/services/, agent + discovery 의존)

## 사전 측정 (S333, F611 MERGED 후 baseline 27 실측)

### caller 파일 → target type 매트릭스 (26건)

| caller | viol | target → symbols (lines) |
|--------|------|--------------------------|
| **offering/services/business-plan-generator.ts** | 5 | agent (AgentRunner L6) + discovery (DiscoveryCriterion L7, AnalysisContext L8, BizItem+EvaluationWithScores L9, StartingPointType L10) |
| **offering/services/prototype-generator.ts** | 4 | agent (AgentRunner L5) + discovery (BizItem+EvaluationWithScores L6, DiscoveryCriterion L7, StartingPointType L8) |
| **offering/services/prd-generator.ts** | 4 | agent (AgentRunner L6) + discovery (DiscoveryCriterion L7, AnalysisContext L8, StartingPointType L9) |
| **discovery/services/agent-collector.ts** | 3 | agent (AgentRunner L5, AgentExecutionResult L6) + collection (CollectionCandidate L7) |
| **collection/routes/collection.ts** | 3 | discovery (AgentCollector+CollectorError L10) + agent (createAgentRunner L11, AgentCollectionService L12) |
| **agent/services/skill-pipeline-runner.ts** | 3 | discovery (DiscoveryPipelineService L7, DiscoveryStageService L10) + shaping (BdSkillExecutor L9) |
| **harness/services/bd-roi-calculator.ts** | 2 | discovery (SignalValuationService L10) + offering (OfferingMetricsService L11) |
| **discovery/routes/discovery-pipeline.ts** | 2 | shaping (ShapingOrchestratorService L9) + agent (SkillPipelineRunner L19) |

### Owner-domain별 추가 re-export

기존 F609/F610에서 정착화된 types.ts에 누락 symbol 보강:

- **agent/types.ts**: `AgentExecutionResult` (이미 있을 가능성 — execution-types.ts symbol 확인 필요), `AgentCollectionService` (신규), `SkillPipelineRunner` (신규)
- **discovery/types.ts**: `DiscoveryCriterion` (신규), `AnalysisContext` (신규), `BizItem` + `EvaluationWithScores` (신규), `StartingPointType` (신규), `AgentCollector` + `CollectorError` (신규), `DiscoveryPipelineService` (신규), `DiscoveryStageService` (신규), `SignalValuationService` (신규)
- **shaping/types.ts**: `BdSkillExecutor` (신규), `ShapingOrchestratorService` (신규)
- **offering/types.ts**: `OfferingMetricsService` (신규)
- **collection/types.ts**: `CollectionCandidate` (신규)

기존 보유 (F609 정립): `AgentRunner`, `createAgentRunner` (agent), 다수 offering symbol (F610에서 추가)

### caller import path 변경 패턴 (F610 동일)

```typescript
// Before
import type { AgentRunner } from "../../agent/services/agent-runner.js";
import type { DiscoveryCriterion } from "../../discovery/services/discovery-criteria.js";

// After
import type { AgentRunner } from "../../agent/types.js";
import type { DiscoveryCriterion } from "../../discovery/types.js";
```

## 인터뷰 패턴 (S333, 31회차 — 옵션 A 자동화 default)

| # | 질문 | 답변 |
|---|------|------|
| 1 | F612 자동화 전략 | **F609/F610 패턴 자동 재현** (옵션 A) |

## 범위

### (a) 5 target types.ts +N export 추가

agent/discovery/shaping/offering/collection types.ts에 누락 symbol re-export 추가 (총 ~13~16 신규 export)

### (b) 8 caller 파일 import path 변경

26 import line `../{target}/services/foo.js` → `../{target}/types.js` (+ relative depth 차이 정정)

### (c) baseline JSON 갱신

`.eslint-baseline.json` 27 → 1 (no-cross-domain-import 26 fix, no-direct-route-register 1 잔존 = F613)

### (d) typecheck + tests GREEN

re-export export 누락 0건 검증 + 8 파일 caller path 변경 회귀 0건

## Phase Exit P-a~P-i

- **P-a**: 5 target types.ts +13~16 export 정확
- **P-b**: 8 caller 파일 cross-domain import = 0 (NEW path만)
- **P-c**: baseline 27 → 1 (no-cross-domain-import 0, no-direct-route-register 1만 잔존)
- **P-d**: baseline check exit 0
- **P-e**: typecheck + tests 회귀 0건
- **P-f**: dual_ai_reviews sprint 346 ≥ 1건 (hook 21 sprint 연속)
- **P-g**: F608/F609/F610/F611 회귀 0
- **P-h**: F613 잔존 (`src/app.ts:129` no-direct-route-register) 그대로 — Pass 6 대상
- **P-i**: Match ≥ 90%

## 전제

- F608/F609/F610/F611 ✅ MERGED
- types.ts re-export 패턴 정착 (12 도메인 + 다수 symbol 누적)

## Out-of-scope

- no-direct-route-register 1 (F613 Sprint 347, Pass 시리즈 종결)
- 도메인 owner contract 정제 (F614+, 단순 re-export 인플레이션 정제)

## 예상 가동 시간

autopilot ~25분. F610(single-file 19 viol ~13분) 대비 8 file 분산 + 5 target types.ts 보강 = ~2배. F609(12 도메인 신설 + 44 caller ~3분)과는 다른 부담 (re-export는 보강만, caller가 multi-domain).
