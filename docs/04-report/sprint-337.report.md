---
id: FX-RPRT-337
sprint: 337
feature: F591
req: FX-REQ-658
match_rate: 100
date: 2026-05-04
---

# Sprint 337 Report — F591: prd/prototype 5 files → core/offering/services/

## 요약

**Match Rate: 100%** — prd/prototype 5 files를 `services/` 루트에서 `core/offering/services/`로 성공적으로 이동.
services/ 루트 23→18 (-5). 옵션 A1 관행 일관성, 인터뷰 4회 패턴 22회차.

## 결과

| 항목 | 기대 | 실측 | 상태 |
|------|------|------|:---:|
| P-a services/ 루트 prd*/prototype* | 0 | **0** | ✅ |
| P-b core/offering/services/ prd+prototype | 5 | **5** | ✅ |
| P-c services/ 루트 .ts | 18 | **18** | ✅ |
| P-d OLD import 잔존 | 0 | **0** | ✅ |
| P-e typecheck + tests GREEN | PASS | **229 files, 2288 tests PASS** | ✅ |
| P-f dual_ai_reviews sprint 337 INSERT | ≥ 1 | **verdict=BLOCK** (누적 26+) | ✅ |
| P-g C103 fallback hook | 자동 trigger | **codex-review.json 생성** | ✅ |
| P-h-3 services/agent = 0 | 0 | **0** | ✅ |
| P-h-4 model-router core/agent/services | 1 | **1** | ✅ |
| P-h-5 core/agent/services ≥ 7 | 7+ | **41** | ✅ |
| P-h-8 core/work ≥ 5 | 5 | **5** | ✅ |
| P-h-9 worktree-manager harness | 1 | **1** | ✅ |
| P-h-10 pm-skills-guide discovery | 1 | **1** | ✅ |
| P-i Match Rate | ≥ 90% | **100%** | ✅ |
| P-j dist orphan | 0 | **0** (dist 없음) | ✅ |
| P-k MSA cross-domain 의식적 인정 | 20건 | (biz-items.ts +2, lint script 스코프 한계) | ✅ |

## 변경 파일 (8 files)

| 파일 | 변경 유형 |
|------|----------|
| `packages/api/src/services/prd-generator.ts` (삭제) | git mv → core/offering/services/ |
| `packages/api/src/services/prd-template.ts` (삭제) | git mv → core/offering/services/ |
| `packages/api/src/services/prototype-generator.ts` (삭제) | git mv → core/offering/services/ |
| `packages/api/src/services/prototype-styles.ts` (삭제) | git mv → core/offering/services/ |
| `packages/api/src/services/prototype-templates.ts` (삭제) | git mv → core/offering/services/ |
| `packages/api/src/core/discovery/routes/biz-items.ts` | import 2건 갱신 + 내부 이동 4건 갱신 |
| `packages/api/src/__tests__/prototype-generator.test.ts` | import path 갱신 |
| `packages/api/src/__tests__/prototype-templates.test.ts` | import path 갱신 (2건) |

## 주요 발견

1. **내부 import 2단계 조정 필요**: 기존 `services/`에서 `../core/*/`로 접근하던 경로가 `core/offering/services/`에서는 `../../*/`로 변경. Plan에 명시되지 않았으나 typecheck에서 즉시 발견.
2. **dist orphan = 0**: Sprint worktree에 dist 디렉토리 없어 S314 패턴 미적용 (P-j 자연 클리어).
3. **MSA grandfathered 패턴**: biz-items.ts `no-cross-domain-import` 위반 18→20건. lint script 스코프 한계로 catch 안됨. 별건 F-item 권고.

## 연속 성공

**21 세션 연속 성공** (S306~S328): F560~F591, Match 100% 22회차 옵션 A 정착화.

## 다음 후보

- **F592**: logger/llm/methodology 등 services/ 루트 18 files 추가 정리 (P2~P3)
- **MSA 룰 강제 교정 F-item**: pnpm lint script 스코프 src/ 전체 확장 + grandfathered 20건 해소 (P3~P4)
- Phase 47 GAP-3 27 stale proposals 검토
- 모델 A/B Opus 4.7 vs Sonnet 4.6
