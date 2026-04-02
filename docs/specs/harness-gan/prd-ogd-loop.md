---
code: FX-SPEC-OGD-001
title: O-G-D Agent Loop — PRD
version: "1.1"
status: Draft
category: SPEC
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
based-on: "[[FX-SPEC-HGA-001]] harness-gan-agent-architecture.md"
review: "[[FX-SPEC-OGD-001-R1]] Round 1 — GPT-4o, DeepSeek R1, Gemini 2.0 Flash"
---

# O-G-D Agent Loop — Product Requirements Document (v1.1)

> **Orchestrator-Generator-Discriminator** 적대적 루프를 Claude Code 에이전트로 구현하는 PoC PRD
> v1.1: 외부 AI 3사 교차 검토 반영 (C-1~C-3, M-1~M-5)

---

## 1. 배경 및 목적

### 1.1 배경

Harness × GAN Agent Architecture 설계서(`[[FX-SPEC-HGA-001]]`)에서 GAN의 적대적 경쟁 메커니즘을 Agent 오케스트레이션에 매핑한 O-G-D 아키텍처를 설계했다. 이를 실제 동작하는 PoC로 구현하여 AX BD팀에 시연한다.

### 1.2 목적

- AX BD팀에 O-G-D 개념을 **동작하는 데모**로 시연
- 범용 O-G-D 루프를 **독립 검증**한 뒤, ax-bd-discovery v8.2에 **품질 게이트**로 통합
- 실제 BD 아이템을 대상으로 적대적 루프의 **품질 향상 효과** 검증

### 1.3 범위

| 포함 | 제외 |
|------|------|
| 범용 O-G-D 오케스트레이션 프레임워크 | Fan-out + Tournament Selection (다중 Generator) |
| Claude Code 에이전트 + 스킬 파일 | API 서버 엔드포인트 |
| BD 발굴 보고서 도메인 Rubric 템플릿 (7항목) | SDD Triangle / 코드 리뷰 도메인 (Phase 10+) |
| _workspace/ 파일 기반 라운드 통신 + 상태 관리 | 웹 대시보드 모니터링 |
| PoC: 독립 루프 검증 → v8.2 통합 | 독립 스킬 운영 (v8.2에 통합) |

---

## 2. 요구사항

### 2.1 핵심 요구사항 (Must-Have)

| ID | 요구사항 | 설명 |
|----|---------|------|
| R-01 | **O-G-D 루프 프레임워크** | Orchestrator → Generator → Discriminator → (피드백 루프) 전체 흐름 동작 |
| R-02 | **MAX_ROUNDS 설정** | 1~5 범위에서 파라미터로 지정 가능. **기본값 2** (PoC 속도 최적화) |
| R-03 | **모델 선택 가능** | 각 에이전트 .md frontmatter에서 model 지정. 기본: O=opus, G/D=sonnet |
| R-04 | **_workspace/ 파일 기반 통신** | 라운드별 산출물/피드백을 _workspace/ 하위에 파일로 저장 |
| R-05 | **Discriminator YAML 피드백** | verdict + quality_score + findings[] 구조화 피드백 |
| R-06 | **수렴 판정 로직** | PASS / MINOR_FIX / MAJOR_ISSUE 분기 + 강제 종료 (MAX_ROUNDS) |
| R-07 | **BD 발굴 Rubric 템플릿 (7항목)** | 시장 기회, 기술 실현성, 경쟁 차별성, 수익 모델, 규제 리스크, 실행 계획, 파트너십 시너지 |
| R-09 | **품질 보고서 생성** | **Markdown 요약 + YAML 별첨** 구조. 라운드 이력 + 품질 점수 변화 |
| R-13 | **피드백 우선순위 규정** ⬆️ | Critical > Major > Minor > Suggestion 처리 순서 + 모순 피드백 처리 규칙 |
| R-14 | **에러 핸들링 프로토콜** 🆕 | Generator/Discriminator 타임아웃, 판별 불가, 파일 손상 시 복구 절차 |
| R-15 | **상태 관리 (ogd-state.yaml)** 🆕 | 라운드별 진행 상황, 최고 점수, 전략 이력 추적 |

### 2.2 부가 요구사항 (Should-Have)

| ID | 요구사항 | 설명 |
|----|---------|------|
| R-08 | **ax-bd-discovery v8.2 통합** ⬇️ | 2-5 Commit Gate만 필수, 2-3/2-7은 선택적. PoC 독립 검증 후 통합 |
| R-10 | **Mode Collapse 감지** | Generator가 동일 패턴 반복 시 approach_shift 전략 전환 |
| R-11 | **Quality Regression 방지** | 품질 역전 감지 → 최고 점수 산출물 기반 재시도 |
| R-12 | **Rubric 진화** | 라운드별 반복 지적 항목 가중치 증가, 충족 항목 가중치 감소 |
| R-16 | **산업 템플릿별 가중치 오버라이드** 🆕 | Rubric 가중치를 도메인/산업에 맞게 조정하는 옵션 |

### 2.3 미래 확장 (Won't-Have, Phase 10+)

| ID | 요구사항 | 비고 |
|----|---------|------|
| R-20 | Fan-out + Tournament Selection | 다중 Generator 병렬 생성 |
| R-21 | SDD Triangle 적용 | Spec↔Code↔Test 동기화 품질 증폭 |
| R-22 | 코드 리뷰 Discriminators | Security/Performance/Test 다중 판별자 |
| R-23 | API 엔드포인트 + 웹 모니터링 | 루프 이력/메트릭 웹 조회 |
| R-24 | Quick Mode (1라운드 간소 검증) | 긴급 BD 상황용 경량 모드 |

---

## 3. 아키텍처

### 3.1 파일 구조 (Harness 규격)

```
.claude/
├── agents/
│   ├── ogd-orchestrator.md        # O-G-D 루프 조율자
│   ├── ogd-generator.md           # 산출물 생성자 (범용)
│   └── ogd-discriminator.md       # 산출물 판별자 (범용)
└── skills/
    └── ax-bd-discovery/           # 기존 v8.2 스킬에 통합 (Phase D)
        ├── SKILL.md               # O-G-D 품질 게이트 섹션 추가
        └── references/
            ├── ogd-rubric-bd.md       # BD 발굴 Rubric 템플릿 (7항목)
            ├── ogd-convergence.md     # 수렴 판정 가이드
            └── ogd-mode-collapse.md   # Mode Collapse 감지 가이드

_workspace/                        # 라운드 산출물 (임시, .gitignore)
├── ogd-state.yaml                 # 루프 상태 추적 (R-15)
├── rubric.md                      # 현재 라운드 Rubric
├── round-0/
│   ├── generator-artifact.md      # Generator 산출물
│   └── discriminator-feedback.md  # Discriminator 피드백 (YAML)
├── round-1/
│   ├── generator-artifact.md
│   └── discriminator-feedback.md
├── error-log.md                   # 에러 이력 (R-14)
└── ogd-report.md                  # 최종 품질 보고서 (Markdown 요약 + YAML 별첨)
```

### 3.2 O-G-D 루프 흐름

```
사용자 → O-G-D 루프 직접 호출 (PoC Phase A~C)
  또는
사용자 → ax-bd-discovery 2단계 → 2-5 Commit Gate → O-G-D 루프 (Phase D)

        ┌───────────────────────┐
        │   OGD ORCHESTRATOR     │
        │  • Rubric 로드          │
        │  • MAX_ROUNDS 설정 (기본 2) │
        │  • 수렴 판정            │
        │  • 에러 핸들링          │
        │  • ogd-state.yaml 갱신 │
        └──────┬────────────────┘
               │
    ┌──────────▼──────────┐
    │   ADVERSARIAL LOOP   │
    │                      │
    │  Generator ──→ 산출물 │
    │       ↑          ↓   │
    │  피드백 ←── Discriminator│
    │                      │
    │  (MAX_ROUNDS까지 반복)│
    └──────────────────────┘
               │
        최종 산출물 + 품질 보고서 (Markdown + YAML)
```

### 3.3 Discriminator 피드백 프로토콜

```yaml
verdict: PASS | MINOR_FIX | MAJOR_ISSUE
quality_score: 0.0 ~ 1.0
round: 1
findings:
  - criterion: "시장 기회"
    severity: Critical | Major | Minor | Suggestion
    current_score: 0.4
    description: "시장 규모 추정에 출처가 없음"
    recommendation: "Gartner/IDC 등 공인 리포트 인용 추가"
    rubric_ref: "R1"
  - criterion: "경쟁 차별성"
    severity: Minor
    current_score: 0.7
    description: "경쟁사 3사 중 1사 누락"
    recommendation: "주요 경쟁사 전체 포함"
    rubric_ref: "R3"
summary:
  total_findings: 2
  by_severity: { critical: 0, major: 0, minor: 1, suggestion: 0 }
  improvement_from_prev: "+0.15"
```

**피드백 처리 우선순위 (R-13):**
1. Critical (반드시 해결) — 이것만 해결해도 큰 개선
2. Major (해결 권장) — Critical 해결 후 여력이 있으면
3. Minor (개선 제안) — 구조를 바꾸지 않는 선에서
4. Suggestion (참고) — 다음 라운드에서 자연스럽게 반영

**모순 피드백 처리:**
- 동일 severity의 모순 → Orchestrator에 에스컬레이션
- 다른 severity의 모순 → 높은 severity 우선

### 3.4 수렴 판정 로직

```
convergence_check(round, discriminator_result):
  # Best 추적 (Quality Regression 방지)
  if quality_score > best_score:
    best_score = quality_score
    best_artifact = current_artifact

  # 수렴 조건
  if verdict == "PASS" AND quality_score >= 0.85 AND critical_count == 0:
    return CONVERGED

  # 강제 종료
  if round >= MAX_ROUNDS:
    return FORCED_STOP(best_artifact, residual_findings)

  # 품질 역전
  if round >= 1 AND quality_score < prev_score:
    return CONTINUE(strategy="rollback_and_refine", base=best_artifact)

  # Mode Collapse
  if similar_to_previous(current_artifact):
    if approach_shift_count >= 2:
      return FORCED_STOP(reason="mode_collapse")
    return CONTINUE(strategy="approach_shift")

  # 일반 계속
  if verdict == "MINOR_FIX":
    return CONTINUE(strategy="targeted_fix", focus=minor_findings)
  if verdict == "MAJOR_ISSUE":
    return CONTINUE(strategy="deep_revision", focus=critical_findings)
```

### 3.5 에러 핸들링 프로토콜 (R-14) 🆕

```
에러 핸들링:
1. Generator 타임아웃/실패
   → Orchestrator가 재시도 1회
   → 재시도 실패 → FORCED_STOP(best_artifact, error="generator_failure")

2. Discriminator 판별 불가
   → LOW_CONFIDENCE 태그 + Orchestrator가 직접 판정
   → 판정 불가 → FORCED_STOP(best_artifact, error="discriminator_failure")

3. _workspace/ 파일 손상/미생성
   → 이전 라운드 산출물 기반 복구
   → 복구 불가 → FORCED_STOP(error="file_corruption")

4. 모든 에러 → _workspace/error-log.md에 타임스탬프 + 원인 + 복구 조치 기록
```

### 3.6 상태 관리 (R-15) 🆕

```yaml
# _workspace/ogd-state.yaml
task_id: "ogd-20260402-001"
status: running | converged | forced_stop | error
current_round: 1
max_rounds: 2
best_round: 0
best_score: 0.55
error_count: 0
rounds:
  - round: 0
    verdict: MAJOR_ISSUE
    quality_score: 0.55
    strategy: initial
    timestamp: "2026-04-02T14:30:00"
  - round: 1
    verdict: null
    quality_score: null
    strategy: deep_revision
    timestamp: null
```

---

## 4. BD 발굴 Rubric 템플릿 (v1.1 — 7항목)

### 4.1 기본 Rubric

| ID | 기준 | 가중치 | 임계값 | 평가 관점 |
|----|------|--------|--------|----------|
| R1 | 시장 기회 | 0.15 | ≥ 0.7 | TAM/SAM/SOM 수치, 출처 신뢰성, 성장성, 시기적절성 |
| R2 | 기술 실현성 | 0.15 | ≥ 0.6 | 기술 스택 구체성, PoC 가능 여부, 핵심 기술 리스크 |
| R3 | 경쟁 차별성 + 협상 레버리지 | 0.15 | ≥ 0.6 | 경쟁사 분석 완전성, 차별화 포인트, 우리의 협상 카드 |
| R4 | 수익 모델 | 0.15 | ≥ 0.6 | 과금 구조, 단가, 예상 매출 근거, 투자 대비 수익 |
| R5 | 규제/법률 리스크 | 0.15 | ≥ 0.5 | 관련 법규 식별, 대응 방안, 운영 리스크 |
| R6 | 실행 계획 + 관계자 매핑 | 0.15 | ≥ 0.6 | 일정, 자원, 마일스톤, 의사결정자/영향자 식별 |
| R7 | 파트너십 시너지 🆕 | 0.10 | ≥ 0.5 | 상호 보완성, 문화 적합성, 전략 일치도 |

> **산업 템플릿 오버라이드 (R-16):** 규제 산업(헬스케어, 핀테크)에서는 R5 가중치 ↑0.20, 기술 파트너십에서는 R2 가중치 ↑0.20 등 도메인별 조정 가능

### 4.2 종합 품질 점수

```
Quality Score = Σ (weight_i × criterion_score_i) / Σ weight_i

수렴 조건:
  Quality Score ≥ 0.85
  AND Critical 결함 = 0
  AND Major 결함 ≤ 1
  AND verdict = "PASS"
```

---

## 5. 통합 계획

### 5.1 PoC 단계별 전략 (v1.1 수정)

| 단계 | 전략 | 설명 |
|------|------|------|
| **Phase A~C** | **독립 검증** | O-G-D 루프 자체 동작 검증. v8.2와 무관하게 실행 |
| **Phase D** | **v8.2 통합** | 검증된 루프를 ax-bd-discovery에 연결 |

### 5.2 v8.2 통합 지점 (Phase D)

| 단계 | 적용 | O-G-D 동작 |
|------|------|-----------|
| 2-3 시장 분석 | **선택적** 🔄 | Generator로 생성 → Discriminator가 시장 데이터 교차 검증 |
| **2-5 Commit Gate** | **필수** ✅ | O-G-D 루프로 강화 (Rubric R1~R7 전체 평가) |
| 2-7 BMC 완성 | **선택적** 🔄 | Generator가 BMC 생성 → Discriminator가 일관성/완전성 판별 |

### 5.3 v8.2 SKILL.md 수정 범위

- O-G-D 품질 게이트 섹션 추가 (Phase 참조)
- references/ 에 ogd-*.md 3개 파일 추가
- 기존 워크플로우는 변경하지 않음 — O-G-D는 선택적 품질 강화 옵션

---

## 6. 데모 계획

### 6.1 데모 시나리오

- **대상:** 실제 BD 발굴 아이템 (팀 내부 진행 중인 아이템)
- **환경:** 로컬 Claude Code + Agent Teams 활성화 (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)
- **흐름:**
  1. O-G-D 루프 직접 호출 (독립 모드)
  2. 태스크 + Rubric 전달 → Orchestrator 시작
  3. Generator가 BMC + 시장 분석 초안 생성 (Round 0)
  4. Discriminator가 Rubric 기반 피드백 (Round 0 → 1)
  5. Generator가 피드백 반영하여 개선 (Round 1)
  6. Discriminator가 PASS 또는 MINOR_FIX 판정
  7. 최종 산출물 + **Markdown 품질 보고서** 출력

### 6.2 성공 기준

| 기준 | 목표 |
|------|------|
| O-G-D 루프 정상 동작 | Round 0 → N → 수렴/종료 |
| 품질 점수 향상 | Round 0 대비 최종 ≥ +0.15 |
| Discriminator 피드백 구체성 | 모든 findings에 recommendation 포함 |
| 라운드 이력 추적 | _workspace/round-N/ + ogd-state.yaml 체계적 저장 |
| 실행 시간 | 2라운드 기준 ≤ 7분 |
| 에러 복구 | 에이전트 1회 실패 시 자동 복구 |
| 보고서 가독성 | BD 담당자가 읽을 수 있는 Markdown 요약 |

---

## 7. 주의사항 및 제약

1. **토큰 비용:** MAX_ROUNDS × (Generator + Discriminator) 호출. 2라운드 기준 4회 LLM 호출 + Orchestrator
2. **Context Window:** 라운드 누적 시 컨텍스트 증가 → _workspace/ 파일 기반으로 분리, 최신 2라운드만 참조
3. **Agent Teams 필수:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 환경변수 필요
4. **Discriminator Collapse:** Discriminator가 너무 관대해지면 품질 향상 멈춤 → Rubric 외부 고정으로 방지
5. **v8.2 호환성:** Phase D 통합 시 기존 v8.2 워크플로우를 깨뜨리지 않아야 함 — 선택적 옵션으로만 동작
6. **에러 복구:** 재시도는 최대 1회. 2회 연속 실패 시 FORCED_STOP으로 안전 종료

---

## 8. 타임라인

| 단계 | 산출물 | 예상 |
|------|--------|------|
| **Phase A:** 에이전트 정의 | ogd-orchestrator/generator/discriminator .md | Sprint 101 |
| **Phase B:** Rubric + references | ogd-rubric-bd.md (7항목), convergence, mode-collapse | Sprint 101 |
| **Phase C:** 독립 루프 검증 | _workspace/ 구조 + ogd-state.yaml + 테스트 실행 | Sprint 101 |
| **Phase D:** v8.2 통합 + 데모 | SKILL.md 수정 + 실제 BD 아이템 데모 + 결과 보고서 | Sprint 102 |

---

## 9. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-04-02 | 초안 작성 (인터뷰 기반) |
| 1.1 | 2026-04-02 | 외부 AI 3사 교차 검토 반영: Rubric 7항목 확장(C-1), 에러 핸들링(C-2), 보고서 가독성(C-3), v8.2 통합 하향(M-1), R-13 상향(M-2), MAX_ROUNDS 기본 2(M-3), 상태 관리(M-4), 통합 지점 단순화(M-5) |

---

*작성일: 2026-04-02 | 기반 설계: [[FX-SPEC-HGA-001]] Harness × GAN Agent Architecture*
*검토: [[FX-SPEC-OGD-001-R1]] GPT-4o (CTO) + DeepSeek R1 (BD) + Gemini 2.0 Flash (PM)*
