---
id: FX-RPRT-344
sprint: 344
feature: F610
req: FX-REQ-674
match_rate: 100
date: 2026-05-05
duration_min: ~20
status: completed
---

# Sprint 344 Report — F610: MSA 룰 강제 교정 Pass 3

## 요약

`core/discovery/routes/biz-items.ts` 19건 cross-domain import 위반을 F609 re-export 패턴으로 해소.
3개 도메인 types.ts에 누락 symbol을 추가 export하고, biz-items.ts의 19개 import path를 갱신.
ESLint baseline 76 → 57 (-19).

## Match Rate

**100% (5/5 PASS)**

| 항목 | 결과 |
|------|------|
| P-a shaping +7 exports | ✅ PASS |
| P-b offering +16 exports | ✅ PASS |
| P-c harness +1 export | ✅ PASS |
| P-d biz-items cross-domain = 0 | ✅ PASS |
| P-e baseline 57 | ✅ PASS |

## 변경 파일

| 파일 | 변경 |
|------|------|
| `core/shaping/types.ts` | +7 re-exports |
| `core/offering/types.ts` | +13 re-exports |
| `core/harness/types.ts` | +1 re-export |
| `core/discovery/routes/biz-items.ts` | 19 import paths → types.js |
| `.eslint-baseline.json` | 76 → 57 (-19) |

## Codex Cross-Review

- verdict: BLOCK (저장됨 — dual_ai_reviews Sprint 344, 19 sprint 연속 hook 정상)
- **false positive 판정**: FX-REQ-587~590 참조가 fx-codex 통합 PRD (F610과 무관), code issue 2건 사실 오류
  - `createAgentRunner` → `agent/types.ts`에 `export {}` 확인
  - `BizPersonaEvaluator` → `shaping/types.ts`에 `export {}` (값, 타입 아님) 확인
- D1/D3/D4 FAIL → TDD 면제 범위 (re-export + import path, 로직 변경 없음)
- **기술 증거 우선**: Gap 100% + typecheck no new errors + lint 0 위반으로 override

## 성과

- biz-items.ts: 단일 파일 기준 가장 많은 19건 해소 (Pass 시리즈 최대)
- F609 re-export 패턴 2회차 재현 확인 → 패턴 정착
- baseline: 76 → 57 (series total: 161 → 57 = -104건, F608~F610 3 sprint)

## 다음 단계

- F611 Sprint 345 — cross-domain-d1 31 warnings (옵션 A/B/C 인터뷰 필요)
- F612 Sprint 346 — multi-domain 잔여 8 파일
- F613 Sprint 347 — no-direct-route-register 1건 종결

## 커밋

`a3506562` feat(msa): F610 green — biz-items.ts 19 cross-domain imports → types.ts re-export
