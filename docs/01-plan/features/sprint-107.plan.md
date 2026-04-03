---
code: FX-PLAN-S107
title: "Sprint 107 — F278 BD ROI 벤치마크"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-270]], [[FX-PLAN-S103]], [[FX-PLAN-S105]]"
---

# Sprint 107: F278 BD ROI 벤치마크

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F278: Track E BD ROI 벤치마크 — Cold Start vs Warm Run 비교 + BD_ROI 공식 + F262 사업성 신호등 달러 환산 |
| Sprint | 107 |
| 우선순위 | P1 |
| 의존성 | F274 ✅ (skill_executions 4테이블) + F276 ✅ (DERIVED 엔진 패턴 추출) |
| Design | docs/02-design/features/sprint-107.design.md |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 스킬 반복 실행 시 비용이 실제로 절감되는지 정량 데이터가 없음 — "스킬이 학습한다"는 주장에 근거 부재. 사업성 신호등(Go/Pivot/Drop)도 정성 판단만 가능하고 달러 가치 비교 불가 |
| Solution | skill_executions의 실행 이력을 Cold Start(첫 1~3회) vs Warm Run(4회+)으로 분류하여 비용/시간/토큰 절감률을 자동 산출. BD_ROI 공식으로 투입 대비 회수 비율을 계산하고, F262 신호등 Go 건수를 달러 기대수익으로 환산 |
| Function UX Effect | 대시보드에서 스킬별/BD 단계별 ROI 지표를 즉시 확인 가능. "이 스킬을 5번 더 쓰면 비용이 X% 줄어든다"는 예측값 제공 |
| Core Value | Skill Evolution의 경제적 가치를 증명하는 핵심 지표 — 팀/경영진에게 AI BD 투자 대비 효과를 숫자로 보여줌 |

## §1 범위

### 포함

1. **D1 마이그레이션 (0084_roi_benchmark.sql)** — ROI 벤치마크 + 신호등 환산 테이블
   - `roi_benchmarks` — 스킬별 Cold Start vs Warm Run 비교 결과 스냅샷
   - `roi_signal_valuations` — F262 사업성 신호등(Go/Pivot/Drop)별 달러 기대가치 설정

2. **RoiBenchmarkService** — Cold Start vs Warm Run 비용 분석
   - skill_executions에서 스킬별 실행 순서(executed_at ASC) 기반 분류
   - Cold Start: 스킬의 첫 N회 실행 (기본 N=3, 설정 가능)
   - Warm Run: N+1회 이후 실행
   - 비교 지표: avg_cost_usd, avg_duration_ms, avg_tokens, success_rate
   - 절감률(savings_pct) = (cold_avg - warm_avg) / cold_avg × 100
   - BD 파이프라인 단계별 집계 (수집→발굴→형상화→검증→제품화→GTM)

3. **BdRoiCalculatorService** — BD_ROI 공식 엔진
   - BD_ROI = (Warm Run 절감액 × 실행 횟수 + 신호등 기대가치) / 총 투입 비용
   - 총 투입 비용 = Σ cost_usd (전체 skill_executions)
   - Warm Run 절감액 = cold_avg_cost - warm_avg_cost (per execution)
   - 신호등 기대가치 = Go 건수 × Go 단가 + Pivot 건수 × Pivot 단가
   - 테넌트별, 기간별(일/주/월) 필터링

4. **SignalValuationService** — F262 사업성 신호등 달러 환산
   - Go/Pivot/Drop 각 신호별 기대가치(달러) 설정/조회/갱신
   - 기본값: Go=$50,000, Pivot=$10,000, Drop=$0 (테넌트별 커스터마이징)
   - bd-process-tracker의 trafficLight 데이터와 연동
   - 포트폴리오 전체 기대가치 합산

5. **API 엔드포인트 (roi-benchmark route)**
   - `POST /roi-benchmark/run` — 벤치마크 실행 (스냅샷 생성)
   - `GET /roi-benchmark/latest` — 최신 벤치마크 결과
   - `GET /roi-benchmark/history` — 벤치마크 이력 (페이지네이션)
   - `GET /roi-benchmark/by-skill/:skillId` — 스킬별 상세
   - `GET /roi-benchmark/by-stage` — BD 단계별 집계
   - `GET /roi/summary` — BD_ROI 종합 (공식 계산 결과)
   - `GET /roi/signal-valuations` — 신호등 달러 환산 설정 조회
   - `PUT /roi/signal-valuations` — 신호등 달러 환산 설정 갱신

6. **Shared 타입 확장**
   - `RoiBenchmark`, `RoiBenchmarkDetail`, `ColdWarmComparison`
   - `BdRoiSummary`, `SignalValuation`, `RoiByStage`

7. **Zod 스키마** — roi-benchmark.ts

8. **테스트** — 서비스 3종 + 라우트 단위 테스트

### 제외

- Web UI 대시보드 (ROI 차트/그래프) — 별도 Sprint
- CAPTURED 엔진 ROI 연동 (F277 데이터는 skill_executions에 포함되므로 자동 반영)
- 예측 모델 (머신러닝 기반 비용 예측) — 후속
- 실시간 스트리밍 (배치 스냅샷 방식 우선)

## §2 데이터 모델

### 2.1 roi_benchmarks

스킬별 Cold Start vs Warm Run 비교 스냅샷.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | 벤치마크 ID |
| tenant_id | TEXT NOT NULL | 테넌트 |
| skill_id | TEXT NOT NULL | 대상 스킬 |
| cold_threshold | INTEGER NOT NULL DEFAULT 3 | Cold Start 기준 실행 횟수 |
| cold_executions | INTEGER NOT NULL | Cold Start 구간 실행 수 |
| warm_executions | INTEGER NOT NULL | Warm Run 구간 실행 수 |
| cold_avg_cost_usd | REAL NOT NULL | Cold 평균 비용 |
| warm_avg_cost_usd | REAL NOT NULL | Warm 평균 비용 |
| cold_avg_duration_ms | REAL NOT NULL | Cold 평균 소요시간 |
| warm_avg_duration_ms | REAL NOT NULL | Warm 평균 소요시간 |
| cold_avg_tokens | REAL NOT NULL | Cold 평균 토큰 |
| warm_avg_tokens | REAL NOT NULL | Warm 평균 토큰 |
| cold_success_rate | REAL NOT NULL | Cold 성공률 |
| warm_success_rate | REAL NOT NULL | Warm 성공률 |
| cost_savings_pct | REAL | 비용 절감률 (%) |
| duration_savings_pct | REAL | 시간 절감률 (%) |
| token_savings_pct | REAL | 토큰 절감률 (%) |
| pipeline_stage | TEXT | BD 파이프라인 단계 (nullable = 전체) |
| created_at | TEXT NOT NULL DEFAULT now | 스냅샷 생성 시각 |

### 2.2 roi_signal_valuations

사업성 신호등 달러 환산 설정.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | 설정 ID |
| tenant_id | TEXT NOT NULL | 테넌트 |
| signal_type | TEXT NOT NULL | 'go' / 'pivot' / 'drop' |
| value_usd | REAL NOT NULL | 기대가치 (달러) |
| description | TEXT | 설정 근거 설명 |
| updated_by | TEXT NOT NULL | 마지막 수정자 |
| updated_at | TEXT NOT NULL DEFAULT now | 수정 시각 |

UNIQUE(tenant_id, signal_type) — 테넌트별 신호당 1행.

## §3 핵심 로직

### 3.1 Cold Start vs Warm Run 분류 알고리즘

```
1. 스킬별 실행 이력을 executed_at ASC 정렬
2. ROW_NUMBER() 기반으로 실행 순서 부여
3. row_num <= cold_threshold → Cold Start
4. row_num > cold_threshold → Warm Run
5. 각 그룹의 AVG(cost_usd), AVG(duration_ms), AVG(tokens), success_rate 계산
6. savings_pct = (cold_avg - warm_avg) / cold_avg × 100
```

D1/SQLite에서 ROW_NUMBER() 윈도우 함수 사용 가능 (SQLite 3.25.0+, D1 지원).

### 3.2 BD_ROI 공식

```
BD_ROI = (Total_Savings + Signal_Value) / Total_Investment × 100

Where:
  Total_Savings = Σ (cold_avg_cost - warm_avg_cost) × warm_executions  [per skill]
  Signal_Value  = Go_count × Go_usd + Pivot_count × Pivot_usd + Drop_count × Drop_usd
  Total_Investment = Σ cost_usd from skill_executions (전체 실행 비용)
```

### 3.3 신호등 달러 환산

- F262 `bd-process-tracker`의 `trafficLight.go/pivot/drop` 카운트 활용
- `roi_signal_valuations` 테이블에서 테넌트별 단가 조회
- 포트폴리오 기대가치 = Σ (signal_count × signal_value_usd)

## §4 구현 순서

| 순서 | 작업 | 예상 산출물 |
|------|------|------------|
| 1 | D1 마이그레이션 0084 | `0084_roi_benchmark.sql` |
| 2 | Shared 타입 + Zod 스키마 | `shared/types/roi.ts`, `schemas/roi-benchmark.ts` |
| 3 | RoiBenchmarkService | `services/roi-benchmark.ts` |
| 4 | SignalValuationService | `services/signal-valuation.ts` |
| 5 | BdRoiCalculatorService | `services/bd-roi-calculator.ts` |
| 6 | roi-benchmark route | `routes/roi-benchmark.ts` |
| 7 | 테스트 (서비스 3종 + 라우트) | `__tests__/roi-*` |
| 8 | test-helpers 마이그레이션 추가 | `test-helpers.ts` |

## §5 테스트 전략

- **서비스 단위 테스트**: RoiBenchmarkService, SignalValuationService, BdRoiCalculatorService 각각
  - Cold/Warm 분류 정확성 (경계값: 정확히 N번째)
  - 절감률 계산 (0%, 음수(악화 케이스), 100%)
  - BD_ROI 공식 검증 (정상, 투입 0일 때 division by zero 방어)
  - 신호등 기본값 + 커스터마이징
- **라우트 테스트**: 8개 엔드포인트 CRUD + 권한 + 페이지네이션
- **예상 테스트 수**: ~35개

## §6 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| skill_executions 데이터 부족 (Cold/Warm 분류 불가) | 벤치마크 결과 무의미 | cold_threshold 동적 조정 + 최소 실행 수 가드 (warm ≥ 2) |
| D1 윈도우 함수 성능 | 대량 데이터 시 느림 | 인덱스 idx_se_tenant_skill 활용 + LIMIT으로 최근 N일 제한 |
| BD_ROI 음수 (Warm이 더 비싼 경우) | 지표 혼란 | 음수 ROI도 정직하게 표시 + 원인 분석 힌트 제공 |
| 신호등 단가 설정 미비 | 기대가치 0 | 테넌트 생성 시 기본값 자동 삽입 |

## §7 성공 기준

| 지표 | 목표 |
|------|------|
| Match Rate | ≥ 90% |
| API 엔드포인트 | 8개 |
| 서비스 | 3개 (RoiBenchmark + SignalValuation + BdRoiCalculator) |
| 테스트 | ~35개, 전체 통과 |
| D1 마이그레이션 | 0084 정상 적용 |
| typecheck | 0 errors |
