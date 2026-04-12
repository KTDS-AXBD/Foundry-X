---
code: FX-ANLS-S132
title: "Sprint 132 Gap Analysis — 형상화 자동 전환 + 파이프라인 상태 머신"
version: 1.0
status: Active
category: ANLS
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
references: "[[FX-DSGN-S132]], [[FX-PLAN-S132]]"
---

# Sprint 132 Gap Analysis

## Match Rate: 100%

| Category | Score | Status |
|----------|:-----:|:------:|
| D1 Schema | 100% | PASS |
| Zod Schema | 100% | PASS |
| Service Methods | 100% | PASS |
| API Endpoints (10 EP) | 100% | PASS |
| Web Components (4) | 100% | PASS |
| Tests (44 tests) | 100% | PASS |
| Integration (app.ts, mock-d1) | 100% | PASS |
| **Overall** | **100%** | **PASS** |

## File Verification (15/15)

| # | File | Status |
|---|------|:------:|
| 1 | `0090_discovery_pipeline.sql` | PASS |
| 2 | `schemas/discovery-pipeline.ts` | PASS |
| 3 | `services/pipeline-state-machine.ts` | PASS |
| 4 | `services/pipeline-error-handler.ts` | PASS |
| 5 | `services/discovery-pipeline-service.ts` | PASS |
| 6 | `services/shaping-orchestrator-service.ts` | PASS |
| 7 | `routes/discovery-pipeline.ts` (10 EP) | PASS |
| 8 | `PipelineStatusBadge.tsx` | PASS |
| 9 | `PipelineTimeline.tsx` | PASS |
| 10 | `ShapingTriggerPanel.tsx` | PASS |
| 11 | `PipelineErrorPanel.tsx` | PASS |
| 12 | `pipeline-state-machine.test.ts` (16 tests) | PASS |
| 13 | `discovery-pipeline-service.test.ts` (11 tests) | PASS |
| 14 | `shaping-orchestrator-service.test.ts` (6 tests) | PASS |
| 15 | `discovery-pipeline-route.test.ts` (11 tests) | PASS |

## Notes
- D1 migration 번호: Design `0085` → 구현 `0090` (기존 중복 회피)
- `getValidActions` → `getValidEvents` 네이밍 개선
- 추가 편의 메서드: startRun, pauseRun, resumeRun, triggerShaping
- mock-d1.ts에 `bd_artifacts` + `discovery_pipeline_runs` + `pipeline_events` 추가
