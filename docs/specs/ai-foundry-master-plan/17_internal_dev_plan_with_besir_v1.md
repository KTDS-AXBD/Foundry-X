---
title: AI Foundry 내부 개발 플랜 (BeSir 정합성 흡수 + 외부 게이트 분리) v1
date: 2026-05-06
owner: Sinclair Seo
purpose: BeSir 핵심 컨셉 7건을 내부 즉시 진행 가능 항목으로 흡수, 외부 의존 게이트와 분리하여 Tier 1~7 차근차근 빌드 플랜 수립
source_docs:
  - 06_architecture_alignment_with_besir_v1.md (BeSir 정합성 P0 5건 + P1 4건 + P2 3건)
  - 14_repo_status_audit_v1.md (5 repo P0 평균 25% 충족)
  - 15_msa_implementation_plan_v1.md (5 sub-app + 3 횡단 레이어)
  - 16_validation_report_v1.md (v1.1 patch 권고 10건)
classification: 기업비밀II급 / Enterprise부문
---

# AI Foundry 내부 개발 플랜 — BeSir 정합성 흡수 + Tier 정렬

> **본 문서의 위상**
>
> 사용자 지시(2026-05-06): "W19 BeSir 게이트 대기할 필요 없음. 외부 업체 미팅은 미팅이고, 내부적으로 진행할 일들은 별도로 진행. BeSir의 핵심 작업 프로세스와 컨셉 중에서 우리 시스템에 반영할 것들을 추리고, 기본부터 하나씩 차근차근 만들어나갈 수 있도록 계획을 수립."
>
> 본 문서는 16건 마스터 플랜 위에 **외부 의존 분리 + Tier 정렬 + BeSir 핵심 흡수** 레이어를 추가하여, 내부 진행 가능 항목 즉시 sprint 시작이 가능하게 한다.

---

## 1. BeSir 핵심 컨셉 → 내부 흡수 매트릭스 (5건 신규 등록)

| BeSir 컨셉 | 본질 | 신규 F-item | 의존 도메인 |
|------------|------|-------------|-------------|
| **7-타입 Entity** (Fact/Dimension/Workflow/Event/Actor/Policy/Support) | 사람 복제 시멘틱 레이어, 현행만 | **F628** | F593 entity 도메인 확장 |
| **5-Asset Model** (Policy/Ontology/Skill/Log + System Knowledge) | 4-Asset → 5-Asset, 암묵지 표면화 | **F629** | F600 5-Layer 인접 |
| **인터뷰 → 트랜스크립트 → 7-타입 자동 추출** | 엑셀 설문 X, 대면 인터뷰 O | **F630** | core/discovery/ 활용 |
| **분석 X 자동화 O** (원본 DB 직결, 상태 변경) | BeSir 차별화 코어 | **F631** | core/agent/ + audit-bus |
| **CQ 5축 + 80-20-80 검수 룰** | 4대 진단 통합/공존 | **F632** | F602 + F605 통합 |

**Graph DB 미사용** (BeSir 핵심): Foundry-X = D1+Git 기반이므로 이미 정합. 별도 등록 불필요.

---

## 2. 외부 의존 분리 매트릭스 (게이트 정확화)

| F# | 작업 | 외부 의존 | Tier |
|----|------|-----------|------|
| F600 | 5-Layer 통합 운영 | **5 repo orchestration** (Decode-X/Discovery-X/AXIS-DS/ax-plugin) | T7 (외부 동기) |
| F601 (SSO 부분) | OIDC 표준 어댑터 + 5역 RBAC 코드 | **80% 자체** — client_id/JWKS URL 발급(20%)만 외부 | **T4 ✅ 내부 (코드 골격) / T6 client 등록(외부)** |
| F601 (PG 부분) | D1+RLS dual storage 골격 + Tenant context middleware | **60% 자체** — PG 서비스 선정(40%)만 외부 | **T4~T5 ✅ 내부 (D1 fallback) / T6 PG 도입 결정(외부)** |
| F602 | 4대 진단 PoC | (없음) | **T3 ✅ 내부** |
| F603 | Cross-Org PoC + default-deny | default-deny 코드 자체, **SME 워크샵 외부** | **T4 부분 내부** |
| F604 | KPI 위젯 4종 | **AXIS-DS PR #55 머지** — 사용자 PR 머지 권한 확인 시 즉시 unlock 가능 | T6 (외부 / **권한 확인 후 T4 가능**) |
| F605 | HITL Console | **AXIS-DS v1.2** — 동일, 머지 권한 확인 시 unlock | T6 (외부 / **권한 확인 후 T4 가능**) |
| F606 | Audit Log Bus | (없음) — Foundry-X 횡단 | **T1 ✅ 토대** |
| F607 | AI 투명성 + 윤리 임계 | (없음) | **T3 ✅ 내부** |
| F615 | Guard-X Solo | (없음) | **T4 ✅ 내부** |
| F616 | Launch-X Solo | (없음) | **T4 ✅ 내부** |
| F617 | Guard-X Integration | F615 의존 | T5 (F615 후) |
| F618 | Launch-X Integration | F616 의존 | T5 (F616 후) |
| F619 (알고리즘) | Multi-Evidence E1/E2/E3 통합 알고리즘 + Decode-X stub adapter + mock event PoC | **80% 자체** — 알고리즘 + stub 코드 자체, 실 이벤트 hook(20%)만 외부 | **T4~T5 ✅ 내부 (mock 기반) / T6 실 이벤트 hook(외부)** |
| F620 | Cross-Org Integration | F603 + Launch-X 차단 신호 + **Expert HITL 외부** | T5 부분 |
| F621 | KPI 통합 화면 | F604 + F605 의존 | T6 (외부 의존 후) |
| F622 | 운영·QA·교육 패키지 | **W28~W29 외부 시점** | T7 (Phase 5 마감) |
| F623 | /ax:domain-init β | (없음) — ax-plugin 자체 | **T4 ✅ 내부** |
| F624 | Six Hats LLM 호출 패턴 | (없음) | **T2 ✅ 내부** |
| F625 | CQ 5축 운영 검증 | (없음) — F632에 통합 가능 | **T3 ✅ 내부** |
| F626 | core_diff 차단율 측정 | F603/F620 default-deny 후 | T4 부분 |
| **F628** | BeSir 7-타입 Entity (신규) | (없음) | **T1 ✅ 토대** |
| **F629** | 5-Asset Model 확장 (신규) | (없음) | **T1 ✅ 토대** |
| **F630** | 인터뷰 → 7-타입 자동 추출 (신규) | F628 의존 | **T2 ✅ 내부** |
| **F631** | 분석X 자동화O 정책 코드 강제 (신규) | F606 의존 | **T2 ✅ 내부** |
| **F632** | CQ 5축 + 80-20-80 통합 (신규) | F602 + F605 의존 | T3 (F602 후) |

**합계 정정 (S336 후속, 외부 의존 4건 분석 결과 반영)**: 27 F-item 중 **내부 즉시 진행 가능 17건** (T1~T4 + 부분 분리 4건) / **순수 외부 의존 4건** (F600 5-Layer + AXIS-DS PR #55 미머지 + Decode-X 진척 + 본부 SME 워크샵) / **나머지 토대·시점 의존 6건**.

**핵심 인사이트**: 처음 분류한 "외부 의존" 다수가 실은 80% 자체 가능. F601 SSO/PG, F619 Decode-X, F604/F605 AXIS-DS는 **골격을 자체 작성한 후 외부 unlock 시점에 마지막 hook만 연결**하는 패턴이 가능.

---

## 3. Tier 1~7 차근차근 빌드 플랜

### Tier 1 — 기본 인프라 (외부 의존 0, 즉시 가능) — Sprint 351~355

토대 3건. 다른 모든 작업이 의존. **최우선**.

| Sprint 후보 | F# | 작업 | 의존 | 추정 |
|------------|----|------|------|------|
| Sprint 351 | F606 | Audit Log Bus 신설 + trace_id chain + HMAC | 0 | ~15분 (D1 migration + types) |
| Sprint 352 | F628 | BeSir 7-타입 Entity 모델 (F593 entity 도메인 확장) | 0 | ~10분 |
| Sprint 353 | F629 | 5-Asset Model (System Knowledge 추가) | 0 | ~10분 (메타데이터 + types) |

### Tier 2 — Domain Extraction (T1 위) — Sprint 354~356

| Sprint 후보 | F# | 작업 | 의존 | 추정 |
|------------|----|------|------|------|
| Sprint 354 | F630 | 인터뷰 → 트랜스크립트 → 7-타입 자동 추출 | F628 | ~20분 (LLM prompt + extractor) |
| Sprint 355 | F631 | 분석X 자동화O 정책 코드 강제 | F606 | ~15분 (룰 엔진 + audit) |
| Sprint 356 | F624 | Six Hats LLM 호출 패턴 명시 | 0 | ~10분 (sixhats 도메인 contract) |

### Tier 3 — Diagnostic & HITL (T1+T2 위) — Sprint 357~360

| Sprint 후보 | F# | 작업 | 의존 | 추정 |
|------------|----|------|------|------|
| Sprint 357 | F602 | 4대 진단 PoC (Missing/Duplicate/Overspec/Inconsistency) | 0 | ~30분 (4 알고리즘 + types) |
| Sprint 358 | F632 | CQ 5축 + 80-20-80 검수 룰 (F602 통합) | F602 | ~20분 |
| Sprint 359 | F625 | CQ 5축 운영 검증 (F632에 통합 가능, 별도 등록 시 cosmetic) | F632 | (F632에 흡수) |
| Sprint 360 | F607 | AI 투명성 + 윤리 임계 (confidence < 0.7 HITL escalation) | F606 | ~15분 |

### Tier 4 — Sub-app Solo + 외부 의존 골격 분리 (즉시 가능) — Sprint 361~369

**S336 정정**: F601 SSO/PG, F619 Decode-X 골격을 T4로 승격. 외부 unlock 시점에는 마지막 hook만 추가.

| Sprint 후보 | F# | 작업 | 의존 | 추정 |
|------------|----|------|------|------|
| Sprint 361 | F615 | **Guard-X Solo** (`core/guard/` sub-app) | F606 + F601 (SSO 골격 OK) | ~30분 |
| Sprint 362 | F616 | **Launch-X Solo** (`core/launch/` sub-app) | F606 | ~30분 |
| Sprint 363 | F623 | /ax:domain-init β 스킬 (ax-plugin) | F628 + F629 | ~20분 |
| Sprint 364 | F603 (자체 부분) | Cross-Org default-deny 코드 골격 (SME 워크샵 사전 준비) | 0 | ~20분 |
| Sprint 365 | F626 (자체 부분) | core_diff 차단율 측정 코드 (F603 default-deny 후) | F603 | ~15분 |
| **Sprint 366** | **F601-SSO** (자체 부분, 신규) | **OIDC 표준 어댑터 (arctic) + 5역 RBAC 코드 + JWKS URL 환경변수** | 0 | ~25분 — IT 협의 결과 받은 시점에 1시간 내 production 가능 |
| **Sprint 367** | **F601-MT** (자체 부분, 신규) | **D1+RLS dual storage 골격 + Tenant context middleware + tenant_id 강제** | F606 | ~30분 — PG 결정 후 storage layer만 swap |
| **Sprint 368** | **F619-stub** (자체 부분, 신규) | **Multi-Evidence E1/E2/E3 알고리즘 + Decode-X stub adapter + mock event PoC** | F602 + F606 | ~25분 — 실 이벤트 시점에 stub만 swap |
| **Sprint 369** | **F604/F605 골격** (조건부) | **AXIS-DS PR #55 vendored fork** 또는 자체 KPI 위젯 임시 구현 | (PR 머지 권한 확인 후) | ~20분 — 권한 확인 시 즉시 |

### Tier 5 — Integration (T4 후) — Sprint 366~369

| Sprint 후보 | F# | 작업 | 의존 |
|------------|----|------|------|
| Sprint 366 | F617 | Guard-X Integration (Workflow hook + 룰셋 v1.0) | F615 |
| Sprint 367 | F618 | Launch-X Integration (Skill Registry + Type 1/2 E2E) | F616 |
| Sprint 368 | F620 (자체 부분) | Cross-Org Integration (LLM 임베딩 + Launch-X 차단 신호) | F603 + F618 |

### Tier 6 — 외부 의존 게이트 — 외부 unlock 시점

| F# | 작업 | unlock 조건 |
|----|------|-------------|
| F601 | Multi-Tenant PG 도입 + KT DS SSO | **PG 인프라 결정 + 본부 SSO 협의** (W19 BeSir 미팅 후 가능성) |
| F604 | KPI 위젯 4종 | **AXIS-DS PR #55 머지** |
| F605 | HITL Console | **AXIS-DS v1.2 배포** |
| F619 | 4대 진단 Integration Multi-Evidence | **Decode-X Phase 2-E** |
| F621 | KPI 통합 화면 | F604 + F605 unlock 후 |
| F600 | 5-Layer 통합 운영 | **5 repo orchestration 패턴** (Decode-X/Discovery-X/AXIS-DS/ax-plugin 의존) |

### Tier 7 — Phase 마감 + 외부 GTM — Sprint 후속

| F# | 작업 | unlock |
|----|------|--------|
| F622 | 운영·QA·교육 패키지 | **W28~W29 (Phase 5 마감)** |

### Tier 8 — Backlog (BeSir 후속 출시 의존) — 미등록

| 항목 | unlock |
|------|--------|
| Multi-Agent A2A | BeSir 6~7월 출시 |
| Agent Brain | BeSir 12월 출시 |

---

## 4. 즉시 시동 가능 Sprint 후보 (T1~T4, 외부 의존 분리 후)

**S336 정정**: 외부 의존 분리 매트릭스로 **13건 → 17건**으로 확장.

```
[T1 토대 — 모든 후속의 의존성 핵심]
Sprint 351 — F606 Audit Log Bus      ★ 가장 먼저 ★
Sprint 352 — F628 7-타입 Entity        BeSir 핵심
Sprint 353 — F629 5-Asset Model        System Knowledge

[T2 Domain Extraction]
Sprint 354 — F630 7-타입 자동 추출     인터뷰 → 트랜스크립트
Sprint 355 — F631 자동화 정책 코드     분석X 자동화O
Sprint 356 — F624 Six Hats LLM 패턴

[T3 Diagnostic & HITL]
Sprint 357 — F602 4대 진단 PoC
Sprint 358 — F632 CQ 5축 + 80-20-80
Sprint 359 — F607 AI 투명성/윤리

[T4 Sub-app Solo + 외부 의존 골격 분리 (S336 신규 승격)]
Sprint 360 — F615 Guard-X Solo
Sprint 361 — F616 Launch-X Solo
Sprint 362 — F623 /ax:domain-init β
Sprint 363 — F603 default-deny 골격
Sprint 364 — F601-SSO OIDC 어댑터       ★ 신규 승격 (S336)
Sprint 365 — F601-MT D1+RLS 골격         ★ 신규 승격 (S336)
Sprint 366 — F619-stub Multi-Evidence    ★ 신규 승격 (S336)
Sprint 367 — F604/F605 골격 (조건부)     ★ PR 권한 확인 시 (S336)
─────────────────────────────────────
17 sprint 분량 = 약 7~10주 작업
외부 의존 0~20% (마지막 hook만 외부 unlock 시점)
```

> 본 sprint 350(F627 services/ closure)도 본 시리즈와 평행 가능.

---

## 5. 외부 의존 unlock 후 추가 Sprint

```
W19 BeSir 미팅 결과:
  - PG 도입 결정 → F601 unlock → Sprint X+0
  - KT DS SSO 어댑터 → F601 일부 → Sprint X+1
AXIS-DS PR #55 머지 → F604/F605 unlock → Sprint Y+0/Y+1
F604 + F605 후 → F621 KPI 통합 → Sprint Y+2
Decode-X Phase 2-E → F619 4대 진단 Integration → Sprint Z
모두 unlock → F600 5-Layer 통합 → Sprint W
```

---

## 6. 본 plan과 기존 sprint-plan.md 차이

| 항목 | sprint-plan.md (2026-05-02) | 본 plan (2026-05-06) |
|------|------------------------------|----------------------|
| 외부 의존 분리 | "W19 BeSir 게이트" 일괄 | **개별 의존 분리** (PG/SSO/AXIS-DS/Decode-X/SME) |
| BeSir 핵심 컨셉 | 미흡수 (06 정합성 문서만) | **5건 신규 F-item 등록** (F628~F632) |
| Tier 정렬 | 5 Sprint × 카테고리 | **Tier 1~7 의존성 체인** + 즉시 시작 가능 13건 분리 |
| 시작 시점 | W19 (5/15) BeSir 후 | **즉시** (외부 의존 0 항목부터) |

---

## 7. 다음 액션

1. ✅ 본 plan 작성 완료 (2026-05-06 S336)
2. ✅ SPEC.md F628~F632 5건 신규 등록 (Tier 1~3)
3. ✅ SPEC.md F600~F626 22건 비고 갱신 (외부 의존 매트릭스 적용)
4. ⏳ Sprint 351 F606 Audit Log Bus 시동 (T1 토대, 가장 먼저)
5. ⏳ Sprint 352~360 순차 진행 (T1~T3 내부 가능 9건)
6. ⏳ W19 BeSir 미팅 결과 반영 (F601/F600 unlock 검토)

---

## 부록 — BeSir 12 인사이트 → 내부 흡수 상세

상세는 `06_architecture_alignment_with_besir_v1.md` §1 12 인사이트 + §2 매핑 매트릭스 + §3 v0.3 변경 안건 P0 5건 + §4 P1 4건 참조.

본 plan은 그 위에 **"내부 가능 vs 외부 의존" 분리 + Tier 의존성 체인**을 추가하여 즉시 빌드 가능 항목을 13건 식별.
