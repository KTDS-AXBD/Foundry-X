---
code: FX-DSGN-069
title: "Sprint 69 Design — F213 Foundry-X API v8.2 확장"
version: 1.0
status: Active
category: DSGN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 69
features: [F213]
req: [FX-REQ-205]
plan: "[[FX-PLAN-069]]"
---

## Executive Summary

| 관점 | 결과 |
|------|------|
| **Match Rate 목표** | 92% |
| **신규 파일** | 12 (services 3, routes 1, schemas 2, migrations 3, tests 3) |
| **수정 파일** | 3 (app.ts, biz-items.ts route, biz-item.ts schema) |
| **D1 테이블** | 2 신규 (ax_viability_checkpoints, ax_commit_gates) + 1 ALTER (biz_items) |

---

## 1. 아키텍처 개요

```
[Web Dashboard / CLI]
       │
       ▼
 /api/biz-items/:id/discovery-type     ← 유형 설정 (PATCH)
 /api/biz-items/:id/analysis-path      ← 경로 조회 (GET)
 /api/ax-bd/viability/checkpoints      ← 체크포인트 CRUD
 /api/ax-bd/viability/traffic-light    ← 누적 신호등
 /api/ax-bd/viability/commit-gate      ← Commit Gate
       │
       ▼
 ViabilityCheckpointService   CommitGateService   AnalysisPathV82
       │                           │
       ▼                           ▼
 ax_viability_checkpoints      ax_commit_gates
 biz_items.discovery_type
```

---

## 2. D1 마이그레이션 상세

### 0058_discovery_type_enum.sql

```sql
-- biz_items에 discovery_type 컬럼 추가
ALTER TABLE biz_items ADD COLUMN discovery_type TEXT
  CHECK (discovery_type IN ('I', 'M', 'P', 'T', 'S'));
```

### 0059_viability_checkpoints.sql

```sql
CREATE TABLE IF NOT EXISTS ax_viability_checkpoints (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('2-1','2-2','2-3','2-4','2-5','2-6','2-7')),
  decision TEXT NOT NULL CHECK (decision IN ('go','pivot','drop')),
  question TEXT NOT NULL,
  reason TEXT,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
  UNIQUE(biz_item_id, stage)
);

CREATE INDEX idx_viability_cp_item ON ax_viability_checkpoints(biz_item_id);
CREATE INDEX idx_viability_cp_org ON ax_viability_checkpoints(org_id);
```

### 0060_commit_gates.sql

```sql
CREATE TABLE IF NOT EXISTS ax_commit_gates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  question_1_answer TEXT,
  question_2_answer TEXT,
  question_3_answer TEXT,
  question_4_answer TEXT,
  final_decision TEXT NOT NULL CHECK (final_decision IN ('commit','explore_alternatives','drop')),
  reason TEXT,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
  UNIQUE(biz_item_id)
);
```

---

## 3. 스키마 상세

### schemas/viability-checkpoint.schema.ts

```typescript
import { z } from "@hono/zod-openapi";

export const discoveryTypeEnum = z.enum(["I", "M", "P", "T", "S"]);
export const stageEnum = z.enum(["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7"]);
export const decisionEnum = z.enum(["go", "pivot", "drop"]);

export const SetDiscoveryTypeSchema = z.object({
  discoveryType: discoveryTypeEnum,
}).openapi("SetDiscoveryType");

export const CreateCheckpointSchema = z.object({
  bizItemId: z.string().min(1),
  stage: stageEnum,
  decision: decisionEnum,
  question: z.string().min(1).max(500),
  reason: z.string().max(2000).optional(),
}).openapi("CreateCheckpoint");

export const UpdateCheckpointSchema = z.object({
  decision: decisionEnum,
  question: z.string().min(1).max(500).optional(),
  reason: z.string().max(2000).optional(),
}).openapi("UpdateCheckpoint");
```

### schemas/commit-gate.schema.ts

```typescript
import { z } from "@hono/zod-openapi";

export const commitGateDecisionEnum = z.enum(["commit", "explore_alternatives", "drop"]);

export const CreateCommitGateSchema = z.object({
  bizItemId: z.string().min(1),
  question1Answer: z.string().max(2000).optional(),
  question2Answer: z.string().max(2000).optional(),
  question3Answer: z.string().max(2000).optional(),
  question4Answer: z.string().max(2000).optional(),
  finalDecision: commitGateDecisionEnum,
  reason: z.string().max(2000).optional(),
}).openapi("CreateCommitGate");
```

---

## 4. 서비스 상세

### services/viability-checkpoint-service.ts

```typescript
export class ViabilityCheckpointService {
  constructor(private db: D1Database) {}

  // 체크포인트 생성 (UPSERT — 같은 stage가 이미 있으면 덮어쓰기)
  async create(orgId: string, userId: string, input: CreateCheckpointInput): Promise<Checkpoint>

  // 아이템별 전체 체크포인트 조회
  async listByItem(bizItemId: string): Promise<Checkpoint[]>

  // 특정 stage 체크포인트 수정
  async update(bizItemId: string, stage: string, input: UpdateCheckpointInput): Promise<Checkpoint>

  // 특정 stage 체크포인트 삭제
  async delete(bizItemId: string, stage: string): Promise<boolean>

  // 트래픽 라이트 집계
  async getTrafficLight(bizItemId: string): Promise<TrafficLight>
}

export interface TrafficLight {
  bizItemId: string;
  summary: { go: number; pivot: number; drop: number; pending: number };
  commitGate: { decision: string; decidedAt: string } | null;
  checkpoints: Checkpoint[];
  overallSignal: "green" | "yellow" | "red";
}
```

**overallSignal 로직**:
- `green`: drop=0 && pivot≤1
- `yellow`: drop=0 && pivot≥2, 또는 commitGate=explore_alternatives
- `red`: drop≥1, 또는 commitGate=drop

### services/commit-gate-service.ts

```typescript
export class CommitGateService {
  constructor(private db: D1Database) {}

  // Commit Gate 기록 (UPSERT — bizItemId당 1개)
  async create(orgId: string, userId: string, input: CreateCommitGateInput): Promise<CommitGate>

  // 조회
  async getByItem(bizItemId: string): Promise<CommitGate | null>
}
```

### services/analysis-path-v82.ts

```typescript
export type Intensity = "core" | "normal" | "light";
export type DiscoveryType = "I" | "M" | "P" | "T" | "S";
export type Stage = "2-1" | "2-2" | "2-3" | "2-4" | "2-5" | "2-6" | "2-7";

// 정적 매핑 — 프로세스 v8.2 AX_BD_COWORK_SETUP.md 기반
export const ANALYSIS_PATH_MAP: Record<Stage, Record<DiscoveryType, Intensity>> = { ... };

// 유형별 분석 경로 + 각 단계의 핵심 스킬 목록
export function getAnalysisPathV82(discoveryType: DiscoveryType): AnalysisPath

// 단계별 사업성 질문 (v8.2)
export const VIABILITY_QUESTIONS: Record<Stage, string> = {
  "2-1": "여기까지 봤을 때, 우리가 뭔가 다르게 할 수 있는 부분이 보이나요?",
  "2-2": "시장 규모나 타이밍을 보니, 우리 팀이 이걸 지금 추진할 만한 이유가 있나요?",
  "2-3": "경쟁 상황을 보니, 우리만의 자리가 있을까요?",
  "2-4": "이 아이템을 30초로 설명한다면, 듣는 사람이 고개를 끄덕일까요?",
  "2-5": "(Commit Gate — 별도 플로우)",
  "2-6": "이 고객이 진짜 존재하고, 진짜 이 문제를 겪고 있다는 확신이 있나요?",
  "2-7": "이 비즈니스 모델로 돈을 벌 수 있다고 믿나요? 아니면 희망사항인가요?",
};

export const COMMIT_GATE_QUESTIONS = [
  "이 아이템에 앞으로 4주를 투자한다면, 그 시간이 아깝지 않을까요?",
  "우리 조직이 이걸 해야 하는 이유가 명확한가요? 규모가 아니더라도요.",
  "지금까지 Pivot한 부분이 있었다면, 그 방향 전환에 확신이 있나요?",
  "이 아이템이 안 되면, 우리가 잃는 것과 얻는 것은 뭔가요?",
];
```

---

## 5. 라우트 상세

### routes/ax-bd-viability.ts (신규)

| # | Method | Path | Handler | 스키마 |
|---|--------|------|---------|--------|
| 1 | POST | /ax-bd/viability/checkpoints | create | CreateCheckpointSchema |
| 2 | GET | /ax-bd/viability/checkpoints/:bizItemId | listByItem | — |
| 3 | PUT | /ax-bd/viability/checkpoints/:bizItemId/:stage | update | UpdateCheckpointSchema |
| 4 | DELETE | /ax-bd/viability/checkpoints/:bizItemId/:stage | delete | — |
| 5 | GET | /ax-bd/viability/traffic-light/:bizItemId | getTrafficLight | — |
| 6 | POST | /ax-bd/viability/commit-gate | create | CreateCommitGateSchema |
| 7 | GET | /ax-bd/viability/commit-gate/:bizItemId | getByItem | — |

### routes/biz-items.ts (수정 — 2개 엔드포인트 추가)

| # | Method | Path | Handler | 스키마 |
|---|--------|------|---------|--------|
| 8 | PATCH | /biz-items/:id/discovery-type | updateDiscoveryType | SetDiscoveryTypeSchema |
| 9 | GET | /biz-items/:id/analysis-path | getAnalysisPath | — |

---

## 6. 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `app.ts` | import axBdViabilityRoute + app.route 등록 |
| `routes/biz-items.ts` | PATCH /:id/discovery-type, GET /:id/analysis-path 추가 |
| `schemas/biz-item.ts` | discoveryTypeEnum export 추가 |
| `services/biz-item-service.ts` | updateDiscoveryType() 메서드 추가 |

---

## 7. 테스트 계획

### 파일 목록

| 테스트 파일 | 대상 | 예상 케이스 |
|------------|------|-----------|
| `viability-checkpoint.test.ts` | ViabilityCheckpointService + 라우트 | ~18 |
| `commit-gate.test.ts` | CommitGateService + 라우트 | ~10 |
| `analysis-path-v82.test.ts` | getAnalysisPathV82 + 정적 매핑 | ~12 |

**총 예상**: ~40 tests

### 핵심 테스트 시나리오

1. **체크포인트 CRUD**: create/read/update/delete + UPSERT 동작
2. **트래픽 라이트**: go만 → green, pivot 2회 → yellow, drop 1회 → red
3. **Commit Gate**: create + 중복 생성 시 UPSERT
4. **discovery_type**: 유효값(I/M/P/T/S) 성공 + 무효값 거부
5. **analysis-path**: 각 유형별 7단계 강도 매핑 검증
6. **사업성 질문**: 각 stage별 올바른 질문 반환

---

## 8. 테스트 헬퍼 SQL

각 테스트 파일의 `beforeEach`에서 사용할 테이블 생성 SQL:

```sql
-- biz_items (기존 + discovery_type 추가)
CREATE TABLE IF NOT EXISTS biz_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'field',
  status TEXT NOT NULL DEFAULT 'draft',
  discovery_type TEXT CHECK (discovery_type IN ('I', 'M', 'P', 'T', 'S')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ax_viability_checkpoints
CREATE TABLE IF NOT EXISTS ax_viability_checkpoints (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('2-1','2-2','2-3','2-4','2-5','2-6','2-7')),
  decision TEXT NOT NULL CHECK (decision IN ('go','pivot','drop')),
  question TEXT NOT NULL,
  reason TEXT,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
  UNIQUE(biz_item_id, stage)
);

-- ax_commit_gates
CREATE TABLE IF NOT EXISTS ax_commit_gates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  question_1_answer TEXT,
  question_2_answer TEXT,
  question_3_answer TEXT,
  question_4_answer TEXT,
  final_decision TEXT NOT NULL CHECK (final_decision IN ('commit','explore_alternatives','drop')),
  reason TEXT,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
  UNIQUE(biz_item_id)
);
```
