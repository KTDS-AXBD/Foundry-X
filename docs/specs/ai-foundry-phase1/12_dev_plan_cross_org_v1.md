---
title: Cross-Org 분류 알고리즘 개발 계획서 (Tech Spec + WBS)
subtitle: 4그룹 자동 분류 (common_standard · org_specific · tacit_knowledge · core_differentiator) + default-deny 보호
version: v1 (2026-05-02)
owner: Sinclair Seo
audience: KTDS-AXBD 사내 (Layer 3·4 코어 + Sinclair + 법무 자문)
status: 🔥 시그니처 기능 (신규 80%)
based_on:
  - 02_ai_foundry_phase1_v0.3.md §5 (Cross-Org Comparison)
  - 02_ai_foundry_phase1_v0.3.md §11.1 R-14 (Cross-Org 데이터 공유 거부)
  - 08_build_plan_v1.md §1.2 (시그니처 80% 신규)
classification: 기업비밀 II급
---

# Cross-Org 분류 알고리즘 개발 계획서

> **이 문서가 답하는 질문**
>
> "**Cross-Org 4그룹 분류를 도메인 무관으로 어떻게 구현하고, R-14(다조직 데이터 공유 거부)를 어떻게 우회하면서 시연 가능한 PoC를 만드는가?**"

---

## 0. 한 페이지 요약

### 0.1 정체성 한 줄

> **같은 도메인을 사용하는 여러 조직의 정책을 비교해, 모든 정책을 4그룹 (공통표준·조직특화·암묵지·핵심차별화) 중 하나로 자동 분류하고, 핵심차별화 정책은 default-deny로 보호하는 자산화 엔진.**

### 0.2 매핑

| 차원 | 위치 |
|---|---|
| 5-Layer (외부) | Layer 4 Workflow의 Cross-Org Analyzer (02 §5) |
| 사내 3-Plane (내부) | Eval Rail의 학습 신호 + Asset Rail의 자산 격리 |
| 4대 진단과의 관계 | 4대 진단(단일 조직 내부) → Cross-Org(다조직 비교) — 별도 모듈, 같은 입력(Policy Set) 공유 |
| 5-Asset Model 영향 | core_differentiator는 Policy Pack 격리, common_standard는 공유 자산 등록 |

### 0.3 현재 상태 → To-Be 단계

| 단계 | 상태 |
|---|---|
| **Solo** (혼자 먼저) | 가상 조직 3개 정책 세트 생성 + 4그룹 분류 알고리즘 1차 PoC + 보호 정책 default-deny |
| **Integration** (Layer 3 코어와) | 정책 정규화 LLM 통합 + Domain Expert HITL + 분류 결과 카드 + Asset Rail 격리 |
| **Ops** (Phase 3 단일 조직 / Phase 4 실 다조직) | 단일 조직 자체 진단으로 ROI 입증 → Phase 4 실 다조직 데이터 합의 후 가속 |

### 0.4 핵심 5 결정

| # | 결정 | 근거 |
|---|---|---|
| **CO1** | **R-14 회피: Phase 3는 단일 조직 자체 진단(가상 다조직 + 실 1조직)으로 ROI 입증** | 02 R-14 완화 — 다조직 데이터 합의는 Phase 4까지 ferrying |
| **CO2** | **core_differentiator default-deny가 시스템 강제 (코드 수준)** | 02 §5.4 약속 — export·라이선스·마켓플레이스 모두 차단, 코드로 강제 |
| **CO3** | **Solo 단계 가상 조직 3개는 합성 데이터** (한국 기업 데이터 미사용) | 메모리 R-14 + 외부 검증 P0-3 — 합성으로 알고리즘 검증, 실 데이터 결합은 Phase 4 |
| **CO4** | **분류 결과는 Domain Expert HITL 의무** (자동 분류 → 사람 sign-off) | 02 §5.4.1 보호 vs 학습 경계가 미정 (Q3) — HITL이 안전장치 |
| **CO5** | **Cross-Org 데이터 공유 합의 라이선스 템플릿을 Phase 1 W19~W21에 초안 작성** | 사용자 메모리: BeSir 미팅 + Phase 4 진입 전 명문화 필요 |

---

## 1. 책임 범위

### 1.1 책임

- N개 조직의 정책 세트를 입력받아 정책 정규화 (의미가 같은 정책 그룹핑)
- 각 정책 그룹의 공통도·변동성·명문화율·비즈니스 영향 점수 산출
- 4그룹 자동 분류 (common_standard / org_specific / tacit_knowledge / core_differentiator)
- core_differentiator default-deny 강제 (export·라이선스·마켓플레이스 차단)
- Domain Expert HITL 트리거 (분류 결과 카드 → 검토 → sign-off)
- 자산화 비용 측정 (첫 도메인 vs 두 번째 도메인 — 02 §5.5 곡선 검증)

### 1.2 비책임

| 영역 | 담당 모듈 |
|---|---|
| 4대 진단 (단일 조직 내부) | Diagnostic Runner (11_dev_plan) |
| 정책 신규 생성 | Layer 3 LLM Triple Extractor |
| 정책팩 발행·차단 | Guard-X (09_dev_plan) |
| 라이선스 계약 운영 | 법무 + 사업 라운드 (Phase 4) |
| 분류 결과 카드 UI | Discovery-X + AXIS-DS |
| Marketplace 게시 차단 강제 | Launch-X (10_dev_plan) — Cross-Org은 분류 결과만 제공 |

---

## 2. 4그룹 분류 알고리즘 명세

### 2.1 정책 정규화 (Policy Normalization)

#### 2.1.1 정의
조직별로 표현이 다르더라도 **의미가 같은 정책**을 그룹핑.

#### 2.1.2 입력
- N개 조직의 정책 세트 `Policy[][]`

#### 2.1.3 알고리즘
```
1. 모든 정책을 Tier 2 LLM으로 임베딩 (의미 벡터)
2. 룰 매칭으로 1차 동치 후보 검색 (AST 비교, 11_dev_plan PolicyParser 재사용)
3. 임베딩 유사도 ≥ threshold_normalize (기본 0.85)인 정책을 그룹핑
4. LLM Tier 2에 그룹핑 후보를 줘서 의미 동치성 확인 (HITL 보조)
5. 정책 그룹 `PolicyGroup` 생성: { group_id, member_policies, organizations_present }
```

### 2.2 점수 산출

#### 2.2.1 공통도 점수 (Commonality Score)
```
commonality = |organizations_present| / N    # 0.0 ~ 1.0
```
N개 조직 중 몇 개에서 발견되었는지.

#### 2.2.2 변동성 점수 (Variance Score)
```
1. 그룹의 모든 정책 outcome을 수집
2. outcome이 명목형이면 entropy, 연속형이면 분산
3. variance = normalized 0.0 ~ 1.0
```

#### 2.2.3 명문화율 (Documentation Rate)
```
documentation_rate = (명문화된 정책 수) / |member_policies|
```
명문화 = 룰 정의 + 절차 문서 모두 있는 경우.

#### 2.2.4 비즈니스 영향 (Business Impact)
- 도메인 전문가가 1회 평가 (low / medium / high)
- 또는 Decision Log의 cases_affected가 임계 이상이면 high

### 2.3 분류 결정 (Classification)

| 분류 | 조건 |
|---|---|
| **common_standard** | commonality ≥ 0.8 AND variance < 0.2 |
| **org_specific** | commonality ≥ 0.4 AND variance ≥ 0.5 |
| **tacit_knowledge** | commonality < 0.4 AND documentation_rate < 0.3 |
| **core_differentiator** | commonality < 0.4 AND documentation_rate ≥ 0.7 AND business_impact ≥ "high" |
| (기타) | unclassified — Domain Expert에게 카드 표시 |

### 2.4 default-deny 강제 (보호)

core_differentiator로 분류된 정책은 시스템 수준에서 다음 동작이 모두 차단됩니다:

| 동작 | 차단 방법 |
|---|---|
| Launch-X export (Type 1 zip) | Launch-X가 release_request 시 Cross-Org 분류 lookup → 차단 |
| Launch-X marketplace 게시 (Phase 4) | 동일 |
| Cross-Org 분류 결과의 타 조직 가시화 | 분류 사실 자체가 노출 X (자체 조직만 가시) |
| 모델 가중치·통계 신호로 흘러나감 | E3 가중치 학습 시 core_differentiator는 익명·집계화 후도 별도 옵트인 (§5.4.1 매트릭스) |

### 2.5 보호 vs 학습 5단계 매트릭스 (02 §5.4.1)

| 사용 단계 | core_differentiator 정책에 적용되는 정책 | 본 모듈 구현 |
|---|---|---|
| 단일 조직 내부 사용 | 학습·최적화·진단 모두 수행 (해당 조직 한정) | 본 모듈 분류 결과를 4대 진단·Layer 3가 사용 |
| Cross-Org 비교 분류 | 분류 결과는 해당 조직만 가시화 | 분류 카드의 visibility 필드로 강제 |
| 타 조직 학습 신호로 사용 | **금지** (default-deny) | core_differentiator 그룹은 LearningLoop 입력에서 자동 제거 |
| 외부 마켓플레이스 게시 | **금지** | Launch-X에 차단 신호 |
| AI Foundry 제품 개선 신호 | 별도 정책 — 익명·집계화 후 옵트인 | OptInManager에서 별도 동의 |

---

## 3. 인터페이스

### 3.1 입력 인터페이스

#### `POST /v1/cross-org/classify`

```
CrossOrgClassifyRequest {
  domain: string
  organizations: { org_id, policy_set_version }[]    // N ≥ 2
  thresholds_override?: object                        // DomainExpert만
  trace_id: string
}
```

#### `POST /v1/cross-org/expert-review`

```
ExpertReviewRequest {
  group_id: string
  expert_id: string                                   // DomainExpert RBAC
  decision: 'confirm' | 'reclassify' | 'reject'
  reclassify_to?: 'common_standard' | 'org_specific' | 'tacit_knowledge' | 'core_differentiator'
  comment: string
}
```

### 3.2 출력 인터페이스

#### `CrossOrgClassifyResponse`

```
CrossOrgClassifyResponse {
  classification_id: string
  domain: string
  organizations_count: number
  groups: PolicyGroup[]
  summary: {
    common_standard: number
    org_specific: number
    tacit_knowledge: number
    core_differentiator: number
    unclassified: number
  }
  default_deny_count: number                          // core_differentiator 그룹 수
  hitl_pending_count: number
}

PolicyGroup {
  group_id: string
  classification: 'common_standard' | 'org_specific' | 'tacit_knowledge' | 'core_differentiator' | 'unclassified'
  member_policies: { org_id, policy_id }[]
  scores: { commonality, variance, documentation_rate, business_impact }
  visibility: { visible_to_orgs: string[] }           // core_differentiator는 자기 조직만
  protection_flags: {
    export_blocked: boolean
    marketplace_blocked: boolean
    learning_signal_blocked: boolean
  }
  hitl_status: 'pending' | 'confirmed' | 'reclassified' | 'rejected'
  expert_decision_id?: string
}
```

#### 이벤트
```
EVENT cross_org.classification.started { classification_id, domain, orgs_count }
EVENT cross_org.classification.completed { classification_id, summary, default_deny_count }
EVENT cross_org.expert.reviewed { group_id, decision, expert_id }
EVENT cross_org.protection.enforced { group_id, action: 'export_blocked', requester }
```

---

## 4. 내부 모델

### 4.1 PolicyEmbedder
- Tier 2 LLM 임베딩 (정책 텍스트 → 벡터)
- 캐시 (정책 변경 없으면 재계산 X)

### 4.2 PolicyNormalizer
- 임베딩 + 룰 매칭으로 의미 동치 그룹핑
- LLM Tier 2 보조 (자연어 condition 동치 판정)

### 4.3 ScoreCalculator
- commonality·variance·documentation_rate·business_impact 산출
- 도메인별 임계 YAML 로드 (CO5와 연계)

### 4.4 GroupClassifier
- 4그룹 분류 룰 적용 (§2.3)
- unclassified는 Domain Expert에게 카드

### 4.5 ProtectionEnforcer
- core_differentiator default-deny 강제
- Launch-X·LearningLoop·Marketplace 차단 신호 발행

### 4.6 ExpertReviewManager
- HITL 라이프사이클 (pending → confirm/reclassify/reject)
- AXIS-DS Cross-Org Card UI 호출

### 4.7 CostMeasurer
- 자산화 비용 측정 (정책 수 × LLM 호출 비용 + HITL 시간)
- 02 §5.5 곡선 검증 데이터 수집

### 4.8 OptInManager (Ops 단계)
- AI Foundry 제품 개선 신호 옵트인 관리
- core_differentiator는 별도 동의

---

## 5. 데이터 모델

### 5.1 PostgreSQL 테이블

| 테이블 | 핵심 컬럼 | 용도 |
|---|---|---|
| `cross_org_classifications` | classification_id, domain, orgs_count, summary, executed_at | 분류 실행 추적 |
| `policy_groups` | group_id, classification_id, classification (4그룹), scores (json), visibility (json) | 정책 그룹 |
| `group_members` | group_id, org_id, policy_id, embedding_hash | 그룹 멤버 |
| `expert_reviews` | review_id, group_id, expert_id, decision, comment, decided_at | HITL 결정 |
| `protection_events` | event_id, group_id, action, requester, blocked_at | 차단 이벤트 |
| `optin_consents` (Ops) | org_id, consent_type, granted_at, revoked_at | 제품 개선 옵트인 |

### 5.2 Git 저장소

- `cross_org/thresholds/{domain}.yaml` — 도메인별 임계
- `cross_org/protection_matrix.yaml` — §5.4.1 5단계 매트릭스 (default-deny 룰)
- `cross_org/license_template/*.md` — 라이선스 계약 초안 (CO5 산출물)

---

## 6. 외부 의존성

| 의존성 | 용도 | 단계 |
|---|---|---|
| Layer 3 LLM (Tier 2) | 임베딩 + 동치성 판정 | Solo (mock 가능) |
| Audit Log Bus | 모든 이벤트 | Solo |
| AXIS-DS Cross-Org Card | HITL UI | Integration |
| Discovery-X | 분류 결과 카드 표시 | Integration |
| Launch-X | export 차단 신호 받기 | Integration (LX-O05와 연동) |
| 법무 | 라이선스 템플릿 + Phase 4 계약 | Ops |

---

## 7. SLA 가설

| 지표 | Solo (가상 3 조직) | Integration | Ops (Phase 4 실 N 조직) |
|---|---|---|---|
| `/v1/cross-org/classify` p95 (정책 100개 × 3 조직) | ≤ 60초 | ≤ 60초 | ≤ 120초 (정책 1000개 × 5 조직) |
| 분류 정확도 (가상 GT 대비) | ≥ 80% | ≥ 85% | ≥ 90% |
| core_differentiator default-deny 차단율 | 100% (필수) | 100% | 100% |
| HITL 평균 처리 (Domain Expert) | (해당없음) | 24시간 | 4시간 (자동 정책 학습 후) |
| 자산화 비용 측정 정확도 | (해당없음) | (해당없음) | 첫 도메인 대비 ≥ 50% 감소 입증 (Phase 4) |

---

## 8. WBS 태스크 분해

### 8.1 Solo 단계 (혼자 먼저 시도)

| Task ID | 설명 | 우선순위 | 의존성 | 노력 | DoD |
|---|---|---|---|---|---|
| CO-S01 | sub-app scaffold (Foundry-X packages/api에 `core/cross-org/`) | P0 | - | S | `/v1/cross-org/classify` 200 OK |
| CO-S02 | types.ts contract 정의 (CrossOrgClassifyRequest/Response, PolicyGroup) | P0 | CO-S01 | S | TypeScript 컴파일 통과 |
| CO-S03 | **가상 조직 3개 정책 세트 합성 데이터 생성** (자원조달 심사 도메인 30 정책 × 3 조직) | P0 | CO-S02 | M | 정책 90건 + ground truth 분류 30건 |
| CO-S04 | PolicyNormalizer 골격 (룰 매칭만, 임베딩 mock) | P0 | CO-S03 | M | 가상 정책 90개 → 정책 그룹 ~15개 |
| CO-S05 | ScoreCalculator (commonality·variance·documentation_rate) | P0 | CO-S04 | M | 그룹 15개 모두 점수 산출 |
| CO-S06 | GroupClassifier (4그룹 분류 룰 적용) | P0 | CO-S05 | M | ground truth 대비 정확도 측정 코드 동작 |
| CO-S07 | **ProtectionEnforcer default-deny 골격** (core_differentiator 그룹 시 차단 플래그 set) | P0 | CO-S06 | S | core_differentiator 그룹 → export_blocked=true |
| CO-S08 | 분류 결과 카드 sample 5건 export (JSON) | P1 | CO-S06 | S | sample json 5건 |
| CO-S09 | 단위 테스트 (vitest) + ground truth 비교 | P0 | CO-S04~CO-S07 | M | 정확도 ≥ 80% 측정 |
| CO-S10 | OpenAPI 스펙 + Audit Log entry | P1 | CO-S01 | S | classify 1회 → audit entry 1건 |
| CO-S11 | 보호 정책 §5.4.1 5단계 매트릭스 YAML 작성 | P0 | - | S | `cross_org/protection_matrix.yaml` 초안 |
| CO-S12 | **라이선스 템플릿 초안** (Phase 4 진입 전 명문화 필요) | P1 | - | M | `cross_org/license_template/v0.1.md` 초안 1건 (법무 자문 후 보강) |

**Solo 단계 산출물**:
- 가상 조직 3개 4그룹 분류 1차 PoC (정확도 ≥ 80%)
- core_differentiator default-deny 강제 골격
- 보호 매트릭스 YAML + 라이선스 템플릿 초안
- 분류 카드 sample export

### 8.2 Integration 단계 (Layer 3·Discovery-X 협업)

| Task ID | 설명 | 우선순위 | 의존성 | 노력 | DoD |
|---|---|---|---|---|---|
| CO-I01 | Tier 2 LLM 임베딩 통합 (PolicyEmbedder 본격 동작) | P0 | CO-S04·Layer 3 코어 | L | 정책 90개 임베딩 캐시 정상 |
| CO-I02 | LLM 보조 동치 판정 (자연어 condition 그룹핑) | P0 | CO-I01 | M | 동치 그룹핑 정확도 ≥ 90% |
| CO-I03 | business_impact 평가 자동화 (Decision Log cases_affected 활용) | P1 | CO-S05·Decision Log | M | 자동 평가 high/medium/low 분류 |
| CO-I04 | ExpertReviewManager (HITL 라이프사이클) | P0 | CO-S06·AXIS-DS Cross-Org Card | L | review 1회 동작 |
| CO-I05 | AXIS-DS Cross-Org Card 컴포넌트 (UI/UX 코어와) | P0 | UI/UX 코어 | L | Storybook story 1건 + Discovery-X 통합 |
| CO-I06 | Discovery-X에 Cross-Org BC 신규 추가 | P1 | Discovery-X 코어 | M | 분류 결과 카드 표시 |
| CO-I07 | **Launch-X 차단 신호 발행** (LX-O05와 contract 합의) | P0 | CO-S07·Launch-X 코어 | M | core_differentiator → Launch-X export 차단 E2E |
| CO-I08 | LearningLoop 차단 (core_differentiator 그룹은 E3 가중치 학습 입력에서 제외) | P0 | CO-S07·11_dev_plan DG-O03 | M | 학습 입력 검증 단위 테스트 |
| CO-I09 | E2E 시나리오 — 가상 3조직 → 분류 → core_diff 1개 → export 차단 → Expert 검토 → 재분류 | P0 | CO-I04·CO-I07 | XL | E2E 1개 통과 |
| CO-I10 | CostMeasurer 1차 (가상 조직의 자산화 비용 측정) | P1 | CO-I01 | M | 가상 도메인 비용 측정 결과 |
| CO-I11 | 정확도 자동 측정 (가상 GT) | P0 | CO-S09 | M | CI에서 정확도 임계 미달 시 fail |

**Integration 단계 산출물**:
- LLM 보조 정책 정규화 (정확도 ≥ 90%)
- HITL Domain Expert 카드 흐름
- Launch-X·LearningLoop 차단 E2E
- 가상 조직 3개에서 정확도 ≥ 85%

### 8.3 Ops 단계 (Phase 3 단일 조직 / Phase 4 실 다조직)

| Task ID | 설명 | 우선순위 | 의존성 | 노력 | DoD |
|---|---|---|---|---|---|
| CO-O01 | **Phase 3: 단일 조직 자체 진단 모드** (R-14 회피, 02 R-14 완화) — 조직 1개 + 시간축 다버전을 가상 다조직처럼 비교 | P0 | G4 도메인 확정 | L | 단일 조직에서 Cross-Org 시뮬레이션 시연 |
| CO-O02 | 단일 조직 ROI 입증 (자체 4그룹 분류 → tacit_knowledge 표면화 가치 측정) | P0 | CO-O01 | L | ROI 측정 보고서 1건 |
| CO-O03 | 라이선스 템플릿 v1.0 (법무 sign-off) | P0 | CO-S12·법무 | XL | 라이선스 템플릿 v1.0 |
| CO-O04 | OptInManager (제품 개선 신호 옵트인) | P1 | CO-S07·CO-O03 | M | 옵트인 1건 동작 |
| CO-O05 | **Phase 4: 실 다조직 데이터 합의 후 본격 운영** (R-14 해소 시) | P3 | Phase 4 사업 라운드·법무 | XL | 2조직 이상 실 데이터 분류 |
| CO-O06 | 자산 가치 누적 곡선 측정 (02 §5.5, 첫 도메인 vs 두 번째 도메인 비용) | P0 | Phase 4 두 번째 도메인 | XL | 가속 곡선 입증 또는 BM 재설계 신호 |
| CO-O07 | core_differentiator 보호 감사 (default-deny 차단 누락 검사) | P0 | CO-I07·CO-I08 | M | 감사 보고서 분기 1회 |

---

## 9. 단계별 진척 흐름

```
Solo                       Integration                   Ops (Phase 3 / Phase 4)
─────────────────────────  ─────────────────────────────  ──────────────────────────────
CO-S01 scaffold            CO-I01 LLM 임베딩            CO-O01 단일 조직 모드 🔥
  ↓                          ↓                              ↓
CO-S02 types               CO-I02 LLM 동치 판정         CO-O02 ROI 입증
  ↓                          ↓                              ↓
CO-S03 가상 데이터 🔥      CO-I03 business_impact 자동   CO-O03 라이선스 v1.0 🔥
  ↓                          ↓                              ↓
CO-S04 Normalizer          CO-I04 ExpertReview          CO-O04 OptIn
CO-S05 ScoreCalc           CO-I05 Cross-Org Card UI       ↓
CO-S06 Classifier          CO-I06 Discovery-X BC        CO-O05 실 다조직 (Phase 4)
  ↓                          ↓                              ↓
CO-S07 Protection 🔒        CO-I07 Launch-X 차단 🔒       CO-O06 자산 곡선 측정 🔥
CO-S08 카드 sample         CO-I08 LearningLoop 차단 🔒    ↓
CO-S09 단위 + GT           CO-I09 E2E 🔥                 CO-O07 보호 감사 🔒
CO-S10 OpenAPI             CO-I10 CostMeasurer
CO-S11 보호 매트릭스 🔒    CO-I11 정확도 자동측정
CO-S12 라이선스 초안 🔥
```

**전이 게이트**:
- Solo → Integration: 가상 GT 정확도 ≥ 80% + default-deny 강제 + 보호 매트릭스 YAML
- Integration → Ops (Phase 3): E2E 통과 + Launch-X 차단 동작 + 단일 조직 시뮬레이션 가능
- Ops Phase 3 → Phase 4: 단일 조직 ROI 입증 + 라이선스 v1.0 + 다조직 데이터 합의

---

## 10. 리스크

| ID | 리스크 | 영향 | 완화책 |
|---|---|---|---|
| **CO-R1** | R-14 (Cross-Org 데이터 공유 거부) — 한국 기업 환경 | Phase 4 BM 자체 깨짐 | **CO-O01 단일 조직 자체 진단 모드로 ROI 우선 입증** / Phase 4 진입 전 라이선스 템플릿 명문화 |
| **CO-R2** | 02 §5.5 자산 가치 누적 곡선이 깨지는 신호 (두 번째 도메인 30% 미만 감소) | BM 재설계 필요 | CO-O06에서 측정 의무 / Phase 4 진입 전 Go/No-Go 핵심 지표 |
| **CO-R3** | core_differentiator 분류 오탐 (true negative — 차단되어야 할 게 통과) | 고객 IP 유출 | HITL Domain Expert sign-off 의무 (CO-I04) / 분기별 보호 감사 (CO-O07) |
| **CO-R4** | core_differentiator 분류 과탐 (false positive — 통과해야 할 게 차단) | common_standard 자산화 가속 차질 | 임계 도메인별 보정 (CO-O01과 함께) + Domain Expert HITL 룰 보강 |
| **CO-R5** | Q3 미해결 — 보호 vs 학습 경계 (§5.4.1 매트릭스 v1.0 미합의) | Phase 4 옵트인 정책 모호 | CO-O03·CO-O04에서 라이선스·옵트인 사전 명문화 / Phase 4 진입 전 Q3 결정 의무 |
| **CO-R6** | LLM 임베딩 비용 폭증 (정책 1000개 × N 조직 × 임베딩) | Cost Governor 알람 | 임베딩 캐시 + 정책 변경 없으면 재계산 X / Tier 강등 옵션 |
| **CO-R7** | 가상 ground truth와 실 도메인 분류 기준 괴리 | 가상 정확도 80%인데 실은 50% | Phase 4 CO-O05에서 실 GT 수집 + Domain Expert 룰 재보정 |

---

## 11. 검증 (DoD 종합)

### 11.1 단계별 DoD

| 단계 | DoD |
|---|---|
| **Solo 완료** | 가상 3조직 정확도 ≥ 80% + default-deny 강제 + 보호 매트릭스 YAML + 라이선스 템플릿 초안 |
| **Integration 완료** | LLM 임베딩 동치 판정 ≥ 90% + E2E (분류 → core_diff → export 차단 → Expert 검토) / AXIS-DS Cross-Org Card |
| **Ops Phase 3 완료** | 단일 조직 자체 진단 ROI 입증 + 라이선스 v1.0 sign-off / 보호 감사 통과 |
| **Ops Phase 4 완료** | 실 2조직 이상 분류 + 자산 가치 누적 곡선 입증 또는 재설계 신호 |

### 11.2 자동 검증

| 검증 | 방법 | 트리거 |
|---|---|---|
| 4그룹 분류 정확도 (가상 GT) | CI에서 ground truth 비교 | PR마다 |
| core_differentiator default-deny 100% | export 시도 → 차단 audit log 검증 | 일일 |
| Launch-X 차단 신호 누락 0건 | classification.protection vs Launch-X release 비교 | 일일 |
| LearningLoop 입력에서 core_differentiator 제외 | 입력 hash 검증 | PR마다 |
| 라이선스 템플릿 hash 변경 추적 | Git diff | PR마다 |

### 11.3 시연 시나리오 (G3)

1. 가상 3조직 자원조달 심사 정책 90개 입력
2. 4그룹 분류 결과 (예: common_standard 8그룹, org_specific 5그룹, tacit_knowledge 1그룹, core_differentiator 1그룹)
3. core_differentiator 1건 클릭 → AXIS-DS Cross-Org Card에 evidence + 보호 플래그 표시
4. Launch-X에서 해당 정책 export 시도 → 차단 + audit log
5. Domain Expert가 검토 → 재분류 또는 confirm

### 11.4 시연 시나리오 (G5, 임원 보고)

> **"이 도메인의 N개 정책 중 X개는 산업 공통표준(common_standard)으로 자산화 가능, Y개는 귀사의 핵심차별화(core_differentiator)로 보호. 다음 도메인 인스턴스화 비용은 첫 도메인 대비 Z% 감소 예상."**

1. 단일 조직 도메인 분류 결과 시연
2. tacit_knowledge 표면화 가치 (베테랑 의존 감소 N건)
3. 자산화 비용 측정 (CO-O02 ROI)

---

## 12. 외부 노출 가이드

| 본 문서 명칭 | 외부 변환 |
|---|---|
| Cross-Org Analyzer | Asset Classification Module (Layer 4) |
| 4그룹 (한글 변환) | Common Standard / Org-Specific / Tacit Knowledge / Core Differentiator |
| ProtectionEnforcer default-deny | Asset Protection Policy (default-deny) |

> **외부 회람 시 강조점**: "**우리는 당신 조직의 core_differentiator는 절대 표준화하지 않습니다.**" (02 §5.4 그대로) — 고객 IP 우려 해소가 사업 메시지의 핵심.

---

## 13. Changelog

| 버전 | 일자 | 변경 |
|---|---|---|
| v1 | 2026-05-02 | 초판 — 4그룹 분류 알고리즘 명세 + default-deny 보호 + WBS 30 task (Solo 12 / Integration 11 / Ops 7) + 5단계 보호 매트릭스 |

---

## 끝맺음

Cross-Org은 시그니처 80% 신규지만, **R-14 (다조직 데이터 공유 거부)가 진짜 리스크**입니다. 이를 회피하기 위해 본 계획은 **Phase 3는 단일 조직 자체 진단 모드(CO-O01)로 ROI 우선 입증**하고, 실 다조직 운영은 Phase 4로 ferrying하는 전략.

**Solo 단계는 가상 조직 3개 합성 데이터로 알고리즘 검증이 완전히 가능**합니다. 한국 기업 데이터 미사용, 신용 안전. CO-S03(가상 데이터 생성)이 Solo 단계의 핵심 task — 한 번 잘 만들어두면 Integration·Ops 모두에서 회귀 테스트로 재사용.

**가장 늦어지는 의존**: 라이선스 템플릿 v1.0 (CO-O03, XL) — 법무 자문 필요. Solo 단계 CO-S12에서 초안을 미리 잡아두면 Phase 4 진입 직전 마찰이 줄어요.

**핵심 보호 정책 (CO2)**: core_differentiator default-deny는 **코드 수준에서 강제**해야 합니다. 룰 변경만으로는 부족 — Solo 단계 CO-S07의 Protection 골격이 코드 검증의 근간이에요.

— 끝.
