---
code: FX-DSGN-005
title: Sprint 5 (v0.5.0) — Frontend Design + 하네스 산출물 확장 상세 설계
version: 0.2
status: Draft
category: DSGN
system-version: 0.5.0
created: 2026-03-17
updated: 2026-03-17
author: Sinclair Seo
---

# Sprint 5 (v0.5.0) Design Document

> **Summary**: 3-Layer 아키텍처 (Data → Core → Presentation)로 CLI 하네스 확장과 웹 대시보드를 유기적으로 통합하는 상세 설계. Part B(하네스) 완료, Part A(Frontend) 설계 중심.
>
> **Project**: Foundry-X
> **Version**: 0.5.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-17
> **Status**: Draft (Part B 완료 반영)
> **Planning Doc**: [sprint-5.plan.md](../../01-plan/features/sprint-5.plan.md)

---

## 0. Part B 완료 현황

Part B (F32~F36 하네스 산출물 확장)은 별도 세션에서 구현 완료.

| F# | 제목 | 상태 | 비고 |
|----|------|:----:|------|
| F32 | 동적 ARCHITECTURE.md 생성 | ✅ | Builder 패턴 + Dual Output |
| F33 | 동적 CONSTITUTION.md 생성 | ✅ | 스택별 규칙 |
| F34 | 동적 CLAUDE.md + AGENTS.md | ✅ | 커맨드 자동 감지 |
| F35 | verify.ts 강화 | ✅ | 플레이스홀더 + 일관성 |
| F36 | 하네스 신선도 검사 | ✅ | status 표시 |

**성과**: 106 tests, Match Rate 93%

이 Design 문서는 **Part A (F26~F31 Frontend Design)** 구현을 위한 상세 설계에 집중.
Part B 설계 내용은 §4에 참조용으로 유지.

---

## 1. Overview

### 1.1 Design Goals

1. **Dual Output 활용** — Part B에서 구축한 `.foundry-x/*.json` 데이터를 Web이 직접 소비
2. **Core 공유** — Part B에서 분리한 `@foundry-x/core` 함수를 API 서버가 호출
3. **Section Ownership 연동** — Wiki 편집 시 `<!-- foundry-x:auto -->` 섹션 보호 (D3)
4. **점진적 Phase 2 진입** — DB 없이 JSON 파일 기반으로 시작

### 1.2 Design Principles

- **Git이 진실**: `.foundry-x/*.json` + Markdown 문서가 SSOT
- **같은 데이터, 두 가지 뷰**: CLI(Ink TUI)와 Web(React)은 같은 Core 함수를 소비
- **최소 침습 확장**: 기존 106개 테스트에 breaking change 없이 패키지 추가

### 1.3 Key Architectural Decisions

| # | 결정 | 선택 | 근거 |
|---|------|------|------|
| D1 | RepoProfile 퍼시스턴스 | `.foundry-x/repo-profile.json` (DB 없음) | Phase 1 원칙. API가 JSON 직접 serve |
| D2 | 검증 로직 위치 | `@foundry-x/core` (Part B에서 구축 완료) | CLI·API 양쪽에서 호출 가능 |
| D3 | 문서 소유권 | 섹션별 마커 (Part B에서 구현 완료) | Wiki 편집 시 auto 섹션 보호 |

---

## 2. Architecture

### 2.1 3-Layer Overview

```
┌───────────────────────────────────────────────────────────────┐
│ Layer 3: Presentation                                         │
│ ┌─────────────────────┐  ┌──────────────────────────────────┐ │
│ │ CLI (packages/cli)  │  │ Web (packages/web)    [신규]     │ │
│ │ Ink TUI ✅ 완료      │  │ Next.js 14 + shadcn/ui           │ │
│ │ init, status, sync  │  │ Dashboard, Wiki, Agent, Token    │ │
│ └──────────┬──────────┘  └───────────────┬──────────────────┘ │
│            │                             │                     │
│ ┌──────────┴─────────────────────────────┴──────────────────┐ │
│ │ API (packages/api) [신규] — Hono                          │ │
│ │ /profile, /integrity, /health, /freshness, /wiki, ...     │ │
│ └──────────────────────────┬────────────────────────────────┘ │
├────────────────────────────┼──────────────────────────────────┤
│ Layer 2: Core (packages/core) ✅ Part B에서 구축              │
│ ┌──────────────────────────┴────────────────────────────────┐ │
│ │ analyze()   verifyHarness()   computeHealth()             │ │
│ │ checkFreshness()   build*()   mergeWithOwnership()        │ │
│ └──────────────────────────┬────────────────────────────────┘ │
├────────────────────────────┼──────────────────────────────────┤
│ Layer 1: Data ✅ Part B에서 구축                               │
│ │ .foundry-x/  (config, repo-profile, integrity, freshness) │ │
│ │ Git Documents (ARCHITECTURE.md, CONSTITUTION.md, ...)     │ │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 신규 패키지 구조 (Part A)

```
packages/
├── api/                # [신규] Hono API 서버
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── profile.ts      # GET /api/profile
│   │   │   ├── integrity.ts    # GET /api/integrity
│   │   │   ├── health.ts       # GET /api/health
│   │   │   ├── freshness.ts    # GET /api/freshness
│   │   │   ├── wiki.ts         # CRUD /api/wiki
│   │   │   ├── requirements.ts # CRUD /api/requirements
│   │   │   ├── agent.ts        # GET /api/agents + SSE
│   │   │   └── token.ts        # GET /api/tokens
│   │   └── services/
│   │       └── git-reader.ts   # Git 파일 읽기
│   ├── package.json
│   └── tsconfig.json
│
└── web/                # [신규] Next.js 14 대시보드
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx             # F26 대시보드
    │   │   ├── wiki/page.tsx        # F27 Wiki
    │   │   ├── architecture/page.tsx # F28 아키텍처 뷰
    │   │   ├── workspace/page.tsx   # F29 개인 워크스페이스
    │   │   ├── agents/page.tsx      # F30 Agent 투명성
    │   │   └── tokens/page.tsx      # F31 Token 관리
    │   ├── components/
    │   │   ├── ui/                  # shadcn/ui 기본
    │   │   └── feature/             # 도메인 컴포넌트
    │   │       ├── DashboardCard.tsx
    │   │       ├── HarnessHealth.tsx     # F36 데이터 소비
    │   │       ├── ModuleMap.tsx         # F32 JSON 소비
    │   │       ├── AgentCard.tsx         # F30 Agent 프로필
    │   │       ├── MarkdownViewer.tsx    # F27 문서 뷰어
    │   │       ├── MermaidDiagram.tsx    # F28 다이어그램
    │   │       └── TokenUsageChart.tsx   # F31 비용 차트
    │   └── lib/
    │       ├── api-client.ts
    │       └── stores/
    │           ├── dashboard.ts     # Zustand
    │           └── agent.ts
    ├── package.json
    └── tsconfig.json
```

---

## 3. Data Model (Part A 전용)

### 3.1 신규 타입 — 웹 도메인 (packages/shared/src/web.ts)

```typescript
/** F27: Wiki 페이지 */
export interface WikiPage {
  slug: string;
  title: string;
  content: string;
  filePath: string;
  lastModified: string;
  author: string;
}

/** F28: 요구사항 아이템 (SPEC.md F-item 파싱) */
export interface RequirementItem {
  id: string;               // F26, F27, ...
  reqCode: string;          // FX-REQ-026
  title: string;
  version: string;
  status: 'planned' | 'in_progress' | 'done';
  note: string;
}

/** F29: 개인 워크스페이스 */
export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  assignee: string;
  createdAt: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  read: boolean;
  sentAt: string;
}
```

### 3.2 신규 타입 — Agent 도메인 (packages/shared/src/agent.ts)

```typescript
/** F30: Agent 통합 프로필 = Capability + Constraint + Activity */
export interface AgentProfile {
  id: string;
  name: string;
  capabilities: AgentCapability[];   // from AGENTS.md (F34 생성)
  constraints: AgentConstraint[];    // from CONSTITUTION.md (F33 생성)
  activity?: AgentActivity;          // runtime (F30)
}

export interface AgentCapability {
  action: string;
  scope: string;
  tools: string[];
}

export interface AgentConstraint {
  tier: 'always' | 'ask' | 'never';
  rule: string;
  reason: string;
}

export type AgentStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'error';

export interface AgentActivity {
  status: AgentStatus;
  currentTask?: string;
  startedAt?: string;
  progress?: number;
  tokenUsed?: number;
}

/** F31: Token 사용량 */
export interface TokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: string;
  agentId?: string;
}

export interface TokenSummary {
  period: string;
  totalCost: number;
  byModel: Record<string, { tokens: number; cost: number }>;
  byAgent: Record<string, { tokens: number; cost: number }>;
}

/** F31: LLM Fallback */
export interface LLMFallbackConfig {
  providers: LLMProvider[];
  healthCheckInterval: number;
  maxRetries: number;
}

export interface LLMProvider {
  name: string;
  model: string;
  apiKeyEnv: string;
  priority: number;
  healthy: boolean;
}
```

---

## 4. Part B 설계 (구현 완료 — 참조용)

### 4.1 Builder Dual Output

각 Builder가 `{ markdown, json }` 동시 생산. Markdown은 Git, JSON은 `.foundry-x/`.

### 4.2 Section Ownership (D3)

`<!-- foundry-x:auto start="..." -->` / `<!-- user:custom start="..." -->` 마커로 자동/수동 영역 분리.
`mergeWithOwnership()`이 재실행 시 auto만 갱신, custom 보존.

### 4.3 verify.ts 강화

플레이스홀더 잔존, 모듈 맵 일관성, 소유권 마커 무결성 검증.

### 4.4 freshness.ts

하네스 파일 mtime vs git 마지막 커밋일 비교 → `.foundry-x/freshness.json` 캐시.

---

## 5. Part A 상세 설계 — Frontend Design

### 5.1 F26: 팀 정보 공유 대시보드

**페이지**: `/`

**위젯-API-Core 매핑**:

| 위젯 | API | Core 함수 | 데이터 소스 |
|------|-----|-----------|-------------|
| SDD Triangle Score | `GET /api/health` | `computeHealth()` | Plumb SyncResult |
| Sprint Status | `GET /api/requirements` | — | SPEC.md 파싱 |
| Harness Health | `GET /api/integrity` | `verifyHarness()` | `.foundry-x/integrity.json` |
| Harness Freshness | `GET /api/freshness` | `checkFreshness()` | `.foundry-x/freshness.json` |
| Team Activity | `GET /api/agents` | — | `.foundry-x/activity.json` |

### 5.2 F27: Human Readable Document + Wiki

**페이지**: `/wiki`

- **읽기**: API가 Git `.md` 파일 → `MarkdownViewer.tsx` 렌더링 (react-markdown + rehype)
- **편집**: `<!-- foundry-x:auto -->` 섹션 = 읽기 전용 (회색 + 자물쇠). `<!-- user:custom -->` = 편집 가능
- **저장**: `PUT /api/wiki/:slug` → custom 섹션만 파일 쓰기 → Git commit은 사용자 명시 실행

**API**:

| Method | Path | 기능 |
|--------|------|------|
| GET | `/api/wiki` | 문서 목록 |
| GET | `/api/wiki/:slug` | 단일 문서 |
| PUT | `/api/wiki/:slug` | 수정 (user:custom만) |
| POST | `/api/wiki` | 새 Wiki 페이지 |
| DELETE | `/api/wiki/:slug` | 삭제 |

### 5.3 F28: 아키텍처 뷰

**페이지**: `/architecture`

**탭**: Module Map | Diagram | BluePrint | Roadmap | ChangeLog | Requirements

| 탭 | 데이터 소스 | Part B 연동 |
|----|-----------|-------------|
| Module Map | `.foundry-x/architecture.json` | F32 JSON 직접 소비 (파싱 불필요) |
| Diagram | ARCHITECTURE.md Mermaid 블록 | `MermaidDiagram.tsx` |
| Requirements | SPEC.md F-items | `PUT /api/requirements/:id` 상태 CRUD |
| Roadmap/ChangeLog | Markdown 렌더링 | `MarkdownViewer.tsx` 재사용 |

### 5.4 F29: 개인 워크스페이스

**페이지**: `/workspace`

| 영역 | 저장소 | Git 추적 |
|------|--------|:--------:|
| ToDo | `.foundry-x/workspace/{userId}/todos.json` | ✗ (.gitignore) |
| Messages | `.foundry-x/workspace/{userId}/messages.json` | ✗ |
| Settings | `.foundry-x/workspace/{userId}/settings.json` | ✗ |

### 5.5 F30: Agent 투명성 뷰

**페이지**: `/agents`

**Agent Card = 3소스 통합** (F33+F34+F30):

```
AgentCapability[]  (AGENTS.md, F34 생성)    ─┐
AgentConstraint[]  (CONSTITUTION.md, F33)     ├→ AgentProfile → AgentCard.tsx
AgentActivity      (.foundry-x/activity.json) ─┘
```

**SSE 실시간**: `GET /api/agents/stream` → `event: activity` 이벤트

### 5.6 F31: Token/비용 관리

**페이지**: `/tokens`

- **데이터**: `.foundry-x/token-usage.jsonl` (append-only). API가 집계 → `TokenSummary`
- **Fallback**: `LLMFallbackConfig` 기반, 프로바이더 health check → 장애 시 자동 전환
- **Gateway**: API 키 관리, rate limit, 라우팅 UI

---

## 6. API 엔드포인트 전체 목록

| Method | Path | Response | F# |
|--------|------|----------|:--:|
| GET | `/api/profile` | `RepoProfile` | F32 |
| GET | `/api/integrity` | `HarnessIntegrity` | F35 |
| GET | `/api/health` | `HealthScore` | F26 |
| GET | `/api/freshness` | `FreshnessReport` | F36 |
| GET | `/api/requirements` | `RequirementItem[]` | F28 |
| PUT | `/api/requirements/:id` | `RequirementItem` | F28 |
| GET | `/api/wiki` | `WikiPage[]` | F27 |
| GET | `/api/wiki/:slug` | `WikiPage` | F27 |
| PUT | `/api/wiki/:slug` | `WikiPage` | F27 |
| POST | `/api/wiki` | `WikiPage` | F27 |
| DELETE | `/api/wiki/:slug` | `void` | F27 |
| GET | `/api/agents` | `AgentProfile[]` | F30 |
| GET | `/api/agents/stream` | SSE | F30 |
| GET | `/api/tokens/summary` | `TokenSummary` | F31 |
| GET | `/api/tokens/usage` | `TokenUsage[]` | F31 |

---

## 7. 구현 순서

### Sub-Sprint B: API + 핵심 웹 (Week 1-2)

| # | 작업 | F# |
|:-:|------|:--:|
| 1 | `packages/api` scaffolding (Hono + tsconfig + turborepo) | — |
| 2 | `packages/web` scaffolding (Next.js 14 + shadcn/ui + turborepo) | — |
| 3 | shared 타입 확장 (web.ts, agent.ts) | — |
| 4 | API: profile, integrity, health, freshness 엔드포인트 | F26, F36 |
| 5 | Web: 대시보드 (SDD Triangle + Sprint + Harness Health) | F26 |
| 6 | API: wiki CRUD | F27 |
| 7 | Web: Wiki (MarkdownViewer + 소유권 마커 UI) | F27 |
| 8 | API: requirements CRUD | F28 |
| 9 | Web: 아키텍처 뷰 (ModuleMap + Mermaid + Roadmap) | F28 |

### Sub-Sprint C: 고급 기능 (Week 2-3)

| # | 작업 | F# |
|:-:|------|:--:|
| 10 | Web: 개인 워크스페이스 (ToDo + Message + Setting) | F29 |
| 11 | Agent 타입 + AgentProfile 구성 로직 | F30 |
| 12 | API: agents + SSE stream | F30 |
| 13 | Web: Agent 투명성 뷰 (AgentCard) | F30 |
| 14 | Token 타입 + 집계 + Fallback Config | F31 |
| 15 | API: tokens 엔드포인트 | F31 |
| 16 | Web: Token 관리 페이지 | F31 |

### Sub-Sprint D: 테스트 + 안정화 (Week 3-4)

| # | 작업 | F# |
|:-:|------|:--:|
| 17 | API 엔드포인트 테스트 (hono/testing) | — |
| 18 | Web 컴포넌트 테스트 (@testing-library/react) | — |
| 19 | 기존 106개 regression + 전체 통합 | — |
| 20 | v0.5.0 버전 범프 + CHANGELOG | — |

---

## 8. 테스트 전략

| 레이어 | 대상 | 도구 | 목표 |
|--------|------|------|------|
| API 통합 | Hono 엔드포인트 | vitest + hono/testing | 응답 형태·상태 코드 |
| Web 컴포넌트 | React 컴포넌트 | vitest + @testing-library/react | 렌더링·인터랙션 |
| CLI 회귀 | 기존 106개 | vitest + ink-testing-library | 깨지면 안 됨 |

---

## 9. F-item ↔ 파일 매핑

| F# | 주요 신규 파일 |
|----|---------------|
| F26 | `web/src/app/page.tsx`, `web/src/components/feature/DashboardCard.tsx`, `web/src/components/feature/HarnessHealth.tsx` |
| F27 | `api/src/routes/wiki.ts`, `web/src/app/wiki/page.tsx`, `web/src/components/feature/MarkdownViewer.tsx` |
| F28 | `api/src/routes/requirements.ts`, `web/src/app/architecture/page.tsx`, `web/src/components/feature/ModuleMap.tsx`, `web/src/components/feature/MermaidDiagram.tsx` |
| F29 | `web/src/app/workspace/page.tsx` |
| F30 | `api/src/routes/agent.ts`, `web/src/app/agents/page.tsx`, `web/src/components/feature/AgentCard.tsx` |
| F31 | `api/src/routes/token.ts`, `web/src/app/tokens/page.tsx`, `web/src/components/feature/TokenUsageChart.tsx` |

---

## 10. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-17 | Initial draft — 하네스 전용 설계 | Sinclair Seo |
| 0.2 | 2026-03-17 | Part B 완료 반영 + Part A Frontend Design 통합 설계 | Sinclair Seo |
