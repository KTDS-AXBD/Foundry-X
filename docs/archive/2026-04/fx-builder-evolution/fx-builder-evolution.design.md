# fx-builder-evolution Design Document

> **Summary**: Prototype Builder 5차원 품질 스코어링 + CLI 비용 최적화 + 자동 개선 루프 상세 설계
>
> **Project**: Foundry-X
> **Version**: cli 0.5.0 / api 0.1.0 / web 0.1.0
> **Author**: AX BD팀
> **Date**: 2026-04-06
> **Status**: Draft
> **Planning Doc**: [fx-builder-evolution.plan.md](../../01-plan/features/fx-builder-evolution.plan.md)
> **PRD**: [prd-final.md](../../specs/fx-builder-evolution/prd-final.md)

---

## 1. Overview

### 1.1 Design Goals

1. **다차원 품질 평가**: 현재 1차원(빌드 성공 0.9/실패 0.4) → 5차원 100점 스코어링
2. **비용 제로화**: API 토큰 비용 → Claude Max CLI `--bare` subprocess로 $0 생성
3. **자동 수렴**: 점수 < 80 시 약점 차원 타겟 피드백 → 최대 5라운드 자동 개선
4. **관측 가능성**: 점수 추이, 차원별 분석, 비용 절감 효과를 대시보드로 시각화

### 1.2 Design Constraints

- Builder는 독립 Node.js 서버 (Railway Docker 또는 로컬 WSL)
- 기존 `executeWithFallback()` 3-level 구조를 4-level로 확장 (CLI 추가)
- D1 테이블 추가는 기존 `prototype_jobs`와 조인 가능하게 설계
- Vision API는 P1 — P0에서는 DOM 분석 + 정적 분석으로 비용 $0 유지

---

## 2. Data Model

### 2.1 Type Definitions

```typescript
// prototype-builder/src/types.ts에 추가

/** 5차원 품질 차원 */
export type ScoreDimension = 'build' | 'ui' | 'functional' | 'prd' | 'code';

/** 차원별 가중치 */
export const DIMENSION_WEIGHTS: Record<ScoreDimension, number> = {
  build: 0.20,       // 빌드 성공 여부
  ui: 0.25,          // UI 완성도 (DOM 구조 분석)
  functional: 0.20,  // 기능 동작 (정적 분석)
  prd: 0.25,         // PRD 반영도 (LLM 비교)
  code: 0.10,        // 코드 품질 (ESLint + TS)
};

/** 차원별 점수 상세 */
export interface DimensionScore {
  dimension: ScoreDimension;
  score: number;       // 0.0 ~ 1.0
  weight: number;      // DIMENSION_WEIGHTS에서
  weighted: number;    // score × weight
  details: string;     // 평가 근거 텍스트
}

/** 전체 품질 스코어 */
export interface QualityScore {
  total: number;           // 0 ~ 100 (가중 평균 × 100)
  dimensions: DimensionScore[];
  evaluatedAt: string;     // ISO 8601
  round: number;
  jobId: string;
}

/** 타겟 피드백 */
export interface TargetFeedback {
  weakestDimension: ScoreDimension;
  score: number;
  prompt: string;      // Generator에 전달할 개선 프롬프트
}

/** 생성 모드 */
export type GenerationMode = 'cli' | 'api' | 'fallback';
```

### 2.2 D1 Schema

```sql
-- 0110_prototype_quality.sql

CREATE TABLE IF NOT EXISTS prototype_quality (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_id TEXT NOT NULL REFERENCES prototype_jobs(id) ON DELETE CASCADE,
  round INTEGER NOT NULL DEFAULT 0,
  total_score REAL NOT NULL,
  build_score REAL NOT NULL,
  ui_score REAL NOT NULL,
  functional_score REAL NOT NULL,
  prd_score REAL NOT NULL,
  code_score REAL NOT NULL,
  generation_mode TEXT NOT NULL DEFAULT 'api',  -- 'cli' | 'api' | 'fallback'
  cost_usd REAL NOT NULL DEFAULT 0,
  feedback TEXT,           -- 타겟 피드백 (JSON)
  details TEXT,            -- 차원별 상세 (JSON)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pq_job_id ON prototype_quality(job_id);
CREATE INDEX idx_pq_total_score ON prototype_quality(total_score);
```

---

## 3. Module Design

### 3.1 scorer.ts (신규)

5차원 품질 평가의 핵심 모듈.

```typescript
// prototype-builder/src/scorer.ts

export async function evaluateQuality(
  job: PrototypeJob,
  workDir: string,
): Promise<QualityScore>

// 차원별 평가 함수
export async function buildScore(workDir: string): Promise<DimensionScore>
export async function uiScore(workDir: string): Promise<DimensionScore>
export async function functionalScore(workDir: string): Promise<DimensionScore>
export async function prdScore(job: PrototypeJob, workDir: string): Promise<DimensionScore>
export async function codeScore(workDir: string): Promise<DimensionScore>

// 타겟 피드백 생성
export function generateTargetFeedback(score: QualityScore): TargetFeedback
```

**각 차원 평가 로직:**

#### 3.1.1 buildScore (20%)

```
Input: workDir
Logic:
  1. `npx vite build` 실행
  2. 성공 → 1.0, 실패 → 0.0
  3. 워닝 수에 따라 감점 (워닝 5개당 -0.1, 최소 0.5)
Output: { dimension: 'build', score: 0.0~1.0, details: "Build success/fail + N warnings" }
```

#### 3.1.2 uiScore — DOM 분석 (25%)

```
Input: workDir (빌드된 dist/index.html)
Logic:
  1. dist/index.html 파싱 (cheerio 또는 정규식)
  2. 평가 항목:
     a. 컴포넌트 다양성: 고유 태그명/클래스 수 (div만 쓰면 감점)
     b. Tailwind 활용도: className에 tailwind 유틸리티 비율
     c. 시맨틱 구조: header/nav/main/section/footer 존재 여부
     d. 접근성: alt, aria-label, role 속성 존재
  3. 4항목 균등 평균
Output: { dimension: 'ui', score: 0.0~1.0, details: "컴포넌트: N종, Tailwind: N%, 시맨틱: Y/N" }
```

**P1 확장: Vision API**
```
빌드 후 puppeteer로 스크린샷 → Claude Vision에 "이 UI의 디자인 완성도를 0~1로 평가" 요청
비용: 스크린샷 1장 ~$0.003 (1024px), 5라운드 = $0.015/job
```

#### 3.1.3 functionalScore — 정적 분석 (20%)

```
Input: workDir/src/**/*.tsx
Logic:
  1. AST 또는 정규식으로 분석:
     a. onClick/onChange 핸들러 수 (인터랙션 지표)
     b. useState/useEffect/useCallback 사용 수 (상태 관리)
     c. react-router 라우트 수 (네비게이션)
     d. 에러 바운더리/try-catch 존재
  2. 기준: 핸들러 0개 → 0.2, 1~3개 → 0.5, 4~7개 → 0.7, 8+ → 0.9
     상태관리 + 라우팅 보너스 각 +0.05
Output: { dimension: 'functional', score: 0.0~1.0, details: "핸들러 N개, useState N개, routes N개" }
```

#### 3.1.4 prdScore — LLM 비교 (25%)

```
Input: job.prdContent, workDir/src/**/*.tsx
Logic:
  1. PRD에서 Must Have 기능 목록 추출 (§4.1 테이블 파싱)
  2. 생성된 코드 전체를 텍스트로 결합
  3. Claude API (sonnet, temperature 0)에 비교 프롬프트:
     "PRD의 Must Have 기능 N개 중 코드에서 구현된 기능 수를 세세요.
      JSON 응답: { implemented: N, total: N, missing: [...] }"
  4. score = implemented / total
  비용: ~$0.01/호출 (입력 ~3K tokens, 출력 ~200 tokens)
Output: { dimension: 'prd', score: 0.0~1.0, details: "구현 N/M, 미구현: [...]" }
```

#### 3.1.5 codeScore (10%)

```
Input: workDir/src/**/*.{ts,tsx}
Logic:
  1. `npx eslint src/ --format json` 실행
  2. 에러 수 → 감점 (에러 0 → 1.0, 1~3 → 0.7, 4~10 → 0.4, 10+ → 0.2)
  3. `npx tsc --noEmit` 실행 — 타입 에러 수 추가 감점
  4. 두 점수의 평균
Output: { dimension: 'code', score: 0.0~1.0, details: "ESLint errors: N, TS errors: M" }
```

### 3.2 orchestrator.ts (수정)

현재 `runOgdLoop()`를 5차원 스코어 기반으로 개편.

```typescript
// 변경 전: runBuild() → 0.9/0.4 이진 판정
// 변경 후: evaluateQuality() → 0~100 다차원 점수

export async function runOgdLoop(
  job: PrototypeJob,
  options: OgdOptions = {},
): Promise<OgdResult> {
  const maxRounds = options.maxRounds ?? 5;       // 3→5로 증가
  const qualityThreshold = options.qualityThreshold ?? 80;  // 0.85→80으로 단위 변경

  for (let round = 0; round < maxRounds; round++) {
    // 1. Generator (CLI primary / API fallback)
    const generated = await executeWithFallback(updatedJob, round, ...);

    // 2. Scorer: 5차원 평가
    const score = await evaluateQuality(job, job.workDir);
    console.log(`[OGD] Round ${round+1}: ${score.total}/100`);

    // 3. 수렴 판정 (80점+)
    if (score.total >= qualityThreshold) {
      return { output: generated.output, score: score.total, rounds: round + 1, ... };
    }

    // 4. 타겟 피드백 생성 → 다음 라운드 입력
    const feedback = generateTargetFeedback(score);
    await saveFeedback(job.workDir, round, feedback.prompt);
    job.feedbackContent = feedback.prompt;
  }
}
```

### 3.3 fallback.ts (수정) — 4-Level Fallback

```typescript
// 변경 전: 3-Level (CLI → API → ensemble)
// 변경 후: 4-Level (Max CLI → Local CLI → API → ensemble)

export type FallbackLevel = 'max-cli' | 'cli' | 'api' | 'ensemble';

export async function executeWithFallback(
  job: PrototypeJob,
  round: number,
  cliRunner: (...) => Promise<...>,
): Promise<FallbackResult> {
  const skipCli = process.env['SKIP_CLI'] === 'true';

  // Level 0: Claude Max CLI (구독, $0)
  if (!skipCli) {
    const cliPath = process.env['CLAUDE_CLI_PATH'] ?? 'claude';
    const maxCliResult = await runMaxCli(job, round, cliPath);
    if (maxCliResult.success) {
      return { level: 'max-cli', output: maxCliResult.output, success: true };
    }
    console.log(`[Builder] Max CLI failed, trying API...`);
  }

  // Level 1: API (pay-per-token, fallback)
  const apiResult = await fallbackToApi(job, round);
  if (apiResult.success) return apiResult;

  // Level 2: 모두 실패
  return { level: 'ensemble', output: '', success: false, error: '...' };
}
```

**`runMaxCli()` 구현:**

```typescript
async function runMaxCli(
  job: PrototypeJob,
  round: number,
  cliPath: string,
): Promise<{ success: boolean; output: string }> {
  const prompt = buildGeneratorPrompt(job, round);
  const args = [
    '--bare',
    '-p', prompt,
    '--allowedTools', 'Bash,Read,Edit,Write',
    '--max-turns', '15',
    '--output-format', 'json',
  ];

  try {
    const { stdout } = await execFileAsync(cliPath, args, {
      cwd: job.workDir,
      timeout: 5 * 60 * 1000,  // 5분 (Max 구독은 여유)
      env: { ...process.env },  // ANTHROPIC_API_KEY 불필요 (구독 인증)
    });

    // CLI 출력에서 파일 추출 (API 모드와 동일)
    const filesWritten = await writeGeneratedFiles(stdout, job.workDir);
    return { success: filesWritten > 0, output: stdout };
  } catch {
    return { success: false, output: '' };
  }
}
```

### 3.4 CostTracker 확장

```typescript
// CLI 모드 기록 추가
record(jobId, round, model, inputTokens, outputTokens): CostRecord
recordCli(jobId: string, round: number): CostRecord {
  // CLI 모드는 비용 $0, 토큰 수 미확인
  return {
    jobId, round, model: 'cli-subscription',
    inputTokens: 0, outputTokens: 0, cost: 0,
    timestamp: Date.now(),
  };
}
```

---

## 4. API Design

### 4.1 품질 스코어 조회

```
GET /api/builder/{jobId}/quality
Response:
{
  "scores": [
    {
      "round": 0,
      "total": 45,
      "dimensions": [
        { "dimension": "build", "score": 1.0, "weighted": 0.20 },
        { "dimension": "ui", "score": 0.3, "weighted": 0.075 },
        { "dimension": "functional", "score": 0.2, "weighted": 0.04 },
        { "dimension": "prd", "score": 0.4, "weighted": 0.10 },
        { "dimension": "code", "score": 0.5, "weighted": 0.05 }
      ],
      "generationMode": "cli",
      "costUsd": 0,
      "evaluatedAt": "2026-04-06T22:30:00Z"
    }
  ]
}
```

### 4.2 품질 통계 조회

```
GET /api/builder/quality/stats
Response:
{
  "totalPrototypes": 5,
  "averageScore": 65.4,
  "above80Count": 2,
  "totalCostSaved": 12.50,
  "generationModes": { "cli": 8, "api": 2 }
}
```

---

## 5. Improvement Loop Detail

### 5.1 타겟 피드백 생성 규칙

```typescript
function generateTargetFeedback(score: QualityScore): TargetFeedback {
  // 가장 낮은 차원 식별
  const weakest = score.dimensions
    .sort((a, b) => a.score - b.score)[0];

  // 차원별 개선 프롬프트 맵
  const prompts: Record<ScoreDimension, string> = {
    build: '빌드 에러를 수정하세요. 누락된 import, 타입 에러, 모듈 해결 실패를 확인하세요.',
    ui: '레이아웃을 개선하세요. Tailwind CSS 유틸리티로 일관된 간격/색상을 적용하고, header/nav/main/footer 시맨틱 구조를 사용하세요. 컴포넌트를 다양하게 활용하세요.',
    functional: '인터랙티브 기능을 추가하세요. 모든 버튼에 onClick 핸들러를 연결하고, useState로 상태 관리를 추가하고, 탭/모달/폼 등 사용자 상호작용을 구현하세요.',
    prd: 'PRD의 Must Have 기능 중 미구현 항목을 추가하세요: {missing}. 각 기능이 실제 UI 컴포넌트로 표현되어야 합니다.',
    code: 'ESLint 에러와 TypeScript 타입 에러를 수정하세요. any 타입을 제거하고 적절한 타입을 명시하세요.',
  };

  return {
    weakestDimension: weakest.dimension,
    score: weakest.score,
    prompt: prompts[weakest.dimension].replace('{missing}', weakest.details),
  };
}
```

### 5.2 수렴 전략

```
Round 1: 전체 생성 (baseline)
  → score = 45점, weakest = functional (0.2)
Round 2: 기존 코드 유지 + functional 타겟 피드백
  → score = 58점, weakest = ui (0.3)
Round 3: ui 타겟 피드백
  → score = 72점, weakest = prd (0.5)
Round 4: prd 타겟 피드백 (미구현 목록 명시)
  → score = 83점 ✅ 수렴

미수렴 시 (Round 5 후에도 < 80):
  → best score 라운드의 코드 채택
  → 미달 리포트 생성 (차원별 미달 사유)
```

---

## 6. Sprint별 구현 체크리스트

### Sprint 175 (M0: PoC) — F384, F385

#### F384: CLI PoC
- [ ] `claude --bare -p "Hello" --max-turns 1` subprocess 실행 테스트
- [ ] 10회 반복 → 성공률, 평균 응답 시간 측정
- [ ] 분당 rate limit 확인 (연속 호출 간 최소 간격)
- [ ] 30분 장시간 실행 안정성 테스트
- [ ] PoC 결과 문서 작성 (`docs/specs/fx-builder-evolution/poc-cli.md`)

#### F385: 5차원 재현성 PoC
- [ ] `proto-self-evolving-harness-v2` 프로토타입 선택 (코드 기존 보유)
- [ ] 임시 스코어러 구현 (buildScore + codeScore + 간이 uiScore)
- [ ] 동일 코드 3회 평가 → 편차 기록
- [ ] prdScore LLM 평가 재현성 확인 (temperature 0)
- [ ] PoC 결과 문서 작성 (`docs/specs/fx-builder-evolution/poc-scorer.md`)

### Sprint 176 (M1: 스코어링) — F386, F387

#### F386: 스코어러 구현
- [ ] `prototype-builder/src/scorer.ts` 생성
- [ ] `buildScore()` 구현 (vite build + warning count)
- [ ] `uiScore()` 구현 (DOM 분석: 태그 다양성 + Tailwind + 시맨틱)
- [ ] `functionalScore()` 구현 (정규식: onClick/useState/useEffect/라우트)
- [ ] `prdScore()` 구현 (Claude Sonnet API, temperature 0, JSON 응답)
- [ ] `codeScore()` 구현 (ESLint + tsc --noEmit)
- [ ] `evaluateQuality()` 통합 함수
- [ ] `generateTargetFeedback()` 구현
- [ ] `types.ts`에 `QualityScore`, `DimensionScore`, `TargetFeedback` 추가
- [ ] 테스트: `__tests__/scorer.test.ts`

#### F387: 베이스라인 + D1
- [ ] D1 마이그레이션 `0110_prototype_quality.sql`
- [ ] `packages/api/src/services/prototype-quality-service.ts`
- [ ] `packages/api/src/schemas/prototype-quality-schema.ts`
- [ ] `packages/api/src/routes/builder.ts` — GET quality 엔드포인트 추가
- [ ] 5종 프로토타입 베이스라인 점수 측정 스크립트
- [ ] 테스트: `__tests__/prototype-quality.test.ts`

### Sprint 177 (M2+M3: CLI + 자동 개선) — F388, F389

#### F388: CLI 듀얼 모드
- [ ] `fallback.ts`에 `runMaxCli()` 함수 추가
- [ ] `FallbackLevel`에 `'max-cli'` 추가
- [ ] `CLAUDE_CLI_PATH` 환경변수 지원
- [ ] CLI 가용성 자동 감지 (subprocess ping 테스트)
- [ ] `CostTracker.recordCli()` 메서드 추가
- [ ] 테스트: CLI 모드 mock 테스트

#### F389: Enhanced O-G-D
- [ ] `orchestrator.ts` — `evaluateQuality()` 통합
- [ ] qualityThreshold 단위 변경 (0.85 → 80)
- [ ] 타겟 피드백 → `saveFeedback()` → 다음 라운드 입력
- [ ] maxRounds 3→5 확장
- [ ] 미수렴 시 best score 채택 + 미달 리포트
- [ ] 라운드별 점수 D1 저장 (`prototype_quality` INSERT)
- [ ] 테스트: Enhanced O-G-D 시나리오 테스트

### Sprint 178 (M4: 대시보드 + 피드백) — F390, F391

#### F390: Builder Quality 대시보드
- [ ] `packages/web/src/routes/builder-quality.tsx` 페이지
- [ ] `QualityRadarChart` 컴포넌트 (5차원 SVG 레이더)
- [ ] `ScoreCard` 컴포넌트 (프로토타입별 점수 카드)
- [ ] `ScoreTrend` 컴포넌트 (라운드별 점수 추이 그래프)
- [ ] Sidebar에 "Builder Quality" 메뉴 추가
- [ ] API 연동: `/api/builder/{jobId}/quality` + `/api/builder/quality/stats`

#### F391: 사용자 피드백
- [ ] 수동 평가 입력 폼 (1~5 척도 × 5차원)
- [ ] POST `/api/builder/{jobId}/feedback` API
- [ ] 자동 점수 vs 수동 점수 상관관계 계산
- [ ] 캘리브레이션 보정 계수 저장

---

## 7. Testing Strategy

### 7.1 단위 테스트

| 모듈 | 테스트 파일 | 핵심 시나리오 |
|------|-----------|-------------|
| scorer | `scorer.test.ts` | 각 차원 개별 점수 + 가중 평균 + 타겟 피드백 생성 |
| orchestrator | `orchestrator.test.ts` | 5차원 스코어 기반 O-G-D 루프 수렴/미수렴 |
| fallback | `fallback.test.ts` | CLI → API 자동 전환, CostTracker CLI 기록 |
| quality API | `prototype-quality.test.ts` | D1 CRUD + 통계 조회 |

### 7.2 통합 테스트

- 5종 프로토타입 중 1종으로 전체 파이프라인 E2E
- CLI 모드 + 5차원 스코어 + 타겟 피드백 → 80점 수렴 확인

### 7.3 E2E 테스트

- Builder Quality 대시보드 페이지 접근 + 레이더 차트 렌더링
- 수동 평가 입력 + 저장 확인

---

## 8. Risks & Mitigations

| Risk | Mitigation | Design Impact |
|------|-----------|---------------|
| CLI rate limit 불충분 | M0 PoC에서 사전 측정. 불가 시 CLI 제거, API only + haiku 비용 최적화 | `runMaxCli()` 제거 가능하도록 독립 함수로 설계 |
| LLM 평가 재현성 부족 | temperature 0 + 구조화 JSON 응답 + 정규화 프롬프트 | `prdScore()`에 3회 평균 옵션 추가 |
| DOM 분석 UI 점수 부정확 | P1에서 Vision API 추가, BD팀 캘리브레이션으로 보정 | `uiScore()` 전략 패턴으로 교체 가능 |
| 자동 개선 루프 미수렴 | 5라운드 후 best score 채택 + 수동 피드백 주입 옵션 | `TargetFeedback.prompt` + 사용자 override |

---

## 9. Dependencies

| 패키지 | 용도 | 신규/기존 |
|--------|------|-----------|
| `cheerio` | DOM 파싱 (uiScore) | 신규 (prototype-builder) |
| `@anthropic-ai/sdk` | prdScore LLM 호출 | 기존 |
| `eslint` | codeScore 린트 실행 | 기존 (devDependency) |
| `typescript` | codeScore tsc 실행 | 기존 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-06 | Initial design (Plan + PRD 기반) | AX BD팀 |
