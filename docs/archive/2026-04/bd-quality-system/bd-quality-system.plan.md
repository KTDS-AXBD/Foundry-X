---
code: FX-PLAN-BDQ
title: "Phase 27 — BD Quality System"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-SPEC-001]]"
---

# Phase 27: BD Quality System (F461~F470)

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F461~F470 (10 F-items) |
| Sprint | 224~229 (6 Sprints) |
| Phase | Phase 27 (BD Quality System) |
| 우선순위 | P0(F461~F468) + P1(F469~F470) |
| 의존성 | Phase 26 완료 (기존 O-G-D 인프라 + Prototype 파이프라인) |
| PRD | `docs/specs/fx-bd-quality-system/prd-final.md` |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 산출물(PRD/Offering/Prototype) 파이프라인의 구성요소가 존재하지만 유기적으로 연결되지 않아, 최종 산출물 품질이 일관되지 않고 "AI가 만들었다는 느낌"이 남음 |
| Solution | BD Sentinel(자율 메타 오케스트레이터) + QSA 3종(산출물별 전문 Discriminator) + 파이프라인 GAP 7건 복구 |
| Function UX Effect | BD팀이 콘텐츠에만 집중 → Agent가 품질/보안/디자인을 자율적으로 보장 → 고객 대면 산출물이 전문가 수준 |
| Core Value | "AI가 만들었다는 느낌이 절대 없는" 고객 대면 산출물 품질 보장 |

### 설계 원칙

| 원칙 | 적용 |
|------|------|
| First Principles Thinking | 모든 판별의 최상위 기준: "5초 안에 진짜로 느끼는가?" + "핵심 가치 체감?" + "기밀 노출?" |
| GAN 방법론 | Generator ↔ QSA(Discriminator) 적대적 품질 루프. 쉽게 통과시키지 않음 |
| 자율 운영 | 되돌릴 수 있는 변경은 자율 실행, DB 스키마/비용 영향은 사람 확인 |

---

## 마일스톤 구성

```
Phase 27-A (M1): QSA 에이전트 3종 ──── Sprint 224~225
Phase 27-B (M2): 파이프라인 GAP 복구 ── Sprint 226~227
Phase 27-C (M3): BD Sentinel 통합 ──── Sprint 228
Phase 27-D (P1): 디자인 고도화 ──────── Sprint 229
```

---

## Phase 27-A: QSA 에이전트 3종 (Sprint 224~225)

### F461: Prototype QSA 구현 (Sprint 224, P0)

**목표:** Prototype HTML 5차원 품질/보안 Discriminator 구현

**설계 완료:** `.claude/agents/prototype-qsa.md`

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `packages/api/src/services/adapters/prototype-qsa-adapter.ts` | PrototypeQsaAdapter — DomainAdapterInterface 구현, 5차원 Rubric 적용 |
| 2 | `packages/api/src/core/harness/services/css-static-analyzer.ts` | CSS 정적 분석 — AI 기본 폰트/순수 흑백/비배수 spacing/카드 중첩 검출 |
| 3 | `packages/api/src/core/harness/services/security-checker.ts` | 보안 점검 — 내부 코드명/URL/API endpoint/NDA 정보 노출 검출 |
| 4 | `packages/api/src/core/harness/routes/prototype-qsa.ts` | QSA API 엔드포인트: POST `/prototypes/:id/qsa` |
| 5 | `packages/api/src/core/harness/schemas/prototype-qsa-schema.ts` | Zod 스키마: QSA 입출력 + 5차원 결과 |
| 6 | `packages/api/src/__tests__/prototype-qsa.test.ts` | 단위 테스트: CSS 분석 + 보안 점검 + 5차원 판별 |

**핵심 로직:**
- First Principles Gate → 3-Question 사전 판정
- QSA-R1(보안, 0.25) → QSA-R2(Pitch Deck, 0.25) → QSA-R3(디자인, 0.25) → QSA-R4(내러티브, 0.15) → QSA-R5(기술, 0.10)
- CSS 정적 분석: Rule-based 필터링 (LLM 호출 전 사전 검사)
- verdict: PASS | MINOR_FIX | MAJOR_ISSUE | SECURITY_FAIL

### F462: Offering QSA 구현 (Sprint 224, P0)

**목표:** Offering HTML/PPTX 품질/보안/디자인 판별

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `.claude/agents/offering-qsa.md` | Offering QSA 에이전트 설계 |
| 2 | `packages/api/src/services/adapters/offering-qsa-adapter.ts` | OfferingQsaAdapter — DomainAdapterInterface 구현 |
| 3 | `packages/api/src/core/offering/services/offering-structure-validator.ts` | 18섹션 구조 검증 + 콘텐츠 어댑터 톤 점검 |
| 4 | `packages/api/src/core/offering/routes/offering-qsa.ts` | QSA 엔드포인트: POST `/offerings/:id/qsa` |
| 5 | `packages/api/src/__tests__/offering-qsa.test.ts` | 단위 테스트 |

**Rubric (Offering 특화):**
- OR-1: 보안 & 기밀 보호 (prototype-qsa R1과 동일 기반)
- OR-2: 콘텐츠 충실도 (DiscoveryPackage 반영도)
- OR-3: 디자인 품질 (impeccable 7도메인 + 브랜드 일관성)
- OR-4: 18섹션 구조 완결성
- OR-5: 톤 & 워딩 (purpose별 적합성)

### F463: PRD QSA 구현 (Sprint 225, P0)

**목표:** PRD 완결성/논리성/실행가능성 판별

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `.claude/agents/prd-qsa.md` | PRD QSA 에이전트 설계 |
| 2 | `packages/api/src/services/adapters/prd-qsa-adapter.ts` | PrdQsaAdapter — DomainAdapterInterface 구현 |
| 3 | `packages/api/src/core/offering/services/prd-completeness-checker.ts` | PRD 섹션별 완결성 + 논리 흐름 검증 |
| 4 | `packages/api/src/__tests__/prd-qsa.test.ts` | 단위 테스트 |

**Rubric (PRD 특화):**
- PR-1: 문제 정의 명확성 (As-Is/To-Be/시급성)
- PR-2: 기능 범위 완결성 (Must Have/Should Have/Out-of-scope)
- PR-3: 성공 기준 측정가능성 (KPI/MVP/실패조건)
- PR-4: 기술 실현 가능성
- PR-5: 논리적 일관성 (문제→해결책→성공기준 흐름)

---

## Phase 27-B: 파이프라인 GAP 복구 (Sprint 226~227)

### F464: Generation–Evaluation 정합성 (Sprint 226, P0)

**목표:** impeccable 7도메인 ↔ Discriminator 체크리스트 자동 정렬

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `packages/api/src/services/adapters/prototype-ogd-adapter.ts` | `getDefaultRubric()` 재생성 — impeccable 7도메인 전체 커버 |
| 2 | `packages/api/src/data/impeccable-reference.ts` | `getDiscriminatorChecklist()` 함수 추가 — 7도메인 → 체크리스트 자동 도출 |
| 3 | `packages/api/src/__tests__/sprint-203-impeccable.test.ts` | 정합성 테스트 추가: checklist 항목 수 = 7도메인 커버리지 |

### F465: Design Token → Generation 연결 (Sprint 226, P0)

**목표:** DesignTokenService 토큰을 prototype-styles.ts에 주입

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `packages/api/src/services/prototype-styles.ts` | `getBaseCSS(theme, tokens?)` 시그니처 확장 — 토큰 전달 시 CSS custom properties로 오버라이드 |
| 2 | `packages/api/src/services/prototype-generator.ts` | 생성 시 offering의 design tokens를 조회하여 styles에 전달 |
| 3 | `packages/api/src/__tests__/prototype-templates.test.ts` | 토큰 주입 테스트 추가 |

### F466: Feedback → Regeneration 루프 (Sprint 227, P0)

**목표:** feedback_pending Job의 피드백을 Generator에 전달하여 재생성

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `packages/api/src/core/harness/services/prototype-feedback-service.ts` | `triggerRegeneration(jobId)` 메서드 추가 — feedback_pending → building 전환 + 피드백 추출 |
| 2 | `packages/api/src/core/harness/services/ogd-orchestrator-service.ts` | `runLoop()` 호출 시 job의 feedback_content를 previousFeedback으로 전달 |
| 3 | `packages/api/src/core/harness/routes/prototype-feedback.ts` | POST `/jobs/:id/feedback` 응답에 재생성 트리거 여부 포함 |
| 4 | `packages/api/src/__tests__/prototype-feedback.test.ts` | 피드백→재생성 통합 테스트 |

### F467: Quality 데이터 통합 (Sprint 227, P0)

**목표:** ogd_rounds → prototype_quality 자동 적재

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `packages/api/src/core/harness/services/ogd-orchestrator-service.ts` | `runLoop()` 완료 시점에 `PrototypeQualityService.insert()` 호출 추가 |
| 2 | `packages/api/src/core/harness/services/prototype-quality-service.ts` | `fromOgdRound(ogdResult)` 정적 메서드 — 5차원 분해 로직 |
| 3 | `packages/api/src/__tests__/prototype-quality.test.ts` | 자동 적재 + 5차원 분해 테스트 |

---

## Phase 27-C: BD Sentinel 통합 (Sprint 228)

### F468: BD Sentinel 구현 (Sprint 228, P0)

**목표:** BD 산출물 전체 자율 감시 메타 오케스트레이터

**설계 기반:** `.claude/agents/prototype-sentinel.md` → `bd-sentinel.md`로 확장

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `.claude/agents/bd-sentinel.md` | BD Sentinel 에이전트 설계 — prototype-sentinel 확장, Offering/PRD Sector 추가 |
| 2 | `packages/api/src/core/harness/services/sentinel-audit-service.ts` | 7+ Sector 자율 감시 로직 — DDPEV 사이클 구현 |
| 3 | `packages/api/src/core/harness/routes/sentinel.ts` | Sentinel API: POST `/sentinel/audit` (전체), POST `/sentinel/sector/:id` (개별) |
| 4 | `packages/api/src/core/harness/schemas/sentinel-report-schema.ts` | Sentinel Report Zod 스키마 |
| 5 | `packages/api/src/__tests__/sentinel-audit.test.ts` | Sector별 감지 + 자율 수정 테스트 |

**7+ Sector 구성 (Prototype 7개 → BD 전체 확장):**
- S1: Generation–Evaluation 정합성 (기존)
- S2: Design Token → Generation 연결 (기존)
- S3: Feedback Loop 완결성 (기존)
- S4: Quality 데이터 일관성 (기존)
- S5: CSS 정적 품질 (기존)
- S6: 에이전트 스펙 일관성 (기존)
- S7: 엔드투엔드 산출물 품질 (기존)
- S8: Offering 파이프라인 일관성 (신규)
- S9: PRD → Offering → Prototype 흐름 연속성 (신규)

---

## Phase 27-D: 디자인 고도화 (Sprint 229, P1)

### F469: CSS Anti-Pattern Guard (Sprint 229, P1)

**목표:** 생성 시점에서 AI 기본 폰트/순수 흑백/비배수 spacing 사전 차단

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `packages/api/src/core/harness/services/css-anti-pattern-guard.ts` | 생성 후처리 — CSS 정규화 (font-family 교체, 색상 tinting, spacing 정규화) |
| 2 | `packages/api/src/core/harness/services/ogd-generator-service.ts` | 생성 후 guard 자동 적용 |
| 3 | `packages/api/src/__tests__/css-anti-pattern-guard.test.ts` | 안티패턴 검출 + 자동 수정 테스트 |

### F470: HITL Review → Action 연결 (Sprint 229, P1)

**목표:** revision_requested 리뷰가 피드백→재생성 자동 트리거

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `packages/api/src/core/harness/services/prototype-review-service.ts` | `onRevisionRequested()` 훅 — comment를 feedback으로 변환 |
| 2 | `packages/api/src/core/harness/services/prototype-feedback-service.ts` | ReviewService → FeedbackService 자동 연결 |
| 3 | `packages/api/src/__tests__/prototype-review.test.ts` | revision_requested → 재생성 트리거 통합 테스트 |

---

## Sprint 배치 및 의존성

```
Sprint 224: F461 + F462 (병렬 — QSA 2종, 서로 독립)
Sprint 225: F463 (PRD QSA, F461/F462 패턴 기반)
Sprint 226: F464 + F465 (병렬 — 정합성 복구 + 토큰 연결, 서로 독립)
Sprint 227: F466 + F467 (병렬 — 피드백 루프 + Quality 통합, 서로 독립)
Sprint 228: F468 (BD Sentinel — F461~F467 모두 선행)
Sprint 229: F469 + F470 (병렬 — P1 디자인 고도화)
```

### 충돌 영역 분석

| Sprint | 동시 F-item | 충돌 위험 | 대응 |
|--------|-----------|----------|------|
| 224 | F461+F462 | 낮음 — 서로 다른 adapters/ 파일 | 안전 병렬 |
| 226 | F464+F465 | 낮음 — adapter vs styles 파일 | 안전 병렬 |
| 227 | F466+F467 | 중간 — 둘 다 ogd-orchestrator 수정 | orchestrator 파일 merge 주의 |
| 229 | F469+F470 | 낮음 — guard vs review 파일 | 안전 병렬 |

---

## 리스크 및 대응

| # | 리스크 | 영향도 | 대응 |
|---|--------|--------|------|
| 1 | LLM 평가 신뢰성 — Llama-3.1-8b의 판별 정확도 | 높음 | F461 PoC에서 최소 10건 샘플 평가 → False Positive/Negative 비율 확인 |
| 2 | 1인 개발 부담 | 중간 | Sprint 병렬 배치 최적화 + Agent 자율 운영으로 부담 경감 |
| 3 | O-G-D 루프 무한 재생성 | 중간 | MAX_ROUNDS 상수 유지 + Circuit Breaker 패턴 적용 |
| 4 | 비용 초과 | 낮음 | Workers AI 무료 티어 + Rule-based 사전 필터링으로 LLM 호출 최소화 |

---

## 검증 전략

| 단계 | 검증 방법 |
|------|----------|
| Sprint 224 완료 시 | Prototype QSA로 기존 Prototype 3건 판별 → 결과 리뷰 |
| Sprint 226 완료 시 | impeccable 7도메인 ↔ Discriminator 체크리스트 커버리지 100% 확인 |
| Sprint 228 완료 시 | BD Sentinel 전체 audit 실행 → 7 GAP 모두 해소 확인 |
| Phase 27 완료 시 | 새 Prototype 1건 생성 → QSA PASS + Sentinel HEALTHY 동시 달성 |
