---
code: FX-PLAN-S207
title: Sprint 207 Plan — F431 판별 피드백 구체화
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: autopilot
f_items: F431
req_codes: FX-REQ-423
---

# Sprint 207 Plan — F431 판별 피드백 구체화

## §1. 목적

**F431**: OGD(O-G-D) 루프에서 Discriminator의 평가 결과를 구체적 수정 지시(actionable instructions)로 변환하고, Generator의 다음 라운드 프롬프트에 자동 주입하여 루프 수렴 속도를 개선한다.

## §2. 배경

Phase 22-D (Sprint 207)의 마지막 F-item. Phase 19(Builder Evolution)에서 구축한 O-G-D 루프는 다음 문제를 안고 있다:

| 문제 | 영향 |
|------|------|
| Discriminator 피드백이 일반적인 텍스트 ("개선 필요") | Generator가 무엇을 어떻게 바꿔야 할지 모름 |
| 피드백이 구조화되지 않음 | 라운드마다 같은 문제가 반복됨 |
| 루프가 수렴하지 않음 | MAX_ROUNDS(3) 소진 후에도 품질 미달 |

## §3. 목표 상태

- `OgdFeedbackConverterService`: 판별 결과 → 구체적 지시 변환 (LLM 활용)
- `OgdDiscriminatorService`: 평가 + 구조화된 피드백 반환
- `OgdOrchestratorService`: converter 호출 → Generator에 structured instructions 주입
- `OgdGeneratorService`: structured instructions를 번호부여 목록으로 프롬프트에 주입

## §4. 구현 범위

### In Scope
- `packages/api/src/core/harness/services/ogd-feedback-converter.ts` 신규 생성
- `ogd-discriminator-service.ts` 업데이트 (structured 결과 반환)
- `ogd-orchestrator-service.ts` 업데이트 (converter 호출 + structured feedback 전달)
- `ogd-generator-service.ts` 업데이트 (structured instructions 주입 포맷 개선)
- `packages/shared/src/ogd.ts` 업데이트 (`structuredInstructions` 필드 추가)
- 유닛 테스트: `ogd-feedback-converter.test.ts`

### Out of Scope
- Vision API 연동 (F418 범위)
- max-cli 통합 (F419 범위)
- DB 스키마 변경

## §5. 구현 전략

```
Discriminator.evaluate()
  → raw feedback (기존)
  → FeedbackConverterService.convert(rawFeedback, failedItems)
      → LLM: "변환해줘" 프롬프트
      → StructuredInstruction[] 반환
  → OgdRound.structuredInstructions 저장
  → Generator.generate(prd, structuredInstructions)
      → 프롬프트: "## 이전 라운드 수정 지시\n1. ...\n2. ..."
```

## §6. 성공 기준

- typecheck 통과
- ogd-feedback-converter 유닛 테스트 통과
- Design Gap 90% 이상
