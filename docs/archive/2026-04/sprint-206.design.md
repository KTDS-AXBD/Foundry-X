---
code: FX-DSGN-S206
title: Sprint 206 Design — F429+F430 max-cli 큐 관리 + 디자인 커맨드 파이프라인
version: 1.0
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Autopilot)
sprint: 206
f_items: F429, F430
---

# Sprint 206 Design — F429+F430 max-cli 큐 관리 + 디자인 커맨드 파이프라인

## §1. F429: BuildQueue — max-cli 순차 실행 보장

### 1.1 문제 정의

`prototype-builder`의 폴링 루프는 신규 빌드 Job과 피드백 Job을 동시에 처리할 수 있어요.
두 Job이 `executeWithFallback → runMaxCli`에 진입하면 Claude Code CLI subprocess 2개가 경쟁:
- CLI는 단일 세션만 지원 → 두 번째 subprocess가 즉시 실패 또는 예기치 않은 결과

### 1.2 해결 설계: Semaphore 기반 BuildQueue

```
┌─────────────────────────────────────────────────────┐
│                   BuildQueue (Singleton)             │
│                                                      │
│  queue: Array<QueueItem>  ←── enqueue(fn, opts)     │
│  running: boolean                                    │
│                                                      │
│  ┌───────────────────────────────────────────────┐   │
│  │  Semaphore(max=1)                             │   │
│  │  while queue.length > 0 && !running:          │   │
│  │    running = true                             │   │
│  │    item = queue.shift()                       │   │
│  │    await withTimeout(item.fn, item.timeout)   │   │
│  │    running = false                            │   │
│  │    processNext()                              │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 1.3 인터페이스 설계

```ts
// build-queue.ts

export class BuildQueueTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`BuildQueue timeout: "${label}" exceeded ${timeoutMs}ms`);
    this.name = 'BuildQueueTimeoutError';
  }
}

export interface BuildQueueOptions {
  timeoutMs?: number;    // 기본 300_000ms (5분)
  label?: string;        // 로깅용 (기본 'unnamed')
}

export interface BuildQueueStatus {
  queueSize: number;     // 대기 중인 항목 수
  isRunning: boolean;    // 현재 실행 중 여부
}

export class BuildQueue {
  private static instance: BuildQueue;
  
  static getInstance(): BuildQueue;
  
  enqueue<T>(
    fn: () => Promise<T>,
    opts?: BuildQueueOptions,
  ): Promise<T>;
  
  getStatus(): BuildQueueStatus;
  
  clear(): void;  // 테스트 초기화용
}
```

### 1.4 타임아웃 처리

```ts
// Promise.race 패턴으로 타임아웃 구현
function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new BuildQueueTimeoutError(label, timeoutMs)), timeoutMs)
  );
  return Promise.race([fn(), timer]);
}
```

### 1.5 fallback.ts 수정 지점

```ts
// 현재 (Before)
async function runMaxCli(job: PrototypeJob, round: number): Promise<...> {
  const { stdout } = await execFileAsync('claude', args, { timeout: ... });
}

// 개선 후 (After)
async function runMaxCli(job: PrototypeJob, round: number): Promise<...> {
  return BuildQueue.getInstance().enqueue(
    () => execFileAsync('claude', args, { timeout: MAX_CLI_TIMEOUT }),
    { label: `${job.id}-round${round}`, timeoutMs: MAX_CLI_TIMEOUT + 5_000 }
  );
}
```

---

## §2. F430: DesignPipeline — /audit→/normalize→/polish 3단계 커맨드

### 2.1 파이프라인 구조

```
PrototypeJob
     │
     ▼
┌─────────────┐    AuditReport    ┌──────────────────┐
│   /audit    │ ───────────────►  │   /normalize     │
│  (LLM 진단) │                   │  (규칙 기반 생성) │
└─────────────┘                   └────────┬─────────┘
                                           │ normalizedOutput
                                           ▼
                                  ┌────────────────────┐
                                  │    /polish         │
                                  │  (O-G-D 마감 라운드)│
                                  └────────┬───────────┘
                                           │
                                           ▼
                                    PipelineResult
```

### 2.2 AuditReport 타입

```ts
export interface ImpeccableViolation {
  domain: 'typography' | 'colorContrast' | 'spatialDesign' | 'motionDesign' | 'componentDesign' | 'darkMode' | 'accessibility';
  severity: 'critical' | 'major' | 'minor';
  rule: string;           // 예: "Line height < 1.5 for body text"
  evidence: string;       // 예: "line-height: 1.2 found in .body-text"
  fix: string;            // 예: "Change to line-height: 1.6"
}

export interface AuditReport {
  jobId: string;
  violations: ImpeccableViolation[];
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  auditedAt: string;
  rawAnalysis: string;    // LLM 원문 응답
}
```

### 2.3 PipelineResult 타입

```ts
export interface PipelineStepResult {
  step: 'audit' | 'normalize' | 'polish';
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface PipelineResult {
  jobId: string;
  auditReport: AuditReport;
  score: number;           // polish 후 최종 점수 (0~100)
  totalCost: number;
  steps: PipelineStepResult[];
  converged: boolean;
}
```

### 2.4 단계별 상세 설계

#### /audit 단계
- **입력**: PRD 내용 + 기존 workDir의 소스 코드
- **처리**: LLM 호출 — impeccable 7도메인 기준으로 위반 분류
- **fallback**: API 키 없으면 정적 분석 (빈 violations 반환)
- **출력**: `AuditReport`

#### /normalize 단계
- **입력**: `AuditReport.violations` 필터링 (critical + major만)
- **처리**: 위반 목록을 프롬프트에 주입 → Generator 1회 실행 (max-cli or API)
- **핵심**: "fix" 필드를 구체적 코드 수정 지시로 변환
- **출력**: 수정된 소스 코드 (workDir에 반영)

#### /polish 단계
- **입력**: normalize 결과 + minor violations
- **처리**: `evaluateQuality` → 점수 < 80이면 추가 Generator 1회 실행
- **목표**: 최종 점수 80+ 달성
- **출력**: `PipelineResult`

### 2.5 LLM 프롬프트 — /audit

```
당신은 웹 UI 디자인 품질 감사자입니다. impeccable 기준으로 위반을 분류하세요.

## impeccable 기준 (7도메인)
[IMPECCABLE_DOMAINS 전체 주입]

## 감사 대상 소스 코드 (최대 6000자)
[CSS + HTML/JSX 주요 부분]

## 출력 형식 (JSON)
{
  "violations": [
    {
      "domain": "typography",
      "severity": "critical",
      "rule": "Body font-size < 16px",
      "evidence": "font-size: 14px in .body",
      "fix": "Change .body font-size to 16px or 18px"
    }
  ]
}
```

### 2.6 orchestrator.ts 연계

`runDesignPipeline`은 `runOgdLoop`와 독립적으로 동작.
PrototypeJob에 `useDesignPipeline: true` 플래그 추가 시 `runDesignPipeline` 경로를 사용.
기존 `runOgdLoop` 경로는 무변경.

---

## §3. types.ts 추가 타입

```ts
// F429
export interface BuildQueueStatus {
  queueSize: number;
  isRunning: boolean;
}

// F430
export type ImpeccableDomain = 
  'typography' | 'colorContrast' | 'spatialDesign' | 
  'motionDesign' | 'componentDesign' | 'darkMode' | 'accessibility';

export type ViolationSeverity = 'critical' | 'major' | 'minor';

export interface ImpeccableViolation {
  domain: ImpeccableDomain;
  severity: ViolationSeverity;
  rule: string;
  evidence: string;
  fix: string;
}

export interface AuditReport {
  jobId: string;
  violations: ImpeccableViolation[];
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  auditedAt: string;
  rawAnalysis: string;
}

export interface PipelineStepResult {
  step: 'audit' | 'normalize' | 'polish';
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface PipelineResult {
  jobId: string;
  auditReport: AuditReport;
  score: number;
  totalCost: number;
  steps: PipelineStepResult[];
  converged: boolean;
}
```

---

## §4. 테스트 설계

### build-queue.test.ts (F429)
| 시나리오 | 검증 포인트 |
|----------|------------|
| 단건 enqueue | Promise 반환, fn 실행 |
| 동시 2건 enqueue | 순차 실행 보장 (실행 순서) |
| 타임아웃 초과 | `BuildQueueTimeoutError` throw |
| 타임아웃 내 성공 | 정상 결과 반환 |
| getStatus() | queueSize + isRunning 정확도 |
| Singleton | `getInstance()` 동일 인스턴스 반환 |

### design-pipeline.test.ts (F430)
| 시나리오 | 검증 포인트 |
|----------|------------|
| audit — LLM 응답 파싱 | `AuditReport` 구조 검증 |
| audit — API 키 없음 | 빈 violations fallback |
| normalize — critical 위반 처리 | Generator 호출 여부 |
| polish — 점수 80+ | converged=true |
| polish — 점수 80 미만 | 추가 Generator 호출 |
| runDesignPipeline — 3단계 순차 실행 | steps 배열 3건 |

---

## §5. Worker 파일 매핑

| Worker | 담당 파일 |
|--------|----------|
| W1 | `build-queue.ts`, `__tests__/build-queue.test.ts` |
| W2 | `design-pipeline.ts`, `__tests__/design-pipeline.test.ts`, `types.ts` (추가), `fallback.ts` (수정) |

---

## §6. 성공 기준

- [ ] `BuildQueue.enqueue` 동시 호출 시 순차 실행 (테스트로 검증)
- [ ] `BuildQueueTimeoutError` 타임아웃 초과 시 throw
- [ ] `fallback.ts`의 `runMaxCli` 호출이 BuildQueue 경유
- [ ] `DesignPipeline.audit` — ImpeccableViolation 배열 반환
- [ ] `runDesignPipeline` — 3단계 순차 실행, PipelineResult 반환
- [ ] 테스트: build-queue 6 시나리오 + design-pipeline 6 시나리오
- [ ] `pnpm typecheck` 통과
