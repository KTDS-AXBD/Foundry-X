---
code: FX-DSGN-S110
title: "Sprint 110 — F282+F283 BD 형상화 Phase A+B+C 설계"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-274]], [[FX-REQ-275]], [[FX-PLAN-S110]], [[FX-BD-SHAPING-001]]"
---

# Sprint 110: F282+F283 BD 형상화 Phase A+B+C 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F282: Phase A 입력 점검 / F283: Phase B+C req-interview + O-G-D 형상화 루프 |
| Sprint | 110 |
| 상위 Plan | [[FX-PLAN-S110]] |
| 핵심 | ax-bd-shaping 스킬(Phase A→B→C 오케스트레이션) + shaping-{orchestrator,generator,discriminator} 에이전트 3종 + Rubric 5차원 + 참조 3종 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 2단계 발굴 산출물 → 3단계 형상화가 수동으로 이루어져 반복 검토-수정이 비효율적 |
| Solution | ax-bd-shaping 스킬 + 입력 점검 체크리스트 + req-interview 연동 + O-G-D 형상화 루프 |
| Function UX Effect | `/ax:ax-bd-shaping` 한 번 호출로 2단계 PRD → 3단계 PRD 자동 생성 |
| Core Value | BD 형상화 파이프라인 핵심 엔진 → Sprint 111(D+E) / Sprint 112(F) 전제 조건 |

---

## §1 스킬 설계 — ax-bd-shaping SKILL.md

### 1.1 Frontmatter

```yaml
---
name: ax-bd-shaping
description: |
  AX BD 형상화 파이프라인 (Stage 3→4).
  2단계 발굴 산출물을 입력으로 Phase A(입력 점검) → Phase B(req-interview) → Phase C(O-G-D 형상화 루프) 실행.
  Phase D~F는 Sprint 111~112에서 추가.
triggers:
  - 형상화
  - shaping
  - "3단계"
  - BD 형상화
  - PRD 형상화
---
```

### 1.2 실행 흐름

```
사용자 입력: "형상화 {산출물 경로}" 또는 "/ax:ax-bd-shaping {경로}"
    │
    ▼
[Step 0] 워크스페이스 초기화
    │  _workspace/shaping/{run-id}/ 생성
    │  run-id = "shaping-{YYYYMMDD}-{HHmmss}"
    ▼
[Step 1] Phase A — 입력 점검 & 갭 분석
    │  산출물 파일 읽기 → 체크리스트 10항목 평가
    │  → phase-a-gap-report.md 생성
    │  게이트: 필수 80%+ → 계속 / 50% 미만 → 반려
    ▼
[Step 2] Phase B — req-interview 연동
    │  Phase A 갭 → 인터뷰 컨텍스트 주입
    │  /ax:req-interview 호출 (또는 자동 모드: AI 페르소나)
    │  → phase-b-interview.md 생성
    ▼
[Step 3] Phase C — O-G-D 형상화 루프
    │  shaping-orchestrator Agent 호출
    │  → max 3 rounds, 수렴 0.85
    │  → phase-c-final.md (3단계 PRD)
    ▼
[결과 보고] 실행 요약 출력
    산출물 위치, 품질 점수, 라운드 수, 소요 시간
```

### 1.3 입력 파라미터

| 파라미터 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| source_path | ✅ | — | 2단계 발굴 산출물 경로 (MD 파일 또는 디렉토리) |
| mode | — | hitl | `hitl` (Phase B에서 사용자 인터뷰) / `auto` (AI 페르소나 인터뷰) |
| max_rounds | — | 3 | Phase C O-G-D 최대 라운드 수 |
| max_searches | — | 10 | Generator/Discriminator WebSearch 최대 횟수 |
| skip_interview | — | false | Phase B 건너뛰기 (이미 인터뷰 완료된 경우) |

### 1.4 산출물 디렉토리 구조

```
_workspace/shaping/{run-id}/
├── phase-a-gap-report.md        # 10항목 점검 결과 + 갭 분석 + 처리 전략
├── phase-b-interview.md         # 구조화된 인터뷰 결과 (YAML front + MD body)
├── phase-c-round-0/
│   ├── generator-artifact.md    # Round 0 PRD 초안
│   └── discriminator-feedback.md # Round 0 피드백
├── phase-c-round-1/             # (수렴 전까지 반복)
│   ├── generator-artifact.md
│   └── discriminator-feedback.md
├── phase-c-final.md             # 수렴된 최종 3단계 PRD
├── rubric.md                    # 사용된 Rubric 스냅샷
├── rubric-scores.yaml           # 라운드별 Rubric 점수 추이
├── search-cache.md              # WebSearch 누적 캐시
└── shaping-state.yaml           # 실행 상태 (ogd-state.yaml 형식 확장)
```

---

## §2 Phase A 상세 설계 — 입력 점검 & 갭 분석

### 2.1 체크리스트 평가 로직

스킬이 산출물 파일을 읽고, 각 항목을 LLM 판정으로 평가:

```
각 항목에 대해:
  1. 산출물에서 해당 내용을 찾는다 (섹션 제목 + 키워드 매칭)
  2. 존재 여부 판정: present | partial | absent
  3. 존재 시 품질 점수 산정: 0.0 ~ 1.0
     - 1.0: 완전하고 근거가 명확
     - 0.7: 존재하나 일부 불완전
     - 0.4: 피상적으로만 언급
     - 0.0: 전혀 없음
```

### 2.2 갭 분석 보고서 형식

```markdown
# Phase A — 입력 점검 & 갭 분석 보고서

## 산출물 정보
- 소스: {source_path}
- 점검일: {timestamp}
- Run ID: {run-id}

## 체크리스트 결과

| # | 카테고리 | 항목 | 필수 | 상태 | 점수 | 비고 |
|---|----------|------|------|------|------|------|
| 1 | 시장 | 타겟 시장 + TAM/SAM/SOM | 필수 | ✅/⚠️/❌ | 0.8 | ... |
| ... |

## 충족률
- 필수 항목 (7개): {N}/7 충족 ({P}%)
- 선택 항목 (3개): {N}/3 충족
- 종합: {status} — {message}

## 갭 처리 전략
| # | 누락 항목 | 처리 | 상세 |
|---|-----------|------|------|
| 1 | 경쟁사 분석 | Phase B 인터뷰 | "경쟁사 3사와 차별점을 설명해주세요" 질문 추가 |
| 2 | 수익 모델 | Phase C Generator | 선택 항목 — Generator가 유사 사례 기반 자동 보강 |

## 게이트 판정
- 필수 충족률: {P}% → {PASS/FAIL}
- Phase B 진행: {Y/N}
```

### 2.3 게이트 로직

```
필수 충족률 계산:
  fulfilled = count(필수 항목 where 상태 != absent AND 점수 >= 0.4)
  rate = fulfilled / 7  (필수 항목 7개)

판정:
  rate >= 0.80 → PASS: Phase B 진행
  0.50 <= rate < 0.80 → CONDITIONAL: Phase B에서 보강 필수, 경고 출력
  rate < 0.50 → FAIL: 반려 (2단계로 돌려보내기), 에러 출력 + 이유 명시
```

---

## §3 Phase B 상세 설계 — req-interview 연동

### 3.1 컨텍스트 주입 메커니즘

Phase A 갭 분석 결과를 `/ax:req-interview` 스킬에 주입:

```markdown
# 인터뷰 컨텍스트 (형상화 Phase B 자동 생성)

## 배경
2단계 발굴 산출물의 형상화를 위해, 갭 분석에서 발견된 누락/미흡 항목을 보강하는 인터뷰입니다.

## 산출물 요약
{Phase A에서 추출한 산출물 1줄 요약}

## 보강 필요 항목
{갭 분석에서 FAIL/CONDITIONAL인 항목 목록}

## 자동 생성 질문 (갭 기반)
1. {누락 항목 1에 대한 질문}
2. {누락 항목 2에 대한 질문}
...

## 추가 질문 (형상화 표준)
- 기술 아키텍처의 핵심 제약사항은 무엇인가요?
- 성공 기준(KPI)을 정량적으로 정의해주세요.
- 주요 리스크 3가지와 대응 방안은?
```

### 3.2 HITL vs 자동 모드

| 모드 | Phase B 동작 |
|------|-------------|
| `hitl` (기본) | AskUserQuestion으로 사용자에게 직접 인터뷰 → 응답을 구조화 |
| `auto` | AI 페르소나(사업 아이디어 제안자 역할)가 산출물 기반으로 응답 생성 |

### 3.3 인터뷰 결과 구조 (phase-b-interview.md)

```yaml
---
run_id: "{run-id}"
mode: "hitl | auto"
source: "{source_path}"
interviewed_at: "{timestamp}"
---

# Phase B — 요구사항 인터뷰 결과

## 사업 요구사항 (Business Requirements)
- BR-001: {description} [priority: Must/Should/Could] [source: 인터뷰/갭추론]
- BR-002: ...

## 기술 제약사항 (Technical Constraints)
- TC-001: {description} [impact: High/Medium/Low]
- TC-002: ...

## 성공 기준 (Success Criteria)
- SC-001: {metric} → target: {target}
- SC-002: ...

## 미해결 질문 (Open Questions)
- OQ-001: {question} → assumption: "{Generator가 채울 가정}"
- OQ-002: ...
```

---

## §4 Phase C 상세 설계 — O-G-D 형상화 루프

### 4.1 기존 O-G-D 패턴과의 차이

| 항목 | 기존 (ax-bd-discovery) | 형상화 (ax-bd-shaping) |
|------|----------------------|----------------------|
| 목적 | BD 발굴 보고서 생성 | 3단계 PRD 생성 |
| 입력 | 태스크 설명 + 컨텍스트 | Phase A+B 통합 컨텍스트 (갭 분석 + 인터뷰) |
| Rubric | R1~R7 (7항목, 발굴 관점) | S1~S5 (5차원, 형상화 관점) |
| 에이전트 | ogd-{orchestrator,generator,discriminator} | shaping-{orchestrator,generator,discriminator} |
| 산출물 위치 | `_workspace/round-{N}/` | `_workspace/shaping/{run-id}/phase-c-round-{N}/` |
| 추가 컨텍스트 | 없음 | Phase A 갭 보고서 + Phase B 인터뷰 결과 |

### 4.2 shaping-orchestrator 에이전트 설계

```yaml
# .claude/agents/shaping-orchestrator.md frontmatter
name: shaping-orchestrator
description: BD 형상화 O-G-D 조율자 — Phase C 루프 관리, Rubric 5차원 수렴 판정, Phase D↔E 회귀 관리 (Sprint 111+)
model: opus
tools: [Read, Write, Glob, Grep, Agent]
color: magenta
```

**핵심 차이점 (vs ogd-orchestrator):**

1. **입력 확장**: Phase A+B 산출물을 Generator에 전달
2. **Rubric 교체**: R1~R7 → S1~S5 (형상화 전용)
3. **산출물 경로**: `_workspace/shaping/{run-id}/` 하위
4. **Phase D/E 회귀**: (Sprint 111에서 추가) Quality Score 미달 시 Phase D/E에서 Phase C로 회귀

**실행 프로토콜:**

```
Phase 0: 초기화
  1. _workspace/shaping/{run-id}/ 확인
  2. rubric-shaping.md 로드 → _workspace/shaping/{run-id}/rubric.md
  3. Phase A+B 산출물 읽기:
     - phase-a-gap-report.md (갭 분석)
     - phase-b-interview.md (인터뷰 결과)
  4. shaping-state.yaml 생성

Phase 1: Adversarial Loop (기존 ogd-orchestrator와 동일 구조)
  Step 1: shaping-generator 호출 (task + rubric + phase-a/b 컨텍스트)
  Step 1b: search-cache 갱신
  Step 2: shaping-discriminator 호출
  Step 2b: search-cache 갱신
  Step 3: 수렴 판정 (Quality ≥ 0.85, Critical = 0)
  Step 4: 상태 갱신

Phase 2: 최종 보고서
  - phase-c-final.md 생성 (best artifact)
  - rubric-scores.yaml 갱신 (라운드별 점수 추이)
  - shaping-state.yaml 최종 상태
```

### 4.3 shaping-generator 에이전트 설계

```yaml
# .claude/agents/shaping-generator.md frontmatter
name: shaping-generator
description: BD 형상화 PRD 생성자 — Phase A+B 컨텍스트 기반 3단계 PRD 생성, Discriminator 피드백 반영 개선
model: sonnet
tools: [Read, Write, WebSearch, WebFetch]
color: green
```

**기존 ogd-generator와의 차이:**

1. **산출물 형식**: BD 발굴 보고서 → **3단계 PRD** (아키텍처, 기능 명세, NFR, 마일스톤, 리스크 매트릭스)
2. **입력 컨텍스트**: Phase A 갭 분석 + Phase B 인터뷰 결과 필수 참조
3. **Rubric 참조**: S1~S5 형상화 전용 Rubric

**3단계 PRD 템플릿 (Generator가 생성할 구조):**

```markdown
# {프로젝트명} — 3단계 형상화 PRD

## 1. 개요
  - 배경, 목적, 범위

## 2. 시장 및 고객 분석
  - 타겟 시장 (TAM/SAM/SOM)
  - 페르소나
  - 경쟁 분석 + 차별화

## 3. 가치 제안 및 비즈니스 모델
  - Value Proposition
  - BMC 9블록
  - 수익 모델

## 4. 기술 아키텍처
  - 시스템 구조도
  - 기술 스택
  - 데이터 모델
  - 통합 전략

## 5. 기능 명세
  - 핵심 기능 목록 (Priority: Must/Should/Could)
  - 각 기능 상세 (입력/출력/비즈니스 룰)

## 6. 비기능 요구사항
  - 성능, 보안, 확장성, 가용성

## 7. 마일스톤 및 일정
  - Phase별 일정
  - 리소스 계획

## 8. 리스크 매트릭스
  - 기술/시장/조직 리스크
  - 영향도 × 발생확률
  - 완화 전략

## 9. 성공 기준 (KPI)
  - SC → KPI 매핑
  - 측정 방법
```

### 4.4 shaping-discriminator 에이전트 설계

```yaml
# .claude/agents/shaping-discriminator.md frontmatter
name: shaping-discriminator
description: BD 형상화 품질 검증 + 리스크 경고 — Rubric S1~S5 기반 5차원 평가, 결함 분류, 실행 가능 피드백
model: sonnet
tools: [Read, Write, WebSearch, WebFetch]
color: red
```

**기존 ogd-discriminator와의 차이:**

1. **이중 역할**: 품질 검증(quality_critic) + 리스크 경고(risk_warner)
2. **Rubric 항목**: S1~S5 (형상화 전용 5차원)
3. **결함 분류**: Critical/Major/Minor/Suggestion (기존과 동일)
4. **리스크 경고**: 기술적/시장/조직 리스크 별도 섹션

**Discriminator 피드백 형식:**

```yaml
verdict: PASS | MINOR_FIX | MAJOR_ISSUE
quality_score: 0.87

rubric_scores:
  S1_business_viability: 0.85
  S2_technical_feasibility: 0.90
  S3_requirement_traceability: 0.82
  S4_risk_coverage: 0.88
  S5_document_completeness: 0.90

findings:
  - id: F1
    severity: Minor
    rubric_ref: S3
    description: "BR-002 → Feature 매핑이 누락됨"
    suggestion: "§5 기능 명세에 BR-002 대응 기능 추가"

risk_alerts:
  - id: RA1
    category: technical
    description: "기술 스택에 명시된 X 프레임워크가 EOL 예정"
    mitigation_suggestion: "대체 프레임워크 후보 2~3개 제시"
```

---

## §5 Rubric 설계 — rubric-shaping.md

### 5.1 형상화 전용 Rubric (5차원)

| ID | 차원 | 가중치 | 임계값 | 평가 기준 |
|----|------|--------|--------|-----------|
| S1 | 사업 타당성 | 0.25 | ≥ 0.70 | 시장 규모 근거 + 경쟁 우위 명확성 + 수익 모델 구체성 |
| S2 | 기술 실현성 | 0.25 | ≥ 0.70 | 아키텍처 완성도 + 기술 스택 적합성 + PoC 가능성 |
| S3 | 요구사항 추적성 | 0.20 | ≥ 0.65 | BR→Feature 매핑 + TC→아키텍처 반영 + SC→KPI 연결 |
| S4 | 리스크 커버리지 | 0.15 | ≥ 0.60 | 기술/시장/조직 리스크 식별 + 완화 전략 구체성 |
| S5 | 문서 완성도 | 0.15 | ≥ 0.65 | 섹션 완전성 + 용어 일관성 + 참조 무결성 |

### 5.2 수렴 조건

```
Quality Score = 0.25×S1 + 0.25×S2 + 0.20×S3 + 0.15×S4 + 0.15×S5

수렴:
  Quality Score ≥ 0.85
  AND Critical 결함 = 0
  AND Major 결함 ≤ 1
  AND verdict = "PASS"

강제 종료:
  round >= max_rounds (기본 3) → best artifact 채택 + residual findings 첨부
```

### 5.3 발굴 Rubric(R1~R7)과의 관계

| 발굴 (R) | 형상화 (S) | 관계 |
|-----------|-----------|------|
| R1 시장 기회 | S1 사업 타당성 | R1이 S1의 입력 (시장 데이터 → 사업 모델로 확장) |
| R2 기술 실현성 | S2 기술 실현성 | R2 기초 판단 → S2 상세 아키텍처로 심화 |
| R3 경쟁 차별성 | S1 사업 타당성 | R3이 S1에 흡수 (경쟁 우위 = 사업 타당성의 일부) |
| R4 수익 모델 | S1 사업 타당성 | R4가 S1에 흡수 |
| R5 규제/법률 | S4 리스크 커버리지 | R5가 S4에 흡수 |
| R6 실행 계획 | S3 요구사항 추적성 | R6 → S3 (실행 계획 = 요구사항 실현 경로) |
| R7 파트너십 | S4 리스크 커버리지 | R7이 S4에 흡수 (파트너 리스크) |

---

## §6 파일 생성 목록 (최종)

| # | 경로 | 용도 | 라인수 예상 |
|---|------|------|------------|
| 1 | `.claude/agents/shaping-orchestrator.md` | Phase C 루프 조율자 | ~150 |
| 2 | `.claude/agents/shaping-generator.md` | 3단계 PRD 생성자 | ~120 |
| 3 | `.claude/agents/shaping-discriminator.md` | 품질 검증 + 리스크 경고 | ~130 |
| 4 | `.claude/skills/ax-bd-shaping/SKILL.md` | 형상화 스킬 메인 | ~250 |
| 5 | `.claude/skills/ax-bd-shaping/references/rubric-shaping.md` | 형상화 Rubric 5차원 | ~100 |
| 6 | `.claude/skills/ax-bd-shaping/references/checklist-phase-a.md` | Phase A 체크리스트 상세 | ~80 |
| 7 | `.claude/skills/ax-bd-shaping/references/interview-context-template.md` | Phase B 인터뷰 컨텍스트 템플릿 | ~60 |
| | **합계** | | **~890** |

---

## §7 기존 코드/에이전트 재활용

| 기존 자산 | Sprint 110 활용 방식 |
|-----------|---------------------|
| `ogd-orchestrator.md` | shaping-orchestrator 구조 참조 (Phase/Step/수렴 로직 동일 패턴) |
| `ogd-generator.md` | shaping-generator 핵심 원칙 동일 (적대적 개선, 다양성, 변경 로그) |
| `ogd-discriminator.md` | shaping-discriminator 핵심 원칙 동일 (적대적 긴장, 근거 기반, 실행 가능 피드백) |
| `ogd-rubric-bd.md` | rubric-shaping.md 구조 참조 (항목 정의 + 채점 가이드 형식) |
| `/ax:req-interview` 스킬 | Phase B에서 직접 호출 (변경 없음) |

**복사+수정 전략 (Copy-and-Adapt):**
- 기존 ogd-* 에이전트 3종을 복사하여 shaping-* 으로 rename
- 도메인 특화 부분만 수정 (Rubric, 산출물 형식, 입력 컨텍스트)
- 공통 패턴(수렴 판정, search-cache, 상태 관리)은 그대로 유지

---

## §8 테스트 및 검증

### 8.1 구문 검증

| 검증 항목 | 방법 |
|-----------|------|
| 에이전트 frontmatter | YAML 파싱 — name, description, model, tools, color 필수 |
| 스킬 frontmatter | YAML 파싱 — name, description, triggers 필수 |
| 참조 파일 존재 | SKILL.md 내 references/ 경로 전부 존재 확인 |

### 8.2 기능 검증 (Gap Analysis 항목)

| # | 검증 항목 | 기대 결과 |
|---|-----------|-----------|
| 1 | ax-bd-shaping 스킬 존재 + triggers 동작 | "형상화" 키워드로 스킬 트리거 |
| 2 | Phase A 체크리스트 10항목 정의 | checklist-phase-a.md에 10항목 |
| 3 | Phase A 게이트 로직 (80%/50%) | SKILL.md에 게이트 분기 명시 |
| 4 | Phase B req-interview 연동 | 컨텍스트 주입 템플릿 + 호출 방식 명시 |
| 5 | Phase B HITL/auto 모드 분기 | SKILL.md에 mode 파라미터 분기 |
| 6 | shaping-orchestrator 수렴 로직 | Quality ≥ 0.85 + Critical 0 |
| 7 | shaping-generator PRD 템플릿 | 9섹션 PRD 구조 명시 |
| 8 | shaping-discriminator 이중 역할 | quality_critic + risk_warner |
| 9 | Rubric 5차원 정의 | S1~S5 + 가중치 합계 1.0 |
| 10 | 산출물 디렉토리 구조 | _workspace/shaping/{run-id}/ 하위 파일 목록 |
