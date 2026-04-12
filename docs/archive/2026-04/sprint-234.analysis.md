---
code: FX-ANLS-S234
title: "Sprint 234 Gap Analysis — F478~F480 Discovery Item Detail 점검"
version: 1.0
status: Active
category: analysis
created: 2026-04-09
updated: 2026-04-09
author: Claude
---

# Gap Analysis: Sprint 234 (F478~F480)

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F478~F480 Discovery Item Detail 점검 |
| Design | `docs/02-design/features/discovery-item-detail-review.design.md` |
| Sprint | 234 |
| Match Rate | **91%** (39/43 PASS) |
| 판정 | ✅ PASS (≥ 90% threshold) |

## Overall Scores

| Category | PASS | FAIL | Total | Rate |
|----------|:----:|:----:|:-----:|:----:|
| F478 STATUS_CONFIG 매핑 | 7 | 0 | 7 | 100% |
| F479 분석 완료→단계 전환 | 8 | 1 | 9 | 89% |
| F480 DiscoveryStageStepper | 24 | 3 | 27 | 89% |
| **Total** | **39** | **4** | **43** | **91%** |

## F478: STATUS_CONFIG 매핑 보완 (7/7 PASS)

| # | Design 항목 | 구현 위치 | 상태 |
|---|------------|----------|:----:|
| 1 | business-plan-list.tsx STATUS_CONFIG에 classifying 추가 | line 17 | ✅ |
| 2 | business-plan-list.tsx STATUS_CONFIG에 classified 추가 | line 18 | ✅ |
| 3 | business-plan-list.tsx STATUS_CONFIG에 evaluating 추가 | line 21 | ✅ |
| 4 | business-plan-list.tsx STATUS_CONFIG에 evaluated 추가 | line 22 | ✅ |
| 5 | discovery-detail.tsx STATUS_LABELS에 classifying/classified 추가 | line 51 | ✅ |
| 6 | discovery-detail.tsx STATUS_LABELS에 evaluating/evaluated 추가 | line 53 | ✅ |
| 7 | discovery-detail.tsx Badge 색상이 새 상태 반영 | line 171-181 | ✅ |

## F479: 분석 완료 → 단계 전환 (8/9)

| # | Design 항목 | 구현 위치 | 상태 | 비고 |
|---|------------|----------|:----:|------|
| 1 | starting-point 완료 시 2-0 completed | biz-items.ts | ✅ | |
| 2 | classify 완료 시 2-1 completed | biz-items.ts | ✅ | |
| 3 | evaluate 완료 시 2-2 completed | biz-items.ts | ✅ | |
| 4 | evaluate 완료 시 pipeline REGISTERED→DISCOVERY | biz-items.ts | ✅ | 인라인 SQL |
| 5 | DiscoveryStageService import | biz-items.ts | ✅ | |
| 6 | try-catch 테이블 미존재 대응 | biz-items.ts | ✅ | |
| 7 | PipelineService.advanceStage 메서드 | — | ❌ | 인라인 SQL로 대체 |
| 8 | pipeline_stages SQL 동작 일치 | biz-items.ts | ✅ | |
| 9 | 프론트엔드 추가 수정 불필요 | — | ✅ | |

## F480: DiscoveryStageStepper 리뉴얼 (24/27)

### API

| # | Design 항목 | 상태 |
|---|------------|:----:|
| 1 | discovery-stage-runner.ts 신규 라우트 | ✅ |
| 2 | POST /:stage/run | ✅ |
| 3 | POST /:stage/confirm | ✅ |
| 4 | run Request: { feedback? } | ✅ |
| 5 | confirm Request: { viabilityAnswer, feedback? } | ✅ |
| 6 | run Response 전체 필드 | ✅ |
| 7 | confirm Response { ok, nextStage } | ✅ |
| 8 | Zod 스키마 검증 | ✅ |
| 9 | StageAnalysisResult 공통 3필드 | ✅ |
| 10 | StageAnalysisResult 스테이지별 필드 | ❌ |

### 프론트엔드

| # | Design 항목 | 상태 |
|---|------------|:----:|
| 11 | AnalysisStepper→DiscoveryStageStepper 교체 | ✅ |
| 12 | 11단계 표시 | ✅ |
| 13 | 완료 개수/전체 개수 | ✅ |
| 14 | HITL 패널 (Go/Pivot/Stop) | ✅ |
| 15 | Viability Question 표시 | ✅ |
| 16 | Commit Gate 질문 (2-5) | ✅ |
| 17 | 피드백 textarea | ✅ |
| 18 | 순차 진행 제어 | ✅ |
| 19 | discoveryType props | ✅ |
| 20 | intensity ���지 | ✅ |
| 21 | 2-0 레거시 통합 | ✅ |
| 22 | 2-9 레거시 evaluate | ✅ |

### api-client + 라우트 등록

| # | Design 항목 | 상태 |
|---|------------|:----:|
| 23 | getDiscoveryProgress() | ✅ |
| 24 | runDiscoveryStage() | ✅ |
| 25 | confirmDiscoveryStage() | ✅ |
| 26 | 라우트 export + app.ts 마운트 | ✅ |
| 27 | shared/discovery-x.ts 타입 추가 | ❌ |

## FAIL 항목 상세

| # | 항목 | 영향도 | 설명 |
|---|------|:------:|------|
| 1 | PipelineService.advanceStage | Low | 별도 메서드 대신 인라인 SQL. 기능 동일 |
| 2 | StageAnalysisResult 스테이지별 필드 | Medium | 8개 optional 필드 미구현. details 마크다운으로 대체 |
| 3 | shared 타입 통합 | Low | api-client.ts / stage-runner-service.ts에 로컬 정의 |

## Added (Design에 없는 구현)

| # | 항목 | 설명 |
|---|------|------|
| 1 | commitGateQuestions in StageRunResult | 2-5 Commit Gate 질문을 run Response에 포함 (개��) |
