# Harness × GAN Agent Architecture 설계서

> **revfactory/harness** 분석 + GAN(생성적 적대 신경망) 개념을 Agent 오케스트레이션에 적용한 아키텍처 설계

---

## 1. revfactory/harness 분석 요약

### 1.1 Harness란?

Harness는 **메타 스킬(meta-skill)** — 도메인 특화 에이전트 팀을 설계하고, 각 에이전트가 사용할 스킬을 자동 생성하는 Claude Code 플러그인이다. 6단계 워크플로우를 통해 `.claude/agents/`에 에이전트를, `.claude/skills/`에 스킬을 생성한다.

### 1.2 핵심 구조

```
harness/
├── .claude-plugin/plugin.json    # 플러그인 매니페스트
└── skills/harness/
    ├── SKILL.md                  # 6단계 워크플로우 (메인 스킬)
    └── references/               # 참조 문서 (Progressive Disclosure)
        ├── agent-design-patterns.md   # 6가지 팀 패턴
        ├── orchestrator-template.md   # 오케스트레이터 템플릿 (팀/서브)
        ├── team-examples.md           # 5가지 팀 구성 예제
        ├── qa-agent-guide.md          # QA 에이전트 가이드
        ├── skill-writing-guide.md     # 스킬 작성 가이드
        └── skill-testing-guide.md     # 스킬 테스트 가이드
```

### 1.3 6단계 워크플로우

| Phase | 이름 | 설명 |
|-------|------|------|
| 1 | Domain Analysis | 프로젝트 도메인, 태스크 유형, 기술 수준 파악 |
| 2 | Architecture Design | 실행 모드(팀/서브) + 팀 패턴 선택 |
| 3 | Agent Definition | `.claude/agents/{name}.md` 파일 생성 |
| 4 | Skill Generation | `.claude/skills/{name}/skill.md` 생성 (~500줄 이내) |
| 5 | Integration & Orchestration | TeamCreate/TaskCreate 또는 Agent 호출로 조율 |
| 6 | Validation & Testing | 구조 검증 + 트리거 테스트 + 베이스라인 대비 비교 |

### 1.4 6가지 팀 패턴

| 패턴 | 구조 | 적합 상황 |
|------|------|-----------|
| **Pipeline** | A → B → C → D | 순차 의존성이 강한 작업 |
| **Fan-out/Fan-in** | 병렬 수행 → 통합 | 독립적 병렬 조사/분석 |
| **Expert Pool** | 라우터 → 전문가 선택 호출 | 입력 유형별 분기 |
| **Generation-Validation** | 생성 → 검증 → (재생성 루프) | 품질 보장이 핵심인 산출물 |
| **Supervisor** | 감독자 → 동적 워커 배정 | 런타임 작업 분배 |
| **Hierarchical Delegation** | 상위 → 하위 재귀 분해 | 대규모 계층적 작업 |

### 1.5 핵심 설계 원칙

- **에이전트 팀 모드가 기본값** — 서브 에이전트는 통신 불필요 시에만
- **모든 에이전트는 파일로 정의** — `.claude/agents/{name}.md` 필수
- **Progressive Disclosure** — 메타데이터 항상 로드, skill.md 트리거 시, references/ 필요 시
- **"Why" over Rules** — 규칙 대신 이유를 설명하여 에지 케이스 대응력 확보
- **재시도 상한 필수** — 루프 패턴에서 무한 반복 방지 (2~3회)

---

## 2. GAN → Agent 아키텍처 매핑

### 2.1 GAN의 핵심 메커니즘

GAN은 두 네트워크의 **적대적 경쟁**을 통해 품질을 높이는 구조다:

```
Generator(G) ──생성──→ 산출물
                         ↓
Discriminator(D) ──판별──→ 진짜/가짜 판정
                         ↓
              피드백 → Generator 개선
```

핵심 인사이트: G와 D가 서로를 밀어올리는 **min-max 게임**이 수렴하면 D가 진짜와 가짜를 구별할 수 없는 수준의 품질에 도달한다.

### 2.2 Agent 아키텍처로의 매핑

| GAN 개념 | Agent 아키텍처 대응 | 역할 |
|----------|---------------------|------|
| **Training Loop** | **Orchestrator** | 전체 프로세스 조율, 수렴 판정, 반복 제어 |
| **Generator** | **Generator Agent(들)** | 산출물 생성 (코드, 문서, 분석 등) |
| **Discriminator** | **Discriminator Agent(들)** | 산출물 품질 판별, 구체적 피드백 생성 |
| **Loss Function** | **품질 기준 (Rubric)** | 판별 기준 — 정량+정성 메트릭 |
| **Convergence** | **Pass 판정 or 최대 반복 도달** | 종료 조건 |

### 2.3 Harness의 Generation-Validation 패턴과의 비교

Harness의 기존 **Generation-Validation(생성-검증)** 패턴은 GAN의 단순화 버전이다:

```
[Harness 기존]    Generator → Reviewer → (Pass/Fix/Redo)
[GAN 확장]        Generator → Discriminator → 상세 피드백 → Generator 재생성
                                                   ↑
                                          Orchestrator: 수렴 판정 + 전략 조정
```

**GAN 확장이 더하는 가치:**

1. **적대적 긴장(Adversarial Tension):** Discriminator가 단순 Pass/Fail이 아니라, Generator를 "속이려는" 수준까지 끌어올리는 구체적이고 도전적인 피드백을 생성
2. **Rubric 진화:** Orchestrator가 매 라운드마다 품질 기준을 정교화 — GAN에서 학습률(learning rate)을 조정하는 것에 대응
3. **Mode Collapse 방지:** Generator가 한 가지 패턴에 갇히지 않도록 Orchestrator가 다양성 체크

---

## 3. O-G-D 아키텍처 상세 설계

### 3.1 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────┐
│                   ORCHESTRATOR                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ 태스크 분해  │  │ 수렴 판정기  │  │ 전략 조정기│ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│         │                ↑                 │        │
│         ▼                │                 ▼        │
│  ┌──────────────────────────────────────────────┐   │
│  │            Adversarial Loop Controller        │   │
│  │  round = 0                                    │   │
│  │  while round < MAX_ROUNDS && !converged:      │   │
│  │    1. Generator 호출 (with feedback[round-1]) │   │
│  │    2. Discriminator 판별 (with rubric[round]) │   │
│  │    3. 수렴 체크                               │   │
│  │    4. 전략 조정 (필요 시)                     │   │
│  │    round++                                    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         │                              │
    ┌────▼────┐                   ┌─────▼─────┐
    │GENERATOR│◄── 피드백 ────────│DISCRIMINATOR│
    │         │                   │            │
    │ 산출물  │──── 산출물 ──────▶│ 판별+피드백│
    │ 생성    │                   │ 생성       │
    └─────────┘                   └────────────┘
```

### 3.2 각 역할 상세

#### Orchestrator (훈련 루프 = 조율자)

Orchestrator는 GAN의 학습 루프에 대응한다. 전체 프로세스를 조율하고, 수렴 여부를 판정하며, G와 D 양쪽의 전략을 조정한다.

**핵심 책임:**
- 태스크 분해 및 Generator/Discriminator에 작업 할당
- Rubric(품질 기준) 정의 및 라운드별 정교화
- 수렴 판정 — "Discriminator가 더 이상 결함을 찾지 못하는가?"
- Mode Collapse 감지 — Generator가 동일 패턴만 반복하는지 체크
- 최대 반복 횟수 강제 (MAX_ROUNDS = 3, 하드 리밋)

**의사결정 트리:**
```
Discriminator 판정 결과?
├─ PASS (결함 없음) → 수렴 완료, 최종 산출물 채택
├─ MINOR_FIX (사소한 수정) → Generator에 피드백 전달, 부분 재생성
├─ MAJOR_ISSUE (구조적 문제) → 전략 조정 후 Generator 전면 재생성
└─ round >= MAX_ROUNDS → 최선 산출물 채택 + 미해결 이슈 목록 첨부
```

#### Generator Agent(들) (생성자)

산출물을 실제로 만들어내는 에이전트. 도메인에 따라 복수 Generator가 병렬로 동작할 수 있다 (Fan-out + GAN 하이브리드).

**핵심 책임:**
- 초기 산출물 생성 (round 0)
- Discriminator 피드백 기반 개선 (round 1+)
- 피드백 수용 시 "무엇을 어떻게 변경했는지" 변경 로그 생성

**GAN에서 차용한 행동 원칙:**
- **Discriminator를 속여라:** 단순 수정이 아니라, Discriminator가 결함을 찾기 어렵도록 근본적으로 개선
- **다양성 유지:** 이전 라운드와 다른 접근 방식 시도 (Mode Collapse 방지)
- **자기 비판 금지:** Generator는 자기 산출물의 품질을 판단하지 않음 — 그건 Discriminator의 역할

#### Discriminator Agent(들) (판별자)

산출물의 품질을 냉정하게 판별하고, Generator가 개선할 수 있는 구체적 피드백을 생성하는 에이전트.

**핵심 책임:**
- Rubric 기반 체계적 평가
- 결함의 심각도 분류 (Critical / Major / Minor / Suggestion)
- 구체적이고 실행 가능한 피드백 생성 ("여기가 나쁘다"가 아니라 "이 부분을 이렇게 바꾸면 이 기준을 충족한다")
- Pass/Fail 최종 판정

**GAN에서 차용한 행동 원칙:**
- **진짜 기준을 알아라:** 도메인의 "진짜 좋은 산출물"이 무엇인지 참조 (Ground Truth)
- **쉽게 통과시키지 마라:** 적대적 긴장을 유지 — 너무 쉽게 Pass하면 품질 향상이 멈춤
- **하지만 공정하라:** 근거 없는 비판 금지, 모든 피드백에 Rubric 항목 참조 필수

### 3.3 데이터 흐름 프로토콜

```
Round 0:
  Orchestrator → Generator:  { task, rubric, context }
  Generator → _workspace/:   { artifact_v0 }
  Generator → Discriminator: { artifact_v0, change_log: "initial" }

Round N (N ≥ 1):
  Discriminator → Generator:  { verdict, feedback[], severity_map }
  Generator → _workspace/:    { artifact_vN }
  Generator → Discriminator:  { artifact_vN, change_log, prev_feedback_addressed }

Final:
  Discriminator → Orchestrator: { verdict: "PASS", final_score, residual_notes }
  Orchestrator → 사용자:         { final_artifact, quality_report, round_history }
```

### 3.4 수렴 메트릭

GAN의 손실 함수(Loss Function)에 대응하는 **품질 점수 체계:**

```
Quality Score = Σ (weight_i × criterion_score_i) / Σ weight_i

수렴 조건:
  1. Quality Score ≥ threshold (e.g., 0.85)   AND
  2. Critical/Major 결함 = 0                   AND
  3. Discriminator verdict = "PASS"

강제 종료 조건:
  round >= MAX_ROUNDS (= 3)
  → 최고 점수 라운드의 산출물 채택
  → 미해결 이슈를 residual_notes로 첨부
```

---

## 4. Foundry-X 적용 시나리오

### 4.1 AX BD 발굴 프로세스에 O-G-D 적용

현재 Foundry-X의 AX BD 2단계 발굴 프로세스를 O-G-D 패턴으로 재설계:

```
┌─────────────────────────────────────────────────┐
│          BD Discovery Orchestrator               │
│  (발굴 전체 조율 + Adversarial Loop 관리)        │
└────────────┬──────────────────────┬──────────────┘
             │                      │
    ┌────────▼────────┐    ┌───────▼────────┐
    │  BD Generator    │    │ BD Discriminator│
    │                  │    │                 │
    │ • 시장 분석 생성 │    │ • 실현가능성    │
    │ • BMC 초안 작성  │    │   검증          │
    │ • 수익 모델 설계 │    │ • 시장 데이터   │
    │ • 기술 PoC 구상  │    │   교차 검증     │
    │                  │    │ • 경쟁사 대비   │
    │                  │    │   차별성 판별   │
    └──────────────────┘    └────────────────┘
```

**구체적 흐름:**

1. **Orchestrator:** "헬스케어 AI 진단 보조 SaaS" 발굴 태스크 수신, Rubric 정의 (시장 규모 근거, 기술 실현성, 수익성, 규제 리스크)
2. **Generator (Round 0):** BMC 초안 + 시장 분석 보고서 + 수익 모델 생성
3. **Discriminator:** "시장 규모 추정에 출처 없음(Critical), 규제 리스크 미언급(Major), 경쟁사 3사 중 1사 누락(Minor)" 피드백
4. **Generator (Round 1):** 출처 추가, 규제 섹션 신설, 경쟁사 보완
5. **Discriminator:** "PASS — 잔여 제안: 동남아 시장 확장 시나리오 추가 고려"
6. **Orchestrator:** 최종 산출물 채택, 품질 보고서 생성

### 4.2 SDD Triangle에 O-G-D 적용

Foundry-X의 핵심인 Spec ↔ Code ↔ Test 동기화에 적용:

| 역할 | 에이전트 | 산출물 |
|------|---------|--------|
| Orchestrator | SDD Sync Orchestrator | 동기화 판정 + 트라이앵글 무결성 |
| Generator | Spec Writer, Code Generator, Test Writer | 명세/코드/테스트 생성 |
| Discriminator | Spec Reviewer, Code Reviewer, Test Reviewer | 각 산출물의 상호 일관성 검증 |

**적대적 긴장 포인트:**
- Code Generator가 만든 코드를 Test Writer의 테스트가 깨뜨리려 함
- Spec Reviewer가 코드가 명세를 위반하는 지점을 찾으려 함
- 이 긴장이 삼각형의 동기화 품질을 끌어올림

### 4.3 코드 리뷰에 O-G-D 적용 (Harness 예제 확장)

Harness의 코드 리뷰 팀 예제를 GAN 구조로 강화:

```
Orchestrator: Review Coordinator
├─ Generator: Code Author (PR 코드 작성/수정)
└─ Discriminators (팬아웃):
   ├─ Security Discriminator: "이 코드에서 취약점을 찾아라"
   ├─ Performance Discriminator: "이 코드에서 병목을 찾아라"
   └─ Test Discriminator: "이 코드가 놓친 엣지 케이스를 찾아라"
```

---

## 5. 구현 가이드

### 5.1 파일 구조 (Harness 규격 준수)

```
.claude/
├── agents/
│   ├── ogd-orchestrator.md        # O-G-D 루프 조율자
│   ├── bd-generator.md            # BD 산출물 생성자
│   ├── bd-discriminator.md        # BD 산출물 판별자
│   ├── code-generator.md          # 코드 생성자
│   ├── code-discriminator.md      # 코드 판별자
│   └── spec-discriminator.md      # 명세 판별자
└── skills/
    └── ogd-loop/
        ├── skill.md               # O-G-D 오케스트레이션 스킬
        └── references/
            ├── rubric-templates.md # 도메인별 Rubric 템플릿
            ├── convergence-guide.md # 수렴 판정 가이드
            └── mode-collapse-detection.md # 다양성 체크 가이드
```

### 5.2 에이전트 정의 예시: bd-discriminator.md

```markdown
---
model: opus
---

# BD Discriminator

## 핵심 역할
AX BD 산출물(BMC, 시장 분석, 수익 모델, 기술 PoC)의 품질을
적대적(Adversarial) 관점에서 판별하고, Generator가 개선할 수 있는
구체적이고 실행 가능한 피드백을 생성한다.

## 작업 원칙
1. **적대적 긴장 유지:** 쉽게 통과시키지 않는다. "진짜 좋은 BD 산출물"의
   기준을 항상 참조한다.
2. **근거 기반 판별:** 모든 피드백에 Rubric 항목 번호를 참조한다.
3. **실행 가능한 피드백:** "여기가 약하다"가 아니라 "이 데이터를 추가하면
   이 기준 점수가 N점 올라간다"로 표현한다.
4. **공정성:** 근거 없는 비판을 하지 않는다. Generator의 의도를 이해하고
   그 프레임 안에서 개선점을 찾는다.

## 입력 프로토콜
- `_workspace/{round}_{generator}_artifact.md` — Generator 산출물
- `_workspace/rubric.md` — 현재 라운드의 품질 기준
- `_workspace/{round-1}_discriminator_feedback.md` — 이전 피드백 (round ≥ 1)

## 출력 프로토콜
- `_workspace/{round}_discriminator_feedback.md`:
  ```yaml
  verdict: PASS | MINOR_FIX | MAJOR_ISSUE
  quality_score: 0.0 ~ 1.0
  findings:
    - criterion: "시장 규모 근거"
      severity: Critical | Major | Minor | Suggestion
      description: "..."
      recommendation: "..."
  ```

## 팀 통신 프로토콜
- **Generator로부터:** 산출물 + 변경 로그 수신
- **Generator에게:** 판별 결과 + 피드백 전송
- **Orchestrator에게:** verdict + quality_score 보고

## 에러 핸들링
- Generator 산출물 미도착: Orchestrator에 에스컬레이션
- Rubric 항목 해석 불가: Orchestrator에 명확화 요청
- 판별 확신도 < 0.6: "LOW_CONFIDENCE" 태그 추가, Orchestrator가 최종 판단
```

### 5.3 수렴 판정 로직 (Orchestrator 내부)

```
convergence_check(round, discriminator_result):
  if discriminator_result.verdict == "PASS":
    return CONVERGED

  if round >= MAX_ROUNDS:
    best_round = argmax(all_rounds, key=quality_score)
    return FORCED_STOP(best_artifact=best_round.artifact,
                       residual=current.findings)

  if discriminator_result.verdict == "MINOR_FIX":
    return CONTINUE(strategy="targeted_fix",
                    focus=discriminator_result.minor_findings)

  if discriminator_result.verdict == "MAJOR_ISSUE":
    # Mode Collapse 체크
    if similar_to_previous_rounds(current_artifact):
      return CONTINUE(strategy="approach_shift",
                      hint="다른 프레임워크/관점에서 재시도")
    else:
      return CONTINUE(strategy="deep_revision",
                      focus=discriminator_result.critical_findings)
```

---

## 6. Harness 기존 패턴과의 관계

### 6.1 확장, 대체가 아님

O-G-D는 Harness의 **Generation-Validation 패턴을 확장**한 것이지 대체하는 것이 아니다.

| 차원 | Generation-Validation (기존) | O-G-D (확장) |
|------|------------------------------|--------------|
| 판별 깊이 | Pass/Fix/Redo 3단계 | 다차원 Rubric + 심각도 분류 + 점수 |
| 피드백 구조 | 자유 텍스트 | 구조화된 findings[] with criterion ref |
| 수렴 전략 | 고정 재시도 횟수 | 적응적 전략 조정 + Mode Collapse 감지 |
| Orchestrator 역할 | 루프 카운터 | 전략 조정 + Rubric 진화 + 다양성 체크 |
| 적용 시점 | 품질 보장이 필요할 때 | 고품질 + 창의성이 동시에 필요할 때 |

### 6.2 다른 패턴과의 조합

O-G-D는 Harness의 다른 패턴과 자연스럽게 조합된다:

- **Fan-out + O-G-D:** 여러 Generator를 병렬 실행 → 각각의 Discriminator 평가 → 최고 산출물 선택 (GAN의 앙상블과 유사)
- **Pipeline + O-G-D:** 파이프라인의 각 단계에 O-G-D 루프 적용 (단계별 품질 게이트)
- **Supervisor + O-G-D:** 감독자가 동적으로 Generator/Discriminator 쌍을 배정

---

## 7. A/B 테스트 설계

Harness가 보고한 +60% 품질 향상을 O-G-D 적용 시 추가 검증하기 위한 테스트:

| 조건 | 구성 |
|------|------|
| Baseline | Harness Generation-Validation (기존) |
| Treatment | O-G-D with Adversarial Tension |
| 태스크 | BD 발굴 보고서 3건 + 기술 설계 문서 3건 |
| 메트릭 | 품질 점수(Rubric 기반), 라운드 수, 최종 산출물 다양성, 소요 시간 |

---

## 8. 주의사항 및 제약

1. **토큰 비용:** O-G-D 루프는 Generator + Discriminator를 반복 호출하므로 비용이 선형 증가. MAX_ROUNDS = 3이 비용/품질 균형점
2. **Discriminator Collapse:** Discriminator가 너무 관대해지면 품질 향상이 멈춤 → Rubric을 외부에서 고정하여 방지
3. **Context Window:** 라운드가 쌓이면 컨텍스트가 커짐 → 파일 기반 통신(`_workspace/`)으로 해결, 최신 2라운드만 컨텍스트에 유지
4. **Agent Teams 활성화 필수:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 환경변수 설정 필요

---

## 9. 검증 결과 및 보강 사항

### 9.1 수렴 판정 로직 보강

**Quality Regression(품질 역전) 방지:**
```
# 모든 라운드에서 best 추적
best_score = 0
best_artifact = null

convergence_check(round, discriminator_result):
  if discriminator_result.quality_score > best_score:
    best_score = discriminator_result.quality_score
    best_artifact = current_artifact

  # 품질 역전 감지
  if round >= 1 AND discriminator_result.quality_score < prev_score:
    log("⚠️ Quality Regression: {prev_score} → {current_score}")
    # 이전 최고 산출물 기반으로 재시도
    return CONTINUE(strategy="rollback_and_refine",
                    base=best_artifact)
```

**Rubric 진화 메커니즘:**
```
rubric_evolve(round, discriminator_findings):
  if round == 0:
    return initial_rubric  # 도메인 기본 Rubric

  # 반복 지적되는 항목의 weight 증가
  for finding in discriminator_findings:
    if finding.criterion in repeated_issues(last_2_rounds):
      rubric[finding.criterion].weight *= 1.2

  # 완벽히 충족된 항목의 weight 감소 (상대적 집중)
  for criterion in rubric:
    if criterion.score >= 0.95 in last_2_rounds:
      criterion.weight *= 0.8

  return normalize(rubric)
```

**Mode Collapse + approach_shift 재시도 제한:**
```
approach_shift_count = 0
MAX_APPROACH_SHIFTS = 2

if similar_to_previous_rounds(current_artifact):
  approach_shift_count++
  if approach_shift_count >= MAX_APPROACH_SHIFTS:
    return FORCED_STOP(reason="mode_collapse_unresolved",
                       best_artifact=best_artifact,
                       residual=all_findings)
  else:
    return CONTINUE(strategy="approach_shift",
                    hint=generate_alternative_approach())
```

### 9.2 Discriminator 피드백 우선순위 규정

Generator가 다차원 피드백을 수신할 때의 처리 순서:

```
피드백 처리 우선순위:
  1. Critical (반드시 해결) — 이것만 해결해도 큰 개선
  2. Major (해결 권장) — Critical 해결 후 여력이 있으면
  3. Minor (개선 제안) — 구조를 바꾸지 않는 선에서
  4. Suggestion (참고) — 다음 라운드에서 자연스럽게 반영

모순 피드백 처리:
  - 동일 severity의 모순 → Orchestrator에 에스컬레이션
  - 다른 severity의 모순 → 높은 severity 우선
```

### 9.3 Foundry-X 맥락 정의

**Phase 위치:** 이 설계는 **Phase 10 후보**이며, Phase 9의 F267(BD 스킬 배포)이 완료된 후 적용한다.

**기존 스킬과의 관계:**
- `.claude/skills/ax-bd-discovery/` (v8.2) → **유지** (현행 운영)
- `.claude/skills/ogd-loop/` → **보강 레이어** (ax-bd-discovery 위에 O-G-D 루프 래핑)
- 점진적 전환: v8.2의 각 단계에 O-G-D 품질 게이트를 하나씩 추가

**Plumb 엔진과의 관계:**
- SDD Triangle에서 Plumb = 동기화 엔진 (기존 유지)
- O-G-D Orchestrator = Plumb 결과에 대한 **품질 증폭기** (Plumb이 동기화 → O-G-D가 품질 검증)

### 9.4 Fan-out + O-G-D 통합 방식

다중 Generator의 산출물 통합 방식 — **Tournament Selection:**

```
Phase 1 (병렬 생성):
  Generator-A → artifact_A
  Generator-B → artifact_B
  Generator-C → artifact_C

Phase 2 (개별 판별):
  Discriminator → score_A, score_B, score_C

Phase 3 (토너먼트):
  if max(scores) >= threshold:
    winner = argmax(scores)  # 최고 점수 채택
  else:
    # 최고 2개의 장점을 합성하여 새 Generator 라운드
    top_2 = top_k(scores, k=2)
    merged_feedback = merge(top_2.strengths)
    → 새 Generator 라운드 (merged_feedback 기반)
```

---

*설계일: 2026-04-02 | AX BD팀 | Foundry-X Phase 9 → Phase 10 후보*
