# Sprint 5 Part A Gap Analysis Report (F26~F31)

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: Foundry-X
> **Version**: v0.5.0
> **Analyst**: Claude (gap-detector)
> **Date**: 2026-03-17
> **Iteration**: 2 (post Iteration 1 fixes)
> **Design Doc**: [sprint-5.design.md](../../02-design/features/sprint-5.design.md) (Section 5~7)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Sprint 5 Part A (F26~F31 Frontend Design) Iteration 1 수정 후, 설계 문서 대비 실제 구현의 일치도를 재측정하고 남은 차이점을 식별해요.

### 1.2 Iteration 1 Fix Summary

| # | 수정 사항 | 반영 상태 | 검증 결과 |
|:-:|----------|:---------:|-----------|
| 1 | Wiki CRUD (POST + DELETE) | Resolved | `wiki.ts:128-187` POST /wiki + DELETE /wiki/:slug 완전 구현 |
| 2 | PUT /requirements/:id | Resolved | `requirements.ts:63-93` mock statusOverrides 방식 구현 |
| 3 | Architecture 탭 4개 | Partially Resolved | modules, diagram, roadmap, requirements 탭 구현. ChangeLog/BluePrint 미구현, Mermaid는 소스 텍스트 표시 |
| 4 | Feature 컴포넌트 3개 분리 | Resolved | `components/feature/AgentCard.tsx`, `DashboardCard.tsx`, `MarkdownViewer.tsx` 생성 |
| 5 | SSE EventSource 연결 | Resolved | `agents/page.tsx:39-56` EventSource + activity 이벤트 수신 |

### 1.3 Analysis Scope

- **Design Document**: `docs/02-design/features/sprint-5.design.md` (S5 Part A, S6 API, S7 구현 순서)
- **Implementation Paths**:
  - `packages/api/src/` (Hono API 서버)
  - `packages/web/src/` (Next.js 14 대시보드)
  - `packages/shared/src/` (공유 타입)
- **Analysis Date**: 2026-03-17

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 API Endpoints (Design S6)

| Method | Path | Design F# | Implementation | Status | Notes |
|--------|------|:---------:|----------------|:------:|-------|
| GET | `/api/profile` | F32 | `routes/profile.ts` | Match | |
| GET | `/api/integrity` | F35 | `routes/integrity.ts` | Match | |
| GET | `/api/health` | F26 | `routes/health.ts` | Match | Mock 데이터 반환 |
| GET | `/api/freshness` | F36 | `routes/freshness.ts` | Match | |
| GET | `/api/requirements` | F28 | `routes/requirements.ts` | Match | SPEC.md 파싱 |
| PUT | `/api/requirements/:id` | F28 | `routes/requirements.ts:66-93` | Match | [Iter1] mock statusOverrides |
| GET | `/api/wiki` | F27 | `routes/wiki.ts` | Match | |
| GET | `/api/wiki/:slug` | F27 | `routes/wiki.ts` | Match | |
| PUT | `/api/wiki/:slug` | F27 | `routes/wiki.ts` | Match | |
| POST | `/api/wiki` | F27 | `routes/wiki.ts:128-171` | Match | [Iter1] filePath + content + title |
| DELETE | `/api/wiki/:slug` | F27 | `routes/wiki.ts:174-187` | Match | [Iter1] unlink |
| GET | `/api/agents` | F30 | `routes/agent.ts` | Match | |
| GET | `/api/agents/stream` | F30 | `routes/agent.ts` | Match | SSE 구현 |
| GET | `/api/tokens/summary` | F31 | `routes/token.ts` | Match | JSONL 파싱 + 집계 |
| GET | `/api/tokens/usage` | F31 | `routes/token.ts` | Match | |

**API Match Rate: 15/15 (100%)** [was 80%]

### 2.2 Data Types (Design S3)

변경 없음 -- 이전 분석과 동일.

**Data Type Match Rate: 15/15 (100%)**

### 2.3 Package Structure (Design S2.2)

| Design Path | Implementation | Status | Notes |
|-------------|----------------|:------:|-------|
| `packages/api/src/index.ts` | 존재 | Match | Hono app + serve |
| `packages/api/src/routes/profile.ts` | 존재 | Match | |
| `packages/api/src/routes/integrity.ts` | 존재 | Match | |
| `packages/api/src/routes/health.ts` | 존재 | Match | |
| `packages/api/src/routes/freshness.ts` | 존재 | Match | |
| `packages/api/src/routes/wiki.ts` | 존재 | Match | 5 methods (GET list, GET slug, PUT, POST, DELETE) |
| `packages/api/src/routes/requirements.ts` | 존재 | Match | GET + PUT |
| `packages/api/src/routes/agent.ts` | 존재 | Match | |
| `packages/api/src/routes/token.ts` | 존재 | Match | |
| `packages/api/src/services/git-reader.ts` | `data-reader.ts` | Changed | 파일명 변경: git-reader -> data-reader (범용화) |
| `packages/web/src/app/layout.tsx` | 존재 | Match | 네비게이션 포함 |
| `packages/web/src/app/page.tsx` | 존재 | Match | F26 대시보드 |
| `packages/web/src/app/wiki/page.tsx` | 존재 | Match | F27 Wiki |
| `packages/web/src/app/architecture/page.tsx` | 존재 | Match | F28 아키텍처 |
| `packages/web/src/app/workspace/page.tsx` | 존재 | Match | F29 워크스페이스 |
| `packages/web/src/app/agents/page.tsx` | 존재 | Match | F30 Agent |
| `packages/web/src/app/tokens/page.tsx` | 존재 | Match | F31 Token |
| `packages/web/src/components/ui/` | 미존재 | Missing | shadcn/ui 컴포넌트 미설치 |
| `packages/web/src/components/feature/DashboardCard.tsx` | 존재 | Match | [Iter1] 별도 파일 분리 |
| `packages/web/src/components/feature/HarnessHealth.tsx` | 미존재 (page.tsx inline) | Missing | page.tsx에 인라인 렌더링 |
| `packages/web/src/components/feature/ModuleMap.tsx` | 미존재 (architecture/page.tsx inline) | Missing | |
| `packages/web/src/components/feature/AgentCard.tsx` | 존재 | Match | [Iter1] 별도 파일 분리 |
| `packages/web/src/components/feature/MarkdownViewer.tsx` | 존재 | Changed | [Iter1] 별도 파일 분리, 단 `<pre>` 방식 (react-markdown 미사용) |
| `packages/web/src/components/feature/MermaidDiagram.tsx` | 미존재 | Missing | Mermaid 라이브러리 렌더링 미구현 |
| `packages/web/src/components/feature/TokenUsageChart.tsx` | 미존재 | Missing | CostTable이 tokens/page.tsx에 인라인 |
| `packages/web/src/lib/api-client.ts` | 존재 | Match | fetchApi + ApiError |
| `packages/web/src/lib/stores/dashboard.ts` | 미존재 | Missing | Zustand 스토어 미구현 |
| `packages/web/src/lib/stores/agent.ts` | 미존재 | Missing | Zustand 스토어 미구현 |

**Structure Match Rate: 21/28 (75%)** [was 64%]

### 2.4 Feature Comparison (Design S5)

#### 2.4.1 F26: Team Dashboard (`/`)

| Design Requirement | Implementation | Status | Notes |
|--------------------|----------------|:------:|-------|
| SDD Triangle Score 위젯 | `useApi<HealthScore>("/health")` + 렌더링 | Match | overall%, grade, 3축 점수 |
| Sprint Status 위젯 | `useApi<RequirementItem[]>("/requirements")` + 카운트 | Match | done/inProgress/planned |
| Harness Health 위젯 | `useApi<HarnessIntegrity>("/integrity")` + score/checks | Match | |
| Harness Freshness 위젯 | `useApi<FreshnessReport>("/freshness")` + stale/fresh | Match | |
| Team Activity 위젯 (`GET /api/agents`) | 미구현 | Missing | 대시보드에 Agent 활동 위젯 없음 |

**F26 Score: 4/5 (80%)** [unchanged]

#### 2.4.2 F27: Wiki (`/wiki`)

| Design Requirement | Implementation | Status | Notes |
|--------------------|----------------|:------:|-------|
| 문서 목록 (`GET /api/wiki`) | 좌측 네비게이션 + 목록 | Match | |
| 단일 문서 읽기 (`GET /api/wiki/:slug`) | 선택 시 MarkdownViewer 사용 | Partial | content="" 빈 상태, slug별 개별 fetch 없음 |
| `MarkdownViewer.tsx` 렌더링 (react-markdown) | `<pre>` 기반 텍스트 표시 | Partial | [Iter1] 컴포넌트 분리됨, 단 react-markdown 미사용 |
| `<!-- foundry-x:auto -->` 읽기 전용 | 미구현 | Missing | 소유권 마커 UI 미구현 |
| `<!-- user:custom -->` 편집 가능 | 미구현 | Missing | 편집 UI 없음 |
| `PUT /api/wiki/:slug` 수정 (custom만) | API 존재, UI 미연결 | Partial | API는 전체 덮어쓰기, custom 분리 없음 |
| `POST /api/wiki` 새 페이지 생성 | API 구현 완료 | Match | [Iter1] `wiki.ts:128-171` |
| `DELETE /api/wiki/:slug` 삭제 | API 구현 완료 | Match | [Iter1] `wiki.ts:174-187` |

**F27 Score: 4.5/8 (56%)** [was 30%]

#### 2.4.3 F28: Architecture View (`/architecture`)

| Design Requirement | Implementation | Status | Notes |
|--------------------|----------------|:------:|-------|
| Module Map 탭 | `GET /api/profile` + modules 테이블 | Changed | JSON 직접 소비 대신 profile API 사용 |
| Diagram 탭 (Mermaid) | `<pre>` 소스 텍스트 표시 | Partial | [Iter1] 탭 존재, Mermaid 렌더링은 미구현 |
| Roadmap 탭 | 하드코딩 마일스톤 카드 + 상태 배지 | Changed | [Iter1] Markdown 렌더링 대신 구조화된 UI |
| Requirements 탭 | `GET /api/requirements` + 테이블 | Match | |
| Requirements 상태 CRUD | `PUT /api/requirements/:id` 존재 | Match | [Iter1] mock statusOverrides (UI 미연결) |
| ChangeLog 탭 | 미구현 | Missing | |
| BluePrint 탭 | 미구현 | Missing | |

**F28 Score: 4.5/7 (64%)** [was 28%]

#### 2.4.4 F29: Workspace (`/workspace`)

변경 없음 -- Iteration 1 수정 대상 아님.

| Design Requirement | Implementation | Status | Notes |
|--------------------|----------------|:------:|-------|
| ToDo 기능 | LocalStorage 기반 CRUD | Changed | Design: `.foundry-x/workspace/`, 구현: localStorage |
| Messages 기능 | LocalStorage 기반 | Changed | 동일 |
| Settings 기능 | LocalStorage 기반 | Changed | 동일 |
| `TodoItem` shared 타입 | 로컬 `Todo` 인터페이스 | Changed | `assignee`, `createdAt` 필드 미사용 |
| `Message` shared 타입 | 로컬 `Msg` 인터페이스 | Changed | `to`, `read` 필드 미사용 |

**F29 Score: 3/5 (60%)** [unchanged]

#### 2.4.5 F30: Agent Transparency (`/agents`)

| Design Requirement | Implementation | Status | Notes |
|--------------------|----------------|:------:|-------|
| AgentCard = 3소스 통합 | AgentProfile 기반 카드 렌더링 | Match | Capability + Constraint + Activity |
| `GET /api/agents` | Mock 데이터 + agents.json fallback | Match | |
| SSE 실시간 (`GET /api/agents/stream`) | ReadableStream + `event: activity` | Match | 5초 간격 |
| SSE 클라이언트 소비 | EventSource + activity 리스너 | Match | [Iter1] `agents/page.tsx:39-56` |
| AgentCard.tsx 별도 컴포넌트 | `components/feature/AgentCard.tsx` | Match | [Iter1] 별도 파일 분리 |

**F30 Score: 5/5 (100%)** [was 70%]

#### 2.4.6 F31: Token Management (`/tokens`)

변경 없음 -- Iteration 1 수정 대상 아님.

| Design Requirement | Implementation | Status | Notes |
|--------------------|----------------|:------:|-------|
| `GET /api/tokens/summary` | JSONL 파싱 + summarize + fallback | Match | |
| `GET /api/tokens/usage` | JSONL 파싱 + 최근 20건 | Match | |
| `TokenSummary` 표시 | totalCost + period + byModel + byAgent | Match | |
| `TokenUsageChart.tsx` (비용 차트) | CostTable 인라인 (테이블 + 비율 바) | Changed | 차트가 아닌 테이블 형태 |
| Fallback Config UI | 미구현 | Missing | `LLMFallbackConfig` 타입만 정의 |
| Gateway UI | 미구현 | Missing | |

**F31 Score: 3.5/6 (58%)** [unchanged]

---

## 3. Architecture Decision Compliance (D1~D3)

| # | Decision | Design | Implementation | Status |
|---|----------|--------|----------------|:------:|
| D1 | RepoProfile 퍼시스턴스 | `.foundry-x/repo-profile.json` (DB 없음) | `readJsonFile(foundryXPath("config.json"))` | Match |
| D2 | 검증 로직 위치 | `@foundry-x/core` | API에서 직접 JSON 읽기 (Core 함수 미호출) | Changed |
| D3 | 문서 소유권 마커 | 섹션별 마커로 auto/custom 분리 | Wiki PUT에서 전체 content 덮어쓰기 (마커 보호 없음) | Missing |

**D2 상세**: Design은 API가 `@foundry-x/core`의 `computeHealth()`, `verifyHarness()`, `checkFreshness()` 등을 호출하도록 명시했으나, 실제 구현에서는 API가 `.foundry-x/*.json` 파일을 직접 읽거나 Mock 데이터를 반환해요.

**D3 상세**: Wiki 편집 시 `<!-- foundry-x:auto -->` 섹션을 보호하는 로직이 API에도 Web에도 없어요.

---

## 4. File-Level Gap Summary

### 4.1 API Server (`packages/api/src/`)

| File | Design | Status | Notes |
|------|--------|:------:|-------|
| `index.ts` | 라우트 등록 | Match | - |
| `routes/profile.ts` | GET /api/profile | Match | - |
| `routes/integrity.ts` | GET /api/integrity | Match | - |
| `routes/health.ts` | GET /api/health | Changed | Mock 전용, Core 함수 미호출 |
| `routes/freshness.ts` | GET /api/freshness | Match | - |
| `routes/wiki.ts` | CRUD /api/wiki | Match | [Iter1] 5개 method 전부 구현 |
| `routes/requirements.ts` | CRUD /api/requirements | Match | [Iter1] GET + PUT |
| `routes/agent.ts` | GET + SSE | Match | - |
| `routes/token.ts` | GET summary + usage | Match | - |
| `services/data-reader.ts` | git-reader.ts (설계명) | Changed | 파일명 변경됨 |

### 4.2 Web Dashboard (`packages/web/src/`)

| File | Design | Status | Notes |
|------|--------|:------:|-------|
| `app/layout.tsx` | 레이아웃 + Nav | Match | - |
| `app/page.tsx` | F26 대시보드 | Changed | Team Activity 위젯 누락 |
| `app/wiki/page.tsx` | F27 Wiki | Changed | MarkdownViewer 사용, 편집 UI 없음 |
| `app/architecture/page.tsx` | F28 아키텍처 | Changed | [Iter1] 4탭 구현 (6개 중), Mermaid 소스만 |
| `app/workspace/page.tsx` | F29 워크스페이스 | Changed | localStorage, shared 타입 미사용 |
| `app/agents/page.tsx` | F30 Agent | Match | [Iter1] SSE 연결 + AgentCard import |
| `app/tokens/page.tsx` | F31 Token | Changed | Fallback/Gateway UI 없음 |
| `lib/api-client.ts` | API 클라이언트 | Match | - |
| `components/feature/DashboardCard.tsx` | 설계 일치 | Match | [Iter1] 분리 |
| `components/feature/AgentCard.tsx` | 설계 일치 | Match | [Iter1] 분리 |
| `components/feature/MarkdownViewer.tsx` | react-markdown 기반 | Changed | [Iter1] 분리, `<pre>` 방식 |
| `components/feature/HarnessHealth.tsx` | 별도 컴포넌트 | Missing | 인라인 |
| `components/feature/ModuleMap.tsx` | 별도 컴포넌트 | Missing | 인라인 |
| `components/feature/MermaidDiagram.tsx` | Mermaid 렌더링 | Missing | 미구현 |
| `components/feature/TokenUsageChart.tsx` | 비용 차트 | Missing | CostTable 인라인 |
| `components/ui/` | shadcn/ui | Missing | 미설치 |
| `lib/stores/*.ts` | Zustand 스토어 | Missing | 미구현 |

### 4.3 Shared Types (`packages/shared/src/`)

변경 없음 -- 전부 일치 (100%).

---

## 5. Match Rate Summary

```
+-----------------------------------------------+
|  Overall Match Rate: 84%                       |
+-----------------------------------------------+
|  Match:           42 items (63%)               |
|  Partial/Changed: 14 items (21%)               |
|  Missing:         10 items (15%)               |
+-----------------------------------------------+

  Iteration 0 (initial): 72%  (Match 35, Missing 17)
  Iteration 1 (current): 84%  (Match 42, Missing 10)
  Delta: +12pp, 7 items resolved
```

### 5.1 Category Scores

| Category | Iter 0 | Iter 1 | Delta | Status |
|----------|:------:|:------:|:-----:|:------:|
| API Endpoints | 80% | 100% | +20pp | Match |
| Data Types (shared) | 100% | 100% | -- | Match |
| Package Structure | 64% | 75% | +11pp | Changed |
| F26 Dashboard | 80% | 80% | -- | Changed |
| F27 Wiki | 30% | 56% | +26pp | Changed |
| F28 Architecture View | 28% | 64% | +36pp | Changed |
| F29 Workspace | 60% | 60% | -- | Changed |
| F30 Agent Transparency | 70% | 100% | +30pp | Match |
| F31 Token Management | 58% | 58% | -- | Changed |
| Architecture Decisions (D1~D3) | 33% | 33% | -- | Missing |
| **Overall** | **72%** | **84%** | **+12pp** | **Changed** |

---

## 6. Difference Classification

### 6.1 Resolved in Iteration 1

| # | Item | Original Severity | Resolution |
|:-:|------|:-----------------:|------------|
| 1 | `POST /api/wiki` | Major | `wiki.ts:128-171` 완전 구현 |
| 2 | `DELETE /api/wiki/:slug` | Major | `wiki.ts:174-187` 완전 구현 |
| 3 | `PUT /api/requirements/:id` | Major | `requirements.ts:66-93` mock statusOverrides |
| 4 | SSE 클라이언트 소비 | Minor | `agents/page.tsx:39-56` EventSource + activity 리스너 |
| 5 | AgentCard.tsx 파일 분리 | Minor | `components/feature/AgentCard.tsx` (260 LOC) |
| 6 | DashboardCard.tsx 파일 분리 | Minor | `components/feature/DashboardCard.tsx` (53 LOC) |
| 7 | MarkdownViewer.tsx 파일 분리 | Minor | `components/feature/MarkdownViewer.tsx` (50 LOC, `<pre>` 방식) |

### 6.2 Remaining Missing Features (Design O, Implementation X)

| # | Item | Design Location | Description | Severity |
|:-:|------|-----------------|-------------|:--------:|
| 1 | MarkdownViewer react-markdown | S5.2, S9 | 컴포넌트 분리 완료, 단 react-markdown 렌더링 미적용 (`<pre>` 유지) | Minor |
| 2 | `MermaidDiagram.tsx` | S5.3, S9 | Mermaid 라이브러리 렌더링 미구현 (소스 `<pre>` 표시) | Minor |
| 3 | Wiki 편집 UI | S5.2 | `<!-- user:custom -->` 영역 편집 기능 없음 | Major |
| 4 | Wiki 소유권 마커 보호 (D3) | S1.3, S5.2 | auto/custom 섹션 분리 및 보호 로직 없음 | Major |
| 5 | Architecture ChangeLog 탭 | S5.3 | 미구현 | Minor |
| 6 | Architecture BluePrint 탭 | S5.3 | 미구현 | Minor |
| 7 | Team Activity 위젯 | S5.1 | 대시보드에 Agent 활동 위젯 누락 | Minor |
| 8 | Fallback Config UI | S5.6 | LLM 프로바이더 health check/전환 UI 없음 | Minor |
| 9 | Gateway UI | S5.6 | API 키 관리, rate limit 라우팅 UI 없음 | Minor |
| 10 | `components/feature/` 미분리 4개 | S2.2 | HarnessHealth, ModuleMap, MermaidDiagram, TokenUsageChart | Minor |
| 11 | `components/ui/` (shadcn/ui) | S2.2 | shadcn/ui 기본 컴포넌트 미설치 | Minor |
| 12 | Zustand 스토어 | S2.2 | `lib/stores/dashboard.ts`, `lib/stores/agent.ts` 미구현 | Minor |
| 13 | Core 함수 호출 (D2) | S1.3, S5.1 | API가 Core 함수 미호출, JSON 직접 읽기 | Minor |

### 6.3 Added Features (Design X, Implementation O)

| # | Item | Implementation Location | Description |
|:-:|------|------------------------|-------------|
| 1 | `ApiError` 클래스 | `web/src/lib/api-client.ts` | 커스텀 에러 핸들링 |
| 2 | `useApi` custom hook | `web/src/app/page.tsx` | 비동기 상태 관리 |
| 3 | API health check `/` | `api/src/index.ts:15` | 루트 서비스 상태 |
| 4 | Roadmap 구조화 UI | `architecture/page.tsx:34-95` | 하드코딩 마일스톤 카드 (Markdown 대신) |

### 6.4 Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Severity |
|:-:|------|--------|----------------|:--------:|
| 1 | 서비스 파일명 | `services/git-reader.ts` | `services/data-reader.ts` | Minor |
| 2 | Workspace 저장소 | `.foundry-x/workspace/{userId}/*.json` | `localStorage` (브라우저) | Major |
| 3 | Workspace 타입 | shared `TodoItem`, `Message` | 로컬 `Todo`, `Msg` (필드 축소) | Major |
| 4 | Architecture Module Map | `.foundry-x/architecture.json` 직접 소비 | `GET /api/profile` -> `modules` | Minor |
| 5 | Token 비용 표시 | `TokenUsageChart.tsx` (차트) | `CostTable` (테이블 + 비율 바) | Minor |
| 6 | Wiki content 로딩 | 개별 slug fetch | content="" 빈 상태로 로드 | Minor |
| 7 | Diagram 탭 | MermaidDiagram.tsx 렌더링 | `<pre>` 소스 텍스트 | Minor |
| 8 | Roadmap 탭 | Markdown 렌더링 | 구조화된 마일스톤 카드 UI | Minor |

---

## 7. Architecture Compliance

### 7.1 3-Layer Architecture (Design S2.1)

| Layer | Design | Implementation | Status |
|-------|--------|----------------|:------:|
| Layer 3: Presentation (CLI) | 기존 Ink TUI | 변경 없음 | Match |
| Layer 3: Presentation (Web) | Next.js 14 + shadcn/ui | Next.js 14 (인라인 스타일, shadcn 없음) | Changed |
| Layer 3: Presentation (API) | Hono | Hono 구현 완료 | Match |
| Layer 2: Core | `@foundry-x/core` 함수 호출 | API에서 직접 파일 I/O | Changed |
| Layer 1: Data | `.foundry-x/*.json` + Git Docs | 동일 | Match |

### 7.2 Dependency Direction

| Source | Target | Design | Implementation | Status |
|--------|--------|--------|----------------|:------:|
| Web (page) | API (fetchApi) | Presentation -> API | `fetchApi("/health")` 등 | Match |
| Web (page) | Feature Components | Presentation import | `import AgentCard`, `import DashboardCard` | Match |
| API (route) | Core (functions) | API -> Core | 직접 파일 읽기 | Changed |
| API (route) | Data (JSON) | API -> Data | `readJsonFile()` | Match |
| Shared (types) | 없음 | 독립 | export만 | Match |

---

## 8. Convention Compliance

### 8.1 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Files (routes) | kebab-case.ts | 100% | - |
| Files (pages) | page.tsx | 100% | Next.js 규칙 준수 |
| Files (components) | PascalCase.tsx | 100% | AgentCard, DashboardCard, MarkdownViewer |
| Functions | camelCase | 100% | - |
| Types | PascalCase | 100% | - |
| Constants | UPPER_SNAKE_CASE | 100% | MOCK_PROFILE, MOCK_HEALTH, MERMAID_CODE, ROADMAP_MILESTONES |

### 8.2 Import Order

전체 파일 확인:
1. External (`hono`, `react`, `next`, `node:fs`) -- Match
2. Internal absolute (`@foundry-x/shared`) -- Match
3. Relative (`../../components/feature/AgentCard`) -- Match
4. Type imports (`import type`) -- Match

### 8.3 Folder Structure

| Expected | Exists | Status |
|----------|:------:|:------:|
| `api/src/routes/` | Yes | Match |
| `api/src/services/` | Yes | Match |
| `web/src/app/` | Yes | Match |
| `web/src/lib/` | Yes | Match |
| `web/src/components/` | Yes | Match |
| `web/src/components/ui/` | No | Missing |
| `web/src/components/feature/` | Yes | Match |
| `web/src/lib/stores/` | No | Missing |
| `shared/src/` | Yes | Match |

**Convention Score: 90%** [was 85%] (네이밍/임포트 100%, 폴더 구조 78%)

---

## 9. Overall Score

```
+-----------------------------------------------+
|  Overall Score: 84/100                         |
+-----------------------------------------------+
|  Design Match:           84%                   |
|  Architecture Compliance: 75%                  |
|  Convention Compliance:   90%                  |
+-----------------------------------------------+

| Category               | Iter 0 | Iter 1 | Status |
|------------------------|:------:|:------:|:------:|
| Design Match           |  72%   |  84%   |   !!   |
| Architecture Compliance|  70%   |  75%   |   !!   |
| Convention Compliance  |  85%   |  90%   |   !!   |
| **Overall**            |**72%** |**84%** |  **!!**|

!! = 90% threshold not met -- further iteration recommended
```

---

## 10. Recommended Actions (Iteration 2)

### 10.1 High Priority -- 90% 도달을 위한 핵심 항목

| # | Item | File | Description | Expected Impact |
|:-:|------|------|-------------|:---------------:|
| 1 | Wiki 소유권 마커 보호 (D3) | `api/routes/wiki.ts` + `web/wiki/page.tsx` | `<!-- foundry-x:auto -->` 읽기전용 + custom 편집 UI | +3pp |
| 2 | Workspace shared 타입 사용 | `web/workspace/page.tsx` | 로컬 `Todo`/`Msg` -> shared `TodoItem`/`Message` 교체 | +2pp |
| 3 | MarkdownViewer react-markdown | `components/feature/MarkdownViewer.tsx` | `react-markdown` + `rehype-highlight` 도입 | +1pp |
| 4 | 나머지 컴포넌트 4개 분리 | `components/feature/` | HarnessHealth, ModuleMap, TokenUsageChart, MermaidDiagram | +2pp |

**이 4건 해결 시 예상 Match Rate: ~92%** (90% 임계값 통과)

### 10.2 Medium Priority -- 완성도 향상

| # | Item | Description |
|:-:|------|-------------|
| 5 | Architecture ChangeLog/BluePrint 탭 | 6개 탭 전부 구현 |
| 6 | Team Activity 위젯 | 대시보드에 Agent 활동 요약 |
| 7 | Wiki content 개별 fetch | 목록에서 선택 시 `/api/wiki/:slug` 호출 |
| 8 | shadcn/ui 설치 | 디자인 시스템 기반 |

### 10.3 Low Priority -- 백로그

| # | Item | Description |
|:-:|------|-------------|
| 9 | Zustand 스토어 | dashboard, agent 상태 관리 |
| 10 | Core 함수 연동 (D2) | API에서 `computeHealth()` 등 호출로 전환 |
| 11 | Fallback Config UI | 프로바이더 health check |
| 12 | Gateway UI | API 키 + rate limit |

---

## 11. Design Document Updates Needed

설계 대비 구현에서 합리적으로 변경된 사항 -- 설계 문서 사후 반영 필요:

- [ ] `services/git-reader.ts` -> `services/data-reader.ts` 파일명 변경 반영
- [ ] Workspace 저장소: `.foundry-x/workspace/` -> `localStorage` 변경 결정 반영
- [ ] Module Map 데이터 소스: `architecture.json` -> profile API 경유 변경 반영
- [ ] Roadmap 탭: Markdown 렌더링 -> 구조화된 마일스톤 카드 UI 변경 반영
- [ ] Diagram 탭: MermaidDiagram.tsx -> `<pre>` 소스 표시 (Mermaid 라이브러리 도입 전) 반영

---

## 12. Conclusion

Sprint 5 Part A Iteration 1 수정 후, Match Rate가 **72% -> 84%** (+12pp) 향상됐어요.

**Iteration 1에서 해결된 Major 갭**:
1. Wiki POST/DELETE API -- 완전 구현
2. PUT /requirements/:id -- mock statusOverrides 방식 구현
3. Architecture 탭 -- 2개 -> 4개 (modules, diagram, roadmap, requirements)
4. 컴포넌트 분리 -- 3개 분리 (AgentCard, DashboardCard, MarkdownViewer)
5. SSE EventSource 연결 -- Agent 실시간 업데이트

**남은 주요 갭**:
1. **Wiki 소유권 마커 보호 (D3)** -- auto/custom 분리 및 편집 보호 로직 없음
2. **Workspace shared 타입 미사용** -- 로컬 Todo/Msg 인터페이스 사용 중
3. **MarkdownViewer react-markdown 미적용** -- `<pre>` 유지
4. **컴포넌트 4개 미분리** -- HarnessHealth, ModuleMap, MermaidDiagram, TokenUsageChart

Match Rate 84%는 90% 임계값 미만이므로, **Iteration 2가 필요**해요.
S10.1의 4건 해결 시 ~92% 도달 가능해요.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-17 | Initial analysis (Part A: F26~F31) | Claude (gap-detector) |
| 0.2 | 2026-03-17 | Iteration 1 재분석: 72% -> 84% (+12pp), 7건 resolved | Claude (gap-detector) |
