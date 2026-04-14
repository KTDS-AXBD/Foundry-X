---
code: FX-DESIGN-290
title: "Sprint 290 — F542 MetaAgent 프롬프트 품질 개선 설계"
version: 1.0
status: Active
category: DESIGN
feature: F542
req: FX-REQ-571
created: 2026-04-14
updated: 2026-04-14
author: Sinclair Seo
---

# Sprint 290 Design — F542 MetaAgent Prompt Quality Tuning

## §1 문제 분석

### 근본 원인 (3축)

| 축 | 현상 | 진단 |
|----|------|------|
| **Prompt** | systemPrompt가 rawValue=0 케이스 처리 지침 없음 | 모든 axis rawValue=0 → score=50 → "< 70" 조건 충족에도 의미있는 제안 생성 불가 |
| **Model** | Haiku 4.5 고정 하드코딩 | 복잡한 YAML diff 생성이 Haiku 역량 한계 가능성 |
| **Data** | A/B 비교 기록 없음 | 두 모델 성능 비교 불가 |

### rawValue=0 문제

현재 DiagnosticCollector 로직: `record()`가 agent_run_metrics에 1행씩 저장. `collect()`가 해당 행을 읽어 6축 계산. 단, `input_tokens=result.tokensUsed`로 저장하는데, tokensUsed=0이면 rawValue=0 → score=50.

F542 범위: Prompt가 rawValue=0/low-signal 입력에도 의미 있는 제안을 생성하도록 few-shot 추가. 집계 버그는 F543 후보.

## §2 설계 결정

### M1: systemPrompt 강화 전략

few-shot 예시 2건:
1. rawValue=0인 경우 → "데이터 수집 파이프라인 점검" 제안 패턴
2. rawValue 정상인 저점 경우 → 구체적 YAML diff 패턴

### M2: META_AGENT_MODEL 환경변수

- `env.ts`에 `META_AGENT_MODEL?: string` 추가
- `meta-agent.ts`의 `DEFAULT_MODEL` = `"claude-sonnet-4-6"` 변경
- `routes/meta.ts`의 `diagnose` 핸들러: `new MetaAgent({ apiKey, model: c.env.META_AGENT_MODEL })`

### M3: agent_model_comparisons 스키마

```sql
CREATE TABLE agent_model_comparisons (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  report_id TEXT NOT NULL,  -- DiagnosticReport 식별자 (sessionId+collectedAt 복합)
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL DEFAULT '1.0',
  proposals_json TEXT NOT NULL DEFAULT '[]',
  proposal_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_model_comparisons_report ON agent_model_comparisons(report_id);
```

A/B 흐름:
1. `POST /api/meta/diagnose` → Sonnet(기본)으로 진단
2. `META_AGENT_MODEL`이 `"both"` 또는 `"ab"` 이면 Haiku도 병렬 실행
3. 두 결과를 `agent_model_comparisons`에 저장

### M4: rubric_score

`agent_improvement_proposals` 테이블에 `rubric_score INTEGER` 컬럼 추가.

자동 heuristic 채점 (`ProposalRubric` 서비스):
- R1 재현성(30점): JSON 파싱 성공 10 + title/reasoning/yamlDiff 3필드 존재 20
- R2 실행가능성(40점): yamlDiff에 `+` 라인 존재 20 + yamlDiff 길이 > 50chars 20
- R3 근거명시(30점): reasoning에 "because|therefore|score|axis" 키워드 30

### M5: Apply E2E 검증

기존 `proposal-apply.ts`에 YAML validation step 추가:
- `applyPromptChange`에서 yamlDiff 파싱 실패 시 명확한 에러 throw
- test에서 실제 YAML diff → apply → DB 상태 검증

## §5 파일 매핑

| 파일 | 변경 | 이유 |
|------|------|------|
| `packages/shared/src/agent-meta.ts` | `rubric_score?: number`, `ModelComparison` 타입 추가 | M3/M4 공유 타입 |
| `packages/api/src/env.ts` | `META_AGENT_MODEL?: string` 추가 | M2 |
| `packages/api/src/core/agent/specs/meta-agent.agent.yaml` | systemPrompt 강화 | M1 |
| `packages/api/src/core/agent/services/meta-agent.ts` | 모델 기본값 Sonnet 4.6, 강화된 prompt 사용 | M1+M2 |
| `packages/api/src/core/agent/services/model-comparisons.ts` | 신규 — A/B 비교 D1 CRUD | M3 |
| `packages/api/src/core/agent/services/proposal-rubric.ts` | 신규 — rubric 자동 채점 | M4 |
| `packages/api/src/core/agent/routes/meta.ts` | 모델 env 전달, `/comparisons/:reportId` 라우트, rubric 통합 | M2+M3+M4 |
| `packages/api/src/db/migrations/0136_agent_model_comparisons.sql` | 신규 테이블 | M3 |
| `packages/api/src/db/migrations/0137_proposal_rubric_score.sql` | rubric_score 컬럼 | M4 |
| `packages/api/src/__tests__/services/meta-agent.test.ts` | M2 테스트 추가 | M2 TDD |
| `packages/api/src/__tests__/services/model-comparisons.test.ts` | 신규 TDD | M3 TDD |
| `packages/api/src/__tests__/services/proposal-rubric.test.ts` | 신규 TDD | M4 TDD |

## §6 Stage 3 Exit 체크리스트

| # | 항목 | 상태 |
|---|------|------|
| D1 | 주입 사이트 전수 검증: `MetaAgent` 호출 위치는 `routes/meta.ts` POST /diagnose만 | ✅ grep 확인 완료 |
| D2 | 식별자 계약: `report_id = sessionId + ':' + collectedAt` 패턴 — 생산자(diagnose) = 소비자(comparisons API) 동일 | ✅ Design 명시 |
| D3 | Breaking change: `ImprovementProposal.rubric_score` optional 추가 → 기존 코드 영향 없음 | ✅ |
| D4 | TDD Red 파일 존재 예정 | 구현 후 FAIL 확인 |
