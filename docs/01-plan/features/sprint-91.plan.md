---
code: FX-PLAN-S91
title: "Sprint 91 — BD 프로세스 진행 추적 + 사업성 신호등"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-DSGN-S91]], [[FX-PLAN-S90]]"
---

# Sprint 91: BD 프로세스 진행 추적 + 사업성 신호등

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F262 BD 프로세스 진행 추적 + 사업성 신호등 |
| Sprint | 91 |
| 기간 | 2026-03-31 |
| 우선순위 | P0 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 프로세스의 핵심 데이터(진행 단계, 사업성 신호등, Commit Gate, 산출물)가 분산된 API에 흩어져 있어 한눈에 파악 불가 |
| Solution | biz-item별 프로세스 진행 상태를 통합 조회하는 Progress Tracker API + 대시보드 UI 구축 |
| Function UX Effect | 파이프라인 대시보드에서 각 아이템의 현재 단계·신호등·게이트 상태를 즉시 확인, 병목 아이템 자동 탐지 |
| Core Value | BD 프로세스가 "실행 → 추적 → 의사결정"의 폐루프를 완성, 관리자 오버헤드 최소화 |

## 목표

1. **프로세스 진행 추적 API**: biz-item별 현재 단계(2-0~2-10) + 단계별 완료 여부 + 체류 기간 통합 조회
2. **사업성 신호등 대시보드**: Go/Pivot/Drop 누적 신호등 + Commit Gate 상태를 포트폴리오 수준으로 집계
3. **파이프라인 대시보드 연동**: 기존 F232 파이프라인 대시보드에 진행 추적 위젯 통합

## F-Items

| F-Item | 제목 | 우선순위 | 비고 |
|--------|------|---------|------|
| F262 | BD 프로세스 진행 추적 + 사업성 신호등 | P0 | F258+F261 선행. F232 파이프라인 + F239 의사결정 기반 |

## 기술 결정

### 1. 통합 Progress API: 기존 서비스 조합 (Aggregation Layer)

새로운 DB 테이블 없이 기존 서비스를 조합하는 전략:
- `PipelineService` → 현재 파이프라인 단계 (7단계)
- `ViabilityCheckpointService` → 사업성 체크포인트 + 신호등 (2-1~2-7)
- `DecisionService` → Go/Hold/Drop 의사결정 이력
- `BdArtifactService` → 단계별 산출물 현황
- `DiscoveryProgressService` → 9-criteria 진행률

**장점**: 새 마이그레이션 불필요, 기존 테스트 재활용
**단점**: 여러 서비스 조합으로 쿼리 N+1 가능성 → batch 조회로 해결

### 2. 진행 단계 매핑: Pipeline Stage + Discovery Stage 이중 추적

기존 시스템에 두 가지 진행 추적이 있어요:
- **Pipeline Stage** (7단계): REGISTERED → DISCOVERY → FORMALIZATION → REVIEW → DECISION → OFFERING → MVP
- **Discovery Stage** (11단계): 2-0 ~ 2-10 (BD 프로세스 내부)

F262는 Discovery Stage(2-0~2-10)을 중심으로, Pipeline Stage를 상위 컨텍스트로 사용해요.
Discovery Stage 진행은 `bd_artifacts` 테이블의 stageId로 추적 (산출물이 있으면 해당 단계 진행 중/완료).

### 3. Web UI: 기존 Discovery 페이지 확장

새 페이지 대신 기존 `/ax-bd/discovery` 페이지에 Progress Tracker 탭/섹션을 추가해요.
포트폴리오 수준 요약 + 아이템별 상세 진행 뷰를 제공해요.

## 구현 범위

### API (packages/api)
1. **신규 서비스**: `bd-process-tracker.ts` — 진행 상태 통합 조회
2. **신규 라우트**: `ax-bd-progress.ts` — Progress Tracker API (3~4 엔드포인트)
3. **신규 스키마**: `bd-progress.schema.ts` — 요청/응답 Zod 스키마
4. **테스트**: 서비스 + 라우트 테스트

### Web (packages/web)
1. **신규 컴포넌트**: `ProcessProgressTracker` — 아이템별 진행 카드
2. **신규 컴포넌트**: `TrafficLightSummary` — 포트폴리오 신호등 요약
3. **페이지 확장**: Discovery 페이지에 Progress 탭 추가
4. **테스트**: 컴포넌트 테스트

### 신규 마이그레이션: 불필요
기존 테이블로 충분 — `pipeline_stages`, `ax_viability_checkpoints`, `ax_commit_gates`, `decisions`, `bd_artifacts`

## 의존성

| 의존 대상 | 유형 | 설명 |
|-----------|------|------|
| F258 (BD 프로세스 가이드 UI) | 선행 ✅ | 프로세스 단계 정의 + UI 기반 |
| F261 (산출물 저장) | 선행 ✅ | bd_artifacts 테이블 + stageId 기반 진행 추적 |
| F232 (파이프라인 대시보드) | 기반 ✅ | pipeline_stages + PipelineService |
| F239 (의사결정 워크플로) | 기반 ✅ | decisions + DecisionService |
| F213 (사업성 평가) | 기반 ✅ | viability_checkpoints + TrafficLight |

## 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| N+1 쿼리 성능 | 중 | 중 | 포트폴리오 조회 시 batch SELECT로 해결 |
| Discovery Stage 매핑 복잡도 | 저 | 저 | bd_artifacts.stageId로 단순 추적 |
