---
code: FX-DSGN-072
title: "Sprint 72 Design — F217 TestAgent 활성화"
version: 1.0
status: Active
category: DSGN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 72
features: [F217]
req: [FX-REQ-209]
refs: ["[[FX-PLAN-072]]", "[[FX-SPEC-PRD-TA-V1]]"]
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F217 TestAgent 활성화 — Web UI 연동 + 워크플로우 통합 |
| **Sprint** | 72 |
| **Match Target** | 90%+ |
| **예상 파일** | 신규 4 + 수정 4 = 총 8 파일 |

| 관점 | 내용 |
|------|------|
| **Problem** | TestAgent API가 존재하지만 Web UI에서 호출 불가 |
| **Solution** | TestAgentPanel 전용 컴포넌트 + Agent Dashboard 탭 추가 + 커버리지 갭 분석 UI |
| **Function UX Effect** | 소스 코드 입력 → 테스트 생성 → 코드 복사 1클릭 |
| **Core Value** | 6종 Agent 최초 Web UI 연동 완성, 나머지 Agent 활성화 패턴 확립 |

---

## §1 컴포넌트 설계

### 1.1 TestAgentPanel.tsx (신규)

**위치**: `packages/web/src/components/feature/TestAgentPanel.tsx`

**Props**:
```typescript
interface TestAgentPanelProps {
  onClose: () => void;
}
```

**구조**:
```
TestAgentPanel
├── Header ("TestAgent — 테스트 생성")
├── TabBar [생성 | 커버리지 갭]
├── Tab: 생성
│   ├── Textarea (소스 코드 입력, 최소 10줄)
│   ├── Options
│   │   ├── framework: "vitest" (고정, 향후 확장)
│   │   └── instructions: Textarea (추가 지시사항, 선택)
│   ├── Button "테스트 생성" → POST /agents/test/generate
│   ├── Loading Spinner (API 호출 중)
│   └── TestGenerationResult (결과 표시)
└── Tab: 커버리지 갭
    ├── Textarea (소스 코드, 여러 파일 지원: filename으로 구분)
    ├── Textarea (기존 테스트 코드, 선택)
    ├── Button "갭 분석" → POST /agents/test/coverage-gaps
    └── CoverageGapView (결과 표시)
```

**상태 관리**:
```typescript
const [activeTab, setActiveTab] = useState<"generate" | "coverage">("generate");
const [sourceCode, setSourceCode] = useState("");
const [instructions, setInstructions] = useState("");
const [loading, setLoading] = useState(false);
const [generateResult, setGenerateResult] = useState<TestGenerationResponse | null>(null);
const [coverageResult, setCoverageResult] = useState<CoverageGapResponse | null>(null);
const [error, setError] = useState<string | null>(null);
```

### 1.2 TestGenerationResult.tsx (신규)

**위치**: `packages/web/src/components/feature/TestGenerationResult.tsx`

**Props**:
```typescript
interface TestGenerationResultProps {
  result: TestGenerationResponse;
}
```

**구조**:
```
TestGenerationResult
├── Summary Bar
│   ├── 테스트 수: {totalTestCount}개
│   ├── 커버리지 추정: {coverageEstimate}%
│   ├── 소요 시간: {duration}ms
│   └── 모델: {model}
├── 파일별 탭
│   └── TestFileCard[] (path + content + testCount)
│       ├── 파일 경로 표시
│       ├── 코드 하이라이트 (pre + 구문 강조 없이 monospace)
│       └── 복사 버튼 (navigator.clipboard.writeText)
└── EdgeCases 섹션
    └── 엣지케이스 테이블 (function | case | category)
```

### 1.3 CoverageGapView.tsx (신규)

**위치**: `packages/web/src/components/feature/CoverageGapView.tsx`

**Props**:
```typescript
interface CoverageGapViewProps {
  result: CoverageGapResponse;
}
```

**구조**:
```
CoverageGapView
├── Summary
│   ├── 분석 파일: {analyzedFiles}개
│   ├── 전체 커버리지: {overallCoverage}%
│   └── 모델/토큰 메타
├── 미커버 함수 목록 (테이블)
│   └── file | function | complexity | priority
└── 누락 엣지케이스
    └── file | function | suggestedCases[]
```

---

## §2 타입 설계

### 2.1 Shared Types 추가 (`packages/shared/src/agent.ts`)

```typescript
/** F217: TestAgent 테스트 생성 응답 */
export interface TestGenerationResponse {
  testFiles: Array<{
    path: string;
    content: string;
    testCount: number;
    framework: string;
  }>;
  totalTestCount: number;
  coverageEstimate: number;
  edgeCases: Array<{
    function: string;
    case: string;
    category: 'boundary' | 'null' | 'error' | 'concurrency' | 'type';
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

/** F217: TestAgent 커버리지 갭 응답 */
export interface CoverageGapResponse {
  analyzedFiles: number;
  uncoveredFunctions: Array<{
    file: string;
    function: string;
    complexity: 'low' | 'medium' | 'high';
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
  missingEdgeCases: Array<{
    file: string;
    function: string;
    suggestedCases: string[];
  }>;
  overallCoverage: number;
  tokensUsed: number;
  model: string;
}
```

---

## §3 API Client 확장

### 3.1 api-client.ts 함수 추가

```typescript
/** F217: TestAgent 테스트 생성 */
export async function generateTests(
  sourceCode: string,
  options?: { instructions?: string }
): Promise<TestGenerationResponse> {
  return postApi<TestGenerationResponse>("/agents/test/generate", {
    taskId: crypto.randomUUID(),
    context: {
      repoUrl: "",
      branch: "main",
      fileContents: { "source.ts": sourceCode },
      instructions: options?.instructions,
    },
  });
}

/** F217: TestAgent 커버리지 갭 분석 */
export async function analyzeCoverageGaps(
  sourceCode: string,
  testCode?: string
): Promise<CoverageGapResponse> {
  return postApi<CoverageGapResponse>("/agents/test/coverage-gaps", {
    sourceFiles: { "source.ts": sourceCode },
    ...(testCode ? { testFiles: { "source.test.ts": testCode } } : {}),
  });
}
```

---

## §4 Agent Dashboard 연동

### 4.1 agents/page.tsx 수정

**변경 사항**:
1. `AgentsTab` 타입에 `"test-agent"` 추가
2. tabs 배열에 `{ key: "test-agent", label: "TestAgent" }` 추가
3. `activeTab === "test-agent"` 렌더링 블록에 `<TestAgentPanel>` 배치

**변경 코드**:
```typescript
// 타입 확장
type AgentsTab = "agents" | "plans" | "inbox" | "prs" | "queue" | "parallel" | "test-agent";

// tabs 배열에 추가
{ key: "test-agent", label: "TestAgent" },

// 렌더링
{activeTab === "test-agent" && (
  <TestAgentPanel onClose={() => setActiveTab("agents")} />
)}
```

---

## §5 파일 매핑

| # | 파일 | 작업 | 비고 |
|---|------|------|------|
| 1 | `packages/shared/src/agent.ts` | 수정 | TestGenerationResponse + CoverageGapResponse 타입 추가 |
| 2 | `packages/web/src/lib/api-client.ts` | 수정 | generateTests() + analyzeCoverageGaps() 추가 |
| 3 | `packages/web/src/components/feature/TestAgentPanel.tsx` | 신규 | 메인 패널 (탭 전환, API 호출) |
| 4 | `packages/web/src/components/feature/TestGenerationResult.tsx` | 신규 | 테스트 생성 결과 표시 + 복사 |
| 5 | `packages/web/src/components/feature/CoverageGapView.tsx` | 신규 | 커버리지 갭 분석 결과 |
| 6 | `packages/web/src/app/(app)/agents/page.tsx` | 수정 | TestAgent 탭 추가 + import |
| 7 | `packages/web/src/__tests__/TestAgentPanel.test.tsx` | 신규 | 컴포넌트 테스트 |
| 8 | `packages/web/src/app/(app)/agents/page.tsx` | 수정 | (위 6번과 동일) |

**총 7 파일**: 신규 4 + 수정 3

---

## §6 테스트 계획

### 6.1 Web 컴포넌트 테스트

| 테스트 | 검증 내용 |
|--------|----------|
| TestAgentPanel 렌더링 | 탭 전환, 소스 코드 입력, 버튼 표시 |
| TestGenerationResult 렌더링 | testFiles 목록, 메타데이터, 복사 버튼 |
| CoverageGapView 렌더링 | uncoveredFunctions 테이블, 엣지케이스 표시 |
| API 호출 Mock | generateTests() → 성공/실패 케이스 |
| 에러 처리 | API 실패 시 에러 메시지 표시 |

### 6.2 기존 테스트 영향

- Shared types 추가는 기존 테스트에 영향 없음 (새로운 export만 추가)
- API 라우트 변경 없음 (기존 엔드포인트 그대로 활용)
- Orchestrator 변경 없음 (기존 위임 로직 이미 동작)

---

## §7 의존성 및 제약

| 항목 | 내용 |
|------|------|
| **F139 의존** | TestAgent 서비스 + API 라우트 이미 구현 (260줄 + 28테스트) |
| **Orchestrator** | `setTestAgent()` + 위임 로직 이미 존재 (L516-534) — 수정 불필요 |
| **ANTHROPIC_API_KEY** | Workers Secrets에 이미 설정 — TestAgent LLM 호출에 필수 |
| **Monaco Editor** | Out of scope — textarea로 MVP |
