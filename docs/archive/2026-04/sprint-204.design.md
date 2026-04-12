---
code: FX-DSGN-S204
title: Sprint 204 Design — F425+F426 LLM 판별 고도화
version: 1.0
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Autopilot)
sprint: 204
f_items: F425, F426
---

# Sprint 204 Design — F425+F426 LLM 판별 고도화

## §1. F425: PRD 정합성 LLM 판별 개선

### 1.1 현재 구현 (As-Is)

```ts
// prdScoreWithLlm — 단순 카운트
prompt: "PRD와 코드를 비교해 implemented/total/missing을 JSON으로 반환"
// → {"implemented": 5, "total": 8, "missing": ["기능A", ...]}
```

문제: PRD에서 요구사항을 자동 추출하지 않음. LLM이 직접 요구사항을 판단.

### 1.2 개선 설계 (To-Be)

**2단계 프롬프트 구조**:

1단계 (요구사항 추출): PRD 텍스트에서 Must Have 항목을 structured list로 추출  
2단계 (의미적 비교): 추출된 요구사항 목록 vs 생성 코드 — 각 항목별 구현 여부 판단

**단일 LLM 호출로 통합** (비용 절감):

```
프롬프트 구조:
[PRD 전문] + [생성 코드 요약] →
LLM이 동시에:
  1. Must Have 요구사항 목록 추출
  2. 각 요구사항의 구현 여부 평가
  3. 미구현 항목에 구체적 수정 지시 생성
```

**응답 스키마 (JSON)**:
```json
{
  "requirements": [
    { "id": 1, "text": "사용자 인증 로그인", "implemented": true, "evidence": "LoginForm 컴포넌트 존재" },
    { "id": 2, "text": "대시보드 차트", "implemented": false, "evidence": null, "fix": "Chart 컴포넌트 추가 필요" }
  ],
  "summary": { "implemented": 5, "total": 8, "score": 0.625 }
}
```

### 1.3 fallback 체계

```
API 키 없음 → prdScoreKeyword() 즉시
API 호출 실패 → prdScoreKeyword() with warning log
응답 파싱 실패 → prdScoreKeyword() with warning log
```

---

## §2. F426: 5차원 LLM 통합 판별

### 2.1 설계 원칙

- 정적 분석은 **컨텍스트 제공** 역할 (보조 데이터)
- LLM은 정적 결과를 참고하되, 독자적으로 5차원 재평가
- LLM이 정적 분석과 다른 점수를 내면 LLM 우선

### 2.2 함수 시그니처

```ts
export async function evaluateQualityWithLlm(
  job: PrototypeJob,
  workDir: string,
): Promise<QualityScore>
```

내부 흐름:
1. 정적 분석 5차원 실행 (기존 함수들)
2. 소스 코드 요약 수집
3. 단일 LLM 호출 (정적 결과 + 코드 요약 컨텍스트)
4. LLM JSON 응답 파싱 → `QualityScore` 반환

### 2.3 LLM 프롬프트

```
당신은 React/TypeScript 프로토타입의 품질을 평가하는 전문가입니다.

## 정적 분석 결과 (참고용)
build: 95, ui: 72, functional: 68, prd: 60, code: 85

## 소스 코드 요약
[최대 8000자]

## PRD 요구사항
[최대 4000자]

## 평가 기준
각 차원을 0~100점으로 평가하고, 구체적 근거와 개선 지시를 제공하세요.

JSON 형식:
{
  "build": { "score": 95, "rationale": "...", "fix": null },
  "ui": { "score": 70, "rationale": "...", "fix": "폰트 페어링 개선..." },
  "functional": { "score": 65, "rationale": "...", "fix": "..." },
  "prd": { "score": 75, "rationale": "...", "fix": "..." },
  "code": { "score": 80, "rationale": "...", "fix": null }
}
```

### 2.4 타입 추가

```ts
// types.ts에 추가
export interface LlmDimensionResult {
  score: number;      // 0 ~ 100
  rationale: string;
  fix: string | null;
}

export interface LlmIntegratedEvaluation {
  build: LlmDimensionResult;
  ui: LlmDimensionResult;
  functional: LlmDimensionResult;
  prd: LlmDimensionResult;
  code: LlmDimensionResult;
}
```

### 2.5 QualityScore 확장

`QualityScore`에 선택적 필드 추가 (하위 호환):

```ts
export interface QualityScore {
  total: number;
  dimensions: DimensionScore[];
  evaluatedAt: string;
  round: number;
  jobId: string;
  // 추가 (F426)
  llmEvaluation?: LlmIntegratedEvaluation;  // LLM 통합 판별 결과
  staticAnalysis?: DimensionScore[];         // 원본 정적 분석 (보조)
}
```

### 2.6 orchestrator 통합

```ts
// OgdOptions에 useLlmIntegrated 추가
export interface OgdOptions {
  maxRounds?: number;
  qualityThreshold?: number;
  costTracker?: CostTracker;
  useLlm?: boolean;           // F425: prd 차원 LLM 기본
  useLlmIntegrated?: boolean; // F426: 5차원 LLM 통합
}
```

---

## §3. 테스트 설계

### 3.1 F425 테스트

| 케이스 | 설명 | 기대값 |
|--------|------|--------|
| LLM 요구사항 추출 | requirements 배열 파싱 | 각 항목 `implemented` 필드 |
| 의미적 매칭 점수 | 7/10 구현 | score ≈ 0.70 |
| API 키 없음 fallback | keyword 모드 | `details`에 'keyword' 포함 없음 |
| 응답 파싱 실패 | JSON 오류 | keyword fallback, 에러 throw 없음 |

### 3.2 F426 테스트

| 케이스 | 설명 | 기대값 |
|--------|------|--------|
| 5차원 LLM 평가 | 정상 응답 | `dimensions` 5개, `llmEvaluation` 존재 |
| staticAnalysis 보존 | 정적 결과 포함 | `staticAnalysis` 필드에 원본 있음 |
| LLM 실패 fallback | API 오류 | 정적 분석 결과로 fallback, 에러 throw 없음 |
| 가중치 합 | 5차원 가중치 | 합 = 1.0 |

---

## §4. 구현 파일 매핑

| Worker | 파일 | 변경 내용 |
|--------|------|-----------|
| W1 | `prototype-builder/src/types.ts` | `LlmDimensionResult`, `LlmIntegratedEvaluation` 타입 + `QualityScore` 확장 |
| W1 | `prototype-builder/src/scorer.ts` | `prdScoreWithLlm` 개선 (F425) + `evaluateQualityWithLlm` 신규 (F426) |
| W1 | `prototype-builder/src/orchestrator.ts` | `useLlmIntegrated` 옵션 + 기본값 `useLlm: true` |
| W1 | `prototype-builder/src/__tests__/scorer.test.ts` | F425/F426 테스트 케이스 추가 |
