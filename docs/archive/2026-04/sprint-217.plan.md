---
code: FX-PLAN-S217
title: "Sprint 217 Plan — F447+F448 파이프라인 상태 추적 + 단계 간 자동 전환"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-08
updated: 2026-04-08
author: Claude (autopilot)
sprint: 217
f_items: [F447, F448]
---

# Sprint 217 Plan

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 217 |
| F-items | F447 (파이프라인 상태 추적), F448 (단계 간 자동 전환) |
| Phase | Phase 25 — Discovery Pipeline v2 |
| 목표 | 아이템 상세 페이지에서 온보딩→발굴→형상화→Offering 전체 진행률 시각화 + 발굴/형상화 완료 시 원클릭 단계 전환 CTA |
| 예상 범위 | Web 2개 컴포넌트 + 1개 API 엔드포인트 (확장) |

## 현황 분석

### 기존 파이프라인 인프라
- **pipeline_stages 테이블** (0066_pipeline_stages.sql): REGISTERED→DISCOVERY→FORMALIZATION→REVIEW→DECISION→OFFERING→MVP
- **PipelineService** (`packages/api/src/modules/launch/services/pipeline-service.ts`): `getItemDetail()` 단계 이력 조회 완비
- **API 엔드포인트**: `GET /pipeline/items/:id`, `PATCH /pipeline/items/:id/stage` 이미 구현됨
- **아이템 상세 페이지** (`/discovery/items/:id`): 3탭(기본정보/발굴분석/형상화) 구조

### 구현 갭
- F447: 아이템 상세에서 파이프라인 단계를 **시각적으로 표시하는 UI가 없음** (pipeline dashboard에만 존재)
- F448: 발굴 완료(analyzed) 시 FORMALIZATION 전환 CTA 없음, 형상화 완료 시 OFFERING 전환 CTA 없음

## 구현 계획

### F447 — 파이프라인 상태 추적 (스테퍼/타임라인 UI)

**목표**: 아이템 상세 페이지 헤더 영역에 파이프라인 진행률 스테퍼를 추가

**필요 작업**:
1. `packages/web/src/lib/api-client.ts` — `getPipelineItemDetail(bizItemId)` 함수 추가
2. `packages/web/src/components/feature/discovery/PipelineProgressStepper.tsx` — 신규 컴포넌트
   - 4단계 시각화: 발굴(DISCOVERY) → 형상화(FORMALIZATION) → Offering(OFFERING) → MVP(MVP)
   - 현재 단계 하이라이트 + 완료 단계 체크마크
   - 각 단계 진입 날짜 표시
3. `packages/web/src/routes/ax-bd/discovery-detail.tsx` — 헤더 아래 PipelineProgressStepper 삽입

**API 재사용**: `GET /pipeline/items/:id` (기존 엔드포인트, 신규 API 불필요)

### F448 — 단계 간 자동 전환 (CTA 버튼)

**목표**: 발굴 완료 → 형상화 CTA, 형상화 완료 → Offering CTA 원클릭 진행

**필요 작업**:
1. `packages/web/src/components/feature/discovery/PipelineTransitionCTA.tsx` — 신규 컴포넌트
   - props: `currentBizStatus`, `currentPipelineStage`, `bizItemId`, `onTransition`
   - 발굴 완료 조건: `item.status === "analyzed"` AND `pipelineStage === "DISCOVERY"`
   - 형상화 완료 조건: `item.status === "shaping" | "done"` AND `pipelineStage === "FORMALIZATION"`
   - Offering 제안 조건: `artifacts.businessPlan !== null` AND `pipelineStage === "FORMALIZATION"`
2. `packages/web/src/routes/ax-bd/discovery-detail.tsx` — PipelineTransitionCTA 통합
3. `packages/web/src/lib/api-client.ts` — `advancePipelineStage(bizItemId, stage)` 함수 추가

**API 재사용**: `PATCH /pipeline/items/:id/stage` (기존 엔드포인트)

## 파일 변경 목록

| 파일 | 변경 유형 | 작업 |
|------|-----------|------|
| `packages/web/src/lib/api-client.ts` | 수정 | getPipelineItemDetail, advancePipelineStage 함수 추가 |
| `packages/web/src/components/feature/discovery/PipelineProgressStepper.tsx` | 신규 | F447 스테퍼 컴포넌트 |
| `packages/web/src/components/feature/discovery/PipelineTransitionCTA.tsx` | 신규 | F448 자동 전환 CTA 컴포넌트 |
| `packages/web/src/routes/ax-bd/discovery-detail.tsx` | 수정 | 두 컴포넌트 통합 |

## 의존성

- F447 선행 없음 (독립 구현 가능)
- F448 ← F447 (PipelineProgressStepper와 상태 데이터 공유)
- 기존 `PipelineService`, `pipeline_stages` 테이블 활용 (신규 마이그레이션 불필요)

## 성공 기준

- [ ] 아이템 상세 페이지에 4단계 파이프라인 스테퍼 표시
- [ ] 현재 단계 + 진입 날짜 표시
- [ ] 발굴 완료 시 "형상화 시작" CTA 노출
- [ ] 형상화 완료 시 "Offering 생성" CTA 노출
- [ ] 단계 전환 후 스테퍼 즉시 업데이트
- [ ] typecheck + test 통과
