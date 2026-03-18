---
code: FX-DSGN-012
title: MCP 프로토콜 연동 설계
version: 0.1
status: Draft
category: DSGN
system-version: 0.11.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# MCP Protocol Integration Design

> Sprint 11(F58)에서 정의한 MCP 1.0 프로토콜 연동 설계. Sprint 12+에서 구현 예정.

## 1. MCP 1.0 프로토콜 요약

| 개념 | 설명 | Foundry-X 활용 |
|------|------|--------------|
| **Transport** | stdio, SSE, HTTP — 클라이언트↔서버 통신 | SSE (Workers 호환 1순위), HTTP (fallback) |
| **Tools** | MCP 서버가 노출하는 실행 가능 도구 | AgentTaskType → MCP tool 매핑 |
| **Resources** | MCP 서버가 제공하는 읽기 전용 데이터 | Git 리포 파일을 리소스로 노출 |
| **Prompts** | MCP 서버의 프롬프트 템플릿 | taskType별 프롬프트 재사용 |
| **Sampling** | LLM 호출 위임 | ClaudeApiRunner → McpAgentRunner 전환 시 활용 |

## 2. 연동 아키텍처

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│ AgentOrch.  │────▸│McpAgentRunner│────▸│ MCP Server     │
│ executeTask()│     │              │     │ (외부 AI Agent) │
│             │     │ McpTransport │     │                │
│             │     │ (SSE/HTTP)   │     │ Tools:         │
│             │     │              │     │ - code_review  │
│             │     │ taskType →   │     │ - code_gen     │
│             │     │ tool mapping │     │ - spec_analyze │
└─────────────┘     └──────────────┘     └────────────────┘
```

## 3. TaskType → MCP Tool 매핑

| AgentTaskType | MCP Tool Name | MCP Input |
|---------------|---------------|-----------|
| code-review | foundry_code_review | `{ files, spec }` |
| code-generation | foundry_code_gen | `{ spec, instructions }` |
| spec-analysis | foundry_spec_analyze | `{ newSpec, existing }` |
| test-generation | foundry_test_gen | `{ files, spec }` |

## 4. McpTransport 구현 우선순위

1. **SseTransport** — Cloudflare Workers에서 EventSource 기반 연결 (SSE 클라이언트). 가장 적합.
2. **HttpTransport** — 범용 fetch 기반. Workers 완벽 호환. Fallback.
3. **StdioTransport** — 로컬 개발 전용. Workers 미지원 (subprocess 불가).

## 5. Sprint 12 구현 범위

- [ ] SseTransport 구현 (EventSource 기반)
- [ ] McpRunner 구현 (McpAgentRunner 인터페이스)
- [ ] MCP 서버 연결 설정 UI (대시보드)
- [ ] E2E: MCP 연동 흐름 테스트

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-18 | Initial draft — MCP 1.0 연동 설계 |
