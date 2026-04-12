---
code: FX-PLAN-S151
title: "Sprint 151 — Agent Adapter 통합 (Phase 14 Feature)"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-014]]"
---

# Sprint 151: Agent Adapter 통합

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F336 — Agent Adapter 통합 |
| Sprint | 151 |
| 우선순위 | P1 (Feature) |
| 의존성 | F335 OrchestrationLoop (Sprint 150, PR #287) 완료 |
| Design | docs/02-design/features/sprint-151.design.md |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | OrchestrationLoop이 AgentAdapter 인터페이스를 요구하지만, 기존 16개 에이전트가 자체 인터페이스를 사용하여 루프에 투입 불가 |
| Solution | 기존 에이전트를 AgentAdapter로 래핑하는 어댑터 팩토리 + YAML frontmatter role 태깅 + handleFeedback() 점진적 추가 |
| Function UX Effect | 기존 에이전트를 OrchestrationLoop의 retry/adversarial/fix 3모드에 즉시 투입 가능 |
| Core Value | Phase 14 Foundation 위에 기존 자산을 비파괴적으로 연결 — 오케스트레이션 실행 가능 상태 달성 |

## 1. 배경

### 1.1 Foundation 완료 현황

| Sprint | Feature | 역할 | 상태 |
|--------|---------|------|------|
| 148 | F333 | TaskState Machine (10-state, TransitionGuard) | ✅ PR #284 |
| 149 | F334 | Hook Layer + EventBus (이벤트 정규화) | ✅ PR #286 |
| 150 | F335 | OrchestrationLoop (3모드 피드백 루프) | ✅ PR #287 |

### 1.2 현재 문제

`OrchestrationLoop.run(params)` — `params.agents: AgentAdapter[]`를 받아 루프를 실행하지만:
- 기존 에이전트 서비스(agent-runner, claude-api-runner, evaluator-optimizer 등)는 독자적인 `execute()` 시그니처를 사용
- `.claude/agents/` 16개 에이전트 정의에 `role` 태깅이 없음
- `handleFeedback()` 메서드가 없어 adversarial 모드에서 피드백 반영 불가

### 1.3 해결 전략: Additive 래핑

**기존 코드 수정 0건** — 기존 에이전트의 동작을 100% 보존하면서 AgentAdapter 인터페이스만 추가:

1. **래핑 어댑터 팩토리** — 기존 에이전트 서비스를 AgentAdapter로 변환
2. **YAML role 태깅** — `.claude/agents/*.md` frontmatter에 `role` 필드 추가
3. **handleFeedback()** — 기본 no-op 구현, 에이전트별 점진적 강화
4. **AgentAdapter 레지스트리** — 이름으로 어댑터를 조회하는 중앙 레지스트리

## 2. 작업 목록

### 2.1 shared 패키지 확장

| # | 파일 | 작업 |
|---|------|------|
| 1 | `packages/shared/src/orchestration.ts` | `AgentAdapter`에 optional `handleFeedback()` 추가 + `AgentMetadata` 타입 |
| 2 | `packages/shared/src/index.ts` | 신규 export 추가 |

### 2.2 AgentAdapter 래핑 인프라 (API 패키지)

| # | 파일 | 작업 |
|---|------|------|
| 3 | `packages/api/src/services/agent-adapter-factory.ts` | **신규** — 기존 에이전트 서비스를 AgentAdapter로 변환하는 팩토리 |
| 4 | `packages/api/src/services/agent-adapter-registry.ts` | **신규** — 이름/역할별 어댑터 조회 레지스트리 |
| 5 | `packages/api/src/services/adapters/claude-api-adapter.ts` | **신규** — claude-api-runner → AgentAdapter 래핑 |
| 6 | `packages/api/src/services/adapters/evaluator-optimizer-adapter.ts` | **신규** — evaluator-optimizer → AgentAdapter 래핑 (adversarial: discriminator) |
| 7 | `packages/api/src/services/adapters/spec-checker-adapter.ts` | **신규** — spec-checker 래핑 (role: discriminator) |
| 8 | `packages/api/src/services/adapters/build-validator-adapter.ts` | **신규** — build-validator 래핑 (role: discriminator) |
| 9 | `packages/api/src/services/adapters/deploy-verifier-adapter.ts` | **신규** — deploy-verifier 래핑 (role: discriminator) |

### 2.3 YAML Role 태깅

| # | 파일 | role |
|---|------|------|
| 10 | `.claude/agents/ogd-generator.md` | `role: generator` |
| 11 | `.claude/agents/ogd-discriminator.md` | `role: discriminator` |
| 12 | `.claude/agents/ogd-orchestrator.md` | `role: orchestrator` |
| 13 | `.claude/agents/shaping-generator.md` | `role: generator` |
| 14 | `.claude/agents/shaping-discriminator.md` | `role: discriminator` |
| 15 | `.claude/agents/shaping-orchestrator.md` | `role: orchestrator` |
| 16 | `.claude/agents/spec-checker.md` | `role: discriminator` |
| 17 | `.claude/agents/build-validator.md` | `role: discriminator` |
| 18 | `.claude/agents/deploy-verifier.md` | `role: discriminator` |
| 19 | `.claude/agents/auto-reviewer.md` | `role: discriminator` |
| 20 | `.claude/agents/expert-*.md` (5개) | `role: generator` |
| 21 | `.claude/agents/six-hats-moderator.md` | `role: orchestrator` |

### 2.4 API 라우트

| # | 파일 | 작업 |
|---|------|------|
| 22 | `packages/api/src/routes/agent-adapters.ts` | **신규** — GET /adapters (목록), GET /adapters/:name (상세), POST /adapters/:name/execute (실행) |
| 23 | `packages/api/src/schemas/agent-adapter.ts` | **신규** — Zod 스키마 |

### 2.5 테스트

| # | 파일 | 테스트 범위 |
|---|------|------------|
| 24 | `packages/api/src/__tests__/agent-adapter-factory.test.ts` | 팩토리 변환 정확성 |
| 25 | `packages/api/src/__tests__/agent-adapter-registry.test.ts` | 레지스트리 등록/조회/필터 |
| 26 | `packages/api/src/__tests__/adapters/claude-api-adapter.test.ts` | 래핑 실행 + 피드백 |
| 27 | `packages/api/src/__tests__/agent-adapters-route.test.ts` | 라우트 E2E |

## 3. 기술 설계 요약

### 3.1 AgentAdapter 확장

```typescript
// shared/src/orchestration.ts 확장
interface AgentAdapter {
  name: string;
  role: AgentRole;
  execute(context: AgentExecutionContext): Promise<AgentResult>;
  handleFeedback?(feedback: string[], context: AgentExecutionContext): Promise<void>;
  metadata?: AgentMetadata;
}

interface AgentMetadata {
  source: 'yaml' | 'service' | 'mcp';
  originalService?: string;
  capabilities?: string[];
  modelTier?: string;
}
```

### 3.2 팩토리 패턴

```typescript
// 기존 서비스를 래핑 — 기존 코드 변경 없음
class AgentAdapterFactory {
  wrapClaudeApiRunner(runner: ClaudeApiRunner, role: AgentRole): AgentAdapter;
  wrapEvaluatorOptimizer(eo: EvaluatorOptimizer): AgentAdapter;
  wrapFromDefinition(def: AgentDefinition, db: D1Database): AgentAdapter;
}
```

## 4. 성공 기준

| 기준 | 목표 |
|------|------|
| 기존 에이전트 동작 보존 | 100% (기존 테스트 전체 pass) |
| AgentAdapter 래핑 대상 | 5종 이상 (claude-api, evaluator, spec-checker, build-validator, deploy-verifier) |
| YAML role 태깅 | 16개 전체 |
| OrchestrationLoop 통합 테스트 | retry + adversarial 모드 각 1건 |
| Match Rate 목표 | >= 90% |

## 5. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 기존 에이전트의 execute() 시그니처가 다양 | 어댑터마다 변환 로직 필요 | 팩토리에서 서비스 유형별 분기 |
| handleFeedback()의 의미 있는 구현이 어려움 | no-op이면 adversarial 효과 제한 | v1은 no-op 허용, 향후 강화 |
| YAML frontmatter 파싱이 기존 agent-definition-loader와 충돌 | 파서 호환성 | 기존 parseSimpleYaml() 재사용 |
