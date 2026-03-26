---
code: FX-PLAN-070
title: "Sprint 70 Plan — F214 Web Discovery 대시보드"
version: 1.0
status: Active
category: PLAN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 70
features: [F214]
req: [FX-REQ-206]
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F214 Web Discovery 대시보드 |
| **Sprint** | 70 |
| **의존성** | Sprint 69 (F213) API v8.2 확장 ✅ merged |
| **목표** | 2-0~2-10 프로세스 시각화 + 유형별 분기 경로 + 사업성 신호등 이력 + 멀티페르소나 평가 결과 뷰 + Getting Started 재구성 |

---

## 1. 목표

1. **프로세스 시각화**: AX BD 2단계 발굴 프로세스(2-0 분류 → 2-1~2-7 유형별 분기 → 2-8~2-10 공통) 전체 흐름을 대시보드에서 시각화
2. **유형별 분기 경로**: I/M/P/T/S 5유형별 분석 경로를 강도(core/normal/light) 색상으로 표시
3. **사업성 신호등 이력**: Sprint 69 API (viability checkpoints + traffic light + commit gate) 소비하여 아이템별 Go/Pivot/Drop 이력 + 누적 신호등
4. **멀티페르소나 평가 뷰**: 기존 evaluation API 소비하여 평가 결과 표시
5. **Getting Started 재구성**: AX BD 워크플로우 카드 추가

---

## 2. 범위

### In Scope

| 구분 | 항목 |
|------|------|
| 페이지 | `/ax-bd/discovery` — 프로세스 시각화 + 신호등 대시보드 |
| 페이지 | `/ax-bd/discovery/[id]` — 아이템별 상세 (체크포인트 이력 + Commit Gate) |
| 컴포넌트 | `ProcessFlowV82` — 2-0~2-10 전체 흐름 시각화 |
| 컴포넌트 | `TypeRoutingMatrix` — 5유형 × 7단계 강도 매트릭스 |
| 컴포넌트 | `TrafficLightPanel` — 신호등 집계 + 체크포인트 타임라인 |
| 컴포넌트 | `CommitGateCard` — Commit Gate 4질문 + 결정 표시 |
| 컴포넌트 | `EvaluationSummaryCard` — 멀티페르소나 평가 요약 |
| 수정 | Sidebar — AX BD 하위에 Discovery 프로세스 메뉴 추가 |
| 수정 | Getting Started — AX BD Discovery 퀵스타트 카드 추가 |
| 수정 | api-client.ts — viability/traffic-light/commit-gate API 타입 + 함수 |
| 테스트 | 신규 컴포넌트 + 페이지 테스트 |

### Out of Scope

- API 서버 변경 (Sprint 69에서 완료)
- D1 마이그레이션 (Sprint 69에서 완료)
- 2-8(패키징), 2-9(멀티페르소나 평가), 2-10(최종 보고서) 상세 구현 (기존 UI로 커버)
- 모바일 반응형 최적화

---

## 3. 의존성

| 의존성 | 상태 | 비고 |
|--------|------|------|
| Sprint 69 (F213) API v8.2 | ✅ merged | viability, commit-gate, analysis-path 엔드포인트 |
| Sprint 65 (F207) 평가관리 API | ✅ merged | evaluations 엔드포인트 |
| Sprint 64 (F203) biz-items API | ✅ merged | biz-items CRUD + discovery_type |

---

## 4. 기술 결정

| 결정 | 근거 |
|------|------|
| shadcn/ui 컴포넌트 활용 | 기존 프로젝트 컨벤션 일관성 |
| Lucide Icons | 기존 아이콘 라이브러리 유지 |
| 정적 프로세스 데이터 | ANALYSIS_PATH_MAP은 서버에서 가져오되, 프로세스 흐름 자체는 클라이언트 상수 |
| Next.js App Router | 기존 (app) 그룹 라우팅 유지 |

---

## 5. 예상 산출물

| 파일 | 유형 | 설명 |
|------|------|------|
| `(app)/ax-bd/discovery/page.tsx` | 신규 | 프로세스 시각화 + 아이템 목록 대시보드 |
| `(app)/ax-bd/discovery/[id]/page.tsx` | 신규 | 아이템별 상세 — 체크포인트 이력 + 신호등 + Commit Gate |
| `components/feature/ProcessFlowV82.tsx` | 신규 | 2-0~2-10 프로세스 시각화 |
| `components/feature/TypeRoutingMatrix.tsx` | 신규 | 5유형 × 7단계 강도 매트릭스 |
| `components/feature/TrafficLightPanel.tsx` | 신규 | 신호등 집계 + 체크포인트 타임라인 |
| `components/feature/CommitGateCard.tsx` | 신규 | Commit Gate 표시 |
| `components/feature/EvaluationSummaryCard.tsx` | 신규 | 평가 결과 요약 |
| `lib/api-client.ts` | 수정 | viability API 타입 + 함수 추가 |
| `components/sidebar.tsx` | 수정 | Discovery 프로세스 메뉴 추가 |
| `(app)/getting-started/page.tsx` | 수정 | AX BD Discovery 카드 추가 |
| `__tests__/` | 신규 | 컴포넌트 + 페이지 테스트 (~20 tests) |

---

## 6. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| API 응답 구조 불일치 | 중 | Sprint 69 구현 코드 직접 확인 완료 |
| 프로세스 시각화 복잡도 | 중 | HTML 참고자료의 디자인 패턴 재사용 |
