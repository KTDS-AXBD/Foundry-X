---
id: FX-PLAN-321
title: Sprint 321 Plan — F553 4주 관측 회고 + 회귀율 리포트 + 모델 튜닝
sprint: 321
feature: F553
req: FX-REQ-590
priority: P1
status: active
created: 2026-05-02
---

# Sprint 321 Plan — F553 4주 관측 회고

## 목적

F552 Dual-AI Verification(PR #608) merge 후 4주(2026-04-04~2026-05-02) 관측 데이터를 기반으로:
1. Codex + Claude 합의율 / 회귀율 / false positive 분포 실측 분석
2. MetaAgent rubric 6축 가중치 재조정 후보 식별
3. Phase 46 진입 GO/NO-GO 결정

## 배경

| 항목 | 내용 |
|------|------|
| 트리거 | F552 PR #608 merge (Sprint 303, 2026-04-04) |
| 관측 기간 | 4주 (2026-04-04 ~ 2026-05-02) |
| 핵심 테이블 | `dual_ai_reviews` (D1 migration 0138) |
| 관련 서비스 | `packages/api/src/core/verification/services/dual-review.service.ts` |

## 범위 (F553 SPEC 준수)

### (a) dual_ai_reviews 분석
- 회귀율: Codex가 잡은 결함 중 Claude 미감지 비율
- Codex/Claude 합의율
- false positive 분포 (BLOCK 판정 중 실제 결함 없는 케이스)
- degraded 모드 비율

### (b) rubric-evaluator 가중치 재조정
- `packages/api/src/core/agent/services/meta-agent.ts` 6축 점수 분포 확인
- R6(rawValue=0) 잔존 여부 확정
- 조정 후보 파라미터 식별

### (c) MetaAgent 모델 A/B 검토
- 현재 Sonnet 4.6 성능 기준선 설정
- 후속 모델 비교 후보 식별 (claude-opus-4-7 등)
- `packages/api/src/db/migrations/0136_agent_model_comparisons.sql` 활용

### (d) 회고 문서 작성
- `docs/04-report/features/phase-46-f553-4week-retrospective.md`

### (e) Phase 46 GO/NO-GO
- F575 착수 전 품질 게이트 판정

## 구현 전략

**분석 중심 Sprint** — 코드 변경 < 문서 산출물

| 작업 유형 | 비율 | 내용 |
|----------|------|------|
| D1 쿼리 분석 | 40% | production dual_ai_reviews 실측 |
| 문서 작성 | 40% | 회고 + GO/NO-GO 리포트 |
| 코드 튜닝 | 20% | rubric 가중치 상수 조정 (조건부) |

## TDD 적용 여부

- (a)(d)(e): 면제 — meta-only 분석/문서
- (b) 가중치 조정: 기존 rubric 테스트 회귀 확인 (TDD 필수 아님, 기존 test PASS 유지)
- (c) A/B 설정: 면제 — 관찰 범위

## 예상 산출물

1. `docs/04-report/features/phase-46-f553-4week-retrospective.md`
2. `packages/api/src/core/agent/services/meta-agent.ts` (rubric 조정 시)
3. SPEC.md §5 F553 상태 → ✅

## 완료 기준

- [ ] dual_ai_reviews production 데이터 실측 완료 (또는 데이터 없음 판정)
- [ ] 회귀율 / 합의율 수치 기록
- [ ] Phase 46 GO/NO-GO 판정 명시
- [ ] 회고 문서 docs/04-report/ 등재
- [ ] SPEC.md F553 → ✅
