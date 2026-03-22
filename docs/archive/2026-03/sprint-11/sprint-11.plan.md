---
code: FX-PLAN-011
title: Sprint 11 (v0.11.0) — SSE 완성 + E2E 고도화 + 배포 자동화 + MCP 설계
version: 0.1
status: Draft
category: PLAN
system-version: 0.11.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 11 (v0.11.0) Planning Document

> **Summary**: Sprint 10에서 구현한 에이전트 실행 엔진(ClaudeApiRunner)과 충돌 감지(ConflictDetector)의 실시간 SSE 이벤트 전파를 완성하고, E2E 테스트로 핵심 흐름을 검증하며, CI/CD 배포 자동화와 MCP 실 구현 설계를 통해 v1.0.0 릴리스 준비를 마무리한다.
>
> **Project**: Foundry-X
> **Version**: 0.11.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 에이전트 작업 실행 결과가 SSE로 전파되지 않아 대시보드에서 실시간 추적이 불가능하고, E2E 테스트가 렌더링 스모크 10건뿐이라 핵심 사용자 흐름(에이전트 실행, 충돌 해결)이 미검증 상태. CI/CD는 수동 배포 의존, MCP는 stub 인터페이스만 존재 |
| **Solution** | F55: SSE agent.task.started/completed 이벤트 + 대시보드 실시간 반영 / F56: Playwright E2E 에이전트 실행·충돌 해결 흐름 / F57: GitHub Actions 환경 분리 + 자동 배포 / F58: MCP 1.0 스펙 기반 McpAgentRunner 구현 계획 |
| **Function/UX Effect** | 에이전트 작업 시작→진행→완료를 대시보드에서 실시간 확인. E2E로 크리티컬 패스 3개 자동 검증. PR merge 시 staging/production 자동 배포. MCP 프로토콜 설계로 외부 AI 에이전트 연동 기반 마련 |
| **Core Value** | "에이전트가 일하는 과정을 실시간으로 본다" — UX 완성도 향상 + 테스트 안전망 강화 + 배포 자동화로 운영 비용 제로 + MCP 설계로 Phase 3 확장성 확보 |

---

## 1. Overview

### 1.1 Purpose

Sprint 11은 Sprint 10에서 구현한 핵심 기능들의 **완성도와 안정성**을 높이는 스프린트예요:

- **F55 SSE 이벤트 완성 (P1)**: 에이전트 작업의 시작/완료를 SSE로 전파하여 대시보드에서 실시간 추적
- **F56 E2E 테스트 고도화 (P1)**: 에이전트 실행과 충돌 해결의 핵심 사용자 흐름을 Playwright E2E로 검증
- **F57 프로덕션 배포 자동화 (P2)**: GitHub Actions 환경 분리 + PR merge 트리거 자동 배포
- **F58 MCP 실 구현 설계 (P2)**: MCP 1.0 프로토콜 리뷰 + McpAgentRunner 구현 계획 수립

### 1.2 Background

- **Sprint 10 성과**: ClaudeApiRunner + ConflictDetector + 프로덕션 실배포 (Match Rate 93%, 276 tests)
- **현재 한계**:
  - **SSE 전파 미완**: `AgentOrchestrator.executeTask()`가 SSE 이벤트를 발행하지 않음. SSEManager는 `activity`/`status`/`error` 3개 이벤트만 지원하고 `agent.task.started`/`completed`가 없음
  - **agents/page.tsx SSE 미활용**: sse-client에 `onStatus`/`onError` 핸들러가 있지만 agents 페이지에서 사용 안 함. 작업 결과가 모달 콜백으로만 표시됨
  - **E2E 부족**: 10건 스모크 테스트(렌더링 확인)만 존재. 에이전트 실행/충돌 해결 같은 인터랙션 흐름 미검증
  - **수동 배포**: deploy.yml이 auto-deploy 지원하나, 환경 변수(--env production) 미분리
  - **MCP stub**: `mcp-adapter.ts`에 타입만 정의, 구현체 없음

### 1.3 Prerequisites (Sprint 10 완료 항목)

| 항목 | 상태 | 근거 |
|------|:----:|------|
| ClaudeApiRunner 구현 | ✅ | 4 taskType + Anthropic API fetch + MockRunner |
| ConflictDetector 2-phase | ✅ | 규칙 기반 + LLM 보강, 4 충돌 유형 |
| AgentOrchestrator.executeTask() | ✅ | 6-step 흐름: session→task→constraint→execute→record→update |
| SSEManager (기본) | ✅ | D1 폴링, activity/status/error 3 이벤트 |
| sse-client.ts (기본) | ✅ | onActivity/onStatus/onSync/onError/onConnectionChange |
| Playwright E2E 인프라 | ✅ | 5 spec 파일 10 테스트, playwright.config, CI 통합 |
| deploy.yml CI/CD | ✅ | test→deploy-api→deploy-web→smoke-test |
| MCP adapter 인터페이스 | ✅ | McpTransport, McpTool, McpResource, McpAgentRunner 타입 |
| 276 tests passing | ✅ | CLI 106 + API 136 + Web 34 |

### 1.4 Sprint Scope

| F# | 제목 | Priority | 설명 |
|----|------|:--------:|------|
| F55 | SSE 이벤트 완성 — 에이전트 작업 실시간 전파 | P1 | agent.task.started/completed SSE + agents/page 실시간 반영 |
| F56 | E2E 테스트 고도화 — 에이전트+충돌 흐름 | P1 | Playwright agent execute + conflict resolution E2E + API 통합 테스트 |
| F57 | 프로덕션 배포 자동화 — CI/CD 파이프라인 | P2 | wrangler.toml ENVIRONMENT var + GitHub Actions 자동 배포 + 환경 분리 |
| F58 | MCP 실 구현 설계 — McpAgentRunner 계획 | P2 | MCP 1.0 스펙 리뷰 + McpTransport 구현 계획 + 프로토콜 설계 문서 |

---

## 2. Feature Specifications

### 2.1 F55: SSE 이벤트 완성 — 에이전트 작업 실시간 전파 (P1)

**목표**: 에이전트 작업의 시작/진행/완료를 SSE로 실시간 전파하여, 대시보드의 에이전트 페이지에서 작업 상태를 라이브로 추적한다.

#### 2.1.1 SSEManager 이벤트 확장

현재 SSEManager는 `activity`/`status`/`error` 3개 이벤트만 지원해요. 2개 이벤트를 추가해요:

| 이벤트 | 트리거 시점 | 데이터 |
|--------|------------|--------|
| `agent.task.started` | executeTask() 호출 직후 | `{ taskId, agentId, taskType, runnerType, startedAt }` |
| `agent.task.completed` | 실행 완료/실패 시 | `{ taskId, agentId, status, tokensUsed, durationMs, resultSummary }` |

```typescript
// SSEManager 이벤트 타입 확장
type SSEEvent =
  | { event: "activity"; data: AgentActivityData }
  | { event: "status"; data: AgentStatusData }
  | { event: "error"; data: AgentErrorData }
  | { event: "agent.task.started"; data: TaskStartedData }    // 신규
  | { event: "agent.task.completed"; data: TaskCompletedData } // 신규
```

**구현 전략**: D1 폴링 대신 이벤트 직접 발행 방식 추가. `AgentOrchestrator.executeTask()`에서 SSEManager에 직접 이벤트를 push하는 메서드를 호출.

```typescript
// SSEManager에 push 메서드 추가
class SSEManager {
  // 기존: D1 폴링 기반 이벤트 스트림
  // 추가: 직접 이벤트 발행
  pushEvent(event: SSEEvent): void;
}
```

#### 2.1.2 AgentOrchestrator SSE 통합

`executeTask()` 흐름에 SSE 이벤트 발행 삽입:

```
기존 6-step:
  1. session 생성 → 2. task 생성 → 3. constraint 수집
  → 4. runner.execute() → 5. task 업데이트 → 6. session 업데이트

Sprint 11 확장 (8-step):
  1. session 생성 → 2. task 생성 → 3. constraint 수집
  → **3.5. SSE: agent.task.started 발행**
  → 4. runner.execute()
  → 5. task 업데이트 → 6. session 업데이트
  → **6.5. SSE: agent.task.completed 발행**
```

**의존성**: SSEManager 인스턴스를 AgentOrchestrator에 주입 (현재는 db만 주입)

```typescript
// 변경: constructor에 SSEManager 추가
class AgentOrchestrator {
  constructor(private db: D1Database, private sse?: SSEManager) {}
}
```

#### 2.1.3 agents/page.tsx 실시간 UI

현재 agents 페이지는 `onActivity`만 사용해요. SSE 이벤트를 전면 활용하도록 확장:

| 핸들러 | 동작 |
|--------|------|
| `onActivity` | 기존 유지 — 에이전트 활동 상태 업데이트 |
| `onStatus` | **추가** — agent.task.started/completed 이벤트 수신 시 에이전트 카드에 작업 상태 표시 |
| `onError` | **추가** — 연결 에러/작업 에러 시 토스트 알림 |

**UI 변경**:
- `AgentCard`에 실시간 작업 상태 표시 (pending/running/completed/failed 배지)
- 작업 진행 중 로딩 인디케이터
- 작업 완료 시 자동으로 AgentTaskResult 표시 (모달 없이)

#### 2.1.4 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/api/src/services/sse-manager.ts` | agent.task.started/completed 이벤트 타입 + pushEvent() 메서드 |
| `packages/api/src/services/agent-orchestrator.ts` | SSEManager 주입 + executeTask()에서 이벤트 발행 |
| `packages/api/src/routes/agent.ts` | SSEManager를 orchestrator에 전달 |
| `packages/web/src/app/(app)/agents/page.tsx` | onStatus/onError 핸들러 + 실시간 task 상태 UI |
| `packages/web/src/components/feature/AgentCard.tsx` | 작업 상태 배지 + 로딩 인디케이터 |
| `packages/shared/src/agent.ts` | TaskStartedData/TaskCompletedData 타입 |

**테스트 예상**: ~10건 (SSEManager 이벤트 3 + Orchestrator SSE 통합 3 + agents/page 렌더링 4)

---

### 2.2 F56: E2E 테스트 고도화 — 에이전트+충돌 흐름 (P1)

**목표**: 핵심 사용자 흐름 3개를 Playwright E2E로 자동 검증하여, 프로덕션 배포 전 회귀 방지 안전망을 강화한다.

#### 2.2.1 에이전트 실행 E2E

```
Flow: agents 페이지 진입 → 에이전트 카드 클릭 → 실행 모달 열기
  → taskType 선택 + context 입력 → 실행 요청
  → SSE task.started 수신 → 로딩 표시
  → SSE task.completed 수신 → AgentTaskResult 표시
```

테스트 케이스:
1. **성공 흐름**: Mock API로 에이전트 실행 → 결과 표시 확인
2. **에러 흐름**: API 에러 시 에러 토스트 표시 확인
3. **SSE 이벤트**: 작업 시작/완료 시 카드 상태 변경 확인

#### 2.2.2 충돌 해결 E2E

```
Flow: spec-generator 진입 → 자연어 입력 → Generate 클릭
  → 충돌 감지 시 ConflictCard 표시
  → 충돌별 수락/거절/수정 선택
  → 해결 완료 → 최종 확정
```

테스트 케이스:
1. **충돌 없음**: 정상 생성 후 결과 표시
2. **충돌 감지**: ConflictCard 렌더링 + severity별 스타일 확인
3. **충돌 해결**: 수락 클릭 → resolve API 호출 → resolved 상태 UI

#### 2.2.3 SSE 연결 라이프사이클 E2E

```
Flow: 대시보드 진입 → SSE 연결 확인
  → 네트워크 끊김 시뮬레이션 → 재연결 확인
  → 정상 데이터 수신 확인
```

#### 2.2.4 API 통합 테스트 추가

Playwright E2E 외에 API 레벨 통합 테스트도 보강:

| 테스트 파일 | 범위 | 예상 |
|------------|------|:----:|
| `agent-execute-integration.test.ts` | executeTask → SSE 이벤트 검증 | ~5 |
| `conflict-resolution-integration.test.ts` | generate → detect → resolve 전체 흐름 | ~4 |

#### 2.2.5 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/web/e2e/agent-execute.spec.ts` | 신규 — 에이전트 실행 E2E 3건 |
| `packages/web/e2e/conflict-resolution.spec.ts` | 신규 — 충돌 해결 E2E 3건 |
| `packages/web/e2e/sse-lifecycle.spec.ts` | 신규 — SSE 연결 라이프사이클 2건 |
| `packages/api/src/__tests__/agent-execute-integration.test.ts` | 신규 — API 통합 ~5건 |
| `packages/api/src/__tests__/conflict-resolution-integration.test.ts` | 신규 — API 통합 ~4건 |

**테스트 예상**: E2E 8건 + API 통합 9건 = ~17건

---

### 2.3 F57: 프로덕션 배포 자동화 — CI/CD 파이프라인 (P2)

**목표**: PR merge 시 자동 배포가 실행되고, staging/production 환경이 분리되어 안전한 배포가 가능하다.

#### 2.3.1 wrangler.toml 환경 설정

현재 wrangler.toml에 환경 변수가 하드코딩되어 있어요. 환경별 분리:

```toml
# packages/api/wrangler.toml
name = "foundry-x-api"
main = "src/index.ts"

[vars]
ENVIRONMENT = "production"

# staging 환경 (--env staging)
[env.staging]
name = "foundry-x-api-staging"
[env.staging.vars]
ENVIRONMENT = "staging"
```

#### 2.3.2 deploy.yml 환경 분리

```yaml
# 현재: push to master → deploy
# 변경: master push → production, PR → staging (optional)

jobs:
  deploy-api:
    # production: 기존 유지
    # staging: --env staging 추가 (PR용 프리뷰)

  deploy-web:
    # production: 기존 유지
    # staging: wrangler pages deploy --branch staging
```

#### 2.3.3 Smoke Test 강화

현재 smoke-test.sh 확장:
- health check + auth flow + spec-generate + **agent execute** + **SSE 연결**

#### 2.3.4 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/api/wrangler.toml` | ENVIRONMENT var + staging 환경 추가 |
| `.github/workflows/deploy.yml` | staging/production 분리 + 환경 변수 |
| `scripts/smoke-test.sh` | 에이전트 실행 + SSE 테스트 추가 |

**테스트 예상**: smoke-test 확장 (CI 레벨, 별도 테스트 카운트 없음)

---

### 2.4 F58: MCP 실 구현 설계 — McpAgentRunner 계획 (P2)

**목표**: MCP(Model Context Protocol) 1.0 스펙을 리뷰하고, McpAgentRunner의 구현 계획을 수립하여 Sprint 12+에서 외부 AI 에이전트 연동이 가능하도록 설계한다.

#### 2.4.1 MCP 1.0 스펙 리뷰 항목

| 항목 | 검토 내용 |
|------|----------|
| Transport | stdio vs SSE vs HTTP — Cloudflare Workers 호환성 확인 |
| Tools | MCP tool 등록/호출 프로토콜 — AgentRunner.execute()와 매핑 |
| Resources | MCP resource 읽기 — Git 리포 파일을 리소스로 노출 가능성 |
| Prompts | MCP prompt 템플릿 — taskType별 프롬프트와 연동 |
| Sampling | MCP sampling — LLM 호출 위임 패턴 |

#### 2.4.2 McpTransport 구현 계획

Sprint 10의 stub 인터페이스를 구체화:

```typescript
// 구현 우선순위
// 1. SSE Transport (Workers 호환, 가장 적합)
// 2. HTTP Transport (범용, fallback)
// 3. stdio Transport (로컬 개발용, Workers 미지원)

class SseTransport implements McpTransport {
  readonly type = 'sse';
  // EventSource 기반 연결 — sse-client.ts 패턴 재활용
}

class HttpTransport implements McpTransport {
  readonly type = 'http';
  // fetch 기반 요청-응답 — 가장 단순
}
```

#### 2.4.3 McpAgentRunner 구현 계획

```typescript
class McpRunner implements McpAgentRunner {
  readonly type = 'mcp';

  // AgentRunner.execute() → MCP tool.call() 변환
  // 1. taskType → MCP tool name 매핑
  // 2. context → MCP tool input 변환
  // 3. MCP 서버에 tool.call() 요청
  // 4. MCP 응답 → AgentExecutionResult 변환
}
```

#### 2.4.4 설계 문서 산출물

`docs/02-design/features/mcp-protocol.design.md` 작성:
- MCP 1.0 프로토콜 요약
- Foundry-X 연동 아키텍처
- McpTransport 구현 명세
- McpAgentRunner 구현 명세
- 외부 MCP 서버 연동 시나리오 (Claude Desktop, Cursor 등)

#### 2.4.5 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `docs/02-design/features/mcp-protocol.design.md` | 신규 — MCP 프로토콜 설계 문서 |
| `packages/api/src/services/mcp-adapter.ts` | stub 보강 — 구현 계획 주석 + 타입 구체화 |

**테스트 예상**: 설계 문서 중심이므로 코드 테스트 ~2건 (타입 검증)

---

## 3. Technical Architecture

### 3.1 Sprint 11 변경 아키텍처

```
┌────────────────────────────────────────────────────────┐
│                    Sprint 11 변경                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Web Dashboard (Next.js)                 │  │
│  │                                                   │  │
│  │  agents/page.tsx                                  │  │
│  │    ├─ onActivity (기존)                            │  │
│  │    ├─ onStatus  (F55 신규) ← task.started/completed│  │
│  │    └─ onError   (F55 신규) ← 에러 알림             │  │
│  │                                                   │  │
│  │  AgentCard — 실시간 작업 상태 배지 (F55)            │  │
│  │                                                   │  │
│  │  E2E Tests (F56)                                  │  │
│  │    ├─ agent-execute.spec.ts                       │  │
│  │    ├─ conflict-resolution.spec.ts                 │  │
│  │    └─ sse-lifecycle.spec.ts                       │  │
│  └──────────────────────────────────────────────────┘  │
│                        │ SSE                           │
│                        ▼                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │           API Server (Hono)                       │  │
│  │                                                   │  │
│  │  SSEManager (F55 확장)                             │  │
│  │    ├─ activity, status, error (기존)               │  │
│  │    ├─ agent.task.started (신규)                    │  │
│  │    ├─ agent.task.completed (신규)                  │  │
│  │    └─ pushEvent() (신규 — 직접 발행)               │  │
│  │                                                   │  │
│  │  AgentOrchestrator (F55 확장)                      │  │
│  │    └─ executeTask() → SSE 이벤트 발행              │  │
│  │                                                   │  │
│  │  MCP Adapter (F58 설계 보강)                       │  │
│  │    ├─ McpTransport 구현 계획                       │  │
│  │    └─ McpAgentRunner 구현 계획                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │           CI/CD (F57 자동화)                       │  │
│  │  deploy.yml                                       │  │
│  │    ├─ staging: PR → deploy --env staging           │  │
│  │    └─ production: master push → deploy             │  │
│  │  wrangler.toml                                    │  │
│  │    └─ [env.staging] 환경 분리                      │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 3.2 의존성 추가

| 패키지 | 목적 | 위치 |
|--------|------|------|
| (없음) | Sprint 11은 기존 의존성으로 충분 | — |

### 3.3 D1 스키마 변경

Sprint 11에서 D1 스키마 변경은 없음. Sprint 10의 10개 테이블 그대로 유지.

---

## 4. Implementation Plan

### 4.1 구현 순서

```
Phase A: SSE 이벤트 완성 (F55) — P1, 핵심
  A1. SSEManager에 agent.task.started/completed 이벤트 타입 추가
  A2. SSEManager.pushEvent() 직접 발행 메서드 구현
  A3. AgentOrchestrator constructor에 SSEManager 주입
  A4. executeTask()에 SSE 이벤트 발행 삽입 (step 3.5, 6.5)
  A5. shared/agent.ts에 TaskStartedData/TaskCompletedData 타입 추가
  A6. agents/page.tsx에 onStatus/onError 핸들러 연결
  A7. AgentCard에 실시간 작업 상태 배지 추가
  A8. 테스트: SSEManager 이벤트 + Orchestrator 통합 + 렌더링

Phase B: E2E 테스트 고도화 (F56) — P1
  B1. agent-execute.spec.ts — 에이전트 실행 E2E 3건
  B2. conflict-resolution.spec.ts — 충돌 해결 E2E 3건
  B3. sse-lifecycle.spec.ts — SSE 연결 라이프사이클 2건
  B4. agent-execute-integration.test.ts — API 통합 ~5건
  B5. conflict-resolution-integration.test.ts — API 통합 ~4건

Phase C: 배포 자동화 (F57) — P2
  C1. wrangler.toml staging 환경 설정
  C2. deploy.yml 환경 분리 (staging/production)
  C3. smoke-test.sh 에이전트 + SSE 검증 추가

Phase D: MCP 설계 (F58) — P2
  D1. MCP 1.0 스펙 리뷰 (공식 문서)
  D2. mcp-protocol.design.md 설계 문서 작성
  D3. mcp-adapter.ts 타입 구체화 + 구현 계획 주석

Phase A→B 순차 (SSE 완성 후 E2E 테스트), C/D는 독립 병렬 가능.
```

### 4.2 예상 산출물

| 카테고리 | 신규 파일 | 수정 파일 | 테스트 수 |
|---------|:--------:|:--------:|:--------:|
| F55 SSE | 0 | ~6 | ~10 |
| F56 E2E | ~5 | ~1 | ~17 |
| F57 배포 | 0 | ~3 | smoke |
| F58 MCP | ~1 | ~1 | ~2 |
| **합계** | ~6 | ~11 | ~29 |

**Sprint 11 완료 후 예상 테스트**: 276 (기존) + ~29 = ~305 tests
**E2E**: 10 (기존) + 8 = 18 E2E specs

### 4.3 Agent Teams 위임 전략

| Worker | 범위 | 금지 파일 |
|--------|------|----------|
| W1 (SSE + Orchestrator) | `sse-manager.ts`, `agent-orchestrator.ts`, `agent.ts` 라우트, shared 타입, 관련 테스트 | `packages/web/`, `packages/cli/`, `mcp-adapter.ts` |
| W2 (E2E Tests) | `packages/web/e2e/` 전체, API 통합 테스트 | `sse-manager.ts`, `agent-orchestrator.ts`, `mcp-adapter.ts` |
| Leader | agents/page.tsx UI, AgentCard, deploy.yml, wrangler.toml, MCP 설계 문서, SPEC 관리, 통합 검증 | — |

---

## 5. Risks & Mitigations

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|:----:|:----:|------|
| R1 | SSE pushEvent()가 D1 폴링과 충돌 | Medium | Medium | 이벤트 중복 제거 로직 추가 — taskId 기반 dedup. 폴링은 fallback으로 유지 |
| R2 | E2E 테스트 flaky (SSE 타이밍) | High | Medium | SSE 이벤트 대기에 waitForEvent 헬퍼 사용. 타임아웃 넉넉히 설정 (10s). 재시도 3회 |
| R3 | Playwright CI 환경에서 SSE 불안정 | Medium | Medium | Mock SSE 서버 사용 또는 MSW(Mock Service Worker) 도입 검토 |
| R4 | MCP 스펙 변경 | Low | Low | 설계 문서에 "MCP 1.0 기준" 명시, 구현은 Sprint 12+에서 최신 스펙 반영 |
| R5 | staging 환경 비용 | Low | Low | staging D1은 기존 DB 공유 또는 별도 생성. Workers 무료 티어 활용 |

---

## 6. Success Criteria

| 항목 | 기준 |
|------|------|
| **F55 SSE** | agents 페이지에서 에이전트 작업 실행 시 카드에 실시간 상태 변경 (started→running→completed) + SSE 이벤트 ~10건 테스트 통과 |
| **F56 E2E** | 에이전트 실행 E2E 3건 + 충돌 해결 E2E 3건 + SSE 라이프사이클 2건 + API 통합 9건 — 모두 CI green |
| **F57 배포** | staging 환경 분리 완료 + master push 시 production 자동 배포 + smoke test 통과 |
| **F58 MCP** | mcp-protocol.design.md 작성 완료 + mcp-adapter.ts 타입 구체화 + Sprint 12 구현 가능 수준 |
| **전체** | typecheck ✅, build ✅, ~305 tests ✅, E2E 18 specs ✅, PDCA Match Rate ≥ 90% |

---

## 7. Out of Scope

Sprint 11에서 명시적으로 제외하는 항목:

| 항목 | 사유 | 이관 |
|------|------|------|
| McpAgentRunner 구체 구현 | Sprint 11은 설계만, 구현은 MCP 스펙 확정 후 | Sprint 12 |
| 에이전트 자동 PR 생성 | GitHub API 통한 실 PR 생성은 보안 검토 후 | Sprint 12+ |
| v1.0.0 릴리스 | Sprint 11 완료 후 안정화 확인 필요 | Sprint 12 |
| 멀티테넌시 | Phase 3 범위 (PRD §8) | Phase 3 |
| 외부 도구 연동 (Jira, Slack) | Phase 3 범위 | Phase 3 |
| 에이전트 브라우저 연동 (Playwright) | Phase 3 고급 기능 | Phase 3 |
| npm publish foundry-x@0.11.0 | CLI 변경 없음 | 변경 시 추가 |
| resolve 핸들러 resolved_by userId | Sprint 10 미완 Low priority 잔여 | Sprint 11 내 또는 12 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — F55~F58 계획 (SSE+E2E+배포+MCP) | Sinclair Seo |
