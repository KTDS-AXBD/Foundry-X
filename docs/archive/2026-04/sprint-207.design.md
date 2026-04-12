---
code: FX-DSGN-S207
title: Sprint 207 Design — F431 판별 피드백 구체화
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: autopilot
f_items: F431
req_codes: FX-REQ-423
---

# Sprint 207 Design — F431 판별 피드백 구체화

## §1. 설계 목표

LLM 판별 결과(raw feedback)를 "어떤 부분을 어떻게 고쳐야 하는지" 구체적인 수정 지시(StructuredInstruction)로 변환하고, Generator 프롬프트에 자동 주입하여 O-G-D 루프 수렴 속도를 개선한다.

## §2. 타입 설계 (shared)

### 2.1 `StructuredInstruction` (신규)

```typescript
// packages/shared/src/ogd.ts

export interface StructuredInstruction {
  /** 문제 항목 (체크리스트 항목명) */
  issue: string;
  /** 구체적 수정 지시 (동사형: "~하라") */
  action: string;
  /** CSS/HTML 예시 코드 스니펫 (선택) */
  example?: string;
}
```

### 2.2 `OgdRound` 업데이트

```typescript
export interface OgdRound {
  // 기존 필드 유지
  id: string;
  jobId: string;
  roundNumber: number;
  qualityScore: number | null;
  feedback: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  modelUsed: string;
  passed: boolean;
  createdAt: number;
  // 신규
  structuredInstructions?: StructuredInstruction[];
}
```

## §3. `OgdFeedbackConverterService` 설계 (신규)

**파일**: `packages/api/src/core/harness/services/ogd-feedback-converter.ts`

```typescript
export interface ConvertResult {
  instructions: StructuredInstruction[];
  inputTokens: number;
  outputTokens: number;
}

export class OgdFeedbackConverterService {
  constructor(private ai: Ai) {}

  async convert(
    rawFeedback: string,
    failedItems: string[],
  ): Promise<ConvertResult>;
}
```

**LLM 프롬프트 설계**:
```
System: You are a UI code improvement advisor.
Convert the quality evaluation feedback into specific, actionable code instructions.
Each instruction must:
1. Name the specific issue (from the failed checklist item)
2. Give an exact action to take ("Replace X with Y", "Add Z at location W")
3. Optionally provide a CSS/HTML code snippet example
Output JSON: { instructions: [{issue, action, example?}] }

User:
Failed checklist items:
- {failedItems}

Raw feedback:
{rawFeedback}
```

**실패 시 fallback**: LLM 파싱 실패 → failedItems에서 기본 지시 생성

## §4. `OgdDiscriminatorService` 업데이트

`EvaluateResult`에 `failedItems: string[]` 추가:

```typescript
interface EvaluateResult {
  qualityScore: number;
  feedback: string;
  failedItems: string[];  // 신규: FAIL된 체크리스트 항목
  inputTokens: number;
  outputTokens: number;
  passed: boolean;
}
```

`evaluate()` 메서드: JSON 파싱 시 `items` 배열에서 `pass: false`인 항목의 `item` 텍스트 추출 → `failedItems` 반환.

## §5. `OgdOrchestratorService` 업데이트

`runLoop()` 변경:
1. `discriminator.evaluate()` 호출 → `evalResult.failedItems` 획득
2. 라운드가 통과하지 못한 경우: `feedbackConverter.convert(evalResult.feedback, evalResult.failedItems)` 호출
3. `ogdRound.structuredInstructions` = converter 결과 저장
4. `previousInstructions` = converter 결과 → 다음 Generator 호출 시 전달

```typescript
// runLoop() 시그니처 변경 없음 — 내부만 업데이트
// FeedbackConverterService는 constructor에 주입
constructor(
  private db: D1Database,
  private generator: OgdGeneratorService,
  private discriminator: OgdDiscriminatorService,
  private feedbackConverter: OgdFeedbackConverterService,  // 신규
) {}
```

## §6. `OgdGeneratorService` 업데이트

`generate()` 시그니처 변경:

```typescript
async generate(
  prdContent: string,
  previousFeedback?: string,              // 기존 유지 (하위 호환)
  previousInstructions?: StructuredInstruction[],  // 신규
): Promise<GenerateResult>
```

**주입 포맷** (previousInstructions 있을 때 우선):
```
## 이전 라운드 수정 지시 (반드시 모두 적용할 것)

1. [issue1]
   수정 지시: action1
   예시: `example1`

2. [issue2]
   수정 지시: action2
```

instructions가 없고 `previousFeedback`만 있으면 기존 방식 사용 (하위 호환).

## §7. Worker 파일 매핑

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `packages/shared/src/ogd.ts` | 수정 | `StructuredInstruction` 추가, `OgdRound.structuredInstructions` 추가 |
| `packages/shared/src/index.ts` | 수정 | `StructuredInstruction` export 추가 |
| `packages/api/src/core/harness/services/ogd-feedback-converter.ts` | 신규 | `OgdFeedbackConverterService` |
| `packages/api/src/core/harness/services/ogd-discriminator-service.ts` | 수정 | `failedItems` 반환 |
| `packages/api/src/core/harness/services/ogd-orchestrator-service.ts` | 수정 | converter 주입 + 호출 |
| `packages/api/src/core/harness/services/ogd-generator-service.ts` | 수정 | structured instructions 주입 |
| `packages/api/src/core/harness/services/__tests__/ogd-feedback-converter.test.ts` | 신규 | 유닛 테스트 |

## §8. 테스트 설계

**`ogd-feedback-converter.test.ts`**:
1. `convert()` - LLM mock이 JSON 반환 → `StructuredInstruction[]` 파싱 성공
2. `convert()` - LLM 파싱 실패 → failedItems 기반 fallback instructions 반환
3. `convert()` - failedItems 빈 배열 → 빈 instructions 반환

## §9. Gap Analysis 기준 (Design vs Implementation)

| 항목 | 설계 | 구현 확인 포인트 |
|------|------|-----------------|
| StructuredInstruction 타입 | shared/ogd.ts | 인터페이스 존재 여부 |
| OgdRound.structuredInstructions | shared/ogd.ts | 옵셔널 필드 존재 |
| OgdFeedbackConverterService | 신규 파일 | convert() 메서드 |
| failedItems 추출 | discriminator | EvaluateResult.failedItems |
| converter 호출 | orchestrator | !passed 시 converter.convert() |
| structured instructions 저장 | orchestrator | ogdRound.structuredInstructions |
| 주입 포맷 개선 | generator | "## 이전 라운드 수정 지시" 섹션 |
| fallback 동작 | converter | 파싱 실패 시 failedItems 기반 |
| 유닛 테스트 3건 | test file | 모두 통과 |
