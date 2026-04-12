---
code: FX-PLAN-S206
title: Sprint 206 — F429+F430 max-cli 큐 관리 + 디자인 커맨드 파이프라인
version: 1.0
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Autopilot)
sprint: 206
f_items: F429, F430
---

# Sprint 206 Plan — F429+F430 max-cli 큐 관리 + 디자인 커맨드 파이프라인

## 1. 목표

Phase 22-D (Prototype Builder v2) 안정성 + 커맨드 체계 도입.

- **F429**: 단일 머신에서 `max-cli` 동시 실행 방지 — FIFO 빌드 큐 + 타임아웃 관리
- **F430**: `/audit→/normalize→/polish` 3단계 디자인 커맨드 파이프라인 — impeccable O-G-D 루프 매핑

## 2. 배경

### F429 필요성
`prototype-builder`의 현재 폴링 루프는 `pollForJobs → processJob` 순으로 단건 처리하지만,
`executeWithFallback → runCliGenerator`에서 `max-cli` subprocess를 직접 실행해요.
문제: 다수 Job이 동시에 처리될 경우(피드백 Job + 신규 Job), 두 subprocess가 경쟁 실행돼요.
Claude Code CLI는 단일 세션만 지원하므로, 동시 실행 시 두 번째 호출이 즉시 실패해요.

### F430 필요성
현재 `runOgdLoop`는 품질 점수가 임계값 미달일 때 동일한 "개선 프롬프트"를 반복해요.
impeccable 기준에서 디자인 문제는 3단계 특성이 명확해요:
1. **Audit** — 현재 상태 진단 (어떤 위반이 있는가)
2. **Normalize** — 규칙 적용 (타이포그래피/색상/간격 정규화)
3. **Polish** — 마무리 (세부 마감, 비주얼 일관성)

이를 명시적 파이프라인으로 분리하면 각 단계가 특화된 피드백을 줄 수 있어요.

## 3. 범위

### F429: BuildQueue (build-queue.ts)
- `BuildQueue` 클래스 — 내부 FIFO 큐 + Semaphore(max=1)
- `enqueue(fn, opts)` — 실행할 async 함수를 큐에 등록, Promise 반환
- `opts.timeoutMs` — 타임아웃 초과 시 `BuildQueueTimeoutError` throw
- `opts.label` — 로깅용 레이블
- `getStatus()` — 현재 큐 크기 + 실행 중 여부 반환
- `fallback.ts` 수정: `runMaxCli` 호출을 `BuildQueue.getInstance().enqueue()` 로 래핑

### F430: DesignPipeline (design-pipeline.ts)
- `DesignPipeline` 클래스 — 3단계 커맨드 체인
  - `audit(job, workDir)` → `AuditReport` (위반 목록 + 심각도)
  - `normalize(job, workDir, report)` → Generator 실행 + 타이포그래피/색상/간격 정규화
  - `polish(job, workDir)` → 최종 O-G-D 라운드 (마감)
- `runDesignPipeline(job, opts)` — 3단계 순차 실행 + 중간 결과 반환
- `orchestrator.ts` 수정: `runOgdLoop` 외에 `runDesignPipeline` 호출 경로 추가

## 4. 파일 변경

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `prototype-builder/src/build-queue.ts` | 신규 | F429 BuildQueue + Semaphore |
| `prototype-builder/src/design-pipeline.ts` | 신규 | F430 3단계 커맨드 파이프라인 |
| `prototype-builder/src/fallback.ts` | 수정 | max-cli 호출을 BuildQueue로 래핑 |
| `prototype-builder/src/types.ts` | 수정 | `AuditReport`, `PipelineResult`, `BuildQueueStatus` 타입 추가 |
| `prototype-builder/src/__tests__/build-queue.test.ts` | 신규 | BuildQueue 단위 테스트 |
| `prototype-builder/src/__tests__/design-pipeline.test.ts` | 신규 | DesignPipeline 단위 테스트 |

## 5. 성공 기준

- [ ] F429: `BuildQueue.enqueue` 가 동시 호출 시 순차 실행을 보장
- [ ] F429: 타임아웃 초과 시 `BuildQueueTimeoutError` throw
- [ ] F429: `fallback.ts`의 max-cli 호출이 BuildQueue 경유
- [ ] F430: `audit` → `normalize` → `polish` 3단계 순차 실행
- [ ] F430: `AuditReport`에 impeccable 위반 목록 포함
- [ ] 테스트: 큐 순차성 + 타임아웃 + 파이프라인 3단계 커버
- [ ] `pnpm typecheck` 통과

## 6. 비고

- `BuildQueue`는 Singleton — `BuildQueue.getInstance()` 패턴
- `DesignPipeline.audit`은 LLM 호출 (Anthropic API), API 키 없으면 정적 분석 fallback
- 기존 `runOgdLoop`는 변경 없음 — DesignPipeline은 별도 진입점
