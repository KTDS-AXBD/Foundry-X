---
code: FX-PLAN-040
title: "Sprint 40 — InfraAgent + 에이전트 자기 평가 (F145+F148)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-40
sprint: 40
phase: "Phase 5a"
references:
  - "[[FX-PLAN-039]]"
  - "[[FX-PLAN-038]]"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F145: InfraAgent + F148: 에이전트 자기 평가 |
| Sprint | 40 |
| 기간 | 2026-03-22 ~ (1 Sprint) |
| Phase | Phase 5a (Agent Evolution Track A — P2 기능 첫 착수) |

### Results (예상)

| 항목 | 목표 |
|------|------|
| 신규 서비스 | 2개 (InfraAgent, AgentSelfReflection) |
| 신규 테스트 | 35개+ |
| AgentTaskType 추가 | 1종 (infra-analysis) |
| API 엔드포인트 | 5개 |
| 기존 테스트 회귀 | 0건 |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 인프라 변경(Workers 설정, D1 마이그레이션, Cron Trigger 등)의 영향 분석이 전적으로 수동. 에이전트 출력 품질이 첫 시도에 의존하여 일관성 부족 |
| **Solution** | F145: InfraAgent — Cloudflare 인프라 설정 분석 + IaC 변경 시뮬레이션 + 마이그레이션 검증. F148: AgentSelfReflection — 에이전트가 자신의 출력을 평가하고 개선하는 자기 반성 루프 |
| **Function UX Effect** | 인프라 변경 전 영향 범위 자동 리포트. 에이전트 응답에 자기 평가 점수(confidence) 포함 — 낮을 시 자동 재시도 |
| **Core Value** | 7번째 역할 에이전트(InfraAgent) 추가로 Agent Evolution A11 달성. 자기 평가 패턴으로 전 에이전트 출력 품질 향상 — EvaluatorOptimizer(inter-agent)와 보완하는 intra-agent 품질 레이어 |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표

**F145 — InfraAgent (Agent Evolution A11):**
- `InfraAgent` 서비스 구현 — LLM 기반 인프라 분석 전문 에이전트
- `analyzeInfra(request)` — Cloudflare Workers/D1/KV/Cron 설정 분석 + 최적화 제안
- `simulateChange(change, currentConfig)` — 인프라 변경의 영향 범위 시뮬레이션 (dry-run)
- `validateMigration(sql, schema)` — D1 마이그레이션 SQL의 안전성 검증 (FK 충돌, 데이터 손실 위험)
- Orchestrator 위임: `infra-analysis` taskType → InfraAgent 라우팅
- Fluid 패턴 참조: 샌드박스 시뮬레이션 결과를 IaC 형태(wrangler.toml diff)로 출력

**F148 — 에이전트 자기 평가 (Agent Evolution A14):**
- `AgentSelfReflection` 서비스 구현 — 에이전트 출력 자기 반성 루프
- `reflect(result, originalRequest)` — 에이전트 출력을 원래 요청 대비 자체 평가
- `shouldRetry(reflectionScore)` — 반성 점수 기반 재시도 판정 (임계값: 60)
- `enhanceWithReflection(runner)` — 기존 AgentRunner를 래핑하여 자동 반성 추가
- 기존 EvaluatorOptimizer와의 차이: EvalOpt = 외부 평가자 루프, SelfReflection = 동일 에이전트의 내부 반성
- AgentExecutionResult에 `reflection` 필드 추가 (score, reasoning, suggestions)

### 1.2 범위 제한
- F145: 실제 인프라 변경 실행 없음 — 분석/시뮬레이션만 수행 (read-only)
- F145: Cloudflare 특화 — AWS/GCP 등 다른 클라우드는 후속 확장
- F148: 자기 평가는 선택적 래퍼 — 기존 에이전트 동작에 영향 없음 (opt-in)
- F148: 자기 평가 결과 D1 저장 없음 — API 응답에만 포함
- 기존 에이전트 6종(Reviewer, Planner, Architect, Test, Security, QA) 동작 불변

## 2. 기술 설계 요약

### 2.1 파일 구조
```
packages/api/src/services/
├── infra-agent.ts             # InfraAgent 서비스
├── infra-agent-prompts.ts     # 인프라 분석 프롬프트 3종
└── agent-self-reflection.ts   # AgentSelfReflection 서비스

packages/api/src/__tests__/
├── infra-agent.test.ts        # InfraAgent 테스트 20개+
└── agent-self-reflection.test.ts  # SelfReflection 테스트 15개+

packages/api/src/
├── routes/agent.ts            # 5개 엔드포인트 추가
├── schemas/agent.ts           # Infra + Reflection 스키마
└── services/
    ├── execution-types.ts     # "infra-analysis" 추가
    └── agent-orchestrator.ts  # 위임 블록 1개 추가
```

### 2.2 API 엔드포인트

| Method | Path | 용도 |
|--------|------|------|
| POST | /agents/infra/analyze | 인프라 설정 분석 + 최적화 제안 |
| POST | /agents/infra/simulate | 변경 영향 시뮬레이션 (dry-run) |
| POST | /agents/infra/validate-migration | D1 마이그레이션 안전성 검증 |
| POST | /agents/reflect | 에이전트 출력 자기 평가 실행 |
| GET | /agents/reflect/config | 자기 평가 설정 조회 (임계값, 최대 재시도) |

### 2.3 InfraAgent 분석 대상

| 리소스 | 분석 항목 |
|--------|----------|
| Workers | wrangler.toml 설정, 바인딩, 호환성 플래그 |
| D1 | 마이그레이션 SQL, 스키마 정합성, FK 관계 |
| KV | 네임스페이스 사용 패턴, TTL 설정 |
| Cron Triggers | 스케줄 충돌, 실행 시간 분석 |
| Secrets | 참조 검증 (사용되지 않는 시크릿 감지) |

### 2.4 SelfReflection 아키텍처

```
기존 흐름:
  Request → AgentRunner.execute() → Result

SelfReflection 래핑 후:
  Request → AgentRunner.execute() → Result
                                      ↓
                               SelfReflection.reflect(result, request)
                                      ↓
                               score >= 60? → 최종 반환 (result + reflection)
                               score < 60?  → 재시도 (최대 2회)
                                      ↓
                               최종 반환 (best result + reflection history)
```

### 2.5 AgentExecutionResult 확장

```typescript
// 기존 필드 유지 + reflection 추가
export interface AgentExecutionResult {
  // ... 기존 필드 ...
  reflection?: {
    score: number;          // 0-100 자기 평가 점수
    confidence: number;     // 0-100 확신도
    reasoning: string;      // 왜 이 점수인지
    suggestions: string[];  // 개선 제안
    retryCount: number;     // 재시도 횟수
  };
}
```

## 3. 위험 및 의존성

| 위험 | 대응 |
|------|------|
| InfraAgent가 실제 인프라 변경을 시도 | 분석 전용 — 실행 권한 없음, 프롬프트에 명시적 read-only 제약 |
| SelfReflection 무한 루프 | maxRetries=2 하드캡, 재시도 시에도 score가 60 미만이면 best result 반환 |
| SelfReflection이 토큰 비용 2~3배 증가 | opt-in 래퍼, 기본 비활성 — 고품질 필요 태스크에만 적용 |
| wrangler.toml 파싱 정확도 | LLM에 TOML 원문 + Cloudflare 공식 스키마 요약 전달 |
| Sprint 39 의존성 | F145/F148은 Sprint 39(F144/F149/F150)와 독립 — 병렬 진행 가능 |

## 4. 작업 순서 (2-Worker 병렬)

### Worker 1: F145 InfraAgent
1. `infra-agent-prompts.ts` — 인프라 분석 프롬프트 3종 (analyze, simulate, validate)
2. `infra-agent.ts` — InfraAgent 서비스 (3 메서드)
3. `infra-agent.test.ts` — 테스트 20개+
4. `execution-types.ts` — `"infra-analysis"` 타입 추가
5. `agent-orchestrator.ts` — infra-analysis 위임 블록 추가
6. `routes/agent.ts` + `schemas/agent.ts` — 3개 엔드포인트 + 스키마

### Worker 2: F148 에이전트 자기 평가
1. `agent-self-reflection.ts` — SelfReflection 서비스 (reflect, shouldRetry, enhanceWithReflection)
2. `agent-self-reflection.test.ts` — 테스트 15개+
3. `execution-types.ts` — AgentExecutionResult에 reflection 필드 추가
4. `routes/agent.ts` + `schemas/agent.ts` — 2개 엔드포인트 + 스키마

### 통합 (리더)
5. Orchestrator 통합 검증
6. 전체 테스트 회귀 확인

## 5. 성공 기준

| 기준 | 목표 |
|------|------|
| Match Rate | ≥ 90% |
| 신규 테스트 | 35개+ 전체 통과 |
| 기존 테스트 회귀 | 0건 |
| typecheck | 에러 0건 |
| InfraAgent 분석 | wrangler.toml 파싱 + D1 마이그레이션 검증 mock 시나리오 통과 |
| SelfReflection 래핑 | enhanceWithReflection()으로 래핑한 Runner가 정상 동작 |
| SelfReflection 재시도 | score < 60일 때 자동 재시도 후 best result 반환 확인 |
| AgentTaskType | 기존 9종 → 10종 (infra-analysis 추가) |
