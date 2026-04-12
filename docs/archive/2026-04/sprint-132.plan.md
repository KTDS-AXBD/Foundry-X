---
code: FX-PLAN-S132
title: "Sprint 132 — 형상화 자동 전환 + 파이프라인 상태 머신"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-DSGN-S132]]"
---

# Sprint 132: 형상화 자동 전환 + 파이프라인 상태 머신

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F312 (형상화 자동 전환 + Phase A~F 자동 실행) + F313 (파이프라인 상태 머신 + 실패/예외 관리) |
| Sprint | 132 |
| 우선순위 | P0 (fx-discovery-v2 M1 핵심) |
| 의존성 | Phase 12 완료 (F303~F308), 기존 shaping_runs/pipeline_stages 테이블 |
| PRD | docs/specs/fx-discovery-v2/prd-final.md |
| Design | docs/02-design/features/sprint-132.design.md |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 발굴(2-10) 완료 후 형상화로 수동 전환 필요, 파이프라인 상태 추적 없음 |
| Solution | 이벤트 기반 상태 머신 + 발굴→형상화 자동 트리거 + 에러 복구 옵션 |
| Function UX Effect | 2-10 완료 → Phase A 자동 시작, 실패 시 재시도/건너뛰기/중단 UI |
| Core Value | BD 파이프라인 E2E 자동화의 핵심 연결고리 구축 |

## 사전 조건

- [x] Phase 12 완료 (Sprint 128, F303~F308)
- [x] shaping_runs, shaping_phase_logs 테이블 존재 (0084_shaping_tables.sql)
- [x] BdSkillExecutor 서비스 존재 (F260)
- [x] ShapingService CRUD 존재 (F287)
- [x] PipelineService 파이프라인 단계 추적 존재 (F232)

## 작업 목록

### F312: 형상화 자동 전환 + Phase A~F 자동 실행

| # | 작업 | 파일 |
|---|------|------|
| 1 | D1 마이그레이션: discovery_pipeline_runs 테이블 | `api/src/db/migrations/0085_discovery_pipeline.sql` |
| 2 | Zod 스키마: 파이프라인 생성/조회/전환 | `api/src/schemas/discovery-pipeline.ts` |
| 3 | DiscoveryPipelineService: 파이프라인 오케스트레이션 | `api/src/services/discovery-pipeline-service.ts` |
| 4 | ShapingOrchestratorService: Phase A~F 자동 순차 실행 | `api/src/services/shaping-orchestrator-service.ts` |
| 5 | API 라우트: 파이프라인 CRUD + 트리거 EP | `api/src/routes/discovery-pipeline.ts` |
| 6 | Web: 형상화 전환 UI + 자동 트리거 토스트 | `web/src/components/feature/discovery/ShapingTriggerPanel.tsx` |
| 7 | Web: 파이프라인 진행 타임라인 컴포넌트 | `web/src/components/feature/discovery/PipelineTimeline.tsx` |

### F313: 파이프라인 상태 머신 + 실패/예외 관리

| # | 작업 | 파일 |
|---|------|------|
| 8 | 상태 머신 엔진: 상태 전이 + 이벤트 처리 | `api/src/services/pipeline-state-machine.ts` |
| 9 | D1 마이그레이션: pipeline_events 테이블 (이벤트 로그) | `0085_discovery_pipeline.sql` (통합) |
| 10 | 에러 핸들러: 재시도/건너뛰기/중단 로직 | `api/src/services/pipeline-error-handler.ts` |
| 11 | API 라우트: 이벤트 조회 + 에러 복구 EP | `api/src/routes/discovery-pipeline.ts` (확장) |
| 12 | Web: 에러 복구 UI (재시도/건너뛰기/중단 옵션) | `web/src/components/feature/discovery/PipelineErrorPanel.tsx` |
| 13 | Web: 파이프라인 상태 뱃지 + 실시간 갱신 | `web/src/components/feature/discovery/PipelineStatusBadge.tsx` |

### 테스트

| # | 작업 | 파일 |
|---|------|------|
| 14 | 상태 머신 단위 테스트 | `api/src/__tests__/pipeline-state-machine.test.ts` |
| 15 | DiscoveryPipelineService 테스트 | `api/src/__tests__/discovery-pipeline-service.test.ts` |
| 16 | ShapingOrchestratorService 테스트 | `api/src/__tests__/shaping-orchestrator-service.test.ts` |
| 17 | 파이프라인 라우트 통합 테스트 | `api/src/__tests__/discovery-pipeline-route.test.ts` |

## 기술 결정

### 1. 상태 머신 아키텍처
- **FSM(Finite State Machine)** 패턴 채택 — 상태 전이를 명시적으로 정의
- 상태: `IDLE` → `DISCOVERY_RUNNING` → `DISCOVERY_COMPLETE` → `SHAPING_RUNNING` → `SHAPING_COMPLETE` / `FAILED` / `PAUSED`
- 이벤트: `START`, `STEP_COMPLETE`, `STEP_FAILED`, `RETRY`, `SKIP`, `ABORT`, `TRIGGER_SHAPING`

### 2. 형상화 자동 트리거
- 발굴 2-10 (최종보고서) 완료 이벤트 → ShapingOrchestratorService.startAutoShaping() 호출
- 발굴 산출물(bd_artifacts)을 JSON으로 집계하여 형상화 입력으로 전달
- 기존 ShapingService.createRun()을 활용, mode='auto'로 생성

### 3. Phase A~F 순차 실행
- ShapingOrchestratorService가 Phase 순서대로 실행
- 각 Phase 완료 시 shaping_phase_logs 기록 + 다음 Phase 자동 시작
- Phase F(HITL 게이트) 도달 시 상태를 PAUSED로 전환, 사용자 승인 대기

### 4. 에러 복구 전략
- **재시도**: 동일 단계 재실행 (최대 3회)
- **건너뛰기**: 해당 단계를 SKIPPED로 표시, 다음 단계로 진행
- **중단**: 파이프라인 전체 ABORTED로 전환
- 모든 에러 이벤트는 pipeline_events 테이블에 기록

## 성공 기준 (MVP)

- [ ] POST /discovery-pipeline/runs → 파이프라인 생성 + 자동 시작
- [ ] 발굴 2-10 완료 → 형상화 Phase A 자동 트리거
- [ ] 상태 머신이 IDLE → DISCOVERY_RUNNING → ... → SHAPING_COMPLETE 전이 정상 동작
- [ ] 실패 시 재시도/건너뛰기/중단 API 동작
- [ ] Web UI에서 파이프라인 타임라인 + 에러 복구 패널 표시
- [ ] 테스트 4건 이상 통과

## 예상 산출물

| 유형 | 파일 수 | 설명 |
|------|---------|------|
| D1 마이그레이션 | 1 | 0085_discovery_pipeline.sql |
| API 스키마 | 1 | discovery-pipeline.ts (Zod) |
| API 서비스 | 4 | discovery-pipeline, shaping-orchestrator, pipeline-state-machine, pipeline-error-handler |
| API 라우트 | 1 | discovery-pipeline.ts (~10 EP) |
| Web 컴포넌트 | 4 | ShapingTriggerPanel, PipelineTimeline, PipelineErrorPanel, PipelineStatusBadge |
| 테스트 | 4 | 상태 머신 + 서비스 + 오케스트레이터 + 라우트 |
| **합계** | **15** | |
