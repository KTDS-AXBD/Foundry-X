---
code: FX-ANLS-094
title: "Sprint 94 Gap Analysis — 발굴 UX: 위저드 UI(F263) + 온보딩 투어(F265)"
version: "1.0"
status: Active
category: ANLS
created: 2026-03-31
updated: 2026-03-31
author: Claude (Autopilot)
system-version: "1.8.0"
sprint: 94
f-items: [F263, F265]
design-ref: "[[FX-DSGN-094]]"
---

# Sprint 94 Gap Analysis

## Match Rate: 95%

| Category | Items | Matched | Rate |
|----------|:-----:|:-------:|:----:|
| DB Schema | 8 | 8 | 100% |
| API Endpoints | 6 | 6 | 100% |
| API Service | 5 | 5 | 100% |
| Route Registration | 1 | 0.5 | 50% |
| Web Components | 20 | 20 | 100% |
| Page Structure | 2 | 1.5 | 75% |
| API Client | 4 | 4 | 100% |
| Test Coverage | 7 | 5 | 71% |
| File Mapping | 14 | 13.5 | 96% |
| **Overall** | **67** | **63.5** | **95%** |

## Differences

| # | 항목 | Design | 구현 | 영향 |
|---|------|--------|------|------|
| 1 | 라우트 등록 | biz-items.ts 하위 | app.ts 직접 등록 | Low — 프로젝트 패턴 일관성 |
| 2 | Tour 조건부 렌더 | 페이지 레벨 | 컴포넌트 내부 | None — 동작 동일 |
| 3 | 스키마 상수명 | STAGES | DISCOVERY_STAGES | None — 더 명확 |

## 테스트 결과

- API: 11/11 ✅
- Web Wizard: 5/5 ✅
- Web Tour: 3/3 ✅
- **합계: 19 new tests**
