---
code: FX-RPRT-S206
title: Sprint 206 완료 보고서 — F429+F430 max-cli 큐 관리 + 디자인 커맨드 파이프라인
version: 1.0
status: Active
category: RPRT
created: 2026-04-07
updated: 2026-04-07
author: Claude (Autopilot)
sprint: 206
f_items: F429, F430
match_rate: 97
---

# Sprint 206 완료 보고서 — F429+F430

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 206 |
| F-items | F429 (max-cli 큐 관리), F430 (디자인 커맨드 파이프라인) |
| 착수 | 2026-04-07 |
| 완료 | 2026-04-07 |
| Match Rate | **97%** ✅ |
| 테스트 | 131/131 통과 (신규 21개 포함) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | max-cli 동시 실행으로 인한 subprocess 충돌 + impeccable 위반 수정 체계 부재 |
| **Solution** | Singleton FIFO BuildQueue + 3단계 DesignPipeline 구현 |
| **Function UX** | 동시 빌드 방지로 안정성 향상 / /audit→/normalize→/polish 단계별 디자인 개선 |
| **Core Value** | Builder 신뢰성 강화 + impeccable 기준 준수 자동화 |

---

## F429: max-cli 큐 관리

### 구현 내용

**신규 파일**: `prototype-builder/src/build-queue.ts`

```
BuildQueue (Singleton)
├── enqueue<T>(fn, opts) → Promise<T>
├── getStatus() → BuildQueueStatus
└── clear() (테스트용)
```

**핵심 설계 결정**:
- **Semaphore(max=1)**: `running` boolean + FIFO Array — Node.js 싱글 스레드 안전
- **타이밍 수정**: `running=false`를 `item.resolve(result)` 전에 설정 (getStatus 즉시 정확도)
- **`timer.unref()`**: 타임아웃 timer가 프로세스를 불필요하게 유지하지 않도록

**`fallback.ts` 수정**: `runMaxCli`의 `execFileAsync` 호출을 `BuildQueue.getInstance().enqueue()` 로 래핑

```ts
// F429: 단일 머신 동시 실행 방지
return BuildQueue.getInstance().enqueue(
  () => retryWithBackoff(() => execFileAsync(...)),
  { label: `${job.id}-round${round}`, timeoutMs: MAX_CLI_TIMEOUT + 10_000 },
);
```

### 테스트 결과 (build-queue.test.ts)

| 시나리오 | 결과 |
|----------|:----:|
| Singleton — 동일 인스턴스 반환 | ✅ PASS |
| 단건 enqueue — 값 반환 | ✅ PASS |
| 단건 enqueue — throw 전파 | ✅ PASS |
| 동시 2건 — 순차 실행 (order=[1,2,3]) | ✅ PASS |
| 동시 2건 — 실행 중 queueSize 확인 | ✅ PASS |
| 타임아웃 초과 — BuildQueueTimeoutError | ✅ PASS |
| BuildQueueTimeoutError — label/timeoutMs 포함 | ✅ PASS |
| 타임아웃 내 성공 — 정상 결과 반환 | ✅ PASS |
| getStatus() — 초기 상태 | ✅ PASS |
| getStatus() — 실행 중 isRunning=true | ✅ PASS |
| getStatus() — 완료 후 isRunning=false | ✅ PASS |

**11/11 통과**

---

## F430: 디자인 커맨드 파이프라인

### 구현 내용

**신규 파일**: `prototype-builder/src/design-pipeline.ts`

```
runDesignPipeline(job, opts) → PipelineResult
├── audit(job, workDir) → AuditReport
│   ├── LLM 호출 (claude-haiku-4-5-20251001)
│   ├── IMPECCABLE_AUDIT_GUIDE 주입 (7도메인)
│   └── API 키 없음 → 빈 violations fallback
├── normalize(job, workDir, report) → { success, output }
│   ├── critical + major 위반만 필터
│   ├── fix 목록 → feedbackContent 변환
│   └── executeWithFallback 1회 실행
└── polish(job, workDir, report, opts) → { score, converged }
    ├── evaluateQuality 1차 실행
    ├── 점수 >= 80 → converged=true
    └── 점수 < 80 → Generator 추가 실행 → 2차 평가
```

**types.ts 추가**:
- `BuildQueueStatus` (F429)
- `ImpeccableDomain` (7종 union)
- `ViolationSeverity` ('critical' | 'major' | 'minor')
- `ImpeccableViolation` (5필드)
- `AuditReport` (7필드)
- `PipelineStepResult` (4필드)
- `PipelineResult` (6필드)

### 테스트 결과 (design-pipeline.test.ts)

| 시나리오 | 결과 |
|----------|:----:|
| audit — API 키 없음 fallback | ✅ PASS |
| audit — LLM violations 파싱 | ✅ PASS |
| audit — LLM 호출 실패 fallback | ✅ PASS |
| normalize — critical/major 없으면 Generator 미호출 | ✅ PASS |
| normalize — critical 위반 시 Generator 호출 | ✅ PASS |
| normalize — feedbackContent에 fix 포함 | ✅ PASS |
| polish — 점수 >= 80 → converged=true | ✅ PASS |
| polish — 점수 < 80 → 추가 Generator 실행 | ✅ PASS |
| runDesignPipeline — 3단계 순차 실행 | ✅ PASS |
| runDesignPipeline — steps 구조 검증 | ✅ PASS |

**10/10 통과**

---

## Gap Analysis 결과

**Match Rate: 97%** — 7/7 성공 기준 PASS

차이점은 전부 양성 변경:
| 항목 | 디자인 | 구현 | 평가 |
|------|--------|------|:----:|
| `timer.unref()` | 미명시 | 추가 | 운영 안정성 개선 |
| 타임아웃 여유 | `+5_000` | `+10_000` | 더 보수적 |
| 테스트 수 | 12개 | 21개 | 추가 커버리지 |
| `DesignPipelineOptions` | threshold 하드코딩 | 설정 가능하게 개선 | 유연성 향상 |

---

## 전체 테스트 현황

| 파일 | 기존 테스트 | 신규 테스트 | 합계 | 결과 |
|------|:-----------:|:-----------:|:----:|:----:|
| build-queue.test.ts | — | 11 | 11 | ✅ |
| design-pipeline.test.ts | — | 10 | 10 | ✅ |
| 기존 8개 파일 | 110 | — | 110 | ✅ |
| **합계** | **110** | **21** | **131** | **✅ 전체 통과** |

---

## 변경 파일 목록

| 파일 | 변경 | 주요 내용 |
|------|------|----------|
| `prototype-builder/src/build-queue.ts` | 신규 (+131줄) | F429 BuildQueue Singleton |
| `prototype-builder/src/design-pipeline.ts` | 신규 (+258줄) | F430 3단계 파이프라인 |
| `prototype-builder/src/types.ts` | 수정 (+65줄) | F429/F430 타입 정의 |
| `prototype-builder/src/fallback.ts` | 수정 (+8줄) | BuildQueue 통합 |
| `prototype-builder/src/__tests__/build-queue.test.ts` | 신규 | 11 시나리오 |
| `prototype-builder/src/__tests__/design-pipeline.test.ts` | 신규 | 10 시나리오 |
| `docs/01-plan/features/sprint-206.plan.md` | 신규 | Sprint 206 Plan |
| `docs/02-design/features/sprint-206.design.md` | 신규 | Sprint 206 Design |
