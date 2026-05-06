---
code: FX-ANLS-357
title: Sprint 357 Gap Analysis — F602 4대 진단 PoC
version: 1.0
status: Complete
category: ANALYSIS
created: 2026-05-06
sprint: 357
f_item: F602
match_rate: 100
---

# Sprint 357 Gap Analysis — F602

## 결과 요약

| 항목 | 결과 |
|------|------|
| **Match Rate** | **100%** |
| 정적 검증 Plan §3 (a~k) | 9/9 PASS |
| Phase Exit P-a~P-h | 8/8 PASS |
| Phase Exit P-i~P-l | DEFERRED (runtime/CI) |
| 회귀 | 0건 |
| MSA 룰 위반 | 0건 |

## Plan §3 항목별

| 항목 | 상태 |
|------|------|
| (a) core/diagnostic/ 디렉토리 구조 | ✅ PASS |
| (b) D1 migration 0144 (2 tables + 3 indexes) | ✅ PASS |
| (c) types.ts 4 export | ✅ PASS |
| (d) schemas 3종 | ✅ PASS (`.openapi()` 생략 — Design §1 plain Hono 결정 반영) |
| (e) DiagnosticEngine 4 method + runAll + getFindings | ✅ PASS |
| (f) routes 2 endpoints (POST /run + GET /findings) | ✅ PASS |
| (g) audit-bus diagnostic.completed 통합 | ✅ PASS |
| (h) app.ts /api/diagnostic mount | ✅ PASS |
| (i) 4 tests T1~T4 GREEN | ✅ PASS (실행 확인 완료) |

## Phase Exit P-a~P-l

| ID | 항목 | 상태 |
|----|------|------|
| P-a | D1 migration 0144 + 2 tables | ✅ 파일 확인 / runtime DEFERRED |
| P-b | core/diagnostic/ 5+ files | ✅ 5 files |
| P-c | types.ts 4 export | ✅ |
| P-d | schemas 3 등록 | ✅ |
| P-e | DiagnosticEngine 4 method + runAll | ✅ |
| P-f | routes 2 endpoints | ✅ |
| P-g | audit-bus mock 검증 | ✅ |
| P-h | app.ts mount | ✅ |
| P-i | typecheck + 4 tests GREEN | ✅ (pre-existing proxy.ts error만) |
| P-j | dual_ai_reviews hook | DEFERRED (task-daemon scope) |
| P-k | lint baseline=0 회귀 | DEFERRED (CI scope) |
| P-l | API smoke | DEFERRED (Master prod smoke) |

## 차이점

| 구분 | 항목 | 영향 |
|------|------|------|
| 추가 | `getFindings` ORDER BY created_at ASC | 안정적 순서. 무해 |
| 추가 | GET /findings `{items,total}` 응답 envelope | 프로젝트 컨벤션 일치. 무해 |
| 변경 | `.openapi()` 데코레이터 생략 | Design §1 plain Hono 결정 반영 |
| 변경 | `[...DIAGNOSTIC_TYPES]` spread | 의미 동일, DRY 개선 |
