---
code: FX-PLAN-S204
title: Sprint 204 — F425+F426 Builder v2 LLM 판별 고도화
version: 1.0
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Autopilot)
sprint: 204
f_items: F425, F426
---

# Sprint 204 Plan — F425+F426 Builder v2 LLM 판별 고도화

## 1. 목표

Phase 22-D (Prototype Builder v2)의 핵심 판별 정확도 개선.

- **F425**: `prdScore` 함수의 키워드 매칭 → LLM 의미 비교 교체 (기본 경로 변경)
- **F426**: 5차원 전체를 LLM이 통합 평가하는 `evaluateQualityWithLlm` 신규 구현

## 2. 배경

현재 `scorer.ts`는:
- `prdScore(job, workDir, { useLlm: false })` — 기본값이 키워드 모드
- 5차원 평가 모두 정적 분석으로만 동작
- LLM 경로(`prdScoreWithLlm`)는 구현되어 있지만 옵트인

PRD 2.1 As-Is에서 명시: "PRD 정합성(25%)은 키워드 매칭 수준 — 의미적 반영도 미평가"

## 3. 범위

### F425: PRD 정합성 LLM 판별
- `prdScoreWithLlm` 프롬프트 개선: Must Have 요구사항 목록 추출 → 각 항목 의미 비교
- LLM 기본 경로 활성화 (`useLlm` 기본값 `true`)
- 결과에 `missingRequirements` 배열 포함 (피드백 품질 향상)
- 키워드 모드는 fallback으로 유지 (API 키 없음 / 호출 실패)

### F426: 5차원 LLM 통합 판별
- 신규 함수 `evaluateQualityWithLlm(job, workDir)` 추가
  1. 정적 분석 5차원 먼저 실행 (보조 데이터)
  2. 정적 결과 + 소스코드 요약을 컨텍스트로 단일 LLM 호출
  3. LLM이 5차원 각각 점수 + 근거 + 개선 지시 반환
  4. 최종 점수 = LLM 판정 (정적 분석은 참고용)
- `evaluateQuality`에 `{ useLlmIntegrated: true }` 옵션 추가
- 기존 테스트 호환성 유지

## 4. 파일 변경

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `prototype-builder/src/scorer.ts` | 수정 | F425 prdScore 개선 + F426 통합 판별 함수 추가 |
| `prototype-builder/src/types.ts` | 수정 | `LlmDimensionResult`, `IntegratedEvalOptions` 타입 추가 |
| `prototype-builder/src/orchestrator.ts` | 수정 | `useLlmIntegrated` 옵션 전달 |
| `prototype-builder/src/__tests__/scorer.test.ts` | 수정 | F425/F426 신규 테스트 추가 |

## 5. 성공 기준

- [ ] F425: `prdScore(..., { useLlm: true })` 가 의미론적 비교로 동작
- [ ] F425: LLM 기본값 활성화 (orchestrator `useLlm: true`)
- [ ] F426: `evaluateQualityWithLlm` 함수 존재 + 5차원 LLM 점수 반환
- [ ] F426: 정적 분석 결과를 `staticAnalysis` 필드로 포함
- [ ] 테스트: LLM mock으로 F425/F426 시나리오 커버
- [ ] `pnpm typecheck` 통과

## 6. 비고

- `useLlm` 기본값 변경은 orchestrator 레벨에서만 (scorer 함수 시그니처는 하위 호환 유지)
- `ANTHROPIC_API_KEY` 없을 때 fallback 동작 유지 필수
