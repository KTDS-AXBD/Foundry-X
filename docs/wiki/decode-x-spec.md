---
title: "Decode-X Spec — 정의·구분·사례 v1.1"
category: "reference"
source: "docs/specs/Decode-X_Spec_정의-구분-사례_보고서_v1.1.html"
date: 2026-04-20
author: Sinclair Seo
---




# Decode-X Spec — 정의·구분·사례 v1.1

이 문서는 Decode-X에서 “Spec”이라고 부르는 것이 정확히 무엇인지, 어떻게
나뉘고, 현장에서 어떻게 생긴 모양을 하는지를 **하나의 레퍼런스**로
묶어둔 것입니다. 기획서 v1.0~v1.2와 Phase 2 PRD에 흩어져 있던 정의들을
여기서 고정합니다.

버전  
v1.1 · Tone & Manner 적용

작성일  
2026-04-20

작성자  
Sinclair Seo  
AX BD · Decode-X/Foundry-X PM

대상 독자  
AX BD 본부장 · KT DS 내부 리뷰어 · Foundry-X 팀 · 외부 AI 리뷰 에이전트

상위 근거  
개발기획서 v1.0 / v1.1 / v1.2 · Phase 2 PRD(prd-final) · Foundry-X
BLUEPRINT v1.36 · PRD V8 · Plumb Output/Error Contract


Contents

- [Executive Summary](#executive-summary)
- [1. Spec의 정의](#spec의-정의)
- [2. Spec의 구분 (4개 축)](#spec의-구분-4개-축)
- [3. Spec 컨테이너 명세
  (디렉터리·스키마)](#spec-컨테이너-명세-디렉터리스키마)
- [4. Spec 파이프라인 (생산 → 검증 →
  소비)](#spec-파이프라인-생산-검증-소비)
- [5. 사례](#사례)
- [6. Spec의 품질 게이트와 KPI](#spec의-품질-게이트와-kpi)
- [7. 결론 및 향후 진화 방향](#결론-및-향후-진화-방향)
- [부록 A. 용어집](#부록-a.-용어집)
- [부록 B. 근거 문서 리스트](#부록-b.-근거-문서-리스트)
- [문서 메타](#문서-메타)


## Executive Summary

우리는 Spec을 **“레거시 자산을 AI 에이전트가 실행·검증할 수 있는 형태로
구조화한 계약(Contract)”** 으로 정의합니다. v1.0~v1.1에서는 “사람과
LLM이 함께 읽는 중립 포맷” 정도였지만, v1.2 Mission Pivot 이후 **“AI가
1차 독자, 사람이 2차 감사자”** 라는 관점으로 옮겨왔고, Phase 2
PRD(prd-final)에서 **“소스코드를 원장(Source-of-Truth)으로 두는
Source-First Spec”** 으로 운영 원칙이 굳어졌습니다.

이 보고서는 Spec을 **네 개의 축**으로 구분합니다.

첫째, **독자·실행 주체 축** — 하나의 Spec은 세 개의 층(Executable /
Verifiable / Reviewable)이 병치된 3-Layer Container입니다. 둘째,
**내용·성격 축** — Spec은 Business(무엇을·왜) / Technical(어떻게·어디에)
/ Quality(얼마나·어떤 조건에서) 3종이며, 한 조항에 이들이 교차
적용됩니다. 셋째, **수명주기·진실성 축** — 소스가 원장, 문서는 참고이며,
둘의 차이는 `SOURCE_MISSING` / `DOC_ONLY` / `DIVERGENCE` 세 가지 마커로
명시적으로 관리합니다. 넷째, **시스템 역할 축** — Decode-X는 **Input
Plane의 Spec 생산자**, Foundry-X는 **Process·Output Plane의 Spec
실행·검증자**로 역할이 갈리고, 둘을 잇는 인터페이스는 Git + SPEC.md +
Plumb `decisions.jsonl`로 단일화됩니다.

현장에서는 두 개의 사례가 이 정의를 뒷받침합니다. **사례
1(전자온누리상품권)** 은 기획 레벨에서 Tier-A 7개 핵심
서비스(예산·충전·구매·결제·환불·선물·정산)와 그에 딸린 6건의 대표 Empty
Slot(ES-GIFT-001~006)을 Spec 대상으로 고정했습니다. **사례 2(LPON 결제
도메인)** 은 Phase 2 PRD에서 B/T/Q Spec Schema **27개 매핑**을
Source-First로 재추출하고, Handoff Package를 Foundry-X로 보내 Working
Prototype 실 데이터 round-trip 일치율 ≥ 90%를 목표로 둡니다.

Spec의 품질은 단일 수치가 아닙니다. **AI-Ready 6기준 가중 평균 passRate
≥ 0.75**, **Foundry-X Plumb triangle 매칭 ≥ 90%**, **Empty Slot Fill
Rate ≥ 70%**, **Tier-A 행위 동등성 ≥ 95%** — 이 네 게이트가 동시에
통과되어야 Spec을 “Ready”라 부를 수 있습니다. 이 네 축의 분류 체계와 네
게이트의 판정 체계, 이 두 개가 본 보고서가 고정하려는 결론입니다.

------------------------------------------------------------------------

## 1. Spec의 정의

### 1.1 한 줄 정의

> **Spec은 레거시 자산(코드·문서·운영 로그·암묵지)의 의도와 제약을, AI
> 에이전트가 실행·검증할 수 있는 형태로 직렬화한, 기계와 사람이 함께
> 공유하는 계약입니다.**

이 정의에는 네 개의 요구가 녹아 있습니다.

- **실행 가능성** — 에이전트가 이 문서를 읽고 코드를 생성하거나 테스트를
  돌릴 수 있어야 합니다.
- **검증 가능성** — 조항마다 PASS/FAIL을 기계적으로 판정할 수 있어야
  합니다.
- **공유 가능성** — 사람이 감사할 수 있는 리뷰 계층이 함께 딸려 있어야
  합니다.
- **원장성(Source-of-Truth)** — 충돌이 생겼을 때 무엇이 진실인지 사전에
  정의되어 있어야 합니다.

### 1.2 우리가 Spec에 요구하는 세 가지 전제

**전제 1. 1차 독자는 AI 에이전트, 2차 독자는 사람입니다.** v1.0 시기에는
“사람이 이해하면서 LLM도 해석할 수 있는 중립 포맷”을 목표로 했습니다.
그러나 v1.1 이후로 Spec의 **1차 소비자가 VibeCoding 에이전트**로
고정되었습니다. 이 전제는 포맷 설계의 방향을 바꿉니다 — 자연어 서술이
주가 아니고, 실행 가능한 아티팩트(OpenAPI, JSON Schema, EARS, Pact,
불변식)가 주이며, 자연어는 `description` 필드에만 존재하는 파생물입니다.

**전제 2. Spec은 “복사본”이 아니라 “AI-Ready 자산”입니다.** v1.2 Mission
Pivot에서 우리는 목표를 바꿨습니다. 레거시의 **“100% 등가 Copy
Machine”이 아닙니다.** 목표는 **ManMonth 기반 SI 프로세스를 AI 중심
체질로 전환하는 것**이고, 분석·기획·설계·개발·테스트·운영의 주체가 AI로
이전됩니다. Spec은 이 체질 전환의 **인터페이스**입니다. 따라서 Spec의
퀄리티 기준도 옮겨갑니다 — “원본을 빠짐없이 복제하는 능력”이 아니라
“핵심 서비스 식별 + 입력 자료 완결성 평가 + 암묵지 빈 슬롯 발굴·채움”이
중심 지표가 됩니다.

**전제 3. 소스코드가 원장, 문서는 참고입니다.** Phase 2 PRD(prd-final
§9.2)에서 공식으로 확정된 원칙입니다. Phase 1 PoC에서 LPON 88문서를
입력으로 사용한 결과, 문서에 없는 결제 검증 로직·예외처리 분기가
소스에서 다수 발견되었습니다. Phase 2부터는 **Java/Spring 소스코드가
Authoritative Source**이고, 문서는 Reference 지위로 재조정되었습니다.
차이는 3종 마커로 명시 관리합니다.

### 1.3 학술·산업 표준과의 관계

Decode-X의 Spec 개념은 기존 표준을 부정하지 않고 **재조합·확장**합니다.

- **Chikofsky-Cross(1990) Design Recovery** 프레임을 상위 포지셔닝으로
  씁니다. “원본 시스템의 의도와 추상화를 회복(recover)하되, 구현 그대로
  복제(restructure)하지는 않는다”는 정의가 본 프로젝트의 목적과
  일치합니다.
- **EARS 구문(Mavin 2009, Amazon Kiro 채택)** 을 Business Rule의 표준
  표현으로 차용합니다. `WHEN / WHILE / IF…THEN / WHERE` 5 패턴 전부
  지원합니다.
- **OpenAPI 3.1 + Smithy 2.0 + AsyncAPI 3.x + JSON Schema 2020-12** 를
  Technical Spec의 다중 포맷으로 병렬 사용합니다. 단일 포맷 하나로
  엔터프라이즈 계약 전 영역을 커버하려는 시도는 실패한다는 판단이 그
  배경입니다.
- **Meyer DbC(1992) + Leavens JML(2006)** 의 Design-by-Contract 철학을
  Quality Spec의 직렬화 포맷으로 흡수합니다. Daikon 동적 불변식이 경험적
  앵커 역할을 맡습니다.
- **Cleland-Huang 트레이서빌리티(2024)** 는 조항 ↔︎ 코드 ↔︎ 테스트 양방향
  바인딩 규칙으로 구현됩니다 — SCIP 심볼 ID와 Joern CPG 노드 ID가 각각의
  앵커입니다.
- **GitHub Spec Kit(2025) / Amazon Kiro(2025) / Tessl Spec Registry** 의
  “SDD(Spec-Driven Development)” 흐름과 방향은 같습니다. 다만 이
  도구들은 Spec을 **사람이 작성**한다는 전제에서 출발하고, 우리는 반대
  방향 — **기존 자산에서 자동 추출**합니다.

### 1.4 Spec이 아닌 것 (경계 설정)

혼동을 막기 위해 “Decode-X 문맥에서 Spec이 아닌 것”을 명시합니다.

- **단순 API 문서** — Swagger UI에 렌더링만 가능하고 조항-테스트-코드
  바인딩이 없는 문서는 Spec이 아닙니다. Executable Layer 1차 표현이
  Spec이고, HTML 문서는 그 파생물일 뿐입니다.
- **자연어 요구사항 명세서** — EARS 구문·Policy-as-Code 직렬화·테스트
  스텁 동반이 없는 문장은 `description` 필드에 속하는 보조 정보입니다.
  단독으로는 Spec이 아닙니다.
- **운영 Runbook** — Runbook은 Empty Slot을 채우는 **재료**이지 Spec
  자체는 아닙니다. Runbook이 Spec으로 승격되려면 `rules/` EARS ·
  `invariants/` 불변식 · `tests/scenarios/` 실행 시나리오로 분해되어야
  합니다.
- **ERD 단독** — ERD는 Technical Spec의 **Data Contract 재료**이지만,
  JSON Schema 2020-12로 직렬화되고 AI-Ready 6기준에 채점되기 전까지는
  Spec이 아닙니다.
- **ADR(Architecture Decision Record)** — 결정 이력은
  `provenance.yaml`의 부가 정보이며, 조항 수준의 실행·검증 바인딩이
  없다면 Spec 조항은 아닙니다.

------------------------------------------------------------------------

## 2. Spec의 구분 (4개 축)

> Spec은 한 가지 분류로는 정리되지 않습니다. 하나의 조항이 **네 개의
> 축에서 동시에 자리를 가집니다**.

- 축 1. **독자·실행 주체** — Executable / Verifiable / Reviewable (어느
  계층에 속하는가)
- 축 2. **내용·성격** — Business / Technical / Quality (무엇을
  기술하는가)
- 축 3. **수명주기·진실성** — Source-First 원장 vs Reference + 3종 마커
  (무엇이 진실인가)
- 축 4. **시스템 역할** — Input Plane vs Process·Output Plane (누가
  생산·소비하는가)

### 2.1 【축 1】 독자·실행 주체 — 3-Layer Container

v1.1 §4.3에서 공식 채택되어 v1.2에서 그대로 유지된 Spec Container의
구조적 정의입니다. **하나의 Spec = 하나의 디렉터리**이고, 세 개의 계층이
병치됩니다.

#### ① Executable Layer — 기계 실행 계층

**원칙**: 사람이 다시 쓸 필요가 없는, 런타임이 바로 먹는 포맷.

| 도메인          | 포맷                              | 선택 이유                                        |
|-----------------|-----------------------------------|--------------------------------------------------|
| REST API        | OpenAPI 3.1 + JSON Schema 2020-12 | 최신 표준 통합, `$dynamicRef` 조합 용이          |
| 서비스 계약     | Smithy IDL 2.0                    | 프로토콜 독립(REST/gRPC/GraphQL 동시 타깃)       |
| 비동기·이벤트   | AsyncAPI 3.x                      | 이벤트 스키마·채널·바인딩 통합, CloudEvents 호환 |
| 데이터 스키마   | JSON Schema 2020-12               | 유니버설, DDL 생성기 풍부                        |
| 계약 테스트     | Pact v3                           | Consumer-driven, Pact Broker 버전 관리           |
| 테스트 시나리오 | Playwright codegen                | 실행 가능한 E2E 스텁                             |

**다중 포맷을 고집하는 이유**: 단일 포맷으로 엔터프라이즈 전 영역을 덮는
시도는 현실에서 실패합니다. 우리는 대신 포맷 간 상호변환기(Smithy →
OpenAPI, JSON Schema → DDL, OpenAPI ↔︎ AsyncAPI)를 `contracts/`
디렉터리에 함께 번들합니다. 에이전트는 자기 태스크에 맞는 표현을 골라
씁니다.

#### ② Verifiable Layer — 기계 검증 계층

**원칙**: LLM의 출력을 기계가 검증 가능한 형태로 고정한다.

**EARS 구문**의 5 패턴을 모두 지원합니다 — Ubiquitous /
Event-driven(WHEN) / State-driven(WHILE) / Unwanted(IF…THEN) /
Optional(WHERE).

    WHEN a user submits invalid credentials 5 consecutive times
    THE SYSTEM SHALL lock the account for 15 minutes
    AND emit an `auth.account.locked` event.

**Policy-as-Code**는 `POL-{DOMAIN}-{TYPE}-{SEQ}` 코드 체계를 따르고,
Condition-Criteria-Outcome 구조로 YAML 직렬화됩니다. 조건은 facts 조합,
기준은 SLO·제약, 산출은 actions·observability 튜플로 표현됩니다.

**불변식 포맷**: Daikon `.inv`(경험적 앵커) + Dafny(선택, critical
invariant용).

#### ③ Reviewable Layer — 사람 리뷰 계층

**원칙**: 사람은 Executable/Verifiable의 **요약**만 본다. 원본은
에이전트가 본다.

`spec.md` 본문은 자동 렌더링되는 요약이며, 여섯 섹션을 고정 순서로
가집니다 — (1) TL;DR ≤ 3문장, (2) Decision Log ≤ 5개, (3) Rules at a
Glance, (4) API Surface, (5) Known Gaps, (6) AI-Ready Scorecard.
Reviewer UI는 조항 토큰을 클릭하면 CPG 노드 · 테스트 스텁 · SCIP 심볼을
사이드 패널에 펼칩니다. **조항당 리뷰 시간 ≤ 2분**이 KPI 목표입니다.

#### 3-Layer 간 관계 도식

      ┌─────────────────────────── Spec Container ────────────────────────────┐
      │                                                                        │
      │   ① Executable ─┬─ OpenAPI/Smithy/AsyncAPI/JSON Schema/Pact/Playwright │
      │                 │                                                      │
      │   ② Verifiable ─┼─ EARS rules · Policy-as-Code · Daikon/Dafny 불변식   │
      │                 │                                                      │
      │   ③ Reviewable ─┴─ spec.md (TL;DR, Decision Log, Scorecard, Gaps)     │
      │                                                                        │
      │   ④ Traceability (SCIP jsonl + CPG jsonl) ← 세 계층을 횡단 바인딩       │
      └────────────────────────────────────────────────────────────────────────┘

**세 계층의 관계**: Reviewable은 항상 Executable·Verifiable의 **자동
생성 파생물**입니다. 사람이 Reviewable을 수정해도 그것이 Executable로
역전파되지는 않습니다 — 원장성의 방향은 아래에서 위(Executable →
Reviewable)입니다.

### 2.2 【축 2】 내용·성격 — Business / Technical / Quality Spec

Spec 조항은 내용의 성격에 따라 세 갈래로 나뉩니다. Phase 2 PRD에서 이를
**B/T/Q Spec Schema**로 명명해 27개 매핑(충전 서비스 기준)을 Phase 1
PoC에서 27/27 완결로 달성했습니다.

| 종류                    | 코드 접두                    | 정의                                                  | 대표 포맷                                                     | 조항 예                                             |
|-------------------------|------------------------------|-------------------------------------------------------|---------------------------------------------------------------|-----------------------------------------------------|
| **Business Spec (BR)**  | `BR-*` / `POL-*`             | 무엇을·왜 하는가 — 도메인 규칙·정책·예외              | EARS + Policy-as-Code YAML                                    | “5회 오인증 시 15분 잠금”                           |
| **Technical Spec (TR)** | `API-*` / `DATA-*` / `EVT-*` | 어떻게·어디에서 동작하는가 — 인터페이스·데이터·이벤트 | OpenAPI 3.1 / Smithy 2.0 / AsyncAPI 3.x / JSON Schema 2020-12 | `POST /api/v1/charge` 요청·응답 스키마              |
| **Quality Spec (QR)**   | `SLO-*` / `INV-*`            | 얼마나·어떤 조건에서 — 성능·가용성·불변식·보안        | Daikon 불변식 / Dafny / SLO YAML                              | `sum(debit) == sum(credit)`, “p99 latency \< 500ms” |

**세 종류는 서로 교차합니다**.

- 하나의 **Core Service**(예: 충전)는 B/T/Q 각 계층에 조항을 갖습니다 —
  충전의 BR(한도·취소 규칙) + 충전의 TR(Charge API 스키마) + 충전의
  QR(처리 지연 SLO + 합계 불변식).
- BR은 **TR의 조건부**가 되고, QR은 **TR의 제약**이 됩니다. 예: “충전
  한도 초과 시 400 반환”은 BR → TR의 에러 스키마로 내려갑니다. “충전
  지연 p99 \< 500ms”는 QR → TR의 `x-slo` 확장 필드로 바인딩됩니다.
- B/T/Q 세 종류 모두가 같은 `sourceRefs`(SCIP 심볼 + 문서 섹션)를 공유해
  Traceability를 보존합니다.

**27개 매핑 (LPON “충전” Phase 1 기준)**: Phase 1 PoC에서 “충전” 단일
서비스로 B 9건 + T 9건 + Q 9건 = 27건을 완결(27/27)했습니다. Phase
2에서는 이 27 매핑 템플릿을 Tier-A 잔여 6개
서비스(예산·구매·결제·환불·선물·정산)에 확장 적용합니다.

### 2.3 【축 3】 수명주기·진실성 — Source-First + 3종 마커

“무엇이 진실인가”를 사전에 고정하는 축입니다. Phase 2 PRD §9.2에서
공식화되었습니다.

- **원장(Authoritative)**: LPON 결제 Java/Spring 소스코드.
- **참고(Reference, not authoritative)**: 기존 SI 산출물 문서.

소스와 문서가 충돌할 때, 혹은 한쪽에만 존재할 때는 **3종 마커**로 명시
관리합니다.

| 마커             | 발생 조건                      | 처리                                                     | Working Prototype 반영      |
|------------------|--------------------------------|----------------------------------------------------------|-----------------------------|
| `SOURCE_MISSING` | 문서에 있음, 소스에 없음       | “누락분”으로 별도 기재                                   | 반영 안 함                  |
| `DOC_ONLY`       | 문서 전용 요구(비기능·운영 등) | Spec의 비기능 섹션에 기재                                | 반영 안 함 (운영·감사 영역) |
| `DIVERGENCE`     | 소스와 문서가 다름             | 양쪽 기재 + **소스 채택**. Human-in-the-loop 3-way merge | 소스 버전 반영              |

**DIVERGENCE 발생 시 결재 절차**: prd-final §4.1 Round 1 반영으로,
DIVERGENCE는 자동 소스-우선을 따르되 **3-way merge Conflict Resolution
Workflow**를 거쳐 결재 로그(`provenance.humanReviewedBy`)를 남깁니다.
감사 추적·재현성을 위한 장치입니다.

**조항 단위 Trust Level**: `spec.md` frontmatter의 `trustLevel`이
`draft / reviewed / verified` 3단계를 가집니다. 소스 기반으로 자동
추출된 조항은 `draft`에서 시작해 SME 승인 후 `verified`로 승격됩니다.

### 2.4 【축 4】 시스템 역할 — Input Plane vs Process·Output Plane

v1.2 §13에서 확정된 Decode-X ↔︎ Foundry-X 역할 분담 결정입니다.

> **Decode-X = Input Plane Producer** — 레거시 자산(Code·Docs·Ops·Tacit)
> ⇒ AI-Ready Spec
>
> **Foundry-X = Process/Output Plane Orchestrator** — Spec ⇒ Working
> Site ⇒ PoC/MVP ⇒ Customer
>
> **공통 매개체(Single Interface)**: Git 저장소 + SPEC.md/F-items SSOT +
> Plumb `decisions.jsonl` + `SyncResult` JSON + `shared/kg.ts` Ontology

이 축에서 Spec은 **두 얼굴**을 가집니다.

- **Input-side Spec**: Decode-X가 생산하는 3-Layer Container
  (`specs/SPEC-YYYY-NNNN/`).
- **Output-side Spec**: Foundry-X가 소비하는 SPEC.md SSOT + F-items +
  Plumb Triangle Matched 결과.

Decode-X 산출물은 Foundry-X Plumb이 직접 읽을 수 있도록 다음 필드 매핑을
따릅니다.

| Plumb 필드                          | Decode-X 대응                                             |
|-------------------------------------|-----------------------------------------------------------|
| `triangle.specToCode.matched/total` | SCIP/CPG 바인딩된 조항 수 / 전체 조항 수                  |
| `triangle.codeToTest.matched`       | `tests/contract` + `tests/scenarios` 커버 심볼 수         |
| `triangle.specToTest.matched`       | `rules/*.ears.md` ↔︎ 매칭된 `.test.ts`·`.pact.json` 수     |
| `GapItem.type="spec_only"`          | Spec 있음·Code 심볼 없음 → `aiReady.traceable` 감점       |
| `GapItem.type="code_only"`          | Code 있음·Spec 없음 → §2.5 Empty Slot 후보로 역류         |
| `GapItem.type="test_missing"`       | Spec·Code 있음·테스트 없음 → `aiReady.testable` 감점      |
| `GapItem.type="drift"`              | Spec ↔︎ 실행 trace 차이 → Drift CI로 위임                  |
| `Decision.source="human"`           | Reviewer UI 승인 로그 → `provenance.humanReviewedBy` 연결 |
| `exit=0/2/1`                        | AI-Ready PassRate 게이트 정합(0=PASS, 2=WARN, 1=FAIL)     |

실전에서 Decode-X는 triangle을 재계산하지 않고 `plumb status --json`을
호출해 `SyncResult`를 그대로 `provenance.yaml`에 인라인 임베드합니다.

### 2.5 축 교차 매트릭스 — 하나의 조항이 가지는 4개 좌표

한 조항이 네 축에서 어떻게 교차하는지를 한 번에 보여줍니다.

| 조항 예                           | 축 1 (계층)                 | 축 2 (종류) | 축 3 (진실성)      | 축 4 (역할)                                   |
|-----------------------------------|-----------------------------|-------------|--------------------|-----------------------------------------------|
| `POST /api/v1/charge` 요청 스키마 | ① Executable                | TR          | 소스 원장          | Decode-X 생산 → Foundry-X Plumb               |
| “5회 실패 시 15분 잠금” EARS      | ② Verifiable                | BR + POL    | 소스 원장          | Decode-X 생산 → Foundry-X Test Agent 검증     |
| “p99 \< 500ms” SLO 불변식         | ② Verifiable                | QR          | 운영 로그 원장(E3) | Decode-X 생산 → Foundry-X Infra Agent 감시    |
| `spec.md` TL;DR 한 줄             | ③ Reviewable                | B/T/Q 요약  | Executable 파생    | Foundry-X Web 대시보드 소비                   |
| SCIP↔︎EARS 양방향 링크             | ④ Traceability              | 3종 횡단    | 소스 원장          | Decode-X 생산 → Foundry-X Plumb triangle 소비 |
| ES-GIFT-001 “명절 Side Car”       | ② Verifiable + ③ Reviewable | BR + QR     | Tacit 원장(E1)     | Decode-X Domain Archeologist 생산             |

------------------------------------------------------------------------

## 3. Spec 컨테이너 명세 (디렉터리·스키마)

### 3.1 디렉터리 레이아웃

v1.1 §4.3.2에서 확정된 정본 레이아웃입니다.

    specs/
    └─ SPEC-2026-0001/                     # 하나의 Spec = 하나의 디렉터리
       ├─ spec.md                          # 진입점 (YAML frontmatter + Markdown 본문)
       ├─ contracts/                       # ① Executable Layer
       │   ├─ api.openapi.yaml
       │   ├─ api.smithy
       │   ├─ events.asyncapi.yaml
       │   └─ data.jsonschema.json
       ├─ rules/                           # ② Verifiable Layer (BR·POL)
       │   ├─ BR-0001.ears.md
       │   ├─ BR-0001.test.ts
       │   └─ POL-USER-AUTH-0001.yaml
       ├─ invariants/                      # ② Verifiable Layer (QR)
       │   ├─ daikon.inv
       │   └─ dafny/
       ├─ traceability/                    # ④ Trace
       │   ├─ scip.jsonl
       │   └─ cpg-edges.jsonl
       ├─ tests/
       │   ├─ contract/                    # Pact
       │   ├─ scenarios/                   # Playwright
       │   └─ fixtures/
       └─ provenance.yaml                  # 추출 이력 + AI-Ready 점수 + Plumb SyncResult 임베드

이 레이아웃은 Claude Skills의 “SKILL.md + bundled resources +
Progressive Disclosure” 패턴을 Spec에 이식한 것입니다. 에이전트는
`spec.md` 한 파일만 먼저 읽고, 필요한 시점에 하위 디렉터리를 펼쳐
들어갑니다.

### 3.2 `spec.md` Frontmatter 스키마 요약

전체 필드는 기획서 v1.2 §4.3.3에 있고, 여기서는 **핵심 블록만**
요약합니다.

- **식별**: `specId`, `version`, `kind`(system/module/service/feature),
  `name`, `owner`, `domain`, `trustLevel`(draft/reviewed/verified)
- **스코프**: `scope.{system, module, boundedContext}`
- **타입**: `types: [business, technical, quality]` (3종 중 포함된 것)
- **의존**: `dependencies.{upstream[], downstream[]}`
- **Traceability**:
  `traceability.{sourceRepo, sourceCommits[], scipIndex, cpgIndex}`
- **Contracts 인덱스**: `contracts.{rest, service, events, data}`
  (Executable Layer 파일 경로)
- **Rules 인덱스**: `rules.{ears[], policies[], invariants[]}`
  (Verifiable Layer 파일 경로)
- **Tests 인덱스**: `tests.{contract, scenarios}`
- **AI-Ready 6기준 점수**:
  `aiReady.{machineReadable, semanticConsistent, testable, traceable, complete, humanReviewable, passRate, thresholds.passRate}`
- **Provenance**:
  `provenance.{extractionTool, extractedAt, methods[], modelSignature, confidence, humanReviewedBy, reviewStatus, reviewedAt}`
- **VibeCoding 힌트**:
  `vibeCoding.{targetStack, generatorHints, guardrails, stopRules, maxAttempts}`
- **Foundry-X 정렬 (v1.2 추가)**:
  `foundryX.{fItemId, plumbLastSync, syncResultEmbed}`

### 3.3 조항 단위 ID 체계

Spec 내부 조항은 **예측 가능한 ID 체계**를 가집니다. 재생성·충돌
회피·감사 추적 모두 이 체계에 기반합니다.

| 접두    | 대상                    | 포맷                         | 예                    |
|---------|-------------------------|------------------------------|-----------------------|
| `SPEC-` | Spec 컨테이너           | `SPEC-{YYYY}-{NNNN}`         | `SPEC-2026-0001`      |
| `BR-`   | Business Rule 조항      | `BR-{NNNN}` (Spec 내 범위)   | `BR-0001`             |
| `POL-`  | Policy-as-Code          | `POL-{DOMAIN}-{TYPE}-{SEQ}`  | `POL-AUTH-LOGIN-0001` |
| `API-`  | OpenAPI 연산            | OpenAPI `operationId` 그대로 | `chargeUser`          |
| `DATA-` | 데이터 엔티티           | `DATA-{ENTITY}-{VERSION}`    | `DATA-ORDER-v2`       |
| `EVT-`  | 이벤트 타입             | `EVT-{DOMAIN}-{NAME}`        | `EVT-AUTH-LOCKED`     |
| `INV-`  | 불변식                  | `INV-{SEQ}`                  | `INV-0003`            |
| `SLO-`  | Service Level Objective | `SLO-{KIND}-{SEQ}`           | `SLO-LATENCY-0001`    |
| `ES-`   | Empty Slot              | `ES-{DOMAIN}-{NNN}`          | `ES-GIFT-001`         |

### 3.4 AI-Ready 6기준과 자동 채점

모든 Spec은 다음 6기준에 대해 **자동 계산된 점수**를 가지고, passRate ≥
0.75가 PASS 게이트입니다.

| 기준                    | 측정 방법                                               | 가중치          |
|-------------------------|---------------------------------------------------------|-----------------|
| 1\. Machine-Readable    | 컨테이너 구조·스키마 유효성 검사 통과 여부              | 자동 1.0 (고정) |
| 2\. Semantic-Consistent | AutoSpec 변이복구 후 LLM self-consistency voting 일치율 | 0.2             |
| 3\. Testable            | 조항 대비 테스트 스텁 커버리지                          | 0.2             |
| 4\. Traceable           | SCIP 심볼 + CPG 노드 바인딩 커버리지                    | 0.2             |
| 5\. Complete            | Spectral + oasdiff + Completeness Oracle 누락/모순 감지 | 0.2             |
| 6\. Human-Reviewable    | Reviewer UX 샘플 시간(조항당 ≤ 2분)                     | 0.2             |

passRate는 6기준의 가중 평균이며, 조항 단위 PASS/FAIL 게이트로
작동합니다.

------------------------------------------------------------------------

## 4. Spec 파이프라인 (생산 → 검증 → 소비)

> Spec은 멈춰 있는 문서가 아닙니다. **생산(Produce) → 검증(Verify) →
> 소비(Consume) → Drift 피드백**의 루프를 계속 돕니다.

### 4.1 Decode-X 내부 Option C 생산 루프

v1.0에서 최종 채택된 Option C 방법론 스택이 다음 순서로 작동합니다.

    [Ingestion] 소스·문서·운영 로그 수집 (Source-First)
        ↓
    [IR] Joern CPG + SCIP 심볼 인덱스 구축
        ↓
    [Extract] AutoSpec 루프 (정적분석 → LLM 추출 → 검증기 → 변이복구)
        ↓
    [Anchor] Daikon 동적 불변식으로 Quality Spec 경험적 앵커링
        ↓
    [Reconcile] 문서 ↔ 소스 차이를 3종 마커로 기재 (DIVERGENCE는 HITL)
        ↓
    [Fill Empty Slot] §2.5 파이프라인으로 암묵지 슬롯 채움
        ↓
    [Emit] spec.md + contracts/ + rules/ + invariants/ + traceability/ + tests/ + provenance.yaml 커밋

### 4.2 Empty Slot 발굴·채움 공정 (E1~E5)

Spec의 완성도 차별화는 여기에서 결정됩니다. Empty Slot은 “Spec화되지
않은 암묵지 또는 운영 전환 규칙”이고 다음 5종으로 분류합니다.

| ID  | 종류            | 정의                                   | 탐지 신호                                 | 채움 방식                                       |
|-----|-----------------|----------------------------------------|-------------------------------------------|-------------------------------------------------|
| E1  | Surge Handling  | 트래픽·요청 폭주 시 Side Car·우회 경로 | 장애 티켓의 “수동 Rerouting”, LB 스파이크 | Runbook 인터뷰 + Daikon 불변식 + Load 시나리오  |
| E2  | Fraud / Abuse   | 부정 사용·공격 패턴 사전 차단          | 보안 로그, 벤 리스트, 운영 매뉴얼         | Policy-as-Code + EARS Inverse(negative)         |
| E3  | Reconciliation  | 정산 불일치 수작업 보정 노하우         | 월말 엑셀, 정정 트랜잭션, 손익 조정 JE    | `sum(debit)==sum(credit)` 불변식 + 보정 Runbook |
| E4  | Exception Paths | 드문 이례 케이스(휴일·점검·이벤트)     | 휴일 캘린더, CS 티켓, 임시 플래그         | Event-driven EARS + Feature Flag                |
| E5  | Operator Tacit  | 담당자 경험 기반 판단                  | 운영자 인터뷰, 댓글, Slack 이력           | HITL 세션 녹취 → Spec 추출 → SME 승인           |

**Filled 판정 조건 (3자 바인딩 필수)**: (1) `rules/` 하위 EARS 또는
Policy-as-Code 조항 존재, (2) `tests/scenarios/` 또는 `tests/contract/`
실행 가능 테스트 존재, (3) `runbooks/` 또는 `invariants/` 하위 운영 절차
또는 불변식 존재.

**Domain Archeologist 역할(v1.2 §8 신설 FTE)**: Empty Slot
발굴·인터뷰·드래프트를 전담하는 1 FTE 역할. E1·E2·E5 슬롯이 집중됩니다.

### 4.3 Foundry-X Plumb 동기화 소비 루프

Decode-X 산출물이 커밋되는 순간 Foundry-X의 Plumb 엔진이 다음 루프를
돕니다.

    [Detect] Git 커밋 감지 → SPEC.md 변경 분석
        ↓
    [Sync] plumb review / plumb status 실행
        ↓
    [Compute] triangle = { specToCode, codeToTest, specToTest }
        ↓
    [Emit] SyncResult JSON + decisions.jsonl append
        ↓
    [Gate] exit 0 (PASS) / 2 (PARTIAL) / 1·127 (FAIL)
        ↓ PASS
    [Build] 6-Agent (Architect/Test/Security/QA/Infra/Reviewer) Working Prototype 생성
        ↓
    [Feedback] /callback/{job-id} 엔드포인트로 Decode-X로 결과 반환

**Plumb Error Contract**: 5종 `FoundryXError`(PlumbNotInstalled /
PlumbTimeout / PlumbExecution / PlumbOutput /
NotInitialized·NotGitRepo)는 **명시적 재시도 없음** — pre-flight
`isAvailable()` + user-guided escalation(타임아웃 2배 안내) + exit-code
의미를 caller가 판정합니다.

### 4.4 Handoff Package & /callback 피드백 루프 (Phase 2 PRD)

Decode-X → Foundry-X 인계는 **Handoff Package**라는 고정 포맷으로
이루어집니다. Phase 1에서 포맷이 정의되었고, Phase 2에서 실
수용·실행·피드백까지 검증합니다.

- **요청 엔드포인트**: `/handoff/accept` (Foundry-X 측)
- **피드백 엔드포인트**: `/callback/{job-id}` (Decode-X 측, Phase 2
  Round 1 신설)
- **verdict 3종**: `accepted` / `rejected` / `partial` — Foundry-X가
  Handoff 수용 가능성을 판정
- **payload 주요 필드**: `specContainerUri`, `manifest`,
  `plumbSyncResult`(임베드), `expectedOutcomes`, `callbackUrl`
- **round-trip 일치율 목표**: ≥ 90% (실 데이터 sample N건 → Working
  Prototype 실행 결과 vs 기대값 비교)

### 4.5 Drift CI 양방향 트리거

소비 쪽(Foundry-X)에서 drift가 감지되면 생산 쪽(Decode-X)으로
역류합니다.

- Foundry-X Plumb `GapItem.type="drift"` 감지 → Decode-X 해당 Spec을
  **Deficiency-flag** 상태로 복귀
- Deficiency-flag 부여 시 §2.5 Empty Slot 재점검 자동 트리거
- Sprint 재계획 — Domain Archeologist + Harness Engineer 투입

이 루프가 “Spec은 살아 움직이는 자산”이라는 명제의 기술적 구현입니다.

------------------------------------------------------------------------

## 5. 사례

### 5.1 사례 1 — 전자온누리상품권 (기획 레벨, v1.2 §2.5.6)

**도메인**: 정부 지원 지역화폐 결제 플랫폼. 가맹점·소비자·지자체 3자
모델.

**Core Service Tier-A 식별 결과 (7개)**: 예산 · 충전/충전취소 ·
구매/구매취소 · 결제/결제취소 · 환불/환불취소 · 선물/선물취소 · 정산.

이 7개 서비스가 §2.5.2 3축 스코어(Business Criticality 0.4 + Operational
Load 0.4 + Change Pressure 0.2)에서 상위 20%에 진입했습니다. Tier-A는
Decode-X **풀 파이프라인**(§4.5 Harness + §6 Differential Testing)을
타고, Tier-B는 경량 파이프라인(Spec 추출 + Pact), Tier-C는 Sunset
권고입니다.

**대표 Empty Slot 6건 (5종 분류 기준)**:

| ID          | 설명                                                         | 종류         | 현재 상태                    | Filled 조건                                                                                   |
|-------------|--------------------------------------------------------------|--------------|------------------------------|-----------------------------------------------------------------------------------------------|
| ES-GIFT-001 | 명절 직전 구매 폭주 시 Side Car 인스턴스 발동 + 예산 큐 분산 | E1 Surge     | Runbook 단편, SRE 암묵지     | EARS `WHEN reqRate > X THEN enable(sideCar)` + Load 시나리오 + 스케일 불변식                  |
| ES-GIFT-002 | 선물코드 무단 반복 수집 봇 패턴 사전 차단                    | E2 Fraud     | 보안팀 블랙리스트            | `POL-GIFT-FRAUD-001` Inverse EARS + 패턴 테스트 + Rate-limit 계약                             |
| ES-GIFT-003 | 가맹점 결제·취소·재결제 사이클의 수작업 정산 노하우          | E3 Reconcile | 월말 엑셀 + CS 메모          | `sum(settle.in) == sum(settle.out) - sum(refund)` 불변식 + JE Runbook + 보정 시나리오         |
| ES-GIFT-004 | 설·추석·지자체 특별지원금 이벤트의 한시 할인·한도 룰         | E4 Exception | 이벤트 공지 PDF, 임시 플래그 | Feature-flag 모델 + Event-driven EARS + 캘린더 fixture                                        |
| ES-GIFT-005 | 특정 가맹점의 수기 심사 판단 기준(등급·부정 의심)            | E5 Tacit     | 담당자 경험                  | 인터뷰 녹취 → 판단 규칙 표 → `POL-MERCHANT-REVIEW-*` + 심사 시나리오                          |
| ES-GIFT-006 | 구매취소·환불 연쇄 시 회계 정합성 보정                       | E3 Reconcile | 회계팀 매뉴얼                | 트랜잭션 상태 다이어그램 + `invariant: sum(chargeback) == sum(reverse_settle)` + GWT 시나리오 |

**Fill 목표**: Tier-A 핵심 7개 서비스 × 평균 8~12개 Slot → **Empty Slot
Fill Rate ≥ 70%** 도달 시 Phase 2 완료.

**이 사례가 보여주는 것**: “Spec을 만든다”는 작업이 왜 **기술 문제가
아니라 지식 고고학(archeology)** 인지. 엑셀·Slack·담당자 머리에만 있던
ES-GIFT-003·005는 코드에도 문서에도 없습니다. 이를 Spec으로 승격시키는
것이 Decode-X 퀄리티의 핵심입니다.

### 5.2 사례 2 — LPON 결제 도메인 (PoC·Phase 2 레벨, prd-final)

**도메인**: KT DS 내부 보유 결제 플랫폼. Java/Spring 기반. Phase 1에서
“충전” 1개 서비스가 완결성 27/27로 PoC를 완주했습니다.

**Track A (양적 커버리지)**:

| 지표                  | Phase 1 기준값       | Phase 2 목표값                               | 측정 방법                            |
|-----------------------|----------------------|----------------------------------------------|--------------------------------------|
| Tier-A 커버리지       | 1/7 (충전만)         | 7/7 (잔여 6개 추가)                          | Sprint exit-check.md 누적            |
| B/T/Q 완결성          | 27/27 (충전)         | ≥ 95% (서비스 평균)                          | 자동 채점기                          |
| AI-Ready 6기준 통과율 | GO (충전)            | ≥ 70% (6서비스 집계)                         | AI-Ready 자동 채점기 확장            |
| 소스 출처 추적성      | 해당 없음(문서 기반) | **100%** (모든 추출 항목이 소스 위치 가리킴) | 추출 엔진 로그 + reconciliation 감사 |

**Track B (깊이, 결제 E2E)**:

| 지표                        | 목표값           | 측정 방법                                                      |
|-----------------------------|------------------|----------------------------------------------------------------|
| Handoff 수용 성공률         | 100% (1/1)       | Foundry-X `/handoff/accept` verdict                            |
| Working Prototype 실행 PASS | 전 시나리오 PASS | Foundry-X 실 실행 로그                                         |
| Round-trip 일치율           | ≥ 90%            | 실 데이터 sample N건 → Working Prototype 실행 → 결과 vs 기대값 |

**Source-First 적용 사례 (prd-final §1 Pain Point)**: Phase 1 “충전”
매핑 과정에서 **문서에 없는 결제 검증 로직·예외처리 분기가 소스에서
발견**되었습니다. 구체적으로 환불 로직·예산 한도 체크 분기가 문서에는
간략히만 기재되어 있었고, 소스의 조건 분기가 훨씬 세밀했습니다. 이
발견이 Phase 2의 Source-First 정책 공식화 근거가 됐습니다.

**3종 마커 적용 예**:

- `SOURCE_MISSING` — 문서에 “야간 시간대 충전 제한”이 있었으나 소스에는
  해당 로직이 없었습니다. 별도 기재, Working Prototype 미반영.
- `DOC_ONLY` — 문서에 “월 1회 감사 보고서 생성” 요구가 있으나 이는 운영
  영역이므로 Spec의 비기능 섹션에만 기재합니다.
- `DIVERGENCE` — 충전 한도 상한이 문서는 50만원/일, 소스는
  100만원/일(최근 상향 조정). 3-way merge로 소스 채택, Open Issue 등록.

**Phase 2 20 Sprint 로드맵 (1.5~2주)**:

| Sprint            | 산출물                                                                | 기간  |
|-------------------|-----------------------------------------------------------------------|-------|
| Sprint 6 (M1)     | FX-SPEC-002 v1.1 작성 (선행 게이트)                                   | 1~2일 |
| Sprint 7 (M2)     | svc-ingestion Java/Spring AST 파서 + Source-First Reconciliation 엔진 | 2일   |
| Sprint 8 (M2)     | ERWin ERD 추출 PoC (SQL DDL 단일, XML fallback)                       | 1~2일 |
| Sprint 9~14 (M3)  | Track A 6개 서비스 Empty Slot Fill (하루 1서비스)                     | 6일   |
| Sprint 15~16 (M4) | Track B 결제 E2E Handoff → Foundry-X → round-trip 검증                | 2~3일 |
| Sprint 17 (M5)    | 재평가 Gate (KPI 집계)                                                | 0.5일 |

**이 사례가 보여주는 것**: Spec은 **체크리스트가 아니라 실행 결과로
측정됩니다**. Handoff 수용률·Working Prototype 실행 PASS·round-trip
일치율 — 이 세 가지가 모두 통과해야 비로소 “Spec이 일을 한다”고 말할 수
있습니다.

### 5.3 사례 3 — 형식 조각 (실제 직렬화 예)

#### 5.3.1 EARS 조항

``` markdown
---
id: BR-0001
policyCode: POL-AUTH-LOGIN-0001
priority: P1
tags: [business-rule, security, auth]
sourceRefs:
  - { kind: code, scip: "scip-java:kt.acme.auth/LoginService#authenticate", line: "87-102" }
  - { kind: doc,  docId: "internet-banking-api-v3", section: "3.2.1" }
testRefs:
  - "tests/contract/auth.login.pact.json#scenario-wrong-password"
  - "tests/scenarios/login.spec.ts#case-3-lockout"
---

## Rule

**WHEN** a user submits invalid credentials 5 consecutive times
**THE SYSTEM SHALL** lock the account for 15 minutes
**AND** emit an `auth.account.locked` event.

### Clarifications
- "invalid credentials" = wrong password OR wrong TOTP
- window = rolling 15 minutes
- lock is per-user (not per-IP)

### Inverse (negative case)
**IF** the 5 attempts are interleaved with ≥ 1 successful login, **THEN** the counter resets.
```

#### 5.3.2 Policy-as-Code

``` yaml
policyCode: POL-USER-AUTH-0001
domain: auth
policyType: security
sequence: 1
condition:
  and:
    - { fact: "attempt.credential", op: "invalid" }
    - { fact: "attempt.windowCount", op: ">=", value: 5 }
criteria:
  slo:
    - "lockout applied within 500ms of 5th failure"
  constraints:
    - "counter reset on success"
outcome:
  actions:
    - "account.lock(user_id, duration=PT15M)"
    - "events.publish('auth.account.locked', {user_id})"
  observability:
    metric: "auth.lockouts.count"
    log:    "auth.failed"
trust:
  confidence: 0.93
  reviewedBy: "security-team"
provenance:
  sourceRefs: ["scip-java:kt.acme.auth/LoginService#authenticate"]
  extractedBy: "autospec"
```

#### 5.3.3 Plumb SyncResult (Foundry-X 측 출력, provenance.yaml 임베드)

``` json
{
  "success": true,
  "timestamp": "2026-04-19T14:32:17Z",
  "duration": 2841,
  "triangle": {
    "specToCode": { "matched": 26, "total": 27, "gaps": [
      { "type": "spec_only", "clauseId": "BR-0009", "reason": "SCIP symbol missing" }
    ]},
    "codeToTest": { "matched": 25, "total": 27, "gaps": [
      { "type": "test_missing", "scipSymbol": "...ChargeService#revokeCharge" }
    ]},
    "specToTest": { "matched": 27, "total": 27, "gaps": [] }
  },
  "decisions": [
    { "id": "d-0142", "source": "human", "summary": "BR-0009 deferred", "status": "approved", "commit": "a1b2c3d" }
  ],
  "errors": []
}
```

#### 5.3.4 Empty Slot (ES-GIFT-003 Reconciliation 예)

``` markdown
---
id: ES-GIFT-003
type: E3-Reconciliation
service: settlement
status: filled          # draft | investigating | filled
owner: domain-archeologist
---

## Narrative (Tacit 출처)
가맹점 A가 10:00에 5만원 결제, 10:15에 결제취소, 10:20에 동일 금액 재결제.
월말 정산 시 이 3건의 순 합(net)이 +5만원이어야 하나, 시스템 집계는 +10만원으로 잡혀 CS팀이 수작업 보정한다.

## Invariant
sum(settle.in) == sum(settle.out) - sum(refund)

## Runbook
1. 월말 T-2에 Settlement Adjuster 배치 실행
2. 취소 → 재결제 cycle detection 쿼리 돌림
3. mismatch > 0 이면 매뉴얼 JE 생성

## Test
tests/scenarios/settlement-reconciliation.spec.ts
tests/contract/settlement.pact.json#cycle-reconciliation

## Source Refs
- scip: scip-java:kt.onnuri.settlement/SettlementService#computeNet
- scip: scip-java:kt.onnuri.settlement/CancellationReverser#apply
- doc:  "LPON-89-settlement-monthly-manual.pdf", section "5.3"
```

------------------------------------------------------------------------

## 6. Spec의 품질 게이트와 KPI

> Spec이 “Ready”라고 선언되려면 **네 개의 게이트**를 동시에 통과해야
> 합니다. 한 개라도 미달이면 Ready가 아닙니다.

### 6.1 게이트 1 — AI-Ready passRate ≥ 0.75

§3.4의 6기준 가중 평균. 조항 단위 PASS/FAIL을 낳고, Spec 전체의 출고
가능 여부를 판정합니다.

### 6.2 게이트 2 — Foundry-X Plumb Triangle Matched ≥ 90%

`specToCode` / `codeToTest` / `specToTest` 세 축 모두에서 matched/total
≥ 0.90. 미달 시 Plumb exit code = 2 (PARTIAL)가 나오고, Handoff는
verdict = `partial`로 판정되어 자동 accept되지 않습니다.

### 6.3 게이트 3 — Empty Slot Fill Rate ≥ 70%

§4.2 E1~E5 기준. Tier-A 서비스에서 발굴된 Empty Slot 중 “Filled”(3자
바인딩 완료) 비율이 70% 이상입니다. 미달 시 Spec은 Deficiency-flag를
유지하며, §4.5 Harness는 Code Gen 단계로 진입하지 않습니다.

### 6.4 게이트 4 — Tier 차등 행위 동등성

v1.2 §1.5의 Tier 재정의에 따라 Differential Testing 결과를 Tier별로
판정합니다.

- **Tier-A**: ≥ 95% (핵심 거래 경로)
- **Tier-B**: ≥ 70% (부차 경로)
- **Tier-C**: Sunset Rate ≥ 50% (의도적 제외·폐기)

Tier-A에서 95% 미달이면 전체 Spec은 Ready가 아닙니다. Tier-B는 경량
파이프라인만 통과해도 충분합니다.

### 6.5 종합 KPI 대시보드

| KPI                             | 목표                 | 측정 방법                        | 책임                |
|---------------------------------|----------------------|----------------------------------|---------------------|
| AI-Ready passRate               | ≥ 0.75               | 자동 채점기                      | Spec Architect      |
| Plumb Triangle Matched          | ≥ 90%                | `plumb status --json`            | Harness Eng         |
| Empty Slot Fill Rate            | ≥ 70%                | §4.2 Filled 카운트               | Domain Archeologist |
| Tier-A 행위 동등성              | ≥ 95%                | Differential Testing 일치율      | QA                  |
| Tacit Knowledge Coverage        | ≥ 60%                | HITL 세션 녹취 기반 E5 슬롯 비율 | Domain Archeologist |
| Input Completeness Score        | ≥ 0.75 (Tier-A 평균) | §2.5.3 공식                      | Spec Architect      |
| Foundry-X Integration Readiness | ≥ 80%                | §13.6 정렬 규칙 준수율           | Liaison             |
| 조항당 Reviewer 시간            | ≤ 2분                | Reviewer UI 샘플                 | Reviewer UX         |
| Round-trip 일치율 (결제 E2E)    | ≥ 90%                | 실 데이터 N건 결과 비교          | QA + Harness Eng    |

------------------------------------------------------------------------

## 7. 결론 및 향후 진화 방향

### 7.1 결론 — 이것이 Decode-X Spec의 최종형입니다

Spec은 **4개 축의 좌표를 동시에 갖는 계약**입니다 — (1) 3-Layer
Container로서 계층성을 갖고, (2) B/T/Q 3종으로 내용 성격이 분기하며, (3)
Source-First 원장·3종 마커로 진실성을 고정하고, (4) Input/Output
Plane으로 시스템 역할이 갈립니다. 이 네 축 중 하나라도 생략된 “Spec”은
Decode-X 맥락에서 Spec이 아닙니다.

Spec의 품질은 네 개의 동시 만족 게이트(AI-Ready passRate · Plumb
Triangle · Empty Slot Fill · Tier 차등 동등성)로 측정되며, 사례
1(전자온누리상품권)·사례 2(LPON 결제)가 이 정의를 각각 기획 레벨·PoC
레벨에서 실증합니다.

### 7.2 v1.2 이후의 진화 축

**축 A — Spec Registry와 재사용 생태계.** Tessl Spec Registry(10k+ OSS
lib)와 유사한 **KT 그룹 내부 Spec Registry**를 Phase 4 이후 구축 검토.
Decode-X가 생산한 Spec은 재사용 가능한 자산으로 등록되어 Foundry-X
프로젝트 간에 공유됩니다.

**축 B — Spec의 포맷 확장.** COBOL·PL/SQL·PowerBuilder 등 레거시 DSL의
ingestion은 v1.0 Out-of-Scope였지만, Phase 3 이후 검토 대상입니다. ANTLR
기반 파서로 CPG에 진입시키는 경로가 유력합니다.

**축 C — Spec ↔︎ KG Ontology 쌍방 진화.** 현재 `shared/kg.ts`는
Decode-X와 Foundry-X 공유 SSOT입니다. 앞으로 Palantir Foundry
Ontology·Goldman Sachs Legend(FINOS)·Apple Pkl 패턴을 참조해 **도메인
특화 Ontology**로 성장시킬 여지가 있습니다. 금융·공공·유통 각 도메인에
최적화된 Spec Schema가 KG에 주입됩니다.

**축 D — Meta-Recursion (자기증명).** Decode-X 자신의 소스코드도
Decode-X로 Spec화 가능합니다. Foundry-X 역시 동일합니다. v1.2 §11에서 이
“메타 적용”이 KPI로 이미 등록되어 있고, 두 팀 동시 수행으로 **자기증명
시연**이 가능합니다(v1.2 §13.9 기대효과 5).

**축 E — Customer Pilot에서의 Spec 소비 경험.** Foundry-X PRD V8의 Phase
5(Customer Pilot + Revenue)에서 외부 고객이 실제로 Decode-X Spec을 읽고
이해·승인하는 경험 데이터가 쌓이면, Reviewable Layer의 UX·용어 체계가
추가 진화할 여지가 있습니다.

------------------------------------------------------------------------

## 부록 A. 용어집

| 용어                         | 정의                                                                                         |
|------------------------------|----------------------------------------------------------------------------------------------|
| **Spec**                     | 본 보고서 §1.1 한 줄 정의 참조                                                               |
| **3-Layer Container**        | Executable/Verifiable/Reviewable 세 계층이 병치된 Spec 디렉터리 구조                         |
| **Executable Layer**         | OpenAPI·Smithy·AsyncAPI·JSON Schema·Pact·Playwright로 직렬화된 기계 실행 계층                |
| **Verifiable Layer**         | EARS 구문·Policy-as-Code·Daikon/Dafny 불변식으로 직렬화된 기계 검증 계층                     |
| **Reviewable Layer**         | `spec.md` 본문에 자동 렌더링되는 사람 감사 요약 계층                                         |
| **BR / TR / QR**             | Business Rule / Technical Requirement / Quality Requirement Spec 조항                        |
| **B/T/Q Spec Schema**        | Phase 1 PoC에서 정의된 3종 Spec의 통합 스키마. 27 매핑이 기준 단위.                          |
| **EARS**                     | Easy Approach to Requirements Syntax. WHEN/WHILE/IF·THEN/WHERE 5 패턴 구조화 자연어.         |
| **Policy-as-Code**           | 조건-기준-산출(Condition-Criteria-Outcome) 구조의 `POL-*` 코드화 YAML.                       |
| **AI-Ready 6기준**           | Machine-Readable / Semantic-Consistent / Testable / Traceable / Complete / Human-Reviewable. |
| **passRate**                 | AI-Ready 6기준의 가중 평균 점수. ≥ 0.75이면 PASS.                                            |
| **SCIP**                     | Sourcegraph Source Code Intelligence Protocol. 심볼 그래프 표준.                             |
| **CPG**                      | Code Property Graph (Yamaguchi 2014). AST+CFG+PDG 통합 그래프 IR. Joern이 구현체.            |
| **Source-First**             | 소스코드를 Authoritative Source로, 문서를 Reference로 삼는 운영 원칙. Phase 2 PRD §9.2.      |
| **3종 마커**                 | `SOURCE_MISSING` / `DOC_ONLY` / `DIVERGENCE`. 소스-문서 불일치 기재 규약.                    |
| **Empty Slot**               | Spec화되지 않은 암묵지 또는 운영 전환 규칙. E1~E5로 분류.                                    |
| **E1~E5**                    | Surge / Fraud / Reconciliation / Exception / Operator Tacit.                                 |
| **Filled**                   | Empty Slot이 EARS·Test·Runbook(또는 Invariant) 3자 바인딩을 완료한 상태.                     |
| **Domain Archeologist**      | Empty Slot 발굴·인터뷰·드래프트 전담 1 FTE 역할 (v1.2 §8).                                   |
| **Foundry-X Plumb**          | Spec↔︎Code↔︎Test 동기화 전용 엔진. SyncResult JSON + decisions.jsonl 생산.                     |
| **SyncResult**               | Plumb 출력 JSON. triangle(3축 matched/total) + decisions + errors.                           |
| **GapItem.type**             | `spec_only` / `code_only` / `test_missing` / `drift`. Plumb triangle 간극 분류.              |
| **Handoff Package**          | Decode-X → Foundry-X 인계 포맷. `/handoff/accept` 엔드포인트로 수용.                         |
| **/callback/{job-id}**       | Foundry-X → Decode-X 피드백 엔드포인트 (Phase 2 Round 1 신설).                               |
| **Tier-A/B/C**               | Core Service 3축 스코어 기준 분류. Tier-A 20% 풀 파이프라인, B 40% 경량, C 40% Sunset.       |
| **Input Completeness Score** | 코드·문서·운영 로그 교집합 기반 Core Service 완결성 지표. §2.5.3 공식.                       |
| **Tier-A 행위 동등성**       | ≥ 95% (Differential Testing 일치율). v1.2 §1.5 Tier 재정의 기준.                             |
| **Drift CI**                 | Spec 변경과 실행 trace 간 차이 지속 감시 체계. Spectral + oasdiff + PactFlow 3-Layer.        |
| **SDD Triangle**             | Foundry-X BLUEPRINT v1.36 용어. Spec↔︎Code↔︎Test 삼중 동기화 개념.                             |
| **O-G-D Loop**               | Observe → Generate → Decide. Foundry-X 운영 루프 (BLUEPRINT 암시).                           |

------------------------------------------------------------------------

## 부록 B. 근거 문서 리스트

Decode-X 내부 문서.

| 문서                                  | 위치                                            | 역할                                                         |
|---------------------------------------|-------------------------------------------------|--------------------------------------------------------------|
| Decode-X 개발기획서 v1.0              | `Decode-X_개발기획서_v1.0.md`                   | 초안 — Option C 채택, 3종 Spec 원형 정의                     |
| Decode-X 개발기획서 v1.1              | `Decode-X_개발기획서_v1.1.md`                   | §4.3 Spec Schema 3-Layer Container 재설계, §4.5 Harness 신설 |
| Decode-X 개발기획서 v1.2              | `Decode-X_개발기획서_v1.2.md`                   | §1.5 Mission Pivot, §2.5 Empty Slot, §13 Foundry-X 통합      |
| Decode-X v1.3 Phase 2 PRD (prd-final) | `docs/req-interview/decode-x-v1.3/prd-final.md` | Source-First·3종 마커·Handoff·Phase 2 20 Sprint 로드맵       |
| Decode-X v1.2 PRD v2 (prd-v2)         | `docs/req-interview/decode-x-v1.2/prd-v2.md`    | v1.1→v1.2 전환 근거 PRD                                      |

Foundry-X 레퍼런스 (v1.2 부록 H 카탈로그).

| 축약 코드        | 문서                     | 역할                                                            |
|------------------|--------------------------|-----------------------------------------------------------------|
| FX-BP-1.36       | BLUEPRINT v1.36          | “Git이 진실, Foundry-X는 렌즈”. SDD Triangle·Plumb·Claude Squad |
| FX-PRD-V8        | Product Requirements V8  | North Star, 6 Agents, KPI                                       |
| FX-PLUMB-OUT     | Plumb Output Contract    | SyncResult 스키마·exit code 계약                                |
| FX-PLUMB-ERR     | Plumb Error Contract     | FoundryXError 5종·no-retry·user-guided escalation               |
| FX-INDEX         | Specs Index              | FX-SPEC-\* 카탈로그·버전·상태                                   |
| FX-SPEC-002 v1.1 | Phase 2 선행 게이트 계약 | Tier-A 6 서비스 특성 + E2E 실행 + Working Prototype 수용 기준   |

외부 학술·산업 레퍼런스 (v1.0 부록 A·B에서 선별).

- Chikofsky & Cross (1990). *Reverse Engineering and Design Recovery: A
  Taxonomy*. IEEE Software.
- Ernst et al. (2007). *The Daikon system for dynamic detection of
  likely invariants*. Science of Computer Programming.
- Yamaguchi et al. (2014). *Modeling and Discovering Vulnerabilities
  with Code Property Graphs*. IEEE S&P.
- Mavin et al. (2009). *Easy Approach to Requirements Syntax (EARS)*. RE
  Conference.
- Godefroid et al. (2005). *DART: Directed Automated Random Testing*.
  PLDI.
- Yang et al. (2011). *Finding and Understanding Bugs in C Compilers
  (Csmith)*. PLDI.
- SpecGen (ICSE 2025) · AutoSpec (CAV 2024) · CodeSpecBench (2026).
- GitHub Spec Kit (2025, MIT). Amazon Kiro (2025). Tessl Spec Registry.
- Google Cloud Dual Run (2025). Meyer *Design by Contract* (1992).
  Leavens *JML* (2006).

------------------------------------------------------------------------

## 문서 메타

- **v1.0 (2026-04-20)** — 최초 작성. 기획서 v1.0~v1.2 + prd-v2 +
  prd-final의 Spec 개념을 단일 레퍼런스로 집대성 (Sinclair).
- **v1.1 (2026-04-20)** — Claude 브랜드 Tone & Manner 적용. 문체를
  warm·precise·humble·clear 기준으로 재작성. 기술 팩트는 유지
  (Sinclair).
- **다음 리뷰 대상**: Phase 2 Sprint 15~16의 Track B round-trip 실결과
  반영 후 v1.2로 개정.

*(끝)*


**Decode-X Spec Reference · v1.1** · 2026-04-20 · Sinclair Seo  
다음 리뷰 대상 — Phase 2 Sprint 15~16의 Track B round-trip 실결과 반영
후 v1.2로 개정


