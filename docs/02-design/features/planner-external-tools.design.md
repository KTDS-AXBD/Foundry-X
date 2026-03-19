---
code: FX-DSGN-020
title: PlannerAgent gatherExternalToolInfo() 프롬프트 연동 설계
version: 0.1
status: Draft
category: DSGN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
---

# PlannerAgent gatherExternalToolInfo() 프롬프트 연동 설계

> **Summary**: PlannerAgent가 MCP Registry의 외부 도구 정보를 수집하여 LLM 프롬프트에 주입, external_tool step 생성을 가능케 하는 설계
>
> **Project**: Foundry-X
> **Version**: 1.5.0+
> **Author**: Sinclair Seo
> **Date**: 2026-03-19
> **Status**: Draft
> **Planning Doc**: [planner-external-tools.plan.md](../../01-plan/features/planner-external-tools.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- `gatherExternalToolInfo()` 메서드로 active MCP 서버의 도구 목록을 D1에서 수집
- 시스템 프롬프트에 `external_tool` step JSON 스키마 가이드 추가
- 사용자 프롬프트에 수집된 도구 목록을 동적 주입
- mcpRegistry 미제공 / 도구 0개 시 기존 동작 100% 유지 (graceful 폴백)

### 1.2 Design Principles

- **최소 변경**: `planner-agent.ts` 1파일 수정, 시그니처 변경 최소화
- **기존 계약 보존**: mockAnalysis() 결과 구조 불변, parseAnalysisResponse() 확장만
- **프롬프트 크기 제어**: 도구 수 상한 + 설명 길이 truncate

---

## 2. Architecture

### 2.1 변경 대상 파일

| 파일 | 변경 유형 | LOC 예상 |
|------|-----------|----------|
| `packages/api/src/services/planner-agent.ts` | Modify | +60~80 |
| `packages/api/src/__tests__/planner-agent.test.ts` | Modify | +80~100 |

### 2.2 데이터 흐름

```
createPlan(agentId, taskType, context)
  └→ analyzeCodebase(taskType, context)
       ├→ [NEW] gatherExternalToolInfo()
       │    └→ this.deps.mcpRegistry?.listServers()
       │         └→ filter: status === 'active' && toolsCache !== null
       │              └→ parse toolsCache JSON → ExternalToolInfo[]
       │
       ├→ buildPlannerPrompt(taskType, context)
       │    └→ [MODIFIED] append externalTools section if tools.length > 0
       │
       └→ fetch(anthropic API, {
              system: PLANNER_SYSTEM_PROMPT,    ← [MODIFIED] external_tool 가이드 추가
              messages: [{ content: prompt }]   ← externalTools 섹션 포함
           })
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `PlannerAgent.gatherExternalToolInfo()` | `McpServerRegistry.listServers()` | active 서버 + toolsCache 조회 |
| `PlannerAgent.buildPlannerPrompt()` | `ExternalToolInfo[]` | 프롬프트에 도구 목록 주입 |
| `PLANNER_SYSTEM_PROMPT` | `ProposedStep` 타입 | external_tool 스키마 가이드 |

---

## 3. Data Model

### 3.1 ExternalToolInfo (신규 로컬 인터페이스)

```typescript
interface ExternalToolInfo {
  serverId: string;
  serverName: string;
  tools: { name: string; description: string }[];
}
```

### 3.2 toolsCache 파싱 구조 (기존)

`McpServerRecord.toolsCache`는 `JSON.stringify(tools)` 형태로 저장돼요:

```typescript
// toolsCache JSON 예시
[
  { "name": "analyze-code", "description": "Analyze code quality" },
  { "name": "generate-test", "description": "Generate unit tests" }
]
```

`findServerForTool()`에서 이미 동일한 파싱 패턴을 사용 중 — 재사용해요.

---

## 4. 상세 설계

### 4.1 gatherExternalToolInfo()

```typescript
private async gatherExternalToolInfo(): Promise<ExternalToolInfo[]> {
  if (!this.deps.mcpRegistry) return [];

  try {
    const servers = await this.deps.mcpRegistry.listServers();
    const result: ExternalToolInfo[] = [];

    for (const server of servers) {
      if (server.status !== "active" || !server.toolsCache) continue;
      try {
        const tools = JSON.parse(server.toolsCache) as { name: string; description?: string }[];
        // 서버당 상위 10개 도구만 포함 (프롬프트 크기 제어)
        const limited = tools.slice(0, 10).map((t) => ({
          name: t.name,
          description: (t.description ?? "").slice(0, 80),
        }));
        if (limited.length > 0) {
          result.push({
            serverId: server.id,
            serverName: server.name,
            tools: limited,
          });
        }
      } catch {
        // invalid JSON — skip this server
      }
    }

    return result;
  } catch {
    return [];
  }
}
```

**설계 결정:**
- 외부 try-catch: `listServers()` D1 실패 시 빈 배열 반환
- 내부 try-catch: 개별 서버 toolsCache 파싱 실패 시 해당 서버만 skip
- 상한: 서버당 10개, 설명 80자 — 3개 서버 × 10개 = 30 도구 ≈ 프롬프트 +1,500 토큰

### 4.2 PLANNER_SYSTEM_PROMPT 확장

기존 JSON 스키마에 `external_tool` type 가이드 추가:

```typescript
const PLANNER_SYSTEM_PROMPT = `You are a PlannerAgent for the Foundry-X project.
Your job is to analyze the given codebase context and create an execution plan.

You MUST respond with valid JSON in this exact schema:
{
  "codebaseAnalysis": "2-3 sentence analysis of the target codebase area",
  "proposedSteps": [
    {
      "description": "What to do in this step",
      "type": "create" | "modify" | "delete" | "test" | "external_tool",
      "targetFile": "optional/file/path.ts",
      "estimatedLines": 20,
      "externalTool": {
        "serverId": "server-id (from Available External Tools)",
        "toolName": "tool-name (from Available External Tools)",
        "arguments": { "key": "value" }
      }
    }
  ],
  "risks": ["Risk description 1"],
  "estimatedTokens": 5000
}

Guidelines:
- Analyze the target files and their relationships
- Break down the task into atomic, ordered steps
- Each step should modify at most 1-2 files
- Identify risks: dependency changes, breaking changes, test coverage gaps
- Estimate tokens conservatively (lines * 10 + overhead)
- Respond in Korean for analysis text, English for technical terms
- For "external_tool" type: ONLY use when the task cannot be accomplished by code changes alone.
  Include the externalTool field with serverId and toolName from the Available External Tools list.
  If no external tools are available or relevant, do NOT use this type.`;
```

**변경 포인트:**
1. `"type"` 열거에 `"external_tool"` 추가
2. `"externalTool"` 필드 스키마 추가
3. Guidelines에 `external_tool` 사용 기준 2줄 추가

### 4.3 buildPlannerPrompt() 확장

`analyzeCodebase()` 내부에서 도구 정보를 프롬프트에 append:

```typescript
private async analyzeCodebase(
  taskType: AgentTaskType,
  context: AgentExecutionRequest["context"],
): Promise<...> {
  if (!this.deps.apiKey) {
    return this.mockAnalysis(taskType, context);
  }

  // [NEW] 외부 도구 정보 수집
  const externalTools = await this.gatherExternalToolInfo();

  try {
    let prompt = this.buildPlannerPrompt(taskType, context);

    // [NEW] 도구 목록 주입
    if (externalTools.length > 0) {
      prompt += "\n\nAvailable External Tools:";
      for (const server of externalTools) {
        prompt += `\n[Server: ${server.serverName} (id: ${server.serverId})]`;
        for (const tool of server.tools) {
          prompt += `\n  - ${tool.name}: ${tool.description}`;
        }
      }
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", { ... });
    // ... 기존 로직 동일
  }
}
```

**설계 결정:**
- `buildPlannerPrompt()` 시그니처 불변 — `analyzeCodebase()` 내부에서 append
- 도구 0개면 섹션 자체 생략 → 기존 동작과 100% 동일
- 도구 정보 포맷: `[Server: name (id: xxx)]` + `  - toolName: description`

### 4.4 parseAnalysisResponse() — 변경 없음

현재 `parseAnalysisResponse()`는 이미 `ProposedStep` 배열을 그대로 반환해요:

```typescript
proposedSteps: Array.isArray(parsed.proposedSteps) ? parsed.proposedSteps : [],
```

`ProposedStep` 타입에 `externalTool` 필드가 이미 optional로 정의되어 있으므로, LLM이 `externalTool` 필드를 포함한 JSON을 반환하면 자동으로 파싱돼요. **추가 코드 불필요.**

### 4.5 mockAnalysis() — 변경 없음

apiKey 없을 때(mock 모드) external_tool step을 생성할 필요 없어요. mock은 기존 코드 수정 step만 반환.

---

## 5. Error Handling

| 시나리오 | 처리 | 결과 |
|----------|------|------|
| `mcpRegistry` 미제공 (undefined) | `gatherExternalToolInfo()` 즉시 `[]` 반환 | 기존 동작 유지 |
| `listServers()` D1 쿼리 실패 | 외부 try-catch → `[]` 반환 | 기존 동작 유지 |
| 특정 서버 `toolsCache` 파싱 실패 | 내부 try-catch → 해당 서버 skip | 다른 서버 정상 처리 |
| active 서버 0개 또는 도구 0개 | `externalTools.length === 0` → 프롬프트 미확장 | 기존 동작 유지 |
| LLM이 잘못된 externalTool 필드 생성 | parseAnalysisResponse()에서 그대로 통과 (타입은 맞지만 값이 잘못될 수 있음) | 실행 단계에서 검증 (Out of Scope) |

---

## 6. Test Plan

### 6.1 테스트 범위

| Type | Target | Tool |
|------|--------|------|
| Unit Test | gatherExternalToolInfo() | vitest |
| Unit Test | 프롬프트 내용 검증 | vitest |
| Unit Test | parseAnalysisResponse() external_tool 파싱 | vitest |
| Unit Test | 폴백 시나리오 (mcpRegistry 없음, 에러) | vitest |

### 6.2 테스트 케이스

| ID | 케이스 | 검증 포인트 |
|----|--------|-------------|
| ET-01 | mcpRegistry 있고 active 서버 2개 + toolsCache 있음 | 프롬프트에 "Available External Tools" 섹션 포함 |
| ET-02 | mcpRegistry 없음 (undefined) | 기존 프롬프트와 동일, 외부 도구 섹션 없음 |
| ET-03 | 모든 서버 inactive | 외부 도구 섹션 없음 |
| ET-04 | toolsCache가 invalid JSON | 해당 서버 skip, 에러 없이 계속 |
| ET-05 | LLM 응답에 external_tool step 포함 | parseAnalysisResponse()에서 externalTool 필드 정상 파싱 |
| ET-06 | 서버에 도구 15개 → 10개로 truncate | gatherExternalToolInfo() 반환값 확인 |
| ET-07 | gatherExternalToolInfo() + LLM mock → createPlan() e2e | external_tool step이 plan.proposedSteps에 포함 |

### 6.3 mcpRegistry Mock 구조

```typescript
function createMockMcpRegistry(servers: Partial<McpServerRecord>[] = []) {
  return {
    listServers: vi.fn().mockResolvedValue(servers.map((s) => ({
      id: s.id ?? "srv-1",
      name: s.name ?? "Test Server",
      serverUrl: s.serverUrl ?? "https://example.com/mcp",
      transportType: s.transportType ?? "http",
      apiKeyEncrypted: null,
      status: s.status ?? "active",
      lastConnectedAt: null,
      errorMessage: null,
      toolsCache: s.toolsCache ?? null,
      toolsCachedAt: null,
      createdAt: "2026-03-19T00:00:00Z",
      updatedAt: "2026-03-19T00:00:00Z",
      ...s,
    }))),
  } as any;
}
```

---

## 7. Implementation Order

1. [ ] `ExternalToolInfo` 인터페이스 정의 (planner-agent.ts 상단)
2. [ ] `gatherExternalToolInfo()` private async 메서드 구현
3. [ ] `PLANNER_SYSTEM_PROMPT` 확장 — external_tool type + externalTool 스키마
4. [ ] `analyzeCodebase()` 수정 — gatherExternalToolInfo() 호출 + 프롬프트 append
5. [ ] 테스트 ET-01~ET-07 작성
6. [ ] typecheck + lint + 기존 313 테스트 통과 확인

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-19 | Initial draft | Sinclair Seo |
