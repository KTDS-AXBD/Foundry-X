---
code: FX-DSGN-S111
title: "Sprint 111 — F284+F285 BD 형상화 Phase D+E Design"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
references: "[[FX-PLAN-S111]], [[FX-BD-SHAPING-001]], [[FX-SPEC-001]]"
---

# Sprint 111: F284+F285 BD 형상화 Phase D+E Design

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F284: Phase D (교차 검토 + Six Hats) / F285: Phase E (전문가 5종 리뷰) |
| Plan | docs/01-plan/features/sprint-111.plan.md |
| PRD | docs/specs/prd-shaping-v1.md §3.4~§3.5 |
| 변경 범위 | 에이전트 6종 신규 + 참조 2종 신규 + SKILL.md/shaping-orchestrator 수정 |

---

## 1. six-hats-moderator 에이전트

### 파일: `.claude/agents/six-hats-moderator.md`

```yaml
# Frontmatter
name: six-hats-moderator
description: "BD 형상화 Phase D Six Hats 토론 진행자 — 6색 모자 의견 수집, 반론 교환, 합의안 도출"
model: sonnet
tools: [Read, Write, Glob, Grep]
color: blue
```

### 실행 프로토콜

**입력:**
- `workspace`: 작업 디렉토리 (`_workspace/shaping/{run-id}/`)
- `cross_review_path`: 교차 검토 결과 파일 경로
- `prd_path`: Phase C/D 최종 PRD 경로

**프로세스:**

1. **Round 1 — 독립 의견 (Fan-out 시뮬레이션)**
   - 6색 모자 각각의 관점으로 PRD + 교차 검토 불일치 항목을 순회 평가
   - 모자별 출력 형식:
     ```markdown
     ## [Hat Color] 관점
     ### 핵심 의견
     [1~3 문장]
     ### 상세 분석
     [해당 관점의 상세 분석]
     ### 판정: [accept | concern | reject]
     ```

2. **Round 2 — 반론 교환**
   - Black Hat(비판)의 reject/concern에 대해 Yellow Hat(낙관)이 반론
   - Red Hat(감정)과 White Hat(데이터)이 근거 교환
   - Green Hat(창의)이 대안 제시

3. **Round 3 — 합의안 도출 (Blue Hat 종합)**
   - 합의 항목 정리 (5/6 이상 accept)
   - 미합의 항목 + 권고사항
   - Phase C 회귀 필요 여부 판정

**산출물:** `{workspace}/phase-d-six-hats.md`

```markdown
# Phase D: Six Hats 토론 결과

## 1. 교차 검토 요약
[3모델 교차 검토 결과 인용]

## 2. Round 1 — 독립 의견
### White Hat (데이터/사실)
...
### Red Hat (감정/직관)
...
### Black Hat (비판/리스크)
...
### Yellow Hat (낙관/가치)
...
### Green Hat (창의/대안)
...
### Blue Hat (메타/프로세스)
...

## 3. Round 2 — 반론 교환
[상충 의견에 대한 반론]

## 4. Round 3 — 합의안
### 합의 항목 (5/6 이상 accept)
- [항목 목록]
### 미합의 항목 + 권고사항
- [항목 + 권고]
### 판정
- 결과: [PASS | FAIL]
- Accept 비율: [N/6]
- Phase C 회귀: [Yes/No]
```

---

## 2. Phase D 교차 검토 로직 (SKILL.md Step 4)

### SKILL.md에 추가할 Step 4 구조

```
[Step 4] Phase D -- 다중 AI 모델 교차 검토 + Six Hats 토론
    |
    v
  [4a] Phase C 최종 PRD 읽기
    |
    v
  [4b] 3관점 교차 검토 (단일 모델, 3번 호출 — 관점별 프롬프트)
    |  기술 실현성 / 사업성 / UX 관점
    |  -> phase-d-cross-review.md
    v
  [4c] 합의 매트릭스 생성
    |  2/3 동의 -> 확정 / 불일치 -> Six Hats 이관
    v
  [4d] six-hats-moderator Agent 호출
    |  -> phase-d-six-hats.md
    v
  [4e] 수렴 판정
    |  5/6 accept -> Step 5 / 4개 이하 -> Step 3 회귀
    v
```

### 교차 검토 구현 상세

OpenRouter 다중 모델 사용은 **Phase D 초기 버전에서는 단일 모델 3관점 검토로 대체**:
- 이유: OpenRouter API 키 관리 + 토큰 비용 제어 필요
- 단일 모델(현재 세션의 모델)로 3번 독립 호출, 각각 다른 검토 관점 프롬프트
- 향후 OpenRouter 3모델로 전환 시 프롬프트 구조는 동일 (모델 ID만 변경)

합의 매트릭스 형식:
```markdown
## 합의 매트릭스

| PRD 섹션 | 기술 | 사업 | UX | 합의 | 비고 |
|----------|------|------|-----|------|------|
| §1 시장 분석 | ✅ | ✅ | ✅ | 확정 | |
| §3 아키텍처 | ✅ | ⚠️ | ✅ | 확정 | 사업 관점 부분 우려 |
| §5 MVP | ❌ | ✅ | ❌ | Six Hats | 기술+UX 불일치 |
```

---

## 3. 전문가 에이전트 5종

### 공통 Frontmatter 구조

```yaml
name: expert-{role}
description: "BD 형상화 Phase E — {Role Name} 전문가 AI 페르소나 리뷰"
model: haiku
tools: [Read, Grep, Glob]
color: {role-specific}
```

### 각 에이전트 상세

#### expert-ta.md (Technical Architect)
- color: red
- 리뷰 초점: 시스템 아키텍처, 기술 스택, 확장성, 통합 전략
- Rubric 4항목:
  1. 컴포넌트 분리가 명확한가 (Separation of Concerns)
  2. 확장 지점(Extension Point)이 설계되어 있는가
  3. 기술 부채(Tech Debt) 리스크가 관리되고 있는가
  4. 비기능 요구사항(NFR)이 아키텍처에 반영되어 있는가

#### expert-aa.md (Application Architect)
- color: green
- 리뷰 초점: 애플리케이션 구조, API 설계, 모듈 분리, 데이터 흐름
- Rubric 4항목:
  1. API 계약(Contract)이 명세되어 있는가
  2. 모듈 간 의존성이 최소화되어 있는가
  3. 에러 처리 전략이 일관적인가
  4. 데이터 흐름이 추적 가능한가

#### expert-ca.md (Cloud Architect)
- color: cyan
- 리뷰 초점: 인프라, 배포 전략, 비용 최적화, 보안
- Rubric 4항목:
  1. 배포 전략이 구체적인가 (Region, Scaling, DR)
  2. 비용 추정이 현실적인가
  3. 보안 경계(Security Boundary)가 정의되어 있는가
  4. 모니터링/알림 전략이 있는가

#### expert-da.md (Data Architect)
- color: yellow
- 리뷰 초점: 데이터 모델, 저장소 전략, 데이터 파이프라인, 개인정보보호
- Rubric 4항목:
  1. 데이터 모델이 정규화/비정규화 전략을 명시하는가
  2. 데이터 수명주기(생성→아카이빙→삭제)가 정의되어 있는가
  3. 개인정보보호(PIPA/GDPR) 요구사항이 반영되어 있는가
  4. 데이터 마이그레이션 전략이 있는가

#### expert-qa.md (Quality Assurance)
- color: magenta
- 리뷰 초점: 테스트 전략, 품질 기준, 비기능 요구사항, 수용 기준
- Rubric 4항목:
  1. 테스트 레벨(Unit/Integration/E2E)별 전략이 있는가
  2. 수용 기준(Acceptance Criteria)이 측정 가능한가
  3. 비기능 테스트(성능/보안/접근성) 계획이 있는가
  4. 결함 관리 프로세스가 정의되어 있는가

### 에이전트 출력 형식 (공통)

```markdown
# {Role} Review — Phase E

## 1. 리뷰 범위
[해당 전문가의 리뷰 영역]

## 2. Findings

### Critical (즉시 해결 필요)
- [항목]

### Major (Phase C 회귀 트리거)
- [항목]

### Minor (권고)
- [항목]

### Info (참고)
- [항목]

## 3. Quality Score: [0.0~1.0]

## 4. 권고사항
[개선 제안]
```

---

## 4. Phase E 리뷰 프로세스 (SKILL.md Step 5)

### SKILL.md에 추가할 Step 5 구조

```
[Step 5] Phase E -- 전문가 AI 페르소나 리뷰
    |
    v
  [5a] Phase D 통과 PRD 읽기
    v
  [5b] 5종 전문가 에이전트 병렬 호출 (Agent 도구 5개 동시)
    |  expert-ta, expert-aa, expert-ca, expert-da, expert-qa
    |  -> phase-e-review-{role}.md (5개)
    v
  [5c] 교차 영향 분석
    |  TA↔CA, DA↔AA, QA↔전체 등
    |  -> phase-e-cross-impact.md
    v
  [5d] 통합 리뷰 보고서 생성
    |  severity 집계, 통합 권고사항
    |  -> phase-e-integrated-report.md
    v
  [5e] 수렴 판정
    |  Major 0건 + Score ≥ 0.85 -> 완료 / 미달 -> Step 3 회귀
    v
```

### 교차 영향 매트릭스

```markdown
## 교차 영향 매트릭스

| From \ To | TA | AA | CA | DA | QA |
|-----------|-----|-----|-----|-----|-----|
| TA | — | API 계약 | 인프라 요구 | 데이터 접근 | NFR 반영 |
| AA | 모듈 구조 | — | 배포 단위 | 데이터 흐름 | 테스트 범위 |
| CA | 확장 제약 | API 게이트웨이 | — | 저장소 비용 | 환경 분리 |
| DA | 스키마 변경 | 데이터 API | 스토리지 | — | 데이터 테스트 |
| QA | 테스트 가능성 | API 테스트 | 인프라 테스트 | 데이터 검증 | — |
```

---

## 5. shaping-orchestrator 확장

### 추가할 Phase D/E 트리거 로직

shaping-orchestrator.md에 Phase C 완료 후 분기 추가:

```
Phase C 수렴 완료 (Quality ≥ 0.85)
    |
    v
Phase D 트리거
    |  SKILL.md Step 4 실행
    |  결과: PASS → Phase E / FAIL → Phase C 회귀 (Six Hats 피드백 주입)
    v
Phase E 트리거
    |  SKILL.md Step 5 실행
    |  결과: PASS → 완료 보고 / FAIL → Phase C 회귀 (전문가 피드백 주입)
    v
최종 완료
    산출물 요약 + 품질 점수 보고
```

### 회귀 시 피드백 주입

Phase D/E 실패 시 Phase C Generator에 주입할 피드백:
- Phase D 실패: Six Hats 미합의 항목 + 각 모자 의견 요약
- Phase E 실패: Major findings 목록 + 해당 전문가 권고사항

---

## 6. 참조 파일 상세

### six-hats-protocol.md

```markdown
구조:
1. Six Thinking Hats 개요 (Edward de Bono)
2. 6색 모자 정의 (각 모자의 관점, AI 페르소나 역할)
3. 라운드 프로토콜
   - Round 1: 독립 의견 (순회 방식)
   - Round 2: 반론 교환 규칙
   - Round 3: Blue Hat 합의안 도출 규칙
4. 수렴 기준: 5/6 accept → PASS
5. 출력 형식 템플릿
```

### expert-review-guide.md

```markdown
구조:
1. 전문가 리뷰 프로세스 개요
2. 5종 Rubric 상세 (TA/AA/CA/DA/QA 각 4항목)
3. Severity 분류 기준
   - Critical: 아키텍처/보안 결함, 즉시 해결 필수
   - Major: 주요 품질 이슈, Phase C 회귀 트리거
   - Minor: 개선 권고, 진행에 영향 없음
   - Info: 참고 사항
4. 교차 영향 분석 가이드
5. 통합 리뷰 보고서 작성 가이드
6. 수렴 기준: Major 0건 + Score ≥ 0.85
```

---

## 7. 산출물 경로 요약

| Phase | 산출물 | 경로 |
|-------|--------|------|
| D | 교차 검토 결과 | `_workspace/shaping/{run-id}/phase-d-cross-review.md` |
| D | Six Hats 토론 결과 | `_workspace/shaping/{run-id}/phase-d-six-hats.md` |
| E | 전문가 리뷰 (5개) | `_workspace/shaping/{run-id}/phase-e-review-{ta,aa,ca,da,qa}.md` |
| E | 교차 영향 분석 | `_workspace/shaping/{run-id}/phase-e-cross-impact.md` |
| E | 통합 리뷰 보고서 | `_workspace/shaping/{run-id}/phase-e-integrated-report.md` |

## 8. 구현 순서 (=Plan 구현 순서와 동일)

1. `references/six-hats-protocol.md` 생성
2. `references/expert-review-guide.md` 생성
3. `agents/six-hats-moderator.md` 생성
4. `agents/expert-{ta,aa,ca,da,qa}.md` 5종 생성
5. `SKILL.md` Step 4 (Phase D) 추가
6. `SKILL.md` Step 5 (Phase E) 추가
7. `shaping-orchestrator.md` Phase D/E 확장
