---
code: FX-ANLS-038
title: "Sprint 38 Gap Analysis — SecurityAgent + QAAgent (F140+F141)"
version: 1.0
status: Active
category: ANLS
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-38
sprint: 38
phase: "Phase 5a"
matchRate: 97
references:
  - "[[FX-PLAN-038]]"
  - "[[FX-DSGN-038]]"
---

## Executive Summary

| 항목 | 결과 |
|------|------|
| Feature | F140: SecurityAgent + F141: QAAgent |
| Sprint | 38 |
| Match Rate | **97%** |
| 신규 서비스 | 2개 (SecurityAgent, QAAgent) |
| 신규 테스트 | 31개 (Security 16 + QA 15) |
| 기존 회귀 | 0건 |
| 전체 테스트 | 745 pass (기존 714 + 신규 31) |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 에이전트가 설계/테스트 분석까지 확장됐지만, 보안 취약점 스캔과 QA 테스트 생성은 수동 |
| **Solution** | SecurityAgent 3메서드(scan+prDiff+owasp) + QAAgent 3메서드(browserTest+acceptance+regression) |
| **Function UX Effect** | PR diff 보안 자동 경고 + 브라우저 테스트 Playwright 코드 자동 생성 + 수용 기준 검증 |
| **Core Value** | 6종 역할 에이전트 완성 (Reviewer+Planner+Architect+Test+Security+QA), ModelRouter 통합 |

---

## 1. 설계 대비 구현 비교

### 1.1 비교 요약

| 카테고리 | 설계 항목 | 구현 항목 | 일치율 |
|----------|:---------:|:---------:|:------:|
| Result Types | 6 | 6 | 100% |
| Service Methods | 6 | 6 | 100% |
| System Prompts | 6 | 6 | 100% |
| Prompt Builders | 5 | 5 | 100% |
| API Endpoints | 4 | 4 | 100% |
| Schemas | 4 | 4 | 100% |
| Orchestrator Integration | 4 | 4 | 100% |
| AgentTaskType | 2 | 2 | 100% |
| Record Maps (4 files) | 4 | 4 | 100% |
| Test Files | 2 | 2 | 100% |
| Test Count | 30+ | 31 | 100% |
| **총합** | **43+** | **43+** | **97%** |

### 1.2 상세 매핑

#### SecurityAgent (F140)

| 설계 항목 | 구현 상태 | 비고 |
|----------|:---------:|------|
| VulnerabilityScanResult 인터페이스 | ✅ | 10종 vulnerability type + severity + location |
| PRDiffSecurityResult 인터페이스 | ✅ | riskLevel 5등급 + findings + summary |
| OWASPComplianceResult 인터페이스 | ✅ | complianceScore + categories Record |
| scanVulnerabilities() | ✅ | createRoutedRunner("security-review") |
| analyzePRDiff() | ✅ | diff + context 파라미터 |
| checkOWASPCompliance() | ✅ | files Record 입력, 인라인 프롬프트 조합 |
| SECURITY_SCAN_PROMPT | ✅ | OWASP Top 10 전체 10카테고리 명시 |
| SECURITY_PR_DIFF_PROMPT | ✅ | 5개 평가 기준 |
| SECURITY_OWASP_PROMPT | ✅ | A01~A10 카테고리별 pass/warn/fail |
| buildSecurityScanPrompt() | ✅ | ArchitectAgent 패턴 동일 |
| buildPRDiffPrompt() | ✅ | diff + context 조합 |
| POST /agents/security/scan | ✅ | SecurityScanRequestSchema |
| POST /agents/security/pr-diff | ✅ | SecurityPRDiffRequestSchema |
| Orchestrator "security-review" 위임 | ✅ | setSecurityAgent() + delegation block |
| 테스트 16개 | ✅ | scan 7 + prDiff 4 + owasp 4 + 기본 1 |

#### QAAgent (F141)

| 설계 항목 | 구현 상태 | 비고 |
|----------|:---------:|------|
| BrowserTestResult 인터페이스 | ✅ | scenarios + steps + playwrightCode |
| AcceptanceCriteriaResult 인터페이스 | ✅ | overallStatus 3등급 + criteria + gaps |
| RegressionAnalysisResult 인터페이스 | ✅ | riskScore + affectedTests + suggestedTests |
| runBrowserTest() | ✅ | createRoutedRunner("qa-testing") |
| validateAcceptanceCriteria() | ✅ | spec + files 파라미터 |
| detectRegressions() | ✅ | changes + existingTests 파라미터 |
| QA_BROWSER_TEST_PROMPT | ✅ | Playwright 코드 생성 지시 |
| QA_ACCEPTANCE_PROMPT | ✅ | criterion별 met/partial/unmet |
| QA_REGRESSION_PROMPT | ✅ | affectedTests + suggestedTests |
| buildBrowserTestPrompt() | ✅ | acceptanceCriteria 포함 |
| buildAcceptancePrompt() | ✅ | spec + files 조합 |
| buildRegressionPrompt() | ✅ | changes + existingTests 조합 |
| POST /agents/qa/browser-test | ✅ | QABrowserTestRequestSchema |
| POST /agents/qa/acceptance | ✅ | QAAcceptanceRequestSchema |
| Orchestrator "qa-testing" 위임 | ✅ | setQAAgent() + generatedCode 변환 |
| 테스트 15개 | ✅ | browser 6 + acceptance 4 + regression 5 |

#### Infrastructure Integration

| 설계 항목 | 구현 상태 | 비고 |
|----------|:---------:|------|
| execution-types.ts | ✅ | "security-review" + "qa-testing" 추가 |
| model-router.ts DEFAULT_MODEL_MAP | ✅ | security→Sonnet, qa→Haiku |
| prompt-utils.ts TASK_SYSTEM_PROMPTS | ✅ | 2종 시스템 프롬프트 추가 |
| prompt-utils.ts DEFAULT_LAYOUT_MAP | ✅ | security→tabs, qa→accordion |
| mcp-adapter.ts TASK_TYPE_TO_MCP_TOOL | ✅ | 2종 MCP 도구명 추가 |
| agent.ts schemas (allTaskTypes) | ✅ | Zod enum 9종으로 확장 |

---

## 2. 갭 분석

### 2.1 발견된 갭

| # | 유형 | 항목 | 영향도 | 상태 |
|---|------|------|:------:|:----:|
| 1 | ⚠️ Minor | QAAgent 테스트 14개 → 15개 (목표 15+) | Low | ✅ 해결 |

### 2.2 해결 조치

- **Gap 1**: `qa-agent.test.ts`에 `detectRegressions > handles missing suggestedTests array` 테스트 1개 추가 → 15개 달성

### 2.3 추가 발견 (설계 대비 개선)

| 항목 | 설명 | 평가 |
|------|------|------|
| Orchestrator QA delegation | `qaResult.scenarios`를 `generatedCode`로 변환하여 Playwright 파일 자동 생성 경로 포함 | ✅ 설계 확장 |
| OWASP compliance | `checkOWASPCompliance()`가 `buildPrompt` 없이 인라인 조합 — `analyzeDependencies()` 패턴과 동일 | ✅ 기존 패턴 준수 |

---

## 3. 테스트 검증

| 항목 | 결과 |
|------|------|
| typecheck | ✅ 0 errors |
| 전체 테스트 | 745/745 ✅ (기존 714 + 신규 31) |
| 기존 테스트 회귀 | 0건 (length assertion 2건 7→9 수정) |
| lint | ✅ (기존 상태 유지) |

---

## 4. 결론

**Match Rate: 97%** — Sprint 38 설계와 구현이 매우 높은 수준으로 일치.

Sprint 37(ArchitectAgent+TestAgent) 패턴을 100% 따르면서 SecurityAgent(OWASP 보안 분석)와 QAAgent(브라우저 테스트 생성) 2종 역할 에이전트를 추가했어요. 이로써 Agent Evolution Track A의 6종 역할 에이전트 체계(Reviewer→Planner→Architect→Test→**Security**→**QA**)가 완성됐어요.
