---
code: FX-ANLS-S161
title: "Sprint 161 Gap Analysis — 데이터 진단 + 패턴 감지 + Rule 생성"
version: 1.0
status: Active
category: ANLS
created: 2026-04-06
updated: 2026-04-06
author: Claude (gap-detector)
references: "[[FX-DSGN-S161]], [[FX-SPEC-001]]"
---

# Sprint 161 Gap Analysis Report

## 1. Overview

- **Design**: `docs/02-design/features/sprint-161.design.md`
- **Implementation**: 14 files across shared/api packages
- **Verification**: typecheck 0 errors, 18 tests passed

## 2. Section-by-Section Results

| Section | Items | PASS | FAIL | Score |
|---------|:-----:|:----:|:----:|:-----:|
| §2 D1 Schema | 6 | 6 | 0 | 100% |
| §3 Shared Types | 7 | 7 | 0 | 100% |
| §4 Service Layer | 14 | 14 | 0 | 100% |
| §5 Zod Schema | 8 | 8 | 0 | 100% |
| §6 Routes | 6 | 6 | 0 | 100% |
| §7 Tests | 15 | 15 | 0 | 100% |
| §8 File Mapping | 14 | 14 | 0 | 100% |
| §9 Impl Order | 1 | 1 | 0 | 100% |
| **Total** | **71** | **71** | **0** | **100%** |

## 3. Enhancements (Design X, Implementation O)

| # | Item | Location | Impact |
|---|------|----------|--------|
| 1 | generate patternIds body | routes/guard-rail.ts | Positive |
| 2 | proposals pagination params | routes/guard-rail.ts | Positive |
| 3 | API key 500 guard | routes/guard-rail.ts | Positive |
| 4 | approved → resolved transition | routes/guard-rail.ts | Positive |
| 5 | Extra test coverage (+3) | __tests__/*.test.ts | Positive |

## 4. Changed Features

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| UPSERT strategy | INSERT OR REPLACE | SELECT→UPDATE/INSERT | None (functionally equivalent, safer for status preservation) |

## 5. Summary

```
Total Check Items: 71
PASS: 71 (100%)
FAIL: 0 (0%)
Enhancements: +5 (all additive)
Extra Tests: +3 (18 total, 18 pass)

Design-Implementation Match Rate: 100%
```

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Initial gap analysis — 71/71 PASS, Match 100% | Claude (gap-detector) |
