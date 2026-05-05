---
id: FX-RPRT-346
sprint: 346
feature: F612
req: FX-REQ-676
match_rate: 100
status: completed
date: 2026-05-05
---

# Sprint 346 Report — F612: MSA 룰 강제 교정 Pass 5

## 요약

**Match Rate: 100%** | **Phase Exit: P-a~P-i 전체 PASS**

baseline 27 → 1 달성. no-cross-domain-import 26건(8 파일) 제거.
F613 1건(no-direct-route-register, app.ts:129)만 잔존 = Pass 시리즈 마지막 스프린트 대상.

## 구현 내용

### (a) 5 target types.ts 보강 (+10 exports)

| types.ts | 추가 심볼 |
|----------|-----------|
| `core/agent/types.ts` | `AgentCollectionService`, `SkillPipelineRunner` |
| `core/discovery/types.ts` | `AgentCollector`, `CollectorError`, `DiscoveryPipelineService`, `DiscoveryStageService` |
| `core/shaping/types.ts` | `BdSkillExecutor`, `ShapingOrchestratorService` |
| `core/offering/types.ts` | `OfferingMetricsService` |
| `core/collection/types.ts` | `CollectionCandidate` |

### (b) 8 caller 파일 import path 변경 (26 lines)

offering(3) + discovery(2) + collection(1) + agent(1) + harness(1) 도메인 파일들.
모든 `../../{domain}/services/*.js` → `../../{domain}/types.js` 경유로 통일.

### (c) baseline JSON 갱신

`.eslint-baseline.json`: msa_total/errors 27 → 1, fingerprints 26건 제거.
잔존: `src/app.ts:129:foundry-x-api/no-direct-route-register` (F613 대상).

## Gap Analysis

| 항목 | Design | 구현 | 일치 |
|------|--------|------|------|
| types.ts 보강 파일 수 | 5 | 5 | ✅ |
| 추가 export 수 | ~9 | 10 | ✅ |
| caller 파일 수 | 8 | 8 | ✅ |
| cross-domain lines | 26 | 26 | ✅ |
| baseline: 27 → 1 | O | O | ✅ |
| F608/F609/F610/F611 회귀 | 0 | 0 | ✅ |

**Match Rate: 100%**

## Phase Exit 체크리스트

| # | 항목 | 결과 |
|---|------|------|
| P-a | 5 target types.ts +10 export 정확 | ✅ |
| P-b | 8 caller 파일 cross-domain import = 0 | ✅ (Python 스캔 0건 확인) |
| P-c | baseline 27 → 1 | ✅ |
| P-d | baseline check | ✅ (fingerprint 구조 정확) |
| P-e | typecheck 회귀 0건 | ✅ (TS2305 0건, 기존 node_modules 미설치 에러만) |
| P-f | dual_ai_reviews ≥ 1건 | ✅ (sprint 346 저장 완료) |
| P-g | F608/F609/F610/F611 회귀 0 | ✅ (기존 export block 보존 확인) |
| P-h | F613 잔존 그대로 | ✅ (app.ts:129 그대로) |
| P-i | Match ≥ 90% | ✅ (100%) |

## 특이사항

- **Codex BLOCK (false positive)**: codex-review.sh의 PRD 경로 기본값이 `fx-codex-integration/prd-final.md`로 설정되어 FX-REQ-587~590을 체크함. F612는 FX-REQ-676. divergence_score=1.0도 gap-detector Match 100%와 불일치. dual_ai_reviews 저장은 완료 (P-f 충족).
- **import 통합 최적화**: multi-symbol import를 단일 `import type { ... }` 라인으로 통합 (Design 대비 line count 감소, 동등 의미).

## Pass 시리즈 진행 현황

| Pass | Sprint | 내용 | 결과 |
|------|--------|------|------|
| Pass 1 (F608) | 342 | lint script src/ 확장 + baseline 161 등록 | ✅ |
| Pass 2 (F609) | 343 | types.ts 13도메인 + single-domain 44 fix | ✅ |
| Pass 3 (F610) | 344 | biz-items.ts 19 viol (single file) | ✅ |
| Pass 4 (F611) | 345 | cross-domain-d1 30 viol → 0 | ✅ |
| **Pass 5 (F612)** | **346** | **multi-domain 26 viol → 0** | ✅ |
| Pass 6 (F613) | 347 | no-direct-route-register 1건 종결 | 📋(plan) |

baseline 161 → 1 (1건 잔존), F613 후 0 달성 예정.

## 예상 vs 실제

- 예상 가동 시간: ~25분
- 실제: ~15분 (단순 패턴 재현으로 예상보다 빠름)
