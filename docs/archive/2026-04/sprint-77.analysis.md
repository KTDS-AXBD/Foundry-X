---
code: FX-ANLS-077
title: "Sprint 77 — F224~F228 Gap Analysis"
version: "1.0"
status: Active
category: ANLS
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-DSGN-077]] Sprint 77 Design"
  - "[[FX-PLAN-077]] Sprint 77 Plan"
---

# Sprint 77 Gap Analysis — F224~F228 Ecosystem Reference

## Executive Summary

| 항목 | 값 |
|------|-----|
| **Overall Match Rate** | **100%** (45/45) |
| **Endpoints** | 36/36 ✅ |
| **Service Methods** | 37/36 (1 추가) ✅ |
| **Zod Schemas** | 23/22 (1 추가) ✅ |
| **D1 Migrations** | 6/6 tables ✅ |
| **Tests** | 104 PASS (서비스 50 + 라우트 54) |
| **Typecheck** | ✅ PASS |

## Feature별 분석

### F224: Context Passthrough — 100%

| 항목 | Design | Impl | 상태 |
|------|--------|------|------|
| Endpoints | 6 | 6 | ✅ |
| Service Methods | 6 | 6 | ✅ |
| Schemas | 3 | 3 | ✅ |
| D1 | N/A (memory) | N/A | ✅ |
| Tests | — | 21 | ✅ |

### F225: Command Registry — 100%

| 항목 | Design | Impl | 상태 |
|------|--------|------|------|
| Endpoints | 7 | 7 | ✅ |
| Service Methods | 6 | 7 (+listNamespaces) | ✅ |
| Schemas | 4 | 4 | ✅ |
| D1 | N/A (memory) | N/A | ✅ |
| Tests | — | 24 | ✅ |

### F226: Party Session — 100%

| 항목 | Design | Impl | 상태 |
|------|--------|------|------|
| Endpoints | 8 | 8 | ✅ |
| Service Methods | 8 | 8 | ✅ |
| Schemas | 5 | 6 (+PartyConclude) | ✅ |
| D1 Tables | 3 | 3 | ✅ |
| D1 Indexes | 2 | 2 | ✅ |
| Tests | — | 19 | ✅ |

### F227: Spec Library — 100%

| 항목 | Design | Impl | 상태 |
|------|--------|------|------|
| Endpoints | 7 | 7 | ✅ |
| Service Methods | 7 | 7 | ✅ |
| Schemas | 4 | 4 | ✅ |
| D1 Tables | 1 | 1 | ✅ |
| D1 Indexes | 2 | 2 | ✅ |
| Tests | — | 20 | ✅ |

### F228: Expansion Packs — 100%

| 항목 | Design | Impl | 상태 |
|------|--------|------|------|
| Endpoints | 8 | 8 | ✅ |
| Service Methods | 8 | 8 | ✅ |
| Schemas | 6 | 6 | ✅ |
| D1 Tables | 2 | 2 | ✅ |
| D1 Indexes | 2 | 2 | ✅ |
| Tests | — | 20 | ✅ |

## 검증 결과

- **Typecheck**: `turbo typecheck` PASS (0 errors in new files)
- **Tests**: `vitest run` — 1965/1965 PASS (기존 1861 + 신규 104)
- **Route Registration**: `app.ts` Line 251~256 — 5개 라우트 모두 auth+tenant 미들웨어 하위에 정상 등록
- **D1 Migrations**: 0063, 0064, 0065 SQL 파일 생성 완료 (remote 미적용)

## 결론

Match Rate **100%** — iterate 불필요. Report 단계로 진행.
