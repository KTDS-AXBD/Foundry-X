---
code: FX-DSGN-S228
title: Sprint 228 Design — Feedback→Regeneration + Quality 데이터 통합 (F466/F467)
version: "1.0"
status: Active
category: DSGN
created: 2026-04-08
updated: 2026-04-08
author: Claude Sonnet 4.6 (autopilot)
sprint: 228
---

# Sprint 228 Design — F466/F467

## §1. F466 설계: Feedback → Regeneration 루프

### 데이터 흐름

```
사용자 피드백 제출
  → POST /prototypes/:jobId/feedback
  → PrototypeFeedbackService.create()
  → job.status: live → feedback_pending
  → job.feedback_content: "피드백 내용"

재생성 트리거 (F466 신규)
  → POST /ogd/regenerate/:jobId
  → PrototypeFeedbackService.triggerRegeneration(jobId, orgId, services)
  → job.status: feedback_pending → building
  → OgdOrchestratorService.runLoop(orgId, jobId, prdContent, initialFeedback=feedback_content)
  → [OGD 루프 실행]
  → job.status: building → live
  → feedback.status: pending → applied
```

### API 명세

```
POST /ogd/regenerate/:jobId
Authorization: Tenant token (orgId 추출)
Request: {} (body 없음)
Response 200: { jobId, status: "live", summary: OgdSummary }
Response 400: { error: "Job is not in feedback_pending status" }
Response 404: { error: "Job not found" }
Response 500: { error: string }
```

### OgdOrchestratorService.runLoop 시그니처 변경

```typescript
// 기존
runLoop(orgId: string, jobId: string, prdContent: string): Promise<OgdSummary>

// 변경 (initialFeedback 선택적 추가)
runLoop(orgId: string, jobId: string, prdContent: string, initialFeedback?: string): Promise<OgdSummary>
```

`initialFeedback`이 있으면 첫 라운드의 generate()에 `previousFeedback`으로 전달해요.
기존 코드의 루프 내 `previousFeedback` 변수와 구분하기 위해 라운드 시작 전에 초기화해요.

### PrototypeFeedbackService.triggerRegeneration

```typescript
async triggerRegeneration(
  jobId: string,
  orgId: string,
  services: {
    generator: OgdGeneratorService;
    discriminator: OgdDiscriminatorService;
    qualityService?: PrototypeQualityService;
    feedbackConverter?: OgdFeedbackConverterService;
  }
): Promise<OgdSummary>
```

1. job 조회 (feedback_pending 확인)
2. `feedback_content` 읽기
3. job을 `building`으로 전환
4. `OgdOrchestratorService.runLoop()` 호출 (initialFeedback 전달)
5. 완료 후 job을 `live`로 전환
6. pending 피드백들을 `applied`로 일괄 업데이트
7. 실패 시 job을 `failed`로 전환

## §2. F467 설계: Quality 데이터 통합

### OgdOrchestratorService 생성자 변경

```typescript
constructor(
  private db: D1Database,
  private generator: OgdGeneratorService,
  private discriminator: OgdDiscriminatorService,
  private feedbackConverter?: OgdFeedbackConverterService,
  private qualityService?: PrototypeQualityService,  // F467 추가
)
```

### runLoop 완료 후 prototype_quality INSERT

루프 종료 직후 (prototype_jobs UPDATE 후):

```typescript
if (this.qualityService) {
  const score = Math.round(bestScore * 100); // 0.9 → 90
  await this.qualityService.insert({
    jobId,
    round: rounds.length,
    totalScore: score,
    buildScore: score,
    uiScore: score,
    functionalScore: score,
    prdScore: score,
    codeScore: score,
    generationMode: 'ogd',
    costUsd: totalCostUsd,
    feedback: rounds[bestRound - 1]?.feedback ?? null,
    details: JSON.stringify({ ogdRounds: rounds.length, passed }),
  });
}
```

### ogd-quality.ts 라우트 수정

`POST /ogd/evaluate` 및 `POST /ogd/regenerate` 두 곳에서 qualityService 주입:

```typescript
const qualityService = new PrototypeQualityService(c.env.DB);
const orchestrator = new OgdOrchestratorService(
  c.env.DB, generator, discriminator, undefined, qualityService
);
```

## §3. 파일 변경 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `core/harness/services/ogd-orchestrator-service.ts` | 수정 | `PrototypeQualityService` 주입 + runLoop initialFeedback + 완료 후 INSERT |
| `core/harness/services/prototype-feedback-service.ts` | 수정 | `triggerRegeneration` 메서드 추가 |
| `core/harness/routes/ogd-quality.ts` | 수정 | `POST /ogd/regenerate/:jobId` 추가 + qualityService 주입 |
| `core/harness/schemas/prototype-quality-schema.ts` | 수정 | `GENERATION_MODES`에 `'ogd'` 추가 |
| `__tests__/ogd-orchestrator.test.ts` | 수정 | F467 quality INSERT 테스트 + F466 initialFeedback 테스트 추가 |
| `__tests__/ogd-quality-route.test.ts` | 수정 | F466 regeneration 테스트 6개 추가 |

신규 파일 없음. D1 마이그레이션 없음.

## §4. 테스트 계획

### F466 테스트 (ogd-quality-route.test.ts 또는 신규)
1. `POST /ogd/regenerate/:jobId` — 정상 (feedback_pending job)
2. `POST /ogd/regenerate/:jobId` — feedback_pending 아닌 경우 400
3. `POST /ogd/regenerate/:jobId` — job 없으면 404
4. triggerRegeneration — 완료 후 job status = live
5. triggerRegeneration — 완료 후 pending feedback → applied
6. triggerRegeneration — OGD 실패 시 job status = failed

### F467 테스트 (ogd-orchestrator.test.ts)
7. qualityService 주입 시 runLoop 후 prototype_quality에 INSERT됨
8. qualityService 미주입 시 INSERT 없음 (기존 동작 유지)
9. quality score 변환 검증 (0.9 → 90)
