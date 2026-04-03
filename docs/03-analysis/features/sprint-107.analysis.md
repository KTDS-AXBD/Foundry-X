---
code: FX-ANLS-S107
title: "Sprint 107 Gap Analysis — F278 BD ROI 벤치마크"
version: 1.0
status: Active
category: ANLS
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
references: "[[FX-PLAN-S107]], [[FX-DSGN-S107]], [[FX-RPRT-S107]]"
---

# Sprint 107 Gap Analysis — F278 BD ROI 벤치마크

## Overall Match Rate: 99%

| Category | Score | Status |
|----------|:-----:|:------:|
| Data Model | 100% | Match |
| API Endpoints | 100% | Match (8/8) |
| Services | 100% | Match (3/3) |
| Shared Types | 100% | Match (6종) |
| Zod Schemas | 100% | Match (6종) |
| File Mapping | 98% | 의도적 변경 1건 |
| Test Coverage | 111% | Exceeds (39/~35) |
| **Overall** | **99%** | **Pass** |

## Gap Summary

| Type | Count | Impact |
|------|:-----:|--------|
| Missing | 0 | -- |
| Changed | 2 | 의도적: Shared 타입 위치(별도 roi.ts → types.ts 인라인) + 라우트 등록 위치(index.ts → app.ts) |
| Added | 1 | 유익한 추가: 테스트 edge case 4건 (예상 35 → 실제 39) |

## Verification Items

| V# | Design 항목 | 구현 상태 | 파일 | 비고 |
|----|-------------|----------|------|------|
| V-01 | D1 마이그레이션 0084 (2테이블 + 4인덱스) | ✅ | db/migrations/0084_roi_benchmark.sql | roi_benchmarks (20컬럼), roi_signal_valuations (7컬럼) |
| V-02 | Shared 타입 6종 | ✅ | shared/src/types.ts (인라인) | RoiBenchmark, RoiBenchmarkDetail, SkillExecutionSummary, RoiByStage, SignalValuation, BdRoiSummary |
| V-03 | Zod 스키마 6종 | ✅ | schemas/roi-benchmark.ts | runBenchmark, latestBenchmarkQuery, benchmarkHistory, byStage, roiSummary, updateSignalValuations |
| V-04 | RoiBenchmarkService (5개 메서드) | ✅ | services/roi-benchmark.ts | run, getLatest, getHistory, getSkillDetail, getByStage |
| V-05 | SignalValuationService (3개 메서드) | ✅ | services/signal-valuation.ts | getValuations, updateValuations, calculatePortfolioValue |
| V-06 | BdRoiCalculatorService (1개 메서드) | ✅ | services/bd-roi-calculator.ts | calculate — BD_ROI 공식 |
| V-07 | API 라우트 8개 엔드포인트 | ✅ | routes/roi-benchmark.ts | POST run + GET latest/history/skill/by-stage/summary/signal-valuations + PUT signal-valuations |
| V-08 | app.ts 라우트 등록 | ✅ | app.ts | roiBenchmarkRoute 등록 (Design: index.ts → 실제: app.ts) |
| V-09 | ROW_NUMBER() 윈도우 함수 Cold/Warm 분류 | ✅ | services/roi-benchmark.ts | PARTITION BY skill_id ORDER BY executed_at ASC |
| V-10 | BD_ROI 공식 | ✅ | services/bd-roi-calculator.ts | (Total_Savings + Signal_Value) / Total_Investment × 100 |
| V-11 | Division by zero 방어 | ✅ | services/bd-roi-calculator.ts | Total_Investment = 0 → BD_ROI = 0 |
| V-12 | 신호등 기본값 (Go $50K, Pivot $10K, Drop $0) | ✅ | services/signal-valuation.ts | DEFAULT_SIGNAL_VALUATIONS 상수 |
| V-13 | UPSERT 패턴 (ON CONFLICT) | ✅ | services/signal-valuation.ts | UNIQUE(tenant_id, signal_type) 기반 |
| V-14 | RoiBenchmark 서비스 테스트 | ✅ | __tests__/roi-benchmark-service.test.ts | 13 tests |
| V-15 | SignalValuation 서비스 테스트 | ✅ | __tests__/signal-valuation-service.test.ts | 8 tests |
| V-16 | BdRoiCalculator 서비스 테스트 | ✅ | __tests__/bd-roi-calculator-service.test.ts | 7 tests |
| V-17 | 라우트 통합 테스트 | ✅ | __tests__/roi-benchmark-routes.test.ts | 11 tests |

## Implementation Stats

| 항목 | 수치 |
|------|------|
| 새 파일 | 9개 (migration 1 + schema 1 + service 3 + route 1 + test 4 - shared 인라인) |
| 수정 파일 | 3개 (app.ts, shared/types.ts, shared/index.ts) |
| 추가 라인 | ~2,890 lines (코드 1,935 + 테스트 955) |
| API 엔드포인트 | 8개 |
| D1 테이블 | 2개 (roi_benchmarks, roi_signal_valuations) |
| D1 인덱스 | 4개 |
| 테스트 | 39개 (서비스 28 + 라우트 11) |
| 전체 테스트 | 2432 pass |
| Typecheck | Pass |

## Plan 성공 기준 달성

- [x] D1 마이그레이션 0084 정상 적용 (V-01)
- [x] API 엔드포인트 8개 (V-07)
- [x] 서비스 3종 (V-04, V-05, V-06)
- [x] 테스트 39개 >= ~35개 목표 (V-14~V-17)
- [x] typecheck 0 errors
- [x] Match Rate 99% >= 90%

## 의도적 변경

| 항목 | Design | 구현 | 근거 |
|------|--------|------|------|
| Shared 타입 위치 | 별도 `shared/types/roi.ts` | `shared/src/types.ts` 인라인 | 기존 타입들이 이미 types.ts에 정의 — 일관성 유지 |
| 라우트 등록 위치 | `index.ts` | `app.ts` | 기존 라우트 등록 패턴이 app.ts — 프로젝트 관례 준수 |

## 핵심 로직 검증

### Cold Start vs Warm Run 분류 (V-09)
- ROW_NUMBER() OVER (PARTITION BY skill_id ORDER BY executed_at ASC)
- cold_threshold(기본 3) 이하 → Cold, 초과 → Warm
- savings_pct = (cold_avg - warm_avg) / cold_avg × 100
- 음수(Warm이 더 비싼 경우)도 정직하게 표시

### BD_ROI 공식 (V-10)
```
BD_ROI = (Total_Savings + Signal_Value) / Total_Investment × 100
Total_Savings = Σ (cold_avg_cost - warm_avg_cost) × warm_executions
Signal_Value = Go_count × Go_usd + Pivot_count × Pivot_usd
Total_Investment = Σ cost_usd from skill_executions
```

### 에러 처리 (V-11)
- Division by zero: Total_Investment = 0 → BD_ROI = 0
- JSON parse safe: executionParams fallback to `{}`
- 신호등 미설정: DEFAULT_SIGNAL_VALUATIONS 자동 반환

## 결론

99% Match Rate로 Skill Evolution 5-Track의 최종 Track E가 완료. F274(메트릭) → F275(레지스트리) → F276(DERIVED) → F277(CAPTURED) → F278(ROI 벤치마크)의 전체 체인이 완성되어, BD 스킬 투자 대비 효과를 정량적으로 증명할 수 있는 기반 확보.
