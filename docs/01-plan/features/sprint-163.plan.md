---
code: FX-PLAN-S163
title: "Sprint 163 — O-G-D Loop 범용 인터페이스 + 어댑터 레지스트리"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-S161]], fx-harness-evolution/prd-final.md, FX-STRT-015 v3.0"
---

# Sprint 163: O-G-D Loop 범용 인터페이스 + 어댑터 레지스트리

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F360 O-G-D Loop 범용 인터페이스 + 어댑터 레지스트리 |
| Sprint | 163 |
| 우선순위 | P0 |
| 의존성 | Phase 16 F355 (O-G-D 품질 루프) ✅ 완료. Sprint 161 (Guard Rail 인프라) ✅ 완료 |
| Phase | 17 — Self-Evolving Harness v2 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | O-G-D Loop이 BD 형상화와 Prototype 생성에만 사용됨. 코드리뷰·문서검증 등 다른 도메인에 재활용 불가 |
| Solution | 도메인 독립적 O-G-D 호출 인터페이스 + 어댑터 레지스트리로 신규 도메인 추가를 표준화 |
| Function UX Effect | API 1개로 BD·코드리뷰·문서검증·Prototype 4개 도메인의 O-G-D Loop 호출 가능 |
| Core Value | Phase 14 하네스 인프라 투자의 ROI 증명 — 도메인 간 재활용이 실질적으로 작동 |

---

## 1. Overview

### 1.1 Purpose

Phase 14(F335)의 OrchestrationLoop과 Phase 16(F355)의 O-G-D 품질 루프를 **도메인 독립적 인터페이스**로 추상화한다. 새 도메인을 추가할 때 어댑터만 구현하면 O-G-D Loop을 재활용할 수 있는 구조를 만든다.

### 1.2 Background

- **전략 문서 §6.2**: "F355 O-G-D Loop 재활용 — 하네스 투자의 첫 번째 도메인 간 재활용 사례"
- **전략 문서 §6.3 P1**: "O-G-D Loop 범용화 — BD 외 도메인(코드리뷰, 문서검증 등)에도 적용"
- **PRD M5+M6**: OGDRequest/OGDResult 도메인 독립 API + 어댑터 레지스트리
- **KPI**: O-G-D 도메인 간 재활용 수 ≥ 3

### 1.3 Related Documents

- PRD: `docs/specs/fx-harness-evolution/prd-final.md` (§4.1 M5+M6)
- Phase 14 OrchestrationLoop: `packages/api/src/services/orchestration-loop.ts`
- Phase 16 O-G-D: `packages/api/src/services/ogd-orchestrator-service.ts`
- Agent Adapter: `packages/api/src/services/agent-adapter-factory.ts`

---

## 2. Scope

### 2.1 In Scope

- [ ] OGDInterface 추상 타입 — `OGDRequest { domain, input, rubric, maxRounds }` → `OGDResult { output, score, iterations }`
- [ ] DomainAdapter 인터페이스 — Generator + Discriminator + Rubric 3요소 정의
- [ ] 어댑터 레지스트리 — 도메인 이름으로 어댑터 등록/조회, D1 테이블
- [ ] 4개 도메인 어댑터 구현:
  - BD 형상화 (기존 ogd-orchestrator-service 래핑)
  - Prototype 생성 (기존 Phase 16 F355 래핑)
  - 코드리뷰 (신규 — diff 입력 → 리뷰 결과)
  - 문서검증 (신규 — 문서 입력 → 일관성 체크)
- [ ] 통합 API — POST /ogd/run { domain, input, rubric }
- [ ] 어댑터 관리 API — GET/POST /ogd/adapters
- [ ] 단위 + 통합 테스트

### 2.2 Out of Scope

- OrchestrationLoop 자체 리팩토링 (기존 코드 래핑만)
- 신규 LLM 모델 연동 (기존 Anthropic/OpenRouter 활용)
- 대시보드 UI (Sprint 164 F362에서 탭 추가)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | OGDRequest/OGDResult 도메인 독립 타입 정의 | High | Pending |
| FR-02 | DomainAdapter 인터페이스 (generate, discriminate, getRubric 3메서드) | High | Pending |
| FR-03 | OGDAdapterRegistry — register(domain, adapter), get(domain), list() | High | Pending |
| FR-04 | BD 형상화 어댑터 — 기존 ogd-orchestrator-service를 DomainAdapter로 래핑 | High | Pending |
| FR-05 | Prototype 어댑터 — 기존 F355 O-G-D를 DomainAdapter로 래핑 | High | Pending |
| FR-06 | 코드리뷰 어댑터 — diff + context 입력 → LLM 리뷰 → 점수 + 피드백 | Medium | Pending |
| FR-07 | 문서검증 어댑터 — 문서 + 규칙 입력 → LLM 검증 → 일관성 점수 + 이슈 목록 | Medium | Pending |
| FR-08 | POST /ogd/run 통합 API — domain으로 어댑터 자동 선택 → O-G-D Loop 실행 | High | Pending |
| FR-09 | ogd_adapters D1 테이블 — 등록된 어댑터 메타데이터 관리 | Medium | Pending |
| FR-10 | 수렴 판정 — maxRounds + minScore로 O-G-D Loop 종료 조건 통일 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 단일 O-G-D round < 30초 (LLM 호출 포함) | API 응답 시간 측정 |
| Extensibility | 새 도메인 어댑터 추가 시 기존 코드 수정 0줄 | 어댑터만 구현 + 레지스트리 등록 |
| Compatibility | 기존 BD/Prototype O-G-D 기능 회귀 없음 | 기존 테스트 pass |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] POST /ogd/run 으로 4개 도메인 모두 호출 성공
- [ ] 기존 BD 형상화 O-G-D가 새 인터페이스를 통해 동일하게 동작
- [ ] 코드리뷰 + 문서검증 어댑터 각각 1건 이상 O-G-D Loop 완료
- [ ] ogd_adapters D1 테이블에 4개 어댑터 등록
- [ ] 단위 + 통합 테스트 pass

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] TypeScript strict mode
- [ ] 기존 O-G-D 테스트 회귀 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 기존 OrchestrationLoop 추상화 범위 과대 | High | Medium | 래핑만 수행, 기존 코드 수정 최소화. Adapter Pattern으로 기존 인터페이스 유지 |
| BD/Prototype 어댑터가 기존 동작과 불일치 | Medium | Low | 기존 서비스의 public 메서드를 그대로 호출. 통합 테스트로 검증 |
| 코드리뷰/문서검증 어댑터 품질 불확실 | Medium | Medium | MVP 수준 — Rubric 기반 단순 LLM 판정. 고도화는 후속 |
| LLM 비용 증가 (4 도메인 × 다중 라운드) | Low | Medium | maxRounds 기본값 3, minScore 0.85로 라운드 제한 |

---

## 6. Architecture Considerations

### 6.1 인터페이스 설계

```typescript
// OGD 요청/응답 — 도메인 독립
interface OGDRequest {
  domain: string;          // 'bd-shaping' | 'prototype' | 'code-review' | 'doc-verify'
  input: unknown;          // 도메인별 입력 (제네릭)
  rubric?: string;         // 평가 기준 (없으면 어댑터 기본값)
  maxRounds?: number;      // 최대 라운드 (기본 3)
  minScore?: number;       // 최소 합격 점수 (기본 0.85)
  tenantId: string;
}

interface OGDResult {
  domain: string;
  output: unknown;         // 최종 산출물
  score: number;           // 최종 점수 (0~1)
  iterations: number;      // 실행 라운드 수
  converged: boolean;      // 수렴 여부
  rounds: OGDRound[];      // 라운드별 상세
}

// 도메인 어댑터 인터페이스
interface DomainAdapter {
  domain: string;
  generate(input: unknown, feedback?: string): Promise<unknown>;
  discriminate(output: unknown, rubric: string): Promise<{ score: number; feedback: string; pass: boolean }>;
  getDefaultRubric(): string;
}
```

### 6.2 기존 코드 래핑 전략

| 기존 서비스 | 래핑 대상 | 어댑터 |
|------------|----------|--------|
| `ogd-orchestrator-service.ts` | BD 형상화 O-G-D | BdShapingAdapter |
| `ogd-generator-service.ts` + `ogd-discriminator-service.ts` | Prototype O-G-D | PrototypeAdapter |
| (신규) | 코드리뷰 | CodeReviewAdapter |
| (신규) | 문서검증 | DocVerifyAdapter |

### 6.3 D1 스키마

```sql
CREATE TABLE IF NOT EXISTS ogd_adapters (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  adapter_type TEXT NOT NULL,       -- 'builtin' | 'custom'
  default_rubric TEXT,
  default_max_rounds INTEGER DEFAULT 3,
  default_min_score REAL DEFAULT 0.85,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 7. 작업 목록

| # | 영역 | 파일 | 작업 내용 |
|---|------|------|-----------|
| 1 | Shared | `shared/src/ogd-generic.ts` | OGDRequest, OGDResult, DomainAdapter, OGDRound 타입 |
| 2 | Migration | `api/src/db/migrations/NNNN_ogd_adapters.sql` | ogd_adapters 테이블 |
| 3 | Service | `api/src/services/ogd-adapter-registry.ts` | 어댑터 레지스트리 — register/get/list + D1 연동 |
| 4 | Service | `api/src/services/ogd-generic-runner.ts` | 도메인 독립 O-G-D Loop 실행기 — 어댑터 호출 + 수렴 판정 |
| 5 | Adapter | `api/src/services/adapters/bd-shaping-adapter.ts` | 기존 ogd-orchestrator-service 래핑 |
| 6 | Adapter | `api/src/services/adapters/prototype-adapter.ts` | 기존 F355 O-G-D 래핑 |
| 7 | Adapter | `api/src/services/adapters/code-review-adapter.ts` | 신규 — diff 입력 → LLM 리뷰 |
| 8 | Adapter | `api/src/services/adapters/doc-verify-adapter.ts` | 신규 — 문서 일관성 검증 |
| 9 | Schema | `api/src/schemas/ogd-generic-schema.ts` | Zod: OGDRunRequest, OGDRunResponse, AdapterInfo |
| 10 | Route | `api/src/routes/ogd-generic.ts` | POST /ogd/run + GET/POST /ogd/adapters |
| 11 | Test | `api/src/__tests__/ogd-generic-runner.test.ts` | 러너 단위 테스트 (mock adapter) |
| 12 | Test | `api/src/__tests__/ogd-adapters.test.ts` | 4개 어댑터 + 레지스트리 테스트 |

---

## 8. Implementation Order

```
1. shared/src/ogd-generic.ts              — 타입 정의
2. D1 migration                           — ogd_adapters 테이블
3. schemas/ogd-generic-schema.ts          — Zod
4. services/ogd-adapter-registry.ts       — 레지스트리
5. services/ogd-generic-runner.ts         — 범용 러너
6. services/adapters/bd-shaping-adapter.ts   — BD 래핑
7. services/adapters/prototype-adapter.ts    — Prototype 래핑
8. services/adapters/code-review-adapter.ts  — 코드리뷰 신규
9. services/adapters/doc-verify-adapter.ts   — 문서검증 신규
10. routes/ogd-generic.ts                 — API 3개
11. tests (2파일)                         — 러너 + 어댑터
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Initial draft — PRD M5+M6 + Phase 14/16 코드 분석 기반 | Sinclair Seo |
