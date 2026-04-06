# Sprint 177 Design — M2+M3: CLI 듀얼 모드 + Enhanced O-G-D

> **Sprint**: 177
> **F-items**: F388, F389
> **Phase**: 19 (Builder Evolution)
> **Plan**: [sprint-177.plan.md](../../01-plan/features/sprint-177.plan.md)
> **Parent Design**: [fx-builder-evolution.design.md](./fx-builder-evolution.design.md) §6

---

## 1. Overview

Sprint 176에서 구축한 5차원 품질 스코어러(scorer.ts)를 O-G-D 루프에 통합하고, Claude Max CLI를 primary 코드 생성기로 도입한다.

### 변경 모듈 요약

| 모듈 | 변경 유형 | 핵심 변경 |
|------|-----------|----------|
| `fallback.ts` | 확장 | 3-Level → 4-Level (max-cli 추가) |
| `cost-tracker.ts` | 확장 | `recordCli()` 메서드 추가 |
| `orchestrator.ts` | 대폭 변경 | 이진 판정 → 5차원 스코어 기반 O-G-D |
| `types.ts` | 확장 | `OgdResult` 필드 추가 |

---

## 2. F388: CLI 듀얼 모드 상세 설계

### 2.1 4-Level Fallback 구조

```
Level 0: Max CLI (claude --bare, 구독 $0)
  ↓ 실패
Level 1: API (Anthropic SDK, pay-per-token)
  ↓ 실패
Level 2: ensemble (모두 실패, 에러 리포트)
```

> 기존 3-Level에서 `cli`(기존)와 `max-cli`(신규)를 분리하지 않고, **기존 `cli` 레벨을 `max-cli`로 대체**하여 복잡도를 줄인다. 기존 `cli` 레벨은 `SKIP_CLI=true`와 동일하게 동작하므로 실질적으로 max-cli → api → ensemble 3단계.

### 2.2 runMaxCli() 함수

```typescript
async function runMaxCli(
  job: PrototypeJob,
  round: number,
  cliPath: string,
): Promise<{ success: boolean; output: string }>
```

**구현 사항:**
- `CLAUDE_CLI_PATH` 환경변수로 CLI 경로 설정 (기본: `'claude'`)
- `--bare -p {prompt}` + `--allowedTools Bash,Read,Edit,Write` + `--max-turns 15`
- timeout: 5분 (Max 구독은 rate limit 여유)
- 성공 시 `writeGeneratedFiles()`로 파일 추출
- 실패 시 `{ success: false, output: '' }` 반환

### 2.3 executeWithFallback() 변경

```typescript
export type FallbackLevel = 'max-cli' | 'api' | 'ensemble';

export async function executeWithFallback(
  job: PrototypeJob,
  round: number,
  cliRunner: (...) => Promise<...>,  // 하위 호환: 기존 파라미터 유지
): Promise<FallbackResult>
```

**로직:**
1. `SKIP_CLI !== 'true'` → `runMaxCli()` 시도
2. 실패 → `fallbackToApi()` 시도
3. 모두 실패 → ensemble 에러

### 2.4 CostTracker.recordCli()

```typescript
recordCli(jobId: string, round: number): CostRecord {
  return {
    jobId, round, model: 'cli-subscription',
    inputTokens: 0, outputTokens: 0, cost: 0,
    timestamp: Date.now(),
  };
}
```

---

## 3. F389: Enhanced O-G-D 루프 상세 설계

### 3.1 orchestrator.ts 변경

**기존 (이진 판정):**
```
runBuild() → 성공 0.9 / 실패 0.4 → qualityThreshold 0.85
```

**신규 (5차원 스코어):**
```
evaluateQuality() → 0~100 총점 → qualityThreshold 80
```

### 3.2 Enhanced runOgdLoop()

```typescript
export async function runOgdLoop(
  job: PrototypeJob,
  options: OgdOptions = {},
): Promise<OgdResult> {
  const maxRounds = options.maxRounds ?? 5;
  const qualityThreshold = options.qualityThreshold ?? 80;

  for (let round = 0; round < maxRounds; round++) {
    // 1. Generator (4-Level Fallback)
    const generated = await executeWithFallback(...);

    // 2. Scorer: 5차원 평가
    const score = await evaluateQuality(job, job.workDir, { useLlm: true });

    // 3. 수렴 판정 (80점+)
    if (score.total >= qualityThreshold) {
      return { output, score: score.total, rounds, qualityScore: score };
    }

    // 4. 타겟 피드백 → saveFeedback() → 다음 라운드
    const feedback = generateTargetFeedback(score);
    await saveFeedback(job.workDir, round, feedback.prompt);
    job.feedbackContent = feedback.prompt;
  }

  // 미수렴: best score 채택 + 미달 리포트
  return { output: bestOutput, score: bestScore, rounds: maxRounds, ... };
}
```

### 3.3 타겟 피드백 흐름

```
Round 1: 전체 생성 (baseline)
  → score 45점, weakest = functional (0.2)
Round 2: functional 타겟 피드백 반영
  → score 58점, weakest = ui (0.3)
Round 3: ui 타겟 피드백 반영
  → score 72점, weakest = prd (0.5)
Round 4: prd 타겟 피드백 (미구현 목록 명시)
  → score 83점 ✅ 수렴
```

### 3.4 OgdResult 확장

```typescript
export interface OgdResult {
  output: string;
  score: number;
  rounds: number;
  totalCost: number;
  qualityScore?: QualityScore;  // 신규: 마지막 5차원 상세
  converged: boolean;            // 신규: 수렴 여부
}
```

---

## 4. Testing Strategy

### 4.1 F388 테스트 (fallback.test.ts)

| 시나리오 | 기대 결과 |
|---------|----------|
| Max CLI 성공 | level='max-cli', success=true |
| Max CLI 실패 → API 성공 | level='api', success=true |
| SKIP_CLI=true | API 직행, CLI 스킵 |
| 모두 실패 | level='ensemble', success=false |
| CostTracker.recordCli() | cost=0, model='cli-subscription' |

### 4.2 F389 테스트 (orchestrator.test.ts)

| 시나리오 | 기대 결과 |
|---------|----------|
| 1라운드에서 80점+ 수렴 | rounds=1, converged=true |
| 3라운드에서 수렴 | rounds=3, converged=true |
| 5라운드 미수렴 | rounds=5, converged=false, best score 채택 |
| Generator 실패 → 다음 라운드 | continue, rounds 증가 |
| 타겟 피드백이 job.feedbackContent에 반영 | saveFeedback 호출 확인 |

---

## 5. Worker 파일 매핑

단일 구현 (Worker 없음) — 변경 파일이 서로 의존적이므로 순차 작업.

| 순서 | 파일 | 작업 |
|:----:|------|------|
| 1 | `prototype-builder/src/types.ts` | OgdResult 필드 추가 |
| 2 | `prototype-builder/src/cost-tracker.ts` | recordCli() 메서드 |
| 3 | `prototype-builder/src/fallback.ts` | 4-Level fallback + runMaxCli() |
| 4 | `prototype-builder/src/orchestrator.ts` | Enhanced O-G-D 루프 |
| 5 | `prototype-builder/src/__tests__/fallback.test.ts` | 신규 테스트 |
| 6 | `prototype-builder/src/__tests__/orchestrator.test.ts` | 신규 테스트 |

---

## 6. Risks

| Risk | Mitigation |
|------|-----------|
| Max CLI rate limit | SKIP_CLI 환경변수로 즉시 우회 |
| evaluateQuality() 실행 시간 | skipBuild 옵션으로 중복 빌드 방지 |
| LLM prdScore 비용 | 월 $5 이내 (Discriminator 전용) |
