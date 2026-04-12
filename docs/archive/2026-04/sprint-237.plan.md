---
code: FX-PLAN-S237
title: "Sprint 237 — F484 파이프라인 UI + F487 리포트 500 버그"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-09
updated: 2026-04-09
author: Claude
sprint: 237
f_items: [F484, F487]
parent-plan: "[[FX-PLAN-DISCOVERY-DETAIL-UX-V2]]"
---

# Sprint 237 Plan — F484 + F487

> **소급 작성** (세션 238): Sprint 237은 Design/Report 기반으로 이미 완료(PR #390, Match 100%). Plan 문서는 거버넌스 정합성을 위해 사후 작성.

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F484 파이프라인 진행률 UI 개선 + F487 발굴 리포트 500 에러 수정 |
| REQ | FX-REQ-476 (F484), FX-REQ-479 (F487) |
| Sprint | 237 |
| 우선순위 | F487 P0 / F484 P1 |
| 예상 파일 | 3개 (api 1 + web 2) |
| 결과 | PR #390, Match 100% |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | (1) 발굴 리포트 조회 시 500 에러 — `team-reviews.ts` decide 엔드포인트가 존재하지 않는 `biz_item_id` 컬럼 참조 (2) 파이프라인 스텝퍼가 현재 진행 단계를 시각적으로 구분하기 어려움 |
| Solution | (1) SQL 컬럼명 정정 `biz_item_id` → `item_id` (0098 마이그레이션 스키마 일치) (2) 스텝퍼 pulse 애니메이션 + 상태 라벨 + 진행률 강조 |
| Function UX Effect | 리포트 정상 조회 회복 + 파이프라인 현재 단계를 한눈에 인식 |
| Core Value | BD 운영 기반 안정성 + Discovery 상세 페이지 가독성 |

## 1. 배경

### 관련 선행 작업
- **F483** (Sprint 236): 웹 평가결과서 뷰어 완료 — Discovery 상세 페이지 기반 존재
- **F480** (Sprint 234): DiscoveryStageStepper 11단계 HITL 스텝퍼 리뉴얼

### 현재 문제
1. **F487 (P0)**: 팀장 최종결정(`/team-reviews/:itemId/decide`) 호출 시 SQL 에러 발생 → 프로덕션 500
2. **F484 (P1)**: `PipelineProgressStepper`가 원형 노드 + 색상 차이만으로 현재 단계를 표시 → 사용자 인지 부하

## 2. 구현 범위

### 2-1. F487: SQL 컬럼명 정정 (api)
- `packages/api/src/modules/gate/routes/team-reviews.ts` 93~106줄
- `WHERE item_id = ? OR biz_item_id = ?` → `WHERE item_id = ?`
- `.bind(itemId, itemId)` → `.bind(itemId)`
- `INSERT ... (id, org_id, biz_item_id, ...)` → `(id, org_id, item_id, ...)`

### 2-2. F484: 스텝퍼 시각 리디자인 (web)
- `packages/web/src/components/feature/discovery/PipelineProgressStepper.tsx`
- 현재 단계 pulse 애니메이션 추가
- 각 노드 하단 상태 라벨 ("완료" / "진행 중" / "대기")
- 전체 진행률 바 추가

## 3. 수정 파일 목록

| # | 패키지 | 파일 | 변경 |
|---|--------|------|------|
| 1 | api | `src/modules/gate/routes/team-reviews.ts` | SQL 컬럼명 정정 (3 위치) |
| 2 | web | `src/components/feature/discovery/PipelineProgressStepper.tsx` | pulse + 상태 라벨 + 진행률 |
| 3 | web | `src/components/feature/discovery/__tests__/PipelineProgressStepper.test.tsx` | 시각 요소 검증 추가 |

## 4. 테스트 전략

| 종류 | 대상 | 항목 |
|------|------|------|
| Integration | team-reviews API | decide 엔드포인트 정상 200 반환 |
| Component | PipelineProgressStepper | 현재 단계 강조 클래스 + aria-current |
| Manual | Discovery 상세 | fx.minu.best에서 decide + 스텝퍼 시각 확인 |

## 5. 참고

- Design: [[FX-DSGN-S237]]
- Report: [[FX-RPRT-S237]]
- Parent Plan: [[FX-PLAN-DISCOVERY-DETAIL-UX-V2]] §F484, §F487
- PR: #390 (merged, Match 100%)
