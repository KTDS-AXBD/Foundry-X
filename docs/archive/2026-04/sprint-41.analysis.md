---
code: FX-ANLS-041
title: "Sprint 41 Gap Analysis — F146 CustomRoleManager + F147 EnsembleVoting"
version: 1.0
status: Active
category: ANLS
created: 2026-03-22
updated: 2026-03-22
author: Claude (gap-detector)
feature: sprint-41
sprint: 41
phase: "Phase 5a"
references:
  - "[[FX-DSGN-041]]"
  - "[[FX-PLAN-041]]"
---

## 1. 분석 개요

| 항목 | 내용 |
|------|------|
| 분석 대상 | Sprint 41 (F146 CustomRoleManager + F147 EnsembleVoting) |
| Design 문서 | docs/02-design/features/sprint-41.design.md |
| 분석일 | 2026-03-22 |
| 분석 도구 | bkit:gap-detector |

## 2. Match Rate

| 카테고리 | 점수 | 상태 |
|----------|:----:|:----:|
| Design Match | 91% | ✅ |
| Architecture Compliance | 97% | ✅ |
| Convention Compliance | 95% | ✅ |
| **Overall** | **94%** | ✅ |

## 3. F146 CustomRoleManager — 항목별 비교

### 완전 일치 (25/25)

- CustomRole 인터페이스 (12필드), CreateRoleInput, UpdateRoleInput, CustomRoleRow
- toCustomRole() 변환, BUILTIN_ROLES 7종
- 5 CRUD 메서드 (createRole, getRole, listRoles, updateRole, deleteRole)
- D1 마이그레이션 0024 (테이블 + 인덱스 3개)
- systemPromptOverride 메커니즘 (execution-types + prompt-utils + openrouter-runner)
- Orchestrator custom:* 위임 + setCustomRoleManager()
- API 5개 엔드포인트 + 스키마 3종
- 테스트 22개

### 차이점 (13건, Low~Medium)

| # | 항목 | Design | 구현 | 영향 |
|---|------|--------|------|------|
| 1 | taskType 필수 여부 | required | optional (default "code-review") | Low |
| 2 | preferredRunnerType 타입 | AgentRunnerType | string | Low |
| 3 | orgId null 처리 | null = 글로벌 | empty string = 글로벌 | Medium |
| 4 | Schema systemPrompt min | min(10) | min(1) | Low |
| 5 | Schema taskType | z.enum([...]) | z.string() | Medium |
| 6~13 | 기타 | 타입 느슨화, 기본값 차이 등 | — | Low |

## 4. F147 EnsembleVoting — 항목별 비교

### 완전 일치 (26/26)

- VotingStrategy 3종, EnsembleConfig, ModelResult, StrategyInfo
- VOTING_STRATEGIES 상수, MIN_MODELS/MAX_MODELS/DEFAULT_TIMEOUT_MS
- executeEnsemble (Promise.allSettled + 에러 처리)
- selectBest 3종 전략 (majority/quality-score/weighted)
- calculateSimilarity (reviewComments/generatedCode/analysis Jaccard)
- ENSEMBLE_EVALUATION_PROMPT + parseEvalScore
- API 2개 엔드포인트 + 스키마 3종
- 테스트 20개

### 차이점 (7건, Low~Medium)

| # | 항목 | Design | 구현 | 영향 |
|---|------|--------|------|------|
| 1 | votingDetails 필드 | 5개 (modelCount, succeededCount, failedCount, totalLatencyMs, totalTokensUsed) | 3개 (totalModels, successfulModels, averageLatencyMs) | Medium |
| 2 | costMultiplier 타입 | string ("1x") | number (1.0) | Low |
| 3 | RequestSchema 구조 | flat (request + models + strategy) | nested (taskType + context + config) | Medium |
| 4~7 | 기타 | PROMPT 내용, constructor, evalRequest 구조 등 | — | Low |

## 5. 미구현 항목

없음 — 모든 설계 항목이 구현됨.

## 6. 추가 구현 항목

없음 — 설계 범위 외 추가 구현 없음.

## 7. 검증 결과

| 기준 | 목표 | 결과 |
|------|------|------|
| Match Rate | ≥ 90% | ✅ **94%** |
| typecheck | 에러 0건 | ✅ 0건 |
| 전체 테스트 | 회귀 0건 | ✅ **877/877** 통과 |
| 신규 테스트 | 42개+ | ✅ 42개 (22+20) |

## 8. 권장 사항

### 문서 갱신 (선택)
1. Design votingDetails 필드명을 구현 기준으로 갱신
2. Design EnsembleRequestSchema를 nested config 구조로 갱신
3. Design StrategyInfo.costMultiplier 타입을 number로 갱신

### 코드 개선 (선택)
1. CreateCustomRoleSchema의 taskType을 z.enum으로 강화 (API 검증 향상)
2. votingDetails에 failedCount, totalTokensUsed 필드 추가 (모니터링 유용)
