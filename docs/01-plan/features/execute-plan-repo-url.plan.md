---
code: FX-PLAN-022
title: executePlan() repoUrl 실제 리포 URL 연동
version: 1.0
status: Draft
category: PLAN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: F91
req: FX-REQ-091
priority: P2
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F91: executePlan() repoUrl 실제 리포 URL 연동 |
| 시작일 | 2026-03-19 |
| 예상 범위 | 단독 작업 (소규모) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | executePlan()이 repoUrl을 빈 문자열로 전달하여 에이전트가 리포 컨텍스트를 알 수 없음 |
| **Solution** | plan의 agent → project 연결 경로를 통해 실제 repoUrl을 DB에서 조회하여 주입 |
| **Function UX Effect** | 에이전트가 실행 시 정확한 리포 URL을 인식하여 코드 분석·PR 생성·Git 작업 가능 |
| **Core Value** | PlannerAgent Orchestrator의 실 운영 준비 완성 — Mock→실 연동 경로의 마지막 빈칸 채우기 |

## §1 배경

### 1.1 현재 문제

`packages/api/src/services/agent-orchestrator.ts:687`에서:

```typescript
const context: AgentExecutionRequest["context"] = {
  repoUrl: "", branch: "master",  // ← 빈 문자열 하드코딩
  ...
};
```

이 빈 문자열이 `ClaudeApiRunner`와 `McpRunner`에 전달되면:
- Claude API 프롬프트에 "Repo: " 빈 컨텍스트 주입
- GitHubService PR 생성 시 리포 식별 불가
- WorktreeManager 클론 대상 누락

### 1.2 데이터 흐름 분석

```
executePlan(planId)
  → agent_plans.agent_id (존재)
  → agents 테이블 (project_id FK 없음 ⚠️)
  → projects.repo_url (도달 불가)
```

**핵심 갭**: `agents` → `projects` 연결 경로가 DB 스키마에 없음.

### 1.3 관련 코드

| 파일 | 역할 |
|------|------|
| `services/agent-orchestrator.ts:670-690` | executePlan() — repoUrl 빈 문자열 |
| `services/agent-orchestrator.ts:686-689` | context 생성 지점 |
| `routes/agent.ts:920-930` | POST /plan/:id/execute 라우트 |
| `db/schema.ts:17-26` | projects 테이블 (repo_url 컬럼) |
| `db/migrations/0004_agent_orchestration.sql` | agents 테이블 (project_id 없음) |
| `services/execution-types.ts:26` | AgentExecutionRequest.context.repoUrl |

## §2 구현 전략

### 선택지 비교

| 방안 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A: executePlan()에 repoUrl 파라미터 추가** | 호출자(라우트)가 repoUrl을 명시적으로 전달 | 스키마 변경 없음, 즉시 적용 | 호출자 책임 증가 |
| **B: agent_plans에 project_id 추가** | plan 생성 시 project_id 기록 → executePlan에서 JOIN | 데이터 정합성 높음 | D1 migration 필요 |
| **C: agents에 project_id FK 추가** | 에이전트-프로젝트 관계 정규화 | 장기적으로 올바른 설계 | 마이그레이션 + 기존 데이터 보정 |

### 선택: **방안 A** (즉시 적용) + **방안 B** (데이터 정합성)

- **방안 A**: executePlan() 시그니처에 `options?: { repoUrl?: string; branch?: string }` 추가
- **방안 B**: 라우트에서 프로젝트 정보 조회 후 전달 (DB 조회 1회 추가)
- 마이그레이션 없이 해결 가능 — agent_plans JOIN 대신 라우트 레벨에서 해결

### 상세 설계

#### 2.1 executePlan() 시그니처 변경

```typescript
// Before
async executePlan(planId: string, runner: AgentRunner): Promise<AgentExecutionResult>

// After
async executePlan(
  planId: string,
  runner: AgentRunner,
  options?: { repoUrl?: string; branch?: string }
): Promise<AgentExecutionResult>
```

#### 2.2 context 생성 로직

```typescript
const context: AgentExecutionRequest["context"] = {
  repoUrl: options?.repoUrl || "", // 폴백: 빈 문자열 (기존 동작 유지)
  branch: options?.branch || "master",
  targetFiles: ...,
  instructions: ...,
};
```

#### 2.3 라우트에서 repoUrl 조회

`POST /plan/:id/execute` 라우트에서:
1. plan 조회 → agent_id 획득
2. (선택) 요청 body에서 `projectId` 수신 → projects 테이블에서 `repo_url` 조회
3. 또는 기본값으로 리포의 git remote URL 사용 (Foundry-X 단일 리포 환경)

#### 2.4 branch 결정

- plan의 proposedSteps에 branch 정보가 있으면 사용
- 없으면 `"master"` 기본값 유지

## §3 수정 대상 파일

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 1 | `services/agent-orchestrator.ts` | executePlan() 시그니처 + context.repoUrl 로직 |
| 2 | `routes/agent.ts` | POST /plan/:id/execute — repoUrl 조회 + 전달 |
| 3 | `schemas/plan.ts` | executePlanRequestSchema에 repoUrl/branch 옵션 추가 |
| 4 | `__tests__/services/agent-orchestrator.test.ts` | executePlan() repoUrl 전달 테스트 |
| 5 | `__tests__/agent.test.ts` 또는 라우트 테스트 | execute 라우트 repoUrl 검증 |

## §4 테스트 계획

| # | 테스트 | 검증 내용 |
|---|--------|-----------|
| 1 | executePlan with repoUrl option | options.repoUrl이 context에 반영되는지 |
| 2 | executePlan without repoUrl | 기존 동작 유지 (빈 문자열 폴백) |
| 3 | executePlan with branch option | options.branch가 context에 반영되는지 |
| 4 | POST /plan/:id/execute with projectId | 라우트에서 repoUrl 조회 후 전달 |
| 5 | POST /plan/:id/execute without projectId | 기본 동작 유지 |

## §5 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 기존 테스트 깨짐 | 낮음 | options는 optional, 기존 호출 영향 없음 |
| 멀티테넌시 context | 중간 | tenantGuard 미들웨어 통과 후 project 조회 → org 격리 보장 |

## §6 의존성

- F82 (PlannerAgent Orchestrator) ✅ 완료
- F83 (멀티테넌시) ✅ 완료 — org_id 기반 프로젝트 격리
