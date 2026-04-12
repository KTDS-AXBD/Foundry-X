---
code: FX-DSGN-S95
title: "Sprint 95 — Help Agent 챗봇 (F264) Design"
version: 1.0
status: Draft
category: DSGN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S95]], [[FX-SPEC-001]]"
---

# Sprint 95: Help Agent 챗봇 (F264) Design

## 1. Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F264 Help Agent (개인 비서) — OpenRouter SSE 스트리밍 챗 + 컨텍스트 인식 |
| Sprint | 95 |
| 예상 변경 | API 5파일 신규 + 1파일 수정, Web 2파일 신규 + 1파일 수정, 테스트 3파일 |
| D1 마이그레이션 | 0078_help_agent.sql |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 팀원들이 BD 프로세스 진행 중 "다음 뭐 해야 돼?", "이 스킬 어떻게 써?" 등 질문할 곳이 없음 |
| Solution | OpenRouter SSE 스트리밍 챗 + Hybrid 분기 (단순→로컬 패턴매칭, 복잡→LLM) |
| Function UX Effect | 위저드 내 플로팅 챗 패널에서 즉시 질의, 컨텍스트 인식 응답 |
| Core Value | CC Cowork 대비 "프로세스 컨텍스트 인식 AI 비서" 차별화 |

## 2. Architecture

### 2.1 시퀀스 다이어그램

```
Client (HelpAgentChat)
  │
  ├── POST /api/help-agent/chat  { message, conversationId, bizItemId?, stage? }
  │     │
  │     ▼
  │   helpAgentRoute (auth + tenant)
  │     │
  │     ▼
  │   HelpAgentService.chat()
  │     ├── LOCAL_PATTERNS 매칭? → 즉시 JSON 응답 { role: "assistant", content, isLocal: true }
  │     └── 미매칭 → OpenRouterService.streamChat()
  │           │
  │           ▼
  │         fetch("https://openrouter.ai/api/v1/chat/completions", { stream: true })
  │           │
  │           ▼
  │         SSE 릴레이 (response.body pipeTo client)
  │
  └── GET /api/help-agent/history?conversationId=xxx
        │
        ▼
      D1 SELECT from help_agent_conversations
```

### 2.2 Hybrid 분기 전략

| 우선순위 | 패턴 (regex) | 로컬 핸들러 | 응답 소스 |
|----------|-------------|------------|-----------|
| 1 | `/다음.*(단계|스텝)|next.*step/i` | `getNextStageGuide(stage)` | BD 프로세스 정의 |
| 2 | `/(이|현재).*(단계|스텝).*뭐|what.*(this|current).*stage/i` | `getCurrentStageInfo(stage)` | BD 프로세스 정의 |
| 3 | `/스킬.*추천|recommend.*skill/i` | `getRecommendedSkills(stage)` | 스킬 매핑 테이블 |
| 4 | `/체크포인트|checkpoint/i` | `getCheckpointQuestions(stage)` | BD 프로세스 정의 |
| - | 기타 | → OpenRouter LLM | SSE 스트리밍 |

### 2.3 컨텍스트 조립

LLM 호출 시 system prompt에 현재 컨텍스트를 주입:

```
당신은 Foundry-X Help Agent입니다.
현재 사용자 상태:
- 사업 아이템: {bizItemTitle}
- 현재 단계: {stage} ({stageName})
- 완료 단계: {completedStages}

AX BD 프로세스 2단계 발굴의 맥락에서 답변하세요.
```

## 3. File Changes

### 3.1 신규 파일

| # | 파일 | 역할 |
|---|------|------|
| 1 | `packages/api/src/services/openrouter-service.ts` | OpenRouter API SSE 프록시 |
| 2 | `packages/api/src/services/help-agent-service.ts` | Hybrid 분기 + 컨텍스트 조립 + 대화 저장 |
| 3 | `packages/api/src/routes/help-agent.ts` | POST /help-agent/chat, GET /help-agent/history |
| 4 | `packages/api/src/schemas/help-agent-schema.ts` | 요청/응답 Zod 스키마 |
| 5 | `packages/api/src/db/migrations/0078_help_agent.sql` | help_agent_conversations 테이블 |
| 6 | `packages/web/src/components/feature/discovery/HelpAgentChat.tsx` | 플로팅 챗 UI |
| 7 | `packages/web/src/lib/stores/help-agent-store.ts` | Zustand 스토어 |

### 3.2 수정 파일

| # | 파일 | 변경 내용 |
|---|------|----------|
| 8 | `packages/api/src/app.ts` | helpAgentRoute import + 등록 |
| 9 | `packages/web/src/components/feature/discovery/DiscoveryWizard.tsx` | HelpAgentChat 임포트 + FAB 버튼 |

### 3.3 테스트 파일

| # | 파일 | 테스트 범위 |
|---|------|-----------|
| 10 | `packages/api/src/__tests__/help-agent-service.test.ts` | Hybrid 분기, 컨텍스트 조립, 대화 저장 |
| 11 | `packages/api/src/__tests__/openrouter-service.test.ts` | SSE 릴레이, 에러 핸들링, 타임아웃 |
| 12 | `packages/api/src/__tests__/help-agent-route.test.ts` | 인증, 요청 검증, 응답 포맷 |

## 4. Detailed Design

### 4.1 OpenRouterService

```typescript
export class OpenRouterService {
  constructor(private apiKey: string, private model?: string) {}

  async streamChat(messages: ChatMessage[], systemPrompt: string): Promise<Response> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://fx.minu.best",
        "X-Title": "Foundry-X Help Agent",
      },
      body: JSON.stringify({
        model: this.model || "anthropic/claude-sonnet-4-6",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }
    return response;
  }
}
```

### 4.2 HelpAgentService

```typescript
export class HelpAgentService {
  constructor(private db: D1Database, private openRouter: OpenRouterService) {}

  // Hybrid 분기: 로컬 패턴 매칭 → 즉시 응답, 미매칭 → LLM SSE
  async chat(params: ChatParams): Promise<Response> {
    const localResponse = this.matchLocalPattern(params.message, params.stage);
    if (localResponse) {
      await this.saveConversation(params, localResponse, true);
      return new Response(JSON.stringify({
        role: "assistant", content: localResponse, isLocal: true,
      }), { headers: { "Content-Type": "application/json" } });
    }
    // LLM path
    const systemPrompt = this.buildSystemPrompt(params);
    const history = await this.getRecentHistory(params.conversationId, 10);
    const messages = [...history, { role: "user" as const, content: params.message }];
    await this.saveConversation(params, params.message, false, "user");
    const response = await this.openRouter.streamChat(messages, systemPrompt);
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  private matchLocalPattern(message: string, stage?: string): string | null { ... }
  private buildSystemPrompt(params: ChatParams): string { ... }
  private async getRecentHistory(conversationId: string, limit: number): Promise<ChatMessage[]> { ... }
  async saveConversation(params: ChatParams, content: string, isLocal: boolean, role?: string): Promise<void> { ... }
  async getHistory(conversationId: string): Promise<ConversationMessage[]> { ... }
}
```

### 4.3 D1 스키마

```sql
CREATE TABLE IF NOT EXISTS help_agent_conversations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  biz_item_id TEXT,
  discovery_stage TEXT,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER DEFAULT 0,
  is_local_response INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_help_agent_conv ON help_agent_conversations(conversation_id, created_at);
CREATE INDEX idx_help_agent_tenant ON help_agent_conversations(tenant_id, created_at);
```

### 4.4 Route 설계

| 메서드 | 경로 | 설명 | 응답 |
|--------|------|------|------|
| POST | `/api/help-agent/chat` | 챗 메시지 전송 | 로컬: JSON, LLM: SSE stream |
| GET | `/api/help-agent/history` | 대화 이력 조회 | JSON array |

### 4.5 Web 컴포넌트 — HelpAgentChat

- **위치**: DiscoveryWizard 하단 FAB (Floating Action Button)
- **상태**: 접힘(FAB만) / 펼침(챗 패널)
- **SSE 처리**: `fetch()` + `ReadableStream` reader로 chunk 파싱
- **Zustand 상태**: messages[], isStreaming, isOpen, conversationId

### 4.6 Zustand Store

```typescript
interface HelpAgentState {
  messages: Message[];
  isStreaming: boolean;
  isOpen: boolean;
  conversationId: string;
  sendMessage: (msg: string, bizItemId?: string, stage?: string) => Promise<void>;
  loadHistory: (conversationId: string) => Promise<void>;
  toggle: () => void;
  reset: () => void;
}
```

## 5. Worker 파일 매핑

단일 구현 (Worker 분리 불필요 — 파일 간 의존성 높음)

## 6. 성공 기준

- [ ] POST /api/help-agent/chat — 로컬 패턴 즉시 응답 (<100ms)
- [ ] POST /api/help-agent/chat — LLM SSE 스트리밍 정상 릴레이
- [ ] GET /api/help-agent/history — 대화 이력 JSON 반환
- [ ] HelpAgentChat UI — FAB 클릭으로 패널 열기/닫기
- [ ] D1 대화 저장 + 조회
- [ ] 테스트 3파일, 10개 이상 통과
