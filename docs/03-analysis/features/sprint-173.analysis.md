---
code: FX-ANLS-S173
title: "Sprint 173 Gap Analysis — 디자인 토큰 에디터 + Prototype 연동"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-07
updated: 2026-04-07
author: Claude
sprint: 173
f_items: [F381, F382]
phase: "18-E"
design_ref: "[[FX-DSGN-S173]]"
---

# Sprint 173 Gap Analysis

## Overall Match Rate: 97%

| Category | Score | Status |
|----------|:-----:|:------:|
| API Specification Match | 100% | PASS |
| Data Model Match | 100% | PASS |
| UI/Component Match | 95% | PASS |
| Architecture/Convention | 100% | PASS |
| Test Coverage | 100% | PASS |

---

## Verification Matrix

| # | Item | Result |
|---|------|:------:|
| V1 | GET /offerings/:id/tokens | PASS |
| V2 | GET /offerings/:id/tokens/json | PASS |
| V3 | PUT /offerings/:id/tokens | PASS |
| V4 | POST /offerings/:id/tokens/reset | PASS |
| V5 | PUT validation failure | PASS |
| V6 | DesignTokenEditor 4 tabs | PASS |
| V7 | DesignTokenPreview iframe | PASS |
| V8 | POST /offerings/:id/prototype | PASS |
| V9 | GET /offerings/:id/prototypes | PASS |
| V10 | Non-existent offering 404 | PASS |
| V11 | OfferingPrototypePanel | PASS |
| V12 | typecheck | PASS |
| V13 | lint | PASS |

## CHANGED Items (Design != Implementation, OK)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | tokenValue max length | 500 | 200 | None — 더 안전 |
| 2 | Migration filename | 0114 | 0113 | None — 순번 자동 |
| 3 | Router path prefix | offerings/:id | shaping/offering/:id | None — 기존 IA 패턴 |
| 4 | API client 함수명 | fetchDesignTokens | fetchOfferingDesignTokens | None — 명확성 |
| 5 | GET /prototypes 응답 | implicit | {items, total} | None — 프로젝트 패턴 |

## Fixed After Analysis

| # | Item | Fix |
|---|------|-----|
| 1 | Reset 확인 다이얼로그 | window.confirm() 추가 |
| 2 | Prototype 상세 링크 | Link to /prototype/:id 추가 |

## Test Results

- Design Tokens: **12 tests PASS**
- Offering Prototype: **6 tests PASS**
- Typecheck: API PASS, Web PASS
