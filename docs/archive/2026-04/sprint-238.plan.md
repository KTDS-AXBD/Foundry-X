---
code: FX-PLAN-S238
title: "Sprint 238 — F485 HITL 피드백 루프 + F486 9기준 체크리스트 UX"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-09
updated: 2026-04-09
author: Claude
sprint: 238
f_items: [F485, F486]
parent-plan: "[[FX-PLAN-DISCOVERY-DETAIL-UX-V2]]"
---

# Sprint 238 Plan — F485 + F486

> **소급 작성** (세션 238): Sprint 238은 Design/Report 기반으로 이미 완료(PR #392, Match 100%). Plan 문서는 거버넌스 정합성을 위해 사후 작성.

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F485 발굴 분석 결과 표시 + HITL 피드백 루프, F486 9기준 체크리스트 UX 정리 |
| REQ | FX-REQ-477 (F485), FX-REQ-478 (F486) |
| Sprint | 238 |
| 우선순위 | F485 P1 / F486 P2 |
| 예상 파일 | ~6개 (api 2 + web 3 + test 1) |
| 결과 | PR #392, Match 100% |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | (1) 완료된 발굴 단계의 AI 분석 결과를 다시 볼 수 없고, 피드백 반영 재실행 경로가 없음 (2) 9기준 체크리스트가 AI/사용자 역할 구분 없이 나열되어 무엇을 해야 할지 불명확 |
| Solution | (1) bd_artifacts에 단계 결과 영속화 + 완료 단계 펼쳐보기 + "피드백 재실행" 버튼 (2) 기준별 가이드 텍스트 + AI 자동 평가 연동 + 역할 배지 |
| Function UX Effect | BD 담당자가 AI 판단을 이해·수정하고 근거를 남길 수 있는 HITL 루프 완성. 9기준 작성 시 혼란 제거 |
| Core Value | Discovery 단계의 투명성·재실행성 + 가이드 기반 체크리스트 UX |

## 1. 배경

### 관련 선행 작업
- **F480** (Sprint 234): DiscoveryStageStepper 11단계 HITL 스텝퍼 리뉴얼 (결과 영속화 부재)
- **F482** (Sprint 235): sync-artifacts API — bd_artifacts 동기화 파이프라인 존재

### 현재 문제
1. **F485 (P1)**: `DiscoveryStageStepper`가 `stageResult` state에만 AI 결과 저장 → 페이지 이동/다른 단계 실행 시 소실. 완료 단계 결과 재조회 불가
2. **F486 (P2)**: `DiscoveryCriteriaPanel`이 9기준 이름·조건만 나열, 역할 구분 없음

## 2. 구현 범위

### 2-1. F485: 결과 영속화 + HITL 루프

**API (api)**:
- `GET /biz-items/:id/discovery-stage/:stage/result` — 단계별 결과 조회 엔드포인트
- `stage-runner-service.ts` 수정 — 실행 완료 시 bd_artifacts에 결과 저장

**Web (web)**:
- `DiscoveryStageStepper.tsx` — 완료 단계 클릭 시 결과 펼쳐보기
- 각 완료 단계에 "피드백 재실행" 버튼 추가
- 피드백 textarea + 재실행 → 결과 갱신 → 확인 플로우

### 2-2. F486: 9기준 체크리스트 UX 정리

**Web (web)**:
- `DiscoveryCriteriaPanel.tsx` 개선
- 각 기준에 역할 배지 (AI 자동 / 사용자 확인)
- 가이드 툴팁 또는 설명 텍스트 추가
- AI 분석 단계 완료 시 관련 기준 자동 체크

## 3. 수정 파일 목록

| # | 패키지 | 파일 | 변경 |
|---|--------|------|------|
| 1 | api | `src/modules/.../routes/biz-items.ts` (또는 해당 라우트) | 단계 결과 조회 엔드포인트 |
| 2 | api | `src/modules/.../services/stage-runner-service.ts` | bd_artifacts 저장 로직 |
| 3 | web | `src/components/feature/discovery/DiscoveryStageStepper.tsx` | 결과 펼쳐보기 + 재실행 |
| 4 | web | `src/components/feature/discovery/DiscoveryCriteriaPanel.tsx` | 역할 배지 + 가이드 |
| 5 | web | `src/lib/api-client.ts` | fetchStageResult + rerunStage 함수 |
| 6 | api/web | 테스트 추가 | 엔드포인트 + 컴포넌트 |

## 4. 테스트 전략

| 종류 | 대상 | 항목 |
|------|------|------|
| Integration | stage-result API | 완료 단계 결과 반환, 미완료 404 |
| Component | DiscoveryStageStepper | 완료 단계 펼침 + 피드백 재실행 버튼 |
| Component | DiscoveryCriteriaPanel | 역할 배지 + 가이드 렌더링 |
| Manual | Discovery 상세 | HITL 루프 전체 플로우 (실행→결과→피드백→재실행) |

## 5. 리스크

| 리스크 | 대응 |
|--------|------|
| bd_artifacts 중복 저장 | 기존 artifact 존재 시 UPDATE, 없으면 INSERT (upsert) |
| 재실행 시 결과 덮어쓰기 | 이전 결과는 artifact history 테이블에 보관하거나 feedback 컬럼에 누적 |
| 가이드 텍스트 길이 | 툴팁으로 처리, 본문은 최대 2줄 |

## 6. 참고

- Design: [[FX-DSGN-S238]]
- Report: [[FX-RPRT-S238]]
- Parent Plan: [[FX-PLAN-DISCOVERY-DETAIL-UX-V2]] §F485, §F486
- PR: #392 (merged, Match 100%)
