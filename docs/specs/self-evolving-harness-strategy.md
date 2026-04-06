# Foundry-X 자가 발전 하네스 전략 — 벤치마킹 + 통합 프레임워크 분석

> **문서코드:** FX-STRT-015
> **버전:** v3.0
> **작성일:** 2026-04-06 (v1.0: 2026-04-05, v2.0: 2026-04-06, v3.0: 2026-04-06)
> **입력 소스:** OpenHarness(HKUDS), NLAH 논문(arxiv 2603.25723), claw-code(ultraworkers), ECC, Optio, OpenSpace, revfactory/harness, GAN Agent Architecture, FX-Unified-Integration-Plan v2.1
> **목적:** 안정적이고 지속가능하며 자가 발전하는 하네스 아키텍처 방향 수립
> **v2.0 변경:** OpenHarness/NLAH 분석 추가 + 실용성 관점 전면 보강
> **v3.0 변경:** Phase 10~15 구현 완료 반영 + Gap 분석 + "만들지 말아야 할 것" 재판정 + Phase 16~17 방향 재수립
> **현행 기준:** Phase 15 완료 / Phase 16 등록 (Sprint 160 기준)

---

## 0. 배경과 목적

Foundry-X의 핵심 철학은 **"Git이 진실, Foundry-X는 렌즈"**다. v2.0 작성 시점(Phase 9, Sprint 98)에는 CLI + API + Web + 멀티테넌시 + SSO + BD 통합까지 완성한 상태였고, 자가 발전 하네스는 "앞으로 만들어야 할 것"이었다.

**v3.0 시점(Phase 15 완료, Sprint 157)에서는 상황이 근본적으로 달라졌다.** Phase 10~14에서 이 전략의 3단계 로드맵 대부분이 실제로 구현되었고, 일부는 v2.0에서 "만들지 말라"고 했던 것도 포함된다. 이 v3.0은 **실제 구현 결과를 검증하고, 전략의 보수적 판단이 맞았는지/틀렸는지를 정리하며, Phase 16 이후 진짜 남은 과제를 식별**하는 것이 목적이다.

> **핵심 질문(v2.0):** "사람이 최소한만 개입하면서 시스템이 스스로 품질을 지키고, 실패에서 배우고, 점진적으로 더 나아지는 구조를 어떻게 만들 것인가?"
>
> **핵심 질문(v3.0):** "구조는 만들었다. 실제로 돌아가고 있는가? 데이터가 축적되고 있는가? 다음 단계에서 진짜 필요한 것은 무엇인가?"

**⚠️ 판단 기준(v2.0 유지):** 모든 설계 결정은 3가지 질문으로 검증한다: (1) 이것 없이도 돌아가는가? (2) 운영 비용이 얻는 가치보다 작은가? (3) 팀원 1명이 이해하고 수정할 수 있는가?

---

## 1. 벤치마킹 분석 (v2.0 원본 유지)

> 이 섹션은 v2.0의 벤치마킹 분석을 그대로 보존한다. OpenHarness, NLAH, claw-code 분석의 기본 인사이트는 여전히 유효하며, Phase 10~14 구현이 이 분석의 어떤 부분을 따랐고 어떤 부분을 벗어났는지는 §3에서 평가한다.

### 1.1 OpenHarness(HKUDS) 벤치마킹

OpenHarness는 홍콩대학교 HKUDS가 만든 오픈소스 에이전트 하네스 프레임워크다. Claude Code 아키텍처를 순수 Python으로 재구현했으며, "코드의 3%로 기능의 80%를 달성한다"는 것이 핵심 주장이다.

| 항목 | 내용 |
|------|------|
| 리포 | HKUDS/OpenHarness |
| 버전 | v0.1.0 (2026-04-01 초기 공개) |
| 언어 | Python ≥ 3.10 + React/Ink TUI (선택) |
| 10 서브시스템 | Engine, Tools(43+), Skills, Plugins, Permissions, Hooks, Commands(54), MCP, Memory, Coordinator |
| 핵심 특징 | 경량, 모듈식, 다중 LLM 백엔드, PreToolUse/PostToolUse 라이프사이클 |

핵심 판정(v2.0): Hook 파이프라인 확장(✅ 차용), 멀티에이전트(⏸ 보류), Durable Artifacts 방향 전환(✅ 차용). **v3.0 평가:** Hook 확장은 Phase 14 F334에서 완전 구현됨. 멀티에이전트는 Phase 14 F336 Agent Adapter로 사실상 구현됨(보류 판정이 뒤집어짐).

### 1.2 NLAH 논문(arxiv 2603.25723) 핵심 인사이트

| 발견 | Foundry-X 적용 | v3.0 이행 상태 |
|------|---------------|---------------|
| Durable Artifacts > Ephemeral Context | Git 파일 1차, D1 2차 | ⚠️ **부분 이행** — D1이 여전히 주 저장소, `.harness/` 디렉토리는 미도입 |
| Self-evolution은 수렴을 조인다 | 재시도마다 수렴 조건 축소 | ✅ F335 ConvergenceCriteria 구현 |
| Verifier가 기준과 어긋나면 해로움 | 기존 CI를 acceptance gate로 | ⚠️ **방향 전환** — O-G-D Discriminator를 별도 구축했으나, CI와 연동하여 실용적으로 운영 |
| 대부분의 케이스는 하네스와 무관 | 경계 케이스 15%에 집중 | ✅ 텔레메트리로 실패 패턴 식별 가능 |
| Task family별 효과적 모듈이 다름 | 태스크별 다른 하네스 프로파일 | ✅ .claude/agents/ 16종 역할 분화로 사실상 구현 |

### 1.3 claw-code 벤치마킹

| 차원 | claw-code | Foundry-X v2.0 Gap | v3.0 현재 |
|------|-----------|-------|-----------|
| 자율 워크플로우 | OmX $team/$ralph | 큼 → P2 | ✅ O-G-D Loop + Shaping O-G-D |
| 동등성 검증 | PARITY.md (기계 판독) | 작음 → P3 | △ SDD Triangle 유지, 기계 판독 매트릭스는 미도입 |
| 복구 루프 | Rust event loop + recovery | 큼 → **P1** | ✅ F335 Orchestration Loop (retry/adversarial/fix 3모드) |
| 하네스 설정 코드화 | CLAW.md 프로그래밍 로딩 | 중간 → P2 | ✅ .claude/ 완비 (rules 5 + hooks 5 + agents 16 + skills 15) |
| 병렬 세션 | lane state + parallel coding | 큼 → P2 | △ Sprint worktree 유지 (수동이지만 충분) |
| 상태 추적 | machine-readable lane state | 중간 → P2 | ✅ TaskState 10상태 + D1 + Dashboard |

---

## 2. 참조 프레임워크 교차 분석 (v2.0 원본 + v3.0 이행 상태)

### 2.1 기반영 항목 (Phase 6, 완료 — 변경 없음)

| F# | 원천 프레임워크 | 차용 개념 | 상태 |
|----|---------------|----------|------|
| F221 | BMAD | `.agent.yaml` 선언적 에이전트 정의 | ✅ |
| F222 | OpenSpec | `changes/` 구조화된 변경 디렉토리 | ✅ |
| F223 | BMAD | 문서 Sharding 자동화 | ✅ |
| F224~F228 | BMAD/OpenSpec | 슬래시 커맨드, Expansion Packs 등 | ✅ 벤치마킹 |
| F229~F231 | Oracle OpenSpec | Agent Spec 표준, Multi-repo | Watch 유지 |

### 2.2 2계층 루프 아키텍처 — v2.0 설계 vs v3.0 구현 현황

v2.0에서 "미반영 핵심 설계"로 분류한 2계층 루프 아키텍처가 **Phase 14(Sprint 148~152)에서 전량 구현**되었다:

```
[Layer 0] TaskState         → ✅ F333: 10상태 enum + D1 0095 + TransitionGuard (Sprint 148)
    ↓
[Layer 1] Hook System       → ✅ F334: EventBus + HookResultProcessor + TransitionTrigger (Sprint 149)
    ↓
[Layer 2] Event Bus         → ✅ F334: ExecutionEventService + D1 0096 + shared task-event.ts (Sprint 149)
    ↓
[Layer 3] Orchestration Loop → ✅ F335: 3모드(retry/adversarial/fix) + ConvergenceCriteria (Sprint 150)
    ↓
[Layer 4] Telemetry         → ✅ F335: TelemetryCollector + F337 Dashboard (Sprint 150, 152)
    ↓
[Layer 5] Guard Rail Refine → ⚠️ 부분 — Rules 5종 정적 배치(세션 #199), 자동 제안 미구현
```

**핵심 관찰:** v2.0에서 Sprint 99~108(10 Sprints)에 걸쳐 점진적으로 쌓으라고 한 것을 Phase 14에서 Sprint 148~152(5 Sprints)에 집중 구현했다. "Layer 0부터 순차적으로 쌓을 수 있다"는 원칙(§3.1)은 지켜졌으나, 타임라인은 계획 대비 약 50 Sprint 늦게, 그러나 절반의 Sprint 수로 완료했다.

---

## 3. Gap 분석: v2.0 전략 vs 실제 구현 (v3.0 신규)

### 3.1 3단계 로드맵 이행 평가

#### Stage 1: 자동 품질 게이트 — ✅ 완전 달성 (Phase 14 F333~F334 + 세션 #199)

| v2.0 계획 | 실제 구현 | 상세 |
|-----------|----------|------|
| TaskState 6-state enum | **10-state** enum | F333: PENDING→SPEC_DRAFTED→CODE_GENERATING→TEST_RUNNING→REVIEW_PENDING→FEEDBACK_LOOP→FIX_ATTEMPTING→APPROVED→DEPLOYED→FAILED. v2.0보다 3상태 추가(PENDING, FIX_ATTEMPTING, FAILED). TransitionGuard 포함 |
| Hook System (Pre/PostToolUse) | 완전 구현 | F334: EventBus + HookResultProcessor + TransitionTrigger. hooks/ 5종(PreToolUse 2 + PostToolUse 3) |
| Rules 5종 | 5종 완비 | 세션 #199: coding-style, git-workflow, testing, security, sdd-triangle |
| 커스텀 에이전트 3종 | **16종** | deploy-verifier, spec-checker, build-validator + ogd-3종 + shaping-3종 + six-hats-moderator + expert-5종 + auto-reviewer |

**판정:** Stage 1은 v2.0 계획을 초과 달성했다. 특히 에이전트가 3종→16종으로 5배 이상 증가한 것은 BD 도메인 특화 에이전트(shaping, six-hats, expert 시리즈)가 추가되었기 때문이다.

#### Stage 2: 셀프힐링 — ✅ 핵심 달성 (Phase 14 F335)

| v2.0 계획 | 실제 구현 | 상세 |
|-----------|----------|------|
| Event Bus (HarnessEvent 정규화) | ✅ | F334 ExecutionEventService + D1 execution_events |
| Orchestration Loop (3트리거) | ✅ 3모드 | F335: retry(동일 재실행), adversarial(O-G-D 품질 판정), fix(자동 수정) |
| "GAN Discriminator 대신 CI" | **⚠️ 방향 전환** | O-G-D Discriminator를 별도 구축(ogd-discriminator, shaping-discriminator). 단, CI와 연동하여 사용 |
| OpenSpace FIX 선택적 통합 | ✅ | F335 fix 모드 + F276 DERIVED 엔진 |
| `.harness/events/` JSON 파일 | ❌ 미구현 | D1 중심으로 진행. Durable Artifacts 원칙은 부분 이행 |

**판정:** Stage 2의 기능적 목표는 달성했다. 단, v2.0의 핵심 방향 전환이었던 "Durable Artifacts(Git 파일 1차)" 원칙은 **이행되지 않았고 D1이 주 저장소로 남아 있다**. 이것은 의도적 판단(D1의 쿼리 편의성)인지 누락인지 확인이 필요하다.

#### Stage 3: 자가 진화 — ✅ 대부분 달성 (Phase 10 + Phase 12)

| v2.0 계획 | 실제 구현 | 상세 |
|-----------|----------|------|
| Telemetry 대시보드 | ✅ | F337 Orchestration Dashboard: Kanban + LoopHistory + Telemetry 3뷰 |
| Guard Rail Refinement (수동 우선) | ✅ 수동 | Rules 5종 정적 배치, 자동 제안은 미구현 |
| DERIVED 모드 (단순한 것만) | ✅ 전체 구현 | F276: BD 7단계 반복 성공 패턴 자동 추출, D1 0082 |
| CAPTURED 모드 (보류) | **✅ 구현됨** | F277: 크로스 도메인 워크플로우 캡처 + 메타 스킬, D1 0083 |
| 팀 스킬 레지스트리 (보류) | **✅ 구현됨** | F275: ax-marketplace 확장, 시맨틱 검색 + 버전 추적, D1 0081 |
| BD ROI 벤치마크 (보류) | **✅ 구현됨** | F278: Cold Start vs Warm Run, BD_ROI 공식, D1 0084 |
| 태스크 패밀리별 프로파일 | △ 간접 달성 | .claude/agents/ 16종 역할 분화 + .claude/skills/ 도메인별 분리로 사실상 프로파일 효과. 단, `.claude/profiles/` 형태는 아님 |

**판정:** v2.0에서 "보류" 또는 "ROI 확인 후"로 분류한 4개 항목(CAPTURED, 팀 레지스트리, GDPVal, 자동 멀티에이전트) 중 3개가 Phase 10에서 구현되었다. 이 판단의 평가는 §3.3에서 다룬다.

### 3.2 수치 변화 요약

| 항목 | v2.0 기준 (Phase 9) | v3.0 현재 (Phase 15) | 변화 |
|------|---------------------|---------------------|------|
| Services | 169 | 208 | +39 (+23%) |
| Routes | 73 | 90 | +17 (+23%) |
| Zod Schemas | 87 | 105 | +18 (+21%) |
| Tests | ~2,700 | 3,148 | +448 (+17%) |
| D1 Migrations | 0078 | 0101 | +23 |
| .claude/ agents | 3 | 16 | +13 |
| .claude/ skills | ~5 | 15 | +10 |
| .claude/ hooks | 3 | 5 | +2 |
| .claude/ rules | 0 | 5 | +5 |
| E2E specs | 35 | 35+ (3 추가) | +3 |

### 3.3 v2.0 보수적 판단의 사후 평가

v2.0의 핵심 태도는 "거창함 경계, 효율성·지속가능성·확장가능성 중심"이었다. 실제로 어떤 결과를 냈는가?

**v2.0이 맞았던 것:**

1. **"Layer 0부터 순차적으로 쌓는다"** — Phase 14에서 F333(TaskState) → F334(Hook+EventBus) → F335(Orchestration Loop) → F336(Agent Adapter) → F337(Dashboard) 순서로 정확히 이행됐다. 각 Sprint이 이전 Sprint에 의존하는 점진적 강화 패턴이 유효했다.

2. **"인간은 판사, 시스템은 변호사"** — 자동 커밋 절대 금지 원칙이 유지되고 있다. O-G-D를 구축했지만 최종 판단은 여전히 사람이 한다.

3. **"측정 없이 진화 없다"** — Phase 10 F274(스킬 실행 메트릭 수집)이 5-Track Skill Evolution의 첫 번째 항목이었다. 측정 인프라가 먼저 구축되고 나서 DERIVED/CAPTURED가 뒤따랐다.

4. **"태스크 패밀리별 프로파일"** — 단일 거대 하네스 대신, 16종 에이전트 × 15종 스킬로 역할 분화가 이뤄졌다. `.claude/profiles/` 디렉토리 형태는 아니지만, 에이전트별 전문화로 같은 효과를 달성했다.

**v2.0이 틀렸던 것 (그리고 왜):**

1. **"GAN Discriminator 만들지 말라"** → 만들었고, 잘 동작한다.
   - v2.0 근거: NLAH 논문 발견 3 (Verifier 기준 불일치 위험)
   - 실제: O-G-D Discriminator는 CI와 독립적으로 판단하지 않고, **Rubric 기반 구조화된 평가 기준**을 사용한다. NLAH가 경고한 "독자적 기준의 Verifier"와는 다른 설계다. Rubric이 CI 기준과 정렬되어 있으므로 불일치 위험이 완화됐다.
   - **교훈:** "Discriminator를 만들지 말라"가 아니라 "Discriminator의 판정 기준을 acceptance criteria와 정렬하라"가 맞는 원칙이었다.

2. **"CAPTURED 모드는 복잡도 대비 ROI 불확실하므로 보류"** → 만들었고, Phase 12에서 통합됨.
   - v2.0 근거: 과잉 설계 경계
   - 실제: CAPTURED(F277)는 D1 0083 3테이블 + API 8 endpoints + 35 tests로, 건당 구현 규모가 DERIVED(F276)와 비슷했다. Phase 12 Skill Unification(F303~F308)에서 3개 스킬 시스템이 통합될 때 CAPTURED가 크로스 도메인 연결 고리로 작용했다.
   - **교훈:** 단독으로 보면 ROI가 불확실하지만, 시스템 통합 시 연결 고리 역할을 한다면 가치가 있다. "만들지 말라"보다 "통합 시점까지 보류"가 더 정확한 판정이었을 것이다.

3. **"팀 스킬 레지스트리는 팀 규모에서 오버헤드 > 이득"** → 만들었고, BD 데모에 활용됨.
   - v2.0 근거: 소규모 팀에서 공유 오버헤드
   - 실제: F275 스킬 레지스트리는 팀 공유보다 **스킬 버전 추적 + 안전성 검사 + 시맨틱 검색**의 인프라로 더 큰 가치를 냈다. BD 데모 데이터(F279~F281)에서 스킬 카탈로그의 완성도가 고객 시연에 직접 기여했다.
   - **교훈:** "팀 공유"라는 프레이밍이 가치를 좁게 봤다. "스킬 품질 관리 인프라"로 보면 소규모 팀에서도 가치가 있다.

4. **"자동 멀티에이전트 오케스트레이션은 Stage 2 이후"** → Phase 14에서 구현됨.
   - v2.0 근거: Sprint worktree로 당장의 필요 충족
   - 실제: F336 Agent Adapter(5 Adapter + Registry + Factory)가 멀티에이전트 오케스트레이션의 기반이 됐다. 다만 이것은 "자율 병렬 실행"이 아니라 **"에이전트 간 인터페이스 표준화"** 성격이므로, v2.0이 우려한 것(자율 병렬의 복잡성)과는 다른 형태로 구현됐다.

**v2.0이 아직 판정 불가한 것:**

1. **Durable Artifacts vs D1** — v2.0은 `.harness/events/` JSON 파일을 1차 저장소로 추천했지만, 실제로는 D1이 주 저장소로 남아 있다. Git 리포 안의 이벤트 파일은 도입되지 않았다. D1의 쿼리 편의성이 당장의 운영에서 더 실용적이었을 수 있지만, "Git이 진실" 철학과의 정합성은 장기적으로 재검토할 가치가 있다.

2. **Guard Rail 자동 제안** — Rules 5종이 정적으로 배치되었지만, 텔레메트리 데이터를 기반으로 새 Rule을 자동 제안하는 시스템(Layer 5)은 미구현이다. 데이터는 충분히 쌓이고 있는가?

---

## 4. 설계 원칙 — v3.0 갱신

v2.0의 7개 원칙 중 5개는 유효하고, 2개는 수정이 필요하다.

| # | 원칙 | v2.0 | v3.0 상태 |
|---|------|------|----------|
| 1 | 점진적 강화 | Layer 0부터 순차적 | ✅ 유효 — Phase 14가 이 원칙을 정확히 따랐다 |
| 2 | 실패가 데이터 | 실패를 구조화된 이벤트로 | ✅ 유효 — EventBus + execution_events 구현됨 |
| 3 | 인간은 판사 | 최종 커밋 권한은 사람 | ✅ 유효 — 자동 커밋 절대 금지 유지 |
| 4 | 측정 없이 진화 없다 | 텔레메트리 선행 | ✅ 유효 — F274(메트릭 수집)이 F276~F278 선행 |
| 5 | 기존 인프라 우선 | 새로 만들기 전에 있는 것 활용 | ⚠️ **수정** — O-G-D Discriminator처럼, "만들지 말라"가 아니라 **"기존 기준과 정렬하라"**가 더 정확하다 |
| 6 | Durable Artifacts | Git 파일 1차, D1 2차 | ⚠️ **미이행** — D1이 주 저장소. 재검토 필요 |
| 7 | 태스크 패밀리별 프로파일 | BD 태스크별 다른 하네스 | ✅ 유효 — 에이전트 16종 + 스킬 15종으로 달성 |

**수정된 원칙 5 (v3.0):** "새 컴포넌트를 만들기 전에 기존 것을 활용한다"는 유효하지만, "절대 만들지 말라"로 해석하면 안 된다. 올바른 기준은 **"새 컴포넌트가 기존 acceptance criteria(CI, 테스트, 린트)와 정렬되는가?"**이다. 정렬되면 만들어도 된다.

---

## 5. 현재 아키텍처 스냅샷 (v3.0 신규)

v2.0의 아키텍처 다이어그램을 실제 구현 기준으로 갱신한다.

```
┌─────────────────────────────────────────────────────────────────┐
│               Foundry-X Self-Evolving Harness (v3.0 현재)        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Stage 1: Quality Gate ── ✅ COMPLETED ─────────────────┐    │
│  │                                                          │    │
│  │  [TaskState 10상태]──→[Hooks 5종]──→[Rules 5종]          │    │
│  │       │ F333              │ F334         │ 세션#199      │    │
│  │       │                   │              │               │    │
│  │  [TransitionGuard]   [EventBus]    [Agents 16종]         │    │
│  │       │ D1 0095      │ D1 0096     │ .claude/agents/     │    │
│  │       └───────────────┴─────────────┘                    │    │
│  └──────────────────────┬───────────────────────────────────┘    │
│                         │ (실패 이벤트)                           │
│  ┌─ Stage 2: Self-Healing ── ✅ COMPLETED ─────────────────┐    │
│  │                         ▼                                │    │
│  │  [Orchestration Loop 3모드]──→[Agent Adapter 5종]        │    │
│  │       │ F335                    │ F336                   │    │
│  │   retry│adversarial│fix     [Registry + Factory]         │    │
│  │       │              │          │                        │    │
│  │  [ConvergenceCriteria]    [YAML role 태깅]               │    │
│  │       │                         │                        │    │
│  │  실패→ human escalation         │                        │    │
│  │       └─────────────────────────┘                        │    │
│  └──────────────────────┬───────────────────────────────────┘    │
│                         │ (축적된 데이터)                         │
│  ┌─ Stage 3: Self-Evolving ── ⚠️ 80% COMPLETED ───────────┐    │
│  │                         ▼                                │    │
│  │  [Telemetry Dashboard]──→[Skill Evolution 5-Track]       │    │
│  │       │ F337                  │                          │    │
│  │   Kanban│LoopHistory│Cost  Track A: 메트릭 수집 (F274)   │    │
│  │       │                    Track C: DERIVED (F276)       │    │
│  │       │                    Track C: CAPTURED (F277)      │    │
│  │       │                    Track D: 레지스트리 (F275)      │    │
│  │       │                    Track E: BD ROI (F278)        │    │
│  │       │                         │                        │    │
│  │  [Guard Rail Refinement]   [Phase 12 통합]               │    │
│  │       │ Rules 5종 (정적)    │ F303~F308                  │    │
│  │       │ ⚠️ 자동 제안 미구현  │ 3개 스킬 시스템 통합        │    │
│  │       └─────────────────────┘                            │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─ Phase 16: Prototype Auto-Gen ── 📋 REGISTERED ─────────┐    │
│  │  F351: Builder Server + Docker 격리                       │    │
│  │  F352: CLI --bare PoC                                     │    │
│  │  F353: D1 + Prototype API                                 │    │
│  │  F354: Fallback 아키텍처 + 비용 모니터링                    │    │
│  │  F355: O-G-D 품질 루프 (하네스 재활용)                      │    │
│  │  F356: Prototype 대시보드 + 피드백 Loop                     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Phase 16 이후 — 진짜 남은 과제 (v3.0 신규)

### 6.1 완료되지 않은 v2.0 항목

| 항목 | v2.0 계획 | 현재 상태 | 필요성 재판정 |
|------|----------|----------|-------------|
| `.harness/events/` Git 파일 기반 이벤트 | Durable Artifacts 원칙 | ❌ 미구현 | **낮음** — D1 + Dashboard가 충분히 실용적. Git 리포에 이벤트 JSON을 넣으면 커밋 노이즈가 됨. 원칙은 좋으나 실용성에서 D1이 우세 |
| Guard Rail 자동 제안 | Layer 5 | ❌ 미구현 | **중간** — 텔레메트리 데이터가 3,148 tests + execution_events에 쌓이고 있으나, 반복 실패 패턴을 자동으로 Rule로 변환하는 것은 Phase 17+ |
| CLAUDE.md 자동 압축 | v2.0 부록 B | ❌ 미구현 | **낮음** — 현재 CLAUDE.md가 실용적 크기 유지 |

### 6.2 Phase 16 — Prototype Auto-Gen의 하네스 관점

Phase 16(F351~F356)은 "PRD → Prototype 자동 생성" 파이프라인이다. 하네스 관점에서 주목할 점:

1. **F355 O-G-D 품질 루프:** Phase 14에서 구축한 Orchestration Loop + O-G-D를 Prototype 생성에 재활용한다. 이것이 자가 발전 하네스의 첫 번째 **도메인 간 재사용** 사례가 된다.

2. **F352 CLI `--bare` 모드:** Claude Code를 서버 환경에서 실행하는 것은 하네스의 runtime 경계를 확장하는 것이다. `.claude/` 설정(rules, hooks, agents)이 서버 환경에서도 동작하는지 검증해야 한다.

3. **F354 비용 모니터링:** Haiku 모델 ~$0.5/건의 비용 실측은 v2.0 원칙 4("측정 없이 진화 없다")의 직접적 실천이다. 이 데이터가 BD ROI 벤치마크(F278)와 연동되면 프로토타입 생성의 경제성을 정량 평가할 수 있다.

### 6.3 Phase 17+ 후보 — 하네스 고도화 방향

Phase 16 이후, 하네스 관점에서 의미 있는 다음 단계를 우선순위로 제시한다:

| 우선도 | 항목 | 근거 | 선행 조건 |
|--------|------|------|----------|
| **P1** | Guard Rail 자동 제안 (반자동) | execution_events 데이터로 "이 패턴에서 자주 실패함" → Rule 초안 생성 → 사람 승인 | Phase 16 텔레메트리 누적 3개월+ |
| **P1** | O-G-D Loop 범용화 | Phase 16 F355에서 Prototype에 재활용 성공 시, BD 외 도메인(코드 리뷰, 문서 검증 등)에도 적용 | F355 성공적 운영 |
| **P2** | 에이전트 자기 평가 데이터 활용 | F148(에이전트 자기 평가)이 이미 구현되어 있으나, 이 데이터를 Guard Rail 개선에 연결하는 루프가 없음 | Guard Rail 자동 제안 인프라 |
| **P2** | Skill Evolution 운영 지표 | DERIVED/CAPTURED/레지스트리가 구축되었지만, "실제 재사용된 스킬 수", "DERIVED 스킬의 성공률" 등 운영 지표가 아직 대시보드에 없음 | Phase 16 대시보드 확장 |
| **P3** | .harness/ Git 기반 상태 (선택적) | CI/CD 파이프라인에서 D1 없이도 하네스 상태를 확인해야 하는 경우에 한해 도입 | 실제 필요 발생 시 |

---

## 7. 위험 요소 — v3.0 갱신

### 7.1 해소된 위험 (v2.0 → v3.0)

| v2.0 위험 | 완화 결과 |
|-----------|----------|
| 셀프힐링 무한 루프 | ✅ F335 ConvergenceCriteria + max 3 rounds로 해소 |
| Hook이 개발 속도 저해 | ✅ 15s timeout 유지 + 비동기 실행. 운영 시간 내 문제 없음 |
| 과잉 설계 (Over-engineering) | ⚠️ 부분 해소 — CAPTURED/레지스트리를 만들었으나 유효하게 운영 중 |
| Verifier 기준 불일치 | ✅ Rubric 기반 Discriminator로 acceptance criteria 정렬 |
| 범용 하네스의 함정 | ✅ 에이전트 16종 역할 분화로 해소 |

### 7.2 새로운 위험 (v3.0)

| 위험 | 심각도 | 완화 전략 |
|------|--------|----------|
| 하네스 인프라 미활용 (built but unused) | **높음** | Phase 16에서 O-G-D 재활용(F355)이 리트머스 테스트. 재활용 안 되면 인프라 축소 검토 |
| 에이전트 16종 관리 복잡도 | 중간 | 세션 #199에서 Gap 0 달성했지만, 에이전트별 활용 빈도 측정 필요. 미사용 에이전트 정리 |
| 텔레메트리 데이터 해석 부재 | 중간 | Dashboard(F337)는 있지만, 데이터를 보고 행동을 바꾸는 루프가 수동. Guard Rail 자동 제안(P1)으로 완화 |
| Phase 16 Builder Server 보안 | 높음 | Docker 격리(F351) + API 키 인증으로 1차 대응. 프로덕션 전 보안 리뷰 필수 |
| D1 마이그레이션 누적 (0101개) | 낮음 | 당장은 문제없으나, 200개 초과 시 마이그레이션 관리 전략 재검토 |

---

## 8. 성공 지표 — v3.0 갱신

### 8.1 v2.0 지표 달성 현황

| 지표 | v2.0 Stage 1 목표 | v2.0 Stage 2 목표 | v2.0 Stage 3 목표 | v3.0 현재 |
|------|-------------------|-------------------|-------------------|----------|
| 보호 파일 차단율 | 100% | 유지 | 유지 | ✅ 100% (PreToolUse hook) |
| Hook 커버리지 | > 90% | 유지 | 유지 | ✅ hooks/ 5종 커버 |
| 자동 복구 성공률 | — | > 60% | > 70% | ⚠️ 측정 인프라 있음, 운영 데이터 미확인 |
| 실제 재사용 스킬 수 | — | — | > 5개 | ⚠️ 15종 등록, 실제 재사용률 미측정 |
| 태스크 프로파일 수 | — | — | 4종+ | ✅ 16종 에이전트 (목표 초과) |
| `--no-verify` 비율 | < 20% | < 15% | < 10% | ⚠️ 미측정 |
| 토큰 소비 추세 | 기준선 | — | -15% | ⚠️ F278 BD ROI 인프라 있음, 추세 미확인 |

### 8.2 v3.0 새로운 지표

| 지표 | Phase 16 목표 | Phase 17+ 목표 | 측정 방법 |
|------|-------------|---------------|----------|
| O-G-D Loop 도메인 간 재활용 수 | ≥ 1 (Prototype) | ≥ 3 | F355 성공 여부 + 이후 적용 건수 |
| Guard Rail 자동 제안 → 채택률 | — | > 50% | 제안 건 중 사람 승인 비율 |
| Prototype 생성 비용/건 | ≤ $1.0 (Haiku) | ≤ $0.5 | F354 비용 모니터링 |
| 에이전트 활용률 (16종 중) | — | > 75% 월 1회+ 사용 | execution_events 집계 |
| DERIVED 스킬 실제 재사용 | — | > 30% (생성 대비) | skill_executions × skill_lineage JOIN |

---

## 9. 결론

### 9.1 v2.0 → v3.0 핵심 변화

| 차원 | v2.0 (Phase 9, 계획) | v3.0 (Phase 15, 현실) |
|------|---------------------|---------------------|
| 3단계 로드맵 | Sprint 99~108 예정 | Stage 1~2 ✅ 완료, Stage 3 80% (Phase 10~14) |
| "만들지 말라" 항목 | 6개 보류 | 4개 구현됨, 1개 불필요 확인, 1개 미이행 |
| 보수적 판단 | 효과적이었으나 일부 과도 | "만들지 말라" → "기존 기준과 정렬하라"로 수정 |
| 핵심 미해결 | 전체가 미해결 | Guard Rail 자동 제안 + 운영 지표 활용 루프 |
| 다음 방향 | Stage 1 착수 | Phase 16 하네스 재활용 + Phase 17 Guard Rail 자동화 |

### 9.2 핵심 교훈

**교훈 1: "만들지 말라"는 좋은 기본값이지만, 시스템 통합 시 가치가 달라진다.**
CAPTURED와 팀 레지스트리는 단독으로는 ROI가 불확실했지만, Phase 12 Skill Unification에서 연결 고리 역할을 하며 가치를 증명했다. "만들지 말라" 대신 **"통합 시점까지 독립적으로 가치를 내는지 확인하라"**가 더 정확하다.

**교훈 2: 보수적 전략 + 빠른 이터레이션이 최선이다.**
v2.0의 보수성이 무의미했던 것은 아니다. 보수적 기준을 세워놓고, 실제 필요가 확인되면 빠르게 구현하는 패턴이 유효했다. "계획 없이 만드는 것"보다 "보수적으로 계획하고 필요하면 뒤집는 것"이 낫다.

**교훈 3: 인프라는 만드는 것보다 활용하는 것이 어렵다.**
Phase 10~14에서 상당한 하네스 인프라가 구축되었다. Phase 16+의 진짜 과제는 **"이 인프라가 실제로 쓰이고 있는지 측정하고, 안 쓰이는 것은 정리하는 것"**이다.

### 9.3 즉시 실행 가능한 것 (v3.0)

Phase 16 착수 시점에서 바로 확인/실행할 것:

1. **F355 O-G-D Loop 재활용 검증** — Phase 14 Orchestration Loop이 Prototype 생성에 실제로 재활용되는지 확인. 이것이 하네스 투자의 ROI 증명.
2. **에이전트 활용률 측정** — 16종 에이전트 중 월 1회 이상 사용되는 것이 몇 종인지 execution_events에서 집계. 미사용 에이전트는 정리 후보.
3. **DERIVED/CAPTURED 스킬 운영 지표** — skill_executions × skill_lineage에서 "생성된 스킬 중 실제 재실행된 비율"을 1회 집계. 30% 미만이면 진화 엔진의 실효성 재검토.

---

## 부록 A: 참조 문서 인덱스

| 문서 | 경로 | 용도 |
|------|------|------|
| 통합 반영 계획 v2.1 | `FX-Unified-Integration-Plan.md` | 2계층 루프 아키텍처 상세 |
| OpenSpace 분석 | `openspace-analysis-and-integration-plan.md` | 스킬 자동 진화 모델 |
| ECC 분석 | `ECC-to-FX-Analysis-Plan.md` | Hooks/Rules/Instinct |
| Optio 분석 | `Optio-Analysis-and-FX-Plan.md` | 상태머신/피드백 루프 |
| GAN Agent 설계 | `harness-gan-agent-architecture.md` | O-G-D 오케스트레이션 |
| Phase 6 벤치마킹 | `SPEC.md §5 (F220~F231)` | OpenSpec/BMAD 차용 항목 |
| claw-code | `github.com/ultraworkers/claw-code` | 자율 하네스 벤치마킹 |
| OpenHarness | `github.com/HKUDS/OpenHarness` | 경량 모듈식 하네스 참조 구현 |
| NLAH 논문 | `arxiv.org/abs/2603.25723` | 하네스 설계의 학술적 검증 |
| **Phase 14 구현** *(v3.0)* | `SPEC.md §5 (F333~F337)` | 2계층 루프 실제 구현 상세 |
| **Phase 10 Skill Evolution** *(v3.0)* | `SPEC.md §5 (F274~F278)` | 5-Track Skill Evolution 구현 |
| **Phase 12 Skill Unification** *(v3.0)* | `SPEC.md §5 (F303~F308)` | 3개 스킬 시스템 통합 |
| **Phase 16 PRD** *(v3.0)* | `docs/specs/prototype-auto-gen/prd-final.md` | Prototype Auto-Gen 요구사항 |

## 부록 B: "만들지 말아야 할 것" 목록 — v3.0 재판정

v2.0에서 6개 항목을 "만들지 말라"로 분류했다. 실제 결과를 반영한 재판정:

| 항목 | v2.0 판정 | v3.0 실제 | 재판정 | 교훈 |
|------|----------|----------|--------|------|
| 별도 GAN Discriminator | ❌ 만들지 말라 | ✅ 구현 (ogd-discriminator, shaping-discriminator) | **원칙 수정**: "만들지 말라" → "acceptance criteria와 정렬하라" | Rubric 기반이면 Verifier 리스크 완화 |
| CAPTURED 모드 | ❌ 보류 | ✅ 구현 (F277, D1 0083) | **판정 뒤집힘**: Phase 12 통합에서 연결 고리 역할 | 단독 ROI < 시스템 통합 ROI |
| 팀 스킬 레지스트리 | ❌ 보류 | ✅ 구현 (F275, D1 0081) | **판정 뒤집힘**: 스킬 품질 관리 인프라로 가치 | "팀 공유" 프레이밍이 가치를 좁게 봤음 |
| 자동 멀티에이전트 | ❌ Stage 2 이후 | ✅ 구현 (F336 Agent Adapter) | **형태 변경**: 자율 병렬이 아닌 인터페이스 표준화 | 구현 형태가 우려와 달랐음 |
| 전체 GDPVal 벤치마크 | ❌ 토큰 추세만 | △ 부분 구현 (F278 BD ROI) | **유효**: BD 특화 ROI만으로 충분, 전체 GDPVal은 여전히 불필요 | 도메인 특화가 범용보다 실용적 |
| CLAUDE.md 자동 압축 | ❌ 불필요 | ❌ 미구현 | **유효**: 여전히 불필요 | CLAUDE.md가 실용적 크기 유지 |

### v3.0 신규 — "만들지 말아야 할 것"

| 항목 | 보류 이유 | 재검토 조건 |
|------|----------|-----------|
| `.harness/events/` Git 기반 이벤트 | D1이 더 실용적, Git 커밋 노이즈 우려 | CI/CD에서 D1 없이 하네스 상태 확인 필요 발생 시 |
| Guard Rail 완전 자동화 (사람 승인 없이) | 자동 생성 Rule의 품질 보장 불가 | Guard Rail 반자동 운영 6개월+ |
| 에이전트 자율 커밋 | BD 도메인 컴플라이언스 기준 | 조직 정책 변경 시 |
| 범용 하네스 프로파일 시스템 | 에이전트 역할 분화로 사실상 달성 | 에이전트 30종+ 초과 시 관리 방식 재검토 |

---

## 부록 C: 버전 히스토리

| 버전 | 날짜 | 기준 Phase | 주요 변경 |
|------|------|-----------|----------|
| v1.0 | 2026-04-05 | Phase 9 / Sprint 98 | 초기 전략: claw-code 분석 + 3단계 로드맵 |
| v2.0 | 2026-04-06 | Phase 9 / Sprint 98 | OpenHarness/NLAH 추가 + 실용성 보강 + "만들지 말라" 목록 |
| v3.0 | 2026-04-06 | Phase 15 / Sprint 157 | Phase 10~15 구현 반영 + Gap 분석 + 재판정 + Phase 16+ 방향 |
