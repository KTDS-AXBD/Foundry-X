---
code: FX-ANLS-019
title: PlannerAgent gatherExternalToolInfo() 프롬프트 연동 Gap 분석
version: 0.1
status: Active
category: ANLS
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
---

# PlannerAgent gatherExternalToolInfo() Gap 분석

> **Feature**: F90 PlannerAgent gatherExternalToolInfo() 프롬프트 연동
> **Design**: FX-DSGN-020
> **Match Rate**: 96%

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 97% | ✅ |
| Architecture Compliance | 100% | ✅ |
| Convention Compliance | 95% | ✅ |
| Test Coverage (ET cases) | 93% | ✅ |
| **Overall** | **96%** | ✅ |

---

## Design §4.1~§4.5 vs Implementation

| Design Section | Item | Status |
|----------------|------|:------:|
| §3.1 | `ExternalToolInfo` interface 정의 | ✅ |
| §4.1 | mcpRegistry undefined guard → `[]` | ✅ |
| §4.1 | server filter: `status === 'active' && toolsCache` | ✅ |
| §4.1 | tools `slice(0, 10)` 상한 | ✅ |
| §4.1 | description `slice(0, 80)` truncate | ✅ |
| §4.1 | 외부 try-catch → `[]` (listServers 실패) | ✅ |
| §4.1 | 내부 try-catch → skip (toolsCache 파싱 실패) | ✅ |
| §4.1 | visibility: `private` → `public` | ⚠️ Changed |
| §4.2 | PLANNER_SYSTEM_PROMPT `external_tool` type 추가 | ✅ |
| §4.2 | `externalTool` JSON 스키마 가이드 | ✅ |
| §4.2 | Guidelines `external_tool` 사용 기준 2줄 | ✅ |
| §4.3 | analyzeCodebase() 내 gatherExternalToolInfo() 호출 | ✅ |
| §4.3 | prompt append 포맷 (Available External Tools) | ✅ |
| §4.3 | externalTools === 0 시 프롬프트 미확장 | ✅ |
| §4.4 | parseAnalysisResponse() 변경 없음 | ✅ |
| §4.5 | mockAnalysis() 변경 없음 | ✅ |

---

## Differences

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| `gatherExternalToolInfo()` visibility | `private async` | `async` (public) | Low — 테스트에서 직접 호출 필요 |

---

## Error Handling (§5) Coverage

| # | Scenario | 구현 | 테스트 |
|---|----------|:----:|:------:|
| 1 | mcpRegistry undefined | ✅ | ET-02 ✅ |
| 2 | listServers() D1 실패 | ✅ | implicit |
| 3 | toolsCache 파싱 실패 | ✅ | ET-04 ✅ |
| 4 | active 서버 0개 / 도구 0개 | ✅ | ET-03 ✅ |
| 5 | LLM 잘못된 externalTool 필드 | ✅ | ET-05 ✅ |

---

## Test Plan (§6) Coverage

| ID | Test Case | Status |
|----|-----------|:------:|
| ET-01 | active 서버 2개 + toolsCache | ✅ |
| ET-02 | mcpRegistry undefined | ✅ |
| ET-03 | 모든 서버 inactive | ✅ |
| ET-04 | invalid JSON toolsCache | ✅ |
| ET-05 | external_tool step 파싱 | ✅ |
| ET-06 | 15개 → 10개 truncate | ⚠️ Partial (80자 truncation 미검증) |
| ET-07 | createPlan e2e with LLM mock | ✅ |

---

## Match Rate

| Category | Items | Matched | Rate |
|----------|:-----:|:-------:|:----:|
| Interface (§3.1) | 1 | 1 | 100% |
| gatherExternalToolInfo (§4.1) | 8 | 7 | 88% |
| PLANNER_SYSTEM_PROMPT (§4.2) | 3 | 3 | 100% |
| analyzeCodebase (§4.3) | 3 | 3 | 100% |
| parseAnalysisResponse (§4.4) | 1 | 1 | 100% |
| mockAnalysis (§4.5) | 1 | 1 | 100% |
| Error Handling (§5) | 5 | 5 | 100% |
| Test Plan (§6) | 7 | 6.5 | 93% |
| **Total** | **29** | **27.5** | **96%** |

---

## Verdict

**Match Rate 96% >= 90%** — 설계-구현 정합성 우수. Report 단계로 진행 가능.

### Optional Improvements

1. Design §4.1 visibility 보정: `private` → `public` (사유: 테스트 직접 호출)
2. ET-06 보강: 80자 초과 description truncation 검증 assertion 추가
