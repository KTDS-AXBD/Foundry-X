---
id: FX-DESIGN-337
sprint: 337
feature: F591
req: FX-REQ-658
status: approved
date: 2026-05-04
---

# Sprint 337 Design — F591: prd/prototype 5 files 도메인 분리 → core/offering/services/

## 목표

services/ 루트 23 files 중 prd/prototype 5 files를 `core/offering/services/`로 이동.
PRD/Prototype은 offering 도메인 본질 — 기존 bp-prd-generator/prd-interview-service와 sibling 동거.

## 아키텍처 결정

**옵션 A1 (채택)**: `core/offering/services/`로 이동 (관행 일관성, grandfathered 20건 의식적 인정)
- 이유: PRD/Prototype = offering 도메인 시멘틱. 기존 11 files(bp-prd-generator, prd-interview-service 등)와 자연 동거.
- 트레이드오프: MSA `no-cross-domain-import` 룰 위반 18→20건. lint script 스코프 한계(eslint-rules/만)로 catch 안됨. 별건 F-item 권고.

## §5 파일 매핑 (Worker 작업 목록)

### 이동 파일 (git mv 5)

| 소스 | 대상 | 비고 |
|------|------|------|
| `packages/api/src/services/prd-generator.ts` | `packages/api/src/core/offering/services/prd-generator.ts` | production caller: biz-items.ts:26 |
| `packages/api/src/services/prd-template.ts` | `packages/api/src/core/offering/services/prd-template.ts` | transitive (prd-generator 내부 의존) |
| `packages/api/src/services/prototype-generator.ts` | `packages/api/src/core/offering/services/prototype-generator.ts` | production caller: biz-items.ts:39 |
| `packages/api/src/services/prototype-styles.ts` | `packages/api/src/core/offering/services/prototype-styles.ts` | transitive (prototype-generator 내부 의존) |
| `packages/api/src/services/prototype-templates.ts` | `packages/api/src/core/offering/services/prototype-templates.ts` | transitive |

### callers 갱신 (5건)

| 파일 | 변경 |
|------|------|
| `packages/api/src/core/discovery/routes/biz-items.ts:26` | `"../../../services/prd-generator.js"` → `"../../offering/services/prd-generator.js"` |
| `packages/api/src/core/discovery/routes/biz-items.ts:39` | `"../../../services/prototype-generator.js"` → `"../../offering/services/prototype-generator.js"` |
| `packages/api/src/__tests__/prototype-generator.test.ts` | `"../services/prototype-generator.js"` → `"../core/offering/services/prototype-generator.js"` |
| `packages/api/src/__tests__/prototype-templates.test.ts` | `"../services/prototype-templates.js"` → `"../core/offering/services/prototype-templates.js"` + `"../services/prototype-styles.js"` → `"../core/offering/services/prototype-styles.js"` |
| `packages/api/src/__tests__/prd-generator.test.ts` (있으면) | `"../services/prd-generator.js"` → `"../core/offering/services/prd-generator.js"` |

### dist orphan cleanup (S314 패턴 22회차)

```bash
# autopilot이 인식 못 할 경우 수동 처리 (P-j numerical 강제)
git rm -r packages/api/dist/services/prd-generator.{js,js.map,d.ts,d.ts.map} 2>/dev/null || true
git rm -r packages/api/dist/services/prd-template.{js,js.map,d.ts,d.ts.map} 2>/dev/null || true
git rm -r packages/api/dist/services/prototype-generator.{js,js.map,d.ts,d.ts.map} 2>/dev/null || true
git rm -r packages/api/dist/services/prototype-styles.{js,js.map,d.ts,d.ts.map} 2>/dev/null || true
git rm -r packages/api/dist/services/prototype-templates.{js,js.map,d.ts,d.ts.map} 2>/dev/null || true
```

## 테스트 계약 (TDD — 면제 대상)

services/ 이동은 TDD 면제 (shared 타입/인프라 이동, 기존 테스트 재활용).
- `__tests__/prototype-generator.test.ts` GREEN 유지 (path 갱신만)
- `__tests__/prototype-templates.test.ts` GREEN 유지 (path 갱신만)
- `turbo test` 전체 GREEN 유지

## OBSERVED P-a~P-k (11항)

| ID | 기대값 |
|----|--------|
| P-a | services/ 루트 prd*/prototype* = **0** |
| P-b | core/offering/services/ prd+prototype = **5** |
| P-c | services/ 루트 .ts = **18** (23-5) |
| P-d | OLD import 잔존 = **0** |
| P-e | typecheck + tests GREEN |
| P-f | dual_ai_reviews sprint 337 INSERT ≥ 1건 (누적 ≥ 26) |
| P-g | C103 fallback hook 자동 trigger (`save-dual-review-337.log`) |
| P-h-1~10 | F560~F590 회귀 0건 10항 |
| P-i | Match ≥ 90% |
| P-j | dist orphan prd-*/prototype-* = **0** |
| P-k | MSA cross-domain 누적 = **20건** (의식적 인정) |
