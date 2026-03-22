---
code: FX-DSGN-044
title: Sprint 44 Design — F116 KT DS SR 시나리오 구체화
version: "1.0"
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

# Sprint 44 Design — F116 KT DS SR 시나리오 구체화

## 참조
- Plan: `[[FX-PLAN-044]]`
- SR 분류 체계: `[[FX-SPEC-SR-001]]`
- 시나리오 A: `[[FX-SPEC-SR-002]]`
- 시나리오 B: `[[FX-SPEC-SR-003]]`

---

## 1. SrClassifier 서비스

**파일:** `packages/api/src/services/sr-classifier.ts`

### 인터페이스

```typescript
export type SrType =
  | 'security_patch'
  | 'bug_fix'
  | 'env_config'
  | 'doc_update'
  | 'code_change';

export interface SrClassifyResult {
  srType: SrType;
  confidence: number;       // 0.0 ~ 1.0
  matchedKeywords: string[];
}

export class SrClassifier {
  classify(title: string, description: string): SrClassifyResult;
}
```

### 분류 알고리즘

1. `title + ' ' + description`을 소문자 정규화
2. 5종 유형별 키워드 사전과 매칭 (키워드 히트 수 집계)
3. 히트 수를 전체 키워드 수로 나눠 confidence 계산
4. 최고 confidence 유형 선택
5. confidence < 0.5이면 `code_change`로 폴백

### 키워드 사전 (핵심)

```typescript
const KEYWORD_MAP: Record<SrType, string[]> = {
  security_patch: ['cve', '취약점', 'vulnerability', 'owasp', '인증 우회', 'xss', 'sql injection', '보안'],
  bug_fix: ['버그', 'bug', '오류', '에러', 'error', '500', 'crash', '오작동', '수정'],
  env_config: ['환경변수', 'config', '설정', 'timeout', '.env', '환경', 'configuration'],
  doc_update: ['readme', '문서', '주석', 'comment', 'api spec', 'swagger', '문서화'],
  code_change: ['추가', '구현', '신규', 'endpoint', '기능', 'feature', '개발'],
};
```

---

## 2. SrWorkflowMapper 서비스

**파일:** `packages/api/src/services/sr-workflow-mapper.ts`

### 인터페이스

```typescript
export interface WorkflowNode {
  agentType: AgentTaskType;   // 기존 AgentTaskType enum 재사용
  order: number;
  required: boolean;
  description: string;
}

export interface SrWorkflowTemplate {
  srType: SrType;
  nodes: WorkflowNode[];
  estimatedMinutes: number;
}

export class SrWorkflowMapper {
  getWorkflowForType(srType: SrType): SrWorkflowTemplate;
}
```

### 유형별 DAG 매핑

```typescript
const WORKFLOW_TEMPLATES: Record<SrType, SrWorkflowTemplate> = {
  code_change: {
    srType: 'code_change',
    estimatedMinutes: 18,
    nodes: [
      { agentType: 'planner', order: 1, required: true, description: '구현 계획 수립' },
      { agentType: 'architect', order: 2, required: true, description: '아키텍처 설계' },
      { agentType: 'test', order: 3, required: true, description: '테스트 생성' },
      { agentType: 'reviewer', order: 4, required: true, description: '코드 리뷰' },
    ],
  },
  bug_fix: {
    srType: 'bug_fix',
    estimatedMinutes: 25,
    nodes: [
      { agentType: 'qa', order: 1, required: true, description: '버그 재현 분석' },
      { agentType: 'planner', order: 2, required: true, description: '수정 계획 수립' },
      { agentType: 'test', order: 3, required: true, description: '회귀 테스트 생성' },
      { agentType: 'security', order: 4, required: false, description: '보안 영향 검토' },
      { agentType: 'reviewer', order: 5, required: true, description: '코드 리뷰' },
    ],
  },
  security_patch: {
    srType: 'security_patch',
    estimatedMinutes: 30,
    nodes: [
      { agentType: 'security', order: 1, required: true, description: 'OWASP 취약점 분석' },
      { agentType: 'planner', order: 2, required: true, description: '패치 계획 수립' },
      { agentType: 'test', order: 3, required: true, description: '보안 테스트 생성' },
      { agentType: 'reviewer', order: 4, required: true, description: '최종 검토' },
    ],
  },
  env_config: {
    srType: 'env_config',
    estimatedMinutes: 8,
    nodes: [
      { agentType: 'planner', order: 1, required: true, description: '설정 변경 계획' },
      { agentType: 'reviewer', order: 2, required: true, description: '설정 검토' },
    ],
  },
  doc_update: {
    srType: 'doc_update',
    estimatedMinutes: 5,
    nodes: [
      { agentType: 'planner', order: 1, required: true, description: '문서 업데이트 계획' },
      { agentType: 'reviewer', order: 2, required: true, description: '문서 검토' },
    ],
  },
};
```

---

## 3. D1 마이그레이션 (0027)

**파일:** `packages/api/src/db/migrations/0027_sr_requests.sql`

```sql
-- SR 요청 테이블
CREATE TABLE IF NOT EXISTS sr_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sr_type TEXT NOT NULL CHECK(sr_type IN ('security_patch','bug_fix','env_config','doc_update','code_change')),
  confidence REAL NOT NULL DEFAULT 0.0,
  matched_keywords TEXT NOT NULL DEFAULT '[]',  -- JSON array
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed')),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- SR 워크플로우 실행 테이블
CREATE TABLE IF NOT EXISTS sr_workflow_runs (
  id TEXT PRIMARY KEY,
  sr_id TEXT NOT NULL REFERENCES sr_requests(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL,
  nodes TEXT NOT NULL DEFAULT '[]',       -- JSON: WorkflowNode[]
  current_node TEXT,
  result TEXT,                            -- JSON: 최종 결과 리포트
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed')),
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_sr_requests_tenant ON sr_requests(tenant_id);
CREATE INDEX idx_sr_requests_status ON sr_requests(status);
CREATE INDEX idx_sr_workflow_runs_sr_id ON sr_workflow_runs(sr_id);
```

---

## 4. Zod 스키마

**파일:** `packages/api/src/schemas/sr.ts`

```typescript
import { z } from 'zod';

export const SrTypeSchema = z.enum([
  'security_patch', 'bug_fix', 'env_config', 'doc_update', 'code_change'
]);

export const CreateSrRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
});

export const UpdateSrRequestSchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  title: z.string().min(1).max(200).optional(),
});

export const ListSrQuerySchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  srType: SrTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ExecuteSrRequestSchema = z.object({
  force: z.boolean().default(false),  // 이미 실행 중인 경우 강제 재실행
});
```

---

## 5. 라우트 설계

**파일:** `packages/api/src/routes/sr-requests.ts`

```typescript
// POST /api/sr-requests
// - CreateSrRequestSchema 검증
// - SrClassifier.classify() 호출
// - sr_requests INSERT
// - 201 반환

// GET /api/sr-requests
// - ListSrQuerySchema 검증 (query params)
// - tenant_id 필터 필수
// - 200 반환

// GET /api/sr-requests/:id
// - sr_requests + sr_workflow_runs JOIN
// - 404 처리
// - 200 반환

// POST /api/sr-requests/:id/execute
// - ExecuteSrRequestSchema 검증
// - SrWorkflowMapper.getWorkflowForType() 호출
// - sr_workflow_runs INSERT + 비동기 실행
// - 202 반환

// PATCH /api/sr-requests/:id
// - UpdateSrRequestSchema 검증
// - 부분 업데이트
// - 200 반환
```

**기존 서비스 변경: 0건** — 신규 서비스 2개(SrClassifier, SrWorkflowMapper)만 추가.

---

## 6. 기존 에이전트 연동 방식

기존 `AgentOrchestratorService.runAgent(agentTaskType, context)` 인터페이스를 그대로 사용해요.
`SrWorkflowTemplate.nodes`의 `agentType`을 순차적으로 `runAgent()`에 전달하는 방식이에요.

```typescript
// sr-requests POST /execute 핸들러 내부 (단순화)
const template = mapper.getWorkflowForType(sr.srType);
for (const node of template.nodes.sort((a, b) => a.order - b.order)) {
  await orchestrator.runAgent(node.agentType, { srId: sr.id, ...context });
}
```

---

## 7. 테스트 구조

**파일:** `packages/api/src/routes/__tests__/sr-requests.test.ts`

```
describe('SR Classifier')
  ├── classify('security_patch') → confidence ≥ 0.5
  ├── classify('bug_fix') → srType === 'bug_fix'
  ├── classify('env_config') → matchedKeywords 포함
  ├── classify('doc_update') → srType === 'doc_update'
  ├── classify('code_change') → srType === 'code_change'
  ├── classify(빈 텍스트) → 'code_change' 폴백
  ├── classify(모호한 텍스트) → confidence < 0.5 → 폴백
  ├── 대소문자 무관 분류
  ├── 복합 키워드 매칭
  └── 최고 confidence 유형 선택

describe('SR Workflow Mapper')
  ├── getWorkflowForType('code_change') → 4 nodes
  ├── getWorkflowForType('bug_fix') → 5 nodes
  ├── getWorkflowForType('security_patch') → 4 nodes
  ├── getWorkflowForType('env_config') → 2 nodes
  └── getWorkflowForType('doc_update') → 2 nodes

describe('POST /api/sr-requests')        — 3 tests
describe('GET /api/sr-requests')         — 2 tests
describe('GET /api/sr-requests/:id')     — 2 tests
describe('POST /api/sr-requests/:id/execute') — 3 tests
describe('PATCH /api/sr-requests/:id')   — 3 tests
```

총 28 tests.
