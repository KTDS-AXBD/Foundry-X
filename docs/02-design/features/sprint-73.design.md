---
code: FX-DSGN-073
title: "Sprint 73 — F218 Agent SDK Test Agent PoC 설계"
version: "1.0"
status: Active
category: DSGN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo
references:
  - "[[FX-PLAN-073]] Sprint 73 Plan"
  - "[[FX-SPEC-PRD-TA-V1]] Test Agent PRD §3.1, §4.2"
  - "[[FX-ANLS-015]] AI Test/Review Agent 리서치"
---

# FX-DSGN-073: Sprint 73 — F218 Agent SDK Test Agent PoC 설계

## 1. 개요

Agent SDK TypeScript `query()` API로 3개 subagent를 오케스트레이션하여 vitest 테스트를 자동 생성·실행하고, 기존 F139 TestAgent와 정량 비교하는 PoC.

## 2. 아키텍처

```
tools/test-agent-poc/
│
├── src/index.ts          ─── query() 진입점 (메인 오케스트레이터)
│     │
│     ├── [Agent: test-writer]  ── Read + Write + Glob + Grep
│     │     └─ 소스 분석 → vitest 테스트 파일 작성
│     │
│     ├── [Agent: test-runner]  ── Read + Edit + Bash
│     │     └─ pnpm test 실행 → 실패 시 자동 수정
│     │
│     └── [Agent: test-reviewer] ── Read + Glob + Grep (읽기 전용)
│           └─ 테스트 품질 리뷰 + 커버리지 평가
│
├── src/compare.ts        ─── F139 API 호출 + Agent SDK 결과 비교
├── src/types.ts          ─── 공통 타입 정의
└── src/utils.ts          ─── 헬퍼 (타이머, 결과 저장)
```

## 3. 상세 설계

### 3.1 package.json

```json
{
  "name": "test-agent-poc",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "poc": "tsx src/index.ts",
    "compare": "tsx src/compare.ts"
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

### 3.2 src/index.ts — Agent SDK 진입점

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

interface PocOptions {
  targetFile: string;      // 테스트 대상 소스 파일
  projectRoot: string;     // 모노리포 루트
  outputDir: string;       // 결과 저장 디렉토리
}

async function runTestAgent(options: PocOptions) {
  const { targetFile, projectRoot, outputDir } = options;

  const startTime = Date.now();
  const messages: string[] = [];

  for await (const message of query({
    prompt: [
      `## Task: ${targetFile}에 대한 vitest 테스트 작성 및 실행`,
      ``,
      `### 규칙`,
      `- vitest 3.x + TypeScript 패턴 사용`,
      `- describe/it 구조로 작성`,
      `- 엣지케이스 (null, boundary, error) 포함`,
      `- 기존 테스트 패턴 참고: packages/api/src/__tests/ 하위 파일`,
      ``,
      `### 절차`,
      `1. test-writer 에이전트로 테스트 파일 작성`,
      `2. test-runner 에이전트로 실행 및 실패 수정`,
      `3. test-reviewer 에이전트로 품질 리뷰`,
    ].join("\n"),
    options: {
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Agent"],
      permissionMode: "acceptEdits",
      cwd: projectRoot,
      agents: {
        "test-writer": {
          description: "vitest 테스트 코드 작성 전문가. 소스 파일을 분석하여 누락된 테스트를 작성.",
          prompt: [
            "기존 테스트 패턴을 Glob/Grep으로 분석한 뒤,",
            "대상 파일의 공개 함수/메서드에 대한 vitest 테스트를 작성해.",
            "describe/it 구조, 엣지케이스(null, boundary, error, type) 포함 필수.",
          ].join(" "),
          tools: ["Read", "Write", "Glob", "Grep"],
        },
        "test-runner": {
          description: "테스트 실행 및 실패 수정 전문가. Bash로 vitest를 실행하고 실패를 자동 수정.",
          prompt: [
            "작성된 테스트를 Bash로 실행해.",
            "실패하면 에러 메시지를 분석하고 Edit로 테스트 코드를 수정해.",
            "모든 테스트가 통과할 때까지 반복(최대 3회).",
          ].join(" "),
          tools: ["Read", "Edit", "Bash"],
        },
        "test-reviewer": {
          description: "테스트 품질 리뷰 전문가. 읽기 전용으로 테스트 커버리지와 품질을 평가.",
          prompt: [
            "작성된 테스트의 품질을 평가해.",
            "커버리지 추정, 누락 엣지케이스, 코드 품질을 JSON 형식으로 출력해.",
            "{ coverage_estimate, missing_edges, quality_score, suggestions }",
          ].join(" "),
          tools: ["Read", "Glob", "Grep"],
        },
      },
    },
  })) {
    if ("result" in message) {
      messages.push(String(message.result));
    }
  }

  const duration = Date.now() - startTime;
  return { messages, duration, targetFile };
}
```

### 3.3 src/compare.ts — 비교 스크립트

```typescript
interface ComparisonResult {
  approach: "f139-testagent" | "agent-sdk";
  targetFile: string;
  metrics: {
    testCount: number;
    edgeCaseCount: number;
    passRate: number;        // 0~1
    duration: number;        // ms
    estimatedCost: number;   // USD
  };
  generatedFiles: string[];
}

// F139: Foundry-X API 호출
async function runF139(targetFile: string, apiUrl: string): Promise<ComparisonResult>;

// Agent SDK: query() 호출
async function runAgentSDK(targetFile: string, projectRoot: string): Promise<ComparisonResult>;

// 비교 리포트 출력
function generateReport(f139: ComparisonResult, sdk: ComparisonResult): string;
```

### 3.4 Subagent 프롬프트 (agents/*.md)

**test-writer.md:**
- 역할: vitest 테스트 전문 작성자
- 규칙: describe/it 구조, arrange-act-assert, 엣지케이스 5종(boundary/null/error/concurrency/type)
- 출력: `.test.ts` 파일 직접 Write

**test-runner.md:**
- 역할: 테스트 실행+수정 전문가
- 규칙: `pnpm test -- --grep {file}` 실행, 실패 시 Edit로 수정, 최대 3회 반복
- 출력: 실행 결과 요약

**test-reviewer.md:**
- 역할: 읽기 전용 품질 평가자
- 규칙: 커버리지 추정, 누락 엣지케이스 목록, 품질 점수 (1~10)
- 출력: JSON 리뷰 결과

### 3.5 src/types.ts

```typescript
export interface PocConfig {
  targetFile: string;
  projectRoot: string;
  outputDir: string;
  apiUrl?: string;        // F139 API URL (비교용)
}

export interface TestResult {
  approach: "f139" | "agent-sdk";
  testCount: number;
  edgeCaseCount: number;
  passRate: number;
  duration: number;
  cost: number;
  generatedFiles: string[];
  reviewScore?: number;
}

export interface ComparisonReport {
  timestamp: string;
  target: string;
  results: TestResult[];
  winner: "f139" | "agent-sdk" | "tie";
  recommendation: string;
}
```

## 4. 비교 평가 기준

| 항목 | 가중치 | 측정 방법 |
|------|--------|----------|
| 테스트 수 | 20% | 생성된 it() 블록 카운트 |
| 엣지케이스 커버리지 | 25% | boundary/null/error/concurrency/type 카테고리별 |
| 실행 성공률 | 25% | pass / total 비율 |
| 생성 시간 | 15% | ms 단위 |
| 비용 | 15% | 추정 USD (토큰 기반) |

**판정 기준:**
- Agent SDK가 3개 이상 항목에서 우위 → F219를 Strategy C (Subagent) 로 진행
- F139가 우위 또는 동등 → F219를 Strategy D (Superpowers) 로 전환
- Agent SDK 비용이 $5 초과 → 비용 최적화 후 재평가

## 5. Worker 파일 매핑

단일 구현 (Worker 매핑 불필요 — PoC 규모가 작아 직접 구현)

### 파일 목록

| # | 파일 | 신규/수정 | 설명 |
|---|------|----------|------|
| 1 | `tools/test-agent-poc/package.json` | 신규 | 의존성 정의 |
| 2 | `tools/test-agent-poc/tsconfig.json` | 신규 | TS 설정 |
| 3 | `tools/test-agent-poc/src/index.ts` | 신규 | Agent SDK 진입점 |
| 4 | `tools/test-agent-poc/src/compare.ts` | 신규 | F139 vs SDK 비교 |
| 5 | `tools/test-agent-poc/src/types.ts` | 신규 | 공통 타입 |
| 6 | `tools/test-agent-poc/src/utils.ts` | 신규 | 헬퍼 함수 |
| 7 | `tools/test-agent-poc/src/agents/test-writer.md` | 신규 | Writer 프롬프트 |
| 8 | `tools/test-agent-poc/src/agents/test-runner.md` | 신규 | Runner 프롬프트 |
| 9 | `tools/test-agent-poc/src/agents/test-reviewer.md` | 신규 | Reviewer 프롬프트 |
| 10 | `tools/test-agent-poc/README.md` | 신규 | 실행 가이드 |
| 11 | `docs/03-analysis/FX-ANLS-016_agent-sdk-test-agent-poc.md` | 신규 | 비교 분석 보고서 |

## 6. 테스트 전략

PoC 자체는 테스트 대상이 아님 (도구). 검증은:
1. `pnpm poc` 실행 → vitest 파일 1개 이상 생성 확인
2. 생성된 테스트 실행 → 통과 확인
3. `pnpm compare` 실행 → 비교 리포트 생성 확인
4. 전체 모노리포 `turbo typecheck` 통과 (PoC는 독립 — 영향 없음)

## 7. 제약사항

- `ANTHROPIC_API_KEY` 환경변수 필수 — 없으면 실행 불가
- Agent SDK는 Claude Code 런타임 의존 — `claude` CLI가 PATH에 있어야 함
- PoC 결과물(`results/`)은 `.gitignore`에 추가
- 모노리포 빌드/테스트에 영향 없음 (tools/ 디렉토리는 turbo 파이프라인 외부)
