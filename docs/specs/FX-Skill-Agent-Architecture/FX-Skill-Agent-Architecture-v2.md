# Foundry-X Skill & Agent Architecture v2.1

> **문서코드:** FX-ARCH-016
> **버전:** v2.1 (Phase 17 / Sprint 164 기준 갱신)
> **작성일:** 2026-04-06
> **기반 문서:** self-evolving-harness-strategy v3.0, prd-shaping-v1.md, 사업기획서 Skill v0.5, KOAMI Template v0.5, prototype-auto-gen PRD
> **v2.0 → v2.1 변경:** Phase 17 실제 구현 상태 반영, 기존 16 agents + 16 skills 인정, Offering 통합 전략 현실화
> **현행 기준:** Phase 17 진행 중 / Sprint 164

---

## 0. 문서 목적

이 문서는 두 가지 신규 자산을 **기존 Foundry-X 프레임워크(Phase 17)에 통합**하는 아키텍처를 정의한다:
- **사업기획서 Skill v0.5** (형상화 3단계 산출물 생성 스킬)
- **KOAMI Offering Template v0.5** (HTML 사업기획서 구현체)

> ⚠️ v2.0은 Phase 9 기준으로 작성되어 "O-G-D 미구현", "Agent 3종만 존재" 등 오류가 있었다. v2.1은 self-evolving-harness-strategy v3.0 + 현재 진행 상태(Phase 17, Sprint 164)를 기준으로 전면 갱신한다.

---

## 1. 현황 진단 — Phase 17 / Sprint 164 기준

### 1-1. 이미 구축된 인프라 (Phase 17 / Sprint 164 기준)

| 영역 | 현재 수량 | 핵심 구현 | Phase |
|------|----------|----------|-------|
| **Agents** | 16종 | deploy-verifier, spec-checker, build-validator + **ogd-3**(orchestrator/generator/discriminator) + **shaping-3**(shaping-orchestrator/generator/discriminator) + six-hats-moderator + **expert-5**(TA/AA/CA/DA/QA) + auto-reviewer | P14 F333~F337 |
| **Skills** | 16종 | ax-bd-discovery v8.2, ai-biz 11종, ax-bd-shaping, tdd, npm-release | P10~P12 |
| **Hooks** | 5종 | PreToolUse 2 + PostToolUse 3 | P14 F334 |
| **Rules** | 5종 | coding-style, git-workflow, testing, security, sdd-triangle | 세션 #199 |
| **O-G-D Loop** | 3모드 | retry, adversarial, fix + ConvergenceCriteria (≥0.85, max 3 rounds) | P14 F335 |
| **Skill Evolution** | 5-Track | Metrics(F274), DERIVED(F276), CAPTURED(F277), Registry(F275), BD ROI(F278) | P10 |
| **Agent Adapter** | 5종 | Registry + Factory + YAML role 태깅 | P14 F336 |
| **TaskState** | 10상태 | PENDING→SPEC_DRAFTED→CODE_GENERATING→TEST_RUNNING→REVIEW_PENDING→FEEDBACK_LOOP→FIX_ATTEMPTING→APPROVED→DEPLOYED→FAILED | P14 F333 |
| **EventBus** | 완비 | ExecutionEventService + D1 execution_events + HookResultProcessor | P14 F334 |
| **Dashboard** | 3뷰 | Kanban + LoopHistory + Telemetry | P14 F337 |
| **D1** | 0109 | 118개 마이그레이션, 107 routes, 122 Zod 스키마 | ~P17 |
| **Tests** | 3,148+ | API 2250+ / CLI 149 / Web 265 / E2E 35+ specs | ~P17 |

### 1-2. 신규 통합 대상

| 자산 | 현재 상태 | 통합 위치 |
|------|----------|----------|
| **사업기획서 Skill v0.5** | 📋 MD 문서 (8단계 생성 프로세스, 18섹션 표준 목차, 작성 원칙, GAN 교차검증) | `.claude/skills/` — 기존 16종에 추가 |
| **KOAMI Template v0.5** | 📋 HTML 구현체 (17종 컴포넌트, CSS 디자인 시스템, 반응형) | shape 스킬의 template + example |
| **Offering Agent 역할** | ❌ 미구현 — 기존 shaping-3 agent가 O-G-D만 담당, 포맷 CRUD/톤 변환은 없음 | `.claude/agents/` — 기존 16종에 추가 또는 shaping-orchestrator 확장 |
| **Prototype Agent 역할** | ✅ Phase 16 완료(F351~F356, Sprint 158~160) | Phase 16 구현 결과와 정렬 |

### 1-3. 핵심 Gap (Phase 17 현재 → Offering 통합)

| Gap | 설명 | 해결 방향 |
|-----|------|----------|
| **형상화 스킬 부재** | 기존 16 skills에 shape 단계 스킬이 없음 (discover/validate만 존재) | offering-html 스킬 신규 등록 |
| **포맷 다양성** | HTML 1종만 존재, PPTX/PDF 미지원 | offering-pptx 추가 (Cowork pptx 스킬 연동) |
| **콘텐츠 어댑터 없음** | 동일 발굴 산출물의 목적별 톤 변환 기능 없음 | Offering Agent에 adapter 패턴 구현 |
| **디자인 토큰 미정규화** | KOAMI HTML 인라인 CSS에만 존재, Foundry-X 레벨 토큰 없음 | 3단계 승격 전략 |
| **shaping-agent ↔ offering-agent 역할 경계** | 기존 shaping-3 agent는 O-G-D 품질 루프 전용, Offering 전체 라이프사이클 관리가 아님 | Offering Agent = shaping-orchestrator 확장 |

---

## 2. Skill Framework 원칙

### 2-1. 분류 체계: 3-Layer Taxonomy

기존 Phase 12 Skill Unification(F303~F308)의 3개 스킬 시스템 통합을 존중하면서, 네이밍 일관성을 부여한다.

```
Layer 1: Domain (어디에 쓰나)
  └─ ax-bd          # AX 사업개발 도메인
  └─ dev            # 개발 도메인
  └─ platform       # 플랫폼 운영 도메인

Layer 2: Stage (언제 쓰나) — AX BD 6단계 라이프사이클 기준
  └─ ax-bd/collect       # 1단계: 수집
  └─ ax-bd/discover      # 2단계: 발굴
  └─ ax-bd/shape         # 3단계: 형상화    ← 이번 통합의 핵심 대상
  └─ ax-bd/validate      # 4단계: 검증 및 공유
  └─ ax-bd/productize    # 5단계: 제품화
  └─ ax-bd/gtm           # 6단계: GTM

Layer 3: Function (무엇을 하나)
  └─ ax-bd/discover/market-analysis
  └─ ax-bd/shape/offering-html      ← 신규
  └─ ax-bd/shape/offering-pptx      ← 신규
  └─ ...
```

### 2-2. 네이밍 규칙

| 규칙 | 패턴 | 예시 |
|------|------|------|
| 스킬 디렉토리 | `{domain}/{stage}/{function}` | `ax-bd/shape/offering-html` |
| 스킬 메인 파일 | `SKILL.md` (항상) | 모든 스킬 동일 |
| Agent 파일 | `{domain}-{role}-agent.md` | `ax-bd-offering-agent.md` |
| 인덱스 | `{stage}/INDEX.md` | `shape/INDEX.md` — 소속 스킬 목록 + I/O 스키마 |

### 2-3. 스킬 표준 구조 (SKILL.md)

```yaml
---
name: offering-html
domain: ax-bd
stage: shape
version: "1.0"
input_schema: DiscoveryPackage + OfferingConfig
output_schema: OfferingHTML
upstream: [ax-bd/discover/packaging]
downstream: [ax-bd/validate/gan-cross-review]
agent: ax-bd-offering-agent
evolution:
  track: DERIVED           # Skill Evolution 5-Track 중 해당 트랙
  registry_id: null        # F275 Registry 등록 후 부여
---

# Offering HTML

## When
...

## How (Step-by-Step)
...

## Output Format
...

## Examples
...
```

핵심 변경 (v2.0 → v2.1): **`evolution` 필드 추가** — 기존 Skill Evolution 5-Track(F274~F278)과 연동. 스킬이 DERIVED인지 CAPTURED인지, Registry에 등록되었는지를 선언.

### 2-4. 스킬 I/O 스키마 관리

각 Stage에 `INDEX.md`를 두어 소속 스킬의 I/O 스키마를 중앙 관리. Phase 12 Skill Unification이 이미 3개 스킬 시스템을 통합한 상태이므로, INDEX.md는 기존 레지스트리(F275)와 동기화되어야 한다.

```markdown
# ax-bd/shape/INDEX.md

## Stage: 형상화 (3단계)
## Agent: ax-bd-offering-agent (+ 기존 shaping-orchestrator 확장)

| # | Skill | Input | Output | Format |
|---|-------|-------|--------|--------|
| 3-1 | offering-html | DiscoveryPackage + OfferingConfig | OfferingHTML | HTML |
| 3-2 | offering-pptx | DiscoveryPackage + OfferingConfig | OfferingPPTX | PPTX |
| 3-P | prototype-builder | OfferingArtifact + PrototypeConfig | Prototype | React/HTML |

## OfferingConfig Schema
- purpose: "report" | "proposal" | "review"   # 콘텐츠 어댑터 톤 결정
- format: "html" | "pptx" | "pdf"
- sections: SectionToggle[]                     # 필수/선택 섹션 토글
- designTokenOverrides?: Partial<DesignTokens>  # 고객별 브랜드 커스텀
```

---

## 3. 스킬 재분류: 기존 15종 + 신규 스킬

### 3-1. 기존 스킬 정렬 (Phase 17 현재 → 3-Layer Taxonomy 매핑)

> **원칙: "만들지 말라 → 기존 기준과 정렬하라"** (self-evolving-harness-strategy v3.0, 수정된 원칙 5)
> Phase 12 Skill Unification(F303~F308)이 이미 3개 시스템을 통합했으므로, 물리적 폴더 이동은 **점진적**으로 하되, 논리적 매핑을 먼저 정의한다.

| 현재 위치 (As-Is) | 논리 분류 (To-Be) | 물리 이동 | 비고 |
|-------------------|-------------------|----------|------|
| `ax-bd-discovery/` | `ax-bd/discover/` (INDEX.md) | Phase 17+ | 기존 v8.2 안정 운영 중 |
| `ai-biz/market-analysis` | `ax-bd/discover/market-analysis` | Phase 17+ | 11종 동일 |
| `ai-biz/customer-persona` | `ax-bd/discover/customer-persona` | 〃 | |
| `ai-biz/competitive-brief` | `ax-bd/discover/competitive-brief` | 〃 | |
| `ai-biz/feasibility-study` | `ax-bd/discover/feasibility-study` | 〃 | |
| `ai-biz/business-case` | `ax-bd/discover/business-case` | 〃 | |
| `ai-biz/risk-assessment` | `ax-bd/discover/risk-assessment` | 〃 | |
| `ai-biz/revenue-model` | `ax-bd/discover/revenue-model` | 〃 | |
| `ai-biz/value-proposition` | `ax-bd/discover/value-proposition` | 〃 | |
| `ai-biz/gtm-strategy` | `ax-bd/discover/gtm-strategy` | 〃 | |
| `ai-biz/cost-model` | `ax-bd/discover/cost-model` | 〃 | |
| `ax-bd-shaping/` | `ax-bd/shape/` (INDEX.md) | Phase 17+ | 기존 형상화 파이프라인 (Phase A~E) |
| `tdd/` | `dev/code/tdd` | Phase 17+ | |
| `npm-release/` | `dev/deploy/npm-release` | Phase 17+ | |

### 3-2. 신규 스킬 (이번 통합 대상)

| 스킬 | 분류 | Input | Output | 구현 출처 |
|------|------|-------|--------|----------|
| **offering-html** | `ax-bd/shape/offering-html` | DiscoveryPackage + OfferingConfig | OfferingHTML (18섹션 표준 목차) | 사업기획서 Skill v0.5 |
| **offering-pptx** | `ax-bd/shape/offering-pptx` | DiscoveryPackage + OfferingConfig | OfferingPPTX | 신규 (Cowork pptx 연동) |
| **prototype-builder** | `ax-bd/shape/prototype-builder` | OfferingArtifact + PrototypeConfig | Prototype | Phase 16 F351~F356 정렬 |

### 3-3. 기존 validate 단계 Agent 활용

> ⚠️ v2.0에서 "신규" 제안했던 validate 스킬 3종(gan-cross-review, six-hats-debate, expert-review)은 **이미 구현되어 있다**:
> - `ogd-3` agents (orchestrator/generator/discriminator) → GAN 교차검증
> - `six-hats-moderator` agent → Six Hats 토론
> - `expert-5` agents (TA/AA/CA/DA/QA) → 전문가 페르소나 리뷰

이들은 별도의 스킬로 분리할 필요 없이, **Offering Agent가 기존 agent를 호출**하는 방식으로 통합한다.

### 3-4. 전체 폴더 구조 (To-Be — 신규 추가분만 표시)

```
.claude/
├── agents/                              # 기존 16종 유지
│   ├── deploy-verifier.md               # ✅ 기존
│   ├── spec-checker.md                  # ✅ 기존
│   ├── build-validator.md               # ✅ 기존
│   ├── ogd-orchestrator.md              # ✅ 기존 (GAN O-G-D)
│   ├── ogd-generator.md                 # ✅ 기존
│   ├── ogd-discriminator.md             # ✅ 기존
│   ├── shaping-orchestrator.md          # ✅ 기존 → Offering Agent로 확장
│   ├── shaping-generator.md             # ✅ 기존
│   ├── shaping-discriminator.md         # ✅ 기존
│   ├── six-hats-moderator.md            # ✅ 기존
│   ├── expert-ta.md ~ expert-qa.md      # ✅ 기존 (5종)
│   ├── auto-reviewer.md                 # ✅ 기존
│   │
│   └── ax-bd-offering-agent.md          # 🆕 신규 (또는 shaping-orchestrator 확장)
│
├── skills/
│   ├── ax-bd-discovery/                 # ✅ 기존 v8.2 유지
│   ├── ai-biz/                          # ✅ 기존 11종 유지 (논리적으로 ax-bd/discover/ 소속)
│   ├── tdd/                             # ✅ 기존
│   ├── npm-release/                     # ✅ 기존
│   ├── (기타 기존 스킬)                   # ✅ 기존
│   │
│   └── ax-bd/shape/                     # 🆕 신규 디렉토리
│       ├── INDEX.md                     # 🆕 형상화 단계 오케스트레이터 + I/O 스키마
│       ├── offering-html/               # 🆕 HTML 사업기획서
│       │   ├── SKILL.md                 # 사업기획서 Skill v0.5 → SKILL.md 변환
│       │   ├── templates/
│       │   │   ├── base.html            # CSS 디자인 시스템 (17종 컴포넌트 포함)
│       │   │   └── components/          # 17종 HTML 컴포넌트 (분리형)
│       │   ├── design-tokens.md         # 컬러 / 타이포 / 레이아웃 토큰 (Phase 1: MD)
│       │   └── examples/
│       │       └── KOAMI_v0.5.html      # 실제 구현 예시
│       ├── offering-pptx/               # 🆕 PPT 사업기획서
│       │   ├── SKILL.md
│       │   └── templates/
│       └── prototype-builder/           # 🆕 프로토타입 (Phase 16 F351~F356 정렬)
│           └── SKILL.md
│
├── hooks/                               # ✅ 기존 5종 유지
├── rules/                               # ✅ 기존 5종 유지
└── contexts/                            # 기존
```

---

## 4. Agent 아키텍처: 기존 16종 + Offering Agent

### 4-1. 기존 Agent 구조 (Phase 17)

```
┌──────────────────────────────────────────────────────────────────────┐
│                 Foundry-X Agent Ecosystem (Phase 17)                   │
│                                                                       │
│  ┌─ Dev Domain ──────────┐   ┌─ O-G-D Core ─────────────────────┐   │
│  │ deploy-verifier       │   │ ogd-orchestrator                  │   │
│  │ spec-checker          │   │ ogd-generator                     │   │
│  │ build-validator       │   │ ogd-discriminator                 │   │
│  │ auto-reviewer         │   │ shaping-orchestrator ←─┐          │   │
│  └───────────────────────┘   │ shaping-generator      │ 확장     │   │
│                              │ shaping-discriminator   │ 대상     │   │
│  ┌─ Review Domain ───────┐   └────────────────────────┘          │   │
│  │ six-hats-moderator    │                                       │   │
│  │ expert-ta             │   ┌─ Agent Infra ─────────────────┐   │   │
│  │ expert-aa             │   │ Agent Adapter (F336)           │   │   │
│  │ expert-ca             │   │ Registry + Factory             │   │   │
│  │ expert-da             │   │ 5 Adapter + YAML role 태깅     │   │   │
│  │ expert-qa             │   └───────────────────────────────┘   │   │
│  └───────────────────────┘                                       │   │
└──────────────────────────────────────────────────────────────────────┘
```

### 4-2. Offering Agent — 기존 shaping-orchestrator 확장

**핵심 설계 결정:** 완전히 새로운 Agent를 만드는 대신, **기존 shaping-orchestrator의 역할을 확장**한다. 이유:
1. shaping-orchestrator는 이미 O-G-D 품질 루프를 관리함
2. Agent Adapter(F336)의 Registry + Factory가 역할 태깅을 지원함
3. "만들지 말라 → 기존 기준과 정렬하라" 원칙

```yaml
# agents/ax-bd-offering-agent.md (shaping-orchestrator 확장 또는 별도 파일)
name: ax-bd-offering-agent
extends: shaping-orchestrator             # 기존 O-G-D 루프 상속
role: 형상화 단계 전체 라이프사이클 관리
model: opus (구조 판단, 톤 결정) / sonnet (콘텐츠 생성)
tools: [Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch]

capabilities:
  # 기존 shaping-orchestrator 역할 (상속)
  - ogd_quality_loop: 3모드 (retry/adversarial/fix), ConvergenceCriteria
  - shaping_generation: shaping-generator 호출
  - shaping_discrimination: shaping-discriminator 호출

  # 신규 확장 역할
  - format_selection: 사용자 목적에 따른 포맷 추천 (HTML/PPTX/PDF)
  - content_adapter: 동일 발굴 산출물의 목적별 톤 변환
  - structure_crud: 표준 목차 필수/선택 토글, 커스텀 목차
  - design_management: 디자인 토큰 적용, 컴포넌트 조합
  - validate_orchestration: 기존 six-hats-moderator, expert-5 호출
  - version_guide: v0.1 → v0.5 → v1.0 진행 관리
```

**역할 상세:**

1. **포맷 선택:** 사용자 목적에 따라 적절한 포맷 추천
   - 보고용 → HTML (full 18 sections, executive tone)
   - 대외 제안용 → PPTX (key visuals, technical depth)
   - 내부 검토용 → HTML (risk-focused, No-Go criteria)

2. **콘텐츠 어댑터:** DiscoveryPackage를 목적별 톤으로 변환
   ```
   DiscoveryPackage (동일 Input)
     ├─ [보고용] → tone: executive, emphasis: exec-summary + cross-validation
     ├─ [제안용] → tone: technical, emphasis: solution + poc-scenario
     └─ [검토용] → tone: critical, emphasis: risk + no-go-criteria
   ```

3. **구조 CRUD:** 18섹션 표준 목차에서 필수/선택 토글
   - 필수(12): Hero, Exec Summary, 추진배경(3축), 시장기회, 고객세그먼트, 제안방향, 솔루션, 추진일정, 예산, CTA
   - 선택(6): 경쟁현황, 데이터자산, 기술방향옵션, PoC시나리오, 리스크, 기대효과상세

4. **검증 오케스트레이션:** shape 완료 후 기존 agent 자동 호출
   ```
   Offering Agent
     └─ shape 완료
         ├─ ogd-orchestrator → O-G-D 품질 루프 (기존 인프라 재활용)
         ├─ six-hats-moderator → 6색 모자 토론 (기존 agent)
         └─ expert-ta~qa → 전문가 5인 리뷰 (기존 5 agents)
   ```

5. **버전 관리:** v0.1(초안) → v0.5(검증 통과) → v1.0(최종)

### 4-3. Discovery Agent — 기존 인프라 활용

Discovery Agent는 이미 `ax-bd-discovery` v8.2 + `ai-biz` 11종이 안정적으로 운영 중이므로, 별도 Agent 신규 생성 대신 **기존 프로세스에 O-G-D 퀄리티 게이트를 추가**하는 방식으로 강화한다.

**State Machine (기존 + 강화):**
```
IDLE → [사용자 입력] → COLLECTING
COLLECTING → [ax-bd-discovery 프로세스] → DISCOVERING(2-0)
DISCOVERING(2-N) → [ai-biz 스킬 실행]
  → [O-G-D 검증: ogd-orchestrator 호출] ← 기존 인프라 재활용
  → DISCOVERING(2-N+1) | REWORK(2-N)
DISCOVERING(2-8) → [packaging] → PACKAGED
PACKAGED → [사용자 확인] → READY_FOR_SHAPING
```

**핵심:** 기존 `ogd-orchestrator` + `ogd-generator` + `ogd-discriminator` 3-agent를 발굴 단계에서도 재활용. 이것이 self-evolving-harness-strategy v3.0 §6.2에서 언급한 "O-G-D Loop 도메인 간 재활용"의 실천.

### 4-4. Prototype Agent — Phase 16 정렬

Phase 16(F351~F356)은 ✅ 완료(Sprint 158~160)되었으므로, 구현 결과를 기반으로 정렬한다.

| Phase 16 F-item | Prototype Agent 역할 |
|-----------------|---------------------|
| F351: Builder Server + Docker 격리 | Agent의 코드 실행 런타임 |
| F352: CLI `--bare` PoC | Agent의 생성 도구 |
| F353: D1 + Prototype API | 프로토타입 메타데이터 저장 |
| F354: Fallback + 비용 모니터링 | BD ROI(F278) 연동 |
| F355: O-G-D 품질 루프 | **기존 Orchestration Loop 재활용** (핵심) |
| F356: Dashboard + 피드백 | 기존 Kanban 대시보드(F337) 확장 |

---

## 5. ai-biz ↔ 사업기획서 Skill 관계 명확화

### 5-1. 데이터 흐름도

```
┌─────────────────────────────────────────────────────────┐
│ 2단계: 발굴                                               │
│ 관리: ax-bd-discovery v8.2 + ogd-* agents                │
│                                                          │
│  RawIdea                                                 │
│    └─→ [2-0] item-definition → DiscoveryItem             │
│           └─→ [2-1~2-7] ai-biz 11종 → 각 AnalysisResult │
│           └─→ [2-8] packaging → DiscoveryPackage         │
│                    (모든 Result를 종합)                    │
│                                                          │
│  ※ 기존 인프라: ai-biz 11종(Phase 10), Discovery v8.2    │
│  ※ O-G-D: ogd-orchestrator/generator/discriminator       │
└──────────────────────┬──────────────────────────────────┘
                       │ DiscoveryPackage
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 3단계: 형상화                                             │
│ 관리: ax-bd-offering-agent (shaping-orchestrator 확장)    │
│                                                          │
│  DiscoveryPackage + OfferingConfig                       │
│    └─→ [목적 선택] → tone + emphasis 결정                 │
│    └─→ [포맷 선택] → HTML | PPTX | PDF                   │
│              └─→ offering-html SKILL 실행                 │
│                    └─→ 8단계 생성 프로세스                  │
│                    └─→ Draft v0.1                         │
│                           │                              │
│                    ┌──────┴──────┐                        │
│                    │ 피드백 루프  │                        │
│                    │ (O-G-D 재활용)│                       │
│                    └──────┬──────┘                        │
│                           ▼                              │
│                    검증 단계 (기존 agents 호출)             │
│                    ├─ ogd-orchestrator (GAN 교차검증)      │
│                    ├─ six-hats-moderator (6색 모자)       │
│                    └─ expert-ta~qa (전문가 5인)            │
│                           │                              │
│                           ▼                              │
│                    Final v0.5+ / v1.0                    │
└──────────────────────┬──────────────────────────────────┘
                       │ OfferingArtifact
                       ▼
┌─────────────────────────────────────────────────────────┐
│ 프로토타입 (Phase 16 F351~F356)                           │
│ 관리: Phase 16 Prototype Agent                           │
│                                                          │
│  OfferingArtifact의 시나리오 + 데이터 구조                  │
│    └─→ CLI --bare PoC (F352)                             │
│    └─→ O-G-D 품질 루프 (F355, 기존 인프라)                 │
│    └─→ Prototype Dashboard (F356)                        │
└─────────────────────────────────────────────────────────┘
```

### 5-2. 관계 요약

| 구분 | ai-biz 11종 | 사업기획서 Skill v0.5 |
|------|-------------|---------------------|
| **단계** | 2단계: 발굴 | 3단계: 형상화 |
| **역할** | 분석 도구 (시장/고객/경쟁/재무 등) | 산출물 포맷 (HTML 사업기획서) |
| **Input** | DiscoveryItem | DiscoveryPackage (ai-biz 결과 종합) |
| **Output** | 각 AnalysisResult | OfferingHTML (18섹션 문서) |
| **관리 Agent** | ax-bd-discovery + ogd-* | ax-bd-offering-agent |
| **연결 고리** | DiscoveryPackage | ← DiscoveryPackage가 Input |

---

## 6. 디자인 토큰 전략

### 6-1. 현재 (KOAMI HTML 인라인)

```css
:root {
  --black: #111; --gray-700: #333; --gray-500: #666; --gray-300: #999;
  --gray-100: #e5e5e5; --gray-50: #f8f9fa; --white: #fff;
  --red: #dc2626; --orange: #ea580c; --green: #16a34a;
}
```

### 6-2. 3단계 승격

**Phase 1 (즉시 — Sprint 165):**
```
ax-bd/shape/offering-html/design-tokens.md
→ 컬러, 타이포, 레이아웃 토큰을 MD로 문서화
→ SKILL.md에서 참조
```

**Phase 2 (API/Web 동시 — Sprint 166~167):**
```
packages/shared/design-tokens/ax-bd-offering.tokens.json
→ JSON 정규 포맷
→ API: GET/PUT /api/offerings/design-tokens
→ Web: 에디터에서 읽어 미리보기 렌더링
```

**Phase 3 (장기 — Sprint 169+):**
```
Web 에디터에서 실시간 CSS 커스터마이징
→ 토큰 수정 → 즉시 HTML 프리뷰 반영
→ 고객별 브랜드 컬러 적용
```

### 6-3. 토큰 JSON 구조

```json
{
  "color": {
    "text": { "primary": "#111", "secondary": "#666", "muted": "#999" },
    "bg": { "default": "#fff", "alt": "#f8f9fa" },
    "data": { "red": "#dc2626", "orange": "#ea580c", "green": "#16a34a" },
    "border": { "default": "#e5e5e5", "strong": "#111" }
  },
  "typography": {
    "hero": { "size": "48px", "weight": 900, "font": "Pretendard" },
    "section": { "size": "36px", "weight": 800 },
    "body": { "size": "15px", "weight": 400, "lineHeight": 1.7 },
    "label": { "size": "12px", "weight": 600, "transform": "uppercase", "letterSpacing": "0.08em" }
  },
  "layout": {
    "maxWidth": "1200px",
    "sectionPadding": "120px 40px 80px",
    "cardRadius": "16px",
    "breakpoint": "900px"
  },
  "components": {
    "count": 17,
    "list": ["nav", "hero", "section-header", "kpi-card", "compare-grid", "ba-grid",
             "silo-grid", "trend-grid", "scenario-card", "step-block", "flow-diagram",
             "impact-list", "option-card", "vuln-list", "roadmap-track", "bottom-note", "cta"]
  }
}
```

---

## 7. 통합 실행 로드맵 (API/Web 동시)

> Sprint 번호는 현재 진행(Phase 17, Sprint 164) 이후 시점 기준. Phase 16 Prototype Auto-Gen과 병행.

### Sprint 165: Foundation — 스킬 등록 + 디자인 토큰 Phase 1

| 작업 | 내용 | 기존 자산 활용 |
|------|------|--------------|
| `ax-bd/shape/` 디렉토리 생성 | INDEX.md + offering-html/ + offering-pptx/ | — |
| offering-html/SKILL.md | 사업기획서 Skill v0.5 → SKILL.md 변환 (upstream/downstream 선언) | — |
| templates/base.html | KOAMI HTML에서 CSS 디자인 시스템 + 17종 컴포넌트 분리 | KOAMI v0.5 |
| design-tokens.md | Phase 1: MD 문서화 | KOAMI CSS 변수 |
| examples/KOAMI_v0.5.html | 실제 구현 예시 등록 | KOAMI v0.5 |
| F275 Registry 등록 | offering-html 스킬을 기존 Skill Registry에 등록 | **F275** |

### Sprint 166: Agent 확장 + API/Web 동시 착수

| 레이어 | 작업 | 기존 자산 활용 |
|--------|------|--------------|
| **Agent** | ax-bd-offering-agent.md (shaping-orchestrator 확장) | **shaping-3 agents** |
| **API** | D1 migration (offerings, offering_versions, offering_sections) | 기존 D1 패턴 |
| **API** | offerings CRUD endpoints + Zod 스키마 | 기존 105 스키마 패턴 |
| **Web** | /app/offerings 목록 페이지 (기존 Kanban 패턴 활용) | **F337 Dashboard** |
| **Design** | design-tokens.md → ax-bd-offering.tokens.json (Phase 2) | — |

### Sprint 167: 핵심 기능 완성

| 레이어 | 작업 | 기존 자산 활용 |
|--------|------|--------------|
| **API** | POST /offerings/:id/validate (기존 O-G-D 호출) | **F335 Orchestration Loop** |
| **API** | GET /offerings/:id/export (HTML/PDF) | — |
| **Web** | /app/offerings/new 위자드 (발굴 아이템 연결 + 목차 선택) | 기존 DiscoveryWizard 패턴 |
| **Web** | /app/offerings/:id 섹션 에디터 + HTML 프리뷰 | — |
| **Skill** | offering-pptx SKILL.md (Cowork pptx 스킬 연동) | — |

### Sprint 168: 통합 + 콘텐츠 어댑터

| 레이어 | 작업 | 기존 자산 활용 |
|--------|------|--------------|
| **Pipeline** | discover → shape 자동 전환 (DiscoveryPackage → Offering 프리필) | 기존 EventBus(F334) |
| **Web** | 교차검증 대시보드 (GAN 추진론/반대론 시각화) | **ogd-* agents** |
| **Web** | 콘텐츠 어댑터 UI (보고용/제안용/검토용 톤 전환) | — |
| **Web** | 디자인 토큰 에디터 + 실시간 HTML 프리뷰 (Phase 3) | ax-bd-offering.tokens.json |

### Sprint 169+: Prototype 정렬 + 고도화

| 레이어 | 작업 | Phase 16 정렬 |
|--------|------|-------------|
| **Prototype** | prototype-builder SKILL.md | F351~F356 |
| **E2E** | 발굴→형상화→검증 전체 파이프라인 E2E 테스트 | 기존 E2E 패턴 |
| **Metrics** | Offering 생성 비용/시간 메트릭 수집 | **F274 + F278** |

---

## 8. 검증 체크리스트

### 8-1. 기존 인프라 활용 검증

- [ ] Offering Agent가 기존 shaping-orchestrator의 O-G-D 루프를 실제로 호출하는가
- [ ] 기존 six-hats-moderator + expert-5 agents가 Offering 검증에 재활용되는가
- [ ] F275 Skill Registry에 offering-html이 정상 등록되었는가
- [ ] EventBus(F334)를 통해 discover → shape 전환 이벤트가 발행되는가
- [ ] BD ROI(F278) 메트릭에 Offering 생성 비용이 기록되는가

### 8-2. 신규 기능 검증

- [ ] Offering Agent가 3가지 톤(보고/제안/검토)을 모두 생성할 수 있는가
- [ ] 18섹션 표준 목차의 필수/선택 토글이 동작하는가
- [ ] 디자인 토큰 변경이 HTML 프리뷰에 즉시 반영되는가
- [ ] DiscoveryPackage → Offering 자동 매핑이 모든 섹션을 커버하는가
- [ ] ai-biz 기존 호출 코드에 호환성 문제가 없는가

### 8-3. 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| O-G-D Loop 재활용 성공 | Offering에서 기존 O-G-D 100% 동작 | F335 Orchestration Loop 호출 로그 |
| Offering 생성 시간 | < 5분/건 (HTML) | execution_events 집계 |
| 포맷 커버리지 | HTML + PPTX (2종 이상) | 스킬 Registry |
| 디자인 토큰 커스텀 | ≥ 1건 고객별 적용 | offerings 테이블 token_override 컬럼 |
| 검증 자동화율 | GAN + Six Hats + Expert 모두 자동 호출 | Agent 호출 로그 |

---

## 부록 A: v2.0 → v2.1 변경 이력

| 영역 | v2.0 (Phase 9 기준) | v2.1 (Phase 17 기준) | 변경 사유 |
|------|---------------------|---------------------|----------|
| 기준선 | Phase 9, Sprint 98, 3 agents, ~5 skills | Phase 17, Sprint 164, 16 agents, 16 skills | self-evolving-harness-strategy v3.0 + 현행 반영 |
| Agent 제안 | Discovery/Offering/Prototype 3종 신규 | Offering Agent 1종 신규 (shaping-orchestrator 확장) | 기존 16종 agent 재활용 |
| Validate 스킬 | gan-cross-review, six-hats, expert 3종 신규 | 이미 구현됨 (ogd-3, six-hats-moderator, expert-5) | 중복 제거 |
| O-G-D | 설계만 존재, 구현 필요 | 3모드 완전 구현, 재활용만 필요 | Phase 14 F335 |
| 스킬 마이그레이션 | ai-biz 11종 물리 이동 (즉시) | 논리 매핑 즉시, 물리 이동 Phase 17+ | Phase 12 Unification 존중 |
| Sprint 번호 | 99~103 | 165~169 | 실제 Sprint 164 이후 |
| 디자인 토큰 | Phase 1: MD, Phase 2: JSON, Phase 3: Web | 동일 (3단계 유지) | — |
| Prototype Agent | 신규 설계 | Phase 16 F351~F356 정렬 | 중복 설계 방지 |
| Skill Evolution | 미언급 | evolution 필드 추가 (F274~F278 연동) | 기존 5-Track 활용 |

## 부록 B: 참조 문서 인덱스

| 문서 | 경로 | 용도 |
|------|------|------|
| 자가 발전 하네스 전략 v3.0 | `docs/03-analysis/self-evolving-harness-strategy.md` | **v2.1의 핵심 기준 문서** — Phase 15+ 구현 현황 |
| 사업기획서 Skill v0.5 | (업로드) `AX_BD팀_사업기획서_Skill_v0.5_260404.md` | offering-html SKILL.md의 원본 |
| KOAMI Template v0.5 | (업로드) `03_AX Discovery_사업기획서_KOAMI_v0.5_260404.html` | HTML 구현 예시 + 디자인 시스템 원본 |
| Shaping PRD v1 | `docs/specs/ax-bd-shaping/prd-shaping-v1.md` | 6-Phase shaping 파이프라인 상세 |
| Prototype Auto-Gen PRD | `docs/specs/prototype-auto-gen/prd-prototype-autogen-v1.md` | Phase 16 요구사항 |
| GAN Agent Architecture | `harness-gan-agent-architecture.md` | O-G-D 패턴 정의 |
| PRD v8 | `docs/specs/prd-v8-final.md` | 현행 PRD (권위 문서) |
