---
id: FX-PLAN-279
title: Sprint 279 Plan — F526 autopilot Verify E2E 통합
sprint: 279
status: done
date: 2026-04-13
req: FX-REQ-554
---

# Sprint 279 Plan — F526

## 목표

Sprint autopilot의 Step 5~6(Verify/Report)에 E2E 자동 생성 + 실행 + Composite Score 산출을 통합한다.
F524(e2e-extractor), F525(gap-scorer)를 오케스트레이션하는 파이프라인 레이어를 구현한다.

## 범위 (F526 M3)

| # | 산출물 | 설명 |
|---|--------|------|
| 1 | `e2e-runner.ts` | Design doc → 생성 → 실행 → Composite Score 파이프라인 서비스 |
| 2 | `e2e-verify` CLI command | `foundry-x e2e-verify <N> --gap-rate <R>` |
| 3 | `index.ts` 등록 | 기존 CLI에 커맨드 추가 |
| 4 | sprint-autopilot SKILL.md | Step 5b를 F526 통합 버전으로 교체 |

## 제외

- E2E flaky 관리 자동화 (PRD S1/S2 — 별도 Sprint)
- 크로스 서비스 E2E (Out of Scope)

## Sprint 배정

- Sprint: 279
- Branch: `sprint/279`
- Worktree: `~/work/worktrees/Foundry-X/sprint-279`

## TDD 계획

- `e2e-runner.test.ts` — 6개 시나리오 (Red → Green)
  - Design doc 없음 → error VerifyResult
  - Playwright 전체 PASS → Composite 97%
  - Playwright 일부 FAIL → Composite < 90
  - Playwright 실행 불가 → Gap fallback
  - spec 파일 경로 반환 확인
  - 시나리오 수 반영 확인
