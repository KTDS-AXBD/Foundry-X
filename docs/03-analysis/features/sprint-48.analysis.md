---
code: FX-ANLS-048
title: "Sprint 48 Gap Analysis — ML 하이브리드 SR 분류기 + SR 대시보드 UI (F167+F168)"
version: 1.0
status: Active
category: ANLS
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
feature: sprint-48
sprint: 48
matchRate: 95
---

## 1. 분석 개요

| 항목 | 값 |
|------|-----|
| Design 문서 | `docs/02-design/features/sprint-48.design.md` |
| Match Rate | **95%** |
| 분석 방법 | Design §2~§6 체크리스트 12항목 vs 구현 코드 대조 |
| 검증 | typecheck ✅, API 1029/1029 ✅, Web 74/74 ✅ |

## 2. 검증 체크리스트

| # | 항목 | 결과 | 비고 |
|---|------|:----:|------|
| 1 | HybridSrClassifier confidence >= 0.7 → 규칙만 사용 | ✅ | LLM 미호출 확인 |
| 2 | confidence < 0.7 → LLM 폴백 → 결과 병합 | ✅ | method="hybrid" |
| 3 | LLM 실패 시 규칙 결과 반환 | ✅ | graceful degradation |
| 4 | GET /sr/stats → 유형별 건수 + 오분류율 | ✅ | typeDistribution + misclassificationRate |
| 5 | POST /sr/:id/feedback → SR type 자동 갱신 | ✅ | 201 + sr_type UPDATE |
| 6 | SR 목록 페이지 렌더링 + 필터 | ✅ | SrListTable + Select 필터 |
| 7 | SR 상세 + 워크플로우 DAG | ✅ | SrWorkflowDag CSS flex 기반 |
| 8 | 피드백 다이얼로그 → API 호출 | ✅ | SrFeedbackDialog + submitSrFeedback |
| 9 | API 테스트 ~30건 | ✅ | +30건 (999→1029) |
| 10 | Web 테스트 ~10건 | ⚠️ | +6건 (68→74), 목표 대비 4건 부족 |
| 11 | Sidebar SR Management 메뉴 | ✅ | ClipboardList 아이콘 |
| 12 | typecheck 0 errors | ✅ | API + Web 모두 |

## 3. Gap 발견 및 해소

### Gap 1: SrStatsResponse 타입 불일치 [HIGH → 해소]

- **문제**: API는 `typeDistribution[]` + `feedbackCount` 반환, Web은 `avgConfidence` 단일 필드 기대
- **영향**: SrStatsCards에서 `stats.avgConfidence * 100` → NaN% 표시
- **해소**: Web SrStatsResponse를 API 응답에 맞게 수정, SrStatsCards에서 가중 평균 계산, 테스트 mockStats 갱신
- **상태**: ✅ 해소 (typecheck + test 통과)

### Gap 2: Web 테스트 수량 [LOW → 수용]

- **문제**: 목표 ~10건, 실제 6건
- **영향**: 핵심 컴포넌트(Stats, List, DAG, Feedback, 페이지 2개) 커버됨. 추가 엣지 케이스만 부족
- **상태**: 수용 (핵심 기능 테스트 커버, 추가는 Phase 5b에서)

### Gap 3: 구현 개선 (설계 대비) [INFO]

| 항목 | Design | 구현 | 판정 |
|------|--------|------|:----:|
| HybridSrClassifier 생성자 | SrClassifier 외부 주입 | 내부 생성 (캡슐화) | 🟢 개선 |
| extractJson | 단순 regex | 3단계 파싱 (더 견고) | 🟢 개선 |
| GET /sr/:id/feedback | org_id 필터 없음 | org_id JOIN 필터 (보안) | 🟢 개선 |

## 4. 최종 수치

| 항목 | 이전 | 이후 | 변화 |
|------|------|------|------|
| API tests | 999 | **1029** | +30 |
| Web tests | 68 | **74** | +6 |
| API endpoints | 169 | **172** | +3 (stats, feedback×2) |
| API services | 78 | **79** | +1 (hybrid-sr-classifier) |
| D1 migrations | 0030 | **0031** | +1 |
| Web pages | 12 | **14** | +2 (sr, sr/[id]) |
