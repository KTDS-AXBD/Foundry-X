---
code: FX-ANALYSIS-P42-DOGFOOD
title: Phase 42 HyperFX Deep Integration 실전 Dogfood 결과
version: 1.0
status: Active
category: ANALYSIS
created: 2026-04-14
updated: 2026-04-14
author: Sinclair Seo
---

# Phase 42 HyperFX Deep Integration — Dogfood Analysis

## 1. Executive Summary

Phase 41(Walking Skeleton) + Phase 42(Deep Integration) 완료 후 실 데이터(KOAMI)로 Graph→Streaming→MetaAgent 전 경로를 실행한 결과, **"plumbing은 있으나 물이 흐르지 않는"** 상태가 확증되었다. 3개의 결정적 갭이 발견되었으며, 이를 Phase 43(HyperFX Activation, F534~F536)으로 등록했다.

## 2. 실행 컨텍스트

| 항목 | 값 |
|------|---|
| 대상 | `bi-koami-001` — 산업 공급망 의사결정 지원 AI 플랫폼 (KOAMI) |
| 세션 ID | `graph-dogfood-bi-koami-001-1776125192189` |
| 실행 경로 | `POST /biz-items/:id/discovery-graph/run-all` (PR #563 임시 API) |
| 실행 시간 | 213초 (9 stages 순차) |
| 비용 | Anthropic API 9회 호출 |

## 3. 검증 결과

| 검증 항목 | 기대 | 실제 | 판정 |
|-----------|------|------|:----:|
| DiscoveryGraphService.runAll() 9단계 실행 | 성공 | ✅ 성공, LLM 결과 생성 | PASS |
| StageRunnerService → LLM 호출 | 9회 | 9회 | PASS |
| 각 stage별 D1 저장 (기존 로직) | 9건 | 9건 (`biz_item_discovery_stages`) | PASS |
| **agent_run_metrics 기록** | **9건+** | **0건** | **🚨 FAIL** |
| MetaAgent diagnose 6축 점수 | 실측값 | 모두 `score:50, rawValue:0, trend:stable` | **🚨 FAIL** |
| MetaAgent proposals | 1건+ | `[]` | **🚨 FAIL** |

## 4. 확증된 갭

### Gap 1 — DiagnosticCollector 실행 경로 미연결 (P0)

**증상**: `DiscoveryGraphService.runAll()`이 9회 LLM 호출을 성공적으로 수행하고 모든 stage 결과를 D1에 저장했지만, `agent_run_metrics` 테이블에는 단 1건도 기록되지 않았다.

**원인 추정**: `DiagnosticCollector.record()` 호출이 `StageRunnerService.runStage()` 또는 그 하위의 `AgentRunner.execute()`에 훅으로 삽입되지 않았다. 즉 F530 (Sprint 283)에서 Collector **클래스**는 만들었지만, **호출 사이트(call site)**는 구현하지 않았다.

**영향**: MetaAgent가 데이터 기반 진단을 할 수 없다. F530, F533의 End-to-end 검증은 in-memory mock에서만 이루어졌다.

**해소 계획**: F534 (Sprint 287, P0)

### Gap 2 — Graph 실행 경로 API 미노출 (P1)

**증상**: `confirmStage(graphMode=true)` 옵션 구현(F531)에도 불구하고, 외부 API 라우트에서 `graphMode` 파라미터를 받지 않는다. 사용자/스크립트가 Graph 경로로 실행할 수 없다.

**현황**: 이 Dogfood 실행을 위해 임시로 `POST /biz-items/:id/discovery-graph/run-all` 엔드포인트 추가 (PR #563).

**해소 계획**: F535 (Sprint 288, P1) — 정식 API + 웹 UI 'Graph 모드 실행' 버튼

### Gap 3 — MetaAgent 자동 진단 훅 부재 (P1)

**증상**: MetaAgent diagnose API는 동작하지만, 수동 호출 시에만 실행된다. Agent 실행 완료 시점에 자동으로 진단이 트리거되지 않는다.

**현재 반환값**: 6축 모두 `score: 50, rawValue: 0, unit: "N/A", trend: "stable"` — "데이터 없음"에 대한 기본값.

**원인**: 집계할 메트릭 자체가 없음(Gap 1)과 Agent 라이프사이클 hook 미구현.

**해소 계획**: F536 (Sprint 289, P1) — F534 의존. Graph/Agent 실행 완료 hook에서 MetaAgent.diagnose() 자동 호출

## 5. 근본 원인 분석

`★ 핵심 인사이트 ─────────────────────────────────`
**"구축 ≠ 활용" 패턴의 전형적 징후**. Phase 41+42는 4-Layer 아키텍처를 설계대로 구현했고, Gap Analysis 96%, E2E 9/9 PASS, TDD 전체 통과를 달성했다. 하지만 **"코드가 실제로 돌 때 데이터가 흐르는가?"** 라는 질문에는 답하지 못했다.

이는 MEMORY `feedback_step0_pattern.md`(S249)에서 지적한 패턴과 동일하다:
> "테이블/스키마/타입은 만들었는데, 실제 호출부가 없어서 데이터가 쌓이지 않는 상태"
`─────────────────────────────────────────────────`

## 6. 재발 방지 — 검증 원칙 추가

Phase 43 완료 시점에 아래 "Smoke Reality" 체크를 반드시 수행한다:

1. **프로덕션 D1 실측**: 핵심 테이블(`agent_run_metrics`, `agent_improvement_proposals`)에 실제 행이 쌓였는가?
2. **실 데이터 end-to-end 실행**: 최소 1개 실제 아이템으로 전 경로 1회 실행
3. **Diagnose 6축 non-default**: rawValue 중 최소 1개가 0이 아닌 값인가?

## 7. Phase 43 등록 내역

| F | 제목 | Sprint | Priority | 의존 |
|---|------|--------|:--------:|------|
| F534 | DiagnosticCollector 실행 경로 훅 삽입 | 287 | **P0** | - |
| F535 | Graph 실행 정식 API + UI | 288 | P1 | F534 |
| F536 | MetaAgent 자동 진단 훅 | 289 | P1 | F534 |

## 8. 산출물

- PR #563 — 임시 dogfood API + 스크립트 (`scripts/dogfood-graph.sh`)
- 본 분석 문서
- SPEC.md §3/§5 Phase 43 등록 (F534~F536)
- CLAUDE.md Phase 43 추가

## 9. 교훈

1. **Plumbing 완성도와 실 데이터 흐름은 다른 문제**. 테이블 + 서비스 + 테스트가 있어도 "실제로 쓰이는지"는 별도 검증이 필요.
2. **In-memory mock으로는 hook 누락을 감지할 수 없다**. F533 integration test가 100% 통과한 이유.
3. **Dogfood가 가장 값싼 디버거**. 코드 100줄 리뷰보다 실 데이터 1회 실행이 빠름.
