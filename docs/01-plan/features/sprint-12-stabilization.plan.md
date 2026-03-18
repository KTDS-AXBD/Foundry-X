---
code: FX-PLAN-013
title: Sprint 12 Stabilization — MCP 실 구현 + v1.0.0 릴리스 + 테스트 보강
version: 0.1
status: Draft
category: PLAN
system-version: 0.12.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 12 Stabilization Planning Document

> **Summary**: Sprint 11에서 설계한 MCP 프로토콜(FX-DSGN-012)을 실 구현하여 외부 AI 에이전트 연동을 활성화하고, 11개 스프린트에 걸친 Phase 2 성과를 v1.0.0으로 릴리스하며, F56(88%)에서 약했던 테스트 커버리지를 보강하여 프로덕션 안정성을 확보한다.
>
> **Project**: Foundry-X
> **Version**: 0.12.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | MCP가 타입 stub만 존재하여 외부 AI 에이전트(Claude Desktop, Cursor 등) 연동 불가. 11개 스프린트 성과가 v0.x 프리릴리스 상태로 공식 릴리스 없음. E2E Match Rate 88%로 에이전트 실행·위젯 흐름 검증 부족 |
| **Solution** | F61: MCP SseTransport + McpAgentRunner 구현 / F62: CHANGELOG 정비 + README + 프로덕션 최종 배포 + v1.0.0 태그 / F63: agents E2E + API 통합 테스트 확대 |
| **Function/UX Effect** | 대시보드에서 MCP 서버 URL을 등록하면 외부 AI 에이전트가 Foundry-X를 통해 작업 수행. v1.0.0 릴리스로 공식 버전 제공. 테스트 안전망 강화로 회귀 방지 |
| **Core Value** | "설계에서 구현으로, 프리릴리스에서 정식으로" — MCP 연동으로 에이전트 생태계 확장 + v1.0.0으로 Phase 2 마무리 + 테스트로 안정성 증명 |

---

## 1. Overview

### 1.1 Purpose

이 Plan은 Sprint 12에서 F59(ouroboros)/F60(Generative UI)과 **병렬로** 진행하는 3개 Feature를 다뤄요:

- **F61 MCP 실 구현 (P1)**: Sprint 11 설계(FX-DSGN-012)를 기반으로 McpAgentRunner + SseTransport를 실제 구현하여 외부 MCP 서버 연동
- **F62 v1.0.0 릴리스 준비 (P1)**: 문서 정비 + 프로덕션 최종 배포 + npm publish + Git 태그
- **F63 테스트 커버리지 강화 (P2)**: Sprint 11 E2E(88%) 보강 + MCP 통합 테스트 + agents 컴포넌트 테스트

### 1.2 Background

**MCP 구현 필요성**:
- Sprint 11(F58)에서 MCP 1.0 프로토콜 설계 완료 (mcp-protocol.design.md)
- 현재 `mcp-adapter.ts`에 타입만 정의, 구현체 없음
- AgentOrchestrator가 ClaudeApiRunner와 MockRunner만 지원
- 외부 AI 에이전트(Claude Desktop, Cursor, VS Code Copilot 등) 연동을 위해 MCP 필수
- MCP 구현 체크리스트 3건이 Design 문서에 존재: SseTransport, McpRunner, 연결 UI

**v1.0.0 릴리스 필요성**:
- Phase 2 Sprint 6~11에서 28 endpoints, 14 services, 290 tests, 18 E2E 구축
- npm은 v0.5.0에서 멈춰 있고, CLI 외 API/Web 변경이 반영되지 않음
- 프로덕션 사이트(fx.minu.best)는 운영 중이나 공식 릴리스 버전 없음
- CHANGELOG에 v0.11.0까지 기록되었으나, 릴리스 노트 형태로 정리 필요

**테스트 보강 필요성**:
- F56(E2E 고도화) Match Rate 88% — Sprint 11 F-items 중 최저
- agents/page.tsx의 SSE 실시간 흐름 E2E가 타이밍 이슈로 flaky
- MCP runner 추가 시 통합 테스트 필수
- F60 Generative UI 도입 시 위젯 렌더링 E2E도 필요 (F63에서 기반 마련)

### 1.3 Prerequisites

| 항목 | 상태 | 근거 |
|------|:----:|------|
| MCP 설계 문서 (FX-DSGN-012) | ✅ | Transport 우선순위, Tool 매핑, 아키텍처 확정 |
| mcp-adapter.ts 타입 정의 | ✅ | McpTransport, McpMessage, McpAgentRunner 인터페이스 |
| TASK_TYPE_TO_MCP_TOOL 매핑 | ✅ | 4 taskType → MCP tool name 매핑 상수 |
| AgentOrchestrator.executeTask() | ✅ | runner 인터페이스 기반 실행 — MCP runner 주입 가능 |
| deploy.yml CI/CD | ✅ | staging/production 환경 분리 완료 |
| CHANGELOG v0.11.0 | ✅ | Added/Changed/Fixed 구조 |
| Playwright E2E 인프라 | ✅ | 18 specs, CI 통합, auth fixture |
| 290 tests all green | ✅ | CLI 106 + API 150 + Web 34 |

### 1.4 Sprint Scope

| F# | 제목 | Priority | 설명 |
|----|------|:--------:|------|
| F61 | MCP 실 구현 — McpAgentRunner + SseTransport | P1 | 설계 기반 구현, tool.call() 변환, 연결 관리 UI |
| F62 | v1.0.0 릴리스 준비 — 안정화 + 문서 + 배포 | P1 | CHANGELOG, README, 프로덕션 배포, npm, Git 태그 |
| F63 | 테스트 커버리지 강화 — E2E + API 통합 보강 | P2 | agents E2E 안정화, MCP 통합 테스트, 위젯 기반 |

---

## 2. Feature Specifications

### 2.1 F61: MCP 실 구현 — McpAgentRunner + SseTransport (P1)

**목표**: mcp-protocol.design.md(FX-DSGN-012)의 설계를 실제 코드로 구현하여, AgentOrchestrator에서 MCP 서버를 통한 외부 AI 에이전트 실행이 가능하게 한다.

#### 2.1.1 SseTransport 구현

MCP 1.0의 SSE 전송 계층을 Cloudflare Workers 호환으로 구현:

```typescript
// packages/api/src/services/mcp-transport.ts (신규)
class SseTransport implements McpTransport {
  readonly type = 'sse';

  constructor(private config: {
    serverUrl: string;      // MCP 서버 SSE 엔드포인트
    messageUrl: string;     // MCP 서버 메시지 전송 엔드포인트
    timeout?: number;       // 연결 타임아웃 (기본 30초)
  }) {}

  /** MCP 서버에 연결하고 SSE 스트림 수신 시작 */
  async connect(): Promise<void>;

  /** JSON-RPC 메시지 전송 (POST → messageUrl) */
  async send(message: McpMessage): Promise<McpResponse>;

  /** SSE 스트림에서 서버 알림 수신 */
  onNotification(handler: (notification: McpNotification) => void): void;

  /** 연결 종료 */
  async disconnect(): Promise<void>;

  /** 연결 상태 확인 */
  get isConnected(): boolean;
}
```

**Workers 호환 고려사항**:
- `EventSource`는 Workers에서 미지원 → `fetch` + ReadableStream으로 SSE 파싱
- 연결 지속 시간: Workers 요청당 30초 제한 → 요청별 connect/disconnect 또는 Durable Objects 검토
- Fallback: SSE 불가 시 HttpTransport로 자동 전환

#### 2.1.2 HttpTransport 구현 (Fallback)

```typescript
// packages/api/src/services/mcp-transport.ts (동일 파일)
class HttpTransport implements McpTransport {
  readonly type = 'http';

  constructor(private config: {
    serverUrl: string;     // MCP 서버 HTTP 엔드포인트
    apiKey?: string;       // 인증 키 (선택)
  }) {}

  /** 단순 요청-응답 방식 — SSE 스트림 없음 */
  async send(message: McpMessage): Promise<McpResponse>;
}
```

#### 2.1.3 McpAgentRunner 구현

```typescript
// packages/api/src/services/mcp-runner.ts (신규)
class McpRunner implements McpAgentRunner {
  readonly type = 'mcp' as const;

  constructor(private transport: McpTransport) {}

  /** AgentRunner.execute() 구현 */
  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    // 1. taskType → MCP tool name 변환 (TASK_TYPE_TO_MCP_TOOL)
    // 2. context → MCP tool input 변환
    // 3. transport.send({ method: 'tools/call', params: { name, arguments } })
    // 4. MCP 응답 → AgentExecutionResult 변환
  }

  /** MCP 서버의 사용 가능 도구 조회 */
  async listTools(): Promise<McpTool[]> {
    // transport.send({ method: 'tools/list' })
  }

  /** MCP 서버의 리소스 조회 */
  async listResources(): Promise<McpResource[]> {
    // transport.send({ method: 'resources/list' })
  }

  /** MCP 서버 연결 상태 + 도구 가용성 확인 */
  async isAvailable(): Promise<boolean>;

  /** 특정 capability 지원 여부 */
  supportsCapability(cap: string): boolean;
}
```

#### 2.1.4 MCP 서버 연결 관리

**D1 스키마 추가** (0006 migration):

```sql
CREATE TABLE mcp_servers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  transport_type TEXT NOT NULL DEFAULT 'sse',  -- 'sse' | 'http'
  api_key TEXT,                                 -- 암호화 저장
  status TEXT NOT NULL DEFAULT 'active',        -- 'active' | 'inactive' | 'error'
  last_connected_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**API 엔드포인트**:

| Method | Path | 설명 |
|--------|------|------|
| GET | `/mcp/servers` | 등록된 MCP 서버 목록 |
| POST | `/mcp/servers` | MCP 서버 등록 |
| DELETE | `/mcp/servers/:id` | MCP 서버 삭제 |
| POST | `/mcp/servers/:id/test` | MCP 서버 연결 테스트 |
| GET | `/mcp/servers/:id/tools` | MCP 서버 도구 목록 |

**대시보드 UI**:
- 설정 페이지(workspace)에 "MCP Servers" 섹션 추가
- 서버 등록 폼: Name, URL, Transport Type(SSE/HTTP), API Key
- 연결 테스트 버튼 + 상태 표시
- 도구 목록 조회

#### 2.1.5 AgentOrchestrator 통합

```typescript
// 기존: runner를 매개변수로 전달
orchestrator.executeTask(agentId, taskType, context, runner);

// F61 확장: runner 자동 선택 로직 추가
class AgentOrchestrator {
  constructor(
    private db: D1Database,
    private sse?: SSEManager,
    private mcpServers?: McpServerRegistry  // F61 신규
  ) {}

  /** MCP 서버가 해당 taskType을 지원하면 McpRunner 사용, 아니면 ClaudeApiRunner */
  private async selectRunner(taskType: AgentTaskType): Promise<AgentRunner>;
}
```

#### 2.1.6 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/api/src/services/mcp-transport.ts` | 신규 — SseTransport + HttpTransport |
| `packages/api/src/services/mcp-runner.ts` | 신규 — McpRunner (McpAgentRunner 구현) |
| `packages/api/src/services/mcp-registry.ts` | 신규 — McpServerRegistry (D1 CRUD + 연결 관리) |
| `packages/api/src/routes/mcp.ts` | 신규 — 5 endpoints (servers CRUD + test + tools) |
| `packages/api/src/schemas/mcp.ts` | 신규 — MCP 서버 Zod 스키마 |
| `packages/api/src/services/agent-orchestrator.ts` | selectRunner() 자동 선택 로직 |
| `packages/api/src/services/mcp-adapter.ts` | stub → 실 구현 참조 (re-export) |
| `packages/api/src/index.ts` | MCP 라우트 등록 |
| `packages/shared/src/agent.ts` | McpServerInfo 타입 추가 |
| `packages/web/src/app/(app)/workspace/page.tsx` | MCP Servers 설정 섹션 |
| `packages/web/src/components/feature/McpServerCard.tsx` | 신규 — 서버 카드 (상태 + 도구 목록) |
| `packages/web/src/lib/api-client.ts` | MCP API 함수 5개 |
| `migrations/0006_mcp_servers.sql` | 신규 — mcp_servers 테이블 |

**테스트 예상**: ~20건
- SseTransport: 5 (connect, send, disconnect, timeout, fallback)
- HttpTransport: 3 (send, auth, error)
- McpRunner: 5 (execute, listTools, taskType 매핑, 에러, isAvailable)
- MCP routes: 5 (CRUD + test + tools)
- McpServerRegistry: 2 (D1 CRUD)

---

### 2.2 F62: v1.0.0 릴리스 준비 (P1)

**목표**: Phase 2 Sprint 6~12의 성과를 v1.0.0으로 공식 릴리스하여, Foundry-X의 첫 안정 버전을 제공한다.

#### 2.2.1 CHANGELOG 정비

현재 CHANGELOG에 v0.11.0까지 기록. v0.12.0 + v1.0.0 릴리스 노트 작성:

```markdown
## [1.0.0] - 2026-03-XX

### Highlights
- Phase 2 완료: API Server + Web Dashboard + 에이전트 오케스트레이션
- 28 API endpoints, 14 services, MCP 연동
- 프로덕션: fx.minu.best + foundry-x-api.ktds-axbd.workers.dev
- 335+ tests, 21+ E2E specs

### Added (v0.12.0 → v1.0.0)
- F59~F63 변경 사항

### Migration Guide
- v0.5.0 CLI 사용자: API/Web 변경 없음, CLI 하위 호환
- 신규 사용자: npm i -g foundry-x@1.0.0
```

#### 2.2.2 README.md 업데이트

현재 README가 Phase 1 중심. Phase 2 성과를 반영:
- 프로젝트 소개 + 스크린샷 (대시보드, 에이전트 뷰, spec-generator)
- 설치 가이드 (CLI + Web Dashboard)
- API 문서 링크
- 기여 가이드

#### 2.2.3 프로덕션 최종 배포

```
배포 체크리스트:
1. [ ] turbo build — 전체 패키지 빌드 확인
2. [ ] turbo test — 전체 테스트 green 확인
3. [ ] turbo typecheck — 타입 에러 0
4. [ ] wrangler d1 migrations apply --remote — 0006 migration 적용
5. [ ] wrangler deploy — Workers API 배포
6. [ ] wrangler pages deploy — Pages 배포
7. [ ] smoke-test.sh — 프로덕션 엔드포인트 검증
8. [ ] npm publish foundry-x@1.0.0 — npm 배포
9. [ ] git tag v1.0.0 — Git 태그
10. [ ] GitHub Release 생성 — 릴리스 노트 포함
```

#### 2.2.4 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `docs/CHANGELOG.md` | v0.12.0 + v1.0.0 릴리스 노트 |
| `README.md` | Phase 2 성과 반영 + 스크린샷 + 설치 가이드 |
| `package.json` (root) | version → 1.0.0 |
| `packages/cli/package.json` | version → 1.0.0 |
| `packages/api/package.json` | version → 1.0.0 |
| `packages/web/package.json` | version → 1.0.0 |
| `packages/shared/package.json` | version → 1.0.0 |
| `SPEC.md` | system-version → 1.0.0, §2 Sprint 12 완료 기록 |

**테스트 예상**: 0 (문서 + 설정 변경)

---

### 2.3 F63: 테스트 커버리지 강화 (P2)

**목표**: Sprint 11 E2E(88%) 부족분을 보강하고, F61 MCP runner 통합 테스트를 추가하며, F60 Generative UI 위젯의 기반 테스트를 마련한다.

#### 2.3.1 agents E2E 안정화

Sprint 11 E2E에서 flaky했던 SSE 타이밍 이슈 해결:

```typescript
// packages/web/e2e/helpers/sse-helpers.ts (신규)
/**
 * SSE 이벤트를 안정적으로 대기하는 헬퍼
 * - 폴링 대신 페이지 내 SSE 상태 변수를 관찰
 * - 타임아웃 + 재시도 로직 내장
 */
async function waitForSSEEvent(
  page: Page,
  eventType: string,
  timeout?: number
): Promise<void>;
```

보강 E2E:
- **에이전트 SSE 실시간 흐름**: 실행 → started 이벤트 → UI 스피너 → completed 이벤트 → 결과 표시 (현재 flaky → 안정화)
- **MCP runner 전환**: MCP 서버 등록 → 에이전트 실행 시 MCP runner 사용 확인
- **위젯 렌더링 기반**: 에이전트 결과에 코드 블록이 있을 때 구문 강조 표시 확인

#### 2.3.2 MCP 통합 테스트

```typescript
// packages/api/src/__tests__/mcp-integration.test.ts (신규)
describe('MCP Integration', () => {
  // Mock MCP 서버를 사용한 end-to-end 흐름
  it('executeTask with McpRunner → MCP tool.call → result');
  it('McpRunner fallback when MCP server unavailable');
  it('selectRunner prefers MCP when available');
  it('MCP server CRUD operations');
  it('MCP server connection test');
});
```

#### 2.3.3 API 서비스 통합 테스트

기존 서비스 간 호출 경로를 명시적으로 검증:

| 테스트 | 검증 경로 |
|--------|----------|
| spec-generate → ambiguity → socratic → evaluate | F59 파이프라인 통합 |
| agent-execute → selectRunner → MCP/Claude → SSE | F61 runner 선택 통합 |
| mcp-server → test-connection → list-tools | F61 MCP 관리 통합 |

#### 2.3.4 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/web/e2e/helpers/sse-helpers.ts` | 신규 — SSE 이벤트 대기 헬퍼 |
| `packages/web/e2e/agent-execute.spec.ts` | SSE 타이밍 안정화 리팩토링 |
| `packages/web/e2e/mcp-runner.spec.ts` | 신규 — MCP runner E2E 2건 |
| `packages/web/e2e/widget-render.spec.ts` | 신규 — 위젯 렌더링 기반 E2E 2건 |
| `packages/api/src/__tests__/mcp-integration.test.ts` | 신규 — MCP 통합 5건 |
| `packages/api/src/__tests__/service-integration.test.ts` | 신규 — 서비스 통합 3건 |

**테스트 예상**: ~15건 (E2E 4 + API 통합 8 + SSE 헬퍼 3)

---

## 3. Technical Architecture

### 3.1 MCP 연동 아키텍처 (F61)

```
┌─────────────────────────────────────────────────────────┐
│                     Sprint 12 — F61 MCP                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Web Dashboard                                    │   │
│  │                                                   │   │
│  │  workspace/page.tsx                               │   │
│  │    └─ MCP Servers 설정 섹션                        │   │
│  │       ├─ McpServerCard (상태 + 도구 목록)          │   │
│  │       ├─ 서버 등록 폼 (URL, Transport, API Key)   │   │
│  │       └─ 연결 테스트 버튼                          │   │
│  └──────────────────────────────────────────────────┘   │
│                       │ REST                             │
│                       ▼                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  API Server                                       │   │
│  │                                                   │   │
│  │  routes/mcp.ts (5 endpoints)                      │   │
│  │    ├─ GET/POST/DELETE /mcp/servers                 │   │
│  │    ├─ POST /mcp/servers/:id/test                  │   │
│  │    └─ GET /mcp/servers/:id/tools                  │   │
│  │                                                   │   │
│  │  McpServerRegistry (D1 CRUD)                      │   │
│  │    └─ mcp_servers 테이블                           │   │
│  │                                                   │   │
│  │  AgentOrchestrator (확장)                          │   │
│  │    └─ selectRunner(taskType)                      │   │
│  │       ├─ MCP 서버에 해당 tool 있음? → McpRunner    │   │
│  │       └─ 없으면 → ClaudeApiRunner (기존)           │   │
│  │                                                   │   │
│  │  McpRunner ──── McpTransport ──── MCP Server      │   │
│  │    │               ├─ SseTransport (1순위)         │   │
│  │    │               └─ HttpTransport (fallback)     │   │
│  │    └─ taskType → tool.call() 변환                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  D1 (0006 migration)                              │   │
│  │  mcp_servers: id, name, server_url,               │   │
│  │    transport_type, api_key, status,                │   │
│  │    last_connected_at, created_at                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 3.2 의존성 추가

| 패키지 | 목적 | 위치 | 비고 |
|--------|------|------|------|
| (없음) | MCP는 표준 fetch + SSE 파싱으로 구현 | — | Workers 네이티브 API 활용 |

### 3.3 D1 스키마 변경

**0006_mcp_servers.sql** (신규 migration):
- `mcp_servers` 테이블 1개 추가
- 기존 10개 테이블에 영향 없음

---

## 4. Implementation Plan

### 4.1 구현 순서

```
Phase A: MCP Transport + Runner (F61 핵심) — P1
  A1. mcp-transport.ts — SseTransport 구현 (fetch + ReadableStream SSE 파싱)
  A2. mcp-transport.ts — HttpTransport 구현 (단순 fetch)
  A3. mcp-runner.ts — McpRunner 구현 (execute, listTools, listResources)
  A4. mcp-runner.ts — taskType → tool.call() 변환 + 결과 역변환
  A5. 테스트: Transport 8 + Runner 5

Phase B: MCP 서버 관리 (F61 관리 계층) — P1
  B1. 0006_mcp_servers.sql — D1 migration
  B2. mcp-registry.ts — McpServerRegistry (D1 CRUD + 연결 상태)
  B3. routes/mcp.ts — 5 endpoints
  B4. schemas/mcp.ts — Zod 스키마
  B5. agent-orchestrator.ts — selectRunner() 로직 추가
  B6. shared/agent.ts — McpServerInfo 타입
  B7. 테스트: routes 5 + registry 2

Phase C: MCP 대시보드 UI (F61 프론트엔드) — P1
  C1. api-client.ts — MCP API 함수 5개
  C2. McpServerCard.tsx — 서버 카드 컴포넌트
  C3. workspace/page.tsx — MCP Servers 섹션 추가
  C4. 연결 테스트 + 도구 목록 UI

Phase D: v1.0.0 릴리스 (F62) — P1
  D1. CHANGELOG.md v0.12.0 + v1.0.0 작성
  D2. README.md 업데이트
  D3. package.json 버전 범프 (전체 패키지)
  D4. 프로덕션 배포 (D1 migration + Workers + Pages)
  D5. npm publish foundry-x@1.0.0
  D6. Git tag v1.0.0 + GitHub Release

Phase E: 테스트 보강 (F63) — P2
  E1. sse-helpers.ts — SSE 이벤트 대기 헬퍼
  E2. agent-execute.spec.ts — SSE 타이밍 안정화
  E3. mcp-runner.spec.ts — MCP E2E 2건
  E4. widget-render.spec.ts — 위젯 기반 E2E 2건
  E5. mcp-integration.test.ts — API 통합 5건
  E6. service-integration.test.ts — 서비스 통합 3건

Phase A→B→C 순차 (Transport → Registry → UI).
Phase D는 A~C + F59/F60 모두 완료 후.
Phase E는 A~C와 병렬 가능 (MCP 테스트는 B 후).
```

### 4.2 예상 산출물

| 카테고리 | 신규 파일 | 수정 파일 | 테스트 수 |
|---------|:--------:|:--------:|:--------:|
| F61 Transport+Runner | 2 | 2 | ~13 |
| F61 Registry+Routes | 3 | 3 | ~7 |
| F61 Dashboard UI | 1 | 2 | 0 |
| F62 릴리스 | 0 | ~8 | 0 |
| F63 테스트 | ~4 | ~2 | ~15 |
| **합계** | ~10 | ~17 | ~35 |

**Sprint 12 전체 예상 테스트** (F59/F60 포함):
- 기존: 290
- F59/F60: ~21 (다른 Pane)
- F61/F62/F63: ~35 (이 Pane)
- **합계**: ~346 tests + 22 E2E specs

### 4.3 Agent Teams 위임 전략

| Worker | 범위 | 금지 파일 |
|--------|------|----------|
| W1 (MCP Core) | `mcp-transport.ts`, `mcp-runner.ts`, 관련 테스트 | `packages/web/`, `mcp-registry.ts`, `routes/mcp.ts` |
| W2 (MCP Registry+Routes) | `mcp-registry.ts`, `routes/mcp.ts`, `schemas/mcp.ts`, `0006_*.sql`, `agent-orchestrator.ts` 수정, 관련 테스트 | `packages/web/`, `mcp-transport.ts`, `mcp-runner.ts` |
| Leader | shared 타입, api-client.ts, McpServerCard, workspace/page.tsx, v1.0.0 릴리스, E2E 테스트, SPEC 관리, 통합 검증 | — |

---

## 5. Risks & Mitigations

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|:----:|:----:|------|
| R1 | Workers에서 SSE 클라이언트 구현 제약 (EventSource 미지원) | High | Medium | fetch + ReadableStream으로 SSE 직접 파싱. 실패 시 HttpTransport fallback |
| R2 | Workers 요청당 30초 제한으로 장시간 MCP 연결 불가 | High | High | 요청별 connect/disconnect 패턴 사용. 장시간 작업은 polling 모드. Durable Objects 검토 (비용 고려) |
| R3 | MCP 서버 API Key 평문 저장 | Medium | High | Workers Secrets로 암호화 키 관리. D1에는 암호화 값만 저장. HTTPS 필수 |
| R4 | v1.0.0 릴리스 후 중대 버그 발견 | Medium | High | v1.0.1 핫픽스 프로세스 사전 정의. 릴리스 전 전체 테스트 + smoke test 2회 |
| R5 | F59/F60과의 SPEC/코드 충돌 | Medium | Medium | 각 Pane이 수정하는 파일 목록 사전 합의. shared 타입은 이 Pane이 우선 |
| R6 | npm publish 권한 이슈 | Low | Medium | npm token 사전 확인. --dry-run으로 테스트 후 실제 배포 |

---

## 6. Success Criteria

| 항목 | 기준 |
|------|------|
| **F61 MCP Transport** | SseTransport로 MCP 서버 연결 + tool.list + tool.call 성공. HttpTransport fallback 동작. ~13건 테스트 |
| **F61 MCP Runner** | AgentOrchestrator.selectRunner()가 MCP 서버 등록 시 McpRunner 자동 선택. 미등록 시 ClaudeApiRunner |
| **F61 MCP UI** | workspace 페이지에서 MCP 서버 등록/삭제/테스트 + 도구 목록 조회 동작 |
| **F62 릴리스** | v1.0.0 Git 태그 + npm publish + GitHub Release + CHANGELOG + README 업데이트 |
| **F63 테스트** | agents E2E flaky 0건. MCP 통합 테스트 5건 green. 전체 테스트 ~346건 + E2E 22 specs |
| **전체** | typecheck ✅, build ✅, tests ✅, PDCA Match Rate ≥ 90% |

---

## 7. Out of Scope

| 항목 | 사유 | 이관 |
|------|------|------|
| MCP Sampling (LLM 호출 위임) | MCP 1.0 고급 기능, tool.call()로 충분 | Phase 3 |
| MCP Prompts (프롬프트 템플릿) | 현재 taskType 프롬프트로 충분 | Sprint 13+ |
| Durable Objects MCP 연결 | Workers 비용 고려 필요, polling으로 대체 | Sprint 13+ |
| CLI npm 변경 | CLI 코드 변경 없으므로 v1.0.0 버전만 범프 | — |
| 멀티테넌시 MCP 서버 | 테넌트별 MCP 서버 분리는 Phase 3 | Phase 3 |
| MCP 서버 모니터링 대시보드 | 기본 연결 상태만, 상세 모니터링은 추후 | Sprint 13+ |

---

## 8. F59/F60과의 병렬 작업 가이드

### 파일 소유권 분리

| 파일 | F59/F60 Pane | F61/F62/F63 Pane (이 문서) |
|------|:------------:|:-------------------------:|
| `shared/agent.ts` | UIHint 타입 | McpServerInfo 타입 |
| `shared/web.ts` | AmbiguityResult 등 | (변경 없음) |
| `api/routes/spec.ts` | F59 endpoints | (변경 없음) |
| `api/routes/mcp.ts` | (변경 없음) | F61 신규 |
| `api/services/mcp-*.ts` | (변경 없음) | F61 구현 |
| `api/services/claude-api-runner.ts` | UIHint 프롬프트 | (변경 없음) |
| `api/services/agent-orchestrator.ts` | (변경 없음) | selectRunner() |
| `web/agents/page.tsx` | DynamicRenderer | (변경 없음) |
| `web/workspace/page.tsx` | (변경 없음) | MCP 설정 |
| `SPEC.md` | F59/F60 상태 | F61/F62/F63 상태 |

### 머지 순서 권장

1. **shared 타입 먼저**: 양쪽 Pane이 shared에 추가하는 타입을 동시에 커밋하면 충돌. 한 Pane이 먼저 커밋 후 다른 Pane이 pull.
2. **API 라우트는 독립**: spec.ts(F59)와 mcp.ts(F61)는 파일이 다르므로 충돌 없음.
3. **SPEC.md는 이 Pane이 관리**: F61~F63 상태 갱신은 이 Pane에서. F59/F60 갱신은 다른 Pane에서.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — F61(MCP 실 구현) + F62(v1.0.0 릴리스) + F63(테스트 보강) | Sinclair Seo |
