---
title: AI Foundry OS 목표 아키텍처 (최종안) — 사내 운영 아키텍처 시각화
subtitle: 3-Plane + Side Rail + Self-Improving Architecture
version: v1 (2026-04-30)
owner: Sinclair Seo
audience: KTDS-AXBD 내부 (외부 노출용 아님)
external_facing_doc: 02_ai_foundry_phase1_v0.3.md (5-Layer 추상화 — 외부용)
classification: 기업비밀II급
---

# AI Foundry OS 목표 아키텍처 (최종안)

> **이 문서는 무엇인가**
>
> 본 문서는 KTDS-AXBD 내부에서 운영 중인 자산(Decode-X · Discovery-X · Foundry-X · ax-plugin · AXIS-DS)을 포함한 **사내 운영 아키텍처의 최종 목표 그림**을 시각화합니다. 외부 회람용이 아닌 **내부 코어팀·임원·개발자용** 자료입니다. 외부용 추상 아키텍처는 정의서 v0.3(02_ai_foundry_phase1_v0.3.md)의 5-Layer 그림을 사용합니다.

---

## 0. 한 페이지 요약

### 0.1 아키텍처 본질 — 3-Plane + Side Rail

```
                ┌─────────────────────────────────────────────┐
                │         L1 Channel / Experience Layer       │ ◀ 사용자 접점
                └─────────────────────────────────────────────┘
   ┌──────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐
   │  Asset   │ │   Input     │ │   Control   │ │ Delivery │ │   Eval   │
   │  Rail    │ │   Plane     │→│    Plane    │→│  Plane   │ │   Rail   │
   │ (자산)   │ │  (입력)      │ │ (실행 두뇌)  │ │ (반제품)  │ │ (측정)   │
   └────┬─────┘ └──────┬──────┘ └──────┬──────┘ └─────┬────┘ └────┬─────┘
        │              │               │              │           │
        └──────────────┴───── 자기진화 피드백 루프 (폐쇄형) ────────┘
                ┌─────────────────────────────────────────────┐
                │         L5 Foundation Layer                 │ ◀ 인프라
                └─────────────────────────────────────────────┘
```

### 0.2 핵심 메시지

- **3-Plane (Input → Control → Delivery)**: 경험·시장·문서를 입력받아 → AI 두뇌가 처리 → 반제품으로 출력하는 메인 흐름
- **2 Side Rail (Asset / Eval)**: 자산이 축적·재사용되고(왼쪽), 결과가 측정·검증·자기진화 신호로 환류(오른쪽)되는 보조 축
- **Self-Improving Architecture**: 5개 보완 포인트로 폐쇄형 피드백 루프 완성

### 0.3 본 문서 vs v0.3 정의서 — 두 트랙

| 차원 | 본 문서 (07) | v0.3 정의서 (02) |
|---|---|---|
| 청중 | KTDS-AXBD 내부 (코어팀·임원) | KT 본부·BeSir·외부 고객사 |
| 명칭 노출 | Foundry-X · Decode-X · Discovery-X 등 명시 | 추상 모듈명 (Layer 1~5) |
| 자산 단위 | 사내 운영 자산 그대로 | 4-Asset + System Knowledge |
| 사용 시점 | 내부 코어 동기화 + 임원 보고 | 외부 회람·BeSir 미팅·사업기획 |

> **운영 원칙**: 본 문서의 명칭들(Foundry-X 등)은 외부 자료에 그대로 옮기지 않습니다. 외부 회람 시에는 v0.3의 5-Layer로 추상화.

---

## 1. 전체 구조 다이어그램 (텍스트 옮김)

```
████████████████████████████████████████████████████████████████████████████████████████████
█                                                                                          █
█                          AI Foundry OS 목표 아키텍처 (최종안)                              █
█                  현재 프로젝트 분석 반영 · 3-Plane + Side Rail · Self-Improving           █
█                                                                                          █
████████████████████████████████████████████████████████████████████████████████████████████

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  L1 Channel / Experience Layer                              Foundry-X Web 사용자 접점      │
│  ┌────────────────────┐ ┌─────────────────────┐ ┌───────────┐ ┌──────────────────────┐  │
│  │ Portal & Workspace │ │ Showcase/Asset Search│ │ API / SDK │ │ Admin / Dashboard    │  │
│  └────────────────────┘ └─────────────────────┘ └───────────┘ └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐ ┌────────────┐ ┌──────────────────────────────────┐ ┌────────────┐ ┌────────┐
│ Asset Rail  │ │ Input      │ │       Control Plane              │ │ Delivery   │ │ Eval   │
│ ──────────  │ │  Plane     │ │   AI 실행 두뇌 + Ontology 운영    │ │  Plane     │ │ Rail   │
│ 자산 축적·  │ │ ────────── │ │                                   │ │ ────────── │ │ ─────  │
│ 재사용·유통 │ │ 경험·시장· │ │ ┌──────────────────────────────┐ │ │ 반제품 →   │ │ 측정·  │
│             │ │ 문서 →     │ │ │  Foundry-X Orchestrator      │ │ │ 고객 성과/ │ │ 검증·  │
│ ┌─────────┐ │ │ 구조화 Spec │ │ │ Lead Agent / Workflow Coord  │ │ │ 제품화/   │ │ 자기   │
│ │  Spec   │ │ │            │ │ │ Spec → 반제품 자동 생성 엔진  │ │ │ 운영      │ │ 진화   │
│ │  Asset  │ │ │ ┌────────┐ │ │ │ ● Status: LIVE 85%           │ │ │            │ │        │
│ │  Store  │ │ │ │Decode-X│ │ │ └──────────────────────────────┘ │ │ ┌────────┐ │ │ ┌────┐ │
│ │ ─────── │ │ │ │SI/ITO  │ │ │                                   │ │ │Guard-X │ │ │ │KPI │ │
│ │Business │ │ │ │코드 ·  │ │ │ ┌──────────────┐ ┌─────────────┐│ │ │보안·규 │ │ │ │Mat │ │
│ │ Spec    │ │ │ │문서    │ │ │ │ L3 AI Engine │ │ L4 Ontology /││ │ │제·품질 │ │ │ │rix │ │
│ │Tech Spec│ │ │ │역공학  │ │ │ │ ─────────── │ │ Knowledge    ││ │ │검증     │ │ │ │활용│ │
│ │Quality  │ │ │ │Reverse │ │ │ │ LLM Core ·  │ │ Graph        ││ │ │Policy  │ │ │ │품질│ │
│ │ Spec    │ │ │ │Engineer│ │ │ │ RAG ·       │ │ ─────────── ││ │ │Check · │ │ │ │생산│ │
│ │  PRD    │ │ │ │ ⚪Status│ │ │ │ Planning ·  │ │ Domain      ││ │ │Guardrail│ │ │ │매출│ │
│ └─────────┘ │ │ │Scaffold│ │ │ │ Tool Use ·  │ │ Ontology    ││ │ │Approval│ │ │ └────┘ │
│             │ │ │ 30%    │ │ │ │ Prompt/     │ │ Spec Schema  ││ │ │ 🔴 To-Do│ │ │        │
│ ┌─────────┐ │ │ └────────┘ │ │ │ Policy      │ │ Entity       ││ │ └────────┘ │ │ ┌────┐ │
│ │Reusable │ │ │            │ │ │ Registry    │ │ Registry     ││ │            │ │ │Auto│ │
│ │Deliver- │ │ │ ┌────────┐ │ │ └──────────────┘ │ Explain-     ││ │ ┌────────┐ │ │ │Eval│ │
│ │ables    │ │ │ │Discov- │ │ │                  │ ability      ││ │ │Launch-X│ │ │ │ ─  │ │
│ │ ─────── │ │ │ │ery-X   │ │ │                  └──────────────┘│ │ │배포·   │ │ │ │G-  │ │
│ │Offering │ │ │ │시장·   │ │ │                                   │ │ │패키징· │ │ │ │Eval│ │
│ │Proposal │ │ │ │고객·   │ │ │ ┌──────────────────────────────┐ │ │ │운영전환│ │ │ │Brain│ │
│ │Prototype│ │ │ │기술    │ │ │ │ Tool & Integration Gateway   │ │ │ │Release/│ │ │ │trust│ │
│ │ Agent   │ │ │ │기반    │ │ │ │ ax-plugin · External Tools · │ │ │ │Pkg/    │ │ │ │Reg │ │
│ │  Asset  │ │ │ │사업기회│ │ │ │ Enterprise Systems · API     │ │ │ │Runtime │ │ │ │Test│ │
│ └─────────┘ │ │ │발굴    │ │ │ │ Connectors                   │ │ │ │ 🔴 To-Do│ │ │ └────┘ │
│             │ │ │아이디어│ │ │ └──────────────────────────────┘ │ │ └────────┘ │ │        │
│ ┌─────────┐ │ │ │→가설→  │ │ │                                   │ │            │ │ ┌────┐ │
│ │Enterprise│ │ │ │검증→   │ │ │ ┌──────────────────────────────┐ │ │ ┌────────┐ │ │ │HITL│ │
│ │  Search  │ │ │ │문서화  │ │ │ │ Workflow / Event Bus & Memory│ │ │ │Type 1  │ │ │ │ ─  │ │
│ │ ──────── │ │ │ │ 🟡Pilot │ │ │ │ 세션 메모리 · 상태관리 ·     │ │ │ │Delivery│ │ │ │도메│ │
│ │사내 자산 │ │ │ │  60%   │ │ │ │ 이벤트 기반 오케스트레이션    │ │ │ │ ─────  │ │ │ │인 전│ │
│ │탐색·KG   │ │ │ └────────┘ │ │ └──────────────────────────────┘ │ │ │소스    │ │ │ │문가 │ │
│ │연결·재   │ │ │            │ │                                   │ │ │기반    │ │ │ │리뷰 │ │
│ │사용 검색 │ │ │ ┌────────┐ │ │                                   │ │ │반제품  │ │ │ │승인 │ │
│ └─────────┘ │ │ │RAG /   │ │ │                                   │ │ │딜리버리│ │ │ └────┘ │
│             │ │ │Ingest- │ │ │                                   │ │ │SI 투입 │ │ │        │
│ ┌─────────┐ │ │ │ion     │ │ │                                   │ │ └────────┘ │ │ ┌────┐ │
│ │Customer │ │ │ │Pipeline│ │ │                                   │ │            │ │ │Lear│ │
│ │Showcase │ │ │ │ ────── │ │ │                                   │ │ ┌────────┐ │ │ │ning│ │
│ │ / AI    │ │ │ │문서 자성│ │ │                                   │ │ │Type 2  │ │ │ │Loop│ │
│ │ Asset   │ │ │ │데이터화│ │ │                                   │ │ │Delivery│ │ │ │ ─  │ │
│ │ Portal  │ │ │ │벡터DB  │ │ │                                   │ │ │ ─────  │ │ │ │결과│ │
│ └─────────┘ │ │ │시맨틱  │ │ │                                   │ │ │도메인  │ │ │ │피드│ │
│             │ │ │검색    │ │ │                                   │ │ │Agent   │ │ │ │백  │ │
│┌──────────┐ │ │ └────────┘ │ │                                   │ │ │서비스  │ │ │ │Spec│ │
││Cross-    │ │ │            │ │                                   │ │ │구독형  │ │ │ │/Pr │ │
││cutting   │ │ │ ▶ 보유 자산 │ │                                   │ │ │운영·   │ │ │ │ompt│ │
│└──────────┘ │ │  반영       │ │                                   │ │ │반복매출│ │ │ │/Ont│ │
│             │ │            │ │                                   │ │ └────────┘ │ │ │개선│ │
│             │ │            │ │                                   │ │            │ │ └────┘ │
│             │ │            │ │                                   │ │            │ │        │
│             │ │            │ │                                   │ │            │ │ ┌────┐ │
│             │ │            │ │                                   │ │            │ │ │Exp │ │
│             │ │            │ │                                   │ │            │ │ │& Ver│ │
│             │ │            │ │                                   │ │            │ │ │sion│ │
│             │ │            │ │                                   │ │            │ │ │ing │ │
│             │ │            │ │                                   │ │            │ │ └────┘ │
└─────────────┘ └────────────┘ └──────────────────────────────────┘ └────────────┘ └────────┘
       ▲              ▲                       ▲                          ▲              │
       │              │                       │                          │              │
       └──────────────┴────────── 자기진화 피드백 루프 (폐쇄형) ───────────┴──────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  L5 Foundation Layer            현재 운영 기반 + 확장 기반                                 │
│  Runtime · Memory · Identity · Observability · Security                                   │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐ ┌────────┐ ┌────────────┐         │
│  │ Runtime  │ │  Data /  │ │Identity│ │Observability │ │ DevOps │ │ Security & │         │
│  │Cloudflare│ │ Storage  │ │ JWT ·  │ │ Metrics ·    │ │ CI-CD  │ │ Governance │         │
│  │ Workers  │ │ D1 ·     │ │ RBAC · │ │ Logs ·       │ │        │ │            │         │
│  │          │ │ Object · │ │  SSO   │ │ Traces       │ │        │ │            │         │
│  │          │ │ Vector   │ │        │ │              │ │        │ │            │         │
│  └──────────┘ └──────────┘ └────────┘ └──────────────┘ └────────┘ └────────────┘         │
│  ┌────────────────────┐ ┌────────────────────────┐                                        │
│  │ AXIS Design System │ │ Multi-Cloud Extension  │                                        │
│  │ Design Tokens ·    │ │ Azure / AWS Future     │                                        │
│  │ UI Components ·    │ │                        │                                        │
│  │ Agentic UI         │ │                        │                                        │
│  └────────────────────┘ └────────────────────────┘                                        │
└──────────────────────────────────────────────────────────────────────────────────────────┘

[범례 Status]   🟢 LIVE     🟡 Pilot     ⚪ Scaffold     🔴 To-Do

[보완된 Self-Improving 5 포인트]
  ❶ Prompt / Policy / Model Registry 추가
  ❷ Session Memory + Event Bus 명시
  ❸ Human Approval 포함한 폐쇄형 피드백 루프
  ❹ EvalOps + Experiment Tracking 내재화
  ❺ Asset 재사용성과 KPI를 전 Plane에 연결
```

---

## 2. L1 Channel / Experience Layer

### 2.1 역할
사용자가 AI Foundry OS와 만나는 4가지 입구. **Foundry-X Web**이 통합 사용자 접점.

### 2.2 컴포넌트

| 컴포넌트 | 역할 | 사용자 |
|---|---|---|
| **Portal & Workspace** | 사업기획·프로젝트 관리 작업 공간 | AX 컨설턴트, PM |
| **Showcase / Asset Search** | 사내 자산 검색·재사용 발견 | 영업, 사업개발, BD |
| **API / SDK** | 외부 시스템 통합 진입점 | 개발자, 외부 파트너 |
| **Admin / Dashboard** | 운영·거버넌스 관리 | Admin, Auditor |

---

## 3. Asset Rail (자산 축적 · 재사용 · 유통)

### 3.1 역할
**자산을 누적하고 재사용·유통**하는 좌측 사이드 레일. 자산화가 1순위 가치라는 v0.3 정의서 §2.2(5-Asset Model)의 사내 운영판.

### 3.2 컴포넌트

| 컴포넌트 | 자산 단위 | 5-Asset 매핑 |
|---|---|---|
| **Spec Asset Store** | Business Spec · Technical Spec · Quality Spec · PRD | Policy Pack + Skill Package |
| **Reusable Deliverables** | Offering · Proposal · Prototype · Agent Asset | Skill Package + Decision Log |
| **Enterprise Search** | 사내 자산 탐색 · KG 연결 · 재사용 검색 | Knowledge Map (Ontology) retrieve |
| **Customer Showcase / AI Asset Portal** | 외부 노출용 사례·자산 라이브러리 | (외부 GTM, Phase 4) |
| **Cross-cutting** | 모든 Plane에 횡단 적용 | (메타) |

### 3.3 v0.3 5-Asset과의 매핑

| v0.3 5-Asset | Asset Rail 위치 |
|---|---|
| Policy Pack | Spec Asset Store · Reusable Deliverables |
| Ontology | Enterprise Search (KG 연결) · L4 Ontology (Control Plane) |
| Skill Package | Reusable Deliverables (Agent Asset) |
| Decision Log | Reusable Deliverables · Enterprise Search |
| **System Knowledge** | Spec Asset Store · Enterprise Search (사내 자산 탐색) |

---

## 4. Input Plane — 경험·시장·문서 → 구조화된 Spec

### 4.1 역할
외부의 비정형 자료(SI 산출물·시장 자료·문서·기술 자료)를 **AI가 해석 가능한 구조화 Spec**으로 변환.

### 4.2 컴포넌트

#### 4.2.1 Decode-X — `Status: Scaffold 30%`

| 항목 | 내용 |
|---|---|
| 정체성 | SI/ITO 코드·문서 역공학 (Reverse Engineering) |
| 입력 | 기존 SI 산출물 (코드·문서·다이어그램) |
| 출력 | Spec 추출 결과 (Business + Technical + Quality) |
| 5-Layer 매핑 | Layer 1 Data + 일부 Layer 3 LLM (정책 추출) |

#### 4.2.2 Discovery-X — `Status: Pilot 60%`

| 항목 | 내용 |
|---|---|
| 정체성 | 시장·고객·기술 기반 사업기회 발굴 |
| 흐름 | 아이디어 → 가설 → 검증 → 문서화 |
| 출력 | 검증된 사업 기회 카드 + 근거 자료 |
| 5-Layer 매핑 | Layer 3 LLM + Layer 5 Agent (Discovery Skill) |

#### 4.2.3 RAG / Ingestion Pipeline

| 항목 | 내용 |
|---|---|
| 정체성 | 문서 자성·데이터화·벡터DB·시맨틱 검색 |
| 입력 | 비정형 문서 (PDF·DOCX·XLSX·이미지 등) |
| 출력 | retrieve 가능한 시맨틱 단위 |
| 5-Layer 매핑 | Layer 1 Data Layer (Connector + Structure Extractor) |

> **▶ 보유 자산 반영**: Input Plane은 Asset Rail의 자산을 **재사용 입력**으로도 받습니다 (자기진화 루프의 시작점).

---

## 5. Control Plane — AI 실행 두뇌 + Ontology 중심 운영

### 5.1 역할
Input Plane이 만든 구조화 Spec을 받아 **AI 두뇌**가 처리하고, **Ontology 중심**으로 의사결정·정책 추론·산출물 생성. 본 아키텍처의 코어.

### 5.2 컴포넌트

#### 5.2.1 Foundry-X Orchestrator — `Status: LIVE 85%`

| 항목 | 내용 |
|---|---|
| 정체성 | Lead Agent / Workflow Coordinator |
| 역할 | Spec → 반제품 자동 생성 엔진 |
| 5-Layer 매핑 | Layer 4 Workflow + Layer 5 Agent (오케스트레이션) |

#### 5.2.2 L3 AI Engine

| 항목 | 내용 |
|---|---|
| 구성 | LLM Core · RAG · Planning · Tool Use · Prompt/Policy Registry |
| 역할 | LLM 호출·계획 수립·도구 사용·프롬프트 거버넌스 |
| 5-Layer 매핑 | Layer 3 LLM (Tier Router + Multi-Evidence Triangulation) |

#### 5.2.3 L4 Ontology / Knowledge Graph

| 항목 | 내용 |
|---|---|
| 구성 | Domain Ontology · Spec Schema · Entity Registry · Explainability |
| 역할 | 시멘틱 레이어 운영 — v0.3 정의서 9-Type Object 기반 |
| 5-Layer 매핑 | Layer 2 Ontology (파일+Git Knowledge Map + PostgreSQL) |
| **v0.3 변경** | Graph DB 미사용 — 파일 retrieve 방식 |

#### 5.2.4 Tool & Integration Gateway

| 항목 | 내용 |
|---|---|
| 구성 | ax-plugin · External Tools · Enterprise Systems · API Connectors |
| 역할 | 사외 시스템·외부 도구·MCP 연동 |
| 5-Layer 매핑 | §3.7.5 MCP Tools Interface (BeSir 등 외부 통합) |

#### 5.2.5 Workflow / Event Bus & Memory

| 항목 | 내용 |
|---|---|
| 구성 | 세션 메모리 · 상태관리 · 이벤트 기반 오케스트레이션 |
| 역할 | 멀티턴 대화·장기 기억·이벤트 기반 트리거 |
| 5-Layer 매핑 | Layer 4 Workflow (HITL + Audit Log Bus 포함) |

---

## 6. Delivery Plane — 반제품 → 고객 성과 / 제품화 / 운영

### 6.1 역할
Control Plane이 만든 반제품을 **고객 성과·운영 가능한 형태로 전환**. 두 가지 딜리버리 타입(Type 1/2) 지원.

### 6.2 컴포넌트

#### 6.2.1 Guard-X — `Status: To-Do`

| 항목 | 내용 |
|---|---|
| 정체성 | 보안·규제·품질 검증 |
| 구성 | Policy Check · Guardrail · Approval |
| 5-Layer 매핑 | Layer 4 Workflow (4대 진단 + Approver) + Cross-cutting (Sensitivity Label) |

#### 6.2.2 Launch-X — `Status: To-Do`

| 항목 | 내용 |
|---|---|
| 정체성 | 배포 · 패키징 · 운영 전환 |
| 구성 | Release · Packaging · Runtime Deployment |
| 5-Layer 매핑 | Layer 5 Agent (Skill Package 발행 + Integration Bus) |

#### 6.2.3 Type 1 Delivery — 소스 기반 반제품

| 항목 | 내용 |
|---|---|
| 모델 | 소스 기반 반제품 딜리버리 |
| 영업 | SI 프로젝트 투입 |
| 사업 후순위 | Phase 4 GTM 영역 |

#### 6.2.4 Type 2 Delivery — 도메인 Agent 서비스

| 항목 | 내용 |
|---|---|
| 모델 | 도메인 Agent 서비스 (구독형) |
| 매출 구조 | 반복 매출 (SaaS) |
| 사업 후순위 | Phase 4 GTM 영역 |

---

## 7. Eval Rail (측정 · 검증 · 자기진화)

### 7.1 역할
Delivery Plane의 결과를 **측정·검증**하고, 그 신호를 **자기진화 피드백**으로 환류하는 우측 사이드 레일.

### 7.2 컴포넌트

| 컴포넌트 | 역할 | v0.3 매핑 |
|---|---|---|
| **KPI Matrix** | 활용도 · 품질 · 생산성 · 매출 | §9.2 정량 지표 |
| **Auto Evals** | G-Eval · Braintrust · Regression Test | §9.2 + §4.6 CQ 5축 자동화 |
| **Human-in-the-Loop** | 도메인 전문가 리뷰 · 승인 | §3.6 5 RBAC + §3.6.0 80-20-80 (Stage 3) |
| **Learning Loop** | 결과 피드백 → Spec/Prompt/Ontology 개선 | §11.1 R-15 Multi-Evidence + §4 4대 진단 |
| **Experiment & Versioning** | Model · Prompt · Policy · Asset 버전 관리 | §2.2 5-Asset의 git 관리 |

---

## 8. L5 Foundation Layer (현재 운영 기반 + 확장 기반)

### 8.1 역할
3-Plane + 2 Side Rail 위 모든 컴포넌트를 떠받치는 **공통 인프라 + 횡단 관심사**.

### 8.2 컴포넌트

| 영역 | 구성 | v0.3 매핑 |
|---|---|---|
| **Runtime** | Cloudflare Workers | §10.5 인프라 |
| **Data / Storage** | D1 · Object Store · Vector Store | §3.4.2 (단, Vector Store는 v0.3에서 미사용 결정) |
| **Identity** | JWT · RBAC · SSO | §3.6 5 RBAC |
| **Observability** | Metrics · Logs · Traces | §3.6 Audit Log Bus + §3.7 Metrics Collector |
| **DevOps / CI-CD** | (사내 표준) | §10.5 인프라 |
| **Security & Governance** | (사내 표준) | §2.4 시스템 약속 P5 + §11.1 R-11 PII Guard |
| **AXIS Design System** | Design Tokens · UI Components · Agentic UI | §3.6 HITL Console UI |
| **Multi-Cloud Extension** | Azure / AWS Future | §10.5 인프라 (KT cloud + 멀티클라우드) |

> **v0.3 변경 반영**: Vector Store는 §3.4.1 결정에 따라 미사용 (시맨틱 의미 손실). Foundation Layer에는 후보로 남겨두되 실제 운영은 파일 retrieve로.

---

## 9. 자기진화 피드백 루프 (폐쇄형)

### 9.1 루프 구조

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Input Plane → Control Plane → Delivery Plane                │
│      ↑              ↑                ↓                       │
│      │              │                │                       │
│      │              │           Eval Rail                    │
│      │              │                │                       │
│      │              │     ┌──────────┘                       │
│      │              │     │                                  │
│      │              ▼     ▼                                  │
│   Asset Rail ◀── 학습 신호                                    │
│      │                                                       │
│      └── (재사용 입력으로 Input Plane에 환류)                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 9.2 폐쇄형 의미

- 결과(Eval) → 학습 신호로 변환 → Asset Rail에 누적 → 다음 입력에 재사용
- 사람의 결정(HITL) + AI의 결정(Auto Evals)이 모두 자산화
- 도메인이 늘어날수록 시스템이 똑똑해짐 (v0.3 §5.5 자산 가치 누적 곡선 가설)

---

## 10. Self-Improving 5 보완 포인트

| # | 포인트 | 설명 | v0.3 매핑 |
|---|---|---|---|
| ❶ | **Prompt / Policy / Model Registry 추가** | L3 AI Engine 안에 Registry 명시 | §3.5 Tier Router + Prompt Library |
| ❷ | **Session Memory + Event Bus 명시** | Workflow Plane에 명시 | §3.6 Audit Log Bus + Workflow Engine |
| ❸ | **Human Approval 포함한 폐쇄형 피드백 루프** | HITL이 일등 시민 | §3.6.0 80-20-80 + §11.4 Q1 |
| ❹ | **EvalOps + Experiment Tracking 내재화** | Eval Rail이 운영 시스템의 일부 | §4.6 CQ 운영 검증 + §3.5.1 Multi-Evidence |
| ❺ | **Asset 재사용성과 KPI를 전 Plane에 연결** | Cross-cutting Asset Rail | §2.2 5-Asset Model + §5.5 자산 가치 누적 |

---

## 11. 범례 (Status)

| 상태 | 의미 | 본 문서 컴포넌트 |
|---|---|---|
| 🟢 **LIVE** | 운영 중 | Foundry-X Orchestrator (85%) |
| 🟡 **Pilot** | 파일럿 진행 중 | Discovery-X (60%) |
| ⚪ **Scaffold** | 골격만 완성 | Decode-X (30%) |
| 🔴 **To-Do** | 미착수 | Guard-X · Launch-X |

> **5월 W21 G1+G2 게이트 시점 목표**: 모든 컴포넌트 최소 Pilot 60% 도달, Foundry-X Orchestrator는 LIVE 95%+ 유지.

---

## 12. v0.3 5-Layer와의 매핑 요약 (외부 vs 내부 그림)

본 사내 운영 아키텍처와 외부용 v0.3 5-Layer를 한 표로 정렬.

| 외부용 (v0.3 5-Layer) | 본 문서 (사내 3-Plane + Rail) |
|---|---|
| **Layer 1 Data** | Input Plane (Decode-X · Discovery-X · RAG/Ingestion) |
| **Layer 2 Ontology (9-Type)** | L4 Ontology / Knowledge Graph (Control Plane 내부) + Asset Rail의 Knowledge Map |
| **Layer 3 LLM (Tier 1/2/3 + Multi-Evidence)** | L3 AI Engine (Control Plane 내부) |
| **Layer 4 Workflow (HITL 80-20-80)** | Workflow / Event Bus + HITL (Eval Rail) + Foundry-X Orchestrator |
| **Layer 5 Agent + MCP Tools** | Tool & Integration Gateway + Delivery Plane (Type 1/2) |
| **§3.7.5 MCP Tools Interface (BeSir 통합)** | Tool & Integration Gateway 내 ax-plugin · External Tools |
| **§4.6 CQ 5축 운영 검증** | Auto Evals + Human-in-the-Loop (Eval Rail) |
| **§4 4대 진단 (빌드 단계)** | Guard-X (Delivery Plane) + Eval Rail의 Auto Evals |
| **5-Asset Model (Policy/Ontology/Skill/Log/SystemKnowledge)** | Asset Rail (Spec Asset Store + Reusable Deliverables + Enterprise Search) |
| **L5 Foundation (Workers/D1/Postgres/Redis)** | L5 Foundation Layer (D1 · Object · Identity · Observability · Security) |

---

## 13. 외부 노출 가이드

### 13.1 외부 회람·미팅 시 본 문서 사용 금지

본 문서는 **내부 코어팀 + AXBD 임원 + 모듈 코어 5명**까지만 회람합니다. KTDS 내부 명칭(Foundry-X · Decode-X · Discovery-X · ax-plugin · AXIS-DS)을 외부에 노출하는 자료에 그대로 옮기지 않습니다.

### 13.2 외부 자료 변환 룰

| 본 문서 명칭 | 외부 자료 변환 | 사용 위치 |
|---|---|---|
| Foundry-X Orchestrator | **AI Foundry Workflow Coordinator** (Layer 4) | v0.3 §3.6 |
| Decode-X | **Document Decoder Module** (Layer 1) | v0.3 §3.3 |
| Discovery-X | **Discovery Module** (Layer 5 Agent 변형) | v0.3 §3.7 |
| ax-plugin | **MCP Tool Plugin** (Layer 5) | v0.3 §3.7.5 |
| AXIS Design System | **AI Foundry Design System** | v0.3 §10.5 |
| L3 AI Engine | **LLM Layer (Tier 1/2/3)** | v0.3 §3.5 |
| L4 Ontology / Knowledge Graph | **Ontology Layer (9-Type Knowledge Map)** | v0.3 §3.4 |

### 13.3 외부 회람용 변환 자료

본 문서 + v0.3을 함께 보고 변환한 외부용 시각화는 별도 문서로 작성합니다. 본 라운드에서는 v0.3 §3.1 5-Layer 그림을 그대로 사용 (내부 명칭 없음).

---

## 14. 본 문서의 다음 단계

### 14.1 5월 W18까지

- [ ] 본 07 문서를 모듈 코어 5명·AXBD 임원에 사전 회람
- [ ] 각 컴포넌트 Status 갱신 (LIVE/Pilot/Scaffold/To-Do)
- [ ] Foundry-X Orchestrator의 LIVE 85% → 95%+ 도달 계획 합의

### 14.2 5월 W19 BeSir 미팅

- 본 문서는 **회람 X** (내부용)
- BeSir에는 v0.3 §3.1 5-Layer 그림만 공유
- 06 분석 문서로 양사 정합성 비교

### 14.3 8월 W34 Phase 3 1차 마감

- 본 문서의 컴포넌트 모두 최소 Pilot 60% 이상 도달
- 자기진화 피드백 루프 1주기 완성 (Asset Rail → Input → Control → Delivery → Eval → Asset Rail)

### 14.4 향후 갱신 트리거

- 신규 컴포넌트 추가 시 (예: Phase 4의 Multi-Agent Orchestration)
- BeSir과의 MCP 통합 결과 반영 시
- 컴포넌트 Status 변화 시 (월 1회 갱신)

---

## 끝맺음

본 문서는 KTDS-AXBD 사내용 **AI Foundry OS 목표 아키텍처 v1**입니다. v0.3 정의서가 외부용 추상 아키텍처라면, 본 문서는 사내 운영 자산 그대로의 그림.

두 그림은 **§12의 매핑 표로 일관성 검증**되며, 어느 한쪽이 변경되면 매핑 표가 즉시 갱신되어야 합니다.

— 끝.
