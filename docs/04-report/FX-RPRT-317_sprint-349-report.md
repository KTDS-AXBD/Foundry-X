---
code: FX-RPRT-317
title: Sprint 349 — F614 shard-doc closure Report
version: 1.0
status: Done
category: REPORT
created: 2026-05-06
sprint: 349
f_item: F614
req: FX-REQ-679
match_rate: 100
---

# Sprint 349 — F614 shard-doc closure Report

## Summary

| 항목 | 값 |
|------|-----|
| Sprint | 349 |
| F-item | F614 (FX-REQ-679, P3) |
| Match Rate | **100%** |
| 예상 시간 | ~5분 |
| Phase Exit | P-a/P-b/P-c/P-d/P-j 5항 GREEN |
| 패턴 | A1 옵션 19회차 정착화 |

## 구현 결과

### 변경 파일 (6 files changed, 4 insertions(+), 4 deletions(-))

| 파일 | 변경 유형 |
|------|----------|
| `routes/shard-doc.ts` → `core/docs/routes/shard-doc.ts` | git mv + `../env.js` → `../../../env.js` depth 갱신 |
| `services/shard-doc.ts` → `core/docs/services/shard-doc.ts` | git mv (변경 없음, zero-dep) |
| `schemas/shard-doc.ts` → `core/docs/schemas/shard-doc.ts` | git mv (변경 없음, zod-only) |
| `core/docs/types.ts` | 신규 — F609 re-export 패턴 |
| `app.ts` L41 | import path 갱신 |
| `__tests__/shard-doc.test.ts` L4 | import path 갱신 |
| `__tests__/shard-doc-route.test.ts` L3 | import path 갱신 |

### Phase Exit 체크리스트

| ID | 항목 | 결과 |
|----|------|------|
| P-a | routes/services/schemas root shard-doc 제거 | ✅ 0+0+0 |
| P-b | core/docs/ ≥5 files | ✅ 5 files |
| P-c | services/ root 7→6 | ✅ 6 |
| P-d | old import paths 0건 | ✅ 0 |
| P-j | dist orphan 0 | ✅ 0 |
| P-i | Match ≥ 90% | ✅ 100% |

## 재현된 패턴

- **A1 옵션 19회차**: F593(entity) / F595(sr) / F594(spec) / F596(infra) / F613(docs index) 패턴 동일 재현
- **F609 re-export 패턴**: `core/docs/types.ts` 2-line (named + wildcard)
- **Sibling import 자동 보존**: `../schemas/shard-doc.js` + `../services/shard-doc.js` depth 변경 없이 git mv 후 정상 동작
- **dist orphan cleanup**: S314 패턴 6 files 제거

## 다음 사이클 후보 (Plan §7)

- requirements closure (routes+schemas 2 files) → core/req/ 신설
- llm.ts 도메인 결정 (services/ 잔존 핵심)
- pii-masker → core/security/ 또는 core/infra/
- pr-pipeline + merge-queue + conflict-detector → core/spec/ 합류
- Phase 47 GAP-3 27 stale proposals
- AI Foundry W19 BeSir 5/15 D-9
