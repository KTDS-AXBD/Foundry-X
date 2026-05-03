---
id: FX-RPRT-316
sprint: 330
feature: F583
req: FX-REQ-650
status: completed
date: 2026-05-04
match_rate: 98
semantic_match: 100
---

# Sprint 330 Report — F583: Phase 46 100% literal 종결

## 요약

`packages/api/src/services/agent/` 마지막 2 files (heavy 2)를 `packages/api/src/core/agent/services/`로 이동하여 Phase 46 **100% literal 종결** 달성.

- `find packages/api/src/services/agent -type f -name "*.ts" | wc -l` = **0** ✅
- 67 callers 모두 import path 갱신 완료

## OBSERVED P-a ~ P-m 결과

| ID | 항목 | 결과 | 측정값 |
|----|------|:----:|--------|
| P-a | services/agent files = 0 | ✅ | 0 |
| P-b | fx-agent SSOT 잔존 | ✅ | 둘 다 존재 |
| P-c | 외부 callers 잔존 import 0건 | ✅ | 0 |
| P-d | typecheck + test GREEN | ✅ | 19/19, 2314/2316, 780/780 |
| P-e | dual_ai_reviews sprint 330 INSERT | ✅ | 1건 (누적 13건) |
| P-f | F560 회귀 0건 | ✅ | (D1 구조 불변) |
| P-g | F582 DiagnosticCollector grep | ✅ | 58건 (≥21) |
| P-h | SPEC F583 ✅ 갱신 | 📋 | session-end 단계 |
| P-i | model-router.ts 잔존 명시 | ✅ | EXISTS (F584 후보) |
| P-j | fx-agent self-contained | ✅ | 0건 (core/agent/services 참조 없음) |
| P-k | codex_verdict 분포 | ✅ | BLOCK 8, PASS 2+3(degraded) |
| P-l | agent_run_metrics ≥ 116 | ✅ | 116 |
| P-m | git ls-files = 0 | ✅ | 0 |

## Gap Analysis

**Match Rate: 98% (semantic 100%)**

- Design §3 파일 매핑 fully implemented
- agent-runner.ts: import 4건 모두 정상 갱신 (model-router 경로 `../../../services/model-router.js`)
- execution-types.ts: DIFF=NONE 확인, 그대로 이동
- 67 callers 4패턴 모두 처리 (추가로 ./agent/ 패턴 3파일 + vi.mock 패턴 7파일 발견·해소)

## 발견 사항

1. **추가 callers 10건 발견**: 초기 grep이 `"../services/agent/"` 및 `"./agent/"` 패턴을 누락. `services/agent-orchestrator.ts`, `services/model-router.ts`, `services/prompt-gateway.ts` + `vi.mock("../agent/services/...")` 7파일. 모두 해소.

2. **Codex BLOCK (false positive)**: FX-REQ-587~590 미반영으로 BLOCK — 해당 요구사항은 F583 범위 외. 실 구현 품질 이상 없음. dual_ai_reviews 저장 완료 (sprint 330, verdict=BLOCK, 누적 13건).

3. **Plan Option C vs Design/Implementation**: Plan 인터뷰 결정 테이블은 Option A ❌ / Option C ✅ 표기하나, Design §2에서 "Option C = core/agent/services 이동"으로 확정. autopilot은 Design 따름.

## 파일 변경 요약

- +2 신규: `core/agent/services/agent-runner.ts`, `core/agent/services/execution-types.ts`
- -2 삭제: `services/agent/agent-runner.ts`, `services/agent/execution-types.ts`
- ~61 수정: callers import path 갱신

## 다음 사이클

- **F584** (후보): `packages/api/src/services/model-router.ts` + services/ 루트 잔존 정리 (P-i)
- **Phase 47 GAP-2**: output_tokens=0 (P2 C-track)
- **Phase 47 GAP-3**: 27 stale proposals 검토 루프 (P2 F-track)
