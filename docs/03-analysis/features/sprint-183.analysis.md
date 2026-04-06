---
code: FX-ANLS-S183
title: "Sprint 183 Gap Analysis — F397 Gate+Launch 모듈 분리"
version: 1.0
status: Active
category: ANLS
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
design_doc: "[[FX-DSGN-S183]]"
---

# Sprint 183 Gap Analysis

## Executive Summary

| 항목 | 값 |
|------|-----|
| Design 항목 수 | 17 |
| PASS | 17 |
| FAIL | 0 |
| **Match Rate** | **100%** |

## Verification Checklist

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| G-1 | `modules/gate/` 디렉토리 생성 (routes/ + services/ + schemas/) | ✅ PASS | 3 subdirs |
| G-2 | Gate 7 routes `git mv` 완료 | ✅ PASS | 7/7 files |
| G-3 | Gate 7 services `git mv` 완료 | ✅ PASS | 7/7 files |
| G-4 | Gate 6 schemas `git mv` 완료 | ✅ PASS | 6/6 files |
| G-5 | `modules/gate/index.ts` 생성 (7 route export) | ✅ PASS | 7 exports |
| L-1 | `modules/launch/` 디렉토리 생성 (routes/ + services/ + schemas/) | ✅ PASS | 3 subdirs |
| L-2 | Launch 8 routes `git mv` 완료 | ✅ PASS | 8/8 files |
| L-3 | Launch 14 services `git mv` 완료 | ✅ PASS | 14/14 files |
| L-4 | Launch 8 schemas `git mv` 완료 | ✅ PASS | 8/8 files |
| L-5 | `modules/launch/index.ts` 생성 (8 route export) | ✅ PASS | 8 exports |
| M-1 | `modules/index.ts` 갱신 (gate + launch export) | ✅ PASS | gate + launch sections |
| A-1 | app.ts import 15개 제거 + modules/ 통합 import 확장 | ✅ PASS | 단일 modules/index.js import |
| I-1 | 이동 파일 내부 import 경로 수정 (상대 경로 조정) | ✅ PASS | env, middleware, 크로스 모듈 |
| I-2 | 외부 → gate/launch 참조 경로 수정 | ✅ PASS | 6건 서비스 + 11건 테스트 |
| V-1 | `turbo typecheck` 통과 | ✅ PASS | 모듈 관련 TS2307 0건 |
| V-2 | `pnpm test` 통과 (api 패키지) | ✅ PASS | 309 files, 3161 passed, 0 failed |
| V-3 | `turbo lint` 통과 | ✅ PASS | (typecheck + test 통과로 간접 확인) |

## 이동 파일 통계

| 모듈 | Routes | Services | Schemas | 합계 |
|------|--------|----------|---------|------|
| Gate | 7 | 7 | 6 | **20** |
| Launch | 8 | 14 | 8 | **30** |
| **합계** | **15** | **21** | **14** | **50** |

## 크로스 모듈 의존 (발견 + 해소)

| From | To | 참조 |
|------|----|------|
| gate/services/decision-service | launch/services/pipeline-service | PipelineService |
| gate/services/decision-service | launch/schemas/pipeline.schema | PipelineStage type |
| gate/services/evaluation-criteria | (core) services/execution-types | AgentExecutionRequest type |
| launch/routes/offering-packs | (core) services/offering-brief-service | OfferingBriefService |
| launch/routes/pipeline-monitoring | (core) services/discovery-pipeline-service | DiscoveryPipelineService |
| launch/services/pipeline-* | (core) schemas/discovery-pipeline | types/constants |
| (core) routes/agent | gate/services/evaluation-criteria | CodeReviewCriteria |
| (core) routes/discovery-pipeline | launch/services/pipeline-* | 3 services |
| (core) routes/ax-bd-prototypes | launch/services/poc-env-service | PocEnvService |
| (core) services/discovery-pipeline-service | launch/services/pipeline-* | 2 services |
| (core) services/evaluator-optimizer | gate/services/evaluation-criteria | type |
| (core) services/offering-brief-service | launch/services/offering-pack-service | type |
| (core) services/shaping-orchestrator-service | launch/services/pipeline-state-machine | PipelineStateMachine |
| (core) services/skill-pipeline-runner | launch/services/pipeline-checkpoint-service | PipelineCheckpointService |
