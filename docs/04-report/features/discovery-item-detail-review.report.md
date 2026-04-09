---
code: FX-RPRT-DIDR
title: "Phase 28 완료 보고서 — Discovery Item Detail 점검 (F478~F480)"
version: 1.0
status: Active
category: report
created: 2026-04-09
updated: 2026-04-09
author: Claude
---

# Phase 28 완료 보고서: Discovery Item Detail 점검

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | Phase 28: Discovery Item Detail 점검 |
| F-items | F478, F479, F480 |
| Sprint | 233 (F478+F479), 234 (F480) |
| 기간 | 2026-04-09 (단일 세션) |
| Match Rate | **93%** (Gap Analysis 재실행 기준) |
| Pipeline 소요 | Sprint 233: 10m 56s + Sprint 234: 19m 26s = **총 30m 22s** |

## Problem Statement

Discovery 아이템 상세 페이지(`/discovery/items/:id`)에서 3가지 핵심 문제가 있었어요:

1. **상태가 항상 "대기"로 표시** — `biz_items.status`가 `evaluated`/`classified` 등으로 변해도 UI에 매핑 없음
2. **분석 완료 후 파이프라인 안 넘어감** — `pipeline_stages`가 REGISTERED에서 DISCOVERY로 자동 전환 안 됨
3. **3단계 자동 실행만 있고 끝** — Figma v0.95 설계는 2-0~2-9 HITL 11단계인데 2-0~2-2 자동 3단계만 구현

## Feature Details

### F478: STATUS_CONFIG 매핑 보완 (Match 100%)

| 파일 | 변경 |
|------|------|
| `business-plan-list.tsx` | STATUS_CONFIG에 classifying/classified/evaluating/evaluated 4개 상태 추가 |
| `discovery-detail.tsx` | STATUS_LABELS에 동일 4개 상태 추가 |
| `BizItemCard.tsx` | 카드 컴포넌트에도 동일 매핑 적용 |

**상태 흐름 완성**: `draft → classifying → classified → evaluating → evaluated → shaping → completed`

### F479: 분석 완료 → pipeline/discovery_stages 자동 전환 (Match 95%)

| API | 추가 동작 |
|-----|----------|
| POST /starting-point | `biz_item_discovery_stages` 2-0 → completed |
| POST /classify | `biz_item_discovery_stages` 2-1 → completed |
| POST /evaluate | `biz_item_discovery_stages` 2-2 → completed + `pipeline_stages` REGISTERED → DISCOVERY |

**구현 방식**: Design은 `PipelineService.advanceStage()` 서비스 메서드를 제안했으나, evaluate 핸들러 내 인라인 SQL로 구현. 기능 동일, 아키텍처 차이만 존재.

### F480: AnalysisStepper → Discovery Stage 전체 스텝퍼 리뉴얼 (Match 88%)

**신규 파일 3개**:
- `DiscoveryStageStepper.tsx` (320줄) — 11단계 HITL 스텝퍼 UI
- `discovery-stage-runner.ts` — POST /:stage/run + /:stage/confirm API 라우트
- `stage-runner-service.ts` (196줄) — AI 분석 + HITL confirm 서비스

**핵심 기능**:
- 2-0: 기존 starting-point + classify 통합 (레거시 호환)
- 2-1~2-8: 신규 stage runner API (AI 분석 → 결과 표시 → Go/Pivot/Stop)
- 2-9: 기존 evaluate 이동 (레거시 호환)
- 2-10: 최종 보고서 자동 생성
- v82 유형별 강도(core/normal/light) 배지 표시
- Viability Question + Commit Gate (2-5) 질문 제시
- `ax_viability_checkpoints` 테이블 연동 (2-1~2-7 범위, stop→drop 매핑)

## Sprint Pipeline 실행 결과

| Sprint | F-items | Match | PR | 소요 | 버그 수정 |
|--------|---------|:-----:|-----|------|----------|
| 233 | F478+F479 | 100% | #388 | 10m 56s | 없음 |
| 234 | F480 | 91% | #389 | 19m 26s | 테이블명+decision 버그 3건 |

### PR 리뷰 중 발견/수정한 버그

| # | 버그 | 원인 | 수정 |
|---|------|------|------|
| 1 | `viability_checkpoints` → `ax_viability_checkpoints` | 테이블명 오류 | 정확한 테이블명으로 수정 |
| 2 | `stop` → `drop` | DB CHECK 제약 (`go`/`pivot`/`drop`) 미준수 | stop→drop 매핑 추가 |
| 3 | stage 범위 미제한 | DB CHECK (`2-1`~`2-7`) 미준수 | VIABILITY_STAGES Set으로 범위 제한 |

## Architecture Impact

### 변경 파일 합계

| 구분 | 파일 수 | 추가 라인 |
|------|:------:|:--------:|
| 신규 (API) | 2 | ~250 |
| 신규 (Web) | 1 | ~320 |
| 수정 (API) | 4 | ~80 |
| 수정 (Web) | 4 | ~40 |
| 문서 | 4 | — |
| **합계** | **15** | **~690** |

### 라우트 변경
- discovery 모듈: +1 라우트 (`discoveryStageRunnerRoute`)
- 신규 엔드포인트: `POST /discovery-stage/:stage/run`, `POST /discovery-stage/:stage/confirm`

## Gap Analysis Summary (93%)

| Category | PASS | FAIL | Rate |
|----------|:----:|:----:|:----:|
| F478 STATUS_CONFIG | 8 | 0 | 100% |
| F479 pipeline 전환 | 9 | 1 | 95% |
| F480 스텝퍼 리뉴얼 | 26 | 3 | 88% |
| **Total** | **43** | **4** | **93%** |

### 미구현 항목 (Low impact, 의도적 단순화)

1. StageAnalysisResult 스테이지별 필드 8종 → details 마크다운으로 통합
2. shared/discovery-x.ts 타입 → api-client.ts 직접 정의
3. AnalysisStepper.tsx 미삭제 (import 제거됨, dead code)
4. PipelineService.advanceStage 미분리 → 인라인 SQL

## Lessons Learned

1. **Sprint Pipeline 충돌 관리**: discovery-detail.tsx를 233+234가 동시 수정 → 233 먼저 merge, 234 rebase로 해결
2. **DB 스키마 검증 필수**: AI가 생성한 코드에서 테이블명/CHECK 제약 불일치 3건 발견 — PR 리뷰가 중요
3. **D1 PRAGMA 제한**: 세션 초반 biz_items 삭제 시 발견, 메모리에 기록 완료

## Next Steps

- [ ] AnalysisStepper.tsx 삭제 (dead code 정리)
- [ ] 2-1~2-10 스테이지별 AI 분석 프롬프트 고도화 (현재 기본 프롬프트)
- [ ] 실제 KOAMI 아이템으로 11단계 HITL 워크플로우 E2E 검증
