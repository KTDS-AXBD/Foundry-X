---
id: FX-PLAN-280
title: Sprint 280 — F527 Agent Runtime (L2)
sprint: 280
f_items: [F527]
req_codes: [FX-REQ-555]
date: 2026-04-13
status: active
---

# Sprint 280 Plan — F527 Agent Runtime (L2)

## 목표

HyperFX Agent Stack의 Layer 2(Agent Runtime)를 구현한다.
기존 7개 전문 에이전트가 하드코딩된 패턴을 선언적 `AgentSpec` + `AgentRuntime` 으로 표준화.

## 범위 (F-L2-1 ~ F-L2-7)

| 서브기능 | 설명 | 파일 |
|---------|------|------|
| F-L2-1 | `defineTool()` — 도구 정의 표준 유틸리티 | `runtime/define-tool.ts` |
| F-L2-2 | `AgentSpec` YAML 스키마 (TS 타입 + 파서) | `shared/agent-runtime.ts` + `runtime/agent-spec-loader.ts` |
| F-L2-3 | `AgentRuntime` — 추론→도구→결과→반복 루프 | `runtime/agent-runtime.ts` |
| F-L2-4 | Hooks — 라이프사이클 이벤트 (before/after Model/Tool/Invocation) | `runtime/agent-runtime.ts` 내장 |
| F-L2-5 | `TokenTracker` — 에이전트별 토큰 추적 | `runtime/token-tracker.ts` |
| F-L2-6 | `ToolRegistry` — 도구 등록/검색/카테고리화 | `runtime/tool-registry.ts` |
| F-L2-7 | 기존 7개 에이전트 YAML 마이그레이션 | `specs/*.agent.yaml` |

## 아키텍처 결정

### YAML 파싱 전략
- 공용 `yaml` npm 패키지 없이 경량 파서 구현 (Workers 호환)
- `AgentSpec`은 TypeScript 타입으로 정의 (JSON 직렬화 가능)
- YAML 파일은 human-readable 소스, 파서가 TS 객체로 변환
- Workers 런타임에서는 KV 또는 번들 string으로 제공

### Claude API 연동
- `AgentRuntime`은 기존 `fetch`→Anthropic API 패턴 유지
- 도구 호출은 Claude의 `tool_use` content block 처리
- 스트리밍은 F529(Sprint 282)에서 추가 — 이번 스프린트는 비스트리밍

### 기존 코드 영향
- 기존 `ClaudeApiRunner`, `OrchestrationLoop` 수정 없음
- `AgentRuntime`은 별도 레이어 — F528에서 O-G-D Loop 래핑 시 연결

## TDD 계획

**적용 등급**: 필수 (새 서비스 로직)

| 테스트 대상 | Red 시나리오 |
|------------|-------------|
| `defineTool()` | 스키마 검증, name/description 필수 |
| `ToolRegistry` | register/get/list/category 필터 |
| `TokenTracker` | track/getUsage/total 집계 |
| `AgentRuntime` | stop reason 처리, hooks 실행 순서 |
| `AgentSpecLoader` | 유효/무효 YAML 파싱 |

## 파일 매핑

```
packages/
  shared/src/
    agent-runtime.ts          (신규: AgentSpec, ToolDefinition, hooks 타입)
  api/src/
    core/agent/runtime/
      index.ts                (barrel export)
      define-tool.ts          (F-L2-1)
      tool-registry.ts        (F-L2-6)
      token-tracker.ts        (F-L2-5)
      agent-spec-loader.ts    (F-L2-2 파서)
      agent-runtime.ts        (F-L2-3 + F-L2-4)
    core/agent/specs/
      planner.agent.yaml
      architect.agent.yaml
      reviewer.agent.yaml
      test.agent.yaml
      security.agent.yaml
      qa.agent.yaml
      infra.agent.yaml
    __tests__/services/
      agent-runtime.test.ts   (TDD Red→Green)
```
