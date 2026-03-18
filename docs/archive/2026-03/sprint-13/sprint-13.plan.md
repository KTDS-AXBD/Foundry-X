---
code: FX-PLAN-014
title: Sprint 13 (v1.1.0) — MCP Sampling/Prompts + 에이전트 자동 PR 파이프라인
version: 0.1
status: Draft
category: PLAN
system-version: 1.1.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 13 (v1.1.0) Planning Document

> **Summary**: MCP 1.0의 Sampling(서버→클라이언트 LLM 위임)과 Prompts(재사용 프롬프트 템플릿) 기능을 구현하여 MCP 통합을 완성하고, PRD §7.6 에이전트 충돌 해결 전략을 실현하는 전체 자동화 PR 파이프라인(branch→commit→PR→cross-agent review→auto-merge)을 구축한다. v1.1.0 릴리스.
>
> **Project**: Foundry-X
> **Version**: 1.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | MCP 통합이 tools/call 단방향만 지원하여 서버가 클라이언트에 LLM 호출을 위임하거나 프롬프트 템플릿을 공유할 수 없음. 에이전트 작업 결과가 사람의 수동 커밋/PR에 의존하여 "에이전트가 동등한 팀원"이라는 핵심 비전이 미실현 |
| **Solution** | F64: MCP Sampling handler + Prompts 브라우저로 MCP 양방향 통합 완성 / F65: 에이전트가 branch 생성→코드 커밋→PR 생성→cross-agent 리뷰→SDD 검증→auto-merge까지 전체 자동화 / F66: v1.1.0 릴리스 + 테스트 보강 |
| **Function/UX Effect** | MCP 서버가 Foundry-X를 통해 LLM을 호출하고 프롬프트를 공유. 에이전트가 독립적으로 코드를 작성하고 PR을 생성하면 다른 에이전트가 리뷰하고 조건 충족 시 자동 merge. 사람은 승인/거부만 수행 |
| **Core Value** | "에이전트가 PR을 만들고, 에이전트가 리뷰한다" — PRD 핵심 비전 "동등한 팀원" 실현 + MCP 양방향 통합으로 외부 AI 에코시스템 연결 |

---

## 1. Overview

### 1.1 Purpose

Sprint 13은 **Phase 2의 마지막 기능 확장 스프린트**예요. 두 가지 핵심 축으로 구성돼요:

- **F64 MCP Sampling + Prompts (P1)**: Sprint 12에서 구현한 MCP tools/call 단방향을 넘어, Sampling(역방향 LLM 위임)과 Prompts(템플릿 공유)를 추가하여 MCP 프로토콜 통합을 완성
- **F65 에이전트 자동 PR 파이프라인 (P0)**: PRD §7.6 "브랜치 기반 격리" 전략을 전체 자동화로 구현 — branch 생성→커밋→PR→cross-agent review→SDD 검증→auto-merge
- **F66 v1.1.0 릴리스 + 안정화 (P2)**: 버전 범프, CHANGELOG, 프로덕션 배포, 테스트 보강

### 1.2 Background

**F64 배경 — MCP Sampling + Prompts**:
- Sprint 12에서 MCP tools/call 구현 완료 (McpRunner + SseTransport + HttpTransport)
- MCP 1.0 스펙의 3대 기능 중 Sampling과 Prompts가 미구현:
  - **Sampling**: 서버가 클라이언트에 LLM 호출을 요청하는 역방향 패턴. 클라이언트(Foundry-X)가 LLM을 호출하고 결과를 서버에 반환
  - **Prompts**: 서버가 재사용 가능한 프롬프트 템플릿을 노출. 클라이언트가 발견(`prompts/list`)→실행(`prompts/get`)
- 이 두 기능이 완성되면 MCP 서버와의 양방향 통합이 가능해짐

**F65 배경 — 에이전트 자동 PR**:
- PRD §7.6 에이전트 충돌 해결 전략: "에이전트별 독립 브랜치 → PR → SDD 검증 → auto-merge"
- 현재 상태: 에이전트 실행(ClaudeApiRunner + McpRunner)은 구현되었으나, 결과물을 Git에 반영하는 과정은 전적으로 사람이 수동 수행
- 목표: 에이전트가 작업 완료 후 자동으로 PR을 생성하고, 다른 에이전트가 리뷰하며, 모든 검증 통과 시 자동 merge

**현재 한계**:

| 영역 | 현재 상태 | 한계 |
|------|----------|------|
| MCP tools | McpRunner + tools/call() 구현 ✅ | Sampling/Prompts 미구현 — 단방향만 지원 |
| MCP UI | McpServerCard 등록/테스트 ✅ | Prompts 브라우저 없음, Sampling 이력 없음 |
| 에이전트 작업 결과 | AgentExecutionResult 반환 ✅ | Git 반영은 100% 수동 (branch/commit/PR 전부 사람이) |
| 코드 리뷰 | 사람이 PR에서 수동 리뷰 | 에이전트 간 cross-review 메커니즘 없음 |
| Auto-merge | GitHub Branch Protection에서 설정 가능 | SDD Triangle 검증이 CI에 통합되지 않아 품질 게이트 부재 |

### 1.3 Prerequisites (Sprint 12 완료 항목)

| 항목 | 상태 | 근거 |
|------|:----:|------|
| McpRunner (tools/call) | ✅ | taskType → MCP tool.call() 변환 + 결과 파싱 |
| SseTransport + HttpTransport | ✅ | fetch+ReadableStream SSE 파싱 + 범용 HTTP |
| McpServerRegistry D1 CRUD | ✅ | mcp_servers 테이블 + findServerForTool + 도구 캐시 |
| MCP API 5 endpoints | ✅ | CRUD + test + tools |
| McpServerCard UI | ✅ | workspace 페이지 MCP Servers 탭 |
| AgentOrchestrator.executeTask() | ✅ | session→task→constraint→execute→SSE→record |
| ClaudeApiRunner + MockRunner | ✅ | 4 taskType + Anthropic API fetch |
| GitHub API (octokit) | ✅ | packages/api/src/services/github.ts (repo 읽기용) |
| 354 tests + 20 E2E | ✅ | CLI 106 + API 203 + Web 45 |

### 1.4 Sprint Scope

| F# | 제목 | Priority | 설명 |
|----|------|:--------:|------|
| F64 | MCP Sampling + Prompts 확장 | P1 | MCP Sampling handler + Prompts 발견/실행 + UI 브라우저 |
| F65 | 에이전트 자동 PR 파이프라인 | P0 | branch→commit→PR→cross-agent review→SDD CI→auto-merge 전체 자동화 |
| F66 | v1.1.0 릴리스 + 안정화 | P2 | 버전 범프 + CHANGELOG + D1 migration + 프로덕션 배포 + 테스트 보강 |

---

## 2. Feature Specifications

### 2.1 F64: MCP Sampling + Prompts 확장 (P1)

**목표**: MCP 1.0 프로토콜의 Sampling과 Prompts 기능을 구현하여, MCP 서버와의 양방향 통합을 완성한다.

#### 2.1.1 MCP Sampling Handler

MCP Sampling은 서버가 클라이언트에 LLM 호출을 **위임**하는 역방향 패턴이에요:

```
일반 flow (tools/call):
  Client(Foundry-X) → MCP Server: "이 도구를 실행해줘"

Sampling flow (역방향):
  MCP Server → Client(Foundry-X): "이 프롬프트로 LLM을 호출해줘"
  Client(Foundry-X) → LLM (Claude/GPT): 실행
  Client(Foundry-X) → MCP Server: "결과 여기 있어"
```

**구현 구조**:

```typescript
// MCP Sampling Handler
interface McpSamplingRequest {
  method: 'sampling/createMessage';
  params: {
    messages: McpMessage[];
    modelPreferences?: McpModelPreferences;
    systemPrompt?: string;
    maxTokens: number;
  };
}

interface McpSamplingResponse {
  role: 'assistant';
  content: McpContent;
  model: string;
  stopReason?: string;
}

class McpSamplingHandler {
  constructor(private llmService: LLMService) {}

  // MCP 서버의 sampling 요청을 처리
  async handleSamplingRequest(
    request: McpSamplingRequest
  ): Promise<McpSamplingResponse>;

  // 보안: 허용된 모델만 호출, 토큰 한도 강제
  private validateRequest(request: McpSamplingRequest): void;
}
```

**보안 고려사항**:
- 허용 모델 화이트리스트 (configurable per MCP server)
- maxTokens 상한 강제 (서버별 한도 설정)
- Sampling 요청 로깅 (감사 추적)
- Rate limiting (서버당 분당 N회)

#### 2.1.2 MCP Prompts 발견 + 실행

MCP Prompts는 서버가 재사용 가능한 프롬프트 템플릿을 노출하는 기능이에요:

```typescript
// Prompts 발견
interface McpPrompt {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
}

// prompts/list → 서버가 노출하는 프롬프트 목록 조회
// prompts/get  → 특정 프롬프트 실행 (arguments 전달)

class McpPromptsClient {
  // 서버의 프롬프트 목록 조회
  async listPrompts(serverId: string): Promise<McpPrompt[]>;

  // 프롬프트 실행 (arguments → messages 변환)
  async getPrompt(
    serverId: string,
    name: string,
    args?: Record<string, string>
  ): Promise<McpMessage[]>;
}
```

**McpRunner 확장**:

```typescript
class McpRunner {
  // 기존: tools/call
  async execute(task: AgentExecutionRequest): Promise<AgentExecutionResult>;

  // 신규: prompts 지원
  async listServerPrompts(serverId: string): Promise<McpPrompt[]>;
  async executePrompt(serverId: string, name: string, args?: Record<string, string>): Promise<McpMessage[]>;
}
```

#### 2.1.3 MCP API 확장

| Endpoint | Method | 설명 |
|----------|:------:|------|
| `/mcp/servers/:id/prompts` | GET | 서버의 프롬프트 목록 조회 |
| `/mcp/servers/:id/prompts/:name` | POST | 프롬프트 실행 (arguments body) |
| `/mcp/servers/:id/sampling` | POST | Sampling 요청 처리 (테스트용) |
| `/mcp/sampling/log` | GET | Sampling 이력 조회 |

#### 2.1.4 MCP UI 확장

**workspace/page.tsx MCP Servers 탭 확장**:
- **Prompts 브라우저**: 서버별 프롬프트 목록 표시 + 클릭하여 실행 + 인자 폼
- **Sampling 이력**: 서버가 요청한 Sampling 기록 표시 (모델, 토큰, 결과 요약)

#### 2.1.5 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/api/src/services/mcp-sampling.ts` | 신규 — McpSamplingHandler |
| `packages/api/src/services/mcp-prompts.ts` | 신규 — McpPromptsClient |
| `packages/api/src/services/mcp-runner.ts` | 확장 — prompts/sampling 메서드 추가 |
| `packages/api/src/routes/mcp.ts` | 확장 — 4 endpoints 추가 |
| `packages/api/src/schemas/mcp.ts` | 확장 — sampling/prompts Zod 스키마 |
| `packages/shared/src/agent.ts` | McpPrompt, McpSamplingLog 타입 추가 |
| `packages/web/src/app/(app)/workspace/page.tsx` | Prompts 브라우저 + Sampling 이력 탭 |
| `packages/web/src/components/feature/McpPromptsPanel.tsx` | 신규 — Prompts UI 컴포넌트 |
| `packages/web/src/lib/api-client.ts` | MCP prompts/sampling API 함수 추가 |

**D1 변경**: `mcp_sampling_log` 테이블 추가 (0007 migration)

```sql
CREATE TABLE mcp_sampling_log (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES mcp_servers(id),
  model TEXT NOT NULL,
  max_tokens INTEGER NOT NULL,
  tokens_used INTEGER,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**테스트 예상**: ~18건 (SamplingHandler 6 + PromptsClient 6 + API routes 4 + UI 2)

---

### 2.2 F65: 에이전트 자동 PR 파이프라인 (P0)

**목표**: 에이전트가 작업 결과를 자동으로 Git에 반영하고, PR을 생성하며, cross-agent 리뷰와 SDD 검증을 거쳐 auto-merge까지 수행하는 전체 자동화 파이프라인을 구축한다.

#### 2.2.1 전체 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                    에이전트 자동 PR 파이프라인                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 작업 시작                                                    │
│     AgentOrchestrator.executeTask()                             │
│     └─ 결과: AgentExecutionResult (generatedCode, analysis)     │
│                                                                 │
│  2. Branch 생성   ← PrPipelineService                          │
│     └─ agent/{agentId}/{taskType}-{timestamp}                   │
│                                                                 │
│  3. 코드 적용 + Commit                                          │
│     ├─ generatedCode → 파일 생성/수정                            │
│     ├─ git add + commit (메시지: AI-generated, task 참조)        │
│     └─ git push origin agent/...                                │
│                                                                 │
│  4. PR 생성 (octokit)                                           │
│     ├─ title: "[Agent] {taskType}: {요약}"                       │
│     ├─ body: 작업 컨텍스트 + 변경 사항 + SDD 상태                 │
│     ├─ labels: ['agent-generated', taskType]                    │
│     └─ reviewers: (cross-agent 또는 human)                      │
│                                                                 │
│  5. SDD 검증 (CI Check)                                        │
│     ├─ typecheck ✅                                             │
│     ├─ lint ✅                                                  │
│     ├─ tests ✅                                                 │
│     └─ spec-sync check ✅ (SDD Triangle 동기화)                  │
│                                                                 │
│  6. Cross-Agent Review                                          │
│     ├─ ReviewerAgent가 PR diff 분석                              │
│     ├─ 코드 품질 + 보안 + 명세 적합성 검토                        │
│     └─ approve / request-changes / comment                      │
│                                                                 │
│  7. Auto-Merge 판정                                             │
│     ├─ 조건: CI green + agent approved + (human approved?)      │
│     ├─ merge 전략: squash merge                                 │
│     └─ merge 후: branch 자동 삭제                                │
│                                                                 │
│  8. 결과 기록                                                    │
│     ├─ agent_prs 테이블 업데이트                                  │
│     ├─ SSE: agent.pr.created / agent.pr.merged 이벤트            │
│     └─ 대시보드: PR 상태 실시간 표시                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.2.2 PrPipelineService

에이전트 PR 파이프라인을 오케스트레이션하는 핵심 서비스:

```typescript
interface PrPipelineConfig {
  autoMerge: boolean;           // auto-merge 활성화 (기본: true)
  requireHumanApproval: boolean; // 사람 승인 필수 (기본: false)
  maxAutoMergePerDay: number;    // 일일 auto-merge 한도 (기본: 10)
  branchPrefix: string;          // 브랜치 접두사 (기본: 'agent/')
  mergeStrategy: 'squash' | 'merge' | 'rebase'; // 기본: 'squash'
}

class PrPipelineService {
  constructor(
    private github: GitHubService,
    private db: D1Database,
    private sse?: SSEManager
  ) {}

  // 전체 파이프라인 실행
  async createAgentPr(
    agentId: string,
    taskResult: AgentExecutionResult,
    config?: Partial<PrPipelineConfig>
  ): Promise<AgentPrResult>;

  // Step 2: Branch 생성
  private async createBranch(agentId: string, taskType: string): Promise<string>;

  // Step 3: 코드 적용 + Commit
  private async applyAndCommit(
    branch: string,
    generatedCode: GeneratedCodeFile[],
    commitMessage: string
  ): Promise<string>; // commit SHA

  // Step 4: PR 생성
  private async createPullRequest(
    branch: string,
    taskResult: AgentExecutionResult,
    agentId: string
  ): Promise<number>; // PR number

  // Step 7: Auto-merge 판정
  async checkAndMerge(prNumber: number): Promise<MergeResult>;
}
```

#### 2.2.3 ReviewerAgent — Cross-Agent 리뷰

에이전트가 다른 에이전트의 PR을 리뷰하는 메커니즘:

```typescript
class ReviewerAgent {
  constructor(private llmService: LLMService) {}

  // PR diff를 분석하여 리뷰 수행
  async reviewPullRequest(
    prDiff: string,
    prContext: PrReviewContext
  ): Promise<PrReviewResult>;
}

interface PrReviewResult {
  decision: 'approve' | 'request_changes' | 'comment';
  summary: string;
  comments: PrReviewComment[];
  sddScore: number;        // SDD Triangle 정합성 점수 (0-100)
  securityIssues: string[]; // 보안 이슈 목록
  qualityScore: number;    // 코드 품질 점수 (0-100)
}
```

**리뷰 기준**:
1. **SDD 정합성**: Spec ↔ Code ↔ Test 동기화 확인
2. **코드 품질**: 복잡도, 네이밍, 에러 처리
3. **보안**: OWASP Top 10 기본 검사
4. **명세 적합성**: 작업 요청과 실제 변경의 일치도

#### 2.2.4 Auto-Merge 조건

```
Auto-Merge 조건 (모든 조건 AND):
  ✅ CI 전체 통과 (typecheck + lint + test + build)
  ✅ ReviewerAgent 승인 (decision = 'approve')
  ✅ SDD Score ≥ 80
  ✅ Security Issues = 0 (critical/high)
  ✅ Quality Score ≥ 70
  ✅ 일일 auto-merge 한도 미초과
  ✅ (optional) 사람 승인 완료 — requireHumanApproval = true 시

Auto-Merge 거부 시:
  → PR에 'needs-human-review' 라벨 추가
  → SSE: agent.pr.review_needed 이벤트 발행
  → 대시보드에 알림 표시
```

#### 2.2.5 SSE 이벤트 확장

| 이벤트 | 트리거 | 데이터 |
|--------|--------|--------|
| `agent.pr.created` | PR 생성 완료 | `{ prNumber, branch, agentId, taskType }` |
| `agent.pr.reviewed` | 리뷰 완료 | `{ prNumber, decision, sddScore, reviewerAgentId }` |
| `agent.pr.merged` | Auto-merge 완료 | `{ prNumber, mergedAt, commitSha }` |
| `agent.pr.review_needed` | 사람 리뷰 필요 | `{ prNumber, reason, blockers }` |

#### 2.2.6 대시보드 UI

**agents/page.tsx 확장**:
- **PR 상태 카드**: 에이전트가 생성한 PR 목록 + 상태 (open/reviewing/merged/closed)
- **리뷰 결과 뷰**: SDD Score + Quality Score + Security Issues + 리뷰 코멘트
- **Auto-merge 설정**: 에이전트별/전역 auto-merge 설정 패널

**신규 컴포넌트**:
- `AgentPrCard.tsx`: PR 상태 카드 (브랜치, CI 상태, 리뷰 결과, merge 버튼)
- `PrReviewPanel.tsx`: 리뷰 결과 상세 (SDD/Quality/Security 점수 + 코멘트)
- `AutoMergeSettings.tsx`: auto-merge 설정 폼

#### 2.2.7 D1 스키마 변경

```sql
-- 0007_agent_prs.sql (F64 mcp_sampling_log와 합쳐서 0007)
CREATE TABLE agent_prs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  task_id TEXT REFERENCES agent_tasks(id),
  repo TEXT NOT NULL,
  branch TEXT NOT NULL,
  pr_number INTEGER,
  pr_url TEXT,
  status TEXT NOT NULL DEFAULT 'creating',
  -- status: creating → open → reviewing → approved → merged / closed / needs_human
  review_agent_id TEXT,
  review_decision TEXT,
  sdd_score INTEGER,
  quality_score INTEGER,
  security_issues TEXT, -- JSON array
  merge_strategy TEXT DEFAULT 'squash',
  merged_at TEXT,
  commit_sha TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_agent_prs_status ON agent_prs(status);
CREATE INDEX idx_agent_prs_agent ON agent_prs(agent_id);
```

#### 2.2.8 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/api/src/services/pr-pipeline.ts` | 신규 — PrPipelineService |
| `packages/api/src/services/reviewer-agent.ts` | 신규 — ReviewerAgent (cross-agent 리뷰) |
| `packages/api/src/services/github.ts` | 확장 — createBranch, createPR, mergePR, getPrDiff |
| `packages/api/src/routes/agent.ts` | 확장 — PR 관련 4 endpoints |
| `packages/api/src/schemas/agent.ts` | 확장 — PR/Review Zod 스키마 |
| `packages/api/src/services/agent-orchestrator.ts` | 확장 — executeTask() 후 PR 파이프라인 호출 옵션 |
| `packages/api/src/services/sse-manager.ts` | 확장 — agent.pr.* 이벤트 4종 |
| `packages/shared/src/agent.ts` | AgentPr, PrReviewResult, PrPipelineConfig 타입 |
| `packages/shared/src/web.ts` | AgentPrCard 표시용 타입 |
| `packages/web/src/app/(app)/agents/page.tsx` | PR 상태 카드 + 리뷰 결과 + SSE 핸들링 |
| `packages/web/src/components/feature/AgentPrCard.tsx` | 신규 — PR 상태 카드 |
| `packages/web/src/components/feature/PrReviewPanel.tsx` | 신규 — 리뷰 결과 뷰 |
| `packages/web/src/components/feature/AutoMergeSettings.tsx` | 신규 — auto-merge 설정 |
| `packages/web/src/lib/api-client.ts` | PR 관련 API 함수 추가 |

**API endpoints 추가 (4건)**:

| Endpoint | Method | 설명 |
|----------|:------:|------|
| `/agent/pr` | POST | 에이전트 PR 생성 요청 |
| `/agent/pr/:id` | GET | PR 상태 조회 |
| `/agent/pr/:id/review` | POST | cross-agent 리뷰 실행 |
| `/agent/pr/:id/merge` | POST | auto-merge 실행 |

**테스트 예상**: ~25건 (PrPipeline 8 + ReviewerAgent 6 + GitHub 확장 4 + Routes 4 + UI 3)

---

### 2.3 F66: v1.1.0 릴리스 + 안정화 (P2)

**목표**: Sprint 13 구현을 안정화하고 v1.1.0을 릴리스한다.

#### 2.3.1 릴리스 체크리스트

- [ ] CHANGELOG.md v1.1.0 항목 작성
- [ ] package.json version bump (packages/api, packages/web, root)
- [ ] D1 migration 0007 remote 적용
- [ ] Workers 프로덕션 배포
- [ ] Pages 프로덕션 배포
- [ ] Smoke test 통과
- [ ] git tag v1.1.0

#### 2.3.2 테스트 보강

| 영역 | 내용 | 예상 |
|------|------|:----:|
| PR 파이프라인 E2E | Playwright — agents 페이지 PR 생성→리뷰→merge 흐름 | 3건 |
| MCP Prompts E2E | workspace MCP Prompts 브라우저 사용 흐름 | 2건 |
| API 통합 | PrPipeline + ReviewerAgent + GitHub 서비스 간 통합 | 5건 |

**테스트 예상**: ~10건 (E2E 5 + API 통합 5)

#### 2.3.3 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `docs/CHANGELOG.md` | v1.1.0 항목 추가 |
| `package.json` (루트, api, web) | version bump |
| `SPEC.md` | Sprint 13 F-items + §6 Execution Plan 갱신 |
| `CLAUDE.md` | 현재 상태 갱신 |
| `packages/web/e2e/agent-pr.spec.ts` | 신규 — PR 파이프라인 E2E |
| `packages/web/e2e/mcp-prompts.spec.ts` | 신규 — MCP Prompts E2E |

---

## 3. Technical Architecture

### 3.1 Sprint 13 변경 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                      Sprint 13 변경                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Web Dashboard (Next.js)                        │  │
│  │                                                            │  │
│  │  agents/page.tsx                                           │  │
│  │    ├─ AgentPrCard (F65 신규) ← PR 상태 실시간 표시          │  │
│  │    ├─ PrReviewPanel (F65 신규) ← 리뷰 결과 + 점수           │  │
│  │    └─ AutoMergeSettings (F65 신규) ← auto-merge 설정        │  │
│  │                                                            │  │
│  │  workspace/page.tsx                                        │  │
│  │    ├─ McpPromptsPanel (F64 신규) ← 프롬프트 브라우저         │  │
│  │    └─ Sampling 이력 (F64 신규)                              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                        │ SSE (agent.pr.* 이벤트 4종)             │
│                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              API Server (Hono)                              │  │
│  │                                                            │  │
│  │  PrPipelineService (F65 핵심)                               │  │
│  │    ├─ createBranch → applyAndCommit → createPR             │  │
│  │    ├─ ReviewerAgent.reviewPullRequest()                    │  │
│  │    └─ checkAndMerge() — auto-merge 판정                    │  │
│  │                                                            │  │
│  │  McpSamplingHandler (F64)                                  │  │
│  │    └─ MCP Server → Foundry-X → LLM → MCP Server            │  │
│  │                                                            │  │
│  │  McpPromptsClient (F64)                                    │  │
│  │    ├─ prompts/list → 템플릿 목록                            │  │
│  │    └─ prompts/get → 템플릿 실행                             │  │
│  │                                                            │  │
│  │  GitHubService (F65 확장)                                   │  │
│  │    ├─ createBranch / createPR / mergePR (기존: 읽기만)       │  │
│  │    └─ getPrDiff / addLabels / requestReview                │  │
│  │                                                            │  │
│  │  SSEManager (F65 확장)                                     │  │
│  │    └─ agent.pr.created/reviewed/merged/review_needed        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                        │                                         │
│                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  D1 (F64+F65: 0007 migration)                              │  │
│  │    ├─ mcp_sampling_log (신규) — Sampling 요청 이력           │  │
│  │    └─ agent_prs (신규) — 에이전트 PR 추적                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  GitHub API (octokit) — F65                                │  │
│  │    ├─ Branch: POST /repos/{owner}/{repo}/git/refs          │  │
│  │    ├─ Commit: POST /repos/{owner}/{repo}/git/commits       │  │
│  │    ├─ PR: POST /repos/{owner}/{repo}/pulls                 │  │
│  │    ├─ Merge: PUT /repos/{owner}/{repo}/pulls/{pr}/merge    │  │
│  │    └─ Review: POST /repos/{owner}/{repo}/pulls/{pr}/reviews│  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 의존성 추가

| 패키지 | 목적 | 위치 |
|--------|------|------|
| (없음) | octokit은 이미 설치됨. LLMService 기존 활용 | — |

### 3.3 D1 스키마 변경

**0007_agent_pr_and_sampling.sql**: `agent_prs` + `mcp_sampling_log` 2개 테이블 추가.

총 테이블: 11 (기존) + 2 = **13개**

---

## 4. Implementation Plan

### 4.1 구현 순서

```
Phase A: MCP Sampling + Prompts (F64) — P1
  A1. McpSamplingHandler — sampling/createMessage 처리
  A2. McpPromptsClient — prompts/list + prompts/get
  A3. McpRunner 확장 — sampling/prompts 메서드 추가
  A4. MCP routes 확장 — 4 endpoints
  A5. MCP schemas 확장 — sampling/prompts Zod 스키마
  A6. shared/agent.ts — McpPrompt, McpSamplingLog 타입
  A7. D1 migration 0007 — mcp_sampling_log + agent_prs
  A8. McpPromptsPanel.tsx — Prompts 브라우저 UI
  A9. workspace/page.tsx — Prompts 탭 + Sampling 이력
  A10. 테스트: SamplingHandler + PromptsClient + routes + UI

Phase B: 에이전트 자동 PR (F65) — P0 (핵심, A와 병렬 가능)
  B1. GitHubService 확장 — createBranch, createPR, mergePR, getPrDiff
  B2. PrPipelineService — 전체 파이프라인 오케스트레이션
  B3. ReviewerAgent — cross-agent PR 리뷰
  B4. Agent routes 확장 — PR 관련 4 endpoints
  B5. Agent schemas 확장 — PR/Review Zod 스키마
  B6. SSEManager 확장 — agent.pr.* 이벤트 4종
  B7. AgentOrchestrator 확장 — PR 파이프라인 연결 (옵셔널)
  B8. shared/agent.ts — AgentPr, PrReviewResult 타입
  B9. AgentPrCard.tsx + PrReviewPanel.tsx + AutoMergeSettings.tsx
  B10. agents/page.tsx — PR 상태 + 리뷰 결과 + SSE 핸들링
  B11. 테스트: PrPipeline + ReviewerAgent + GitHub + Routes + UI

Phase C: 릴리스 + 안정화 (F66) — A+B 완료 후
  C1. CHANGELOG v1.1.0
  C2. version bump
  C3. D1 migration remote 적용
  C4. Workers + Pages 배포
  C5. Smoke test
  C6. SPEC.md + CLAUDE.md 갱신
  C7. E2E 테스트 — PR 파이프라인 + MCP Prompts
  C8. git tag v1.1.0

Phase A와 B는 파일 충돌 없으므로 Agent Teams 병렬 실행 가능.
Phase C는 A+B 완료 후 순차.
```

### 4.2 예상 산출물

| 카테고리 | 신규 파일 | 수정 파일 | 테스트 수 |
|---------|:--------:|:--------:|:--------:|
| F64 MCP | ~3 | ~6 | ~18 |
| F65 PR | ~4 | ~8 | ~25 |
| F66 릴리스 | ~2 | ~5 | ~10 |
| **합계** | ~9 | ~19 | ~53 |

**Sprint 13 완료 후 예상 테스트**: 354 (기존) + ~53 = **~407 tests**
**E2E**: 20 (기존) + 5 = **25 E2E specs**
**API endpoints**: 33 (기존) + 8 = **41개**
**D1 테이블**: 11 (기존) + 2 = **13개**

### 4.3 Agent Teams 위임 전략

| Worker | 범위 | 금지 파일 |
|--------|------|----------|
| W1 (MCP Sampling/Prompts) | `mcp-sampling.ts`, `mcp-prompts.ts`, `mcp-runner.ts` 확장, `routes/mcp.ts` 확장, `schemas/mcp.ts`, `McpPromptsPanel.tsx`, 관련 테스트 | `pr-pipeline.ts`, `reviewer-agent.ts`, `github.ts`, `routes/agent.ts` |
| W2 (PR Pipeline) | `pr-pipeline.ts`, `reviewer-agent.ts`, `github.ts` 확장, `routes/agent.ts` PR endpoints, `AgentPrCard.tsx`, `PrReviewPanel.tsx`, 관련 테스트 | `mcp-*.ts`, `routes/mcp.ts`, `workspace/page.tsx` |
| Leader | D1 migration, shared 타입, SSE 확장, agents/page.tsx 통합, AutoMergeSettings, workspace/page.tsx, SPEC/CLAUDE.md, 릴리스, 통합 검증 | — |

---

## 5. Risks & Mitigations

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|:----:|:----:|------|
| R1 | GitHub API rate limit 초과 (PR 생성+리뷰+merge 연속 호출) | Medium | High | octokit throttle 플러그인 적용 + API 호출 최소화 (필수 호출만) |
| R2 | Auto-merge가 의도치 않은 코드를 main에 반영 | Low | Critical | SDD Score ≥ 80 + Security Issues = 0 이중 게이트. requireHumanApproval 옵션으로 안전장치 |
| R3 | ReviewerAgent의 리뷰 품질이 사람 수준에 미달 | Medium | Medium | SDD Score를 코드 레벨에서 계산 (단순 LLM 의견이 아닌 정량 검증). 초기에는 requireHumanApproval=true로 운영 |
| R4 | MCP Sampling 보안 — 외부 서버가 과도한 LLM 호출 유발 | Medium | High | 서버별 rate limit + maxTokens 상한 + 허용 모델 화이트리스트 |
| R5 | Branch Protection 규칙과 auto-merge 충돌 | Low | Medium | GitHub Branch Protection 설정에서 bot 계정 예외 또는 API 토큰 권한 확인 |
| R6 | Agent Teams W1/W2 파일 충돌 | Low | Medium | MCP(W1)과 PR(W2)는 파일 경로 완전 분리. 금지 파일 명시로 방지 |

---

## 6. Success Criteria

| 항목 | 기준 |
|------|------|
| **F64 MCP** | Sampling handler가 MCP 서버의 LLM 요청을 처리 + Prompts 브라우저에서 서버 프롬프트를 발견·실행 + ~18건 테스트 통과 |
| **F65 PR** | 에이전트 작업 후 자동 PR 생성 → ReviewerAgent 리뷰 → SDD+CI 검증 → auto-merge 전체 흐름 동작 + ~25건 테스트 통과 |
| **F66 릴리스** | v1.1.0 태그 + 프로덕션 배포 + smoke test 통과 + ~10건 E2E/통합 테스트 |
| **전체** | typecheck ✅, build ✅, ~407 tests ✅, E2E 25 specs ✅, PDCA Match Rate ≥ 90% |

---

## 7. Out of Scope

Sprint 13에서 명시적으로 제외하는 항목:

| 항목 | 사유 | 이관 |
|------|------|------|
| 멀티테넌시 | Phase 3 범위 (PRD §8) | Phase 3 |
| 외부 도구 연동 (Jira, Slack) | Phase 3 범위 | Phase 3 |
| MCP Resources (파일 리소스 노출) | 범위 축소 — Sampling+Prompts 우선 | Sprint 14 |
| 에이전트 브라우저 연동 (Playwright) | Phase 3 고급 기능 | Phase 3 |
| 멀티 에이전트 동시 PR 충돌 해결 | 복잡도 높음 — 단일 에이전트 PR 먼저 안정화 | Sprint 14 |
| npm publish | CLI 변경 없음 | 변경 시 추가 |
| 모노리포 분리 | Phase 3+ 범위 | Phase 3+ |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — F64~F66 계획 (MCP Sampling/Prompts + Agent Auto-PR + v1.1.0) | Sinclair Seo |
