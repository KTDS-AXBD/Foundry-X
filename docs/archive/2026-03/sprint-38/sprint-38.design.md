---
code: FX-DSGN-038
title: "Sprint 38 — SecurityAgent + QAAgent 상세 설계 (F140+F141)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-38
sprint: 38
phase: "Phase 5a"
references:
  - "[[FX-PLAN-038]]"
  - "[[FX-DSGN-037]]"
---

## 1. 설계 개요

### 1.1 목적

기존 Agent Evolution 인프라 위에 **역할 전문 에이전트** 2종을 추가:
- **SecurityAgent** — OWASP Top 10 취약점 스캔, PR diff 보안 분석, 인증/인가 패턴 검증
- **QAAgent** — 브라우저 테스트 시나리오 생성, 수용 기준 검증, 회귀 감지

### 1.2 설계 원칙

| 원칙 | 적용 |
|------|------|
| **ArchitectAgent 패턴 준수** | LLM 시스템 프롬프트 + JSON 파싱 패턴 일관성 유지 |
| **프롬프트 분리** | 서비스 로직과 프롬프트를 별도 파일로 분리 (`*-prompts.ts`) |
| **ModelRouter 활용** | `createRoutedRunner(env, taskType)` 팩토리로 최적 모델 자동 배정 |
| **D1 비저장** | 분석 결과는 API 응답으로만 반환 |
| **Orchestrator 위임** | AgentOrchestrator에서 taskType 기반 에이전트 자동 위임 |

---

## 2. 아키텍처

### 2.1 역할 에이전트 계층도

```
                 ┌──────────────────────────────────┐
                 │       AgentOrchestrator           │
                 │  ──────────────────────────────── │
                 │  executeTask(request)              │
                 │    ├─ "spec-analysis"    → ArchitectAgent (F138)
                 │    ├─ "test-generation"  → TestAgent      (F139)
                 │    ├─ "security-review"  → SecurityAgent  ★ F140
                 │    ├─ "qa-testing"       → QAAgent        ★ F141
                 │    ├─ "code-review"      → ReviewerAgent  (기존)
                 │    └─ 기타              → 범용 Runner     (기존)
                 └───────────┬──────────────────────┘
                             │
        ┌────────────┬───────┼──────────┬─────────────┐
        │            │       │          │             │
 ┌──────▼───┐ ┌─────▼──┐ ┌──▼────┐ ┌───▼─────┐ ┌────▼───┐
 │ Security │ │ QA     │ │Archi- │ │ Test    │ │Reviewer│
 │ Agent    │ │ Agent  │ │tect   │ │ Agent   │ │ Agent  │
 │ ──────── │ │ ────── │ │Agent  │ │ ──────  │ │ ────── │
 │ scan()   │ │ test() │ │       │ │generate │ │ review │
 │ prDiff() │ │ accept │ │       │ │coverage │ │        │
 │ owasp()  │ │ regres │ │       │ │edges()  │ │        │
 └──────────┘ └────────┘ └───────┘ └─────────┘ └────────┘
```

### 2.2 파일 구조 (Sprint 37 패턴 동일)

```
packages/api/src/services/
├── security-agent.ts          # SecurityAgent 클래스 + Result 인터페이스
├── security-agent-prompts.ts  # 시스템 프롬프트 3종 + buildPrompt
├── qa-agent.ts               # QAAgent 클래스 + Result 인터페이스
└── qa-agent-prompts.ts       # 시스템 프롬프트 3종 + buildPrompt
```

---

## 3. SecurityAgent 설계 (F140)

### 3.1 Result Types

```typescript
interface VulnerabilityScanResult {
  riskScore: number;              // 0-100 (100=매우 위험)
  vulnerabilities: Array<{
    type: "injection" | "xss" | "broken-auth" | "data-exposure" |
          "xxe" | "broken-access" | "security-misconfig" |
          "insecure-deserialization" | "vulnerable-components" | "insufficient-logging";
    severity: "critical" | "high" | "medium" | "low";
    location: string;             // 파일:라인
    description: string;
    remediation: string;
  }>;
  securePatterns: string[];       // 발견된 안전한 패턴
  recommendations: Array<{
    category: "authentication" | "encryption" | "input-validation" | "access-control" | "logging";
    suggestion: string;
    priority: "high" | "medium" | "low";
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

interface PRDiffSecurityResult {
  riskLevel: "critical" | "high" | "medium" | "low" | "safe";
  findings: Array<{
    file: string;
    line: number;
    type: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
  }>;
  summary: string;
  tokensUsed: number;
  model: string;
  duration: number;
}

interface OWASPComplianceResult {
  complianceScore: number;        // 0-100
  categories: Record<string, {
    status: "pass" | "warn" | "fail";
    details: string;
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}
```

### 3.2 메서드

| 메서드 | taskType | 프롬프트 |
|--------|----------|---------|
| `scanVulnerabilities(request)` | security-review | SECURITY_SCAN_PROMPT |
| `analyzePRDiff(diff, context)` | security-review | SECURITY_PR_DIFF_PROMPT |
| `checkOWASPCompliance(files)` | security-review | SECURITY_OWASP_PROMPT |

---

## 4. QAAgent 설계 (F141)

### 4.1 Result Types

```typescript
interface BrowserTestResult {
  scenarios: Array<{
    name: string;
    description: string;
    steps: Array<{
      action: string;
      selector?: string;
      expected: string;
    }>;
    playwrightCode: string;       // 생성된 Playwright 코드
    priority: "critical" | "high" | "medium" | "low";
  }>;
  coverageEstimate: number;       // 0-100
  tokensUsed: number;
  model: string;
  duration: number;
}

interface AcceptanceCriteriaResult {
  overallStatus: "pass" | "partial" | "fail";
  criteria: Array<{
    criterion: string;
    status: "met" | "partial" | "unmet";
    evidence: string;
    gaps: string[];
  }>;
  completenessScore: number;      // 0-100
  tokensUsed: number;
  model: string;
  duration: number;
}

interface RegressionAnalysisResult {
  riskScore: number;              // 0-100
  affectedTests: Array<{
    testFile: string;
    riskLevel: "high" | "medium" | "low";
    reason: string;
  }>;
  suggestedTests: string[];       // 추가 필요한 테스트 설명
  tokensUsed: number;
  model: string;
  duration: number;
}
```

### 4.2 메서드

| 메서드 | taskType | 프롬프트 |
|--------|----------|---------|
| `runBrowserTest(request)` | qa-testing | QA_BROWSER_TEST_PROMPT |
| `validateAcceptanceCriteria(spec, files)` | qa-testing | QA_ACCEPTANCE_PROMPT |
| `detectRegressions(changes, tests)` | qa-testing | QA_REGRESSION_PROMPT |

---

## 5. Orchestrator 위임

```typescript
// agent-orchestrator.ts executeTask() 내부
if (taskType === "security-review" && this.securityAgent) {
  const scanResult = await this.securityAgent.scanVulnerabilities(delegateRequest);
  // ... delegatedResult wrapping
}
if (taskType === "qa-testing" && this.qaAgent) {
  const qaResult = await this.qaAgent.runBrowserTest(delegateRequest);
  // ... delegatedResult wrapping (generatedCode = playwright test files)
}
```

---

## 6. API 엔드포인트

| Method | Path | Request Schema | Response |
|--------|------|---------------|----------|
| POST | /agents/security/scan | SecurityScanRequestSchema | VulnerabilityScanResult |
| POST | /agents/security/pr-diff | SecurityPRDiffRequestSchema | PRDiffSecurityResult |
| POST | /agents/qa/browser-test | QABrowserTestRequestSchema | BrowserTestResult |
| POST | /agents/qa/acceptance | QAAcceptanceRequestSchema | AcceptanceCriteriaResult |
