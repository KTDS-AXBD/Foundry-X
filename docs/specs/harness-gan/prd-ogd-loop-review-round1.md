---
code: FX-SPEC-OGD-001-R1
title: O-G-D PRD — 외부 AI 교차 검토 Round 1
version: "1.0"
status: Active
category: SPEC
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
models: GPT-4o (CTO), DeepSeek R1 (BD전문가), Gemini 2.0 Flash (PM)
---

# O-G-D PRD 외부 AI 교차 검토 — Round 1

## 검토 요약

| 모델 | 관점 | Critical | Major | Minor |
|------|------|----------|-------|-------|
| GPT-4o | CTO (기술) | 2 | 3 | 1 |
| DeepSeek R1 | BD 전문가 (실무) | 1 | 1 | 1 |
| Gemini 2.0 Flash | PM (제품) | 2 | 3 | 2 |

---

## Critical 발견 (반드시 반영)

### C-1. Rubric 가중치 불균형 + BD 핵심 기준 누락 (DeepSeek R1)

**문제:** 규제/법률 리스크 10%는 현실 BD에서 너무 낮음. 파트너십 적합성, 관계자 매핑, 협상 레버리지 등 BD 핵심 항목 누락.

**수정안:**
| ID | 기준 | 가중치 | 변경 |
|----|------|--------|------|
| R1 | 시장 기회 (TAM/SAM/SOM + 성장성) | 0.15 | ↓ 0.20→0.15 |
| R2 | 기술 실현성 | 0.15 | ↓ 0.20→0.15 |
| R3 | 경쟁 차별성 + 협상 레버리지 | 0.15 | = |
| R4 | 수익 모델 | 0.15 | ↓ 0.20→0.15 |
| R5 | 규제/법률 리스크 | 0.15 | ↑ 0.10→0.15 |
| R6 | 실행 계획 + 관계자 매핑 | 0.15 | = |
| R7 | 파트너십 시너지 (신규) | 0.10 | NEW |

+ **산업 템플릿별 가중치 오버라이드** 옵션 추가

### C-2. 에이전트 에러 핸들링 미정의 (GPT-4o + Gemini)

**문제:** Generator 산출물 오류, Discriminator 판별 실패, 에이전트 타임아웃 시 처리 절차 없음.

**수정안:**
```
에러 핸들링 프로토콜:
1. Generator 타임아웃/실패 → Orchestrator가 재시도 1회 → 실패 시 FORCED_STOP
2. Discriminator 판별 불가 → LOW_CONFIDENCE 태그 + Orchestrator가 직접 판정
3. _workspace/ 파일 손상 → 이전 라운드 산출물 기반 복구
4. 모든 에러 → _workspace/error-log.md에 기록
```

### C-3. YAML 피드백의 사용자 접근성 (Gemini)

**문제:** BD 담당자가 YAML findings[]를 직관적으로 이해하기 어려움.

**수정안:** 최종 보고서(ogd-report.md)를 **Markdown 요약 + 원본 YAML 별첨** 구조로 변경.
- 요약: "Round 0→2에서 품질 점수 0.55→0.87 향상. 주요 개선: 시장 규모 출처 보강, 규제 섹션 신설"
- 별첨: 라운드별 YAML findings 전문

---

## Major 발견 (권장 반영)

### M-1. PoC에서 v8.2 통합 범위 축소 (Gemini)

**문제:** R-08(v8.2 통합)이 PoC에서 예상치 못한 기술 문제를 유발할 수 있음.

**수정안:** R-08을 **Should-Have로 하향**. PoC Phase A~C에서 독립 O-G-D 루프 검증 → Phase D에서 v8.2 통합 시도.

### M-2. 피드백 우선순위를 Must-Have로 상향 (Gemini)

**문제:** R-13(피드백 우선순위)이 없으면 Generator가 사소한 피드백에 집중하여 수렴 지연.

**수정안:** R-13을 **Must-Have로 상향**. Critical > Major > Minor > Suggestion 처리 순서 + 모순 피드백 처리 규칙 포함.

### M-3. BD 속도 요구사항 (DeepSeek R1)

**문제:** 3라운드 10분 소요는 긴급 BD 상황에 부적합.

**수정안:** 
- 기본 MAX_ROUNDS = 2 (PoC)
- "Quick Mode" 추가: 1라운드 + 간소 Rubric (3분 이내)
- 고위험/고가치 아이템만 Full O-G-D (3라운드)

### M-4. 상태 관리 체계화 (GPT-4o)

**문제:** 라운드별 상태 추적이 파일 기반으로만 되어 있고, 중간 실패 시 복구 어려움.

**수정안:** _workspace/ogd-state.yaml 상태 파일 추가:
```yaml
task_id: "ogd-20260402-001"
status: running | converged | forced_stop | error
current_round: 1
max_rounds: 3
best_round: 0
best_score: 0.55
rounds:
  - round: 0
    verdict: MAJOR_ISSUE
    quality_score: 0.55
    strategy: initial
  - round: 1
    verdict: null
    quality_score: null
    strategy: deep_revision
```

### M-5. 통합 지점 단순화 (DeepSeek R1)

**문제:** 2-3(시장 분석)에서 O-G-D 적용은 과함. 빠른 정보 수집 단계에 적대적 루프는 부적절.

**수정안:** 
- **2-5 Commit Gate만 필수** 적용
- 2-3, 2-7은 **선택적 옵션** (사용자가 명시적으로 활성화)

---

## Minor 발견 (참고)

| ID | 발견 | 출처 | 수정안 |
|----|------|------|--------|
| m-1 | 모델 성능/한계 설명 부족 | GPT-4o | agents .md에 모델별 적합 도메인 주석 추가 |
| m-2 | Rubric 업데이트 주기 미정 | Gemini | references/에 버전 관리 + 분기별 검토 주기 명시 |
| m-3 | 데모 환경 미명시 | Gemini | 데모 섹션에 "로컬 Claude Code + Agent Teams 활성화" 명시 |

---

## 반영 판정

| 발견 | 판정 | 사유 |
|------|------|------|
| C-1 Rubric 재설계 | ✅ 반영 | 3사 모두 지적, BD 핵심 가치 |
| C-2 에러 핸들링 | ✅ 반영 | 2사 지적, PoC 안정성 필수 |
| C-3 피드백 접근성 | ✅ 반영 | UX 핵심, 데모 설득력 |
| M-1 v8.2 통합 하향 | ✅ 반영 | PoC 집중 전략 |
| M-2 R-13 상향 | ✅ 반영 | 수렴 속도 핵심 |
| M-3 속도 요구사항 | ⚠️ 부분 반영 | Quick Mode는 추후, MAX_ROUNDS 기본 2로 조정 |
| M-4 상태 관리 | ✅ 반영 | ogd-state.yaml 추가 |
| M-5 통합 지점 단순화 | ✅ 반영 | 2-5만 필수 |
