---
code: FX-PLAN-S164
title: "Sprint 164 — 에이전트 자기 평가 연동 + Rule 효과 측정 + 운영 지표 대시보드"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-S162]], fx-harness-evolution/prd-final.md"
---

# Sprint 164: 에이전트 자기 평가 연동 + Rule 효과 측정 + 운영 지표 대시보드

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F361 에이전트 자기 평가 연동 + Rule 효과 측정, F362 운영 지표 대시보드 |
| Sprint | 164 |
| 우선순위 | F361=P1, F362=P1 |
| 의존성 | F361: Sprint 162 (F359 승인 플로우) 선행. F362: 독립 (기존 D1 데이터만 사용) |
| Phase | 17 — Self-Evolving Harness v2 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Guard Rail 배치 후 효과를 측정할 수 없음 + 에이전트/스킬 16+15종의 실제 활용률 불명 |
| Solution | Rule 효과 점수(배치 전/후 비교) + Skill 재사용률 + 에이전트 활용률 대시보드 |
| Function UX Effect | F337 Dashboard에서 Rule 효과·에이전트 활용률·Skill 재사용률을 한눈에 확인 |
| Core Value | "built but unused" 위험 해소 + Guard Rail의 실질적 가치 정량 증명 |

---

## 1. Overview

### 1.1 Purpose

Phase 17의 마지막 Sprint으로, 자가 발전 루프의 **피드백 측정** 단계를 구축한다. Guard Rail이 실제로 반복 실패를 줄이는지 측정하고, 하네스 인프라(에이전트 16종, 스킬 15종, DERIVED/CAPTURED)의 활용률을 시각화한다.

### 1.2 Background

- **전략 문서 §7.2**: "하네스 인프라 미활용 (built but unused)" — 심각도 **높음**
- **전략 문서 §8.2**: 에이전트 활용률 > 75%, DERIVED 스킬 재사용률 > 30% 목표
- **PRD S1+S2+S3+S4**: 에이전트 자기 평가 연동 + Skill 운영 지표 + 활용률 + Rule 효과

### 1.3 Related Documents

- PRD: `docs/specs/fx-harness-evolution/prd-final.md` (§4.2 S1~S4)
- Phase 10 F148: 에이전트 자기 평가 (`packages/api/src/services/agent-self-eval-service.ts`)
- Phase 10 F274: 스킬 실행 메트릭 (`packages/api/src/services/skill-execution-service.ts`)
- Phase 14 F337: Orchestration Dashboard (확장 대상)

---

## 2. Scope

### 2.1 In Scope

**F361: 에이전트 자기 평가 연동 + Rule 효과 측정**
- [ ] F148 agent_self_evaluations 데이터를 PatternDetector 가중치로 활용
- [ ] Rule 효과 점수 — 배치 전 N주 vs 배치 후 N주 동일 유형 실패 빈도 비교
- [ ] guard_rail_proposals에 effectiveness_score 컬럼 추가
- [ ] GET /guard-rail/effectiveness API

**F362: 운영 지표 대시보드**
- [ ] Skill 재사용률 — skill_executions × skill_lineage JOIN (DERIVED/CAPTURED 구분)
- [ ] 에이전트/스킬 월간 활용률 — execution_events source별 집계
- [ ] 미사용 항목 하이라이트 (월 0회 사용)
- [ ] F337 Dashboard에 "운영 지표" 탭 추가 (React 컴포넌트)
- [ ] API 3개 — GET /metrics/skill-reuse, GET /metrics/agent-usage, GET /metrics/overview

### 2.2 Out of Scope

- Guard Rail 자동 정리 (미사용 Rule 삭제)
- 에이전트 자동 비활성화 (미사용 에이전트 정리)
- Rule 충돌 감지 (S5)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | agent_self_evaluations에서 "어려웠던 점" 추출 → failure_patterns 가중치 | Medium | Pending |
| FR-02 | Rule 효과 점수 산출 (배치 전/후 window 비교) | High | Pending |
| FR-03 | effectiveness_score D1 컬럼 추가 (ALTER TABLE guard_rail_proposals) | High | Pending |
| FR-04 | GET /guard-rail/effectiveness — Rule별 효과 점수 목록 | High | Pending |
| FR-05 | skill_executions × skill_lineage JOIN으로 재사용률 산출 | High | Pending |
| FR-06 | execution_events source별 월간 집계 → 에이전트/스킬 활용률 | High | Pending |
| FR-07 | 미사용 항목 감지 (월 0회) + 하이라이트 플래그 | Medium | Pending |
| FR-08 | GET /metrics/overview — 통합 운영 지표 (재사용률 + 활용률 + Rule 효과 요약) | High | Pending |
| FR-09 | Dashboard "운영 지표" 탭 UI — 차트 3개 (활용률 바, 재사용률 파이, Rule 효과 트렌드) | High | Pending |
| FR-10 | 운영 지표 자동 갱신 — 페이지 로드 시 API 호출 | Medium | Pending |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] Rule 효과 점수가 최소 1개 Rule에 대해 산출됨
- [ ] 에이전트 활용률이 Dashboard에서 시각화됨
- [ ] Skill 재사용률이 Dashboard에서 시각화됨 (DERIVED/CAPTURED 구분)
- [ ] 미사용 항목이 하이라이트됨
- [ ] API 4개 동작 (effectiveness + 3 metrics)
- [ ] Dashboard 탭 추가 + 단위 테스트

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Rule 배치 후 측정 기간 부족 (효과 측정에 최소 1~2주 필요) | Medium | High | MVP에서는 효과 점수 "측정 중" 상태 허용. 충분한 데이터 후 자동 갱신 |
| skill_lineage 테이블 데이터 부족 | Medium | Medium | 데이터 없으면 "재사용률 0%" 표시. 데이터 축적 안내 메시지 |
| Dashboard 컴포넌트 복잡도 | Low | Medium | 기존 F337 패턴(Kanban/LoopHistory) 재활용. 차트는 간단한 바/파이만 |

---

## 6. Architecture Considerations

### 6.1 D1 변경

```sql
-- guard_rail_proposals 확장
ALTER TABLE guard_rail_proposals ADD COLUMN effectiveness_score REAL;
ALTER TABLE guard_rail_proposals ADD COLUMN effectiveness_measured_at TEXT;
ALTER TABLE guard_rail_proposals ADD COLUMN pre_deploy_failures INTEGER;
ALTER TABLE guard_rail_proposals ADD COLUMN post_deploy_failures INTEGER;
```

### 6.2 기존 테이블 활용

| 테이블 | 용도 | 쿼리 |
|--------|------|------|
| `execution_events` | 에이전트/스킬 활용률 | GROUP BY source, strftime('%Y-%m', created_at) |
| `skill_executions` | Skill 실행 이력 | JOIN skill_lineage ON lineage_type |
| `agent_self_evaluations` | 에이전트 자기 평가 | challenges 컬럼 파싱 |
| `guard_rail_proposals` | Rule 효과 측정 | approved_at 기준 전/후 window |

### 6.3 Dashboard 컴포넌트 구조

```
web/src/routes/dashboard.metrics/
├── route.tsx           — 메인 페이지 (3섹션 레이아웃)
├── AgentUsageChart.tsx — 에이전트 16종 월간 활용률 수평 바 차트
├── SkillReuseChart.tsx — DERIVED/CAPTURED 재사용률 도넛 차트
├── RuleEffectChart.tsx — Rule별 효과 점수 트렌드 라인
└── UnusedHighlight.tsx — 미사용 항목 경고 카드
```

---

## 7. 작업 목록

| # | 영역 | 파일 | 작업 내용 |
|---|------|------|-----------|
| 1 | Migration | `api/src/db/migrations/NNNN_grp_effectiveness.sql` | guard_rail_proposals 확장 (4 컬럼) |
| 2 | Service | `api/src/services/rule-effectiveness-service.ts` | Rule 효과 점수 산출 (pre/post window 비교) |
| 3 | Service | `api/src/services/metrics-service.ts` | 통합 운영 지표 — 활용률 + 재사용률 + 요약 |
| 4 | Route | `api/src/routes/metrics.ts` | GET /metrics/overview, /skill-reuse, /agent-usage |
| 5 | Route | `api/src/routes/guard-rail.ts` | GET /guard-rail/effectiveness 추가 |
| 6 | Schema | `api/src/schemas/metrics-schema.ts` | Zod: MetricsOverview, SkillReuse, AgentUsage |
| 7 | Shared | `shared/src/metrics.ts` | MetricsOverview, SkillReuseData, AgentUsageData 타입 |
| 8 | Web | `web/src/routes/dashboard.metrics/route.tsx` | 운영 지표 페이지 메인 |
| 9 | Web | `web/src/routes/dashboard.metrics/AgentUsageChart.tsx` | 활용률 바 차트 |
| 10 | Web | `web/src/routes/dashboard.metrics/SkillReuseChart.tsx` | 재사용률 도넛 차트 |
| 11 | Web | `web/src/routes/dashboard.metrics/RuleEffectChart.tsx` | Rule 효과 트렌드 |
| 12 | Web | `web/src/routes/dashboard.metrics/UnusedHighlight.tsx` | 미사용 경고 카드 |
| 13 | Test | `api/src/__tests__/rule-effectiveness.test.ts` | 효과 측정 단위 테스트 |
| 14 | Test | `api/src/__tests__/metrics.test.ts` | 운영 지표 라우트 테스트 |

---

## 8. Implementation Order

```
Phase A: API (F361 + F362 API)
  1. shared/src/metrics.ts                — 타입 정의
  2. D1 migration                         — guard_rail_proposals 확장
  3. schemas/metrics-schema.ts            — Zod
  4. services/rule-effectiveness-service.ts — Rule 효과 산출
  5. services/metrics-service.ts          — 통합 운영 지표
  6. routes/metrics.ts + guard-rail.ts    — API 4개
  7. tests (2파일)

Phase B: Web (F362 Dashboard)
  8. dashboard.metrics/route.tsx          — 페이지 프레임
  9. AgentUsageChart.tsx                  — 활용률
  10. SkillReuseChart.tsx                 — 재사용률
  11. RuleEffectChart.tsx                 — Rule 효과
  12. UnusedHighlight.tsx                 — 미사용 경고
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Initial draft — PRD S1~S4 + Phase 10/14 기존 인프라 기반 | Sinclair Seo |
