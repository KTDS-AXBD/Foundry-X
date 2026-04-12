---
code: FX-PLAN-S95
title: "Sprint 95 — Help Agent 챗봇 (F264)"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-DSGN-FDU]]"
---

# Sprint 95: Help Agent 챗봇 (F264)

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F264 Help Agent (개인 비서) — OpenRouter SSE 스트리밍 챗 + 컨텍스트 인식 |
| Sprint | 95 |
| 우선순위 | P0 |
| 의존성 | F263(위저드 UI, Sprint 94 완료 후), F57(SSE 인프라), F260(스킬 실행) |
| Design | docs/02-design/features/fx-discovery-ux.design.md §3 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 팀원들이 "다음 뭐 해야 돼?", "이 스킬 어떻게 써?" 등 질문할 곳이 없음 |
| Solution | OpenRouter SSE 스트리밍 챗 + Hybrid 분기 (단순→로컬, 복잡→LLM) |
| Function UX Effect | 위저드 내 챗 패널에서 즉시 질의, 컨텍스트 인식 응답 |
| Core Value | CC Cowork 대비 "프로세스 컨텍스트 인식 AI 비서" 차별화 |

## 작업 목록

### API (신규)

| # | 파일 | 설명 |
|---|------|------|
| 1 | `api/src/services/openrouter-service.ts` | OpenRouter SSE 프록시 — fetch + ReadableStream.pipeTo() 릴레이 |
| 2 | `api/src/services/help-agent-service.ts` | 컨텍스트 조립 + Hybrid 분기 (LOCAL_PATTERNS 매칭 → 로컬 응답 / 미매칭 → LLM) |
| 3 | `api/src/routes/help-agent.ts` | POST /help-agent/chat (SSE), GET /help-agent/history |
| 4 | `api/src/schemas/help-agent-schema.ts` | 요청/응답 Zod 스키마 |
| 5 | `api/src/db/migrations/0078_help_agent.sql` | help_agent_conversations 테이블 |

### Web (신규)

| # | 파일 | 설명 |
|---|------|------|
| 6 | `web/src/components/feature/discovery/HelpAgentChat.tsx` | 챗 UI — floating panel, SSE EventSource, 타이핑 애니메이션 |
| 7 | `web/src/lib/stores/help-agent-store.ts` | Zustand: 대화 이력, 스트리밍 상태, 접기/펼치기 |

### 수정

| # | 파일 | 설명 |
|---|------|------|
| 8 | `api/src/index.ts` | help-agent 라우트 등록 |
| 9 | `web/src/components/feature/discovery/DiscoveryWizard.tsx` | HelpAgentChat 임포트 + 하단 FAB |

### 테스트

| # | 파일 | 설명 |
|---|------|------|
| 10 | `api/src/services/__tests__/help-agent-service.test.ts` | Hybrid 분기 로직 |
| 11 | `api/src/services/__tests__/openrouter-service.test.ts` | SSE 릴레이 (mock fetch) |
| 12 | `api/src/routes/__tests__/help-agent.test.ts` | 인증 + 요청 검증 |

## 기술 결정

### OpenRouter SSE 릴레이

```typescript
// Workers에서 OpenRouter SSE → 클라이언트 SSE 릴레이
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
  body: JSON.stringify({ model: "anthropic/claude-sonnet-4-6", stream: true, ... }),
});
return new Response(response.body, {
  headers: { "Content-Type": "text/event-stream" },
});
```

### Hybrid 분기 패턴 목록

| 패턴 | 로컬 핸들러 | 응답 소스 |
|------|------------|-----------|
| `다음.*단계`, `next.*step` | getNextStageGuide() | bd-process.ts |
| `이.*단계.*뭐`, `what.*stage` | getCurrentStageInfo() | bd-process.ts |
| `스킬.*추천`, `recommend.*skill` | getRecommendedSkills() | bd-skills.ts |
| `체크포인트`, `checkpoint` | getCheckpointQuestions() | bd-process.ts |
| 기타 | → OpenRouter LLM | SSE 스트리밍 |

### D1 스키마

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
CREATE INDEX idx_help_agent_biz ON help_agent_conversations(biz_item_id, created_at);
```

### Workers Secret

- `OPENROUTER_API_KEY` — Sprint 95 시작 시 `wrangler secret put OPENROUTER_API_KEY` 실행 필요

## 사전 조건

- [x] OpenRouter API Key 확보
- [ ] Sprint 94 (F263 위저드 UI) merge 완료
- [ ] `wrangler secret put OPENROUTER_API_KEY` 실행 (Windows PowerShell)

## 리스크

| 리스크 | 대응 |
|--------|------|
| OpenRouter 응답 품질 | Hybrid로 단순질문은 로컬 처리, 복잡질문만 LLM |
| SSE Workers 릴레이 지연 | ReadableStream.pipeTo() 패턴, 타임아웃 30s |
| D1 대화 이력 누적 | conversation_id 기반 정리, 30일 retention (P2) |

## 성공 기준

- [ ] Help Agent 챗이 위저드 내에서 동작
- [ ] Hybrid: 단순질문 즉시 응답 (<100ms), 복잡질문 SSE 스트리밍
- [ ] 대화 이력 D1 저장 + 조회
- [ ] 테스트 3건 이상 통과
