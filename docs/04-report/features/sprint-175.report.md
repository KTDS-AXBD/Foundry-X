# Sprint 175 Completion Report — M0: 검증 PoC (F384~F385)

> **Date**: 2026-04-06
> **Phase**: 19 (Builder Evolution)
> **Sprint**: 175
> **Match Rate**: 100% (15/15 PASS)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Feature** | F384 CLI --bare PoC + F385 5차원 스코어러 재현성 PoC |
| **Sprint** | 175 |
| **Duration** | 1 session |
| **Match Rate** | 100% |

| Perspective | Content |
|-------------|---------|
| **Problem** | Builder가 빌드 성공/실패 이진 판정만 하여 "빌드는 되지만 조잡한" 프로토타입이 통과 |
| **Solution** | 5차원 품질 스코어러 PoC + CLI subprocess 안정성 검증으로 M1~M4 기술 리스크 사전 해소 |
| **Function/UX Effect** | 프로토타입 품질을 0~100점 다차원 평가 가능. 실행 스크립트로 즉시 PoC 측정 가능 |
| **Core Value** | Phase 19 Go/No-Go 판정을 위한 데이터 기반 결정 인프라 마련 |

---

## 1. Deliverables

### F384: CLI `--bare` Rate Limit / 안정성 PoC

| 산출물 | 설명 |
|--------|------|
| `cli-poc.ts` | CLI subprocess 통합 테스트 러너 (runCliCall, measureRateLimit, runCliPoc) |
| `formatPocReport()` | PoC 결과를 마크다운으로 자동 변환 |
| `poc-cli.md` | 결과 문서 템플릿 (실행 후 자동 갱신) |
| `cli-poc.test.ts` | 6 tests (checkCliAvailability, runCliCall, formatPocReport) |

### F385: 5차원 평가 재현성 PoC

| 산출물 | 설명 |
|--------|------|
| `scorer.ts` | 5차원 스코어러 — buildScore, uiScore, functionalScore, prdScore, codeScore |
| `evaluateQuality()` | 5차원 통합 평가 (병렬 실행) |
| `generateTargetFeedback()` | 약점 차원 식별 + 타겟 피드백 생성 |
| `measureReproducibility()` | N회 반복 평가 재현성 측정 |
| `types.ts` 확장 | QualityScore, DimensionScore, ScoreDimension, TargetFeedback, GenerationMode |
| `poc-scorer.md` | 결과 문서 템플릿 (실행 후 자동 갱신) |
| `scorer.test.ts` | 11 tests (가중치, 차원별 평가, 통합평가, 피드백 생성) |

---

## 2. Key Decisions

| 결정 | 선택 | 근거 |
|------|------|------|
| prdScore PoC 모드 | 키워드 매칭 | LLM 호출 없이 비용 $0으로 빠른 검증. M1에서 LLM 통합 |
| uiScore 구현 방식 | 정규식 기반 | cheerio 의존성 없이 가벼운 분석. P1에서 Vision API 확장 가능 |
| CLI 래퍼 방식 | execFile + Promise 직접 래핑 | promisify의 custom symbol 이슈 방지, 테스트 mock 호환성 |
| 재현성 측정 | skipBuild=true 모드 | 빌드 자체는 결정론적이므로 정적 분석 재현성에 집중 |

---

## 3. Test Summary

| Test File | Tests | Status |
|-----------|:-----:|:------:|
| scorer.test.ts | 11 | All PASS |
| cli-poc.test.ts | 6 | All PASS |
| **New Total** | **17** | **All PASS** |

---

## 4. Next Steps (M1~M4)

| Sprint | Milestone | 내용 | 의존성 |
|--------|-----------|------|--------|
| 176 | M1 | 스코어러 본구현 + D1 + API | F384/F385 PoC Go |
| 177 | M2+M3 | CLI 듀얼모드 + Enhanced O-G-D | M1 완료 |
| 178 | M4 | 대시보드 + 피드백 루프 | M1 완료 |

---

## 5. PoC 실행 안내

실제 PoC 측정은 CLI가 설치된 환경에서 아래 명령으로 실행해요:

```bash
# F384: CLI PoC
cd prototype-builder
npx tsx -e "import { runCliPoc, formatPocReport } from './src/cli-poc.js'; ..."

# F385: Scorer PoC
npx tsx -e "import { evaluateQuality, measureReproducibility } from './src/scorer.js'; ..."
```

상세 실행 방법: `docs/specs/fx-builder-evolution/poc-cli.md`, `poc-scorer.md` 참조.
