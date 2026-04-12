---
code: FX-DSGN-076
title: "Sprint 76 — F221 Agent-as-Code + F223 Doc Sharding Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-PLAN-076]] Sprint 76 Plan"
  - "[[FX-REQ-213]] Agent-as-Code 선언적 정의"
  - "[[FX-REQ-215]] 문서 Sharding 자동화"
---

# Sprint 76 Design — F221 Agent-as-Code + F223 문서 Sharding

## 1. 개요

BMAD `.agent.yaml` 패턴과 `shard-doc` 개념을 Foundry-X에 적용한다.
에이전트를 YAML/JSON으로 선언적 정의하고(F221), 대형 문서를 에이전트 역할별로 자동 분할한다(F223).

## 2. 아키텍처

```
packages/api/src/
├── db/migrations/
│   ├── 0061_agent_definitions.sql    # F221 — custom_agent_roles 확장
│   └── 0062_document_shards.sql      # F223 — document_shards 신규
├── services/
│   ├── agent-definition-loader.ts    # F221 — YAML/JSON 파서 + 검증
│   ├── custom-role-manager.ts        # F221 — 기존 확장 (import/export)
│   └── shard-doc.ts                  # F223 — 문서 파싱 + 에이전트 매칭
├── schemas/
│   ├── agent-definition.ts           # F221 — Zod 스키마
│   └── shard-doc.ts                  # F223 — Zod 스키마
├── routes/
│   ├── agent-definition.ts           # F221 — CRUD + import/export
│   └── shard-doc.ts                  # F223 — shard CRUD + 에이전트별 조회
└── __tests__/
    ├── agent-definition-loader.test.ts
    ├── agent-definition-route.test.ts
    ├── shard-doc.test.ts
    └── shard-doc-route.test.ts
```

## 3. 상세 설계

### 3.1 F221 — Agent-as-Code 선언적 정의

#### 3.1.1 D1 마이그레이션 (0061)

```sql
-- F221: Agent-as-Code 선언적 정의 확장
ALTER TABLE custom_agent_roles ADD COLUMN persona TEXT NOT NULL DEFAULT '';
ALTER TABLE custom_agent_roles ADD COLUMN dependencies TEXT NOT NULL DEFAULT '[]';
ALTER TABLE custom_agent_roles ADD COLUMN customization_schema TEXT NOT NULL DEFAULT '{}';
ALTER TABLE custom_agent_roles ADD COLUMN menu_config TEXT NOT NULL DEFAULT '[]';
```

**설계 근거**: 기존 `custom_agent_roles`(0024) 테이블에 4개 컬럼을 추가하여 BMAD `.agent.yaml` 구조를 수용한다. 별도 테이블 대신 ALTER TABLE을 선택한 이유: 1:1 관계이고 JOIN 비용 회피.

#### 3.1.2 YAML 에이전트 정의 구조

```yaml
# .agent.yaml 형식
name: reviewer                          # 필수 — 역할 식별자
description: "Code review agent"        # 선택
persona: |                              # 선택 — 상세 성격/역할
  You are a senior code reviewer.
  Focus on OWASP security patterns.
system_prompt: "Review code changes."   # 필수 — 기존 호환
allowed_tools:                          # 선택
  - eslint
  - prettier
preferred_model: null                   # 선택
preferred_runner_type: openrouter       # 선택
task_type: code-review                  # 선택
dependencies:                           # 신규 — 에이전트 의존 도구/패키지
  - eslint
  - prettier
  - ast-grep
customization:                          # 신규 — 사용자 설정 가능 파라미터
  severity_threshold:
    type: string
    default: warning
    enum: [error, warning, info]
  max_review_comments:
    type: number
    default: 20
    min: 1
    max: 100
  focus_areas:
    type: array
    default: [security, performance]
    items: { type: string }
menu:                                   # 신규 — 에이전트 액션 메뉴
  - action: review-pr
    label: "PR 리뷰"
    description: "풀 리퀘스트 코드 리뷰 실행"
  - action: scan-security
    label: "보안 스캔"
    description: "OWASP Top 10 취약점 검사"
```

#### 3.1.3 AgentDefinitionLoader 서비스

```typescript
// services/agent-definition-loader.ts
export interface AgentDefinition {
  name: string;
  description?: string;
  persona?: string;
  systemPrompt: string;
  allowedTools?: string[];
  preferredModel?: string | null;
  preferredRunnerType?: string;
  taskType?: string;
  dependencies?: string[];
  customization?: Record<string, CustomizationField>;
  menu?: MenuItem[];
}

interface CustomizationField {
  type: 'string' | 'number' | 'boolean' | 'array';
  default: unknown;
  enum?: string[];
  min?: number;
  max?: number;
  items?: { type: string };
}

interface MenuItem {
  action: string;
  label: string;
  description?: string;
}

export class AgentDefinitionLoader {
  // parseYaml(yamlContent: string): AgentDefinition
  // parseJson(jsonContent: string): AgentDefinition
  // validate(def: unknown): AgentDefinition (Zod 검증)
  // toCreateRoleInput(def: AgentDefinition): CreateRoleInput (기존 호환)
  // toYaml(role: CustomRole): string (export)
}
```

#### 3.1.4 CustomRoleManager 확장

기존 `CustomRoleManager`에 추가:

```typescript
// 기존 CustomRole 인터페이스 확장
export interface CustomRole {
  // ... 기존 필드
  persona: string;              // 신규
  dependencies: string[];       // 신규
  customizationSchema: Record<string, unknown>;  // 신규
  menuConfig: MenuItem[];       // 신규
}

// 신규 메서드
async importFromYaml(yamlContent: string, orgId?: string): Promise<CustomRole>
async exportToYaml(roleId: string): Promise<string>
async importFromJson(jsonContent: string, orgId?: string): Promise<CustomRole>
```

#### 3.1.5 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/agent-definitions/import` | YAML/JSON → D1 import |
| GET | `/api/agent-definitions/:roleId/export` | D1 → YAML export |
| GET | `/api/agent-definitions/:roleId/export?format=json` | D1 → JSON export |
| GET | `/api/agent-definitions/schema` | customization 스키마 메타 정보 |

기존 CRUD는 `agent.ts` 라우트(`/api/custom-roles/*`)를 그대로 사용. import/export만 신규.

### 3.2 F223 — 문서 Sharding

#### 3.2.1 D1 마이그레이션 (0062)

```sql
-- F223: 문서 Sharding
CREATE TABLE IF NOT EXISTS document_shards (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  document_title TEXT NOT NULL DEFAULT '',
  section_index INTEGER NOT NULL,
  heading TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '[]',
  agent_roles TEXT NOT NULL DEFAULT '[]',
  token_count INTEGER NOT NULL DEFAULT 0,
  org_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shards_doc ON document_shards(document_id);
CREATE INDEX IF NOT EXISTS idx_shards_org ON document_shards(org_id);
```

#### 3.2.2 ShardDocService

```typescript
// services/shard-doc.ts
export interface DocumentShard {
  id: string;
  documentId: string;
  documentTitle: string;
  sectionIndex: number;
  heading: string;
  content: string;
  keywords: string[];
  agentRoles: string[];
  tokenCount: number;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

export class ShardDocService {
  constructor(private db: D1Database) {}

  // 1. 문서 → shard 분할
  async shardDocument(input: ShardDocumentInput): Promise<DocumentShard[]>

  // 2. 에이전트 역할로 관련 shard 조회
  async getShardsForAgent(agentRole: string, documentId?: string): Promise<DocumentShard[]>

  // 3. 문서별 shard 목록
  async listShards(documentId: string): Promise<DocumentShard[]>

  // 4. shard 삭제 (문서 재처리 시)
  async deleteShards(documentId: string): Promise<void>

  // 내부: Markdown → 섹션 분할
  private parseMarkdownSections(content: string): Section[]

  // 내부: 섹션 → 키워드 추출
  private extractKeywords(section: Section): string[]

  // 내부: 키워드 → 에이전트 역할 매칭
  private matchAgentRoles(keywords: string[]): string[]

  // 내부: 토큰 수 추정 (word count × 1.3)
  private estimateTokens(text: string): number
}
```

**Markdown 파싱 전략**:
- `##` 레벨 헤딩 기준 분할 (h2)
- `#` (h1) 은 문서 제목으로 처리
- 헤딩 없는 프리앰블은 `_preamble` 섹션으로 분류
- 코드 블록 내 `##`는 무시 (fence 안에서는 split 안 함)

**키워드 → 에이전트 매칭 룰**:

| 키워드 그룹 | 매칭 에이전트 역할 |
|-------------|-------------------|
| review, lint, code quality, PR | reviewer |
| plan, task, dependency, scope | planner |
| architecture, design, pattern | architect |
| test, coverage, assertion | test |
| security, OWASP, vulnerability | security |
| QA, acceptance, browser | qa |
| infra, deploy, migration, CI | infra |

#### 3.2.3 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/shard-doc` | 문서 입력 → shard 분할 저장 |
| GET | `/api/shard-doc/:documentId` | 문서별 shard 목록 |
| GET | `/api/shard-doc/agent/:agentRole` | 에이전트별 관련 shard 조회 |
| DELETE | `/api/shard-doc/:documentId` | 문서 shard 전체 삭제 |

## 4. Zod 스키마

### 4.1 agent-definition.ts

```typescript
// AgentDefinitionYamlSchema — YAML import 요청
export const AgentDefinitionYamlSchema = z.object({
  content: z.string().min(1).max(100_000).describe("YAML 또는 JSON 문자열"),
  format: z.enum(["yaml", "json"]).default("yaml"),
  orgId: z.string().optional(),
});

// AgentDefinitionSchema — 파싱된 에이전트 정의
export const AgentDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  persona: z.string().max(10000).optional(),
  systemPrompt: z.string().min(1).max(10000),
  allowedTools: z.array(z.string()).optional(),
  preferredModel: z.string().nullable().optional(),
  preferredRunnerType: z.enum(["openrouter", "claude-api", "mcp", "mock"]).optional(),
  taskType: z.string().optional(),
  dependencies: z.array(z.string().max(100)).max(50).optional(),
  customization: z.record(z.object({
    type: z.enum(["string", "number", "boolean", "array"]),
    default: z.unknown(),
    enum: z.array(z.string()).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    items: z.object({ type: z.string() }).optional(),
  })).optional(),
  menu: z.array(z.object({
    action: z.string().min(1).max(100),
    label: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
  })).max(20).optional(),
});
```

### 4.2 shard-doc.ts

```typescript
export const ShardDocumentRequestSchema = z.object({
  documentId: z.string().min(1).max(200),
  title: z.string().max(500).optional(),
  content: z.string().min(1).max(500_000).describe("Markdown 문서 내용"),
  orgId: z.string().optional(),
});

export const DocumentShardSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  sectionIndex: z.number(),
  heading: z.string(),
  content: z.string(),
  keywords: z.array(z.string()),
  agentRoles: z.array(z.string()),
  tokenCount: z.number(),
  orgId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ShardQuerySchema = z.object({
  documentId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
```

## 5. Worker 파일 매핑

### Worker 1: F221 Agent-as-Code

| # | 파일 | 작업 | 의존 |
|---|------|------|------|
| 1 | `packages/api/src/db/migrations/0061_agent_definitions.sql` | ALTER TABLE × 4 컬럼 | — |
| 2 | `packages/api/src/schemas/agent-definition.ts` | Zod 스키마 3개 | — |
| 3 | `packages/api/src/services/agent-definition-loader.ts` | YAML/JSON 파서 + 검증 | #2 |
| 4 | `packages/api/src/services/custom-role-manager.ts` | 인터페이스 확장 + import/export 메서드 | #1, #3 |
| 5 | `packages/api/src/routes/agent-definition.ts` | 4 엔드포인트 | #2, #3, #4 |
| 6 | `packages/api/src/__tests__/agent-definition-loader.test.ts` | 서비스 테스트 15+ | #3 |
| 7 | `packages/api/src/__tests__/agent-definition-route.test.ts` | 라우트 테스트 8+ | #5 |

### Worker 2: F223 Doc Sharding

| # | 파일 | 작업 | 의존 |
|---|------|------|------|
| 1 | `packages/api/src/db/migrations/0062_document_shards.sql` | CREATE TABLE + INDEX | — |
| 2 | `packages/api/src/schemas/shard-doc.ts` | Zod 스키마 3개 | — |
| 3 | `packages/api/src/services/shard-doc.ts` | ShardDocService (파싱+매칭+CRUD) | #1, #2 |
| 4 | `packages/api/src/routes/shard-doc.ts` | 4 엔드포인트 | #2, #3 |
| 5 | `packages/api/src/__tests__/shard-doc.test.ts` | 서비스 테스트 15+ | #3 |
| 6 | `packages/api/src/__tests__/shard-doc-route.test.ts` | 라우트 테스트 8+ | #4 |

## 6. 테스트 전략

- **테스트 헬퍼**: 기존 `createMockD1()` + `createTestEnv()` 패턴 사용
- **DDL 인라인**: 테스트 파일에 DDL 문자열 정의 (기존 `custom-role-manager.test.ts` 패턴)
- **YAML 파싱**: 유효/무효 YAML, JSON 대체, 필수 필드 누락 등
- **Round-trip**: import → export → 재 import 동일성 검증
- **Shard 매칭**: 알려진 키워드 포함 섹션이 올바른 에이전트에 매칭되는지 검증
- **Edge**: 빈 문서, 헤딩 없는 문서, 코드블록 내 `##`, 초대형 섹션

## 7. 테스트 DDL (테스트 파일에 포함)

### F221 테스트용

```sql
CREATE TABLE IF NOT EXISTS custom_agent_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL DEFAULT '',
  allowed_tools TEXT NOT NULL DEFAULT '[]',
  preferred_model TEXT,
  preferred_runner_type TEXT DEFAULT 'openrouter',
  task_type TEXT NOT NULL DEFAULT 'code-review',
  org_id TEXT NOT NULL DEFAULT '',
  is_builtin INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  persona TEXT NOT NULL DEFAULT '',
  dependencies TEXT NOT NULL DEFAULT '[]',
  customization_schema TEXT NOT NULL DEFAULT '{}',
  menu_config TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### F223 테스트용

```sql
CREATE TABLE IF NOT EXISTS document_shards (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  document_title TEXT NOT NULL DEFAULT '',
  section_index INTEGER NOT NULL,
  heading TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '[]',
  agent_roles TEXT NOT NULL DEFAULT '[]',
  token_count INTEGER NOT NULL DEFAULT 0,
  org_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shards_doc ON document_shards(document_id);
CREATE INDEX IF NOT EXISTS idx_shards_org ON document_shards(org_id);
```
