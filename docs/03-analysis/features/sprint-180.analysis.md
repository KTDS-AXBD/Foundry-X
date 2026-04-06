---
code: FX-ANLS-S180
title: "Sprint 180 Gap Analysis — harness-kit 패키지"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sprint Autopilot)
system-version: "cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0"
---

# Sprint 180 Gap Analysis — harness-kit 패키지

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F394 + F395 |
| **Match Rate** | **100%** (52/52 PASS) |
| **FAIL** | 0 |
| **PARTIAL** | 0 |
| **결론** | 추가 조치 불필요 |

## 검증 결과

### 섹션별 요약

| Design 섹션 | 검증 항목 | PASS | FAIL | Match |
|-------------|----------|------|------|-------|
| §1 패키지 구조 | 21 | 21 | 0 | 100% |
| §2 공통 타입 | 4 | 4 | 0 | 100% |
| §3 미들웨어 | 7 | 7 | 0 | 100% |
| §4 D1 헬퍼 | 3 | 3 | 0 | 100% |
| §5 이벤트 | 5 | 5 | 0 | 100% |
| §6 Scaffold | 4 | 4 | 0 | 100% |
| §7 CLI | 3 | 3 | 0 | 100% |
| §8 ESLint | 2 | 2 | 0 | 100% |
| §9 package.json | 1 | 1 | 0 | 100% |
| §10 테스트 | 2 | 2 | 0 | 100% |
| **합계** | **52** | **52** | **0** | **100%** |

### Minor 차이 (개선 방향)

| # | Design | 구현 | 판정 |
|---|--------|------|------|
| 1 | `MODULE_BOUNDARIES` 변수명 | `DEFAULT_BOUNDARIES` | 구현이 더 명확 |
| 2 | inline context 타입 | `RuleContext`, `ImportNode` 별도 interface | 타입 안전성 향상 |
| 3 | `import.meta.dirname` | `fileURLToPath` polyfill | Node 20 호환성 확보 |

## 테스트 결과

```
Test Files  9 passed (9)
     Tests  38 passed (38)
  Duration  596ms
```

## typecheck 결과

```
turbo typecheck: 7/7 successful (harness-kit 포함)
```
