---
code: FX-DSGN-S90
title: "Sprint 90 — BD 스킬 실행 엔진 + 산출물 저장·버전 관리"
version: 1.0
status: Draft
category: DSGN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S90]], [[FX-SPEC-001]], [[FX-DSGN-S89]]"
---

# Sprint 90 Design: BD 스킬 실행 엔진 + 산출물 저장·버전 관리

## §1 개요

Sprint 89의 정적 스킬 카탈로그(F259)를 **실행 가능한 엔진**으로 확장한다.
사용자가 웹에서 스킬을 선택하면 → API가 Anthropic LLM을 호출하고 → 결과를 biz-item별 산출물로 D1에 저장한다.

### 핵심 원칙
- **기존 인프라 재활용**: `ClaudeApiRunner` + `PromptGatewayService` 활용 (새 LLM 클라이언트 미생성)
- **프롬프트 서버 관리**: 스킬 ID → system prompt 매핑은 API 서버에만 존재 (클라이언트 미노출)
- **버전 관리 자동화**: 같은 스킬+biz_item 재실행 시 version 자동 증가

## §2 D1 스키마

### 2.1 마이그레이션: `0075_bd_artifacts.sql`

```sql
CREATE TABLE IF NOT EXISTS bd_artifacts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  input_text TEXT NOT NULL,
  output_text TEXT,
  model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20250714',
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_bd_artifacts_org ON bd_artifacts(org_id);
CREATE INDEX idx_bd_artifacts_biz_item ON bd_artifacts(biz_item_id);
CREATE INDEX idx_bd_artifacts_skill ON bd_artifacts(skill_id, biz_item_id);
CREATE INDEX idx_bd_artifacts_stage ON bd_artifacts(stage_id);
CREATE UNIQUE INDEX idx_bd_artifacts_version ON bd_artifacts(biz_item_id, skill_id, version);
```

status 값: `pending` | `running` | `completed` | `failed`

## §3 API 서비스 설계

### 3.1 BdSkillExecutor (`services/bd-skill-executor.ts`)

스킬 실행의 핵심 서비스. 스킬 ID → 프롬프트 조합 → LLM 호출 → 결과 반환.

```typescript
export interface SkillExecutionRequest {
  skillId: string;      // "ai-biz:ecosystem-map"
  bizItemId: string;    // biz_items.id
  stageId: string;      // "2-1"
  inputText: string;    // 사용자 입력
}

export interface SkillExecutionResult {
  artifactId: string;
  skillId: string;
  version: number;
  outputText: string;
  model: string;
  tokensUsed: number;
  durationMs: number;
  status: "completed" | "failed";
}

export class BdSkillExecutor {
  constructor(private db: D1Database, private apiKey: string) {}

  async execute(orgId: string, userId: string, req: SkillExecutionRequest): Promise<SkillExecutionResult>;
}
```

**실행 흐름:**
1. 스킬 ID로 `SKILL_PROMPT_MAP`에서 system prompt 조회
2. `PromptGatewayService.sanitizePrompt()`로 사용자 입력 sanitize
3. 다음 버전 번호 산출: `SELECT MAX(version) FROM bd_artifacts WHERE biz_item_id = ? AND skill_id = ?`
4. `bd_artifacts` 레코드 INSERT (status=running)
5. `ClaudeApiRunner.execute()` 호출
6. 결과로 레코드 UPDATE (output_text, tokens_used, duration_ms, status=completed)
7. 실패 시 status=failed + error message를 output_text에 저장

### 3.2 스킬 프롬프트 맵 (`services/bd-skill-prompts.ts`)

각 스킬 ID별 system prompt와 output format 정의:

```typescript
export interface SkillPromptDef {
  systemPrompt: string;
  outputFormat: string;   // "markdown" | "json" | "table"
  maxTokens: number;
}

export const SKILL_PROMPT_MAP: Record<string, SkillPromptDef> = {
  "ai-biz:ecosystem-map": {
    systemPrompt: "당신은 AI 사업개발 전문가입니다. 산업 생태계를 분석하고 밸류체인, 경쟁구도, 보완재 관계를 시각화합니다...",
    outputFormat: "markdown",
    maxTokens: 4096,
  },
  // ... 각 스킬별 정의
};
```

**프롬프트 생성 규칙:**
- system prompt에 스킬 이름/설명/기대 산출물 형식을 포함
- user prompt = `[biz-item 컨텍스트]\n\n[사용자 입력]`
- biz-item 컨텍스트: 제목 + 설명 + 분류 유형 + 현재 단계

### 3.3 BdArtifactService (`services/bd-artifact-service.ts`)

산출물 CRUD + 목록 조회:

```typescript
export class BdArtifactService {
  constructor(private db: D1Database) {}

  async create(orgId: string, userId: string, input: CreateArtifactInput): Promise<BdArtifact>;
  async getById(orgId: string, id: string): Promise<BdArtifact | null>;
  async listByBizItem(orgId: string, bizItemId: string, opts?: ListOpts): Promise<PaginatedResult<BdArtifact>>;
  async listByStage(orgId: string, stageId: string, opts?: ListOpts): Promise<PaginatedResult<BdArtifact>>;
  async getVersionHistory(orgId: string, bizItemId: string, skillId: string): Promise<BdArtifact[]>;
  async updateStatus(id: string, status: string, output?: { outputText?: string; tokensUsed?: number; durationMs?: number }): Promise<void>;
  async getNextVersion(bizItemId: string, skillId: string): Promise<number>;
}
```

## §4 API 엔드포인트

### 4.1 스킬 실행 라우트 (`routes/ax-bd-skills.ts`)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/ax-bd/skills/:skillId/execute` | 스킬 실행 (biz-item 연결) |
| GET | `/ax-bd/skills` | 서버 측 스킬 목록 (실행 가능 여부 포함) |

**POST /ax-bd/skills/:skillId/execute**
```typescript
// Request
{
  bizItemId: string;    // 필수
  stageId: string;      // 필수 (2-0 ~ 2-10)
  inputText: string;    // 필수
}

// Response 200
{
  artifactId: string;
  skillId: string;
  version: number;
  outputText: string;
  model: string;
  tokensUsed: number;
  durationMs: number;
  status: "completed";
}

// Response 500
{
  artifactId: string;
  error: string;
  status: "failed";
}
```

### 4.2 산출물 라우트 (`routes/ax-bd-artifacts.ts`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/ax-bd/artifacts` | 산출물 목록 (org 전체, 필터 가능) |
| GET | `/ax-bd/artifacts/:id` | 산출물 상세 |
| GET | `/ax-bd/biz-items/:bizItemId/artifacts` | biz-item별 산출물 |
| GET | `/ax-bd/artifacts/:bizItemId/:skillId/versions` | 버전 히스토리 |

공통 필터 파라미터: `?stageId=2-3&skillId=ai-biz:ecosystem-map&page=1&limit=20`

## §5 Web UI 설계

### 5.1 SkillDetailSheet 확장 (F260)

기존 `SkillDetailSheet.tsx`에 실행 기능 추가:

```
┌─────────────────────────────────┐
│ SkillDetailSheet                │
│                                 │
│ [스킬명]  [카테고리 뱃지]       │
│ 설명: ...                       │
│ 입력: ...    산출물: ...        │
│ 추천 단계: 2-1, 2-3            │
│                                 │
│ ─── 실행 ───────────────────── │
│ Biz-item: [선택 드롭다운]      │
│ 단계:     [선택 드롭다운]      │
│ 입력:     [텍스트에리어]       │
│                                 │
│ [실행하기] 버튼                 │
│                                 │
│ ─── 결과 ───────────────────── │
│ (실행 후) Markdown 산출물 표시  │
│ 버전: v3  | 토큰: 1,234        │
│ [이전 버전 보기] 링크           │
└─────────────────────────────────┘
```

상태:
- `isExecuting: boolean` — 실행 중 로딩 표시
- `executionResult: SkillExecutionResult | null` — 실행 결과

### 5.2 산출물 목록 페이지 (F261)

새 라우트: `/ax-bd/artifacts`

```
┌──────────────────────────────────────────┐
│ BD 산출물                                │
│                                          │
│ [biz-item 필터] [단계 필터] [검색]       │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ ai-biz:ecosystem-map  v2            │ │
│ │ [아이템A] 단계: 2-1 | 2분전         │ │
│ │ 생태계 맵 요약 첫 줄...             │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ pm:persona  v1                      │ │
│ │ [아이템A] 단계: 2-6 | 5분전         │ │
│ │ 페르소나 요약 첫 줄...              │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### 5.3 산출물 상세 뷰

`/ax-bd/artifacts/:id` — 산출물 전체 텍스트 + 메타데이터 + 버전 히스토리

## §6 Zod 스키마 (`schemas/bd-artifact.ts`)

```typescript
export const executeSkillSchema = z.object({
  bizItemId: z.string().min(1),
  stageId: z.string().regex(/^2-(?:10|[0-9])$/),
  inputText: z.string().min(1).max(10000),
});

export const bdArtifactSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  bizItemId: z.string(),
  skillId: z.string(),
  stageId: z.string(),
  version: z.number().int().positive(),
  inputText: z.string(),
  outputText: z.string().nullable(),
  model: z.string(),
  tokensUsed: z.number().int(),
  durationMs: z.number().int(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const artifactListQuerySchema = z.object({
  bizItemId: z.string().optional(),
  stageId: z.string().optional(),
  skillId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

## §7 파일 매핑

### 신규 생성 파일

| # | 파일 | 설명 |
|---|------|------|
| 1 | `packages/api/src/db/migrations/0075_bd_artifacts.sql` | D1 마이그레이션 |
| 2 | `packages/api/src/services/bd-skill-executor.ts` | 스킬 실행 서비스 |
| 3 | `packages/api/src/services/bd-skill-prompts.ts` | 스킬별 프롬프트 맵 |
| 4 | `packages/api/src/services/bd-artifact-service.ts` | 산출물 CRUD 서비스 |
| 5 | `packages/api/src/schemas/bd-artifact.ts` | Zod 스키마 |
| 6 | `packages/api/src/routes/ax-bd-skills.ts` | 스킬 실행 라우트 |
| 7 | `packages/api/src/routes/ax-bd-artifacts.ts` | 산출물 CRUD 라우트 |
| 8 | `packages/api/src/__tests__/bd-skill-executor.test.ts` | 실행 엔진 테스트 |
| 9 | `packages/api/src/__tests__/bd-artifact-service.test.ts` | 산출물 서비스 테스트 |
| 10 | `packages/api/src/__tests__/ax-bd-skills.test.ts` | 스킬 라우트 테스트 |
| 11 | `packages/api/src/__tests__/ax-bd-artifacts.test.ts` | 산출물 라우트 테스트 |
| 12 | `packages/web/src/routes/ax-bd/artifacts.tsx` | 산출물 목록 라우트 |
| 13 | `packages/web/src/routes/ax-bd/artifact-detail.tsx` | 산출물 상세 라우트 |
| 14 | `packages/web/src/components/feature/ax-bd/SkillExecutionForm.tsx` | 실행 폼 컴포넌트 |
| 15 | `packages/web/src/components/feature/ax-bd/ArtifactList.tsx` | 산출물 목록 컴포넌트 |
| 16 | `packages/web/src/components/feature/ax-bd/ArtifactDetail.tsx` | 산출물 상세 컴포넌트 |
| 17 | `packages/web/src/__tests__/bd-artifacts.test.tsx` | Web 산출물 테스트 |

### 수정 파일

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `packages/web/src/components/feature/ax-bd/SkillDetailSheet.tsx` | 실행 폼 + 결과 표시 추가 |
| 2 | `packages/web/src/router.tsx` | artifacts, artifact-detail 라우트 추가 |
| 3 | `packages/web/src/components/feature/Sidebar.tsx` | "산출물" 메뉴 항목 추가 |
| 4 | `packages/api/src/index.ts` | ax-bd-skills, ax-bd-artifacts 라우트 등록 |
| 5 | `packages/shared/types.ts` | BdArtifact 공유 타입 (필요 시) |

## §8 테스트 전략

| 영역 | 테스트 방식 | 예상 수 |
|------|------------|---------|
| BD Skill Executor | ClaudeApiRunner mock → 프롬프트 매핑 검증 + 실패 처리 | ~8 |
| BD Artifact Service | in-memory D1 → CRUD + 버전 자동 증가 + 필터 | ~10 |
| Skills Route | app.request() → 실행 요청 + 유효성 검증 | ~6 |
| Artifacts Route | app.request() → 목록/상세/버전 히스토리 | ~8 |
| Web 컴포넌트 | RTL → 실행 폼 렌더 + 산출물 목록/상세 | ~6 |
| **합계** | | **~38** |
