---
code: FX-ANLS-S187
title: Sprint 187 Gap Analysis — F400 E2E 서비스별 태깅 + Gate-X scaffold PoC
version: "1.0"
status: Active
category: ANLS
created: 2026-04-07
updated: 2026-04-07
author: Claude (gap-detector)
sprint: 187
f_items: [F400]
design_ref: "[[FX-DSGN-S187]]"
match_rate: 100
---

# Sprint 187 Gap Analysis Report

> **Analysis Type**: Design vs Implementation Gap Analysis
> **Match Rate**: **100%** (10/10 PASS)

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| E2E 서비스별 태깅 | 100% | PASS |
| E2E 회귀 테스트 | 100% | PASS |
| Gate-X scaffold PoC | 100% | PASS |
| API+CLI 전체 테스트 | 100% | PASS |
| **Overall** | **100%** | **PASS** |

---

## 2. Gap Analysis (Design §2.2 성공 기준)

| 성공 기준 | 결과 | Status |
|----------|------|--------|
| `pnpm e2e` 전체 통과 (fail 0) | 264 passed, 0 failed, 6 skipped | PASS |
| E2E spec에 서비스 그룹 태그 추가 | 44개 파일 완료 | PASS |
| `harness create gate-x` scaffold 생성 | 8개 파일 생성 | PASS |
| Gate-X scaffold + modules/gate tsc 통과 | 에러 0 | PASS |
| 전체 API + CLI 테스트 통과 | 3167 passed | PASS |

---

## 3. 상세 검증

### T1: E2E 서비스별 태깅

| 서비스 그룹 | Design 개수 | 구현 개수 | Status |
|------------|:----------:|:--------:|--------|
| `foundry-x` | 14 | 14 | PASS |
| `portal` | 13 | 13 | PASS |
| `gate-x` | 7 | 7 | PASS |
| `infra/shared` | 7 | 7 | PASS |
| `bd-demo` | 3 | 3 | PASS |
| **합계** | **44** | **44** | **PASS** |

### T2: E2E 회귀 테스트

| Design 기준 | 실제 결과 | Status |
|------------|----------|--------|
| 263 passed, 0 failed | 264 passed, 0 failed, 6 skipped | PASS (+1 positive) |

### T3+T4: Gate-X scaffold PoC

| Design 기준 | 실제 결과 | Status |
|------------|----------|--------|
| scaffold 8개 파일 | 8개 생성 완료 | PASS |
| tsc --noEmit 에러 0 | 에러 0 | PASS |
| 7개 gate routes 등록 | 7개 등록 완료 | PASS |
| cross-module deps 4종 문서화 | Design §7.1에 기록 | PASS |

---

## 4. Match Rate

```
+---------------------------------------------+
|  Overall Match Rate: 100%  (10/10)           |
+---------------------------------------------+
|  PASS:  10 items (100%)                      |
|  FAIL:   0 items  (0%)                       |
+---------------------------------------------+
```

---

## 5. Design 내부 불일치 (참고, 감점 없음)

| 위치 | 내용 |
|------|------|
| §2.1 "spec 파일 수 40개" | §3.2 합계 44개가 정확 (이전 기준 잔재) |
| §5.4 "scaffold 9개 파일" | PoC 결과 8개, §7에서 자기보정 완료 |

---

## 6. 권장 사항

없음 — 모든 성공 기준 충족.

**Next Step**: Match Rate 100% ≥ 90% → `/pdca report sprint-187` 완료 보고서 작성
