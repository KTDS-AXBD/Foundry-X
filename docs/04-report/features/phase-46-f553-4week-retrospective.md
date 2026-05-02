---
id: FX-RPRT-F553
title: Phase 46 F553 — Dual-AI Verification 4주 관측 회고 + GO/NO-GO
sprint: 321
feature: F553
req: FX-REQ-590
type: retrospective
created: 2026-05-02
author: Sinclair Seo
---

# Phase 46 F553 — 4주 관측 회고

> 관측 기간: 2026-04-04 ~ 2026-05-02 (28일)
> 트리거: F552 Dual-AI Verification PR #608 merge (Sprint 303)
> 데이터 소스: Production D1 `foundry-x-db` 직접 쿼리 (MCP)

---

## 1. 실측 데이터

### 1.1 dual_ai_reviews (Codex 검증 기록)

| 지표 | 4주 실측값 |
|------|-----------|
| 총 리뷰 건수 | **0건** |
| 회귀율 (Codex 감지, Claude 미감지) | 산출 불가 |
| Codex/Claude 합의율 | 산출 불가 |
| false positive 분포 | 산출 불가 |
| degraded 비율 | 100% (전부 degraded) |

### 1.2 agent_run_metrics (MetaAgent 실행 지표)

| 지표 | 4주 실측값 |
|------|-----------|
| 총 실행 건수 | **116건** |
| status=completed 비율 | 100% |
| stop_reason=end_turn 비율 | 100% |
| 평균 rounds | 1.0 |
| 평균 duration | 28,410ms (~28초) |
| 평균 input_tokens | 2,727 |
| output_tokens | 0 (기록 버그) |

### 1.3 agent_improvement_proposals (MetaAgent 개선 제안)

| 지표 | 4주 실측값 |
|------|-----------|
| 총 제안 건수 | **27건** |
| 적용(applied) 건수 | **0건** |
| status=pending 비율 | 100% |
| type 분포 | prompt(15) / graph(6) / tool(4) / model(2) |
| rubric_score | 100 (전부 기본값) |

### 1.4 agent_model_comparisons (모델 A/B)

| 지표 | 4주 실측값 |
|------|-----------|
| 총 비교 건수 | **1건** |
| 모델 | claude-sonnet-4-6 |
| prompt_version | 2.0 |
| proposal_count | 6 |
| 6축 rawValue=0 건수 | 6/6 (전부) |

---

## 2. 핵심 발견 (4개 갭)

### GAP-1: dual_ai_reviews 0건 — autopilot D1 저장 경로 미연결

**현상**: 4주간 모든 Sprint autopilot Phase 5c 실행에도 D1 insert 0건.

**근본 원인 (3단계 체인)**:
1. `codex-review.sh` → `codex-review.json` 로컬 기록 (정상)
2. `save-dual-review.sh` 존재 (`scripts/autopilot/save-dual-review.sh`) — API POST로 D1 저장하는 스크립트
3. **문제**: `sprint-autopilot` Step 5c가 `codex-review.sh`만 실행하고 `save-dual-review.sh`를 호출하지 않음

**영향**: F553 (a) 분석 목표 전체 달성 불가. Dual-AI 검증이 4주간 사실상 단일 AI로만 작동.

**후속 조치**: Sprint 322 또는 Phase 47에서 `sprint-autopilot` Step 5c에 `save-dual-review.sh` 호출 추가 (backlog C-track 대상).

### GAP-2: output_tokens = 0 기록 버그

**현상**: 116건 `agent_run_metrics` 전부 `output_tokens=0`.

**근본 원인 후보**: `meta-agent.ts`에서 Claude API `usage.output_tokens`를 `agent_run_metrics` insert 시 전달하지 않음. 스키마에 컬럼은 있으나 기록 코드 누락.

**영향**: MetaAgent 비용 분석 불가. 토큰 효율성 비교 어려움.

**후속 조치**: `packages/api/src/core/agent/services/meta-agent.ts` output_tokens 기록 코드 확인 및 추가.

### GAP-3: 27개 proposals 전부 pending — 검토·적용 루프 미작동

**현상**: 4주 27건 제안이 모두 pending 상태로 방치.

**근본 원인**: MetaAgent는 `agent_improvement_proposals`에 insert하지만, 검토(human review) → approve → apply 루프가 UI/자동화 어디서도 트리거되지 않음.

**영향**: MetaAgent Self-Improvement 루프가 "제안 생성"에서 멈춤. 실제 에이전트 동작 개선 없음.

**후속 조치**: Work Management UI에 proposals 검토 탭 활성화 또는 auto-apply 로직 구현.

### GAP-4: R6 rawValue=0 잔존 (DiagnosticCollector 미배선)

**현상**: 2026-04-14 KOAMI dogfood에서 6축 모두 rawValue=0. F534 (Phase 43) 교훈 재현.

**근본 원인**: `DiagnosticCollector.record()` 호출 위치가 실제 MetaAgent 실행 경로에 없음. `meta-agent.ts`가 report를 소비하지만 실측 지표를 수집하는 훅이 누락.

**영향**: rubric 6축 점수 전부 미신뢰. 가중치 튜닝 불가.

**후속 조치**: `DiagnosticCollector` 주입 사이트 전수 점검 (F534 D1 체크리스트 재적용).

---

## 3. 긍정적 신호

| 항목 | 내용 |
|------|------|
| MetaAgent 안정성 | 116 runs / 4주 / 100% completed — 안정적 운영 |
| 수렴 성능 | avg 28초 / 1 round / end_turn — 빠른 제안 생성 |
| 제안 다양성 | prompt(55%) + graph(22%) + tool(15%) + model(7%) — 균형 잡힌 분포 |
| KOAMI Dogfood | 6개 구체적 instrumentation 제안 (DiagnosticCollector 배선 방향 명시) |
| fx-agent prod LIVE | Sprint 320 완료 — Phase 45 완결, Phase 46 기반 확보 |

---

## 4. rubric 가중치 재조정 (F553-b) — 보류

**판정**: 데이터 불충분으로 Sprint 321에서 가중치 재조정 보류.

**이유**:
- `rubric_score=100` 기본값 — 실측 점수 없음
- `rawValue=0` 6축 전부 — 점수 분포 추출 불가
- 가중치 변경 근거가 없는 상태에서 수정은 위험

**재조정 조건**: GAP-4(DiagnosticCollector 배선) 해소 후 2주 이상 실측 데이터 수집 → Phase 47에서 재검토.

---

## 5. MetaAgent 모델 A/B (F553-c) — defer

**판정**: 1건 데이터로 통계 불가. Phase 47로 defer.

**현행 기준선**: claude-sonnet-4-6, prompt_version=2.0, 6 proposals/run.

**비교 후보 (Phase 47)**:
- claude-opus-4-7: 복잡한 DiagnosticCollector 배선 제안에 더 적합 가능성
- claude-haiku-4-5: 빠른 응답 필요 시나리오 비용 최적화

---

## 6. Phase 46 GO/NO-GO 판정

### 판정 기준표

| 게이트 | 기준 | 실측 | 판정 |
|--------|------|------|------|
| MetaAgent 안정 작동 | 100건 이상 / 에러 없음 | 116건, 0 error | ✅ PASS |
| Dual-AI 검증 기능 | 1건 이상 D1 기록 | 0건 | ❌ FAIL |
| F571 완료 (전제) | Sprint 320 ✅ | PR #697 MERGED | ✅ PASS |
| 심각한 회귀 없음 | prod 정상 응답 | 401/403 인증 정상 | ✅ PASS |

### 판정: **CONDITIONAL GO** ✅ (F575 착수 가능)

**근거**:
- F575(Agent 잔여 7 routes 이관)는 Dual-AI 검증 인프라와 **기능적으로 독립**
- F575는 코드 이관 작업 — Dual-AI 게이트가 적용되지 않는 도메인 분리 작업
- MetaAgent 기본 작동 정상 (116 runs, 100% 수렴)
- GAP-1~4는 Phase 47 별도 backlog으로 분리 처리

**조건**:
- GAP-1 (save-dual-review 미호출) 해소는 Sprint 322 또는 Phase 47 착수 전에 C-track으로 처리 권장
- F575 PR merge 후 Phase Exit P1~P4 Smoke Reality 필수 (fx-gateway 경유 KOAMI dogfood)

---

## 7. 후속 Backlog (Phase 46 / Phase 47 등록 대상)

| ID | 제목 | 우선순위 | 분류 |
|----|------|---------|------|
| TBD-C | autopilot Step 5c에 save-dual-review.sh 호출 추가 | P1 | C-track |
| TBD-C | meta-agent.ts output_tokens 기록 코드 추가 | P2 | C-track |
| TBD-F | proposals 검토·적용 루프 구현 | P2 | F-track |
| TBD-F | DiagnosticCollector 주입 사이트 전수 배선 (F534 재적용) | P1 | F-track |
| TBD-F | MetaAgent 모델 A/B (Opus 4.7 vs Sonnet 4.6) | P3 | F-track |

---

## 8. 결론

F552 인프라 배선(F554 hotfix 포함)은 성공적으로 완료되었으나,
**데이터 수집 루프의 마지막 1cm — `save-dual-review.sh` 호출 — 가 연결되지 않았다.**

4주 관측 결과는 "0건"이지만, 이는 Dual-AI 검증 아이디어의 실패가 아니다.
인프라는 존재하고, MetaAgent는 116번 실행됐고, 27개 제안이 생성됐다.
배선 1개만 연결하면 다음 4주는 실측 데이터를 수집할 수 있다.

**Phase 46 F575는 GO. Dual-AI 완전 활성화는 Phase 47.**
