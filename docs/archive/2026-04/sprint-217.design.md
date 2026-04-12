---
code: FX-DSGN-S217
title: "Sprint 217 Design — F447+F448 파이프라인 상태 추적 + 단계 간 자동 전환"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-08
updated: 2026-04-08
author: Claude (autopilot)
sprint: 217
f_items: [F447, F448]
---

# Sprint 217 Design

## §1. 범위

| F-item | 제목 | 우선순위 |
|--------|------|----------|
| F447 | 파이프라인 상태 추적 — 스테퍼/타임라인 UI + 상태 집계 API | P1 |
| F448 | 단계 간 자동 전환 — 발굴 완료→형상화/기획서 자동 제안 + 원클릭 진행 | P1 |

**기존 재사용 API**: `GET /pipeline/items/:id`, `PATCH /pipeline/items/:id/stage`
**신규 마이그레이션**: 불필요

## §2. 아키텍처 결정

### 두 상태 시스템 매핑
```
biz_items.status     →  pipeline_stages.stage
─────────────────────────────────────────────
draft                →  REGISTERED
analyzing/analyzed   →  DISCOVERY
shaping              →  FORMALIZATION
done                 →  OFFERING / MVP
```

### 전환 트리거 로직 (F448)
```
발굴 완료 조건:
  item.status === "analyzed" AND pipelineStage === "DISCOVERY"
  → CTA: "형상화 단계로 이동" (PATCH stage=FORMALIZATION)

형상화/기획서 완료 조건:
  artifacts.businessPlan !== null AND pipelineStage === "FORMALIZATION"
  → CTA: "Offering 생성 시작" (PATCH stage=OFFERING)
```

## §3. 컴포넌트 설계

### §3.1 PipelineProgressStepper (F447)

**위치**: `packages/web/src/components/feature/discovery/PipelineProgressStepper.tsx`

**Props** (구현에서 단일 객체로 응집):
```typescript
interface PipelineProgressStepperProps {
  detail: PipelineItemDetail;  // currentStage + stageHistory를 포함하는 단일 객체
}
```

**표시 단계** (4개, 사용자 관련 단계만):
```
DISCOVERY → FORMALIZATION → OFFERING → MVP
  (발굴)      (형상화)       (Offering)  (MVP)
```
> REGISTERED/REVIEW/DECISION은 내부 단계로 표시 생략

**UI 구조**:
```
[●발굴 ✓]──[●형상화 현재]──[○Offering]──[○MVP]
  2026-03-01     2026-04-08
```
- 완료 단계: 초록 체크 + 진입 날짜
- 현재 단계: 파란 점 + 애니메이션 링
- 미진입 단계: 회색 원

### §3.2 PipelineTransitionCTA (F448)

**위치**: `packages/web/src/components/feature/discovery/PipelineTransitionCTA.tsx`

**Props**:
```typescript
interface PipelineTransitionCTAProps {
  bizItemId: string;
  bizStatus: string;                   // biz_items.status
  currentStage: PipelineStage;         // pipeline_stages.stage
  hasBusinessPlan: boolean;            // artifacts.businessPlan 존재 여부
  onTransitionComplete: () => void;    // 전환 완료 후 부모 갱신
}
```

**렌더링 로직**:
```
1. bizStatus==="analyzed" && currentStage==="DISCOVERY"
   → 발굴 완료 배너 + "형상화 단계로 이동" 버튼 (초록)

2. hasBusinessPlan && currentStage==="FORMALIZATION"
   → 기획서 완료 배너 + "Offering 단계로 이동" 버튼 (파란)

3. 그 외 → null (렌더링 없음)
```

**전환 API 호출**:
```typescript
await patchApi(`/pipeline/items/${bizItemId}/stage`, {
  stage: "FORMALIZATION",  // or "OFFERING"
  notes: "자동 전환: 발굴 완료"
});
```

## §4. api-client 추가 함수

**파일**: `packages/web/src/lib/api-client.ts`

```typescript
// §4.1 PipelineItemDetail 타입
export interface PipelineStageRecord {
  id: string;
  bizItemId: string;
  stage: string;
  enteredAt: string;
  exitedAt: string | null;
  enteredBy: string;
  notes: string | null;
}

export interface PipelineItemDetail {
  id: string;
  title: string;
  currentStage: string;
  stageEnteredAt: string;
  stageHistory: PipelineStageRecord[];
}

// §4.2 getPipelineItemDetail
export async function getPipelineItemDetail(bizItemId: string): Promise<PipelineItemDetail> {
  return fetchApi(`/pipeline/items/${bizItemId}`);
}

// §4.3 advancePipelineStage
export async function advancePipelineStage(
  bizItemId: string,
  stage: string,
  notes?: string,
): Promise<{ success: boolean }> {
  return patchApi(`/pipeline/items/${bizItemId}/stage`, { stage, notes });
}
```

## §5. discovery-detail.tsx 수정 명세

**파일**: `packages/web/src/routes/ax-bd/discovery-detail.tsx`

**변경 사항**:
1. `getPipelineItemDetail`, `advancePipelineStage` import 추가
2. state: `pipelineDetail: PipelineItemDetail | null` 추가
3. `loadData()` 내 `getPipelineItemDetail(id)` 병렬 호출 추가 (실패 시 null)
4. 헤더 바로 아래 (Tabs 위) `PipelineProgressStepper` 삽입
5. 발굴분석 탭 하단에 `PipelineTransitionCTA` 삽입

**위치 다이어그램**:
```
[헤더: 제목 + 상태 뱃지]
[PipelineProgressStepper]         ← F447 신규
[Tabs: 기본정보 / 발굴분석 / 형상화]
  [발굴분석 탭]
    ...AnalysisStepper
    ...DiscoveryCriteriaPanel
    [PipelineTransitionCTA]       ← F448 신규
    ...발굴 완료 리포트 링크
```

## §6. Worker 파일 매핑

단일 구현 (Worker 없음 — 4개 파일, 단순 UI 추가).

| # | 파일 | 변경 | LOC 추정 |
|---|------|------|----------|
| 1 | `packages/web/src/lib/api-client.ts` | 타입+함수 3개 추가 | +40 |
| 2 | `packages/web/src/components/feature/discovery/PipelineProgressStepper.tsx` | 신규 | ~70 |
| 3 | `packages/web/src/components/feature/discovery/PipelineTransitionCTA.tsx` | 신규 | ~80 |
| 4 | `packages/web/src/routes/ax-bd/discovery-detail.tsx` | 두 컴포넌트 통합 | +30 |

## §7. 테스트 계획

**단위 테스트 (vitest)**:
- `PipelineProgressStepper`: DISCOVERY/FORMALIZATION/OFFERING 단계별 렌더링 검증
- `PipelineTransitionCTA`: 3가지 조건(발굴완료/기획서완료/기타) 렌더링 검증

**E2E 스킵**: 파이프라인 단계 전환은 API 의존 → Design에 skip 사유 기록
> Skip 사유: `PATCH /pipeline/items/:id/stage` 호출 결과가 D1 remote에 의존하여 E2E mock 구성 복잡도 높음

## §8. Gap 분석 기준 (Analyze 단계용)

| 항목 | 확인 방법 |
|------|-----------|
| PipelineProgressStepper 렌더링 | discovery-detail 페이지에서 스테퍼 노출 여부 |
| 현재 단계 하이라이트 | currentStage에 파란 원 표시 |
| 전환 CTA 조건부 노출 | analyzed 상태 + DISCOVERY 단계에서만 노출 |
| 단계 전환 API 호출 | PATCH 응답 후 스테퍼 업데이트 |
| typecheck 통과 | tsc --noEmit 오류 없음 |
