---
code: FX-DSGN-017
title: Sprint 16 (v1.4.0) — PlannerAgent LLM 실 연동 + AgentInboxPanel UI + 프로덕션 배포 상세 설계
version: 0.1
status: Draft
category: DSGN
system-version: 1.4.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 16 (v1.4.0) Design Document

> **Summary**: PlannerAgent Mock→Claude API 전환 상세 설계, AgentInboxPanel UI 컴포넌트 설계, AgentPlanCard shared import 전환, api-client 확장, 프로덕션 배포 절차.
>
> **Project**: Foundry-X
> **Version**: 1.4.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft
> **Planning Doc**: [[FX-PLAN-017]] (`docs/01-plan/features/sprint-16.plan.md`)

---

## 1. Overview

### 1.1 Design Goals

1. PlannerAgent `createPlan()`의 Mock 분석을 Claude API 호출로 교체 — JSON 구조화 응답 + 폴백
2. AgentInboxPanel 신규 UI — 메시지 목록/타입별 렌더링/ack/SSE 실시간
3. AgentPlanCard inline 타입을 `@foundry-x/shared` import으로 전환
4. api-client.ts에 plan/inbox API 함수 6개 추가
5. D1 migration 0009 remote + Workers/Pages 재배포

### 1.2 환경 변경 요약

| 항목 | 현재 | 변경 후 |
|------|:----:|:-------:|
| API endpoints | 57 | 57 (변경 없음, 기존 라우트 활용) |
| Web 컴포넌트 | 기존 feature/ 13개 | 14개 (+AgentInboxPanel) |
| api-client 함수 | 25개 | 31개 (+6) |
| PlannerAgent LLM | Mock (정적 문자열) | Claude API (Haiku) |

---

## 2. F75: PlannerAgent LLM 실 연동 — 상세 설계

### 2.1 현재 코드 분석

`planner-agent.ts` (208 LOC) — Mock 로직 위치:

```
Lines 60-89: createPlan() 내부
├── 60-64: codebaseAnalysis — 정적 문자열 생성 (targetFiles 나열)
├── 67-80: proposedSteps — 파일당 "modify" step + instructions시 "create" step
├── 83-86: risks — targetFiles > 5일 때만 1개 리스크
└── 88-89: estimatedFiles/Tokens — 파일수 × 2000
```

### 2.2 변경 설계

#### 2.2.1 PlannerAgentDeps 확장

```typescript
// planner-agent.ts — deps 인터페이스 확장
interface PlannerAgentDeps {
  db: D1Database;
  sse?: SSEManager;
  apiKey?: string;              // NEW: Anthropic API key
  model?: string;               // NEW: 기본값 "claude-haiku-4-5-20250714"
}
```

#### 2.2.2 analyzeCodebase() — 신규 private 메서드

```typescript
// PlannerAgent 클래스에 추가
private async analyzeCodebase(
  taskType: AgentTaskType,
  context: AgentExecutionRequest["context"],
): Promise<{
  codebaseAnalysis: string;
  proposedSteps: ProposedStep[];
  risks: string[];
  estimatedTokens: number;
}> {
  // API key 없으면 Mock 폴백
  if (!this.deps.apiKey) {
    return this.mockAnalysis(taskType, context);
  }

  const systemPrompt = PLANNER_SYSTEM_PROMPT;
  const userPrompt = this.buildPlannerPrompt(taskType, context);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.deps.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.deps.model ?? "claude-haiku-4-5-20250714",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      // API 에러 → Mock 폴백
      return this.mockAnalysis(taskType, context);
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");

    return this.parseAnalysisResponse(text, context);
  } catch {
    // 네트워크 에러 등 → Mock 폴백
    return this.mockAnalysis(taskType, context);
  }
}
```

#### 2.2.3 PLANNER_SYSTEM_PROMPT — 전용 프롬프트

```typescript
const PLANNER_SYSTEM_PROMPT = `You are a PlannerAgent for the Foundry-X project.
Your job is to analyze the given codebase context and create an execution plan.

You MUST respond with valid JSON in this exact schema:
{
  "codebaseAnalysis": "2-3 sentence analysis of the target codebase area",
  "proposedSteps": [
    {
      "description": "What to do in this step",
      "type": "create" | "modify" | "delete" | "test",
      "targetFile": "optional/file/path.ts",
      "estimatedLines": 20
    }
  ],
  "risks": ["Risk description 1", "Risk description 2"],
  "estimatedTokens": 5000
}

Guidelines:
- Analyze the target files and their relationships
- Break down the task into atomic, ordered steps
- Each step should modify at most 1-2 files
- Identify risks: dependency changes, breaking changes, test coverage gaps
- Estimate tokens conservatively (lines × 10 + overhead)
- Respond in Korean for analysis text, English for technical terms`;
```

#### 2.2.4 buildPlannerPrompt() — 사용자 프롬프트 구성

```typescript
private buildPlannerPrompt(
  taskType: AgentTaskType,
  context: AgentExecutionRequest["context"],
): string {
  const parts: string[] = [];

  parts.push(`## Task Type: ${taskType}`);
  parts.push(`## Repository: ${context.repoUrl}`);
  parts.push(`## Branch: ${context.branch}`);

  if (context.targetFiles?.length) {
    parts.push(`## Target Files\n${context.targetFiles.join("\n")}`);
  }

  if (context.instructions) {
    parts.push(`## Instructions\n${context.instructions}`);
  }

  if (context.spec) {
    parts.push(`## Spec\nTitle: ${context.spec.title}`);
    parts.push(`Description: ${context.spec.description}`);
    if (context.spec.acceptanceCriteria.length > 0) {
      parts.push(`Acceptance Criteria:\n${context.spec.acceptanceCriteria.map(c => `- ${c}`).join("\n")}`);
    }
  }

  return parts.join("\n\n");
}
```

#### 2.2.5 parseAnalysisResponse() + mockAnalysis()

```typescript
private parseAnalysisResponse(
  text: string,
  context: AgentExecutionRequest["context"],
): {
  codebaseAnalysis: string;
  proposedSteps: ProposedStep[];
  risks: string[];
  estimatedTokens: number;
} {
  try {
    // JSON 블록 추출 (```json...``` 래핑 대응)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      codebaseAnalysis: parsed.codebaseAnalysis ?? "분석 결과 없음",
      proposedSteps: Array.isArray(parsed.proposedSteps)
        ? parsed.proposedSteps.map((s: any) => ({
            description: s.description ?? "",
            type: s.type ?? "modify",
            targetFile: s.targetFile,
            estimatedLines: s.estimatedLines ?? 20,
          }))
        : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      estimatedTokens: typeof parsed.estimatedTokens === "number"
        ? parsed.estimatedTokens
        : (context.targetFiles?.length ?? 1) * 2000,
    };
  } catch {
    // 파싱 실패 → Mock 폴백
    return this.mockAnalysis("code-generation", context);
  }
}

// 기존 Mock 로직을 메서드로 추출
private mockAnalysis(
  _taskType: AgentTaskType,
  context: AgentExecutionRequest["context"],
): {
  codebaseAnalysis: string;
  proposedSteps: ProposedStep[];
  risks: string[];
  estimatedTokens: number;
} {
  const targetFiles = context.targetFiles ?? [];
  const codebaseAnalysis = targetFiles.length > 0
    ? `대상 파일 ${targetFiles.length}개 분석: ${targetFiles.join(", ")}`
    : `${context.repoUrl} 리포지토리 ${context.branch} 브랜치 분석`;

  const proposedSteps: ProposedStep[] = targetFiles.map((file) => ({
    description: `${file} 수정`,
    type: "modify" as const,
    targetFile: file,
    estimatedLines: 20,
  }));

  if (context.instructions) {
    proposedSteps.push({
      description: context.instructions,
      type: "create" as const,
      estimatedLines: 50,
    });
  }

  const risks: string[] = [];
  if (targetFiles.length > 5) {
    risks.push(`영향 범위가 넓음: ${targetFiles.length}개 파일 수정`);
  }

  return {
    codebaseAnalysis,
    proposedSteps,
    risks,
    estimatedTokens: (targetFiles.length || 1) * 2000,
  };
}
```

#### 2.2.6 createPlan() 변경 — Mock 교체

```typescript
// createPlan() 내부 변경 (lines 60-89 교체)
async createPlan(
  agentId: string,
  taskType: AgentTaskType,
  context: AgentExecutionRequest["context"],
): Promise<AgentPlan> {
  const id = `plan-${crypto.randomUUID().slice(0, 8)}`;
  const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  // LLM 분석 (API key 없으면 자동 Mock 폴백)
  const analysis = await this.analyzeCodebase(taskType, context);

  const estimatedFiles = analysis.proposedSteps.filter(s => s.targetFile).length
    || context.targetFiles?.length || 1;

  await this.deps.db
    .prepare(/* ... INSERT 동일 ... */)
    .bind(
      id, taskId, agentId, analysis.codebaseAnalysis,
      JSON.stringify(analysis.proposedSteps), estimatedFiles,
      JSON.stringify(analysis.risks), analysis.estimatedTokens, now,
    )
    .run();

  // SSE + return 동일
}
```

#### 2.2.7 서비스 생성 시 apiKey 주입

```typescript
// packages/api/src/index.ts 또는 agent 라우트에서
const planner = new PlannerAgent({
  db: c.env.DB,
  sse: sseManager,
  apiKey: c.env.ANTHROPIC_API_KEY,  // Workers secret에서 주입
});
```

### 2.3 테스트 설계

| # | 테스트 케이스 | 검증 포인트 |
|---|-------------|------------|
| T1 | createPlan() with apiKey + 정상 JSON 응답 | LLM 분석 결과가 AgentPlan에 반영 |
| T2 | createPlan() with apiKey + 비정상 JSON 응답 | Mock 폴백 동작 |
| T3 | createPlan() with apiKey + API 에러(500) | Mock 폴백 동작 |
| T4 | createPlan() without apiKey | Mock 직접 사용 |
| T5 | parseAnalysisResponse() JSON 파싱 성공 | proposedSteps/risks 매핑 정확 |
| T6 | parseAnalysisResponse() JSON 블록 추출 (```json``` 래핑) | regex 추출 동작 |

**Mock 전략**: `global.fetch`를 `vi.fn()`으로 mock하여 Claude API 응답 시뮬레이션

---

## 3. F76: AgentInboxPanel UI + AgentPlanCard 정리 — 상세 설계

### 3.1 AgentPlanCard.tsx — shared import 전환

#### 변경 전 (현재)

```typescript
// lines 9-25: inline 타입 정의
interface ProposedStep {
  description: string;
  type: "create" | "modify" | "delete" | "test";
}

interface AgentPlan {
  id: string;
  taskId: string;
  // ... 13 fields
  status: "pending_approval" | "approved" | "rejected" | "modified";
}
```

#### 변경 후

```typescript
import type {
  AgentPlan,
  ProposedStep,
  AgentPlanStatus,
} from "@foundry-x/shared";

// inline 타입 삭제 (lines 9-25 전체 제거)
// AgentPlanCardProps만 유지
interface AgentPlanCardProps {
  plan: AgentPlan;
  onApprove?: (planId: string) => void;
  onReject?: (planId: string, reason: string) => void;
  onModify?: (planId: string, feedback: string) => void;
}
```

**변경 범위**: 9~25행 삭제 + 1~4행 import 추가. 나머지 코드는 변경 없음.

### 3.2 AgentInboxPanel.tsx — 신규 컴포넌트 설계

#### 3.2.1 컴포넌트 구조

```
AgentInboxPanel
├── Props: { agentId: string; className?: string }
├── State: messages[], loading, unreadFilter
├── API: GET /agents/inbox/{agentId}, POST /agents/inbox/{id}/ack
├── SSE: agent.message.received → 실시간 메시지 추가
└── Render
    ├── Header (inbox 제목 + 미읽음 배지 + 필터 토글)
    ├── MessageList
    │   └── MessageItem (타입별 아이콘 + subject + from + 시간 + ack 버튼)
    └── EmptyState (메시지 없음)
```

#### 3.2.2 컴포넌트 코드 설계

```typescript
// packages/web/src/components/feature/AgentInboxPanel.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AgentMessage, MessageType } from "@foundry-x/shared";
import { listInboxMessages, acknowledgeMessage } from "@/lib/api-client";

interface AgentInboxPanelProps {
  agentId: string;
  className?: string;
}

// 메시지 타입별 아이콘 + 색상
const messageTypeConfig: Record<MessageType, { icon: string; label: string; color: string }> = {
  task_assign:   { icon: "📋", label: "작업 지시",  color: "bg-blue-100 dark:bg-blue-900/30" },
  task_result:   { icon: "✅", label: "작업 결과",  color: "bg-green-100 dark:bg-green-900/30" },
  task_question: { icon: "❓", label: "질문",       color: "bg-yellow-100 dark:bg-yellow-900/30" },
  task_feedback: { icon: "💬", label: "피드백",     color: "bg-purple-100 dark:bg-purple-900/30" },
  status_update: { icon: "📊", label: "상태 업데이트", color: "bg-gray-100 dark:bg-gray-900/30" },
};

export function AgentInboxPanel({ agentId, className }: AgentInboxPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  // 메시지 로드
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listInboxMessages(agentId, unreadOnly, 50);
      setMessages(data.messages);
    } catch { /* silent */ }
    setLoading(false);
  }, [agentId, unreadOnly]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // SSE 실시간 수신 (기존 SSEClient 패턴)
  useEffect(() => {
    const eventSource = new EventSource(`/api/agents/stream`);
    eventSource.addEventListener("agent.message.received", (e) => {
      const data = JSON.parse(e.data);
      if (data.toAgentId === agentId) {
        loadMessages(); // 새 메시지 수신 시 리로드
      }
    });
    return () => eventSource.close();
  }, [agentId, loadMessages]);

  // 메시지 확인 (ack)
  const handleAck = async (messageId: string) => {
    await acknowledgeMessage(messageId);
    setMessages(prev =>
      prev.map(m => m.id === messageId
        ? { ...m, acknowledged: true, acknowledgedAt: new Date().toISOString() }
        : m
      )
    );
  };

  const unreadCount = messages.filter(m => !m.acknowledged).length;

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Inbox</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant={unreadOnly ? "default" : "ghost"}
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            미읽음만
          </Button>
        </div>

        {/* Message List */}
        {loading ? (
          <p className="text-xs text-muted-foreground">로딩 중...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">메시지가 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((msg) => {
              const config = messageTypeConfig[msg.type];
              return (
                <li
                  key={msg.id}
                  className={`rounded p-2 text-xs ${
                    msg.acknowledged
                      ? "opacity-60"
                      : config.color
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span>{config.icon}</span>
                        <span className="font-medium">{msg.subject}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        from: {msg.fromAgentId} · {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    {!msg.acknowledged && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAck(msg.id)}
                      >
                        확인
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

### 3.3 api-client.ts 확장 — 6개 함수

```typescript
// ─── Agent Plan (F75/F76) ───

export interface AgentPlanResponse {
  id: string;
  taskId: string;
  agentId: string;
  codebaseAnalysis: string;
  proposedSteps: Array<{
    description: string;
    type: "create" | "modify" | "delete" | "test";
    targetFile?: string;
    estimatedLines?: number;
  }>;
  estimatedFiles: number;
  risks: string[];
  estimatedTokens: number;
  status: string;
  humanFeedback?: string;
  createdAt: string;
}

export async function createPlan(
  agentId: string,
  taskType: string,
  context: {
    repoUrl?: string;
    branch?: string;
    targetFiles?: string[];
    instructions?: string;
  },
): Promise<AgentPlanResponse> {
  const url = `${BASE_URL}/agents/plan`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      agentId,
      taskType,
      context: {
        repoUrl: context.repoUrl ?? "https://github.com/KTDS-AXBD/Foundry-X",
        branch: context.branch ?? "master",
        ...context,
      },
    }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<AgentPlanResponse>;
}

export async function approvePlan(planId: string): Promise<AgentPlanResponse> {
  const url = `${BASE_URL}/agents/plan/${planId}/approve`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<AgentPlanResponse>;
}

export async function rejectPlan(
  planId: string,
  reason: string,
): Promise<AgentPlanResponse> {
  const url = `${BASE_URL}/agents/plan/${planId}/reject`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<AgentPlanResponse>;
}

// ─── Agent Inbox (F76) ───

export interface InboxMessagesResponse {
  messages: Array<{
    id: string;
    fromAgentId: string;
    toAgentId: string;
    type: string;
    subject: string;
    payload: Record<string, unknown>;
    acknowledged: boolean;
    parentMessageId?: string;
    createdAt: string;
    acknowledgedAt?: string;
  }>;
}

export async function listInboxMessages(
  agentId: string,
  unreadOnly?: boolean,
  limit?: number,
): Promise<InboxMessagesResponse> {
  const params = new URLSearchParams();
  if (unreadOnly) params.set("unreadOnly", "true");
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return fetchApi(`/agents/inbox/${agentId}${qs ? `?${qs}` : ""}`);
}

export async function sendInboxMessage(
  fromAgentId: string,
  toAgentId: string,
  type: string,
  subject: string,
  payload: Record<string, unknown>,
  parentMessageId?: string,
): Promise<Record<string, unknown>> {
  const url = `${BASE_URL}/agents/inbox/send`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ fromAgentId, toAgentId, type, subject, payload, parentMessageId }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function acknowledgeMessage(messageId: string): Promise<void> {
  const url = `${BASE_URL}/agents/inbox/${messageId}/ack`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
}
```

### 3.4 agents/page.tsx 통합

#### 변경 사항

1. **탭 추가**: `activeTab` 선택지에 `"inbox"` | `"plans"` 추가

```typescript
// 기존: agents | prs | queue | parallel
// 변경: agents | plans | inbox | prs | queue | parallel
type TabType = "agents" | "plans" | "inbox" | "prs" | "queue" | "parallel";
```

2. **Import 추가**:
```typescript
import { AgentPlanCard } from "@/components/feature/AgentPlanCard";
import { AgentInboxPanel } from "@/components/feature/AgentInboxPanel";
import { createPlan, approvePlan, rejectPlan } from "@/lib/api-client";
```

3. **Plans 탭 렌더링**: 에이전트 선택 시 해당 에이전트의 계획 목록 + AgentPlanCard

4. **Inbox 탭 렌더링**: 선택된 agentId로 `<AgentInboxPanel agentId={selectedAgentId} />`

---

## 4. F77: 프로덕션 배포 상세 설계

### 4.1 배포 절차

```
Step 1: D1 migration 상태 확인
  $ wrangler d1 migrations list foundry-x-db --remote

Step 2: D1 migration 0009 적용
  $ wrangler d1 migrations apply foundry-x-db --remote

Step 3: 테이블 확인
  $ wrangler d1 execute foundry-x-db --remote \
    --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  → agent_plans, agent_messages, agent_worktrees 3개 테이블 확인

Step 4: Workers 배포
  $ cd packages/api && wrangler deploy

Step 5: Health check
  $ curl https://foundry-x-api.ktds-axbd.workers.dev/health

Step 6: Pages 배포
  $ cd packages/web && wrangler pages deploy out --project-name foundry-x-web

Step 7: 대시보드 접근 확인
  $ curl -I https://fx.minu.best

Step 8: Smoke test
  - POST /auth/login → 200
  - POST /agents/plan → 200 (인증 필요)
  - GET /agents/inbox/{agentId} → 200
```

### 4.2 버전 범프

| 파일 | 현재 | 변경 |
|------|:----:|:----:|
| `package.json` (root) | 1.3.0 | 1.4.0 |
| `packages/api/package.json` | 1.3.0 | 1.4.0 |
| `packages/web/package.json` | 1.3.0 | 1.4.0 |
| `packages/shared/package.json` | 1.3.0 | 1.4.0 |
| `SPEC.md` system-version | 1.3.0 | 1.4.0 |

---

## 5. 파일 변경 매트릭스

| 파일 | F# | 작업 | LOC |
|------|:--:|------|:---:|
| `packages/api/src/services/planner-agent.ts` | F75 | Mock→LLM 교체 + analyzeCodebase() + mockAnalysis() + parseAnalysisResponse() + PLANNER_SYSTEM_PROMPT | +80 |
| `packages/api/src/__tests__/planner-agent.test.ts` | F75 | LLM mock + 파싱 성공/실패 6케이스 추가 | +60 |
| `packages/web/src/components/feature/AgentPlanCard.tsx` | F76 | inline 타입 삭제 + shared import | -15, +3 |
| `packages/web/src/components/feature/AgentInboxPanel.tsx` | F76 | **신규** — 메시지 목록 + ack + SSE | +120 |
| `packages/web/src/app/(app)/agents/page.tsx` | F76 | plans/inbox 탭 추가 + 컴포넌트 통합 | +40 |
| `packages/web/src/lib/api-client.ts` | F76 | plan 3함수 + inbox 3함수 | +90 |
| `package.json` (×4) | F77 | version bump | +4 |
| `docs/CHANGELOG.md` | F77 | v1.4.0 항목 | +15 |
| `SPEC.md` | F77 | system-version + §2 갱신 | +5 |

**합계**: 신규 ~120 LOC + 수정 ~280 LOC + 테스트 +60 LOC

---

## 6. 구현 순서

| # | 작업 | 선행 | 예상 |
|:-:|------|------|:----:|
| 1 | F75: PlannerAgent LLM 전환 (planner-agent.ts) | — | ★★☆ |
| 2 | F75: planner-agent.test.ts 확장 | #1 | ★☆☆ |
| 3 | F76: AgentPlanCard shared import | — | ★☆☆ |
| 4 | F76: api-client.ts plan/inbox 함수 6개 | — | ★☆☆ |
| 5 | F76: AgentInboxPanel.tsx 신규 | #4 | ★★☆ |
| 6 | F76: agents/page.tsx plans/inbox 탭 통합 | #3,#5 | ★★☆ |
| 7 | 전체 typecheck + test | #1~#6 | ★☆☆ |
| 8 | F77: D1 migration 0009 remote | #7 | ★☆☆ |
| 9 | F77: Workers/Pages 재배포 + smoke | #8 | ★☆☆ |
| 10 | F77: version bump + tag | #9 | ★☆☆ |

**병렬 가능**: #1/#2와 #3/#4/#5는 독립적이므로 병렬 진행 가능

---

## 7. 테스트 계획

| F# | 테스트 | 건수 | 방법 |
|:--:|--------|:----:|------|
| F75 | PlannerAgent LLM mock + 파싱 | +6 | vitest, fetch mock |
| F76 | AgentInboxPanel 렌더링 | +2 | vitest, React Testing Library |
| F76 | AgentPlanCard shared import 정상 | +1 | typecheck 통과 확인 |
| F77 | 프로덕션 smoke test | 수동 | curl + 대시보드 접근 |

**예상 총 테스트**: 기존 307 API + 신규 ~9 = **~316건**
