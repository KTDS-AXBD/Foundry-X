---
code: FX-PLAN-021
title: PlannerAgent gatherExternalToolInfo() 프롬프트 연동
version: 0.1
status: Draft
category: PLAN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
---

# PlannerAgent gatherExternalToolInfo() 프롬프트 연동

> **Summary**: PlannerAgent가 MCP Registry의 외부 도구 정보를 LLM 프롬프트에 주입하여 `external_tool` 타입 step을 생성할 수 있게 하는 기능
>
> **Project**: Foundry-X
> **Version**: 1.5.0+
> **Author**: Sinclair Seo
> **Date**: 2026-03-19
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | PlannerAgent에 mcpRegistry DI가 연결되어 있지만 실제로 사용하지 않아, LLM이 외부 MCP 도구의 존재를 모르고 계획 수립 시 external_tool step을 생성하지 못해요 |
| **Solution** | `gatherExternalToolInfo()` 메서드로 등록된 MCP 서버의 도구 목록을 수집하고, 시스템 프롬프트 + 사용자 프롬프트에 주입하여 LLM이 적절한 external_tool step을 제안할 수 있게 해요 |
| **Function/UX Effect** | AI 에이전트가 코드 수정뿐 아니라 외부 도구 호출(AI Foundry, 외부 MCP 서버)까지 포함하는 종합적인 실행 계획을 자동 생성해요 |
| **Core Value** | "코드만 아는 에이전트"에서 "도구를 활용할 줄 아는 에이전트"로 진화 — Foundry-X의 MCP 생태계 투자가 실질적 가치로 전환돼요 |

---

## 1. Overview

### 1.1 Purpose

PlannerAgent가 `createPlan()` 호출 시 등록된 MCP 서버의 도구 목록을 LLM 프롬프트에 포함시켜, 실행 계획에 `external_tool` 타입 step이 자연스럽게 생성되도록 해요.

### 1.2 Background

- Sprint 17(F80)에서 `ProposedStep.externalTool` 필드와 `'external_tool'` type을 추가했어요
- `McpServerRegistry.PRESET_CONFIGS`에 AI Foundry 프리셋이 등록되어 있어요
- `PlannerAgentDeps.mcpRegistry`로 DI는 받지만, `analyzeCodebase()`에서 사용하지 않아요
- `PLANNER_SYSTEM_PROMPT`에 외부 도구 관련 가이드가 없어요

### 1.3 Related Documents

- Sprint 17 Design: `docs/archive/2026-03/sprint-17/sprint-17.design.md` (F80 AI Foundry MCP)
- MCP Protocol Design: `docs/02-design/features/mcp-protocol.design.md`
- ProposedStep 타입: `packages/shared/src/agent.ts:556`

---

## 2. Scope

### 2.1 In Scope

- [ ] `gatherExternalToolInfo()` 메서드 구현 — mcpRegistry에서 active 서버의 도구 목록 수집
- [ ] `PLANNER_SYSTEM_PROMPT` 확장 — external_tool step 생성 가이드 + JSON 스키마 추가
- [ ] `buildPlannerPrompt()` 확장 — 수집된 도구 목록을 사용자 프롬프트에 주입
- [ ] `analyzeCodebase()` 흐름에 gatherExternalToolInfo() 통합
- [ ] 테스트 — mcpRegistry mock + external_tool step 파싱 검증

### 2.2 Out of Scope

- external_tool step의 실제 실행 로직 (executePlan에서의 MCP tool.call())
- MCP 서버 헬스체크 / 도구 캐시 갱신 로직
- UI에서 external_tool step 표시 개선 (AgentPlanCard 수정)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | gatherExternalToolInfo()가 mcpRegistry.listServers()에서 active 서버만 필터링 | High | Pending |
| FR-02 | 각 서버의 toolsCache를 파싱하여 도구 이름 + 설명 목록 생성 | High | Pending |
| FR-03 | PLANNER_SYSTEM_PROMPT에 external_tool step JSON 스키마 가이드 추가 | High | Pending |
| FR-04 | buildPlannerPrompt()에 Available External Tools 섹션 추가 | High | Pending |
| FR-05 | mcpRegistry가 없거나 도구가 0개일 때 graceful 폴백 (기존 동작 유지) | Medium | Pending |
| FR-06 | parseAnalysisResponse()가 external_tool type + externalTool 필드를 올바르게 파싱 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | gatherExternalToolInfo() < 100ms (D1 단일 쿼리) | 테스트 측정 |
| Resilience | mcpRegistry 쿼리 실패 시 빈 배열 반환, 기존 계획 수립 정상 진행 | 에러 주입 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] gatherExternalToolInfo() 메서드 구현 + 단위 테스트
- [ ] PLANNER_SYSTEM_PROMPT에 external_tool 가이드 포함
- [ ] buildPlannerPrompt()에 도구 목록 주입
- [ ] parseAnalysisResponse()에서 external_tool step 파싱 검증
- [ ] mcpRegistry 미제공 시 기존 동작 유지 확인
- [ ] typecheck + lint + 기존 테스트 통과

### 4.2 Quality Criteria

- [ ] 기존 313 API 테스트 전부 통과 (회귀 없음)
- [ ] 신규 테스트 5건 이상 추가
- [ ] Zero lint errors

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| toolsCache가 null인 서버가 많아 빈 도구 목록 | Low | High | 빈 목록이면 프롬프트에서 외부 도구 섹션 생략 |
| LLM이 external_tool step을 과도하게 생성 | Medium | Low | 프롬프트에 "코드 수정으로 해결 가능하면 external_tool 사용하지 말 것" 가이드 |
| toolsCache JSON 파싱 실패 | Low | Low | try-catch + skip, findServerForTool()과 동일 패턴 |
| 프롬프트 길이 증가로 토큰 비용 상승 | Low | Medium | 서버당 상위 10개 도구만 포함, 설명은 80자 truncate |

---

## 6. Architecture Considerations

### 6.1 수정 대상 파일

| 파일 | 변경 내용 |
|------|-----------|
| `packages/api/src/services/planner-agent.ts` | gatherExternalToolInfo() 추가, PLANNER_SYSTEM_PROMPT 확장, buildPlannerPrompt() 확장, analyzeCodebase() 통합 |
| `packages/api/src/__tests__/planner-agent.test.ts` | external_tool 관련 테스트 5건+ 추가 |

### 6.2 데이터 흐름

```
createPlan(agentId, taskType, context)
  └→ analyzeCodebase(taskType, context)
       ├→ gatherExternalToolInfo()                   ← NEW
       │    └→ mcpRegistry.listServers()
       │         └→ filter(status === 'active' && toolsCache)
       │              └→ parse toolsCache → { serverId, name, tools[] }
       ├→ buildPlannerPrompt(taskType, context, externalTools)  ← MODIFIED
       │    └→ append "Available External Tools: ..." section
       └→ fetch("https://api.anthropic.com/v1/messages", {
              system: PLANNER_SYSTEM_PROMPT,           ← MODIFIED (external_tool guide)
              messages: [{ role: "user", content: prompt }]
           })
           └→ parseAnalysisResponse(text, context)    ← ALREADY HANDLES external_tool
```

### 6.3 gatherExternalToolInfo() 반환 타입

```typescript
interface ExternalToolInfo {
  serverId: string;
  serverName: string;
  tools: { name: string; description: string }[];
}
```

### 6.4 프롬프트 설계 원칙

1. **선택적 포함**: 도구가 0개면 외부 도구 섹션 자체를 생략
2. **간결한 설명**: 도구 이름 + 한 줄 설명만 (전체 input_schema 포함 X)
3. **사용 기준 명시**: "코드 수정만으로 불가능한 경우에만 external_tool 사용"
4. **JSON 스키마 예시**: externalTool 필드 구조를 명확히 안내

---

## 7. Convention Prerequisites

### 7.1 기존 컨벤션 확인

- [x] `CLAUDE.md` 코딩 컨벤션 존재
- [x] ESLint flat config 설정
- [x] TypeScript strict mode
- [x] vitest 테스트 프레임워크

### 7.2 이 작업에 적용할 컨벤션

| Category | Rule |
|----------|------|
| 에러 처리 | mcpRegistry 쿼리 실패 시 빈 배열 반환, 로깅 없음 (기존 패턴) |
| 타입 | ExternalToolInfo 인터페이스는 planner-agent.ts 내 로컬 정의 |
| 테스트 | mcpRegistry mock은 기존 D1 mock 패턴 활용 |

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`planner-external-tools.design.md`)
2. [ ] 구현 (planner-agent.ts 수정 + 테스트)
3. [ ] Gap 분석 후 PDCA 완료

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-19 | Initial draft | Sinclair Seo |
