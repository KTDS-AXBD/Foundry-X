---
code: FX-BD-SHAPING-001
title: AX BD 형상화 단계 (Stage 3→4) PRD
version: 1.0
status: Draft
category: PRD
phase: Phase 10
f-items: F282~F287
sprints: 110~112
created: 2026-04-02
author: AX BD팀
depends-on:
  - harness-gan-agent-architecture.md (O-G-D 패턴)
  - ax-bd-atoz/prd-final.md (7단계 라이프사이클)
  - fx-bd-v1/prd-final.md (BD Pipeline E2E)
---

# AX BD 형상화 단계 (Stage 3→4) PRD

## 1. 개요

### 1.1 배경

AX BD 7단계 라이프사이클에서 **2단계(발굴)**의 산출물(PRD 초안, BMC, 시장 분석)이 **3단계(형상화)**로 넘어갈 때, 엔지니어링 관점의 실현가능성 검증과 다각적 품질 향상이 필요하다. 현재 이 과정은 수동으로 이루어지고 있으며, 반복적인 검토-수정 사이클이 비효율적이다.

### 1.2 목적

2단계 발굴 산출물을 입력으로 받아 **O-G-D(Orchestrator-Generator-Discriminator) 에이전트 파이프라인**을 통해 자동으로 형상화하고, 다중 AI 전문가 페르소나 리뷰와 Six Hats 토론을 거쳐 내부 품질 기준에 도달한 최종 PRD를 생성한다. HITL(Human-In-The-Loop) 검토 전까지 전 과정을 자동화한다.

### 1.3 범위

| 포함 | 제외 |
|------|------|
| 2단계 PRD 점검 및 갭 분석 | 2단계 발굴 프로세스 자체 (기존 ax-bd-discovery v8.2) |
| /ax:req-interview 스킬 실행 | 5단계 이후 사업화 프로세스 |
| 3단계 PRD 자동 생성 | 실제 기술 PoC 구현 |
| 다중 AI 모델 검토 + Six Hats 토론 | 외부 이해관계자 미팅 |
| 전문가 AI 페르소나 리뷰 (TA/AA/CA/DA/QA) | |
| HITL 편집 게시 (Foundry-X Web) | |
| 2→4단계 자동 진행 모드 | |

---

## 2. 파이프라인 아키텍처

### 2.1 전체 흐름

```
[2단계 발굴 산출물]
        │
        ▼
┌───────────────────────────────┐
│  Phase A: 입력 점검 & 갭 분석  │  ← 2단계 PRD 완전성 검증
└───────────┬───────────────────┘
            │
            ▼
┌───────────────────────────────┐
│  Phase B: 요구사항 인터뷰       │  ← /ax:req-interview 스킬
└───────────┬───────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────┐
│  Phase C: O-G-D 형상화 루프                                │
│                                                           │
│  ┌─────────────┐    ┌───────────┐    ┌──────────────┐    │
│  │ Orchestrator │───▶│ Generator │───▶│Discriminator │    │
│  │ (조율+수렴)  │◀───│ (PRD 생성)│◀───│(품질+리스크) │    │
│  └─────────────┘    └───────────┘    └──────────────┘    │
│         │                                                 │
│         ▼                                                 │
│  ┌──────────────────────────┐                            │
│  │ 수렴 판정 (Quality ≥ 0.85)│                            │
│  └──────────────────────────┘                            │
└───────────┬───────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────┐
│  Phase D: 다중 AI 모델 검토 + Six Hats 토론 │
│                                           │
│  Model-A ──┐                              │
│  Model-B ──┼──▶ 교차 검토 ──▶ Six Hats    │
│  Model-C ──┘              (6색 모자 토론)  │
│                                           │
│  수렴 판정 → 미달 시 Phase C로 회귀        │
└───────────┬───────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────┐
│  Phase E: 전문가 AI 페르소나 리뷰                │
│                                               │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐         │
│  │ TA │ │ AA │ │ CA │ │ DA │ │ QA │  (병렬)  │
│  └──┬─┘ └──┬─┘ └──┬─┘ └──┬─┘ └──┬─┘         │
│     └──────┴──────┴──────┴──────┘             │
│                    │                           │
│              통합 리뷰 보고서                    │
│                    │                           │
│  수렴 판정 → 미달 시 Phase C로 회귀             │
└───────────┬───────────────────────────────────┘
            │
            ▼
┌───────────────────────────────┐
│  Phase F: HITL 게시 & 편집      │  ← Foundry-X Web 에디터
│  (또는 자동모드: AI 자가 리뷰)   │
└───────────────────────────────┘
```

### 2.2 Phase 간 의존성

| Phase | 입력 | 출력 | 게이트 조건 |
|-------|------|------|------------|
| A | 2단계 PRD + BMC + 시장분석 | 갭 분석 보고서 + 보강된 컨텍스트 | 필수 항목 80%+ 충족 |
| B | Phase A 산출물 | 요구사항 인터뷰 결과 (구조화) | 핵심 요구사항 5개+ 도출 |
| C | Phase A+B 통합 컨텍스트 | 3단계 PRD v1 (O-G-D 수렴) | Quality Score ≥ 0.85, Critical 0건 |
| D | Phase C PRD | 다중 모델 교차 검토 + Six Hats 종합 | 6개 관점 모두 "수용 가능" 이상 |
| E | Phase D PRD | 전문가 통합 리뷰 보고서 | 전 영역 Major 이슈 0건 |
| F | Phase E PRD (최종) | HITL 승인된 최종 PRD | 사람 승인 (또는 AI 자가 리뷰 Pass) |

---

## 3. Phase별 상세 설계

### 3.1 Phase A — 입력 점검 & 갭 분석

**목적:** 2단계 발굴에서 나온 산출물의 완전성과 품질을 점검하여, 형상화에 필요한 정보가 충분한지 판단한다.

**점검 항목 (체크리스트):**

| 카테고리 | 항목 | 필수/선택 |
|----------|------|----------|
| 시장 | 타겟 시장 정의 + TAM/SAM/SOM | 필수 |
| 시장 | 경쟁사 분석 (3사 이상) | 필수 |
| 고객 | 페르소나 정의 (1개 이상) | 필수 |
| 고객 | Pain Point + Jobs-to-be-Done | 필수 |
| 가치 | Value Proposition 명시 | 필수 |
| 가치 | BMC 캔버스 (9블록 완성) | 필수 |
| 기술 | 핵심 기술 요소 식별 | 필수 |
| 기술 | 기술 실현가능성 초기 판단 | 선택 |
| 수익 | 수익 모델 초안 | 선택 |
| 리스크 | 주요 리스크 식별 (3개 이상) | 선택 |

**갭 처리 전략:**
- 필수 항목 누락 → Phase B(요구사항 인터뷰)에서 보강 요청 포함
- 선택 항목 누락 → Phase C의 Generator가 자동 보강
- 필수 항목 50% 미만 충족 → 2단계로 반려 (자동 진행 차단)

### 3.2 Phase B — 요구사항 인터뷰 (/ax:req-interview)

**목적:** 2단계 PRD의 갭을 메우고, 형상화에 필요한 심층 요구사항을 구조화한다.

**실행 방식:**
- 기존 `/ax:req-interview` 스킬을 호출하되, Phase A의 갭 분석 결과를 컨텍스트로 주입
- 인터뷰 대상: 사업 아이디어 제안자 (HITL) 또는 AI 페르소나 (자동 모드)
- 인터뷰 결과는 구조화된 JSON으로 저장하여 Phase C Generator의 입력으로 활용

**산출물 스키마:**
```yaml
req_interview_result:
  business_requirements:    # 사업 요구사항
    - id: BR-001
      description: "..."
      priority: Must | Should | Could
      source: "인터뷰 응답 / 갭 분석 추론"
  technical_constraints:    # 기술 제약사항
    - id: TC-001
      description: "..."
      impact: High | Medium | Low
  success_criteria:         # 성공 기준
    - id: SC-001
      metric: "..."
      target: "..."
  open_questions:           # 미해결 질문 (Phase C에서 Generator가 가정 기반으로 처리)
    - id: OQ-001
      question: "..."
      assumption: "..."     # Generator가 채울 가정
```

### 3.3 Phase C — O-G-D 형상화 루프

**목적:** Phase A+B의 통합 컨텍스트를 기반으로, O-G-D 적대적 루프를 통해 고품질 3단계 PRD를 생성한다.

**아키텍처:** `harness-gan-agent-architecture.md`의 O-G-D 패턴을 그대로 적용한다.

#### Orchestrator 설정

```yaml
orchestrator:
  max_rounds: 3
  convergence_threshold: 0.85
  rubric:
    dimensions:
      - name: "사업 타당성"
        weight: 0.25
        criteria: ["시장 규모 근거", "경쟁 우위 명확성", "수익 모델 구체성"]
      - name: "기술 실현성"
        weight: 0.25
        criteria: ["아키텍처 완성도", "기술 스택 적합성", "PoC 가능성"]
      - name: "요구사항 추적성"
        weight: 0.20
        criteria: ["BR→Feature 매핑", "TC→아키텍처 반영", "SC→KPI 연결"]
      - name: "리스크 커버리지"
        weight: 0.15
        criteria: ["기술 리스크 식별", "시장 리스크 식별", "완화 전략 구체성"]
      - name: "문서 완성도"
        weight: 0.15
        criteria: ["섹션 완전성", "용어 일관성", "참조 무결성"]
```

#### Generator 역할

- 3단계 PRD 전체를 생성 (아키텍처, 기능 명세, 비기능 요구사항, 마일스톤, 리스크 매트릭스)
- Discriminator 피드백 기반 개선 시 변경 로그 필수 작성
- 이전 라운드와 다른 접근 시도 (Mode Collapse 방지)

#### Discriminator 역할 (품질 검증 + 리스크 경고 복합)

```yaml
discriminator:
  roles:
    quality_critic:          # 품질 검증자
      - rubric 기반 체계적 평가
      - 결함 심각도 분류 (Critical/Major/Minor/Suggestion)
      - 실행 가능한 개선 피드백
    risk_warner:             # 리스크 경고자
      - 기술적 리스크 식별 (구현 불가능, 스케일 한계 등)
      - 시장 리스크 식별 (시장 축소, 규제 변화 등)
      - 조직 리스크 식별 (역량 부족, 일정 비현실 등)
      - 누락된 리스크 항목 지적
  output:
    verdict: PASS | MINOR_FIX | MAJOR_ISSUE
    quality_score: 0.0 ~ 1.0
    findings: [...]          # 품질 피드백
    risk_alerts: [...]       # 리스크 경고
```

### 3.4 Phase D — 다중 AI 모델 검토 + Six Hats 토론

**목적:** 단일 모델의 편향을 제거하고, 다각적 관점에서 PRD를 검증한다.

#### 다중 모델 교차 검토

Phase C에서 수렴한 PRD를 서로 다른 AI 모델 3개에 독립적으로 검토 요청한다.

```yaml
cross_review:
  models:
    - id: model-a
      role: "기술 실현성 중심 검토"
      focus: ["아키텍처", "기술 스택", "성능 요구사항"]
    - id: model-b
      role: "사업성 중심 검토"
      focus: ["수익 모델", "시장 분석", "경쟁 전략"]
    - id: model-c
      role: "사용자 경험 중심 검토"
      focus: ["UX 흐름", "페르소나 적합성", "채택 장벽"]
  aggregation: "합의 매트릭스 — 2/3 이상 동의 항목은 확정, 불일치 항목은 Six Hats로 이관"
```

#### Six Hats 토론

Edward de Bono의 Six Thinking Hats를 AI 페르소나로 구현하여, 불일치 항목과 핵심 의사결정에 대해 구조화된 토론을 진행한다.

| 모자 | 색상 | 관점 | AI 페르소나 역할 |
|------|------|------|------------------|
| 백색 | White | 데이터/사실 | 객관적 데이터와 근거만으로 판단. "수치가 뒷받침하는가?" |
| 적색 | Red | 감정/직관 | 고객과 이해관계자의 감정적 반응 예측. "사용자가 이걸 원할까?" |
| 흑색 | Black | 비판/리스크 | 최악의 시나리오와 실패 가능성 탐색. "왜 이것이 실패할 수 있는가?" |
| 황색 | Yellow | 낙관/가치 | 최선의 시나리오와 기회 탐색. "성공하면 어떤 가치를 만드는가?" |
| 녹색 | Green | 창의/대안 | 새로운 접근법과 대안 제시. "다른 방법은 없는가?" |
| 청색 | Blue | 메타/프로세스 | 토론 조율 및 결론 도출. "합의점은 무엇이고 남은 쟁점은?" |

**토론 프로토콜:**

```
Round 1: 각 모자별 독립 의견 (Fan-out, 병렬)
Round 2: 상충 의견에 대한 반론 교환 (Structured Debate)
Round 3: Blue Hat이 합의안 도출 + 미합의 항목 정리
```

**수렴 기준:** 6개 관점 중 5개 이상 "수용 가능" → 통과. 4개 이하 → Phase C로 회귀 (Orchestrator가 피드백 통합)

### 3.5 Phase E — 전문가 AI 페르소나 리뷰

**목적:** 엔지니어링 각 분야의 전문가 관점에서 PRD를 세분화 리뷰하고, 통합한다.

#### 전문가 페르소나 정의

| 역할 | 약칭 | 리뷰 초점 | 산출물 |
|------|------|-----------|--------|
| Technical Architect | TA | 시스템 아키텍처, 기술 스택, 확장성, 통합 전략 | 아키텍처 리뷰 보고서 |
| Application Architect | AA | 애플리케이션 구조, API 설계, 모듈 분리, 데이터 흐름 | 앱 구조 리뷰 보고서 |
| Cloud Architect | CA | 인프라, 배포 전략, 비용 최적화, 보안 | 클라우드 리뷰 보고서 |
| Data Architect | DA | 데이터 모델, 저장소 전략, 데이터 파이프라인, 개인정보보호 | 데이터 리뷰 보고서 |
| Quality Assurance | QA | 테스트 전략, 품질 기준, 비기능 요구사항, 수용 기준 | QA 리뷰 보고서 |

#### 리뷰 프로세스

```
Step 1: 병렬 독립 리뷰 (Fan-out)
  TA ──┐
  AA ──┤
  CA ──┼──▶ 각자 독립적으로 자기 영역 리뷰
  DA ──┤
  QA ──┘

Step 2: 교차 영향 분석
  - TA의 아키텍처 결정이 CA의 인프라 비용에 미치는 영향
  - DA의 데이터 모델이 AA의 API 설계에 미치는 영향
  - QA의 테스트 전략이 전체 일정에 미치는 영향

Step 3: 통합 리뷰 보고서 생성
  - 영역별 이슈 목록 (severity 분류)
  - 교차 영향 매트릭스
  - 통합 권고사항
  - Phase C 회귀 필요 여부 판정
```

#### 각 페르소나의 Rubric

```yaml
ta_rubric:
  - "컴포넌트 분리가 명확한가 (Separation of Concerns)"
  - "확장 지점(Extension Point)이 설계되어 있는가"
  - "기술 부채(Tech Debt) 리스크가 관리되고 있는가"
  - "비기능 요구사항(NFR)이 아키텍처에 반영되어 있는가"

aa_rubric:
  - "API 계약(Contract)이 명세되어 있는가"
  - "모듈 간 의존성이 최소화되어 있는가"
  - "에러 처리 전략이 일관적인가"
  - "데이터 흐름이 추적 가능한가"

ca_rubric:
  - "배포 전략이 구체적인가 (Region, Scaling, DR)"
  - "비용 추정이 현실적인가"
  - "보안 경계(Security Boundary)가 정의되어 있는가"
  - "모니터링/알림 전략이 있는가"

da_rubric:
  - "데이터 모델이 정규화/비정규화 전략을 명시하는가"
  - "데이터 수명주기(생성→아카이빙→삭제)가 정의되어 있는가"
  - "개인정보보호(PIPA/GDPR) 요구사항이 반영되어 있는가"
  - "데이터 마이그레이션 전략이 있는가"

qa_rubric:
  - "테스트 레벨(Unit/Integration/E2E)별 전략이 있는가"
  - "수용 기준(Acceptance Criteria)이 측정 가능한가"
  - "비기능 테스트(성능/보안/접근성) 계획이 있는가"
  - "결함 관리 프로세스가 정의되어 있는가"
```

**수렴 기준:** 전 영역 Major 이슈 0건 + 전체 Quality Score ≥ 0.85 → Phase F 진행. 미달 시 Phase C로 회귀.

### 3.6 Phase F — HITL 게시 & 편집

**목적:** 최종 PRD를 Foundry-X Web에 편집 가능한 형태로 게시하여, 사람이 검토하고 승인한다.

**게시 형식:**
- Foundry-X Web의 PRD 에디터에 마크다운으로 렌더링
- 각 섹션별 "승인/수정요청/반려" 인라인 액션
- Phase E 전문가 리뷰 보고서를 사이드 패널로 함께 표시
- 변경 이력(diff) 제공 — 2단계 PRD 대비 무엇이 추가/변경되었는지

**승인 워크플로:**
```
검토자가 섹션별 액션 선택:
├─ 전체 승인 → 4단계(사업화 준비)로 자동 이관
├─ 부분 수정요청 → 수정 후 재검토 (Phase C로 회귀하지 않음, 국소 편집)
└─ 반려 → Phase A로 회귀 (사유 기록 필수)
```

---

## 4. 자동 진행 모드 (2→4단계 연속 자동화)

### 4.1 설계 철학

HITL 검토를 AI 페르소나 자가 리뷰로 대체하여, 2단계 발굴 완료 후 4단계(형상화 완료)까지 사람 개입 없이 자동 진행할 수 있는 모드를 제공한다. 단, 이 모드는 "사람이 나중에 반드시 검토한다"는 전제 하에 동작한다.

### 4.2 AI 자가 리뷰 페르소나

Phase F의 HITL 검토를 대체하는 AI 페르소나:

```yaml
auto_reviewer:
  personas:
    - id: product-owner
      perspective: "이 PRD가 사업 목표를 달성할 수 있는가?"
      acceptance: "사업 KPI 달성 경로가 명확하고 현실적인가"
    - id: tech-lead
      perspective: "이 PRD를 기반으로 개발팀이 즉시 착수할 수 있는가?"
      acceptance: "기술적 모호함이 없고 우선순위가 명확한가"
    - id: end-user
      perspective: "이 제품/서비스를 내가 사용하고 싶은가?"
      acceptance: "핵심 가치가 직관적으로 이해되고 매력적인가"
  consensus_rule: "3 페르소나 모두 Pass → 자동 승인, 1개라도 Fail → HITL 에스컬레이션"
```

### 4.3 자동 진행 흐름

```
[2단계 발굴 완료]
     │
     ▼
Phase A → B → C → D → E → F(자동 리뷰)
     │                           │
     │    ◀─── 회귀 루프 ────────┘ (품질 미달 시)
     │
     ▼
[4단계 형상화 완료 — "Draft" 상태로 저장]
     │
     ▼
[사람에게 알림: "형상화 자동 완료, 검토 필요"]
```

### 4.4 안전장치

| 안전장치 | 설명 |
|----------|------|
| 최대 전체 반복 횟수 | Phase C↔D↔E 회귀 루프 최대 3회. 초과 시 강제 중단 + HITL 에스컬레이션 |
| Draft 상태 강제 | 자동 모드 산출물은 반드시 "Draft" 상태. "Approved"는 사람만 가능 |
| 변경 추적 의무 | 모든 Phase의 입출력과 의사결정 로그를 Git에 기록 (감사 추적) |
| 비용 상한 | 전체 파이프라인 1회 실행당 토큰 비용 상한 설정 (초과 시 중단) |
| 자동 커밋 금지 | BD 산출물은 자동 커밋 절대 금지 원칙 유지 — Draft 저장만 허용 |

---

## 5. 에이전트 구성

### 5.1 파일 구조 (Harness 규격)

```
.claude/
├── agents/
│   ├── shaping-orchestrator.md         # 형상화 전체 조율자
│   ├── shaping-generator.md            # 3단계 PRD 생성자
│   ├── shaping-discriminator.md        # 품질 검증 + 리스크 경고
│   ├── six-hats-moderator.md           # Six Hats 토론 진행자 (Blue Hat)
│   ├── expert-ta.md                    # Technical Architect 페르소나
│   ├── expert-aa.md                    # Application Architect 페르소나
│   ├── expert-ca.md                    # Cloud Architect 페르소나
│   ├── expert-da.md                    # Data Architect 페르소나
│   ├── expert-qa.md                    # Quality Assurance 페르소나
│   └── auto-reviewer.md               # 자동 모드 HITL 대체 페르소나
└── skills/
    └── ax-bd-shaping/
        ├── SKILL.md                    # 형상화 스킬 메인
        └── references/
            ├── rubric-shaping.md       # 형상화 전용 Rubric
            ├── six-hats-protocol.md    # Six Hats 토론 프로토콜
            ├── expert-review-guide.md  # 전문가 리뷰 가이드
            └── auto-mode-guide.md      # 자동 진행 모드 가이드
```

### 5.2 팀 패턴 조합

형상화 파이프라인은 Harness의 팀 패턴을 복합적으로 활용한다:

| Phase | 팀 패턴 | 이유 |
|-------|---------|------|
| A | Pipeline | 순차 점검 |
| B | Pipeline | req-interview → 구조화 |
| C | Generation-Validation (O-G-D) | 적대적 품질 향상 |
| D | Fan-out → Expert Pool | 다중 모델 병렬 검토 → Six Hats 라우팅 |
| E | Fan-out → Fan-in | 전문가 병렬 리뷰 → 통합 |
| F | Supervisor | HITL/자동 모드 분기 |

---

## 6. 데이터 모델 (D1 스키마 확장)

### 6.1 신규 테이블

```sql
-- 형상화 실행 이력
CREATE TABLE shaping_runs (
  id TEXT PRIMARY KEY,
  discovery_prd_id TEXT NOT NULL,       -- 2단계 PRD 참조
  status TEXT NOT NULL DEFAULT 'running', -- running | completed | failed | escalated
  mode TEXT NOT NULL DEFAULT 'hitl',     -- hitl | auto
  current_phase TEXT NOT NULL DEFAULT 'A',
  total_iterations INTEGER DEFAULT 0,
  max_iterations INTEGER DEFAULT 3,
  quality_score REAL,
  token_cost INTEGER DEFAULT 0,
  token_limit INTEGER DEFAULT 500000,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  org_id TEXT NOT NULL
);

-- Phase별 실행 로그
CREATE TABLE shaping_phase_logs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES shaping_runs(id),
  phase TEXT NOT NULL,                   -- A | B | C | D | E | F
  round INTEGER DEFAULT 0,
  input_snapshot TEXT,                   -- JSON: 입력 요약
  output_snapshot TEXT,                  -- JSON: 출력 요약
  verdict TEXT,                          -- PASS | MINOR_FIX | MAJOR_ISSUE | ESCALATED
  quality_score REAL,
  findings TEXT,                         -- JSON: findings[]
  duration_ms INTEGER,
  created_at TEXT NOT NULL
);

-- 전문가 리뷰 결과
CREATE TABLE shaping_expert_reviews (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES shaping_runs(id),
  expert_role TEXT NOT NULL,             -- TA | AA | CA | DA | QA
  review_body TEXT NOT NULL,             -- 마크다운
  findings TEXT,                         -- JSON: findings[]
  quality_score REAL,
  created_at TEXT NOT NULL
);

-- Six Hats 토론 기록
CREATE TABLE shaping_six_hats (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES shaping_runs(id),
  hat_color TEXT NOT NULL,               -- white | red | black | yellow | green | blue
  round INTEGER NOT NULL,
  opinion TEXT NOT NULL,
  verdict TEXT,                          -- accept | concern | reject
  created_at TEXT NOT NULL
);
```

---

## 7. 기존 프로세스와의 정합성

### 7.1 AX BD 7단계 라이프사이클 매핑

| BD 단계 | Foundry-X 기능 | 형상화 PRD 연관 |
|---------|---------------|----------------|
| 1단계 (아이디어 수집) | F179 수집 채널 통합 | Phase A 입력 소스 |
| 2단계 (발굴) | ax-bd-discovery v8.2, F175~F185 | **직접 입력** (Phase A) |
| 3단계 (형상화) | **본 PRD** (Phase A~E) | **핵심 범위** |
| 4단계 (형상화 완료) | **본 PRD** (Phase F) | **출력** |
| 5단계 (사업화 준비) | F234~F240 BDP/ORB/PRB | 본 PRD 산출물 소비 |
| 6단계 (실행) | 기존 프로젝트 관리 | — |
| 7단계 (성과 관리) | KPI 대시보드 | — |

### 7.2 기존 O-G-D 아키텍처와의 관계

`harness-gan-agent-architecture.md`에 정의된 O-G-D 패턴은 Phase C에서 그대로 활용한다. 본 PRD는 O-G-D를 **형상화 도메인에 특화**하여 적용한 것이며, 추가로 Phase D(Six Hats)와 Phase E(전문가 리뷰)를 O-G-D 루프의 외곽에 배치하여 **다층 품질 게이트** 구조를 형성한다.

### 7.3 기존 스킬 체계와의 관계

| 기존 스킬 | 형상화에서의 역할 |
|-----------|------------------|
| ax-bd-discovery (v8.2) | Phase A의 입력 생성자 — 변경 없음 |
| ai-biz 11종 서브스킬 | Phase C Generator가 필요 시 호출 (cost-model, feasibility-study 등) |
| /ax:req-interview | Phase B에서 직접 호출 |
| ogd-loop (신규) | Phase C의 핵심 엔진 |
| ax-bd-shaping (신규) | 전체 파이프라인 오케스트레이션 |

---

## 8. 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| PRD 품질 점수 (O-G-D 수렴 시점) | ≥ 0.85 | Phase C Orchestrator 자동 측정 |
| 평균 O-G-D 라운드 수 | ≤ 2.5 | shaping_phase_logs 집계 |
| Six Hats 합의율 (5/6 이상 동의) | ≥ 80% | shaping_six_hats 집계 |
| 전문가 리뷰 Major 이슈 0건 비율 | ≥ 70% | shaping_expert_reviews 집계 |
| HITL 검토 시 수정 비율 | ≤ 20% | Phase F 수정요청 비율 |
| 자동 모드 HITL 에스컬레이션 비율 | ≤ 30% | shaping_runs 집계 |
| 2→4단계 평균 소요 시간 | ≤ 30분 (자동) / ≤ 2시간 (HITL) | shaping_runs 집계 |
| 파이프라인 1회 평균 토큰 비용 | ≤ 300K tokens | shaping_runs 집계 |

---

## 9. 구현 로드맵

| Sprint | 항목 | 내용 |
|--------|------|------|
| N | Phase A+B 구현 | 입력 점검 체크리스트 + req-interview 연동 |
| N+1 | Phase C 구현 | O-G-D 루프 (shaping-orchestrator/generator/discriminator) |
| N+2 | Phase D 구현 | 다중 모델 교차 검토 + Six Hats 토론 엔진 |
| N+3 | Phase E 구현 | 5종 전문가 AI 페르소나 + 통합 리뷰 보고서 |
| N+4 | Phase F 구현 | HITL Web 에디터 + 자동 모드 |
| N+5 | 통합 + E2E | 전체 파이프라인 E2E 테스트 + 성능 최적화 |

---

## 10. 리스크 및 완화 전략

| 리스크 | 영향 | 완화 전략 |
|--------|------|-----------|
| 토큰 비용 폭증 (다층 루프) | 비용 초과 | 토큰 상한 설정 + Phase별 조기 종료 |
| AI 페르소나 편향 (자가 리뷰 한계) | 품질 저하 | 다중 모델 교차 검토로 편향 상쇄 + HITL 최종 게이트 |
| 무한 회귀 루프 | 시스템 hang | MAX_ROUNDS=3 하드 리밋 + 전체 반복 3회 상한 |
| Discriminator Collapse (관대해짐) | 품질 기준 하락 | 외부 Rubric 고정 + Rubric 진화 메커니즘 |
| 전문가 페르소나 간 모순 의견 | 의사결정 지연 | 우선순위 체계 (Critical > Major) + Orchestrator 중재 |
| 자동 모드 남용 | 검토 없는 산출물 양산 | Draft 강제 + 사람 알림 필수 + 감사 로그 |

---

---

## 11. 리뷰 결정 사항 (세션 #168)

| 항목 | 결정 | 근거 |
|------|------|------|
| 파이프라인 범위 | 6 Phase 전체 (A~F) | 다층 품질 게이트로 최대 품질 확보 |
| 저장 전략 | D1(메타데이터/상태) + Git(산출물 본문) 병행 | SSOT 원칙 유지 + DB 쿼리 가능 |
| 실행 환경 | 스킬(Phase A~E) + API(Phase F HITL) | 단계적 구현 — 에이전트는 CC 스킬, Web은 API |
| 모델 구성 | OpenRouter 3모델 (Claude + GPT-4 + Gemini) | 기존 claude-code-router 인프라 활용 |
| Sprint 분할 | 3 Sprint (A+B+C / D+E / F) | Phase A~C는 기존 패턴 재활용, D+E는 에이전트 설계 중심, F는 Web UI |
| 우선순위 | BD 데모(F279~F281)와 병행, Sprint 110~112 | F279~F281 Sprint 108~109 완료 후 자연스럽게 이어짐 |
| SPEC 등록 | F282~F287 (FX-REQ-274~279) | Sprint 110~112 배치 |

### PRD 피드백 (AI 초안 → 보강 필요 사항)

1. **토큰 비용 추정 보강 필요** — 300K 상한이 6 Phase 전체를 커버하는지 Phase별 토큰 예산 분배 추가 권장
2. **D1 + Git 병행 저장** — PRD §6에는 D1만 명시되어 있으나, 산출물 본문은 `docs/shaping/{run-id}/` Git 저장으로 변경
3. **기존 F188(Six Hats) + F186(다중 AI 검토) 코드 재활용** — Phase D/E는 Sprint 55~56에서 이미 구현된 코드 활용 가능
4. **Phase A 점검 체크리스트 → 기존 ax-bd-discovery v8.2 체크포인트와 중복** — 통합 전략 필요

*검토일: 2026-04-02 | 세션 #168 | Sinclair Seo*
