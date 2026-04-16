# 실행팀 3대 자산 — Control Plane

> **AI Foundry OS Deep Dive v0.3** · Plane B

수행팀(AX사업1팀·AX사업2팀 등)이 프로젝트 착수 시 가방에 넣어가야 할 것. 이 3가지가 갖춰져 있어야 Spec만 들고도 반제품이 나온다.

---

## B-1 3대 자산 구성

> **판단 프레임 · 생산 엔진 · 맥락 사전**

각 자산은 방법론/도구/모듈/인프라로 세분된다. 왼쪽부터 Harness(사람의 판단) → AI Engine(기계의 생산) → Ontology(공통 의미).

### ⚙ Harness Engineering — 판단의 프레임

**핵심 구성요소**
- 6단계 사업개발 프로세스 (수집→발굴→형상화→검증→제품화→GTM)
- 5가지 판단 하네스 — KT연계성·사업성·리스크·AI-Ready Data·구체화
- TDD Red→Green 사이클 (Vitest 3.x 템플릿)
- F-item Lifecycle 6단계 — Idea → Planning → Design → Impl → Verify → Done

**도구·프레임워크**
- 분석 프레임워크 — BMC · TAM/SAM/SOM · PESTEL · 5 Forces · AI Red Teaming
- PRD/Prototype 템플릿 4종 (사업기획서·Offering·PRD·Prototype)
- Harness 체크리스트 자동화 — Agent 자동 점검 + HITL 승인

### 🧠 AI Engine — 반제품 생산 엔진

**핵심 구성요소**
- **Foundry-X Orchestrator** — Lead Agent (Anthropic 패턴). Spec 읽고 task 분해 → Worker Agent 위임 → 산출물 병합
- **Multi-Agent Worker Pool 12종** — RFP·TA·Makers·SQL·회의록 Agent를 Agents-as-Tools로 연결
- **RAG Pipeline** — Spec/KG에서 관련 컨텍스트 검색 → Agent 주입 + 시멘틱 캐싱
- **SDD Triangle Engine** — Spec↔Code↔Test 3자 Gap 자동 측정, 90% 미달 시 PDCA-iterator 자동 루프
- **Evaluator-Optimizer** — G-Eval·Braintrust 통합. 생성물 품질 자동 평가 후 재생성

**인프라·런타임**
- Agent Runtime — 세션 격리 · 장시간 실행 · Streaming SSE (Cloudflare Workers · D1)
- 코드박스 Appliance — 폐쇄망 고객사 현장 배포용 AI 코드 개발 환경

### 🔗 Ontology — 맥락·용어 사전

**핵심 구성요소**
- **Knowledge Graph Core** — Spec·Code·Test·Agent·산출물을 노드·엣지로 저장. `shared/kg.ts` SSOT
- **Spec Asset Schema** — Business·Technical·Quality 표준 스키마 (YAML/JSON + Zod 검증)
- **도메인 용어사전 Glossary** — 금융·공공·통신 도메인별 표준 용어
- **Relationship Registry** — 구현한다/테스트한다/의존한다/대체한다 등 엣지 타입 표준
- **XAI (Explainability)** — AI 결정 근거를 KG 경로(노드·엣지)로 자동 생성. 감사·규제 대응

**프로세스·도구**
- KG 구축 프로세스 — Decode-X 산출물 자동 등록 → 용어 충돌 감지 → 도메인 전문가 Merge 승인
- Ontology MCP (Palantir 참조) — KG를 MCP 서버로 노출. '27 도입 검토

---

## B-2 수행팀 Handoff — Spec 받은 후 개발 흐름

> **Spec → Plan → Design → Impl → Verify**

Spec을 들고 수행팀에 넘겼을 때 실제 개발 순서. 각 단계에서 Control Plane 3대 자산이 어떻게 투입되는지를 명시.

```
1. Spec 수령
   └→ Business/Technical/Quality Spec 3종 + KG 링크

2. Plan 작성
   └→ Harness 5종 체크 + Sprint 배정

3. Design
   └→ AI Engine이 Spec 기반 Design doc 초안 생성 → HITL 리뷰

4. Impl (TDD)
   └→ Red: 테스트 자동 생성 / Green: Orchestrator 코드 생성

5. Verify ✅
   └→ SDD Triangle Gap ≥ 90% + PDCA 자동 개선
```

---

## B-3 3대 자산 투입 매트릭스

> **단계 × 자산 교차 투입 관계**

개발 단계별로 어떤 자산이 어떻게 투입되는지의 매트릭스. 한 단계라도 자산 공급이 빠지면 다음 단계가 막힌다.

| 단계 | ⚙ Harness Engineering | 🧠 AI Engine | 🔗 Ontology |
|------|----------------------|--------------|-------------|
| **1. Spec 수령** | Exit 조건 체크리스트 | — | KG 노드 탐색 · 용어사전 매칭 |
| **2. Plan 작성** | 5 하네스 판단 / Sprint 템플릿 | TA Agent · Makers 연계 | 유사 사례 KG 검색 |
| **3. Design** | Design 표준 템플릿 | Foundry-X Orchestrator 초안 생성 | Spec Schema Validation |
| **4. Impl (TDD)** | Red→Green 체크리스트 | Multi-Agent Worker · 코드박스 · RAG | Relationship Registry로 의존성 추적 |
| **5. Verify** | Gap ≥ 90% 기준 | SDD Triangle · Evaluator-Optimizer | XAI 경로 기반 설명 자동 생성 |

---

## B-4 실전 사례 — Foundry-X 자체 개발 현황 (메타 적용)

> **방법론 자기증명 — Sprint 298 누적**

현재 Foundry-X가 자기 자신을 개발하는 데 이 방법론을 그대로 적용하는 중. 3대 자산·6단계·Harness·Gap Analysis가 모두 코드로 돌아간다.

| 자산 | 현재 적용 현황 |
|------|---------------|
| **Harness** | F-item Lifecycle 6단계 · TDD Red→Green · Sprint Worktree · 5 Rules (sprint-ops.md 등) |
| **AI Engine** | cli/api/web/shared 4패키지 · Claude Squad 멀티에이전트 · PDCA-iterator · Gap Analysis |
| **Ontology** | SPEC.md §5 F-item SSOT · shared/kg.ts · FX-REQ 코드 체계 · 용어사전 (axbd·plugin·sso·methodology) |
| **성과** | Phase 1~44 완료 · Sprint 298까지 진행 · SI 개발 시간 30%+ 절감 목표 사전 검증 중 |

---

*Source: `packages/web/src/data/deepdive-content.ts` · v0.3 · Sprint 298*
