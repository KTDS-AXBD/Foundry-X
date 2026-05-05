---
title: AI Foundry 마스터 빌드 플랜 v1 — 외부 LLM 교차 검증 프롬프트 패키지
purpose: 08_build_plan_v1.md (+ 09~12 dev plans) 를 외부 LLM에 보내 빈틈을 찾기 위한 프롬프트·첨부 파일·통합 가이드 모음
target_doc: 08_build_plan_v1.md (v1 → v2 발전 전 검증)
date: 2026-05-02
owner: Sinclair Seo
classification: 기업비밀 II급
based_on:
  - 03_cross_review_prompts.md (정의서 v0.1 검증 패턴, 동일 워크플로우 적용)
  - 04_cross_review_consolidation_v1.md (통합 템플릿)
---

# AI Foundry 마스터 빌드 플랜 v1 — 교차 검증 프롬프트 패키지

> **이 문서가 답하는 질문**
>
> "**08 마스터 빌드 플랜 v1 + 09~12 시스템별 dev plan을 외부 LLM 4~5개에 어떤 프롬프트로, 어떤 파일을 첨부해서, 어떤 출력 형식으로 받아야 v2로 발전시킬 수 있는가?**"
>
> 03_cross_review_prompts.md (정의서 v0.1 검증)와 같은 워크플로우. 검증 대상이 정의서가 아닌 **빌드 플랜 + 시스템 dev plan** 으로 바뀜.

---

## 0. 사용 안내

### 0.1 권장 워크플로우

```
1) 외부 LLM 선택 (검증 관점별 LLM 매핑은 §3 참조)
2) §1 Preamble을 프롬프트 앞에 붙임
3) §4의 첨부 파일 매트릭스에서 검증 관점에 맞는 파일 첨부
4) §2의 검증 관점별 프롬프트(P1~P8) 골라 사용
5) §5 통합 템플릿에 결과 정리 → P0/P1/P2 분류
6) v2 발전 안건으로 등재 (08 §12 Changelog 갱신)
```

### 0.2 보안·배포 주의사항

- 본 문서와 첨부 파일은 모두 **기업비밀 II급** — 외부 LLM 사용 시 데이터 학습 옵트아웃 필수
  - ChatGPT/GPT-4o: Settings → Data Controls → Improve the model **OFF**, Memory **OFF**
  - Gemini (Google AI Studio): Activity **OFF**, 가능하면 Gemini for Workspace 엔터프라이즈 모드
  - DeepSeek: API 호출 시 `model_training=false` 옵션 또는 사내 가이드 확인
  - Claude (Anthropic): 기본적으로 학습 미사용, 그러나 Workbench 사용 시 명시적 확인
  - Perplexity: Pro 모드에서 "Don't train on my data" 토글
- 가능하면 **API 호출** 사용 (UI보다 옵트아웃 명확)
- **5개 repo 명칭(Foundry-X·Decode-X 등) 외부 노출 금지** 원칙은 본 검증에서는 일부 완화 — 검증 LLM에는 사내 명칭이 보이는 본 문서를 그대로 보냄. 다만 **검증 LLM은 사외 사람이 아니므로 회람 추적은 안 됨** → 결과 활용 시 외부 회람·시연 자료에는 절대 인용 X
- KT 그룹의 외부 AI 사용 가이드라인을 사전 확인 (NDA·DPA 적용 여부)

### 0.3 결과 활용 원칙

- 외부 LLM 답변은 **참고용**, 빌드 플랜 변경의 1차 권한은 통합 PM(Sinclair)
- **2개 이상 LLM 의견 일치 → P0 (즉시 반영 검토)**
- 단일 LLM 의견 → P1 (W18 회의 안건) / P2 (참고만)
- LLM hallucination 의심 항목 (존재하지 않는 기술명·표준·기업 사례)은 §5.4 hallucination 체크리스트로 거름
- 모든 결과는 14_cross_review_consolidation_v2.md 로 통합 (04 패턴 그대로)

---

## 1. Preamble — 모든 프롬프트 앞에 공통으로 붙일 컨텍스트

> 아래 텍스트를 **모든 검증 프롬프트의 첫 부분**에 붙이세요. 이 컨텍스트가 없으면 LLM이 일반론적인 답을 합니다.

```
You are a senior reviewer evaluating an internal Master Build Plan and
its system-level development plans for a Korean enterprise B2B AI platform
called "AI Foundry".

CONTEXT — WHAT THIS PLATFORM IS:
- The platform turns enterprise decisions into reusable assets:
  Policy Pack, Ontology, Skill Package, Decision Log, System Knowledge
  (5-Asset Model).
- 5-Layer architecture: Data → Ontology → LLM → Workflow → Agent.
- Signature features: 4 Diagnostics (Missing/Duplicate/Overspec/Inconsistency)
  and Cross-Org Comparison (4 groups: common_standard / org_specific /
  tacit_knowledge / core_differentiator).
- Internal control plane is built on Cloudflare Workers, D1, PostgreSQL,
  Git-based knowledge map (NOT Graph DB — see v0.3 §3.4.1 decision).

CONTEXT — WHAT THIS BUILD PLAN IS:
- Document 08_build_plan_v1.md is the Master Build Plan that decomposes
  the platform into work for 5 internal repos (LIVE / Pilot / Scaffold /
  To-Do statuses) plus 2 new modules (Guard-X and Launch-X).
- Documents 09 ~ 12 are system-level dev plans for 4 systems the user
  (a programmer-PM) will personally start building first:
  Guard-X, Launch-X, 4 Diagnostic algorithms, Cross-Org classification.
- Timeline (originally W18 ~ W34, May ~ Aug 2026) is intentionally NOT
  fixed in dev plans — they use stage labels (Solo → Integration → Ops)
  and relative effort (S/M/L/XL) because the user expects to move faster
  than calendar weeks.

CONTEXT — WHAT YOU ARE REVIEWING:
- 08 (Master) defines: 4-phase roadmap, repo-by-repo As-Is/To-Be matrix,
  WBS per phase, gate checklists (G1+G2/G3/G4/G5), RACI, risks (R-01~R-16
  inherited + B-01~B-06 added), interface catalog summary, FTE assumption
  (7.3 FTE × 18 weeks).
- 09 ~ 12 (Dev Plans) define for each system: responsibility/non-responsibility,
  types.ts contract-level interface, internal sub-modules, data model
  (PostgreSQL + Git), SLA, WBS (Solo/Integration/Ops), per-stage progression,
  risks, and DoD.

YOUR TASK:
You will be given the documents above. Provide a STRUCTURED REVIEW from
the perspective specified in the next prompt section.

REVIEW PRINCIPLES:
- Be specific. Cite exact document and section (e.g., "08 §3.2 W23",
  "11 §2.5 Multi-Evidence Triangulation").
- Be concrete. If you spot a gap, propose what should fill it.
- Distinguish "definitely wrong" from "could be improved".
- Flag any factual claim you cannot verify (specific tech names, library
  capabilities, market figures, regulatory references).
- If the plan is ambiguous, list alternative interpretations.
- Use Korean honorific 반존대(해요체) for any Korean output. English is fine
  for analytical sections.

OUTPUT FORMAT (use this exactly — JSON-friendly):

```json
{
  "perspective": "<which perspective from §2>",
  "reviewer_llm": "<your model name and version>",
  "reviewed_at": "<ISO 8601 datetime>",
  "findings": [
    {
      "id": "F-<sequential number>",
      "doc": "<08 | 09 | 10 | 11 | 12>",
      "section": "<exact section like §3.2.1>",
      "category": "blocker | gap | inconsistency | factual_doubt | improvement",
      "severity": "critical | high | medium | low",
      "claim_in_doc": "<verbatim or close paraphrase of what the doc says>",
      "issue": "<what's wrong or missing>",
      "evidence_or_reasoning": "<why you think so — cite external knowledge if any>",
      "suggested_fix": "<concrete change you would make>",
      "confidence": 0.0-1.0
    }
  ],
  "global_observations": "<2~3 sentences on overall plan health>",
  "verifiable_facts_used": [ "<external facts you relied on, with source if possible>" ]
}
```

Begin your review now from the perspective specified next.
```

> **참고**: 영어 + 한글 답변 혼용을 허용합니다 (LLM이 더 정확함). JSON 부분은 영어로, suggested_fix만 한글 반존대로 받기.

---

## 2. 검증 관점별 프롬프트 (P1~P8)

각 프롬프트는 §1 Preamble 뒤에 붙입니다.

### P1 — 빌드 전략 적정성 (신규/재사용/OSS 비율)

```
PERSPECTIVE 1 — Build Strategy Fit-for-Purpose

Look at 08 §1.2 (table of new vs reuse vs OSS by Layer) and §1.3 (outsourceable
vs not).

Specifically critique:
- Is "signature 80% new" justified for Diagnostics and Cross-Org? Could a
  larger reuse share be possible by leveraging existing OSS or Decode-X
  Phase 2-E inheritance (mentioned in 08 §2.2 and 11 §0.4 DG5)?
- Are the per-Layer percentages internally consistent with the WBS effort
  estimates in 09~12?
- Is the "outsource impossible" list (4 Diagnostics, Cross-Org, POL-* coding)
  truly differentiating IP, or are some items routine that could be
  outsourced safely?
- Does the build strategy underweight integration cost (e.g., wiring 5 repos
  into one coherent E2E)?

Output: Findings about build-strategy choices that the plan over-commits
or under-commits to. Be specific about which Layer/module.
```

### P2 — 시그니처 알고리즘 타당성 (4대 진단·Cross-Org)

```
PERSPECTIVE 2 — Signature Algorithm Feasibility

Look at 11 (4 Diagnostics) §2 and 12 (Cross-Org) §2.

Specifically critique:
- Missing diagnostic (11 §2.1): The clustering-then-low-match-rate approach
  assumes case distribution is well-formed. What happens with sparse case
  data (cold-start domain)? Is HDBSCAN/KMeans appropriate for policy-condition
  embedding spaces?
- Duplicate (11 §2.2): AST equality misses semantic equality. The fallback
  "LLM-assisted natural-language equivalence" (11 §2.2.3 step 2) — what
  precision is realistically achievable for Korean policy text?
- Overspec (11 §2.3): chi-square / Mann-Whitney requires sufficient sample
  size per branch. Plan threshold alpha=0.05 — is this calibrated for
  business-policy contexts where samples may be small?
- Inconsistency (11 §2.4): SAT solver (Z3) on policy condition AND. Does
  AI-Foundry policy condition language compile to first-order logic that
  Z3 handles? What about modal/temporal conditions?
- Multi-Evidence Triangulation (11 §2.5): E1+E2+E3 weighted sum with
  weights 0.4/0.4/0.2. Is weighted-sum the right combiner, or should
  this be a learned model? Calibration risk?
- Cross-Org thresholds (12 §2.3): commonality≥0.8 + variance<0.2 etc. —
  are these defensible defaults, or arbitrary? What evidence supports
  threshold choice?
- 4-group classification stability: if N=2 organizations, can the algorithm
  still produce meaningful core_differentiator labels?

Output: Algorithm-level findings with feasibility risks and concrete
methodological alternatives.
```

### P3 — Solo 단계 가능성 (혼자 먼저 어디까지)

```
PERSPECTIVE 3 — Solo-Stage Feasibility

User is one programmer-PM intending to build the Solo stages of 4 systems
(Guard-X, Launch-X, 4 Diagnostics, Cross-Org) in parallel before bringing
in Layer coreplayers.

Look at 09~12 §7.1 (Solo task lists) and §8/9 (per-stage flow).

Specifically critique:
- Total Solo task count: 09=9, 10=10, 11=13, 12=12 → 44 tasks. Is parallel
  Solo execution by ONE person realistic, even with stage labels (not
  weeks)?
- Hidden cross-dependencies: Solo tasks claim "no inter-module dependency"
  but check carefully — does, e.g., DG-S03 (synthetic policy data for
  Diagnostics) overlap with CO-S03 (synthetic 3-org data for Cross-Org)?
  Should they share a generator?
- Foundry-X monorepo conflict risk: all 4 modules add Hono sub-apps to
  packages/api. What's the merge/PR complexity if 4 sub-apps land in a
  short window? Is the Foundry-X codebase ready (tests, CI) for 4 parallel
  PRs?
- Skipped foundations: are there any foundation pieces (shared types,
  trace_id format, Audit Log envelope, KMS access) that Solo stages
  ASSUME exist but haven't been built?

Output: Findings on Solo-stage realism and the specific hidden dependencies
or unstated foundations.
```

### P4 — Guard-X / Launch-X mock → β 전이 전략

```
PERSPECTIVE 4 — Mock-to-Beta Transition Strategy

08 §0.3 D2 declares Guard-X and Launch-X are mock in Phase 2 and beta in
Phase 3. 09 §7 and 10 §7 elaborate.

Specifically critique:
- "Mock = HTTP 200 + echo + audit log" (09 §0.4 G1) — is this enough for
  G3 demo? Will reviewers see the system as "real" or as "stubs"?
- Interface freeze risk (09 B-05): types.ts contracts will change between
  Solo and Integration. What versioning policy avoids breaking the rest of
  the system when Guard-X/Launch-X mature?
- Type 1 vs Type 2 Delivery in Launch-X (10 §0.4 L1, §6 SLA): the gap
  between mock and Type 2 Runtime (real Worker deploy with blue/green) is
  large — is it bridgeable in one phase transition, or should there be an
  intermediate "α2" stage (e.g., Type 1 only beta first)?
- HMAC verification flow (09 GX-S03 + 10 LX-I04): is the HMAC + KMS
  integration well-specified for Solo stage, or is it deferred work that
  will block Integration?

Output: Findings on mock→β realism, specific interface or operational
discontinuities, and recommendations for intermediate stages or contract
freezing policies.
```

### P5 — 게이트 통과 가능성 (G1+G2/G3/G4/G5)

```
PERSPECTIVE 5 — Gate Pass Realism

08 §3 maps phases to weeks and §4 lists gate checklists. The user notes
calendar weeks may compress in practice.

Specifically critique:
- G3 checklist (08 §4.2): "5-Layer E2E ≥80% success" — is 80% the right
  bar for a prototype demo, or too lax (real systems fail one in five),
  or too strict (E2E test discipline at this maturity is unusual)?
- G4 checklist (08 §4.3): depends on KT 본부 (business-line org)
  external commitment — what gate-fallback if commitment slips? R-13
  is rated Critical/High but mitigation is "parallel 2nd domain
  prospecting" — is that enough?
- G5 checklist (08 §4.4): "executive recognition of business application
  start" — is this measurable, or is it purely political?
- Gate cadence: G1+G2 merged at W21, then G3 just 5 weeks later. Is the
  short G2→G3 window realistic given that G3 demands a working prototype
  α4? Could a fallback (08 §3.2 Yellow/Red) actually save it, or are the
  fallback levels too conservative?
- Missing gate: should there be a "mid-Phase 2 sanity gate" (around α2 or
  α3) to catch problems before W26?

Output: Per-gate findings on pass realism, missing checks, and recommended
mid-phase checkpoints.
```

### P6 — 리스크 누락 + 완화책 충분성

```
PERSPECTIVE 6 — Risk Coverage and Mitigation Adequacy

08 §6.1 inherits R-01~R-16 from 02 §11.1 and adds B-01~B-06. 09~12 each
have a §10 risk table.

Specifically critique:
- Are there OBVIOUS risks NOT listed? Examples to consider:
  * Foundry-X production disruption from 4 new sub-apps merging
  * Loss of single contributor (bus factor = 1 for Sinclair on Solo stage)
  * Korean LLM token cost changes (provider pricing volatility)
  * Personal data law changes (PIPA amendments) hitting Layer 1 PII Guard
  * BeSir partnership souring before MCP interface is finalized
  * GitHub Enterprise / sovereign cloud requirements for the 5 repos
- Are mitigation measures CONCRETE and OWNED, or aspirational?
  Specifically check: R-13 (domain delay), R-14 (Cross-Org data refusal),
  R-15 (LLM self-confidence), R-03 (diagnostic precision miss).
- Are SECOND-ORDER risks identified? E.g., if R-13 mitigation forces a
  domain switch, does that domain switch break any DG-O01 (real GT
  collection) or CO-O03 (license template) timing?
- Risk-to-WBS coverage: each risk should map to at least one task or DoD
  check. Are there orphaned risks?

Output: New risks (with severity/likelihood), mitigation strengthening
suggestions, orphaned risks list.
```

### P7 — 인터페이스 정합성 (types.ts contract·trace_id·HMAC·Audit Log)

```
PERSPECTIVE 7 — Interface Contract Consistency

09~12 each define types.ts contracts in §2. 08 §8 has interface catalog
summary. The 4 modules share Audit Log Bus, trace_id, and Hono sub-app
location.

Specifically critique:
- trace_id format: only declared as "string" in all 4 dev plans. Is ULID
  enough, or should it be a structured ID (prefix + timestamp + random)
  that lets cross-module joins work in audit log queries?
- Guard-X check_id HMAC (09 GX-S03 with the recent fix): how is HMAC key
  rotation handled? Where exactly is the key stored (KMS detail missing)?
  How does Launch-X (10 LX-I04) verify without HMAC key access?
- Audit Log envelope: 4 modules emit events with different shapes
  (guard.*, launch.*, diagnostic.*, cross_org.*). Is there a common
  envelope? Where is it defined?
- Cross-Org → Launch-X protection signaling (12 CO-I07 ↔ 10 LX-O05):
  contract is "to be agreed" — what should that contract look like
  concretely? Push notification, sync API call, or shared DB lookup?
- Cross-Org → Diagnostic LearningLoop block (12 CO-I08 ↔ 11 DG-O03):
  the recent fix made it bidirectional, but is the input filtering
  semantics clear (which fields of the finding go into learning, which
  don't)?
- Schema versioning: when types.ts changes (Solo → Integration), what's
  the policy? Semver? Breaking-change PR review?
- Missing 00_interface_contracts.md: cross-review agent already suggested
  this. Is it now critical for v2, or can it wait?

Output: Interface inconsistency findings and concrete contract
specification gaps.
```

### P8 — 사업 가설 검증성 (Cross-Org 누적 곡선·R-14·BM)

```
PERSPECTIVE 8 — Business-Hypothesis Verifiability

Look at 12 §0.4 (CO1: avoid R-14 by single-org self-diagnosis), 12 §10
(CO-R1, CO-R2), and 02 §5.5 (asset value accumulation curve hypothesis).
Also 02 §11.4 Q3 (protection-vs-learning boundary, unresolved).

Specifically critique:
- R-14 mitigation logic: "single-org self-diagnosis as ROI proxy in
  Phase 3, then real multi-org in Phase 4" — does single-org
  self-diagnosis actually demonstrate the Cross-Org thesis, or only a
  weaker claim (within-org variation analysis)?
- Asset accumulation curve (02 §5.5, referenced in 12 CO-O06): the curve
  is hypothesis. What ALTERNATIVE business outcome could falsify it?
  E.g., "second domain reduces cost by <30% → BM redesign needed"
  (12 CO-R2). Is the threshold defensible? What if cost reduction is
  ~50% — is that good or bad?
- core_differentiator default-deny (12 §2.4): commercially attractive
  promise to customers, but what if 80% of policies in a domain end up
  classified as core_differentiator? Then the asset thesis collapses —
  is there a guardrail against over-classification?
- License template (12 CO-O03): how do Korean enterprise customers
  actually consume this? Is there precedent (BeSir, other consortia,
  open standards) the plan should learn from?
- Q3 still unresolved (02 §11.4): protection-vs-learning boundary not
  decided until Phase 4. Should it be decided EARLIER to avoid building
  on a fragile assumption?

Output: Business-hypothesis verifiability findings, falsifiability tests,
and pre-Phase-4 decisions to bring forward.
```

---

## 3. 검증 LLM 매핑 (관점 → LLM 추천)

각 LLM의 강점에 맞춰 관점 분배. 한 관점에 2개 이상 LLM 사용 시 의견 일치 여부로 P0 가중치.

| 관점 | 1순위 LLM | 2순위 LLM | 보조 LLM | 비고 |
|---|---|---|---|---|
| **P1 빌드 전략** | DeepSeek-R1 | Gemini 2.5 Pro | Claude Opus | 비율·자원 분석 강점 |
| **P2 시그니처 알고리즘** | DeepSeek-R1 | GPT-4o | Claude Opus | 알고리즘 깊이 + 구현 디테일 |
| **P3 Solo 단계 가능성** | Claude Opus | GPT-4o | (1개로 충분) | 코드베이스 패턴 인지 강점 |
| **P4 Mock→β 전이** | GPT-4o | DeepSeek-R1 | Gemini | 시스템 진화 단계 분석 |
| **P5 게이트 통과** | Gemini 2.5 Pro | GPT-4o | Claude Opus | 일정·리스크 매트릭스 강점 |
| **P6 리스크 누락** | Gemini 2.5 Pro | DeepSeek-R1 | GPT-4o + Perplexity (외부 사실) | 외부 사실 연계 |
| **P7 인터페이스 정합성** | Claude Opus | DeepSeek-R1 | GPT-4o | 문서·코드 정합성 강점 |
| **P8 사업 가설** | GPT-4o | Gemini 2.5 Pro | Perplexity (시장 사례) | 시장 사례·BM 강점 |

> **권장 순서**: 우선 5개 LLM × 8 관점 = 최대 40 호출. 비용·시간 제약 시 1순위만 (8 호출) → 2순위 (8 호출) 순으로 단계 진행.

### 3.1 LLM별 입력 한도 주의

| LLM | 컨텍스트 한도 (2026-05 기준 추정) | 본 검증 첨부 가능 |
|---|---|---|
| GPT-4o (API) | 128K tokens | 08 + 09~12 모두 OK (~250KB markdown ≈ 65K tokens) |
| Claude Opus 4.6 (API) | 200K+ tokens | 모두 + 02 v0.3 + 07 까지 OK |
| Gemini 2.5 Pro | 1M tokens | 모두 OK |
| DeepSeek-R1 | 64K~128K tokens | 08 + 관련 1~2개 dev plan만 (관점별 첨부) |
| Perplexity Pro | 32K tokens | 08 발췌 + 외부 사실 검증 질문만 |

---

## 4. 첨부 파일 매트릭스 (관점 → 첨부 파일)

> **원칙**: 관점에 정확히 필요한 파일만. 컨텍스트 노이즈는 검증 품질을 떨어뜨립니다.

### 4.1 핵심 첨부 파일 인벤토리

| 코드 | 파일 | 크기 | 용도 |
|---|---|---|---|
| **A** | `08_build_plan_v1.md` | 36KB | **마스터 플랜 본체 — 모든 관점에 필수** |
| **B** | `09_dev_plan_guard_x_v1.md` | 18KB | Guard-X dev plan |
| **C** | `10_dev_plan_launch_x_v1.md` | 19KB | Launch-X dev plan |
| **D** | `11_dev_plan_diagnostic_v1.md` | 26KB | 4대 진단 dev plan |
| **E** | `12_dev_plan_cross_org_v1.md` | 25KB | Cross-Org dev plan |
| **F** | `02_ai_foundry_phase1_v0.3.md` | 100KB | 외부용 정의서 v0.3 (5-Layer + 4-Asset + 모든 결정 근거) |
| **G** | `07_ai_foundry_os_target_architecture.md` | 34KB | 사내 운영 아키텍처 (3-Plane + 5 repo Status) |
| **H** | `06_architecture_alignment_with_besir_v1.md` | 30KB | BeSir 정합성 (외부 통합 결정 근거) |
| **I** | `04_cross_review_consolidation_v1.md` | 15KB | 이전 정의서 v0.1 검증 결과 통합 (참고용) |

### 4.2 관점별 첨부 매트릭스

| 관점 | 필수 (모두 첨부) | 권장 (가능하면) | 선택 (보조) |
|---|---|---|---|
| **P1 빌드 전략** | A, F, G | B, C, D, E | H |
| **P2 시그니처 알고리즘** | A, D, E | F (특히 §3.5 LLM Layer + §4 4대 진단 + §5 Cross-Org) | (없음) |
| **P3 Solo 단계 가능성** | A, B, C, D, E | G (5 repo 현황) | (없음) |
| **P4 Mock→β 전이** | A, B, C | F (§3.6 Layer 4 + §3.7 Layer 5) | G |
| **P5 게이트 통과** | A, F (§7.1~7.6) | I (이전 검증 패턴) | G |
| **P6 리스크 누락** | A, F (§11.1), G | B, C, D, E (각 §10 리스크) | H, I |
| **P7 인터페이스 정합성** | A (§8), B, C, D, E | F (§3.7.5 MCP) | (없음) |
| **P8 사업 가설** | A, F (§5 Cross-Org + §11.4 Q3), E | H (BeSir 사례) | I |

### 4.3 첨부 파일 상태 확인

작업 폴더 `C:\Users\sincl\.claude\workspace\DS-Agentic-AI\기업 의사결정 업무 Agentic AI 플랫폼\` 에 모두 존재:

```bash
# 검증 전 마지막 점검 (사용자 컴퓨터에서)
ls -la *.md | grep -E "(02_.*v0\.3|04_cross|06_arch|07_ai|08_build|09_dev|10_dev|11_dev|12_dev)"
```

### 4.4 외부 노출 마스킹 (선택)

LLM 답변을 사외 회람할 가능성이 있으면, 첨부 전 sed로 5 repo 명칭 마스킹:

```bash
# 예시 — 임시 사본 만들어 전송
for f in 08 09 10 11 12; do
  sed -e 's/Foundry-X/[Module-A]/g' \
      -e 's/Decode-X/[Module-B]/g' \
      -e 's/Discovery-X/[Module-C]/g' \
      -e 's/AXIS-DS/[Module-D]/g' \
      -e 's/ax-plugin/[Module-E]/g' \
      -e 's/Guard-X/[Module-F]/g' \
      -e 's/Launch-X/[Module-G]/g' \
      "${f}_*.md" > "/tmp/${f}_masked.md"
done
```

> **주의**: 마스킹하면 LLM이 모듈 의미를 추측하느라 답변 품질이 떨어집니다. 검증 LLM이 사외에 데이터 노출 안 한다는 보장이 있으면 원본 권장.

---

## 5. 결과 통합 가이드

### 5.1 통합 산출물 — 14_cross_review_consolidation_v2.md

04_cross_review_consolidation_v1.md 와 같은 패턴:

```
# AI Foundry 마스터 빌드 플랜 v1 — 외부 LLM 검증 통합 v2

## 1. 검증 실행 메타
- 검증 기간: YYYY-MM-DD ~ YYYY-MM-DD
- 사용 LLM: GPT-4o / Claude Opus 4.6 / Gemini 2.5 Pro / DeepSeek-R1 / Perplexity Pro
- 검증 관점: P1~P8
- 검증 호출 수: <N건>

## 2. 발견 사항 — P0 (즉시 반영)
| F-ID | 출처 LLM (≥2개) | 관점 | 파일/섹션 | 이슈 | 수정안 |

## 3. 발견 사항 — P1 (W18 회의 안건)
| F-ID | 출처 LLM | 관점 | ... |

## 4. 발견 사항 — P2 (참고만)
| F-ID | 출처 LLM | 관점 | ... |

## 5. Hallucination 의심 항목 (반영 X)
| F-ID | 의심 사실 | 검증 결과 |

## 6. v2 발전 계획
- v1 → v2 변경 항목 (P0+P1 모두 반영)
- 잔여 리스크 (반영 보류)
```

### 5.2 P0/P1/P2 분류 룰

| 분류 | 조건 | 대응 |
|---|---|---|
| **P0** | 2개 이상 LLM 의견 일치 + severity ≥ high | 즉시 v2에 반영 |
| **P1** | 단일 LLM이지만 severity = critical, OR 2개 LLM이 medium에서 일치 | W18 회의 안건 |
| **P2** | 단일 LLM medium/low 의견 | 참고 보존, v2 미반영 |
| **Hallucination** | LLM이 인용한 사실이 외부 검증 X | 별도 표에 기록, 미반영 |

### 5.3 의견 일치 판정

- 동일 파일·동일 섹션·동일 카테고리(blocker/gap/inconsistency/...)면 일치
- 다른 파일이지만 같은 근본 이슈면 통합 (예: P1·P2가 모두 "신규 80% 비율 과도" 지적)

### 5.4 Hallucination 체크리스트

LLM이 다음을 인용했을 때 외부 검증 의무:

- 특정 라이브러리 기능 (예: "Z3 SMT solver의 X 기능") → 공식 문서 확인
- 시장 데이터 (예: "한국 B2B AI 플랫폼 시장 X억") → 출처 요구
- 규제 인용 (예: "PIPA 제X조") → 법령 원문 확인
- 기업 사례 (예: "메리츠가 X를 했다") → 공개 자료 확인
- 표준 인용 (예: "ISO 27001 Annex A.X") → 표준 원문 확인

검증 안 되면 P2 분류 또는 Hallucination 표.

---

## 6. 검증 호출 예시 (가장 최소 단위)

### 6.1 호출 예 — Claude Opus, P3 Solo 단계 가능성

**첨부 파일**: A(08), B(09), C(10), D(11), E(12) (총 5 파일, ~124KB)

**프롬프트**:
```
[§1 Preamble 전체 붙여넣기]

[§2 P3 프롬프트 전체 붙여넣기]
```

**기대 응답 형식**:
```json
{
  "perspective": "P3 Solo-Stage Feasibility",
  "reviewer_llm": "Claude Opus 4.6 (claude-opus-4-6)",
  "reviewed_at": "2026-05-XX...",
  "findings": [...],
  "global_observations": "...",
  "verifiable_facts_used": [...]
}
```

### 6.2 호출 예 — DeepSeek-R1, P2 시그니처 알고리즘

**첨부 파일**: A(08), D(11), E(12), F(02 v0.3 §3.5+§4+§5 발췌)

**프롬프트 사이즈 주의**: DeepSeek-R1 컨텍스트 한도 64K~128K → F는 §3.5/§4/§5만 발췌 첨부 권장.

---

## 7. 일정 가설

| 단계 | 활동 | 예상 노력 |
|---|---|---|
| 1 | 5 LLM 계정·API 키 준비 + 옵트아웃 설정 확인 | S (1세션) |
| 2 | 각 관점별 1순위 LLM 호출 (8 호출) | M (2~3세션) |
| 3 | 각 관점별 2순위 LLM 호출 (8 호출) | M |
| 4 | 결과 JSON 모아서 14 통합 문서 작성 | M~L |
| 5 | P0/P1/P2 분류 + Hallucination 거름 | M |
| 6 | v2 발전 계획 + Sinclair 1차 리뷰 | M |
| 7 | W18 회의 안건 등재 (P0+P1) | S |

> **사용자 메모**: 일정은 fix 안 함. 외부 LLM 답변 대기 시간(특히 DeepSeek-R1 추론 모드)이 가장 큰 변수.

---

## 8. 검증 후 다음 액션 (사용자 결정 필요)

검증 결과가 들어오면 다음 결정 안건:

| 결정 안건 | 근거 |
|---|---|
| **Q-V1**: 00_interface_contracts.md 별도 산출물로 작성? | P7 검증 결과 누적 시 |
| **Q-V2**: Cross-Org core_differentiator over-classification 가드레일? | P8 검증에서 BM 위협 신호 시 |
| **Q-V3**: Solo 단계 task 우선순위 재조정? | P3 검증에서 hidden dependency 발견 시 |
| **Q-V4**: 추가 시스템 dev plan (AXIS-DS, ax-plugin, Decode-X Migration)? | P3 검증에서 foundation 부족 신호 시 |
| **Q-V5**: 마스터 플랜 v2 이전 mid-phase 게이트 신설? | P5 검증에서 G2→G3 간격 위험 신호 시 |

---

## 9. Changelog

| 버전 | 일자 | 변경 |
|---|---|---|
| v1 | 2026-05-02 | 초판 — 03 패턴 그대로, 검증 대상이 정의서→빌드 플랜으로 변경. P1~P8 8 관점 + 5 LLM 매핑 + 첨부 매트릭스 + JSON 출력 표준 |

---

## 끝맺음

본 13 문서는 03 (정의서 v0.1 검증)와 같은 워크플로우를 빌드 플랜에 적용한 패키지입니다. **04와 같은 통합 산출물(14_cross_review_consolidation_v2.md)이 다음 산출물**이고, 14의 P0+P1을 반영해 08을 v2로 발전시키는 것이 최종 목표.

가장 중요한 검증 관점은 **P3 (Solo 단계 가능성)** — 사용자가 혼자 먼저 시도할 수 있다는 가정이 깨지면 본 빌드 전략 자체가 다시 짜여야 함.

다음으로 중요한 것은 **P7 (인터페이스 정합성)** — 4 모듈 cross-reference가 깨지면 Solo→Integration 전이에서 막힘.

검증 결과가 들어오면 §8의 Q-V1~Q-V5 결정 안건을 통해 다음 산출물(14 통합 + 08 v2 + 추가 dev plan)의 범위를 확정합니다.

— 끝.
