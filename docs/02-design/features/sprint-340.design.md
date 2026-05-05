---
id: FX-DESIGN-340
sprint: 340
feature: F595
req: FX-REQ-662
status: approved
date: 2026-05-05
---

# Sprint 340 Design — F595: sr 도메인 신설 + closure 5 files mv

## 목표

`packages/api/src/` 루트의 sr-* 묶음(routes/sr.ts + schemas/sr.ts + services 3)을 신규 `core/sr/` 도메인으로 git mv. API path 완전 동일 유지. F593 entity 패턴 재현 (closure 통합).

TDD: **면제** — 신규 로직 0건, 순수 git mv + import path 갱신.

## 파일 매핑 (§5)

### git mv 5 files

| FROM | TO |
|------|----|
| `src/routes/sr.ts` | `src/core/sr/routes/sr.ts` |
| `src/services/sr-classifier.ts` | `src/core/sr/services/sr-classifier.ts` |
| `src/services/hybrid-sr-classifier.ts` | `src/core/sr/services/hybrid-sr-classifier.ts` |
| `src/services/sr-workflow-mapper.ts` | `src/core/sr/services/sr-workflow-mapper.ts` |
| `src/schemas/sr.ts` | `src/core/sr/schemas/sr.ts` |

### import 갱신 — cross-domain depth (4건)

| 파일 | FROM | TO |
|------|------|----|
| `core/sr/routes/sr.ts` | `../env.js` | `../../../env.js` |
| `core/sr/routes/sr.ts` | `../middleware/tenant.js` | `../../../middleware/tenant.js` |
| `core/sr/routes/sr.ts` | `../services/llm.js` | `../../../services/llm.js` |
| `core/sr/services/hybrid-sr-classifier.ts` | `./llm.js` | `../../../services/llm.js` |

sibling imports (schemas/sr, services/sr-*) — NEW path에서 자동 유지, 변경 없음.

### import 갱신 — 외부 callers (8건)

| 파일 | FROM | TO |
|------|------|----|
| `app.ts:41` | `./routes/sr.js` | `./core/sr/routes/sr.js` |
| `__tests__/routes/sr.test.ts:3` | `../../services/sr-classifier.js` | `../../core/sr/services/sr-classifier.js` |
| `__tests__/routes/sr.test.ts:4` | `../../services/sr-workflow-mapper.js` | `../../core/sr/services/sr-workflow-mapper.js` |
| `__tests__/routes/sr.test.ts:5` | `../../schemas/sr.js` | `../../core/sr/schemas/sr.js` |
| `__tests__/routes/sr.test.ts:47` (dynamic) | `../../schemas/sr.js` | `../../core/sr/schemas/sr.js` |
| `__tests__/sr-classifier.test.ts:2` | `../services/sr-classifier.js` | `../core/sr/services/sr-classifier.js` |
| `__tests__/sr-workflow-mapper.test.ts:2` | `../services/sr-workflow-mapper.js` | `../core/sr/services/sr-workflow-mapper.js` |
| `__tests__/sr-workflow-mapper.test.ts:3` | `../schemas/sr.js` | `../core/sr/schemas/sr.js` |
| `__tests__/hybrid-sr-classifier.test.ts:2` | `../services/hybrid-sr-classifier.js` | `../core/sr/services/hybrid-sr-classifier.js` |

### dist orphan cleanup (~20 files)

```
packages/api/dist/routes/sr.{js,js.map,d.ts,d.ts.map}
packages/api/dist/services/sr-classifier.{js,js.map,d.ts,d.ts.map}
packages/api/dist/services/hybrid-sr-classifier.{js,js.map,d.ts,d.ts.map}
packages/api/dist/services/sr-workflow-mapper.{js,js.map,d.ts,d.ts.map}
packages/api/dist/schemas/sr.{js,js.map,d.ts,d.ts.map}
```

## MSA 인식 (cross-domain grandfathered +2)

- `core/sr/routes/sr.ts` → `services/llm.js` (cross-domain, 의식적 인정)
- `core/sr/services/hybrid-sr-classifier.ts` → `services/llm.js` (cross-domain, 의식적 인정)

P-k 예상: 19→21 (acceptable variant — autopilot 측정 회피 시 19 보존 가능)

## Phase Exit (P-a~P-l)

| # | PASS 기준 |
|---|----------|
| P-a | services/+routes/+schemas/ 루트 sr* = 0+0+0 |
| P-b | core/sr/ files = 5 |
| P-c | services/ 루트 .ts = 12 (15-3) |
| P-d | 외부 callers OLD import = 0 |
| P-e | typecheck + tests GREEN |
| P-f | dual_ai_reviews sprint 340 INSERT ≥ 1 (누적 ≥ 30) |
| P-g | C103 fallback hook trigger |
| P-h | F583~F593 회귀 0 (10항) |
| P-i | Match ≥ 90% |
| P-j | dist orphan = 0 |
| P-k | MSA cross-domain 19→21 (acceptable variant) |
| P-l | API /api/sr 401 (auth 정상) |
