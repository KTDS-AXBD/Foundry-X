---
code: FX-DSGN-S237
title: "Sprint 237 Design — F484 파이프라인 UI + F487 리포트 버그"
version: "1.0"
status: Active
category: design
created: 2026-04-09
updated: 2026-04-09
author: Claude
plan: "[[FX-PLAN-S237]]"
sprint: 237
f_items: [F484, F487]
---

# Sprint 237 Design: F484 + F487

## 1. 개요

| 항목 | 내용 |
|------|------|
| Sprint | 237 |
| F-items | F484 (파이프라인 UI 개선), F487 (리포트 500 에러) |
| 영향 패키지 | web (F484), api (F487) |
| 예상 변경 파일 | 3개 |

## 2. F487: 발굴 리포트 500 에러 수정 (P0)

### 2.1 근본 원인

`ax_discovery_reports` 테이블은 마이그레이션 `0098`에서 `item_id` 컬럼으로 정의되었으나, `team-reviews.ts`의 팀장 최종결정(decide) 엔드포인트에서 존재하지 않는 `biz_item_id` 컬럼을 참조한다.

**버그 위치**: `packages/api/src/modules/gate/routes/team-reviews.ts` 93~106줄

| 줄 | 현재 (버그) | 수정 후 |
|----|-------------|---------|
| 93 | `WHERE item_id = ? OR biz_item_id = ?` | `WHERE item_id = ?` |
| 94 | `.bind(itemId, itemId)` | `.bind(itemId)` |
| 102 | `INSERT ... (id, org_id, biz_item_id, ...)` | `INSERT ... (id, org_id, item_id, ...)` |

### 2.2 참고: discovery-report-service.ts

Plan에서 이 파일을 문제로 지목했지만, 실제 코드 분석 결과 `item_id`를 정확히 사용하고 있다. 수정 불필요.

### 2.3 검증 항목

| # | 항목 | 검증 방법 |
|---|------|-----------|
| D1 | decide 엔드포인트 SQL 문법 | typecheck 통과 + 코드 리뷰 |
| D2 | 기존 리포트 조회 정상 | discovery-report-service 미변경 확인 |
| D3 | INSERT 컬럼명 일치 | 0098 마이그레이션 스키마와 대조 |

## 3. F484: 파이프라인 진행률 UI 개선 (P1)

### 3.1 현재 상태

`PipelineProgressStepper.tsx` (95줄):
- 4단계 원형 노드 + 연결선
- 완료=초록, 현재=파란 ring, 미래=회색
- 진입 날짜 표시

### 3.2 개선 사항

| # | 개선 | 상세 |
|---|------|------|
| D4 | 현재 단계 pulse 애니메이션 | `animate-pulse` CSS 클래스 적용 |
| D5 | 상태 텍스트 라벨 | 완료="완료", 현재="진행 중", 미래="" |
| D6 | 전체 진행률 바 | 하단에 `(currentIdx / total * 100)%` 진행률 바 + 퍼센트 표시 |
| D7 | 노드 크기 차별화 | 현재 단계 노드 h-8 w-8 (나머지 h-7 w-7) |

### 3.3 컴포넌트 구조

```
<div.rounded-lg.border>
  <p>"파이프라인 진행률"</p>
  <div.flex>  ← 4단계 스테퍼 (기존 유지, 개선 적용)
    {VISIBLE_STAGES.map → node + connector}
  </div>
  <div.progress-bar>  ← 신규: 전체 진행률 바
    <div.bg-blue-500 style={width: N%} />
    <span>"N% 진행"</span>
  </div>
</div>
```

### 3.4 검증 항목

| # | 항목 | 검증 방법 |
|---|------|-----------|
| D8 | pulse 애니메이션 존재 | 렌더링 HTML에 `animate-pulse` 클래스 확인 |
| D9 | 상태 라벨 표시 | "진행 중" / "완료" 텍스트 존재 확인 |
| D10 | 진행률 바 렌더링 | 퍼센트 텍스트 존재 확인 |
| D11 | 기존 테스트 통과 | 4단계 라벨, 날짜, 제목 유지 확인 |

## 4. 변경 파일 매핑

| 파일 | F-item | 변경 내용 |
|------|--------|-----------|
| `packages/api/src/modules/gate/routes/team-reviews.ts` | F487 | biz_item_id → item_id (2곳) + bind 수정 |
| `packages/web/src/components/feature/discovery/PipelineProgressStepper.tsx` | F484 | pulse + 상태 라벨 + 진행률 바 + 노드 크기 |
| `packages/web/src/__tests__/pipeline-progress-stepper.test.tsx` | F484 | 신규 테스트 케이스 추가 (D8~D10) |

## 5. Worker 파일 매핑

충돌 없음 — F484(web 패키지)와 F487(api 패키지) 완전 독립. 병렬 구현 가능.
