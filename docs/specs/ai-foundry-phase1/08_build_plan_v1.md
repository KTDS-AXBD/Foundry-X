---
title: AI Foundry OS 구축계획서 (Master Build Plan)
subtitle: 5개 사내 repo (Foundry-X · Decode-X · Discovery-X · AXIS-DS · ax-plugin) 기반 Phase 1~4 통합 빌드 로드맵
version: v1 (2026-05-02)
owner: Sinclair Seo
audience: KTDS-AXBD 내부 (코어팀 · AXBD 임원 · 모듈 코어 5명)
classification: 기업비밀 II급
based_on:
  - 02_ai_foundry_phase1_v0.3.md (외부용 정의서)
  - 07_ai_foundry_os_target_architecture.md (사내 운영 아키텍처 v1)
  - 06_architecture_alignment_with_besir_v1.md (BeSir 정합성)
external_facing: 외부 회람 시 13장 외부 노출 가이드 준수 (5개 repo 명칭 추상화)
---

# AI Foundry OS 구축계획서 (Master Build Plan)

> **이 문서가 답하는 질문**
>
> "**5월 W18 시점에 우리가 가진 자산(5개 repo)으로, 8월 W34 G5까지 어떻게 구축하고, 9월 이후 Phase 4까지 어디로 나아가는가?**"
>
> 본 문서는 02 정의서(외부용 5-Layer)와 07 사내 아키텍처(3-Plane + Side Rail)를 입력으로 받아, **모듈·스프린트·게이트·인력·리스크**를 한 곳에서 정합적으로 묶은 구축 실행 계획입니다.

---

## 0. 한 페이지 요약

### 0.1 빌드 한 줄

> **5개 사내 repo의 현재 자산을 재사용·확장·신규 결합해, 18주 안에 가상 도메인 E2E → 첫 실제 도메인 적용까지 도달하고, 9월 이후 자산 재사용 가속·다도메인·마켓플레이스로 확장한다.**

### 0.2 4-Phase × 5-Repo 한 그림

```
           Phase 1 (5월)     Phase 2 (6월)        Phase 3 (7~8월)         Phase 4 (9월~)
           기획 확정          Prototype           실제 사업 적용           가속·다도메인
─────────────────────────────────────────────────────────────────────────────────
Foundry-X  85% → 95%        α1~α4 Coordinator   도메인 인스턴스 운영      마켓플레이스 게이트웨이
(LIVE)     스펙 동결          오케스트레이션      KPI 보고                Multi-Tenant 확장
─────────────────────────────────────────────────────────────────────────────────
Decode-X   30% → 50%         60% (Layer1+2 통합) 80% (실 데이터 ingest)   95% (도메인 자동 추가)
(Scaffold) 9-Type 스키마      Triple Extractor    PII Guard 운영           Connector 마켓
─────────────────────────────────────────────────────────────────────────────────
Discovery-X 60% → 70%        80% (Discovery API) 90% (도메인 후보 발굴)   95% (BD 자동화)
(Pilot)    Idea→Hypothesis    HITL 80-20-80      GTM 1차 패키징           Showcase 외부 공개
─────────────────────────────────────────────────────────────────────────────────
AXIS-DS    v1.1.1 stable     v1.2 (HITL Console) v1.3 (Diagnostic Card)  v2.0 (Marketplace)
(npm)      Token 동결         agentic-ui 확장     도메인 전문가 UI         외부 파트너 공개
─────────────────────────────────────────────────────────────────────────────────
ax-plugin  24 skill 카탈로그  +6 신규 (Layer4·5) +4 신규 (도메인)         +12 (마켓 표준)
(plugin)   GOV-001~015       Workflow Skill     Domain Skill            Plugin Marketplace
─────────────────────────────────────────────────────────────────────────────────
신규 To-Do                    Guard-X α (mock)    Guard-X β (운영)         Guard-X v1.0
                              Launch-X α (mock)   Launch-X β (Type1)      Launch-X v1.0 (Type2)
                              4대 진단 알고리즘    4대 진단 카드 운영       Auto-Eval 자동화
─────────────────────────────────────────────────────────────────────────────────
게이트     G1+G2 (W21)        G3 (W26)           G4 (W29) · G5 (W34)     G6 (분기별)
산출물     정의서 v1.0         α4 빌드 + 시연      도메인 정책팩 v1.0       자산 재사용 KPI
           모듈 스펙 v1.0     측정 보고서         GTM 1차 sign-off        마켓 v0.1
```

### 0.3 핵심 4 결정 사항

| # | 결정 | 근거 |
|---|---|---|
| **D1** | **Foundry-X를 Control Plane의 Lead Agent로 동결** | LIVE 85%, 신규 개발 회피, 8월까지 95%+ 안정화에 집중 |
| **D2** | **Guard-X · Launch-X는 Phase 2부터 mock으로 등장 → Phase 3에서 실 운영** | 둘 다 To-Do, Phase 2는 인터페이스만 있어도 충분 (G3 통과 가능) |
| **D3** | **Decode-X v1.3 Phase 1 진행 중인 것을 본 Phase 2와 통합** (이중 트랙 방지) | 메모리: AIF-REQ-035 IN_PROGRESS, Sprint 3 말 기술 Gate. 일정 합산 |
| **D4** | **AXIS-DS의 agentic-ui를 HITL Console·Diagnostic Card의 단일 UI 표준으로** | 디자인 시스템 v1.1.1 안정, 시연 UI 외주 비용 절감 |

### 0.4 본 계획의 전제 (Phase 1 W18 회의에서 검증)

H1~H6 (02 §7.6)이 모두 Green 신호일 때 본 계획이 **풀구현**으로 진행됩니다. Yellow/Red 신호 시 §3.5 fallback 매트릭스 발동.

---

## 1. 빌드 전략

### 1.1 빌드 5원칙

1. **Git이 진실, Foundry-X는 렌즈** — Foundry-X 자체 철학을 본 빌드에도 적용. 모든 산출물은 Git 단일 진실의 원본.
2. **MSA 원칙 (Foundry-X에서 차용)** — `core/{domain}/` 전용, 도메인 간 import 금지(types.ts contract만), Hono sub-app 패턴 (Decode-X·Discovery-X에도 동일 원칙 적용).
3. **80-20-80 검수 룰 (BeSir 정합성, v0.3 §3.6.0)** — 80% 자동 + 20% HITL → 검수 후 80% 신뢰도 도달 시 핸드오프.
4. **재사용 우선, 신규는 시그니처에만 집중** — 시그니처 기능(4대 진단·Cross-Org)만 80% 신규, 나머지는 50%+ 재사용 (02 §7.5).
5. **반존대(해요체) + AskUserQuestion 표준** — ax-plugin GOV 표준에 따라 모든 인터뷰·확인 질문은 AskUserQuestion 도구 사용.

### 1.2 신규 vs 재사용 비율 (02 §7.5.1 기반)

| Layer | 신규 | 재사용 (5 repo) | OSS | 재사용 출처 |
|---|---|---|---|---|
| Layer 1 Data | 30% | 50% | 20% | Decode-X svc-ingestion + RAG/Ingestion Pipeline |
| Layer 2 Ontology (v0.3) | 40% | 40% | 20% | Decode-X svc-ontology + ax-plugin Knowledge Map |
| Layer 3 LLM | 50% | 30% | 20% | Foundry-X Tier Router + Decode-X svc-policy |
| Layer 4 Workflow | 30% | 60% | 10% | Foundry-X Workflow Coord + ax-plugin GOV |
| Layer 5 Agent | 50% | 40% | 10% | Foundry-X Skill Runtime + ax-plugin |
| **4대 진단 (시그니처)** | **80%** | **10%** | **10%** | Decode-X Phase 2-E 일부 + 신규 |
| **Cross-Org (시그니처)** | **80%** | **10%** | **10%** | Decode-X Phase 2-E 일부 + 신규 |
| UI/UX | 20% | 70% | 10% | AXIS-DS @axis-ds/agentic-ui |
| 인프라 | 10% | 70% | 20% | KTDS-AXBD 운영 인프라 (Cloudflare Workers + D1) |

### 1.3 외주 가능 / 불가 (02 §10.3)

| 외주 가능 | 외주 불가 (제품 IP) |
|---|---|
| Data Layer 커넥터 추가 (표준 스펙 기반) | 4대 진단 알고리즘 |
| HITL Console UI 폴리싱 (AXIS-DS 적용) | Cross-Org Comparison |
| 시연 영상 편집 | POL-* 정책 코드 명명·자산화 룰 |

---

## 2. Repo별 As-Is → To-Be 빌드 격차

### 2.1 Foundry-X (Control Plane / Lead Agent) — `LIVE 85% → 95%`

| 항목 | As-Is (2026-05-02 기준) | Phase 2 To-Be (W26) | Phase 3 To-Be (W34) | Phase 4 |
|---|---|---|---|---|
| Phase/Sprint | Phase 45 / Sprint 319 | Sprint ~330 | Sprint ~342 | Sprint 343+ |
| Coordinator | Lead Agent + Workflow Coord LIVE | α1~α4 통합 Coordinator (5-Layer 결선) | 도메인 인스턴스 라우팅 | Multi-Tenant Coordinator |
| Test 커버리지 | Unit ~3,174 + E2E 273 | + α1~α4 E2E (5-Layer ≥ 80%) | + 실 도메인 E2E | + Multi-Tenant E2E |
| Pipeline | 7단계 (수집~평가) | 신규 도메인 추가 dry-run 1회 | 실 도메인 1개 운영 | 자동 도메인 추가 |
| 핵심 신규 빌드 | (없음, 안정화 위주) | **Layer 4 Diagnostic Runner 통합 hook** | **HITL Console 통합 (AXIS-DS)** | Marketplace Gateway |
| SLA 목표 | (현행) | API p95 ≤ 1.5초 | 가용성 99.0% | 가용성 99.9% |
| Owner | (지정 필요) | Layer 4 코어 + Sinclair | 통합 PM | 통합 PM + 사업 라운드 |

**Phase 2 핵심 빌드 항목 (W22~W26)**:
1. Diagnostic Runner를 Workflow Layer에 sub-app으로 통합 (4대 진단 트리거)
2. α1~α4 E2E 테스트 (가상 도메인 1·2)
3. Cost Governor 강화 (Tier 1 hard cap, 비용 알람)

**Phase 3 핵심 빌드 항목 (W27~W34)**:
1. 실 도메인 인스턴스 라우팅 (도메인별 격리)
2. HITL Console 통합 (AXIS-DS @axis-ds/agentic-ui)
3. 임원 보고 자동 KPI 대시보드

### 2.2 Decode-X (Input Plane) — `Scaffold 30% → 80%`

> **현재 상태 (메모리 기반)**: v1.3 Phase 1 진행 중 (2026-04-21 착수), Sprint 3 말 기술 Gate, AIF-REQ-035 IN_PROGRESS. Phase 2-E "퇴직연금 정밀분석 시스템"이 진행 중.

| 항목 | As-Is | Phase 2 To-Be (W26) | Phase 3 To-Be (W34) | Phase 4 |
|---|---|---|---|---|
| Pipeline 5-Stage | Doc Ingestion·Structure·Policy·Ontology·Skill | 5단계 모두 가상 도메인에서 동작 | 실 도메인 통과 | 자동 도메인 추가 |
| 7 Workers | scaffold 30% | 5+ workers 가동 (svc-ingestion·extraction·policy·ontology·skill) | 7 workers 100% 운영 | + svc-marketplace |
| 5 D1 DBs | scaffold | gradient seed (가상 도메인) | 실 데이터 ingestion | Multi-Tenant DB |
| Knowledge Map (v0.3) | ~~Neo4j Aura 12 노드~~ → 전환 필요 | **파일 + Git + PostgreSQL** (9 타입) | 5,000 노드 실 도메인 | 다도메인 통합 |
| Skill Package | `.skill.json` Schema | Triple Extractor + POL-* 코드 부여 | 실 도메인 정책팩 v1.0 | 정책팩 마켓 |
| HITL | Cloudflare DO + Queue, 5 RBAC | HITL Console 동작 (AXIS-DS) | Reviewer/Approver 운영 SOP | 자동 승인 룰 |
| Phase 2-E (퇴직연금) | 진행 중 (3-Layer 분석 + 4대 진단) | **본 빌드의 4대 진단 알고리즘에 흡수** | (Phase 3 도메인 후보) | (운영 사례) |

**Phase 2 핵심 빌드 항목 (W22~W26)**:
1. **v0.3 §3.4.1 Graph DB 미사용 결정 반영** → Neo4j Aura 의존 제거, 파일+Git+PostgreSQL 전환 (Migration 마일스톤)
2. svc-policy + svc-ontology를 가상 도메인 1·2에서 통과
3. Triple Extractor + Multi-Evidence Triangulation (E1·E2·E3, v0.2 §3.5.1)
4. Phase 2-E의 3-Layer 분석 알고리즘을 4대 진단 신규 알고리즘으로 흡수

**Phase 3 핵심 빌드 항목 (W27~W34)**:
1. 실 도메인 데이터 ingestion (NDA 후, W30~)
2. PII Guard 강화 (보안팀 합동 검토, R-11)
3. 실 도메인 정책팩 v1.0 발행

### 2.3 Discovery-X (Input Plane / Discovery) — `Pilot 60% → 90%`

| 항목 | As-Is | Phase 2 To-Be (W26) | Phase 3 To-Be (W34) | Phase 4 |
|---|---|---|---|---|
| 11단계 상태 | Discovery → IDEA_CARD → ... → HANDOFF | 가상 도메인 1·2의 IDEA_CARD 발굴 | 실 도메인 후보 발굴 (Phase 3 입력) | 외부 파트너 공동 Discovery |
| 15 BC | (운영 중) | + diagnosis BC (4대 진단 카드) | + handoff BC (도메인 인스턴스화) | + marketplace BC |
| Time-box | 4주/5명 | (유지) | (유지) | + 외부 파트너 슬롯 |
| 프로덕션 | dx.minu.best | (유지) | + 도메인 후보 카드 export | + Showcase 외부 공개 |

**Phase 2 핵심 빌드 항목 (W22~W26)**:
1. Discovery API → Foundry-X Coordinator 호출 인터페이스 (Layer 5 등록)
2. HITL 80-20-80 룰 적용 (BeSir 정합성)
3. **diagnosis BC 신설 — 4대 진단 카드 표시·HITL 검토**

**Phase 3 핵심 빌드 항목 (W27~W34)**:
1. **handoff BC 강화** — Discovery → 실 도메인 인스턴스 전환 (G4 산출물)
2. GTM 1차 자료 골격 (W28)
3. 외부 회람용 카드 export 기능 (5개 repo 명칭 자동 마스킹)

### 2.4 AXIS Design System (UI Foundation) — `v1.1.1 → v2.0`

| 항목 | As-Is | Phase 2 To-Be (W26) | Phase 3 To-Be (W34) | Phase 4 |
|---|---|---|---|---|
| 패키지 | tokens·ui-react·agentic-ui·theme·cli + axis-mcp | + Diagnostic Card 컴포넌트 | + Domain Expert Console | + Marketplace 컴포넌트 |
| Version | v1.1.1 | v1.2 | v1.3 | v2.0 |
| Stack | React 19 / Next.js 15 / Tailwind 4 | (유지) | (유지) | + Multi-Tenant Theme |
| Distribution | npm @axis-ds | (유지) | + 도메인 전문가 사용 가이드 | + 외부 파트너 npm 공개 |

**Phase 2 핵심 빌드 항목 (W22~W26)**:
1. **agentic-ui v1.2** — HITL Console 컴포넌트 (Reviewer Card, Approver Modal, Audit Trail Viewer)
2. Diagnostic Card 컴포넌트 (4대 진단 결과 표시)
3. Foundry-X Web에 v1.2 적용 (W25 드라이런 전)

**Phase 3 핵심 빌드 항목 (W27~W34)**:
1. **agentic-ui v1.3** — Domain Expert Console (도메인별 전문가 리뷰 화면)
2. 임원 보고용 Dashboard 위젯 (KPI Matrix, Cross-Org 비교)

### 2.5 ax-plugin (Skill Layer) — `24 skill → 46 skill`

| 항목 | As-Is | Phase 2 To-Be (W26) | Phase 3 To-Be (W34) | Phase 4 |
|---|---|---|---|---|
| Skill 수 | 24 (세션·코드·Git·거버넌스·요구사항·인프라·Task) | +6 (Workflow·HITL·Diagnostic) | +4 (Domain Skill) | +12 (Marketplace 표준) |
| 표준 | GOV-001~015 + 2 규칙 | + GOV-016~020 (Workflow·Diagnostic·HITL) | + GOV-021~025 (도메인) | + GOV-100+ (외부 마켓) |
| 어투 | 반존대(해요체) | (유지) | (유지) | + 영어 (다국어 Phase 4+) |
| Tooling | session-start·sprint·code-verify 등 | + diagnostic-run · hitl-review · cross-org | + domain-init · domain-policy-pack · domain-handoff | + plugin-publish 등 |

**Phase 2 핵심 빌드 항목 (W22~W26)**:
1. `/ax:diagnostic-run` 스킬 — 4대 진단 트리거 표준
2. `/ax:hitl-review` 스킬 — 80-20-80 검수 표준
3. `/ax:cross-org` 스킬 — 4그룹 분류 트리거
4. GOV-016 (Workflow 명명) · GOV-017 (Diagnostic 임계) · GOV-018 (HITL 책임) · GOV-019 (Cross-Org 보호) · GOV-020 (POL-* 코드)

**Phase 3 핵심 빌드 항목 (W27~W34)**:
1. `/ax:domain-init` — 신규 도메인 초기화 (자동 dry-run)
2. `/ax:domain-policy-pack` — 정책팩 v1.0 발행
3. `/ax:domain-handoff` — Discovery-X handoff BC와 연동

### 2.6 신규 To-Do — Guard-X · Launch-X

| 모듈 | Phase 2 (mock) | Phase 3 (β 운영) | Phase 4 (v1.0) |
|---|---|---|---|
| **Guard-X** (Delivery / 보안·규제·품질) | Policy Check API mock + 인터페이스 | Guardrail 동작 + Approval 운영 SOP | Multi-Tenant Guard + 외부 인증 통합 |
| **Launch-X** (Delivery / 배포·패키징·운영전환) | Release API mock + 인터페이스 | Type 1 Delivery (소스 기반 반제품 SI 투입) | Type 2 Delivery (도메인 Agent 구독) |

**Phase 2 빌드 항목 (mock 수준)**:
1. Guard-X: API 인터페이스 정의(types.ts contract) + Policy Check stub. Foundry-X가 호출하면 200 OK + audit log entry.
2. Launch-X: Release API 인터페이스 정의 + Skill Package 발행 stub.

> **이유**: G3 통과는 "5-Layer E2E가 가상 도메인에서 동작"이 본질. Guard-X·Launch-X 풀구현이 아니라 **인터페이스가 살아 있어야** Coordinator가 끊기지 않음.

**Phase 3 빌드 항목 (β 운영)**:
1. Guard-X β: 실 정책팩 검증 + Approval 워크플로우 + 보안팀 합동 검토 (R-11)
2. Launch-X β: Type 1 Delivery — 소스 기반 반제품 SI 투입 형태로 외부 시연

---

## 3. Phase 1~4 스프린트 분해

### 3.1 Phase 1 — 5월 (W18~W21) · 기획 확정

| 주차 | 코어 활동 | 모듈 빌드 | 산출물 / 게이트 |
|---|---|---|---|
| **W18** (5/4~10) | 정의서 v0.3 합의 회의 (서민원 + AXBD 임원 1차) · 5 모듈 코어 지정 · BeSir 차기 미팅 사전 회람 | 본 빌드의 인력·재사용 비율 합의 | 의사록 + 코어 5명 지정 + H1~H6 가설 점검 결과 |
| **W19** (5/11~17) | 5-Layer 모듈 스펙 v0.1 + 가상 도메인 1·2 데이터 사양 · **BeSir 차기 미팅** | Decode-X v1.3 Phase 1과 통합 일정 합의 | spec drafts + 도메인 사양 + BeSir 미팅 의사록 |
| **W20** (5/18~24) | 모듈 스펙 v0.5 + 인터페이스 카탈로그 v0.1 + LLM 공급자 선정 · **PostgreSQL+Git 인프라 결정** | Decode-X Neo4j → 파일+Git+PostgreSQL Migration plan 확정 | 스펙·카탈로그 1차 + 공급자·인프라 결정 |
| **W21** (5/25~31) | **G1+G2 통합 게이트** — 정의서 v1.0 + 모듈 스펙 v1.0 + 임원 결재 | Foundry-X 95%+ 안정화 확인 (Pre-Phase 2 sanity check) | **Phase 1 종료 + Phase 2 즉시 착수 결재** |

**Phase 1 DoD (02 §7.1)**:
- DoD₁-1: 정의서 v1.0 합의
- DoD₁-2: 5-Layer 모듈 스펙 v1.0
- DoD₁-3: 인터페이스 카탈로그 v1.0 (신규 모듈 추가 dry-run 1회 통과)
- DoD₁-4: 가상 도메인 1·2 데이터·시나리오 사양 확정
- DoD₁-5: Phase 2 인력 배정 + 인프라 셋업

**본 빌드 추가 DoD**:
- DoD₁-B1: 5개 repo 모두 Phase 2 진입 sanity check 통과 (Foundry-X 95%+ 확인)
- DoD₁-B2: Decode-X Migration plan (Neo4j → 파일+Git+PostgreSQL) 합의
- DoD₁-B3: AXIS-DS v1.2 컴포넌트 백로그 합의 (HITL Console·Diagnostic Card)

### 3.2 Phase 2 — 6월 (W22~W26) · Prototype α1~α4

| 주차 | α 빌드 | Repo별 활동 | 산출물 |
|---|---|---|---|
| **W22** (6/1~7) | **α1: Layer 1+2** | Decode-X svc-ingestion·svc-extraction·svc-ontology 통합 / Foundry-X Coordinator 연결 / AXIS-DS v1.2-rc1 (HITL Card) | α1 빌드 + 가상 도메인 1 입력 → 9-Type 객체 생성 |
| **W23** (6/8~14) | **α2: Layer 3 추가** | Decode-X svc-policy + Multi-Evidence Triangulation 통합 / ax-plugin `/ax:diagnostic-run` 1차 / Cost Governor 활성화 | α2 빌드 + Triple 추출 + POL-* 코드 부여 |
| **W24** (6/15~21) | **α3: Layer 4 추가** | Foundry-X Workflow Coord + AXIS-DS HITL Console 통합 / ax-plugin `/ax:hitl-review` / audit log bus 가동 | α3 빌드 + HITL Console 동작 + audit log |
| **W25** (6/22~28) | **α4: Layer 5 + 4대 진단 + Cross-Org** | Decode-X svc-skill + Foundry-X Skill Runtime / 4대 진단 알고리즘(Decode-X Phase 2-E 흡수) / Cross-Org 4그룹 분류 / **Guard-X·Launch-X mock 인터페이스** / **드라이런 1차** | α4 빌드 + 시연 시나리오 + 진단 카드 + 4그룹 분류 결과 |
| **W26** (6/29~7/5) | **G3 게이트** | 5-Layer E2E 자동 테스트 ≥ 80% 성공 / 30분 시연 / 측정 보고서 v1 / Phase 3 도메인 후보 사전 컨택 | **Phase 2 종료 + 시연 영상 + 측정 보고서 + Phase 3 도메인 short list** |

**Phase 2 DoD**:
- DoD₂-1: 5-Layer 통합 E2E ≥ 80%
- DoD₂-2: 4대 진단 + Cross-Org 가상 데이터 정상 출력
- DoD₂-3: 30분 시연 가능
- DoD₂-4: Phase 2 측정 보고서
- DoD₂-5: Phase 3 도메인 후보 1개 + 본부 사전 컨택

**Fallback 정책 (02 §7.6.1, 5월 안에 신호 감지 시 발동)**:
- **Green**: 풀구현 (5-Layer + 4대 진단 4종 + Cross-Org 가상 조직 3개)
- **Yellow**: 5-Layer + 4대 진단 (Missing+Inconsistency만) + Cross-Org mock
- **Red**: 5-Layer E2E만 + 시그니처는 7월에 추가

### 3.3 Phase 3 진입 정비 — 7월 (W27~W30)

| 주차 | 코어 활동 | 모듈 빌드 | 산출물 / 게이트 |
|---|---|---|---|
| **W27** (7/6~12) | 도메인 후보 협의 (KT 사업본부·고객사) · Phase 2 회고 | Discovery-X handoff BC 보강 / Foundry-X 도메인 라우팅 설계 | 도메인 short list (1~3개) + 회고 |
| **W28** (7/13~19) | 도메인 NDA · 접근 권한 · GTM 1차 자료 골격 · Phase 3 인력 배정 | ax-plugin `/ax:domain-init` β 1차 / AXIS-DS v1.3-rc1 (Domain Expert Console) | NDA 체결 + GTM 골격 + 인력 명단 |
| **W29** (7/20~26) | **G4 게이트** — 도메인 1개 확정 + 본부 합의 + Prototype 보강 | Guard-X β 인터페이스 강화 / Launch-X β Type 1 Delivery 설계 | **Phase 3 진입 결재** + 도메인 v1.0 사양 |
| **W30** (7/27~8/2) | 도메인 인스턴스화 1주차 — Layer 1 데이터 투입 시작 | Decode-X svc-ingestion 도메인 데이터 / PII Guard 강화 | 실 데이터 ingestion 1차 |

### 3.4 Phase 3 — 8월 (W31~W34) · 실제 사업 적용

| 주차 | 코어 활동 | 모듈 빌드 | 산출물 / 게이트 |
|---|---|---|---|
| **W31** (8/3~9) | 도메인 온톨로지 + Tier별 LLM 정책 추출 | Decode-X svc-ontology·svc-policy 도메인 적용 / Foundry-X Coordinator 라우팅 | 도메인 그래프 + Triple 후보 |
| **W32** (8/10~16) | 4대 진단 결과 + 진단 카드 + **첫 임원 중간 보고** | AXIS-DS v1.3 Diagnostic Card / Discovery-X diagnosis BC 운영 | 진단 결과 + 보고 의사록 |
| **W33** (8/17~23) | HITL 검토 + Approver 승인 + Skill Package 발행 | ax-plugin `/ax:domain-policy-pack` / Decode-X svc-skill / Guard-X β 운영 / Launch-X β Type 1 Delivery | 도메인 정책팩 v1.0 |
| **W34** (8/24~31) | **G5 게이트** — 운영 시작 + 8월 임원 종합 보고 + GTM 1차 sign-off | Foundry-X KPI 대시보드 / 자기진화 피드백 루프 1주기 완성 | **Phase 3 1차 마감 + Phase 3 후속 결정** |

**Phase 3 DoD**:
- DoD₃-1: 첫 실제 도메인 데이터로 5-Layer 통과 + 정책팩 v1.0
- DoD₃-2: 4대 진단 결과 + HITL 검토 + Skill Package 발행
- DoD₃-3: 8월 임원 보고 "사업 적용 시작" 인정
- DoD₃-4: GTM 1차 패키지 sign-off
- DoD₃-5: Phase 3 운영 측정 1차

### 3.5 Phase 4 — 9월~ · 가속·다도메인·마켓플레이스

| 분기 | 트랙 1 — 자산 재사용 가속 | 트랙 2 — 다도메인 확장 | 트랙 3 — 사업화 |
|---|---|---|---|
| **Q3 후반 (9월~)** | 자산 재사용 KPI 측정 (활용도·중복 회피율) | 두 번째 실 도메인 착수 | GTM 2차 (본부·고객사 제안 패키지 v2.0) |
| **Q4 (10~12월)** | Foundry-X Multi-Tenant 확장 / Decode-X svc-marketplace α | 세 번째·네 번째 도메인 / Cross-Org 다조직 비교 | Type 2 Delivery (구독형) 첫 계약 |
| **2027 Q1+** | Marketplace v0.1 (Skill Package + Policy Pack 외부 공개 후보) | 5+ 도메인 / 자동 도메인 추가 (`/ax:domain-init`) | 산업별 표준 인증 준비 (금감원·국정원 등) |

**Phase 4 미수행 명시 (02 §7.5.2)**: 외부 마켓플레이스 UI/Backend · 결제·라이선스 풀 시스템 · SLA 보장형 SaaS · 다국어 · 모바일 앱 · 실시간 스트림 GA · 외부 ID 연동 풀 · 산업별 표준 인증 — 모두 Phase 4 이후.

---

## 4. 게이트 체크리스트

### 4.1 G1+G2 (5월 W21 말) — Phase 1 종료

- [ ] 정의서 v1.0 임원 합의 (R-01 회피)
- [ ] 5-Layer 모듈 스펙 v1.0 (개발 리드 검토 통과)
- [ ] 인터페이스 카탈로그 v1.0 (신규 모듈 dry-run 1회)
- [ ] 가상 도메인 1·2 데이터 사양 sign-off
- [ ] 5 모듈 코어 인력 명단 (R-06 회피)
- [ ] H1~H6 가설 검증 결과 (Green/Yellow/Red 신호 결정)
- [ ] **본 빌드: Foundry-X 95%+ sanity check + Decode-X Migration plan + AXIS-DS v1.2 백로그**

### 4.2 G3 (6월 W26 말) — Phase 2 종료

- [ ] 5-Layer E2E 자동 테스트 ≥ 80% 성공
- [ ] 4대 진단 + Cross-Org 가상 데이터 정상 출력 (Yellow/Red 신호 시 축소판)
- [ ] 30분 시연 통과 (시연 출석자 sign-off)
- [ ] 측정 보고서 v1
- [ ] Phase 3 도메인 후보 1개 + 본부 사전 컨택 (R-13 완화)
- [ ] **본 빌드: Guard-X·Launch-X mock 인터페이스 가동 / AXIS-DS v1.2 적용 / ax-plugin +6 신규 스킬**

### 4.3 G4 (7월 W29 말) — Phase 3 진입

- [ ] 도메인 1개 확정 + KT 본부 공식 합의 (R-13 회피)
- [ ] 도메인 데이터 NDA + 접근 권한 (R-14 완화)
- [ ] Phase 3 인력 배정
- [ ] Prototype 보강 완료 (필요 시)
- [ ] **본 빌드: Guard-X β 인터페이스 강화 / Launch-X β Type 1 설계**

### 4.4 G5 (8월 W34 말) — Phase 3 1차 마감

- [ ] 첫 실제 도메인 정책팩 v1.0 발행
- [ ] HITL 운영 시작 + Skill Package 발행
- [ ] 8월 임원 종합 보고 sign-off (R-08 회피)
- [ ] GTM 1차 패키지 sign-off
- [ ] Phase 3 운영 측정 1차
- [ ] **본 빌드: 자기진화 피드백 루프 1주기 완성 (Asset Rail → Input → Control → Delivery → Eval → Asset Rail)**

### 4.5 G6 (분기별, Phase 4) — 자산 재사용·확장 점검

- [ ] 자산 재사용 KPI (활용도·중복 회피율·신규 도메인 추가 시간)
- [ ] 다도메인 동시 운영 안정성
- [ ] Marketplace 진입 결정 (사업 라운드)

---

## 5. RACI

> R: Responsible (실행) · A: Accountable (최종 책임) · C: Consulted (자문) · I: Informed (보고)

| 활동 | 통합 PM (Sinclair) | 시스템 책임 (서민원) | Layer 1·2 코어 | Layer 3 코어 | Layer 4 코어 | Layer 5 코어 | UI/UX | 임원 |
|---|---|---|---|---|---|---|---|---|
| 정의서 v1.0 합의 | A/R | C | I | I | I | I | I | A |
| 모듈 스펙 v1.0 | A | R | R | R | R | R | C | I |
| Decode-X Migration | C | A | R | I | I | I | I | I |
| α1~α4 빌드 | A | R | R | R | R | R | C | I |
| 4대 진단 알고리즘 | A | R | C | R | R | C | I | I |
| Cross-Org 분류 | A | R | C | R | C | C | I | I |
| HITL Console (AXIS-DS) | A | C | I | I | R | I | R | I |
| Guard-X mock → β | A | C | I | I | R | C | I | I |
| Launch-X mock → β | A | C | I | I | C | R | I | I |
| 시연 (G3·G5) | A/R | R | C | C | C | C | R | I |
| 도메인 1개 확정 (G4) | R | C | I | I | I | I | I | A |
| GTM 1차 sign-off | R | C | I | I | I | I | I | A |
| 임원 보고 | R | C | I | I | I | I | I | A |

---

## 6. 리스크·완화책 (02 §11.1 + 본 빌드 추가)

### 6.1 02 정의서 R-01~R-16 (그대로 승계)

상세는 02 v0.3 §11.1. 본 빌드는 Critical/High 리스크 5건에 빌드 차원의 완화책을 명시:

| ID | 리스크 | 본 빌드 완화책 |
|---|---|---|
| R-02 (High/Med) | 5-Layer E2E G3 미달성 | Layer 단위 우선 안정화 후 통합 / Layer 5는 mock 우선 (Guard-X·Launch-X) / **W22~W23 α1·α2 단계에서 통합 깊이 점검** |
| R-03 (High/High) | 4대 진단 정확도 미달 | Decode-X Phase 2-E의 3-Layer 분석을 그대로 흡수 / 가상 known issue 재정의 / W23부터 진단 룰 보강 |
| R-06 (High/Med) | 모듈 코어 5명 지정 지연 | **W18 임원 회의에서 직권 지정 요청** + 본 빌드 §5 RACI에 5명 슬롯 명시 |
| R-13 (Critical/High) | Phase 3 도메인·데이터 제공 지연 | W22까지 시나리오 협의 시작 + 2순위 도메인 병행 발굴 (Discovery-X handoff BC 활용) |
| R-15 (High/High) | LLM Self-Confidence 의존 진단 보정 불가 | **W23까지 Multi-Evidence Triangulation 통합 (E1·E2·E3, v0.2 §3.5.1)** + Phase 2 종료 시 가중치 보정 |
| R-16 (High/Med) | BeSir 정합성 미달성으로 5월 W19 미팅 실패 | 본 08 빌드 계획 + 06 분석 문서 + v0.3 본문을 W18까지 BeSir·서민원에 사전 회람 / W19 미팅 직후 결과를 본 빌드 §3.5 (Phase 4) 트랙에 즉시 반영 |

### 6.2 본 빌드 추가 리스크 (B-XX)

| ID | 리스크 | 영역 | 심각도/가능성 | 완화책 |
|---|---|---|---|---|
| **B-01** | Decode-X Neo4j → 파일+Git+PostgreSQL Migration이 W22 안 끝나면 svc-ontology 차질 | 기술 | High/Med | W20에 Migration plan 확정, W21~W22 dual-write 전환 옵션 |
| **B-02** | Foundry-X Sprint 319 + 본 Phase 2 통합 충돌 (이중 트랙) | 거버넌스 | Med/High | W18 회의에서 Sprint 번호 동기화 합의 / D3 결정에 따라 단일 트랙 |
| **B-03** | AXIS-DS v1.2 (HITL Console)이 W24 α3에 못 맞음 | UI/시연 | Med/Med | v1.2-rc1을 W22에 사전 시작 / agentic-ui 기존 컴포넌트 재활용 |
| **B-04** | ax-plugin 신규 6개 스킬의 GOV 표준 합의 지연 | 표준 | Med/Low | W19부터 GOV-016~020 초안 작성, W21 합의 |
| **B-05** | Guard-X mock의 인터페이스 변경이 Phase 3 β 운영 시 깨짐 | 기술 | Med/Med | W22 인터페이스 contract를 types.ts에 동결, Phase 3 β까지 contract 변경 금지 |
| **B-06** | Cloudflare Workers 비용 한도 도달 (Multi-Tenant 진입 시) | 비용 | Low/Med | Cost Governor를 Phase 2부터 강화, Phase 4 진입 시 Multi-Cloud 옵션 검토 |

### 6.3 리스크 모니터링 주기

- 주 1회 코어 동기화에서 Critical/High 리스크 상태 체크
- 게이트마다 (G1~G5) 리스크 레지스터 갱신
- B-01·B-02는 W22 직전(W21 말) 추가 점검

---

## 7. 인력·일정 가설 검증

### 7.1 18주 인력 (02 §10.2 그대로)

| 역할군 | FTE | 주차 | 본 빌드 매핑 |
|---|---|---|---|
| 통합 PM (Sinclair) | 1.0 | 18주 | RACI 모든 활동 A/R |
| 모듈 코어 5명 | 5.0 | 18주 | Layer 1·2·3·4·5 코어 |
| UI/UX | 0.5 | 18주 | AXIS-DS v1.2·v1.3 |
| 시연/문서 | 0.5 | 18주 | 서민원 + Sinclair |
| 인프라 | 0.3 | 18주 | ktcloud 협업 |
| **합계** | **7.3 FTE × 18주 = 131.4 FTE-주** | | |

### 7.2 H1~H6 가설 검증 (W18 회의 점검)

| 가설 | 본 빌드에서의 의미 | 깨질 시 본 빌드 영향 |
|---|---|---|
| H1 — 5월 4주 안에 정의서 합의 | G1+G2 통합 게이트 통과 | Phase 2 자동 1주 지연 (W22 → W23 시작) |
| H2 — 6월 4주 안에 5-Layer Prototype | α1~α4 풀구현 | **§3.2 fallback 매트릭스 발동** (Yellow/Red) |
| H3 — 7월 1개 실제 도메인 확정 | G4 통과 | 8월 사업 적용 메시지 실패 (G5 위험) |
| H4 — 도메인 데이터 1개월 내 접근 | W30 데이터 투입 | W30~W31 합성·마스킹 데이터로 대체 |
| H5 — 5 모듈 코어 시간 50%+ 확보 | RACI 실행 가능 | Prototype 품질 저하, Yellow 신호 |
| H6 — Phase 3 진입 임원 결재 | G4 결재 가능 | 8월 적용 위험 |

---

## 8. 인터페이스 카탈로그 (요약)

> 본 빌드의 핵심 인터페이스만 정리. 상세는 별도 카탈로그 v1.0 산출물 (W19~W20).

### 8.1 Plane 간 핵심 호출

| From → To | 인터페이스 | 형식 |
|---|---|---|
| Input Plane → Control Plane | `POST /v1/spec/extract` | Decode-X svc-extraction → Foundry-X Coord |
| Control Plane → Layer 4 Diagnostic Runner | `POST /v1/diagnostic/run` | 4대 진단 트리거 (Foundry-X 내부) |
| Layer 4 → Eval Rail | `EVENT diagnostic.completed` | audit log bus + Discovery-X diagnosis BC |
| Layer 4 → Delivery Plane (Guard-X) | `POST /v1/guard/check` | Policy Check (mock → β) |
| Delivery Plane → Asset Rail | `EVENT skill.published` | Skill Registry update + Decision Log |
| Asset Rail → Input Plane (재사용 루프) | `GET /v1/asset/recall` | 자기진화 폐쇄형 루프 |
| AI Foundry ↔ BeSir | **MCP Tools** (`af.ontology.search`, `af.policy.lookup` 등) | 02 §3.7.5 MCP 양방향 인터페이스 / Phase 1 W19 BeSir 미팅에서 인터페이스 표준화 |

### 8.2 5-Asset (v0.3) 저장소

| Asset | 저장소 | 본 빌드 위치 |
|---|---|---|
| Policy Pack | Git (메타) + PostgreSQL (인스턴스) | Decode-X svc-policy + svc-skill |
| Ontology (Knowledge Map) | 파일 + Git + PostgreSQL | Decode-X svc-ontology |
| Skill Package (`.skill.json`) | Git + Foundry-X Skill Registry | ax-plugin + Foundry-X |
| Decision Log | Append-only (Audit Log Bus) | Foundry-X Workflow Coord |
| System Knowledge | 파일 (사내 공통) | Foundry-X + Discovery-X 공유 |

---

## 9. 검증 (DoD 종합)

### 9.1 Phase별 DoD 매트릭스

| Phase | DoD 핵심 5개 (02 §7.1) | 본 빌드 추가 DoD |
|---|---|---|
| Phase 1 (W21) | 정의서 v1.0 / 모듈 스펙 v1.0 / 인터페이스 카탈로그 v1.0 / 가상 도메인 사양 / 인력+인프라 | Foundry-X 95% sanity / Decode-X Migration plan / AXIS-DS v1.2 백로그 |
| Phase 2 (W26) | 5-Layer E2E ≥ 80% / 4대 진단+Cross-Org 동작 / 30분 시연 / 측정 보고서 / 도메인 후보 사전 컨택 | Guard-X·Launch-X mock 가동 / AXIS-DS v1.2 적용 / ax-plugin +6 스킬 |
| Phase 3 (W34) | 도메인 정책팩 v1.0 / HITL 운영 / 임원 보고 / GTM 1차 / 운영 측정 1차 | 자기진화 피드백 루프 1주기 완성 / 5 repo 모두 80%+ Status |

### 9.2 자동 검증 항목

| 검증 | 도구 | 트리거 |
|---|---|---|
| 5-Layer E2E 자동 테스트 | Foundry-X E2E (현재 273) + α1~α4 신규 | W22~W26 매주 |
| 4대 진단 정밀도/재현율 | 가상 ground truth 비교 | W23부터 매주 |
| Cost Governor 알람 | LLM 비용 80% 도달 | 일일 자동 |
| API 응답 p95 ≤ 1.5초 | 호출 로그 분석 | 주간 자동 |
| Decision Log 일관성 ≤ 0.1% | Cross-check job | 일일 자동 |
| 신규 모듈 추가 dry-run ≤ 1일 | `/ax:domain-init` 실행 시간 | 게이트별 1회 |

---

## 10. 외부 노출 가이드 (07 §13 그대로 승계)

### 10.1 본 문서 회람 범위

- **회람 OK**: KTDS-AXBD 코어팀 + AXBD 임원 + 모듈 코어 5명
- **회람 X**: KT 본부·BeSir·외부 고객사 (5개 repo 명칭 노출됨)

### 10.2 외부 회람 시 변환

본 문서를 외부에 보일 때는 다음 표로 명칭 변환:

| 본 문서 명칭 | 외부 변환 |
|---|---|
| Foundry-X Orchestrator | AI Foundry Workflow Coordinator (Layer 4) |
| Decode-X | Document Decoder Module (Layer 1) |
| Discovery-X | Discovery Module (Layer 5 변형) |
| ax-plugin | MCP Tool Plugin (Layer 5) |
| AXIS Design System | AI Foundry Design System |
| Guard-X | Compliance & Quality Module (Delivery) |
| Launch-X | Release & Packaging Module (Delivery) |

외부 회람용 빌드 계획은 본 문서 + 02 v0.3을 함께 변환한 별도 산출물(`08_build_plan_external_v1.md`)로 작성 (W21 G1+G2 통과 후).

---

## 11. 다음 1주 액션 (Sinclair · ~W18 회의 전)

- [ ] 본 08 문서를 서민원·코어 후보 5명·AXBD 임원에 공유
- [ ] **W18 합의 안건에 본 빌드의 4 결정 사항 (D1·D2·D3·D4) 추가**
- [ ] Foundry-X 현재 Sprint 319 진척도 확인 (95%+ sanity)
- [ ] Decode-X v1.3 Phase 1 진행 상태 + 본 Phase 2 통합 일정 합의 초안
- [ ] AXIS-DS v1.2 컴포넌트 백로그 초안 (UI/UX 코어와)
- [ ] ax-plugin 신규 6개 스킬 GOV-016~020 초안 (W19부터 작성)
- [ ] **5월 W19 BeSir 차기 미팅에서 본 빌드 §3.5 Phase 4 (자산 재사용 가속) 트랙 사전 공유 옵션 검토**
- [ ] Phase 1 H1~H6 가설 점검 결과를 W18 회의 사전 자료로 (Green/Yellow/Red 사전 신호)

---

## 12. Changelog

| 버전 | 일자 | 변경 |
|---|---|---|
| v1 | 2026-05-02 | 초판 — 02 v0.3 + 07 v1 + 06 BeSir 정합성 통합 / 5 repo As-Is → To-Be 매핑 / Phase 1~4 스프린트 분해 / RACI / 리스크 16+6 / DoD 매트릭스 |

---

## 끝맺음

본 구축계획서는 **02 정의서(외부용 5-Layer)와 07 사내 아키텍처(3-Plane + Side Rail)를 빌드 가능한 단위로 분해**한 사내 운영 계획입니다.

핵심 메시지: **신