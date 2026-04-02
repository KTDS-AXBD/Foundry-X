---
code: FX-DSGN-S102
title: "Sprint 102 — ax-bd-discovery v8.2 O-G-D 통합 설계"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
references: "[[FX-PLAN-S102]], [[FX-SPEC-001]], [[FX-REQ-265]]"
---

# Sprint 102: ax-bd-discovery v8.2 O-G-D 통합 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F273 — ax-bd-discovery v8.2 O-G-D 통합 |
| Sprint | 102 |
| 변경 파일 | 4개 (SKILL.md 수정 + references/ 2개 신규 + stages-detail.md 수정) |
| 코드 변경 | 없음 (스킬 문서만 변경) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | O-G-D 에이전트 3종이 BD 발굴 프로세스와 미연결 |
| Solution | SKILL.md O-G-D 섹션 + references/ 단계별 가이드 |
| Function UX Effect | 2-5 Commit Gate에서 O-G-D 자동 안내 |
| Core Value | BD 산출물 품질 일관성 확보 |

## §1 현재 구조 분석

### SKILL.md 구조 (현행)

```
SKILL.md (196줄)
├── frontmatter (1~11)
├── 서브커맨드 표 (18~26)
├── 역할 정의 + 핵심 원칙 (29~49)
├── 2-0 사업 아이템 분류 (51~77)
├── 유형별 강도 매트릭스 (80~93)
├── 사업성 판단 체크포인트 종합 (98~127)
│   ├── 2-1~2-7 체크포인트 표 (100~108)
│   ├── 2-5 Commit Gate 4질문 (110~114)
│   ├── 판단 결과 처리 (116~119)
│   └── 누적 사업성 신호등 (121~126)
├── 단계 전환 명령 (130~136)
├── 산출물 형식 (140~168)
├── 대화 시작 방법 (172~182)
└── Gotchas (186~196)
```

### references/ 구조 (현행)

```
references/
├── ogd-convergence.md     — 수렴 판정 규칙
├── ogd-mode-collapse.md   — Mode Collapse 감지
├── ogd-rubric-bd.md       — 7항목 Rubric 템플릿 v1.1
└── stages-detail.md       — 2-1~2-10 단계별 상세
```

## §2 변경 설계

### 2-1. SKILL.md 변경 — O-G-D 통합 섹션 추가

**삽입 위치**: "누적 사업성 신호등" 블록 (126줄) 뒤, "단계 전환 명령" (130줄) 앞

**신규 섹션 구조**:

```markdown
---

## O-G-D 품질 검증 통합

> 2단계 발굴에서 핵심 산출물의 품질을 O-G-D(Orchestrator-Generator-Discriminator) 적대적 루프로 검증합니다.
> O-G-D 에이전트 상세: `.claude/agents/ogd-*.md` 참조

### 적용 단계

| 단계 | 적용 | Rubric 초점 | 트리거 조건 |
|------|------|-------------|------------|
| **2-5 Commit Gate** | ✅ 필수 | R1~R7 전체 (기본 가중치) | Commit Gate 4질문 시작 전 |
| **2-3 경쟁·자사 분석** | 🔵 선택 | R3 경쟁 차별성 강화 (0.15→0.25) | 담당자 요청 시 |
| **2-7 BM 정의** | 🔵 선택 | R4 수익 모델 강화 (0.15→0.25) | 담당자 요청 시 |

### 2-5 Commit Gate O-G-D (필수)

Commit Gate 진입 시, 지금까지의 발굴 산출물(2-1~2-4)을 O-G-D 루프로 종합 검증합니다.

**실행 흐름**:
1. 2-0~2-4 산출물을 종합하여 **중간 발굴 보고서** 자동 생성
2. `/ogd-orchestrator` 호출 — task: "2-5 Commit Gate 종합 검증", rubric: "bd-discovery", max_rounds: 2
3. O-G-D 루프 수렴 후, Commit Gate 4질문을 품질 보고서와 함께 논의
4. 상세: `references/ogd-commit-gate.md`

**핵심 원칙**: O-G-D가 산출물을 검증하지만, **Commit/대안 탐색/Drop 최종 의사결정은 담당자**가 내립니다.

### 2-3 / 2-7 선택적 O-G-D

담당자가 "경쟁 분석 품질 검증해줘" 또는 "BM 검증해줘"라고 요청하면 단계별 특화 Rubric으로 O-G-D를 실행합니다.

- **2-3**: Rubric R3(경쟁 차별성) 가중치 0.15→0.25, R1(시장 기회) 0.15→0.20
- **2-7**: Rubric R4(수익 모델) 가중치 0.15→0.25, R7(파트너십) 0.10→0.15
- 상세: `references/ogd-stage-rubrics.md`
```

### 2-2. SKILL.md 변경 — Gotchas 갱신

기존 Gotchas에 O-G-D 관련 항목 2개 추가:

```markdown
- **O-G-D 루프 시간**: 2-5 Commit Gate O-G-D는 2라운드 기준 약 5~10분 소요. 시간이 부족하면 `max_rounds: 1`로 축소 가능하나, 품질 보증 수준이 낮아짐
- **O-G-D는 의사결정 보조**: O-G-D 결과가 높은 품질 점수를 보여도 Commit 판단은 반드시 담당자가 수행. O-G-D가 놓칠 수 있는 조직 내부 역학, 정치적 요인, 암묵지는 사람만 판단 가능
```

### 2-3. references/ogd-commit-gate.md (신규)

**목적**: 2-5 Commit Gate에서 O-G-D를 실행하는 구체적 가이드

**구조**:
```
# 2-5 Commit Gate O-G-D 실행 가이드
├── 실행 조건
│   └── 2-0~2-4 산출물 최소 4개 단계 완료 필수
├── 중간 발굴 보고서 자동 생성
│   └── 2-1~2-4 산출물을 R1~R7 구조로 재구성
├── Rubric R1~R7 ↔ Commit Gate 4질문 매핑
│   ├── Q1 "4주 투자 아깝지 않나?" ↔ R1(시장)+R2(기술)+R6(실행)
│   ├── Q2 "조직이 해야 하는 이유?" ↔ R3(차별성)+R7(시너지)
│   ├── Q3 "Pivot 방향 전환 확신?" ↔ 전체 점수 변화 추이
│   └── Q4 "안 되면 잃는 것/얻는 것?" ↔ R5(리스크)+R4(수익)
├── O-G-D 결과 → Commit Gate 논의 연결
│   ├── CONVERGED (≥0.85) → "품질 충분, Commit 권장" + 잔여 이슈 목록
│   ├── FORCED_STOP (<0.85) → "보완 필요 영역" + 대안 탐색 권장
│   └── 판정과 무관하게 담당자 최종 결정
└── 산출물 보관
    └── _workspace/ 결과를 해당 아이템 디렉토리에 보관
```

### 2-4. references/ogd-stage-rubrics.md (신규)

**목적**: 2-3/2-7에서 O-G-D 선택적 사용 시 Rubric 가중치 오버라이드

**구조**:
```
# 단계별 O-G-D Rubric 오버라이드 가이드
├── 기본 Rubric (ogd-rubric-bd.md 참조)
├── 2-3 경쟁·자사 분석 오버라이드
│   ├── R3 0.15→0.25, R1 0.15→0.20
│   ├── R2 0.15→0.10, R4 0.15→0.10
│   ├── R5/R6/R7 유지
│   └── 정규화 총합 = 1.00
├── 2-7 BM 정의 오버라이드
│   ├── R4 0.15→0.25, R7 0.10→0.15
│   ├── R1 0.15→0.10, R3 0.15→0.10
│   ├── R2/R5/R6 유지
│   └── 정규화 총합 = 1.00
├── 커스텀 오버라이드 방법
│   └── Orchestrator 호출 시 context에 가중치 지정
└── 주의사항
    └── 산업 템플릿(ogd-rubric-bd.md §산업 템플릿)과 단계 오버라이드 중첩 시 곱연산
```

### 2-5. stages-detail.md 변경

**2-3 경쟁·자사 분석** (70~88줄 영역):
- "사업성 체크포인트" 위에 O-G-D 안내 블록 추가:
```markdown
### 🔵 O-G-D 선택적 검증
경쟁 분석 보고서의 품질을 검증하려면 "경쟁 분석 O-G-D 돌려줘"라고 요청하세요.
R3(경쟁 차별성) 강화 Rubric으로 Generator가 보고서를 생성하고, Discriminator가 검증합니다.
상세: `references/ogd-stage-rubrics.md`
```

**2-5 핵심 아이템 선정** (132~175줄 영역):
- Commit Gate 4질문 뒤에 O-G-D 필수 블록 추가:
```markdown
### ✅ O-G-D 필수 검증 (Commit Gate 연동)
Commit Gate 진입 전, 2-1~2-4 산출물을 O-G-D 루프로 종합 검증합니다.
AI가 자동으로 `/ogd-orchestrator`를 호출하고, 품질 보고서를 Commit Gate 논의와 함께 제시합니다.
상세: `references/ogd-commit-gate.md`
```

**2-7 비즈니스 모델 정의** (206~252줄 영역):
- "사업성 체크포인트" 위에 O-G-D 안내 블록 추가:
```markdown
### 🔵 O-G-D 선택적 검증
BM 가설의 품질을 검증하려면 "BM O-G-D 돌려줘"라고 요청하세요.
R4(수익 모델) 강화 Rubric으로 BMC/Unit Economics를 검증합니다.
상세: `references/ogd-stage-rubrics.md`
```

## §3 변경 파일 매핑

| # | 파일 | 동작 | 변경 내용 |
|---|------|------|-----------|
| 1 | `.claude/skills/ax-bd-discovery/SKILL.md` | 수정 | O-G-D 통합 섹션(~35줄) + Gotchas 2항목 추가 |
| 2 | `.claude/skills/ax-bd-discovery/references/ogd-commit-gate.md` | 신규 | Commit Gate O-G-D 가이드 (~80줄) |
| 3 | `.claude/skills/ax-bd-discovery/references/ogd-stage-rubrics.md` | 신규 | 단계별 Rubric 오버라이드 (~60줄) |
| 4 | `.claude/skills/ax-bd-discovery/references/stages-detail.md` | 수정 | 2-3, 2-5, 2-7에 O-G-D 안내 블록 각 5줄 |

## §4 검증 기준

| # | 항목 | 기준 |
|---|------|------|
| V1 | SKILL.md O-G-D 섹션 존재 | "O-G-D 품질 검증 통합" 헤딩 + 적용 단계 표 |
| V2 | 2-5 필수 트리거 | SKILL.md에 "필수" 명시 + ogd-commit-gate.md 참조 |
| V3 | 2-3/2-7 선택적 | SKILL.md에 "선택" 명시 + ogd-stage-rubrics.md 참조 |
| V4 | Rubric 매핑 | ogd-commit-gate.md에 R1~R7 ↔ Q1~Q4 매핑 존재 |
| V5 | 가중치 오버라이드 | ogd-stage-rubrics.md에 2-3/2-7 별도 가중치 정규화 |
| V6 | stages-detail.md | 2-3, 2-5, 2-7 각각에 O-G-D 안내 블록 존재 |
| V7 | 기존 기능 무영향 | SKILL.md 기존 구조(2-0, 강도 매트릭스, 산출물 형식 등) 변경 없음 |
| V8 | Gotchas 갱신 | O-G-D 관련 주의사항 2개 추가 |
