---
code: FX-RPRT-S233
title: "Sprint 233 완료 보고서 — F478~F479 Discovery Item Detail 점검"
version: "1.0"
status: Active
category: report
created: 2026-04-09
updated: 2026-04-09
author: Claude (Sprint Autopilot)
---

# Sprint 233 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F478 STATUS_CONFIG 매핑 보완 + F479 분석 완료 → pipeline/discovery_stages 자동 전환 |
| Sprint | 233 |
| Phase | 28: Discovery Item Detail 점검 |
| Match Rate | **100%** (10/10 PASS + 2건 추가 보완) |
| 수정 파일 | 4개 |
| 테스트 | API 23 pass + Web 372 pass (전체 통과) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | biz_items.status가 classifying/classified/evaluating/evaluated로 변해도 UI에서 "대기"로만 표시됨. evaluate 완료 후 pipeline/discovery_stages가 갱신되지 않음 |
| Solution | STATUS_CONFIG에 누락 상태 4종 추가 + API 핸들러에서 discovery_stages/pipeline 자동 동기화 |
| Function UX Effect | 사용자가 아이템의 정확한 분석 진행 상태를 확인 가능. 평가 완료 시 파이프라인이 자동으로 DISCOVERY 단계로 전환 |
| Core Value | 발굴 프로세스 상태 추적의 정합성 확보 — "분석했는데 아무 변화 없음" 문제 해소 |

## F478: STATUS_CONFIG 매핑 보완

### 변경 사항
- `business-plan-list.tsx`: STATUS_CONFIG에 classifying/classified/evaluating/evaluated 4개 상태 추가
- `discovery-detail.tsx`: STATUS_LABELS에 동일 4개 상태 추가
- `BizItemCard.tsx`: STATUS_CONFIG에 동일 4개 상태 추가 (Design 미언급, 추가 발견)

### 상태 흐름
```
draft → classifying → classified → evaluating → evaluated → shaping → completed/done
(대기)   (분류 중)     (분류 완료)   (평가 중)     (평가 완료)   (형상화 중)  (완료)
```

## F479: 분석 완료 → pipeline/discovery_stages 자동 전환

### 변경 사항
- `biz-items.ts` POST /starting-point: 완료 시 discovery_stages 2-0 → completed
- `biz-items.ts` POST /classify: 완료 시 discovery_stages 2-1 → completed
- `biz-items.ts` POST /evaluate: 완료 시 discovery_stages 2-2 → completed + pipeline REGISTERED → DISCOVERY 전환
- 중복 전환 방지: 이미 DISCOVERY 이상이면 pipeline 전환 skip

### 구현 결정
- Design에서는 `PipelineService.advanceStage`를 신규 구현하라고 했으나, 기존 `modules/launch/services/pipeline-service.ts`에 이미 존재 → 재사용
- `DiscoveryStageService.updateStage()`도 기존 서비스 활용
- try-catch로 감싸서 마이그레이션 미적용 환경에서도 안전하게 동작

## Gap Analysis

| # | 항목 | 결과 |
|---|------|------|
| 1 | business-plan-list STATUS_CONFIG 4개 추가 | ✅ PASS |
| 2 | discovery-detail STATUS_LABELS 4개 추가 | ✅ PASS |
| 3 | BizItemCard STATUS_CONFIG 동기화 | ✅ PASS+ (추가) |
| 4 | starting-point → 2-0 completed | ✅ PASS |
| 5 | classify → 2-1 completed | ✅ PASS |
| 6 | evaluate → 2-2 completed | ✅ PASS |
| 7 | evaluate → pipeline REGISTERED→DISCOVERY | ✅ PASS |
| 8 | PipelineService.advanceStage 활용 | ✅ PASS |
| 9 | 중복 전환 방지 | ✅ PASS+ (추가) |
| 10 | 프론트엔드 추가 수정 불필요 | ✅ PASS |

**Match Rate: 100%**
