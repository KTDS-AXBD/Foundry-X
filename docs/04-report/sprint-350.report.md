---
code: FX-RPRT-350
title: Sprint 350 Report — F627 llm + service-proxy → core/infra/
version: 1.0
status: Done
category: REPORT
created: 2026-05-06
sprint: 350
f_item: F627
req: FX-REQ-692
match_rate: 100
---

# Sprint 350 Report — F627

## 결과 요약

| 항목 | 값 |
|------|-----|
| Match Rate | **100%** |
| Test | 38 tests GREEN (4 files) |
| Typecheck | PASS (pre-existing harness-kit 오류 제외) |
| Codex | BLOCK (false positive — wrong PRD refs FX-REQ-587~590, code_issues=[], divergence_score=0.0) |
| 소요 시간 | ~6분 |

## 구현 내역

### 이동 (git mv)
- `services/llm.ts` → `core/infra/llm.ts` (113L)
- `services/service-proxy.ts` → `core/infra/service-proxy.ts` (39L)

### 수정
- `core/infra/types.ts`: `LLMService, buildUserPrompt, NL_TO_SPEC_SYSTEM_PROMPT, ServiceProxy` re-export 추가 (4 symbols, 2 lines)
- 13개 production caller import path 갱신
- 4개 test caller path 갱신 (vi.mock 포함)

### Edge case (Plan 미기재 → 구현 중 발견)
1. `spec.ts`가 `buildUserPrompt, NL_TO_SPEC_SYSTEM_PROMPT`도 import → types.ts re-export 확장 필요
2. `service-proxy.ts` `../env.js` → `../../env.js` depth fix (이동 후 상대경로 보정)
3. `services/conflict-detector.ts`의 숨겨진 `./llm.js` 직접 참조 → `../core/infra/llm.js`

## Phase Exit 체크리스트

| ID | 항목 | 결과 |
|----|------|------|
| P-a | services/ llm + service-proxy = 0 | ✅ 0 |
| P-b | core/infra/ *.ts = 6 | ✅ 6 |
| P-c | services/ 루트 *.ts = 4 | ✅ 4 |
| P-d | OLD import path = 0 | ✅ 0 |
| P-e | typecheck + tests GREEN | ✅ |

## 다음 사이클 후보

- routes/proxy.ts → core/infra/routes/ closure (ServiceProxy 사용, 68L)
- conflict-detector → core/spec/services/ (245L + 6 callers)
- services/ 잔존 4 files (merge-queue, pr-pipeline, pii-masker, conflict-detector)
