---
code: FX-RPRT-036
title: "Sprint 36 완료 보고서 — F136 태스크별 모델 라우팅 + F137 Evaluator-Optimizer 패턴 (96%)"
version: 1.0
status: Active
category: RPRT
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-36
sprint: 36
match_rate: 96
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F136: 태스크별 모델 라우팅 + F137: Evaluator-Optimizer 패턴 |
| Sprint | 36 |
| 기간 | 2026-03-22 (1 세션) |
| Phase | Phase 5a (Agent Evolution Track A) |
| Match Rate | **96%** |
| Duration | ~25분 (Plan→Design→Do→Check→Report) |

### 1.3 Value Delivered

| 관점 | 결과 |
|------|------|
| **Problem** | 모든 에이전트 태스크가 단일 모델(Sonnet)로 실행 → 비용/품질 불균형. 에이전트 출력이 1-shot 품질에 의존, 자동 개선 루프 없음 |
| **Solution** | D1 `model_routing_rules` 테이블 + `ModelRouter` 서비스로 7종 taskType별 최적 모델 자동 선택 구현. `EvaluatorOptimizer` 서비스로 생성→평가→개선 반복 루프 + 3종 평가 기준 플러그인 구현 |
| **Function UX Effect** | `spec-analysis`=Opus(고품질), `code-review`/`code-generation`=Sonnet(균형), `test-generation`/`skill-query`=Haiku(저비용) 자동 배정. E-O 루프로 코드 생성 후 자동 리뷰→피드백→개선 반복, 최대 5회 + 품질 임계값 제어 |
| **Core Value** | F143(Sprint 35 메트릭) 데이터 기반 라우팅 최적화 토대 + F142(Sprint 35 워크플로우) 품질 게이트 `evaluate_optimize` 액션 연동 기반. F138~F141 전문 에이전트의 EvaluationCriteria 플러그인 확장점 확보 |

---

## 1. PDCA 사이클 이력

| Phase | 문서 | 상태 |
|-------|------|:----:|
| Plan | `docs/01-plan/features/sprint-36.plan.md` (FX-PLAN-036) | ✅ |
| Design | `docs/02-design/features/sprint-36.design.md` (FX-DSGN-036) | ✅ |
| Do | 2-Worker Agent Team (3m 15s) + 리더 통합 | ✅ |
| Check | `docs/03-analysis/sprint-36.analysis.md` (FX-ANLS-036, 96%) | ✅ |
| Report | 본 문서 (FX-RPRT-036) | ✅ |

---

## 2. 구현 산출물

### 2.1 신규 파일 (6개)

| 파일 | Feature | 설명 |
|------|:-------:|------|
| `packages/api/src/db/migrations/0022_model_routing.sql` | F136 | model_routing_rules 테이블 + 7종 시드 |
| `packages/api/src/services/model-router.ts` | F136 | ModelRouter — D1 규칙 조회/갱신 + DEFAULT_MODEL_MAP 폴백 |
| `packages/api/src/services/evaluation-criteria.ts` | F137 | EvaluationCriteria 인터페이스 + CodeReview/TestCoverage/SpecCompliance 3종 |
| `packages/api/src/services/evaluator-optimizer.ts` | F137 | EvaluatorOptimizer — generate→evaluate→improve 루프 (HARD_MAX 5) |
| `packages/api/src/__tests__/model-router.test.ts` | F136 | 16개 단위 테스트 |
| `packages/api/src/__tests__/evaluator-optimizer.test.ts` | F137 | 20개 단위 테스트 |

### 2.2 수정 파일 (6개)

| 파일 | Feature | 변경 |
|------|:-------:|------|
| `packages/api/src/services/agent-runner.ts` | F136 | `createRoutedRunner()` 팩토리 추가 (기존 함수 유지) |
| `packages/api/src/routes/agent.ts` | F136+F137 | 3개 엔드포인트 추가 (GET/PUT routing-rules, POST evaluate-optimize) |
| `packages/api/src/schemas/agent.ts` | F136+F137 | 6개 Zod 스키마 추가 (RoutingRule, UpdateRoutingRule, RoutingRulesResponse, EvaluationScore, EvaluateOptimizeRequest, EvaluationLoopResult) |
| `packages/api/src/schemas/workflow.ts` | F137 | actionType enum에 `evaluate_optimize` 추가 |
| `packages/api/src/services/workflow-engine.ts` | F137 | `evaluate_optimize` 액션 케이스 추가 |
| `packages/api/src/env.ts` | F136 | `OPENROUTER_API_KEY`, `OPENROUTER_DEFAULT_MODEL` 타입 추가 |

### 2.3 API 엔드포인트 (+3개 → 114개)

| Method | Path | Feature | 설명 |
|--------|------|:-------:|------|
| GET | `/agents/routing-rules` | F136 | 전체 라우팅 규칙 + DEFAULT_MODEL_MAP 조회 |
| PUT | `/agents/routing-rules/:taskType` | F136 | taskType별 모델 설정 UPSERT |
| POST | `/agents/evaluate-optimize` | F137 | E-O 루프 실행 (criteria 지정, config 커스텀) |

---

## 3. 정량 지표

| 지표 | Sprint 35 | Sprint 36 | 변화 |
|------|:---------:|:---------:|:----:|
| API 테스트 | 630+ | **666** | +36 |
| API 엔드포인트 | 111 | **114** | +3 |
| API 서비스 | 53 | **56** | +3 |
| D1 마이그레이션 | 0021 | **0022** | +1 |
| D1 테이블 | 33 | **34** | +1 |
| Match Rate | — | **96%** | — |

### 3.1 테스트 세부

| 테스트 파일 | 개수 | 상태 |
|------------|:----:|:----:|
| model-router.test.ts | 16 | ✅ |
| evaluator-optimizer.test.ts | 20 | ✅ |
| **Sprint 36 신규 합계** | **36** | ✅ |
| 전체 API 테스트 | **666** | ✅ |
| typecheck | 0 error | ✅ |
| lint | 0 error | ✅ |

---

## 4. Agent Team 실행 결과

| 항목 | 결과 |
|------|------|
| Worker 수 | 2 (W1: F136 ModelRouter, W2: F137 EvalOptimizer) |
| 총 소요 시간 | 3분 15초 |
| File Guard 이탈 | 0건 |
| 리더 통합 작업 | typecheck 에러 14건 수정 (시그니처 불일치, undefined 가드, Env 타입) |

### Worker 분배

| Worker | Feature | 신규 파일 | 수정 파일 | 테스트 |
|:------:|:-------:|:---------:|:---------:|:------:|
| W1 | F136 | 3 (migration, model-router, test) | 1 (agent-runner) | 16 |
| W2 | F137 | 3 (eval-criteria, evaluator-optimizer, test) | 0 | 20 |
| Leader | 통합 | 0 | 6 (routes, schemas×2, workflow-engine, env) | — |

---

## 5. Gap 분석 요약

| Category | Score |
|----------|:-----:|
| Data Model | 100% |
| API Endpoints | 100% |
| Zod Schemas | 100% |
| Service Logic | 92% |
| Test Plan | 82% |
| File Completeness | 100% |
| Convention | 100% |
| **Overall** | **96%** |

### 미구현 항목 (P2, 후속 Sprint)

- API 엔드포인트 통합 테스트 8건 (GET/PUT routing-rules + POST evaluate-optimize)
- WorkflowEngine evaluate_optimize 통합 테스트 1건

---

## 6. 설계 결정 및 교훈

### 6.1 성공 패턴

| 결정 | 근거 | 결과 |
|------|------|------|
| Worker에서 routes/schemas 제외 | 공유 파일 merge 충돌 방지 | File Guard 0건, 충돌 0건 |
| createRoutedRunner 별도 팩토리 | 기존 createAgentRunner 하위호환 | 기존 603 테스트 회귀 0건 |
| EvaluationCriteria 플러그인 인터페이스 | F138~F141 확장성 | 3종 독립 구현, 가중 평균 정규화 |
| HARD_MAX_ITERATIONS = 5 | 리소스 남용 방지 | 테스트에서 config 10 → 5로 제한 확인 |

### 6.2 교훈

| 항목 | 내용 |
|------|------|
| Worker 시그니처 불일치 | W2가 evaluate() 2번째 파라미터 누락 → typecheck에서 포착, 리더 수정. 프롬프트에 인터페이스 시그니처를 더 명시적으로 포함해야 함 |
| env.ts 기술부채 | F135(Sprint 34)에서 OPENROUTER_API_KEY를 Env에 추가하지 않은 것이 F136에서 표출 → 즉시 해소 |
| Sprint 35 병렬 주의 | 다른 pane에서 Sprint 35 진행 중, workflow-engine.ts 수정이 겹칠 수 있음 → Worker에서 제외하고 리더만 수정 |

---

## 7. 다음 단계

| 우선순위 | 항목 | 관련 F-item |
|:--------:|------|:----------:|
| P0 | F138 ArchitectAgent — 설계 문서 검토 + 아키텍처 판단 | F138 |
| P0 | F139 TestAgent — 변경 코드 기반 테스트 자동 생성 | F139 |
| P1 | F144 Fallback 체인 — 모델 응답 실패 시 자동 대체 | F144 |
| P1 | Sprint 36 API 엔드포인트 테스트 8건 보완 | F136/F137 |
| P2 | Sprint 35+36 합산 프로덕션 배포 | F135/F136/F137 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-22 | Initial completion report (96%) | Sinclair Seo |
