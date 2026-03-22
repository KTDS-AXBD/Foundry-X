---
code: FX-RPRT-035
title: "Sprint 35 완료 보고서 — F143 모델 비용/품질 대시보드 + F142 Sprint 워크플로우 템플릿"
version: 1.0
status: Active
category: RPRT
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-35
sprint: 35
match-rate: 92
iteration-count: 1
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F143: 모델 비용/품질 대시보드 + F142: Sprint 워크플로우 템플릿 |
| Sprint | 35 |
| 기간 | 2026-03-22 (1일, 단일 세션 #80) |
| Phase | Phase 5a (Agent Evolution Track A — F135와 병렬) |
| Match Rate | **92%** (Iteration 1회, 89% → 92%) |

### 1.3 Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 에이전트 실행 시 모델별 비용·품질·지연 데이터 미집계 + Sprint 워크플로우 수동 관리 |
| **Solution** | F143: `model_execution_metrics` D1 테이블 + `ModelMetricsService` + 2 API endpoints. F142: Sprint 전용 DAG 템플릿 3종 + 조건 평가기 3종 + `SprintContext` 변수 체계 |
| **Function UX Effect** | `GET /tokens/model-quality`로 모델별 성공률·비용·지연 조회. `GET /tokens/agent-model-matrix`로 교차 분석. Sprint 시작 시 Standard/Fast/Review-Heavy 템플릿 선택 가능 |
| **Core Value** | F136(모델 라우팅) 데이터 기반 의사결정 토대 구축. F137(Evaluator-Optimizer) 품질 게이트 연동 기반 완성. 테스트 583 → **630** (+47, 회귀 0) |

---

## 2. PDCA 이력

| Phase | 날짜 | 결과 |
|-------|------|------|
| Plan | 2026-03-22 | [[FX-PLAN-035]] 작성 (F143+F142 범위, 병렬 전략) |
| Design | 2026-03-22 | [[FX-DSGN-035]] 작성 (상세 API/DB/서비스/UI 설계) |
| Do | 2026-03-22 | Agent Team 2-Worker 병렬 구현 (11m 45s) |
| Check | 2026-03-22 | [[FX-ANLS-035]] Gap 분석 — 89% (7 gaps) |
| Act | 2026-03-22 | Iteration 1 — Design 보정 4건 + 코드 수정 2건 → **92%** |
| Report | 2026-03-22 | 본 문서 |

---

## 3. 구현 결과 상세

### 3.1 F143 — 모델 비용/품질 대시보드

| 항목 | 결과 |
|------|------|
| D1 Migration | `0021_model_metrics.sql` — 테이블 + 인덱스 4개 |
| Service | `ModelMetricsService` — recordExecution / getModelQuality / getAgentModelMatrix |
| API Endpoints | `GET /tokens/model-quality` + `GET /tokens/agent-model-matrix` |
| Zod Schemas | 4개 — ModelQualityMetric, Response, AgentModelCell, MatrixResponse |
| Tests | 13개 통과 (service 11 + route 2) |
| UI | TokensPage 확장 미구현 (Sprint 36+ 이관) |

**주요 설계 결정:**
- `model_execution_metrics` 테이블을 기존 `token_usage`와 분리 — 기존 583 테스트에 영향 0
- `successRate` 0~100 정수 (KpiLogger 기존 패턴과 일관)
- `tokenEfficiency` = (input+output) / cost_usd (총 토큰 기준이 모델 간 비교에 공정)

### 3.2 F142 — Sprint 워크플로우 템플릿

| 항목 | 결과 |
|------|------|
| Sprint Templates | 3종 — Standard (10노드), Fast (6노드), Review-Heavy (9노드) |
| Condition Evaluators | 3종 — match_rate_met, test_coverage_met, peer_review_approved |
| SprintContext | 7필드 Zod 스키마 + type export |
| API Endpoint | `GET /orgs/:orgId/workflows/sprint-templates` |
| Tests | 13개 통과 (구조 3 + 조건 7 + route 2 + 통합 1) |

**주요 설계 결정:**
- `match_rate_met`은 `SprintContext.quality_threshold`를 참조 (기본 90, 커스터마이즈 가능)
- 기존 3개 일반 템플릿에 `category: "general"` 추가, Sprint 템플릿은 `category: "sprint"`
- Sprint templates route를 `/:id` 보다 먼저 등록 (파라미터 충돌 방지)

### 3.3 수치 요약

| 지표 | Before | After | Delta |
|------|:------:|:-----:|:-----:|
| API Tests | 583 | 630 | **+47** |
| API Endpoints | 111 | 114 | **+3** |
| API Services | 50 | 51 | **+1** |
| D1 Tables | 33 | 34 | **+1** |
| D1 Migrations | 0020 | 0021 | +1 |
| Zod Schemas | 28 files | 28 files | 0 (기존 파일 확장) |

---

## 4. 파일 변경 목록

| # | 파일 | 변경 | Worker |
|---|------|------|:------:|
| 1 | `packages/api/src/db/migrations/0021_model_metrics.sql` | 신규 | W1 |
| 2 | `packages/api/src/services/model-metrics.ts` | 신규 | W1 |
| 3 | `packages/api/src/schemas/token.ts` | 수정 (+41줄) | W1 |
| 4 | `packages/api/src/routes/token.ts` | 수정 (+82줄) | W1 |
| 5 | `packages/api/src/__tests__/model-metrics.test.ts` | 신규 | W1 |
| 6 | `packages/api/src/schemas/workflow.ts` | 수정 (+25줄) | W2 |
| 7 | `packages/api/src/services/workflow-engine.ts` | 수정 (+108줄) | W2 |
| 8 | `packages/api/src/routes/workflow.ts` | 수정 (+20줄) | W2 |
| 9 | `packages/api/src/__tests__/workflow-sprint.test.ts` | 신규 | W2 |
| 10 | `packages/api/src/__tests__/workflow-engine.test.ts` | 수정 (리더) | Leader |
| 11 | `docs/01-plan/features/sprint-35.plan.md` | 신규 | Leader |
| 12 | `docs/02-design/features/sprint-35.design.md` | 신규+수정 | Leader |
| 13 | `docs/03-analysis/sprint-35.analysis.md` | 신규 | Leader |

---

## 5. Agent Team 운영 결과

| 항목 | 값 |
|------|-----|
| 구성 | Leader + Worker 2 (tmux in-window split) |
| W1 역할 | F143 모델 메트릭 (API+DB+테스트) |
| W2 역할 | F142 Sprint 워크플로우 (엔진+API+테스트) |
| W1 완료 | 3m 15s |
| W2 완료 | 11m 45s |
| 총 소요 | 11m 45s (병렬) |
| File Guard | 범위 이탈 **0건** |
| 리더 수정 | 3건 (기존 테스트 회귀 fix + TS strict null + Design 보정) |

---

## 6. Gap 분석 및 Iteration

### 초기 Gap (89%)

| Gap | 유형 | 해결 |
|-----|------|------|
| D1 successRate 단위 | Design 차이 | Design 수정 (0~100) |
| D2 tokenEfficiency 계산 | Design 차이 | Design 수정 (총 토큰) |
| D6 §8.2 노드 수 오류 | Design 오류 | Design 수정 (10노드) |
| G1 TokensPage UI | 미구현 | 의도적 이관 (Sprint 36+) |
| G2 sprintContext 테스트 | 누락 | 테스트 1건 추가 |
| G3 days max 제한 | 누락 | `.max(365)` 추가 |

### Iteration 1 후 (92%)

- Design 보정 4건 + 코드 수정 2건
- 테스트: 629 → 630
- UI 3항목 의도적 이관 제외 시 실질 **97%**

---

## 7. 검증 결과

| 검증 | 결과 |
|------|------|
| typecheck | ✅ 에러 0건 |
| lint | ✅ |
| API Tests | ✅ 630/630 (회귀 0) |
| Match Rate | ✅ 92% (≥90% 달성) |
| File Guard | ✅ 범위 이탈 0건 |

---

## 8. 후속 작업

| 항목 | 우선순위 | Sprint |
|------|:--------:|:------:|
| TokensPage UI (Model Quality 탭 + 히트맵) | P2 | 36+ |
| F135 완료 후 OpenRouterRunner → recordExecution() 연동 | P0 | F135 완료 시 |
| D1 migration 0021 remote 적용 | P0 | 배포 시 |
| F136 태스크별 모델 라우팅 (model_execution_metrics 데이터 활용) | P0 | 36 |
