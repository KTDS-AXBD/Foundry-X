---
code: FX-PLAN-S161
title: "Sprint 161 — 데이터 진단 + 패턴 감지 + Rule 생성"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-S160]], fx-harness-evolution/prd-final.md, FX-STRT-015 v3.0"
---

# Sprint 161: 데이터 진단 + 패턴 감지 + Rule 생성

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F357 데이터 상태 진단 + 기준선 수립, F358 반복 실패 패턴 감지 + Rule 초안 생성 |
| Sprint | 161 |
| 우선순위 | F357=P0, F358=P0 |
| 의존성 | Phase 16 ✅ 완료 (Sprint 158~160). Phase 14 인프라(F333~F335) 재활용 |
| Phase | 17 — Self-Evolving Harness v2 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | execution_events 데이터가 쌓이지만 반복 실패 패턴을 자동 감지하지 못함. Rules 5종이 세션 #199 이후 정적으로 진부화 |
| Solution | D1 데이터 진단 → 반복 실패 클러스터링 → LLM 기반 Rule 초안 생성 파이프라인 구축 |
| Function UX Effect | 세션 시작 시 "N건 반복 실패 감지 → Rule 제안" 알림으로 사전 예방 가능 |
| Core Value | 하네스 인프라가 데이터에서 스스로 학습하여 품질을 개선하는 자가 발전 루프의 첫 단계 |

---

## 1. Overview

### 1.1 Purpose

Phase 14에서 구축한 텔레메트리 인프라(execution_events, task_state_history)의 데이터를 실제 행동 변화로 연결하는 "데이터→행동" 루프를 만든다. Sprint 161은 이 루프의 전반부 — 데이터 진단 + 패턴 감지 + Rule 초안 생성까지를 담당한다.

### 1.2 Background

- **전략 문서 FX-STRT-015 v3.0**: Stage 3(자가 진화)의 Layer 5 "Guard Rail Refine"이 ⚠️ 미구현 상태
- **인터뷰 결과**: 반복 실패 패턴(Sprint마다 유사 실패), Rules 진부화, 수동 개입 비용이 핵심 문제
- **PRD (fx-harness-evolution/prd-final.md)**: M1(데이터 진단) + M2(패턴 감지) + M3(Rule 생성)

### 1.3 Related Documents

- PRD: `docs/specs/fx-harness-evolution/prd-final.md`
- 전략: `docs/specs/self-evolving-harness-strategy.md` (FX-STRT-015 v3.0)
- Phase 14 통합계획: `docs/specs/FX-Unified-Integration-Plan.md`
- 기존 Plan: `docs/01-plan/features/sprint-160.plan.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] F357: execution_events + task_state_history D1 데이터 진단 (양, 기간, 품질)
- [ ] F357: 반복 실패 기준선(baseline) 보고서 생성
- [ ] F358: PatternDetector 서비스 — source × severity × payload 기반 클러스터링
- [ ] F358: RuleGenerator 서비스 — LLM 호출로 .claude/rules/ 포맷 Rule 초안 생성
- [ ] F358: D1 신규 테이블 (guard_rail_proposals, failure_patterns)
- [ ] F358: API 라우트 — POST /guard-rail/detect, GET /guard-rail/proposals
- [ ] 단위 테스트 (services + routes)

### 2.2 Out of Scope

- 세션 내 승인 플로우 (Sprint 162 F359)
- `.claude/rules/` 자동 배치 (Sprint 162 F359)
- O-G-D Loop 범용화 (Sprint 163 F360)
- 운영 지표 대시보드 (Sprint 164 F362)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | execution_events 데이터 양/기간/분포 진단 API | High | Pending |
| FR-02 | task_state_history에서 FAILED 전이 패턴 추출 | High | Pending |
| FR-03 | source × severity 조합별 반복 실패 빈도 집계 | High | Pending |
| FR-04 | payload JSON 내 error 메시지 유사도 클러스터링 | High | Pending |
| FR-05 | 임계값(최소 N회 반복) 기반 패턴 식별 + failure_patterns 저장 | High | Pending |
| FR-06 | 감지된 패턴 → LLM Rule 초안 생성 (Haiku 모델) | High | Pending |
| FR-07 | Rule 초안에 근거 주석 포함 (패턴 출처, 실패 사례 N건, 기간) | High | Pending |
| FR-08 | guard_rail_proposals D1 테이블에 초안 저장 | High | Pending |
| FR-09 | GET /guard-rail/proposals API — 미승인 제안 목록 조회 | Medium | Pending |
| FR-10 | 기준선 보고서 생성 (현재 반복 실패 현황 스냅샷) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 패턴 감지 < 5초 (execution_events 10,000건 기준) | vitest 벤치마크 |
| Cost | LLM 호출 비용 < $0.1/패턴 (Haiku) | API 응답 usage 집계 |
| Reliability | 데이터 부족 시 graceful degradation (빈 결과, 에러 아님) | 단위 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] execution_events 데이터 진단 완료 — 데이터 양, 기간, 분포 파악
- [ ] 최소 1개 반복 실패 패턴 자동 감지 성공
- [ ] LLM Rule 초안 생성 성공 — .claude/rules/ 포맷 준수
- [ ] D1 마이그레이션 2테이블 (failure_patterns, guard_rail_proposals)
- [ ] API 라우트 2개 동작 (POST detect, GET proposals)
- [ ] 단위 테스트 pass

### 4.2 Quality Criteria

- [ ] Zero lint errors (PostToolUse hook 자동 검증)
- [ ] TypeScript strict mode 통과
- [ ] 테스트 coverage: 새 서비스 80%+

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| execution_events 데이터 3개월 미만 | High | Medium | F357에서 진단 후 판단. 부족 시 Sprint 중단 + 데이터 축적 후 재시도 (PRD 실패 조건) |
| payload JSON 구조가 비정형 | Medium | High | payload 파싱 전에 source × severity만으로 1차 클러스터링. payload는 유사도 보조 지표로만 사용 |
| LLM Rule 생성 품질 낮음 | Medium | Medium | Haiku 먼저 시도, 품질 부족 시 Sonnet으로 전환. 근거 주석으로 사람이 판단 가능 |
| 기존 execution_events에 분류 컬럼 부재 | Low | Certain | source(이벤트 소스)와 severity로 1차 분류. 추후 event_type 컬럼 ALTER 고려 |

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| Enterprise (기존 Foundry-X 아키텍처) | ✅ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 패턴 감지 방식 | SQL 집계 / 서비스 레이어 집계 | SQL 집계 | D1 쿼리로 GROUP BY source, severity 후 HAVING count > N이 가장 효율적 |
| 유사도 클러스터링 | 정확 일치 / 편집 거리 / LLM 분류 | 정확 일치 + LLM 보조 | 1차: source×severity 정확 일치, 2차: payload 내 에러 메시지를 LLM으로 유사 패턴 그룹화 |
| Rule 생성 LLM | Haiku / Sonnet | Haiku (기본) | 비용 $0.1/건 이하 유지. 품질 부족 시 Sonnet fallback |
| 신규 D1 테이블 | 기존 테이블 확장 / 신규 생성 | 신규 2테이블 | failure_patterns(감지 결과) + guard_rail_proposals(Rule 초안) 분리 |

### 6.3 기존 코드 재활용

| Phase 14 컴포넌트 | 파일 경로 | 재활용 방식 |
|------------------|----------|-----------|
| ExecutionEventService | `api/src/services/execution-event-service.ts` | 조회 API 직접 호출 — list() 메서드로 이벤트 조회 |
| EventBus | `api/src/services/event-bus.ts` | PatternDetector가 EventBus 구독하여 실시간 감지 (선택) |
| TelemetryCollector | `api/src/services/telemetry-collector.ts` | 기존 집계 쿼리 참조하여 패턴 감지 쿼리 설계 |
| OrchestrationLoop | `api/src/services/orchestration-loop.ts` | Sprint 163 F360에서 범용화 대상. Sprint 161에서는 참조만 |
| TransitionTrigger | `api/src/services/transition-trigger.ts` | FAILED 전이 이벤트 패턴을 PatternDetector 입력으로 활용 |

### 6.4 D1 스키마 설계

#### execution_events (기존, 0096)
```sql
-- source: 이벤트 소스 (hook, agent, orchestration 등)
-- severity: info, warning, error, critical
-- payload: JSON (구조 비정형)
CREATE TABLE execution_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  source TEXT NOT NULL,
  severity TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### task_state_history (기존, 0095)
```sql
-- FAILED 전이를 추적하여 반복 실패 패턴 파악
CREATE TABLE task_state_history (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  trigger_source TEXT,
  trigger_event TEXT,
  guard_result TEXT,
  transitioned_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### failure_patterns (신규)
```sql
CREATE TABLE IF NOT EXISTS failure_patterns (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern_key TEXT NOT NULL,          -- source:severity 조합 키
  occurrence_count INTEGER NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  sample_event_ids TEXT,              -- JSON array of sample event IDs
  sample_payloads TEXT,               -- JSON array of representative payloads
  status TEXT NOT NULL DEFAULT 'detected',  -- detected | proposed | resolved
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fp_pattern ON failure_patterns(tenant_id, pattern_key);
CREATE INDEX IF NOT EXISTS idx_fp_status ON failure_patterns(tenant_id, status);
```

#### guard_rail_proposals (신규)
```sql
CREATE TABLE IF NOT EXISTS guard_rail_proposals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL REFERENCES failure_patterns(id),
  rule_content TEXT NOT NULL,         -- .claude/rules/ 포맷의 Rule 초안
  rule_filename TEXT NOT NULL,        -- 제안 파일명 (예: auto-guard-001.md)
  rationale TEXT NOT NULL,            -- 근거 설명 (패턴 요약 + 실패 사례)
  llm_model TEXT NOT NULL,            -- 생성에 사용된 모델 (haiku / sonnet)
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | modified
  reviewed_at TEXT,
  reviewed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_grp_tenant ON guard_rail_proposals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_grp_pattern ON guard_rail_proposals(pattern_id);
```

---

## F357: 데이터 상태 진단 + 기준선 수립

### 작업 목록

| # | 영역 | 파일 | 작업 내용 |
|---|------|------|-----------|
| 1 | Service | `api/src/services/data-diagnostic-service.ts` | execution_events + task_state_history 데이터 진단. 총 건수, 기간, source/severity 분포, FAILED 전이 건수 |
| 2 | Route | `api/src/routes/guard-rail.ts` | GET /guard-rail/diagnostic — 데이터 진단 결과 반환 |
| 3 | Schema | `api/src/schemas/guard-rail-schema.ts` | Zod: DiagnosticResult, FailureDistribution |
| 4 | Shared | `shared/src/guard-rail.ts` | DiagnosticResult, FailurePattern, GuardRailProposal 타입 |
| 5 | Test | `api/src/__tests__/data-diagnostic.test.ts` | 진단 서비스 단위 테스트 (빈 DB, 충분한 데이터, 부족한 데이터) |

---

## F358: 반복 실패 패턴 감지 + Rule 초안 생성

### 작업 목록

| # | 영역 | 파일 | 작업 내용 |
|---|------|------|-----------|
| 1 | Migration | `api/src/db/migrations/NNNN_failure_patterns.sql` | failure_patterns 테이블 |
| 2 | Migration | `api/src/db/migrations/NNNN_guard_rail_proposals.sql` | guard_rail_proposals 테이블 |
| 3 | Service | `api/src/services/pattern-detector-service.ts` | source × severity GROUP BY → HAVING count ≥ N. payload 유사도 보조 분석. failure_patterns 저장 |
| 4 | Service | `api/src/services/rule-generator-service.ts` | failure_patterns → LLM 프롬프트 구성 → Haiku 호출 → .claude/rules/ 포맷 Rule 초안 생성 → guard_rail_proposals 저장 |
| 5 | Route | `api/src/routes/guard-rail.ts` | POST /guard-rail/detect — 패턴 감지 실행 트리거 |
| 6 | Route | `api/src/routes/guard-rail.ts` | GET /guard-rail/proposals — 미승인 Rule 제안 목록 |
| 7 | Route | `api/src/routes/guard-rail.ts` | PATCH /guard-rail/proposals/:id — 승인/거부/수정 (Sprint 162 선행 작업) |
| 8 | Schema | `api/src/schemas/guard-rail-schema.ts` | Zod 추가: DetectRequest, PatternResult, ProposalListResponse, ProposalUpdateRequest |
| 9 | Test | `api/src/__tests__/pattern-detector.test.ts` | 패턴 감지 서비스 단위 테스트 (반복 패턴 있음/없음, 임계값 경계) |
| 10 | Test | `api/src/__tests__/rule-generator.test.ts` | Rule 생성 서비스 단위 테스트 (LLM mock, 포맷 검증) |
| 11 | Test | `api/src/__tests__/guard-rail-routes.test.ts` | 라우트 통합 테스트 |

---

## 7. Convention Prerequisites

### 7.1 Existing Conventions

- [x] `.claude/rules/` 5종 (coding-style, git-workflow, testing, security, sdd-triangle)
- [x] ESLint 커스텀 룰 3종 (no-direct-db-in-route, require-zod-schema, no-orphan-plumb-import)
- [x] PostToolUse hook (자동 lint + typecheck)
- [x] Hono `app.request()` 테스트 패턴
- [x] D1 mock: in-memory SQLite (better-sqlite3)

### 7.2 신규 컨벤션

| Category | 규칙 | 우선순위 |
|----------|------|:--------:|
| Rule 파일 네이밍 | `auto-guard-{NNN}.md` (자동 생성 Rule은 `auto-guard-` 접두사) | High |
| Rule 초안 포맷 | YAML frontmatter (`source`, `generated_at`, `pattern_id`) + Markdown body | High |
| LLM 프롬프트 | `templates/guard-rail-rule.prompt.md` 템플릿 파일 분리 | Medium |

---

## 8. Implementation Order

```
1. shared/src/guard-rail.ts          — 타입 정의 (DiagnosticResult, FailurePattern, GuardRailProposal)
2. D1 migration 2건               — failure_patterns + guard_rail_proposals
3. schemas/guard-rail-schema.ts      — Zod 스키마
4. services/data-diagnostic-service.ts — F357 데이터 진단
5. services/pattern-detector-service.ts — F358 패턴 감지
6. services/rule-generator-service.ts   — F358 Rule 생성
7. routes/guard-rail.ts               — API 엔드포인트 3개
8. tests (3파일)                      — 단위 + 통합 테스트
```

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`sprint-161.design.md`)
2. [ ] D1 마이그레이션 번호 확정 (현재 마지막: `ls migrations/*.sql | sort | tail -1`)
3. [ ] Sprint 162 Plan 작성 (승인 플로우)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Initial draft — PRD + 전략 문서 + Phase 14 인프라 분석 기반 | Sinclair Seo |
