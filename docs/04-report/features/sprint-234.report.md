---
code: FX-RPRT-S234
title: "Sprint 234 완료 보고서 — F478~F480 Discovery Item Detail 점검"
version: 1.0
status: Active
category: report
created: 2026-04-09
updated: 2026-04-09
author: Claude
---

# Sprint 234 완료 보고서

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | Phase 28: Discovery Item Detail 점검 |
| F-items | F478, F479, F480 |
| Sprint | 234 |
| 기간 | 2026-04-09 (단일 세션) |
| Match Rate | **91%** (39/43 PASS) |

### Results Summary

| 지표 | 값 |
|------|-----|
| Match Rate | 91% |
| PASS 항목 | 39/43 |
| FAIL 항목 | 4 (Low 3, Medium 1) |
| 변경 파일 | 10 (수정 7, 신규 3) |
| 신규 API | 2개 엔드포인트 |
| 테스트 | 11/11 기존 테스트 통과 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | biz_items의 classifying/classified/evaluating/evaluated 4개 상태가 UI에 "—"으로 표시되고, 분석 완료 시 discovery_stages/pipeline_stages가 갱신되지 않아 진행률이 0%로 멈춤 |
| **Solution** | STATUS_CONFIG 매핑 8개 상태 완성 + API 핸들러에 stage/pipeline 자동 동기화 추가 + 3단계→11단계 HITL 스텝퍼로 전면 리뉴얼 |
| **Function UX Effect** | 사용자가 각 발굴 단계를 순차적으로 AI 분석→결과 확인→Go/Pivot/Stop 판단하는 HITL 워크플로우 완성. v82 5유형별 분석 강도 자동 반영 |
| **Core Value** | AX BD 발굴 프로세스 v8.2의 11단계가 UI에서 실제로 실행 가능해짐. 사업성 체크포인트(Viability Question) + Commit Gate가 스텝퍼에 통합 |

## Feature Details

### F478: STATUS_CONFIG 매핑 보완

- **변경**: `business-plan-list.tsx`, `discovery-detail.tsx`
- **내용**: classifying/classified/evaluating/evaluated 4개 상태의 라벨 + 색상 매핑 추가
- **Match**: 100% (7/7)

### F479: 분석 완료 → discovery_stages + pipeline 자동 전환

- **변경**: `biz-items.ts`에 DiscoveryStageService 연동
- **내용**: starting-point→2-0, classify→2-1, evaluate→2-2 자동 완료 + pipeline REGISTERED→DISCOVERY 전환
- **Match**: 89% (8/9) — PipelineService.advanceStage 메서드 미추출 (인라인 SQL로 대체, 기능 동일)

### F480: DiscoveryStageStepper 전체 리뉴얼

- **신규**: `stage-runner-service.ts`, `discovery-stage-runner.ts`, `DiscoveryStageStepper.tsx`
- **내용**: 3단계 자동→11단계 HITL 스텝퍼. 2-1~2-8 AI 분석 + Go/Pivot/Stop 확인. v82 유형별 강도 + Viability Question + Commit Gate
- **Match**: 89% (24/27) — StageAnalysisResult 스테이지별 필드 미구현 + shared 타입 미통합

## Architecture Impact

### 신규 파일
1. `packages/api/src/core/discovery/services/stage-runner-service.ts` — AI 분석 + HITL 확인 서비스
2. `packages/api/src/core/discovery/routes/discovery-stage-runner.ts` — 2개 엔드포인트
3. `packages/web/src/components/feature/discovery/DiscoveryStageStepper.tsx` — 11단계 HITL 스텝퍼

### 라우트 변경
- discovery 모듈: 12 routes → 13 routes (+discoveryStageRunnerRoute)

### 기존 코드 영향
- `AnalysisStepper.tsx`: discovery-detail에서 import 제거됨 (컴포넌트 파일은 잔존, 다른 곳에서 사용 가능)
- `biz-items.ts`: starting-point/classify/evaluate 3개 핸들러에 stage 동기화 추가 (기존 동작 유지)

## Known Gaps (향후 개선)

1. **StageAnalysisResult 확장**: 스테이지별 구조화된 데이터(references, marketData 등) 필요 시 추가
2. **shared 타입 통합**: api-client.ts와 service의 중복 타입을 shared/discovery-x.ts로 이동
3. **PipelineService.advanceStage**: 다른 라우트에서도 pipeline 전환이 필요하면 메서드 추출
