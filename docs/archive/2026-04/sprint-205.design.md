---
code: FX-DSGN-S205
title: Sprint 205 Design — Vision API 시각 평가 + max-cli 본격 통합
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 205 Design — F427 Vision API + F428 max-cli

## 1. 아키텍처 결정

### F427: Vision API 시각 평가

**스크린샷 전략**: 2-tier fallback
- **Tier 1**: Chromium `--headless=new --screenshot` → PNG → base64 → Claude Vision API
- **Tier 2**: HTML/CSS 소스 텍스트 → Claude API 텍스트 평가 (ANTHROPIC_API_KEY 필요)
- **Tier 3**: API 키 없음 → 기본값 50점 반환 (파이프라인 중단 없음)

**평가 항목** (각 0~100점):
| 항목 | 설명 |
|------|------|
| layout | 요소 배치, 여백 일관성, 시각적 균형 |
| color | 색상 팔레트 일관성, 대비, impeccable 준수 |
| typography | 폰트 계층, 가독성, 크기/두께 시스템 |
| hierarchy | 주요 정보 부각, 정보 구조 |
| responsive | 유연한 레이아웃 동작 가능성 |
| **overall** | 5항목 평균 → ui 차원 score |

**scorer.ts 통합**:
```typescript
// useVisionApi: true → visionEvaluateUi() 호출
// useVisionApi: false/없음 → 기존 uiScore() 호출 (하위호환 유지)
evaluateQuality(job, workDir, { useVisionApi: true })
```

### F428: max-cli 본격 통합

**재시도 전략**: 지수 백오프
```
시도 1 → rate limit? → 대기 1s → 시도 2 → rate limit? → 대기 2s → 시도 3
                            → rate limit? → 대기 4s → 시도 4 (마지막)
→ 모두 실패 → API fallback
```

**Rate limit 감지 패턴**:
- `rate.?limit` (대소문자 무관)
- `429` (HTTP 상태코드)
- `too.?many.?requests`
- `overloaded`
- `capacity`

**generation_mode 추적**:
```typescript
// CostRecord에 generation_mode 필드 추가
interface CostRecord {
  generation_mode?: 'max-cli' | 'cli' | 'api' | 'fallback';
  // ...기존 필드
}
```

---

## 2. 파일 구조

```
prototype-builder/src/
├── vision-evaluator.ts      # F427 신규 — Vision API 시각 평가
├── types.ts                 # F428 수정 — CostRecord.generation_mode 추가
├── fallback.ts              # F428 수정 — isRateLimitError, retryWithBackoff, runMaxCli 강화
├── cost-tracker.ts          # F428 수정 — recordCli(mode), recordWithMode 추가
├── scorer.ts                # F427 수정 — evaluateQuality useVisionApi 옵션
└── __tests__/
    └── vision-evaluator.test.ts  # F427+F428 테스트 (16 tests)
```

---

## 3. 인터페이스

### vision-evaluator.ts

```typescript
interface VisionEvalResult {
  layout: number;       // 0~100
  color: number;
  typography: number;
  hierarchy: number;
  responsive: number;
  overall: number;      // 5항목 평균
  rationale: string;
  method: 'screenshot' | 'html-text';
}

function visionEvaluateUi(workDir: string, options?: { apiKey?: string; chromiumPath?: string }): Promise<VisionEvalResult>
function visionResultToDimensionScore(result: VisionEvalResult): DimensionScore
function findChromium(): Promise<string | null>
function captureScreenshot(htmlPath: string, chromiumPath: string): Promise<string | null>
```

### fallback.ts 신규 exports

```typescript
function isRateLimitError(message: string): boolean
function retryWithBackoff<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>
// runMaxCli 반환 타입 변경: + retryCount: number
```

---

## 4. 테스트 커버리지

| 테스트 파일 | 테스트 수 | 대상 |
|------------|---------|------|
| vision-evaluator.test.ts | 16 | visionResultToDimensionScore, isRateLimitError, retryWithBackoff |
| 기존 테스트 | 94 | executor, scorer, fallback, state-machine, cli-poc, orchestrator |
| **합계** | **110** | — |

---

## 5. Gap Analysis 기준

| 항목 | 기준 | 판정 방법 |
|------|------|----------|
| vision-evaluator.ts 존재 | PASS/FAIL | 파일 존재 + export 확인 |
| VisionEvalResult 타입 | PASS/FAIL | TypeScript 컴파일 성공 |
| visionResultToDimensionScore | PASS/FAIL | dimension='ui' + score 범위 |
| isRateLimitError | PASS/FAIL | rate limit 패턴 감지 |
| retryWithBackoff | PASS/FAIL | 지수 백오프 재시도 |
| CostRecord.generation_mode | PASS/FAIL | 타입 정의 존재 |
| evaluateQuality useVisionApi | PASS/FAIL | 옵션 존재 + visionEvaluateUi 호출 |
| 테스트 16건 통과 | PASS/FAIL | vitest 결과 |
| typecheck 통과 | PASS/FAIL | tsc --noEmit |
