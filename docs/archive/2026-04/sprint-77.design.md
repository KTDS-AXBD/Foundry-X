---
code: FX-DSGN-077
title: "Sprint 77 — F224~F228 Ecosystem Reference Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-PLAN-077]] Sprint 77 Plan"
  - "[[FX-PLAN-012]] Phase 6 Ecosystem Integration"
---

# Sprint 77 Design — F224~F228 Ecosystem Reference

## 1. 개요

BMAD/OpenSpec 벤치마킹 Reference 5건을 API 서비스로 구현한다.
기존 Foundry-X 패턴(Service + Route + Schema + Zod + D1 mock) 유지.

## 2. 아키텍처

```
packages/api/src/
├── db/migrations/
│   ├── 0063_party_sessions.sql       # F226
│   ├── 0064_spec_library.sql         # F227
│   └── 0065_expansion_packs.sql      # F228
├── services/
│   ├── context-passthrough.ts        # F224
│   ├── command-registry.ts           # F225
│   ├── party-session.ts              # F226
│   ├── spec-library.ts               # F227
│   └── expansion-pack.ts             # F228
├── schemas/
│   ├── context-passthrough.ts        # F224
│   ├── command-registry.ts           # F225
│   ├── party-session.ts              # F226
│   ├── spec-library.ts               # F227
│   └── expansion-pack.ts             # F228
├── routes/
│   ├── context-passthrough.ts        # F224
│   ├── command-registry.ts           # F225
│   ├── party-session.ts              # F226
│   ├── spec-library.ts               # F227
│   └── expansion-pack.ts             # F228
└── __tests__/
    ├── context-passthrough.test.ts
    ├── context-passthrough-route.test.ts
    ├── command-registry.test.ts
    ├── command-registry-route.test.ts
    ├── party-session.test.ts
    ├── party-session-route.test.ts
    ├── spec-library.test.ts
    ├── spec-library-route.test.ts
    ├── expansion-pack.test.ts
    └── expansion-pack-route.test.ts
```

## 3. F224 — SM→Dev 컨텍스트 전달 구조

### 3.1 개념

BMAD Story 파일 패턴: SM(Sprint Manager)이 개발 에이전트에게 작업 컨텍스트를 구조화된 형태로 전달.
기존 WorkflowEngine(F142)의 ExecutionContext를 확장하여 passthrough 메커니즘 추가.

### 3.2 타입

```typescript
export interface ContextPayload {
  storyId: string;
  title: string;
  requirements: string[];
  acceptanceCriteria: string[];
  technicalNotes: string;
  relatedFiles: string[];
  priority: "critical" | "high" | "medium" | "low";
}

export interface ContextPassthrough {
  id: string;
  sourceRole: string;   // "sm" | "architect" | "reviewer"
  targetRole: string;   // "developer" | "tester" | "reviewer"
  payload: ContextPayload;
  workflowExecutionId: string | null;
  status: "pending" | "delivered" | "acknowledged";
  orgId: string;
  createdAt: string;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
}
```

### 3.3 서비스 API

```typescript
class ContextPassthroughService {
  constructor(private db: D1Database) {}
  async create(orgId: string, data: ContextPassthroughCreate): Promise<ContextPassthrough>
  async deliver(id: string): Promise<ContextPassthrough>
  async acknowledge(id: string): Promise<ContextPassthrough>
  async listByTarget(orgId: string, targetRole: string): Promise<ContextPassthrough[]>
  async getById(id: string): Promise<ContextPassthrough | null>
  async listByWorkflow(executionId: string): Promise<ContextPassthrough[]>
}
```

### 3.4 라우트 (6 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/context-passthroughs` | 컨텍스트 생성 |
| GET | `/context-passthroughs` | 대상 역할별 목록 조회 |
| GET | `/context-passthroughs/:id` | 단건 조회 |
| PATCH | `/context-passthroughs/:id/deliver` | 전달 상태로 변경 |
| PATCH | `/context-passthroughs/:id/acknowledge` | 수신 확인 |
| GET | `/context-passthroughs/workflow/:executionId` | 워크플로우별 조회 |

### 3.5 D1 스키마

DB 불필요 — 워크플로우 실행 중 in-memory 또는 기존 `workflow_executions.context` JSON 필드 활용.
단, API 일관성을 위해 별도 테이블 없이 기존 WorkflowEngine DB를 활용하되, 향후 확장을 위해 D1 테이블을 추가한다:

```sql
-- F224: context_passthroughs (0063에 함께 포함하지 않고, 테이블 없이 구현)
-- WorkflowEngine의 context JSON 필드를 활용
```

**결정**: F224는 D1 마이그레이션 없이 구현. 메모리 기반 Map + 워크플로우 context 연동.

---

## 4. F225 — 슬래시 커맨드 UX

### 4.1 개념

OpenSpec `/opsx:` 패턴: 네임스페이스로 커맨드를 조직하고, 에이전트가 도구처럼 호출.
`namespace:command` 형식으로 커맨드를 등록/검색/실행.

### 4.2 타입

```typescript
export interface CommandDefinition {
  id: string;
  namespace: string;        // e.g. "foundry", "agent", "spec"
  name: string;             // e.g. "sync", "review", "validate"
  description: string;
  argsSchema: Record<string, unknown>;  // JSON Schema for args
  handler: string;          // handler identifier (route/service name)
  requiredPermissions: string[];
  orgId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 4.3 서비스 API

```typescript
class CommandRegistryService {
  constructor(private db: D1Database) {}
  async register(orgId: string, data: CommandCreate): Promise<CommandDefinition>
  async execute(orgId: string, namespace: string, name: string, args: unknown): Promise<CommandResult>
  async listByNamespace(orgId: string, namespace?: string): Promise<CommandDefinition[]>
  async getByName(orgId: string, namespace: string, name: string): Promise<CommandDefinition | null>
  async update(id: string, data: Partial<CommandCreate>): Promise<CommandDefinition>
  async remove(id: string): Promise<void>
}
```

### 4.4 라우트 (7 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/command-registry` | 커맨드 등록 |
| GET | `/command-registry` | 전체/네임스페이스별 목록 |
| GET | `/command-registry/:namespace/:name` | 단건 조회 |
| PUT | `/command-registry/:id` | 커맨드 수정 |
| DELETE | `/command-registry/:id` | 커맨드 삭제 |
| POST | `/command-registry/:namespace/:name/execute` | 커맨드 실행 |
| GET | `/command-registry/namespaces` | 네임스페이스 목록 |

### 4.5 D1

F225도 D1 마이그레이션 없이 구현. 메모리 기반 Map으로 커맨드 레지스트리 관리.
(이유: 커맨드 정의는 코드 또는 에이전트 설정에서 오는 것이 자연스러움. DB 영속화는 향후 필요 시 추가)

---

## 5. F226 — Party Mode (다중 에이전트 세션)

### 5.1 개념

BMAD 자유형 토론: 여러 에이전트가 하나의 세션에 참가하여 주제에 대해 자유롭게 발언.
EnsembleVoting(F147)이 "투표"라면, PartyMode는 "토론" — 서로 다른 관점 교환.

### 5.2 타입

```typescript
export interface PartySession {
  id: string;
  orgId: string;
  topic: string;
  mode: "free-form" | "round-robin" | "moderated";
  status: "active" | "concluded" | "cancelled";
  maxParticipants: number;
  createdBy: string;
  summary: string | null;
  createdAt: string;
  concludedAt: string | null;
}

export interface PartyParticipant {
  sessionId: string;
  agentRole: string;
  joinedAt: string;
}

export interface PartyMessage {
  id: string;
  sessionId: string;
  agentRole: string;
  content: string;
  messageType: "opinion" | "question" | "answer" | "summary";
  replyTo: string | null;
  createdAt: string;
}
```

### 5.3 서비스 API

```typescript
class PartySessionService {
  constructor(private db: D1Database) {}
  async createSession(orgId: string, data: PartySessionCreate): Promise<PartySession>
  async joinSession(sessionId: string, agentRole: string): Promise<PartyParticipant>
  async addMessage(sessionId: string, data: PartyMessageCreate): Promise<PartyMessage>
  async concludeSession(sessionId: string, summary: string): Promise<PartySession>
  async getSession(id: string): Promise<PartySession | null>
  async listMessages(sessionId: string): Promise<PartyMessage[]>
  async listParticipants(sessionId: string): Promise<PartyParticipant[]>
  async listSessions(orgId: string, status?: string): Promise<PartySession[]>
}
```

### 5.4 라우트 (8 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/party-sessions` | 세션 생성 |
| GET | `/party-sessions` | 세션 목록 |
| GET | `/party-sessions/:id` | 세션 상세 |
| POST | `/party-sessions/:id/join` | 참가 |
| POST | `/party-sessions/:id/messages` | 발언 추가 |
| GET | `/party-sessions/:id/messages` | 발언 목록 |
| PATCH | `/party-sessions/:id/conclude` | 세션 종료 + 요약 |
| GET | `/party-sessions/:id/participants` | 참가자 목록 |

### 5.5 D1 마이그레이션 (0063)

```sql
-- F226: Party Mode (다중 에이전트 세션)
CREATE TABLE IF NOT EXISTS party_sessions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'free-form' CHECK(mode IN ('free-form', 'round-robin', 'moderated')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'concluded', 'cancelled')),
  max_participants INTEGER NOT NULL DEFAULT 10,
  created_by TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  concluded_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_party_sessions_org ON party_sessions(org_id, status);

CREATE TABLE IF NOT EXISTS party_participants (
  session_id TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (session_id, agent_role),
  FOREIGN KEY (session_id) REFERENCES party_sessions(id)
);

CREATE TABLE IF NOT EXISTS party_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'opinion' CHECK(message_type IN ('opinion', 'question', 'answer', 'summary')),
  reply_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES party_sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_party_messages_session ON party_messages(session_id, created_at);
```

---

## 6. F227 — Spec Library 구조

### 6.1 개념

OpenSpec 기능 단위 스펙: 개별 기능/모듈을 스펙 단위로 저장하고, 버전 관리하며, 태그로 검색.
WikiSync(F46)가 "위키 페이지"를 관리한다면, SpecLibrary는 "구조화된 스펙 문서"를 관리.

### 6.2 타입

```typescript
export interface SpecLibraryItem {
  id: string;
  orgId: string;
  title: string;
  category: string;         // "feature" | "api" | "component" | "integration" | "other"
  tags: string[];
  content: string;           // Markdown 본문
  version: string;           // SemVer (e.g. "1.0.0")
  status: "draft" | "active" | "deprecated";
  author: string;
  createdAt: string;
  updatedAt: string;
}
```

### 6.3 서비스 API

```typescript
class SpecLibraryService {
  constructor(private db: D1Database) {}
  async create(orgId: string, data: SpecLibraryCreate): Promise<SpecLibraryItem>
  async getById(id: string): Promise<SpecLibraryItem | null>
  async list(orgId: string, opts?: { category?: string; tag?: string; status?: string }): Promise<SpecLibraryItem[]>
  async update(id: string, data: Partial<SpecLibraryCreate>): Promise<SpecLibraryItem>
  async remove(id: string): Promise<void>
  async search(orgId: string, query: string): Promise<SpecLibraryItem[]>
  async listCategories(orgId: string): Promise<string[]>
}
```

### 6.4 라우트 (7 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/spec-library` | 스펙 등록 |
| GET | `/spec-library` | 목록 (필터: category, tag, status) |
| GET | `/spec-library/:id` | 단건 조회 |
| PUT | `/spec-library/:id` | 수정 |
| DELETE | `/spec-library/:id` | 삭제 |
| GET | `/spec-library/search` | 전문 검색 |
| GET | `/spec-library/categories` | 카테고리 목록 |

### 6.5 D1 마이그레이션 (0064)

```sql
-- F227: Spec Library
CREATE TABLE IF NOT EXISTS spec_library (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK(category IN ('feature', 'api', 'component', 'integration', 'other')),
  tags TEXT NOT NULL DEFAULT '[]',
  content TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'deprecated')),
  author TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_spec_library_org ON spec_library(org_id, category, status);
CREATE INDEX IF NOT EXISTS idx_spec_library_search ON spec_library(org_id, title);
```

---

## 7. F228 — Expansion Packs 모델

### 7.1 개념

BMAD 도메인 확장: 특정 도메인(예: 보안, 데이터 분석)에 필요한 에이전트 역할, 프롬프트, 도구, 워크플로우를 "팩"으로 묶어 배포/설치.
AgentMarketplace(F152)가 "개별 역할"을 공유한다면, ExpansionPack은 "역할+워크플로우+설정 세트"를 패키징.

### 7.2 타입

```typescript
export interface ExpansionPack {
  id: string;
  orgId: string;
  name: string;
  description: string;
  domain: string;              // "security" | "data" | "devops" | "testing" | "custom"
  version: string;
  manifest: PackManifest;
  status: "draft" | "published" | "archived";
  author: string;
  installCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PackManifest {
  agentRoles: string[];        // 포함된 에이전트 역할 ID
  workflows: string[];         // 포함된 워크플로우 ID
  commands: string[];          // 포함된 커맨드 ID
  dependencies: string[];      // 의존하는 다른 팩 ID
  config: Record<string, unknown>;
}

export interface PackInstallation {
  id: string;
  packId: string;
  orgId: string;
  installedBy: string;
  installedAt: string;
  config: Record<string, unknown>;
}
```

### 7.3 서비스 API

```typescript
class ExpansionPackService {
  constructor(private db: D1Database) {}
  async create(orgId: string, data: ExpansionPackCreate): Promise<ExpansionPack>
  async getById(id: string): Promise<ExpansionPack | null>
  async list(opts?: { domain?: string; status?: string }): Promise<ExpansionPack[]>
  async update(id: string, data: Partial<ExpansionPackCreate>): Promise<ExpansionPack>
  async publish(id: string): Promise<ExpansionPack>
  async install(packId: string, orgId: string, userId: string): Promise<PackInstallation>
  async uninstall(installId: string): Promise<void>
  async listInstallations(orgId: string): Promise<PackInstallation[]>
}
```

### 7.4 라우트 (8 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/expansion-packs` | 팩 생성 |
| GET | `/expansion-packs` | 팩 목록 (필터: domain, status) |
| GET | `/expansion-packs/:id` | 팩 상세 |
| PUT | `/expansion-packs/:id` | 팩 수정 |
| PATCH | `/expansion-packs/:id/publish` | 팩 게시 |
| POST | `/expansion-packs/:id/install` | 팩 설치 |
| DELETE | `/expansion-packs/installations/:installId` | 팩 제거 |
| GET | `/expansion-packs/installations` | 설치된 팩 목록 |

### 7.5 D1 마이그레이션 (0065)

```sql
-- F228: Expansion Packs
CREATE TABLE IF NOT EXISTS expansion_packs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT 'custom' CHECK(domain IN ('security', 'data', 'devops', 'testing', 'custom')),
  version TEXT NOT NULL DEFAULT '1.0.0',
  manifest TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  author TEXT NOT NULL,
  install_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expansion_packs_status ON expansion_packs(status, domain);

CREATE TABLE IF NOT EXISTS pack_installations (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  installed_by TEXT NOT NULL,
  installed_at TEXT NOT NULL DEFAULT (datetime('now')),
  config TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (pack_id) REFERENCES expansion_packs(id),
  UNIQUE(pack_id, org_id)
);
CREATE INDEX IF NOT EXISTS idx_pack_installations_org ON pack_installations(org_id);
```

---

## 8. index.ts 라우트 등록

```typescript
// F224~F228 Ecosystem Reference
import { contextPassthroughRoute } from "./routes/context-passthrough.js";
import { commandRegistryRoute } from "./routes/command-registry.js";
import { partySessionRoute } from "./routes/party-session.js";
import { specLibraryRoute } from "./routes/spec-library.js";
import { expansionPackRoute } from "./routes/expansion-pack.js";

app.route("/api", contextPassthroughRoute);
app.route("/api", commandRegistryRoute);
app.route("/api", partySessionRoute);
app.route("/api", specLibraryRoute);
app.route("/api", expansionPackRoute);
```

---

## 9. 테스트 전략

- 서비스 테스트: DDL 인라인 정의 + `createMockD1()` + `exec(DDL)` 패턴 (Sprint 76 shard-doc.test.ts와 동일)
- 라우트 테스트: `createTestEnv()` + DDL exec + Hono `app.request()` 직접 호출
- F224/F225: D1 불필요 → 메모리 기반 서비스만 테스트
- F226/F227/F228: DDL 인라인 + D1 mock

예상 테스트 수: 서비스 ~40개 + 라우트 ~40개 = **~80개**

---

## 10. 엔드포인트 요약

| F-item | 엔드포인트 수 | D1 테이블 | 마이그레이션 |
|--------|-------------|-----------|-------------|
| F224 | 6 | 0 (memory) | — |
| F225 | 7 | 0 (memory) | — |
| F226 | 8 | 3 | 0063 |
| F227 | 7 | 1 | 0064 |
| F228 | 8 | 2 | 0065 |
| **합계** | **36** | **6** | **3** |

---

## 5. Worker 파일 매핑 (병렬 구현용)

### Worker 1: F224 + F225 (메모리 기반, DB 불필요)

**수정 허용 파일:**
- `packages/api/src/services/context-passthrough.ts` (신규)
- `packages/api/src/services/command-registry.ts` (신규)
- `packages/api/src/schemas/context-passthrough.ts` (신규)
- `packages/api/src/schemas/command-registry.ts` (신규)
- `packages/api/src/routes/context-passthrough.ts` (신규)
- `packages/api/src/routes/command-registry.ts` (신규)
- `packages/api/src/__tests__/context-passthrough.test.ts` (신규)
- `packages/api/src/__tests__/context-passthrough-route.test.ts` (신규)
- `packages/api/src/__tests__/command-registry.test.ts` (신규)
- `packages/api/src/__tests__/command-registry-route.test.ts` (신규)

### Worker 2: F226 + F227 + F228 (D1 마이그레이션 포함)

**수정 허용 파일:**
- `packages/api/src/db/migrations/0063_party_sessions.sql` (신규)
- `packages/api/src/db/migrations/0064_spec_library.sql` (신규)
- `packages/api/src/db/migrations/0065_expansion_packs.sql` (신규)
- `packages/api/src/services/party-session.ts` (신규)
- `packages/api/src/services/spec-library.ts` (신규)
- `packages/api/src/services/expansion-pack.ts` (신규)
- `packages/api/src/schemas/party-session.ts` (신규)
- `packages/api/src/schemas/spec-library.ts` (신규)
- `packages/api/src/schemas/expansion-pack.ts` (신규)
- `packages/api/src/routes/party-session.ts` (신규)
- `packages/api/src/routes/spec-library.ts` (신규)
- `packages/api/src/routes/expansion-pack.ts` (신규)
- `packages/api/src/__tests__/party-session.test.ts` (신규)
- `packages/api/src/__tests__/party-session-route.test.ts` (신규)
- `packages/api/src/__tests__/spec-library.test.ts` (신규)
- `packages/api/src/__tests__/spec-library-route.test.ts` (신규)
- `packages/api/src/__tests__/expansion-pack.test.ts` (신규)
- `packages/api/src/__tests__/expansion-pack-route.test.ts` (신규)

### 통합 (리더)
- `packages/api/src/index.ts` — 5개 라우트 등록
