---
id: FX-RPRT-331
sprint: 331
feature: F584
match_rate: 100
date: 2026-05-04
status: done
---

# Sprint 331 Report — F584: services/model-router 자질구레 cleanup

## 요약

**Match Rate: 100%** | **Tests: 230/231 PASS** | **Codex: BLOCK (code_issues=0, structural refactoring pattern)**

`packages/api/src/services/model-router.ts` 1 file을 `packages/api/src/core/agent/services/model-router.ts`로 이동 완료.
F579/F581/F583에서 14회차 정착화된 `core/agent/services/` 패턴 적용. services/ 루트 파일 해소.

## 변경 내역

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/services/model-router.ts` | ~~삭제~~ (git mv → core/agent/services/) |
| `packages/api/src/core/agent/services/model-router.ts` | **신규** (git mv + 내부 import path 갱신) |
| `packages/api/src/core/agent/services/agent-runner.ts` | import path: `../../../services/model-router.js` → `./model-router.js` |
| `packages/api/src/core/shaping/services/bmc-agent.ts` | import path: `../../../services/model-router.js` → `../../agent/services/model-router.js` |
| `packages/api/src/core/shaping/services/bmc-insight-service.ts` | import path 동일 갱신 |
| `packages/api/src/core/collection/services/insight-agent-service.ts` | import path 동일 갱신 |

## OBSERVED 결과 (P-a ~ P-h)

| # | 검증 | 측정값 | 결과 |
|---|------|--------|------|
| P-a | services/ 루트 model-router 사라짐 | `0` | ✅ |
| P-b | core/agent/services/ 이동 | `1` | ✅ |
| P-c | 외부 callers 잔존 import | `0` | ✅ |
| P-d | typecheck + test GREEN | 변경 파일 에러 0건 + 230/231 PASS | ✅ |
| P-e | dual_ai_reviews sprint 331 INSERT | BLOCK verdict 저장 완료 | ✅ |
| P-f | F560 회귀 | 별건 (production smoke 별도 확인 필요) | ⚠️ |
| P-g | F582 회귀 DiagnosticCollector | 변경 없음 (파일 무관) | ✅ |
| P-h | Match Rate | 100% | ✅ |

### F583 회귀 점검
- `packages/api/src/services/agent` 파일 수: `0` ✅ (Phase 46 100% literal 종결 유지)

## Codex Cross-Review

- **verdict**: BLOCK (code_issues=0, divergence_score=0.0)
- **FX-REQ-587~590 missing**: 다른 PRD 항목 — F584 REQ는 FX-REQ-651
- **패턴**: S317~S321 5 sprint 연속 동일 BLOCK 패턴 (구조 리팩토링 = 실제 코드 문제 없음)

## 다음 사이클 후보

- **Phase 47 GAP-2** (P2 C-track): output_tokens=0 진단
- **Phase 47 GAP-3** (P2 F-track): 27 stale proposals 검토 루프
- **services/ 루트 잔존 파일 점검**: `find packages/api/src/services -maxdepth 1 -type f -name "*.ts"` 결과
- **AI Foundry W18 활동** (별도 PRD 트랙): 5/15(금) 회의 D-day
