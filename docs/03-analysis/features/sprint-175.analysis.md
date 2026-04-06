# Sprint 175 Gap Analysis — M0: 검증 PoC (F384~F385)

> **Date**: 2026-04-06
> **Match Rate**: 100% (15/15 PASS)
> **Status**: PASS

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Feature** | F384 CLI --bare PoC + F385 5차원 스코어러 재현성 PoC |
| **Sprint** | 175 (Phase 19 M0) |
| **Duration** | 1 session |
| **Match Rate** | 100% (15/15) |

| Perspective | Content |
|-------------|---------|
| **Problem** | Builder Discriminator가 빌드 성공/실패 이진 판정만 수행하여 품질 미달 프로토타입이 통과 |
| **Solution** | 5차원 스코어러(build/ui/functional/prd/code) PoC 구현 + CLI subprocess 안정성 검증 |
| **Function/UX Effect** | PoC 코드로 실제 프로토타입 품질을 0~100점으로 다차원 평가 가능 |
| **Core Value** | M1~M4 본구현의 기술적 불확실성(재현성, rate limit) 사전 해소 |

---

## Design vs Implementation

### F384: CLI PoC

| # | Design Requirement | Implementation | Status |
|---|---|---|:---:|
| 1 | CLI subprocess 실행 테스트 | `cli-poc.ts:runCliCall()` — execFile + timeout | PASS |
| 2 | 10회 반복 rate limit 측정 | `cli-poc.ts:measureRateLimit()` — configurable calls + delay | PASS |
| 3 | 분당 rate limit 확인 | `RateLimitResult.rateLimitHit/rateLimitAfterN` | PASS |
| 4 | 장시간 안정성 테스트 | `runCliPoc()` — skipLongTest 옵션으로 제어 | PASS |
| 5 | PoC 결과 문서 | `docs/specs/fx-builder-evolution/poc-cli.md` — 자동 생성 가능 | PASS |
| 6 | 테스트 | `cli-poc.test.ts` — 6 tests 전체 PASS | PASS |

### F385: 5차원 스코어러 PoC

| # | Design Requirement | Implementation | Status |
|---|---|---|:---:|
| 1 | buildScore (vite build + warning) | `scorer.ts:buildScore()` — warning 수 기반 감점 | PASS |
| 2 | uiScore (DOM 구조 분석) | `scorer.ts:uiScore()` — 태그 다양성+Tailwind+시맨틱+접근성 4항목 | PASS |
| 3 | functionalScore (정적 분석) | `scorer.ts:functionalScore()` — 핸들러+hooks+라우팅+에러핸들링 | PASS |
| 4 | prdScore (키워드 매칭 PoC) | `scorer.ts:prdScore()` — 키워드 모드(PoC) + LLM placeholder(M1) | PASS |
| 5 | codeScore (ESLint + TS) | `scorer.ts:codeScore()` — 에러 수 기반 점수 | PASS |
| 6 | 재현성 측정 (3회 평가 ±10점) | `scorer.ts:measureReproducibility()` — N회 평가 + 표준편차 | PASS |
| 7 | QualityScore/DimensionScore 타입 | `types.ts` — 5개 타입 + DIMENSION_WEIGHTS 상수 | PASS |
| 8 | generateTargetFeedback() | `scorer.ts` — 약점 차원 식별 + 차원별 개선 프롬프트 | PASS |
| 9 | 테스트 | `scorer.test.ts` — 11 tests 전체 PASS | PASS |

---

## Test Results

| Test File | Tests | Pass | Fail |
|-----------|:-----:|:----:|:----:|
| scorer.test.ts | 11 | 11 | 0 |
| cli-poc.test.ts | 6 | 6 | 0 |
| executor.test.ts | 5 | 5 | 0 |
| cost-tracker.test.ts | 16 | 16 | 0 |
| **Total (new)** | **17** | **17** | **0** |

> state-machine.test.ts는 기존 @foundry-x/shared import 에러 (Sprint 175 변경과 무관)

---

## Files Changed

| File | Change | Lines |
|------|--------|------:|
| `prototype-builder/src/scorer.ts` | NEW | ~320 |
| `prototype-builder/src/cli-poc.ts` | NEW | ~240 |
| `prototype-builder/src/types.ts` | MODIFY | +45 |
| `prototype-builder/src/__tests__/scorer.test.ts` | NEW | ~175 |
| `prototype-builder/src/__tests__/cli-poc.test.ts` | NEW | ~135 |
| `docs/specs/fx-builder-evolution/poc-cli.md` | NEW | ~75 |
| `docs/specs/fx-builder-evolution/poc-scorer.md` | NEW | ~80 |
| **Total** | | **~1,070** |
