---
code: FX-RPRT-021
title: F90 PlannerAgent gatherExternalToolInfo() 프롬프트 연동 완료 보고서
version: 0.1
status: Active
category: RPRT
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
---

# F90 PlannerAgent gatherExternalToolInfo() 프롬프트 연동 — 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F90 PlannerAgent gatherExternalToolInfo() 프롬프트 연동 |
| **REQ** | FX-REQ-090 |
| **기간** | 2026-03-19 (단일 세션) |
| **Match Rate** | 96% |

### Results

| Metric | Value |
|--------|-------|
| Match Rate | 96% |
| 설계 항목 | 29개 |
| 일치 항목 | 27.5개 |
| 수정 파일 | 2개 |
| 신규 LOC | ~135 (서비스 +35, 테스트 +100) |
| 신규 테스트 | 7건 (ET-01~ET-07) |
| 전체 API 테스트 | 363건 (이전 356 + 7) |

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | PlannerAgent가 mcpRegistry DI를 받지만 사용하지 않아 LLM이 외부 MCP 도구를 모르고 계획 수립 시 external_tool step을 생성하지 못했어요 |
| **Solution** | `gatherExternalToolInfo()` 메서드로 active MCP 서버의 도구 목록을 수집하고, 시스템/사용자 프롬프트에 주입하여 LLM이 external_tool step을 제안할 수 있게 했어요 |
| **Function/UX Effect** | AI 에이전트가 코드 수정 + 외부 도구 호출을 포함하는 종합 실행 계획을 자동 생성. 363 테스트 전부 통과 (회귀 0건) |
| **Core Value** | Sprint 17(F80)에서 구축한 MCP 생태계 투자가 PlannerAgent의 계획 수립 품질 향상으로 실질적 가치 전환. "도구를 활용할 줄 아는 에이전트"로 진화 |

---

## 1. 구현 내역

### 1.1 수정 파일

| 파일 | 변경 유형 | LOC |
|------|-----------|-----|
| `packages/api/src/services/planner-agent.ts` | Modify | +35 |
| `packages/api/src/__tests__/planner-agent.test.ts` | Modify | +100 |

### 1.2 구현 항목

| # | 항목 | 상태 |
|---|------|:----:|
| 1 | `ExternalToolInfo` 인터페이스 정의 | ✅ |
| 2 | `gatherExternalToolInfo()` async 메서드 — active 서버 필터 + toolsCache 파싱 + 10개/80자 상한 | ✅ |
| 3 | `PLANNER_SYSTEM_PROMPT` 확장 — `external_tool` type + `externalTool` JSON 스키마 + Guidelines | ✅ |
| 4 | `analyzeCodebase()` 수정 — 도구 수집 + 프롬프트 "Available External Tools" 섹션 append | ✅ |
| 5 | 2중 에러 처리 — 외부 catch(listServers 실패 → []) + 내부 catch(toolsCache 파싱 실패 → skip) | ✅ |
| 6 | Graceful 폴백 — mcpRegistry 미제공 / 도구 0개 시 기존 동작 100% 유지 | ✅ |

### 1.3 테스트

| ID | 케이스 | 상태 |
|----|--------|:----:|
| ET-01 | active 서버 2개 + toolsCache → 도구 목록 수집 | ✅ |
| ET-02 | mcpRegistry undefined → 빈 배열 | ✅ |
| ET-03 | 모든 서버 inactive → 빈 배열 | ✅ |
| ET-04 | invalid JSON toolsCache → 해당 서버 skip | ✅ |
| ET-05 | external_tool step + externalTool 필드 파싱 | ✅ |
| ET-06 | 15개 → 10개 도구 truncate | ✅ |
| ET-07 | LLM mock + createPlan e2e — 프롬프트에 도구 포함 + plan에 external_tool step | ✅ |

---

## 2. 품질 지표

| 지표 | 결과 |
|------|------|
| typecheck | ✅ (0 errors) |
| lint | ✅ (0 errors) |
| API 테스트 | 363/363 ✅ |
| 회귀 테스트 | 0건 실패 |
| Match Rate | 96% |

---

## 3. Gap 분석 요약

**Match Rate: 96%** (29항목 중 27.5 일치)

| 유형 | 건수 | 상세 |
|------|:----:|------|
| Changed | 1 | `gatherExternalToolInfo()` visibility: private → public (테스트 직접 호출) |
| Partial | 1 | ET-06: 10개 truncation 검증 O, 80자 description truncation 검증 X |
| Missing | 0 | - |

---

## 4. PDCA 문서 체계

| 문서 | 코드 | 상태 |
|------|------|:----:|
| Plan | FX-PLAN-021 | ✅ |
| Design | FX-DSGN-020 | ✅ |
| Analysis | FX-ANLS-019 | ✅ |
| Report | FX-RPRT-021 | ✅ |

---

## 5. 다음 단계 (Out of Scope)

- external_tool step의 실제 실행 로직 (`executePlan()`에서 MCP `tool.call()`)
- MCP 서버 헬스체크 / 도구 캐시 자동 갱신
- AgentPlanCard UI에서 external_tool step 시각적 구분 표시
