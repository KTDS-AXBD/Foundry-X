---
code: FX-PLAN-S226
title: Sprint 226 Plan — Prototype QSA + Offering QSA (F461/F462)
version: "1.0"
status: Active
category: PLAN
created: 2026-04-08
updated: 2026-04-08
author: Claude Sonnet 4.6 (autopilot)
sprint: 226
---

# Sprint 226 Plan — Prototype QSA + Offering QSA

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 226 |
| F-items | F461, F462 |
| Phase | 27-A: QSA 에이전트 3종 |
| 우선순위 | P0 |
| 목표 | Prototype·Offering 전용 QSA Discriminator 코드 연동 |

## F461: Prototype QSA 코드 연동

**배경:** `.claude/agents/prototype-qsa.md` 에이전트 설계가 Sprint 226 이전에 완료됨.  
이 Sprint에서 설계를 `DomainAdapterInterface` TypeScript 구현으로 연결한다.

**구현 대상:**
- `packages/api/src/services/adapters/prototype-qsa-adapter.ts`
  - `DomainAdapterInterface` 구현 (prd-qsa-adapter.ts 패턴)
  - 5차원 Rubric: QSA-R1(Security,0.25) + QSA-R2(Content,0.25) + QSA-R3(Design,0.25) + QSA-R4(Structure,0.15) + QSA-R5(Technical,0.10)
  - CSS 정적 분석 (AI 기본 폰트/순수 흑백회색/비배수 spacing/중첩 카드 검출)
  - First Principles Gate (3-Question 사전 판정)
- `packages/api/src/__tests__/adapters/prototype-qsa-adapter.test.ts`
  - domain/displayName/description 기본값
  - getDefaultRubric() 5차원 포함
  - discriminate() pass 판정 (good HTML)
  - discriminate() security_fail 판정 (기밀 노출 HTML)
  - discriminate() LLM parse 실패 fallback

## F462: Offering QSA 설계+구현

**배경:** Offering QSA는 설계와 구현 모두 이 Sprint에서 신규 작성한다.

**구현 대상:**
- `.claude/agents/offering-qsa.md` (설계 문서)
  - Offering(HTML/PPTX) 전용 QSA Discriminator
  - 18섹션 구조 검증 + 브랜드 일관성 + 콘텐츠 어댑터 톤 점검
  - 5차원 Rubric: OQ-R1(Structure,0.25) + OQ-R2(Content,0.25) + OQ-R3(Design,0.20) + OQ-R4(Brand,0.20) + OQ-R5(Security,0.10)
- `packages/api/src/services/adapters/offering-qsa-adapter.ts`
  - `DomainAdapterInterface` 구현
  - offering-qsa.md Rubric 기반 판별
- `packages/api/src/__tests__/adapters/offering-qsa-adapter.test.ts`
  - domain/displayName/description 기본값
  - getDefaultRubric() 5차원 포함
  - discriminate() pass/fail 케이스

## 수용 기준

- [ ] F461: prototype-qsa-adapter.ts 구현 완료
- [ ] F461: CSS 정적 분석 함수 포함
- [ ] F461: 테스트 통과 (최소 10개 케이스)
- [ ] F462: offering-qsa.md 에이전트 설계 완료
- [ ] F462: offering-qsa-adapter.ts 구현 완료
- [ ] F462: 테스트 통과 (최소 8개 케이스)
- [ ] typecheck 통과
- [ ] lint 통과

## 비고

- prd-qsa-adapter.ts (F463, Sprint 225)를 참조 패턴으로 사용
- DomainAdapterInterface: `@foundry-x/shared` ogd-generic.ts
- 기존 EvaluatorOptimizer와의 연결은 Phase 27-B(F464~)에서 수행
