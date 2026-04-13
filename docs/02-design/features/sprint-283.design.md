---
id: FX-DESIGN-283
title: Sprint 283 Design — F530 Meta Layer (L4)
sprint: 283
f_items: [F530]
req_codes: [FX-REQ-558]
date: 2026-04-13
status: active
---

# Sprint 283 Design — F530 Meta Layer (L4)

## §1 목표

HyperFX Agent Stack Layer 4(Meta Layer)를 구현한다.
6축 DiagnosticCollector + MetaAgent(YAML diff 개선 제안) + Human Approval Web UI.

## §2 선행 의존

| 파일 | 역할 |
|------|------|
| `streaming/agent-metrics-service.ts` | D1 `agent_run_metrics` 읽기 |
| `services/agent-self-reflection.ts` | Verification 축 소스 |
| `runtime/token-tracker.ts` | Cost/Memory 축 소스 |
| `runtime/agent-runtime.ts` | MetaAgent 실행 엔진 |

## §3 공유 타입 (packages/shared/src/agent-meta.ts)

```typescript
export type DiagnosticAxis =
  | "ToolEffectiveness"
  | "Memory"
  | "Planning"
  | "Verification"
  | "Cost"
  | "Convergence";

export interface AxisScore {
  axis: DiagnosticAxis;
  score: number;          // 0-100
  rawValue: number;       // 원시 수치
  unit: string;           // 예: "ratio", "tokens/round", "score"
  trend: "up" | "down" | "stable";
}

export interface DiagnosticReport {
  sessionId: string;
  agentId: string;
  collectedAt: string;
  scores: AxisScore[];
  overallScore: number;   // 6축 단순 평균
}

export type ProposalType = "prompt" | "tool" | "model" | "graph";
export type ProposalStatus = "pending" | "approved" | "rejected";

export interface ImprovementProposal {
  id: string;
  sessionId: string;
  agentId: string;
  type: ProposalType;
  title: string;
  reasoning: string;
  yamlDiff: string;
  status: ProposalStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}
```

## §4 DiagnosticCollector (F-L4-1)

### 파일: `packages/api/src/core/agent/services/diagnostic-collector.ts`

```
6축 계산 공식:
  ToolEffectiveness = (round에서 tool_use 이후 end_turn 비율)
                      — D1 agent_run_metrics rounds 기반 추정
  Memory            = 1 - (inputTokens증가율 / rounds) — 낮을수록 good
  Planning          = min(1, expectedRounds / actualRounds) * 100
  Verification      = AgentSelfReflection.score (0-100)
  Cost              = 100 - min(100, (totalTokens / rounds) / 500) * 100
                      — 500 tokens/round을 기준 (초과면 감점)
  Convergence       = end_turn 비율 * 100
```

### 입력/출력

```typescript
class DiagnosticCollector {
  constructor(db: D1Database) {}
  async collect(sessionId: string, agentId: string): Promise<DiagnosticReport>
}
```

## §5 MetaAgent (F-L4-2)

### 파일: `packages/api/src/core/agent/services/meta-agent.ts`

```
AgentRuntime 재사용 — meta-agent.agent.yaml 정의
입력: DiagnosticReport JSON → 시스템 프롬프트에 삽입
출력: JSON 파싱 → ImprovementProposal[] (DB 저장)

프롬프트 전략:
  1. 점수가 70 미만인 축 식별
  2. 해당 축에 대해 개선 제안 1~3건 생성
  3. 각 제안: type + title + reasoning + yamlDiff (YAML 포맷 변경 diff)
  4. max_tokens=2048, model=claude-haiku-4-5 (비용 절약)
```

### 예시 YAML diff

```yaml
# type: prompt
# title: "시스템 프롬프트에 도구 우선순위 가이드 추가"
- systemPrompt: |
    You are an agent...
+ systemPrompt: |
    You are an agent...
    Tool Priority: prefer web_search over fallback tools.
```

## §6 D1 Migration

### 파일: `packages/api/src/db/migrations/0133_agent_improvement_proposals.sql`

```sql
CREATE TABLE IF NOT EXISTS agent_improvement_proposals (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL,
  agent_id         TEXT NOT NULL,
  type             TEXT NOT NULL,   -- 'prompt'|'tool'|'model'|'graph'
  title            TEXT NOT NULL,
  reasoning        TEXT NOT NULL,
  yaml_diff        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_aip_session ON agent_improvement_proposals(session_id);
CREATE INDEX IF NOT EXISTS idx_aip_status  ON agent_improvement_proposals(status);
```

## §7 API Routes (F-L4-3)

### 파일: `packages/api/src/core/agent/routes/meta.ts`

```
GET  /api/meta/proposals              — 목록 (?status=pending|approved|rejected)
POST /api/meta/diagnose               — 진단 실행 (sessionId, agentId → DiagnosticReport)
POST /api/meta/proposals/:id/approve  — 승인
POST /api/meta/proposals/:id/reject   — 거부 (body: { reason: string })
```

## §8 Web UI (F-L4-3)

### 라우트: `packages/web/src/routes/agent-meta.tsx`
### 컴포넌트: `packages/web/src/components/feature/AgentMetaDashboard.tsx`

```
레이아웃:
  [헤더] "Agent Meta Layer" + "진단 실행" 버튼
  [진단 요약] 6축 레이더 점수 카드 (텍스트 기반, Chart.js 없음)
  [제안 목록] 카드 per 제안:
    - 타입 뱃지 (prompt/tool/model/graph)
    - 제목 + reasoning 요약
    - YAML diff 코드 블록
    - [승인] [거부] 버튼 (pending 상태만)
```

## §9 파일 매핑 (Worker 없음 — Claude 직접 구현)

| 파일 | 역할 | TDD |
|------|------|-----|
| `packages/shared/src/agent-meta.ts` | 공유 타입 | 면제 |
| `packages/api/src/db/migrations/0133_agent_improvement_proposals.sql` | D1 스키마 | 면제 |
| `packages/api/src/core/agent/services/diagnostic-collector.ts` | 6축 계산 | 필수 |
| `packages/api/src/core/agent/services/meta-agent.ts` | MetaAgent | 필수 |
| `packages/api/src/core/agent/services/meta-approval.ts` | DB CRUD (승인/거부) | 필수 |
| `packages/api/src/core/agent/routes/meta.ts` | API 엔드포인트 | 필수 |
| `packages/api/src/core/agent/specs/meta-agent.agent.yaml` | AgentSpec | 면제 |
| `packages/web/src/routes/agent-meta.tsx` | 라우트 셸 | 면제 |
| `packages/web/src/components/feature/AgentMetaDashboard.tsx` | UI 컴포넌트 | 권장 |
| `packages/api/src/core/agent/index.ts` | metaRoute export 추가 | 면제 |

## §10 테스트 계약 (TDD Red Target)

### diagnostic-collector.test.ts

```
1. D1 데이터 없을 때 기본 점수 반환 (오류 아님)
2. rounds=1, end_turn인 경우 Convergence=100
3. inputTokens/rounds 높으면 Memory 점수 낮음
4. overallScore = 6축 평균
```

### meta-agent.test.ts

```
1. DiagnosticReport(낮은 점수) → 1개 이상 ImprovementProposal 반환
2. 제안의 type이 유효한 값 중 하나
3. yamlDiff가 비어있지 않음
```

### meta-approval.test.ts (Hono app.request)

```
1. POST /api/meta/proposals/:id/approve → status='approved'
2. POST /api/meta/proposals/:id/reject → status='rejected' + rejectionReason
3. 존재하지 않는 ID → 404
4. GET /api/meta/proposals?status=pending → 목록 반환
```
