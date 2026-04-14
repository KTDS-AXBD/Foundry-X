---
code: FX-PLAN-290
title: "Sprint 290 — F542 MetaAgent 프롬프트 품질 개선 + 모델 전환"
version: 1.0
status: Active
category: PLAN
feature: F542
req: FX-REQ-571
created: 2026-04-14
updated: 2026-04-14
author: Sinclair Seo
---

# Sprint 290 Plan — F542 MetaAgent Prompt Quality Tuning

## 목표

Phase 43 Dogfood 3회에서 0건이었던 `agent_improvement_proposals`를 ≥1건 생성하고 apply 경로를 검증한다.

## 범위 (MVP)

| # | 기능 | 파일 |
|---|------|------|
| M1 | systemPrompt 강화 (few-shot + rawValue=0 규칙) | `specs/meta-agent.agent.yaml`, `services/meta-agent.ts` |
| M2 | `META_AGENT_MODEL` 환경변수 플래그 (기본: Sonnet 4.6) | `src/env.ts`, `services/meta-agent.ts`, `routes/meta.ts` |
| M3 | A/B 비교 D1 테이블 + GET API | `0136_agent_model_comparisons.sql`, `services/model-comparisons.ts`, `routes/meta.ts` |
| M4 | Rubric 자동 채점 (`rubric_score` 컬럼) | `0137_proposal_rubric_score.sql`, `services/proposal-rubric.ts`, `shared/agent-meta.ts` |
| M5 | Apply 경로 E2E 검증 (기존 `proposal-apply.ts` 강화) | `__tests__/services/proposal-apply.test.ts` |

## TDD 계획

- Red Phase: `meta-agent.test.ts` 보강, `model-comparisons.test.ts` 신규, `proposal-rubric.test.ts` 신규
- Green Phase: 서비스 구현 + 마이그레이션

## 성공 기준 (K1, K3)

- K1: Dogfood 1회에서 proposals ≥1건 D1 저장
- K3: apply 경로 성공률 100%
