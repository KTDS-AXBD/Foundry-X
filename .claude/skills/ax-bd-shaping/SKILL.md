---
name: ax-bd-shaping
description: |
  AX BD 형상화 파이프라인 (Stage 3→4).
  2단계 발굴 산출물을 입력으로 Phase A(입력 점검) → Phase B(req-interview) → Phase C(O-G-D 형상화 루프) → Phase D(교차 검토 + Six Hats) → Phase E(전문가 5종 리뷰) 실행.
  Phase F(HITL 최종 게이트)는 Sprint 112에서 추가.
  Use when: 형상화, shaping, 3단계, BD 형상화, PRD 형상화
  Triggers: ax-bd-shaping, shaping, 형상화, BD shaping
  Do NOT use for: 2단계 발굴(ax-bd-discovery 사용), 순수 코드 구현, 배포
user-invocable: true
category: business-analysis
---

# AX BD 형상화 파이프라인

2단계 발굴 산출물을 3단계 PRD로 형상화하는 파이프라인.
Phase A(입력 점검) → Phase B(req-interview 연동) → Phase C(O-G-D 형상화 루프) → Phase D(교차 검토 + Six Hats) → Phase E(전문가 5종 리뷰) 순차 실행.

## 사용법

```
/ax:ax-bd-shaping {산출물 경로}
/ax:ax-bd-shaping {산출물 경로} --mode auto
/ax:ax-bd-shaping {산출물 경로} --skip-interview
```

## 파라미터

| 파라미터 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| source_path | Yes | — | 2단계 발굴 산출물 경로 (MD 파일 또는 디렉토리) |
| mode | — | hitl | `hitl` (Phase B에서 사용자 인터뷰) / `auto` (AI 페르소나 인터뷰) |
| max_rounds | — | 3 | Phase C O-G-D 최대 라운드 수 |
| max_searches | — | 10 | Generator/Discriminator WebSearch 최대 횟수 |
| skip_interview | — | false | Phase B 건너뛰기 (이미 인터뷰 완료된 경우) |

## 실행 흐름

```
사용자 입력: "형상화 {산출물 경로}" 또는 "/ax:ax-bd-shaping {경로}"
    |
    v
[Step 0] 워크스페이스 초기화
    |  _workspace/shaping/{run-id}/ 생성
    |  run-id = "shaping-{YYYYMMDD}-{HHmmss}"
    v
[Step 1] Phase A -- 입력 점검 & 갭 분석
    |  산출물 파일 읽기 -> 체크리스트 10항목 평가
    |  -> phase-a-gap-report.md 생성
    |  게이트: 필수 80%+ -> 계속 / 50% 미만 -> 반려
    v
[Step 2] Phase B -- req-interview 연동
    |  Phase A 갭 -> 인터뷰 컨텍스트 주입
    |  /ax:req-interview 호출 (또는 auto 모드: AI 페르소나)
    |  -> phase-b-interview.md 생성
    v
[Step 3] Phase C -- O-G-D 형상화 루프
    |  shaping-orchestrator Agent 호출
    |  -> max 3 rounds, 수렴 0.85
    |  -> phase-c-final.md (3단계 PRD)
    v
[Step 4] Phase D -- 다중 AI 모델 교차 검토 + Six Hats 토론
    |  3관점 교차 검토 (기술/사업/UX)
    |  -> 합의 매트릭스 -> 불일치 -> Six Hats
    |  -> six-hats-moderator Agent 호출
    |  PASS (5/6+) -> Step 5 / FAIL -> Step 3 회귀
    v
[Step 5] Phase E -- 전문가 AI 페르소나 리뷰
    |  5종 에이전트 병렬 호출 (TA/AA/CA/DA/QA)
    |  -> 교차 영향 분석 -> 통합 리뷰 보고서
    |  Major 0 + Score >= 0.85 -> 완료 / FAIL -> Step 3 회귀
    v
[결과 보고] 실행 요약 출력
    산출물 위치, 품질 점수, 라운드 수, 소요 시간
```

## Step 0: 워크스페이스 초기화

1. run-id 생성: `shaping-{YYYYMMDD}-{HHmmss}` (예: `shaping-20260402-143000`)
2. 디렉토리 생성: `_workspace/shaping/{run-id}/`
3. 산출물 유효성 확인:
   - source_path가 파일이면 해당 파일 존재 확인
   - source_path가 디렉토리면 `.md` 파일 1개 이상 존재 확인
   - 실패 시 에러 메시지 출력 + 종료

## Step 1: Phase A -- 입력 점검 & 갭 분석

참조: `references/checklist-phase-a.md`

### 실행 절차

1. 산출물 파일을 읽는다 (디렉토리면 모든 `.md` 파일 통합).
2. 체크리스트 10항목에 대해 각각 평가한다:
   - 산출물에서 해당 내용을 찾는다 (섹션 제목 + 키워드 매칭)
   - 존재 여부 판정: `present` | `partial` | `absent`
   - 품질 점수: 0.0 ~ 1.0
3. 갭 분석 보고서를 생성한다: `_workspace/shaping/{run-id}/phase-a-gap-report.md`

### 게이트 판정

```
필수 충족률 = count(필수 항목 where 상태 != absent AND 점수 >= 0.4) / 7

>= 0.80 (6/7+) -> PASS: Phase B 진행
0.50~0.79 (4~5/7) -> CONDITIONAL: Phase B에서 보강 필수, 경고 출력
< 0.50 (3/7-) -> FAIL: 반려 메시지 출력 + 종료
```

### 갭 처리 전략 결정

각 누락/미흡 항목에 대해:
- **필수 + absent**: Phase B 인터뷰에서 보강 질문 자동 추가
- **필수 + partial**: Phase B 심화 질문 + Phase C Generator 보강
- **선택 + absent/partial**: Phase C Generator가 자동 생성/보강

### 출력

Phase A 완료 시 사용자에게 요약 출력:
```
## Phase A 결과
- 필수 충족률: {rate}% ({N}/7)
- 선택 충족률: {N}/3
- 게이트: {PASS/CONDITIONAL/FAIL}
- 갭 항목: {누락/미흡 목록}
- 다음 단계: Phase B ({mode} 모드)
```

## Step 2: Phase B -- req-interview 연동

참조: `references/interview-context-template.md`

### skip_interview = true인 경우

Phase B를 건너뛴다. Phase A 갭 분석 결과만으로 Phase C에 진입.
이 경우 `phase-b-interview.md`는 생성되지 않는다.

### HITL 모드 (기본)

1. Phase A 갭 분석 결과를 기반으로 인터뷰 컨텍스트를 생성한다.
   - `references/interview-context-template.md`의 "갭 -> 질문 매핑" 테이블 참조
   - 누락 항목별 질문 + 형상화 표준 질문 5개
2. AskUserQuestion 도구로 사용자에게 인터뷰를 진행한다.
   - 질문은 하나씩 순차적으로 (한 번에 모두 던지지 않음)
   - 응답이 불충분하면 후속 질문 (최대 2회 추가)
3. 인터뷰 결과를 구조화하여 저장: `_workspace/shaping/{run-id}/phase-b-interview.md`

### Auto 모드

1. AI가 산출물 내용을 기반으로 사업 아이디어 제안자 역할로 응답 생성.
2. 산출물에서 추론 가능한 답변은 자동 채운다.
3. 추론 불가능한 항목은 Open Question(OQ)으로 분류.
4. 결과를 `_workspace/shaping/{run-id}/phase-b-interview.md`에 저장.

### 인터뷰 결과 구조

```yaml
---
run_id: "{run-id}"
mode: "hitl | auto"
source: "{source_path}"
interviewed_at: "{timestamp}"
---
```

- **Business Requirements (BR)**: BR-001 ~ BR-NNN [priority: Must/Should/Could]
- **Technical Constraints (TC)**: TC-001 ~ TC-NNN [impact: High/Medium/Low]
- **Success Criteria (SC)**: SC-001 ~ SC-NNN [metric -> target]
- **Open Questions (OQ)**: OQ-001 ~ OQ-NNN [question -> assumption]

### 출력

Phase B 완료 시 사용자에게 요약 출력:
```
## Phase B 결과
- 모드: {hitl/auto}
- Business Requirements: {N}건
- Technical Constraints: {N}건
- Success Criteria: {N}건
- Open Questions: {N}건
- 다음 단계: Phase C (O-G-D 형상화 루프, max {max_rounds} rounds)
```

## Step 3: Phase C -- O-G-D 형상화 루프

### 실행

shaping-orchestrator Agent를 호출한다:

```
Agent 호출:
  subagent_type: shaping-orchestrator
  prompt: |
    run_id: {run-id}
    workspace: _workspace/shaping/{run-id}
    max_rounds: {max_rounds}
    max_searches: {max_searches}

    Phase A 갭 보고서와 Phase B 인터뷰 결과를 기반으로
    3단계 PRD를 생성하는 O-G-D 형상화 루프를 실행하세요.

    Rubric: .claude/skills/ax-bd-shaping/references/rubric-shaping.md
    수렴 조건: Quality Score >= 0.85, Critical = 0
```

### 출력

Phase C 완료 시 사용자에게 요약 출력:
```
## Phase C 결과
- 라운드: {N}/{max_rounds}
- 종료 사유: {converged/forced_stop}
- 최종 품질 점수: {score} (S1:{s1} S2:{s2} S3:{s3} S4:{s4} S5:{s5})
- 리스크 경고: {N}건
- 산출물: _workspace/shaping/{run-id}/phase-c-final.md
```

## Step 4: Phase D -- 다중 AI 모델 교차 검토 + Six Hats 토론

참조: `references/six-hats-protocol.md`

### 실행 절차

#### 4a. Phase C 최종 PRD 읽기

`_workspace/shaping/{run-id}/phase-c-final.md`를 로드한다.

#### 4b. 3관점 교차 검토

Phase C 최종 PRD를 3가지 관점으로 독립 검토한다.
단일 모델에서 3번 독립 호출, 각각 다른 검토 관점 프롬프트를 사용:

1. **기술 실현성 중심** — 아키텍처, 기술 스택, 성능 요구사항, 개발 복잡도
2. **사업성 중심** — 수익 모델, 시장 분석, 경쟁 전략, ROI 추정
3. **사용자 경험 중심** — UX 흐름, 페르소나 적합성, 채택 장벽, 온보딩

각 관점별 출력:
```markdown
## [관점명] 검토
### 핵심 평가
[1~3 문장]
### 상세 분석
[섹션별 평가]
### 섹션별 판정
| PRD 섹션 | 판정 | 비고 |
|----------|------|------|
### 전체 판정: [approve | concern | reject]
```

#### 4c. 합의 매트릭스 생성

3관점 검토 결과를 PRD 섹션별로 집계:

```markdown
## 합의 매트릭스

| PRD 섹션 | 기술 | 사업 | UX | 합의 | 비고 |
|----------|------|------|-----|------|------|
```

- 2/3 이상 approve → **확정**
- 1/3 이하 approve → **Six Hats 이관** (불일치 항목)

교차 검토 결과를 `_workspace/shaping/{run-id}/phase-d-cross-review.md`에 저장.

#### 4d. six-hats-moderator Agent 호출

불일치 항목이 있는 경우 Six Hats 토론을 실행:

```
Agent 호출:
  subagent_type: six-hats-moderator
  prompt: |
    workspace: _workspace/shaping/{run-id}
    cross_review_path: _workspace/shaping/{run-id}/phase-d-cross-review.md
    prd_path: _workspace/shaping/{run-id}/phase-c-final.md

    교차 검토에서 불일치된 항목에 대해 Six Hats 토론을 진행하세요.
    프로토콜: .claude/skills/ax-bd-shaping/references/six-hats-protocol.md
```

산출물: `_workspace/shaping/{run-id}/phase-d-six-hats.md`

#### 4e. 수렴 판정

- **PASS** (5/6+ accept): Step 5 (Phase E) 진행
- **CONDITIONAL_PASS** (4/6): 조건부 진행 — Phase E에서 미합의 항목 재검토
- **FAIL** (3/6-): Step 3 (Phase C) 회귀 — Six Hats 미합의 피드백을 Generator에 주입

### 출력

Phase D 완료 시 사용자에게 요약 출력:
```
## Phase D 결과
- 교차 검토: 3관점 완료
- 합의 항목: {N}건 / 불일치: {N}건
- Six Hats 판정: {PASS/CONDITIONAL_PASS/FAIL}
- Accept 비율: {N}/6
- 다음 단계: {Phase E / Phase C 회귀}
```

## Step 5: Phase E -- 전문가 AI 페르소나 리뷰

참조: `references/expert-review-guide.md`

### 실행 절차

#### 5a. Phase D 통과 PRD 읽기

Phase D에서 확정된 PRD를 로드한다 (`phase-c-final.md` + Phase D 확정 사항).

#### 5b. 5종 전문가 에이전트 병렬 호출

5개 전문가 에이전트를 **Agent 도구로 동시 호출** (병렬):

```
Agent 5개 동시 호출:
  1. expert-ta (Technical Architect) — 아키텍처, 확장성, 통합
  2. expert-aa (Application Architect) — API, 모듈, 데이터 흐름
  3. expert-ca (Cloud Architect) — 인프라, 배포, 비용, 보안
  4. expert-da (Data Architect) — 데이터 모델, 파이프라인, 프라이버시
  5. expert-qa (Quality Assurance) — 테스트, 품질 기준, 수용 기준

각 Agent에 전달:
  prd_path: _workspace/shaping/{run-id}/phase-c-final.md
  workspace: _workspace/shaping/{run-id}
```

산출물: `phase-e-review-{ta,aa,ca,da,qa}.md` (5개)

#### 5c. 교차 영향 분석

5종 전문가의 findings를 교차 분석:

1. 각 전문가의 Critical/Major findings 수집
2. 교차 영향 매트릭스 생성 (TA↔CA, DA↔AA, QA↔전체 등)
3. Synergy / Conflict / Dependency 분류

산출물: `_workspace/shaping/{run-id}/phase-e-cross-impact.md`

#### 5d. 통합 리뷰 보고서 생성

```markdown
# Phase E: 통합 리뷰 보고서

## 1. 리뷰 요약
| 전문가 | Score | Critical | Major | Minor | Info |
|--------|-------|----------|-------|-------|------|

## 2. Critical Findings (전문가별 통합)
## 3. Major Findings
## 4. 교차 영향 분석
## 5. 통합 권고사항
## 6. 판정
```

산출물: `_workspace/shaping/{run-id}/phase-e-integrated-report.md`

#### 5e. 수렴 판정

PASS 조건 (모두 충족):
1. Critical findings = 0건
2. 평균 Quality Score >= 0.85
3. 개별 전문가 Score >= 0.70 (모두)

FAIL 시: Step 3 (Phase C) 회귀 — Major findings + 전문가 권고사항을 Generator에 주입

### 출력

Phase E 완료 시 사용자에게 요약 출력:
```
## Phase E 결과
- 전문가 리뷰: 5종 완료
- 평균 Score: {score}
- Critical: {N}건 / Major: {N}건
- 교차 영향: Synergy {N}건 / Conflict {N}건
- 판정: {PASS / FAIL}
- 다음 단계: {완료 보고 / Phase C 회귀}
```

## 결과 보고

모든 Phase 완료 후 종합 보고:

```
## BD 형상화 완료 -- {run-id}

### 실행 요약
| 항목 | 값 |
|------|-----|
| 소스 | {source_path} |
| 모드 | {mode} |
| Phase A 필수 충족률 | {rate}% |
| Phase B 요구사항 | BR {N}건, TC {N}건, SC {N}건 |
| Phase C 라운드 | {N}/{max_rounds} |
| 최종 품질 점수 | {score} |
| 소요 시간 | {minutes}분 |

### 산출물
- `_workspace/shaping/{run-id}/phase-a-gap-report.md` -- 입력 점검 보고서
- `_workspace/shaping/{run-id}/phase-b-interview.md` -- 인터뷰 결과
- `_workspace/shaping/{run-id}/phase-c-final.md` -- 3단계 PRD
- `_workspace/shaping/{run-id}/rubric-scores.yaml` -- 라운드별 점수 추이
- `_workspace/shaping/{run-id}/phase-d-cross-review.md` -- 교차 검토 결과
- `_workspace/shaping/{run-id}/phase-d-six-hats.md` -- Six Hats 토론 결과
- `_workspace/shaping/{run-id}/phase-e-review-{ta,aa,ca,da,qa}.md` -- 전문가 리뷰 5개
- `_workspace/shaping/{run-id}/phase-e-cross-impact.md` -- 교차 영향 분석
- `_workspace/shaping/{run-id}/phase-e-integrated-report.md` -- **통합 리뷰 보고서 (최종)**

### 다음 단계
- Phase F (HITL 최종 게이트) -- Sprint 112
```

## 에러 처리

| 상황 | 조치 |
|------|------|
| 산출물 경로 없음 | 에러 메시지 + 종료 |
| Phase A FAIL (충족률 < 50%) | 반려 메시지 + 보강 필요 항목 목록 출력 + 종료 |
| Phase B 인터뷰 중단 | 수집된 결과까지 저장 + Phase C 진행 (부분 컨텍스트) |
| Phase C 수렴 실패 | FORCED_STOP + best artifact 채택 + 잔여 이슈 첨부 |
| Phase D Six Hats FAIL | Phase C 회귀 — 미합의 피드백 Generator 주입 |
| Phase E Critical 발견 | Phase C 회귀 — Critical findings 피드백 Generator 주입 |
| Phase E Score < 0.85 | Phase C 회귀 — Major findings + 전문가 권고사항 주입 |

## 참조 파일

- `references/rubric-shaping.md` -- 형상화 Rubric S1~S5 (5차원)
- `references/checklist-phase-a.md` -- Phase A 입력 점검 체크리스트 (10항목)
- `references/interview-context-template.md` -- Phase B 인터뷰 컨텍스트 템플릿
- `references/six-hats-protocol.md` -- Phase D Six Hats 토론 프로토콜 (6색 모자, 3라운드, 수렴 기준)
- `references/expert-review-guide.md` -- Phase E 전문가 5종 리뷰 가이드 (Rubric, Severity, 교차 영향)

## Gotchas

- Phase B HITL 모드에서는 AskUserQuestion 도구를 사용 -- 텍스트 질문 금지 (feedback_interview_askuserquestion 참조)
- Phase C의 shaping-{orchestrator,generator,discriminator}는 ogd-* 에이전트의 형상화 특화 버전
- `_workspace/shaping/` 디렉토리는 세션 종료 시 `docs/shaping/`으로 이동 권장
- Auto 모드의 인터뷰 결과는 HITL 대비 품질이 낮을 수 있음 -- 중요한 사업 아이템은 HITL 권장
- max_searches를 줄이면 실행 시간이 단축되지만 시장 데이터 품질이 낮아질 수 있음
- Phase D 교차 검토는 단일 모델 3관점 (향후 OpenRouter 3모델로 전환 가능, 프롬프트 구조 동일)
- Phase E 전문가 에이전트는 haiku 모델 -- 병렬 5개 동시 호출 시 비용 효율
- Phase D/E FAIL 시 Phase C 회귀 -- shaping-orchestrator가 피드백을 Generator에 자동 주입
- Six Hats CONDITIONAL_PASS (4/6)는 Phase E에서 미합의 항목을 재검토하는 조건부 진행
