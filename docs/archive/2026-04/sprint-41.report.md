---
code: FX-RPRT-041
title: "Sprint 41 완료 보고서 — F146 에이전트 역할 커스터마이징 + F147 멀티모델 앙상블 투표"
version: 1.0
status: Active
category: RPRT
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-41
sprint: 41
phase: "Phase 5a"
references:
  - "[[FX-PLAN-041]]"
  - "[[FX-DSGN-041]]"
  - "[[FX-ANLS-041]]"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F146: 에이전트 역할 커스터마이징 + F147: 멀티모델 앙상블 투표 |
| Sprint | 41 |
| 기간 | 2026-03-22 (1일, 단일 세션) |
| Phase | Phase 5a (Agent Evolution Track A — 에이전트 플랫폼 확장) |

### 1.2 Results

| 항목 | 목표 | 실적 |
|------|------|------|
| Match Rate | ≥ 90% | **94%** ✅ |
| 신규 서비스 | 2개 | **2개** (CustomRoleManager, EnsembleVoting) |
| 신규 테스트 | 40개+ | **42개** (22+20) ✅ |
| API 엔드포인트 | 7개 | **7개** ✅ |
| D1 마이그레이션 | 0024 | **0024** ✅ |
| 기존 테스트 회귀 | 0건 | **0건** ✅ |
| 전체 테스트 | — | **877/877** 통과 |
| 신규 코드 | — | **1,400 lines** (서비스 707 + 테스트 673 + 마이그레이션 20) |
| typecheck | 에러 0건 | **0건** ✅ |

### 1.3 Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 에이전트 역할 7종이 하드코딩되어 새 역할 추가 시 코드 변경 필수. 단일 모델 의존으로 모델 특성별 장점 활용 불가, 결과 품질이 선택된 모델에 편향 |
| **Solution** | F146: CustomRoleManager — D1 기반 CRUD로 코드 변경 없이 API 호출만으로 에이전트 역할 동적 등록/수정/삭제. `custom:*` taskType 패턴과 `systemPromptOverride`로 기존 AgentRunner 비침습 확장. F147: EnsembleVoting — N개 모델 `Promise.allSettled` 병렬 실행 + 3종 투표 전략(majority/quality-score/weighted)으로 최적 결과 선택 |
| **Function UX Effect** | POST /agents/roles 한 번으로 새 역할 에이전트 즉시 사용 가능. POST /agents/ensemble로 3~5개 모델 합의 기반 고신뢰 결과 획득. 내장 7종 역할은 삭제 방지로 안정성 유지 |
| **Core Value** | Agent Evolution A12+A13 달성. 하드코딩→데이터 기반 전환으로 에이전트 확장성 확보 (Open-Closed Principle). 멀티모델 앙상블로 단일 모델 편향 제거 — 코드 리뷰/보안 검토 등 합의가 중요한 태스크의 신뢰도 향상 |

---

## 2. 구현 상세

### 2.1 F146 CustomRoleManager

| 항목 | 내용 |
|------|------|
| 서비스 파일 | `services/custom-role-manager.ts` (378 lines) |
| 테스트 파일 | `__tests__/custom-role-manager.test.ts` (280 lines, 22 tests) |
| D1 마이그레이션 | `0024_custom_agent_roles.sql` (20 lines) |
| API 엔드포인트 | 5개 (CRUD: POST/GET/GET:id/PUT/DELETE /agents/roles) |
| 스키마 | 3종 (Create/Update/CustomRole) |

**핵심 메커니즘:**
- `systemPromptOverride` 필드를 `AgentExecutionRequest.context`에 추가
- `getSystemPrompt()` 함수로 override → default → fallback 3단 체인
- `OpenRouterRunner`에서 1줄 변경으로 모든 Runner에 일관 적용
- `custom:*` taskType 패턴으로 AgentTaskType 유니온 변경 없이 동적 확장
- BUILTIN_ROLES 7종은 코드 기반 유지 (D1 미저장, 삭제 불가)

### 2.2 F147 EnsembleVoting

| 항목 | 내용 |
|------|------|
| 서비스 파일 | `services/ensemble-voting.ts` (329 lines) |
| 테스트 파일 | `__tests__/ensemble-voting.test.ts` (393 lines, 20 tests) |
| API 엔드포인트 | 2개 (POST /agents/ensemble, GET /agents/ensemble/strategies) |
| 스키마 | 3종 (EnsembleRequest/EnsembleResult/StrategyInfo) |
| 투표 전략 | 3종 (majority, quality-score, weighted) |

**핵심 메커니즘:**
- `Promise.allSettled` 기반 병렬 실행 — 일부 모델 실패해도 나머지로 투표
- majority: Jaccard 유사도 (reviewComments 파일 겹침, generatedCode 경로, analysis 텍스트)
- quality-score: 평가 모델(haiku)로 각 결과 0-100 채점 → 최고 점수 선택
- weighted: 모델별 가중치 × 토큰 효율성 합산
- MIN_MODELS=2, MAX_MODELS=5 하드캡

### 2.3 공유 인프라 변경

| 파일 | 변경 내용 |
|------|----------|
| `execution-types.ts` | `context.systemPromptOverride?: string` 추가 |
| `prompt-utils.ts` | `getSystemPrompt()` 함수 추가 (+9 lines) |
| `openrouter-runner.ts` | `getSystemPrompt(request)` 호출로 변경 (1줄) |
| `agent-orchestrator.ts` | `CustomRoleManager` import + setter + `custom:*` 위임 블록 (+62 lines) |
| `routes/agent.ts` | 7개 엔드포인트 추가 (+210 lines) |
| `schemas/agent.ts` | 6종 스키마 추가 (+102 lines) |

## 3. 작업 프로세스

### 3.1 Agent Team 2-Worker 병렬 (Worktree Isolation)

| 단계 | 내용 | 시간 |
|------|------|------|
| Plan 작성 | Sprint 41 Plan 문서 | 5분 |
| Design 작성 | Sprint 41 Design 문서 | 10분 |
| Worker 실행 | 2-Worker Worktree 모드 | ~5분 |
| Worktree 머지 | Sprint 40 충돌 해결 (3파일) + Worker 간 충돌 해결 (2파일) | 5분 |
| 검증 | typecheck + 877 tests | 2분 |
| Gap 분석 | gap-detector 에이전트 | 2분 |
| **총 소요** | | **~30분** |

### 3.2 Worktree Isolation 적용 이유

Sprint 40이 동일 pane에서 `execution-types.ts`, `routes/agent.ts`, `schemas/agent.ts`, `agent-orchestrator.ts`를 미커밋 상태로 수정 중이었으므로, 공유 working directory 충돌을 방지하기 위해 Worktree 모드 사용. Worker들은 HEAD 기준 독립 복사본에서 작업하고, Sprint 40 커밋 후 리더가 3-way merge로 안전하게 병합.

### 3.3 머지 충돌 해결

| 파일 | 충돌 원인 | 해결 방법 |
|------|----------|----------|
| `agent-orchestrator.ts` | Sprint 40 InfraAgent import/field/setter vs Sprint 41 CustomRoleManager | 양쪽 모두 유지 |
| `routes/agent.ts` | Sprint 40 엔드포인트 vs Sprint 41 엔드포인트 | 순차 append (Sprint 40 → 41 W1 → 41 W2) |
| `schemas/agent.ts` | Sprint 40 스키마 vs Sprint 41 스키마 | 순차 append |
| `execution-types.ts` | Sprint 40 reflection 필드 vs Sprint 41 systemPromptOverride | 자동 머지 (다른 위치) |

## 4. Gap Analysis 요약

**Overall Match Rate: 94%**

| 카테고리 | 점수 |
|----------|:----:|
| Design Match | 91% |
| Architecture Compliance | 97% |
| Convention Compliance | 95% |

**Medium 영향 차이 3건:**
1. votingDetails 필드 구성 (5→3 필드)
2. EnsembleRequestSchema 구조 (flat→nested)
3. listRoles orgId 필터 (null vs empty string)

**미구현 항목: 0건** — 모든 설계 항목 구현 완료.

## 5. 프로젝트 누적 지표

| 지표 | Sprint 39 | Sprint 41 | 변화 |
|------|-----------|-----------|------|
| API 테스트 | 792 | 877 | +85 |
| API 서비스 | 67 | 69 | +2 |
| D1 테이블 | 37 | 38 | +1 |
| D1 마이그레이션 | 0023 | 0024 | +1 |
| Agent Evolution 기능 | A1~A14 | A1~A14 | A12+A13 추가 |
